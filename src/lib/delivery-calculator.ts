import { yalidineProvinces } from '@/data/yalidine-provinces';
import { yalidineMunicipalities, getMunicipalitiesByWilayaId, YalidineMunicipality } from '@/data/yalidine-municipalities-complete';
import { calculateDeliveryPrice, getYalidineSettingsForProductPurchase } from '@/api/yalidine/service';

// Cache للإعدادات والأسعار لتجنب الطلبات المتكررة
const settingsCache = new Map<string, { data: any; timestamp: number }>();
const priceCache = new Map<string, { price: number; timestamp: number }>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 دقيقة

/**
 * تنظيف الـ Cache المنتهي الصلاحية
 */
function cleanExpiredCache() {
  const now = Date.now();
  
  // تنظيف cache الإعدادات
  for (const [key, value] of settingsCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      settingsCache.delete(key);
    }
  }
  
  // تنظيف cache الأسعار
  for (const [key, value] of priceCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      priceCache.delete(key);
    }
  }
}

// تنظيف الـ Cache كل 10 دقائق
setInterval(cleanExpiredCache, 10 * 60 * 1000);

/**
 * مسح جميع الـ Cache (للاستخدام عند الحاجة)
 */
export function clearDeliveryCache() {
  settingsCache.clear();
  priceCache.clear();
}

/**
 * مسح cache الأسعار لمسار ونوع توصيل محدد
 */
export function clearSpecificPriceCache(
  originWilayaId: number,
  toWilayaId: number,
  deliveryType: 'home' | 'desk',
  weight: number = 1
) {
  const priceCacheKey = `price_${originWilayaId}_${toWilayaId}_${deliveryType}_${weight}`;
  const deleted = priceCache.delete(priceCacheKey);
}

/**
 * أنواع البيانات لحساب التوصيل
 */
export interface DeliveryCalculationInput {
  organizationId: string;
  selectedProvinceId?: string;
  selectedMunicipalityId?: string;
  deliveryType: 'home' | 'desk';
  weight?: number;
  productPrice?: number;
  quantity?: number;
  shippingProvider?: {
    id?: string;
    name?: string;
    code?: string;
    type?: 'yalidine' | 'zrexpress' | 'ecotrack' | 'custom' | 'clone';
    settings?: any;
  };
  productShippingInfo?: {
    type: 'clone' | 'provider';
    id: number;
    name: string;
    original_provider?: string;
    code?: string;
    unified_price?: boolean;
    home_price?: number;
    desk_price?: number;
  };
}

export interface DeliveryCalculationResult {
  selectedProvince: {
    id: number;
    name: string;
    name_ar?: string;
  } | null;
  selectedMunicipality: YalidineMunicipality | null;
  deliveryType: 'home' | 'desk';
  deliveryFee: number;
  isLoading: boolean;
  error?: string;
  shippingProvider?: {
    name: string;
    code?: string;
    logo?: string;
  };
  calculationMethod: 'yalidine_api' | 'local_data' | 'fallback' | 'zrexpress_estimated' | 'ecotrack_estimated' | 'clone_unified_price' | 'zrexpress_api' | 'zrexpress_database' | 'ecotrack_api' | 'custom_shipping';
  debugInfo?: {
    weight: number;
    basePrice: number;
    oversizeCharge: number;
  };
}

/**
 * الحصول على بيانات الولاية من الملف الثابت
 */
export function getProvinceById(provinceId: string | number): typeof yalidineProvinces[0] | null {
  const id = typeof provinceId === 'string' ? parseInt(provinceId) : provinceId;
  return yalidineProvinces.find(province => province.id === id) || null;
}

/**
 * الحصول على بيانات البلدية من الملف الثابت
 */
export function getMunicipalityById(
  municipalityId: string | number, 
  provinceId?: string | number
): YalidineMunicipality | null {
  const id = typeof municipalityId === 'string' ? parseInt(municipalityId) : municipalityId;
  
  if (provinceId) {
    // استخدام دالة getMunicipalitiesByWilayaId للبحث ضمن الولاية
    const pId = typeof provinceId === 'string' ? parseInt(provinceId) : provinceId;
    const municipalities = getMunicipalitiesByWilayaId(pId);
    return municipalities.find(municipality => municipality.id === id) || null;
  }
  
  // البحث في جميع البلديات
  return yalidineMunicipalities.find(municipality => municipality.id === id) || null;
}

