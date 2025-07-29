import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client'; 
import { calculateDeliveryPrice as calculateYalidineDeliveryPrice } from "@/api/yalidine/service";
import { ZRExpressShippingCalculator } from './ZRExpressShippingCalculator';
import { CustomShippingCalculator } from './CustomShippingCalculator';
import { EcotrackShippingCalculator } from './EcotrackShippingCalculator';
import { getDefaultShippingProviderSettings } from './ShippingProviderHooks'; // Assuming this is the correct path

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
import type { ExtendedFormField } from "../types"; // Adjusted import path
import type { CalculateDeliveryPriceFunction } from '../types';

// دالة مساعدة للحصول على وظيفة حساب سعر التوصيل المناسبة
export async function getDeliveryPriceCalculator(
  organizationId: string | null | undefined,
  shippingProviderSettings: any,
  productId?: string // إضافة معرف المنتج كمعامل اختياري
): Promise<CalculateDeliveryPriceFunction> {
  // التحقق من مزود الشحن المستخدم
  if (!organizationId || !shippingProviderSettings) {
    return calculateYalidineDeliveryPrice;
  }

  try {
    // إعطاء الأولوية لرمز المزود المحدد مباشرة في إعدادات الشحن
    let providerCode = shippingProviderSettings.provider_code; 
    let originalProviderId = shippingProviderSettings.original_provider_id;

    // إذا كان لدينا معرف المنتج، نتحقق من إعدادات الشحن الخاصة به أولاً
    if (productId) {
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('shipping_provider_id, shipping_method_type')
        .eq('id', productId)
        .single();
        
      if (!productError && productData) {
        // التحقق من نوع طريقة الشحن أولاً
        if (productData.shipping_method_type === 'custom') {
          // إذا كانت طريقة الشحن مخصصة، نرجع حاسبة الطرق المخصصة
          return async (
            organizationId: string,
            fromWilayaId: string,
            toWilayaId: string,
            municipalityId: string,
            deliveryType: 'home' | 'desk',
            weight?: number,
            shippingProviderCloneId?: number | string | null
          ): Promise<number> => {
            return new Promise<number>((resolve, reject) => {
              try {
                // التحقق من صحة المعاملات
                if (!toWilayaId || !organizationId) {
                  reject(new Error("معرف الولاية ومعرف المؤسسة مطلوبان"));
                  return;
                }

                const handlePriceCalculated = (price: number) => {
                  resolve(price);
                };

                // إنشاء مكون CustomShippingCalculator
                const calculator = (
                  <CustomShippingCalculator
                    organizationId={organizationId}
                    provinceId={toWilayaId}
                    deliveryType={deliveryType}
                    onPriceCalculated={handlePriceCalculated}
                  />
                );

                // تشغيل المكون وبدء عملية الحساب
                calculator.props.onPriceCalculated(0); // سيتم تحديث السعر لاحقاً من خلال المكون نفسه
              } catch (error) {
                reject(error);
              }
            });
          };
        }
        
        // إذا كان المنتج يستخدم مزود شحن محدد
        if (productData.shipping_provider_id) {
          // استخدام مزود الشحن المحدد للمنتج
          const { data: providerData } = await supabase
            .from('shipping_providers')
            .select('code')
            .eq('id', productData.shipping_provider_id)
            .single();
            
          if (providerData) {
            providerCode = providerData.code;
          }
        }
      }
    }

    // إذا لم يتم تحديد رمز المزود، نبحث عنه أولاً من خلال original_provider_id 
    if (!providerCode && originalProviderId) {
      const { data, error } = await supabase
        .from('shipping_providers')
        .select('code, name')
        .eq('id', originalProviderId)
        .single();

      if (!error && data) {
        providerCode = data.code;
        // تحديث القيمة في الإعدادات
        shippingProviderSettings.provider_code = providerCode;
      }
    }

    // إذا كان originalProviderId = 1 (ياليدين) أو غير محدد، نتحقق من المزود الافتراضي للمتجر
    if ((!originalProviderId || originalProviderId === 1) && !providerCode) {
      const { data, error } = await supabase
        .from('shipping_provider_settings')
        .select('provider_id, api_key')
        .eq('organization_id', organizationId)
        .eq('is_enabled', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        const providerSettings = data[0];
        originalProviderId = providerSettings.provider_id;
        
        // تحديث originalProviderId في الإعدادات
        shippingProviderSettings.original_provider_id = originalProviderId;
        
        // التحقق من وجود طريقة شحن مخصصة
        if (providerSettings.api_key === 'custom_shipping' && !providerSettings.provider_id) {
          // إذا كانت طريقة الشحن مخصصة، نرجع حاسبة الطرق المخصصة
          return async (
            organizationId: string,
            fromWilayaId: string,
            toWilayaId: string,
            municipalityId: string,
            deliveryType: 'home' | 'desk',
            weight?: number,
            shippingProviderCloneId?: number | string | null
          ): Promise<number> => {
            return new Promise<number>((resolve, reject) => {
              try {
                // التحقق من صحة المعاملات
                if (!toWilayaId || !organizationId) {
                  reject(new Error("معرف الولاية ومعرف المؤسسة مطلوبان"));
                  return;
                }

                const handlePriceCalculated = (price: number) => {
                  resolve(price);
                };

                // إنشاء مكون CustomShippingCalculator
                const calculator = (
                  <CustomShippingCalculator
                    organizationId={organizationId}
                    provinceId={toWilayaId}
                    deliveryType={deliveryType}
                    onPriceCalculated={handlePriceCalculated}
                  />
                );

                // تشغيل المكون وبدء عملية الحساب
                calculator.props.onPriceCalculated(0); // سيتم تحديث السعر لاحقاً من خلال المكون نفسه
              } catch (error) {
                reject(error);
              }
            });
          };
        }
        
        // البحث عن رمز المزود للمعرف الجديد
        if (originalProviderId && originalProviderId !== 1) { // عدم البحث إذا كان المعرف لا يزال ياليدين
          const { data: providerData, error: providerError } = await supabase
            .from('shipping_providers')
            .select('code, name')
            .eq('id', originalProviderId)
            .single();
            
          if (!providerError && providerData) {
            providerCode = providerData.code;
            // تحديث القيمة في الإعدادات
            shippingProviderSettings.provider_code = providerCode;
          }
        }
      }
    }

    // تحديد الدالة المناسبة بناءً على رمز المزود
    if (isEcotrackProvider(providerCode)) {
      // إرجاع دالة حساب أسعار Ecotrack
      return async (
        organizationId: string,
        fromWilayaId: string,
        toWilayaId: string,
        municipalityId: string,
        deliveryType: 'home' | 'desk',
        weight?: number,
        shippingProviderCloneId?: number | string | null
      ): Promise<number> => {
        return new Promise<number>((resolve, reject) => {
          try {
            // التحقق من صحة المعاملات
            if (!toWilayaId) {
              reject(new Error("معرف الولاية مطلوب"));
              return;
            }

            const handlePriceCalculated = (price: number) => {
              resolve(price);
            };

            // إنشاء مكون EcotrackShippingCalculator
            const calculator = (
              <EcotrackShippingCalculator
                wilayaId={toWilayaId}
                isHomeDelivery={deliveryType === 'home'}
                providerCode={providerCode}
                onPriceCalculated={handlePriceCalculated}
              />
            );

            // تشغيل المكون وبدء عملية الحساب
            calculator.props.onPriceCalculated(0); // سيتم تحديث السعر لاحقاً من خلال المكون نفسه
          } catch (error) {
            reject(error);
          }
        });
      };
    } else if (providerCode === 'zrexpress') {
      return async (
        organizationId: string,
        fromWilayaId: string,
        toWilayaId: string,
        municipalityId: string,
        deliveryType: 'home' | 'desk',
        weight?: number,
        shippingProviderCloneId?: number | string | null
      ): Promise<number> => {
        return new Promise<number>((resolve, reject) => {
          try {
            // التحقق من صحة المعاملات
            if (!toWilayaId) {
              reject(new Error("معرف الولاية مطلوب"));
              return;
            }

            // التحقق من الأسعار الموحدة أولاً
            if (shippingProviderSettings.use_unified_price) {
              if (deliveryType === 'home') {
                if (shippingProviderSettings.is_free_delivery_home) {
                  resolve(0);
                  return;
                }
                const unifiedPrice = shippingProviderSettings.unified_home_price;
                if (typeof unifiedPrice === 'number') {
                  resolve(unifiedPrice);
                  return;
                }
              } else {
                if (shippingProviderSettings.is_free_delivery_desk) {
                  resolve(0);
                  return;
                }
                const unifiedPrice = shippingProviderSettings.unified_desk_price;
                if (typeof unifiedPrice === 'number') {
                  resolve(unifiedPrice);
                  return;
                }
              }
            }

            const handlePriceCalculated = (price: number) => {
              resolve(price);
            };

            // إنشاء مكون ZRExpressShippingCalculator
            const calculator = (
              <ZRExpressShippingCalculator
                wilayaId={toWilayaId}
                isHomeDelivery={deliveryType === 'home'}
                onPriceCalculated={handlePriceCalculated}
              />
            );

            // تشغيل المكون وبدء عملية الحساب
            calculator.props.onPriceCalculated(0); // سيتم تحديث السعر لاحقاً من خلال المكون نفسه
          } catch (error) {
            reject(error);
          }
        });
      };
    } else {
      return calculateYalidineDeliveryPrice;
    }
  } catch (error) {
    // في حالة الخطأ، نستخدم ياليدين كخيار افتراضي
    return calculateYalidineDeliveryPrice;
  }
}

