import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { UseFormReturn } from "react-hook-form";
import { OrderFormValues } from "../OrderFormTypes";
import { ShippingProviderSettings } from "../types";
import { useSupabase } from "@/context/SupabaseContext";
import { getShippingMunicipalities, calculateShippingFee, getShippingProvinces } from "@/api/product-page";
// تم إزالة requestCache لتحسين الأداء
// import { requestCache, createCacheKey } from '@/lib/cache/requestCache';
import { debounce } from 'lodash';
import type { Municipality } from '@/api/product-page';

interface ShippingLogicReturn {
  currentDeliveryFee: number;
  setCurrentDeliveryFee: (fee: number) => void;
  isLoadingDeliveryFee: boolean;
  communesList: any[];
  isLoadingCommunes: boolean;
  selectedDeliveryType: "home" | "desk";
  setSelectedDeliveryType: (type: "home" | "desk") => void;
  yalidineCentersList: any[];
  isLoadingYalidineCenters: boolean;
  shippingProviderSettings: ShippingProviderSettings | null;
  isLoadingProviderSettings: boolean;
  shippingProviderCode: string;
  hasShippingIntegration: boolean;
  wilayasList: any[];
  isLoadingWilayas: boolean;
  handleDeliveryTypeChange: (value: "home" | "desk") => void;
  handleWilayaChange: (wilayaId: string) => void;
  updateDeliveryFee: (provinceId: string | number, municipalityId: string | number | null) => Promise<void>;
  handleShippingProviderChange: (providerId: string) => Promise<void>;
  getAppropriateShippingId: (selectedProvider: string | null) => string | number | null;
}

// تعريف نوع البيانات المُرجعة من calculateZRExpressShippingPrice
interface TarificationResponse {
  success: boolean;
  price: number;
  error?: string;
}

