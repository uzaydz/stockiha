import { useMemo, useCallback } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ProductFormValues } from '@/types/product';

interface UseProductFormValidationReturn {
  progress: number;
  isValid: boolean;
  errorCount: number;
  hasRequiredFields: boolean;
  calculateProgress: () => number;
  getFieldValidationStatus: (fieldName: keyof ProductFormValues) => {
    isValid: boolean;
    error?: string;
    isRequired: boolean;
  };
}

// ✅ تعريف الحقول المطلوبة خارج المكون لتجنب إنشائها في كل render
const REQUIRED_FIELDS: readonly (keyof ProductFormValues)[] = [
  'name', 
  'description', 
  'price', 
  'category_id', 
  'thumbnail_image'
] as const;

export const useProductFormValidation = (
  form: UseFormReturn<ProductFormValues>
): UseProductFormValidationReturn => {
  const { formState, getValues } = form;
  const { errors, isValid } = formState;
  
  // ✅ تجنب استخدام watch() لتجنب re-renders غير ضرورية
  // سنستخدم formState.dirtyFields بدلاً منها

  // Calculate form progress
  const calculateProgress = useCallback(() => {
    const completedFields = REQUIRED_FIELDS.filter(field => {
      const value = getValues(field);
      return value !== undefined && value !== null && value !== '';
    });
    return Math.round((completedFields.length / REQUIRED_FIELDS.length) * 100);
  }, [getValues]);

  // Memoized progress calculation - يعتمد على formState للتحديث عند تغيير النموذج
  const progress = useMemo(() => calculateProgress(), [calculateProgress, formState.isDirty]);

  // Count errors
  const errorCount = useMemo(() => Object.keys(errors).length, [errors]);

  // Check if all required fields are filled
  const hasRequiredFields = useMemo(() => {
    return REQUIRED_FIELDS.every(field => {
      const value = getValues(field);
      return value !== undefined && value !== null && value !== '';
    });
  }, [getValues, formState.isDirty]);

  // Get validation status for a specific field
  const getFieldValidationStatus = useCallback((fieldName: keyof ProductFormValues) => {
    const error = errors[fieldName];
    const isRequired = REQUIRED_FIELDS.includes(fieldName);
    const value = getValues(fieldName);
    
    return {
      isValid: !error,
      error: error?.message as string | undefined,
      isRequired,
    };
  }, [errors, getValues]);

  return {
    progress,
    isValid,
    errorCount,
    hasRequiredFields,
    calculateProgress,
    getFieldValidationStatus,
  };
};
