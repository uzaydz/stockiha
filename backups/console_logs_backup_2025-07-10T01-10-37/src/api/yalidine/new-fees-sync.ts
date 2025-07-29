/**
 * وظائف مزامنة بيانات أسعار التوصيل من ياليدين
 * تستخدم نقطة النهاية /fees بشكل صحيح لجلب أسعار التوصيل من الولاية المصدر إلى الولايات الأخرى
 */

import { AxiosInstance, default as axios } from 'axios';
import { supabase } from '@/lib/supabase-client';
import { getSyncStatus, updateSyncStatus, updateFeeSyncStatus } from './sync-status';
import { yalidineRateLimiter } from './rate-limiter';
import { getYalidineApiClient, createYalidineApiClient } from './api';
import axiosRetry from 'axios-retry';

// الواجهة التي تحدد خيارات مزامنة الأسعار
export interface FeeSyncOptions {
  // معلومات API المخصصة (اختيارية)
  apiId?: string;
  apiToken?: string;
  // ولاية المصدر (اختيارية)
  sourceProvinceId?: number | string;
  // هل يتم استخدام الوسيط المحلي
  useProxy?: boolean;
  // الولايات المقصودة المحددة (للتخصيص، اختيارية)
  targetProvinceIds?: (number | string)[];
}

/**
 * وظيفة تحديث بيانات أسعار التوصيل باستخدام نقطة النهاية /fees
 * @param organizationId معرف المنظمة
 * @param apiClient عميل API ياليدين (اختياري إذا تم تحديد خيارات API مخصصة)
 * @param options خيارات مخصصة لمزامنة الأسعار (اختيارية)
 * @returns true إذا تم التحديث بنجاح، false إذا فشل التحديث
 */
