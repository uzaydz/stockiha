import React, { useState, useMemo, useCallback, memo } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DocumentTextIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

// استيراد الأنواع والواجهات
import { 
  FormField as FormFieldType, 
  ProductFormData, 
  ProductColor, 
  ProductSize, 
  ProductVariant,
  LoadingStates,
  ValidationResult
} from '@/types/productForm';

// استيراد الhooks المخصصة
import { useFormData } from '@/hooks/useFormData';
import { useFormValidation } from '@/hooks/useFormValidation';
import { useProductPurchaseTranslation } from '@/hooks/useProductPurchaseTranslation';
import { useTranslation } from 'react-i18next';

// استيراد المكونات الفرعية
import FormErrorBoundary from './form/FormErrorBoundary';
import ColorSelector from './form/ColorSelector';
import SizeSelector from './form/SizeSelector';
import LocationFields from './form/LocationFields';
import FormFieldComponent from './form/FormField';
import Shimmer from '@/components/ui/Shimmer';

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
  
  .premium-icon-wrapper {
    width: 3.5rem;
    height: 3.5rem;
    border-radius: 1rem;
    background: linear-gradient(135deg, hsl(var(--primary)/0.1), hsl(var(--primary)/0.05));
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
  }
  
  .premium-icon-wrapper::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, hsl(var(--primary)/0.1), transparent);
    transition: left 0.6s ease;
  }
  
  .premium-icon-wrapper:hover::before {
    left: 100%;
  }
  
  .form-field-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1rem;
    margin-top: 1.5rem;
  }
  
  .form-field-grid.two-columns {
    grid-template-columns: 1fr 1fr;
  }
  
  @media (max-width: 768px) {
    .form-field-grid,
    .form-field-grid.two-columns {
      grid-template-columns: 1fr;
      gap: 0.75rem;
    }
  }
  
  .premium-summary-card {
    background: linear-gradient(135deg, hsl(var(--primary)/0.03), hsl(var(--primary)/0.08));
    border: 1px solid hsl(var(--primary)/0.15);
    border-radius: 1rem;
    padding: 1.5rem;
    position: relative;
    overflow: hidden;
    }
  
  .premium-summary-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary)/0.7), hsl(var(--primary)));
    }
  
  .price-row {
    display: flex;
    align-items: center;
    justify-content: between;
    padding: 0.75rem 0;
    border-bottom: 1px solid hsl(var(--border)/0.3);
    transition: all 0.2s ease;
  }
  
  .price-row:hover {
    background: hsl(var(--muted)/0.3);
    border-radius: 0.5rem;
    margin: 0 -0.5rem;
    padding: 0.75rem 0.5rem;
  }
  
  .price-row:last-child {
    border-bottom: none;
    }
  
    .premium-submit-button {
    position: relative;
    background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.9) 50%, hsl(var(--primary)) 100%);
    border: 2px solid hsl(var(--primary));
    border-radius: 1.25rem;
    color: white;
    font-weight: 700;
    padding: 1.25rem 2.5rem;
    width: 100%;
    height: 3.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
    cursor: pointer;
    font-size: 1.125rem;
    letter-spacing: 0.025em;
    box-shadow: 
      0 4px 16px -4px hsl(var(--primary)/0.3),
      0 0 0 1px hsl(var(--primary)/0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }
  
  .premium-submit-button::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, 
      transparent, 
      rgba(255,255,255,0.15), 
      rgba(255,255,255,0.05), 
      transparent
    );
    transition: left 0.6s ease;
    transform: skewX(-15deg);
  }
  
  .premium-submit-button::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: conic-gradient(from 0deg,
      hsl(var(--primary)/0.1) 0deg,
      hsl(var(--primary)/0.3) 120deg,
      hsl(var(--primary)/0.1) 240deg,
      hsl(var(--primary)/0.3) 360deg
    );
    animation: buttonGlow 3s ease-in-out infinite;
    opacity: 0;
    transition: opacity 0.3s ease;
    z-index: -1;
  }
  
  .premium-submit-button:hover::before {
    left: 100%;
  }
  
  .premium-submit-button:hover::after {
    opacity: 1;
  }
  
  .premium-submit-button:hover {
    transform: translateY(-3px) scale(1.02);
    box-shadow: 
      0 12px 32px -8px hsl(var(--primary)/0.4),
      0 0 0 1px hsl(var(--primary)/0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
    border-color: hsl(var(--primary)/0.8);
  }
  
  .premium-submit-button:active {
    transform: translateY(-1px) scale(1.01);
    transition: all 0.1s ease;
  }
  
  .premium-submit-button:disabled {
    opacity: 0.6;
    transform: none;
    box-shadow: 
      0 2px 8px -2px hsl(var(--primary)/0.2),
      0 0 0 1px hsl(var(--primary)/0.05);
    cursor: not-allowed;
    background: linear-gradient(135deg, hsl(var(--muted-foreground)) 0%, hsl(var(--muted-foreground)/0.8) 100%);
    border-color: hsl(var(--muted-foreground)/0.5);
  }
  
  .premium-submit-button:disabled::before,
  .premium-submit-button:disabled::after {
    display: none;
  }
  
  .loading-spinner {
    width: 1.25rem;
    height: 1.25rem;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top: 2px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  .submit-icon {
    width: 1.25rem;
    height: 1.25rem;
    transition: transform 0.3s ease;
  }
  
  .premium-submit-button:hover .submit-icon {
    transform: translateX(2px);
  }
  
  @keyframes buttonGlow {
    0%, 100% { 
      transform: rotate(0deg);
      opacity: 0.3;
    }
    50% { 
      transform: rotate(180deg);
      opacity: 0.7;
    }
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .variant-display {
    background: hsl(var(--muted)/0.3);
    border: 1px solid hsl(var(--border)/0.5);
    border-radius: 0.75rem;
    padding: 1rem;
    margin-bottom: 1rem;
  }
  
  .loading-shimmer {
    background: linear-gradient(90deg, 
      hsl(var(--muted)/0.3) 0%, 
      hsl(var(--muted)/0.5) 50%, 
      hsl(var(--muted)/0.3) 100%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }
  
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  
  .smooth-transition {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .performance-optimized {
    will-change: auto;
    contain: layout style;
  }
  
  /* تحسينات للأداء العالي */
  .premium-form-container {
    transform: translateZ(0);
    backface-visibility: hidden;
    perspective: 1000px;
  }
  
  .premium-form-container::before {
    contain: layout style paint;
    pointer-events: none;
  }
  
  /* إيقاف الحركات للأجهزة التي تفضل تقليل الحركة */
  @media (prefers-reduced-motion: reduce) {
    .premium-form-container::before {
      animation: none !important;
      background: linear-gradient(90deg, transparent, hsl(var(--primary)/0.2), transparent);
    }
    
    * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
  
  /* تحسين للشاشات الصغيرة */
  @media (max-width: 768px) {
    .premium-form-container::before {
      animation-duration: 12s; /* أبطأ قليلاً للموبايل */
    }
  }
  
  /* تحسين لحفظ البطارية */
  @media (prefers-color-scheme: dark) and (max-width: 768px) {
    .premium-form-container::before {
      opacity: 0.7;
    }
  }
`;

// متغيرات الحركة المحسنة والمبسطة
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: {
      duration: 0.2,
      ease: "easeOut",
      staggerChildren: 0.05
    }
  }
};

const fieldVariants: Variants = {
  hidden: { opacity: 0, y: 5 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.15,
      ease: "easeOut"
    }
  }
};

// مكونات فرعية محسنة مع memo
const PriceDisplayRow = memo<{
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  loading?: boolean;
}>(({ icon, label, value, loading }) => (
  <div className="flex items-center justify-between py-2 border-b border-border/30">
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
    <div className="text-left">
      {loading ? (
        <span className="text-sm text-muted-foreground animate-pulse flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          جاري الحساب...
        </span>
      ) : value}
    </div>
  </div>
));

const ProductVariantInfo = memo<{
  selectedColor?: ProductColor;
  selectedSize?: ProductSize;
  t: (key: string) => string;
}>(({ selectedColor, selectedSize, t }) => {
  if (!selectedColor && !selectedSize) return null;
  
  return (
    <div className="bg-background/50 rounded-xl p-4 space-y-2 mb-4">
      {selectedColor && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{t('orderForm.color')}:</span>
          <span className="font-medium">{(selectedColor as any).name || (selectedColor as any).color_name || 'اللون المختار'}</span>
          {(selectedColor as any).value && (
            <div 
              className="w-4 h-4 rounded-full border border-border ml-1" 
              style={{ backgroundColor: (selectedColor as any).value }}
            />
          )}
        </div>
      )}
      {selectedSize && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{t('orderForm.size')}:</span>
          <span className="font-medium">{(selectedSize as any).name || (selectedSize as any).size_name || 'المقاس المختار'}</span>
        </div>
      )}
    </div>
  );
});

const FormHeader = memo<{
  t: (key: string) => string;
}>(({ t }) => (
  <div className="elegant-header flex items-center gap-4">
    <div className="premium-icon-wrapper">
      <DocumentTextIcon className="w-6 h-6 text-primary relative z-10" />
    </div>
    <div className="flex-1">
      <h2 className="text-2xl font-bold text-foreground mb-2 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
        {t('form.fillFormToOrder')}
      </h2>
      <p className="text-sm text-muted-foreground/90 leading-relaxed">
        {t('orderForm.fillDetails') || 'املأ البيانات التالية لإتمام طلبك بعناية'}
      </p>
    </div>
  </div>
));

// واجهات المكون الرئيسي
interface ProductFormRendererProps extends LoadingStates {
  // بيانات النموذج
  formData?: {
    fields: FormFieldType[];
    name?: string;
    description?: string;
    submitButtonText?: string;
    [key: string]: unknown;
  };
  formStrategy?: string;
  
  // معالجات الأحداث
  onFormSubmit?: (data: ProductFormData) => void | Promise<void>;
  onFormChange?: (data: ProductFormData) => void;
  onValidationChange?: (isValid: boolean, errors: Record<string, string>) => void;
  
  // خصائص عامة
  className?: string;
  showValidation?: boolean;
  
  // البدائل القديمة للتوافق
  fields?: FormFieldType[];
  onSubmit?: (data: ProductFormData) => void | Promise<void>;
  initialData?: ProductFormData;
  
  // خصائص المنتجات والألوان والمقاسات
  product?: ProductVariant;
  selectedColor?: ProductColor;
  selectedSize?: ProductSize;
  onColorSelect?: (color: ProductColor) => void;
  onSizeSelect?: (size: ProductSize) => void;
  
  // خصائص التحميل والتسعير
  deliveryFee?: number;
  subtotal?: number;
  total?: number;
  quantity?: number;
  
  // معلومات الموقع للتحقق من التوصيل المجاني
  selectedProvince?: {
    id: string;
    name: string;
  };
  selectedMunicipality?: {
    id: string;
    name: string;
  };
}

/**
 * مكون معالج النماذج المحسن للأداء
 * 
 * التحسينات المطبقة:
 * - تبسيط CSS animations وإزالة التأثيرات المعقدة
 * - تقليل استخدام framer-motion للضرورة فقط
 * - تحسين React performance مع memo وuseMemo محكم
 * - تحسين أداء السكرول مع passive listeners
 * - contain CSS properties لتجنب layout thrashing
 */
const ProductFormRenderer = memo<ProductFormRendererProps>(({
  // بيانات النموذج
  formData: externalFormData,
  formStrategy,
  onFormSubmit,
  onFormChange,
  onValidationChange,
  className,
  showValidation = true,
  
  // البدائل القديمة
  fields: directFields,
  onSubmit,
  initialData = {},
  
  // بيانات المنتج
  product,
  selectedColor,
  selectedSize,
  onColorSelect,
  onSizeSelect,
  
  // حالات التحميل
  isLoading = false,
  isLoadingDeliveryFee = false,
  isCalculatingDelivery = false,
  isLoadingPrices = false,
  isSubmitting = false,
  deliveryFee,
  subtotal,
  total,
  quantity,
  
  // معلومات الموقع للتحقق من التوصيل المجاني
  selectedProvince,
  selectedMunicipality
}) => {
  
  const { productFormRenderer, translateDynamicText } = useProductPurchaseTranslation();
  const { t } = useTranslation();
  const [isInternalSubmitting, setIsInternalSubmitting] = useState(false);
  
  // تحسين حساب الأسعار مع dependency array محكم
  const calculatedPrices = useMemo(() => {
    let basePrice = 0;
    
    if (subtotal && subtotal > 0) {
      basePrice = subtotal / (quantity || 1);
    } else if (product) {
      // استخراج السعر من خصائص المنتج المختلفة
      const productData = product as any;
      basePrice = productData?.price || 
                  productData?.current_price || 
                  productData?.base_price || 
                  productData?.retail_price ||
                  productData?.salePrice ||
                  productData?.displayPrice ||
                  0;
    }
    
    const productQuantity = quantity || 1;
    const productTotal = subtotal && subtotal > 0 ? subtotal : (basePrice * productQuantity);
    const deliveryCost = deliveryFee !== undefined ? deliveryFee : 0;
    const grandTotal = total && total > 0 ? total : (productTotal + deliveryCost);
    
    const hasLocationData = Boolean(selectedProvince && selectedMunicipality);
    const showAsFree = hasLocationData && deliveryFee === 0;
    
    return {
      basePrice,
      productQuantity,
      productTotal,
      deliveryCost,
      grandTotal,
      hasDeliveryFee: deliveryFee !== undefined,
      isFreeDelivery: showAsFree,
      noLocationSelected: !hasLocationData,
      hasLocationData
    };
  }, [product, subtotal, quantity, deliveryFee, total, selectedProvince?.id, selectedMunicipality?.id]);

  // تحسين formatPrice مع مرجع ثابت
  const formatPrice = useCallback((price: number) => {
    return new Intl.NumberFormat('ar-DZ', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(price);
  }, []);

  // تحسين معالجة بيانات النموذج مع dependencies محكمة
  const processedFormData = useMemo(() => {
    const baseFields = externalFormData?.fields || directFields || [];
    const dynamicFields: FormFieldType[] = [];

    // إضافة حقل الألوان ديناميكياً
    if (product?.has_variants && product?.colors?.length > 0) {
      dynamicFields.push({
        id: 'product_color',
        name: 'product_color',
        label: productFormRenderer.selectColor(),
        type: 'radio',
        required: true,
        description: productFormRenderer.selectColorDescription()
      });
    }

    // إضافة حقل المقاسات ديناميكياً
    if (selectedColor?.sizes?.length > 0) {
      dynamicFields.push({
        id: 'product_size',
        name: 'product_size',
        label: productFormRenderer.selectSize(),
        type: 'radio',
        required: true,
        description: productFormRenderer.selectSizeDescription()
      });
    }

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
      formTitle: externalFormData?.name ? translateDynamicText(externalFormData.name) : productFormRenderer.orderForm(),
      formDescription: externalFormData?.description ? translateDynamicText(externalFormData.description) : undefined,
      submitButtonText: externalFormData?.submitButtonText ? translateDynamicText(externalFormData.submitButtonText) : productFormRenderer.submitOrder()
    };
  }, [
    externalFormData?.fields, 
    externalFormData?.name,
    externalFormData?.description,
    externalFormData?.submitButtonText,
    directFields, 
    product?.has_variants, 
    product?.colors?.length,
    selectedColor?.sizes?.length, 
    productFormRenderer.selectColor,
    productFormRenderer.selectSize,
    productFormRenderer.orderForm,
    productFormRenderer.submitOrder,
    translateDynamicText
  ]);

  // استخدام hook إدارة بيانات النموذج
  const {
    formData,
    updateField,
    resetForm,
    getFieldValue,
    hasFieldValue,
    hasDataChanged
  } = useFormData({
    initialData,
    selectedColor,
    selectedSize,
    onFormChange,
    onColorSelect,
    onSizeSelect
  });

  // استخدام hook التحقق من صحة البيانات
  const {
    errors,
    touched,
    isFormValid,
    errorCount,
    validateImmediate,
    touchField,
    getFieldError,
    hasFieldError,
    isFieldVisible
  } = useFormValidation({
    fields: processedFormData.fields,
    formData,
    showValidation,
    debounceConfig: { delay: 300, immediate: false },
    onValidationChange
  });

  // تحسين العثور على حقول الموقع
  const locationFields = useMemo(() => {
    const fieldNames = {
      province: ['province', 'wilaya', 'state'],
      municipality: ['municipality', 'commune', 'city']
    };

    const provinceField = processedFormData.fields.find(field => 
      fieldNames.province.some(name => 
        field.name.toLowerCase().includes(name.toLowerCase()) || 
        field.label.toLowerCase().includes(name.toLowerCase())
      )
    );

    const municipalityField = processedFormData.fields.find(field => 
      fieldNames.municipality.some(name => 
        field.name.toLowerCase().includes(name.toLowerCase()) || 
        field.label.toLowerCase().includes(name.toLowerCase())
      )
    );

    return { provinceField, municipalityField };
  }, [processedFormData.fields]);

  // --- منطق التحقق من المخزون ---
  // إذا كان المنتج بدون متغيرات، نتحقق من المخزون الأساسي
  const isProductOutOfStock = Boolean(
    product && 
    !product.has_variants && // فقط للمنتجات بدون متغيرات
    (
      product.stock_quantity === undefined ||
      product.stock_quantity === null ||
      product.stock_quantity <= 0
    )
  );
  
  // للمنتجات مع متغيرات، نتحقق من مخزون اللون/المقاس المحدد
  const isColorOutOfStock = Boolean(
    selectedColor && 
    (
      selectedColor.quantity === undefined ||
      selectedColor.quantity === null ||
      selectedColor.quantity <= 0
    )
  );
  
  const isSizeOutOfStock = Boolean(
    selectedSize && 
    (
      selectedSize.quantity === undefined ||
      selectedSize.quantity === null ||
      selectedSize.quantity <= 0
    )
  );

  const isOutOfStock = isProductOutOfStock || isColorOutOfStock || isSizeOutOfStock;

  // تحسين معالج الإرسال
  const handleFormSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (isOutOfStock) {
      // يمكنك هنا عرض رسالة توست أو رسالة خطأ
      return;
    }

    if (isInternalSubmitting || isLoadingDeliveryFee || isCalculatingDelivery || isLoadingPrices) {
      return;
    }
    
    const validationResult: ValidationResult = validateImmediate();
    
    if (!validationResult.isValid) {
      return;
    }
    
    try {
      setIsInternalSubmitting(true);
      const submitHandler = onFormSubmit || onSubmit;
      await submitHandler?.(formData);
    } catch (error) {
    } finally {
      setIsInternalSubmitting(false);
    }
  }, [
    isInternalSubmitting,
    isLoadingDeliveryFee,
    isCalculatingDelivery, 
    isLoadingPrices,
    validateImmediate,
    onFormSubmit,
    onSubmit,
    formData,
    isOutOfStock
  ]);

  // تحسين حساب حالة التحميل
  const loadingStates = useMemo(() => ({
    overall: isLoading || isLoadingDeliveryFee || isCalculatingDelivery || isLoadingPrices || isSubmitting || isInternalSubmitting,
    delivery: isLoadingDeliveryFee || isCalculatingDelivery,
    prices: isLoadingPrices,
    form: isInternalSubmitting || isSubmitting
  }), [isLoading, isLoadingDeliveryFee, isCalculatingDelivery, isLoadingPrices, isSubmitting, isInternalSubmitting]);

  // تحسين النص المناسب للزر
  const buttonText = useMemo(() => {
    if (loadingStates.delivery) return productFormRenderer.processing();
    if (loadingStates.prices) return productFormRenderer.processing();
    if (loadingStates.overall) return productFormRenderer.processing();
    return processedFormData.submitButtonText;
  }, [loadingStates.delivery, loadingStates.prices, loadingStates.overall, processedFormData.submitButtonText, productFormRenderer]);

  // تحسين ترتيب الحقول
  const orderedFields = useMemo(() => {
    const { fields } = processedFormData;
    
    const colorFields = fields.filter(field => field.name === 'product_color');
    const sizeFields = fields.filter(field => field.name === 'product_size');
    const nameFields = fields.filter(field => 
      /name|اسم/i.test(field.name) || /name|اسم/i.test(field.label)
    );
    const phoneFields = fields.filter(field => 
      /phone|هاتف|رقم/i.test(field.name) || /phone|هاتف|رقم/i.test(field.label)
    );
    const deliveryFields = fields.filter(field => 
      field.type === 'radio' && (/delivery|توصيل/i.test(field.name) || /delivery|توصيل/i.test(field.label))
    );
    
    const locationFieldIds = [locationFields.provinceField?.id, locationFields.municipalityField?.id].filter(Boolean);
    const otherFields = fields.filter(field => 
      ![...colorFields, ...sizeFields, ...nameFields, ...phoneFields, ...deliveryFields].includes(field) &&
      !locationFieldIds.includes(field.id)
    );
    
    return [
      ...colorFields,
      ...sizeFields,
      ...nameFields,
      ...phoneFields,
      ...(locationFields.provinceField ? [locationFields.provinceField] : []),
      ...otherFields,
      ...deliveryFields
    ];
  }, [processedFormData.fields, locationFields.provinceField, locationFields.municipalityField]);

  // تحسين دالة تحديد عرض الحقل
  const getFieldColSpan = useCallback((field: FormFieldType) => {
    const isColorField = field.name === 'product_color';
    const isSizeField = field.name === 'product_size';
    const isNameField = /name|اسم/i.test(field.name) || /name|اسم/i.test(field.label);
    const isPhoneField = /phone|هاتف|رقم/i.test(field.name) || /phone|هاتف|رقم/i.test(field.label);
    const isLocationField = locationFields.provinceField && field.id === locationFields.provinceField.id;
    const isDeliveryField = field.type === 'radio' && (/delivery|توصيل/i.test(field.name) || /delivery|توصيل/i.test(field.label));
    const isFullWidthField = field.type === 'textarea' || isColorField || isSizeField;
    
    if (isLocationField || isDeliveryField || isFullWidthField) {
      return 'col-span-2';
    } else if (isNameField || isPhoneField) {
      return 'col-span-1';
    } else {
      return 'col-span-2';
    }
  }, [locationFields.provinceField]);

  // تحسين دالة عرض الحقل
  const renderField = useCallback((field: FormFieldType) => {
    if (!isFieldVisible(field)) return null;

    // اختيار الألوان
    if (field.name === 'product_color' && product?.colors) {
      return (
        <ColorSelector
          colors={product.colors}
          selectedValue={getFieldValue('product_color') as string || ''}
          onSelect={(colorId) => updateField('product_color', colorId)}
          disabled={loadingStates.overall}
          errors={errors}
          touched={touched}
        />
      );
    }

    // اختيار الأحجام
    if (field.name === 'product_size' && selectedColor?.sizes) {
      return (
        <SizeSelector
          sizes={selectedColor.sizes}
          selectedValue={getFieldValue('product_size') as string || ''}
          onSelect={(sizeId) => updateField('product_size', sizeId)}
          disabled={loadingStates.overall}
          errors={errors}
          touched={touched}
        />
      );
    }

    // حقول الموقع معاً
    if (locationFields.provinceField && field.id === locationFields.provinceField.id) {
      return (
        <LocationFields
          provinceField={locationFields.provinceField}
          municipalityField={locationFields.municipalityField}
          formData={formData}
          onFieldChange={updateField}
          onFieldTouch={touchField}
          disabled={loadingStates.overall}
          errors={errors}
          touched={touched}
        />
      );
    }

    // تجنب عرض حقل البلدية منفرداً
    if (locationFields.municipalityField && field.id === locationFields.municipalityField.id) {
      return null;
    }
    
    // الحقول العادية
    return (
      <FormFieldComponent
        field={field}
        value={getFieldValue(field.name)}
        onFieldChange={updateField}
        onFieldTouch={touchField}
        disabled={loadingStates.overall}
        errors={errors}
        touched={touched}
      />
    );
  }, [
    isFieldVisible,
    product?.colors,
    selectedColor?.sizes,
    locationFields.provinceField,
    locationFields.municipalityField,
    getFieldValue,
    updateField,
    touchField,
    loadingStates.overall,
    errors,
    touched,
    formData
  ]);

  // إيقونات محسنة مع memoization
  const icons = useMemo(() => ({
    delivery: (
      <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    product: (
      <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    ),
    total: (
      <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
      </svg>
    )
  }), []);

  // تحسين عرض سعر التوصيل
  const deliveryPriceDisplay = useMemo(() => {
    if (loadingStates.delivery) {
      return (
        <span className="text-sm text-muted-foreground animate-pulse flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {t('form.calculating')}
        </span>
      );
    }
    
    if (calculatedPrices.noLocationSelected) {
      return (
        <div className="text-sm text-amber-600 font-medium">
          <div className="bg-amber-50 text-amber-700 px-2 py-1 rounded text-xs">
            {t('form.selectLocationFirst')}
          </div>
        </div>
      );
    }
    
    if (calculatedPrices.isFreeDelivery) {
      return (
        <span className="font-medium text-green-600 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {t('form.free')}
        </span>
      );
    }
    
    return (
      <span className="font-semibold text-foreground">
        {formatPrice(calculatedPrices.deliveryCost)} {t('form.currency')}
      </span>
    );
  }, [loadingStates.delivery, calculatedPrices.noLocationSelected, calculatedPrices.isFreeDelivery, calculatedPrices.deliveryCost, formatPrice, t]);

  // إذا لم تكن هناك حقول، لا نعرض شيئاً
  if (!processedFormData.fields || processedFormData.fields.length === 0) {
    return null;
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
          {isOutOfStock && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-center text-base font-bold dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
              {isProductOutOfStock && 'هذا المنتج غير متوفر حالياً'}
              {isColorOutOfStock && !isProductOutOfStock && 'هذا اللون غير متوفر حالياً'}
              {isSizeOutOfStock && !isProductOutOfStock && !isColorOutOfStock && 'هذا المقاس غير متوفر حالياً'}
            </div>
          )}
          <Shimmer 
            isLoading={loadingStates.overall && !hasDataChanged} 
            rounded="2xl"
            className="min-h-[400px]"
          >
            {/* حاوي النموذج مع إطار متحرك محسن */}
            <div className="premium-form-container">
              <div className="premium-form-border"></div>
              <div className="premium-form-content p-6 md:p-8">
              
              <FormHeader t={t} />

              {processedFormData.formDescription && (
                <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                  {processedFormData.formDescription}
                </p>
              )}
              
              <form onSubmit={handleFormSubmit} className="space-y-6" data-form="product-form" id="product-purchase-form">
                    <motion.div 
                  className="grid grid-cols-2 gap-3"
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
              </AnimatePresence>
              </motion.div>

              {(onFormSubmit || onSubmit) && (
                <div className="mt-6 mb-4">
                    <div className="bg-gradient-to-br from-primary/5 to-transparent p-5 rounded-2xl border border-primary/20">
                    <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      {t('form.orderSummary')}
                    </h3>
                    
                      <ProductVariantInfo 
                        selectedColor={selectedColor}
                        selectedSize={selectedSize}
                        t={t}
                      />
                    
                    <div className="space-y-3">
                        <PriceDisplayRow
                          icon={icons.delivery}
                          label={t('form.deliveryPrice')}
                          value={deliveryPriceDisplay}
                          loading={loadingStates.delivery}
                        />

                        <PriceDisplayRow
                          icon={icons.product}
                          label={`${t('form.productPrice')} (${formatPrice(calculatedPrices.productQuantity)} ${calculatedPrices.productQuantity === 1 ? t('form.piece') : t('form.pieces')})`}
                          value={`${formatPrice(calculatedPrices.productTotal)} ${t('form.currency')}`}
                        />

                      <div className="flex items-center justify-between py-3 mt-4 pt-4 border-t-2 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent rounded-lg px-3">
                        <div className="flex items-center gap-2">
                            {icons.total}
                          <span className="font-bold text-primary">{t('form.totalCost')}</span>
                        </div>
                        <div className="text-right">
                          {calculatedPrices.noLocationSelected ? (
                            <div className="text-right">
                              <span className="text-xl font-bold text-primary">
                                {formatPrice(calculatedPrices.productTotal)} {t('form.currency')}
                              </span>
                                <div className="text-xs text-muted-foreground mt-1">
                                <div>+ {t('form.deliveryFees')}</div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xl font-bold text-primary">
                              {formatPrice(calculatedPrices.grandTotal)} {t('form.currency')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

                              {(onFormSubmit || onSubmit) && (
                  <div className="mt-8 pt-6 border-t border-border/50">
                    <motion.button
                      type="submit"
                      disabled={loadingStates.overall || isOutOfStock}
                      className="premium-submit-button"
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      {loadingStates.overall ? (
                        <>
                          <div className="loading-spinner"></div>
                          <span className="font-bold">{buttonText}</span>
                        </>
                      ) : (
                        <>
                          <span className="font-bold">{t('form.submit')}</span>
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
                )}
                          </form>
              </div>
            </div>
        </Shimmer>
      </div>
    </motion.div>
    </FormErrorBoundary>
  );
});

ProductFormRenderer.displayName = 'ProductFormRenderer';

export default ProductFormRenderer;
