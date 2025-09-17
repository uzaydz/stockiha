import { supabase } from '@/lib/supabase';
import type { 
  ProductCompleteResponse, 
  DataScope,
  CompleteProduct 
} from './productComplete';

// استيراد API الجديد المحسن
import { 
  getProductSmartDataUltraFast,
  getProductBasicDataUltraFast,
  getProductCombinedDataUltraFast,
  type FastFetchOptions,
  type CombinedProductData
} from './productUltraFastApi';

// دالة محسنة لجلب بيانات المنتج باستخدام الدالتين الجديدتين المنفصلتين
const getProductCompleteDataOptimized = async (
  productIdentifier: string, // يمكن أن يكون ID أو slug
  options: {
    organizationId?: string;
    includeInactive?: boolean;
    dataScope?: DataScope;
  } = {}
): Promise<ProductCompleteResponse | null> => {

  try {
    if (process.env.NODE_ENV === 'development') {
      try {
        console.log('📥 [API] getProductCompleteDataOptimized:start (NEW API)', {
          productIdentifier,
          hasOrg: !!options.organizationId,
          dataScope: options.dataScope || 'basic'
        });
      } catch {}
    }

    // تحويل خيارات DataScope إلى خيارات API الجديد
    const fastOptions: FastFetchOptions = {
      organizationId: options.organizationId,
      includeInactive: options.includeInactive,
      includeExtended: options.dataScope !== 'basic',
      includeThumbnails: true,
      includeColorsBasic: true,
      includeMarketingData: options.dataScope === 'full' || options.dataScope === 'ultra',
      includeFormData: options.dataScope === 'full' || options.dataScope === 'ultra',
      includeAdvancedSettings: options.dataScope === 'ultra',
      dataDetailLevel: options.dataScope === 'ultra' ? 'ultra' : 'full'
    };

    // ✅ Fallback ذكي: إذا لم يتوفر organizationId، جرب الدالة القديمة أولاً
    if (!options.organizationId) {
      try {
        const { getProductCompleteData } = await import('./productComplete');
        const legacyResult = await getProductCompleteData(productIdentifier, {
          organizationId: undefined,
          includeInactive: options.includeInactive,
          dataScope: options.dataScope || 'full'
        });
        if (legacyResult && (legacyResult as any).product) {
          return legacyResult;
        }
      } catch (_e) {
        // إذا فشل fallback القديم نكمل بالمسار المحسن بالأسفل
      }
    }

    const startTime = performance.now();
    
    // استخدام API الجديد المحسن
    let combinedData: CombinedProductData;
    
    // تحديد السياق حسب dataScope
    let context: 'list' | 'card' | 'detail' | 'full' = 'detail';
    if (options.dataScope === 'basic') context = 'card';
    else if (options.dataScope === 'ultra') context = 'full';
    
    try {
      combinedData = await getProductSmartDataUltraFast(productIdentifier, context, fastOptions);
    } catch (rpcErr: any) {
      // إذا فشل API الجديد، جرب الدالة القديمة كـ fallback
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ [API] فشل API الجديد، استخدام fallback:', rpcErr.message);
      }
      
      // استخدام الدالة القديمة كـ fallback
      const rpcParams = {
        p_product_identifier: productIdentifier,
        p_organization_id: options.organizationId || null,
        p_include_inactive: options.includeInactive || false,
        p_data_scope: options.dataScope || 'basic',
        p_include_large_images: false
      };

      let data: any = null;
      let error: any = null;

      try {
        const result = await supabase.rpc('get_product_complete_data_ultra_optimized' as any, rpcParams);
        data = result.data;
        error = result.error;
        
        if (data && typeof data === 'object' && data.get_product_complete_data_ultra_optimized) {
          data = data.get_product_complete_data_ultra_optimized;
        }
      } catch (fallbackErr: any) {
        error = fallbackErr;
      }
    
      // اكتشاف أخطاء الشبكة/CORS والانتقال مباشرةً إلى REST fallback
      const isNetworkOrCorsError = !!(error && (
        (typeof error.message === 'string' && (
          error.message.includes('Failed to fetch') ||
          error.message.includes('TypeError') ||
          error.message.includes('NetworkError') ||
          error.message.includes('CORS')
        )) || error.name === 'TypeError'
      ));
      if (isNetworkOrCorsError) {
        if (process.env.NODE_ENV === 'development') { try { console.warn('🌐 [API] Network/CORS error, using basic fallback'); } catch {} }
        return await getBasicProductData(productIdentifier, options.organizationId);
      }
      
      if (error) {
        if (process.env.NODE_ENV === 'development') { try { console.error('🛑 [API] RPC fallback error:', { message: error?.message || String(error) }); } catch {} }
        throw error;
      }

      if (!data) {
        throw new Error('المنتج غير موجود أو غير متاح');
      }

      // التحقق من بنية البيانات المُستلمة
      if (data.success === false) {
        const errorMessage = data.error?.message || 'فشل في جلب بيانات المنتج';
        
        if (errorMessage.includes('Organization ID is required')) {
          const isSlug = productIdentifier && !productIdentifier.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
          if (isSlug) {
            throw new Error(`معرف المؤسسة مطلوب عند استخدام الاسم المختصر للمنتج "${productIdentifier}". تأكد من تحديد المؤسسة أولاً.`);
          }
        }
        
        throw new Error(errorMessage);
      }

      // تحويل البيانات لتتوافق مع النوع المتوقع
      const fallbackResponse: ProductCompleteResponse = {
        success: true,
        data_scope: data.data_scope as DataScope,
        product: data.product as CompleteProduct,
        stats: data.stats,
        meta: {
          ...data.meta,
          performance_info: data.performance_info,
          execution_time: performance.now() - startTime,
          optimized_version: false,
          fallback_used: true
        }
      };

      return fallbackResponse;
    }

    const executionTime = performance.now() - startTime;

    // تحويل البيانات المدمجة من API الجديد إلى النوع المتوقع
    let convertedProduct: CompleteProduct;

    if (combinedData.extended) {
      // دمج البيانات الأساسية والمتقدمة
      const basicProduct = combinedData.basic.product as any;
      convertedProduct = {
        // البيانات الأساسية
        id: basicProduct.id,
        name: basicProduct.name,
        name_for_shipping: basicProduct.name_for_shipping,
        description: basicProduct.description || '',
        slug: basicProduct.slug,
        sku: basicProduct.sku || '',
        barcode: basicProduct.barcode,
        brand: basicProduct.brand,

        // الأسعار
        pricing: {
          ...(basicProduct.pricing || {}),
          partial_wholesale_price: combinedData.extended.product_extended.advanced_pricing?.partial_wholesale_price,
          min_wholesale_quantity: combinedData.extended.product_extended.advanced_pricing?.min_wholesale_quantity,
          min_partial_wholesale_quantity: combinedData.extended.product_extended.advanced_pricing?.min_partial_wholesale_quantity
        },

        // خيارات البيع
        selling_options: {
          allow_retail: basicProduct.selling_options?.allow_retail ?? true,
          allow_wholesale: basicProduct.selling_options?.allow_wholesale ?? false,
          allow_partial_wholesale: (combinedData.extended.product_extended.advanced_pricing as any)?.allow_partial_wholesale ?? false,
          is_sold_by_unit: basicProduct.selling_options?.is_sold_by_unit ?? true,
          unit_type: (combinedData.extended.product_extended.advanced_pricing as any)?.unit_type,
          unit_purchase_price: (combinedData.extended.product_extended.advanced_pricing as any)?.unit_purchase_price,
          unit_sale_price: (combinedData.extended.product_extended.advanced_pricing as any)?.unit_sale_price
        },

        // المخزون
        inventory: basicProduct.inventory,

        // التصنيفات
        categories: basicProduct.categories,

        // الصور
        images: {
          thumbnail_image: basicProduct.images?.thumbnail_image,
          additional_images: combinedData.extended.product_extended.images_extended || []
        },

        // المتغيرات
        variants: {
          has_variants: basicProduct.variants?.has_variants ?? basicProduct.has_variants ?? false,
          use_sizes: basicProduct.variants?.use_sizes ?? basicProduct.use_sizes ?? false,
          use_variant_prices: basicProduct.variants?.use_variant_prices ?? basicProduct.use_variant_prices ?? false,
          colors: combinedData.extended.product_extended.variants_extended?.colors_with_details || []
        },

        // الميزات والمواصفات
        features_and_specs: combinedData.extended.product_extended.features_and_specs,

        // حالة المنتج
        status: basicProduct.status,

        // معلومات التنظيم
        organization: {
          organization_id: basicProduct.organization?.id || '',
          created_by_user_id: basicProduct.id,
          updated_by_user_id: basicProduct.id,
          created_at: basicProduct.timestamps?.created_at || new Date().toISOString(),
          updated_at: basicProduct.timestamps?.updated_at || new Date().toISOString()
        },

        // الشحن والقوالب
        shipping_and_templates: {
          shipping_info: combinedData.extended.product_extended.shipping_extended?.shipping_provider ||
                        combinedData.extended.product_extended.shipping_extended?.shipping_clone,
          shipping_method_type: basicProduct.shipping_basic?.shipping_method_type || 'default',
          use_shipping_clone: basicProduct.shipping_basic?.use_shipping_clone ?? false
        },

        // النماذج
        form_data: combinedData.extended.product_extended.forms_extended?.custom_form ||
                  combinedData.extended.product_extended.forms_extended?.default_form,

        // البيانات المتقدمة
        wholesale_tiers: (combinedData.extended.product_extended as any).advanced_extended?.wholesale_tiers || [],
        advanced_settings: combinedData.extended.product_extended.settings_extended?.product_advanced_settings,
        marketing_settings: combinedData.extended.product_extended.marketing_extended?.marketing_settings,
        purchase_page_config: combinedData.extended.product_extended.page_configs?.purchase_page_config,
        special_offers_config: combinedData.extended.product_extended.page_configs?.special_offers_config,

        // إضافة البيانات المتقدمة الإضافية
        advanced_pricing: combinedData.extended.product_extended.advanced_pricing,
        shipping_extended: combinedData.extended.product_extended.shipping_extended,
        variants_extended: combinedData.extended.product_extended.variants_extended,
        images_extended: combinedData.extended.product_extended.images_extended,
        forms_extended: combinedData.extended.product_extended.forms_extended,
        settings_extended: combinedData.extended.product_extended.settings_extended,
        marketing_extended: combinedData.extended.product_extended.marketing_extended,
        page_configs: combinedData.extended.product_extended.page_configs
      } as unknown as CompleteProduct;
    } else {
      // البيانات الأساسية فقط - إنشاء كائن كامل يتوافق مع CompleteProduct
      const basicProductOnly = combinedData.basic.product as any;
      convertedProduct = {
        // البيانات الأساسية
        id: basicProductOnly.id,
        name: basicProductOnly.name,
        name_for_shipping: basicProductOnly.name_for_shipping,
        description: basicProductOnly.description || '',
        slug: basicProductOnly.slug,
        sku: basicProductOnly.sku || '',
        barcode: basicProductOnly.barcode,
        brand: basicProductOnly.brand,

        // الأسعار
        pricing: basicProductOnly.pricing,

        // خيارات البيع
        selling_options: basicProductOnly.selling_options,

        // المخزون
        inventory: basicProductOnly.inventory,

        // التصنيفات
        categories: basicProductOnly.categories,

        // الصور
        images: {
          thumbnail_image: basicProductOnly.images?.thumbnail_image,
          additional_images: []
        },

        // المتغيرات
        variants: {
          has_variants: basicProductOnly.variants?.has_variants ?? basicProductOnly.has_variants ?? false,
          use_sizes: basicProductOnly.variants?.use_sizes ?? basicProductOnly.use_sizes ?? false,
          use_variant_prices: basicProductOnly.variants?.use_variant_prices ?? basicProductOnly.use_variant_prices ?? false,
          colors: basicProductOnly.variants?.colors_basic_info || []
        },

        // الميزات والمواصفات (بيانات أساسية فقط)
        features_and_specs: {
          features: [],
          specifications: {},
          has_fast_shipping: basicProductOnly.basic_features?.has_fast_shipping ?? false,
          has_money_back: basicProductOnly.basic_features?.has_money_back ?? false,
          has_quality_guarantee: basicProductOnly.basic_features?.has_quality_guarantee ?? false,
          fast_shipping_text: basicProductOnly.basic_features?.fast_shipping_text,
          money_back_text: basicProductOnly.basic_features?.money_back_text,
          quality_guarantee_text: basicProductOnly.basic_features?.quality_guarantee_text
        } as any,

        // حالة المنتج
        status: basicProductOnly.status,

        // معلومات التنظيم
        organization: {
          organization_id: basicProductOnly.organization?.id || '',
          created_by_user_id: basicProductOnly.id,
          updated_by_user_id: basicProductOnly.id,
          created_at: basicProductOnly.timestamps?.created_at || new Date().toISOString(),
          updated_at: basicProductOnly.timestamps?.updated_at || new Date().toISOString()
        },

        // الشحن والقوالب
        shipping_and_templates: {
          shipping_method_type: basicProductOnly.shipping_basic?.shipping_method_type || 'default',
          use_shipping_clone: basicProductOnly.shipping_basic?.use_shipping_clone ?? false
        },

        // البيانات المتقدمة (فارغة للبيانات الأساسية)
        wholesale_tiers: [],
        advanced_settings: undefined,
        marketing_settings: undefined,
        purchase_page_config: undefined,
        special_offers_config: undefined
      } as unknown as CompleteProduct;
    }

    const optimizedResponse: ProductCompleteResponse = {
      success: true,
      data_scope: options.dataScope as DataScope || 'basic',
      product: convertedProduct,
      stats: {
        ...((combinedData.basic.stats as any) || {}),
        ...(combinedData.extended?.extended_stats || {}),
        // إضافة الحقول المفقودة من ProductStats
        total_colors: (combinedData.basic.stats as any)?.colors_count || 0,
        total_sizes: (combinedData.extended?.extended_stats as any)?.total_sizes_count || 0,
        total_images: (combinedData.basic.stats as any)?.images_count || 0,
        total_wholesale_tiers: (combinedData.extended?.extended_stats as any)?.wholesale_tiers?.length || 0,
        last_updated: (combinedData.basic.stats as any)?.last_updated || new Date().toISOString(),
        has_advanced_settings: (combinedData.extended?.extended_stats as any)?.has_advanced_settings ?? false
      } as any,
      meta: {
        query_timestamp: new Date().toISOString(),
        data_freshness: 'real-time',
        performance_optimized: true,
        organization_id: options.organizationId || '',
        form_strategy: combinedData.extended?.extended_stats?.has_custom_form ? 'custom_form_found' :
                       combinedData.extended?.product_extended?.forms_extended?.default_form ? 'default_form_used' :
                       'no_form_available'
      } as any
    };

    if (process.env.NODE_ENV === 'development') { 
      try { 
        console.log('✅ [API] getProductCompleteDataOptimized:success (NEW API)', { 
          productId: optimizedResponse.product.id,
          combined: combinedData.combined,
          totalTime: `${combinedData.total_execution_time.toFixed(2)}ms`
        }); 
      } catch {} 
    }
    
    return optimizedResponse;

  } catch (error: any) {
    const errorMessage = error?.message || 'خطأ غير معروف';
    if (process.env.NODE_ENV === 'development') { try { console.error('💥 [API] getProductCompleteDataOptimized:catch', { error: errorMessage }); } catch {} }

    // إرجاع الخطأ مباشرة بدلاً من fallback
    throw error;
  }
};