export async function syncFees(
  organizationId: string, 
  apiClient?: AxiosInstance, 
  options?: FeeSyncOptions
): Promise<boolean> {
  try {

    // تحديث حالة التقدم
    updateFeeSyncStatus(0, 0, 'syncing');
    
    // عميل API للاستخدام
    const clientToUse = await setupApiClient(organizationId, apiClient, options);
    if (!clientToUse) {
      updateFeeSyncStatus(0, 0, 'failed');
      return false;
    }
    
    // تحديد ولاية المصدر
    const sourceProvinceId = await determineSourceProvince(organizationId, options);

    // جلب قائمة الولايات للمعالجة
    const targetProvinces = await getTargetProvinces(organizationId, options);
    if (targetProvinces.length === 0) {
      updateFeeSyncStatus(0, 0, 'failed');
      return false;
    }

    // تحديث حالة التقدم
    updateFeeSyncStatus(targetProvinces.length, 0, 'syncing');
    
    // حذف بيانات الأسعار القديمة من الولاية المصدر
    
    await deleteOldFeesForSourceWilaya(Number(sourceProvinceId), organizationId);
    
    // إعداد عميل API مع إعادة المحاولة
    const apiClientWithRetry = setupApiClientWithRetry(clientToUse);
    
    // معالجة الولايات بالتوازي بدلاً من المعالجة المتسلسلة
    let processedCount = 0;
    const allFees: any[] = [];
    
    // تقسيم الولايات إلى مجموعات للمعالجة المتوازية
    const BATCH_SIZE = 5; // عدد الولايات التي سيتم معالجتها في وقت واحد
    const provinceBatches: Array<typeof targetProvinces> = [];
    
    // تقسيم الولايات إلى مجموعات
    for (let i = 0; i < targetProvinces.length; i += BATCH_SIZE) {
      provinceBatches.push(targetProvinces.slice(i, i + BATCH_SIZE));
    }

    // معالجة كل مجموعة من الولايات بالتوازي
    for (const batch of provinceBatches) {
      // إنشاء مصفوفة من الوعود لكل ولاية في المجموعة الحالية
      const batchPromises = batch.map(async (targetProvince) => {
        try {

          // استخدام نقطة النهاية /fees مع معلمات صحيحة
          const response = await yalidineRateLimiter.schedule(() => 
            apiClientWithRetry.get(`fees/?from_wilaya_id=${sourceProvinceId}&to_wilaya_id=${targetProvince.id}`, {
              headers: { 'Cache-Control': 'no-cache' }
            })
          );
          
          if (response.status !== 200 || !response.data) {
            return { success: false, fees: [] };
          }
          
          // معالجة بيانات الاستجابة
          const responseData = response.data;
          
          // التحقق من تنسيق البيانات المستلمة
          if (!responseData || !responseData.per_commune) {
            return { success: false, fees: [] };
          }
          
          // استخراج البيانات العامة للمسار
          const routeInfo = {
            from_wilaya_name: responseData.from_wilaya_name,
            to_wilaya_name: responseData.to_wilaya_name,
            zone: responseData.zone,
            retour_fee: responseData.retour_fee,
            cod_percentage: responseData.cod_percentage,
            insurance_percentage: responseData.insurance_percentage,
            oversize_fee: responseData.oversize_fee
          };
          
          // معالجة بيانات كل بلدية
          const communeEntries = Object.entries(responseData.per_commune);
          const processingFees: any[] = [];
          
          for (const [communeId, communeData] of communeEntries) {
            // تجاهل المفاتيح غير الصالحة
            if (isNaN(Number(communeId))) continue;
            
            const commune = communeData as any;
            
            // إنشاء سجل لكل بلدية
            processingFees.push({
              from_wilaya_id: Number(sourceProvinceId),
              to_wilaya_id: Number(targetProvince.id),
              commune_id: Number(communeId),
              from_wilaya_name: routeInfo.from_wilaya_name,
              to_wilaya_name: routeInfo.to_wilaya_name,
              commune_name: commune.commune_name,
              zone: routeInfo.zone,
              retour_fee: routeInfo.retour_fee,
              cod_percentage: routeInfo.cod_percentage,
              insurance_percentage: routeInfo.insurance_percentage,
              oversize_fee: routeInfo.oversize_fee,
              express_home: commune.express_home,
              express_desk: commune.express_desk,
              economic_home: commune.economic_home,
              economic_desk: commune.economic_desk,
              is_home_available: commune.express_home !== null && commune.express_home > 0,
              is_stop_desk_available: commune.express_desk !== null && commune.express_desk > 0,
              home_fee: commune.express_home,
              stop_desk_fee: commune.express_desk,
              last_updated_at: new Date()
            });
          }

          return { success: true, fees: processingFees };
        } catch (error) {
          return { success: false, fees: [] };
        }
      });
      
      // انتظار اكتمال جميع الوعود في المجموعة الحالية
      const results = await Promise.all(batchPromises);
      
      // معالجة نتائج المجموعة
      for (const result of results) {
        if (result.success) {
          allFees.push(...result.fees);
        }
        processedCount++;
        updateFeeSyncStatus(targetProvinces.length, processedCount, 'syncing');
      }
    }
    
    // حفظ جميع الرسوم المجمعة
    if (allFees.length > 0) {
      
      await saveFees(allFees, organizationId);
      
      // تحديث حالة المزامنة إلى نجاح
      updateFeeSyncStatus(targetProvinces.length, targetProvinces.length, 'success');
      return true;
    } else {
      updateFeeSyncStatus(targetProvinces.length, targetProvinces.length, 'failed');
      return false;
    }
    
  } catch (error) {
    updateFeeSyncStatus(0, 0, 'failed');
    return false;
  }
}

/**
 * إعداد عميل API
 * @param organizationId معرف المنظمة
 * @param apiClient عميل API (اختياري)
 * @param options خيارات مخصصة (اختيارية)
 * @returns عميل API مهيأ
 */
