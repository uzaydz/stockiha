import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { ProductFormData, ProductFormDataValue, ProductColor, ProductSize } from '@/types/productForm';

interface UseFormDataProps {
  initialData?: ProductFormData;
  selectedColor?: ProductColor;
  selectedSize?: ProductSize;
  onFormChange?: (data: ProductFormData) => void;
  onColorSelect?: (color: ProductColor) => void;
  onSizeSelect?: (size: ProductSize) => void;
}

export const useFormData = ({
  initialData = {},
  selectedColor,
  selectedSize,
  onFormChange,
  onColorSelect,
  onSizeSelect
}: UseFormDataProps) => {
  // استخدام refs لتجنب stale closures
  const onFormChangeRef = useRef(onFormChange);
  const onColorSelectRef = useRef(onColorSelect);
  const onSizeSelectRef = useRef(onSizeSelect);
  
  // تحديث refs عند تغيير القيم
  useEffect(() => {
    onFormChangeRef.current = onFormChange;
  }, [onFormChange]);
  
  useEffect(() => {
    onColorSelectRef.current = onColorSelect;
  }, [onColorSelect]);
  
  useEffect(() => {
    onSizeSelectRef.current = onSizeSelect;
  }, [onSizeSelect]);

  // حالة النموذج الرئيسية
  const [formData, setFormData] = useState<ProductFormData>(() => {
    const baseData: ProductFormData = {
      ...initialData,
      ...(selectedColor && { product_color: selectedColor.id }),
      ...(selectedSize && { product_size: selectedSize.id })
    };
    
    // تعيين التوصيل للمكتب كافتراضي إذا لم يكن محدداً
    if (!baseData.delivery_type && !baseData.delivery && !baseData['توصيل']) {
      // البحث عن أي حقل يشير للتوصيل وتعيين القيمة الافتراضية
      const deliveryFieldNames = ['delivery_type', 'delivery', 'توصيل', 'delivery_method'];
      const hasDeliveryField = deliveryFieldNames.some(name => initialData.hasOwnProperty(name));
      
      if (!hasDeliveryField) {
        // تعيين قيم افتراضية للتوصيل للمكتب
        baseData.delivery_type = 'desk';
      }
    }
    
    return baseData;
  });

  // تجنب race conditions مع flag لحماية التحديثات المتزامنة
  const isUpdatingRef = useRef(false);

  // مزامنة الاختيارات الخارجية مع النموذج - محسن لتجنب loops
  useEffect(() => {
    if (isUpdatingRef.current) return;
    
    let shouldUpdate = false;
    const updates: Partial<ProductFormData> = {};

    if (selectedColor && formData.product_color !== selectedColor.id) {
      updates.product_color = selectedColor.id;
      shouldUpdate = true;
    }

    if (selectedSize && formData.product_size !== selectedSize.id) {
      updates.product_size = selectedSize.id;
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      isUpdatingRef.current = true;
      setFormData(prev => {
        const newData = { ...prev, ...updates };
        // تأجيل استدعاء onChange لتجنب loops
        setTimeout(() => {
          onFormChangeRef.current?.(newData);
          isUpdatingRef.current = false;
        }, 0);
        return newData;
      });
    }
  }, [selectedColor?.id, selectedSize?.id, formData.product_color, formData.product_size]);

  // دالة تحديث قيمة حقل محسنة لتجنب race conditions
  const updateField = useCallback((fieldName: string, value: ProductFormDataValue) => {
    if (isUpdatingRef.current) {
      // إذا كانت هناك عملية تحديث جارية، نؤجل هذا التحديث
      setTimeout(() => updateField(fieldName, value), 10);
      return;
    }

    isUpdatingRef.current = true;
    
    setFormData(prev => {
      const newData: any = { ...prev, [fieldName]: value };
      
      // معالجة خاصة لتغيير اللون - إعادة تعيين المقاس
      if (fieldName === 'product_color') {
        newData.product_size = ''; // مسح المقاس السابق
      }

      // مزامنة نوع التوصيل الموحد: اجعل delivery_type يعكس أي حقل توصيل
      try {
        if (typeof fieldName === 'string' && /delivery|توصيل/i.test(fieldName)) {
          newData.delivery_type = value as any;
        }
      } catch {}
      
      // تأجيل استدعاءات callback لتجنب loops وrace conditions
      setTimeout(() => {
        try {
          // استدعاء onChange الرئيسي
          onFormChangeRef.current?.(newData);
          
          // مزامنة مع الاختيارات الخارجية
          if (fieldName === 'product_color' && onColorSelectRef.current) {
            // البحث عن اللون المختار من البيانات الخارجية
            // سيتم تمرير البيانات من المكون الأب
          }
          
          if (fieldName === 'product_size' && onSizeSelectRef.current) {
            // البحث عن المقاس المختار من البيانات الخارجية
            // سيتم تمرير البيانات من المكون الأب
          }
        } finally {
          isUpdatingRef.current = false;
        }
      }, 0);
      
      return newData;
    });
  }, []);

  // دالة تحديث متعددة الحقول
  const updateMultipleFields = useCallback((updates: Partial<ProductFormData>) => {
    if (isUpdatingRef.current) {
      setTimeout(() => updateMultipleFields(updates), 10);
      return;
    }

    isUpdatingRef.current = true;
    
    setFormData(prev => {
      const newData = { ...prev, ...updates };
      
      setTimeout(() => {
        try {
          onFormChangeRef.current?.(newData);
        } finally {
          isUpdatingRef.current = false;
        }
      }, 0);
      
      return newData;
    });
  }, []);

  // دالة إعادة تعيين النموذج
  const resetForm = useCallback((newInitialData?: ProductFormData) => {
    const resetData = {
      ...(newInitialData || initialData),
      ...(selectedColor && { product_color: selectedColor.id }),
      ...(selectedSize && { product_size: selectedSize.id })
    };
    
    isUpdatingRef.current = true;
    setFormData(resetData);
    
    setTimeout(() => {
      try {
        onFormChangeRef.current?.(resetData);
      } finally {
        isUpdatingRef.current = false;
      }
    }, 0);
  }, [initialData, selectedColor?.id, selectedSize?.id]);

  // دالة للحصول على قيمة حقل محدد
  const getFieldValue = useCallback((fieldName: string): ProductFormDataValue => {
    return formData[fieldName];
  }, [formData]);

  // فحص ما إذا كان الحقل يحتوي على قيمة
  const hasFieldValue = useCallback((fieldName: string): boolean => {
    const value = formData[fieldName];
    return value !== undefined && value !== '' && value !== null;
  }, [formData]);

  // الحصول على جميع الحقول المملوءة
  const getFilledFields = useMemo(() => {
    return Object.entries(formData)
      .filter(([_, value]) => value !== undefined && value !== '' && value !== null)
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
  }, [formData]);

  // حساب نسبة اكتمال النموذج (بناءً على الحقول المملوءة)
  const getCompletionPercentage = useCallback((requiredFields: string[] = []) => {
    if (requiredFields.length === 0) return 100;
    
    const filledRequiredFields = requiredFields.filter(field => hasFieldValue(field)).length;
    return Math.round((filledRequiredFields / requiredFields.length) * 100);
  }, [hasFieldValue]);

  // دالة للتحقق من تغيير البيانات منذ التهيئة
  const hasDataChanged = useMemo(() => {
    const currentData = JSON.stringify(formData);
    const initialDataWithDefaults = JSON.stringify({
      ...initialData,
      ...(selectedColor && { product_color: selectedColor.id }),
      ...(selectedSize && { product_size: selectedSize.id })
    });
    
    return currentData !== initialDataWithDefaults;
  }, [formData, initialData, selectedColor?.id, selectedSize?.id]);

  return {
    // State
    formData,
    
    // Computed values
    filledFields: getFilledFields,
    hasDataChanged,
    
    // Methods
    updateField,
    updateMultipleFields,
    resetForm,
    getFieldValue,
    hasFieldValue,
    getCompletionPercentage,
    
    // Utilities
    isUpdating: () => isUpdatingRef.current
  };
};
