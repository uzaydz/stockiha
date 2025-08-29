/**
 * API موحد مع منع التكرار للاستعلامات الشائعة
 */

import { supabase } from '@/lib/supabase-unified';
import { requestDeduplicator } from '@/lib/requestDeduplicator';
import type { Database } from '@/types/database.types';

type Tables = Database['public']['Tables'];
type OrganizationSettings = Tables['organization_settings']['Row'];
type User = Tables['users']['Row'];
type Organization = Tables['organizations']['Row'];
// type CallCenterAgent = Tables['call_center_agents']['Row']; // Table doesn't exist

/**
 * جلب إعدادات المؤسسة مع منع التكرار
 */
export async function getOrganizationSettings(
  organizationId: string,
  forceRefresh = false
): Promise<OrganizationSettings | null> {
  const key = `organization_settings:${organizationId}`;
  
  return requestDeduplicator.execute(
    key,
    async () => {
      
      const { data, error } = await supabase
        .from('organization_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle();
      
      if (error) {
        throw error;
      }
      
      return data;
    },
    {
      ttl: requestDeduplicator.getLongTTL(), // 15 دقيقة - البيانات مستقرة
      forceRefresh,
      useCache: true
    }
  );
}

/**
 * جلب اللغة الافتراضية للمؤسسة مع منع التكرار
 */
export async function getOrganizationDefaultLanguage(
  organizationId: string,
  forceRefresh = false
): Promise<string> {
  const key = `organization_default_language:${organizationId}`;
  
  return requestDeduplicator.execute(
    key,
    async () => {
      
      const { data, error } = await supabase
        .from('organization_settings')
        .select('default_language')
        .eq('organization_id', organizationId)
        .maybeSingle();
      
      if (error) {
        return 'ar'; // fallback
      }
      
      return data?.default_language || 'ar';
    },
    {
      ttl: requestDeduplicator.getLongTTL(), // 15 دقيقة
      forceRefresh,
      useCache: true
    }
  );
}

/**
 * جلب بيانات المستخدم مع منع التكرار
 */
export async function getUserById(
  userId: string,
  forceRefresh = false
): Promise<User | null> {
  const key = `user:${userId}`;
  
  return requestDeduplicator.execute(
    key,
    async () => {
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        throw error;
      }
      
      return data;
    },
    {
      ttl: requestDeduplicator.getShortTTL(), // 30 ثانية - البيانات متغيرة
      forceRefresh,
      useCache: true
    }
  );
}

/**
 * جلب بيانات المستخدم بواسطة auth_user_id مع منع التكرار
 */
export async function getUserByAuthId(
  authUserId: string,
  forceRefresh = false
): Promise<User | null> {
  const key = `user_by_auth:${authUserId}`;
  
  return requestDeduplicator.execute(
    key,
    async () => {
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUserId)
        .maybeSingle();
      
      if (error) {
        throw error;
      }
      
      return data;
    },
    {
      ttl: requestDeduplicator.getShortTTL(), // 30 ثانية
      forceRefresh,
      useCache: true
    }
  );
}

/**
 * جلب جميع المستخدمين للمؤسسة مع منع التكرار
 */
export async function getOrganizationUsers(
  organizationId: string,
  forceRefresh = false
): Promise<User[]> {
  const key = `organization_users:${organizationId}`;
  
  return requestDeduplicator.execute(
    key,
    async () => {
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('organization_id', organizationId);
      
      if (error) {
        throw error;
      }
      
      return data || [];
    },
    {
      ttl: requestDeduplicator.getShortTTL(), // 30 ثانية
      forceRefresh,
      useCache: true
    }
  );
}

/**
 * جلب بيانات المؤسسة مع منع التكرار
 */
export async function getOrganizationById(
  organizationId: string,
  forceRefresh = false
): Promise<Organization | null> {
  const key = `organization:${organizationId}`;
  
  return requestDeduplicator.execute(
    key,
    async () => {
      
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .maybeSingle();
      
      if (error) {
        throw error;
      }
      
      return data;
    },
    {
      ttl: requestDeduplicator.getLongTTL(), // 15 دقيقة - البيانات مستقرة
      forceRefresh,
      useCache: true
    }
  );
}

/**
 * جلب وكلاء مركز الاتصال للمؤسسة مع منع التكرار
 * Note: call_center_agents table doesn't exist, returning empty array
 */
