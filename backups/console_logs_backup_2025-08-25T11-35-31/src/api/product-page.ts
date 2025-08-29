// import { supabase } from '@/lib/supabase-client';
import { withCache, LONG_CACHE_TTL, SHORT_CACHE_TTL } from '@/lib/cache/storeCache';
// تم إزالة requestCache لتحسين الأداء
// import { requestCache, createCacheKey } from '@/lib/cache/requestCache';
import type { Product, ProductColor, ProductSize } from '@/lib/api/products';
// import { trackedFunctionInvoke, trackedRpc, trackedSupabase } from '@/lib/db-tracker'; // تعطيل هذا مؤقتًا
import { getSupabaseClient } from '@/lib/supabase-client'; // افتراض وجود هذا الملف وتكوينه بشكل صحيح
import { getProductCompleteDataOptimized } from '@/lib/api/productCompleteOptimized';
// import { FormSettings, CustomFormField } from '@/components/store/order-form/OrderFormTypes';
import type { ExtendedFormSettings } from '@/components/store/product-purchase/ProductStateHooks'; // افتراض وجود هذا النوع

// واجهة بيانات الولايات
export interface Province {
  id: number;
  name: string;
  is_deliverable: boolean;
  desk_fee: number;
  zone: number;
}

// واجهة بيانات البلديات
export interface Municipality {
  id: number;
  name: string;
  wilaya_id: number;
  is_deliverable: boolean;
  has_stop_desk: boolean;
}

// تعريف نوع لإعدادات التسويق للمنتج بناءً على الأعمدة المعروفة
export interface ProductMarketingSettings {
  id: string;
  product_id: string;
  organization_id: string;
  offer_timer_enabled?: boolean | null;
  offer_timer_title?: string | null;
  offer_timer_type?: string | null;
  offer_timer_duration_minutes?: number | null;
  offer_timer_end_date?: string | null; // أو Date
  offer_timer_text_above?: string | null;
  offer_timer_text_below?: string | null;
  offer_timer_display_style?: string | null;
  offer_timer_end_action?: string | null;
  offer_timer_end_action_url?: string | null;
  offer_timer_end_action_message?: string | null;
  offer_timer_restart_for_new_session?: boolean | null;
  offer_timer_cookie_duration_days?: number | null;
  offer_timer_show_on_specific_pages_only?: boolean | null;
  offer_timer_specific_page_urls?: string[] | null;
  enable_reviews?: boolean | null;
  reviews_verify_purchase?: boolean | null;
  reviews_auto_approve?: boolean |null;
  allow_images_in_reviews?: boolean | null;
  enable_review_replies?: boolean | null;
  review_display_style?: string | null;
  enable_fake_star_ratings?: boolean | null;
  fake_star_rating_value?: number | null;
  fake_star_rating_count?: number | null;
  enable_fake_purchase_counter?: boolean | null;
  fake_purchase_count?: number | null;
  enable_facebook_pixel?: boolean | null;
  facebook_pixel_id?: string | null;
  enable_tiktok_pixel?: boolean | null;
  tiktok_pixel_id?: string | null;
  enable_snapchat_pixel?: boolean | null;
  snapchat_pixel_id?: string | null;
  enable_google_ads_tracking?: boolean | null;
  google_ads_conversion_id?: string | null;
  created_at: string; // أو Date
  updated_at: string; // أو Date
  // أضف أي حقول أخرى ضرورية من مخططك
}

// تعريف نوع لمراجعات المنتج بناءً على الأعمدة المعروفة
export interface ProductReview {
  id: string;
  product_id: string;
  user_id: string; // كان customer_name سابقًا، الآن هو user_id
  organization_id?: string; // إذا كان موجودًا ومطلوبًا
  rating: number;
  comment: string | null;
  images?: any[] | null; // أو نوع أكثر تحديدًا إذا كانت الصور لها بنية معينة
  is_verified_purchase?: boolean | null;
  is_approved: boolean;
  admin_reply_text?: string | null;
  created_at: string; // أو Date
  // أضف أي حقول أخرى ضرورية
}

