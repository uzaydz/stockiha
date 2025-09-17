/**
 * API محسن لاستخدام الدالتين الجديدتين المنفصلتين
 * get_product_basic_data_ultra_fast و get_product_extended_data_ultra_fast
 * 
 * هذا الملف يحل محل productCompleteOptimized.ts ويوفر:
 * 1. سرعة فائقة للبيانات الأساسية
 * 2. تحميل ذكي للبيانات المتقدمة
 * 3. كاش محسن ومنع التكرار
 */

import { supabase } from '@/lib/supabase';

// أنواع البيانات للدالتين الجديدتين
export interface BasicProductData {
  success: boolean;
  data_type: 'basic';
  product: {
    id: string;
    name: string;
    description?: string;
    slug: string;
    sku?: string;
    price: number;
    stock_quantity: number;
    is_active: boolean;
    has_variants: boolean;
    use_sizes: boolean;
    // المزيد من الخصائص الأساسية...
    pricing: {
      price: number;
      purchase_price?: number;
      compare_at_price?: number;
      wholesale_price?: number;
    };
    inventory: {
      stock_quantity: number;
      min_stock_level: number;
      last_inventory_update?: string;
    };
    categories: {
      category_id?: string;
      category_name?: string;
      category_slug?: string;
      subcategory_id?: string;
      subcategory_name?: string;
      subcategory_slug?: string;
    };
    images: {
      thumbnail_image?: string;
      additional_images_info: any[];
    };
    variants: {
      has_variants: boolean;
      use_sizes: boolean;
      colors_basic_info: any[];
    };
    status: {
      is_active: boolean;
      is_digital?: boolean;
      is_featured: boolean;
      is_new: boolean;
    };
    organization: {
      id: string;
      name?: string;
      domain?: string;
    };
  };
  stats: {
    colors_count: number;
    images_count: number;
    data_size: 'basic';
    lightweight: true;
  };
}

export interface ExtendedProductData {
  success: boolean;
  data_type: 'extended';
  product_extended: {
    product_id: string;
    organization_id: string;
    features_and_specs: {
      features: string[];
      specifications: Record<string, any>;
      feature_texts: {
        fast_shipping_text?: string;
        money_back_text?: string;
        quality_guarantee_text?: string;
      };
    };
    advanced_pricing: {
      partial_wholesale_price?: number;
      min_wholesale_quantity?: number;
      min_partial_wholesale_quantity?: number;
      wholesale_tiers: any[];
    };
    shipping_extended: any;
    variants_extended: {
      has_variants: boolean;
      use_sizes: boolean;
      colors_with_details: any[];
    };
    images_extended: any[];
    forms_extended: any;
    settings_extended: any;
    marketing_extended: any;
    page_configs: {
      purchase_page_config?: any;
      special_offers_config?: any;
    };
  };
  extended_stats: {
    colors_with_images_count: number;
    total_sizes_count: number;
    has_custom_form: boolean;
    has_marketing_settings: boolean;
    has_advanced_settings: boolean;
  };
}

export interface CombinedProductData {
  basic: BasicProductData;
  extended?: ExtendedProductData;
  combined: boolean;
  total_execution_time: number;
  // حقول مباشرة للتوافق مع الكود الحالي
  product?: any;
  stats?: any;
  features_and_specs?: any;
  advanced_pricing?: any;
  shipping_extended?: any;
  variants_extended?: any;
  images_extended?: any;
  forms_extended?: any;
  settings_extended?: any;
  marketing_extended?: any;
  page_configs?: any;
  extended_stats?: any;
}

// خيارات الجلب المحسنة
export interface FastFetchOptions {
  organizationId?: string;
  includeInactive?: boolean;
  includeThumbnails?: boolean;
  includeColorsBasic?: boolean;
  // خيارات للبيانات المتقدمة
  includeExtended?: boolean;
  includeLargeImages?: boolean;
  includeMarketingData?: boolean;
  includeFormData?: boolean;
  includeAdvancedSettings?: boolean;
  dataDetailLevel?: 'standard' | 'full' | 'ultra';
}

