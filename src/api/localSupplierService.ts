/**
 * ⚡ localSupplierService - Adapter للخدمة الموحدة
 * 
 * هذا الملف يُعيد التصدير من UnifiedSupplierService للحفاظ على التوافق مع الكود القديم
 * 
 * تم استبدال التنفيذ القديم بـ UnifiedSupplierService للعمل Offline-First
 */

import { powerSyncService } from '@/lib/powersync/PowerSyncService';
import { v4 as uuidv4 } from 'uuid';
import { unifiedSupplierService, type Supplier } from '@/services/UnifiedSupplierService';
import { deltaWriteService } from '@/services/DeltaWriteService';

/**
 * ⚡ تحويل القيم إلى أنواع SQLite-safe
 * يحل مشكلة "unknown binding converted to null" warning
 */
const toSqliteValue = (value: unknown): unknown => {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return JSON.stringify(value);
  return value;
};

// إعادة تصدير جميع الصادرات من الخدمة الموحدة
export * from '@/services/UnifiedSupplierService';

// إعادة تصدير كـ default للتوافق
export { unifiedSupplierService as default } from '@/services/UnifiedSupplierService';

// إعادة تصدير الأنواع للتوافق
export type {
  Supplier,
  SupplierFilters,
  PaginatedSuppliers
} from '@/services/UnifiedSupplierService';

// إعادة تصدير الأنواع القديمة للتوافق
export type { Supplier as LocalSupplier } from '@/services/UnifiedSupplierService';

