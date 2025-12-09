/**
 * 🔄 Batch and Serial Tracking Hook
 *
 * Hook لإدارة تتبع الدفعات والأرقام التسلسلية للمنتجات في POS
 * يوفر واجهة موحدة للتعامل مع batchService و serialNumberService
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { batchService, type InventoryBatch, type BatchSummary } from '@/api/batchService';
import { serialNumberService, type ProductSerial } from '@/api/serialNumberService';

// أنواع الدفعات للعرض في UI
export interface BatchInfo {
  id: string;
  batch_number: string;
  remaining_quantity: number;
  expiry_date?: string;
  purchase_price?: number;
  received_date?: string;
  status: 'active' | 'low' | 'expired' | 'expiring_soon';
}

// أنواع الأرقام التسلسلية للعرض في UI
export interface SerialInfo {
  id: string;
  serial_number: string;
  status: 'available' | 'sold' | 'reserved' | 'returned' | 'defective';
  imei?: string;
  mac_address?: string;
  warranty_end_date?: string;
}

interface UseBatchAndSerialTrackingOptions {
  productId: string;
  enabled?: boolean;
}

interface UseBatchAndSerialTrackingReturn {
  // الدفعات
  batches: BatchInfo[];
  batchSummary: BatchSummary | null;
  loadingBatches: boolean;
  refreshBatches: () => Promise<void>;

  // الأرقام التسلسلية
  serials: SerialInfo[];
  availableSerials: SerialInfo[];
  loadingSerials: boolean;
  refreshSerials: () => Promise<void>;
  validateSerial: (serial: string) => Promise<{ valid: boolean; message?: string; info?: SerialInfo }>;

  // عمليات البيع
  consumeBatch: (batchId: string, quantity: number, orderId: string) => Promise<boolean>;
  sellSerials: (serialNumbers: string[], orderId: string, customerId?: string, soldPrice?: number) => Promise<boolean>;

  // حالة عامة
  loading: boolean;
  error: string | null;
}

// تحويل InventoryBatch إلى BatchInfo
const toBatchInfo = (batch: InventoryBatch): BatchInfo => {
  let status: BatchInfo['status'] = 'active';

  if (batch.expiry_date) {
    const today = new Date();
    const expiryDate = new Date(batch.expiry_date);
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) status = 'expired';
    else if (daysUntilExpiry <= 30) status = 'expiring_soon';
  }

  if (batch.remaining_quantity <= 5 && status === 'active') {
    status = 'low';
  }

  return {
    id: batch.id,
    batch_number: batch.batch_number,
    remaining_quantity: batch.remaining_quantity,
    expiry_date: batch.expiry_date || undefined,
    purchase_price: batch.purchase_price || undefined,
    received_date: batch.received_date || undefined,
    status
  };
};

// تحويل ProductSerial إلى SerialInfo
const toSerialInfo = (serial: ProductSerial): SerialInfo => {
  return {
    id: serial.id,
    serial_number: serial.serial_number,
    status: serial.status as SerialInfo['status'],
    imei: serial.imei || undefined,
    mac_address: serial.mac_address || undefined,
    warranty_end_date: serial.warranty_end_date || undefined
  };
};

export const useBatchAndSerialTracking = ({
  productId,
  enabled = true
}: UseBatchAndSerialTrackingOptions): UseBatchAndSerialTrackingReturn => {
  const { organizationId } = useAuth();

  const [batches, setBatches] = useState<BatchInfo[]>([]);
  const [batchSummary, setBatchSummary] = useState<BatchSummary | null>(null);
  const [loadingBatches, setLoadingBatches] = useState(false);

  const [serials, setSerials] = useState<SerialInfo[]>([]);
  const [loadingSerials, setLoadingSerials] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // جلب الدفعات
  const refreshBatches = useCallback(async () => {
    if (!enabled || !organizationId || !productId) return;

    setLoadingBatches(true);
    setError(null);

    try {
      const [batchesResult, summaryResult] = await Promise.all([
        batchService.getProductBatches(productId, organizationId, 'active'),
        batchService.getBatchSummary(productId, organizationId)
      ]);

      if (batchesResult.success && batchesResult.data) {
        setBatches(batchesResult.data.map(toBatchInfo));
      }

      if (summaryResult.success && summaryResult.data) {
        setBatchSummary(summaryResult.data);
      }
    } catch (err) {
      console.error('[useBatchAndSerialTracking] Error fetching batches:', err);
      setError('فشل في جلب الدفعات');
    } finally {
      setLoadingBatches(false);
    }
  }, [enabled, organizationId, productId]);

  // جلب الأرقام التسلسلية
  const refreshSerials = useCallback(async () => {
    if (!enabled || !organizationId || !productId) return;

    setLoadingSerials(true);
    setError(null);

    try {
      const result = await serialNumberService.getProductSerials(productId, organizationId);

      if (result.success && result.data) {
        setSerials(result.data.map(toSerialInfo));
      }
    } catch (err) {
      console.error('[useBatchAndSerialTracking] Error fetching serials:', err);
      setError('فشل في جلب الأرقام التسلسلية');
    } finally {
      setLoadingSerials(false);
    }
  }, [enabled, organizationId, productId]);

  // جلب البيانات عند التحميل
  useEffect(() => {
    if (enabled && organizationId && productId) {
      refreshBatches();
      refreshSerials();
    }
  }, [enabled, organizationId, productId, refreshBatches, refreshSerials]);

  // الأرقام التسلسلية المتاحة فقط
  const availableSerials = useMemo(() =>
    serials.filter(s => s.status === 'available'),
    [serials]
  );

  // التحقق من رقم تسلسلي
  const validateSerial = useCallback(async (serial: string): Promise<{ valid: boolean; message?: string; info?: SerialInfo }> => {
    if (!organizationId) {
      return { valid: false, message: 'خطأ في المؤسسة' };
    }

    try {
      const result = await serialNumberService.findBySerialNumber(serial, organizationId);

      if (!result.success || !result.data) {
        return { valid: false, message: 'الرقم التسلسلي غير موجود' };
      }

      const serialData = result.data;

      if (serialData.status !== 'available') {
        const statusLabels: Record<string, string> = {
          sold: 'مباع',
          reserved: 'محجوز',
          returned: 'مرتجع',
          defective: 'معيب'
        };
        return { valid: false, message: `هذا الرقم ${statusLabels[serialData.status] || 'غير متاح'}` };
      }

      return {
        valid: true,
        info: toSerialInfo(serialData)
      };
    } catch (err) {
      return { valid: false, message: 'خطأ في التحقق من الرقم التسلسلي' };
    }
  }, [organizationId]);

  // استهلاك من دفعة (عند البيع)
  const consumeBatch = useCallback(async (batchId: string, quantity: number, orderId: string): Promise<boolean> => {
    if (!organizationId) {
      toast.error('خطأ في المؤسسة');
      return false;
    }

    try {
      const result = await batchService.consumeFromBatches(
        productId,
        organizationId,
        quantity,
        orderId,
        'sale'
      );

      if (result.success) {
        // تحديث البيانات
        await refreshBatches();
        return true;
      } else {
        toast.error(result.error || 'فشل في استهلاك الدفعة');
        return false;
      }
    } catch (err) {
      console.error('[useBatchAndSerialTracking] Error consuming batch:', err);
      toast.error('فشل في استهلاك الدفعة');
      return false;
    }
  }, [organizationId, productId, refreshBatches]);

  // بيع أرقام تسلسلية
  const sellSerials = useCallback(async (
    serialNumbers: string[],
    orderId: string,
    customerId?: string,
    soldPrice?: number
  ): Promise<boolean> => {
    if (!organizationId) {
      toast.error('خطأ في المؤسسة');
      return false;
    }

    try {
      // بيع كل رقم تسلسلي
      const results = await Promise.all(
        serialNumbers.map(serial =>
          serialNumberService.sellSerial(serial, organizationId, orderId, customerId, soldPrice)
        )
      );

      const allSuccess = results.every(r => r.success);

      if (allSuccess) {
        // تحديث البيانات
        await refreshSerials();
        return true;
      } else {
        const failedCount = results.filter(r => !r.success).length;
        toast.error(`فشل في بيع ${failedCount} رقم تسلسلي`);
        return false;
      }
    } catch (err) {
      console.error('[useBatchAndSerialTracking] Error selling serials:', err);
      toast.error('فشل في بيع الأرقام التسلسلية');
      return false;
    }
  }, [organizationId, refreshSerials]);

  return {
    // الدفعات
    batches,
    batchSummary,
    loadingBatches,
    refreshBatches,

    // الأرقام التسلسلية
    serials,
    availableSerials,
    loadingSerials,
    refreshSerials,
    validateSerial,

    // عمليات البيع
    consumeBatch,
    sellSerials,

    // حالة عامة
    loading: loadingBatches || loadingSerials,
    error
  };
};

export default useBatchAndSerialTracking;
