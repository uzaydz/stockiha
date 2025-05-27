import React from 'react';
import { getMunicipalities } from "@/api/formShippingIntegration";
import type { ExtendedFormField } from "../types"; // Adjusted import path
import { findStopDeskForMunicipality } from './StopDeskLogic'; // Assuming this is the correct path

interface FormEventHandlerProps {
  extendedFields: ExtendedFormField[];
  setExtendedFields: React.Dispatch<React.SetStateAction<ExtendedFormField[]>>;
  currentOrganization: any; // Consider a more specific type
  setValue: Function; // from react-hook-form
  recalculateAndSetDeliveryPrice: (
    currentDeliveryType?: string,
    currentProvinceId?: string,
    currentMunicipalityId?: string
  ) => void;
  onFieldChange?: (fieldName: string, value: any) => void;
  deliveryTypeUpdateRef: React.MutableRefObject<{
    isHomeOnlyDelivery: boolean;
    isDeskOnlyDelivery: boolean;
    hasBeenUpdated: boolean;
    lastValue?: string;
  }>;
}

export const useFormEventHandlers = ({
  extendedFields,
  setExtendedFields,
  currentOrganization,
  setValue,
  recalculateAndSetDeliveryPrice,
  onFieldChange,
  deliveryTypeUpdateRef
}: FormEventHandlerProps) => {

  // دالة مساعدة لتحديث قيمة الحقل وإرسالها إلى النموذج الأساسي
  const updateFieldValue = (fieldName: string, value: string) => {
    if (fieldName === 'deliveryOption' || fieldName === 'stopDeskId') {
    }
    
    if (fieldName === 'deliveryOption') {
      const currentField = extendedFields.find(f => f.name === fieldName);
      if (currentField && currentField.value === value) {
        return;
      }

      if (deliveryTypeUpdateRef.current && deliveryTypeUpdateRef.current.lastValue === value) {
        return;
      }

      if (deliveryTypeUpdateRef.current) {
        deliveryTypeUpdateRef.current.lastValue = value;
      }
    }
    
    const updatedFields = [...extendedFields];
    const fieldToUpdate = updatedFields.find(f => f.name === fieldName);
    
    if (fieldToUpdate) {
      fieldToUpdate.value = value;
      setExtendedFields(updatedFields);
    }
    
    if (onFieldChange) {
      if (fieldName === 'fullName' || fieldName === 'customer_name') {
        setTimeout(() => {
          onFieldChange(fieldName, value);
        }, 500); 
      } else {
        onFieldChange(fieldName, value);
        if (fieldName === 'stopDeskId') {
        }
      }
    }
  };

  // معالجة تغيير اختيار الولاية
  const handleProvinceChange = async (provinceId: string, municipalityFieldId: string | null, deliveryTypeOverride?: string) => {
    if (!provinceId || !currentOrganization) {
      return;
    }
    
    try {
      const updatedFields = [...extendedFields];
      
      const provinceField = updatedFields.find(field => field.type === 'province');
      if (provinceField) {
        provinceField.value = provinceId;
      }
      
      const deliveryTypeField = updatedFields.find(field => field.type === 'deliveryType' || field.name === 'fixedDeliveryType');
      const selectedDeliveryType = deliveryTypeOverride || deliveryTypeField?.value || 'home';
      
      let municipalityField: ExtendedFormField | undefined;
      
      if (municipalityFieldId === 'auto') {
        municipalityField = updatedFields.find(field => field.type === 'municipality');
      } else {
        municipalityField = updatedFields.find(field => field.id === municipalityFieldId);
      }
      
      if (municipalityField) {
        municipalityField.isLoading = true;
        setExtendedFields([...updatedFields]);
        
        const municipalities = await getMunicipalities(
          currentOrganization.id, 
          provinceId, 
          selectedDeliveryType as any
        );
        
        if (!municipalities || municipalities.length === 0) {
          municipalityField.isLoading = false;
          (municipalityField as ExtendedFormField).municipalities = [];
          setExtendedFields([...updatedFields]);
          return;
        }
        
        const formattedMunicipalities = municipalities.map(municipality => {
          const municipalityIdStr = municipality.id?.toString() || '';
          return {
            id: Number(municipalityIdStr),
            name: municipality.name
          };
        });
        
        (municipalityField as ExtendedFormField).municipalities = formattedMunicipalities;
        municipalityField.isLoading = false;

        let newMunicipalityValue = '';
        const currentMunicipalityId = municipalityField.value;
        
        if (formattedMunicipalities.length > 0) {
          const currentSelectionIsValid = formattedMunicipalities.some(m => m.id.toString() === currentMunicipalityId);
          if (currentSelectionIsValid) {
            newMunicipalityValue = currentMunicipalityId;
          } else {
            newMunicipalityValue = formattedMunicipalities[0].id.toString();
          }
        }
        
        municipalityField.value = newMunicipalityValue;
        
        if (municipalityField.name && newMunicipalityValue) {
          setValue(municipalityField.name, newMunicipalityValue);
          if (updateFieldValue) { // Check if onFieldChange is defined via updateFieldValue
            updateFieldValue(municipalityField.name, newMunicipalityValue);
          }
        }
        
        if (municipalityField.dependency) {
          const provinceFieldFound = updatedFields.find(field => field.type === 'province');
          if (provinceFieldFound) {
            municipalityField.dependency.fieldId = provinceFieldFound.id;
          }
        }
        
        setExtendedFields([...updatedFields]);
        
        setTimeout(() => {
            recalculateAndSetDeliveryPrice(selectedDeliveryType, provinceId, newMunicipalityValue);
        }, 0);
      }
    } catch (error) {
      const updatedFields = [...extendedFields];
      let municipalityField: ExtendedFormField | undefined;
      
      if (municipalityFieldId === 'auto') {
        municipalityField = updatedFields.find(field => field.type === 'municipality');
      } else {
        municipalityField = updatedFields.find(field => field.id === municipalityFieldId);
      }
      
      if (municipalityField) {
        municipalityField.isLoading = false;
        (municipalityField as ExtendedFormField).municipalities = [];
        setExtendedFields([...updatedFields]);
      }
    }
  };

  // معالجة تغيير اختيار البلدية
  const handleMunicipalityChange = (municipalityId: string, provinceId: string) => {
    try {
      const updatedFields = [...extendedFields];
      const municipalityField = updatedFields.find(field => field.type === 'municipality');
      if (municipalityField) {
        municipalityField.value = municipalityId;
      }
      
      const deliveryTypeField = updatedFields.find(field => field.type === 'deliveryType');
      const selectedDeliveryType = deliveryTypeField?.value || 'home';
      
      setExtendedFields(updatedFields);
      
      if (selectedDeliveryType === 'desk' && onFieldChange) {
        
        // تعيين stopDeskId وضمان تمرير قيمة deliveryOption صحيحة
        onFieldChange('stopDeskId', municipalityId);
        
        // إضافة تأكيد صريح على تعيين deliveryOption
        setValue('deliveryOption', 'desk');
        if (onFieldChange) {
          onFieldChange('deliveryOption', 'desk');
        }
      }
      
      recalculateAndSetDeliveryPrice(selectedDeliveryType, provinceId, municipalityId);
    } catch (error) {
    }
  };

  return { updateFieldValue, handleProvinceChange, handleMunicipalityChange };
};
