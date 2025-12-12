/**
 * 🔒 useSerialReservation - Hook لإدارة حجز الأرقام التسلسلية
 * ============================================================
 * يُستخدم لحجز الأرقام التسلسلية تلقائياً عند الإضافة للسلة
 *
 * الميزات:
 * - حجز تلقائي عند اختيار serial
 * - تحرير تلقائي عند إزالة المنتج من السلة
 * - تحرير تلقائي عند انتهاء مدة الحجز
 * - التعامل مع التعارضات (جهاز آخر حجز نفس الـ serial)
 * - تحويل الحجز لبيع عند إتمام الطلب
 *
 * @version 1.0.0
 * @date 2025-12-12
 */

import { useCallback, useEffect, useRef } from 'react';
import { usePowerSync } from '@powersync/react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { LocalSerialService, SerialConflict } from '@/services/local';

// =====================================================
// الأنواع
// =====================================================

export interface ReservedSerial {
  serialId: string;
  serialNumber: string;
  productId: string;
  productName: string;
  reservedAt: Date;
  expiresAt: Date;
}

export interface UseSerialReservationOptions {
  /**
   * مدة الحجز بالدقائق (افتراضي: 30)
   */
  reservationMinutes?: number;
  /**
   * معرف مسودة الطلب (يُستخدم لتتبع الحجوزات)
   */
  orderDraftId?: string;
  /**
   * callback عند حدوث تعارض
   */
  onConflict?: (conflict: SerialConflict) => void;
  /**
   * callback عند انتهاء صلاحية الحجز
   */
  onExpired?: (serial: ReservedSerial) => void;
}

// =====================================================
// Hook الرئيسي
// =====================================================

