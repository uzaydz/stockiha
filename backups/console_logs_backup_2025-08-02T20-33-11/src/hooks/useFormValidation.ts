import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { FormField, ProductFormData, ProductFormDataValue, FormErrors, ValidationResult, DebounceConfig } from '@/types/productForm';
import { useProductPurchaseTranslation } from '@/hooks/useProductPurchaseTranslation';

interface UseFormValidationProps {
  fields: FormField[];
  formData: ProductFormData;
  showValidation?: boolean;
  debounceConfig?: DebounceConfig;
  onValidationChange?: (isValid: boolean, errors: FormErrors) => void;
}

export const useFormValidation = ({
  fields,
  formData,
  showValidation = true,
  debounceConfig = { delay: 300, immediate: false },
  onValidationChange
}: UseFormValidationProps) => {
  const { productFormRenderer } = useProductPurchaseTranslation();
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  
  // استخدام refs لتجنب stale closures
  const fieldsRef = useRef(fields);
  const formDataRef = useRef(formData);
  const errorsRef = useRef(errors);
  
  // تحديث refs عند تغيير القيم
  useEffect(() => {
    fieldsRef.current = fields;
  }, [fields]);
  
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);
  
  useEffect(() => {
    errorsRef.current = errors;
  }, [errors]);

  // دالة التحقق من حقل واحد - محسنة ومستقرة
  const validateField = useCallback((field: FormField, value: ProductFormDataValue): string => {
    if (field.required && (!value || value === '')) {
      return `${field.label} ${productFormRenderer.requiredField()}`;
    }

    if (field.validation && value) {
      const { pattern, message, min, max } = field.validation;
      
      if (pattern && typeof value === 'string') {
        const regex = new RegExp(pattern);
        if (!regex.test(value)) {
          return message || `${field.label} ${productFormRenderer.invalidField()}`;
        }
      }

      if (field.type === 'number' && typeof value === 'number') {
        if (min !== undefined && value < min) {
          return `${field.label} ${productFormRenderer.mustBeGreaterThan()} ${min}`;
        }
        if (max !== undefined && value > max) {
          return `${field.label} ${productFormRenderer.mustBeLessThan()} ${max}`;
        }
      }

      if (field.type === 'email' && typeof value === 'string') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return productFormRenderer.invalidEmail();
        }
      }

      if (field.type === 'tel' && typeof value === 'string') {
        const phoneRegex = /^[0-9+\-\s()]+$/;
        if (!phoneRegex.test(value)) {
          return productFormRenderer.invalidPhone();
        }
      }
    }

    return '';
  }, [productFormRenderer]);

  // فحص رؤية الحقل بناءً على الشروط - محسن
  const isFieldVisible = useCallback((field: FormField, currentFormData: ProductFormData): boolean => {
    if (!field.conditional) return true;
    
    const { field: conditionField, value: conditionValue, operator = 'equals' } = field.conditional;
    const fieldValue = currentFormData[conditionField];
    
    switch (operator) {
      case 'equals':
        return fieldValue === conditionValue;
      case 'not_equals':
        return fieldValue !== conditionValue;
      case 'contains':
        return typeof fieldValue === 'string' && fieldValue.includes(conditionValue as string);
      case 'greater_than':
        return typeof fieldValue === 'number' && fieldValue > (conditionValue as number);
      case 'less_than':
        return typeof fieldValue === 'number' && fieldValue < (conditionValue as number);
      default:
        return fieldValue === conditionValue;
    }
  }, []);

  // التحقق من جميع الحقول - محسن بـ useMemo
  const validateAllFields = useMemo((): ValidationResult => {
    const currentFields = fieldsRef.current;
    const currentFormData = formDataRef.current;
    const newErrors: FormErrors = {};
    
    currentFields.forEach(field => {
      if (isFieldVisible(field, currentFormData)) {
        const error = validateField(field, currentFormData[field.name]);
        if (error) {
          newErrors[field.name] = error;
        }
      }
    });

    return {
      isValid: Object.keys(newErrors).length === 0,
      errors: newErrors
    };
  }, [
    // استخدام primitive values لتجنب تغييرات غير ضرورية
    fields.length,
    JSON.stringify(formData), // بديل أفضل من Object.keys(formData).length
    validateField,
    isFieldVisible
  ]);

  // Debounced validation function
  const debouncedValidationRef = useRef<NodeJS.Timeout>();
  
  const debouncedValidate = useCallback(() => {
    if (debouncedValidationRef.current) {
      clearTimeout(debouncedValidationRef.current);
    }
    
    const validate = () => {
      if (showValidation) {
        const result = validateAllFields;
        
        // فقط عرض الأخطاء للحقول التي تم لمسها أو إذا كان هناك طلب صريح للتحقق
        const filteredErrors: FormErrors = {};
        Object.keys(result.errors).forEach(fieldName => {
          if (touched[fieldName]) {
            filteredErrors[fieldName] = result.errors[fieldName];
          }
        });
        
        setErrors(filteredErrors);
        onValidationChange?.(result.isValid, filteredErrors);
      }
    };
    
    if (debounceConfig.immediate) {
      validate();
    } else {
      debouncedValidationRef.current = setTimeout(validate, debounceConfig.delay);
    }
  }, [showValidation, validateAllFields, touched, onValidationChange, debounceConfig]);

  // تشغيل التحقق المؤجل عند تغيير البيانات
  useEffect(() => {
    debouncedValidate();
    
    return () => {
      if (debouncedValidationRef.current) {
        clearTimeout(debouncedValidationRef.current);
      }
    };
  }, [debouncedValidate]);

  // دالة تحديد حقل كملموس
  const touchField = useCallback((fieldName: string) => {
    setTouched(prev => ({
      ...prev,
      [fieldName]: true
    }));
  }, []);

  // دالة تحديد جميع الحقول كملموسة
  const touchAllFields = useCallback(() => {
    const touchedFields: Record<string, boolean> = {};
    fieldsRef.current.forEach(field => {
      touchedFields[field.name] = true;
    });
    setTouched(touchedFields);
  }, []);

  // دالة التحقق الفوري (للاستخدام عند الإرسال)
  const validateImmediate = useCallback((): ValidationResult => {
    const result = validateAllFields;
    
    // عند التحقق الفوري (عند الإرسال), نعرض جميع الأخطاء بغض النظر عن الlmsها
    setErrors(result.errors);
    touchAllFields();
    
    return result;
  }, [validateAllFields, touchAllFields]);

  // إعادة تعيين الأخطاء والـ touched state
  const resetValidation = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  // حساب حقل خطأ معين
  const getFieldError = useCallback((fieldName: string): string | undefined => {
    return touched[fieldName] ? errors[fieldName] : undefined;
  }, [errors, touched]);

  // فحص ما إذا كان الحقل يحتوي على خطأ ومُلمَس
  const hasFieldError = useCallback((fieldName: string): boolean => {
    return Boolean(touched[fieldName] && errors[fieldName]);
  }, [errors, touched]);

  // حساب عدد الأخطاء الحالية (فقط للحقول التي تم لمسها)
  const errorCount = useMemo(() => {
    return Object.keys(errors).filter(fieldName => touched[fieldName]).length;
  }, [errors, touched]);

  // فحص صحة النموذج الحالية
  const isFormValid = useMemo(() => validateAllFields.isValid, [validateAllFields]);

  return {
    // State
    errors,
    touched,
    
    // Computed values
    isFormValid,
    errorCount,
    
    // Methods
    validateField,
    validateImmediate,
    touchField,
    touchAllFields,
    resetValidation,
    getFieldError,
    hasFieldError,
    isFieldVisible: (field: FormField) => isFieldVisible(field, formData)
  };
};
