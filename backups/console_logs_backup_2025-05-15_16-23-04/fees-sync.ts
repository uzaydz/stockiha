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
    console.log(`[FEES] مزامنة بيانات أسعار التوصيل للمنظمة: ${organizationId}`);
    
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
    console.log(`[FEES] استخدام ولاية المصدر: ${storeProvinceId}`);
    
    // جلب قائمة الولايات للمعالجة
    let provincesToProcess = await getProvincesToProcess(organizationId, options);
    if (provincesToProcess.length === 0) {
      console.error('[FEES] لم يتم العثور على أي ولايات للمعالجة');
      updateFeeSyncStatus(0, 0, 'failed');
      return false;
    }
    
    console.log(`[FEES] سيتم معالجة ${provincesToProcess.length} ولاية للحصول على الأسعار`);
    
    // تحديث حالة التقدم
    updateFeeSyncStatus(provincesToProcess.length, 0, 'syncing');
    
    // الخطوة 1: حذف البيانات القديمة (فقط إذا لم تكن هناك مزامنة مؤقتة سابقة)
    if (!hasTempSync) {
      console.log(`[FEES] حذف بيانات الأسعار القديمة من الولاية ${storeProvinceId}`);
      await deleteOldFeesForSourceWilaya(Number(storeProvinceId), organizationId);
    } else {
      console.log('[FEES] تم العثور على مزامنة مؤقتة سابقة، تخطي حذف البيانات القديمة');
      
      // استرجاع حالة المزامنة المؤقتة
      const tempSync = getTempSyncState(organizationId);
      if (tempSync && tempSync.processedProvinceIds && tempSync.processedProvinceIds.length > 0) {
        // استبعاد الولايات التي تمت معالجتها بالفعل
        provincesToProcess = provincesToProcess.filter(
          p => !tempSync.processedProvinceIds.includes(Number(p.id))
        );
        console.log(`[FEES] استئناف المزامنة: ${provincesToProcess.length} ولاية متبقية للمعالجة`);
        
        updateFeeSyncStatus(
          tempSync.totalProvinces || provincesToProcess.length, 
          tempSync.processedProvinceIds.length,
          'syncing'
        );
      }
    }
    
    // هل تم الانتهاء من جميع الولايات؟
    if (provincesToProcess.length === 0) {
      console.log('[FEES] تم الانتهاء من جميع الولايات بالفعل');
      updateFeeSyncStatus(getTotalProvinceCount(), getTotalProvinceCount(), 'success');
      
      // مسح حالة المزامنة المؤقتة بعد الانتهاء
      clearTempSyncState(organizationId);
      return true;
    }
    
    // الخطوة 2: جلب أسعار التوصيل من API ياليدين
    try {
      console.log('[FEES] جلب أسعار التوصيل من API ياليدين');
      
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
      
      console.log(`[FEES] تم تقسيم ${provincesToProcess.length} ولاية إلى ${chunks.length} مجموعة للمعالجة`);
      
      // حفظ عدد الولايات الإجمالي للاستئناف لاحقاً
      saveTempSyncState(organizationId, {
        sourceProvinceId: Number(storeProvinceId),
        totalProvinces: getTotalProvinceCount(),
        processedProvinceIds: getTempSyncState(organizationId)?.processedProvinceIds || []
      });
      
      // معالجة المجموعات واحدة تلو الأخرى
      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunk = chunks[chunkIndex];
        console.log(`[FEES] معالجة المجموعة ${chunkIndex + 1}/${chunks.length} (${chunk.length} ولاية)`);
        
        try {
          // تنفيذ طلبات الولايات في هذه المجموعة بالتتابع
          const chunkFees = [];  // نحتفظ بالرسوم المجمعة لهذه المجموعة
          
          for (const fromProvince of chunk) {
            try {
              console.log(`[FEES] جلب أسعار التوصيل من الولاية ${storeProvinceId} إلى الولاية ${fromProvince.id}`);
              
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
                    console.warn(`[FEES] فشل جلب بيانات أسعار التوصيل من ${storeProvinceId} إلى ${fromProvince.id}`);
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
                    
                    console.log(`[FEES_DEBUG] المعالجة: تم استلام ${processedFees.length} سجل من API`);
                    
                    // إضافة السجلات إلى المصفوفة الكلية
                    chunkFees.push(...processedFees);
                    allFees.push(...processedFees);
                    
                    processedProvinces++;
                    console.log(`[FEES] تم جلب ${processedFees.length} سجل أسعار من ${storeProvinceId} إلى ${fromProvince.id} (${processedProvinces}/${getTotalProvinceCount()})`);
                    
                    // تحديث حالة المزامنة
                    updateFeeSyncStatus(getTotalProvinceCount(), processedProvinces, 'syncing');
                    
                    // حفظ حالة المزامنة المؤقتة
                    addProcessedProvince(organizationId, Number(fromProvince.id));
                    
                    // تمت العملية بنجاح
                    break;  // الخروج من حلقة المحاولات
                  } else {
                    console.warn(`[FEES] لم يتم العثور على بيانات أسعار من ${storeProvinceId} إلى ${fromProvince.id}`);
                    processedProvinces++;
                    updateFeeSyncStatus(getTotalProvinceCount(), processedProvinces, 'syncing');
                    
                    // إضافة الولاية للولايات المعالجة
                    addProcessedProvince(organizationId, Number(fromProvince.id));
                    break;  // الخروج من حلقة المحاولات
                  }
                } catch (retryError) {
                  lastError = retryError;
                  attempts++;
                  
                  console.warn(`[FEES] محاولة ${attempts}/${maxAttempts} فشلت لولاية ${fromProvince.id}: ${retryError.message}`);
                  
                  if (attempts >= maxAttempts) {
                    console.error(`[FEES] استنفدت جميع المحاولات لولاية ${fromProvince.id}`);
                    processedProvinces++; 
                    updateFeeSyncStatus(getTotalProvinceCount(), processedProvinces, 'syncing');
                    
                    // إضافة الولاية إلى القائمة المعالجة حتى لو فشلت
                    addProcessedProvince(organizationId, Number(fromProvince.id));
                    break;  // الخروج من حلقة المحاولات
                  }
                  
                  // انتظار قبل المحاولة التالية
                  const delay = Math.min(2000 * Math.pow(2, attempts - 1), 10000);
                  console.log(`[FEES] الانتظار ${delay}ms قبل المحاولة التالية`);
                  await new Promise(r => setTimeout(r, delay));
                }
              }
            } catch (error) {
              console.error(`[FEES] خطأ أثناء معالجة الولاية ${fromProvince.id}:`, error);
              processedProvinces++;
              updateFeeSyncStatus(getTotalProvinceCount(), processedProvinces, 'syncing');
              
              // إضافة الولاية إلى القائمة المعالجة حتى لو فشلت
              addProcessedProvince(organizationId, Number(fromProvince.id));
            }
          }
          
          console.log(`[FEES] تم الانتهاء من المجموعة ${chunkIndex + 1}/${chunks.length}`);
          console.log(`[FEES_DEBUG] التجميع: تم تجميع ${chunkFees.length} سجل في هذه المجموعة`);
          console.log(`[FEES_DEBUG] الإجمالي: تم تجميع ${allFees.length} سجل في المجموع`);
          
          // حفظ البيانات المجمعة لهذه المجموعة فوراً
          if (chunkFees.length > 0) {
            console.log(`[FEES_PRE_SAVE] حفظ ${chunkFees.length} سجل من المجموعة ${chunkIndex + 1}`);
            try {
              await saveFees(chunkFees, organizationId);
              console.log(`[FEES_POST_SAVE] تم حفظ ${chunkFees.length} سجل بنجاح من المجموعة ${chunkIndex + 1}`);
              // تفريغ المصفوفة بعد الحفظ
              chunkFees.length = 0;
            } catch (saveError) {
              console.error(`[FEES] خطأ أثناء حفظ بيانات المجموعة ${chunkIndex + 1}:`, saveError);
            }
          } else {
            console.log(`[FEES_SAVE_SKIP] تخطي الحفظ للمجموعة ${chunkIndex + 1} - لا توجد بيانات`);
          }
          
          // إضافة تأخير قصير بين المجموعات لتخفيف الضغط
          if (chunkIndex < chunks.length - 1) {
            const interChunkDelay = 2000;
            console.log(`[FEES] انتظار ${interChunkDelay}ms قبل معالجة المجموعة التالية`);
            await new Promise(r => setTimeout(r, interChunkDelay));
          }
        } catch (chunkError) {
          console.error(`[FEES] خطأ أثناء معالجة المجموعة ${chunkIndex + 1}/${chunks.length}:`, chunkError);
        }
      }
      
      console.log(`[FEES] اكتملت مزامنة الأسعار: تمت معالجة ${processedProvinces} ولاية بنجاح`);
      console.log(`[FEES_DEBUG] التلخيص: تم تجميع إجمالي ${allFees.length} سجل`);
      
      // حفظ أي بيانات متبقية (تأكيد إضافي)
      if (allFees.length > 0) {
        console.log(`[FEES_PRE_SAVE_FINAL] حفظ ${allFees.length} سجل متبقي`);
        try {
          await saveFees(allFees, organizationId);
          console.log(`[FEES_POST_SAVE_FINAL] تم حفظ ${allFees.length} سجل متبقي بنجاح`);
        } catch (finalSaveError) {
          console.error(`[FEES] خطأ أثناء حفظ البيانات المتبقية:`, finalSaveError);
          
          // محاولة حفظ البيانات على دفعات صغيرة في حالة الفشل
          try {
            console.log('[FEES] محاولة حفظ البيانات المتبقية على دفعات صغيرة...');
            const fallbackBatchSize = 50;
            let successCount = 0;
            
            for (let i = 0; i < allFees.length; i += fallbackBatchSize) {
              const smallBatch = allFees.slice(i, i + fallbackBatchSize);
              try {
                await saveFees(smallBatch, organizationId);
                successCount += smallBatch.length;
                console.log(`[FEES] تم حفظ دفعة صغيرة: ${i / fallbackBatchSize + 1} (${successCount} سجل)`);
              } catch (smallBatchError) {
                console.error(`[FEES] فشل حفظ دفعة صغيرة: ${i / fallbackBatchSize + 1}`, smallBatchError);
              }
            }
            
            console.log(`[FEES] تم حفظ ${successCount}/${allFees.length} سجل باستخدام الدفعات الصغيرة`);
          } catch (fallbackError) {
            console.error('[FEES] فشلت جميع محاولات الحفظ:', fallbackError);
          }
        }
      } else {
        console.log('[FEES_SAVE_SKIP_FINAL] لا توجد بيانات متبقية للحفظ');
      }
      
      // فحص إذا تم حفظ أي بيانات
      const { count, error } = await supabase
        .from('yalidine_fees')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);
      
      if (error) {
        console.error('[FEES_VERIFY] خطأ أثناء التحقق من البيانات المحفوظة:', error);
      } else {
        console.log(`[FEES_VERIFY] عدد السجلات المحفوظة في قاعدة البيانات: ${count || 0}`);
        if ((count || 0) === 0 && allFees.length > 0) {
          // محاولة أخيرة للحفظ إذا لم يتم حفظ أي بيانات
          console.log('[FEES_EMERGENCY] محاولة أخيرة للحفظ باستخدام الإدراج المباشر...');
          
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
              console.error('[FEES_EMERGENCY] فشل الإدراج المباشر:', insertError);
            } else {
              console.log('[FEES_EMERGENCY] تم الإدراج المباشر بنجاح');
            }
          } catch (emergencyError) {
            console.error('[FEES_EMERGENCY] فشل إجراء الإنقاذ:', emergencyError);
          }
        }
      }
      
      // مسح حالة المزامنة المؤقتة
      clearTempSyncState(organizationId);
      
      // تحديث حالة المزامنة
      updateFeeSyncStatus(getTotalProvinceCount(), getTotalProvinceCount(), 'success');
      return true;
    } catch (error) {
      console.error('[FEES] خطأ أثناء مزامنة أسعار التوصيل:', error);
      updateFeeSyncStatus(getTotalProvinceCount(), 0, 'failed');
      return false;
    }
  } catch (error) {
    console.error('[FEES] خطأ في عملية مزامنة أسعار التوصيل:', error);
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
    console.error('[FEES] خطأ في التحقق من المزامنة المؤقتة:', e);
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
    console.error('[FEES] خطأ في استرجاع حالة المزامنة المؤقتة:', e);
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
    console.error('[FEES] خطأ في حفظ حالة المزامنة المؤقتة:', e);
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
    console.error('[FEES] خطأ في إضافة ولاية معالجة:', e);
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
    console.error('[FEES] خطأ في مسح حالة المزامنة المؤقتة:', e);
  }
}