// دوال التوافق مع الكود القديم
export const createLocalSupplier = (supplier: Omit<Supplier, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => 
  unifiedSupplierService.createSupplier(supplier);

export const updateLocalSupplier = (id: string, updates: Partial<Supplier>) => 
  unifiedSupplierService.updateSupplier(id, updates);

export const deleteLocalSupplier = (id: string) => 
  unifiedSupplierService.deleteSupplier(id);

export const getLocalSuppliers = async (organizationId: string) => {
  unifiedSupplierService.setOrganizationId(organizationId);
  const result = await unifiedSupplierService.getSuppliers({}, 1, 1000);
  return result.data;
};

export const getLocalSupplierById = (id: string) => 
  unifiedSupplierService.getSupplier(id);

export const searchLocalSuppliers = async (organizationId: string, query: string, options: { limit?: number } = {}) => {
  unifiedSupplierService.setOrganizationId(organizationId);
  return unifiedSupplierService.searchSuppliers(query, options.limit);
};

// ========================================
// Purchase Functions
// ========================================

/**
 * ⚡ تحديث المخزون لعناصر المشتريات
 * @param items عناصر المشتريات
 * @param operation 'add' لإضافة المخزون | 'remove' لإزالة المخزون
 */
async function updateInventoryForPurchaseItems(
  items: Array<{
    product_id?: string;
    quantity: number;
    color_id?: string;
    size_id?: string;
    variant_type?: string;
  }>,
  operation: 'add' | 'remove'
): Promise<void> {
  const delta = operation === 'add' ? 1 : -1;

  for (const item of items) {
    if (!item.product_id) continue;

    const quantity = Number(item.quantity) || 0;
    if (quantity <= 0) continue;

    try {
      // تحديد نوع المتغير وتحديث المخزون المناسب
      if (item.variant_type === 'color_size' && item.size_id) {
        // منتج بلون ومقاس - تحديث مخزون المقاس
        await deltaWriteService.updateProductStock(item.product_id, quantity * delta, {
          colorId: item.color_id || undefined,
          sizeId: item.size_id
        });
        console.log(`[localSupplierService] 📦 تم تحديث مخزون المقاس: ${item.size_id} بكمية ${quantity * delta}`);
      } else if ((item.variant_type === 'color_only' || item.variant_type === 'color_size') && item.color_id) {
        // منتج بلون فقط - تحديث مخزون اللون
        await deltaWriteService.updateProductStock(item.product_id, quantity * delta, {
          colorId: item.color_id
        });
        console.log(`[localSupplierService] 📦 تم تحديث مخزون اللون: ${item.color_id} بكمية ${quantity * delta}`);
      } else {
        // منتج بسيط - تحديث المخزون الرئيسي
        await deltaWriteService.updateProductStock(item.product_id, quantity * delta);
        console.log(`[localSupplierService] 📦 تم تحديث مخزون المنتج: ${item.product_id} بكمية ${quantity * delta}`);
      }
    } catch (error) {
      console.error(`[localSupplierService] ❌ خطأ في تحديث مخزون المنتج ${item.product_id}:`, error);
    }
  }
}

export interface LocalSupplierPurchase {
  id: string;
  organization_id: string;
  purchase_number: string;
  supplier_id: string;
  purchase_date: string;
  due_date?: string;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  status: 'draft' | 'confirmed' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
  payment_status: 'unpaid' | 'partially_paid' | 'paid';
  payment_terms?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LocalSupplierPurchaseItem {
  id: string;
  purchase_id: string;
  product_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  tax_rate: number;
  tax_amount: number;
  batch_id?: string;
  color_id?: string;
  size_id?: string;
  variant_type?: 'simple' | 'color_only' | 'size_only' | 'color_size';
  variant_display_name?: string;
}

export interface LocalSupplierPayment {
  id: string;
  organization_id: string;
  supplier_id: string;
  purchase_id?: string;
  payment_date: string;
  amount: number;
  payment_method: 'cash' | 'bank_transfer' | 'credit_card' | 'check' | 'other';
  reference_number?: string;
  notes?: string;
  created_at?: string;
}

export const getLocalSupplierPurchases = async (organizationId: string, supplierId?: string): Promise<LocalSupplierPurchase[]> => {
  try {
    let query = 'SELECT * FROM supplier_purchases WHERE organization_id = ?';
    const params: any[] = [organizationId];
    
    if (supplierId) {
      query += ' AND supplier_id = ?';
      params.push(supplierId);
    }
    
    query += ' ORDER BY purchase_date DESC';
    
    if (!powerSyncService.db) {
      console.warn('[localSupplierService] PowerSync DB not initialized');
      return [];
    }
    return await powerSyncService.query<LocalSupplierPurchase>({ sql: query, params });
  } catch (error) {
    console.error('[localSupplierService] Error getting purchases:', error);
    return [];
  }
};

export const getLocalPurchaseById = async (organizationId: string, purchaseId: string): Promise<{ purchase: LocalSupplierPurchase; items: LocalSupplierPurchaseItem[] } | null> => {
  try {
    const purchase = await powerSyncService.queryOne<LocalSupplierPurchase>({
      sql: 'SELECT * FROM supplier_purchases WHERE id = ? AND organization_id = ?',
      params: [purchaseId, organizationId]
    });
    
    if (!purchase) return null;
    
    if (!powerSyncService.db) {
      console.warn('[localSupplierService] PowerSync DB not initialized');
      return [];
    }
    const items = await powerSyncService.query<LocalSupplierPurchaseItem>({
      sql: 'SELECT * FROM supplier_purchase_items WHERE purchase_id = ?',
      params: [purchaseId]
    });
    
    return { purchase, items };
  } catch (error) {
    console.error('[localSupplierService] Error getting purchase:', error);
    return null;
  }
};

export const createLocalPurchaseWithItems = async (
  organizationId: string,
  purchase: Omit<LocalSupplierPurchase, 'id' | 'organization_id' | 'created_at' | 'updated_at' | 'balance_due' | 'payment_status'>,
  items: Omit<LocalSupplierPurchaseItem, 'id' | 'purchase_id' | 'total_price' | 'tax_amount'>[]
): Promise<LocalSupplierPurchase> => {
  const purchaseId = uuidv4();
  const now = new Date().toISOString();

  // Calculate totals
  let totalAmount = 0;
  const purchaseItems = items.map(item => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unit_price) || 0;
    const taxRate = Number(item.tax_rate) || 0;
    const totalPrice = quantity * unitPrice;
    const taxAmount = totalPrice * (taxRate / 100);
    totalAmount += totalPrice + taxAmount;

    return {
      ...item,
      id: uuidv4(),
      purchase_id: purchaseId,
      total_price: totalPrice,
      tax_amount: taxAmount
    };
  });

  const balanceDue = totalAmount - (purchase.paid_amount || 0);
  const paymentStatus: 'unpaid' | 'partially_paid' | 'paid' =
    balanceDue <= 0.01 ? 'paid' : purchase.paid_amount > 0 ? 'partially_paid' : 'unpaid';

  const newPurchase: LocalSupplierPurchase = {
    ...purchase,
    id: purchaseId,
    organization_id: organizationId,
    total_amount: totalAmount,
    balance_due: balanceDue,
    payment_status: paymentStatus,
    created_at: now,
    updated_at: now
  };

  await powerSyncService.transaction(async (tx) => {
    // Insert purchase
    const purchaseCols = Object.keys(newPurchase).filter(k => newPurchase[k as keyof LocalSupplierPurchase] !== undefined);
    const purchasePlaceholders = purchaseCols.map(() => '?').join(', ');
    const purchaseValues = purchaseCols.map(col => toSqliteValue((newPurchase as any)[col]));

    await tx.execute(
      `INSERT INTO supplier_purchases (${purchaseCols.join(', ')}) VALUES (${purchasePlaceholders})`,
      purchaseValues
    );

    // Insert items
    for (const item of purchaseItems) {
      const itemCols = Object.keys(item).filter(k => item[k as keyof LocalSupplierPurchaseItem] !== undefined);
      const itemPlaceholders = itemCols.map(() => '?').join(', ');
      const itemValues = itemCols.map(col => toSqliteValue((item as any)[col]));

      await tx.execute(
        `INSERT INTO supplier_purchase_items (${itemCols.join(', ')}) VALUES (${itemPlaceholders})`,
        itemValues
      );
    }
  });

  // ⚡ تحديث المخزون عند تأكيد المشتريات (status === 'confirmed')
  if (purchase.status === 'confirmed') {
    console.log('[localSupplierService] 📦 تحديث المخزون للمشتريات المؤكدة...');
    await updateInventoryForPurchaseItems(purchaseItems, 'add');
    console.log('[localSupplierService] ✅ تم تحديث المخزون بنجاح');
  }

  return newPurchase;
};

