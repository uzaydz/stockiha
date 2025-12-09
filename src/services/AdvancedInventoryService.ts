/**
 * ⚡ AdvancedInventoryService - v3.0 (PowerSync Best Practices 2025)
 * ============================================================
 *
 * خدمة إدارة المخزون المتقدمة:
 * - دعم جميع أنواع البيع (قطعة، وزن، كرتون، متر)
 * - إضافة وخصم المخزون
 * - تتبع حركات المخزون
 * - المزامنة مع السيرفر
 *
 * ✅ يستخدم powerSyncService.mutate() للكتابة
 * ✅ يستخدم powerSyncService.query() للقراءة
 */

import { powerSyncService } from '@/lib/powersync/PowerSyncService';
import { supabase } from '@/lib/supabase';

// =====================================================
// Types
// =====================================================

export type SellingUnitType = 'piece' | 'weight' | 'box' | 'meter';

export interface AddInventoryParams {
  productId: string;
  organizationId: string;
  unitType: SellingUnitType;
  quantityPieces?: number;
  weightAdded?: number;
  metersAdded?: number;
  boxesAdded?: number;
  unitCost?: number;
  batchNumber?: string;
  notes?: string;
}

export interface DeductInventoryParams {
  productId: string;
  organizationId: string;
  sellingUnitType: SellingUnitType;
  quantityPieces?: number;
  weightSold?: number;
  metersSold?: number;
  boxesSold?: number;
  colorId?: string;
  sizeId?: string;
  notes?: string;
}

export interface InventoryMovement {
  id: string;
  product_id: string;
  organization_id: string;
  movement_type: 'add' | 'deduct';
  unit_type: SellingUnitType;
  quantity: number;
  unit_cost?: number;
  batch_number?: string;
  notes?: string;
  synced: boolean;
  created_at: string;
}

// =====================================================
// AdvancedInventoryService
// =====================================================

class AdvancedInventoryServiceClass {

  // ========================================
  // ➕ إضافة مخزون
  // ========================================

  /**
   * ⚡ إضافة مخزون
   */
  async addInventory(params: AddInventoryParams, isOnline: boolean = true): Promise<boolean> {
    const { productId, organizationId, unitType, quantityPieces, weightAdded, metersAdded, boxesAdded, unitCost, batchNumber, notes } = params;

    try {
      // تحديد الكمية بناءً على نوع الوحدة
      let quantity = 0;
      let updateField = 'stock_quantity';

      switch (unitType) {
        case 'weight':
          quantity = weightAdded || 0;
          updateField = 'available_weight';
          break;
        case 'box':
          quantity = boxesAdded || 0;
          updateField = 'available_boxes';
          break;
        case 'meter':
          quantity = metersAdded || 0;
          updateField = 'available_length';
          break;
        default:
          quantity = quantityPieces || 0;
          updateField = 'stock_quantity';
      }

      if (quantity <= 0) return false;

      // جلب القيمة الحالية
      const product = await powerSyncService.queryOne<any>({
        sql: `SELECT ${updateField} FROM products WHERE id = ?`,
        params: [productId]
      });

      const currentValue = product?.[updateField] || 0;
      const newValue = currentValue + quantity;

      // تحديث المخزون
      await powerSyncService.mutate({
        table: 'products',
        operation: 'UPDATE',
        data: {
          [updateField]: newValue,
          updated_at: new Date().toISOString()
        },
        where: { id: productId }
      });

      // تسجيل الحركة
      await this.recordMovement({
        productId,
        organizationId,
        movementType: 'add',
        unitType,
        quantity,
        unitCost,
        batchNumber,
        notes,
        synced: isOnline
      });

      return true;
    } catch (error) {
      console.error('[AdvancedInventory] Add failed:', error);
      return false;
    }
  }

  // ========================================
  // ➖ خصم مخزون
  // ========================================