/**
 * تحديد نوع التوصيل المناسب بناءً على البلدية والتفضيلات
 */
export function determineDeliveryType(
  preferredType: 'home' | 'desk',
  municipality: YalidineMunicipality | null
): 'home' | 'desk' {
  if (!municipality) return preferredType;
  
  // إذا كان التوصيل للمكتب مطلوب لكن البلدية لا تدعمه
  if (preferredType === 'desk' && !municipality.has_stop_desk) {
    return 'home'; // التحويل للتوصيل المنزلي
  }
  
  return preferredType;
}

/**
 * حساب رسوم التوصيل مع كامل المنطق (نسخة محسنة مع دعم جميع شركات التوصيل)
 */
export async function calculateDeliveryFeesOptimized(
  input: DeliveryCalculationInput
): Promise<DeliveryCalculationResult> {
  
  const result: DeliveryCalculationResult = {
    selectedProvince: null,
    selectedMunicipality: null,
    deliveryType: input.deliveryType,
    deliveryFee: 0,
    isLoading: false,
    calculationMethod: 'fallback'
  };

  try {
    result.isLoading = true;

    // الحصول على بيانات الولاية والبلدية من الملفات الثابتة
    if (input.selectedProvinceId) {
      result.selectedProvince = getProvinceById(input.selectedProvinceId);
    }

    if (input.selectedMunicipalityId && input.selectedProvinceId) {
      result.selectedMunicipality = getMunicipalityById(
        input.selectedMunicipalityId, 
        input.selectedProvinceId
      );
    }

    // تحديد نوع التوصيل المناسب
    result.deliveryType = determineDeliveryType(input.deliveryType, result.selectedMunicipality);

    // إذا لم تكن البيانات كاملة، إرجاع أسعار تقديرية
    if (!result.selectedProvince || !result.selectedMunicipality) {
      result.deliveryFee = result.deliveryType === 'home' ? 450 : 350;
      result.calculationMethod = 'fallback';
      result.debugInfo = {
        weight: input.weight || 1,
        basePrice: result.deliveryFee,
        oversizeCharge: 0
      };
      result.isLoading = false;
      return result;
    }

    // 🆕 التحقق من معلومات الشحن للمنتج أولاً
    if (input.productShippingInfo) {
      
      // إذا كان للمنتج أسعار موحدة (Clone مع أسعار ثابتة)
      if (input.productShippingInfo.type === 'clone' && input.productShippingInfo.unified_price) {
        const clonePrice = result.deliveryType === 'home' 
          ? input.productShippingInfo.home_price 
          : input.productShippingInfo.desk_price;
          
        if (clonePrice && clonePrice > 0) {
          result.deliveryFee = clonePrice;
          result.deliveryType = input.deliveryType;
          result.calculationMethod = 'clone_unified_price';
          result.shippingProvider = {
            name: input.productShippingInfo.name,
            code: input.productShippingInfo.code || 'clone',
            logo: `/icons/${input.productShippingInfo.original_provider?.toLowerCase()}-logo.png`
          };
          result.debugInfo = {
            weight: input.weight || 1,
            basePrice: clonePrice,
            oversizeCharge: 0
          };
          result.isLoading = false;
          return result;
        }
      }
      
      // تحديد شركة التوصيل بناءً على معلومات المنتج
      let providerCode = input.productShippingInfo.type === 'clone' 
        ? input.productShippingInfo.original_provider?.toLowerCase()
        : input.productShippingInfo.code?.toLowerCase();
      
      // 🆕 إذا كان shippingProvider.type محدد، نستخدمه كأولوية
      if (input.shippingProvider?.type && input.shippingProvider.type !== 'yalidine') {
        providerCode = input.shippingProvider.type.toLowerCase();
      }

      // استدعاء النظام المناسب حسب شركة التوصيل
      if (providerCode === 'yalidine') {
        return await calculateYalidineDelivery(input, result);
      } else if (providerCode === 'zrexpress') {
        return await calculateZRExpressDelivery(input, result);
      } else if (isEcotrackProvider(providerCode || '')) {
        return await calculateEcotrackDelivery(input, result, providerCode || '');
      } else if (providerCode === 'custom' || !providerCode) {
        // التحقق من الطرق المخصصة
        return await calculateCustomDelivery(input, result);
      } else {
        return await calculateFallbackDelivery(input, result);
      }
    }

    // إذا لم تكن هناك معلومات شحن للمنتج، استخدام النظام القديم (ياليدين افتراضياً)
    return await calculateYalidineDelivery(input, result);

  } catch (error) {
    result.error = `خطأ في حساب رسوم التوصيل: ${error}`;
    result.deliveryFee = result.deliveryType === 'home' ? 450 : 350;
    result.calculationMethod = 'fallback';
  } finally {
    result.isLoading = false;
  }

  return result;
}