export const useDeliveryPrice = (
  currentOrganization: any, 
  shippingProviderSettings: any,
  clonedShippingProviderId: string | number | null,
  fetchShippingProviderSettings: (cloneId: string | number) => Promise<void>,
  onDeliveryPriceChange?: (price: number | null) => void,
  onFieldChange?: (fieldName: string, value: any) => void,
  setValue?: any, // from react-hook-form
  extendedFields?: ExtendedFormField[], // state from main component
  productId?: string // إضافة معرف المنتج كمعامل اختياري
) => {
  const [deliveryPrice, setDeliveryPrice] = useState<number | null>(null);

  // دالة مساعدة لتحديث الحالة واستدعاء onDeliveryPriceChange
  const updateDeliveryPriceState = (price: number | null) => {
    setDeliveryPrice(price);
    if (onDeliveryPriceChange) {
      onDeliveryPriceChange(price);
    }
  };

  // وظيفة لتحديث سعر التوصيل
  const updateDeliveryPrice = async (
    deliveryType: string,
    provinceId: string,
    municipalityId: string | null | undefined
  ) => {
    if (!provinceId || !currentOrganization) {
      updateDeliveryPriceState(0);
      return;
    }
    
    try {
      // إذا لم يتم تحميل إعدادات مزود التوصيل بعد، استخدم منطق الحساب الافتراضي
      if (!shippingProviderSettings) {
        // التحقق مما إذا كان لدينا معرف مزود التوصيل
        if (clonedShippingProviderId) {
          // محاولة جلب الإعدادات مرة أخرى
          await fetchShippingProviderSettings(clonedShippingProviderId);
          
          // إذا كانت الإعدادات لا تزال غير متوفرة، استخدم سعر افتراضي معقول
          const currentSettings = shippingProviderSettings; // Use potentially updated settings
          if (!currentSettings) {
            const defaultPrice = deliveryType === 'home' ? 800 : 300;
            updateDeliveryPriceState(defaultPrice);
          } else {
            // إذا تم تحميل الإعدادات، عاود المحاولة
            await updateDeliveryPrice(deliveryType, provinceId, municipalityId);
          }
          return;
        }
        
        // إذا لم يكن لدينا معرف مزود التوصيل، استخدم الإعدادات الافتراضية
        const defaultSettings = getDefaultShippingProviderSettings(currentOrganization?.id, null);
        
        // إذا كان هناك وعد للإعدادات الافتراضية، انتظر النتيجة ثم أعد تحديث الإعدادات
        if (defaultSettings._promise) {
          
          defaultSettings._promise.then(async fetchedSettings => {
            if (fetchedSettings) {
              setTimeout(async () => {
                // Pass fetchedSettings to the recursive call to ensure it uses the latest data
                await updateDeliveryPriceWithSettings(deliveryType, provinceId, municipalityId, fetchedSettings);
              }, 100);
            }
          });
        }
        
        // استخدام الإعدادات المؤقتة لحساب السعر
        const tempCalculator = await getDeliveryPriceCalculator(currentOrganization.id, defaultSettings, productId);
        
        // حساب السعر مؤقتًا باستخدام الإعدادات الافتراضية
        const tempPrice = await tempCalculator(
          currentOrganization.id,
          "16",
          provinceId,
          municipalityId || "",
          deliveryType as 'home' | 'desk',
          1
        );
        
        updateDeliveryPriceState(tempPrice);
        return;
      }
      
      await updateDeliveryPriceWithSettings(deliveryType, provinceId, municipalityId, shippingProviderSettings);

    } catch (error) {
      updateDeliveryPriceState(0);
    }
  };

  // Helper function to avoid repeating logic when settings are available
  const updateDeliveryPriceWithSettings = async (
    deliveryType: string,
    provinceId: string,
    municipalityId: string | null | undefined,
    currentShippingSettings: any
  ) => {
      // استخدام إعدادات مزود التوصيل المحملة
      
      // التحقق من توفر خيارات التوصيل
      const isHomeEnabled = currentShippingSettings.is_home_delivery_enabled === true;
      const isDeskEnabled = currentShippingSettings.is_desk_delivery_enabled === true;
      
      // تحديد نوع التوصيل النهائي بناءً على الخيارات المتاحة
      let finalDeliveryType = deliveryType;
      
      // إذا كان خيار واحد فقط متاح، استخدمه بغض النظر عن القيمة المحددة
      if (!isHomeEnabled && isDeskEnabled) {
        finalDeliveryType = 'desk';
      } else if (isHomeEnabled && !isDeskEnabled) {
        finalDeliveryType = 'home';
      } else if (deliveryType === 'home' && !isHomeEnabled) {
        finalDeliveryType = isDeskEnabled ? 'desk' : 'home';
      } else if (deliveryType === 'desk' && !isDeskEnabled) {
        finalDeliveryType = isHomeEnabled ? 'home' : 'desk';
      }
      
      if (finalDeliveryType !== deliveryType) {
        if (setValue) {
          setValue('deliveryOption', finalDeliveryType);
        }
        if (onFieldChange) {
          onFieldChange('deliveryOption', finalDeliveryType);
          if (finalDeliveryType === 'desk' && provinceId) {
          }
        }
      }
      
      let calculatePriceFunction = await getDeliveryPriceCalculator(currentOrganization.id, currentShippingSettings, productId);
      
      if (!currentShippingSettings.provider_code && currentShippingSettings.original_provider_id) {
        try {
          
          const { data: providerData, error: providerError } = await supabase
            .from('shipping_providers')
            .select('code, name')
            .eq('id', currentShippingSettings.original_provider_id)
            .single();
            
          if (!providerError && providerData) {
            
            currentShippingSettings.provider_code = providerData.code;
            
            const updatedCalculatePrice = await getDeliveryPriceCalculator(currentOrganization.id, currentShippingSettings, productId);
            
            if (updatedCalculatePrice) {
              calculatePriceFunction = updatedCalculatePrice;
            }
          }
        } catch (providerError) {
        }
      }
      
      if (finalDeliveryType === 'home' && isHomeEnabled) {
        if (currentShippingSettings.is_free_delivery_home) {
          updateDeliveryPriceState(0);
        } else if (currentShippingSettings.use_unified_price) {
          updateDeliveryPriceState(currentShippingSettings.unified_home_price || 0);
        } else {
          const price = await calculatePriceFunction(
            currentOrganization.id,
            "16", 
            provinceId, 
            municipalityId || "", 
            finalDeliveryType as 'home' | 'desk',
            1 
          );
          updateDeliveryPriceState(price);
        }
      } else if (finalDeliveryType === 'desk' && isDeskEnabled) {
        if (currentShippingSettings.is_free_delivery_desk) {
          updateDeliveryPriceState(0);
        } else if (currentShippingSettings.use_unified_price) {
          updateDeliveryPriceState(currentShippingSettings.unified_desk_price || 0);
        } else {
          const price = await calculatePriceFunction(
            currentOrganization.id, 
            "16", 
            provinceId, 
            municipalityId || "", 
            finalDeliveryType as 'home' | 'desk', 
            1 
          );
          updateDeliveryPriceState(price);
        }
      } else {
        const defaultPrice = finalDeliveryType === 'home' ? 800 : 300;
        updateDeliveryPriceState(defaultPrice);
      }
  }

  // دالة لإعادة حساب سعر التوصيل وتحديثه
  const recalculateAndSetDeliveryPrice = async (
    currentDeliveryType?: string,
    currentProvinceId?: string,
    currentMunicipalityId?: string
  ) => {
    const deliveryTypeToUse = currentDeliveryType || extendedFields?.find(f => f.type === 'deliveryType')?.value || 'home';
    const provinceIdToUse = currentProvinceId || extendedFields?.find(f => f.type === 'province')?.value;
    const municipalityIdToUse = currentMunicipalityId || extendedFields?.find(f => f.type === 'municipality')?.value;
    
    if (!shippingProviderSettings && clonedShippingProviderId) {
      await fetchShippingProviderSettings(clonedShippingProviderId);
      // After fetching, shippingProviderSettings should be updated by the hook that provides it.
      // We might need to wait for the next render cycle for it to be available here.
      // For now, we proceed assuming it might be updated or fall back to default logic.
      // This part might need a more robust way to handle async settings loading.
      const currentSettings = shippingProviderSettings; // Re-check after fetch
      if (currentSettings) {
        await recalculateAndSetDeliveryPriceWithSettings(deliveryTypeToUse, provinceIdToUse, municipalityIdToUse, currentSettings);
      } else if (provinceIdToUse) {
        await updateDeliveryPrice(deliveryTypeToUse, provinceIdToUse, municipalityIdToUse);
      } else {
        updateDeliveryPriceState(0);
      }
      return;
    }
    
    if (!shippingProviderSettings) {
      if (provinceIdToUse) {
        await updateDeliveryPrice(deliveryTypeToUse, provinceIdToUse, municipalityIdToUse);
      } else {
        updateDeliveryPriceState(0);
      }
      return;
    }
    
    await recalculateAndSetDeliveryPriceWithSettings(deliveryTypeToUse, provinceIdToUse, municipalityIdToUse, shippingProviderSettings);
  };

  const recalculateAndSetDeliveryPriceWithSettings = async (
    deliveryTypeToUse: string,
    provinceIdToUse: string | undefined,
    municipalityIdToUse: string | undefined,
    currentShippingSettings: any
  ) => {
    const isHomeEnabled = currentShippingSettings.is_home_delivery_enabled === true;
    const isDeskEnabled = currentShippingSettings.is_desk_delivery_enabled === true;
    let finalDeliveryType = deliveryTypeToUse;

    if (!isHomeEnabled && isDeskEnabled) {
      finalDeliveryType = 'desk';
    } else if (isHomeEnabled && !isDeskEnabled) {
      finalDeliveryType = 'home';
    } else if (!isHomeEnabled && !isDeskEnabled) {
      finalDeliveryType = 'home';
    }

    if (finalDeliveryType !== deliveryTypeToUse) {
      if (setValue) {
        setValue('deliveryOption', finalDeliveryType);
      }
      if (onFieldChange) {
        onFieldChange('deliveryOption', finalDeliveryType);
        if (finalDeliveryType === 'desk' && provinceIdToUse) {
        }
      }
    }

    if (provinceIdToUse) {
      await updateDeliveryPriceWithSettings(finalDeliveryType, provinceIdToUse, municipalityIdToUse, currentShippingSettings);
    } else {
      updateDeliveryPriceState(0);
    }
  }

  return { deliveryPrice, updateDeliveryPrice, recalculateAndSetDeliveryPrice, updateDeliveryPriceState };
};
