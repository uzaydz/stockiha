import React, { memo, useMemo } from 'react';
import { ProductMainSection } from './ProductMainSection';
import { useSafeTranslation } from '@/components/safe-i18n/SafeTranslationProvider';

interface ProductMainSectionWrapperProps {
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
 * مُلفّ آمن لـ ProductMainSection يضمن استقرار hooks
 * - يستدعي hooks مرة واحدة في المستوى الأعلى
 * - يمنع React Error #310
 * - يوفر fallbacks آمنة للبيانات المفقودة
 */
export const ProductMainSectionWrapper = memo<ProductMainSectionWrapperProps>((props) => {
  // ✅ Hook calls في أعلى المكون دائماً وبنفس الترتيب
  const { isReady } = useSafeTranslation();
  
  // 🔍 Debug: حالة نظام الترجمة
  try {
    console.log('🌐 [ProductMainSectionWrapper] translation state', {
      isReady,
      timestamp: Date.now()
    });
  } catch {}

  // تحقق من صحة البيانات الأساسية قبل التمرير
  const safeProps = useMemo(() => {
    const {
      product,
      state,
      actions,
      formData,
      formStrategy,
      summaryData,
      finalPriceCalculation,
      ...rest
    } = props;

    // التأكد من وجود البيانات الأساسية
    try {
      console.log('🧱 [ProductMainSectionWrapper] props gate', {
        hasProduct: !!product,
        hasState: !!state,
        hasActions: !!actions
      });
    } catch {}
    if (!product || !state || !actions) {
      return null;
    }

    return {
      product,
      state: state || {},
      actions: actions || {},
      formData: formData || {},
      formStrategy: formStrategy || {},
      summaryData: summaryData || {},
      finalPriceCalculation: finalPriceCalculation || { price: 0 },
      ...rest
    };
  }, [props]);

  // إذا البيانات غير صحيحة، اعرض loading (تجاهل حالة الترجمة مؤقتًا)
  if (!safeProps) {
    return (
      <div className="container mx-auto px-4 py-8 pt-20">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">جاري تحميل المنتج...</p>
            <div className="mt-2 text-xs text-muted-foreground">
              <code>debug: wrapper-loading</code>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // تمرير البيانات الآمنة إلى ProductMainSection
  return <ProductMainSection {...safeProps} />;
});

ProductMainSectionWrapper.displayName = 'ProductMainSectionWrapper';

export default ProductMainSectionWrapper;
