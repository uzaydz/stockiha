/**
 * 🔢 Local Serial Service - خدمة الأرقام التسلسلية المحلية
 * ============================================================
 * تعمل 100% offline باستخدام PowerSync/SQLite
 *
 * الميزات:
 * - قراءة الأرقام التسلسلية محلياً
 * - حجز (reserve) الأرقام التسلسلية عند الإضافة للسلة
 * - بيع الأرقام التسلسلية محلياً
 * - إدارة الضمان محلياً
 * - معالجة التعارضات لتعدد الأجهزة
 *
 * نظام الحجز:
 * - عند إضافة منتج بتتبع تسلسلي للسلة → يُحجز الرقم فوراً
 * - الحجز يحتوي على: device_id, expiry_time, order_draft_id
 * - عند الإزالة من السلة / إلغاء / timeout → يُحرر الرقم
 * - عند الدفع → يتحول من reserved إلى sold
 *
 * @version 1.0.0
 * @date 2025-12-12
 */

import { usePowerSync } from '@powersync/react';
import { v4 as uuidv4 } from 'uuid';

// =====================================================
// الأنواع
// =====================================================

export type LocalSerialStatus = 'available' | 'reserved' | 'sold' | 'returned' | 'defective' | 'warranty_claimed';

export interface LocalSerial {
  id: string;
  organization_id: string;
  product_id: string;
  color_id?: string;
  size_id?: string;
  batch_id?: string;
  serial_number: string;
  imei?: string;
  mac_address?: string;
  status: LocalSerialStatus;
  // الحجز
  reserved_by_device?: string;
  reserved_at?: string;
  reservation_expires_at?: string;
  reservation_order_draft_id?: string;
  // الضمان
  warranty_start_date?: string;
  warranty_end_date?: string;
  warranty_claimed: number; // SQLite boolean
  warranty_claim_date?: string;
  warranty_claim_reason?: string;
  warranty_claim_resolution?: string;
  // الشراء
  purchase_date?: string;
  purchase_price?: number;
  purchase_supplier_id?: string;
  purchase_invoice_number?: string;
  // البيع
  sold_at?: string;
  sold_in_order_id?: string;
  sold_to_customer_id?: string;
  sold_price?: number;
  sold_by_user_id?: string;
  // الإرجاع
  returned_at?: string;
  return_reason?: string;
  return_condition?: string;
  // الموقع
  location?: string;
  shelf_number?: string;
  notes?: string;
  internal_notes?: string;
  // التتبع
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  // حقول محسوبة
  warranty_days_remaining?: number;
  is_under_warranty?: boolean;
  is_reservation_expired?: boolean;
}

export interface ReserveSerialInput {
  serial_id?: string; // إما بالمعرف
  serial_number?: string; // أو برقم السيريال
  organization_id: string;
  order_draft_id: string;
  reservation_minutes?: number; // مدة الحجز (افتراضي: 30 دقيقة)
}

export interface SellSerialInput {
  serial_id: string;
  order_id: string;
  customer_id?: string;
  sold_price: number;
  sold_by_user_id?: string;
  warranty_months?: number;
  warranty_start_date?: string;
}

export interface SerialConflict {
  serial_id: string;
  serial_number: string;
  conflict_type: 'already_reserved' | 'already_sold' | 'not_found';
  reserved_by_device?: string;
  reserved_at?: string;
  sold_at?: string;
}

// =====================================================
// الخدمة الرئيسية
// =====================================================

/**
 * خدمة الأرقام التسلسلية المحلية - تعمل offline 100%
 */
export class LocalSerialService {
  private db: any;
  private deviceId: string;
  private readonly DEFAULT_RESERVATION_MINUTES = 30;

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
   * البحث برقم تسلسلي (serial_number أو IMEI أو MAC)
   */
  async findBySerialNumber(
    serialNumber: string,
    orgId: string
  ): Promise<LocalSerial | null> {
    const result = await this.db.execute(`
      SELECT * FROM product_serial_numbers
      WHERE organization_id = ?
        AND (serial_number = ? OR imei = ? OR mac_address = ?)
      LIMIT 1
    `, [orgId, serialNumber, serialNumber, serialNumber]);

    const serial = result.rows?._array?.[0];
    return serial ? this.enrichSerialData(serial) : null;
  }