export const updateLocalPurchaseWithItems = async (
  organizationId: string,
  purchaseId: string,
  purchase: Partial<Omit<LocalSupplierPurchase, 'id' | 'organization_id' | 'created_at'>>,
  items: Omit<LocalSupplierPurchaseItem, 'id' | 'purchase_id' | 'total_price' | 'tax_amount'>[]
): Promise<LocalSupplierPurchase | null> => {
  try {
    if (!powerSyncService.db) {
      console.warn('[localSupplierService] PowerSync DB not initialized');
      return null;
    }
    const existing = await powerSyncService.queryOne<LocalSupplierPurchase>({
      sql: 'SELECT * FROM supplier_purchases WHERE id = ? AND organization_id = ?',
      params: [purchaseId, organizationId]
    });
    
    if (!existing) return null;
    
    // Calculate totals
    let totalAmount = 0;
    const purchaseItems = items.map(item => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unit_price) || 0;
      const taxRate = Number(item.tax_rate) || 0;
      const totalPrice = quantity * unitPrice;
      const taxAmount = totalPrice * (taxRate / 100);
      totalAmount += totalPrice + taxAmount;
      
      return {
        ...item,
        id: uuidv4(),
        purchase_id: purchaseId,
        total_price: totalPrice,
        tax_amount: taxAmount
      };
    });
    
    const paidAmount = purchase.paid_amount !== undefined ? purchase.paid_amount : existing.paid_amount;
    const balanceDue = totalAmount - paidAmount;
    const paymentStatus: 'unpaid' | 'partially_paid' | 'paid' = 
      balanceDue <= 0.01 ? 'paid' : paidAmount > 0 ? 'partially_paid' : 'unpaid';
    
    const updatedPurchase: LocalSupplierPurchase = {
      ...existing,
      ...purchase,
      total_amount: totalAmount,
      balance_due: balanceDue,
      payment_status: paymentStatus,
      updated_at: new Date().toISOString()
    };
    
    // ⚡ تتبع تغير حالة التأكيد
    const wasConfirmed = existing.status === 'confirmed';
    const isNowConfirmed = purchase.status === 'confirmed';

    // ⚡ جلب العناصر القديمة قبل الحذف (لإزالة المخزون إذا كان مؤكداً سابقاً)
    let oldItems: LocalSupplierPurchaseItem[] = [];
    if (wasConfirmed) {
      oldItems = await powerSyncService.query<LocalSupplierPurchaseItem>({
        sql: 'SELECT * FROM supplier_purchase_items WHERE purchase_id = ?',
        params: [purchaseId]
      });
    }

    await powerSyncService.transaction(async (tx) => {
      // Update purchase
      const updateKeys = Object.keys(purchase).filter(k => k !== 'id' && k !== 'organization_id' && k !== 'created_at');
      if (updateKeys.length > 0 || totalAmount !== existing.total_amount) {
        const setClause = [...updateKeys, 'total_amount', 'balance_due', 'payment_status', 'updated_at']
          .map(k => `${k} = ?`).join(', ');
        const values = [
          ...updateKeys.map(k => toSqliteValue((purchase as any)[k])),
          totalAmount,
          balanceDue,
          paymentStatus,
          updatedPurchase.updated_at,
          purchaseId
        ];

        await tx.execute(
          `UPDATE supplier_purchases SET ${setClause} WHERE id = ?`,
          values
        );
      }

      // Delete old items
      await tx.execute('DELETE FROM supplier_purchase_items WHERE purchase_id = ?', [purchaseId]);

      // Insert new items
      for (const item of purchaseItems) {
        const itemCols = Object.keys(item).filter(k => item[k as keyof LocalSupplierPurchaseItem] !== undefined);
        const itemPlaceholders = itemCols.map(() => '?').join(', ');
        const itemValues = itemCols.map(col => toSqliteValue((item as any)[col]));

        await tx.execute(
          `INSERT INTO supplier_purchase_items (${itemCols.join(', ')}) VALUES (${itemPlaceholders})`,
          itemValues
        );
      }
    });

    // ⚡ تحديث المخزون بناءً على تغير الحالة
    if (wasConfirmed && !isNowConfirmed) {
      // إذا كان مؤكداً وتم إلغاء التأكيد - إزالة المخزون القديم
      console.log('[localSupplierService] 📦 إزالة المخزون (إلغاء التأكيد)...');
      await updateInventoryForPurchaseItems(oldItems, 'remove');
    } else if (!wasConfirmed && isNowConfirmed) {
      // إذا لم يكن مؤكداً وتم تأكيده - إضافة المخزون الجديد
      console.log('[localSupplierService] 📦 إضافة المخزون (تأكيد جديد)...');
      await updateInventoryForPurchaseItems(purchaseItems, 'add');
    } else if (wasConfirmed && isNowConfirmed) {
      // إذا كان مؤكداً ولا يزال مؤكداً - تحديث الفرق
      console.log('[localSupplierService] 📦 تحديث المخزون (تعديل فاتورة مؤكدة)...');
      // إزالة المخزون القديم
      await updateInventoryForPurchaseItems(oldItems, 'remove');
      // إضافة المخزون الجديد
      await updateInventoryForPurchaseItems(purchaseItems, 'add');
    }

    return updatedPurchase;
  } catch (error) {
    console.error('[localSupplierService] Error updating purchase:', error);
    return null;
  }
};

