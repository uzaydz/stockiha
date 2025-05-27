import { useState, useEffect, useCallback, useRef } from 'react';
import { syncInventoryData } from '@/lib/api/inventory';
import * as inventoryDB from '@/lib/db/inventoryDB';
import { toast } from 'sonner';

export function useInventorySync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncFailures, setSyncFailures] = useState(0);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // تحديث حالة الاتصال
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // عند عودة الاتصال، نعيد ضبط عدد مرات الفشل
      setSyncFailures(0);
    };
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // جلب عدد العناصر غير المتزامنة
  const fetchUnsyncedCount = useCallback(async () => {
    try {
      const count = await inventoryDB.getUnsyncedTransactionsCount();
      setUnsyncedCount(count);
      return count;
    } catch (error) {
      return 0;
    }
  }, []);

  // متغير لتتبع آخر وقت تم فيه تحديث البيانات
  const lastFetchTimeRef = useRef(0);
  
  // نسخة معدلة من جلب عدد العناصر مع تقييد معدل التنفيذ
  const throttledFetchUnsyncedCount = useCallback(async () => {
    const now = Date.now();
    // تنفيذ فقط إذا مر أكثر من 5 ثواني منذ آخر تحديث
    if (now - lastFetchTimeRef.current > 5000) {
      lastFetchTimeRef.current = now;
      return fetchUnsyncedCount();
    }
    return unsyncedCount; // إعادة القيمة الحالية
  }, [fetchUnsyncedCount, unsyncedCount]);

  // مزامنة بيانات المخزون مع استراتيجية الارتداد الأسي
  const syncInventory = useCallback(async () => {
    if (!isOnline) {
      toast.error('لا يمكن المزامنة: أنت غير متصل بالإنترنت');
      return 0;
    }

    if (isSyncing) {
      toast.info('جاري المزامنة بالفعل...');
      return 0;
    }

    // إلغاء أي مؤقتات مزامنة سابقة
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
    }

    setIsSyncing(true);
    try {
      const result = await syncInventoryData();
      
      // نجاح المزامنة: إعادة ضبط عدد مرات الفشل
      setSyncFailures(0);
      
      // تحديث عدد العناصر غير المتزامنة بعد المزامنة
      await fetchUnsyncedCount();
      
      if (result > 0) {
        toast.success(`تمت مزامنة ${result} من عمليات المخزون بنجاح`);
      }
      
      return result;
    } catch (error) {
      
      // زيادة عدد مرات الفشل واستخدام استراتيجية الارتداد الأسي
      const newFailureCount = syncFailures + 1;
      setSyncFailures(newFailureCount);
      
      // حساب وقت الانتظار قبل المحاولة التالية باستخدام الارتداد الأسي
      // مع حد أقصى 10 دقائق بين المحاولات
      const baseDelay = 30000; // 30 ثانية
      const maxDelay = 10 * 60 * 1000; // 10 دقائق
      const delay = Math.min(baseDelay * Math.pow(2, newFailureCount - 1), maxDelay);
      
      toast.error(`فشلت المزامنة. ستتم إعادة المحاولة تلقائيًا خلال ${Math.round(delay / 1000 / 60)} دقيقة.`);
      
      // تحديد وقت للمحاولة التالية
      syncTimeoutRef.current = setTimeout(() => {
        if (isOnline && unsyncedCount > 0) {
          syncInventory();
        }
      }, delay);
      
      return 0;
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, fetchUnsyncedCount, syncFailures, unsyncedCount]);

  // تنظيف المؤقتات عند إلغاء المكون
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  // جلب عدد العناصر غير المتزامنة عند تحميل المكون
  useEffect(() => {
    fetchUnsyncedCount();
    
    // تحديث العدد كل دقيقتين بدلاً من كل 30 ثانية لتقليل الضغط
    const interval = setInterval(throttledFetchUnsyncedCount, 120000);
    
    return () => clearInterval(interval);
  }, [throttledFetchUnsyncedCount, fetchUnsyncedCount]);

  // مزامنة تلقائية عند استعادة الاتصال
  useEffect(() => {
    if (isOnline && unsyncedCount > 0) {
      // تأخير لضمان استقرار الاتصال قبل المزامنة
      const timer = setTimeout(() => {
        syncInventory();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [isOnline, unsyncedCount, syncInventory]);

  return {
    isOnline,
    isSyncing,
    unsyncedCount,
    syncInventory,
    fetchUnsyncedCount: throttledFetchUnsyncedCount,
    syncFailures
  };
}

export default useInventorySync;