export const useShippingLogic = (
  form: UseFormReturn<OrderFormValues, any, OrderFormValues>,
  tenantId: string | undefined,
  formSettings: any,
  initialDeliveryFee: number,
  quantity: number,
  productId?: string
): ShippingLogicReturn => {
  const { supabase } = useSupabase();
  const [currentDeliveryFee, setCurrentDeliveryFeeInternal] = useState<number>(initialDeliveryFee);
  const [isLoadingDeliveryFee, setIsLoadingDeliveryFee] = useState<boolean>(false);
  
  // Cache لأسعار الولايات لتجنب إعادة الجلب عند تغيير البلدية
  const [wilayaPriceCache, setWilayaPriceCache] = useState<{[key: string]: {home: number, desk: number, timestamp: number}}>({});
  
  // حماية ضد تجاوز الأسعار المحفوظة
  const [priceProtection, setPriceProtection] = useState<{[key: string]: {price: number, timestamp: number}}>({});
  
  // دالة محسنة لـ setCurrentDeliveryFee مع حماية من التجاوز
  const setCurrentDeliveryFee = useCallback((newFee: number) => {
    
    // فحص إذا كان هناك حماية ضد التجاوز
    const currentProvince = form.getValues('province');
    const currentDeliveryOption = form.getValues("deliveryOption") || 'home';
    const protectionKey = `${currentProvince}_${currentDeliveryOption}_${tenantId}`;
    const protection = priceProtection[protectionKey];
    
    if (protection) {
      const protectionAge = Date.now() - protection.timestamp;
      
      // إذا كانت الحماية حديثة (أقل من 10 ثواني) ولدينا سعر أعلى محفوظ
      if (protectionAge < 10000 && protection.price > newFee && protection.price > 500) {
        return; // لا نحدث السعر
      }
    }
    
    setCurrentDeliveryFeeInternal(newFee);
  }, [form, tenantId, priceProtection, currentDeliveryFee]);
  const [communesList, setCommunesList] = useState<any[]>([]);
  const [isLoadingCommunes, setIsLoadingCommunes] = useState<boolean>(false);
  const [selectedDeliveryType, setSelectedDeliveryType] = useState<"home" | "desk">("home");
  const [yalidineCentersList, setYalidineCentersList] = useState<any[]>([]);
  const [isLoadingYalidineCenters, setIsLoadingYalidineCenters] = useState<boolean>(false);
  const [shippingProviderSettings, setShippingProviderSettings] = useState<ShippingProviderSettings | null>(null);
  const [isLoadingProviderSettings, setIsLoadingProviderSettings] = useState<boolean>(false);
  const [shippingProviderCode, setShippingProviderCode] = useState<string>("");
  const [selectedWilaya, setSelectedWilaya] = useState<string>("");
  const [wilayasList, setWilayasList] = useState<any[]>([]);
  const [isLoadingWilayas, setIsLoadingWilayas] = useState<boolean>(false);

  const hasShippingIntegration = Boolean(
    formSettings?.settings?.shipping_integration?.enabled &&
    formSettings?.settings?.shipping_integration?.provider_id
  );

  // إضافة مرجع لتخزين آخر طلب
  const lastRequestRef = useRef<{
    provinceId?: string | number;
    municipalityId?: string | number | null;
    deliveryType?: string;
  }>({});

  // دالة للتحقق من cache الولاية
  const getWilayaCachedPrice = useCallback((provinceId: string | number, deliveryType: 'home' | 'desk') => {
    const wilayaKey = `${provinceId}_${tenantId}`;
    const cached = wilayaPriceCache[wilayaKey];
    
    if (cached) {
      const cacheAge = Date.now() - cached.timestamp;
      // استخدام الـ cache إذا كان عمره أقل من 30 دقيقة
      if (cacheAge < 30 * 60 * 1000) {
        return cached[deliveryType];
      } else {
        // إزالة الـ cache المنتهي الصلاحية
        const newCache = { ...wilayaPriceCache };
        delete newCache[wilayaKey];
        setWilayaPriceCache(newCache);
      }
    }
    
    return null;
  }, [wilayaPriceCache, tenantId]);

  // دالة لحفظ سعر الولاية في الـ cache
  const setWilayaCachedPrice = useCallback((provinceId: string | number, homePrice: number, deskPrice: number) => {
    const wilayaKey = `${provinceId}_${tenantId}`;
    setWilayaPriceCache(prev => ({
      ...prev,
      [wilayaKey]: {
        home: homePrice,
        desk: deskPrice,
        timestamp: Date.now()
      }
    }));
  }, [tenantId]);

  // نقل تعريف updateDeliveryFee هنا قبل استخدامها
  // نقل تعريف updateDeliveryFee قبل استخدامه
  const updateDeliveryFee = useCallback(async (provinceId: string | number, municipalityId: string | number | null) => {

    // التحقق من cache الولاية أولاً لتسريع العملية
    const currentDeliveryOption = form.getValues("deliveryOption") || 'home';
    const cachedPrice = getWilayaCachedPrice(provinceId, currentDeliveryOption);
    
    if (cachedPrice !== null) {
      setCurrentDeliveryFee(cachedPrice);
      
      // حفظ الحماية ضد التجاوز
      const protectionKey = `${provinceId}_${currentDeliveryOption}_${tenantId}`;
      setPriceProtection(prev => ({
        ...prev,
        [protectionKey]: {
          price: cachedPrice,
          timestamp: Date.now()
        }
      }));
      
      return;
    }

    if (!provinceId || !tenantId) {
      return;
    }

    setIsLoadingDeliveryFee(true);
    
    // إضافة timeout للـ loading state لتجنب التعليق
    const loadingTimeout = setTimeout(() => {
      const currentDeliveryOption = form.getValues("deliveryOption") || 'home';
      setCurrentDeliveryFee(currentDeliveryOption === 'home' ? 650 : 450);
      setIsLoadingDeliveryFee(false);
    }, 10000); // 10 ثواني timeout
    
    try {
      const currentDeliveryOption = form.getValues("deliveryOption");
      if (currentDeliveryOption === 'desk' || currentDeliveryOption === 'home') {
        if (selectedDeliveryType !== currentDeliveryOption) {
          setSelectedDeliveryType(currentDeliveryOption);
        }
      }

      // التحقق من إعدادات المنتج أولاً
      if (productId) {
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('shipping_provider_id, shipping_method_type')
          .eq('id', productId)
          .single();

        if (!productError && productData) {
          // التحقق من نوع طريقة الشحن أولاً
          if (productData.shipping_method_type === 'custom') {
            
            try {
              const { data: customSettings, error: settingsError } = await supabase
                .from('shipping_provider_settings')
                .select('*')
                .eq('organization_id', tenantId)
                .eq('api_key', 'custom_shipping')
                .eq('is_enabled', true)
                .single();

              if (!settingsError && customSettings && customSettings.settings) {
                const settings = customSettings.settings as any;
                let price = 0;

                if (settings.use_unified_price || settings.use_uniform_rates) {
                  
                  if (currentDeliveryOption === 'home') {
                    if (settings.is_free_delivery_home || settings.free_home_delivery) {
                      price = 0;
                    } else {
                      price = settings.unified_home_price || settings.uniform_home_rate || 0;
                    }
                  } else {
                    if (settings.is_free_delivery_desk || settings.free_office_delivery) {
                      price = 0;
                    } else {
                      price = settings.unified_desk_price || settings.uniform_office_rate || 0;
                    }
                  }
                } else {
                  
                  const customRates = settings.custom_rates || settings.shipping_rates;
                  
                  if (customRates && customRates[provinceId]) {
                    const provinceRates = customRates[provinceId];
                    if (currentDeliveryOption === 'home') {
                      price = provinceRates.home_delivery || 0;
                    } else {
                      price = provinceRates.office_delivery || 0;
                    }
                  } else {
                    price = settings.default_price || 0;
                  }
                }

                setCurrentDeliveryFee(price);
                
                const customShippingSettings: ShippingProviderSettings = {
                  provider_code: 'custom',
                  is_home_delivery_enabled: true, 
                  is_desk_delivery_enabled: true, 
                  id: null, 
                  original_provider_id: null,
                  name: settings.service_name || "طريقة شحن مخصصة", 
                  is_active: true,
                  use_unified_price: settings.use_unified_price || settings.use_uniform_rates || false,
                  unified_home_price: settings.unified_home_price || settings.uniform_home_rate || 0,
                  unified_desk_price: settings.unified_desk_price || settings.uniform_office_rate || 0,
                  is_free_delivery_home: settings.is_free_delivery_home || settings.free_home_delivery || false,
                  is_free_delivery_desk: settings.is_free_delivery_desk || settings.free_office_delivery || false,
                };
                setShippingProviderSettings(customShippingSettings);
                return;
              }
            } catch (error) {
            }
          }
          
          // التعامل مع شركات الشحن العادية
          if (productData.shipping_provider_id) {
            
            // إضافة تحقق من صحة ID قبل النداء على قاعدة البيانات
            const providerId = Number(productData.shipping_provider_id);
            if (isNaN(providerId) || providerId <= 0) {
            } else {
              const { data: providerData } = await supabase
                .from('shipping_providers')
                .select('code')
                .eq('id', providerId)
                .single();

              if (providerData && providerData.code === 'yalidine') {
                
                // التحقق من صحة municipalityId
                const validMunicipalityId = municipalityId && !isNaN(Number(municipalityId)) ? Number(municipalityId) : null;
                
                // حساب الوزن المقدر
                const estimatedWeight = Math.max(1, Math.ceil(quantity || 1));
                
                // إذا لم تكن البلدية محددة، نحاول الحصول على أول بلدية متاحة
                let finalMunicipalityId = validMunicipalityId;
                if (!finalMunicipalityId) {
                  try {
                    const municipalities = await getShippingMunicipalities(Number(provinceId), tenantId || "");
                    if (municipalities && municipalities.length > 0) {
                      finalMunicipalityId = municipalities[0].id;
                      form.setValue('municipality', finalMunicipalityId.toString());
                    }
                  } catch (error) {
                  }
                }
                
                if (!finalMunicipalityId) {
                  // استخدام السعر الافتراضي
                  setCurrentDeliveryFee(currentDeliveryOption === 'home' ? 400 : 350);
                  return;
                }
                
                try {
                  const { calculateDeliveryPrice } = await import('@/api/yalidine/service');
                  const yalidinePrice = await calculateDeliveryPrice(
                    tenantId,
                    String(provinceId), // fromProvinceId
                    String(provinceId), // toProvinceId  
                    String(finalMunicipalityId), // toCommuneId
                    currentDeliveryOption, // deliveryType
                    estimatedWeight // weight
                  );
                  
                  if (yalidinePrice && yalidinePrice > 0) {
                    setCurrentDeliveryFee(yalidinePrice);
                    
                    // حفظ السعر في cache الولاية (جلب سعر النوع الآخر أيضاً)
                    try {
                      const otherDeliveryType = currentDeliveryOption === 'home' ? 'desk' : 'home';
                      const otherPrice = await calculateDeliveryPrice(
                        tenantId,
                        String(provinceId),
                        String(provinceId), 
                        String(finalMunicipalityId),
                        otherDeliveryType,
                        estimatedWeight
                      );
                      
                      if (currentDeliveryOption === 'home') {
                        setWilayaCachedPrice(provinceId, yalidinePrice, otherPrice || 350);
                      } else {
                        setWilayaCachedPrice(provinceId, otherPrice || 400, yalidinePrice);
                      }
                    } catch (error) {
                      // في حالة فشل جلب النوع الآخر، نحفظ ما لدينا فقط
                      if (currentDeliveryOption === 'home') {
                        setWilayaCachedPrice(provinceId, yalidinePrice, 350);
                      } else {
                        setWilayaCachedPrice(provinceId, 400, yalidinePrice);
                      }
                    }
                    
                    return;
                  } else {
                  }
                } catch (yalidineError) {
                }
              } else if (providerData && providerData.code === 'zrexpress') {
                
                if (!shippingProviderSettings || shippingProviderSettings.provider_code !== 'zrexpress') {
                  const zrExpressSettings: ShippingProviderSettings = {
                    provider_code: 'zrexpress',
                    is_home_delivery_enabled: true, 
                    is_desk_delivery_enabled: true, 
                    id: null, 
                    original_provider_id: providerId,
                    name: "ZR Express", 
                    is_active: true,
                    use_unified_price: false,
                    unified_home_price: 0,
                    unified_desk_price: 0,
                    is_free_delivery_home: false,
                    is_free_delivery_desk: false,
                  };
                  setShippingProviderSettings(zrExpressSettings);
                }
                
                try {
                  const isHomeDelivery = currentDeliveryOption === 'home';

                  const response = await calculateZRExpressShippingPrice(
                    tenantId,
                    provinceId.toString(),
                    isHomeDelivery
                  );

                  if (response.success && typeof response.price === 'number') {
                    setCurrentDeliveryFee(response.price);
                    return;
                  } else if (response.error) {
                    setCurrentDeliveryFee(isHomeDelivery ? 800 : 300);
                    return;
                  }
                } catch (error) {
                  const isHomeDelivery = currentDeliveryOption === 'home';
                  setCurrentDeliveryFee(isHomeDelivery ? 800 : 300);
                  return;
                }
              // التحقق من شركات Ecotrack
              } else if (providerData && isEcotrackProvider(providerData.code)) {
                
                if (!shippingProviderSettings || shippingProviderSettings.provider_code !== providerData.code) {
                  const ecotrackSettings: ShippingProviderSettings = {
                    provider_code: providerData.code,
                    is_home_delivery_enabled: true, 
                    is_desk_delivery_enabled: true, 
                    id: null, 
                    original_provider_id: providerId,
                    name: providerData.code, 
                    is_active: true,
                    use_unified_price: false,
                    unified_home_price: 0,
                    unified_desk_price: 0,
                    is_free_delivery_home: false,
                    is_free_delivery_desk: false,
                  };
                  setShippingProviderSettings(ecotrackSettings);
                }
                
                try {
                  
                  const response = await calculateEcotrackShippingPrice(
                    tenantId,
                    providerData.code,
                    provinceId.toString(),
                    currentDeliveryOption
                  );

                  if (response.success) {
                    setCurrentDeliveryFee(response.price);
                    return;
                  } else {
                    setCurrentDeliveryFee(currentDeliveryOption === 'home' ? 800 : 300);
                  }
                } catch (error) {
                  setCurrentDeliveryFee(currentDeliveryOption === 'home' ? 800 : 300);
                }
                
                return;
              } else if (providerData) {
              }
            }
          }
        }
      }

      // المنطق الافتراضي لحساب سعر الشحن
      
      const estimatedWeight = Math.max(1, Math.ceil(quantity || 1));
      
      // التحقق من صحة municipalityId
      const validMunicipalityId = municipalityId && !isNaN(Number(municipalityId)) ? Number(municipalityId) : null;

      // إذا لم تكن البلدية محددة، نحاول الحصول على أول بلدية متاحة في الولاية
      let finalMunicipalityId = validMunicipalityId;
      if (!finalMunicipalityId) {
        try {
          const municipalities = await getShippingMunicipalities(Number(provinceId), tenantId || "");
          if (municipalities && municipalities.length > 0) {
            finalMunicipalityId = municipalities[0].id;
            
            // تحديث البلدية في النموذج أيضاً
            form.setValue('municipality', finalMunicipalityId.toString());
          }
        } catch (error) {
        }
      }

      // إذا لا تزال البلدية غير محددة، إظهار خطأ واضح
      if (!finalMunicipalityId) {
        setCurrentDeliveryFee(0); // تعيين 0 لإظهار أن هناك مشكلة
        throw new Error('لا توجد بلديات متاحة للولاية المحددة. يرجى اختيار ولاية أخرى.');
      }

      // استدعاء دالة حساب السعر مع معالجة الأخطاء
      try {
        
        // أولاً: محاولة استخدام API ياليدين مباشرة لأن دالة قاعدة البيانات معطلة
        let fee = null;
        try {
          const { calculateDeliveryPrice } = await import('@/api/yalidine/service');
          fee = await calculateDeliveryPrice(
            tenantId,
            String(provinceId), // fromProvinceId (سيتم تحديد ولاية المصدر من إعدادات المؤسسة)
            String(provinceId), // toProvinceId
            String(finalMunicipalityId), // toCommuneId
            currentDeliveryOption, // deliveryType
            estimatedWeight // weight
          );
          
        } catch (yalidineError) {
          
          // العودة لدالة قاعدة البيانات كـ fallback
          fee = await calculateShippingFee(
            tenantId,
            Number(provinceId),
            finalMunicipalityId,
            currentDeliveryOption,
            estimatedWeight,
            undefined, // shippingProviderCloneIdInput
            productId // productId for Ecotrack checking
          );
        }

        // استخدام السعر المحسوب إذا كان أكبر من 0
        if (fee > 0) {
          setCurrentDeliveryFee(fee);
        } else {
          // إذا كان السعر 0، فهذا يعني عدم وجود بيانات شحن
          throw new Error('لا تتوفر أسعار شحن لهذه الوجهة');
        }
      } catch (shippingError) {
        
        // إظهار رسالة خطأ للمستخدم
        const errorMessage = shippingError instanceof Error ? shippingError.message : 'حدث خطأ في حساب أسعار الشحن';
        
        // يمكن إضافة toast notification هنا إذا كان متاحاً
        
        // تعيين سعر 0 لإظهار أن هناك مشكلة في الحساب
        setCurrentDeliveryFee(0);
        
        // رفع الخطأ مرة أخرى ليتم التعامل معه في catch الخارجي
        throw shippingError;
      }
    } catch (error) {
      
      // معالجة أكثر تفصيلاً للأخطاء
      const currentDeliveryOption = form.getValues("deliveryOption") || 'home';
      const isHomeDelivery = currentDeliveryOption === 'home';
      
      // أسعار افتراضية محسنة حسب المنطقة
      let fallbackPrice: number;
      const currentProvince = form.getValues('province');
      
      if (currentProvince) {
        const provinceNum = parseInt(currentProvince, 10);
        // أسعار متدرجة حسب المسافة التقريبية
        if (provinceNum <= 20) {
          // مناطق قريبة
          fallbackPrice = isHomeDelivery ? 450 : 350;
        } else if (provinceNum <= 40) {
          // مناطق متوسطة  
          fallbackPrice = isHomeDelivery ? 650 : 450;
        } else {
          // مناطق بعيدة
          fallbackPrice = isHomeDelivery ? 850 : 550;
        }
      } else {
        // افتراضي عام
        fallbackPrice = isHomeDelivery ? 500 : 400;
      }

      setCurrentDeliveryFee(fallbackPrice);
    } finally {
      clearTimeout(loadingTimeout); // إلغاء الـ timeout عند اكتمال العملية
      setIsLoadingDeliveryFee(false);
    }
  }, [tenantId, form, quantity, selectedDeliveryType, initialDeliveryFee, productId, shippingProviderSettings, formSettings]);

  // تحميل قائمة الولايات
  useEffect(() => {
    const loadWilayas = async () => {
      if (!tenantId) return;
      setIsLoadingWilayas(true);
      try {
        const wilayas = await getShippingProvinces(tenantId);
        setWilayasList(Array.isArray(wilayas) ? wilayas : []);
      } catch (error) {
        setWilayasList([]);
      } finally {
        setIsLoadingWilayas(false);
      }
    };
    loadWilayas();
  }, [tenantId]);

  // دالة حساب سعر ZR Express
  const calculateZRExpressShippingPrice = async (
    tenantId: string,
    provinceId: string,
    isHomeDelivery: boolean
  ): Promise<TarificationResponse> => {
    try {

      const { data, error } = await supabase.functions.invoke('calculate-zrexpress-shipping', {
        body: {
          organizationId: tenantId,
          wilayaId: provinceId,
          isHomeDelivery
        }
      });

      if (error) throw error;
      return data || { success: false, price: 0, error: 'No data returned' };
    } catch (error) {
      return { success: false, price: 0, error: String(error) };
    }
  };

  const handleDeliveryTypeChange = useCallback(
    (value: "home" | "desk") => {
      
      setSelectedDeliveryType(value);
      form.setValue("deliveryOption", value, { shouldValidate: true });

      const recalculateShippingPrice = async () => {
        setIsLoadingDeliveryFee(true);
        try {
          const currentProvince = form.getValues('province');
          const currentMunicipality = form.getValues('municipality');

          if (currentProvince) {
            await updateDeliveryFee(currentProvince, currentMunicipality || null);
          } else {
          }
        } catch (error) {
          const isHomeDelivery = value === 'home';
          const fallbackPrice = isHomeDelivery ? 400 : 350;
          setCurrentDeliveryFee(fallbackPrice);
        } finally {
          setIsLoadingDeliveryFee(false);
        }
      };
      
      setTimeout(async () => {
        setIsLoadingCommunes(true);
        try {
          const currentProvince = form.getValues('province');
          if (currentProvince && tenantId) {
            const municipalities = await getShippingMunicipalities(Number(currentProvince), tenantId);
            setCommunesList(Array.isArray(municipalities) ? municipalities : []);
          }
          
          await recalculateShippingPrice();
          
        } catch (e) {
          setCommunesList([]);
        } finally {
          setIsLoadingCommunes(false);
        }
      }, 100);
    },
    [form, hasShippingIntegration, tenantId, selectedDeliveryType]
  );

  const handleWilayaChange = useCallback(
    async (wilayaId: string) => {
      if (!wilayaId || !tenantId) {
        return;
      }

      // إعادة تعيين القيم المتعلقة بالبلدية
      form.setValue("municipality", "", { shouldValidate: false, shouldDirty: false });
      form.setValue("stopDeskId", "", { shouldValidate: false, shouldDirty: false });
      setCommunesList([]);
      setYalidineCentersList([]);

      // تحميل البلديات مباشرة بدون cache
      setIsLoadingCommunes(true);
      
      try {
        const municipalities = await getShippingMunicipalities(Number(wilayaId), tenantId);

        if (municipalities && municipalities.length > 0) {
          setCommunesList(municipalities);
          
          // تحديث البلدية الأولى في النموذج تلقائياً
          const firstMunicipalityId = municipalities[0]?.id;
          if (firstMunicipalityId) {
            form.setValue("municipality", firstMunicipalityId.toString(), { shouldValidate: true });
            
            // تحديث رسوم التوصيل مباشرة
            updateDeliveryFee(wilayaId, firstMunicipalityId);
          }
        } else {
          setCommunesList([]);
        }
      } catch (error) {
        // محاولة الاستعلام المباشر كـ fallback
        try {
          const { data, error: directError } = await supabase.rpc(
            'get_shipping_municipalities' as any,
            {
              p_wilaya_id: Number(wilayaId),
              p_org_id: tenantId
            }
          );

          if (!directError && data && Array.isArray(data)) {
            setCommunesList(data);
          } else {
            setCommunesList([]);
          }
        } catch (fallbackError) {
          setCommunesList([]);
        }
      } finally {
        setIsLoadingCommunes(false);
      }
    },
    [form, tenantId, updateDeliveryFee]
  );

  // تحميل إعدادات شركة الشحن الافتراضية
  useEffect(() => {
    const fetchDefaultProviderSettings = async () => {
      // أولوية للمنتج: إذا كان المنتج له shipping_provider_id محدد، نستخدمه
      let effectiveProviderId = null;
      
      // التحقق من إعدادات المنتج أولاً
      if (productId) {
        try {
          const { data: productDataArray, error: productError } = await supabase
            .from('products')
            .select('shipping_provider_id, shipping_method_type')
            .eq('id', productId)
            .limit(1);
            
          const productData = productDataArray && productDataArray.length > 0 ? productDataArray[0] : null;
          
          if (productError) {
          } else if (productData && productData.shipping_provider_id) {
            effectiveProviderId = productData.shipping_provider_id;
          }
        } catch (error) {
        }
      }
      
      // إذا لم يجد شركة شحن في المنتج، استخدم إعدادات النموذج
      if (!effectiveProviderId) {
        effectiveProviderId = formSettings?.settings?.shipping_integration?.provider_id || 
                             formSettings?.settings?.shipping_integration?.provider;
      }

      if (!effectiveProviderId || !tenantId) {
        setShippingProviderSettings(null);
        return;
      }

      // التحقق من صحة providerId قبل النداء على قاعدة البيانات
      const numericProviderId = parseInt(effectiveProviderId);
      if (isNaN(numericProviderId) || numericProviderId <= 0) {
        setShippingProviderSettings(null);
        return;
      }

      setIsLoadingProviderSettings(true);
      try {
        const { data: providerData, error: providerError } = await supabase
          .from("shipping_providers")
          .select("code, name")
          .eq("id", numericProviderId)
          .maybeSingle();

        if (providerError) {
          setShippingProviderSettings(null);
        } else if (providerData) {
          setShippingProviderCode(providerData.code);
          const defaultSettings: ShippingProviderSettings = {
            provider_code: providerData.code,
            is_home_delivery_enabled: true,
            is_desk_delivery_enabled: true,
            id: null,
            original_provider_id: numericProviderId,
            name: providerData.name || "Default Provider",
            is_active: true,
            use_unified_price: false,
            unified_home_price: 0,
            unified_desk_price: 0,
            is_free_delivery_home: false,
            is_free_delivery_desk: false,
          };
          
          setShippingProviderSettings(defaultSettings);
        } else {
          setShippingProviderSettings(null);
        }
      } catch (error) {
        setShippingProviderSettings(null);
      } finally {
        setIsLoadingProviderSettings(false);
      }
    };

    fetchDefaultProviderSettings();
  }, [formSettings, tenantId, hasShippingIntegration, productId]);

  // دالة للتعامل مع تغيير شركة التوصيل
  const handleShippingProviderChange = useCallback(async (providerId: string) => {
    
    if (!providerId) return;
    
    // التحقق من صحة providerId
    const numericProviderId = parseInt(providerId);
    if (isNaN(numericProviderId) || numericProviderId <= 0) {
      return;
    }
    
    try {
      const { data: providerDataArray, error } = await supabase
        .from('shipping_providers')
        .select('code, name')
        .eq('id', numericProviderId)
        .limit(1);
        
      const providerData = providerDataArray && providerDataArray.length > 0 ? providerDataArray[0] : null;

      if (error) {
        return;
      }
      
      if (!providerData) {
        return;
      }
      
      setShippingProviderCode(providerData.code);
      
      const defaultSettings: ShippingProviderSettings = {
        provider_code: providerData.code,
        is_home_delivery_enabled: true, 
        is_desk_delivery_enabled: true, 
        id: null, 
        original_provider_id: numericProviderId,
        name: providerData.name || "Default Provider", 
        is_active: true,
        use_unified_price: false,
        unified_home_price: 0,
        unified_desk_price: 0,
        is_free_delivery_home: false,
        is_free_delivery_desk: false,
      };
      
      setShippingProviderSettings(defaultSettings);
      
      const currentProvince = form.getValues('province');
      
      if (currentProvince) {
        setIsLoadingCommunes(true);
        try {
          const municipalities = await getShippingMunicipalities(Number(currentProvince), tenantId || "");
          setCommunesList(Array.isArray(municipalities) ? municipalities : []);
        } catch (e) {
          setCommunesList([]);
        } finally {
          setIsLoadingCommunes(false);
        }
      }
      
    } catch (error) {
    }
  }, [form, tenantId]);

  // دالة لتحديد معرف شركة الشحن المناسبة
  const getAppropriateShippingId = useCallback((selectedProvider: string | null): string | number | null => {
    
    if (!selectedProvider || selectedProvider === "null" || selectedProvider === "default_provider") {
      return null;
    }
    
    return selectedProvider;
  }, []);

  // إضافة دالة للتحقق من شركات Ecotrack
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

  // إضافة دالة لحساب أسعار Ecotrack
  const calculateEcotrackShippingPrice = async (
    organizationId: string,
    providerCode: string,
    wilayaId: string,
    deliveryType: 'home' | 'desk'
  ): Promise<{ success: boolean; price: number; error?: string }> => {
    try {

      // الحصول على إعدادات المنظمة لشركة Ecotrack
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

      // استدعاء API لجلب الأسعار
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

  return {
    currentDeliveryFee,
    setCurrentDeliveryFee,
    isLoadingDeliveryFee,
    communesList,
    isLoadingCommunes,
    selectedDeliveryType,
    setSelectedDeliveryType,
    yalidineCentersList,
    isLoadingYalidineCenters,
    shippingProviderSettings,
    isLoadingProviderSettings,
    shippingProviderCode,
    hasShippingIntegration,
    wilayasList,
    isLoadingWilayas,
    handleDeliveryTypeChange,
    handleWilayaChange,
    updateDeliveryFee,
    handleShippingProviderChange,
    getAppropriateShippingId,
  };
};