// تعريف النوع الذي تُرجعه الدالة الطرفية الآن
export interface ProductPageData {
  product: Product | null; // المنتج يمكن أن يكون null إذا لم يتم العثور عليه
  colors: ProductColor[];
  sizes: ProductSize[];
  form_settings: ExtendedFormSettings | null;
  marketing_settings: ProductMarketingSettings | null;
  reviews: ProductReview[];
}

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 ساعة بالمللي ثانية
const CACHE_PREFIX = 'product_page_';

/**
 * جلب بيانات المنتج الكاملة لصفحة الشراء
 * @param organizationId معرف المؤسسة
 * @param slug رابط المنتج المختصر
 * @returns كائن ProductPageData يحتوي على كل بيانات الصفحة أو null
 */
export const getProductPageData = async (organizationId: string, slug: string): Promise<ProductPageData | null> => {
  
  const cacheKey = `product_page_${organizationId}_${slug}`;

  return withCache(
    cacheKey,
    async () => {
      try {
        
        // التحقق من صحة المعاملات
        if (!organizationId || !slug) {
          throw new Error('معاملات غير صحيحة: معرف المؤسسة أو slug مفقود');
        }

        const startTime = Date.now();
        console.log(`🚀 [getProductPageData] بدء جلب بيانات المنتج: ${slug}`);

        const supabase = getSupabaseClient();
        
        // استخدام الدالة المحسنة مع fallback تلقائي
        const rpcData = await getProductCompleteDataOptimized(slug, {
          organizationId,
          dataScope: 'full',
          includeInactive: false
        });

        const endTime = Date.now();
        console.log(`✅ [getProductPageData] تم جلب البيانات بنجاح في ${endTime - startTime}ms`);

        if (!rpcData) {
          throw new Error('لم يتم إرجاع بيانات من قاعدة البيانات');
        }

        // التحقق من نجاح العملية
        if (!rpcData.success) {
          if (rpcData.error?.code === 'PRODUCT_NOT_FOUND') {
            console.log(`❌ [getProductPageData] المنتج غير موجود: ${slug}`);
            return null;
          }
          throw new Error(rpcData.error?.message || 'فشل في جلب بيانات المنتج');
        }

        // تنسيق البيانات للتوافق مع ProductPageData
        const formattedData: ProductPageData = {
          product: rpcData.product as any || null,
          colors: [], // سيتم جلبها من مصدر آخر
          sizes: [], // سيتم جلبها من مصدر آخر
          form_settings: null, // سيتم جلبها من مصدر آخر
          marketing_settings: null, // سيتم جلبها من مصدر آخر
          reviews: [], // سيتم جلبها من مصدر آخر
        };

        // التحقق من صحة البيانات
        if (!formattedData.product || !formattedData.product.id) {
          console.log(`❌ [getProductPageData] بيانات المنتج غير مكتملة: ${slug}`);
          return null;
        }

        console.log(`✅ [getProductPageData] تم جلب المنتج بنجاح من Ultra Optimized: ${formattedData.product.name}`);
        return formattedData;

      } catch (error) {
        console.error('❌ [getProductPageData] خطأ نهائي:', error);
        
        // إعادة رمي الخطأ مع معلومات إضافية
        if (error instanceof Error) {
          throw error;
        } else {
          throw new Error('خطأ غير متوقع أثناء تحميل بيانات المنتج');
        }
      }
    },
    SHORT_CACHE_TTL
  );
};

/**
 * جلب بيانات الولايات المتاحة للشحن - مع تخزين مؤقت محسّن
 * @param organizationId معرف المؤسسة
 * @returns قائمة الولايات المتاحة
 */
export async function getShippingProvinces(organizationId: string): Promise<Province[]> {
  const cacheKey = `shipping_provinces_${organizationId}`;
  
  return withCache(
    cacheKey,
    async () => {
      try {
        // استدعاء دالة جلب الولايات الموحدة في قاعدة البيانات
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.rpc(
          'get_shipping_provinces' as any,
          {
            p_org_id: organizationId
          }
        );
        
        if (error) {
          return [];
        }
        
        return (Array.isArray(data) ? data : []) as Province[];
      } catch (error) {
        return [];
      }
    },
    LONG_CACHE_TTL // 24 ساعة
  );
}