async function setupApiClient(
  organizationId: string,
  apiClient?: AxiosInstance,
  options?: FeeSyncOptions
): Promise<AxiosInstance | null> {
  // إذا تم توفير عميل API، استخدمه
  if (apiClient) {
    
    return apiClient;
  }
  
  // إذا تم توفير بيانات اعتماد مخصصة، أنشئ عميل API جديد
  if (options?.apiId && options?.apiToken) {
    
    return createYalidineApiClient({
      api_id: options.apiId,
      api_token: options.apiToken
    }, options?.useProxy || false);
  }
  
  // استخدام بيانات الاعتماد من قاعدة البيانات
  
  return await getYalidineApiClient(organizationId, options?.useProxy);
}

/**
 * إعداد عميل API مع إعادة المحاولة
 * @param baseClient العميل الأساسي
 * @returns عميل API مع إعادة المحاولة
 */
function setupApiClientWithRetry(baseClient: AxiosInstance): AxiosInstance {
  // إعداد إعادة المحاولة
  axiosRetry(baseClient, {
    retries: 3,
    retryDelay: (retryCount) => {
      return retryCount * 1000; // تأخير متزايد: 1 ثانية، 2 ثانية، 3 ثوان
    },
    retryCondition: (error) => {
      // إعادة المحاولة فقط في حالة أخطاء الشبكة أو أخطاء الخادم (5xx)
      return axiosRetry.isNetworkOrIdempotentRequestError(error) || 
             (error.response && error.response.status >= 500);
    }
  });
  
  return baseClient;
}

/**
 * تحديد ولاية المصدر
 * @param organizationId معرف المنظمة
 * @param options خيارات مخصصة (اختيارية)
 * @returns معرف ولاية المصدر
 */
async function determineSourceProvince(
  organizationId: string,
  options?: FeeSyncOptions
): Promise<number | string> {
  // إذا تم تحديد ولاية المصدر في الخيارات، استخدمها
  if (options?.sourceProvinceId) {
    return options.sourceProvinceId;
  }
  
  try {
    // محاولة جلب ولاية المصدر من إعدادات المتجر
    const { data, error } = await supabase
      .from('store_settings')
      .select('value')
      .eq('organization_id', organizationId)
      .eq('key', 'yalidine_source_province_id')
      .maybeSingle();
    
    if (!error && data && data.value) {
      return Number(data.value);
    }
    
    // إذا لم يتم العثور على إعداد، استخدم الإعداد الافتراضي (الجزائر العاصمة)
    return 16; // معرف ولاية الجزائر العاصمة
  } catch (error) {
    // استخدام القيمة الافتراضية في حالة الخطأ
    return 16;
  }
}

/**
 * جلب قائمة الولايات المستهدفة
 * @param organizationId معرف المنظمة
 * @param options خيارات مخصصة (اختيارية)
 * @returns قائمة الولايات المستهدفة
 */
async function getTargetProvinces(
  organizationId: string,
  options?: FeeSyncOptions
): Promise<{ id: number | string, name: string }[]> {
  // إذا تم تحديد ولايات مستهدفة في الخيارات، استخدمها
  if (options?.targetProvinceIds && options.targetProvinceIds.length > 0) {
    // جلب أسماء الولايات المستهدفة
    const { data, error } = await supabase
      .from('yalidine_provinces')
      .select('id, name')
      .eq('organization_id', organizationId)
      .in('id', options.targetProvinceIds.map(id => Number(id)));
    
    if (!error && data && data.length > 0) {
      return data;
    }
  }
  
  // جلب جميع الولايات القابلة للتوصيل
  const { data, error } = await supabase
    .from('yalidine_provinces')
    .select('id, name')
    .eq('organization_id', organizationId)
    .eq('is_deliverable', true);
  
  if (!error && data && data.length > 0) {
    return data;
  }
  
  return [];
}

/**
 * حذف أسعار التوصيل القديمة لولاية المصدر
 * @param sourceWilayaId معرف ولاية المصدر
 * @param organizationId معرف المنظمة
 */
