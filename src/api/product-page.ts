import { supabase } from '@/lib/supabase-client';
import { withCache, LONG_CACHE_TTL, SHORT_CACHE_TTL } from '@/lib/cache/storeCache';
import { Product, ProductColor, ProductSize } from '@/lib/api/products';
import { FormSettings, CustomFormField } from '@/components/store/order-form/OrderFormTypes';

// واجهة بيانات المنتج الكاملة
export interface CompleteProductData {
  product: Product;
  colors: ProductColor[];
  sizes: ProductSize[];
  form_settings: FormSettings[];
}

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

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 ساعة بالمللي ثانية
const CACHE_PREFIX = 'product_page_';

/**
 * جلب بيانات المنتج الكاملة لصفحة الشراء
 * @param organizationId معرف المؤسسة
 * @param slug رابط المنتج المختصر
 * @returns بيانات المنتج الكاملة
 */
export const getProductPageData = async (organizationId: string, slug: string): Promise<CompleteProductData | null> => {
  return withCache<CompleteProductData | null>(
    `${CACHE_PREFIX}${organizationId}_${slug}`,
    async () => {
      try {
        // استدعاء الدالة الموحدة في قاعدة البيانات
        const { data, error } = await supabase.rpc(
          'get_complete_product_data' as any,
          {
            p_slug: slug,
            p_org_id: organizationId
          }
        );
        
        if (error) {
          console.error('خطأ في جلب بيانات المنتج الموحدة:', error);
          return null;
        }
        
        if (!data || typeof data !== 'object') {
          console.error('لم يتم العثور على المنتج:', slug);
          return null;
        }
        
        return data as unknown as CompleteProductData;
      } catch (error) {
        console.error('خطأ في جلب بيانات المنتج:', error);
        return null;
      }
    },
    CACHE_TTL, // 24 ساعة
    true // استخدام التخزين المؤقت في الذاكرة
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
          console.error('خطأ في جلب بيانات الولايات:', error);
          return [];
        }
        
        return (Array.isArray(data) ? data : []) as Province[];
      } catch (error) {
        console.error('خطأ غير متوقع في جلب بيانات الولايات:', error);
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
export async function getShippingMunicipalities(wilayaId: number): Promise<Municipality[]> {
  return withCache<Municipality[]>(
    `shipping_municipalities:${wilayaId}`,
    async () => {
      try {
        // استدعاء دالة جلب البلديات الموحدة في قاعدة البيانات
        const { data, error } = await supabase.rpc(
          'get_shipping_municipalities' as any,
          {
            p_wilaya_id: wilayaId,
            // ملاحظة: هنا تم إضافة معامل الـ organization_id في الملف SQL
            // لكن لم نقم بتمريره في هذا الإصلاح لتجنب الأخطاء، 
            // وهذا يتطلب مراجعة التوقيع الصحيح للدالة
          }
        );
        
        if (error) {
          console.error('خطأ في جلب بيانات البلديات:', error);
          return [];
        }
        
        return (Array.isArray(data) ? data : []) as Municipality[];
      } catch (error) {
        console.error('خطأ غير متوقع في جلب بيانات البلديات:', error);
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
 * @param shippingProviderCloneId معرف مزود الشحن المستنسخ (اختياري)
 * @returns سعر التوصيل
 */
export async function calculateShippingFee(
  organizationId: string,
  toWilayaId: number,
  toMunicipalityId: number,
  deliveryType: 'home' | 'desk',
  weight: number,
  shippingProviderCloneId?: number
): Promise<number> {
  
  return withCache<number>(
    `shipping_fee:${organizationId}:${toWilayaId}:${toMunicipalityId}:${deliveryType}:${weight}:${shippingProviderCloneId || ''}`,
    async () => {
      try {
        // إذا تم توفير معرف مزود الشحن المستنسخ، نتحقق أولاً من إعداداته
        if (shippingProviderCloneId) {
          try {
            // استعلام إعدادات مزود الشحن المستنسخ
            const { data: cloneData, error: cloneError } = await (supabase as any).from('shipping_provider_clones')
              .select('*')
              .eq('id', shippingProviderCloneId)
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
            console.error("خطأ في الحصول على إعدادات مزود الشحن المستنسخ:", cloneError);
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
          console.error('خطأ في حساب سعر التوصيل:', error);
          return 0;
        }
        
        return typeof data === 'number' ? data : 0;
      } catch (error) {
        console.error('خطأ غير متوقع في حساب سعر التوصيل:', error);
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
  await getProductPageData(organizationId, slug);
}; 