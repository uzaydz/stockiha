/**
 * وظائف مزامنة بيانات أسعار التوصيل
 */

import { AxiosInstance, default as axios } from 'axios';
import { supabase } from '@/lib/supabase-client';
import { getSyncStatus, updateSyncStatus, updateFeeSyncStatus } from './sync-status';
import { yalidineRateLimiter } from './rate-limiter';

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
 * وظيفة تحديث بيانات أسعار التوصيل بأسلوب محسّن وأسرع
 * مع دعم استئناف المزامنة وتقسيم العمل إلى مجموعات أصغر
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
    
    // التحقق من وجود مزامنة مؤقتة سابقة
    const hasTempSync = checkForTemporarySync(organizationId);
    
    // عميل API للاستخدام
    const clientToUse = await setupApiClient(organizationId, apiClient, options);
    if (!clientToUse) {
      updateFeeSyncStatus(0, 0, 'failed');
      return false;
    }
    
    // تحديد ولاية المصدر
    const storeProvinceId = await determineSourceProvince(organizationId, options);

    // جلب قائمة الولايات للمعالجة
    let provincesToProcess = await getProvincesToProcess(organizationId, options);
    if (provincesToProcess.length === 0) {
      updateFeeSyncStatus(0, 0, 'failed');
      return false;
    }

    // تحديث حالة التقدم
    updateFeeSyncStatus(provincesToProcess.length, 0, 'syncing');
    
    // الخطوة 1: حذف البيانات القديمة (فقط إذا لم تكن هناك مزامنة مؤقتة سابقة)
    if (!hasTempSync) {
      
      await deleteOldFeesForSourceWilaya(Number(storeProvinceId), organizationId);
    } else {

      // استرجاع حالة المزامنة المؤقتة
      const tempSync = getTempSyncState(organizationId);
      if (tempSync && tempSync.processedProvinceIds && tempSync.processedProvinceIds.length > 0) {
        // استبعاد الولايات التي تمت معالجتها بالفعل
        provincesToProcess = provincesToProcess.filter(
          p => !tempSync.processedProvinceIds.includes(Number(p.id))
        );

        updateFeeSyncStatus(
          tempSync.totalProvinces || provincesToProcess.length, 
          tempSync.processedProvinceIds.length,
          'syncing'
        );
      }
    }
    
    // هل تم الانتهاء من جميع الولايات؟
    if (provincesToProcess.length === 0) {
      
      updateFeeSyncStatus(getTotalProvinceCount(), getTotalProvinceCount(), 'success');
      
      // مسح حالة المزامنة المؤقتة بعد الانتهاء
      clearTempSyncState(organizationId);
      return true;
    }
    
    // الخطوة 2: جلب أسعار التوصيل من API ياليدين
    try {

      // إعداد العميل للوصول المباشر
      const directApiClient = setupDirectApiClient(clientToUse, options);
      
      // تنظيم الولايات في مجموعات صغيرة
      const batchSize = 2; // استخدام مجموعات صغيرة
      const allFees = [];
      let processedProvinces = getTempSyncState(organizationId)?.processedProvinceIds?.length || 0;
      
      // تقسيم إلى مجموعات
      const chunks = [];
      for (let i = 0; i < provincesToProcess.length; i += batchSize) {
        chunks.push(provincesToProcess.slice(i, i + batchSize));
      }

      // حفظ عدد الولايات الإجمالي للاستئناف لاحقاً
      saveTempSyncState(organizationId, {
        sourceProvinceId: Number(storeProvinceId),
        totalProvinces: getTotalProvinceCount(),
        processedProvinceIds: getTempSyncState(organizationId)?.processedProvinceIds || []
      });
      
      // معالجة المجموعات واحدة تلو الأخرى
      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunk = chunks[chunkIndex];

        try {
          // تنفيذ طلبات الولايات في هذه المجموعة بالتتابع
          const chunkFees = [];  // نحتفظ بالرسوم المجمعة لهذه المجموعة
          
          for (const fromProvince of chunk) {
            try {

              // تنفيذ محاولات متعددة
              let attempts = 0;
              const maxAttempts = 3;
              let lastError = null;
              
              while (attempts < maxAttempts) {
                try {
                  // استخدام معلمات API المصححة (من المصدر إلى الوجهة)
                  const response = await yalidineRateLimiter.schedule(() => 
                    directApiClient.get(`fees/?from_wilaya_id=${storeProvinceId}&to_wilaya_id=${fromProvince.id}`, {
                      headers: { 'Cache-Control': 'no-cache' }
                    })
                  );
                  
                  if (response.status !== 200 || !response.data) {
                    processedProvinces++;
                    updateFeeSyncStatus(provincesToProcess.length, processedProvinces, 'syncing');
                    
                    // إضافة الولاية للولايات المعالجة حتى إذا فشلت
                    addProcessedProvince(organizationId, Number(fromProvince.id));
                    break;  // الخروج من حلقة المحاولات
                  }
                  
                  // معالجة بيانات الاستجابة
                  const feesData = response.data?.data || response.data || [];
                  
                  if (Array.isArray(feesData) && feesData.length > 0) {
                    const processedFees = feesData.map(fee => ({
                      ...fee,
                      // تبديل قيم من/إلى لتتناسب مع نموذج البيانات
                      from_wilaya_id: storeProvinceId,
                      to_wilaya_id: fromProvince.id,
                      from_wilaya_name: fee.to_wilaya_name || 'غير معروف', // تبديل الاتجاه
                      to_wilaya_name: fee.from_wilaya_name || 'غير معروف', // تبديل الاتجاه
                      organization_id: organizationId
                    }));

                    // إضافة السجلات إلى المصفوفة الكلية
                    chunkFees.push(...processedFees);
                    allFees.push(...processedFees);
                    
                    processedProvinces++;

                    // تحديث حالة المزامنة
                    updateFeeSyncStatus(getTotalProvinceCount(), processedProvinces, 'syncing');
                    
                    // حفظ حالة المزامنة المؤقتة
                    addProcessedProvince(organizationId, Number(fromProvince.id));
                    
                    // تمت العملية بنجاح
                    break;  // الخروج من حلقة المحاولات
                  } else {
                    processedProvinces++;
                    updateFeeSyncStatus(getTotalProvinceCount(), processedProvinces, 'syncing');
                    
                    // إضافة الولاية للولايات المعالجة
                    addProcessedProvince(organizationId, Number(fromProvince.id));
                    break;  // الخروج من حلقة المحاولات
                  }
                } catch (retryError) {
                  lastError = retryError;
                  attempts++;
                  
                  if (attempts >= maxAttempts) {
                    processedProvinces++; 
                    updateFeeSyncStatus(getTotalProvinceCount(), processedProvinces, 'syncing');
                    
                    // إضافة الولاية إلى القائمة المعالجة حتى لو فشلت
                    addProcessedProvince(organizationId, Number(fromProvince.id));
                    break;  // الخروج من حلقة المحاولات
                  }
                  
                  // انتظار قبل المحاولة التالية
                  const delay = Math.min(2000 * Math.pow(2, attempts - 1), 10000);
                  
                  await new Promise(r => setTimeout(r, delay));
                }
              }
            } catch (error) {
              processedProvinces++;
              updateFeeSyncStatus(getTotalProvinceCount(), processedProvinces, 'syncing');
              
              // إضافة الولاية إلى القائمة المعالجة حتى لو فشلت
              addProcessedProvince(organizationId, Number(fromProvince.id));
            }
          }

          // حفظ البيانات المجمعة لهذه المجموعة فوراً
          if (chunkFees.length > 0) {
            
            try {
              await saveFees(chunkFees, organizationId);
              
              // تفريغ المصفوفة بعد الحفظ
              chunkFees.length = 0;
            } catch (saveError) {
            }
          } else {
            
          }
          
          // إضافة تأخير قصير بين المجموعات لتخفيف الضغط
          if (chunkIndex < chunks.length - 1) {
            const interChunkDelay = 2000;
            
            await new Promise(r => setTimeout(r, interChunkDelay));
          }
        } catch (chunkError) {
        }
      }

      // حفظ أي بيانات متبقية (تأكيد إضافي)
      if (allFees.length > 0) {
        
        try {
          await saveFees(allFees, organizationId);
          
        } catch (finalSaveError) {
          
          // محاولة حفظ البيانات على دفعات صغيرة في حالة الفشل
          try {
            
            const fallbackBatchSize = 50;
            let successCount = 0;
            
            for (let i = 0; i < allFees.length; i += fallbackBatchSize) {
              const smallBatch = allFees.slice(i, i + fallbackBatchSize);
              try {
                await saveFees(smallBatch, organizationId);
                successCount += smallBatch.length;
                
              } catch (smallBatchError) {
              }
            }

          } catch (fallbackError) {
          }
        }
      } else {
        
      }
      
      // فحص إذا تم حفظ أي بيانات
      const { count, error } = await supabase
        .from('yalidine_fees')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);
      
      if (error) {
      } else {
        
        if ((count || 0) === 0 && allFees.length > 0) {
          // محاولة أخيرة للحفظ إذا لم يتم حفظ أي بيانات

          try {
            const preparedData = allFees.map(fee => ({
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
            
            // محاولة إدراج مباشر
            const { error: insertError } = await supabase
              .from('yalidine_fees')
              .insert(preparedData.slice(0, 100)); // تجربة أول 100 سجل فقط
            
            if (insertError) {
            } else {
              
            }
          } catch (emergencyError) {
          }
        }
      }
      
      // مسح حالة المزامنة المؤقتة
      clearTempSyncState(organizationId);
      
      // تحديث حالة المزامنة
      updateFeeSyncStatus(getTotalProvinceCount(), getTotalProvinceCount(), 'success');
      return true;
    } catch (error) {
      updateFeeSyncStatus(getTotalProvinceCount(), 0, 'failed');
      return false;
    }
  } catch (error) {
    updateFeeSyncStatus(0, 0, 'failed');
    return false;
  }
}