// Cache للطلبات النشطة لمنع التكرار
const activeRequests = new Map<string, Promise<any>>();
const dataCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// مدة الاحتفاظ بالكاش (بالمللي ثانية)
const CACHE_TTL = {
  basic: 5 * 60 * 1000,    // 5 دقائق للبيانات الأساسية
  extended: 10 * 60 * 1000, // 10 دقائق للبيانات المتقدمة
  combined: 15 * 60 * 1000  // 15 دقيقة للبيانات المدمجة
};

/**
 * إنشاء مفتاح الكاش
 */
function createCacheKey(identifier: string, type: 'basic' | 'extended' | 'combined', options?: FastFetchOptions): string {
  const optionsStr = options ? JSON.stringify(options) : '';
  return `${type}:${identifier}:${optionsStr}`;
}

/**
 * التحقق من صحة الكاش
 */
function getCachedData(key: string, ttl: number): any | null {
  const cached = dataCache.get(key);
  if (cached && (Date.now() - cached.timestamp) < ttl) {
    return cached.data;
  }
  if (cached) {
    dataCache.delete(key);
  }
  return null;
}

/**
 * حفظ البيانات في الكاش
 */
function setCachedData(key: string, data: any, ttl: number): void {
  dataCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  });
}

/**
 * دالة جلب البيانات الأساسية فائقة السرعة
 */
export async function getProductBasicDataUltraFast(
  productIdentifier: string,
  options: FastFetchOptions = {}
): Promise<BasicProductData> {
  const startTime = performance.now();
  
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 [API] getProductBasicDataUltraFast:start', {
        productIdentifier,
        options
      });
    }

    // التحقق من الكاش أولاً
    const cacheKey = createCacheKey(productIdentifier, 'basic', options);
    const cached = getCachedData(cacheKey, CACHE_TTL.basic);
    if (cached) {
      if (process.env.NODE_ENV === 'development') {
        console.log('💾 [API] البيانات الأساسية من الكاش:', { productIdentifier });
      }
      return cached;
    }

    // التحقق من الطلبات النشطة
    if (activeRequests.has(cacheKey)) {
      if (process.env.NODE_ENV === 'development') {
        console.log('⏳ [API] انتظار طلب نشط للبيانات الأساسية:', { productIdentifier });
      }
      return await activeRequests.get(cacheKey)!;
    }

    // إنشاء طلب جديد
    const requestPromise = (async (): Promise<BasicProductData> => {
      const rpcParams = {
        p_product_identifier: productIdentifier,
        p_organization_id: options.organizationId || null,
        p_include_inactive: options.includeInactive || false,
        p_include_thumbnails: options.includeThumbnails ?? true,
        p_include_colors_basic: options.includeColorsBasic ?? true
      };

      const { data, error } = await supabase.rpc('get_product_basic_data_ultra_fast' as any, rpcParams);

      if (error) {
        throw new Error(`خطأ في جلب البيانات الأساسية: ${error.message}`);
      }

      if (!data || data.success === false) {
        throw new Error(data?.error?.message || 'فشل في جلب البيانات الأساسية');
      }

      return data as BasicProductData;
    })();

    activeRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      
      // حفظ في الكاش
      setCachedData(cacheKey, result, CACHE_TTL.basic);
      
      const executionTime = performance.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ [API] getProductBasicDataUltraFast:success', {
          productId: result.product.id,
          executionTime: `${executionTime.toFixed(2)}ms`
        });
      }

      return result;
    } finally {
      activeRequests.delete(cacheKey);
    }

  } catch (error: any) {
    const executionTime = performance.now() - startTime;
    if (process.env.NODE_ENV === 'development') {
      console.error('💥 [API] getProductBasicDataUltraFast:error', {
        error: error.message,
        executionTime: `${executionTime.toFixed(2)}ms`
      });
    }
    throw error;
  }
}