  /**
   * جلب الأرقام التسلسلية المتاحة للبيع
   * يستبعد: المحجوزة (لأجهزة أخرى)، المباعة، المعيبة
   */
  async getAvailableSerials(
    productId: string,
    orgId: string,
    options?: {
      colorId?: string;
      sizeId?: string;
      limit?: number;
    }
  ): Promise<LocalSerial[]> {
    const now = new Date().toISOString();

    let query = `
      SELECT * FROM product_serial_numbers
      WHERE product_id = ? AND organization_id = ?
        AND (
          status = 'available'
          OR (
            status = 'reserved'
            AND (
              reserved_by_device = ?
              OR reservation_expires_at < ?
            )
          )
        )
    `;
    const params: any[] = [productId, orgId, this.deviceId, now];

    if (options?.colorId) {
      query += ' AND color_id = ?';
      params.push(options.colorId);
    }

    if (options?.sizeId) {
      query += ' AND size_id = ?';
      params.push(options.sizeId);
    }

    query += ' ORDER BY created_at ASC'; // FIFO

    if (options?.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }

    const result = await this.db.execute(query, params);
    return (result.rows?._array || []).map(this.enrichSerialData);
  }

  /**
   * جلب رقم تسلسلي بالمعرف
   */
  async getSerialById(serialId: string): Promise<LocalSerial | null> {
    const result = await this.db.execute(
      'SELECT * FROM product_serial_numbers WHERE id = ?',
      [serialId]
    );
    const serial = result.rows?._array?.[0];
    return serial ? this.enrichSerialData(serial) : null;
  }

  /**
   * عدد الأرقام التسلسلية المتاحة لمنتج
   */
  async getAvailableCount(
    productId: string,
    orgId: string,
    options?: { colorId?: string; sizeId?: string }
  ): Promise<number> {
    const now = new Date().toISOString();

    let query = `
      SELECT COUNT(*) as count FROM product_serial_numbers
      WHERE product_id = ? AND organization_id = ?
        AND (
          status = 'available'
          OR (status = 'reserved' AND reservation_expires_at < ?)
        )
    `;
    const params: any[] = [productId, orgId, now];

    if (options?.colorId) {
      query += ' AND color_id = ?';
      params.push(options.colorId);
    }

    if (options?.sizeId) {
      query += ' AND size_id = ?';
      params.push(options.sizeId);
    }

    const result = await this.db.execute(query, params);
    return result.rows?._array?.[0]?.count || 0;
  }

  /**
   * جلب الأرقام المحجوزة من هذا الجهاز
   */
  async getMyReservedSerials(orderDraftId?: string): Promise<LocalSerial[]> {
    let query = `
      SELECT * FROM product_serial_numbers
      WHERE status = 'reserved' AND reserved_by_device = ?
    `;
    const params: any[] = [this.deviceId];

    if (orderDraftId) {
      query += ' AND reservation_order_draft_id = ?';
      params.push(orderDraftId);
    }

    const result = await this.db.execute(query, params);
    return (result.rows?._array || []).map(this.enrichSerialData);
  }

  // =====================================================
  // دوال الحجز (Reservation)
  // =====================================================