/**
 * حساب رسوم التوصيل عبر ياليدين
 */
async function calculateYalidineDelivery(
  input: DeliveryCalculationInput,
  result: DeliveryCalculationResult
): Promise<DeliveryCalculationResult> {
  const weight = input.weight || 1;
  
  try {
    // فحص الـ Cache أولاً للإعدادات
    const settingsCacheKey = `settings_${input.organizationId}`;
    const cachedSettings = settingsCache.get(settingsCacheKey);
    
    let settingsResult;
    
    if (cachedSettings && (Date.now() - cachedSettings.timestamp) < CACHE_DURATION) {
      settingsResult = cachedSettings.data;
    } else {
      settingsResult = await getYalidineSettingsForProductPurchase(input.organizationId);
      
      // حفظ في الـ Cache
      if (settingsResult && settingsResult.success) {
        settingsCache.set(settingsCacheKey, {
          data: settingsResult,
          timestamp: Date.now()
        });
      }
    }
    
    if (settingsResult && settingsResult.success && settingsResult.data) {
      // فحص cache الأسعار أولاً
      const priceCacheKey = `price_${settingsResult.data.origin_wilaya_id}_${result.selectedMunicipality.wilaya_id}_${input.deliveryType}_${weight}`;
      const cachedPrice = priceCache.get(priceCacheKey);
      
      let yalidinePrice;
      
      if (cachedPrice && (Date.now() - cachedPrice.timestamp) < CACHE_DURATION) {
        yalidinePrice = cachedPrice.price;
      } else {
        
        yalidinePrice = await calculateDeliveryPrice(
          input.organizationId,
          settingsResult.data.origin_wilaya_id.toString(),
          result.selectedMunicipality.wilaya_id.toString(),
          result.selectedMunicipality.id.toString(),
          input.deliveryType,
          weight
        );
        
        // حفظ السعر في الـ Cache
        if (yalidinePrice !== null) {
          priceCache.set(priceCacheKey, {
            price: yalidinePrice,
            timestamp: Date.now()
          });
        }
      }

      if (yalidinePrice !== null) {
        result.deliveryFee = yalidinePrice;
        result.deliveryType = input.deliveryType;
        result.calculationMethod = 'yalidine_api';
        result.shippingProvider = {
          name: 'ياليدين',
          code: 'yalidine',
          logo: '/icons/yalidine-logo.png'
        };
        result.debugInfo = {
          weight,
          basePrice: yalidinePrice,
          oversizeCharge: 0
        };
        return result;
      }
    }
    
    throw new Error('فشل في جلب أسعار ياليدين');
    
  } catch (error) {
    return await calculateFallbackDelivery(input, result);
  }
}

/**
 * حساب رسوم التوصيل عبر ZR Express
 */
