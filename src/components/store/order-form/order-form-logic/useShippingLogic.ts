import { useCallback, useEffect, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { OrderFormValues } from "../OrderFormTypes";
import { ShippingProviderSettings } from "../types";
import { useSupabase } from "@/context/SupabaseContext";
import { getShippingMunicipalities, calculateShippingFee, getShippingProvinces } from "@/api/product-page";

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
  const [currentDeliveryFee, setCurrentDeliveryFee] = useState<number>(initialDeliveryFee);
  const [isLoadingDeliveryFee, setIsLoadingDeliveryFee] = useState<boolean>(false);
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
      console.log('📦 [ZR Express] إرسال طلب حساب التكلفة:', {
        organizationId: tenantId,
        wilayaId: provinceId,
        isHomeDelivery
      });

      const { data, error } = await supabase.functions.invoke('calculate-zrexpress-shipping', {
        body: {
          organizationId: tenantId,
          wilayaId: provinceId,
          isHomeDelivery
        }
      });

      console.log('📦 [ZR Express] رد من Edge Function:', { data, error });

      if (error) throw error;
      return data || { success: false, price: 0, error: 'No data returned' };
    } catch (error) {
      console.error('❌ [ZR Express] خطأ في حساب التكلفة:', error);
      return { success: false, price: 0, error: String(error) };
    }
  };

  const handleDeliveryTypeChange = useCallback(
    (value: "home" | "desk") => {
      console.log('📦 [handleDeliveryTypeChange] تغيير نوع التوصيل:', {
        newDeliveryType: value,
        previousDeliveryType: selectedDeliveryType,
        currentFormValues: {
          province: form.getValues('province'),
          municipality: form.getValues('municipality'),
          deliveryOption: form.getValues('deliveryOption')
        }
      });
      
      setSelectedDeliveryType(value);
      form.setValue("deliveryOption", value, { shouldValidate: true });

      const recalculateShippingPrice = async () => {
        console.log('💰 [handleDeliveryTypeChange] إعادة حساب سعر الشحن بعد تغيير نوع التوصيل');
        setIsLoadingDeliveryFee(true);
        try {
          const currentProvince = form.getValues('province');
          const currentMunicipality = form.getValues('municipality');
          
          console.log('📊 [handleDeliveryTypeChange] بيانات إعادة الحساب:', {
            currentProvince,
            currentMunicipality,
            newDeliveryType: value
          });
          
          if (currentProvince) {
            await updateDeliveryFee(currentProvince, currentMunicipality || null);
          } else {
            console.log('⚠️ [handleDeliveryTypeChange] لا توجد ولاية محددة');
          }
        } catch (error) {
          console.error('❌ [handleDeliveryTypeChange] خطأ في إعادة حساب سعر الشحن:', error);
          const isHomeDelivery = value === 'home';
          const fallbackPrice = isHomeDelivery ? 800 : 300;
          console.log('🔄 [handleDeliveryTypeChange] استخدام سعر احتياطي:', fallbackPrice);
          setCurrentDeliveryFee(fallbackPrice);
        } finally {
          setIsLoadingDeliveryFee(false);
        }
      };
      
      setTimeout(async () => {
        console.log('🏘️ [handleDeliveryTypeChange] إعادة تحميل البلديات بعد تغيير نوع التوصيل');
        setIsLoadingCommunes(true);
        try {
          const currentProvince = form.getValues('province');
          if (currentProvince && tenantId) {
            const municipalities = await getShippingMunicipalities(Number(currentProvince), tenantId);
            console.log('📊 [handleDeliveryTypeChange] البلديات المحملة:', {
              deliveryType: value,
              municipalitiesCount: municipalities?.length || 0
            });
            setCommunesList(Array.isArray(municipalities) ? municipalities : []);
          }
          
          await recalculateShippingPrice();
          
        } catch (e) {
          console.error('❌ [handleDeliveryTypeChange] خطأ في تحميل البلديات:', e);
          setCommunesList([]);
        } finally {
          setIsLoadingCommunes(false);
          console.log('🏁 [handleDeliveryTypeChange] انتهاء تحديث نوع التوصيل');
        }
      }, 100);
    },
    [form, hasShippingIntegration, tenantId, selectedDeliveryType]
  );

  const handleWilayaChange = useCallback(
    async (wilayaId: string) => {
      if (!wilayaId || !tenantId) {
        console.warn('⚠️ [handleWilayaChange] معاملات غير صالحة:', { wilayaId, tenantId });
        return;
      }

      console.log('🌍 [handleWilayaChange] تغيير الولاية:', {
        newWilayaId: wilayaId,
        previousValues: {
          municipality: form.getValues('municipality'),
          stopDeskId: form.getValues('stopDeskId')
        }
      });

      // إعادة تعيين القيم المتعلقة بالبلدية
      form.setValue("municipality", "", { shouldValidate: false, shouldDirty: false });
      form.setValue("stopDeskId", "", { shouldValidate: false, shouldDirty: false });
      setCommunesList([]);
      setYalidineCentersList([]);

      setTimeout(async () => {
        console.log('🏘️ [handleWilayaChange] بدء تحميل البلديات للولاية:', wilayaId);
        setIsLoadingCommunes(true);
        
        try {
          // مسح التخزين المؤقت للبلديات أولاً
          const cacheKey = `shipping_municipalities:${tenantId}:${wilayaId}`;
          localStorage.removeItem(cacheKey);
          console.log('🗑️ [handleWilayaChange] تم مسح التخزين المؤقت للبلديات:', cacheKey);
          
          let municipalities = null;
          let municipalitiesLoaded = false;
          
          // المحاولة الأولى: استخدام API function
          try {
            console.log('🔄 [handleWilayaChange] محاولة تحميل البلديات عبر API...');
            municipalities = await getShippingMunicipalities(Number(wilayaId), tenantId);
            
            if (municipalities && Array.isArray(municipalities) && municipalities.length > 0) {
              console.log('✅ [handleWilayaChange] تم تحميل البلديات بنجاح عبر API:', {
                count: municipalities.length,
                firstFew: municipalities.slice(0, 3).map(m => ({ id: m.id, name: m.name }))
              });
              municipalitiesLoaded = true;
            } else {
              console.warn('⚠️ [handleWilayaChange] API أرجع بيانات فارغة أو غير صالحة:', municipalities);
            }
          } catch (apiError) {
            console.error('❌ [handleWilayaChange] فشل تحميل البلديات عبر API:', apiError);
          }
          
          // المحاولة الثانية: الاستعلام المباشر إذا فشلت الطريقة الأولى
          if (!municipalitiesLoaded) {
            try {
              console.log('🔄 [handleWilayaChange] محاولة الاستعلام المباشر من قاعدة البيانات...');
              const { data: directData, error: directError } = await supabase.rpc(
                'get_shipping_municipalities' as any,
                {
                  p_wilaya_id: Number(wilayaId),
                  p_org_id: tenantId
                }
              );
              
              console.log('📊 [handleWilayaChange] نتيجة الاستعلام المباشر:', {
                hasData: !!directData,
                isArray: Array.isArray(directData),
                dataLength: directData?.length,
                error: directError?.message,
                firstItem: directData?.[0]
              });
              
              if (!directError && directData && Array.isArray(directData) && directData.length > 0) {
                municipalities = directData;
                municipalitiesLoaded = true;
                console.log('✅ [handleWilayaChange] تم تحميل البلديات بنجاح عبر الاستعلام المباشر:', {
                  count: directData.length,
                  firstFew: directData.slice(0, 3).map(m => ({ id: m.id, name: m.name }))
                });
              } else {
                console.error('❌ [handleWilayaChange] فشل الاستعلام المباشر:', {
                  error: directError?.message,
                  hasData: !!directData,
                  dataType: typeof directData
                });
              }
            } catch (directError) {
              console.error('❌ [handleWilayaChange] خطأ في الاستعلام المباشر:', directError);
            }
          }
          
          // معالجة النتائج
          if (municipalitiesLoaded && municipalities && Array.isArray(municipalities) && municipalities.length > 0) {
            console.log('📊 [handleWilayaChange] البلديات المحملة نهائياً:', {
              wilayaId,
              tenantId,
              municipalitiesCount: municipalities.length,
              municipalities: municipalities.slice(0, 5) // عرض أول 5 بلديات
            });
            
            setCommunesList(municipalities);
            
            // تحديث البلدية الأولى في النموذج تلقائياً
            const firstMunicipalityId = municipalities[0]?.id;
            if (firstMunicipalityId) {
              form.setValue("municipality", firstMunicipalityId.toString(), { shouldValidate: true });
              console.log('✅ [handleWilayaChange] تم تحديث البلدية في النموذج:', firstMunicipalityId);
              
              // إعادة حساب سعر التوصيل للولاية الجديدة
              try {
                console.log('💰 [handleWilayaChange] إعادة حساب سعر التوصيل للولاية الجديدة:', {
                  wilayaId,
                  firstMunicipalityId,
                  deliveryOption: form.getValues('deliveryOption')
                });
                // سيتم حساب السعر تلقائياً عند تغيير البلدية
              } catch (feeError) {
                console.error('❌ [handleWilayaChange] خطأ في حساب سعر التوصيل:', feeError);
              }
            }
          } else {
            console.warn('⚠️ [handleWilayaChange] لم يتم العثور على بلديات للولاية:', {
              wilayaId,
              municipalitiesLoaded,
              municipalitiesType: typeof municipalities,
              municipalitiesLength: municipalities?.length
            });
            setCommunesList([]);
          }
          
        } catch (generalError) {
          console.error('❌ [handleWilayaChange] خطأ عام في تحميل البلديات:', {
            wilayaId,
            error: generalError,
            errorMessage: generalError?.message
          });
          setCommunesList([]);
        } finally {
          setIsLoadingCommunes(false);
          console.log('🏁 [handleWilayaChange] انتهاء تحميل البلديات للولاية:', wilayaId);
        }
      }, 100);
    },
    [form, tenantId]
  );

  // تحميل إعدادات شركة الشحن الافتراضية
  useEffect(() => {
    const fetchDefaultProviderSettings = async () => {
      // أولوية للمنتج: إذا كان المنتج له shipping_provider_id محدد، نستخدمه
      let effectiveProviderId = null;
      
      // التحقق من إعدادات المنتج أولاً
      if (productId) {
        try {
          const { data: productData, error: productError } = await supabase
            .from('products')
            .select('shipping_provider_id, shipping_method_type')
            .eq('id', productId)
            .single();
          
          if (!productError && productData && productData.shipping_provider_id) {
            effectiveProviderId = productData.shipping_provider_id;
            console.log('🎯 [fetchDefaultProviderSettings] استخدام شركة الشحن من المنتج:', effectiveProviderId);
          }
        } catch (error) {
          console.error('❌ [fetchDefaultProviderSettings] خطأ في جلب بيانات المنتج:', error);
        }
      }
      
      // إذا لم يجد شركة شحن في المنتج، استخدم إعدادات النموذج
      if (!effectiveProviderId) {
        effectiveProviderId = formSettings?.settings?.shipping_integration?.provider_id || 
                             formSettings?.settings?.shipping_integration?.provider;
        console.log('🔧 [fetchDefaultProviderSettings] استخدام شركة الشحن من إعدادات النموذج:', effectiveProviderId);
      }
      
      console.log('🔧 [fetchDefaultProviderSettings] تحميل إعدادات شركة الشحن الافتراضية:', {
        hasShippingIntegration,
        effectiveProviderId,
        productId,
        provider_id: formSettings?.settings?.shipping_integration?.provider_id,
        provider: formSettings?.settings?.shipping_integration?.provider,
        tenantId,
        formSettings: formSettings?.settings?.shipping_integration
      });
      
      if (!effectiveProviderId || !tenantId) {
        console.log('❌ [fetchDefaultProviderSettings] لا توجد شركة شحن مكوّنة أو معرف المؤسسة مفقود');
        setShippingProviderSettings(null);
        return;
      }

      // التحقق من صحة providerId قبل النداء على قاعدة البيانات
      const numericProviderId = parseInt(effectiveProviderId);
      if (isNaN(numericProviderId) || numericProviderId <= 0) {
        console.log('⚠️ [fetchDefaultProviderSettings] معرف شركة الشحن غير صالح:', effectiveProviderId);
        setShippingProviderSettings(null);
        return;
      }

      setIsLoadingProviderSettings(true);
      try {
        const { data: providerData, error: providerError } = await supabase
          .from("shipping_providers")
          .select("code, name")
          .eq("id", numericProviderId)
          .single();

        console.log('📋 [fetchDefaultProviderSettings] بيانات شركة الشحن الافتراضية:', {
          providerId: numericProviderId,
          providerData,
          providerError
        });

        if (providerData && !providerError) {
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
          
          console.log('⚙️ [fetchDefaultProviderSettings] إعدادات شركة الشحن المحملة:', defaultSettings);
          setShippingProviderSettings(defaultSettings);
        } else {
          console.log('⚠️ [fetchDefaultProviderSettings] لم يتم العثور على بيانات شركة الشحن');
          setShippingProviderSettings(null);
        }
      } catch (error) {
        console.error('❌ [fetchDefaultProviderSettings] خطأ في تحميل إعدادات شركة الشحن:', error);
        setShippingProviderSettings(null);
      } finally {
        setIsLoadingProviderSettings(false);
        console.log('🏁 [fetchDefaultProviderSettings] انتهاء تحميل إعدادات شركة الشحن');
      }
    };

    fetchDefaultProviderSettings();
  }, [formSettings, tenantId, hasShippingIntegration, productId]);

  const updateDeliveryFee = useCallback(async (provinceId: string | number, municipalityId: string | number | null) => {
    if (!provinceId || !tenantId) return;
    
    console.log('🚚 [updateDeliveryFee] بدء حساب سعر التوصيل:', {
      provinceId,
      municipalityId,
      tenantId,
      productId
    });
    
    setIsLoadingDeliveryFee(true);
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
        
        console.log('📦 [updateDeliveryFee] بيانات المنتج:', {
          productData,
          productError,
          shipping_provider_id: productData?.shipping_provider_id,
          shipping_method_type: productData?.shipping_method_type
        });
        
        if (!productError && productData) {
          // التحقق من نوع طريقة الشحن أولاً
          if (productData.shipping_method_type === 'custom') {
            console.log('🎨 [updateDeliveryFee] المنتج يستخدم طريقة شحن مخصصة');
            
            try {
              const { data: customSettings, error: settingsError } = await supabase
                .from('shipping_provider_settings')
                .select('*')
                .eq('organization_id', tenantId)
                .eq('api_key', 'custom_shipping')
                .eq('is_enabled', true)
                .single();

              console.log('⚙️ [updateDeliveryFee] إعدادات الشحن المخصصة:', {
                customSettings,
                settingsError,
                settings: customSettings?.settings
              });

              if (!settingsError && customSettings && customSettings.settings) {
                const settings = customSettings.settings as any;
                let price = 0;

                if (settings.use_unified_price || settings.use_uniform_rates) {
                  console.log('💰 [updateDeliveryFee] استخدام أسعار موحدة:', {
                    use_unified_price: settings.use_unified_price,
                    use_uniform_rates: settings.use_uniform_rates,
                    currentDeliveryOption,
                    unified_home_price: settings.unified_home_price,
                    unified_desk_price: settings.unified_desk_price,
                    uniform_home_rate: settings.uniform_home_rate,
                    uniform_office_rate: settings.uniform_office_rate
                  });
                  
                  if (currentDeliveryOption === 'home') {
                    if (settings.is_free_delivery_home || settings.free_home_delivery) {
                      price = 0;
                      console.log('🆓 [updateDeliveryFee] توصيل منزلي مجاني');
                    } else {
                      price = settings.unified_home_price || settings.uniform_home_rate || 0;
                      console.log('🏠 [updateDeliveryFee] سعر التوصيل المنزلي الموحد:', price);
                    }
                  } else {
                    if (settings.is_free_delivery_desk || settings.free_office_delivery) {
                      price = 0;
                      console.log('🆓 [updateDeliveryFee] توصيل مكتبي مجاني');
                    } else {
                      price = settings.unified_desk_price || settings.uniform_office_rate || 0;
                      console.log('🏢 [updateDeliveryFee] سعر التوصيل المكتبي الموحد:', price);
                    }
                  }
                } else {
                  console.log('🗺️ [updateDeliveryFee] استخدام أسعار مخصصة بحسب الولاية');
                  
                  const customRates = settings.custom_rates || settings.shipping_rates;
                  console.log('📊 [updateDeliveryFee] الأسعار المخصصة:', {
                    customRates,
                    provinceId,
                    provinceRates: customRates?.[provinceId]
                  });
                  
                  if (customRates && customRates[provinceId]) {
                    const provinceRates = customRates[provinceId];
                    if (currentDeliveryOption === 'home') {
                      price = provinceRates.home_delivery || 0;
                      console.log('🏠 [updateDeliveryFee] سعر التوصيل المنزلي للولاية:', price);
                    } else {
                      price = provinceRates.office_delivery || 0;
                      console.log('🏢 [updateDeliveryFee] سعر التوصيل المكتبي للولاية:', price);
                    }
                  } else {
                    price = settings.default_price || 0;
                    console.log('🔄 [updateDeliveryFee] استخدام السعر الافتراضي:', price);
                  }
                }

                console.log('✅ [updateDeliveryFee] السعر النهائي للشحن المخصص:', price);
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
              console.error('❌ [updateDeliveryFee] خطأ في جلب إعدادات الشحن المخصصة:', error);
            }
          }
          
          // التعامل مع شركات الشحن العادية
          if (productData.shipping_provider_id) {
            console.log('🏢 [updateDeliveryFee] المنتج يستخدم شركة شحن عادية:', productData.shipping_provider_id);
            
            // إضافة تحقق من صحة ID قبل النداء على قاعدة البيانات
            const providerId = Number(productData.shipping_provider_id);
            if (isNaN(providerId) || providerId <= 0) {
              console.log('⚠️ [updateDeliveryFee] معرف شركة الشحن غير صالح:', productData.shipping_provider_id);
            } else {
              const { data: providerData } = await supabase
                .from('shipping_providers')
                .select('code')
                .eq('id', providerId)
                .single();
              
              console.log('🔍 [updateDeliveryFee] بيانات شركة الشحن:', {
                providerId: providerId,
                providerData
              });
              
              if (providerData && providerData.code === 'zrexpress') {
                console.log('🚛 [updateDeliveryFee] استخدام ZR Express');
                
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
                  
                  console.log('📞 [updateDeliveryFee] استدعاء ZR Express API:', {
                    tenantId,
                    provinceId: provinceId.toString(),
                    isHomeDelivery
                  });
                  
                  const response = await calculateZRExpressShippingPrice(
                    tenantId,
                    provinceId.toString(),
                    isHomeDelivery
                  );
                  
                  console.log('📨 [updateDeliveryFee] استجابة ZR Express:', response);
                  
                  if (response.success && typeof response.price === 'number') {
                    console.log('✅ [updateDeliveryFee] نجح حساب سعر ZR Express:', response.price);
                    setCurrentDeliveryFee(response.price);
                    return;
                  } else if (response.error) {
                    console.log('⚠️ [updateDeliveryFee] خطأ من ZR Express، استخدام سعر افتراضي:', response.error);
                    setCurrentDeliveryFee(isHomeDelivery ? 800 : 300);
                    return;
                  }
                } catch (error) {
                  console.error('❌ [updateDeliveryFee] خطأ في ZR Express:', error);
                  const isHomeDelivery = currentDeliveryOption === 'home';
                  setCurrentDeliveryFee(isHomeDelivery ? 800 : 300);
                  return;
                }
              // التحقق من شركات Ecotrack
              } else if (providerData && isEcotrackProvider(providerData.code)) {
                console.log('🌿 [updateDeliveryFee] استخدام شركة Ecotrack:', providerData.code);
                
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
                  console.log('📞 [updateDeliveryFee] استدعاء Ecotrack API:', {
                    tenantId,
                    providerCode: providerData.code,
                    wilayaId: provinceId.toString(),
                    deliveryType: currentDeliveryOption
                  });
                  
                  const response = await calculateEcotrackShippingPrice(
                    tenantId,
                    providerData.code,
                    provinceId.toString(),
                    currentDeliveryOption
                  );
                  
                  console.log('📨 [updateDeliveryFee] استجابة Ecotrack:', response);
                  
                  if (response.success) {
                    console.log('✅ [updateDeliveryFee] نجح حساب سعر Ecotrack:', response.price);
                    setCurrentDeliveryFee(response.price);
                    return;
                  } else {
                    console.error('❌ [updateDeliveryFee] فشل حساب سعر Ecotrack:', response.error);
                    setCurrentDeliveryFee(currentDeliveryOption === 'home' ? 800 : 300);
                  }
                } catch (error) {
                  console.error('❌ [updateDeliveryFee] خطأ في Ecotrack API:', error);
                  setCurrentDeliveryFee(currentDeliveryOption === 'home' ? 800 : 300);
                }
                
                return;
              } else if (providerData) {
                console.log('🏢 [updateDeliveryFee] شركة شحن أخرى:', providerData.code);
              }
            }
          }
        }
      }

      // المنطق الافتراضي لحساب سعر الشحن
      console.log('🔄 [updateDeliveryFee] استخدام المنطق الافتراضي لحساب السعر');
      
      const estimatedWeight = Math.max(1, Math.ceil(quantity || 1));
      
      // التحقق من صحة municipalityId
      const validMunicipalityId = municipalityId && !isNaN(Number(municipalityId)) ? Number(municipalityId) : null;
      
      console.log('📊 [updateDeliveryFee] معاملات حساب السعر الافتراضي:', {
        tenantId,
        provinceId: Number(provinceId),
        municipalityId: validMunicipalityId,
        originalMunicipalityId: municipalityId,
        currentDeliveryOption,
        estimatedWeight
      });

      // إذا لم تكن البلدية محددة، نحاول الحصول على أول بلدية متاحة في الولاية
      let finalMunicipalityId = validMunicipalityId;
      if (!finalMunicipalityId) {
        console.log('⚠️ [updateDeliveryFee] لا توجد بلدية محددة، جاري البحث عن أول بلدية متاحة');
        try {
          const municipalities = await getShippingMunicipalities(Number(provinceId), tenantId || "");
          if (municipalities && municipalities.length > 0) {
            finalMunicipalityId = municipalities[0].id;
            console.log('✅ [updateDeliveryFee] تم اختيار أول بلدية متاحة:', finalMunicipalityId);
            
            // تحديث البلدية في النموذج أيضاً
            form.setValue('municipality', finalMunicipalityId.toString());
          }
        } catch (error) {
          console.error('❌ [updateDeliveryFee] خطأ في جلب البلديات:', error);
        }
      }

      // إذا لا تزال البلدية غير محددة، إظهار خطأ واضح
      if (!finalMunicipalityId) {
        console.error('❌ [updateDeliveryFee] لا توجد بلدية متاحة للولاية المحددة');
        setCurrentDeliveryFee(0); // تعيين 0 لإظهار أن هناك مشكلة
        throw new Error('لا توجد بلديات متاحة للولاية المحددة. يرجى اختيار ولاية أخرى.');
      }

      console.log('📞 [updateDeliveryFee] استدعاء calculateShippingFee:', {
        tenantId,
        provinceId: Number(provinceId),
        finalMunicipalityId,
        currentDeliveryOption,
        estimatedWeight
      });

      // استدعاء دالة حساب السعر مع معالجة الأخطاء
      try {
        const fee = await calculateShippingFee(
          tenantId,
          Number(provinceId),
          finalMunicipalityId,
          currentDeliveryOption,
          estimatedWeight,
          undefined, // shippingProviderCloneIdInput
          productId // productId for Ecotrack checking
        );
        
        console.log('✅ [updateDeliveryFee] السعر المحسوب بالطريقة الافتراضية:', fee);
        
        // استخدام السعر المحسوب إذا كان أكبر من 0
        if (fee > 0) {
          console.log('💰 [updateDeliveryFee] استخدام السعر المحسوب من قاعدة البيانات:', fee);
          setCurrentDeliveryFee(fee);
        } else {
          // إذا كان السعر 0، فهذا يعني عدم وجود بيانات شحن
          console.warn('⚠️ [updateDeliveryFee] السعر 0 - لا توجد بيانات شحن لهذه الوجهة');
          throw new Error('لا تتوفر أسعار شحن لهذه الوجهة');
        }
      } catch (shippingError) {
        console.error('❌ [updateDeliveryFee] خطأ في حساب السعر:', shippingError);
        
        // إظهار رسالة خطأ للمستخدم
        const errorMessage = shippingError instanceof Error ? shippingError.message : 'حدث خطأ في حساب أسعار الشحن';
        
        // يمكن إضافة toast notification هنا إذا كان متاحاً
        console.error('💬 [updateDeliveryFee] رسالة للمستخدم:', errorMessage);
        
        // تعيين سعر 0 لإظهار أن هناك مشكلة في الحساب
        setCurrentDeliveryFee(0);
        
        // رفع الخطأ مرة أخرى ليتم التعامل معه في catch الخارجي
        throw shippingError;
      }
    } catch (error) {
      console.error('❌ [updateDeliveryFee] خطأ عام:', error);
      const currentDeliveryOption = form.getValues("deliveryOption") || 'home';
      const isHomeDelivery = currentDeliveryOption === 'home';
      const fallbackPrice = isHomeDelivery ? 1000 : 400;
      console.log('🔄 [updateDeliveryFee] استخدام سعر احتياطي:', fallbackPrice);
      setCurrentDeliveryFee(fallbackPrice);
    } finally {
      setIsLoadingDeliveryFee(false);
      console.log('🏁 [updateDeliveryFee] انتهاء حساب سعر التوصيل');
    }
  }, [tenantId, form, quantity, selectedDeliveryType, initialDeliveryFee, productId, shippingProviderSettings, formSettings]);

  // دالة للتعامل مع تغيير شركة التوصيل
  const handleShippingProviderChange = useCallback(async (providerId: string) => {
    console.log('🔄 [handleShippingProviderChange] تغيير شركة التوصيل:', providerId);
    
    if (!providerId) return;
    
    // التحقق من صحة providerId
    const numericProviderId = parseInt(providerId);
    if (isNaN(numericProviderId) || numericProviderId <= 0) {
      console.log('⚠️ [handleShippingProviderChange] معرف شركة الشحن غير صالح:', providerId);
      return;
    }
    
    try {
      const { data: providerData, error } = await supabase
        .from('shipping_providers')
        .select('code, name')
        .eq('id', numericProviderId)
        .single();
      
      console.log('🔍 [handleShippingProviderChange] بيانات الشركة الجديدة:', {
        providerId: numericProviderId,
        providerData,
        error
      });
      
      if (error || !providerData) {
        console.error('❌ [handleShippingProviderChange] خطأ في جلب بيانات الشركة:', error);
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
      
      console.log('⚙️ [handleShippingProviderChange] إعدادات الشركة الجديدة:', defaultSettings);
      setShippingProviderSettings(defaultSettings);
      
      const currentProvince = form.getValues('province');
      
      if (currentProvince) {
        console.log('📍 [handleShippingProviderChange] إعادة تحميل البلديات للولاية:', currentProvince);
        setIsLoadingCommunes(true);
        try {
          const municipalities = await getShippingMunicipalities(Number(currentProvince), tenantId || "");
          console.log('🏘️ [handleShippingProviderChange] البلديات المحملة:', municipalities);
          setCommunesList(Array.isArray(municipalities) ? municipalities : []);
        } catch (e) {
          console.error('❌ [handleShippingProviderChange] خطأ في تحميل البلديات:', e);
          setCommunesList([]);
        } finally {
          setIsLoadingCommunes(false);
        }
      }
      
    } catch (error) {
      console.error('❌ [handleShippingProviderChange] خطأ عام في تغيير شركة التوصيل:', error);
    }
  }, [form, tenantId]);

  // دالة لتحديد معرف شركة الشحن المناسبة
  const getAppropriateShippingId = useCallback((selectedProvider: string | null): string | number | null => {
    console.log('🔍 [getAppropriateShippingId] selectedProvider:', selectedProvider);
    
    if (!selectedProvider || selectedProvider === "null" || selectedProvider === "default_provider") {
      console.log('🔍 [getAppropriateShippingId] no provider selected, returning null');
      return null;
    }
    
    console.log('🔍 [getAppropriateShippingId] returning:', selectedProvider);
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

  // إضافة دالة لحساب أسعار Ecotrack
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

      // استدعاء API لجلب الأسعار
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
