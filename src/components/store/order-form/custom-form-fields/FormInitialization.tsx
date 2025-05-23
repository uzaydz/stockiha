import { useEffect, useState } from 'react';
import { getProvinces, getMunicipalities } from "@/api/yalidine/service";
import type { ExtendedFormField, CustomFormField } from "../types"; // Adjusted import path

interface FormInitializationProps {
  formFields: CustomFormField[] | undefined;
  currentOrganization: any; // Consider a more specific type
  productId: string | null | undefined;
  setExtendedFields: React.Dispatch<React.SetStateAction<ExtendedFormField[]>>;
}

export const useFormInitialization = ({
  formFields,
  currentOrganization,
  productId,
  setExtendedFields,
}: FormInitializationProps) => {
  useEffect(() => {
    if (!formFields || !Array.isArray(formFields)) {
      setExtendedFields([]);
      return;
    }
    
    const newExtendedFields = formFields.filter(field => field && field.isVisible).map(field => {
      let initialValue = field.defaultValue || '';
      if (field.type === 'deliveryType' && !initialValue) {
        initialValue = 'home';
      }
      return {
        ...field,
        isLoading: false,
        value: initialValue, 
      };
    });

    const provinceFields = newExtendedFields.filter(field => field.type === 'province');
    const municipalityFields = newExtendedFields.filter(field => field.type === 'municipality');

    for (const municipalityField of municipalityFields) {
      const provinceFieldId = municipalityField.linkedFields?.provinceField;
      if (provinceFieldId) {
        municipalityField.dependency = {
          fieldId: provinceFieldId,
          value: '*',
        };
      }
    }

    const loadProvinces = async () => {
      try {
        if (!currentOrganization) return;

        for (const field of provinceFields) {
          field.isLoading = true;
        }
        setExtendedFields([...newExtendedFields]); // Update with loading state

        const provinces = await getProvinces(currentOrganization.id);
        
        if (!provinces || provinces.length === 0) {
          // Reset loading state even if no provinces found
          for (const field of provinceFields) {
            field.isLoading = false;
          }
          setExtendedFields([...newExtendedFields]);
          return;
        }

        const formattedProvinces = provinces.map(province => ({
          id: province.id,
          name: province.name
        }));

        for (const field of provinceFields) {
          (field as ExtendedFormField).provinces = formattedProvinces;
          field.isLoading = false;
        }
        setExtendedFields([...newExtendedFields]);
      } catch (error) {
        console.error("Error loading provinces:", error);
        for (const field of provinceFields) {
          field.isLoading = false;
        }
        setExtendedFields([...newExtendedFields]); // Update with error state (loading false)
      }
    };

    if (newExtendedFields.length > 0) {
      if (provinceFields.length > 0) {
        loadProvinces();
      } else {
        setExtendedFields(newExtendedFields);
      }
    }
  }, [formFields, currentOrganization, productId, setExtendedFields]);
}; 