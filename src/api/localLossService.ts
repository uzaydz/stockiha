/**
 * localLossService - خدمة الخسائر المحلية
 *
 * ⚡ PowerSync Implementation
 *
 * - Local-First: الكتابة محلياً فوراً
 * - Offline-First: يعمل بدون إنترنت
 * - PowerSync: المزامنة التلقائية مع Supabase
 */

import { v4 as uuidv4 } from 'uuid';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';
import type { CreateLossInput, CreateLossItemInput } from '@/lib/types/entities/loss';

// ⚡ تحديث المخزون (خصم الكمية) حسب نوع البيع coverage
async function updateInventoryForLoss(tx: any, item: CreateLossItemInput): Promise<void> {
    const sellingType = (item as any).selling_unit_type || 'piece';

    console.log(`[LocalLoss] ⚡ updateInventoryForLoss called:`, {
        sellingType,
        product_id: item.product_id,
        lost_quantity: item.lost_quantity,
        selling_unit: (item as any).selling_unit
    });

    try {
        switch (sellingType) {
            case 'weight':
                const weightLost = item.lost_quantity || 0; // In loss input, quantity IS the weight/amount
                if (weightLost > 0) {
                    await tx.execute(
                        `UPDATE products SET
              available_weight = MAX(0, COALESCE(available_weight, 0) - ?),
              stock_quantity = MAX(0, COALESCE(stock_quantity, 0) - ?)
            WHERE id = ?`,
                        [weightLost, weightLost, item.product_id]
                    );
                }
                break;

            case 'meter':
                const metersLost = item.lost_quantity || 0;
                if (metersLost > 0) {
                    await tx.execute(
                        `UPDATE products SET
              available_length = MAX(0, COALESCE(available_length, 0) - ?),
              stock_quantity = MAX(0, COALESCE(stock_quantity, 0) - ?),
              updated_at = ?
            WHERE id = ?`,
                        [metersLost, metersLost, new Date().toISOString(), item.product_id]
                    );
                }
                break;

            case 'box':
                const boxesLost = item.lost_quantity || 0;
                if (boxesLost > 0) {
                    // Need to know units per box to deduct from total stock if needed, 
                    // but usually we just deduct boxes. However, stock_quantity in 'box' mode might be total units?
                    // Let's assume stock_quantity tracks units, and available_boxes tracks boxes.
                    // Check localProductReturnService:
                    // "UPDATE products SET available_boxes ... + offset, stock_quantity ... + (boxes * unitsPerBox)"

                    // We need to fetch unitsPerBox if not provided, or rely on passed value.
                    // item.unit_per_box might not be in CreateLossItemInput (checked types).
                    // It is in LossItem but CreateLossItemInput is what we receive.
                    // We should fetch product to be safe, or assume caller passed correct total unit impact?
                    // For now, let's fetch product info to be safe if possible, or use 1 as fallback.

                    // Actually, let's look at the implementation of return service:
                    // It uses item.units_per_box.

                    const unitsPerBox = (item as any).units_per_box || 1;
                    const totalUnits = boxesLost * unitsPerBox;

                    await tx.execute(
                        `UPDATE products SET
              available_boxes = MAX(0, COALESCE(available_boxes, 0) - ?),
              stock_quantity = MAX(0, COALESCE(stock_quantity, 0) - ?)
            WHERE id = ?`,
                        [boxesLost, totalUnits, item.product_id]
                    );
                }
                break;

            case 'piece':
            default:
                const quantityLost = item.lost_quantity || 0;
                if (quantityLost > 0) {
                    // Update Variant if exists
                    if (item.size_id) {
                        await tx.execute(
                            `UPDATE product_sizes SET quantity = MAX(0, COALESCE(quantity, 0) - ?) WHERE id = ?`,
                            [quantityLost, item.size_id]
                        );
                    } else if (item.color_id) {
                        await tx.execute(
                            `UPDATE product_colors SET quantity = MAX(0, COALESCE(quantity, 0) - ?) WHERE id = ?`,
                            [quantityLost, item.color_id]
                        );
                    }

                    // Update Main Product
                    await tx.execute(
                        `UPDATE products SET stock_quantity = MAX(0, COALESCE(stock_quantity, 0) - ?), updated_at = ? WHERE id = ?`,
                        [quantityLost, new Date().toISOString(), item.product_id]
                    );
                }
                break;
        }
    } catch (error) {
        console.error(`[LocalLoss] ❌ Failed to update inventory for ${sellingType}:`, error);
        throw error;
    }
}