  /**
   * حجز رقم تسلسلي (عند الإضافة للسلة)
   */
  async reserveSerial(input: ReserveSerialInput): Promise<{
    success: boolean;
    serial?: LocalSerial;
    conflict?: SerialConflict;
    error?: string;
  }> {
    try {
      const { serial_id, serial_number, organization_id, order_draft_id, reservation_minutes } = input;

      // البحث عن الرقم التسلسلي
      let serial: LocalSerial | null = null;
      if (serial_id) {
        serial = await this.getSerialById(serial_id);
      } else if (serial_number) {
        serial = await this.findBySerialNumber(serial_number, organization_id);
      }

      if (!serial) {
        return {
          success: false,
          conflict: {
            serial_id: serial_id || '',
            serial_number: serial_number || '',
            conflict_type: 'not_found'
          },
          error: 'الرقم التسلسلي غير موجود'
        };
      }

      const now = new Date();

      // التحقق من الحالة
      if (serial.status === 'sold') {
        return {
          success: false,
          conflict: {
            serial_id: serial.id,
            serial_number: serial.serial_number,
            conflict_type: 'already_sold',
            sold_at: serial.sold_at
          },
          error: 'الرقم التسلسلي مُباع مسبقاً'
        };
      }

      if (serial.status === 'reserved') {
        // تحقق: هل الحجز منتهي الصلاحية؟
        const isExpired = serial.reservation_expires_at &&
          new Date(serial.reservation_expires_at) < now;

        // تحقق: هل هذا الجهاز هو من حجزه؟
        const isMyReservation = serial.reserved_by_device === this.deviceId;

        if (!isExpired && !isMyReservation) {
          return {
            success: false,
            conflict: {
              serial_id: serial.id,
              serial_number: serial.serial_number,
              conflict_type: 'already_reserved',
              reserved_by_device: serial.reserved_by_device,
              reserved_at: serial.reserved_at
            },
            error: 'الرقم التسلسلي محجوز من جهاز آخر'
          };
        }
      }

      // حساب وقت انتهاء الحجز
      const minutes = reservation_minutes || this.DEFAULT_RESERVATION_MINUTES;
      const expiresAt = new Date(now.getTime() + minutes * 60 * 1000);

      // تحديث الحالة إلى محجوز
      await this.db.execute(`
        UPDATE product_serial_numbers
        SET status = 'reserved',
            reserved_by_device = ?,
            reserved_at = ?,
            reservation_expires_at = ?,
            reservation_order_draft_id = ?,
            updated_at = ?
        WHERE id = ?
      `, [
        this.deviceId,
        now.toISOString(),
        expiresAt.toISOString(),
        order_draft_id,
        now.toISOString(),
        serial.id
      ]);

      // إرجاع الرقم المُحدث
      const updatedSerial = await this.getSerialById(serial.id);
      return {
        success: true,
        serial: updatedSerial || undefined
      };

    } catch (error: any) {
      console.error('❌ [LocalSerialService] خطأ في حجز الرقم التسلسلي:', error);
      return {
        success: false,
        error: error.message || 'حدث خطأ أثناء الحجز'
      };
    }
  }