  /**
   * ⚡ خصم مخزون
   */
  async deductInventory(params: DeductInventoryParams, isOnline: boolean = true): Promise<boolean> {
    const { productId, organizationId, sellingUnitType, quantityPieces, weightSold, metersSold, boxesSold, colorId, sizeId, notes } = params;

    try {
      // تحديد الكمية بناءً على نوع الوحدة
      let quantity = 0;
      let updateField = 'stock_quantity';

      switch (sellingUnitType) {
        case 'weight':
          quantity = weightSold || 0;
          updateField = 'available_weight';
          break;
        case 'box':
          quantity = boxesSold || 0;
          updateField = 'available_boxes';
          break;
        case 'meter':
          quantity = metersSold || 0;
          updateField = 'available_length';
          break;
        default:
          quantity = quantityPieces || 0;
          updateField = 'stock_quantity';
      }

      if (quantity <= 0) return false;

      // التحديث بناءً على نوع المتغير
      if (sizeId) {
        // خصم من المقاس
        const size = await powerSyncService.queryOne<{ quantity: number }>({
          sql: 'SELECT quantity FROM product_sizes WHERE id = ?',
          params: [sizeId]
        });

        if (size) {
          await powerSyncService.mutate({
            table: 'product_sizes',
            operation: 'UPDATE',
            data: {
              quantity: Math.max(0, (size.quantity || 0) - quantity),
              updated_at: new Date().toISOString()
            },
            where: { id: sizeId }
          });
        }
      } else if (colorId) {
        // خصم من اللون
        const color = await powerSyncService.queryOne<{ quantity: number }>({
          sql: 'SELECT quantity FROM product_colors WHERE id = ?',
          params: [colorId]
        });

        if (color) {
          await powerSyncService.mutate({
            table: 'product_colors',
            operation: 'UPDATE',
            data: {
              quantity: Math.max(0, (color.quantity || 0) - quantity),
              updated_at: new Date().toISOString()
            },
            where: { id: colorId }
          });
        }
      } else {
        // خصم من المنتج الرئيسي
        const product = await powerSyncService.queryOne<any>({
          sql: `SELECT ${updateField} FROM products WHERE id = ?`,
          params: [productId]
        });

        const currentValue = product?.[updateField] || 0;
        const newValue = Math.max(0, currentValue - quantity);

        await powerSyncService.mutate({
          table: 'products',
          operation: 'UPDATE',
          data: {
            [updateField]: newValue,
            updated_at: new Date().toISOString()
          },
          where: { id: productId }
        });
      }

      // تسجيل الحركة
      await this.recordMovement({
        productId,
        organizationId,
        movementType: 'deduct',
        unitType: sellingUnitType,
        quantity,
        notes,
        synced: isOnline
      });

      return true;
    } catch (error) {
      console.error('[AdvancedInventory] Deduct failed:', error);
      return false;
    }
  }

  // ========================================
  // 📝 تسجيل الحركات
  // ========================================

  /**
   * ⚡ تسجيل حركة مخزون
   */
  private async recordMovement(params: {
    productId: string;
    organizationId: string;
    movementType: 'add' | 'deduct';
    unitType: SellingUnitType;
    quantity: number;
    unitCost?: number;
    batchNumber?: string;
    notes?: string;
    synced: boolean;
  }): Promise<void> {
    try {
      const movement: InventoryMovement = {
        id: crypto.randomUUID(),
        product_id: params.productId,
        organization_id: params.organizationId,
        movement_type: params.movementType,
        unit_type: params.unitType,
        quantity: params.quantity,
        unit_cost: params.unitCost,
        batch_number: params.batchNumber,
        notes: params.notes,
        synced: params.synced,
        created_at: new Date().toISOString()
      };

      // حفظ الحركة محلياً
      const key = `inventory_movements_${params.organizationId}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.unshift(movement);
      localStorage.setItem(key, JSON.stringify(existing.slice(0, 1000))); // آخر 1000 حركة

    } catch (error) {
      console.warn('[AdvancedInventory] Record movement failed:', error);
    }
  }

  // ========================================
  // 🔄 المزامنة
  // ========================================

  /**
   * ⚡ مزامنة الحركات المعلقة
   */
  async syncPendingMovements(organizationId: string): Promise<{ synced: number; failed: number }> {
    try {
      const key = `inventory_movements_${organizationId}`;
      const movements: InventoryMovement[] = JSON.parse(localStorage.getItem(key) || '[]');
      const pending = movements.filter(m => !m.synced);

      if (pending.length === 0) {
        return { synced: 0, failed: 0 };
      }

      let synced = 0;
      let failed = 0;

      for (const movement of pending) {
        try {
          // إرسال الحركة إلى السيرفر
          const { error } = await supabase
            .from('inventory_movements')
            .insert({
              id: movement.id,
              product_id: movement.product_id,
              organization_id: movement.organization_id,
              movement_type: movement.movement_type,
              unit_type: movement.unit_type,
              quantity: movement.quantity,
              unit_cost: movement.unit_cost,
              batch_number: movement.batch_number,
              notes: movement.notes,
              created_at: movement.created_at
            });

          if (!error) {
            movement.synced = true;
            synced++;
          } else {
            failed++;
          }
        } catch {
          failed++;
        }
      }

      // تحديث التخزين المحلي
      localStorage.setItem(key, JSON.stringify(movements));

      return { synced, failed };
    } catch (error) {
      console.error('[AdvancedInventory] Sync failed:', error);
      return { synced: 0, failed: 0 };
    }
  }

  // ========================================
  // 📊 الإحصائيات
  // ========================================

  /**
   * ⚡ جلب حركات المخزون
   */
  getMovements(organizationId: string, limit: number = 50): InventoryMovement[] {
    try {
      const key = `inventory_movements_${organizationId}`;
      const movements: InventoryMovement[] = JSON.parse(localStorage.getItem(key) || '[]');
      return movements.slice(0, limit);
    } catch {
      return [];
    }
  }

  /**
   * ⚡ عدد الحركات المعلقة
   */
  getPendingCount(organizationId: string): number {
    try {
      const key = `inventory_movements_${organizationId}`;
      const movements: InventoryMovement[] = JSON.parse(localStorage.getItem(key) || '[]');
      return movements.filter(m => !m.synced).length;
    } catch {
      return 0;
    }
  }
}

// ========================================
// 📤 Export Singleton
// ========================================

export const advancedInventoryService = new AdvancedInventoryServiceClass();
export default advancedInventoryService;