/**
 * الحصول على إجمالي عدد الولايات
 */
function getTotalProvinceCount(): number {
  try {
    return 58; // العدد الثابت للولايات في الجزائر
  } catch (e) {
    console.error('[FEES] خطأ في الحصول على عدد الولايات:', e);
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
      console.log('[FEES] استخدام بيانات API المخصصة المقدمة');
      
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
        
        console.log('[FEES] تم إنشاء عميل API مخصص بنجاح');
      } catch (error) {
        console.error('[FEES] فشل إنشاء عميل API مخصص:', error);
      }
    }
    
  // استخدام العميل المخصص أو الممرر
  const clientToUse = customClient || apiClient;
    
    if (!clientToUse) {
      console.error('[FEES] لم يتم توفير عميل API ولم يمكن إنشاء عميل مخصص');
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
    console.log(`[FEES] استخدام ولاية المصدر من المزامنة المؤقتة: ${storeProvinceId}`);
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
            console.log(`[FEES] تم تحديد ولاية المتجر من خيارات المزامنة: ${storeProvinceId}`);
          }
        }
      } catch (e) {
        console.error('[FEES] خطأ أثناء قراءة خيارات المزامنة من localStorage:', e);
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
            console.log(`[FEES] تم تحديد ولاية المتجر من قاعدة البيانات: ${storeProvinceId}`);
          } else {
            console.log(`[FEES] لم يتم العثور على ولاية المتجر، استخدام القيمة الافتراضية: ${storeProvinceId}`);
          }
        } catch (storeError) {
          console.error('[FEES] خطأ أثناء محاولة جلب معلومات ولاية المتجر من قاعدة البيانات:', storeError);
        }
      }
    } else {
      console.log(`[FEES] استخدام ولاية المصدر المخصصة: ${storeProvinceId}`);
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
      console.log(`[FEES] استخدام قائمة الولايات المحددة: ${options.targetProvinceIds.join(', ')}`);
      
      const { data: targetProvinces, error: targetError } = await supabase
        .from('yalidine_provinces_global')
        .select('id, name')
        .in('id', options.targetProvinceIds);
      
      if (!targetError && targetProvinces && targetProvinces.length > 0) {
        provincesToProcess = targetProvinces;
        console.log(`[FEES] تم العثور على ${provincesToProcess.length} ولاية محددة`);
      } else {
        console.error('[FEES] خطأ أثناء جلب معلومات الولايات المحددة:', targetError);
      }
    }
    
  // إذا لم يتم العثور على ولايات محددة، استخدام جميع الولايات
    if (provincesToProcess.length === 0) {
      console.log('[FEES] جلب قائمة جميع الولايات من البيانات العالمية');
      const { data: allProvinces, error: provincesError } = await supabase
        .from('yalidine_provinces_global')
        .select('id, name');
      
      if (provincesError || !allProvinces || allProvinces.length === 0) {
        console.error('[FEES] خطأ أثناء جلب قائمة الولايات العالمية:', provincesError);
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
              console.log(`[FEES] إعادة محاولة الطلب (${retryCount}/3) بعد فشل الاتصال: ${error.message}`);
            }
          });
        } catch (e) {
          console.log('[FEES] حزمة axios-retry غير متاحة، سيتم استخدام الطلبات المباشرة بدون آلية إعادة المحاولة');
        }
      }
      
  return directApiClient;
}

