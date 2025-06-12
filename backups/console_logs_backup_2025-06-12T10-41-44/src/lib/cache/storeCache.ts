// نظام التخزين المؤقت المحسن للمتجر
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface StoreCacheDB extends DBSchema {
  storeData: {
    key: string;
    value: {
      data: any;
      timestamp: number;
      ttl: number;
    };
  };
  storeImages: {
    key: string;
    value: {
      blob: Blob;
      timestamp: number;
      ttl: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<StoreCacheDB>>;
let pendingQueries: Record<string, Promise<any>> = {};

// تهيئة قاعدة البيانات
const initDB = async (): Promise<IDBPDatabase<StoreCacheDB>> => {
  if (!dbPromise) {
    dbPromise = openDB<StoreCacheDB>('storeCache', 2, {
      upgrade(db, oldVersion, newVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('storeData');
        }
        if (oldVersion < 2) {
          db.createObjectStore('storeImages');
        }
      },
    });
  }
  return dbPromise;
};

// تنظيف البيانات المنتهية الصلاحية
const cleanupExpiredData = async (db: IDBPDatabase<StoreCacheDB>) => {
  const now = Date.now();
  
  // تنظيف بيانات المتجر
  const storeDataKeys = await db.getAllKeys('storeData');
  for (const key of storeDataKeys) {
    const item = await db.get('storeData', key);
    if (item && (now - item.timestamp) > item.ttl) {
      await db.delete('storeData', key);
    }
  }
  
  // تنظيف الصور
  const imageKeys = await db.getAllKeys('storeImages');
  for (const key of imageKeys) {
    const item = await db.get('storeImages', key);
    if (item && (now - item.timestamp) > item.ttl) {
      await db.delete('storeImages', key);
    }
  }
};

// دالة محسنة لحفظ البيانات
export async function setCacheData(key: string, data: any, ttl: number = 15 * 60 * 1000): Promise<void> {
  try {
    const db = await initDB();
    
    // تنظيف البيانات المنتهية أحياناً
    if (Math.random() < 0.1) {
      cleanupExpiredData(db);
    }
    
    await db.put('storeData', {
      data,
      timestamp: Date.now(),
      ttl
    }, key);
    
  } catch (error) {
    // fallback إلى localStorage
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify({
        data,
        timestamp: Date.now(),
        ttl
      }));
    } catch (fallbackError) {
    }
  }
}

// دالة محسنة لاسترجاع البيانات
export async function getCacheData(key: string): Promise<any | null> {
  try {
    const db = await initDB();
    const item = await db.get('storeData', key);
    
    if (!item) {
      // محاولة استرجاع من localStorage كـ fallback
      const fallbackData = localStorage.getItem(`cache_${key}`);
      if (fallbackData) {
        const parsed = JSON.parse(fallbackData);
        if ((Date.now() - parsed.timestamp) < parsed.ttl) {
          return parsed.data;
        } else {
          localStorage.removeItem(`cache_${key}`);
        }
      }
      return null;
    }
    
    // التحقق من انتهاء صلاحية البيانات
    if ((Date.now() - item.timestamp) > item.ttl) {
      await db.delete('storeData', key);
      return null;
    }
    
    return item.data;
  } catch (error) {
    return null;
  }
}

// دالة لحذف عنصر محدد من Cache
export async function clearCacheItem(key: string): Promise<void> {
  try {
    const db = await initDB();
    await db.delete('storeData', key);
    localStorage.removeItem(`cache_${key}`);
  } catch (error) {
  }
}

// دالة لحذف جميع البيانات
export async function clearAllCache(): Promise<void> {
  try {
    const db = await initDB();
    await db.clear('storeData');
    await db.clear('storeImages');
    
    // تنظيف localStorage أيضاً
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('cache_')) {
        localStorage.removeItem(key);
      }
    });
    
  } catch (error) {
  }
}

