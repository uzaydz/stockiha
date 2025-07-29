import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  DocumentTextIcon, 
  MapPinIcon, 
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  HomeIcon,
  TruckIcon,
  CheckIcon,
  SwatchIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { 
  getAvailableWilayas, 
  getMunicipalitiesByWilayaId,
  type YalidineMunicipality
} from '@/data/yalidine-municipalities-complete';
import { useProductPurchaseTranslation } from '@/hooks/useProductPurchaseTranslation';

// تحسين تعريفات الأنواع
export type FormFieldType = 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'number';

export interface FormFieldOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface FormFieldValidation {
  pattern?: string;
  message?: string;
  min?: number;
  max?: number;
  required?: boolean;
}

export interface FormFieldConditional {
  field: string;
  value: string | boolean | number;
  operator?: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
}

export interface FormField {
  id: string;
  name: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  placeholder?: string;
  description?: string;
  options?: FormFieldOption[];
  validation?: FormFieldValidation;
  conditional?: FormFieldConditional;
  className?: string;
  disabled?: boolean;
}

export type ProductFormDataValue = string | boolean | number | undefined;

export interface ProductFormData {
  [key: string]: ProductFormDataValue;
}

export interface FormErrors {
  [key: string]: string;
}

interface ProductFormRendererProps {
  formData?: {
    fields: FormField[];
    name?: string;
    description?: string;
    submitButtonText?: string;
    [key: string]: unknown;
  };
  formStrategy?: string;
  onFormSubmit?: (data: ProductFormData) => void | Promise<void>;
  onFormChange?: (data: ProductFormData) => void;
  onValidationChange?: (isValid: boolean, errors: FormErrors) => void;
  loading?: boolean;
  className?: string;
  showValidation?: boolean;
  // البدائل القديمة للتوافق
  fields?: FormField[];
  onSubmit?: (data: ProductFormData) => void | Promise<void>;
  initialData?: ProductFormData;
  isSubmitting?: boolean;
  
  // خصائص الألوان والمقاسات الجديدة
  product?: {
    has_variants?: boolean;
    colors?: Array<{
      id: string;
      name: string;
      color_code?: string;
      image_url?: string;
      quantity?: number; // إضافة دعم للمخزون
      sizes?: Array<{
        id: string;
        size_name: string;
        price?: number;
        quantity?: number; // إضافة دعم للمخزون
      }>;
    }>;
  };
  selectedColor?: {
    id: string;
    name: string;
    color_code?: string;
    image_url?: string;
    quantity?: number; // إضافة دعم للمخزون
    sizes?: Array<{
      id: string;
      size_name: string;
      price?: number;
      quantity?: number; // إضافة دعم للمخزون
    }>;
  };
  selectedSize?: {
    id: string;
    size_name: string;
    price?: number;
    quantity?: number; // إضافة دعم للمخزون
  };
  onColorSelect?: (color: any) => void;
  onSizeSelect?: (size: any) => void;
  
  // خصائص حالة تحميل الأسعار الجديدة
  isLoadingDeliveryFee?: boolean;
  isCalculatingDelivery?: boolean;
  isLoadingPrices?: boolean;
  deliveryFee?: number;
}

// تحسين الانميشن للأداء
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
      staggerChildren: 0.08
    }
  }
};

const fieldVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.3,
      ease: "easeOut"
    }
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.2 }
  }
};

const errorVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.2 }
  }
};

