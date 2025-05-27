/**
 * هوك لإدارة حالة المزامنة
 */

import { useState, useEffect, useRef } from 'react';
import { SyncStatus } from './YalidineTypes';
import { getSyncStatus } from '@/api/yalidine/data-sync';

/**
 * هوك مخصص لإدارة حالة المزامنة
 * @returns حالة المزامنة والوظائف المرتبطة بها
 */
export function useSyncState() {
  // حالة المزامنة
  const [syncProgress, setSyncProgress] = useState<SyncStatus>({
    provinces: { total: 0, added: 0, status: "pending" },
    municipalities: { total: 0, added: 0, status: "pending" },
    centers: { total: 0, added: 0, status: "pending" },
    fees: { total: 0, added: 0, status: "pending" }
  });
  
  // متغيرات لتتبع سجل المزامنة والتحكم في التكرار
  const prevSyncProgressStringRef = useRef<string>("");
  const prevProgressMessageRef = useRef<string>("");
  
  // مراقبة حالة المزامنة
  useEffect(() => {
    // متغير لتخزين آخر حالة تم تسجيلها لتجنب التكرار
    let lastStatus = JSON.stringify(syncProgress);
    // متغير لتخزين آخر حالة تقدم الرسوم لتجنب تكرار السجلات
    let lastProgressLog = '';
    
    // وظيفة فحص حالة المزامنة
    const checkSyncStatus = () => {
      try {
        const status = getSyncStatus();
        const feesStatus = status.fees;
        
        // تحسين التسجيل لتوفير رؤية أفضل لحالة المزامنة
        if (feesStatus.status === 'syncing') {
          const progressLog = `تحديث حالة المزامنة: ${feesStatus.added}/${feesStatus.total} (${Math.round((feesStatus.added / Math.max(feesStatus.total, 1)) * 100)}%)`;
          // تسجيل فقط إذا كان هناك تغيير في حالة التقدم
          if (progressLog !== lastProgressLog) {
            
            lastProgressLog = progressLog;
          }
        }
        
        // استخدام المقارنة العميقة للكشف عن التغييرات بشكل أفضل
        const currentFeesStatus = syncProgress.fees;
        const hasChange = 
          feesStatus.status !== currentFeesStatus.status ||
          feesStatus.added !== currentFeesStatus.added ||
          feesStatus.total !== currentFeesStatus.total ||
          status.provinces.status !== syncProgress.provinces.status ||
          status.municipalities.status !== syncProgress.municipalities.status ||
          status.centers.status !== syncProgress.centers.status;
        
        // تحديث واجهة المستخدم فقط عند حدوث تغيير فعلي في الحالة
        // وتجنب تسجيل نفس الرسالة مرارًا وتكرارًا
        const newStatusString = JSON.stringify(status);
        if (hasChange && newStatusString !== lastStatus) {
          
          setSyncProgress(status);
          lastStatus = newStatusString;
        }
      } catch (e) {
      }
    };
    
    // فحص الحالة فور تحميل المكون
    checkSyncStatus();
    
    // تسريع تكرار الفحص - تحقق كل 500 مللي ثانية بدلاً من كل ثانية
    // لتحسين استجابة واجهة المستخدم
    const interval = setInterval(checkSyncStatus, 500);
    
    return () => clearInterval(interval);
  }, []); // إزالة syncProgress من التبعيات لمنع التحديث المتكرر
  
  /**
   * إعادة تعيين حالة المزامنة
   */
  const resetSyncState = () => {
    const initialSyncStatus: SyncStatus = {
      provinces: { total: 0, added: 0, status: "pending" },
      municipalities: { total: 0, added: 0, status: "pending" },
      centers: { total: 0, added: 0, status: "pending" },
      fees: { total: 0, added: 0, status: "pending" }
    };
    
    localStorage.setItem('yalidine_sync_status', JSON.stringify(initialSyncStatus));
    setSyncProgress(initialSyncStatus);
  };
  
  return {
    syncProgress,
    setSyncProgress,
    resetSyncState
  };
}
