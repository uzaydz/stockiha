// import { supabase } from '@/lib/supabase-client';
import { withCache, LONG_CACHE_TTL, SHORT_CACHE_TTL } from '@/lib/cache/storeCache';
import type { Product, ProductColor, ProductSize } from '@/lib/api/products';
// import { trackedFunctionInvoke, trackedRpc, trackedSupabase } from '@/lib/db-tracker'; // تعطيل هذا مؤقتًا
import { supabase } from '@/lib/supabase-client'; // افتراض وجود هذا الملف وتكوينه بشكل صحيح
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
  const cacheKey = `${CACHE_PREFIX}${organizationId}_${slug}`;

  return withCache<ProductPageData | null>(
    cacheKey,
    async () => {
      try {
        
        // التحقق من صحة المعاملات
        if (!organizationId || !slug) {
          throw new Error('معاملات غير صحيحة: معرف المؤسسة أو slug مفقود');
        }

        const { data: responseData, error: functionError } = await supabase.functions.invoke<ProductPageData>(
          'get-product-page-data',
          {
            body: { slug: slug, organization_id: organizationId },
          }
        );

        if (functionError) {
          
          // معالجة أنواع مختلفة من الأخطاء
          const errorStatus = (functionError as any)?.status;
          const errorMessage = functionError.message || '';
          
          if (errorStatus === 404 || errorMessage.includes('404') || errorMessage.includes('Product not found')) {
            return null; // المنتج غير موجود
          }
          
          if (errorStatus === 500 || errorMessage.includes('500')) {
            throw new Error('خطأ في الخادم. يرجى المحاولة مرة أخرى.');
          }
          
          if (errorStatus === 403 || errorMessage.includes('403')) {
            throw new Error('ليس لديك صلاحية للوصول إلى هذا المنتج.');
          }
          
          if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
            throw new Error('انتهت مهلة الاتصال. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.');
          }
          
          // خطأ عام
          throw new Error(errorMessage || 'حدث خطأ أثناء تحميل بيانات المنتج');
        }

        // التحقق من صحة البيانات المُرجعة
        if (!responseData || typeof responseData !== 'object') {
          throw new Error('تنسيق استجابة غير صحيح من الخادم');
        }
        
        if (!('product' in responseData)) {
          throw new Error('بيانات المنتج مفقودة في الاستجابة');
        }
        
        // إذا كان المنتج null، فهذا يعني أن المنتج غير موجود
        if (responseData.product === null) {
          return null;
        }

        // التحقق من صحة بيانات المنتج
        if (!responseData.product.id) {
          throw new Error('بيانات المنتج غير مكتملة');
        }

        return responseData;
      } catch (error) {
        
        // إعادة رمي الخطأ مع معلومات إضافية إذا لزم الأمر
        if (error instanceof Error) {
          throw error;
        } else {
          throw new Error('خطأ غير متوقع أثناء تحميل بيانات المنتج');
        }
      }
    },
    SHORT_CACHE_TTL,
    true
  );
};

/**
 * جلب بيانات الولايات المتاحة للشحن
 * @param organizationId معرف المؤسسة
 * @returns قائمة الولايات المتاحة
 */
