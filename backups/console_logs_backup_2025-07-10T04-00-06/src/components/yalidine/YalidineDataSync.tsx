import React, { useState, useEffect } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/lib/supabase-client';
import { 
  SyncStatus, 
  getSyncStatus, 
  updateSyncStatus, 
  createInitialSyncStatus 
} from '@/api/yalidine/sync-status';
import { syncYalidineData } from '@/api/yalidine/main-sync';
import YalidineSyncFixer from './YalidineSyncFixer';

export default function YalidineDataSync() {
  const { organization } = useOrganization();
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncProgress, setSyncProgress] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [estimatedTime, setEstimatedTime] = useState<string>('');
  const [showFixTool, setShowFixTool] = useState<boolean>(false);

  // استدعاء حالة المزامنة عند تحميل المكون
  useEffect(() => {
    if (organization?.id) {
      fetchSyncStatus();
      const interval = setInterval(fetchSyncStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [organization?.id]);

  // جلب حالة المزامنة من localStorage
  function fetchSyncStatus() {
    try {
      const status = getSyncStatus();
      setSyncStatus(status);
      
      // حساب نسبة التقدم
      if (status) {
        const progress = calculateProgress(status);
        setSyncProgress(progress);
      }
    } catch (error) {
    }
  }

  // حساب نسبة التقدم بناءً على حالة العناصر المختلفة
  function calculateProgress(status: SyncStatus): number {
    const statusValues = {
      pending: 0,
      syncing: 0.5,
      success: 1,
      failed: 0,
      canceled: 0
    };
    
    // تركيز على تقدم الرسوم
    const fees = status.fees;
    const feeProgress = fees.total > 0 ? fees.added / fees.total : 0;
    
    // إذا كانت المزامنة جارية، استخدام التقدم الفعلي، وإلا استخدام حالة المزامنة
    return fees.status === 'syncing' 
      ? Math.min(feeProgress, 0.99) // لا نصل إلى 100% قبل الانتهاء
      : statusValues[fees.status];
  }

  // بدء عملية المزامنة
  async function startSync() {
    if (!organization?.id || isSyncing) return;
    
    try {
      setIsSyncing(true);
      
      // تحديث حالة المزامنة إلى 'جارية'
      const updatedStatus = syncStatus ? { ...syncStatus } : createInitialSyncStatus();
      Object.keys(updatedStatus).forEach(key => {
        if (key !== '_lastUpdated') {
          updatedStatus[key as keyof SyncStatus].status = 'syncing';
        }
      });
      updateSyncStatus(updatedStatus);
      setSyncStatus(updatedStatus);
      
      // بدء عملية المزامنة
      await syncYalidineData(organization.id);
      
      // تحديث حالة المزامنة بعد البدء
      fetchSyncStatus();
    } catch (error) {
      fetchSyncStatus(); // تحديث الحالة في حالة حدوث خطأ
    } finally {
      setIsSyncing(false);
    }
  }

  // إظهار أداة الإصلاح
  function handleSyncIssue() {
    setShowFixTool(true);
  }

  // إغلاق أداة الإصلاح وإعادة المزامنة
  function handleFixComplete() {
    setShowFixTool(false);
    // تشغيل المزامنة بعد إكمال الإصلاح
    if (organization?.id) {
      startSync();
    }
  }

  // زر لإظهار أداة الإصلاح عند فشل المزامنة
  function renderFixButton() {
    if (syncStatus?.fees?.status === 'failed' || syncProgress < 0.1) {
      return (
        <button 
          onClick={handleSyncIssue}
          className="px-3 py-1 bg-amber-100 text-amber-800 rounded-md text-sm hover:bg-amber-200 transition-colors"
        >
          إصلاح مشكلة المزامنة
        </button>
      );
    }
    return null;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">مزامنة بيانات ياليدين</h2>
        <button
          onClick={startSync}
          disabled={isSyncing}
          className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
        >
          {isSyncing ? 'جاري المزامنة...' : 'بدء المزامنة'}
        </button>
      </div>
      
      {syncStatus && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">تقدم مزامنة الرسوم:</span>
            <span className="text-sm">{Math.round(syncProgress * 100)}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full">
            <div 
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${syncProgress * 100}%` }}
            ></div>
          </div>
          
          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm">
              <span className="font-medium">حالة الرسوم: </span>
              <span className={
                syncStatus.fees.status === 'success' ? 'text-green-600' :
                syncStatus.fees.status === 'failed' ? 'text-red-600' :
                syncStatus.fees.status === 'syncing' ? 'text-blue-600' : 'text-gray-600'
              }>
                {syncStatus.fees.status === 'success' ? 'مكتملة' :
                 syncStatus.fees.status === 'failed' ? 'فشلت' :
                 syncStatus.fees.status === 'syncing' ? 'جارية' : 'غير متوفرة'}
              </span>
            </div>
            {renderFixButton()}
          </div>
        </div>
      )}
      
      {/* أداة إصلاح المزامنة */}
      {showFixTool && (
        <div className="mt-6 p-4 border border-amber-200 rounded-lg bg-amber-50">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-medium">أداة إصلاح مشاكل المزامنة</h3>
            <button 
              onClick={() => setShowFixTool(false)} 
              className="text-gray-400 hover:text-gray-600"
            >
              إغلاق
            </button>
          </div>
          <YalidineSyncFixer onComplete={handleFixComplete} />
        </div>
      )}
    </div>
  );
}
