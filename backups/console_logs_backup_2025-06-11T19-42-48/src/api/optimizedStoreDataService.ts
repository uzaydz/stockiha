import { supabase } from '@/lib/supabase';
import { getCacheData, setCacheData, clearCacheItem } from '@/lib/cache/storeCache';
import type { StoreInitializationData, Product } from './storeDataService';

// إعادة تصدير الأنواع المهمة
export type { StoreInitializationData, Product } from './storeDataService';

// =================================================================
// خدمة محسنة ومبسطة لجلب البيانات
// =================================================================

const CACHE_TTL = 15 * 60 * 1000; // 15 دقيقة

// =================================================================
// 1. جلب البيانات الأساسية فقط (سريع)
// =================================================================
export async function getStoreBasicDataOptimized(subdomain: string): Promise<{
  data: StoreInitializationData | null;
  isLoading: boolean;
}> {
  const cacheKey = `store_basic_${subdomain}`;
  
  try {
    // التحقق من الكاش أولاً
    const cachedData = await getCacheData(cacheKey);
    if (cachedData) {
      return { data: cachedData, isLoading: false };
    }

    // جلب البيانات الأساسية من قاعدة البيانات
    const { data, error } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        description,
        logo_url,
        subdomain,
        domain,
        settings,
        organization_settings!inner (
          id,
          site_name,
          theme_primary_color,
          theme_secondary_color,
          theme_mode,
          custom_css,
          enable_public_site,
          maintenance_mode
        )
      `)
      .eq('subdomain', subdomain)
      .single();

    if (error || !data) {
      const errorData: StoreInitializationData = {
        organization_details: null, 
        organization_settings: null, 
        categories: [], 
        subcategories: [], 
        featured_products: [], 
        shipping_info: null,
        store_layout_components: [],
        error: error?.message || 'المتجر غير موجود' 
      };
      
      return { 
        data: errorData, 
        isLoading: false 
      };
    }

    const processedData: StoreInitializationData = {
      organization_details: {
        id: data.id,
        name: data.name,
        description: data.description,
        logo_url: data.logo_url,
        subdomain: data.subdomain,
        domain: data.domain,
        contact_email: (data.settings as any)?.contact_email || null,
        created_at: null,
        updated_at: null,
        currency: null,
        language: (data.settings as any)?.language || null,
        default_country: (data.settings as any)?.default_country || null,
        is_active: true,
        industry: (data.settings as any)?.industry || null,
        business_type: (data.settings as any)?.business_type || null,
        timezone: (data.settings as any)?.timezone || null
      },
      organization_settings: Array.isArray(data.organization_settings) 
        ? data.organization_settings[0] 
        : data.organization_settings,
      categories: [],
      subcategories: [],
      featured_products: [],
      shipping_info: {
        has_shipping_providers: false,
        default_shipping_zone_id: null,
        default_shipping_zone_details: null
      },
      store_layout_components: []
    };

    // حفظ في الكاش
    setCacheData(cacheKey, processedData, CACHE_TTL);

    return { data: processedData, isLoading: false };
  } catch (error: any) {
    const errorData: StoreInitializationData = {
      organization_details: null, 
      organization_settings: null, 
      categories: [], 
      subcategories: [], 
      featured_products: [], 
      shipping_info: null,
      store_layout_components: [],
      error: error.message || 'خطأ غير معروف' 
    };
    
    return { 
      data: errorData, 
      isLoading: false 
    };
  }
}

// =================================================================
// 2. تحميل البيانات الإضافية بشكل مؤجل
// =================================================================
export async function loadStoreDataLazily(orgId: string, subdomain: string): Promise<void> {
  try {
    // جلب الفئات والمنتجات المميزة بالتوازي
    const [categoriesResult, productsResult, componentsResult] = await Promise.all([
      supabase
        .from('product_categories')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('name')
        .limit(6),
      
      supabase
        .from('products')
        .select(`
          id, name, description, price, compare_at_price, sku, slug,
          thumbnail_image, stock_quantity, is_featured, created_at,
          product_categories!inner(name, slug)
        `)
        .eq('organization_id', orgId)
        .eq('is_featured', true)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(4),

      supabase
        .from('store_settings')
        .select('id, component_type, settings, is_active, order_index')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('order_index')
    ]);

    // تحديث الكاش بالبيانات الجديدة
    const cacheKey = `store_basic_${subdomain}`;
    const existingData = await getCacheData(cacheKey);
    
    if (existingData) {
      const updatedData: StoreInitializationData = {
        ...existingData,
        categories: categoriesResult.data || [],
        featured_products: productsResult.data || [],
        store_layout_components: (componentsResult.data || []).map((item: any) => ({
          id: item.id,
          type: item.component_type,
          settings: item.settings || {},
          isActive: item.is_active,
          orderIndex: item.order_index || 0
        }))
      };
      
      setCacheData(cacheKey, updatedData, CACHE_TTL);
    }
  } catch (error) {
    console.error('خطأ في التحميل المؤجل:', error);
  }
}

// =================================================================
// 3. الدالة الرئيسية المحسنة
// =================================================================
export async function getOptimizedStoreDataFast(subdomain: string): Promise<{
  data: StoreInitializationData | null;
  isLoading: boolean;
}> {
  // جلب البيانات الأساسية أولاً
  const result = await getStoreBasicDataOptimized(subdomain);
  
  // إذا نجح جلب البيانات الأساسية، ابدأ التحميل المؤجل
  if (result.data && !result.data.error && result.data.organization_details?.id) {
    // بدء التحميل المؤجل في الخلفية (بدون انتظار)
    loadStoreDataLazily(result.data.organization_details.id, subdomain);
  }
  
  return result;
}

// =================================================================
// 4. إزالة الكاش
// =================================================================
export async function clearOptimizedStoreCache(subdomain: string): Promise<void> {
  await clearCacheItem(`store_basic_${subdomain}`);
}

// =================================================================
// 5. إعادة تحميل البيانات
// =================================================================
export async function forceReloadOptimizedStore(subdomain: string): Promise<{
  data: StoreInitializationData | null;
  isLoading: boolean;
}> {
  await clearOptimizedStoreCache(subdomain);
  return getOptimizedStoreDataFast(subdomain);
}

// =================================================================
// دوال إضافية للتوافق مع الكود الموجود
// =================================================================

// دالة للتحميل التدريجي (اسم مختلف لنفس الوظيفة)
export const getStoreDataProgressive = getOptimizedStoreDataFast;

// دالة لإعادة التحميل (اسم مختلف لنفس الوظيفة)  
export const forceReloadStoreData = forceReloadOptimizedStore; 