// وظائف مساعدة للمزامنة القابلة للاستئناف

/**
 * التحقق من وجود مزامنة مؤقتة سابقة
 */
function checkForTemporarySync(organizationId: string): boolean {
  try {
    const tempSyncKey = `yalidine_temp_sync_${organizationId}`;
    const tempSyncData = localStorage.getItem(tempSyncKey);
    return !!tempSyncData;
  } catch (e) {
    return false;
  }
}

/**
 * الحصول على حالة المزامنة المؤقتة
 */
function getTempSyncState(organizationId: string): {
  sourceProvinceId?: number;
  totalProvinces?: number;
  processedProvinceIds?: number[];
} | null {
  try {
    const tempSyncKey = `yalidine_temp_sync_${organizationId}`;
    const tempSyncData = localStorage.getItem(tempSyncKey);
    return tempSyncData ? JSON.parse(tempSyncData) : null;
  } catch (e) {
    return null;
  }
}

/**
 * حفظ حالة المزامنة المؤقتة
 */
function saveTempSyncState(organizationId: string, state: {
  sourceProvinceId: number;
  totalProvinces: number;
  processedProvinceIds: number[];
}): void {
  try {
    const tempSyncKey = `yalidine_temp_sync_${organizationId}`;
    localStorage.setItem(tempSyncKey, JSON.stringify(state));
  } catch (e) {
  }
}