async function calculateZRExpressDelivery(
  input: DeliveryCalculationInput,
  result: DeliveryCalculationResult
): Promise<DeliveryCalculationResult> {
  try {
    
    // استدعاء Edge Function الموجود عبر Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase.functions.invoke('calculate-zrexpress-shipping', {
      body: {
        organizationId: input.organizationId,
        wilayaId: result.selectedMunicipality?.wilaya_id?.toString(),
        isHomeDelivery: input.deliveryType === 'home'
      }
    });

    if (!error && data && data.success && typeof data.price === 'number') {
      result.deliveryFee = data.price;
      result.deliveryType = input.deliveryType;
      result.calculationMethod = 'zrexpress_api';
      result.shippingProvider = {
        name: 'ZR Express',
        code: 'zrexpress',
        logo: '/icons/zrexpress-logo.png'
      };
      result.debugInfo = {
        weight: input.weight || 1,
        basePrice: data.price,
        oversizeCharge: 0
      };
      
      return result;
    }
    
    // fallback: جدول zr_express_tarification
    
    const { data: zrData, error: dbError } = await supabase
      .from('zr_express_tarification')
      .select('domicile, stopdesk')
      .eq('id_wilaya', result.selectedMunicipality?.wilaya_id?.toString())
      .single();
      
    if (!dbError && zrData) {
      const price = input.deliveryType === 'home' ? zrData.domicile : zrData.stopdesk;
      if (price && price > 0) {
        result.deliveryFee = price;
        result.deliveryType = input.deliveryType;
        result.calculationMethod = 'zrexpress_database';
        result.shippingProvider = {
          name: 'ZR Express',
          code: 'zrexpress',
          logo: '/icons/zrexpress-logo.png'
        };
        result.debugInfo = {
          weight: input.weight || 1,
          basePrice: price,
          oversizeCharge: 0
        };
        
        return result;
      }
    }
    
    throw new Error('فشل في جلب أسعار ZR Express');
    
  } catch (error) {
    return await calculateFallbackDelivery(input, result);
  }
}

/**
 * حساب رسوم التوصيل عبر شركات EcoTrack
 */
