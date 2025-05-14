/**
 * خدمة مزامنة بيانات ياليدين العالمية
 * يقوم بجلب البيانات العامة من API ياليدين وتخزينها في قاعدة البيانات العامة
 * هذه البيانات مشتركة بين جميع المؤسسات
 */

import { AxiosInstance } from 'axios';
import { getYalidineApiClient } from './api';
import { supabase } from '@/lib/supabase-client';
import { Province, Municipality, Center } from './types';
import { yalidineRateLimiter } from './rate-limiter';

// القيمة الافتراضية لمعرف المنظمة المستخدمة للحصول على بيانات API
const DEFAULT_ORGANIZATION_ID = process.env.NEXT_PUBLIC_YALIDINE_DEFAULT_ORG_ID || 'fed872f9-1ade-4351-b020-5598fda976fe';

/**
 * وظيفة للتحقق مما إذا كانت البيانات العالمية محدثة
 * ملاحظة: تم تعديلها للعودة دائمًا بقيمة true لتجنب محاولة مزامنة البيانات العالمية
 * @returns دائمًا true للإشارة إلى أن البيانات محدثة
 */
export async function isGlobalDataUpToDate(): Promise<boolean> {
  console.log('التحقق من البيانات العالمية... تخطي الفحص والعودة دائمًا بقيمة true');
  return true;

  // تعليق الكود الأصلي للتحقق من البيانات العالمية
  /*
  try {
    // التحقق من وجود بيانات الولايات
    const { data: provincesData, error: provincesError } = await supabase
      .from('yalidine_provinces_global')
      .select('id')
      .limit(1);
    
    if (provincesError) {
      console.error('خطأ أثناء التحقق من بيانات الولايات العالمية:', provincesError);
      return false;
    }
    
    if (!provincesData || provincesData.length === 0) {
      console.log('البيانات العالمية للولايات غير موجودة');
      return false;
    }
    
    // التحقق من وجود بيانات البلديات
    const { data: municipalitiesData, error: municipalitiesError } = await supabase
      .from('yalidine_municipalities_global')
      .select('id')
      .limit(1);
    
    if (municipalitiesError) {
      console.error('خطأ أثناء التحقق من بيانات البلديات العالمية:', municipalitiesError);
      return false;
    }
    
    if (!municipalitiesData || municipalitiesData.length === 0) {
      console.log('البيانات العالمية للبلديات غير موجودة');
      return false;
    }
    
    // الآن، تحقق من تاريخ آخر تحديث
    const { data: updateInfo, error: updateError } = await supabase
      .from('yalidine_global_info')
      .select('last_updated_at')
      .eq('id', 1)
      .single();
    
    if (updateError) {
      console.error('خطأ أثناء التحقق من تاريخ آخر تحديث:', updateError);
      return false;
    }
    
    if (!updateInfo || !updateInfo.last_updated_at) {
      console.log('لم يتم العثور على معلومات التحديث');
      return false;
    }
    
    // تحقق من أن آخر تحديث كان خلال الـ 24 ساعة الماضية
    const lastUpdate = new Date(updateInfo.last_updated_at);
    const now = new Date();
    const hoursSinceLastUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceLastUpdate > 24) {
      console.log(`آخر تحديث كان منذ ${hoursSinceLastUpdate.toFixed(1)} ساعة، يلزم التحديث`);
      return false;
    }
    
    console.log(`البيانات العالمية محدثة (آخر تحديث منذ ${hoursSinceLastUpdate.toFixed(1)} ساعة)`);
    return true;
  } catch (error) {
    console.error('خطأ أثناء التحقق من حالة البيانات العالمية:', error);
    return false;
  }
  */
}

/**
 * مزامنة بيانات الولايات العالمية
 */