// تغيير طريقة حذف الأسعار القديمة
async function deleteOldFeesForSourceWilaya(sourceWilayaId: number, organizationId: string): Promise<void> {
  console.log(`[FEES] حذف بيانات الأسعار القديمة من الولاية ${sourceWilayaId}`);
  
  try {
    // استخدام تنفيذ مباشر لضمان عدم تداخل العمليات
    const { error } = await supabase.rpc('delete_yalidine_fees_for_organization', {
      p_organization_id: organizationId,
      p_from_wilaya_id: Number(sourceWilayaId) // تحويل إلى رقم صريح
    });
    
    if (error) {
      console.error(`[FEES] خطأ في حذف بيانات الأسعار القديمة: ${error.message}`);
      
      // محاولة حذف بالطريقة البديلة
      const { error: deleteError } = await supabase
        .from('yalidine_fees')
        .delete()
        .eq('organization_id', organizationId)
        .eq('from_wilaya_id', sourceWilayaId);
      
      if (deleteError) {
        console.error(`[FEES] فشل الحذف البديل أيضاً: ${deleteError.message}`);
      } else {
        console.log(`[FEES] تم الحذف بنجاح باستخدام الطريقة البديلة`);
      }
    } else {
      console.log(`[FEES] تم حذف بيانات الأسعار القديمة بنجاح`);
    }
  } catch (e) {
    console.error(`[FEES] استثناء أثناء حذف الأسعار القديمة:`, e);
  }
}

