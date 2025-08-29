import React, { useState, useMemo, useCallback, memo } from 'react';
import { motion, Variants } from 'framer-motion';
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
import ProductFormHeader from './form/ProductFormHeader';
import OrderFormHeader from './form/OrderFormHeader';
import FormFieldsRenderer from './form/FormFieldsRenderer';
import OrderSummary from './form/OrderSummary';
import SubmitButton from './form/SubmitButton';
import Shimmer from '@/components/ui/Shimmer';

// استيراد الأنماط
import './form/ProductFormStyles.css';

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
 * - تقسيم المكون إلى مكونات أصغر وأكثر تركيزاً
 * - استخدام CSS منفصل بدلاً من inline styles
 * - تحسين React performance مع memo وuseMemo محكم
 * - تقليل استخدام framer-motion للضرورة فقط
 * - تحسين إدارة الحالة والتحقق من صحة البيانات
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
  
  // تحسين معالجة بيانات النموذج مع dependencies محكمة
  const processedFormData = useMemo(() => {
    const baseFields = externalFormData?.fields || directFields || [];
    const dynamicFields: FormFieldType[] = [];

      // تم إزالة حقول الألوان والمقاسات - ستظهر في ProductVariantSelector منفصل

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
    onFormChange
  });

  // تم إزالة console.log لتجنب الرسائل المتكررة

  // دمج بيانات الألوان والمقاسات مع بيانات النموذج
  const enrichedFormData = useMemo(() => {
    return {
      ...formData,
      // إضافة بيانات الألوان والمقاسات المحددة
      selectedColor: selectedColor?.id || null,
      selectedColorName: selectedColor?.name || null,
      selectedSize: selectedSize?.id || null,
      selectedSizeName: selectedSize?.size_name || null,
      // إضافة معلومات إضافية مفيدة
      colorQuantity: selectedColor?.quantity || 0,
      sizeQuantity: selectedSize?.quantity || 0,
      hasVariants: product?.has_variants || false
    };
  }, [formData, selectedColor, selectedSize, product?.has_variants]);

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
      // إرسال البيانات المدمجة مع الألوان والمقاسات
      await submitHandler?.(enrichedFormData);
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
    enrichedFormData,
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

  // إذا لم تكن هناك حقول، لا نعرض شيئاً
  if (!processedFormData.fields || processedFormData.fields.length === 0) {
    return null;
  }

  return (
    <FormErrorBoundary className={className}>
      <motion.div 
        className={cn("w-full performance-optimized", className)}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="space-y-4">
          {isOutOfStock && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-center text-base font-bold dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
              {isProductOutOfStock && t('featuredProducts.storeProducts.stock.productOutOfStock')}
              {isColorOutOfStock && !isProductOutOfStock && t('featuredProducts.storeProducts.stock.colorOutOfStock')}
              {isSizeOutOfStock && !isProductOutOfStock && !isColorOutOfStock && t('featuredProducts.storeProducts.stock.sizeOutOfStock')}
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
              
                <OrderFormHeader />
              
                <form onSubmit={handleFormSubmit} className="space-y-6" data-form="product-form" id="product-purchase-form">
                  
                  {/* 
                    ملاحظة: اختيار الألوان والمقاسات يتم عرضه في ProductVariantSelector منفصل
                    وليس هنا في النموذج. القيم المحددة سيتم إرسالها مع النموذج تلقائياً.
                  */}
                  
                  <FormFieldsRenderer
                    fields={processedFormData.fields}
                    formData={formData}
                    onFieldChange={updateField}
                    onFieldTouch={touchField}
                    disabled={loadingStates.overall}
                    errors={errors}
                    touched={touched}
                    locationFields={locationFields}
                  />

                  {(onFormSubmit || onSubmit) && (
                    <div className="mt-6 mb-4">
                      <OrderSummary
                        selectedColor={selectedColor}
                        selectedSize={selectedSize}
                        deliveryFee={deliveryFee}
                        subtotal={subtotal}
                        total={total}
                        quantity={quantity}
                        isLoadingDeliveryFee={isLoadingDeliveryFee}
                        isCalculatingDelivery={isCalculatingDelivery}
                        selectedProvince={selectedProvince}
                        selectedMunicipality={selectedMunicipality}
                      />
                    </div>
                  )}

                  {(onFormSubmit || onSubmit) && (
                    <SubmitButton
                      disabled={loadingStates.overall || isOutOfStock}
                      loading={loadingStates.overall}
                      buttonText={buttonText}
                      t={t}
                    />
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