/**
 * إضافة ولاية إلى قائمة الولايات المعالجة
 */
function addProcessedProvince(organizationId: string, provinceId: number): void {
  try {
    const tempSync = getTempSyncState(organizationId);
    const tempSyncState = {
      sourceProvinceId: tempSync?.sourceProvinceId || 0,
      totalProvinces: tempSync?.totalProvinces || getTotalProvinceCount(),
      processedProvinceIds: tempSync?.processedProvinceIds || []
    };
    
    if (!tempSyncState.processedProvinceIds.includes(provinceId)) {
      tempSyncState.processedProvinceIds.push(provinceId);
      saveTempSyncState(organizationId, tempSyncState);
    }
  } catch (e) {
  }
}

/**
 * مسح حالة المزامنة المؤقتة
 */
function clearTempSyncState(organizationId: string): void {
  try {
    const tempSyncKey = `yalidine_temp_sync_${organizationId}`;
    localStorage.removeItem(tempSyncKey);
  } catch (e) {
  }
}

/**
 * الحصول على إجمالي عدد الولايات
 */
function getTotalProvinceCount(): number {
  try {
    return 58; // العدد الثابت للولايات في الجزائر
  } catch (e) {
    return 58;
  }
}

/**
 * إعداد عميل API
 */
async function setupApiClient(
  organizationId: string,
  apiClient?: AxiosInstance,
  options?: FeeSyncOptions
): Promise<AxiosInstance | null> {
  // نفس المنطق الموجود في الدالة الأصلية
  let customClient: AxiosInstance | null = null;
    
    if (options?.apiId && options?.apiToken) {

      try {
        const useProxy = options.useProxy === true;
        const baseURL = useProxy 
          ? '/api/yalidine-proxy'
          : 'https://api.yalidine.app/v1';
          
        customClient = axios.create({
          baseURL,
          headers: {
            'X-API-ID': options.apiId,
            'X-API-TOKEN': options.apiToken,
            'Content-Type': 'application/json'
          }
        });

      } catch (error) {
      }
    }
    
  // استخدام العميل المخصص أو الممرر
  const clientToUse = customClient || apiClient;
    
    if (!clientToUse) {
    return null;
  }
  
  return clientToUse;
}

