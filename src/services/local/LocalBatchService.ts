/**
 * 📦 Local Batch Service - خدمة الدفعات المحلية
 * ============================================================
 * تعمل 100% offline باستخدام PowerSync/SQLite
 *
 * الميزات:
 * - قراءة الدفعات محلياً (FIFO/FEFO)
 * - استهلاك الدفعات محلياً مع دعم decimal (وزن/متر)
 * - تسجيل الحركات في ledger للتدقيق
 * - دعم تعدد الأجهزة offline
 *
 * @version 1.0.0
 * @date 2025-12-12
 */

import { usePowerSync } from '@powersync/react';
import { v4 as uuidv4 } from 'uuid';

// =====================================================
// الأنواع
// =====================================================

export interface LocalBatch {
  id: string;
  organization_id: string;
  product_id: string;
  color_id?: string;
  size_id?: string;
  batch_number: string;
  supplier_id?: string;
  purchase_date?: string;
  purchase_price: number;
  selling_price: number;
  quantity_received: number;
  quantity_remaining: number; // decimal لدعم الوزن/المتر
  expiry_date?: string;
  location?: string;
  notes?: string;
  cost_per_unit?: number;
  is_active: number; // SQLite boolean
  variant_type?: string;
  variant_display_name?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  // حقول محسوبة
  days_until_expiry?: number;
  is_expired?: boolean;
}

export interface BatchConsumptionInput {
  product_id: string;
  organization_id: string;
  quantity: number; // يمكن أن تكون decimal (مثل 2.5 kg)
  unit_type: 'piece' | 'weight' | 'meter' | 'box';
  order_id?: string;
  reason: 'sale' | 'return' | 'loss' | 'adjustment' | 'transfer';
  notes?: string;
  device_id?: string;
  color_id?: string;
  size_id?: string;
  specific_batch_id?: string; // لاختيار دفعة محددة
}

export interface BatchMovement {
  id: string;
  organization_id: string;
  batch_id: string;
  product_id: string;
  delta_quantity: number; // سالب للاستهلاك، موجب للإرجاع
  unit_type: 'piece' | 'weight' | 'meter' | 'box';
  source: 'sale' | 'return' | 'loss' | 'adjustment' | 'transfer';
  order_id?: string;
  device_id: string;
  created_at: string;
  synced: number; // 0 = لم يُزامن، 1 = تم المزامنة
}

export interface ConsumeResult {
  success: boolean;
  consumed: Array<{
    batch_id: string;
    batch_number: string;
    quantity_consumed: number;
    expiry_date?: string;
  }>;
  remaining: number;
  movements: BatchMovement[];
  error?: string;
}

// =====================================================
// الخدمة الرئيسية
// =====================================================

/**
 * خدمة الدفعات المحلية - تعمل offline 100%
 */
export class LocalBatchService {
  private db: any; // PowerSync database instance
  private deviceId: string;

  constructor(db: any, deviceId?: string) {
    this.db = db;
    this.deviceId = deviceId || this.generateDeviceId();
  }

  /**
   * توليد معرف فريد للجهاز
   */
  private generateDeviceId(): string {
    const stored = localStorage.getItem('device_id');
    if (stored) return stored;
    const newId = `device_${uuidv4().slice(0, 8)}`;
    localStorage.setItem('device_id', newId);
    return newId;
  }

  // =====================================================
  // دوال القراءة المحلية
  // =====================================================

  /**
   * جلب دفعات منتج معين - FEFO (First Expiry, First Out)
   */
  async getProductBatchesFEFO(
    productId: string,
    orgId: string,
    options?: {
      includeEmpty?: boolean;
      colorId?: string;
      sizeId?: string;
    }
  ): Promise<LocalBatch[]> {
    let query = `
      SELECT * FROM inventory_batches
      WHERE product_id = ? AND organization_id = ?
    `;
    const params: any[] = [productId, orgId];

    if (!options?.includeEmpty) {
      query += ' AND quantity_remaining > 0';
    }

    if (options?.colorId) {
      query += ' AND color_id = ?';
      params.push(options.colorId);
    }

    if (options?.sizeId) {
      query += ' AND size_id = ?';
      params.push(options.sizeId);
    }

    // FEFO: الأقرب انتهاءً أولاً، ثم الأقدم إنشاءً
    query += `
      ORDER BY
        CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END,
        expiry_date ASC,
        created_at ASC
    `;

    const result = await this.db.execute(query, params);
    return (result.rows?._array || []).map(this.enrichBatchData);
  }

