import React, { memo } from 'react';
import { ProductHeader } from '@/components/product/ProductHeader';
import ProductImageGalleryV2 from '@/components/product/ProductImageGalleryV2';
import { ProductContentSection } from './ProductContentSection';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface ProductMainSectionProps {
  lowEnd?: boolean;
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
  showAddToCart?: boolean;
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
  lowEnd,
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
  updateCurrentFormData,
  showAddToCart = false
}) => {
  // ✅ إصلاح: نقل جميع hooks إلى أعلى المكون قبل أي early returns
  // تجنب استدعاء hooks بعد early returns لمنع React Error #310
  const isLgUp = useMediaQuery('(min-width: 1024px)');
  
  // إذا لم تكن البيانات متوفرة، عرض شاشة تحميل
  if (!product || !state) {
    return (
      <div className="container mx-auto px-4 py-8 pt-20">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">جاري تحميل المنتج...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-20">
      <div className="space-y-8">
        {/* رأس مبسّط للموبايل فقط لتفادي التكرار الثقيل */}
        {!isLgUp && (
          lowEnd ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                {product.is_new && (
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">جديد</span>
                )}
                {product.is_featured && (
                  <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">مميز</span>
                )}
                {Number(state?.availableStock || 0) > 0 && (
                  <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">متوفر</span>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">{product.name}</h1>
              {product.brand?.name && (
                <p className="text-sm text-muted-foreground">by {product.brand.name}</p>
              )}
            </div>
          ) : (
            <ProductHeader
              name={product.name}
              brand={product.brand?.name}
              status={{
                is_new: product.is_new,
                is_featured: product.is_featured
              }}
              availableStock={state?.availableStock || 0}
            />
          )
        )}

        {/* تخطيط واحد مع ترتيب مختلف بين الموبايل والحاسوب */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* معرض الصور: بعد العنوان في الموبايل، وعلى اليسار في الحاسوب */}
          <div className="order-2 lg:order-1">
            <ProductImageGalleryV2
              product={product}
              selectedColor={state.selectedColor}
            />
          </div>

          {/* المحتوى الرئيسي + رأس سطح المكتب */}
          <div className="order-3 lg:order-2 space-y-8">
            {/* رأس سطح المكتب فقط */}
            {isLgUp && (
              lowEnd ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {product.is_new && (
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">جديد</span>
                    )}
                    {product.is_featured && (
                      <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">مميز</span>
                    )}
                    {Number(state?.availableStock || 0) > 0 && (
                      <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">متوفر</span>
                    )}
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">{product.name}</h1>
                  {product.brand?.name && (
                    <p className="text-sm text-muted-foreground">by {product.brand.name}</p>
                  )}
                </div>
              ) : (
                <ProductHeader
                  name={product.name}
                  brand={product.brand?.name}
                  status={{
                    is_new: product.is_new,
                    is_featured: product.is_featured
                  }}
                  availableStock={state?.availableStock || 0}
                />
              )
            )}

            {/* المحتوى الرئيسي - نسخة واحدة فقط لكل المقاسات */}
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
              showAddToCart={showAddToCart}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

ProductMainSection.displayName = 'ProductMainSection';