/**
 * تحديد ولاية المصدر
 */
async function determineSourceProvince(
  organizationId: string,
  options?: FeeSyncOptions
): Promise<number | string> {
  // الحصول على ولاية المصدر من الخيارات أو من التخزين المحلي أو من القيمة الافتراضية
  let storeProvinceId: number | string = options?.sourceProvinceId || 16;
  
  // استخدام القيمة المخزنة مؤقتًا إذا كانت موجودة
  const tempSyncState = getTempSyncState(organizationId);
  if (tempSyncState && tempSyncState.sourceProvinceId) {
    storeProvinceId = tempSyncState.sourceProvinceId;
    
    return storeProvinceId;
  }
  
  // نفس المنطق الموجود في الدالة الأصلية للبحث عن ولاية المصدر
    if (!options?.sourceProvinceId) {
      try {
        const syncOptionsStr = localStorage.getItem('yalidine_sync_options');
        if (syncOptionsStr) {
          const syncOptions = JSON.parse(syncOptionsStr);
          if (syncOptions.sourceProvinceId) {
            storeProvinceId = syncOptions.sourceProvinceId;
            
          }
        }
      } catch (e) {
      }
      
      if (storeProvinceId === 16) {
        try {
          const { data: settings, error: settingsError } = await supabase
            .from('shipping_provider_settings')
            .select('settings')
            .eq('organization_id', organizationId)
          .eq('provider_id', 1)
            .single();
          
          if (!settingsError && settings && settings.settings && settings.settings.origin_wilaya_id) {
            storeProvinceId = settings.settings.origin_wilaya_id;
            
          } else {
            
          }
        } catch (storeError) {
        }
      }
    } else {
      
    }
    
  return storeProvinceId;
}

/**
 * الحصول على الولايات المطلوب معالجتها
 */
async function getProvincesToProcess(
  organizationId: string,
  options?: FeeSyncOptions
): Promise<{ id: number | string, name: string }[]> {
    let provincesToProcess: { id: number | string, name: string }[] = [];
    
  // استخدام الولايات المحددة إذا تم توفيرها
    if (options?.targetProvinceIds && options.targetProvinceIds.length > 0) {

      const { data: targetProvinces, error: targetError } = await supabase
        .from('yalidine_provinces_global')
        .select('id, name')
        .in('id', options.targetProvinceIds);
      
      if (!targetError && targetProvinces && targetProvinces.length > 0) {
        provincesToProcess = targetProvinces;
        
      } else {
      }
    }
    
  // إذا لم يتم العثور على ولايات محددة، استخدام جميع الولايات
    if (provincesToProcess.length === 0) {
      
      const { data: allProvinces, error: provincesError } = await supabase
        .from('yalidine_provinces_global')
        .select('id, name');
      
      if (provincesError || !allProvinces || allProvinces.length === 0) {
      return [];
      }
      
      provincesToProcess = allProvinces;
    }
    
  return provincesToProcess;
}

/**
 * إعداد عميل API مباشر
 */