export const deleteLocalPurchase = async (organizationId: string, purchaseId: string): Promise<boolean> => {
  try {
    // ⚡ التحقق من حالة المشتريات قبل الحذف
    const purchase = await powerSyncService.queryOne<LocalSupplierPurchase>({
      sql: 'SELECT * FROM supplier_purchases WHERE id = ? AND organization_id = ?',
      params: [purchaseId, organizationId]
    });

    if (!purchase) return false;

    // ⚡ إذا كانت المشتريات مؤكدة، نحتاج لإزالة المخزون أولاً
    if (purchase.status === 'confirmed') {
      console.log('[localSupplierService] 📦 إزالة المخزون قبل حذف المشتريات المؤكدة...');
      const items = await powerSyncService.query<LocalSupplierPurchaseItem>({
        sql: 'SELECT * FROM supplier_purchase_items WHERE purchase_id = ?',
        params: [purchaseId]
      });
      await updateInventoryForPurchaseItems(items, 'remove');
      console.log('[localSupplierService] ✅ تم إزالة المخزون بنجاح');
    }

    await powerSyncService.transaction(async (tx) => {
      // Delete items first
      await tx.execute('DELETE FROM supplier_purchase_items WHERE purchase_id = ?', [purchaseId]);

      // Delete purchase
      await tx.execute('DELETE FROM supplier_purchases WHERE id = ? AND organization_id = ?', [purchaseId, organizationId]);
    });

    return true;
  } catch (error) {
    console.error('[localSupplierService] Error deleting purchase:', error);
    return false;
  }
};