// hook محسن لاستخدام الدالة الجديدة
export const useProductCompleteOptimized = (
  productIdentifier?: string,
  options: {
    organizationId?: string;
    includeInactive?: boolean;
    dataScope?: DataScope;
  } = {}
) => {
  // يمكن إضافة React Query أو SWR هنا لاحقاً
  // حالياً نقوم بإرجاع الدالة المحسنة للاستخدام المباشر
  return {
    getProductData: () => getProductCompleteDataOptimized(productIdentifier || '', options)
  };
};

// دالة fallback لجلب البيانات الأساسية من جدول products
async function getBasicProductData(productIdentifier: string, organizationId?: string): Promise<ProductCompleteResponse | null> {
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
    const basicResponse: ProductCompleteResponse = {
      success: true,
      data_scope: 'basic',
      product: products as any,
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
    return null;
  }
}

// 🚀 دالة لجلب معلومات صور الألوان السريعة (بدون البيانات الضخمة)
const getProductColorImagesInfoOptimized = async (
  productId: string
): Promise<any> => {
  try {

    const startTime = performance.now();

    const { data, error } = await supabase.rpc('get_product_color_images_info_optimized' as any, {
      p_product_id: productId
    });

    const executionTime = performance.now() - startTime;

    if (error) {
      throw error;
    }

    if (!data) {
      return null;
    }

    return data;

  } catch (error: any) {
    throw error;
  }
};