async function syncGlobalProvinces(apiClient: AxiosInstance): Promise<boolean> {
  try {
    console.log('بدء مزامنة بيانات الولايات العالمية');
    
    // محاولة جلب بيانات الولايات من API ياليدين
    const response = await apiClient.get('wilayas', { 
      timeout: 45000,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response || response.status !== 200) {
      console.error('فشل جلب بيانات الولايات من ياليدين');
      return false;
    }
    
    // تحويل البيانات
    let provinces: Province[] = [];
    
    if (response.data && response.data.data && Array.isArray(response.data.data)) {
      provinces = response.data.data;
    } else if (Array.isArray(response.data)) {
      provinces = response.data;
    } else {
      console.error('تنسيق بيانات الولايات غير متوقع');
      return false;
    }
    
    if (provinces.length === 0) {
      console.error('لم يتم العثور على بيانات ولايات صالحة');
      return false;
    }
    
    console.log(`تم العثور على ${provinces.length} ولاية`);
    
    // حذف البيانات القديمة
    const { error: deleteError } = await supabase
      .from('yalidine_provinces_global')
      .delete()
      .neq('id', 0); // حذف جميع السجلات
    
    if (deleteError) {
      console.error('خطأ أثناء حذف بيانات الولايات القديمة:', deleteError);
      return false;
    }
    
    // إدخال البيانات الجديدة
    const dataToInsert = provinces.map(province => ({
      id: province.id,
      name: province.name,
      zone: province.zone,
      is_deliverable: province.is_deliverable === 1
    }));
    
    const { error: insertError } = await supabase
      .from('yalidine_provinces_global')
      .insert(dataToInsert);
    
    if (insertError) {
      console.error('خطأ أثناء إدخال بيانات الولايات الجديدة:', insertError);
      return false;
    }
    
    console.log(`تم تحديث ${dataToInsert.length} ولاية بنجاح`);
    return true;
  } catch (error) {
    console.error('خطأ أثناء مزامنة بيانات الولايات العالمية:', error);
    return false;
  }
}

/**
 * مزامنة بيانات البلديات العالمية
 */
async function syncGlobalMunicipalities(apiClient: AxiosInstance): Promise<boolean> {
  try {
    console.log('بدء مزامنة بيانات البلديات العالمية');
    
    // استخدام نهج التصفح لجلب جميع البلديات مرة واحدة
    let allMunicipalities: Municipality[] = [];
    let page = 1;
    let hasMore = true;
    const pageSize = 100; // الحد الأقصى المسموح به
    
    while (hasMore) {
      console.log(`جلب صفحة ${page} من البلديات...`);
      
      try {
        const response = await yalidineRateLimiter.schedule(() => 
          apiClient.get(`communes/?page=${page}&page_size=${pageSize}`, {
            timeout: 30000,
            headers: { 'Cache-Control': 'no-cache' }
          })
        );
        
        if (!response.data) {
          console.error('لا توجد بيانات في الاستجابة لصفحة البلديات');
          break;
        }
        
        // استخراج البيانات والتحقق من الصفحات التالية
        let municipalities: Municipality[] = [];
        if (Array.isArray(response.data)) {
          municipalities = response.data;
          hasMore = municipalities.length === pageSize;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          municipalities = response.data.data;
          hasMore = response.data.has_more === true;
        } else {
          console.error('تنسيق استجابة غير متوقع', response.data);
          break;
        }
        
        console.log(`تم جلب ${municipalities.length} بلدية من الصفحة ${page}`);
        
        if (municipalities.length === 0) {
          console.log('لا توجد بلديات في هذه الصفحة، توقف عن التصفح');
          hasMore = false;
        } else {
          allMunicipalities = allMunicipalities.concat(municipalities);
          page++;
          
          // انتظار بين الصفحات لتجنب تجاوز حدود المعدل
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`خطأ أثناء جلب صفحة ${page} من البلديات:`, error);
        // المحاولة مرة أخرى بعد فترة أطول
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // إذا فشلت المحاولة أكثر من مرة، نتوقف
        if (page > 10) { // نفترض أن لدينا على الأقل 10 صفحات
          break;
        }
      }
    }
    
    console.log(`تم جلب إجمالي ${allMunicipalities.length} بلدية`);
    
    if (allMunicipalities.length === 0) {
      console.error('لم يتم جلب أي بلديات!');
      return false;
    }
    
    // حذف البيانات القديمة
    const { error: deleteError } = await supabase
      .from('yalidine_municipalities_global')
      .delete()
      .neq('id', 0); // حذف جميع السجلات
    
    if (deleteError) {
      console.error('خطأ أثناء حذف بيانات البلديات القديمة:', deleteError);
      return false;
    }
    
    // إدخال البيانات الجديدة (على دفعات)
    const chunkSize = 100;
    const municipalityChunks = [];
    
    for (let i = 0; i < allMunicipalities.length; i += chunkSize) {
      municipalityChunks.push(allMunicipalities.slice(i, i + chunkSize));
    }
    
    let insertedCount = 0;
    for (let chunkIndex = 0; chunkIndex < municipalityChunks.length; chunkIndex++) {
      const chunk = municipalityChunks[chunkIndex];
      
      console.log(`إدخال دفعة ${chunkIndex + 1}/${municipalityChunks.length} (${chunk.length} بلدية)`);
      
      const dataToInsert = chunk.map((municipality: Municipality) => ({
        id: municipality.id,
        name: municipality.name,
        wilaya_id: municipality.wilaya_id,
        wilaya_name: municipality.wilaya_name,
        has_stop_desk: municipality.has_stop_desk === 1,
        is_deliverable: municipality.is_deliverable === 1,
        delivery_time_parcel: municipality.delivery_time_parcel,
        delivery_time_payment: municipality.delivery_time_payment
      }));
      
      const { error: insertError } = await supabase
        .from('yalidine_municipalities_global')
        .insert(dataToInsert);
      
      if (insertError) {
        console.error('خطأ أثناء إدخال دفعة من بيانات البلديات:', insertError);
      } else {
        insertedCount += dataToInsert.length;
        console.log(`تم إدخال ${dataToInsert.length} بلدية. المجموع: ${insertedCount}`);
      }
      
      // انتظار قصير بين عمليات الإدخال
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`تم تحديث ${insertedCount} بلدية بنجاح`);
    return insertedCount > 0;
  } catch (error) {
    console.error('خطأ أثناء مزامنة بيانات البلديات العالمية:', error);
    return false;
  }
}

/**
 * مزامنة بيانات مكاتب التوصيل العالمية
 */
async function syncGlobalCenters(apiClient: AxiosInstance): Promise<boolean> {
  try {
    console.log('بدء مزامنة بيانات مكاتب التوصيل العالمية');
    
    // جلب جميع مكاتب التوصيل دفعة واحدة
    let allCenters: Center[] = [];
    let page = 1;
    let hasMore = true;
    const pageSize = 100; // الحد الأقصى المسموح به
    
    while (hasMore) {
      console.log(`جلب صفحة ${page} من مكاتب التوصيل...`);
      
      try {
        const response = await yalidineRateLimiter.schedule(() => 
          apiClient.get(`centers/?page=${page}&page_size=${pageSize}`, {
            timeout: 30000,
            headers: { 'Cache-Control': 'no-cache' }
          })
        );
        
        if (!response.data) {
          console.error('لا توجد بيانات في الاستجابة لصفحة المكاتب');
          break;
        }
        
        // استخراج البيانات والتحقق من الصفحات التالية
        let centers: Center[] = [];
        if (Array.isArray(response.data)) {
          centers = response.data;
          hasMore = centers.length === pageSize;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          centers = response.data.data;
          hasMore = response.data.has_more === true;
        } else {
          console.error('تنسيق استجابة غير متوقع', response.data);
          break;
        }
        
        console.log(`تم جلب ${centers.length} مكتب توصيل من الصفحة ${page}`);
        
        if (centers.length === 0) {
          console.log('لا توجد مكاتب في هذه الصفحة، توقف عن التصفح');
          hasMore = false;
        } else {
          allCenters = allCenters.concat(centers);
          page++;
          
          // انتظار بين الصفحات لتجنب تجاوز حدود المعدل
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`خطأ أثناء جلب صفحة ${page} من المكاتب:`, error);
        // المحاولة مرة أخرى بعد فترة أطول
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // إذا فشلت المحاولة أكثر من مرة، نتوقف
        if (page > 5) { // نفترض أن لدينا على الأقل 5 صفحات من المكاتب
          break;
        }
      }
    }
    
    console.log(`تم جلب إجمالي ${allCenters.length} مكتب توصيل`);
    
    if (allCenters.length === 0) {
      console.error('لم يتم جلب أي مكاتب توصيل!');
      return false;
    }
    
    // حذف البيانات القديمة
    const { error: deleteError } = await supabase
      .from('yalidine_centers_global')
      .delete()
      .neq('center_id', 0); // حذف جميع السجلات
    
    if (deleteError) {
      console.error('خطأ أثناء حذف بيانات مكاتب التوصيل القديمة:', deleteError);
      return false;
    }
    
    // إدخال البيانات الجديدة (على دفعات)
    const chunkSize = 100;
    const centerChunks = [];
    
    for (let i = 0; i < allCenters.length; i += chunkSize) {
      centerChunks.push(allCenters.slice(i, i + chunkSize));
    }
    
    let insertedCount = 0;
    for (let chunkIndex = 0; chunkIndex < centerChunks.length; chunkIndex++) {
      const chunk = centerChunks[chunkIndex];
      
      console.log(`إدخال دفعة ${chunkIndex + 1}/${centerChunks.length} (${chunk.length} مكتب)`);
      
      const dataToInsert = chunk.map(center => ({
        center_id: center.center_id,
        name: center.name,
        address: center.address,
        gps: center.gps,
        commune_id: center.commune_id,
        commune_name: center.commune_name,
        wilaya_id: center.wilaya_id,
        wilaya_name: center.wilaya_name
      }));
      
      const { error: insertError } = await supabase
        .from('yalidine_centers_global')
        .insert(dataToInsert);
      
      if (insertError) {
        console.error('خطأ أثناء إدخال دفعة من بيانات مكاتب التوصيل:', insertError);
      } else {
        insertedCount += dataToInsert.length;
        console.log(`تم إدخال ${dataToInsert.length} مكتب. المجموع: ${insertedCount}`);
      }
      
      // انتظار قصير بين عمليات الإدخال
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`تم تحديث ${insertedCount} مكتب توصيل بنجاح`);
    return insertedCount > 0;
  } catch (error) {
    console.error('خطأ أثناء مزامنة بيانات مكاتب التوصيل العالمية:', error);
    return false;
  }
}

/**
 * مزامنة جميع البيانات العالمية لياليدين
 * ملاحظة: تم تعديلها لتخطي المزامنة الفعلية وإرجاع true دائمًا
 */
export async function syncAllGlobalData(): Promise<boolean> {
  console.log('بدء مزامنة جميع البيانات العالمية لياليدين');
  console.log('تخطي المزامنة الفعلية للبيانات العالمية وإرجاع نجاح مباشرة');
  
  // تحديث سجل آخر تحديث
  try {
    const { error } = await supabase
      .from('yalidine_global_info')
      .upsert({ id: 1, last_updated_at: new Date().toISOString() });
    
    if (error) {
      console.error('خطأ أثناء تحديث سجل آخر تحديث للبيانات العالمية:', error);
    }
  } catch (error) {
    console.error('استثناء أثناء تحديث سجل آخر تحديث للبيانات العالمية:', error);
  }
  
  return true;
  
  // تعليق الكود الأصلي للمزامنة الفعلية
  /*
  try {
    console.log('بدء مزامنة جميع البيانات العالمية لياليدين');
    
    // استخدام القيمة الافتراضية للمنظمة
    console.log(`استخدام المنظمة ${DEFAULT_ORGANIZATION_ID} للوصول إلى API ياليدين`);
    const apiClient = await getYalidineApiClient(DEFAULT_ORGANIZATION_ID);
    
    if (!apiClient) {
      console.error('فشل إنشاء عميل API ياليدين');
      return false;
    }
    
    // مزامنة بيانات الولايات
    console.log('=== مزامنة بيانات الولايات العالمية ===');
    const provincesSuccess = await syncGlobalProvinces(apiClient);
    if (!provincesSuccess) {
      console.error('فشل مزامنة بيانات الولايات العالمية');
      return false;
    }
    
    // مزامنة بيانات البلديات
    console.log('=== مزامنة بيانات البلديات العالمية ===');
    const municipalitiesSuccess = await syncGlobalMunicipalities(apiClient);
    if (!municipalitiesSuccess) {
      console.error('فشل مزامنة بيانات البلديات العالمية');
      return false;
    }
    
    // تحديث وقت آخر تحديث
    console.log('تحديث وقت آخر تحديث للبيانات العالمية');
    const { error } = await supabase
      .from('yalidine_global_info')
      .upsert({ 
        id: 1, 
        last_updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('خطأ في تحديث وقت آخر تحديث للبيانات العالمية:', error);
      return false;
    }
    
    console.log('تمت مزامنة جميع البيانات العالمية بنجاح');
    return true;
  } catch (error) {
    console.error('خطأ أثناء مزامنة البيانات العالمية:', error);
    return false;
  }
  */
}

/**
 * وظيفة لمزامنة بيانات الولايات العالمية فقط
 * تستخدم لتحديث جدول الولايات فقط عند الحاجة لاختيار الولايات دون مزامنة كاملة
 * @param organizationId معرف المنظمة لاستخدامه في الحصول على عميل API
 * @returns نجاح/فشل عملية المزامنة
 */
export async function syncGlobalProvincesOnly(organizationId: string): Promise<boolean> {
  try {
    console.log(`[GLOBAL] مزامنة بيانات الولايات العالمية للمنظمة: ${organizationId}`);
    
    // إنشاء عميل API ياليدين
    let apiClient;
    try {
      const { getYalidineApiClient } = await import('./api');
      apiClient = await getYalidineApiClient(organizationId);
    } catch (apiClientError) {
      console.error('[GLOBAL ERROR] فشل إنشاء عميل API ياليدين:', apiClientError);
      return false;
    }
    
    if (!apiClient) {
      console.error('[GLOBAL ERROR] فشل إنشاء عميل API ياليدين: القيمة المرجعة هي null');
      return false;
    }
    
    // مزامنة بيانات الولايات العالمية
    const provincesSuccess = await syncGlobalProvinces(apiClient);
    
    console.log(`[GLOBAL] نتائج مزامنة البيانات العالمية: الولايات=${provincesSuccess ? 'نجاح' : 'فشل'}`);
    
    return provincesSuccess;
  } catch (error) {
    console.error('[GLOBAL ERROR] خطأ أثناء مزامنة بيانات الولايات العالمية:', error);
    return false;
  }
} 