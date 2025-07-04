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
  CheckIcon
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
      sizes?: Array<{
        id: string;
        size_name: string;
        price?: number;
      }>;
    }>;
  };
  selectedColor?: {
    id: string;
    name: string;
    color_code?: string;
    image_url?: string;
    sizes?: Array<{
      id: string;
      size_name: string;
      price?: number;
    }>;
  };
  selectedSize?: {
    id: string;
    size_name: string;
    price?: number;
  };
  onColorSelect?: (color: any) => void;
  onSizeSelect?: (size: any) => void;
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
  onSizeSelect
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
          // تحقق من نوع التوصيل لتطبيق التصميم الخاص
          field.name.toLowerCase().includes('delivery') || 
          field.name.toLowerCase().includes('توصيل') ||
          field.label.toLowerCase().includes('delivery') ||
          field.label.toLowerCase().includes('توصيل') ||
          // إضافة حقول الألوان والمقاسات
          field.name === 'product_color' ||
          field.name === 'product_size' ? (
            <div 
              className="grid grid-cols-1 gap-4"
              data-color-selector={field.name === 'product_color' ? 'true' : undefined}
              data-size-selector={field.name === 'product_size' ? 'true' : undefined}
            >
              {field.options.map((option) => {
                const isSelected = currentValue === option.value;
                const isHome = option.value === 'home' || option.label.toLowerCase().includes('منزل') || option.label.toLowerCase().includes('home');
                const isDesk = option.value === 'desk' || option.value === 'office' || option.label.toLowerCase().includes('مكتب') || option.label.toLowerCase().includes('office');
                const isColor = field.name === 'product_color';
                const isSize = field.name === 'product_size';
                
                // العثور على بيانات اللون للصورة
                const colorData = isColor ? product?.colors?.find(c => c.id === option.value) : null;
                
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
                        {/* أيقونات ومحتوى خاص للألوان */}
                        {isColor && (
                          <>
                            {colorData?.image_url ? (
                              <img 
                                src={colorData.image_url} 
                                alt={option.label}
                                className="ml-3 h-12 w-12 rounded-lg object-cover border border-border shadow-sm"
                              />
                            ) : colorData?.color_code ? (
                              <div 
                                className="ml-3 h-8 w-8 rounded-full border border-border shadow-sm" 
                                style={{ backgroundColor: colorData.color_code }}
                              />
                            ) : (
                              <div className="ml-3 h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 border border-primary/30 flex items-center justify-center">
                                <span className="text-xs font-bold text-primary">🎨</span>
                              </div>
                            )}
                            <div>
                              <span className="font-medium block text-foreground">{option.label}</span>
                              <span className="text-xs text-muted-foreground block mt-1">{productFormRenderer.availableColor()}</span>
                            </div>
                          </>
                        )}
                        
                        {/* أيقونات ومحتوى خاص للمقاسات */}
                        {isSize && (
                          <>
                            <div className="ml-3 h-8 w-8 rounded-lg bg-gradient-to-br from-secondary/20 to-secondary/40 border border-secondary/30 flex items-center justify-center">
                              <span className="text-xs font-bold text-secondary">{option.label.charAt(0).toUpperCase()}</span>
                            </div>
                            <div>
                                              <span className="font-medium block text-foreground">{productFormRenderer.sizeLabel()} {option.label}</span>
                <span className="text-xs text-muted-foreground block mt-1">{productFormRenderer.availableSize()}</span>
                            </div>
                          </>
                        )}
                        
                        {/* المحتوى الأصلي للتوصيل */}
                        {!isColor && !isSize && (
                          <>
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
                          </>
                        )}
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
  }, [formData, updateFormData, isLoading, getFieldIcon, errors, touched, translateDynamicText]);

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
      await submitHandler?.(formData);
    } catch (error) {
    }
  }, [submitHandler, formData, validateForm, fields]);

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
        <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
          <h2 className="text-xl font-semibold mb-6 text-foreground border-b border-border pb-3">
            {formTitle}
          </h2>
          {formDescription && (
            <p className="text-muted-foreground mb-6">{formDescription}</p>
          )}
          
          <form onSubmit={handleFormSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
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
                        field.label.toLowerCase().includes('توصيل')
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
                  className="relative"
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <input
                    type="radio"
                    id="submit-button"
                    name="submit-action"
                    value="submit"
                    checked={true}
                    onChange={() => {}}
                    className="sr-only peer"
                  />
                  <label
                    htmlFor="submit-button"
                    className={cn(
                      "group relative w-full flex items-center justify-between p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300",
                      "bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50",
                      "border-gray-200 dark:border-gray-700",
                      "hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10",
                      "peer-checked:border-primary peer-checked:shadow-xl peer-checked:shadow-primary/20",
                      isLoading || (showValidation && !isFormValid) 
                        ? "opacity-70 cursor-not-allowed" 
                        : "hover:scale-[1.02] active:scale-[0.98]"
                    )}
                    onClick={isLoading || (showValidation && !isFormValid) ? undefined : (e) => {
                      e.preventDefault();
                      const form = (e.target as HTMLElement).closest('form');
                      if (form) {
                        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                        form.dispatchEvent(submitEvent);
                      }
                    }}
                  >
                    <div className="flex items-center space-x-4 space-x-reverse flex-1">
                      {/* دائرة التحديد */}
                      <div className={cn(
                        "w-6 h-6 rounded-full border-2 transition-all duration-300 flex items-center justify-center",
                        "border-primary bg-primary"
                      )}>
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                      
                      {/* أيقونة الإجراء */}
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300",
                        "bg-gradient-to-br from-primary to-primary-darker shadow-lg",
                        "group-hover:shadow-xl group-hover:scale-110"
                      )}>
                        {isLoading ? (
                          <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <CheckCircleIcon className="w-6 h-6 text-white" />
                        )}
                      </div>
                      
                      {/* النصوص */}
                      <div className="flex-1 text-right">
                        <div className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors duration-300">
                          {isLoading ? productFormRenderer.processing() : submitButtonText}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {isLoading 
                            ? productFormRenderer.pleaseWait() 
                            : showValidation && !isFormValid 
                              ? translateDynamicText(productFormRenderer.fixErrorsFirst())
                              : translateDynamicText(productFormRenderer.clickToSubmit())
                          }
                        </div>
                      </div>
                    </div>
                    
                    {/* مؤشر التحديد */}
                    <motion.div
                      className="absolute left-4 top-1/2 transform -translate-y-1/2"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                      <div className="w-2 h-2 bg-primary rounded-full" />
                    </motion.div>
                  </label>
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