// 🚀 دالة محسنة لجلب صور الألوان مع خيارات ذكية
// إضافة كاش بسيط ومنع تكرار الطلبات لنفس المفاتيح
const __colorImagesActive: Map<string, Promise<any>> = new Map();
const __colorImagesCache: Map<string, { data: any; ts: number }> = new Map();
const COLOR_IMAGES_TTL = 5 * 60 * 1000; // 5 دقائق

const getProductColorImagesOptimized = async (
  productId: string,
  options: {
    includeLargeImages?: boolean;
    maxImageSize?: number; // بالبايت
    imageQuality?: 'thumbnail' | 'standard' | 'full';
  } = {}
): Promise<any> => {
  try {
    const key = `color_images:${productId}:${options.includeLargeImages ? '1' : '0'}:${options.maxImageSize || 100000}:${options.imageQuality || 'standard'}`;
    const now = Date.now();

    // كاش حديث
    const cached = __colorImagesCache.get(key);
    if (cached && (now - cached.ts) < COLOR_IMAGES_TTL) {
      return cached.data;
    }

    // طلب نشط لنفس المفتاح
    if (__colorImagesActive.has(key)) {
      return await __colorImagesActive.get(key)!;
    }

    const startTime = performance.now();
    const request = (async () => {
      const { data, error } = await supabase.rpc('get_product_color_images_optimized' as any, {
        p_product_id: productId,
        p_include_large_images: options.includeLargeImages || false,
        p_max_image_size: options.maxImageSize || 100000, // 100KB افتراضي
        p_image_quality: options.imageQuality || 'standard'
      });
      const executionTime = performance.now() - startTime;
      void executionTime;
      if (error) throw error;
      if (!data) return null;
      __colorImagesCache.set(key, { data, ts: Date.now() });
      return data;
    })();

    __colorImagesActive.set(key, request);
    try {
      return await request;
    } finally {
      __colorImagesActive.delete(key);
    }

  } catch (error: any) {
    throw error;
  }
};