// تبسيط دالة حفظ الرسوم
async function saveFees(fees: any[], organizationId: string): Promise<void> {
  if (fees.length === 0) {
    console.log('[FEES] لا توجد سجلات أسعار للحفظ');
    return;
  }
  
  console.log(`[FEES] حفظ ${fees.length} سجل أسعار في قاعدة البيانات`);
  
  // تجميع السجلات في دفعات للحفظ
  const batchSize = 100;
  const batches = [];
  
  for (let i = 0; i < fees.length; i += batchSize) {
    batches.push(fees.slice(i, i + batchSize));
  }
  
  console.log(`[FEES] تقسيم إلى ${batches.length} دفعة للحفظ (${batchSize} سجل لكل دفعة)`);
  
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
      
      console.log(`[FEES] استدعاء دالة simple_insert_yalidine_fees (${batch.length} سجل)`);
      console.log('[FEES] عينة من البيانات المرسلة:', JSON.stringify(preparedBatch[0]));
      
      // طريقة 1: استخدام الوظيفة المباشرة مع تحويل البيانات إلى سلسلة نصية
      const { data, error } = await supabase.rpc('simple_insert_yalidine_fees', {
        p_data: JSON.stringify(preparedBatch),
        p_organization_id: organizationId
      });

      const rpcInsertedCount = typeof data === 'number' ? data : -1; // Use -1 or another indicator if data isn't a number

      if (error || rpcInsertedCount === 0) {
        console.error(`[FEES] خطأ أو لم يتم إدراج سجلات باستخدام simple_insert_yalidine_fees. الخطأ: ${error ? error.message : 'N/A'}, عدد السجلات المدرجة: ${rpcInsertedCount}`);
        
        // طريقة 2: محاولة الإدخال المباشر
        console.log('[FEES] محاولة استخدام الإدخال المباشر...');
        
        // إدخال السجلات مباشرةً في جدول yalidine_fees
        const { error: insertError } = await supabase
          .from('yalidine_fees')
          .upsert(preparedBatch, {
            onConflict: 'organization_id,from_wilaya_id,to_wilaya_id,commune_id',
            ignoreDuplicates: false
          });
        
        if (insertError) {
          console.error(`[FEES] فشل أيضًا في الإدخال المباشر:`, insertError);
          
          // طريقة 3: إدخال كل سجل على حدة
          console.log('[FEES] محاولة إدخال السجلات واحدًا تلو الآخر...');
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
          
          console.log(`[FEES] تم إدخال ${successCount}/${preparedBatch.length} سجل بنجاح باستخدام الطريقة الفردية`);
        } else {
          console.log(`[FEES] تم حفظ ${preparedBatch.length} سجل بنجاح باستخدام الإدخال المباشر`);
        }
      } else {
        const insertedCount = typeof data === 'number' ? data : preparedBatch.length;
        console.log(`[FEES] تم حفظ ${insertedCount} سجل بنجاح باستخدام الدالة البسيطة`);
      }
    } catch (e) {
      console.error(`[FEES] استثناء أثناء حفظ الدفعة:`, e);
    }
    
    // إضافة تأخير بين الدفعات إذا كان هناك المزيد من الدفعات
    if (i < batches.length - 1) {
      const delay = 1000;
      console.log(`[FEES] انتظار ${delay}ms قبل معالجة الدفعة التالية`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
} 