/**
 * دالة جلب البيانات المتقدمة فائقة السرعة
 */
export async function getProductExtendedDataUltraFast(
  productId: string,
  options: FastFetchOptions = {}
): Promise<ExtendedProductData> {
  const startTime = performance.now();
  
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 [API] getProductExtendedDataUltraFast:start', {
        productId,
        options
      });
    }

    // التحقق من الكاش أولاً
    const cacheKey = createCacheKey(productId, 'extended', options);
    const cached = getCachedData(cacheKey, CACHE_TTL.extended);
    if (cached) {
      if (process.env.NODE_ENV === 'development') {
        console.log('💾 [API] البيانات المتقدمة من الكاش:', { productId });
      }
      return cached;
    }

    // التحقق من الطلبات النشطة
    if (activeRequests.has(cacheKey)) {
      if (process.env.NODE_ENV === 'development') {
        console.log('⏳ [API] انتظار طلب نشط للبيانات المتقدمة:', { productId });
      }
      return await activeRequests.get(cacheKey)!;
    }

    // إنشاء طلب جديد
    const requestPromise = (async (): Promise<ExtendedProductData> => {
      const rpcParams = {
        p_product_id: productId,
        p_include_large_images: options.includeLargeImages || false,
        p_include_marketing_data: options.includeMarketingData ?? true,
        p_include_form_data: options.includeFormData ?? true,
        p_include_advanced_settings: options.includeAdvancedSettings ?? true,
        p_data_detail_level: options.dataDetailLevel || 'full'
      };

      const { data, error } = await supabase.rpc('get_product_extended_data_ultra_fast' as any, rpcParams);

      if (error) {
        throw new Error(`خطأ في جلب البيانات المتقدمة: ${error.message}`);
      }

      if (!data || data.success === false) {
        throw new Error(data?.error?.message || 'فشل في جلب البيانات المتقدمة');
      }

      return data as ExtendedProductData;
    })();

    activeRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      
      // حفظ في الكاش
      setCachedData(cacheKey, result, CACHE_TTL.extended);
      
      const executionTime = performance.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ [API] getProductExtendedDataUltraFast:success', {
          productId: result.product_extended.product_id,
          executionTime: `${executionTime.toFixed(2)}ms`
        });
      }

      return result;
    } finally {
      activeRequests.delete(cacheKey);
    }

  } catch (error: any) {
    const executionTime = performance.now() - startTime;
    if (process.env.NODE_ENV === 'development') {
      console.error('💥 [API] getProductExtendedDataUltraFast:error', {
        error: error.message,
        executionTime: `${executionTime.toFixed(2)}ms`
      });
    }
    throw error;
  }
}

/**
 * دالة ذكية لجلب البيانات مدمجة (أساسية + متقدمة)
 */
