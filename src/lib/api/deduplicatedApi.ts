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
  // اعتمد على نفس كاش الإعدادات لتجنب ضربة ثانية
  const settings = await getOrganizationSettings(organizationId, forceRefresh);
  return (settings as any)?.default_language || 'ar';
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
 * جلب بيانات المؤسسة حسب النطاق الفرعي مع منع التكرار
 */
export async function getOrganizationBySubdomain(
  subdomain: string,
  forceRefresh = false
): Promise<Organization | null> {
  const cleanSubdomain = (subdomain || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');

  if (!cleanSubdomain) return null;

  const key = `organization_subdomain:${cleanSubdomain}`;
  return requestDeduplicator.execute(
    key,
    async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('subdomain', cleanSubdomain)
        .maybeSingle();

      if (error) {
        throw error;
      }
      return data;
    },
    {
      ttl: requestDeduplicator.getLongTTL(),
      forceRefresh,
      useCache: true
    }
  );
}

/**
 * جلب بيانات المؤسسة حسب النطاق الرئيسي مع منع التكرار
 */
export async function getOrganizationByDomain(
  domain: string,
  forceRefresh = false
): Promise<Organization | null> {
  if (!domain) return null;

  let cleanDomain = domain.toLowerCase();
  cleanDomain = cleanDomain.replace(/^https?:\/\//i, '');
  if (cleanDomain.startsWith('www.')) cleanDomain = cleanDomain.substring(4);
  cleanDomain = cleanDomain.split(':')[0].split('/')[0];
  if (!cleanDomain) return null;

  const key = `organization_domain:${cleanDomain}`;
  return requestDeduplicator.execute(
    key,
    async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('domain', cleanDomain)
        .maybeSingle();
      if (error) {
        throw error;
      }
      return data;
    },
    {
      ttl: requestDeduplicator.getLongTTL(),
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
 * تستخدم الدالة الأصلية من productCompleteOptimized.ts مباشرة
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
      // استخدام الدالة المحسنة مباشرة عبر Supabase client
      const { getProductCompleteSmartColorLoading } = await import('./productCompleteOptimized');
      return await getProductCompleteSmartColorLoading(productIdentifier, {
        ...options,
        colorImagesStrategy: 'thumbnails'
      });
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

      try {
        // استخدام الـ RPC مباشرة عبر Supabase client
        const { data, error } = await supabase.rpc('get_store_init_data', { org_identifier: orgSubdomain });

        if (error) {
          console.warn('RPC get_store_init_data failed, using fallback:', error);
          // في حالة فشل الـ RPC، استخدم fallback
          const fallback = await getStoreInitDataFallback(orgSubdomain);
          return fallback;
        }

        return data;
      } catch (error) {
        console.error('Error in getStoreInitData:', error);
        // في حالة أي خطأ، استخدم fallback
        const fallback = await getStoreInitDataFallback(orgSubdomain);
        return fallback;
      }
    },
    {
      ttl: requestDeduplicator.getLongTTL(), // 15 دقيقة - البيانات مستقرة
      forceRefresh,
      useCache: true,
      // إضافة timeout لمنع التعليق
      timeout: 10000 // 10 ثوان
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
    const [settingsRes, categoriesRes, featuredRes, productsFirstRes] = await Promise.all([
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
        .limit(50),
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
        .order('created_at', { ascending: false })
        .limit(48)
    ]);

    const fallbackData = {
      organization_details: organization,
      organization_settings: settingsRes.data || null,
      categories: categoriesRes.data || [],
      featured_products: featuredRes.data || [],
      products_first_page: productsFirstRes.data || [],
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
