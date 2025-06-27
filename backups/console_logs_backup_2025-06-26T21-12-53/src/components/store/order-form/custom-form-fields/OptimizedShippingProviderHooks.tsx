import { useEffect, useState } from "react";
import { useProductPurchaseData } from "../ProductPurchaseDataProvider";

// Hook محسن لمعالجة بيانات مزودي الشحن من المزود المركزي
export const useOptimizedShippingProviderLogic = (
  formId: string | undefined,
  formFields: any,
  productId: string | null | undefined,
  currentOrganization: any,
  setValue: Function
) => {
  // الحصول على البيانات من المزود المركزي بدلاً من إجراء طلبات منفصلة
  const {
    shippingProviders,
    shippingClones,
    shippingSettings,
    isShippingProvidersLoading,
    isShippingClonesLoading,
    isShippingSettingsLoading
  } = useProductPurchaseData();

  const [clonedShippingProviderId, setClonedShippingProviderId] = useState<string | number | null>(null);
  const [shippingProviderSettings, setShippingProviderSettings] = useState<any | null>(null);

  // معالجة البيانات المحصل عليها من المزود المركزي
  useEffect(() => {
    if (!isShippingClonesLoading && shippingClones.length > 0) {
      // العثور على الكلون النشط الأول
      const activeClone = shippingClones.find(clone => clone.id);
      if (activeClone) {
        setClonedShippingProviderId(activeClone.id);
      }
    }
  }, [shippingClones, isShippingClonesLoading]);

  // إعداد إعدادات مزود الشحن
  useEffect(() => {
    if (!isShippingSettingsLoading && shippingSettings.length > 0) {
      const setting = shippingSettings[0];
      
      // العثور على مزود الشحن المقابل
      const provider = shippingProviders.find(p => p.id === setting.provider_id);
      
      if (provider) {
        setShippingProviderSettings({
          provider_id: setting.provider_id,
          provider_code: provider.code,
          provider_name: provider.name,
          is_enabled: true
        });
      }
    } else if (!isShippingProvidersLoading && shippingProviders.length > 0) {
      // استخدام المزود الافتراضي
      const defaultProvider = shippingProviders[0];
      setShippingProviderSettings({
        provider_id: defaultProvider.id || 1,
        provider_code: defaultProvider.code || 'yalidine',
        provider_name: defaultProvider.name || 'ياليدين',
        is_enabled: true
      });
    }
  }, [shippingSettings, shippingProviders, isShippingSettingsLoading, isShippingProvidersLoading]);

  // دالة جلب إعدادات مزود الشحن (محسنة لتجنب طلبات إضافية)
  const fetchShippingProviderSettings = async () => {
    // لا نحتاج لطلبات إضافية لأن البيانات متوفرة من المزود المركزي
    return shippingProviderSettings;
  };

  const isLoadingShippingSettings = isShippingProvidersLoading || isShippingClonesLoading || isShippingSettingsLoading;

  return {
    clonedShippingProviderId,
    shippingProviderSettings,
    isLoadingShippingSettings,
    fetchShippingProviderSettings,
  };
};

// Hook محسن للولايات
export const useOptimizedProvinces = () => {
  const { provinces, isProvincesLoading } = useProductPurchaseData();
  
  return {
    provinces: provinces || [],
    isLoading: isProvincesLoading,
    error: null
  };
};

// Hook محسن للخدمات
export const useOptimizedServices = (availableOnly: boolean = false) => {
  const { services, isServicesLoading } = useProductPurchaseData();
  
  // التحقق من نوع البيانات وتطبيق التصفية المناسبة
  let filteredServices: any[] = [];
  
  if (services && typeof services === 'object' && !Array.isArray(services)) {
    // إذا كانت البيانات كائن يحتوي على all و available
    const servicesObj = services as any;
    filteredServices = availableOnly ? (servicesObj.available || []) : (servicesObj.all || []);
  } else if (Array.isArray(services)) {
    // إذا كانت البيانات مصفوفة مباشرة
    filteredServices = availableOnly ? services.filter((service: any) => service.is_available === true) : services;
  }
  
  return {
    services: filteredServices,
    isLoading: isServicesLoading,
    error: null
  };
};

export default {
  useOptimizedShippingProviderLogic,
  useOptimizedProvinces,
  useOptimizedServices
}; 