export const updateLocalPurchaseStatus = async (
  organizationId: string,
  purchaseId: string,
  status: LocalSupplierPurchase['status']
): Promise<boolean> => {
  try {
    const purchase = await powerSyncService.queryOne<LocalSupplierPurchase>({
      sql: 'SELECT * FROM supplier_purchases WHERE id = ? AND organization_id = ?',
      params: [purchaseId, organizationId]
    });

    if (!purchase) return false;

    const wasConfirmed = purchase.status === 'confirmed';
    const isNowConfirmed = status === 'confirmed';

    const now = new Date().toISOString();

    await powerSyncService.transaction(async (tx) => {
      await tx.execute(
        'UPDATE supplier_purchases SET status = ?, updated_at = ? WHERE id = ?',
        [status, now, purchaseId]
      );
    });

    // ⚡ تحديث المخزون بناءً على تغير الحالة
    if (!wasConfirmed && isNowConfirmed) {
      // إذا تم تأكيد المشتريات - إضافة المخزون
      console.log('[localSupplierService] 📦 تحديث المخزون (تأكيد المشتريات)...');
      const items = await powerSyncService.query<LocalSupplierPurchaseItem>({
        sql: 'SELECT * FROM supplier_purchase_items WHERE purchase_id = ?',
        params: [purchaseId]
      });
      await updateInventoryForPurchaseItems(items, 'add');
      console.log('[localSupplierService] ✅ تم تحديث المخزون بنجاح');
    } else if (wasConfirmed && !isNowConfirmed && status === 'cancelled') {
      // إذا تم إلغاء مشتريات مؤكدة - إزالة المخزون
      console.log('[localSupplierService] 📦 إزالة المخزون (إلغاء المشتريات)...');
      const items = await powerSyncService.query<LocalSupplierPurchaseItem>({
        sql: 'SELECT * FROM supplier_purchase_items WHERE purchase_id = ?',
        params: [purchaseId]
      });
      await updateInventoryForPurchaseItems(items, 'remove');
      console.log('[localSupplierService] ✅ تم إزالة المخزون بنجاح');
    }

    console.log(`[localSupplierService] ✅ Updated purchase ${purchaseId} status to ${status}`);
    return true;
  } catch (error) {
    console.error('[localSupplierService] Error updating purchase status:', error);
    return false;
  }
};

