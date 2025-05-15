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
    
    return pendingPromise;
  }

  // التحقق من وجود بيانات متاحة مباشرة من الذاكرة
  if (lastLoadedSubdomain === subdomain && lastLoadedData) {
    
    return { data: lastLoadedData, isLoading: isDataLoading };
  }
  
  // Create a new promise for this request
  pendingPromise = (async () => {
    try {
      // البحث عن البيانات في التخزين المؤقت أولاً
      const cacheKey = `store_data:${subdomain}`;
      const cachedData = await getCacheData<StoreData>(cacheKey, STORE_DATA_CACHE_TTL);
      
      if (cachedData) {
        
        
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
    
    
    const freshData = await getFullStoreData(subdomain);
    
    if (freshData) {
      // تحديث البيانات في الذاكرة
      lastLoadedSubdomain = subdomain;
      lastLoadedData = freshData;
      
      // تحديث البيانات في التخزين المؤقت
      const cacheKey = `store_data:${subdomain}`;
      await setCacheData(cacheKey, freshData);
      
      
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
  
  
}

/**
 * إعادة تحميل بيانات المتجر بشكل كامل وتجاوز التخزين المؤقت
 * يستخدم في حالات تحديث أو وجود مشاكل في البيانات
 */
export async function forceReloadStoreData(subdomain: string): Promise<{
  data: StoreData | null;
  isLoading: boolean;
}> {
  
  
  try {
    isDataLoading = true;
    
    // مسح التخزين المؤقت أولاً
    const cacheKey = `store_data:${subdomain}`;
    await clearCacheItem(cacheKey);
    
    // إعادة تعيين البيانات المخزنة في الذاكرة
    lastLoadedSubdomain = null;
    lastLoadedData = null;
    
    // تحميل البيانات مباشرة
    const freshData = await getFullStoreData(subdomain);
    
    if (freshData) {
      // تحديث البيانات في الذاكرة
      lastLoadedSubdomain = subdomain;
      lastLoadedData = freshData;
      
      // تخزين البيانات مؤقتاً
      await setCacheData(cacheKey, freshData);
      
      
      return { data: freshData, isLoading: false };
    }
    
    console.error('[StoreDataService] فشل في إعادة تحميل بيانات المتجر');
    return { data: null, isLoading: false };
  } catch (error) {
    console.error('[StoreDataService] خطأ في إعادة تحميل بيانات المتجر:', error);
    return { data: null, isLoading: false };
  } finally {
    isDataLoading = false;
  }
}

export default {
  getStoreDataFast,
  clearStoreCache,
  forceReloadStoreData
}; 