// مكون محسن لعرض الألوان
const ColorSelector = memo(({ 
  colors, 
  selectedValue, 
  onSelect, 
  productFormRenderer 
}: {
  colors: Array<{
    id: string;
    name: string;
    color_code?: string;
    image_url?: string;
    quantity?: number; // إضافة دعم اختياري للمخزون
  }>;
  selectedValue: string;
  onSelect: (value: string) => void;
  productFormRenderer: any;
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
          <SwatchIcon className="w-4 h-4 text-primary" />
        </div>
        <Label className="text-base font-semibold text-foreground">{productFormRenderer.selectColor()}</Label>
      </div>
      
      {/* عرض مضغوط للألوان */}
      <div className="flex flex-wrap gap-2">
        {colors.map((color) => {
          const isSelected = selectedValue === color.id;
          const isOutOfStock = color.quantity !== undefined && (color.quantity || 0) <= 0;
          const isLowStock = color.quantity !== undefined && (color.quantity || 0) > 0 && (color.quantity || 0) <= 5;
          
          return (
            <motion.button
              key={color.id}
              type="button"
              className={cn(
                "relative group flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200",
                !isOutOfStock && "cursor-pointer hover:shadow-md",
                isSelected 
                  ? "border-primary bg-primary/10 text-primary shadow-sm" 
                  : !isOutOfStock 
                  ? "border-border hover:border-primary/50 bg-card text-foreground"
                  : "border-red-200 bg-red-50 text-red-400 cursor-not-allowed opacity-60 dark:border-red-800 dark:bg-red-900/20"
              )}
              onClick={() => !isOutOfStock && onSelect(color.id)}
              whileHover={!isOutOfStock ? { scale: 1.02 } : {}}
              whileTap={!isOutOfStock ? { scale: 0.98 } : {}}
              title={isOutOfStock ? `${color.name} - نفد المخزون` : color.name}
              disabled={isOutOfStock}
            >
              {/* دائرة اللون */}
              <div className="relative">
                {color.image_url ? (
                  <img 
                    src={color.image_url} 
                    alt={color.name}
                    className={cn(
                      "w-6 h-6 rounded-full object-cover border-2 border-white shadow-sm",
                      isOutOfStock && "grayscale opacity-50"
                    )}
                  />
                ) : color.color_code ? (
                  <div 
                    className={cn(
                      "w-6 h-6 rounded-full border-2 border-white shadow-sm",
                      isOutOfStock && "grayscale opacity-50"
                    )}
                    style={{ backgroundColor: color.color_code }}
                  />
                ) : (
                  <div className={cn(
                    "w-6 h-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 border-2 border-white shadow-sm flex items-center justify-center",
                    isOutOfStock && "grayscale opacity-50"
                  )}>
                    <SwatchIcon className="w-3 h-3 text-primary" />
                  </div>
                )}

                {/* مؤشر نفاد المخزون */}
                {isOutOfStock && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-4 h-0.5 bg-red-500 rotate-45 rounded-full"></div>
                    <div className="w-4 h-0.5 bg-red-500 -rotate-45 rounded-full absolute"></div>
                  </div>
                )}

                {/* مؤشر المخزون المنخفض */}
                {isLowStock && !isOutOfStock && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                )}

                {/* مؤشر الاختيار */}
                {isSelected && !isOutOfStock && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full flex items-center justify-center">
                    <CheckIcon className="w-2 h-2 text-white" />
                  </div>
                )}
              </div>
              
              {/* اسم اللون */}
              <span className={cn(
                "text-sm font-medium",
                isOutOfStock && "line-through"
              )}>
                {color.name}
              </span>

              {/* حالة المخزون */}
              {isOutOfStock && (
                <Badge variant="destructive" className="text-xs px-1 py-0 h-4">
                  نفد
                </Badge>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
});

// مكون محسن لعرض المقاسات
const SizeSelector = memo(({ 
  sizes, 
  selectedValue, 
  onSelect, 
  productFormRenderer 
}: {
  sizes: Array<{
    id: string;
    size_name: string;
    price?: number;
    quantity?: number; // إضافة دعم اختياري للمخزون
  }>;
  selectedValue: string;
  onSelect: (value: string) => void;
  productFormRenderer: any;
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-secondary/20 to-secondary/40 flex items-center justify-center">
          <TagIcon className="w-4 h-4 text-secondary" />
        </div>
        <Label className="text-base font-semibold text-foreground">{productFormRenderer.selectSize()}</Label>
      </div>
      
      {/* عرض مضغوط للمقاسات */}
      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => {
          const isSelected = selectedValue === size.id;
          const isOutOfStock = size.quantity !== undefined && (size.quantity || 0) <= 0;
          const isLowStock = size.quantity !== undefined && (size.quantity || 0) > 0 && (size.quantity || 0) <= 5;
          
          return (
            <motion.button
              key={size.id}
              type="button"
              className={cn(
                "relative group flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 min-w-[80px] justify-center",
                !isOutOfStock && "cursor-pointer hover:shadow-md",
                isSelected 
                  ? "border-primary bg-primary text-primary-foreground shadow-sm" 
                  : !isOutOfStock
                  ? "border-border hover:border-primary/50 bg-card text-foreground"
                  : "border-red-200 bg-red-50 text-red-400 cursor-not-allowed opacity-60 dark:border-red-800 dark:bg-red-900/20"
              )}
              onClick={() => !isOutOfStock && onSelect(size.id)}
              whileHover={!isOutOfStock ? { scale: 1.02 } : {}}
              whileTap={!isOutOfStock ? { scale: 0.98 } : {}}
              title={isOutOfStock ? `${size.size_name} - نفد المخزون` : size.size_name}
              disabled={isOutOfStock}
            >
              {/* محتوى المقاس */}
              <div className="flex flex-col items-center gap-1">
                {/* اسم المقاس */}
                <span className={cn(
                  "text-sm font-semibold",
                  isOutOfStock && "line-through"
                )}>
                  {size.size_name}
                </span>

                {/* السعر (إن وجد) */}
                {size.price && !isOutOfStock && (
                  <span className="text-xs opacity-75">
                    {size.price.toLocaleString()} د.ج
                  </span>
                )}
              </div>

              {/* مؤشر نفاد المخزون للمقاسات */}
              {isOutOfStock && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-0.5 bg-red-500 rotate-45 rounded-full"></div>
                  <div className="w-6 h-0.5 bg-red-500 -rotate-45 rounded-full absolute"></div>
                </div>
              )}

              {/* مؤشر المخزون المنخفض */}
              {isLowStock && !isOutOfStock && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              )}

              {/* مؤشر الاختيار */}
              {isSelected && !isOutOfStock && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary-foreground rounded-full flex items-center justify-center">
                  <CheckIcon className="w-2 h-2 text-primary" />
                </div>
              )}

              {/* حالة المخزون */}
              {isOutOfStock && (
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
                  <Badge variant="destructive" className="text-xs px-1 py-0 h-4">
                    نفد
                  </Badge>
                </div>
              )}
              {isLowStock && !isOutOfStock && (
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
                  <Badge variant="outline" className="text-xs px-1 py-0 h-4 border-orange-500 text-orange-600">
                    قليل
                  </Badge>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
});

const ProductFormRenderer = memo<ProductFormRendererProps>(({
  formData: externalFormData,
  formStrategy,
  onFormSubmit,
  onFormChange,
  onValidationChange,
  loading = false,
  className,
  showValidation = true,
  // البدائل القديمة للتوافق
  fields: directFields,
  onSubmit,
  initialData = {},
  isSubmitting = false,
  // خصائص الألوان والمقاسات الجديدة
  product,
  selectedColor,
  selectedSize,
  onColorSelect,
  onSizeSelect,
  // خصائص حالة تحميل الأسعار الجديدة
  isLoadingDeliveryFee = false,
  isCalculatingDelivery = false,
  isLoadingPrices = false,
  deliveryFee
}) => {
  
  // استخدام الترجمة المخصصة
  const { productFormRenderer, translateDynamicText } = useProductPurchaseTranslation();
  
  // تحسين معالجة البيانات بـ useMemo
  const { 
    fields, 
    isLoading, 
    submitHandler, 
    formTitle, 
    formDescription,
    submitButtonText 
  } = useMemo(() => {
    const baseFields = externalFormData?.fields || directFields || [];
    const dynamicFields: FormField[] = [];

    // إضافة حقل الألوان ديناميكياً
    if (product?.has_variants && product?.colors && product.colors.length > 0) {
      const colorField: FormField = {
        id: 'product_color',
        name: 'product_color',
        label: productFormRenderer.selectColor(),
        type: 'radio',
        required: true,
        description: productFormRenderer.selectColorDescription(),
        options: product.colors.map(color => ({
          label: color.name,
          value: color.id
        }))
      };
      dynamicFields.push(colorField);
    }

    // إضافة حقل المقاسات ديناميكياً (يعتمد على اللون المختار)
    if (selectedColor?.sizes && selectedColor.sizes.length > 0) {
      const sizeField: FormField = {
        id: 'product_size',
        name: 'product_size',
        label: productFormRenderer.selectSize(),
        type: 'radio',
        required: true,
        description: productFormRenderer.selectSizeDescription(),
        options: selectedColor.sizes.map(size => ({
          label: size.size_name,
          value: size.id
        }))
      };
      dynamicFields.push(sizeField);
    }

    // ترجمة النصوص في الحقول الأساسية
    const translatedBaseFields = baseFields.map(field => ({
      ...field,
      label: translateDynamicText(field.label),
      placeholder: field.placeholder ? translateDynamicText(field.placeholder) : field.placeholder,
      description: field.description ? translateDynamicText(field.description) : field.description,
      options: field.options?.map(option => ({
        ...option,
        label: translateDynamicText(option.label)
      }))
    }));

    return {
      fields: [...dynamicFields, ...translatedBaseFields],
      isLoading: loading || isSubmitting,
      submitHandler: onFormSubmit || onSubmit,
      formTitle: externalFormData?.name ? translateDynamicText(externalFormData.name) : productFormRenderer.orderForm(),
      formDescription: externalFormData?.description ? translateDynamicText(externalFormData.description) : undefined,
      submitButtonText: externalFormData?.submitButtonText ? translateDynamicText(externalFormData.submitButtonText) : productFormRenderer.submitOrder()
    };
  }, [externalFormData, directFields, loading, isSubmitting, onFormSubmit, onSubmit, product, selectedColor, productFormRenderer, translateDynamicText]);

  const [formData, setFormData] = useState<ProductFormData>(() => ({
    ...initialData,
    // مزامنة الاختيارات الحالية مع النموذج
    ...(selectedColor && { product_color: selectedColor.id }),
    ...(selectedSize && { product_size: selectedSize.id })
  }));

  // مزامنة الاختيارات الخارجية مع النموذج عند التغيير - محسن
  useEffect(() => {
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
      setFormData(prev => ({ ...prev, ...updates }));
    }
  }, [selectedColor?.id, selectedSize?.id]); // تحسين dependencies
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [provinces] = useState(getAvailableWilayas());
  const [availableMunicipalities, setAvailableMunicipalities] = useState<YalidineMunicipality[]>([]);
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>('');

  // تحسين أسماء حقول الولايات والبلديات بـ useMemo
  const fieldNames = useMemo(() => ({
    province: ['province', 'wilaya', 'state', productFormRenderer.selectProvince().toLowerCase()],
    municipality: ['municipality', 'commune', 'city', productFormRenderer.selectMunicipality().toLowerCase()]
  }), [productFormRenderer]);

  // تحسين العثور على الحقول بـ useMemo
  const { provinceField, municipalityField } = useMemo(() => {
    const provinceField = fields?.find(field => 
      fieldNames.province.some(name => 
        field.name.toLowerCase().includes(name.toLowerCase()) || 
        field.label.toLowerCase().includes(name.toLowerCase())
      )
    );

    const municipalityField = fields?.find(field => 
      fieldNames.municipality.some(name => 
        field.name.toLowerCase().includes(name.toLowerCase()) || 
        field.label.toLowerCase().includes(name.toLowerCase())
      )
    );

    return { provinceField, municipalityField };
  }, [fields, fieldNames]);

  // validation logic
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

  // validate all fields - محسن للأداء
  const validateForm = useCallback((): { isValid: boolean; errors: FormErrors } => {
    const newErrors: FormErrors = {};
    
    fields.forEach(field => {
      if (isFieldVisible(field)) {
        const error = validateField(field, formData[field.name]);
        if (error) {
          newErrors[field.name] = error;
        }
      }
    });

    return {
      isValid: Object.keys(newErrors).length === 0,
      errors: newErrors
    };
  }, [fields.length, Object.keys(formData).length, validateField]); // dependencies محسنة

  // تحديث البلديات عند تغيير الولاية
  useEffect(() => {
    if (selectedProvinceId) {
      const municipalities = getMunicipalitiesByWilayaId(Number(selectedProvinceId));
      setAvailableMunicipalities(municipalities);
    } else {
      setAvailableMunicipalities([]);
    }
  }, [selectedProvinceId]);

  // مراقبة تغيير بيانات النموذج - محسن للأداء
  useEffect(() => {
    if (provinceField) {
      const provinceValue = formData[provinceField.name] as string;
      
      if (provinceValue && provinceValue !== selectedProvinceId) {
        setSelectedProvinceId(provinceValue);
        
        // إعادة تعيين البلدية عند تغيير الولاية
        if (municipalityField && formData[municipalityField.name]) {
          const newFormData = { ...formData };
          newFormData[municipalityField.name] = '';
          setFormData(newFormData);
          onFormChange?.(newFormData);
        }
      }
    }
  }, [formData[provinceField?.name || ''], selectedProvinceId]); // dependencies محددة

  // validation on form data change - محسن لتجنب loops
  useEffect(() => {
    if (showValidation) {
      const { isValid, errors: validationErrors } = validateForm();
      setErrors(validationErrors);
      onValidationChange?.(isValid, validationErrors);
    }
    onFormChange?.(formData);
  }, [formData, showValidation]); // إزالة dependencies الخطيرة

  // تحديث قيمة حقل في النموذج
  const updateFormData = useCallback((fieldName: string, value: ProductFormDataValue) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    
    // mark field as touched
    setTouched(prev => ({
      ...prev,
      [fieldName]: true
    }));

    // مزامنة مع الاختيارات الخارجية - محسن لتجنب loops
    if (fieldName === 'product_color' && onColorSelect && product?.colors) {
      const selectedColorData = product.colors.find(color => color.id === value);
      if (selectedColorData) {
        // تأجيل المزامنة لتجنب loops
        setTimeout(() => onColorSelect(selectedColorData), 0);
        // إعادة تعيين المقاس عند تغيير اللون
        setFormData(prev => ({
          ...prev,
          [fieldName]: value,
          product_size: '' // مسح المقاس السابق
        }));
        return; // منع التحديث المزدوج
      }
    }

    if (fieldName === 'product_size' && onSizeSelect && selectedColor?.sizes) {
      const selectedSizeData = selectedColor.sizes.find(size => size.id === value);
      if (selectedSizeData) {
        // تأجيل المزامنة لتجنب loops
        setTimeout(() => onSizeSelect(selectedSizeData), 0);
      }
    }
  }, [onColorSelect, onSizeSelect, product, selectedColor]);

  // فحص إذا كان الحقل مرئي بناءً على الشروط
  const isFieldVisible = useCallback((field: FormField): boolean => {
    if (!field.conditional) return true;
    
    const { field: conditionField, value: conditionValue, operator = 'equals' } = field.conditional;
    const fieldValue = formData[conditionField];
    
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
  }, [formData]);

  // تحسين الحصول على أيقونة الحقل
  const getFieldIcon = useCallback((field: FormField) => {
    const iconClass = "w-4 h-4 text-primary";
    
    // أيقونة خاصة لحقل نوع التوصيل
    if (field.type === 'radio' && (
      field.name.toLowerCase().includes('delivery') || 
      field.name.toLowerCase().includes('توصيل') ||
      field.label.toLowerCase().includes('delivery') ||
      field.label.toLowerCase().includes('توصيل')
    )) {
      return <TruckIcon className={iconClass} />;
    }
    
    switch (field.type) {
      case 'email':
        return <EnvelopeIcon className={iconClass} />;
      case 'tel':
        return <PhoneIcon className={iconClass} />;
      case 'textarea':
        return <DocumentTextIcon className={iconClass} />;
      default:
        if (field.name.toLowerCase().includes('name') || field.name.toLowerCase().includes('اسم')) {
          return <UserIcon className={iconClass} />;
        }
        if (field.name.toLowerCase().includes('address') || field.name.toLowerCase().includes('عنوان')) {
          return <BuildingOfficeIcon className={iconClass} />;
        }
        if (field.name.toLowerCase().includes('wilaya') || field.name.toLowerCase().includes('province')) {
          return <MapPinIcon className={iconClass} />;
        }
        return <DocumentTextIcon className={iconClass} />;
    }
  }, []);

  // عرض حقل الولاية
  const renderProvinceField = useCallback((field: FormField) => {
    const currentValue = formData[field.name] as string || '';
    const fieldError = errors[field.name];
    const isFieldTouched = touched[field.name];

    return (
      <motion.div 
        className="space-y-2"
        variants={fieldVariants}
        layout
      >
        <Label 
          htmlFor={field.id} 
          className="block text-sm font-medium mb-2 text-foreground flex items-center"
        >
          <MapPinIcon className="w-4 h-4 ml-2 text-primary" />
          {field.label}
          {field.required && <span className="text-red-500 mr-1">*</span>}
        </Label>
        
        {field.description && (
          <p className="text-xs text-muted-foreground mb-2">{field.description}</p>
        )}
        
        <Select
          value={currentValue}
          onValueChange={(value) => updateFormData(field.name, value)}
          disabled={isLoading || field.disabled}
        >
          <SelectTrigger 
            className={cn(
              "w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 bg-background text-foreground shadow-sm hover:border-muted-foreground",
              "disabled:opacity-50",
              fieldError && isFieldTouched && "border-destructive focus:border-destructive focus:ring-destructive"
            )}
            aria-invalid={fieldError && isFieldTouched}
            aria-describedby={fieldError ? `${field.id}-error` : undefined}
          >
                            <SelectValue placeholder={field.placeholder || productFormRenderer.selectProvince()} />
          </SelectTrigger>
          <SelectContent className="rounded-xl border border-border shadow-lg">
            {provinces.map((province) => (
              <SelectItem 
                key={province.id} 
                value={province.id.toString()}
                className="rounded-lg cursor-pointer hover:bg-accent/50"
              >
                <div className="flex items-center gap-2">
                  <MapPinIcon className="w-4 h-4 text-muted-foreground" />
                  {province.name_ar || province.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <AnimatePresence>
          {fieldError && isFieldTouched && (
            <motion.div 
              variants={errorVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              id={`${field.id}-error`}
              role="alert"
            >
              <Alert variant="destructive" className="py-2">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <AlertDescription className="text-sm">{fieldError}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }, [formData, updateFormData, isLoading, provinces, errors, touched]);

  // عرض حقل البلدية
  const renderMunicipalityField = useCallback((field: FormField) => {
    const currentValue = formData[field.name] as string || '';
    const fieldError = errors[field.name];
    const isFieldTouched = touched[field.name];

    if (!selectedProvinceId) {
      return (
        <motion.div 
          className="space-y-2"
          variants={fieldVariants}
          layout
        >
          <Label 
            htmlFor={field.id} 
            className="text-sm font-medium text-muted-foreground flex items-center gap-2"
          >
            <MapPinIcon className="w-4 h-4" />
            {field.label}
            {field.required && <span className="text-destructive">*</span>}
          </Label>
          
          {field.description && (
            <p className="text-xs text-muted-foreground">{field.description}</p>
          )}
          
          <div className="w-full px-4 py-3 border border-border rounded-lg bg-muted/50 text-muted-foreground flex items-center justify-center">
            <div className="flex items-center gap-2">
              <MapPinIcon className="w-4 h-4" />
                                  {productFormRenderer.selectProvinceFirst()}
            </div>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div 
        className="space-y-2"
        variants={fieldVariants}
        layout
      >
        <Label 
          htmlFor={field.id} 
          className="block text-sm font-medium mb-2 text-foreground flex items-center"
        >
          <MapPinIcon className="w-4 h-4 ml-2 text-primary" />
          {field.label}
          {field.required && <span className="text-red-500 mr-1">*</span>}
        </Label>
        
        {field.description && (
          <p className="text-xs text-muted-foreground mb-2">{field.description}</p>
        )}
        
        <Select
          value={currentValue}
          onValueChange={(value) => updateFormData(field.name, value)}
          disabled={isLoading || field.disabled}
        >
          <SelectTrigger 
            className={cn(
              "w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 bg-background text-foreground shadow-sm hover:border-muted-foreground",
              "disabled:opacity-50",
              fieldError && isFieldTouched && "border-destructive focus:border-destructive focus:ring-destructive"
            )}
            aria-invalid={fieldError && isFieldTouched}
            aria-describedby={fieldError ? `${field.id}-error` : undefined}
          >
                            <SelectValue placeholder={field.placeholder || productFormRenderer.selectMunicipality()} />
          </SelectTrigger>
          <SelectContent className="rounded-xl border border-border shadow-lg">
            {availableMunicipalities.map((municipality) => (
              <SelectItem 
                key={municipality.id} 
                value={municipality.id.toString()}
                className="rounded-lg cursor-pointer hover:bg-accent/50"
              >
                <div className="flex items-center gap-2">
                  <BuildingOfficeIcon className="w-4 h-4 text-muted-foreground" />
                  {municipality.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <AnimatePresence>
          {fieldError && isFieldTouched && (
            <motion.div 
              variants={errorVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              id={`${field.id}-error`}
              role="alert"
            >
              <Alert variant="destructive" className="py-2">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <AlertDescription className="text-sm">{fieldError}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }, [formData, updateFormData, isLoading, selectedProvinceId, availableMunicipalities, errors, touched]);

  // عرض الحقول العادية
  const renderRegularField = useCallback((field: FormField) => {
    const currentValue = formData[field.name];
    const icon = getFieldIcon(field);
    const fieldError = errors[field.name];
    const isFieldTouched = touched[field.name];

    const baseInputClass = cn(
      "w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 bg-background text-foreground shadow-sm hover:border-muted-foreground",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      fieldError && isFieldTouched && "border-destructive focus:border-destructive focus:ring-destructive"
    );

    return (
      <motion.div 
        className={cn("space-y-2", field.className)}
        variants={fieldVariants}
        layout
      >
        <Label 
          htmlFor={field.id} 
          className="block text-sm font-medium mb-2 text-foreground flex items-center"
        >
          {icon}
          {field.label}
          {field.required && <span className="text-red-500 mr-1">*</span>}
        </Label>
        
        {field.description && (
          <p className="text-xs text-muted-foreground">{field.description}</p>
        )}
        
        {field.type === 'textarea' ? (
          <Textarea
            id={field.id}
            name={field.name}
            value={currentValue as string || ''}
            onChange={(e) => updateFormData(field.name, e.target.value)}
            placeholder={field.placeholder}
            disabled={isLoading || field.disabled}
            className={cn(baseInputClass, "min-h-24 resize-none")}
            aria-invalid={fieldError && isFieldTouched}
            aria-describedby={fieldError ? `${field.id}-error` : undefined}
          />
        ) : field.type === 'select' && field.options ? (
          <Select
            value={currentValue as string || ''}
            onValueChange={(value) => updateFormData(field.name, value)}
            disabled={isLoading || field.disabled}
          >
            <SelectTrigger 
              className={baseInputClass}
              aria-invalid={fieldError && isFieldTouched}
              aria-describedby={fieldError ? `${field.id}-error` : undefined}
            >
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent className="rounded-xl border border-border shadow-lg">
              {field.options.map((option) => (
                <SelectItem 
                  key={option.value} 
                  value={option.value}
                  disabled={option.disabled}
                  className="rounded-lg cursor-pointer hover:bg-accent/50"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : field.type === 'checkbox' ? (
          <div className="flex items-center space-x-2 space-x-reverse">
            <Checkbox
              id={field.id}
              checked={currentValue as boolean || false}
              onCheckedChange={(checked) => updateFormData(field.name, checked)}
              disabled={isLoading || field.disabled}
              aria-invalid={fieldError && isFieldTouched}
              aria-describedby={fieldError ? `${field.id}-error` : undefined}
            />
            <Label htmlFor={field.id} className="text-sm cursor-pointer">
              {field.placeholder}
            </Label>
          </div>
        ) : field.type === 'radio' && field.options ? (
          // التحقق من نوع الحقل لتطبيق التصميم المناسب
          field.name === 'product_color' ? (
            <ColorSelector
              colors={product?.colors || []}
              selectedValue={currentValue as string || ''}
              onSelect={(value) => updateFormData(field.name, value)}
              productFormRenderer={productFormRenderer}
            />
          ) : field.name === 'product_size' ? (
            <SizeSelector
              sizes={selectedColor?.sizes || []}
              selectedValue={currentValue as string || ''}
              onSelect={(value) => updateFormData(field.name, value)}
              productFormRenderer={productFormRenderer}
            />
          ) : field.name.toLowerCase().includes('delivery') || 
            field.name.toLowerCase().includes('توصيل') ||
            field.label.toLowerCase().includes('delivery') ||
            field.label.toLowerCase().includes('توصيل') ? (
            // تصميم خاص للتوصيل
            <div className="grid grid-cols-1 gap-4">
              {field.options.map((option) => {
                const isSelected = currentValue === option.value;
                const isHome = option.value === 'home' || option.label.toLowerCase().includes('منزل') || option.label.toLowerCase().includes('home');
                const isDesk = option.value === 'desk' || option.value === 'office' || option.label.toLowerCase().includes('مكتب') || option.label.toLowerCase().includes('office');
                
                return (
                  <div 
                    key={option.value}
                    className={cn(
                      "flex items-center p-4 border rounded-lg cursor-pointer transition-all duration-200",
                      isSelected 
                        ? 'border-primary bg-primary/10 shadow-sm' 
                        : 'border-border hover:border-primary/50'
                    )}
                    onClick={() => !option.disabled && updateFormData(field.name, option.value)}
                  >
                    <div className="relative">
                      <input
                        type="radio"
                        name={field.name}
                        id={`${field.id}-${option.value}`}
                        value={option.value}
                        checked={isSelected}
                        onChange={() => updateFormData(field.name, option.value)}
                        disabled={isLoading || field.disabled || option.disabled}
                        className="opacity-0 absolute"
                      />
                      <div className={cn(
                        "w-5 h-5 rounded-full border mr-2 flex items-center justify-center transition-colors",
                        isSelected ? 'border-primary' : 'border-border'
                      )}>
                        {isSelected && <CheckIcon className="h-3 w-3 text-primary" />}
                      </div>
                    </div>
                    <label htmlFor={`${field.id}-${option.value}`} className="flex-1 cursor-pointer">
                      <div className="flex items-center">
                        {isHome && <HomeIcon className="ml-3 h-5 w-5 text-primary" />}
                        {isDesk && <BuildingOfficeIcon className="ml-3 h-5 w-5 text-primary" />}
                        {!isHome && !isDesk && <TruckIcon className="ml-3 h-5 w-5 text-primary" />}
                        <div>
                          <span className="font-medium block text-foreground">{option.label}</span>
                          {isHome && (
                            <span className="text-xs text-muted-foreground block mt-1">{productFormRenderer.homeDelivery()}</span>
                          )}
                          {isDesk && (
                            <span className="text-xs text-muted-foreground block mt-1">{productFormRenderer.officeDelivery()}</span>
                          )}
                        </div>
                      </div>
                    </label>
                  </div>
                );
              })}
            </div>
          ) : (
            // التصميم العادي للراديو buttons الأخرى
            <RadioGroup
              value={currentValue as string || ''}
              onValueChange={(value) => updateFormData(field.name, value)}
              disabled={isLoading || field.disabled}
              className="space-y-2"
            >
              {field.options.map((option) => (
                <div key={option.value} className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem 
                    value={option.value} 
                    id={`${field.id}-${option.value}`}
                    disabled={option.disabled}
                  />
                  <Label htmlFor={`${field.id}-${option.value}`} className="text-sm cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )
        ) : (
          <Input
            id={field.id}
            name={field.name}
            type={field.type}
            value={currentValue as string || ''}
            onChange={(e) => {
              const value = field.type === 'number' ? Number(e.target.value) : e.target.value;
              updateFormData(field.name, value);
            }}
            placeholder={field.placeholder}
            disabled={isLoading || field.disabled}
            className={baseInputClass}
            aria-invalid={fieldError && isFieldTouched}
            aria-describedby={fieldError ? `${field.id}-error` : undefined}
          />
        )}
        
        <AnimatePresence>
          {fieldError && isFieldTouched && (
            <motion.div 
              variants={errorVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              id={`${field.id}-error`}
              role="alert"
            >
              <Alert variant="destructive" className="py-2">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <AlertDescription className="text-sm">{translateDynamicText(fieldError)}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }, [formData, updateFormData, isLoading, getFieldIcon, errors, touched, translateDynamicText, product, selectedColor, productFormRenderer]);

  // تحديد نوع عرض الحقل
  const renderField = useCallback((field: FormField) => {
    if (!isFieldVisible(field)) return null;

    // حقل الولاية
    if (provinceField && field.id === provinceField.id) {
      return renderProvinceField(field);
    }
    
    // حقل البلدية
    if (municipalityField && field.id === municipalityField.id) {
      return renderMunicipalityField(field);
    }
    
    // الحقول العادية
    return renderRegularField(field);
  }, [isFieldVisible, provinceField, municipalityField, renderProvinceField, renderMunicipalityField, renderRegularField]);

  // معالج إرسال النموذج
  const handleFormSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // فحص حالة تحميل الأسعار قبل السماح بالإرسال
    if (isLoadingDeliveryFee || isCalculatingDelivery || isLoadingPrices) {
      return; // منع الإرسال أثناء تحميل الأسعار
    }
    
    // validate before submit
    const { isValid, errors: validationErrors } = validateForm();
    
    if (!isValid) {
      setErrors(validationErrors);
      // mark all fields as touched to show errors
      const touchedFields: Record<string, boolean> = {};
      fields.forEach(field => {
        touchedFields[field.name] = true;
      });
      setTouched(touchedFields);
      return;
    }
    
    try {
      // 🚨 CONSOLE LOG: تتبع بيانات النموذج قبل الإرسال
      console.log('🎯 ProductFormRenderer - بيانات النموذج قبل الإرسال:', {
        formData,
        selectedColor,
        selectedSize,
        formFields: fields.map(f => ({ name: f.name, value: formData[f.name] })),
        timestamp: new Date().toISOString()
      });
      
      // 🚨 CONSOLE LOG: معلومات المنتج والمخزون
      if (product) {
        console.log('📦 ProductFormRenderer - معلومات المنتج والمخزون:', {
          productId: product.id || 'غير محدد',
          hasVariants: product.has_variants,
          selectedColorId: selectedColor?.id,
          selectedColorQuantity: selectedColor?.quantity,
          selectedSizeId: selectedSize?.id,
          selectedSizeQuantity: selectedSize?.quantity,
          generalProductStock: (product as any)?.stock_quantity,
          timestamp: new Date().toISOString()
        });
      }
      
      await submitHandler?.(formData);
    } catch (error) {
      // 🚨 CONSOLE LOG: خطأ في تقديم النموذج
      console.error('❌ ProductFormRenderer - خطأ في تقديم النموذج:', {
        error,
        formData,
        timestamp: new Date().toISOString()
      });
    }
  }, [submitHandler, formData, validateForm, fields, isLoadingDeliveryFee, isCalculatingDelivery, isLoadingPrices, product, selectedColor, selectedSize]);

  // حساب ما إذا كان الزر متاحًا للنقر
  const isButtonDisabled = useMemo(() => {
    return isLoading || isLoadingDeliveryFee || isCalculatingDelivery || isLoadingPrices;
  }, [isLoading, isLoadingDeliveryFee, isCalculatingDelivery, isLoadingPrices]);

  // النص المناسب للزر بناءً على حالة التحميل
  const getButtonText = useCallback(() => {
    if (isLoadingDeliveryFee || isCalculatingDelivery) {
      return productFormRenderer.calculatingDelivery();
    }
    if (isLoadingPrices) {
      return productFormRenderer.loadingPrices();
    }
    if (isLoading) {
      return productFormRenderer.processing();
    }
    return submitButtonText;
  }, [isLoadingDeliveryFee, isCalculatingDelivery, isLoadingPrices, isLoading, submitButtonText, productFormRenderer]);

  if (!fields || fields.length === 0) {
    return null;
  }

  // حساب عدد الأخطاء
  const errorCount = Object.keys(errors).length;
  const isFormValid = errorCount === 0;

  return (
    <motion.div 
      className={cn("w-full", className)}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="space-y-6">
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
              <DocumentTextIcon className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              {formTitle}
            </h2>
          </div>
          {formDescription && (
            <p className="text-muted-foreground mb-6 text-sm leading-relaxed">{formDescription}</p>
          )}
          
                      <form onSubmit={handleFormSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
              <AnimatePresence mode="popLayout">
                {fields.map((field) => (
                  <motion.div 
                    key={field.id} 
                    className={cn(
                      field.type === 'textarea' ? 'md:col-span-2' : '',
                      (field.type === 'radio' && (
                        field.name.toLowerCase().includes('delivery') || 
                        field.name.toLowerCase().includes('توصيل') ||
                        field.label.toLowerCase().includes('delivery') ||
                        field.label.toLowerCase().includes('توصيل') ||
                        field.name === 'product_color' ||
                        field.name === 'product_size'
                      )) ? 'md:col-span-2' : ''
                    )}
                    layout
                  >
                    {renderField(field)}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {submitHandler && (
              <div className="mt-8">
                <motion.div
                  whileHover={!isButtonDisabled ? { scale: 1.02 } : {}}
                  whileTap={!isButtonDisabled ? { scale: 0.98 } : {}}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Button
                    type="submit"
                    disabled={isButtonDisabled}
                    className={cn(
                      "w-full h-14 text-lg font-semibold rounded-2xl transition-all duration-300",
                      "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary",
                      "shadow-lg hover:shadow-xl hover:shadow-primary/25",
                      "border-0 text-white",
                      "disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100",
                      "flex items-center justify-center gap-3"
                    )}
                  >
                    {isButtonDisabled ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>{getButtonText()}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="w-5 h-5" />
                        <span>{getButtonText()}</span>
                      </>
                    )}
                  </Button>
                </motion.div>
              </div>
            )}
          </form>
        </div>
      </div>
    </motion.div>
  );
});

ProductFormRenderer.displayName = 'ProductFormRenderer';

export default ProductFormRenderer;