export const getLocalOverduePurchases = async (organizationId: string): Promise<LocalSupplierPurchase[]> => {
  try {
    const currentDate = new Date().toISOString();
    if (!powerSyncService.db) {
      console.warn('[localSupplierService] PowerSync DB not initialized');
      return [];
    }
    return await powerSyncService.query<LocalSupplierPurchase>({
      sql: `SELECT * FROM supplier_purchases 
       WHERE organization_id = ? 
       AND due_date < ? 
       AND status NOT IN ('paid', 'cancelled')
       ORDER BY due_date ASC`,
      params: [organizationId, currentDate]
    });
  } catch (error) {
    console.error('[localSupplierService] Error getting overdue purchases:', error);
    return [];
  }
};

// ========================================
// Payment Functions
// ========================================

export const recordLocalPayment = async (
  organizationId: string,
  payment: Omit<LocalSupplierPayment, 'id' | 'organization_id' | 'created_at'>
): Promise<LocalSupplierPayment> => {
  const paymentId = uuidv4();
  const now = new Date().toISOString();
  
  const newPayment: LocalSupplierPayment = {
    ...payment,
    id: paymentId,
    organization_id: organizationId,
    created_at: now
  };
  
  await powerSyncService.transaction(async (tx) => {
    // Insert payment - ⚡ تحويل جميع القيم إلى SQLite-safe
    const cols = Object.keys(newPayment).filter(k => newPayment[k as keyof LocalSupplierPayment] !== undefined);
    const placeholders = cols.map(() => '?').join(', ');
    const values = cols.map(col => toSqliteValue((newPayment as any)[col]));

    await tx.execute(
      `INSERT INTO supplier_payments (${cols.join(', ')}) VALUES (${placeholders})`,
      values
    );

    // Update purchase if linked
    if (payment.purchase_id) {
      // ⚡ استخدام tx.execute بدلاً من powerSyncService.queryOne لتجنب deadlock
      const result = await tx.execute(
        'SELECT * FROM supplier_purchases WHERE id = ?',
        [payment.purchase_id]
      );
      const purchase = (result as any)?.rows?._array?.[0] as LocalSupplierPurchase | undefined;

      if (purchase) {
        const newPaidAmount = Number(purchase.paid_amount) + Number(payment.amount);
        const balanceDue = Math.max(0, Number(purchase.total_amount) - newPaidAmount);
        const status = balanceDue < 0.01 ? 'paid' : newPaidAmount > 0 ? 'partially_paid' : purchase.status;

        await tx.execute(
          `UPDATE supplier_purchases
           SET paid_amount = ?, balance_due = ?, status = ?, updated_at = ?
           WHERE id = ?`,
          [newPaidAmount, balanceDue, status, now, payment.purchase_id]
        );
      }
    }
  });
  
  return newPayment;
};

export const getLocalSupplierPayments = async (organizationId: string, supplierId: string): Promise<LocalSupplierPayment[]> => {
  try {
    return await powerSyncService.query<LocalSupplierPayment>({
      sql: 'SELECT * FROM supplier_payments WHERE organization_id = ? AND supplier_id = ? ORDER BY payment_date DESC',
      params: [organizationId, supplierId]
    });
  } catch (error) {
    console.error('[localSupplierService] Error getting payments:', error);
    return [];
  }
};

export const getAllLocalSupplierPayments = async (organizationId: string): Promise<LocalSupplierPayment[]> => {
  try {
    return await powerSyncService.query<LocalSupplierPayment>({
      sql: 'SELECT * FROM supplier_payments WHERE organization_id = ? ORDER BY payment_date DESC',
      params: [organizationId]
    });
  } catch (error) {
    console.error('[localSupplierService] Error getting all payments:', error);
    return [];
  }
};

// Export types for use in supplierService.ts (already exported above via interface declarations)
