import { useEffect, useRef } from 'react';
import type { ExtendedFormField } from "../types"; // Adjusted import path
import { findStopDeskForMunicipality } from './StopDeskLogic'; // Assuming this is the correct path

export const useDeliveryTypeUpdater = (
  shippingProviderSettings: any,
  setValue: Function, // from react-hook-form
  onFieldChange?: (fieldName: string, value: any) => void,
  extendedFields?: ExtendedFormField[] // state from main component
) => {
  const deliveryTypeUpdateRef = useRef<{
    isHomeOnlyDelivery: boolean;
    isDeskOnlyDelivery: boolean;
    hasBeenUpdated: boolean;
    lastValue?: string;
  }>({
    isHomeOnlyDelivery: false,
    isDeskOnlyDelivery: false,
    hasBeenUpdated: false,
    lastValue: undefined
  });

  useEffect(() => {
    if (!shippingProviderSettings || deliveryTypeUpdateRef.current.hasBeenUpdated) {
      return;
    }
    
    const isHomeEnabled = shippingProviderSettings.is_home_delivery_enabled === true;
    const isDeskEnabled = shippingProviderSettings.is_desk_delivery_enabled === true;
    
    const isHomeOnlyDelivery = isHomeEnabled && !isDeskEnabled;
    const isDeskOnlyDelivery = !isHomeEnabled && isDeskEnabled;
    
    deliveryTypeUpdateRef.current = {
      isHomeOnlyDelivery,
      isDeskOnlyDelivery,
      hasBeenUpdated: true,
      lastValue: isHomeOnlyDelivery ? 'home' : (isDeskOnlyDelivery ? 'desk' : undefined)
    };
    
    if (isHomeOnlyDelivery) {
      setValue('deliveryOption', 'home');
      if (onFieldChange) {
        onFieldChange('deliveryOption', 'home');
      }
    } else if (isDeskOnlyDelivery) {
      setValue('deliveryOption', 'desk');
      if (onFieldChange) {
        onFieldChange('deliveryOption', 'desk');
        
        const provinceField = extendedFields?.find(f => f.type === 'province');
        const municipalityField = extendedFields?.find(f => f.type === 'municipality');
        
        const provinceId = provinceField?.value;
        const municipalityId = municipalityField?.value;
        
        if (provinceId && municipalityId) {
          onFieldChange('stopDeskId', municipalityId);
          
          // تعليق على الكود القديم الذي كان يبحث عن مكاتب ياليدين
          /*
          findStopDeskForMunicipality(provinceId, municipalityId)
            .then(stopDeskId => {
              if (stopDeskId) {
                onFieldChange('stopDeskId', stopDeskId);
              } else {
                onFieldChange('stopDeskId', '1');
              }
            });
          */
        } else {
          // استخدام رقم البلدية المحدد مسبقًا إذا كان متوفرًا، وإلا استخدام قيمة افتراضية
          if (provinceId) {
            onFieldChange('stopDeskId', provinceId);
          } else {
            onFieldChange('stopDeskId', '1');
          }
        }
      }
    }
  }, [shippingProviderSettings, setValue, onFieldChange, extendedFields]);

  return { deliveryTypeUpdateRef }; // Exporting the ref, ensure it's handled correctly if shared or modified elsewhere
};