export async function getCallCenterAgents(
  organizationId: string,
  forceRefresh = false
): Promise<any[]> {
  // Table doesn't exist, return empty array
  return [];
}

/**
 * جلب وكيل مركز الاتصال للمستخدم مع منع التكرار
 * Note: call_center_agents table doesn't exist, returning null
 */
export async function getCallCenterAgentByUserId(
  userId: string,
  forceRefresh = false
): Promise<any | null> {
  // Table doesn't exist, return null
  return null;
}

/**
 * مسح الكاش للمؤسسة
 */
export function clearOrganizationCache(organizationId: string): void {
  requestDeduplicator.clearCache(`organization:${organizationId}`);
  requestDeduplicator.clearCache(`organization_settings:${organizationId}`);
  requestDeduplicator.clearCache(`organization_default_language:${organizationId}`);
  requestDeduplicator.clearCache(`organization_users:${organizationId}`);
  // requestDeduplicator.clearCache(`call_center_agents:${organizationId}`); // Table doesn't exist
}

/**
 * مسح الكاش للمستخدم
 */
export function clearUserCache(userId: string, authUserId?: string): void {
  requestDeduplicator.clearCache(`user:${userId}`);
  if (authUserId) {
    requestDeduplicator.clearCache(`user_by_auth:${authUserId}`);
  }
  // requestDeduplicator.clearCache(`call_center_agent_user:${userId}`); // Table doesn't exist
}

/**
 * الحصول على إحصائيات الكاش
 */
export function getCacheStats() {
  return requestDeduplicator.getCacheStats();
}

/**
 * جلب بيانات المنتج الكاملة المحسنة مع منع التكرار
 * تستخدم الدالة الأصلية من productCompleteOptimized.ts
 */
export async function getProductCompleteDataOptimized(
  productIdentifier: string,
  options: {
    organizationId?: string;
    includeInactive?: boolean;
    dataScope?: 'full' | 'basic' | 'ultra';
    forceRefresh?: boolean;
  } = {},
  forceRefresh = false
): Promise<any> {
  const key = `product_complete_optimized:${productIdentifier}:${options.organizationId}:${options.dataScope}`;
  
  return requestDeduplicator.execute(
    key,
    async () => {
      
      // 🚀 تحسين: استخدام الدالة المحدثة لتحميل جميع صور الألوان
      const { getProductCompleteSmartColorLoading } = await import('./productCompleteOptimized');
      const result = await getProductCompleteSmartColorLoading(productIdentifier, {
        ...options,
        colorImagesStrategy: 'full' // جلب جميع صور الألوان دائماً
      });

      // 🚀 إضافة logging لتشخيص مشكلة صور الألوان
      if (result?.product?.variants?.colors) {
      }
      
      return result;
    },
    {
      ttl: requestDeduplicator.getLongTTL(), // 15 دقيقة - البيانات مستقرة نسبياً
      forceRefresh: options.forceRefresh || forceRefresh,
      useCache: true
    }
  );
}

/**
 * جلب بيانات تهيئة المتجر مع منع التكرار - محسن للسرعة
 */
export async function getStoreInitData(
  orgSubdomain: string,
  forceRefresh = false
): Promise<any> {
  const key = `store_init_data:${orgSubdomain}`;
  
  return requestDeduplicator.execute(
    key,
    async () => {
      const startTime = performance.now();
      
      // إضافة timeout محسّن (10 ثوان)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('RPC timeout after 10 seconds')), 10000)
      );
      
      const rpcPromise = supabase.rpc('get_store_init_data', {
        org_identifier: orgSubdomain
      });
      
      // استخدام Promise.race للتنافس بين RPC و timeout
      let data: any = null;
      let error: any = null;
      try {
        ({ data, error } = await Promise.race([rpcPromise, timeoutPromise]) as any);
      } catch (err: any) {
        error = err;
      }
      
      const executionTime = performance.now() - startTime;
      
      if (error) {
        // استخدام fallback المبني على REST في حال فشل RPC
        const fallback = await getStoreInitDataFallback(orgSubdomain);
        return fallback;
      }
      
      return data;
    },
    {
      ttl: requestDeduplicator.getLongTTL(), // 15 دقيقة - البيانات مستقرة
      forceRefresh,
      useCache: true
    }
  );
}