async function deleteOldFeesForSourceWilaya(sourceWilayaId: number, organizationId: string): Promise<void> {
  try {
    // استخدام دالة قاعدة البيانات لحذف الأسعار القديمة
    const { data, error } = await supabase.rpc('delete_yalidine_fees_for_organization', {
      p_organization_id: organizationId
    });
    
    if (error) {
      
      // محاولة الحذف المباشر
      const { error: deleteError } = await supabase
        .from('yalidine_fees')
        .delete()
        .eq('organization_id', organizationId)
        .eq('from_wilaya_id', sourceWilayaId);
      
      if (deleteError) {
      } else {
        
      }
    } else {
      
    }
  } catch (error) {
  }
}

/**
 * حفظ أسعار التوصيل
 * @param fees أسعار التوصيل للحفظ
 * @param organizationId معرف المنظمة
 */
async function saveFees(fees: any[], organizationId: string): Promise<void> {
  try {
    // تقسيم الأسعار إلى مجموعات لتجنب تجاوز حدود الطلب
    const batchSize = 100;
    const batches = [];
    
    for (let i = 0; i < fees.length; i += batchSize) {
      batches.push(fees.slice(i, i + batchSize));
    }

    // معالجة كل مجموعة
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      try {
        // إعداد البيانات للإدخال
        const preparedBatch = batch.map(fee => ({
          ...fee,
          organization_id: organizationId,
          from_wilaya_id: Number(fee.from_wilaya_id),
          to_wilaya_id: Number(fee.to_wilaya_id),
          commune_id: Number(fee.commune_id || 0),
          home_fee: Number(fee.home_fee || fee.express_home || 0),
          stop_desk_fee: Number(fee.stop_desk_fee || fee.express_desk || 0),
          express_home: Number(fee.home_fee || fee.express_home || 0),
          express_desk: Number(fee.stop_desk_fee || fee.express_desk || 0)
        }));
        
        // استخدام دالة قاعدة البيانات للإدخال
        // تحويل البيانات إلى نص JSON بشكل صريح لتجنب مشكلة تعدد الوظائف
        const jsonString = JSON.stringify(preparedBatch);
        const { data, error } = await supabase.rpc('simple_insert_yalidine_fees', {
          p_data: jsonString,
          p_organization_id: organizationId
        });
        
        const rpcInsertedCount = typeof data === 'number' ? data : -1;
        
        if (error || rpcInsertedCount === 0) {
          // إذا كان الخطأ يتعلق بتعدد الوظائف، فقم بمحاولة استدعاء الوظيفة بطريقة أخرى
          if (error && error.message && error.message.includes('Could not choose the best candidate function')) {
            try {
              // محاولة استدعاء الوظيفة بتحديد نوع البيانات بشكل صريح
              const { data: data2, error: error2 } = await supabase.rpc('simple_insert_yalidine_fees', {
                p_data: jsonString,
                p_organization_id: organizationId
              }, { headers: { 'Content-Type': 'text/plain' } });
              
              if (!error2 && typeof data2 === 'number' && data2 > 0) {
                
                return;
              }
            } catch (retryError) {
            }
          }
          
          // محاولة الإدخال المباشر

          const { error: insertError } = await supabase
            .from('yalidine_fees')
            .upsert(preparedBatch, {
              onConflict: 'organization_id,from_wilaya_id,to_wilaya_id,commune_id',
              ignoreDuplicates: false
            });
          
          if (insertError) {
            
            // إدخال كل سجل على حدة
            
            let successCount = 0;
            
            for (const record of preparedBatch) {
              const { error: singleError } = await supabase
                .from('yalidine_fees')
                .upsert([record], {
                  onConflict: 'organization_id,from_wilaya_id,to_wilaya_id,commune_id',
                  ignoreDuplicates: false
                });
              
              if (!singleError) {
                successCount++;
              }
            }

          } else {
            
          }
        } else {
          const insertedCount = typeof data === 'number' ? data : preparedBatch.length;
          
        }
      } catch (e) {
      }
      
      // إضافة تأخير بين الدفعات
      if (i < batches.length - 1) {
        const delay = 1000;
        
        await new Promise(r => setTimeout(r, delay));
      }
    }
  } catch (error) {
    throw error;
  }
}