export async function getProductCombinedDataUltraFast(
  productIdentifier: string,
  options: FastFetchOptions = {}
): Promise<CombinedProductData> {
  const startTime = performance.now();
  
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 [API] getProductCombinedDataUltraFast:start', {
        productIdentifier,
        options
      });
    }

    // التحقق من الكاش أولاً
    const cacheKey = createCacheKey(productIdentifier, 'combined', options);
    const cached = getCachedData(cacheKey, CACHE_TTL.combined);
    if (cached) {
      if (process.env.NODE_ENV === 'development') {
        console.log('💾 [API] البيانات المدمجة من الكاش:', { productIdentifier });
      }
      return cached;
    }

    // جلب البيانات الأساسية أولاً (سريع جداً)
    const basicData = await getProductBasicDataUltraFast(productIdentifier, options);

    // إذا كان المطلوب البيانات الأساسية فقط
    if (!options.includeExtended) {
      // تحويل بنية المتغيرات لتتوافق مع المتوقع
      const normalizedProduct = {
        ...basicData.product,
        variants: basicData.product.variants ? {
          ...basicData.product.variants,
          // تحويل colors_basic_info إلى colors
          colors: basicData.product.variants.colors_basic_info || []
        } : undefined
      };
      
      const result: CombinedProductData = {
        basic: basicData,
        combined: false,
        total_execution_time: performance.now() - startTime,
        // إضافة الحقول المباشرة للتوافق مع البيانات المُطبعة
        product: normalizedProduct,
        stats: basicData.stats
      };

      // حفظ في الكاش
      setCachedData(cacheKey, result, CACHE_TTL.basic);
      
      return result;
    }

    // جلب البيانات المتقدمة بالتوازي
    const extendedData = await getProductExtendedDataUltraFast(basicData.product.id, options);

    // دمج البيانات المتقدمة مع البيانات الأساسية
    const mergedProduct = {
      ...basicData.product,
      // دمج البيانات المتقدمة في المنتج الأساسي
      ...(extendedData?.product_extended && {
        ...extendedData.product_extended,
        // دمج المتغيرات المتقدمة مع المتغيرات الأساسية بشكل صحيح
        variants: (() => {
          const basicVariants = basicData.product.variants;
          const extendedVariants = extendedData.product_extended?.variants_extended;
          
          if (!extendedVariants) return basicVariants;
          
          // دمج الألوان من المصدرين بشكل صحيح
          const basicColors = basicVariants?.colors_basic_info || [];
          const extendedColors = extendedVariants?.colors_with_details || [];
          
          return {
            has_variants: extendedVariants.has_variants || basicVariants?.has_variants || false,
            use_sizes: extendedVariants.use_sizes || basicVariants?.use_sizes || false,
            use_variant_prices: (basicVariants as any)?.use_variant_prices || false,
            // استخدم الألوان المتقدمة إذا توفرت، وإلا استخدم الأساسية
            colors: extendedColors.length > 0 ? extendedColors : basicColors
          };
        })(),
        variants_extended: extendedData.product_extended?.variants_extended,
        // الاحتفاظ ببنية الصور الأساسية وإضافة الصور المتقدمة
        images: {
          ...basicData.product.images,
          additional_images_info: basicData.product.images?.additional_images_info || [],
          images_extended: extendedData.product_extended.images_extended || []
        },
        // باقي البيانات المتقدمة
        features_and_specs: extendedData.product_extended.features_and_specs,
        advanced_pricing: extendedData.product_extended.advanced_pricing,
        shipping_extended: extendedData.product_extended.shipping_extended,
        forms_extended: extendedData.product_extended.forms_extended,
        // 🚀 إصلاح: إضافة form_data للتوافق مع useProductForm
        form_data: (() => {
          const formsExtended = extendedData.product_extended.forms_extended;
          if (!formsExtended) return null;
          
          // إعطاء الأولوية للنموذج المخصص، وإلا استخدم الافتراضي
          if (formsExtended.custom_form) {
            return {
              ...formsExtended.custom_form,
              type: 'custom'
            };
          } else if (formsExtended.default_form) {
            return {
              ...formsExtended.default_form,
              type: 'default'
            };
          }
          return null;
        })(),
        settings_extended: extendedData.product_extended.settings_extended,
        marketing_extended: extendedData.product_extended.marketing_extended,
        page_configs: extendedData.product_extended.page_configs
      })
    };

    // دمج البيانات لتتوافق مع الهيكل المتوقع
    const result: CombinedProductData = {
      basic: basicData,
      extended: extendedData,
      combined: true,
      total_execution_time: performance.now() - startTime,
      // إضافة الحقول المباشرة للتوافق
      product: mergedProduct,
      stats: { ...basicData.stats, ...(extendedData?.extended_stats && { extended: extendedData.extended_stats }) },
      // إضافة البيانات المتقدمة كحقول منفصلة أيضاً للتوافق
      ...(extendedData?.product_extended && {
        features_and_specs: extendedData.product_extended.features_and_specs,
        advanced_pricing: extendedData.product_extended.advanced_pricing,
        shipping_extended: extendedData.product_extended.shipping_extended,
        variants_extended: extendedData.product_extended.variants_extended,
        images_extended: extendedData.product_extended.images_extended,
        forms_extended: extendedData.product_extended.forms_extended,
        settings_extended: extendedData.product_extended.settings_extended,
        marketing_extended: extendedData.product_extended.marketing_extended,
        page_configs: extendedData.product_extended.page_configs,
        extended_stats: extendedData.extended_stats
      })
    };

    // حفظ في الكاش
    setCachedData(cacheKey, result, CACHE_TTL.combined);

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [API] getProductCombinedDataUltraFast:success', {
        productId: basicData.product.id,
        hasExtended: !!extendedData,
        totalTime: `${result.total_execution_time.toFixed(2)}ms`
      });
    }

    return result;

  } catch (error: any) {
    const executionTime = performance.now() - startTime;
    if (process.env.NODE_ENV === 'development') {
      console.error('💥 [API] getProductCombinedDataUltraFast:error', {
        error: error.message,
        executionTime: `${executionTime.toFixed(2)}ms`
      });
    }
    throw error;
  }
}