  /**
   * جلب دفعات منتج معين - FIFO (First In, First Out)
   */
  async getProductBatchesFIFO(
    productId: string,
    orgId: string,
    options?: {
      includeEmpty?: boolean;
      colorId?: string;
      sizeId?: string;
    }
  ): Promise<LocalBatch[]> {
    let query = `
      SELECT * FROM inventory_batches
      WHERE product_id = ? AND organization_id = ?
    `;
    const params: any[] = [productId, orgId];

    if (!options?.includeEmpty) {
      query += ' AND quantity_remaining > 0';
    }

    if (options?.colorId) {
      query += ' AND color_id = ?';
      params.push(options.colorId);
    }

    if (options?.sizeId) {
      query += ' AND size_id = ?';
      params.push(options.sizeId);
    }

    // FIFO: الأقدم أولاً
    query += ' ORDER BY created_at ASC';

    const result = await this.db.execute(query, params);
    return (result.rows?._array || []).map(this.enrichBatchData);
  }

  /**
   * جلب الدفعات التي ستنتهي صلاحيتها قريباً
   */
  async getExpiringBatches(
    orgId: string,
    daysAhead: number = 30
  ): Promise<LocalBatch[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + daysAhead);

    const query = `
      SELECT * FROM inventory_batches
      WHERE organization_id = ?
        AND quantity_remaining > 0
        AND expiry_date IS NOT NULL
        AND expiry_date >= ?
        AND expiry_date <= ?
      ORDER BY expiry_date ASC
    `;

    const result = await this.db.execute(query, [
      orgId,
      now.toISOString(),
      futureDate.toISOString()
    ]);

