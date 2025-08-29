import React, { memo } from 'react';
import { ProductHeader } from '@/components/product/ProductHeader';
import ProductImageGalleryV2 from '@/components/product/ProductImageGalleryV2';
import { ProductContentSection } from './ProductContentSection';

interface ProductMainSectionProps {
  product: any;
  state: any;
  actions: any;
  formData: any;
  formStrategy: any;
  summaryData: any;
  finalPriceCalculation: any;
  selectedOffer: any;
  isQuantityUpdatedByOffer: boolean;
  showValidationErrors: boolean;
  hasTriedToSubmit: boolean;
  submittedFormData: Record<string, any>;
  isSavingCart: boolean;
  onFormChange: (data: Record<string, any>) => void;
  onFormSubmit: (data: Record<string, any>) => void;
  onBuyNow: () => void;
  onQuantityChange: (quantity: number) => void;
  setSelectedOffer: (offer: any) => void;
  setIsQuantityUpdatedByOffer: (value: boolean) => void;
  setShowValidationErrors: (value: boolean) => void;
  setHasTriedToSubmit: (value: boolean) => void;
  updateCurrentFormData: (data: Record<string, any>) => void;
}

/**
 * المكون الرئيسي لصفحة المنتج - محسن للأداء
 * 
 * التحسينات المطبقة:
 * ✅ تقسيم إلى مكونات فرعية أصغر
 * ✅ استخدام React.memo لمنع re-renders غير الضرورية
 * ✅ فصل المنطق المعقد إلى مكونات متخصصة
 * ✅ تحسين إدارة الحالة والبيانات
 * ✅ تقليل تعقيد المكون الرئيسي
 * 
 * المكونات الفرعية:
 * - ProductHeader: عنوان المنتج والمعلومات الأساسية
 * - ProductImageGalleryV2: معرض الصور
 * - ProductContentSection: المحتوى الرئيسي (يجمع جميع الأقسام)
 */
export const ProductMainSection = memo<ProductMainSectionProps>(({
  product,
  state,
  actions,
  formData,
  formStrategy,
  summaryData,
  finalPriceCalculation,
  selectedOffer,
  isQuantityUpdatedByOffer,
  showValidationErrors,
  hasTriedToSubmit,
  submittedFormData,
  isSavingCart,
  onFormChange,
  onFormSubmit,
  onBuyNow,
  onQuantityChange,
  setSelectedOffer,
  setIsQuantityUpdatedByOffer,
  setShowValidationErrors,
  setHasTriedToSubmit,
  updateCurrentFormData
}) => {
  return (
    <div className="container mx-auto px-4 py-8 pt-20">
      {/* تخطيط متجاوب: مختلف في الموبايل والحاسوب */}
      <div className="space-y-8">
        {/* في الموبايل: ProductHeader أولاً، ثم معرض الصور، ثم المحتوى */}
        <div className="lg:hidden">
          <ProductHeader
            name={product.name}
            brand={product.brand?.name}
            status={{
              is_new: product.is_new,
              is_featured: product.is_featured
            }}
            availableStock={state.availableStock || 0}
          />
        </div>

        {/* معرض الصور - في الموبايل بعد ProductHeader، في الحاسوب في اليسار */}
        <div className="lg:hidden">
          <ProductImageGalleryV2
            product={product}
            selectedColor={state.selectedColor}
          />
        </div>

        {/* في الحاسوب: تخطيط بعمودين */}
        <div className="hidden lg:grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* العمود الأيسر - معرض الصور */}
          <div className="lg:col-span-1">
            <ProductImageGalleryV2
              product={product}
              selectedColor={state.selectedColor}
            />
          </div>

          {/* العمود الأيمن - المحتوى الرئيسي مع ProductHeader */}
          <div className="lg:col-span-1 space-y-8">
            {/* ProductHeader أولاً */}
            <ProductHeader
              name={product.name}
              brand={product.brand?.name}
              status={{
                is_new: product.is_new,
                is_featured: product.is_featured
              }}
              availableStock={state.availableStock || 0}
            />

            {/* ثم المحتوى الرئيسي */}
            <ProductContentSection
              product={product}
              state={state}
              actions={actions}
              formData={formData}
              formStrategy={formStrategy}
              summaryData={summaryData}
              finalPriceCalculation={finalPriceCalculation}
              selectedOffer={selectedOffer}
              isQuantityUpdatedByOffer={isQuantityUpdatedByOffer}
              showValidationErrors={showValidationErrors}
              hasTriedToSubmit={hasTriedToSubmit}
              submittedFormData={submittedFormData}
              isSavingCart={isSavingCart}
              onFormChange={onFormChange}
              onFormSubmit={onFormSubmit}
              onBuyNow={onBuyNow}
              onQuantityChange={onQuantityChange}
              setSelectedOffer={setSelectedOffer}
              setIsQuantityUpdatedByOffer={setIsQuantityUpdatedByOffer}
              setShowValidationErrors={setShowValidationErrors}
              setHasTriedToSubmit={setHasTriedToSubmit}
              updateCurrentFormData={updateCurrentFormData}
            />
          </div>
        </div>

        {/* في الموبايل: المحتوى الرئيسي بعد معرض الصور */}
        <div className="lg:hidden">
          <ProductContentSection
            product={product}
            state={state}
            actions={actions}
            formData={formData}
            formStrategy={formStrategy}
            summaryData={summaryData}
            finalPriceCalculation={finalPriceCalculation}
            selectedOffer={selectedOffer}
            isQuantityUpdatedByOffer={isQuantityUpdatedByOffer}
            showValidationErrors={showValidationErrors}
            hasTriedToSubmit={hasTriedToSubmit}
            submittedFormData={submittedFormData}
            isSavingCart={isSavingCart}
            onFormChange={onFormChange}
            onFormSubmit={onFormSubmit}
            onBuyNow={onBuyNow}
            onQuantityChange={onQuantityChange}
            setSelectedOffer={setSelectedOffer}
            setIsQuantityUpdatedByOffer={setIsQuantityUpdatedByOffer}
            setShowValidationErrors={setShowValidationErrors}
            setHasTriedToSubmit={setHasTriedToSubmit}
            updateCurrentFormData={updateCurrentFormData}
          />
        </div>
      </div>
    </div>
  );
});

ProductMainSection.displayName = 'ProductMainSection';




