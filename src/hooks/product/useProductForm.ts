import { useMemo } from 'react';
import { CompleteProduct } from '@/lib/api/productComplete';

interface UseProductFormProps {
  product: CompleteProduct | null;
}

interface ProductFormState {
  formData: any | null;
  hasCustomForm: boolean;
  formStrategy: 'custom_form_found' | 'default_form_used' | 'no_form_available';
  formFields: any[];
  formName: string;
  formDescription: string;
  submitButtonText: string;
}

interface ProductFormActions {
  getFormField: (fieldName: string) => any | undefined;
  hasFormField: (fieldName: string) => boolean;
  getFormValidation: () => any;
}

/**
 * Hook لإدارة نماذج المنتج - محسن للأداء
 * - يحلل بيانات النموذج من المنتج
 * - يحدد استراتيجية النموذج
 * - يوفر وصول سريع لحقول النموذج
 * - يستخدم useMemo لتحسين الأداء
 */
export const useProductForm = ({
  product
}: UseProductFormProps): [ProductFormState, ProductFormActions] => {
  
  // استخراج بيانات النماذج
  const formData = useMemo(() => {
    return product?.form_data || null;
  }, [product?.form_data]);

  // فحص وجود نموذج مخصص
  const hasCustomForm = useMemo(() => {
    return formData?.type === 'custom';
  }, [formData]);

  // تحديد استراتيجية النموذج
  const formStrategy = useMemo(() => {
    if (formData?.type === 'custom') return 'custom_form_found';
    if (formData?.type === 'default') return 'default_form_used';
    return 'no_form_available';
  }, [formData]);

  // استخراج حقول النموذج
  const formFields = useMemo(() => {
    if (!formData?.fields) return [];
    return Array.isArray(formData.fields) ? formData.fields : [];
  }, [formData?.fields]);

  // استخراج اسم النموذج
  const formName = useMemo(() => {
    return formData?.name || 'طلب المنتج';
  }, [formData?.name]);

  // استخراج وصف النموذج
  const formDescription = useMemo(() => {
    return formData?.description || 'يرجى ملء النموذج التالي لإتمام الطلب';
  }, [formData?.description]);

  // استخراج نص زر الإرسال
  const submitButtonText = useMemo(() => {
    return formData?.submitButtonText || 'إتمام الطلب';
  }, [formData?.submitButtonText]);

  // الحصول على حقل نموذج محدد
  const getFormField = useMemo(() => {
    return (fieldName: string): any | undefined => {
      return formFields.find(field => field.name === fieldName);
    };
  }, [formFields]);

  // فحص وجود حقل نموذج
  const hasFormField = useMemo(() => {
    return (fieldName: string): boolean => {
      return formFields.some(field => field.name === fieldName);
    };
  }, [formFields]);

  // الحصول على قواعد التحقق من صحة النموذج
  const getFormValidation = useMemo(() => {
    return () => {
      const validation: any = {};
      
      formFields.forEach(field => {
        if (field.validation) {
          validation[field.name] = field.validation;
        }
      });
      
      return validation;
    };
  }, [formFields]);

  const state: ProductFormState = {
    formData,
    hasCustomForm,
    formStrategy,
    formFields,
    formName,
    formDescription,
    submitButtonText
  };

  const actions: ProductFormActions = {
    getFormField,
    hasFormField,
    getFormValidation
  };

  return [state, actions];
};
