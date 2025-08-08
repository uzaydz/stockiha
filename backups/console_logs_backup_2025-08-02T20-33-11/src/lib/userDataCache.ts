import { supabase } from '@/lib/supabase';

interface UserDataCache {
  [userId: string]: {
    data: any;
    timestamp: number;
  };
}

const userCache: UserDataCache = {};
const CACHE_DURATION = 10 * 60 * 1000; // 10 دقائق

// مفتاح موحد لتجنب الاستدعاءات المتزامنة
const fetchingMap = new Map<string, Promise<any>>();

export const getCachedUserData = async (userId: string): Promise<any> => {
  if (!userId) return null;

  // تحقق من الـ cache أولاً
  const cached = userCache[userId];
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`✅ استخدام بيانات المستخدم من الـ cache: ${userId}`);
    return cached.data;
  }

  // تحقق من وجود استدعاء قيد التنفيذ
  if (fetchingMap.has(userId)) {
    console.log(`⏳ انتظار استدعاء قيد التنفيذ للمستخدم: ${userId}`);
    return fetchingMap.get(userId);
  }

  // إنشاء استدعاء جديد
  const fetchPromise = (async () => {
    try {
      console.log(`🔄 جلب بيانات المستخدم: ${userId}`);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      // حفظ في الـ cache
      userCache[userId] = {
        data,
        timestamp: Date.now()
      };

      return data;
    } finally {
      // إزالة من خريطة الاستدعاءات
      fetchingMap.delete(userId);
    }
  })();

  // حفظ الـ promise في الخريطة
  fetchingMap.set(userId, fetchPromise);

  return fetchPromise;
};

// دالة لمسح الـ cache عند الحاجة
export const clearUserCache = (userId?: string) => {
  if (userId) {
    delete userCache[userId];
  } else {
    // مسح كل الـ cache
    Object.keys(userCache).forEach(key => delete userCache[key]);
  }
};

// دالة لتحديث بيانات المستخدم في الـ cache
export const updateUserCache = (userId: string, userData: any) => {
  userCache[userId] = {
    data: userData,
    timestamp: Date.now()
  };
}; 