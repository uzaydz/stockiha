import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import {
  getShippingProvinces,
  getShippingMunicipalities,
  calculateShippingFee,
} from "@/api/product-page";
import { getShippingProviderClone } from "../index"; // Assuming index.ts exports this
import type { ShippingProviderSettings } from "../types";
import type { OrderFormValues } from "../OrderFormTypes";
import { UseFormReturn } from "react-hook-form";
import { calculateShippingPrice as calculateZRExpressShippingPrice } from "@/api/zrexpress/service";

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
  shippingCloneId: string | number | null;
  hasShippingIntegration: boolean;
  wilayasList: any[];
  isLoadingWilayas: boolean;
  handleDeliveryTypeChange: (value: "home" | "desk") => void;
  handleWilayaChange: (wilayaId: string) => void;
  updateDeliveryFee: (provinceId: string | number, municipalityId: string | number | null) => Promise<void>;
  getAppropriateShippingId: (selectedProvider: string | null) => string | number | null;
  handleShippingProviderChange: (providerId: string) => Promise<void>;
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
  formSettings: any, // Consider a more specific type
  initialDeliveryFee: number,
  quantity: number,
  productId?: string // إضافة معرف المنتج كمعامل اختياري
): ShippingLogicReturn => {
  const [currentDeliveryFee, setCurrentDeliveryFee] = useState(initialDeliveryFee);
  const [isLoadingDeliveryFee, setIsLoadingDeliveryFee] = useState(false);
  const [communesList, setCommunesList] = useState<any[]>([]);
  const [isLoadingCommunes, setIsLoadingCommunes] = useState(false);
  const [selectedWilaya, setSelectedWilaya] = useState<string | null>(null); // Not directly used in return, but influences others
  const [selectedDeliveryType, setSelectedDeliveryType] = useState<"home" | "desk">("home");
  const [yalidineCentersList, setYalidineCentersList] = useState<any[]>([]);
  const [isLoadingYalidineCenters, setIsLoadingYalidineCenters] = useState(false);
  const [selectedStopDeskId, setSelectedStopDeskId] = useState<string | null>(null); // Not directly used, but set by handlers

  const [shippingProviderSettings, setShippingProviderSettings] = useState<ShippingProviderSettings | null>(null);
  const [isLoadingProviderSettings, setIsLoadingProviderSettings] = useState(false);
  const [shippingProviderCode, setShippingProviderCode] = useState<string>("yalidine");
  const [shippingCloneId, setShippingCloneId] = useState<string | number | null>(null);

  const hasShippingIntegration = !!(
    formSettings?.settings?.shipping_integration?.enabled &&
    formSettings?.settings?.shipping_integration?.provider_id
  );

  const { data: wilayasList = [], isLoading: isLoadingWilayas } = useQuery({
    queryKey: ["shipping-provinces", tenantId],
    queryFn: () => (tenantId ? getShippingProvinces(tenantId) : Promise.resolve([])),
    enabled: !!tenantId && hasShippingIntegration,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });

  // دالة مساعدة لتحميل البلديات لـ ZRExpress
  const loadMunicipalitiesForZRExpress = useCallback(async (provinceId: string) => {
    setIsLoadingCommunes(true);
    try {
      const municipalities = await getShippingMunicipalities(Number(provinceId), tenantId || "");
      setCommunesList(Array.isArray(municipalities) ? municipalities : []);
    } catch (e) {
      setCommunesList([]);
    } finally {
      setIsLoadingCommunes(false);
    }
  }, [tenantId]);

  const handleDeliveryTypeChange = useCallback(
    (value: "home" | "desk") => {
      setSelectedDeliveryType(value);
      form.setValue("deliveryOption", value);
      
      // إعادة تعيين القيم ليتم اختيارها من جديد
      form.setValue("municipality", "", { shouldValidate: false, shouldDirty: false });
      form.setValue("stopDeskId", "", { shouldValidate: false, shouldDirty: false });
      
      // مسح القوائم لإعادة تحميلها
      setYalidineCentersList([]);
      setCommunesList([]);

      const currentProvince = form.getValues("province");
      if (!currentProvince || !hasShippingIntegration) return;
      
      // أضف تأخيرًا قصيرًا للسماح للحالة بالتحديث
      setTimeout(async () => {

        // تحميل البلديات دائمًا بغض النظر عن نوع التوصيل أو شركة الشحن
        setIsLoadingCommunes(true);
        try {
          const municipalities = await getShippingMunicipalities(Number(currentProvince), tenantId || "");
          setCommunesList(Array.isArray(municipalities) ? municipalities : []);
          
          // إعادة حساب سعر الشحن بعد تحميل البلديات
          if (municipalities && municipalities.length > 0) {
            // اختيار البلدية الأولى افتراضيًا لحساب السعر
            const firstMunicipality = municipalities[0].id.toString();
            form.setValue("municipality", firstMunicipality, { shouldValidate: false });
            
            // سنقوم بإعادة حساب سعر الشحن عندما يتم اختيار البلدية
            // سيتم استدعاء recalculateAndSetDeliveryPrice في useEffect
          } else {
            // لا يوجد بلديات للاختيار
          }
          
          // دالة مساعدة لإعادة حساب سعر الشحن
          // تستخدم مباشرة بدلاً من updateDeliveryFee لتجنب مشكلة التبعية الدائرية
          const recalculateShippingPrice = async () => {
            if (!tenantId) return;
            setIsLoadingDeliveryFee(true);
            
            // بالنسبة لـ ZRExpress، نتحقق مما إذا كان نوع التوصيل هو للمنزل أم للمكتب
            const isHomeDelivery = value === 'home';
            
            try {
              // الاتصال مباشرة بـ Edge Function
              const { data, error } = await supabase.functions.invoke('calculate-zrexpress-shipping', {
                method: 'POST',
                body: {
                  organizationId: tenantId,
                  wilayaId: currentProvince,
                  isHomeDelivery
                }
              });
              
              if (!error && data && data.success) {
                setCurrentDeliveryFee(data.price);
              } else {
                setCurrentDeliveryFee(isHomeDelivery ? 800 : 300);
              }
            } catch (e) {
              setCurrentDeliveryFee(isHomeDelivery ? 800 : 300);
            } finally {
              setIsLoadingDeliveryFee(false);
            }
          };
          
          // حساب سعر الشحن الجديد
          await recalculateShippingPrice();
          
        } catch (e) {
          setCommunesList([]);
        } finally {
          setIsLoadingCommunes(false);
        }
      }, 100);
    },
    [form, hasShippingIntegration, tenantId, supabase.functions]
  );

  const handleWilayaChange = useCallback(
    (wilayaId: string) => {
      setSelectedWilaya(wilayaId);
      form.setValue("province", wilayaId, { shouldValidate: true });
      form.setValue("municipality", "", { shouldValidate: false, shouldDirty: false });
      form.setValue("stopDeskId", "", { shouldValidate: false, shouldDirty: false });
      setCommunesList([]);
      setYalidineCentersList([]);

      const currentDeliveryOption = form.getValues("deliveryOption");
      setTimeout(async () => {

        // تحميل البلديات دائمًا بغض النظر عن نوع التوصيل أو شركة الشحن
        setIsLoadingCommunes(true);
        try {
          const municipalities = await getShippingMunicipalities(Number(wilayaId), tenantId || "");
          setCommunesList(Array.isArray(municipalities) ? municipalities : []);
        } catch (e) {
          setCommunesList([]);
        } finally {
          setIsLoadingCommunes(false);
        }
      }, 100);
    },
    [form, tenantId]
  );

  const extractShippingCloneId = useCallback(async (): Promise<string | number | null> => {
    if (formSettings?.settings?.shipping_clone_id) {
      return formSettings.settings.shipping_clone_id;
    }
    if (formSettings?.purchase_page_config?.shipping_clone_id) {
      return formSettings.purchase_page_config.shipping_clone_id;
    }
    if (formSettings?.settings?.shipping_integration?.enabled && formSettings.settings.shipping_integration.provider_id) {
      try {
        const { data: providerData } = await supabase
          .from("shipping_providers")
          .select("code")
          .eq("id", formSettings.settings.shipping_integration.provider_id)
          .single();
        if (providerData) setShippingProviderCode(providerData.code);
      } catch (error) {
      }
    }
    return null;
  }, [formSettings, setShippingProviderCode]);

  const getAppropriateShippingId = useCallback((selectedProvider: string | null): string | number | null => {
    if (!selectedProvider || selectedProvider === "default_provider" || selectedProvider === "null") {
      return formSettings?.settings?.shipping_integration?.provider_id || null;
    }
    const selectedCloneId = parseInt(selectedProvider);
    if (!isNaN(selectedCloneId)) return selectedCloneId;
    return formSettings?.settings?.shipping_integration?.provider_id || null;
  }, [formSettings]);

  useEffect(() => {
    const getCloneId = async () => {
      const cloneId = await extractShippingCloneId();
      setShippingCloneId(cloneId);
    };
    if (formSettings && tenantId) getCloneId();
  }, [formSettings, tenantId, extractShippingCloneId]);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!shippingCloneId) {
        if (formSettings?.settings?.shipping_integration?.provider_id) {
            try {
                const { data: providerData } = await supabase
                    .from("shipping_providers")
                    .select("code, name") 
                    .eq("id", formSettings.settings.shipping_integration.provider_id)
                    .single();
                if (providerData) {
                    setShippingProviderCode(providerData.code);
                    const defaultSettings: ShippingProviderSettings = {
                        provider_code: providerData.code,
                        is_home_delivery_enabled: true, 
                        is_desk_delivery_enabled: true, 
                        id: null, 
                        original_provider_id: formSettings.settings.shipping_integration.provider_id,
                        name: providerData.name || "Default Provider", 
                        is_active: true,
                        use_unified_price: false,
                        unified_home_price: 0,
                        unified_desk_price: 0,
                        is_free_delivery_home: false,
                        is_free_delivery_desk: false,
                    };
                    setShippingProviderSettings(defaultSettings);
                }
            } catch (error) {
                setShippingProviderSettings(null); 
            }
        } else {
            setShippingProviderSettings(null); 
        }
        return;
      }
      setIsLoadingProviderSettings(true);
      try {
        const cloneData = await getShippingProviderClone(Number(shippingCloneId));
        if (cloneData) {
          setShippingProviderSettings(cloneData as ShippingProviderSettings);
          const typedCloneData = cloneData as ShippingProviderSettings;
          if (!typedCloneData.is_home_delivery_enabled && typedCloneData.is_desk_delivery_enabled) {
            setSelectedDeliveryType("desk");
            form.setValue("deliveryOption", "desk");
          } else {
            setSelectedDeliveryType("home");
            form.setValue("deliveryOption", "home");
          }
        } else {
          setShippingProviderSettings(null);
          setSelectedDeliveryType("home");
          form.setValue("deliveryOption", "home");
        }
      } catch (error) {
        setShippingProviderSettings(null);
        setSelectedDeliveryType("home");
        form.setValue("deliveryOption", "home");
      } finally {
        setIsLoadingProviderSettings(false);
      }
    };
    fetchSettings();
  }, [shippingCloneId, form, formSettings, tenantId]);

  useEffect(() => {
    if (shippingProviderSettings) {
      if (shippingProviderSettings.is_home_delivery_enabled && !shippingProviderSettings.is_desk_delivery_enabled) {
        if (selectedDeliveryType !== "home") {
            setSelectedDeliveryType("home");
            form.setValue("deliveryOption", "home");
        }
      } else if (!shippingProviderSettings.is_home_delivery_enabled && shippingProviderSettings.is_desk_delivery_enabled) {
        if (selectedDeliveryType !== "desk") {
            setSelectedDeliveryType("desk");
            form.setValue("deliveryOption", "desk");
        }
      }
    }
  }, [shippingProviderSettings, selectedDeliveryType, form]);

  const updateDeliveryFee = useCallback(async (provinceId: string | number, municipalityId: string | number | null) => {
    if (!provinceId || !tenantId) return;
    setIsLoadingDeliveryFee(true);
    try {
      // قراءة نوع التوصيل الحالي من النموذج بشكل مباشر
      const currentDeliveryOption = form.getValues("deliveryOption");
      // التأكد من أن selectedDeliveryType يتماشى مع deliveryOption الحالية
      if (currentDeliveryOption === 'desk' || currentDeliveryOption === 'home') {
        if (selectedDeliveryType !== currentDeliveryOption) {
          setSelectedDeliveryType(currentDeliveryOption);
        }
      }

      // التحقق من إعدادات المنتج أولاً
      if (productId) {
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('shipping_provider_id, shipping_clone_id, use_shipping_clone')
          .eq('id', productId)
          .single();
        
        if (!productError && productData) {
          if (productData.shipping_provider_id) {
            const { data: providerData } = await supabase
              .from('shipping_providers')
              .select('code')
              .eq('id', productData.shipping_provider_id)
              .single();
            
            if (providerData && providerData.code === 'zrexpress') {
              // قم بتعيين إعدادات مزود الشحن يدوياً إذا لم تكن قد تم تعيينها
              if (!shippingProviderSettings || shippingProviderSettings.provider_code !== 'zrexpress') {
                const zrExpressSettings: ShippingProviderSettings = {
                  provider_code: 'zrexpress',
                  is_home_delivery_enabled: true, 
                  is_desk_delivery_enabled: true, 
                  id: null, 
                  original_provider_id: productData.shipping_provider_id,
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
                // استخدام قيمة currentDeliveryOption بدلاً من selectedDeliveryType للتحقق
                const isHomeDelivery = currentDeliveryOption === 'home';
                
                const response = await calculateZRExpressShippingPrice(
                  tenantId,
                  provinceId.toString(),
                  isHomeDelivery // استخدام isHomeDelivery المستند إلى currentDeliveryOption
                );
                
                // التحقق من نجاح العملية وتحديث السعر
                if (response.success && typeof response.price === 'number') {
                  setCurrentDeliveryFee(response.price);
                  return;
                } else if (response.error) {
                  // استخدام السعر الافتراضي في حالة الخطأ
                  setCurrentDeliveryFee(isHomeDelivery ? 800 : 300);
                  return;
                }
              } catch (error) {
                // استخدام السعر الافتراضي في حالة الخطأ
                const isHomeDelivery = currentDeliveryOption === 'home';
                setCurrentDeliveryFee(isHomeDelivery ? 800 : 300);
                return;
              }
            }
          }
        }
      }

      // المنطق الافتراضي لحساب سعر الشحن
      const selectedDeliveryCompany = form.getValues("deliveryCompany");
      const appropriateShippingId = getAppropriateShippingId(selectedDeliveryCompany);
      const estimatedWeight = Math.max(1, Math.ceil(quantity || 1));

      const fee = await calculateShippingFee(
        tenantId,
        Number(provinceId),
        municipalityId ? Number(municipalityId) : 0,
        currentDeliveryOption,
        estimatedWeight,
        appropriateShippingId ? Number(appropriateShippingId) : undefined
      );
      setCurrentDeliveryFee(fee);
    } catch (error) {
      // استخدام السعر الافتراضي في حالة الخطأ
      const currentDeliveryOption = form.getValues("deliveryOption") || 'home';
      const isHomeDelivery = currentDeliveryOption === 'home';
      setCurrentDeliveryFee(isHomeDelivery ? 800 : 300);
    } finally {
      setIsLoadingDeliveryFee(false);
    }
  }, [tenantId, form, getAppropriateShippingId, quantity, selectedDeliveryType, initialDeliveryFee, productId, shippingProviderSettings]);

  // دالة للتعامل مع تغيير شركة التوصيل
  const handleShippingProviderChange = useCallback(async (providerId: string) => {
    
    if (!providerId) return;
    
    try {
      // البحث عن معلومات شركة التوصيل
      const { data: providerData, error } = await supabase
        .from('shipping_providers')
        .select('code, name')
        .eq('id', parseInt(providerId))
        .single();
      
      if (error || !providerData) {
        return;
      }
      
      // تحديث المعلومات
      setShippingProviderCode(providerData.code);
      
      // إنشاء إعدادات افتراضية لشركة التوصيل
      const defaultSettings: ShippingProviderSettings = {
        provider_code: providerData.code,
        is_home_delivery_enabled: true, 
        is_desk_delivery_enabled: true, 
        id: null, 
        original_provider_id: Number(providerId),
        name: providerData.name || "Default Provider", 
        is_active: true,
        use_unified_price: false,
        unified_home_price: 0,
        unified_desk_price: 0,
        is_free_delivery_home: false,
        is_free_delivery_desk: false,
      };
      setShippingProviderSettings(defaultSettings);
      
      // إعادة تحميل البلديات حسب الولاية الحالية وخيار التوصيل
      const currentProvince = form.getValues('province');
      const currentDeliveryOption = form.getValues('deliveryOption');
      
      if (currentProvince && currentDeliveryOption) {
        // دائمًا تحميل البلديات بغض النظر عن شركة الشحن أو خيار التوصيل
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

  return {
    currentDeliveryFee,
    setCurrentDeliveryFee, // Export setter if needed elsewhere
    isLoadingDeliveryFee,
    communesList,
    isLoadingCommunes,
    selectedDeliveryType,
    setSelectedDeliveryType, // Export setter
    yalidineCentersList,
    isLoadingYalidineCenters,
    shippingProviderSettings,
    isLoadingProviderSettings,
    shippingProviderCode, // Export for UI display
    shippingCloneId,      // Export if needed for other logic
    hasShippingIntegration,
    wilayasList,
    isLoadingWilayas,
    handleDeliveryTypeChange,
    handleWilayaChange,
    updateDeliveryFee,
    getAppropriateShippingId, // Export if used in submission logic
    handleShippingProviderChange, // تصدير الدالة الجديدة
  };
};
