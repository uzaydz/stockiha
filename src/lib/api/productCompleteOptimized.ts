import { supabase } from '@/lib/supabase';
import type { 
  ProductCompleteResponse, 
  DataScope,
  CompleteProduct 
} from './productComplete';

// دالة محسنة لجلب بيانات المنتج باستخدام الـ API الموحد مع منع التكرار
const getProductCompleteDataOptimized = async (
  productIdentifier: string, // يمكن أن يكون ID أو slug
  options: {
    organizationId?: string;
    includeInactive?: boolean;
    dataScope?: DataScope;
  } = {}
): Promise<ProductCompleteResponse | null> => {

  try {

    const rpcParams = {
      p_product_identifier: productIdentifier,
      p_organization_id: options.organizationId || null,
      p_include_inactive: options.includeInactive || false,
      p_data_scope: options.dataScope || 'basic', // تغيير الافتراضي إلى basic للسرعة
      p_include_large_images: false // 🚀 تحسين: عدم تحميل الصور الضخمة افتراضياً
      // لكن سنحتاج لصور الألوان للمكون ProductVariantSelector - سنحل هذا بطريقة ذكية
    };

    // استدعاء الدالة Ultra Optimized مع timeout محسن
    const startTime = performance.now();
    
        // المحاولة الأولى: dataScope المطلوب مع timeout محسّن للـ ultra
    let rpcCall = supabase.rpc('get_product_complete_data_ultra_optimized' as any, rpcParams);

    // إزالة timeout للـ ultra للسماح لها بإكمال العمل
    let data: any = null;
    let error: any = null;

    try {
      const result = await rpcCall;
      data = result.data;
      error = result.error;
    } catch (rpcErr: any) {
      error = rpcErr;
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
      return await getBasicProductData(productIdentifier, options.organizationId);
    }
    
    // لا نستخدم fallback إلى basic، نعتمد على ultra فقط
    if (error) {
      // لا نحاول basic، نعيد الخطأ كما هو
    }
    
    const executionTime = performance.now() - startTime;

    if (error) {
      throw error; // إرجاع الخطأ مباشرة بدلاً من fallback
    }

    if (!data) {
      return null;
    }

    // التحقق من بنية البيانات المُستلمة
    if (data.success === false) {
      throw new Error(data.error?.message || 'فشل في جلب بيانات المنتج');
    }

    // تحويل البيانات لتتوافق مع النوع المتوقع
    const optimizedResponse: ProductCompleteResponse = {
      success: true,
      data_scope: data.data_scope as DataScope,
      product: data.product as CompleteProduct,
      stats: data.stats,
      meta: {
        ...data.meta,
        performance_info: data.performance_info,
        execution_time: executionTime,
        optimized_version: true
      }
    };

    return optimizedResponse;

  } catch (error: any) {
    const errorMessage = error?.message || 'خطأ غير معروف';

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
const getProductColorImagesOptimized = async (
  productId: string,
  options: {
    includeLargeImages?: boolean;
    maxImageSize?: number; // بالبايت
    imageQuality?: 'thumbnail' | 'standard' | 'full';
  } = {}
): Promise<any> => {
  try {

    const startTime = performance.now();

    const { data, error } = await supabase.rpc('get_product_color_images_optimized' as any, {
      p_product_id: productId,
      p_include_large_images: options.includeLargeImages || false,
      p_max_image_size: options.maxImageSize || 100000, // 100KB افتراضي
      p_image_quality: options.imageQuality || 'standard'
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

    // جلب المنتج الأساسي أولاً
    const baseResult = await getProductCompleteDataOptimized(productIdentifier, {
      ...options,
      dataScope: options.dataScope || 'ultra'
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
        includeLargeImages: true, // السماح بتحميل جميع الصور للألوان
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