export function useSerialReservation(options: UseSerialReservationOptions = {}) {
  const {
    reservationMinutes = 30,
    orderDraftId: providedOrderDraftId,
    onConflict,
    onExpired
  } = options;

  const powerSync = usePowerSync();
  const localSerialService = new LocalSerialService(powerSync);

  // معرف مسودة الطلب (إما مُمرر أو يُنشأ جديد)
  const orderDraftId = useRef(providedOrderDraftId || uuidv4());

  // قائمة الأرقام المحجوزة
  const reservedSerials = useRef<Map<string, ReservedSerial>>(new Map());

  // مؤقت لتحرير الحجوزات المنتهية
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // =====================================================
  // تحرير الحجوزات المنتهية
  // =====================================================

  const cleanupExpiredReservations = useCallback(async () => {
    const now = new Date();
    const expiredSerials: ReservedSerial[] = [];

    for (const [serialId, reservation] of reservedSerials.current) {
      if (reservation.expiresAt < now) {
        expiredSerials.push(reservation);
        reservedSerials.current.delete(serialId);
      }
    }

    // تحرير الحجوزات في قاعدة البيانات
    if (expiredSerials.length > 0) {
      for (const serial of expiredSerials) {
        await localSerialService.releaseSerial(serial.serialId);
        onExpired?.(serial);
      }

      console.log(`🔓 [useSerialReservation] تم تحرير ${expiredSerials.length} حجز منتهي`);
    }
  }, [localSerialService, onExpired]);

  // بدء مراقبة الحجوزات المنتهية
  useEffect(() => {
    cleanupIntervalRef.current = setInterval(cleanupExpiredReservations, 60000); // كل دقيقة

    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
    };
  }, [cleanupExpiredReservations]);

  // =====================================================
  // حجز رقم تسلسلي
  // =====================================================

  /**
   * حجز رقم تسلسلي عند إضافة منتج للسلة
   */
  const reserveSerial = useCallback(async (
    serialNumber: string,
    organizationId: string,
    productId: string,
    productName: string
  ): Promise<{ success: boolean; conflict?: SerialConflict; error?: string }> => {
    console.log(`🔒 [useSerialReservation] محاولة حجز: ${serialNumber}`);

    const result = await localSerialService.reserveSerial({
      serial_number: serialNumber,
      organization_id: organizationId,
      order_draft_id: orderDraftId.current,
      reservation_minutes: reservationMinutes
    });

    if (result.success && result.serial) {
      const reservation: ReservedSerial = {
        serialId: result.serial.id,
        serialNumber: result.serial.serial_number,
        productId,
        productName,
        reservedAt: new Date(),
        expiresAt: new Date(Date.now() + reservationMinutes * 60 * 1000)
      };

      reservedSerials.current.set(result.serial.id, reservation);

      console.log(`✅ [useSerialReservation] تم حجز: ${serialNumber} حتى ${reservation.expiresAt.toLocaleTimeString()}`);

      return { success: true };
    }

    // معالجة التعارض
    if (result.conflict) {
      console.warn(`⚠️ [useSerialReservation] تعارض: ${result.conflict.conflict_type}`);
      onConflict?.(result.conflict);

      if (result.conflict.conflict_type === 'already_reserved') {
        toast.error('الرقم التسلسلي محجوز', {
          description: 'تم حجز هذا الرقم من جهاز آخر'
        });
      } else if (result.conflict.conflict_type === 'already_sold') {
        toast.error('الرقم التسلسلي مُباع', {
          description: 'تم بيع هذا الرقم مسبقاً'
        });
      }

      return { success: false, conflict: result.conflict };
    }

    return { success: false, error: result.error };
  }, [localSerialService, reservationMinutes, onConflict]);

  // =====================================================
  // تحرير حجز رقم تسلسلي
  // =====================================================

  /**
   * تحرير حجز رقم تسلسلي عند إزالة المنتج من السلة
   */
  const releaseSerial = useCallback(async (
    serialIdOrNumber: string,
    organizationId?: string
  ): Promise<{ success: boolean; error?: string }> => {
    console.log(`🔓 [useSerialReservation] تحرير حجز: ${serialIdOrNumber}`);

    // حذف من القائمة المحلية
    reservedSerials.current.delete(serialIdOrNumber);

    // محاولة البحث بالرقم التسلسلي
    for (const [id, reservation] of reservedSerials.current) {
      if (reservation.serialNumber === serialIdOrNumber) {
        reservedSerials.current.delete(id);
        break;
      }
    }

    // تحرير في قاعدة البيانات
    const result = await localSerialService.releaseSerial(serialIdOrNumber, organizationId);

    if (result.success) {
      console.log(`✅ [useSerialReservation] تم تحرير: ${serialIdOrNumber}`);
    }

    return result;
  }, [localSerialService]);

  // =====================================================
  // تحرير جميع الحجوزات
  // =====================================================

  /**
   * تحرير جميع الحجوزات (عند إلغاء الطلب)
   */
  const releaseAllReservations = useCallback(async (): Promise<number> => {
    console.log('🔓 [useSerialReservation] تحرير جميع الحجوزات...');

    const count = await localSerialService.releaseOrderReservations(orderDraftId.current);
    reservedSerials.current.clear();

    console.log(`✅ [useSerialReservation] تم تحرير ${count} حجز`);
    return count;
  }, [localSerialService]);

  // =====================================================
  // الحصول على معلومات الحجوزات
  // =====================================================

  /**
   * الحصول على قائمة الأرقام المحجوزة
   */
  const getReservedSerials = useCallback((): ReservedSerial[] => {
    return Array.from(reservedSerials.current.values());
  }, []);

  /**
   * التحقق إذا كان رقم تسلسلي محجوز
   */
  const isSerialReserved = useCallback((serialIdOrNumber: string): boolean => {
    if (reservedSerials.current.has(serialIdOrNumber)) {
      return true;
    }

    for (const reservation of reservedSerials.current.values()) {
      if (reservation.serialNumber === serialIdOrNumber) {
        return true;
      }
    }

    return false;
  }, []);

  /**
   * الحصول على معرف مسودة الطلب
   */
  const getOrderDraftId = useCallback((): string => {
    return orderDraftId.current;
  }, []);

  // =====================================================
  // تنظيف عند إلغاء التحميل
  // =====================================================

  useEffect(() => {
    return () => {
      // تحرير الحجوزات عند إلغاء تحميل المكون
      // (يمكن تعطيل هذا إذا أردت الاحتفاظ بالحجوزات)
      // releaseAllReservations();
    };
  }, []);

  // =====================================================
  // التصدير
  // =====================================================

  return {
    // العمليات الأساسية
    reserveSerial,
    releaseSerial,
    releaseAllReservations,

    // الاستعلامات
    getReservedSerials,
    isSerialReserved,
    getOrderDraftId,

    // معلومات
    reservationMinutes,
    reservedCount: reservedSerials.current.size
  };
}

export default useSerialReservation;