  /**
   * تحرير (إلغاء) حجز رقم تسلسلي
   */
  async releaseSerial(
    serialIdOrNumber: string,
    orgId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // البحث عن الرقم
      let serial: LocalSerial | null = await this.getSerialById(serialIdOrNumber);
      if (!serial && orgId) {
        serial = await this.findBySerialNumber(serialIdOrNumber, orgId);
      }

      if (!serial) {
        return { success: false, error: 'الرقم التسلسلي غير موجود' };
      }

      // التحقق أنه محجوز من هذا الجهاز
      if (serial.status !== 'reserved') {
        return { success: true }; // لا شيء للتحرير
      }

      if (serial.reserved_by_device !== this.deviceId) {
        return {
          success: false,
          error: 'لا يمكن تحرير حجز من جهاز آخر'
        };
      }

      // تحرير الحجز
      await this.db.execute(`
        UPDATE product_serial_numbers
        SET status = 'available',
            reserved_by_device = NULL,
            reserved_at = NULL,
            reservation_expires_at = NULL,
            reservation_order_draft_id = NULL,
            updated_at = ?
        WHERE id = ?
      `, [new Date().toISOString(), serial.id]);

      return { success: true };

    } catch (error: any) {
      console.error('❌ [LocalSerialService] خطأ في تحرير الحجز:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * تحرير جميع الحجوزات المنتهية الصلاحية (يُنفذ دورياً)
   */
  async releaseExpiredReservations(): Promise<number> {
    const now = new Date().toISOString();

    const result = await this.db.execute(`
      UPDATE product_serial_numbers
      SET status = 'available',
          reserved_by_device = NULL,
          reserved_at = NULL,
          reservation_expires_at = NULL,
          reservation_order_draft_id = NULL,
          updated_at = ?
      WHERE status = 'reserved'
        AND reservation_expires_at < ?
    `, [now, now]);

    return result.changes || 0;
  }

  /**
   * تحرير جميع حجوزات طلب معين (عند إلغاء الطلب)
   */
  async releaseOrderReservations(orderDraftId: string): Promise<number> {
    const result = await this.db.execute(`
      UPDATE product_serial_numbers
      SET status = 'available',
          reserved_by_device = NULL,
          reserved_at = NULL,
          reservation_expires_at = NULL,
          reservation_order_draft_id = NULL,
          updated_at = ?
      WHERE status = 'reserved'
        AND reservation_order_draft_id = ?
        AND reserved_by_device = ?
    `, [new Date().toISOString(), orderDraftId, this.deviceId]);

    return result.changes || 0;
  }

  // =====================================================
  // دوال البيع
  // =====================================================

  /**
   * بيع رقم تسلسلي (عند إتمام الدفع)
   */
  async sellSerial(input: SellSerialInput): Promise<{
    success: boolean;
    serial?: LocalSerial;
    error?: string;
  }> {
    try {
      const {
        serial_id,
        order_id,
        customer_id,
        sold_price,
        sold_by_user_id,
        warranty_months,
        warranty_start_date
      } = input;

      const serial = await this.getSerialById(serial_id);
      if (!serial) {
        return { success: false, error: 'الرقم التسلسلي غير موجود' };
      }

      // التحقق من الحالة
      if (serial.status === 'sold') {
        return { success: false, error: 'الرقم التسلسلي مُباع مسبقاً' };
      }

      if (serial.status === 'reserved' && serial.reserved_by_device !== this.deviceId) {
        // التحقق من انتهاء الحجز
        const isExpired = serial.reservation_expires_at &&
          new Date(serial.reservation_expires_at) < new Date();
        if (!isExpired) {
          return { success: false, error: 'الرقم التسلسلي محجوز من جهاز آخر' };
        }
      }

      // حساب تواريخ الضمان
      const now = new Date();
      const warrantyStart = warranty_start_date || now.toISOString();
      let warrantyEnd: string | null = null;

      if (warranty_months && warranty_months > 0) {
        const endDate = new Date(warrantyStart);
        endDate.setMonth(endDate.getMonth() + warranty_months);
        warrantyEnd = endDate.toISOString();
      }

      // تحديث إلى مُباع
      await this.db.execute(`
        UPDATE product_serial_numbers
        SET status = 'sold',
            sold_at = ?,
            sold_in_order_id = ?,
            sold_to_customer_id = ?,
            sold_price = ?,
            sold_by_user_id = ?,
            warranty_start_date = ?,
            warranty_end_date = ?,
            reserved_by_device = NULL,
            reserved_at = NULL,
            reservation_expires_at = NULL,
            reservation_order_draft_id = NULL,
            updated_at = ?
        WHERE id = ?
      `, [
        now.toISOString(),
        order_id,
        customer_id || null,
        sold_price,
        sold_by_user_id || null,
        warrantyStart,
        warrantyEnd,
        now.toISOString(),
        serial_id
      ]);

      const updatedSerial = await this.getSerialById(serial_id);
      return {
        success: true,
        serial: updatedSerial || undefined
      };

    } catch (error: any) {
      console.error('❌ [LocalSerialService] خطأ في بيع الرقم التسلسلي:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * بيع مجموعة أرقام تسلسلية (batch sell)
   */
  async sellMultipleSerials(
    serialIds: string[],
    orderId: string,
    options: {
      customerId?: string;
      soldPrice: number;
      soldByUserId?: string;
      warrantyMonths?: number;
    }
  ): Promise<{
    success: boolean;
    sold: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    const sold: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const serialId of serialIds) {
      const result = await this.sellSerial({
        serial_id: serialId,
        order_id: orderId,
        customer_id: options.customerId,
        sold_price: options.soldPrice,
        sold_by_user_id: options.soldByUserId,
        warranty_months: options.warrantyMonths
      });

      if (result.success) {
        sold.push(serialId);
      } else {
        failed.push({ id: serialId, error: result.error || 'خطأ غير معروف' });
      }
    }

    return {
      success: failed.length === 0,
      sold,
      failed
    };
  }

  // =====================================================
  // دوال الإرجاع والضمان
  // =====================================================

  /**
   * إرجاع رقم تسلسلي
   */
  async returnSerial(
    serialId: string,
    reason: string,
    condition: 'good' | 'damaged' | 'defective'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const serial = await this.getSerialById(serialId);
      if (!serial) {
        return { success: false, error: 'الرقم التسلسلي غير موجود' };
      }

      if (serial.status !== 'sold') {
        return { success: false, error: 'لا يمكن إرجاع رقم غير مُباع' };
      }

      const newStatus: LocalSerialStatus = condition === 'defective' ? 'defective' : 'returned';

      await this.db.execute(`
        UPDATE product_serial_numbers
        SET status = ?,
            returned_at = ?,
            return_reason = ?,
            return_condition = ?,
            updated_at = ?
        WHERE id = ?
      `, [
        newStatus,
        new Date().toISOString(),
        reason,
        condition,
        new Date().toISOString(),
        serialId
      ]);

      return { success: true };

    } catch (error: any) {
      console.error('❌ [LocalSerialService] خطأ في إرجاع الرقم التسلسلي:', error);
      return { success: false, error: error.message };
    }
  }

  // =====================================================
  // دوال التعارضات (للتزامن)
  // =====================================================

  /**
   * التحقق من تعارضات محتملة عند المزامنة
   */
  async checkConflicts(serialIds: string[]): Promise<SerialConflict[]> {
    const conflicts: SerialConflict[] = [];
    const now = new Date().toISOString();

    for (const serialId of serialIds) {
      const serial = await this.getSerialById(serialId);
      if (!serial) continue;

      // التحقق من التعارضات
      if (serial.status === 'sold') {
        conflicts.push({
          serial_id: serial.id,
          serial_number: serial.serial_number,
          conflict_type: 'already_sold',
          sold_at: serial.sold_at
        });
      } else if (
        serial.status === 'reserved' &&
        serial.reserved_by_device !== this.deviceId &&
        serial.reservation_expires_at &&
        serial.reservation_expires_at > now
      ) {
        conflicts.push({
          serial_id: serial.id,
          serial_number: serial.serial_number,
          conflict_type: 'already_reserved',
          reserved_by_device: serial.reserved_by_device,
          reserved_at: serial.reserved_at
        });
      }
    }

    return conflicts;
  }

  // =====================================================
  // دوال مساعدة
  // =====================================================

  /**
   * إثراء بيانات الرقم التسلسلي بالحقول المحسوبة
   */
  private enrichSerialData(serial: any): LocalSerial {
    const now = new Date();
    let warrantyDaysRemaining: number | undefined;
    let isUnderWarranty = false;

    if (serial.warranty_end_date) {
      const warrantyEnd = new Date(serial.warranty_end_date);
      const diffTime = warrantyEnd.getTime() - now.getTime();
      warrantyDaysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      isUnderWarranty = warrantyDaysRemaining > 0;
    }

    let isReservationExpired = false;
    if (serial.status === 'reserved' && serial.reservation_expires_at) {
      isReservationExpired = new Date(serial.reservation_expires_at) < now;
    }

    return {
      ...serial,
      warranty_days_remaining: warrantyDaysRemaining,
      is_under_warranty: isUnderWarranty,
      is_reservation_expired: isReservationExpired
    };
  }

  /**
   * الحصول على معرف الجهاز الحالي
   */
  getDeviceId(): string {
    return this.deviceId;
  }
}

// =====================================================
// React Hook للاستخدام في المكونات
// =====================================================

/**
 * Hook لاستخدام خدمة الأرقام التسلسلية المحلية
 */
export function useLocalSerialService() {
  const powerSync = usePowerSync();
  const service = new LocalSerialService(powerSync);

  return {
    // قراءة
    findBySerialNumber: service.findBySerialNumber.bind(service),
    getAvailableSerials: service.getAvailableSerials.bind(service),
    getSerialById: service.getSerialById.bind(service),
    getAvailableCount: service.getAvailableCount.bind(service),
    getMyReservedSerials: service.getMyReservedSerials.bind(service),

    // حجز
    reserveSerial: service.reserveSerial.bind(service),
    releaseSerial: service.releaseSerial.bind(service),
    releaseExpiredReservations: service.releaseExpiredReservations.bind(service),
    releaseOrderReservations: service.releaseOrderReservations.bind(service),

    // بيع
    sellSerial: service.sellSerial.bind(service),
    sellMultipleSerials: service.sellMultipleSerials.bind(service),

    // إرجاع
    returnSerial: service.returnSerial.bind(service),

    // تعارضات
    checkConflicts: service.checkConflicts.bind(service),

    // معلومات
    getDeviceId: service.getDeviceId.bind(service)
  };
}

export default LocalSerialService;
