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
        // استدعاء دالة جلب البلديات الموحدة في قاعدة البيانات
        const { data, error } = await supabase.rpc(
          'get_shipping_municipalities' as any,
          {
            p_wilaya_id: wilayaId,
            p_org_id: organizationId
          }
        );
        
        if (error) {
          return [];
        }
        
        return (Array.isArray(data) ? data : []) as Municipality[];
      } catch (error) {
        return [];
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
 * @returns سعر التوصيل
 */
export async function calculateShippingFee(
  organizationId: string,
  toWilayaId: number,
  toMunicipalityId: number,
  deliveryType: 'home' | 'desk',
  weight: number,
  shippingProviderCloneIdInput?: string | number
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
    `shipping_fee:${organizationId}:${toWilayaId}:${toMunicipalityId}:${deliveryType}:${weight}:${shippingProviderCloneId || ''}`,
    async () => {
      try {
        // إذا تم توفير معرف مزود الشحن المستنسخ وكان صالحًا، نتحقق أولاً من إعداداته
        if (shippingProviderCloneId !== undefined) { // التحقق من أنه رقم صالح
          try {
            // استعلام إعدادات مزود الشحن المستنسخ
            const { data: cloneData, error: cloneError } = await supabase
              .from('shipping_provider_clones')
              .select('*')
              .eq('id', shippingProviderCloneId) // الآن shippingProviderCloneId هو رقم بالتأكيد
              .single();

            // إذا تم العثور على الإعدادات وكان استخدام الأسعار الموحدة مفعلاً
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
        
        if (error) {
          return 0;
        }
        
        return typeof data === 'number' ? data : 0;
      } catch (error) {
        return 0;
      }
    },
    SHORT_CACHE_TTL, // 5 دقائق
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