// 🚀 دالة محسنة لجلب المنتج مع صور الألوان الضخمة
const getProductCompleteWithLargeImagesOptimized = async (
  productIdentifier: string,
  options: {
    organizationId?: string;
    includeInactive?: boolean;
    dataScope?: DataScope;
  } = {}
): Promise<ProductCompleteResponse | null> => {
  try {

    // جلب المنتج مع الصور الضخمة
    const rpcParams = {
      p_product_identifier: productIdentifier,
      p_organization_id: options.organizationId || null,
      p_include_inactive: options.includeInactive || false,
      p_data_scope: options.dataScope || 'basic',
      p_include_large_images: true // 🚀 تحسين: تحميل الصور الضخمة
    };

    const startTime = performance.now();

    const { data, error } = await supabase.rpc('get_product_complete_data_ultra_optimized' as any, rpcParams);

    const executionTime = performance.now() - startTime;

    if (error) {
      throw error;
    }

    if (!data || data.success === false) {
      throw new Error(data?.error?.message || 'فشل في جلب بيانات المنتج');
    }

    // تسجيل معلومات صور الألوان المستلمة من قاعدة البيانات
    if (data.product?.variants?.colors) {
    }

    const finalResult = {
      success: true,
      data_scope: data.data_scope as DataScope,
      product: data.product as CompleteProduct,
      stats: data.stats,
      meta: {
        ...data.meta,
        performance_info: data.performance_info,
        execution_time: executionTime,
        optimized_version: true,
        large_images_included: true
      }
    };

    // تسجيل معلومات صور الألوان في getProductCompleteWithLargeImagesOptimized
    if (finalResult.product?.variants?.colors) {
    }

    return finalResult;

  } catch (error: any) {
    throw error;
  }
};

