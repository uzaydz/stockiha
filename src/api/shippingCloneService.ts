/**
 * خدمة إدارة نسخ مزودي التوصيل
 * 
 * هذه الخدمة توفر وظائف للتفاعل مع نسخ مزودي التوصيل
 */

// @ts-nocheck // تعطيل فحص الأنواع لهذا الملف بالكامل لتجنب مشاكل Supabase TypeScript

import { supabase } from '@/lib/supabase-client';

// تعريفات الأنواع
export interface ShippingProviderClone {
  id: number;
  organization_id: string;
  original_provider_id: number;
  name: string;
  is_active: boolean;
  is_home_delivery_enabled: boolean;
  is_desk_delivery_enabled: boolean;
  use_unified_price: boolean;
  unified_home_price: number | null;
  unified_desk_price: number | null;
  is_free_delivery_home: boolean;
  is_free_delivery_desk: boolean;
  api_token: string | null;
  api_key: string | null;
  sync_enabled?: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShippingClonePrice {
  id: number;
  clone_id: number;
  province_id: number;
  province_name: string;
  home_price: number | null;
  desk_price: number | null;
}

export interface OriginalShippingProvider {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
  base_url: string | null;
}

export interface ShippingProviderWithClones extends OriginalShippingProvider {
  clones: ShippingProviderClone[];
}

export interface Province {
  id: number;
  name: string;
  is_deliverable: boolean;
}

/**
 * الحصول على قائمة مزودي التوصيل الأصليين مع نسخهم
 * @param organizationId معرف المؤسسة
 * @returns قائمة بمزودي التوصيل الأصليين ونسخهم
 */
export async function getShippingProvidersWithClones(
  organizationId: string
): Promise<ShippingProviderWithClones[]> {
  try {
    // الحصول على مزودي التوصيل الأصليين
    const { data: providers, error: providersError } = await supabase
      .from('shipping_providers')
      .select('*')
      .order('id');
    
    if (providersError) {
      console.error('خطأ في جلب مزودي التوصيل:', providersError);
      return [];
    }
    
    // الحصول على النسخ المستنسخة للمؤسسة المحددة
    const { data: clones, error: clonesError } = await supabase
      .from('shipping_provider_clones')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name');
    
    if (clonesError) {
      console.error('خطأ في جلب نسخ مزودي التوصيل:', clonesError);
      return [];
    }
    
    // دمج البيانات
    const result = providers.map(provider => {
      const providerClones = clones.filter(clone => 
        clone.original_provider_id === provider.id
      );
      
      return {
        ...provider,
        clones: providerClones
      };
    });
    
    return result as ShippingProviderWithClones[];
  } catch (error) {
    console.error('خطأ أثناء جلب مزودي التوصيل ونسخهم:', error);
    return [];
  }
}

/**
 * الحصول على قائمة النسخ المستنسخة للمؤسسة
 * @param organizationId معرف المؤسسة
 * @returns قائمة بالنسخ المستنسخة
 */
export async function getShippingClones(
  organizationId: string
): Promise<ShippingProviderClone[]> {
  try {
    const { data, error } = await supabase
      .from('shipping_provider_clones')
      .select(`
        *,
        shipping_providers:original_provider_id (name, code)
      `)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('name');
    
    if (error) {
      console.error('خطأ في جلب نسخ مزودي التوصيل:', error);
      return [];
    }
    
    return data as ShippingProviderClone[];
  } catch (error) {
    console.error('خطأ أثناء جلب نسخ مزودي التوصيل:', error);
    return [];
  }
}

/**
 * استنساخ مزود توصيل حالي
 * @param organizationId معرف المؤسسة
 * @param originalProviderId معرف مزود التوصيل الأصلي
 * @param newName اسم النسخة الجديدة
 * @param copyApiCredentials نسخ بيانات اعتماد API
 * @param enableSync تفعيل المزامنة
 * @returns معرف النسخة الجديدة
 */
export async function cloneShippingProvider(
  organizationId: string,
  originalProviderId: number,
  newName: string,
  copyApiCredentials: boolean = false,
  enableSync: boolean = false
): Promise<number | null> {
  try {
    // استدعاء دالة استنساخ مزود التوصيل
    const { data, error } = await supabase.rpc('clone_shipping_provider', {
      p_organization_id: organizationId,
      p_original_provider_id: originalProviderId,
      p_new_name: newName,
      p_copy_api_credentials: copyApiCredentials,
      p_enable_sync: enableSync
    });
    
    if (error) {
      console.error('خطأ في استنساخ مزود التوصيل:', error);
      return null;
    }
    
    return data as number;
  } catch (error) {
    console.error('خطأ أثناء استنساخ مزود التوصيل:', error);
    return null;
  }
}

/**
 * الحصول على تفاصيل نسخة مزود توصيل
 * @param cloneId معرف النسخة
 * @returns تفاصيل النسخة
 */
export async function getShippingProviderClone(
  cloneId: number | string | null
): Promise<ShippingProviderClone | null> {
  try {
    if (!cloneId) {
      console.log('>> لم يتم توفير معرف مزود الشحن المستنسخ');
      return null;
    }

    console.log(`>> جاري جلب إعدادات مزود الشحن المستنسخ بمعرف: ${cloneId}`);
    
    const { data, error } = await supabase
      .from('shipping_provider_clones')
      .select(`
        *,
        shipping_providers:original_provider_id (name, code)
      `)
      .eq('id', cloneId)
      .single();
    
    if (error) {
      console.error('خطأ في جلب إعدادات مزود الشحن المستنسخ:', error);
      return null;
    }
    
    console.log(`>> تم العثور على إعدادات مزود الشحن المستنسخ:`, data);
    return data as ShippingProviderClone;
  } catch (error) {
    console.error('خطأ أثناء جلب إعدادات مزود الشحن المستنسخ:', error);
    return null;
  }
}

// إعادة تصدير الدالة بالاسم القديم للحفاظ على التوافق
export const getShippingCloneDetails = getShippingProviderClone;

/**
 * الحصول على أسعار التوصيل لنسخة مزود توصيل
 * @param cloneId معرف النسخة
 * @returns قائمة بأسعار التوصيل
 */
export async function getShippingClonePrices(
  cloneId: number
): Promise<ShippingClonePrice[]> {
  try {
    const { data, error } = await supabase
      .from('shipping_clone_prices')
      .select('*')
      .eq('clone_id', cloneId)
      .order('province_name');
    
    if (error) {
      console.error('خطأ في جلب أسعار التوصيل:', error);
      return [];
    }
    
    return data as ShippingClonePrice[];
  } catch (error) {
    console.error('خطأ أثناء جلب أسعار التوصيل:', error);
    return [];
  }
}

/**
 * تحديث إعدادات نسخة مزود توصيل
 * @param cloneId معرف النسخة
 * @param settings الإعدادات الجديدة
 * @returns نجاح العملية
 */
export async function updateShippingCloneSettings(
  cloneId: number,
  settings: {
    name?: string;
    is_active?: boolean;
    is_home_delivery_enabled?: boolean;
    is_desk_delivery_enabled?: boolean;
    use_unified_price?: boolean;
    unified_home_price?: number | null;
    unified_desk_price?: number | null;
    is_free_delivery_home?: boolean;
    is_free_delivery_desk?: boolean;
    api_token?: string;
    api_key?: string;
    sync_enabled?: boolean;
  }
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('shipping_provider_clones')
      .update(settings)
      .eq('id', cloneId);
    
    if (error) {
      console.error('خطأ في تحديث إعدادات نسخة مزود التوصيل:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('خطأ أثناء تحديث إعدادات نسخة مزود التوصيل:', error);
    return false;
  }
}

/**
 * تحديث أسعار التوصيل لنسخة مزود توصيل
 * @param cloneId معرف النسخة
 * @param prices قائمة بأسعار التوصيل الجديدة
 * @returns نجاح العملية
 */
export async function updateShippingClonePrices(
  cloneId: number,
  prices: Array<{
    province_id: number;
    home_price?: number | null;
    desk_price?: number | null;
  }>
): Promise<boolean> {
  try {
    // تحديث الأسعار واحد تلو الآخر (يمكن تحسين هذا باستخدام عملية جماعية)
    for (const price of prices) {
      const { error } = await supabase
        .from('shipping_clone_prices')
        .update({
          home_price: price.home_price,
          desk_price: price.desk_price
        })
        .eq('clone_id', cloneId)
        .eq('province_id', price.province_id);
      
      if (error) {
        console.error('خطأ في تحديث سعر التوصيل:', error);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('خطأ أثناء تحديث أسعار التوصيل:', error);
    return false;
  }
}

/**
 * تحديث أسعار التوصيل لنسخة مزود توصيل بشكل جماعي
 * @param cloneId معرف النسخة
 * @param prices قائمة بأسعار التوصيل الجديدة
 * @returns نجاح العملية
 */
export async function updateShippingClonePricesBatch(
  cloneId: number,
  prices: Array<{
    province_id: number;
    home_price?: number | null;
    desk_price?: number | null;
  }>
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('update_shipping_clone_prices_batch', {
      p_clone_id: cloneId,
      p_prices: prices
    });
    
    if (error) {
      console.error('خطأ في تحديث أسعار التوصيل بشكل جماعي:', error);
      return false;
    }
    
    return data as boolean;
  } catch (error) {
    console.error('خطأ أثناء تحديث أسعار التوصيل بشكل جماعي:', error);
    return false;
  }
}

/**
 * تحديث إعدادات وأسعار نسخة مزود توصيل في عملية واحدة
 * @param cloneId معرف النسخة
 * @param settings الإعدادات الجديدة
 * @param prices قائمة بأسعار التوصيل الجديدة
 * @returns بيانات النسخة المحدثة
 */
export async function updateShippingCloneWithPrices(
  cloneId: number,
  settings: {
    name?: string;
    is_active?: boolean;
    is_home_delivery_enabled?: boolean;
    is_desk_delivery_enabled?: boolean;
    use_unified_price?: boolean;
    unified_home_price?: number | null;
    unified_desk_price?: number | null;
    is_free_delivery_home?: boolean;
    is_free_delivery_desk?: boolean;
    api_token?: string;
    api_key?: string;
    sync_enabled?: boolean;
  },
  prices: Array<{
    province_id: number;
    home_price?: number | null;
    desk_price?: number | null;
  }>
): Promise<any> {
  try {
    const { data, error } = await supabase.rpc('update_shipping_clone_with_prices', {
      p_clone_id: cloneId,
      p_settings: settings,
      p_prices: prices
    });
    
    if (error) {
      console.error('خطأ في تحديث النسخة مع الأسعار:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('خطأ أثناء تحديث النسخة مع الأسعار:', error);
    return null;
  }
}

/**
 * الحصول على قائمة الولايات
 * @returns قائمة بالولايات
 */
export async function getProvinces(): Promise<Province[]> {
  try {
    const { data, error } = await supabase
      .from('yalidine_provinces_global')
      .select('id, name, is_deliverable')
      .eq('is_deliverable', true)
      .order('name');
    
    if (error) {
      console.error('خطأ في جلب الولايات:', error);
      return [];
    }
    
    return data as Province[];
  } catch (error) {
    console.error('خطأ أثناء جلب الولايات:', error);
    return [];
  }
}

/**
 * ربط منتج بنسخة مزود توصيل
 * @param productId معرف المنتج
 * @param cloneId معرف النسخة
 * @returns نجاح العملية
 */
export async function linkProductToShippingClone(
  productId: string,
  cloneId: number | null
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('products')
      .update({ shipping_clone_id: cloneId })
      .eq('id', productId);
    
    if (error) {
      console.error('خطأ في ربط المنتج بنسخة مزود التوصيل:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('خطأ أثناء ربط المنتج بنسخة مزود التوصيل:', error);
    return false;
  }
}

/**
 * الحصول على خيارات التوصيل لمنتج
 * @param productId معرف المنتج
 * @param provinceId معرف الولاية (اختياري)
 * @returns خيارات التوصيل
 */
export async function getProductShippingOptions(
  productId: string,
  provinceId?: number
): Promise<any> {
  try {
    const { data, error } = await supabase.rpc('get_product_shipping_options', {
      p_product_id: productId,
      p_province_id: provinceId
    });
    
    if (error) {
      console.error('خطأ في جلب خيارات التوصيل للمنتج:', error);
      return { success: false, message: error.message };
    }
    
    return data;
  } catch (error) {
    console.error('خطأ أثناء جلب خيارات التوصيل للمنتج:', error);
    return { success: false, message: 'حدث خطأ في النظام' };
  }
} 