export async function getShippingProvinces(organizationId: string): Promise<Province[]> {
  return withCache<Province[]>(
    `shipping_provinces:${organizationId}`,
    async () => {
      try {
        // استدعاء دالة جلب الولايات الموحدة في قاعدة البيانات
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
    LONG_CACHE_TTL, // 24 ساعة
    true
  );
}

/**
 * جلب بيانات البلديات في ولاية معينة
 * @param wilayaId معرف الولاية
 * @returns قائمة البلديات في الولاية
 */
export async function getShippingMunicipalities(wilayaId: number, organizationId: string): Promise<Municipality[]> {
  return withCache<Municipality[]>(
    `shipping_municipalities:${organizationId}:${wilayaId}`,
    async () => {
      try {
        console.log('🏘️ [getShippingMunicipalities] استدعاء دالة جلب البلديات:', {
          wilayaId,
          organizationId
        });
        
        // التحقق من صحة المعاملات قبل الاستدعاء
        if (!wilayaId || !organizationId) {
          console.error('❌ [getShippingMunicipalities] معاملات غير صالحة:', { wilayaId, organizationId });
          throw new Error('معاملات غير صالحة: wilayaId أو organizationId مفقود');
        }
        
        // استدعاء دالة جلب البلديات الموحدة في قاعدة البيانات
        const { data, error } = await supabase.rpc(
          'get_shipping_municipalities' as any,
          {
            p_wilaya_id: wilayaId,
            p_org_id: organizationId
          }
        );
        
        console.log('📊 [getShippingMunicipalities] نتيجة RPC:', {
          wilayaId,
          organizationId,
          dataType: typeof data,
          isArray: Array.isArray(data),
          dataLength: Array.isArray(data) ? data.length : 'N/A',
          error: error?.message,
          errorDetails: error,
          rawData: data
        });
        
        if (error) {
          console.error('❌ [getShippingMunicipalities] خطأ في RPC:', error);
          throw new Error(`فشل في جلب البلديات: ${error.message}`);
        }
        
        if (!data) {
          console.error('❌ [getShippingMunicipalities] البيانات فارغة من قاعدة البيانات');
          throw new Error('لم يتم إرجاع بيانات من قاعدة البيانات');
        }
        
        const result = (Array.isArray(data) ? data : []) as Municipality[];
        console.log('✅ [getShippingMunicipalities] النتيجة النهائية:', {
          wilayaId,
          count: result.length,
          firstItems: result.slice(0, 3)
        });
        
        if (result.length === 0) {
          console.warn('⚠️ [getShippingMunicipalities] لم يتم العثور على بلديات للولاية:', wilayaId);
          // بدلاً من إرجاع مصفوفة فارغة، تحقق من وجود الولاية في قاعدة البيانات
          console.log('🔍 [getShippingMunicipalities] فحص وجود بيانات في قاعدة البيانات...');
        }
        
        return result;
      } catch (error) {
        console.error('❌ [getShippingMunicipalities] خطأ عام:', error);
        // بدلاً من إرجاع مصفوفة فارغة، أعد الخطأ لمعرفة السبب الحقيقي
        throw error;
      }
    },
    LONG_CACHE_TTL, // 24 ساعة
    true
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
        console.log('💰 [calculateShippingFee] بدء حساب سعر التوصيل:', {
          organizationId,
          toWilayaId,
          toMunicipalityId,
          deliveryType,
          weight,
          shippingProviderCloneId,
          productId
        });
        
        // التحقق من صحة المعاملات
        if (!organizationId || !toWilayaId || !toMunicipalityId || !deliveryType) {
          console.error('❌ [calculateShippingFee] معاملات غير صالحة:', {
            organizationId,
            toWilayaId,
            toMunicipalityId,
            deliveryType
          });
          throw new Error('معاملات الحساب غير صالحة');
        }
        
        // إذا تم توفير معرف مزود الشحن المستنسخ وكان صالحًا، نتحقق أولاً من إعداداته
        if (shippingProviderCloneId !== undefined) {
          try {
            console.log('🔍 [calculateShippingFee] فحص إعدادات مزود الشحن المستنسخ:', shippingProviderCloneId);
            
            // استعلام إعدادات مزود الشحن المستنسخ
            const { data: cloneData, error: cloneError } = await supabase
              .from('shipping_provider_clones')
              .select('*')
              .eq('id', shippingProviderCloneId)
              .single();

            if (cloneData && !cloneError && cloneData.use_unified_price === true) {
              console.log('💡 [calculateShippingFee] استخدام الأسعار الموحدة:', {
                unified_home_price: cloneData.unified_home_price,
                unified_desk_price: cloneData.unified_desk_price,
                deliveryType
              });

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
            console.warn('⚠️ [calculateShippingFee] تعذر جلب إعدادات مزود الشحن المستنسخ:', cloneError);
            // استمر في المعالجة العادية في حالة حدوث خطأ
          }
        }
        
        // التحقق من شركات التوصيل المربوطة بالمنتج لمعرفة إذا كانت Ecotrack
        if (productId) {
          try {
            console.log('🔍 [calculateShippingFee] فحص شركة التوصيل المربوطة بالمنتج:', productId);
            
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
                console.log('🌿 [calculateShippingFee] محاولة استخدام Ecotrack API لحساب السعر');
                
                const ecotrackResult = await calculateEcotrackShippingPrice(
                  organizationId,
                  providerData.code,
                  toWilayaId.toString(),
                  deliveryType
                );
                
                if (ecotrackResult.success) {
                  console.log('✅ [calculateShippingFee] نجح حساب السعر باستخدام Ecotrack:', ecotrackResult.price);
                  return ecotrackResult.price;
                } else {
                  console.warn('⚠️ [calculateShippingFee] فشل Ecotrack، العودة للطريقة التقليدية:', ecotrackResult.error);
                }
              }
            }
          } catch (ecotrackError) {
            console.warn('⚠️ [calculateShippingFee] خطأ في محاولة Ecotrack، العودة للطريقة التقليدية:', ecotrackError);
          }
        }
        
        console.log('📞 [calculateShippingFee] استدعاء دالة قاعدة البيانات calculate_shipping_fee');
        
        // استدعاء دالة حساب رسوم الشحن الموحدة في قاعدة البيانات
        const { data, error } = await supabase.rpc(
          'calculate_shipping_fee' as any,
          {
            p_org_id: organizationId,
            p_to_wilaya_id: toWilayaId,
            p_to_municipality_id: toMunicipalityId,
            p_delivery_type: deliveryType,
            p_weight: weight
          }
        );
        
        console.log('📊 [calculateShippingFee] نتيجة حساب السعر:', {
          data,
          error: error?.message,
          errorDetails: error,
          dataType: typeof data
        });
        
        if (error) {
          console.error('❌ [calculateShippingFee] خطأ في حساب السعر:', error);
          throw new Error(`فشل في حساب سعر التوصيل: ${error.message}`);
        }
        
        const calculatedFee = typeof data === 'number' ? data : 0;
        console.log('✅ [calculateShippingFee] السعر المحسوب:', calculatedFee);
        
        // التعامل مع النتيجة 0 - الدالة الجديدة ترجع 0 عندما لا تجد بيانات
        if (calculatedFee === 0) {
          console.error('❌ [calculateShippingFee] لم يتم العثور على أسعار شحن لهذه الوجهة:', {
            organizationId,
            toWilayaId,
            toMunicipalityId,
            deliveryType,
            message: 'الدالة الجديدة ترجع 0 عندما لا تجد بيانات في قاعدة البيانات'
          });
          
          // رفع خطأ واضح عندما لا تتوفر أسعار شحن
          throw new Error(`عذراً، لا تتوفر أسعار شحن للولاية والبلدية المحددة. يرجى التواصل مع خدمة العملاء أو اختيار وجهة أخرى.`);
        }
        
        return calculatedFee;
      } catch (error) {
        console.error('❌ [calculateShippingFee] خطأ عام في حساب السعر:', error);
        // بدلاً من إرجاع 0، أعد رفع الخطأ لمعرفة السبب الحقيقي
        throw error;
      }
    },
    60000, // دقيقة واحدة فقط للتخزين المؤقت
    true
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
    'negmar_express',
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
  try {
    console.log('🌿 [calculateEcotrackShippingPrice] بدء حساب سعر Ecotrack:', {
      organizationId,
      providerCode,
      wilayaId,
      deliveryType
    });

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
      console.error('❌ [calculateEcotrackShippingPrice] لا توجد إعدادات للشركة:', settingsError);
      return {
        success: false,
        price: 0,
        error: 'لا توجد إعدادات لشركة التوصيل'
      };
    }

    const { api_token, shipping_providers } = providerSettings;
    const baseUrl = shipping_providers.base_url;

    if (!api_token) {
      console.error('❌ [calculateEcotrackShippingPrice] لا يوجد API token');
      return {
        success: false,
        price: 0,
        error: 'لا يوجد API token للشركة'
      };
    }

    console.log('🔗 [calculateEcotrackShippingPrice] إعدادات الشركة:', {
      baseUrl,
      hasToken: !!api_token
    });

    // Call Ecotrack API
    const response = await fetch(`${baseUrl}/api/v1/get/fees?to_wilaya_id=${wilayaId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${api_token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📡 [calculateEcotrackShippingPrice] استجابة API:', {
      status: response.status,
      statusText: response.statusText
    });

    if (!response.ok) {
      console.error('❌ [calculateEcotrackShippingPrice] خطأ HTTP:', response.status);
      return {
        success: false,
        price: 0,
        error: `خطأ في API: ${response.status}`
      };
    }

    const data = await response.json();
    console.log('📊 [calculateEcotrackShippingPrice] بيانات الاستجابة:', data);

    if (data.success && data.data && data.data.length > 0) {
      const rate = data.data[0];
      let price = 0;

      if (deliveryType === 'home') {
        price = parseFloat(rate.price_domicile || rate.price_local || '0');
      } else {
        price = parseFloat(rate.price_local || rate.price_domicile || '0');
      }

      console.log('✅ [calculateEcotrackShippingPrice] السعر المحسوب:', {
        deliveryType,
        price_domicile: rate.price_domicile,
        price_local: rate.price_local,
        finalPrice: price
      });

      return {
        success: true,
        price: price
      };
    }

    console.warn('⚠️ [calculateEcotrackShippingPrice] لا توجد أسعار متاحة');
    return {
      success: false,
      price: 0,
      error: 'لا توجد أسعار متاحة لهذه الولاية'
    };

  } catch (error) {
    console.error('❌ [calculateEcotrackShippingPrice] خطأ في الحساب:', error);
    return {
      success: false,
      price: 0,
      error: error instanceof Error ? error.message : 'خطأ غير معروف'
    };
  }
};