/**
 * جلب بيانات البلديات في ولاية معينة - مع تخزين مؤقت محسّن
 * @param wilayaId معرف الولاية
 * @returns قائمة البلديات في الولاية
 */
export async function getShippingMunicipalities(wilayaId: number, organizationId: string): Promise<Municipality[]> {
  const cacheKey = `shipping_municipalities_${organizationId}_${wilayaId}`;
  
  return withCache(
    cacheKey,
    async () => {
      try {
        
        // التحقق من صحة المعاملات قبل الاستدعاء
        if (!wilayaId || !organizationId) {
          throw new Error('معاملات غير صالحة: wilayaId أو organizationId مفقود');
        }
        
        // استدعاء دالة جلب البلديات الموحدة في قاعدة البيانات
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.rpc(
          'get_shipping_municipalities' as any,
          {
            p_wilaya_id: wilayaId,
            p_org_id: organizationId
          }
        );

        if (error) {
          throw new Error(`فشل في جلب البلديات: ${error.message}`);
        }
        
        if (!data) {
          throw new Error('لم يتم إرجاع بيانات من قاعدة البيانات');
        }
        
        const result = (Array.isArray(data) ? data : []) as Municipality[];
        
        if (result.length === 0) {
          // بدلاً من إرجاع مصفوفة فارغة، تحقق من وجود الولاية في قاعدة البيانات
        }
        
        return result;
      } catch (error) {
        // بدلاً من إرجاع مصفوفة فارغة، أعد الخطأ لمعرفة السبب الحقيقي
        throw error;
      }
    },
    LONG_CACHE_TTL // 24 ساعة
  );
}

/**
 * حساب سعر التوصيل
 * @param organizationId معرف المؤسسة
 * @param toWilayaId معرف الولاية المستهدفة
 * @param toMunicipalityId معرف البلدية المستهدفة
 * @param deliveryType نوع التوصيل ('home' أو 'desk')
 * @param weight الوزن المقدر (كغم)
 * @param shippingProviderCloneIdInput معرف مزود الشحن المستنسخ (اختياري)
 * @param productId معرف المنتج لفحص شركة التوصيل المربوطة (اختياري)
 * @returns سعر التوصيل
 */