async function calculateEcotrackDelivery(
  input: DeliveryCalculationInput,
  result: DeliveryCalculationResult,
  providerCode: string
): Promise<DeliveryCalculationResult> {
  try {
    
    // استدعاء دالة EcoTrack الموجودة
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    // جلب إعدادات المزود
    const { data: providerSettings, error: settingsError } = await supabase
      .from('shipping_provider_settings')
      .select(`
        *,
        shipping_providers!inner(code, base_url)
      `)
      .eq('organization_id', input.organizationId)
      .eq('shipping_providers.code', providerCode)
      .eq('is_enabled', true)
      .single();

    if (settingsError || !providerSettings) {
      throw new Error('لا توجد إعدادات لشركة التوصيل');
    }

    const { api_token, shipping_providers } = providerSettings;
    const baseUrl = shipping_providers.base_url;

    if (!api_token) {
      throw new Error('لا يوجد API token للشركة');
    }

    // استدعاء EcoTrack API
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const response = await fetch(`${cleanBaseUrl}/api/v1/get/fees?to_wilaya_id=${result.selectedMunicipality?.wilaya_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${api_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      
      // التحقق من البنية الجديدة
      if (data && data.livraison && Array.isArray(data.livraison) && data.livraison.length > 0) {
        const rates = data.livraison;
        const wilayaRate = rates.find((rate: any) => 
          rate.wilaya_id === parseInt(result.selectedMunicipality?.wilaya_id?.toString() || '0') || 
          rate.wilaya_id === result.selectedMunicipality?.wilaya_id?.toString()
        );

        let price = 0;
        if (wilayaRate) {
          price = input.deliveryType === 'home' 
            ? parseFloat(wilayaRate.tarif || '0')
            : parseFloat(wilayaRate.tarif_stopdesk || wilayaRate.tarif || '0');
        } else if (rates[0]) {
          // استخدام السعر الأول كبديل
          price = input.deliveryType === 'home' 
            ? parseFloat(rates[0].tarif || '0')
            : parseFloat(rates[0].tarif_stopdesk || rates[0].tarif || '0');
        }

        if (price > 0) {
          result.deliveryFee = price;
          result.deliveryType = input.deliveryType;
          result.calculationMethod = 'ecotrack_api';
          result.shippingProvider = {
            name: getEcotrackProviderName(providerCode),
            code: providerCode,
            logo: `/icons/${providerCode}-logo.png`
          };
          result.debugInfo = {
            weight: input.weight || 1,
            basePrice: price,
            oversizeCharge: 0
          };
          
          return result;
        }
      }
      
      // التحقق من البنية القديمة للتوافق
      if (data.success && data.data && data.data.length > 0) {
        const rate = data.data[0];
        const price = input.deliveryType === 'home' 
          ? parseFloat(rate.price_domicile || rate.price_local || '0')
          : parseFloat(rate.price_local || rate.price_domicile || '0');

        if (price > 0) {
          result.deliveryFee = price;
          result.deliveryType = input.deliveryType;
          result.calculationMethod = 'ecotrack_api';
          result.shippingProvider = {
            name: getEcotrackProviderName(providerCode),
            code: providerCode,
            logo: `/icons/${providerCode}-logo.png`
          };
          result.debugInfo = {
            weight: input.weight || 1,
            basePrice: price,
            oversizeCharge: 0
          };
          
          return result;
        }
      }
    }
    
    throw new Error('فشل في جلب أسعار EcoTrack');
    
  } catch (error) {
    return await calculateFallbackDelivery(input, result);
  }
}

/**
 * حساب رسوم التوصيل المخصصة
 */
async function calculateCustomDelivery(
  input: DeliveryCalculationInput,
  result: DeliveryCalculationResult
): Promise<DeliveryCalculationResult> {
  try {
    
    // استيراد دالة حساب الأسعار المخصصة
    const { calculateCustomShippingPrice } = await import('@/lib/api/custom-shipping');
    
    const price = await calculateCustomShippingPrice(
      input.organizationId,
      result.selectedMunicipality?.wilaya_id?.toString() || '',
      input.deliveryType
    );

    if (price >= 0) { // يمكن أن يكون السعر 0 (مجاني)
      result.deliveryFee = price;
      result.deliveryType = input.deliveryType;
      result.calculationMethod = 'custom_shipping';
      result.shippingProvider = {
        name: input.productShippingInfo?.name || 'شحن مخصص',
        code: 'custom',
        logo: '/icons/custom-shipping-logo.png'
      };
      result.debugInfo = {
        weight: input.weight || 1,
        basePrice: price,
        oversizeCharge: 0
      };
      
      return result;
    }
    
    throw new Error('فشل في جلب أسعار التوصيل المخصصة');
    
  } catch (error) {
    return await calculateFallbackDelivery(input, result);
  }
}

/**
 * حساب احتياطي للأسعار
 */
async function calculateFallbackDelivery(
  input: DeliveryCalculationInput,
  result: DeliveryCalculationResult
): Promise<DeliveryCalculationResult> {
  
  let basePrice = 0;
  
  if (result.deliveryType === 'home') {
    basePrice = 450; // سعر التوصيل للمنزل
  } else if (result.deliveryType === 'desk' && result.selectedMunicipality?.has_stop_desk) {
    basePrice = 350; // سعر التوصيل للمكتب
  } else {
    // إذا لم يكن هناك مكتب، التوصيل للمنزل
    basePrice = 450;
    result.deliveryType = 'home';
  }

  // حساب رسوم الوزن الزائد
  const BASE_WEIGHT_LIMIT = 1;
  const weight = input.weight || 1;
  let oversizeCharge = 0;
  if (weight > BASE_WEIGHT_LIMIT) {
    const extraWeight = weight - BASE_WEIGHT_LIMIT;
    oversizeCharge = extraWeight * 50; // 50 دج لكل كيلو إضافي
  }

  result.deliveryFee = basePrice + oversizeCharge;
  result.calculationMethod = 'local_data';
  result.shippingProvider = {
    name: input.productShippingInfo?.name || 'مزود افتراضي',
    code: input.productShippingInfo?.code || 'default',
    logo: '/icons/default-shipping-logo.png'
  };
  result.debugInfo = {
    weight,
    basePrice,
    oversizeCharge
  };
  
  return result;
}

/**
 * دالة مساعدة للتحقق من شركات EcoTrack
 */
function isEcotrackProvider(providerCode: string): boolean {
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
}

/**
 * دالة مساعدة للحصول على أسماء شركات EcoTrack
 */
function getEcotrackProviderName(providerCode: string): string {
  const providerNames: { [key: string]: string } = {
    'ecotrack': 'EcoTrack',
    'anderson_delivery': 'Anderson Delivery',
    'areex': 'Areex Express',
    'ba_consult': 'BA Consult',
    'conexlog': 'Conexlog',
    'coyote_express': 'Coyote Express',
    'dhd': 'DHD Delivery',
    'distazero': 'DistaZero',
    'e48hr_livraison': 'E48HR Livraison',
    'fretdirect': 'FretDirect',
    'golivri': 'GoLivri',
    'mono_hub': 'Mono Hub',
    'msm_go': 'MSM Go',
    'imir_express': 'Imir Express',
    'packers': 'Packers',
    'prest': 'Prest Delivery',
    'rb_livraison': 'RB Livraison',
    'rex_livraison': 'Rex Livraison',
    'rocket_delivery': 'Rocket Delivery',
    'salva_delivery': 'Salva Delivery',
    'speed_delivery': 'Speed Delivery',
    'tsl_express': 'TSL Express',
    'worldexpress': 'World Express'
  };
  
  return providerNames[providerCode] || providerCode.charAt(0).toUpperCase() + providerCode.slice(1);
}

/**
 * حساب سريع للأسعار التقديرية (للمعاينة السريعة)
 */
export function calculateEstimatedDeliveryFee(
  deliveryType: 'home' | 'desk',
  provinceId?: string,
  municipalityId?: string
): number {
  
  // فحص سريع للبلدية
  if (municipalityId && provinceId) {
    const municipality = getMunicipalityById(municipalityId, provinceId);
    if (municipality) {
      if (deliveryType === 'desk' && !municipality.has_stop_desk) {
        return 450; // تحويل للمنزل
      }
    }
  }
  
  return deliveryType === 'home' ? 450 : 350;
}

/**
 * التحقق من إمكانية التوصيل للموقع
 */
export function checkDeliveryAvailability(
  provinceId: string,
  municipalityId: string
): {
  isDeliverable: boolean;
  hasStopDesk: boolean;
  availableTypes: ('home' | 'desk')[];
  message?: string;
  municipality?: YalidineMunicipality;
} {
  
  const province = getProvinceById(provinceId);
  const municipality = getMunicipalityById(municipalityId, provinceId);
  
  if (!province || !municipality) {
    return {
      isDeliverable: false,
      hasStopDesk: false,
      availableTypes: [],
      message: 'الموقع غير صحيح'
    };
  }
  
  if (!province.is_deliverable || !municipality.is_deliverable) {
    return {
      isDeliverable: false,
      hasStopDesk: municipality.has_stop_desk,
      availableTypes: [],
      message: 'التوصيل غير متاح لهذا الموقع',
      municipality
    };
  }
  
  const availableTypes: ('home' | 'desk')[] = ['home'];
  if (municipality.has_stop_desk) {
    availableTypes.push('desk');
  }
  
  return {
    isDeliverable: true,
    hasStopDesk: municipality.has_stop_desk,
    availableTypes,
    municipality,
    message: availableTypes.length > 1 ? 
      'متاح التوصيل للمنزل والمكتب' : 
      'متاح التوصيل للمنزل فقط'
  };
}

/**
 * دالة تشخيص سريعة للتأكد من البيانات
 */
export function testDeliveryData() {
  
  // اختبار حقول البحث
  const testProvince = getProvinceById(16); // الجزائر
  const testMunicipalities = getMunicipalitiesByWilayaId(16);
  
  return {
    provinces: yalidineProvinces.length,
    municipalities: yalidineMunicipalities.length,
    testProvince,
    testMunicipalitiesCount: testMunicipalities.length
  };
}