// دالة محسنة لcache الصور
export async function cacheImage(url: string, ttl: number = 60 * 60 * 1000): Promise<string | null> {
  try {
    const db = await initDB();
    const cached = await db.get('storeImages', url);
    
    // التحقق من وجود الصورة في Cache
    if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
      return URL.createObjectURL(cached.blob);
    }
    
    // تحميل الصورة
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const blob = await response.blob();
    
    // حفظ في Cache
    await db.put('storeImages', {
      blob,
      timestamp: Date.now(),
      ttl
    }, url);
    
    return URL.createObjectURL(blob);
  } catch (error) {
    return null;
  }
}

// دالة للحصول على حجم Cache
export async function getCacheSize(): Promise<{storeData: number, images: number, total: number}> {
  try {
    const db = await initDB();
    const storeDataCount = await db.count('storeData');
    const imagesCount = await db.count('storeImages');
    
    return {
      storeData: storeDataCount,
      images: imagesCount,
      total: storeDataCount + imagesCount
    };
  } catch (error) {
    return { storeData: 0, images: 0, total: 0 };
  }
}

// دالة withCache للتوافق مع الكود الموجود
export async function withCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = 15 * 60 * 1000
): Promise<T> {
  // محاولة الحصول على البيانات من التخزين المؤقت
  const cachedData = await getCacheData(key);
  
  // إذا وجدت البيانات في التخزين المؤقت، أعد استخدامها
  if (cachedData !== null) {
    return cachedData;
  }
  
  // التحقق من وجود استعلام مماثل قيد التنفيذ
  if (pendingQueries[key]) {
    try {
      return await pendingQueries[key];
    } catch (error) {
      delete pendingQueries[key];
    }
  }
  
  // إنشاء وعد جديد للاستعلام
  const fetchPromise = fetchFn();
  pendingQueries[key] = fetchPromise;
  
  try {
    const newData = await fetchPromise;
    
    // تخزين البيانات الجديدة في التخزين المؤقت
    if (newData !== null && typeof newData !== 'undefined') {
      await setCacheData(key, newData, ttl);
    }
    
    return newData;
  } finally {
    delete pendingQueries[key];
  }
}

// دالة للحصول على النطاق الفرعي من معرف المؤسسة
export async function getSubdomainFromOrganizationId(organizationId: string): Promise<string | null> {
  if (!organizationId) return null;
  
  try {
    // استخدام cache بسيط للsubdomain
    const cached = await getCacheData(`org_subdomain:${organizationId}`);
    if (cached) return cached;
    
    // استيراد supabase محلياً لتجنب مشاكل الاستيراد
    const { supabase } = await import('@/lib/supabase');
    
    const { data, error } = await supabase
      .from('organizations')
      .select('subdomain')
      .eq('id', organizationId)
      .single();
    
    if (error || !data?.subdomain) {
      return null;
    }
    
    // حفظ في cache لمدة ساعة
    await setCacheData(`org_subdomain:${organizationId}`, data.subdomain, 60 * 60 * 1000);
    return data.subdomain;
  } catch (error) {
    return null;
  }
}

// دالة لمسح cache المتجر باستخدام معرف المؤسسة
export async function clearStoreCacheByOrganizationId(organizationId: string): Promise<void> {
  try {
    const subdomain = await getSubdomainFromOrganizationId(organizationId);
    if (subdomain) {
      // مسح جميع البيانات المتعلقة بهذا المتجر
      await clearCacheItem(`store_basic_${subdomain}`);
      await clearCacheItem(`store_init_data:${subdomain}`);
      await clearCacheItem(`store_data:${subdomain}`);
      await clearCacheItem(`categories:${organizationId}`);
      await clearCacheItem(`products:${organizationId}`);
      await clearCacheItem(`shipping:${organizationId}`);
      await clearCacheItem(`org_subdomain:${organizationId}`);
      
    }
  } catch (error) {
  }
}

// متغيرات للتوافق مع الكود الموجود
export const DEFAULT_CACHE_TTL = 15 * 60 * 1000; // 15 دقيقة
export const LONG_CACHE_TTL = 60 * 60 * 1000; // ساعة واحدة  
export const SHORT_CACHE_TTL = 5 * 60 * 1000; // 5 دقائق