export async function calculateShippingFee(
  organizationId: string,
  toWilayaId: number,
  toMunicipalityId: number,
  deliveryType: 'home' | 'desk',
  weight: number,
  shippingProviderCloneIdInput?: string | number,
  productId?: string
): Promise<number> {
  const supabase = getSupabaseClient();
  
  // تحويل ومعالجة shippingProviderCloneIdInput
  let shippingProviderCloneId: number | undefined = undefined;
  if (shippingProviderCloneIdInput !== null && shippingProviderCloneIdInput !== undefined && shippingProviderCloneIdInput !== '') {
    const numId = Number(shippingProviderCloneIdInput);
    if (!isNaN(numId)) {
      shippingProviderCloneId = numId;
    }
  }

  return withCache<number>(
    `shipping_fee:${organizationId}:${toWilayaId}:${toMunicipalityId}:${deliveryType}:${weight}:${shippingProviderCloneId || ''}:${productId || ''}`,
    async () => {
      try {
        
        // التحقق من صحة المعاملات
        if (!organizationId || !toWilayaId || !toMunicipalityId || !deliveryType) {
          throw new Error('معاملات الحساب غير صالحة');
        }
        
        // إذا تم توفير معرف مزود الشحن المستنسخ وكان صالحًا، نتحقق أولاً من إعداداته
        if (shippingProviderCloneId !== undefined) {
          try {
            
            // استعلام إعدادات مزود الشحن المستنسخ
            const { data: cloneData, error: cloneError } = await supabase
              .from('shipping_provider_clones')
              .select('*')
              .eq('id', shippingProviderCloneId)
              .single();

            if (cloneData && !cloneError && cloneData.use_unified_price === true) {

              // استخدام سعر موحد حسب نوع التوصيل
              if (deliveryType === 'home' && typeof cloneData.unified_home_price === 'number') {
                return cloneData.unified_home_price;
              } else if (deliveryType === 'desk' && typeof cloneData.unified_desk_price === 'number') {
                return cloneData.unified_desk_price;
              }

              // إذا كان التوصيل للمنزل غير مفعل، استخدم سعر الاستلام من المكتب كاحتياط
              if (deliveryType === 'home' && cloneData.is_home_delivery_enabled === false && typeof cloneData.unified_desk_price === 'number') {
                return cloneData.unified_desk_price;
              }
              
              // إذا كان الاستلام من المكتب غير مفعل، استخدم سعر التوصيل للمنزل كاحتياط
              if (deliveryType === 'desk' && cloneData.is_desk_delivery_enabled === false && typeof cloneData.unified_home_price === 'number') {
                return cloneData.unified_home_price;
              }
            }
          } catch (cloneError) {
            // استمر في المعالجة العادية في حالة حدوث خطأ
          }
        }
        
        // التحقق من شركات التوصيل المربوطة بالمنتج لمعرفة إذا كانت Ecotrack
        if (productId) {
          try {
            
            const { data: productData } = await supabase
              .from('products')
              .select('shipping_provider_id')
              .eq('id', productId)
              .eq('organization_id', organizationId)
              .single();
              
            if (productData?.shipping_provider_id) {
              const { data: providerData } = await supabase
                .from('shipping_providers')
                .select('code')
                .eq('id', productData.shipping_provider_id)
                .single();
                
              if (providerData && isEcotrackProvider(providerData.code)) {
                
                const ecotrackResult = await calculateEcotrackShippingPrice(
                  organizationId,
                  providerData.code,
                  toWilayaId.toString(),
                  deliveryType
                );
                
                if (ecotrackResult.success) {
                  return ecotrackResult.price;
                } else {
                }
              }
            }
          } catch (ecotrackError) {
          }
        }

        // استدعاء دالة حساب رسوم الشحن الموحدة في قاعدة البيانات
        // تحويل الوزن إلى عدد صحيح لحل مشكلة التعارض في أنواع البيانات
        const { data, error } = await supabase.rpc(
          'calculate_shipping_fee' as any,
          {
            p_org_id: organizationId,
            p_to_wilaya_id: toWilayaId,
            p_to_municipality_id: toMunicipalityId,
            p_delivery_type: deliveryType,
            p_weight: Math.round(weight) // تحويل إلى عدد صحيح
          }
        );

        if (error) {
          throw new Error(`فشل في حساب سعر التوصيل: ${error.message}`);
        }
        
        const calculatedFee = typeof data === 'number' ? data : 0;
        
        // التعامل مع النتيجة 0 - الدالة الجديدة ترجع 0 عندما لا تجد بيانات
        if (calculatedFee === 0) {
          
          // رفع خطأ واضح عندما لا تتوفر أسعار شحن
          throw new Error(`عذراً، لا تتوفر أسعار شحن للولاية والبلدية المحددة. يرجى التواصل مع خدمة العملاء أو اختيار وجهة أخرى.`);
        }
        
        return calculatedFee;
      } catch (error) {
        // بدلاً من إرجاع 0، أعد رفع الخطأ لمعرفة السبب الحقيقي
        throw error;
      }
    },
    60000 // دقيقة واحدة فقط للتخزين المؤقت
  );
}

/**
 * تحديث بيانات صفحة المنتج في التخزين المؤقت
 * @param organizationId معرف المؤسسة
 * @param slug رابط المنتج المختصر
 */
export const refreshProductPageData = async (organizationId: string, slug: string): Promise<void> => {
  const cacheKey = `${CACHE_PREFIX}${organizationId}_${slug}`;
  
  // حذف التخزين المؤقت الحالي
  localStorage.removeItem(cacheKey);
  
  // إعادة تحميل البيانات الجديدة وتخزينها مؤقتاً
  // await getProductPageData(organizationId, slug); // لا حاجة لتتبع هذا الاستدعاء بشكل منفصل هنا لأنه يُتبع داخل getProductPageData
  await getProductPageData(organizationId, slug);
};

