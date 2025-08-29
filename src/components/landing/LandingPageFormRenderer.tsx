import React, { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DocumentTextIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

// استيراد المكونات الفرعية
import FormErrorBoundary from '@/components/product/form/FormErrorBoundary';
import FormFieldComponent from '@/components/product/form/FormField';
import LocationFields from '@/components/product/form/LocationFields';
import ColorSelector from '@/components/product/form/ColorSelector';
import SizeSelector from '@/components/product/form/SizeSelector';
import Shimmer from '@/components/ui/Shimmer';
import { useFormFields } from './hooks/useFormFields';
import { useSupabase } from '@/context/SupabaseContext';

// CSS محسن للتصميم المثالي الخفيف
const premiumLightStyles = `
  .premium-form-container {
    position: relative;
    border-radius: 1.5rem;
    overflow: hidden;
    background: hsl(var(--primary)/0.1);
    padding: 2px;
  }
  
  .premium-form-border {
    position: absolute;
    inset: 0;
    border-radius: 1.5rem;
    background: conic-gradient(from 0deg, 
      hsl(var(--primary)) 0deg,
      hsl(var(--primary)/0.8) 60deg,
      hsl(var(--primary)/0.3) 120deg,
      hsl(var(--primary)/0.1) 180deg,
      hsl(var(--primary)/0.3) 240deg,
      hsl(var(--primary)/0.8) 300deg,
      hsl(var(--primary)) 360deg
    );
    animation: rotateBorder 6s linear infinite;
    will-change: transform;
    transform: translateZ(0);
    pointer-events: none;
    z-index: 1;
  }
  
  .premium-form-content {
    position: relative;
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border)/0.3);
    border-radius: calc(1.5rem - 2px);
    backdrop-filter: blur(10px);
    box-shadow: 
      0 4px 24px -8px hsl(var(--primary)/0.15),
      inset 0 1px 0 hsl(var(--background)/0.5);
    z-index: 2;
    margin: 2px;
  }
  
  @keyframes rotateBorder {
    0% { 
      transform: rotate(0deg) translateZ(0);
    }
    100% { 
      transform: rotate(360deg) translateZ(0);
    }
  }
  
  .elegant-header {
    position: relative;
    padding: 1.5rem 0;
    border-bottom: 1px solid hsl(var(--border)/0.3);
  }
  
  .elegant-header::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 60px;
    height: 2px;
    background: linear-gradient(90deg, transparent, hsl(var(--primary)), transparent);
  }
  
  .premium-submit-button {
    position: relative;
    width: 100%;
    padding: 1rem 2rem;
    background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.8));
    color: hsl(var(--primary-foreground));
    border: none;
    border-radius: 1rem;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    box-shadow: 
      0 4px 20px -8px hsl(var(--primary)/0.4),
      0 2px 8px -4px hsl(var(--primary)/0.2);
  }
  
  .premium-submit-button:hover {
    transform: translateY(-2px);
    box-shadow: 
      0 8px 30px -12px hsl(var(--primary)/0.5),
      0 4px 12px -6px hsl(var(--primary)/0.3);
  }
  
  .premium-submit-button:active {
    transform: translateY(0);
  }
  
  .premium-submit-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
  
  .loading-spinner {
    width: 1.25rem;
    height: 1.25rem;
    border: 2px solid transparent;
    border-top: 2px solid currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .submit-icon {
    width: 1.25rem;
    height: 1.25rem;
    transition: transform 0.3s ease;
  }
  
  .premium-submit-button:hover .submit-icon {
    transform: translateX(4px);
  }
  
  .performance-optimized {
    contain: content;
    will-change: transform, opacity;
    transform: translateZ(0);
  }
  
  .priority-bg {
    background: linear-gradient(90deg, hsl(var(--muted)), hsl(var(--muted)/0.8), hsl(var(--muted)));
    background-size: 200% 100%;
    animation: shimmer 2s infinite;
  }
  
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  
  /* أنماط وضع المعاينة */
  .preview-mode {
    pointer-events: none !important;
    user-select: none !important;
  }
  
  .preview-mode input,
  .preview-mode textarea,
  .preview-mode select,
  .preview-mode button,
  .preview-mode [role="button"],
  .preview-mode [role="combobox"] {
    pointer-events: none !important;
    cursor: default !important;
    opacity: 0.8;
  }
  
  .preview-mode button[type="submit"] {
    opacity: 0.6;
    cursor: not-allowed !important;
  }
`;

// متغيرات الحركة المحسنة
const containerVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
      staggerChildren: 0.1
    }
  }
};

const fieldVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut"
    }
  }
};

// أنواع البيانات
interface FormField {
  id: string;
  name: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  linkedFields?: {
    provinceField?: string;
    municipalityField?: string;
  };
}

interface FormData {
  [key: string]: any;
}

interface LandingPageFormRendererProps {
  // بيانات النموذج
  formData?: {
    fields: FormField[];
    name?: string;
    description?: string;
    submitButtonText?: string;
    [key: string]: unknown;
  };
  
  // معالجات الأحداث
  onFormSubmit?: (data: FormData) => void | Promise<void>;
  onFormChange?: (data: FormData) => void;
  
  // خصائص عامة
  className?: string;
  showValidation?: boolean;
  
  // البدائل القديمة للتوافق
  fields?: FormField[];
  onSubmit?: (data: FormData) => void | Promise<void>;
  initialData?: FormData;
  
  // بيانات إضافية
  title?: string;
  subtitle?: string;
  submitButtonText?: string;
  
  // معرف النموذج لجلب الحقول من قاعدة البيانات
  formId?: string;
  
  // بيانات المنتج وملخص الشراء
  productId?: string;
  productDetails?: {
    id?: string;
    name: string;
    price: number;
    image?: string;
    thumbnail_image?: string;
    quantity?: number;
    compare_at_price?: number;
    has_fast_shipping?: boolean;
    has_money_back?: boolean;
    has_quality_guarantee?: boolean;
  };
}

/**
 * مكون معالج النماذج المحسن لصفحة الهبوط
 * 
 * التحسينات المطبقة:
 * - تبسيط CSS animations وإزالة التأثيرات المعقدة
 * - تقليل استخدام framer-motion للضرورة فقط
 * - تحسين React performance مع memo وuseMemo محكم
 * - تحسين أداء السكرول مع passive listeners
 * - contain CSS properties لتجنب layout thrashing
 */