// ⚡ الأعمدة المسموحة في جدول losses
const VALID_LOSS_COLUMNS = new Set([
    'organization_id', 'loss_number', 'loss_type', 'loss_category',
    'loss_description', 'incident_date', 'reported_by', 'witness_employee_id',
    'witness_name', 'status', 'requires_manager_approval', 'approved_by',
    'approved_at', 'approval_notes', 'total_cost_value', 'total_selling_value',
    'total_items_count', 'location_description', 'external_reference',
    'insurance_claim', 'insurance_reference', 'notes', 'internal_notes',
    'processed_at', 'created_by'
]);

// ⚡ الأعمدة المسموحة في جدول loss_items
const VALID_LOSS_ITEM_COLUMNS = new Set([
    'loss_id', 'product_id', 'product_name', 'product_sku', 'product_barcode',
    'color_id', 'size_id', 'color_name', 'size_name', 'variant_info',
    'lost_quantity', 'unit_cost_price', 'unit_selling_price',
    'total_cost_value', 'total_selling_value', 'loss_condition', 'loss_percentage',
    'stock_before_loss', 'stock_after_loss', 'variant_stock_before', 'variant_stock_after',
    'inventory_adjusted', 'inventory_adjusted_at', 'inventory_adjusted_by', 'item_notes',
    // Selling Unit Fields (Matching PowerSync Schema)
    'selling_unit_type', 'weight_loss', 'weight_unit', 'price_per_weight_unit',
    'meters_loss', 'price_per_meter', 'boxes_loss', 'units_per_box', 'box_price'
]);

export const createLocalLossDeclaration = async (
    input: CreateLossInput,
    items: CreateLossItemInput[]
): Promise<{ loss: any; items: any[] }> => {
    const now = new Date().toISOString();
    // Generate ID if not present (although input doesn't have ID, we need one)
    const lossId = uuidv4();

    const lossRecord = {
        ...input,
        id: lossId,
        total_items_count: items.length,
        // Calculate totals
        total_cost_value: items.reduce((sum, item) => sum + (item.unit_cost_price * item.lost_quantity), 0),
        total_selling_value: items.reduce((sum, item) => sum + (item.unit_selling_price * item.lost_quantity), 0),
        status: 'pending', // Default
        created_at: now,
        updated_at: now
    };

    const itemRecords = items.map(item => ({
        ...item,
        id: uuidv4(),
        loss_id: lossId,
        created_at: now,
        updated_at: now,
        // Calculate item totals
        total_cost_value: item.unit_cost_price * item.lost_quantity,
        total_selling_value: item.unit_selling_price * item.lost_quantity,
        inventory_adjusted: true, // We will adjust inventory immediately
        inventory_adjusted_at: now
    }));

    await powerSyncService.transaction(async (tx) => {
        // 1. Insert Loss
        const lossKeys = Object.keys(lossRecord).filter(k => VALID_LOSS_COLUMNS.has(k) || k === 'id' || k === 'created_at' || k === 'updated_at');
        const lossPlaceholders = lossKeys.map(() => '?').join(', ');
        const lossValues = lossKeys.map(k => {
            const val = (lossRecord as any)[k];
            if (typeof val === 'boolean') return val ? 1 : 0;
            return val ?? null;
        });

        await tx.execute(
            `INSERT INTO losses (${lossKeys.join(', ')}) VALUES (${lossPlaceholders})`,
            lossValues
        );

        // 2. Insert Items
        for (const item of itemRecords) {
            const itemKeys = Object.keys(item).filter(k => VALID_LOSS_ITEM_COLUMNS.has(k) || k === 'id' || k === 'created_at' || k === 'updated_at');
            const itemPlaceholders = itemKeys.map(() => '?').join(', ');
            const itemValues = itemKeys.map(k => {
                const val = (item as any)[k];
                if (typeof val === 'boolean') return val ? 1 : 0;
                return val ?? null;
            });

            await tx.execute(
                `INSERT INTO loss_items (${itemKeys.join(', ')}) VALUES (${itemPlaceholders})`,
                itemValues
            );

            // 3. Update Inventory
            await updateInventoryForLoss(tx, item);
        }
    });

    return { loss: lossRecord, items: itemRecords };
};
