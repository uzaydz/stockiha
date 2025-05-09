import { getFullStoreData, StoreData } from '@/api/store';
import { withCache, getCacheData, setCacheData, clearCacheItem } from '@/lib/cache/storeCache';

// زيادة مدة التخزين المؤقت للبيانات الأساسية
const STORE_DATA_CACHE_TTL = 30 * 60 * 1000; // 30 دقيقة

// حالة التحميل والبيانات المؤقتة لتسريع الواجهة
let isDataLoading = false;
let lastLoadedSubdomain: string | null = null;
let lastLoadedData: StoreData | null = null;
let pendingPromise: Promise<{ data: StoreData | null; isLoading: boolean }> | null = null;

/**
 * جلب كافة بيانات المتجر دفعة واحدة بطريقة فعالة
 * مع الإستفادة من التخزين المؤقت لتحسين الأداء
 */
export async function getStoreDataFast(subdomain: string): Promise<{
  data: StoreData | null;
  isLoading: boolean;
}> {
  // If there's already a pending request for this subdomain, return that promise
  // to prevent duplicate requests
  if (pendingPromise && lastLoadedSubdomain === subdomain) {
    console.log('[StoreDataService] Reusing pending request for:', subdomain);
    return pendingPromise;
  }

  // التحقق من وجود بيانات متاحة مباشرة من الذاكرة
  if (lastLoadedSubdomain === subdomain && lastLoadedData) {
    console.log('[StoreDataService] تم استخدام البيانات المخزنة في الذاكرة');
    return { data: lastLoadedData, isLoading: isDataLoading };
  }
  
  // Create a new promise for this request
  pendingPromise = (async () => {
    try {
      // البحث عن البيانات في التخزين المؤقت أولاً
      const cacheKey = `store_data:${subdomain}`;
      const cachedData = await getCacheData<StoreData>(cacheKey, STORE_DATA_CACHE_TTL);
      
      if (cachedData) {
        console.log('[StoreDataService] تم استخدام البيانات المخزنة مؤقتاً');
        
        // تحديث البيانات في الذاكرة
        lastLoadedSubdomain = subdomain;
        lastLoadedData = cachedData;
        
        // بدء تحديث البيانات في الخلفية دون انتظار استكمال العملية
        refreshDataInBackground(subdomain);
        
        return { data: cachedData, isLoading: false };
      }
      
      // إذا لم توجد بيانات في الذاكرة أو التخزين المؤقت، نقوم بتحميلها
      try {
        isDataLoading = true;
        
        console.log('[StoreDataService] جلب بيانات جديدة للمتجر...');
        const freshData = await getFullStoreData(subdomain);
        
        if (freshData) {
          // تحديث البيانات في الذاكرة
          lastLoadedSubdomain = subdomain;
          lastLoadedData = freshData;
          
          // تخزين البيانات مؤقتاً
          await setCacheData(cacheKey, freshData);
          
          return { data: freshData, isLoading: false };
        }
        
        console.error('[StoreDataService] لم يتم العثور على بيانات للمتجر');
        return { data: null, isLoading: false };
      } catch (error) {
        console.error('[StoreDataService] خطأ في جلب بيانات المتجر:', error);
        return { data: null, isLoading: false };
      } finally {
        isDataLoading = false;
      }
    } finally {
      // Clear the pending promise once completed
      pendingPromise = null;
    }
  })();
  
  return pendingPromise;
}

/**
 * تحديث البيانات في الخلفية دون التأثير على تجربة المستخدم
 */
async function refreshDataInBackground(subdomain: string): Promise<void> {
  // تجنب التحديثات المتزامنة
  if (isDataLoading) return;
  
  try {
    isDataLoading = true;
    
    console.log('[StoreDataService] تحديث البيانات في الخلفية...');
    const freshData = await getFullStoreData(subdomain);
    
    if (freshData) {
      // تحديث البيانات في الذاكرة
      lastLoadedSubdomain = subdomain;
      lastLoadedData = freshData;
      
      // تحديث البيانات في التخزين المؤقت
      const cacheKey = `store_data:${subdomain}`;
      await setCacheData(cacheKey, freshData);
      
      console.log('[StoreDataService] تم تحديث البيانات بنجاح في الخلفية');
    }
  } catch (error) {
    console.error('[StoreDataService] خطأ في تحديث البيانات في الخلفية:', error);
  } finally {
    isDataLoading = false;
  }
}

/**
 * مسح التخزين المؤقت للمتجر
 * يستخدم بعد التحديثات المهمة في بيانات المتجر
 */
export async function clearStoreCache(subdomain: string): Promise<void> {
  const cacheKey = `store_data:${subdomain}`;
  await clearCacheItem(cacheKey);
  
  // إذا كانت البيانات المخزنة في الذاكرة تخص نفس المتجر، نقوم بمسحها
  if (lastLoadedSubdomain === subdomain) {
    lastLoadedData = null;
    lastLoadedSubdomain = null;
  }
  
  console.log('[StoreDataService] تم مسح التخزين المؤقت للمتجر');
}

export default {
  getStoreDataFast,
  clearStoreCache
}; 