/**
 * مسح الكاش للمنتج
 */
export function clearProductCache(productIdentifier: string): void {
  // مسح جميع الكاش المرتبط بالمنتج
  const keys = [
    `product_complete_optimized:${productIdentifier}`,
    `product:${productIdentifier}`
  ];
  
  keys.forEach(keyPrefix => {
    requestDeduplicator.clearCache(keyPrefix);
  });
  
}

/**
 * مسح الكاش للمتجر
 */
export function clearStoreCache(orgSubdomain: string): void {
  requestDeduplicator.clearCache(`store_init_data:${orgSubdomain}`);
}

/**
 * مسح جميع الكاش
 */
export function clearAllCache(): void {
  requestDeduplicator.clearAllCache();
}

// Fallback: بناء بيانات المتجر عبر REST بدلاً من RPC
async function getStoreInitDataFallback(orgIdentifier: string): Promise<any> {
  try {

    // تحديد المؤسسة عبر السابدومين أولاً، ثم الدومين كاحتياط
    let organization: any = null;
    {
      const { data: orgBySub, error: orgBySubErr } = await supabase
        .from('organizations')
        .select('*')
        .eq('subdomain', orgIdentifier)
        .eq('subscription_status', 'active')
        .maybeSingle();

      if (orgBySubErr) {
        // تجاهل الخطأ وحاول عبر الدومين
      }

      if (orgBySub) {
        organization = orgBySub;
      } else {
        const { data: orgByDomain } = await supabase
          .from('organizations')
          .select('*')
          .eq('domain', orgIdentifier)
          .eq('subscription_status', 'active')
          .maybeSingle();
        if (orgByDomain) organization = orgByDomain;
      }
    }

    if (!organization) {
      throw new Error('Organization not found for identifier: ' + orgIdentifier);
    }

    const organizationId = organization.id as string;

    // جلب البيانات الأساسية بالتوازي
    const [settingsRes, categoriesRes, featuredRes] = await Promise.all([
      supabase
        .from('organization_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle(),
      supabase
        .from('product_categories')
        .select('id, name, slug, image_url, is_active')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('name', { ascending: true })
        .limit(100),
      supabase
        .from('products')
        .select(`
          id, name, description, price, compare_at_price,
          thumbnail_image, images, stock_quantity,
          is_featured, is_new, category_id, slug,
          category:category_id(id, name, slug),
          subcategory:subcategory_id(id, name, slug)
        `)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .eq('is_featured', true)
        .order('created_at', { ascending: false })
        .limit(50)
    ]);

    const fallbackData = {
      organization_details: organization,
      organization_settings: settingsRes.data || null,
      categories: categoriesRes.data || [],
      featured_products: featuredRes.data || [],
      store_layout_components: [],
      footer_settings: null,
      testimonials: [],
      seo_meta: null,
      cacheTimestamp: new Date().toISOString()
    };

    return fallbackData;
  } catch (err) {
    throw err;
  }
}

// دالة fallback لجلب البيانات الأساسية من جدول products
async function getBasicProductDataFallback(productIdentifier: string, organizationId?: string): Promise<any> {
  try {
    
    // البحث عن المنتج في جدول products
    let query = supabase
      .from('products')
      .select(`
        *,
        category:product_categories(id, name, slug),
        subcategory:product_subcategories(id, name, slug),
        product_colors(*, product_sizes(*))
      `)
      .eq('is_active', true);
    
    // إذا كان slug، استخدم organization_id
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }
    
    // البحث بـ slug أو ID
    if (productIdentifier.length === 36 && productIdentifier.includes('-')) {
      query = query.eq('id', productIdentifier);
    } else {
      query = query.eq('slug', productIdentifier);
    }
    
    const { data: products, error } = await query.single();
    
    if (error || !products) {
      throw new Error('المنتج غير موجود');
    }
    
    // تحويل البيانات إلى النوع المطلوب
    const basicResponse = {
      success: true,
      data_scope: 'basic',
      product: products,
      stats: null,
      meta: {
        query_timestamp: new Date().toISOString(),
        data_freshness: 'fallback',
        performance_optimized: false,
        organization_id: organizationId || '',
        form_strategy: 'default_form_used'
      }
    };
    
    return basicResponse;
    
  } catch (error) {
    throw error;
  }
}