// Helper function to check if provider is Ecotrack-based
const isEcotrackProvider = (providerCode: string): boolean => {
  const ecotrackProviders = [
    'ecotrack',
    'anderson_delivery',
    'areex', 
    'ba_consult',
    'conexlog',
    'coyote_express',
    'dhd',
    'distazero',
    'e48hr_livraison',
    'fretdirect',
    'golivri',
    'mono_hub',
    'msm_go',
    'imir_express',
    'packers',
    'prest',
    'rb_livraison',
    'rex_livraison',
    'rocket_delivery',
    'salva_delivery',
    'speed_delivery',
    'tsl_express',
    'worldexpress'
  ];
  
  return ecotrackProviders.includes(providerCode);
};

// Function to calculate Ecotrack shipping prices
const calculateEcotrackShippingPrice = async (
  organizationId: string,
  providerCode: string,
  wilayaId: string,
  deliveryType: 'home' | 'desk'
): Promise<{ success: boolean; price: number; error?: string }> => {
  const supabase = getSupabaseClient();
  
  try {

    // Get provider settings
    const { data: providerSettings, error: settingsError } = await supabase
      .from('shipping_provider_settings')
      .select(`
        *,
        shipping_providers!inner(code, base_url)
      `)
      .eq('organization_id', organizationId)
      .eq('shipping_providers.code', providerCode)
      .eq('is_enabled', true)
      .single();

    if (settingsError || !providerSettings) {
      return {
        success: false,
        price: 0,
        error: 'لا توجد إعدادات لشركة التوصيل'
      };
    }

    const { api_token, shipping_providers } = providerSettings;
    const baseUrl = shipping_providers.base_url;

    if (!api_token) {
      return {
        success: false,
        price: 0,
        error: 'لا يوجد API token للشركة'
      };
    }

    // Call Ecotrack API
    // إزالة slash مضاعف في حالة انتهاء baseUrl بـ slash
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const response = await fetch(`${cleanBaseUrl}/api/v1/get/fees?to_wilaya_id=${wilayaId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${api_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return {
        success: false,
        price: 0,
        error: `خطأ في API: ${response.status}`
      };
    }

    const data = await response.json();

    // التحقق من البنية الصحيحة للبيانات المُرجعة من Ecotrack
    if (data && data.livraison && Array.isArray(data.livraison) && data.livraison.length > 0) {
      let price = 0;
      const rates = data.livraison;

      // البحث عن السعر في الولاية المطلوبة
      const wilayaRate = rates.find((rate: any) => 
        rate.wilaya_id === parseInt(wilayaId) || 
        rate.wilaya_id === wilayaId
      );

      if (wilayaRate) {
        // اختيار السعر المناسب حسب نوع التوصيل
        if (deliveryType === 'home') {
          // سعر التوصيل للمنزل
          price = parseFloat(wilayaRate.tarif || '0');
        } else {
          // سعر التوصيل للمكتب (stop desk)
          price = parseFloat(wilayaRate.tarif_stopdesk || wilayaRate.tarif || '0');
        }

        return {
          success: true,
          price: price
        };
      } else {
        // إذا لم نجد السعر للولاية المحددة، نأخذ السعر الأول كقيمة افتراضية
        const firstRate = rates[0];
        if (deliveryType === 'home') {
          price = parseFloat(firstRate.tarif || '0');
        } else {
          price = parseFloat(firstRate.tarif_stopdesk || firstRate.tarif || '0');
        }

        return {
          success: true,
          price: price
        };
      }
    }

    // التحقق من البنية القديمة للتوافق مع أي APIs قديمة
    if (data.success && data.data && data.data.length > 0) {
      const rate = data.data[0];
      let price = 0;

      if (deliveryType === 'home') {
        price = parseFloat(rate.price_domicile || rate.price_local || '0');
      } else {
        price = parseFloat(rate.price_local || rate.price_domicile || '0');
      }

      return {
        success: true,
        price: price
      };
    }

    return {
      success: false,
      price: 0,
      error: 'لا توجد أسعار متاحة لهذه الولاية'
    };

  } catch (error) {
    return {
      success: false,
      price: 0,
      error: error instanceof Error ? error.message : 'خطأ غير معروف'
    };
  }
};