const LandingPageFormRenderer = memo<LandingPageFormRendererProps>(({
  // بيانات النموذج
  formData: externalFormData,
  onFormSubmit,
  onFormChange,
  className,
  showValidation = true,
  
  // البدائل القديمة
  fields: directFields,
  onSubmit,
  initialData = {},
  
  // بيانات إضافية
  title,
  subtitle,
  submitButtonText,
  
  // معرف النموذج لجلب الحقول من قاعدة البيانات
  formId,
  
  // بيانات المنتج وملخص الشراء
  productId,
  productDetails
}) => {

  // جلب الحقول من قاعدة البيانات باستخدام formId
  const { formFields: dbFormFields, isFieldsLoading, fetchFormFields } = useFormFields(formId);
  
  const [formData, setFormData] = useState<FormData>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // حالة جلب بيانات المنتج
  const [fetchedProductDetails, setFetchedProductDetails] = useState<any>(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const [selectedColor, setSelectedColor] = useState<any>(null);
  const [selectedSize, setSelectedSize] = useState<any>(null);
  const { supabase } = useSupabase();
  
  // جلب بيانات المنتج عند تغيير productId
  useEffect(() => {
    const fetchProductDetails = async () => {
      if (!productId) {
        setFetchedProductDetails(null);
        setSelectedColor(null);
        setSelectedSize(null);
        return;
      }
      
      setIsLoadingProduct(true);
      
      try {
        const { data, error } = await supabase
          .from('products')
          .select(`
            id, name, description, price, compare_at_price, thumbnail_image,
            has_fast_shipping, has_money_back, has_quality_guarantee,
            fast_shipping_text, money_back_text, quality_guarantee_text,
            has_variants
          `)
          .eq('id', productId)
          .single();
          
        if (error) throw error;
        
        if (data) {
          // جلب الألوان والمقاسات إذا كان المنتج يدعم المتغيرات
          if (data.has_variants) {

            const { data: colorsData, error: colorsError } = await supabase
              .from('product_colors')
              .select(`
                id, name, color_code, price, is_default, image_url,
                has_sizes, quantity,
                sizes:product_sizes(id, size_name, price, quantity)
              `)
              .eq('product_id', productId)
              .order('is_default', { ascending: false });

            if (colorsError) {

              // محاولة جلب الألوان بدون العلاقات
              const { data: simpleColorsData, error: simpleColorsError } = await supabase
                .from('product_colors')
                .select('id, name, color_code, price, is_default, image_url, has_sizes, quantity')
                .eq('product_id', productId)
                .order('is_default', { ascending: false });

              if (!simpleColorsError && simpleColorsData) {
                // جلب المقاسات لكل لون منفصلاً
                for (const color of simpleColorsData) {
                  if (color.has_sizes) {
                    const { data: sizesData } = await supabase
                      .from('product_sizes')
                      .select('id, size_name, price, quantity')
                      .eq('color_id', color.id);
                    (color as any).sizes = sizesData || [];
                  }
                }
                (data as any).colors = simpleColorsData;
              }
            } else if (colorsData) {
              (data as any).colors = colorsData;
              
            }

            // تحديد اللون الافتراضي (إذا تم جلب الألوان بنجاح)
            const finalColors = data.colors;
            if (finalColors && finalColors.length > 0) {
              const defaultColor = finalColors.find(c => c.is_default) || finalColors[0];
              if (defaultColor) {
                setSelectedColor(defaultColor);
                setFormData(prev => ({
                  ...prev,
                  product_color: defaultColor.id
                }));
                
                // تحديد المقاس الافتراضي إذا كان متاحاً
                if (defaultColor.sizes && defaultColor.sizes.length > 0) {
                  setSelectedSize(defaultColor.sizes[0]);
                  setFormData(prev => ({
                    ...prev,
                    product_size: defaultColor.sizes[0].id
                  }));
                }
              }
            }
          }
          
          setFetchedProductDetails(data);
        }
      } catch (error) {

      } finally {
        setIsLoadingProduct(false);
      }
    };
    
    fetchProductDetails();
  }, [productId, supabase]);
  
  // تحسين معالجة بيانات النموذج مع dependencies محكمة
  const processedFormData = useMemo(() => {
    const baseFields = externalFormData?.fields || directFields || [];
    const dynamicFields: FormField[] = [];

    // إضافة حقل الألوان ديناميكياً إذا كان المنتج يدعم المتغيرات
    if (fetchedProductDetails?.has_variants && fetchedProductDetails?.colors?.length > 0) {

      dynamicFields.push({
        id: 'product_color',
        name: 'product_color',
        label: 'اختر اللون',
        type: 'color_selector',
        required: true
      });
    }

    // إضافة حقل المقاسات ديناميكياً إذا كان اللون المحدد له مقاسات
    if (selectedColor?.sizes?.length > 0) {

      dynamicFields.push({
        id: 'product_size',
        name: 'product_size',
        label: 'اختر المقاس',
        type: 'size_selector',
        required: true
      });
    }

    return {
      fields: [...dynamicFields, ...baseFields],
      formName: externalFormData?.name || title || 'نموذج الطلب',
      formDescription: externalFormData?.description || subtitle || 'املأ النموذج أدناه لإتمام طلبك',
      submitButtonText: externalFormData?.submitButtonText || submitButtonText || 'إرسال الطلب'
    };
  }, [externalFormData, directFields, title, subtitle, submitButtonText, fetchedProductDetails, selectedColor]);

  // تحديث حقل في النموذج
  const updateField = useCallback((fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    
    // إزالة خطأ الحقل عند التحديث
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
    
    // استدعاء callback التغيير
    onFormChange?.({ ...formData, [fieldName]: value });
  }, [errors, onFormChange, formData]);

  // تحديد أن الحقل تم لمسه
  const touchField = useCallback((fieldName: string) => {
    setTouched(prev => ({
      ...prev,
      [fieldName]: true
    }));
  }, []);

  // معالج اختيار الألوان
  const handleColorSelect = useCallback((colorId: string) => {
    const color = fetchedProductDetails?.colors?.find((c: any) => c.id === colorId);
    if (color) {
      setSelectedColor(color);
      updateField('product_color', colorId);
      
      // إعادة تعيين المقاس عند تغيير اللون
      if (color.sizes && color.sizes.length > 0) {
        setSelectedSize(color.sizes[0]);
        updateField('product_size', color.sizes[0].id);
      } else {
        setSelectedSize(null);
        updateField('product_size', '');
      }
    }
  }, [fetchedProductDetails?.colors, updateField]);

  // معالج اختيار المقاسات
  const handleSizeSelect = useCallback((sizeId: string) => {
    const size = selectedColor?.sizes?.find((s: any) => s.id === sizeId);
    if (size) {
      setSelectedSize(size);
      updateField('product_size', sizeId);
    }
  }, [selectedColor?.sizes, updateField]);

  // الحصول على قيمة الحقل
  const getFieldValue = useCallback((fieldName: string) => {
    return formData[fieldName] || '';
  }, [formData]);

  // التحقق من صحة النموذج
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};
    
    processedFormData.fields.forEach(field => {
      if (field.required) {
        const value = getFieldValue(field.name);
        if (!value || value.toString().trim() === '') {
          newErrors[field.name] = `حقل "${field.label}" مطلوب`;
        }
      }
      
      // التحقق من البريد الإلكتروني
      if (field.type === 'email') {
        const value = getFieldValue(field.name);
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          newErrors[field.name] = 'يرجى إدخال بريد إلكتروني صحيح';
        }
      }
      
      // التحقق من رقم الهاتف
      if (field.type === 'tel') {
        const value = getFieldValue(field.name);
        if (value && !/^[\+]?[0-9\s\-\(\)]{8,}$/.test(value)) {
          newErrors[field.name] = 'يرجى إدخال رقم هاتف صحيح';
        }
      }
    });

    // التحقق من اختيار اللون إذا كان المنتج يدعم المتغيرات
    if (fetchedProductDetails?.has_variants && fetchedProductDetails?.colors?.length > 0 && !selectedColor) {
      newErrors['product_color'] = 'يرجى اختيار لون';
    }

    // التحقق من اختيار المقاس إذا كان اللون المحدد له مقاسات
    if (selectedColor?.sizes?.length > 0 && !selectedSize) {
      newErrors['product_size'] = 'يرجى اختيار مقاس';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [processedFormData.fields, getFieldValue, fetchedProductDetails, selectedColor, selectedSize]);

  // معالجة إرسال النموذج
  const handleFormSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      const submitHandler = onFormSubmit || onSubmit;
      await submitHandler?.(formData);
    } catch (error) {
    } finally {
      setIsSubmitting(false);
    }
  }, [validateForm, onFormSubmit, onSubmit, formData]);

  // تحسين ترتيب الحقول
  const orderedFields = useMemo(() => {
    const { fields } = processedFormData;
    
    const nameFields = fields.filter(field => 
      /name|اسم/i.test(field.name) || /name|اسم/i.test(field.label)
    );
    const phoneFields = fields.filter(field => 
      /phone|هاتف|رقم/i.test(field.name) || /phone|هاتف|رقم/i.test(field.label)
    );
    const emailFields = fields.filter(field => 
      field.type === 'email'
    );
    const otherFields = fields.filter(field => 
      ![...nameFields, ...phoneFields, ...emailFields].includes(field)
    );
    
    return [
      ...nameFields,
      ...emailFields,
      ...phoneFields,
      ...otherFields
    ];
  }, [processedFormData.fields]);

  // تحديد حقول الموقع (ولاية/بلدية) لاستخدام نفس منطق المنتج
  const locationFields = useMemo(() => {
    const fields = processedFormData.fields || [];
    const provinceField = fields.find((f: any) => f.type === 'province');
    const municipalityField = fields.find((f: any) => f.type === 'municipality');
    return { provinceField, municipalityField } as { provinceField?: any; municipalityField?: any };
  }, [processedFormData.fields]);

  // تحسين دالة تحديد عرض الحقل
  const getFieldColSpan = useCallback((field: FormField) => {
    const isNameField = /name|اسم/i.test(field.name) || /name|اسم/i.test(field.label);
    const isPhoneField = /phone|هاتف|رقم/i.test(field.name) || /phone|هاتف|رقم/i.test(field.label);
    const isEmailField = field.type === 'email';
    const isFullWidthField = field.type === 'textarea';
    
    if (isFullWidthField) {
      return 'col-span-2';
    } else if (isNameField || isPhoneField || isEmailField) {
      return 'col-span-1';
    } else {
      return 'col-span-2';
    }
  }, []);

  // عرض الحقل - نفس منطق المنتج باستخدام FormFieldComponent و LocationFields
  const renderField = useCallback((field: FormField) => {

    // اختيار الألوان
    if (field.type === 'color_selector' && fetchedProductDetails?.colors) {

      return (
        <ColorSelector
          colors={fetchedProductDetails.colors}
          selectedValue={getFieldValue('product_color') as string || ''}
          onSelect={handleColorSelect}
          disabled={isSubmitting}
          errors={errors}
          touched={touched}
        />
      );
    }

    // اختيار المقاسات
    if (field.type === 'size_selector' && selectedColor?.sizes) {

      return (
        <SizeSelector
          sizes={selectedColor.sizes}
          selectedValue={getFieldValue('product_size') as string || ''}
          onSelect={handleSizeSelect}
          disabled={isSubmitting}
          errors={errors}
          touched={touched}
        />
      );
    }

    // حقول الموقع معاً
    if (locationFields.provinceField && field.id === (locationFields.provinceField as any).id) {
      return (
        <LocationFields
          provinceField={locationFields.provinceField as any}
          municipalityField={locationFields.municipalityField as any}
          formData={formData}
          onFieldChange={updateField}
          onFieldTouch={touchField}
          disabled={isSubmitting}
          errors={errors}
          touched={touched}
        />
      );
    }

    // تجنب عرض حقل البلدية منفرداً
    if (locationFields.municipalityField && field.id === (locationFields.municipalityField as any).id) {
      return null;
    }

    // الحقول العادية
    return (
      <FormFieldComponent
        field={field as any}
        value={getFieldValue(field.name)}
        onFieldChange={updateField}
        onFieldTouch={touchField}
        disabled={isSubmitting}
        errors={errors}
        touched={touched}
      />
    );
  }, [
    fetchedProductDetails?.colors, 
    selectedColor?.sizes, 
    handleColorSelect, 
    handleSizeSelect,
    locationFields.provinceField, 
    locationFields.municipalityField, 
    formData, 
    updateField, 
    touchField, 
    isSubmitting, 
    errors, 
    touched, 
    getFieldValue
  ]);

  // مكون ملخص الشراء مع بيانات المنتج الفعلية
  const renderPurchaseSummary = () => {
    // استخدام البيانات المجلبة من قاعدة البيانات أو البيانات الممررة كخاصية
    const currentProductDetails = fetchedProductDetails || productDetails;
    
    if (!productId || !currentProductDetails) return null;

    // حساب السعر الصحيح بناءً على اللون والمقاس المحددين
    let currentPrice = currentProductDetails.price;
    let currentComparePrice = currentProductDetails.compare_at_price;
    let currentImage = currentProductDetails.thumbnail_image;
    let colorName = '';
    let sizeName = '';

    // إذا كان هناك لون محدد، استخدم سعره وصورته
    if (selectedColor) {
      if (selectedColor.price) currentPrice = selectedColor.price;
      if (selectedColor.image_url) currentImage = selectedColor.image_url;
      colorName = selectedColor.name;
    }

    // إذا كان هناك مقاس محدد، استخدم سعره
    if (selectedSize) {
      if (selectedSize.price) currentPrice = selectedSize.price;
      sizeName = selectedSize.name;
    }

    return (
      <div className="col-span-2">
        <Card className="border border-border/50 bg-muted/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <DocumentTextIcon className="w-5 h-5 text-primary" />
              ملخص الطلب
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* تفاصيل المنتج */}
            <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                {currentImage ? (
                  <img 
                    src={currentImage} 
                    alt={currentProductDetails.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <DocumentTextIcon className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-medium">{currentProductDetails.name}</h4>
                {(colorName || sizeName) && (
                  <div className="text-xs text-muted-foreground">
                    {colorName && <span>اللون: {colorName}</span>}
                    {colorName && sizeName && <span> • </span>}
                    {sizeName && <span>المقاس: {sizeName}</span>}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">الكمية: {currentProductDetails.quantity || 1}</p>
                {currentComparePrice && currentComparePrice > currentPrice && (
                  <p className="text-xs text-muted-foreground line-through">
                    {currentComparePrice.toLocaleString()} دج
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">{currentPrice.toLocaleString()} دج</p>
              </div>
            </div>

            {/* تفاصيل التوصيل */}
            <div className="space-y-2 p-3 bg-background rounded-lg border">
              <div className="flex items-center gap-2">
                <DocumentTextIcon className="w-4 h-4 text-primary" />
                <span className="font-medium">التوصيل</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>توصيل للمنزل</span>
                <span className="text-muted-foreground">500 دج</span>
              </div>
              {currentProductDetails.has_fast_shipping && (
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircleIcon className="w-3 h-3" />
                  <span>توصيل سريع</span>
                </div>
              )}
            </div>

            {/* مميزات المنتج */}
            {(currentProductDetails.has_money_back || currentProductDetails.has_quality_guarantee) && (
              <div className="space-y-2 p-3 bg-background rounded-lg border">
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-sm">ضمانات</span>
                </div>
                {currentProductDetails.has_money_back && (
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircleIcon className="w-3 h-3" />
                    <span>ضمان استرداد الأموال</span>
                  </div>
                )}
                {currentProductDetails.has_quality_guarantee && (
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircleIcon className="w-3 h-3" />
                    <span>ضمان الجودة</span>
                  </div>
                )}
              </div>
            )}

            {/* المجموع */}
            <div className="pt-3 border-t border-border/50">
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg">المجموع</span>
                <span className="font-bold text-xl text-primary">
                  {((currentPrice * (currentProductDetails.quantity || 1)) + 500).toLocaleString()} دج
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // إذا لم تكن هناك حقول، لا نعرض شيئاً

  if (!processedFormData.fields || processedFormData.fields.length === 0) {

    return (
      <div className="w-full p-8 text-center bg-muted/50 rounded-lg border-2 border-dashed border-muted-foreground/30">
        <div className="text-muted-foreground mb-4">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-semibold mb-2">لا توجد حقول للنموذج</h3>
          <p className="text-sm">يرجى إضافة حقول للنموذج في منشئ صفحة الهبوط</p>
        </div>
        <div className="text-xs text-muted-foreground">
          <p>المكون المستلم: {JSON.stringify({ fields: processedFormData.fields, fieldsLength: processedFormData.fields?.length })}</p>
        </div>
      </div>
    );
  }

  return (
    <FormErrorBoundary className={className}>
      {/* إضافة الـ CSS المحسن */}
      <style dangerouslySetInnerHTML={{ __html: premiumLightStyles }} />
      
      <motion.div 
        className={cn("w-full performance-optimized", className)}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="space-y-4">
          <Shimmer 
            isLoading={false}
            rounded="2xl"
            className="min-h-[400px]"
          >
            {/* حاوي النموذج مع إطار متحرك محسن */}
            <div className="premium-form-container">
              <div className="premium-form-border"></div>
              <div className="premium-form-content p-6 md:p-8">
              
                {/* رأس النموذج */}
                <div className="elegant-header text-center mb-6">
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                    {processedFormData.formName}
                  </h2>
                  {processedFormData.formDescription && (
                    <p className="text-muted-foreground text-base leading-relaxed">
                      {processedFormData.formDescription}
                    </p>
                  )}

                </div>
              
                <form onSubmit={handleFormSubmit} className="space-y-6" data-form="landing-page-form">
                  <motion.div 
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <AnimatePresence mode="popLayout">
                      {orderedFields.map((field) => (
                        <motion.div 
                          key={field.id} 
                          className={getFieldColSpan(field)}
                          variants={fieldVariants}
                          layout
                        >
                          {renderField(field)}
                        </motion.div>
                      ))}
                      
                      {/* ملخص الشراء */}
                      {renderPurchaseSummary()}
                    </AnimatePresence>
                  </motion.div>

                  {/* زر الإرسال */}
                  <div className="mt-8 pt-6 border-t border-border/50">
                    <motion.button
                      type="submit"
                      disabled={isSubmitting}
                      className="premium-submit-button"
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="loading-spinner"></div>
                          <span className="font-bold">جاري الإرسال...</span>
                        </>
                      ) : (
                        <>
                          <span className="font-bold">{processedFormData.submitButtonText}</span>
                          <svg 
                            className="submit-icon" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              strokeWidth={2.5} 
                              d="M13 7l5 5m0 0l-5 5m5-5H6" 
                            />
                          </svg>
                        </>
                      )}
                    </motion.button>
                  </div>
                </form>
              </div>
            </div>
          </Shimmer>
        </div>
      </motion.div>
    </FormErrorBoundary>
  );
});

LandingPageFormRenderer.displayName = 'LandingPageFormRenderer';

export default LandingPageFormRenderer;
