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
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    if (!formFields || !Array.isArray(formFields)) {
      setExtendedFields([]);
      return;
    }
    
    const initializeForm = async () => {
      setIsLoading(true);
      
      try {
        const newExtendedFields = await Promise.all(
          formFields.map(async (field) => {
            const extendedField: ExtendedFormField = {
              ...field,
              id: field.id || `field-${Math.random().toString(36).substr(2, 9)}`,
              value: field.defaultValue || '',
              isLoading: false,
              linkedFields: field.linkedFields || {}
            };

            // تحميل الولايات للحقول من نوع province
            if (field.type === 'province') {
              try {
                extendedField.isLoading = true;
                
                // استخدام organizationId إذا كان متوفراً، وإلا استخدام undefined
                const organizationId = currentOrganization?.id;
                console.log('تحميل الولايات للمؤسسة:', organizationId);
                
                const provinces = await getProvinces(organizationId);
                console.log('تم تحميل الولايات:', provinces?.length || 0);
                
                extendedField.provinces = provinces || [];
                extendedField.isLoading = false;
                
                // إضافة fallback في حالة عدم توفر البيانات
                if (!provinces || provinces.length === 0) {
                  console.warn('لم يتم العثور على ولايات، سيتم استخدام البيانات الاحتياطية');
                }
              } catch (error) {
                console.error('خطأ في تحميل الولايات:', error);
                extendedField.provinces = [];
                extendedField.isLoading = false;
              }
            }

            // تحميل البلديات للحقول من نوع municipality
            if (field.type === 'municipality') {
              extendedField.municipalities = [];
              extendedField.isLoading = false;
            }

            return extendedField;
          })
        );

        setExtendedFields(newExtendedFields);
      } catch (error) {
        console.error('خطأ في تهيئة النموذج:', error);
        setExtendedFields([]);
      } finally {
        setIsLoading(false);
      }
    };

    initializeForm();
  }, [formFields, currentOrganization?.id, productId, setExtendedFields]);
  
  return { isLoading };
};
