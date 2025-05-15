/**
 * وظائف مزامنة بيانات البلديات
 */

import { AxiosInstance } from 'axios';
import { supabase } from '@/lib/supabase-client';
import { getSyncStatus, updateSyncStatus } from './sync-status';

/**
 * وظيفة تحديث بيانات البلديات
 * تستخدم البيانات العالمية بدلاً من طلب API مباشر
 * @param organizationId معرف المنظمة
 * @param apiClient عميل API ياليدين
 * @returns true إذا تم التحديث بنجاح، false إذا فشل التحديث
 */
export async function syncMunicipalities(organizationId: string, apiClient: AxiosInstance): Promise<boolean> {
  try {
    
    
    // تحديث حالة التقدم
    const syncStatus = getSyncStatus();
    syncStatus.municipalities.status = 'syncing';
    updateSyncStatus(syncStatus);
    
    // التحقق من وجود بيانات في الجداول العالمية
    const { data: globalMunicipalities, error: globalError } = await supabase
      .from('yalidine_municipalities_global')
      .select('*', { count: 'exact' });
    
    if (globalError || !globalMunicipalities || globalMunicipalities.length === 0) {
      console.error('[ERROR] لا توجد بيانات بلديات عالمية، محاولة مزامنة البيانات العالمية أولاً');
      
      // تحديث حالة الفشل
      syncStatus.municipalities.status = 'failed';
      updateSyncStatus(syncStatus);
      return false;
    }
    
    
    
    // تحديث حالة التقدم
    syncStatus.municipalities.total = globalMunicipalities.length;
    updateSyncStatus(syncStatus);
    
    // حذف البيانات القديمة
    
    const { error: deleteError } = await supabase
      .from('yalidine_municipalities')
      .delete()
      .eq('organization_id', organizationId);
    
    if (deleteError) {
      console.error('[ERROR] خطأ أثناء حذف بيانات البلديات القديمة:', deleteError);
      syncStatus.municipalities.status = 'failed';
      updateSyncStatus(syncStatus);
      return false;
    }
    
    // تقسيم البيانات إلى مجموعات للإدخال
    const chunkSize = 100;
    const municipalityChunks = [];
    
    for (let i = 0; i < globalMunicipalities.length; i += chunkSize) {
      municipalityChunks.push(globalMunicipalities.slice(i, i + chunkSize));
    }
    
    
    
    // إدخال البيانات على دفعات
    let insertedCount = 0;
    for (let chunkIndex = 0; chunkIndex < municipalityChunks.length; chunkIndex++) {
      const chunk = municipalityChunks[chunkIndex];
      try {
        
        
        const dataToInsert = chunk.map((municipality) => ({
          id: municipality.id,
          organization_id: organizationId,
          name: municipality.name,
          wilaya_id: municipality.wilaya_id,
          wilaya_name: municipality.wilaya_name,
          has_stop_desk: municipality.has_stop_desk,
          is_deliverable: municipality.is_deliverable,
          delivery_time_parcel: municipality.delivery_time_parcel,
          delivery_time_payment: municipality.delivery_time_payment,
          last_updated_at: new Date().toISOString()
        }));
        
        const { error: insertError } = await supabase
          .from('yalidine_municipalities')
          .insert(dataToInsert);
        
        if (insertError) {
          console.error('[ERROR] خطأ أثناء إدخال دفعة من بيانات البلديات:', insertError);
        } else {
          insertedCount += dataToInsert.length;
          // تحديث عدد العناصر المدخلة
          syncStatus.municipalities.added = insertedCount;
          updateSyncStatus(syncStatus);
          
        }
        
        // انتظار قصير بين عمليات الإدخال - أقل بكثير من طلبات API
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (insertError) {
        console.error('[ERROR] استثناء أثناء إدخال دفعة من بيانات البلديات:', insertError);
      }
    }
    
    // تحديث إجمالي البلديات
    syncStatus.municipalities.total = globalMunicipalities.length;
    syncStatus.municipalities.status = 'success';
    updateSyncStatus(syncStatus);
    
    
    return true;
  } catch (error) {
    console.error('[ERROR] خطأ أثناء مزامنة بيانات البلديات:', error);
    
    // تحديث حالة المزامنة في حالة الخطأ
    const syncStatus = getSyncStatus();
    syncStatus.municipalities.status = 'failed';
    updateSyncStatus(syncStatus);
    
    return false;
  }
} 