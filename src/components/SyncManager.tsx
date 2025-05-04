import React, { useEffect, useState, useRef } from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { synchronizeWithServer } from '../api/syncService';
import { getUnsyncedProducts } from '../api/localProductService';
import { getUnsyncedCustomers } from '../api/localCustomerService';
import './SyncManager.css';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { isElectron } from '@/lib/isElectron';

interface SyncManagerProps {
  autoSync?: boolean;
  syncInterval?: number; // بالملي ثانية
  onSyncStatusChange?: (isSyncing: boolean) => void;
  showIndicator?: boolean;
  forceDisable?: boolean; // إضافة خيار لتعطيل المزامنة إجبارياً
}

const SyncManager: React.FC<SyncManagerProps> = ({
  autoSync = true,
  syncInterval = 60000, // افتراضياً كل دقيقة
  onSyncStatusChange,
  showIndicator = true,
  forceDisable = false,
}) => {
  const { isOnline, lastOnlineChange } = useNetworkStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const lastVisibilityChange = useRef<Date>(new Date());
  const syncTimeoutRef = useRef<number | null>(null);

  // تحديد ما إذا كان التطبيق يعمل في بيئة Electron
  const isRunningInElectron = isElectron();
  
  // تقرير ما إذا كانت المزامنة مسموحة بناءً على البيئة والإعدادات
  const isSyncEnabled = isRunningInElectron && autoSync && !forceDisable;

  // جلب عدد العناصر غير المتزامنة
  const updatePendingCount = async () => {
    // إذا كانت المزامنة معطلة، لا داعي لجلب العناصر غير المتزامنة
    if (!isSyncEnabled) return 0;
    
    try {
      const unsyncedProducts = await getUnsyncedProducts();
      const unsyncedCustomers = await getUnsyncedCustomers();
      
      // جمع كل العناصر غير المتزامنة
      const totalCount = unsyncedProducts.length + unsyncedCustomers.length;
      setPendingSyncCount(totalCount);
      return totalCount;
    } catch (error) {
      console.error('خطأ في جلب عدد العناصر غير المتزامنة:', error);
      return 0;
    }
  };

  // تنفيذ المزامنة
  const performSync = async () => {
    // منع المزامنة إذا كانت معطلة أو في وضع عدم الاتصال أو خلال عملية مزامنة حالية
    if (!isSyncEnabled || !isOnline || isSyncing) {
      if (!isRunningInElectron) {
        console.log('المزامنة معطلة في بيئة المتصفح');
      }
      return;
    }

    try {
      setIsSyncing(true);
      setSyncError(null);
      onSyncStatusChange?.(true);

      console.log('بدء المزامنة في بيئة Electron');
      const success = await synchronizeWithServer();

      if (success) {
        setLastSyncTime(new Date());
        setSyncError(null);
        console.log('تمت المزامنة بنجاح');
      } else {
        setSyncError('فشلت عملية المزامنة. سيتم إعادة المحاولة لاحقاً.');
      }

      await updatePendingCount();
    } catch (error) {
      console.error('خطأ في تنفيذ المزامنة:', error);
      setSyncError('حدث خطأ أثناء المزامنة: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsSyncing(false);
      onSyncStatusChange?.(false);
    }
  };

  // تبديل حالة التصغير
  const toggleMinimized = () => {
    setIsMinimized(prev => !prev);
  };

  // إضافة مستمع لحدث تغيير رؤية الصفحة (عند تبديل التبويب)
  useEffect(() => {
    // إذا كانت المزامنة معطلة، لا داعي لإضافة مستمع الحدث
    if (!isSyncEnabled) return;
    
    const handleVisibilityChange = () => {
      const now = new Date();
      lastVisibilityChange.current = now;

      // في Electron فقط: عند العودة للصفحة، نقوم بالمزامنة بعد فترة قصيرة
      if (document.visibilityState === 'visible' && isRunningInElectron) {
        // إلغاء أي مؤقت سابق
        if (syncTimeoutRef.current !== null) {
          window.clearTimeout(syncTimeoutRef.current);
        }

        console.log('العودة للتبويب في Electron - جدولة مزامنة بعد 3 ثوانٍ');

        // تنفيذ المزامنة بعد 3 ثوانٍ للتأكد من استقرار التطبيق
        syncTimeoutRef.current = window.setTimeout(() => {
          console.log('تنفيذ المزامنة المجدولة بعد عودة التبويب');
          performSync();
        }, 3000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // تنظيف المؤقت عند تفكيك المكون
      if (syncTimeoutRef.current !== null) {
        window.clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [lastSyncTime, syncInterval, isSyncEnabled, isRunningInElectron, isOnline]);

  // مراقبة حالة الاتصال وتنفيذ المزامنة عند عودة الاتصال
  useEffect(() => {
    // تنفيذ المزامنة فقط في Electron عند استعادة الاتصال
    if (isOnline && isSyncEnabled && isRunningInElectron) {
      console.log('استعادة الاتصال في Electron - تنفيذ المزامنة');
      performSync();
    }
  }, [isOnline, lastOnlineChange, isSyncEnabled, isRunningInElectron]);

  // تنفيذ المزامنة بشكل دوري إذا كان الاتصال متوفراً
  useEffect(() => {
    // لا نقوم بإعداد المؤقت الدوري إذا كانت المزامنة معطلة أو لسنا في Electron
    if (!isSyncEnabled || !isRunningInElectron) return;

    const interval = setInterval(() => {
      if (isOnline && !isSyncing && document.visibilityState === 'visible') {
        console.log('تنفيذ المزامنة الدورية في Electron');
        performSync();
      }
    }, syncInterval);

    return () => clearInterval(interval);
  }, [syncInterval, isSyncEnabled, isOnline, isSyncing, isRunningInElectron]);

  // تحديث عدد العناصر غير المتزامنة عند تحميل المكون
  useEffect(() => {
    // لا نقوم بتحديث العدد إذا كانت المزامنة معطلة أو لسنا في Electron
    if (!isSyncEnabled || !isRunningInElectron) return;
    
    updatePendingCount();
    
    // تنفيذ مزامنة أولية عند تحميل المكون
    if (isOnline) {
      // تنفيذ المزامنة بعد تحميل المكون بـ 2 ثانية
      const initialSyncTimeout = setTimeout(() => {
        console.log('تنفيذ المزامنة الأولية في Electron');
        performSync();
      }, 2000);
      
      return () => clearTimeout(initialSyncTimeout);
    }
  }, [isSyncEnabled, isRunningInElectron]);

  // إذا كانت المزامنة معطلة أو مخفية، فقط لا نعرض شيئًا
  if (!showIndicator || !isRunningInElectron) {
    return null;
  }

  return (
    <div className={`sync-manager ${isMinimized ? 'minimized' : ''}`}>
      <div className={`sync-indicator ${isOnline ? 'online' : 'offline'} ${isSyncing ? 'syncing' : ''}`}>
        <div className="sync-status">
          {isOnline ? (
            isSyncing ? (
              <span className="status-text">جاري المزامنة...</span>
            ) : (
              <span className="status-text">متصل</span>
            )
          ) : (
            <span className="status-text">غير متصل</span>
          )}
          
          <button 
            className="toggle-visibility" 
            onClick={toggleMinimized}
            aria-label={isMinimized ? 'توسيع' : 'تصغير'}
          >
            {isMinimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {pendingSyncCount > 0 && (
          <div className="pending-count">
            {pendingSyncCount} عناصر في انتظار المزامنة
          </div>
        )}

        {syncError && (
          <div className="sync-error">
            {syncError}
          </div>
        )}

        {lastSyncTime && (
          <div className="last-sync">
            آخر مزامنة: {lastSyncTime.toLocaleTimeString()}
          </div>
        )}

        {isOnline && !isSyncing && (
          <button 
            className="sync-button"
            onClick={performSync}
            disabled={isSyncing}
          >
            مزامنة الآن
          </button>
        )}
      </div>
    </div>
  );
};

export default SyncManager; 