// 🚀 دالة محسنة لجلب المنتج مع صور الألوان الصغيرة للمكون ProductVariantSelector
const getProductCompleteWithColorThumbnailsOptimized = async (
  productIdentifier: string,
  options: {
    organizationId?: string;
    includeInactive?: boolean;
    dataScope?: DataScope;
  } = {}
): Promise<ProductCompleteResponse | null> => {
  try {

    // 🚀 تأكيد أن الدالة تعمل

    const startTime = performance.now();

    // جلب المنتج الأساسي أولاً بنطاق بيانات خفيف لتسريع الوصول الأولي
    const baseResult = await getProductCompleteDataOptimized(productIdentifier, {
      ...options,
      dataScope: options.dataScope || 'basic'
    });

    if (!baseResult?.product) {
      return null;
    }

    const product = baseResult.product as CompleteProduct;

    // إذا لم تكن هناك ألوان، نعيد النتيجة كما هي
    if (!product.variants?.colors || product.variants.colors.length === 0) {
      return baseResult;
    }

    // جلب صور الألوان الصغيرة فقط (أقل من 200KB)
    let colorImages: any = null;
    try {
      colorImages = await getProductColorImagesOptimized(product.id, {
        includeLargeImages: false, // تحميل الصور المصغرة فقط لتقليل الحجم
        maxImageSize: 200000, // 200KB كحد أقصى للصور الصغيرة
        imageQuality: 'thumbnail'
      });

      // تحديث بيانات الألوان بالصور الصغيرة
      if (colorImages?.color_images && Array.isArray(colorImages.color_images)) {
        const updatedColors = product.variants.colors.map(color => {
          const colorImage = colorImages.color_images.find((ci: any) => ci.color_id === color.id);
          return {
            ...color,
            image_url: colorImage?.image_url || color.image_url || null
          };
        });

        product.variants.colors = updatedColors;
      }
    } catch (colorError) {
      // لا نرمي خطأ، نكمل بدون صور الألوان
    }

    const executionTime = performance.now() - startTime;

    return {
      ...baseResult,
      meta: {
        ...baseResult.meta,
        execution_time: executionTime,
        color_thumbnails_loaded: true
      } as any
    };

  } catch (error: any) {
    throw error;
  }
};