/**
 * دالة للحصول على البيانات الذكية (تقرر تلقائياً ما يُحتاج)
 */
export async function getProductSmartDataUltraFast(
  productIdentifier: string,
  context: 'list' | 'card' | 'detail' | 'full' = 'detail',
  options: FastFetchOptions = {}
): Promise<CombinedProductData> {
  
  // تحديد الخيارات حسب السياق
  const smartOptions: FastFetchOptions = {
    ...options,
    // للقوائم: بيانات أساسية فقط
    includeExtended: context !== 'list',
    includeThumbnails: true,
    includeColorsBasic: context !== 'list',
    // للتفاصيل الكاملة: كل شيء
    includeLargeImages: context === 'full',
    includeMarketingData: context === 'detail' || context === 'full',
    includeFormData: context === 'detail' || context === 'full',
    includeAdvancedSettings: context === 'full',
    dataDetailLevel: context === 'full' ? 'ultra' : 'full'
  };

  if (process.env.NODE_ENV === 'development') {
    console.log('🧠 [API] getProductSmartDataUltraFast:', {
      productIdentifier,
      context,
      smartOptions
    });
  }

  return await getProductCombinedDataUltraFast(productIdentifier, smartOptions);
}

/**
 * دالة تنظيف الكاش
 */
export function clearProductCache(pattern?: string): void {
  if (pattern) {
    // حذف مفاتيح محددة
    for (const key of dataCache.keys()) {
      if (key.includes(pattern)) {
        dataCache.delete(key);
      }
    }
  } else {
    // حذف كل الكاش
    dataCache.clear();
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log('🧹 [API] تم تنظيف الكاش:', { pattern: pattern || 'all' });
  }
}

/**
 * دالة للحصول على إحصائيات الكاش
 */
export function getCacheStats(): {
  totalEntries: number;
  basicEntries: number;
  extendedEntries: number;
  combinedEntries: number;
  activeRequests: number;
} {
  let basicEntries = 0;
  let extendedEntries = 0;
  let combinedEntries = 0;

  for (const key of dataCache.keys()) {
    if (key.startsWith('basic:')) basicEntries++;
    else if (key.startsWith('extended:')) extendedEntries++;
    else if (key.startsWith('combined:')) combinedEntries++;
  }

  return {
    totalEntries: dataCache.size,
    basicEntries,
    extendedEntries,
    combinedEntries,
    activeRequests: activeRequests.size
  };
}

// تصدير الدوال الرئيسية
export {
  getProductBasicDataUltraFast as getBasicData,
  getProductExtendedDataUltraFast as getExtendedData,
  getProductCombinedDataUltraFast as getCombinedData,
  getProductSmartDataUltraFast as getSmartData
};

// الدالة الرئيسية الافتراضية
export default getProductSmartDataUltraFast;