    return (result.rows?._array || []).map(this.enrichBatchData);
  }

  /**
   * جلب دفعة واحدة بالمعرف
   */
  async getBatchById(batchId: string): Promise<LocalBatch | null> {
    const result = await this.db.execute(
      'SELECT * FROM inventory_batches WHERE id = ?',
      [batchId]
    );
    const batch = result.rows?._array?.[0];
    return batch ? this.enrichBatchData(batch) : null;
  }

  /**
   * الحصول على إجمالي الكمية المتاحة لمنتج
   */
  async getTotalAvailableQuantity(
    productId: string,
    orgId: string,
    options?: { colorId?: string; sizeId?: string }
  ): Promise<number> {
    let query = `
      SELECT COALESCE(SUM(quantity_remaining), 0) as total
      FROM inventory_batches
      WHERE product_id = ? AND organization_id = ? AND quantity_remaining > 0
    `;
    const params: any[] = [productId, orgId];

    if (options?.colorId) {
      query += ' AND color_id = ?';
      params.push(options.colorId);
    }

    if (options?.sizeId) {
      query += ' AND size_id = ?';
      params.push(options.sizeId);
    }

    const result = await this.db.execute(query, params);
    return result.rows?._array?.[0]?.total || 0;
  }

  // =====================================================
  // دوال الكتابة المحلية
  // =====================================================

  /**
   * استهلاك كمية من الدفعات (FEFO/FIFO)
   * يدعم الكميات العشرية (decimal) للوزن والمتر
   */
  async consumeFromBatches(input: BatchConsumptionInput): Promise<ConsumeResult> {
    const {
      product_id,
      organization_id,
      quantity,
      unit_type,
      order_id,
      reason,
      notes,
      color_id,
      size_id,
      specific_batch_id
    } = input;

    try {
      // إذا تم تحديد دفعة معينة
      if (specific_batch_id) {
        return await this.consumeFromSpecificBatch(
          specific_batch_id,
          quantity,
          unit_type,
          order_id,
          reason,
          notes
        );
      }

      // جلب الدفعات المتاحة بترتيب FEFO
      const batches = await this.getProductBatchesFEFO(product_id, organization_id, {
        colorId: color_id,
        sizeId: size_id
      });

      if (batches.length === 0) {
        return {
          success: false,
          consumed: [],
          remaining: quantity,
          movements: [],
          error: 'لا توجد دفعات متاحة لهذا المنتج'
        };
      }

      const consumed: ConsumeResult['consumed'] = [];
      const movements: BatchMovement[] = [];
      let remaining = quantity;

      // استهلاك من الدفعات بالترتيب
      for (const batch of batches) {
        if (remaining <= 0) break;

        const available = batch.quantity_remaining;
        const toConsume = Math.min(available, remaining);

        if (toConsume > 0) {
          // تحديث الدفعة
          const newQuantity = available - toConsume;
          await this.db.execute(
            `UPDATE inventory_batches
             SET quantity_remaining = ?, updated_at = ?
             WHERE id = ?`,
            [newQuantity, new Date().toISOString(), batch.id]
          );

          // إنشاء حركة في ledger
          const movement = await this.createMovement({
            batch_id: batch.id,
            product_id,
            organization_id,
            delta_quantity: -toConsume, // سالب للاستهلاك
            unit_type,
            source: reason,
            order_id,
            notes
          });

          consumed.push({
            batch_id: batch.id,
            batch_number: batch.batch_number,
            quantity_consumed: toConsume,
            expiry_date: batch.expiry_date
          });

          movements.push(movement);
          remaining -= toConsume;
        }
      }

      return {
        success: remaining === 0,
        consumed,
        remaining,
        movements,
        error: remaining > 0 ? `تبقى ${remaining} وحدة غير متاحة` : undefined
      };

    } catch (error: any) {
      console.error('❌ [LocalBatchService] خطأ في استهلاك الدفعات:', error);
      return {
        success: false,
        consumed: [],
        remaining: quantity,
        movements: [],
        error: error.message || 'حدث خطأ أثناء استهلاك الدفعات'
      };
    }
  }

  /**
   * استهلاك من دفعة محددة
   */
  private async consumeFromSpecificBatch(
    batchId: string,
    quantity: number,
    unitType: BatchConsumptionInput['unit_type'],
    orderId?: string,
    reason: BatchConsumptionInput['reason'] = 'sale',
    notes?: string
  ): Promise<ConsumeResult> {
    const batch = await this.getBatchById(batchId);

    if (!batch) {
      return {
        success: false,
        consumed: [],
        remaining: quantity,
        movements: [],
        error: 'الدفعة غير موجودة'
      };
    }

    if (batch.quantity_remaining < quantity) {
      return {
        success: false,
        consumed: [],
        remaining: quantity,
        movements: [],
        error: `الكمية المتاحة (${batch.quantity_remaining}) أقل من المطلوب (${quantity})`
      };
    }

    // تحديث الدفعة
    const newQuantity = batch.quantity_remaining - quantity;
    await this.db.execute(
      `UPDATE inventory_batches
       SET quantity_remaining = ?, updated_at = ?
       WHERE id = ?`,
      [newQuantity, new Date().toISOString(), batchId]
    );

    // إنشاء حركة
    const movement = await this.createMovement({
      batch_id: batchId,
      product_id: batch.product_id,
      organization_id: batch.organization_id,
      delta_quantity: -quantity,
      unit_type: unitType,
      source: reason,
      order_id: orderId,
      notes
    });

    return {
      success: true,
      consumed: [{
        batch_id: batchId,
        batch_number: batch.batch_number,
        quantity_consumed: quantity,
        expiry_date: batch.expiry_date
      }],
      remaining: 0,
      movements: [movement]
    };
  }

  /**
   * إرجاع كمية للدفعة
   */
  async returnToBatch(
    batchId: string,
    quantity: number,
    orderId?: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const batch = await this.getBatchById(batchId);
      if (!batch) {
        return { success: false, error: 'الدفعة غير موجودة' };
      }

      const newQuantity = batch.quantity_remaining + quantity;
      if (newQuantity > batch.quantity_received) {
        return {
          success: false,
          error: 'الكمية المرجعة تتجاوز الكمية الأصلية'
        };
      }

      // تحديث الدفعة
      await this.db.execute(
        `UPDATE inventory_batches
         SET quantity_remaining = ?, updated_at = ?
         WHERE id = ?`,
        [newQuantity, new Date().toISOString(), batchId]
      );

      // إنشاء حركة (موجبة للإرجاع)
      await this.createMovement({
        batch_id: batchId,
        product_id: batch.product_id,
        organization_id: batch.organization_id,
        delta_quantity: quantity, // موجب للإرجاع
        unit_type: 'piece',
        source: 'return',
        order_id: orderId,
        notes
      });

      return { success: true };
    } catch (error: any) {
      console.error('❌ [LocalBatchService] خطأ في إرجاع الكمية:', error);
      return { success: false, error: error.message };
    }
  }

  // =====================================================
  // دوال Ledger (سجل الحركات)
  // =====================================================

  /**
   * إنشاء حركة جديدة في ledger
   */
  private async createMovement(data: {
    batch_id: string;
    product_id: string;
    organization_id: string;
    delta_quantity: number;
    unit_type: string;
    source: string;
    order_id?: string;
    notes?: string;
  }): Promise<BatchMovement> {
    const movement: BatchMovement = {
      id: uuidv4(),
      organization_id: data.organization_id,
      batch_id: data.batch_id,
      product_id: data.product_id,
      delta_quantity: data.delta_quantity,
      unit_type: data.unit_type as BatchMovement['unit_type'],
      source: data.source as BatchMovement['source'],
      order_id: data.order_id,
      device_id: this.deviceId,
      created_at: new Date().toISOString(),
      synced: 0
    };

    // حفظ في جدول الحركات المحلي
    await this.db.execute(`
      INSERT INTO inventory_batch_movements
      (id, organization_id, batch_id, product_id, delta_quantity, unit_type, source, order_id, device_id, created_at, synced)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      movement.id,
      movement.organization_id,
      movement.batch_id,
      movement.product_id,
      movement.delta_quantity,
      movement.unit_type,
      movement.source,
      movement.order_id || null,
      movement.device_id,
      movement.created_at,
      movement.synced
    ]);

    return movement;
  }

  /**
   * جلب حركات دفعة معينة
   */
  async getBatchMovements(batchId: string): Promise<BatchMovement[]> {
    const result = await this.db.execute(
      'SELECT * FROM inventory_batch_movements WHERE batch_id = ? ORDER BY created_at DESC',
      [batchId]
    );
    return result.rows?._array || [];
  }

  /**
   * جلب الحركات غير المُزامنة
   */
  async getUnsyncedMovements(): Promise<BatchMovement[]> {
    const result = await this.db.execute(
      'SELECT * FROM inventory_batch_movements WHERE synced = 0 ORDER BY created_at ASC'
    );
    return result.rows?._array || [];
  }

  /**
   * تحديد الحركات كمُزامنة
   */
  async markMovementsAsSynced(movementIds: string[]): Promise<void> {
    if (movementIds.length === 0) return;

    const placeholders = movementIds.map(() => '?').join(',');
    await this.db.execute(
      `UPDATE inventory_batch_movements SET synced = 1 WHERE id IN (${placeholders})`,
      movementIds
    );
  }

  // =====================================================
  // دوال مساعدة
  // =====================================================

  /**
   * إثراء بيانات الدفعة بالحقول المحسوبة
   */
  private enrichBatchData(batch: any): LocalBatch {
    const now = new Date();
    let daysUntilExpiry: number | undefined;
    let isExpired = false;

    if (batch.expiry_date) {
      const expiryDate = new Date(batch.expiry_date);
      const diffTime = expiryDate.getTime() - now.getTime();
      daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      isExpired = daysUntilExpiry <= 0;
    }

    return {
      ...batch,
      days_until_expiry: daysUntilExpiry,
      is_expired: isExpired
    };
  }
}

// =====================================================
// React Hook للاستخدام في المكونات
// =====================================================

/**
 * Hook لاستخدام خدمة الدفعات المحلية
 */
export function useLocalBatchService() {
  const powerSync = usePowerSync();
  const service = new LocalBatchService(powerSync);

  return {
    // قراءة
    getProductBatchesFEFO: service.getProductBatchesFEFO.bind(service),
    getProductBatchesFIFO: service.getProductBatchesFIFO.bind(service),
    getExpiringBatches: service.getExpiringBatches.bind(service),
    getBatchById: service.getBatchById.bind(service),
    getTotalAvailableQuantity: service.getTotalAvailableQuantity.bind(service),

    // كتابة
    consumeFromBatches: service.consumeFromBatches.bind(service),
    returnToBatch: service.returnToBatch.bind(service),

    // ledger
    getBatchMovements: service.getBatchMovements.bind(service),
    getUnsyncedMovements: service.getUnsyncedMovements.bind(service),
    markMovementsAsSynced: service.markMovementsAsSynced.bind(service)
  };
}

export default LocalBatchService;
