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

export const useProductFormValidation = (
  form: UseFormReturn<ProductFormValues>
): UseProductFormValidationReturn => {
  const { formState, getValues, watch } = form;
  const { errors, isValid } = formState;
  
  // Watch required fields for real-time validation
  const watchedValues = watch();
  
  // Define required fields
  const requiredFields: (keyof ProductFormValues)[] = [
    'name', 
    'description', 
    'price', 
    'category_id', 
    'thumbnail_image'
  ];

  // Calculate form progress
  const calculateProgress = useCallback(() => {
    const completedFields = requiredFields.filter(field => {
      const value = getValues(field);
      return value !== undefined && value !== null && value !== '';
    });
    return Math.round((completedFields.length / requiredFields.length) * 100);
  }, [getValues]);

  // Memoized progress calculation
  const progress = useMemo(() => calculateProgress(), [calculateProgress, watchedValues]);

  // Count errors
  const errorCount = useMemo(() => Object.keys(errors).length, [errors]);

  // Check if all required fields are filled
  const hasRequiredFields = useMemo(() => {
    return requiredFields.every(field => {
      const value = getValues(field);
      return value !== undefined && value !== null && value !== '';
    });
  }, [getValues, requiredFields]);

  // Get validation status for a specific field
  const getFieldValidationStatus = useCallback((fieldName: keyof ProductFormValues) => {
    const error = errors[fieldName];
    const isRequired = requiredFields.includes(fieldName);
    const value = getValues(fieldName);
    
    return {
      isValid: !error,
      error: error?.message,
      isRequired,
      hasValue: value !== undefined && value !== null && value !== '',
    };
  }, [errors, getValues, requiredFields]);

  return {
    progress,
    isValid,
    errorCount,
    hasRequiredFields,
    calculateProgress,
    getFieldValidationStatus,
  };
};
