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

  // --- منطق التحقق من المخزون المحسن ---
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

  // تحقق إضافي: إذا كان المنتج مع متغيرات لكن المخزون الأساسي نفد
  const isProductWithVariantsOutOfStock = Boolean(
    product &&
    product.has_variants && // منتج مع متغيرات
    (
      product.stock_quantity === undefined ||
      product.stock_quantity === null ||
      product.stock_quantity <= 0
    )
  );

  // للمنتجات مع متغيرات، نتحقق من مخزون اللون/المقاس المحدد
  const isColorOutOfStock = Boolean(
    product?.has_variants && // فقط للمنتجات مع متغيرات
    !isProductWithVariantsOutOfStock && // فقط إذا لم يكن المنتج نفسه غير متوفر
    selectedColor &&
    (
      selectedColor.quantity === undefined ||
      selectedColor.quantity === null ||
      selectedColor.quantity <= 0
    )
  );

  const isSizeOutOfStock = Boolean(
    product?.has_variants && // فقط للمنتجات مع متغيرات
    !isProductWithVariantsOutOfStock && // فقط إذا لم يكن المنتج نفسه غير متوفر
    selectedSize &&
    (
      selectedSize.quantity === undefined ||
      selectedSize.quantity === null ||
      selectedSize.quantity <= 0
    )
  );

  const isOutOfStock = isProductOutOfStock || isProductWithVariantsOutOfStock || isColorOutOfStock || isSizeOutOfStock;

  // تحسين معالج الإرسال مع التحقق من المخزون
  const handleFormSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // التحقق من المخزون قبل المعالجة
    if (isOutOfStock) {
      console.warn('محاولة طلب منتج غير متوفر:', {
        isProductOutOfStock,
        isProductWithVariantsOutOfStock,
        isColorOutOfStock,
        isSizeOutOfStock,
        productStock: product?.stock_quantity,
        colorStock: selectedColor?.quantity,
        sizeStock: selectedSize?.quantity,
        hasVariants: product?.has_variants
      });
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

  // تحسين النص المناسب للزر مع التحقق من المخزون
  const buttonText = useMemo(() => {
    // إذا كان المنتج غير متوفر، أظهر نص مناسب
    if (isOutOfStock) {
      if (isProductOutOfStock || isProductWithVariantsOutOfStock) {
        return t('featuredProducts.storeProducts.stock.productOutOfStockButton', 'غير متوفر');
      }
      if (isColorOutOfStock) {
        return t('featuredProducts.storeProducts.stock.colorOutOfStockButton', 'اللون غير متوفر');
      }
      if (isSizeOutOfStock) {
        return t('featuredProducts.storeProducts.stock.sizeOutOfStockButton', 'المقاس غير متوفر');
      }
    }



    // حالات التحميل العادية
    if (loadingStates.delivery) return productFormRenderer.processing();
    if (loadingStates.prices) return productFormRenderer.processing();
    if (loadingStates.overall) return productFormRenderer.processing();

    return processedFormData.submitButtonText;
  }, [
    loadingStates.delivery,
    loadingStates.prices,
    loadingStates.overall,
    processedFormData.submitButtonText,
    productFormRenderer,
    isOutOfStock,
    isProductOutOfStock,
    isProductWithVariantsOutOfStock,
    isColorOutOfStock,
    isSizeOutOfStock,
    t
  ]);

  // إذا لم تكن هناك حقول، لا نعرض شيئاً
  if (!processedFormData.fields || processedFormData.fields.length === 0) {
    return null;
  }

  // فحص مبكر: إذا كان المنتج غير متوفر تماماً، لا نعرض النموذج
  const shouldHideForm = Boolean(
    (isProductOutOfStock || isProductWithVariantsOutOfStock) &&
    (!product?.has_variants || isProductWithVariantsOutOfStock) // للمنتجات بدون متغيرات أو المنتجات مع متغيرات لكن مخزونها الأساسي نفد
  );

  if (shouldHideForm) {
    return (
      <div className="w-full p-6 text-center">
        <div className="max-w-md mx-auto">
          <div className="mb-4">
            <svg className="w-16 h-16 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-.882-5.5-2.316" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {t('featuredProducts.storeProducts.stock.productUnavailable')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {t('featuredProducts.storeProducts.stock.productOutOfStockMessage')}
          </p>
        </div>
      </div>
    );
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
            <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-center text-base font-bold dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
              <div className="flex items-center justify-center gap-2 mb-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{t('featuredProducts.storeProducts.stock.productUnavailable')}</span>
              </div>
              <div className="text-sm font-normal">
                {(isProductOutOfStock || isProductWithVariantsOutOfStock) && t('featuredProducts.storeProducts.stock.productOutOfStockMessage')}
                {isColorOutOfStock && !isProductOutOfStock && !isProductWithVariantsOutOfStock && t('featuredProducts.storeProducts.stock.colorOutOfStock')}
                {isSizeOutOfStock && !isProductOutOfStock && !isProductWithVariantsOutOfStock && !isColorOutOfStock && t('featuredProducts.storeProducts.stock.sizeOutOfStock')}
              </div>
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