function setupDirectApiClient(
  baseClient: AxiosInstance,
  options?: FeeSyncOptions
): AxiosInstance {
      // إعداد عميل API للوصول المباشر إلى Yalidine
      const directApiClient = axios.create({
        baseURL: options?.useProxy !== false ? '/api/yalidine-proxy' : 'https://api.yalidine.app/v1',
        headers: {
      'X-API-ID': options?.apiId || baseClient.defaults.headers['X-API-ID'],
      'X-API-TOKEN': options?.apiToken || baseClient.defaults.headers['X-API-TOKEN'],
          'Content-Type': 'application/json'
        },
    timeout: 30000,
    validateStatus: (status) => status >= 200 && status < 300,
    maxRedirects: 5,
    maxContentLength: 50 * 1024 * 1024
  });
  
  // محاولة إضافة آلية إعادة المحاولة
      if (typeof require !== 'undefined') {
        try {
          const axiosRetry = require('axios-retry');
          axiosRetry(directApiClient, {
            retries: 3,
            retryDelay: axiosRetry.exponentialDelay,
            retryCondition: (error) => {
              return error.code === 'ECONNABORTED' || 
                     error.code === 'ERR_NETWORK' || 
                     !error.response || 
                     error.response.status >= 500;
            },
            onRetry: (retryCount, error, requestConfig) => {
              
            }
          });
        } catch (e) {
          
        }
      }
      
  return directApiClient;
}

// تغيير طريقة حذف الأسعار القديمة
async function deleteOldFeesForSourceWilaya(sourceWilayaId: number, organizationId: string): Promise<void> {

  try {
    // استخدام تنفيذ مباشر لضمان عدم تداخل العمليات
    const { error } = await supabase.rpc('delete_yalidine_fees_for_organization', {
      p_organization_id: organizationId,
      p_from_wilaya_id: Number(sourceWilayaId) // تحويل إلى رقم صريح
    });
    
    if (error) {
      
      // محاولة حذف بالطريقة البديلة
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
  } catch (e) {
  }
}

// تبسيط دالة حفظ الرسوم
async function saveFees(fees: any[], organizationId: string): Promise<void> {
  if (fees.length === 0) {
    
    return;
  }

  // تجميع السجلات في دفعات للحفظ
  const batchSize = 100;
  const batches = [];
  
  for (let i = 0; i < fees.length; i += batchSize) {
    batches.push(fees.slice(i, i + batchSize));
  }

  // معالجة دفعة واحدة في كل مرة
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    
    try {
      // تحضير البيانات قبل الحفظ - تأكد من تعيين المعرّفات بشكل صريح
      const preparedBatch = batch.map(fee => {
        // تعديل: التأكد من أن المعرفات هي أرقام صحيحة
        return {
          ...fee,
          organization_id: organizationId,
          from_wilaya_id: Number(fee.from_wilaya_id),
          to_wilaya_id: Number(fee.to_wilaya_id),
          commune_id: Number(fee.commune_id || 0),
          // التأكد من تعيين جميع حقول الرسوم بشكل صحيح
          home_fee: Number(fee.home_fee || fee.express_home || 0),
          stop_desk_fee: Number(fee.stop_desk_fee || fee.express_desk || 0),
          express_home: Number(fee.home_fee || fee.express_home || 0),
          express_desk: Number(fee.stop_desk_fee || fee.express_desk || 0)
        };
      });

      // طريقة 1: استخدام الوظيفة المباشرة مع تحويل البيانات إلى سلسلة نصية
      const { data, error } = await supabase.rpc('simple_insert_yalidine_fees', {
        p_data: JSON.stringify(preparedBatch),
        p_organization_id: organizationId
      });

      const rpcInsertedCount = typeof data === 'number' ? data : -1; // Use -1 or another indicator if data isn't a number

      if (error || rpcInsertedCount === 0) {
        
        // طريقة 2: محاولة الإدخال المباشر

        // إدخال السجلات مباشرةً في جدول yalidine_fees
        const { error: insertError } = await supabase
          .from('yalidine_fees')
          .upsert(preparedBatch, {
            onConflict: 'organization_id,from_wilaya_id,to_wilaya_id,commune_id',
            ignoreDuplicates: false
          });
        
        if (insertError) {
          
          // طريقة 3: إدخال كل سجل على حدة
          
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
    
    // إضافة تأخير بين الدفعات إذا كان هناك المزيد من الدفعات
    if (i < batches.length - 1) {
      const delay = 1000;
      
      await new Promise(r => setTimeout(r, delay));
    }
  }
}
