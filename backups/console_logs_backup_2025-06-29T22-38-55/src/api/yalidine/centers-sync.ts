/**
 * وظائف مزامنة بيانات مكاتب التوصيل
 */

import { AxiosInstance } from 'axios';
import { supabase } from '@/lib/supabase-client';
import { getSyncStatus, updateSyncStatus } from './sync-status';

/**
 * وظيفة تحديث بيانات مكاتب التوصيل
 * تستخدم البيانات العالمية بدلاً من طلب API مباشر
 * @param organizationId معرف المنظمة
 * @param apiClient عميل API ياليدين
 * @returns true إذا تم التحديث بنجاح، false إذا فشل التحديث
 */
export async function syncCenters(organizationId: string, apiClient: AxiosInstance): Promise<boolean> {
  try {

    // تحديث حالة التقدم
    const syncStatus = getSyncStatus();
    syncStatus.centers.status = 'syncing';
    updateSyncStatus(syncStatus);
    
    // التحقق من وجود بيانات في الجداول العالمية
    const { data: globalCenters, error: globalError } = await supabase
      .from('yalidine_centers_global')
      .select('*', { count: 'exact' });
    
    if (globalError || !globalCenters || globalCenters.length === 0) {
      
      // تحديث حالة الفشل
      syncStatus.centers.status = 'failed';
      updateSyncStatus(syncStatus);
      return false;
    }

    // تحديث حالة التقدم
    syncStatus.centers.total = globalCenters.length;
    updateSyncStatus(syncStatus);
    
    // حذف البيانات القديمة
    
    const { error: deleteError } = await supabase
      .from('yalidine_centers')
      .delete()
      .eq('organization_id', organizationId);
    
    if (deleteError) {
      syncStatus.centers.status = 'failed';
      updateSyncStatus(syncStatus);
      return false;
    }
    
    // تقسيم البيانات إلى مجموعات للإدخال
    const chunkSize = 100;
    const centerChunks = [];
    
    for (let i = 0; i < globalCenters.length; i += chunkSize) {
      centerChunks.push(globalCenters.slice(i, i + chunkSize));
    }

    // إدخال البيانات على دفعات
    let insertedCount = 0;
    for (let chunkIndex = 0; chunkIndex < centerChunks.length; chunkIndex++) {
      const chunk = centerChunks[chunkIndex];
      try {

        const dataToInsert = chunk.map((center) => ({
          center_id: center.center_id,
          organization_id: organizationId,
          name: center.name,
          address: center.address,
          gps: center.gps,
          commune_id: center.commune_id,
          commune_name: center.commune_name,
          wilaya_id: center.wilaya_id,
          wilaya_name: center.wilaya_name,
          last_updated_at: new Date().toISOString()
        }));
        
        const { error: insertError } = await supabase
          .from('yalidine_centers')
          .insert(dataToInsert);
        
        if (insertError) {
        } else {
          insertedCount += dataToInsert.length;
          // تحديث عدد العناصر المدخلة
          syncStatus.centers.added = insertedCount;
          updateSyncStatus(syncStatus);
          
        }
        
        // انتظار قصير بين عمليات الإدخال
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (insertError) {
      }
    }
    
    // تحديث إجمالي المكاتب
    syncStatus.centers.total = globalCenters.length;
    syncStatus.centers.status = 'success';
    updateSyncStatus(syncStatus);

    return true;
  } catch (error) {
    
    // تحديث حالة المزامنة في حالة الخطأ
    const syncStatus = getSyncStatus();
    syncStatus.centers.status = 'failed';
    updateSyncStatus(syncStatus);
    
    return false;
  }
}
