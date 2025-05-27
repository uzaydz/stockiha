/**
 * وظائف مزامنة بيانات الولايات
 */

import { AxiosInstance } from 'axios';
import { supabase } from '@/lib/supabase-client';
import { getSyncStatus, updateSyncStatus } from './sync-status';

/**
 * وظيفة تحديث بيانات الولايات
 * تستخدم البيانات العالمية بدلاً من طلب API مباشر
 * @param organizationId معرف المنظمة
 * @param apiClient عميل API ياليدين
 * @returns true إذا تم التحديث بنجاح، false إذا فشل التحديث
 */
export async function syncProvinces(organizationId: string, apiClient: AxiosInstance): Promise<boolean> {
  try {

    // تحديث حالة التقدم - تأكيد أننا في وضع المزامنة
    const syncStatus = getSyncStatus();
    syncStatus.provinces.status = 'syncing';
    updateSyncStatus(syncStatus);
    
    // التحقق من وجود بيانات في الجداول العالمية
    let { data: globalProvincesData, error: globalError } = await supabase
      .from('yalidine_provinces_global')
      .select('*', { count: 'exact' });
    
    if (globalError || !globalProvincesData || globalProvincesData.length === 0) {
      
      // محاولة مزامنة البيانات العالمية
      try {
        // استدعاء وظيفة مزامنة البيانات العالمية (تم تحريكها إلى ملف global-sync.ts)
        const { syncAllGlobalData } = await import('./global-sync');
        const globalSyncSuccess = await syncAllGlobalData();
        
        if (!globalSyncSuccess) {
          syncStatus.provinces.status = 'failed';
          updateSyncStatus(syncStatus);
          return false;
        }
      } catch (globalSyncError) {
        syncStatus.provinces.status = 'failed';
        updateSyncStatus(syncStatus);
        return false;
      }
      
      // جلب البيانات العالمية مرة أخرى بعد المزامنة
      const { data: refreshedProvinces, error: refreshError } = await supabase
        .from('yalidine_provinces_global')
        .select('*');
      
      if (refreshError || !refreshedProvinces || refreshedProvinces.length === 0) {
        syncStatus.provinces.status = 'failed';
        updateSyncStatus(syncStatus);
        return false;
      }
      
      // تعيين البيانات المحدثة
      globalProvincesData = refreshedProvinces;
    }

    // تحديث حالة التقدم
    syncStatus.provinces.total = globalProvincesData.length;
    syncStatus.provinces.status = 'syncing';
    updateSyncStatus(syncStatus);
    
    // حذف البيانات القديمة
    
    try {
      const { error: deleteError } = await supabase
        .from('yalidine_provinces')
        .delete()
        .eq('organization_id', organizationId);
      
      if (deleteError) {
        syncStatus.provinces.status = 'failed';
        updateSyncStatus(syncStatus);
        return false;
      }
    } catch (dbError) {
      syncStatus.provinces.status = 'failed';
      updateSyncStatus(syncStatus);
      return false;
    }
    
    // إعداد البيانات للإدخال بإضافة معرف المنظمة
    const dataToInsert = globalProvincesData.map(province => ({
      id: province.id,
      organization_id: organizationId,
      name: province.name,
      zone: province.zone,
      is_deliverable: province.is_deliverable,
      last_updated_at: new Date().toISOString()
    }));
    
    // إدخال البيانات للمنظمة
    try {
      const { error: insertError } = await supabase
        .from('yalidine_provinces')
        .insert(dataToInsert);
      
      if (insertError) {
        syncStatus.provinces.status = 'failed';
        updateSyncStatus(syncStatus);
        return false;
      }

    } catch (dbError) {
      syncStatus.provinces.status = 'failed';
      updateSyncStatus(syncStatus);
      return false;
    }
    
    // تحديث حالة النجاح
    syncStatus.provinces.added = dataToInsert.length;
    syncStatus.provinces.status = 'success';
    updateSyncStatus(syncStatus);
    
    return true;
  } catch (error) {
    // تحديث حالة الفشل
    const syncStatus = getSyncStatus();
    syncStatus.provinces.status = 'failed';
    updateSyncStatus(syncStatus);
    return false;
  }
}