// 🚀 دالة محسنة لجلب المنتج مع معلومات صور الألوان السريعة
const getProductCompleteWithColorImagesInfoOptimizedInternal = async (
  productIdentifier: string,
  options: {
    organizationId?: string;
    includeInactive?: boolean;
    dataScope?: DataScope;
  } = {}
): Promise<ProductCompleteResponse | null> => {
  try {

    // جلب المنتج الأساسي مع صور الألوان المعلومات فقط
    const rpcParams = {
      p_product_identifier: productIdentifier,
      p_organization_id: options.organizationId || null,
      p_include_inactive: options.includeInactive || false,
      p_data_scope: options.dataScope || 'basic',
      p_include_large_images: false // لا نريد الصور الضخمة في الاستعلام الرئيسي
    };

    const startTime = performance.now();

    const { data, error } = await supabase.rpc('get_product_complete_data_ultra_optimized' as any, rpcParams);

    const executionTime = performance.now() - startTime;

    if (error) {
      throw error;
    }

    if (!data || data.success === false) {
      throw new Error(data?.error?.message || 'فشل في جلب بيانات المنتج');
    }

    // إذا كان المنتج يحتوي على ألوان، جلب معلومات صور الألوان السريعة
    let colorImagesInfo = null;
    if (data.product?.variants?.colors && Array.isArray(data.product.variants.colors) && data.product.variants.colors.length > 0) {
      try {
        colorImagesInfo = await getProductColorImagesInfoOptimized(data.product.id);
      } catch (colorError) {
      }
    }

          const finalResult = {
        success: true,
        data_scope: data.data_scope as DataScope,
        product: {
          ...data.product,
          // إضافة معلومات صور الألوان السريعة
          color_images_info: colorImagesInfo?.color_images_info || [],
          color_images_summary: colorImagesInfo?.summary || null
        } as CompleteProduct,
        stats: {
          ...data.stats,
          color_images_performance: colorImagesInfo?.performance_info || null
        },
        meta: {
          ...data.meta,
          performance_info: {
            ...data.performance_info,
            total_execution_time: executionTime
          },
          optimized_version: true,
          color_images_strategy: 'info_only'
        }
      };

      // تسجيل معلومات صور الألوان النهائية
      if (finalResult.product?.variants?.colors) {
      }

      return finalResult;

  } catch (error: any) {
    throw error;
  }
};

