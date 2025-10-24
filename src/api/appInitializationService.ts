/**
 * ============================================================================
 * خدمة تهيئة التطبيق الموحدة
 * ============================================================================
 * تستخدم RPC واحد لجلب كل البيانات المطلوبة عند بدء التطبيق
 * تقلل الاستدعاءات من 8 إلى 1 فقط
 * ============================================================================
 */

import { supabase } from '@/lib/supabase-unified';
import { deduplicateRequest } from '@/lib/cache/deduplication';
import localforage from 'localforage';

// ============================================================================
// واجهات البيانات
// ============================================================================

export interface UserWithPermissions {
  id: string;
  auth_user_id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  organization_id: string;
  is_active: boolean;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  permissions: string[];
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  address?: string;
  logo_url?: string;
  is_active: boolean;
  subscription_plan?: string;
  subscription_status?: string;
  trial_ends_at?: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationSettings {
  id: string;
  organization_id: string;
  currency?: string;
  timezone?: string;
  language?: string;
  tax_rate?: number;
  enable_inventory?: boolean;
  enable_pos?: boolean;
  enable_online_store?: boolean;
  created_at: string;
  updated_at: string;
}

export interface POSSettings {
  id: string;
  organization_id: string;
  enable_barcode_scanner?: boolean;
  enable_receipt_printer?: boolean;
  default_payment_method?: string;
  auto_print_receipt?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  organization_id: string;
  is_active: boolean;
  created_at: string;
}

export interface Subcategory {
  id: string;
  name: string;
  slug: string;
  category_id: string;
  organization_id: string;
  is_active: boolean;
  created_at: string;
}

export interface Employee {
  id: string;
  auth_user_id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  avatar_url?: string;
}

export interface ConfirmationAgent {
  id: string;
  user_id: string;
  agent_type: string;
  agent_data: any;
  is_active: boolean;
  created_at: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface AppInitializationData {
  user: UserWithPermissions;
  organization: Organization;
  organization_settings: OrganizationSettings | null;
  pos_settings: POSSettings | null;
  categories: Category[];
  subcategories: Subcategory[];
  employees: Employee[];
  confirmation_agents: ConfirmationAgent[];
  expense_categories: ExpenseCategory[];
  timestamp: number;
}

// ============================================================================
// Cache للبيانات
// ============================================================================

interface CachedData {
  data: AppInitializationData;
  timestamp: number;
}

const cache = new Map<string, CachedData>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق

// Offline persistent cache (IndexedDB via localforage)
const appInitOfflineCache = localforage.createInstance({
  name: 'bazaar-pos',
  storeName: 'app-init-cache'
});

const buildOfflineKey = (userId?: string, organizationId?: string) =>
  `app-init:${userId || 'current'}:${organizationId || 'default'}`;

/**
 * مسح الـ cache
 */
export const clearAppInitializationCache = () => {
  cache.clear();
  console.log('🗑️ [AppInitialization] تم مسح الـ cache');
};

/**
 * الحصول على البيانات من الـ cache
 */
const getCachedData = (userId: string): AppInitializationData | null => {
  const cached = cache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('✅ [AppInitialization] استخدام البيانات من الـ cache');
    return cached.data;
  }
  return null;
};

/**
 * حفظ البيانات في الـ cache
 */
const setCachedData = (userId: string, data: AppInitializationData) => {
  cache.set(userId, {
    data,
    timestamp: Date.now()
  });
};

// ============================================================================
// الدالة الرئيسية
// ============================================================================

/**
 * جلب كل بيانات تهيئة التطبيق في استدعاء واحد
 * 
 * @param userId - معرف المستخدم (اختياري - يستخدم المستخدم الحالي افتراضياً)
 * @param organizationId - معرف المؤسسة (اختياري)
 * @param forceRefresh - إجبار تحديث البيانات وتجاهل الـ cache
 * @returns بيانات تهيئة التطبيق الكاملة
 */
export const getAppInitializationData = async (
  userId?: string,
  organizationId?: string,
  forceRefresh: boolean = false
): Promise<AppInitializationData> => {
  const startTime = performance.now();
  
  try {
    // 1️⃣ محاولة الحصول على البيانات من الـ cache
    if (!forceRefresh && userId) {
      const cachedData = getCachedData(userId);
      if (cachedData) {
        const duration = performance.now() - startTime;
        console.log(`⚡ [AppInitialization] تم جلب البيانات من الـ cache في ${duration.toFixed(2)}ms`);
        return cachedData;
      }
    }

    // 2️⃣ جلب البيانات من قاعدة البيانات باستخدام RPC موحد
    console.log('🚀 [AppInitialization] بدء جلب البيانات من قاعدة البيانات...');
    
    const { data, error } = await deduplicateRequest(
      `app-init-${userId || 'current'}-${organizationId || 'default'}`,
      async () => {
        return await (supabase.rpc as any)('get_app_initialization_data', {
          p_user_id: userId || null,
          p_organization_id: organizationId || null
        });
      }
    );

    if (error) {
      console.error('❌ [AppInitialization] خطأ في جلب البيانات:', error);
      throw error;
    }

    if (!data) {
      throw new Error('لم يتم العثور على بيانات');
    }

    // 3️⃣ تحويل البيانات إلى الصيغة المطلوبة
    const appData: AppInitializationData = typeof data === 'string' 
      ? JSON.parse(data) 
      : data;

    // 4️⃣ حفظ البيانات في الـ cache
    if (appData.user?.auth_user_id) {
      setCachedData(appData.user.auth_user_id, appData);
    }

    // 4.1️⃣ حفظ نسخة للأوفلاين في IndexedDB
    try {
      await appInitOfflineCache.setItem(
        buildOfflineKey(appData.user?.auth_user_id || userId, organizationId),
        appData
      );
    } catch {}

    const duration = performance.now() - startTime;
    console.log(`✅ [AppInitialization] تم جلب البيانات بنجاح في ${duration.toFixed(2)}ms`);
    console.log('📊 [AppInitialization] إحصائيات البيانات:', {
      categories: appData.categories?.length || 0,
      subcategories: appData.subcategories?.length || 0,
      employees: appData.employees?.length || 0,
      confirmationAgents: appData.confirmation_agents?.length || 0,
      hasOrganizationSettings: !!appData.organization_settings,
      hasPOSSettings: !!appData.pos_settings
    });

    return appData;

  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(`❌ [AppInitialization] فشل جلب البيانات بعد ${duration.toFixed(2)}ms:`, error);

    // ✅ Offline fallback: حاول إرجاع النسخة الأخيرة المخزنة عند انقطاع الشبكة
    try {
      const msg = (error as any)?.message ? String((error as any).message).toLowerCase() : '';
      const looksLikeNetwork =
        msg.includes('network disconnected') ||
        msg.includes('failed to fetch') ||
        msg.includes('network error') ||
        msg.includes('timeout') ||
        msg.includes('offline');

      if (looksLikeNetwork) {
        const offline = await appInitOfflineCache.getItem<AppInitializationData>(
          buildOfflineKey(userId, organizationId)
        );
        if (offline) {
          console.warn('⚠️ [AppInitialization] استخدام نسخة الأوفلاين من IndexedDB بسبب انقطاع الشبكة');
          return offline;
        }
      }
    } catch {}

    throw error;
  }
};

/**
 * جلب بيانات تهيئة التطبيق مع إعادة المحاولة
 */
export const getAppInitializationDataWithRetry = async (
  userId?: string,
  organizationId?: string,
  maxRetries: number = 3
): Promise<AppInitializationData> => {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 [AppInitialization] محاولة ${attempt}/${maxRetries}`);
      return await getAppInitializationData(userId, organizationId, attempt > 1);
    } catch (error) {
      lastError = error as Error;
      console.warn(`⚠️ [AppInitialization] فشلت المحاولة ${attempt}/${maxRetries}:`, error);
      
      if (attempt < maxRetries) {
        // انتظار قبل إعادة المحاولة (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`⏳ [AppInitialization] انتظار ${delay}ms قبل إعادة المحاولة...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('فشل جلب بيانات التطبيق بعد عدة محاولات');
};

/**
 * تحديث جزء معين من البيانات في الـ cache
 */
export const updateCachedData = (
  userId: string,
  updates: Partial<AppInitializationData>
) => {
  const cached = cache.get(userId);
  if (cached) {
    cached.data = {
      ...cached.data,
      ...updates
    };
    cached.timestamp = Date.now();
    console.log('🔄 [AppInitialization] تم تحديث الـ cache');
  }
};

/**
 * إعادة تحميل البيانات وتحديث الـ cache
 */
export const refreshAppInitializationData = async (
  userId?: string,
  organizationId?: string
): Promise<AppInitializationData> => {
  console.log('🔄 [AppInitialization] إعادة تحميل البيانات...');
  return await getAppInitializationData(userId, organizationId, true);
};
