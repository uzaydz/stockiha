/**
 * وظائف مساعدة لإدارة حالة المزامنة
 */

/**
 * نوع بيانات لحالة المزامنة
 */
export type SyncStatusType = 'pending' | 'syncing' | 'success' | 'failed' | 'canceled';
export type SyncStatusItem = {
  total: number;
  added: number;
  status: SyncStatusType;
  timestamp?: string; // إضافة حقل للطابع الزمني كخاصية اختيارية
};

export interface SyncStatus {
  provinces: SyncStatusItem;
  municipalities: SyncStatusItem;
  centers: SyncStatusItem;
  fees: SyncStatusItem;
}

/**
 * وظيفة مساعدة للحصول على حالة المزامنة من localStorage
 */
export function getSyncStatus(): SyncStatus {
  try {
    const status = localStorage.getItem('yalidine_sync_status');
    if (status) {
      const parsedStatus = JSON.parse(status);
      
      // التحقق من صحة الكائن المستلم
      if (
        parsedStatus && 
        parsedStatus.provinces && 
        parsedStatus.municipalities && 
        parsedStatus.centers && 
        parsedStatus.fees
      ) {
        return parsedStatus;
      }
    }
  } catch (error) {
    console.error('خطأ في قراءة حالة المزامنة:', error);
  }
  
  // إذا لم نجد حالة صالحة، نعيد كائن افتراضي
  
  const initialStatus = createInitialSyncStatus();
  updateSyncStatus(initialStatus);
  return initialStatus;
}

/**
 * وظيفة مساعدة لتحديث حالة المزامنة في localStorage
 */
export function updateSyncStatus(status: SyncStatus): void {
  try {
    // وضع علامات زمنية للتتبع
    const timestamp = new Date().toISOString();
    const statusWithTimestamp = {
      ...status,
      _lastUpdated: timestamp
    };
    
    localStorage.setItem('yalidine_sync_status', JSON.stringify(statusWithTimestamp));
    
  } catch (error) {
    console.error('خطأ في تحديث حالة المزامنة:', error);
  }
}

/**
 * وظيفة جديدة للتحديث الجزئي للحالة - تحديث فقط الحقول المحددة
 */
export function updatePartialSyncStatus(
  category: 'provinces' | 'municipalities' | 'centers' | 'fees',
  updates: Partial<SyncStatusItem>
): void {
  try {
    const currentStatus = getSyncStatus();
    const updatedStatus = {
      ...currentStatus,
      [category]: {
        ...currentStatus[category],
        ...updates
      }
    };
    
    updateSyncStatus(updatedStatus);
    
    // عرض معلومات التحديث فقط إذا كان التحديث مهماً
    if (updates.status || updates.total > 0 || updates.added > 0) {
      
    }
  } catch (error) {
    console.error(`خطأ في التحديث الجزئي لحالة المزامنة (${category}):`, error);
  }
}

/**
 * وظيفة متخصصة لتحديث حالة مزامنة الأسعار
 * تستخدم للتحديث السريع لحالة مزامنة الأسعار أثناء المعالجة
 */
export function updateFeeSyncStatus(total: number, added: number, status: SyncStatusItem['status']): void {
  try {
    const currentStatus = getSyncStatus();
    const previousAdded = currentStatus.fees.added;
    
    // تسجيل الوقت المحسن للتقدم
    const now = new Date();
    
    // حساب معدل التقدم إذا تغير العدد المضاف
    if (added > previousAdded && previousAdded > 0) {
      const progressChange = added - previousAdded;
      const progressPercent = Math.round((added / Math.max(total, 1)) * 100);
      
      
      // تقدير الوقت المتبقي
      if (added > 5 && added < total) {
        const remainingItems = total - added;
        const avgTimePerItem = 1000; // تقديري (مللي ثانية)
        const estimatedRemainingMs = remainingItems * avgTimePerItem;
        const estimatedMinutes = Math.ceil(estimatedRemainingMs / 60000);
        
        
      }
    } else {
      
    }
    
    // تحديث حالة أسعار التوصيل
    currentStatus.fees = {
      total,
      added,
      status,
      timestamp: now.toISOString() // إضافة الطابع الزمني للتحديث
    };
    
    // حفظ الحالة الجديدة
    updateSyncStatus(currentStatus);
  } catch (error) {
    console.error('خطأ في تحديث حالة مزامنة الأسعار:', error);
  }
}

/**
 * وظيفة لإنشاء حالة مزامنة جديدة
 */
export function createInitialSyncStatus(): SyncStatus {
  return {
    provinces: { total: 0, added: 0, status: 'pending' },
    municipalities: { total: 0, added: 0, status: 'pending' },
    centers: { total: 0, added: 0, status: 'pending' },
    fees: { total: 0, added: 0, status: 'pending' }
  };
} 