// 🚀 دالة ذكية لاختيار الاستراتيجية المناسبة لجلب المنتج مع صور الألوان
const getProductCompleteSmartColorLoadingInternal = async (
  productIdentifier: string,
  options: {
    organizationId?: string;
    includeInactive?: boolean;
    dataScope?: DataScope;
    colorImagesStrategy?: 'none' | 'info_only' | 'smart' | 'full' | 'thumbnails';
    maxImageSize?: number; // بالبايت
  } = {}
): Promise<ProductCompleteResponse | null> => {
  try {
    // تعريف strategy مع النوع الصحيح من البداية
    const strategy: 'none' | 'info_only' | 'smart' | 'full' | 'thumbnails' = (options.colorImagesStrategy || 'smart') as any;

    // strategy الآن من النوع الصحيح
    const validStrategy: 'none' | 'info_only' | 'smart' | 'full' | 'thumbnails' = strategy;

    // 🚀 ملاحظة: تم تحديث الدالة المخزنة لتحميل جميع صور الألوان دائماً

    // 🚀 إذا كانت الاستراتيجية full، نستخدم الدالة المحدثة للصور الكاملة
    if (validStrategy === 'full') {

      // نستخدم الدالة المحدثة لجلب جميع الصور
      return await getProductCompleteWithLargeImagesOptimized(productIdentifier, {
        organizationId: options.organizationId,
        includeInactive: options.includeInactive,
        dataScope: 'ultra'
      });
    }

    // 🚀 إذا كانت الاستراتيجية thumbnails، نستخدم الدالة المحدثة
    if (validStrategy === 'thumbnails') {

      // نستخدم الدالة المحدثة لجلب الصور الصغيرة من الدالة المخزنة المحدثة
      return await getProductCompleteWithColorThumbnailsOptimized(productIdentifier, {
        organizationId: options.organizationId,
        includeInactive: options.includeInactive,
        dataScope: options.dataScope
      });
    }

    // التعامل مع الاستراتيجيات المختلفة
    if (validStrategy === 'none') {
      // جلب المنتج بدون صور الألوان
      return await getProductCompleteDataOptimized(productIdentifier, {
        ...options,
        dataScope: options.dataScope || 'basic'
      });
    } else if (validStrategy === 'info_only') {
      // جلب المنتج مع معلومات صور الألوان السريعة
      return await getProductCompleteWithColorImagesInfoOptimizedInternal(productIdentifier, options);
    } else if (validStrategy === ('full' as any)) {
      // جلب المنتج مع جميع صور الألوان (بطيء)
      const fullResult = await getProductCompleteWithLargeImagesOptimized(productIdentifier, {
        organizationId: options.organizationId,
        includeInactive: options.includeInactive,
        dataScope: 'ultra'
      });

      // تسجيل معلومات صور الألوان
      if (fullResult?.product?.variants?.colors) {
      }

      return fullResult;
    } else if (validStrategy === ('thumbnails' as any)) {
      // جلب المنتج مع صور الألوان الصغيرة للمكون ProductVariantSelector
      const thumbnailResult = await getProductCompleteWithColorThumbnailsOptimized(productIdentifier, {
        organizationId: options.organizationId,
        includeInactive: options.includeInactive,
        dataScope: options.dataScope
      });

      // تسجيل معلومات صور الألوان
      if (thumbnailResult?.product?.variants?.colors) {
      }

      return thumbnailResult;
    } else {
      // الاستراتيجية الذكية أو الافتراضية
        // الاستراتيجية الذكية: معلومات سريعة أولاً، ثم الصور عند الحاجة
        const result = await getProductCompleteWithColorImagesInfoOptimizedInternal(productIdentifier, options);

        if (result?.product && 'color_images_summary' in result.product && result.product.color_images_summary) {
          const summary = result.product.color_images_summary as any;

          // إذا كان هناك صور قليلة وصغيرة الحجم، جلبها
          if (summary.colors_with_images <= 3 && summary.total_image_size_bytes < 200000) { // أقل من 200KB
            try {
              const colorImages = await getProductColorImagesOptimized(result.product.id, {
                includeLargeImages: false,
                maxImageSize: 50000 // 50KB
              });

              if (colorImages?.color_images) {
                (result.product as any).color_images_full = colorImages.color_images;
                result.meta = {
                  ...result.meta,
                  color_images_loaded: true
                } as any;
              }
            } catch (error) {
            }
          }
        }

        return result;
    }

  } catch (error: any) {
    throw error;
  }
};

// تصدير الدوال المحسنة للاستخدام في deduplicatedApi
export {
  getProductCompleteDataOptimized,
  getProductColorImagesInfoOptimized,
  getProductColorImagesOptimized,
  getProductCompleteWithLargeImagesOptimized,
  getProductCompleteWithColorThumbnailsOptimized,
  // تصدير الدوال الداخلية بأسماء خارجية
  getProductCompleteSmartColorLoadingInternal as getProductCompleteSmartColorLoading,
  getProductCompleteWithColorImagesInfoOptimizedInternal as getProductCompleteWithColorImagesInfoOptimized
};

export default getProductCompleteDataOptimized;
