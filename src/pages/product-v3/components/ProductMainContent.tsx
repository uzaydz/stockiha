import React, { Suspense, lazy, useMemo } from 'react';
import MainContentFallback from './fallbacks/MainContentFallback';

// استيراد الغلاف الآمن لضمان استقرار الهوكس مع i18n
const ProductMainSectionWrapper = lazy(() => import('@/components/product-page/ProductMainSectionWrapper').then(m => ({ default: m.ProductMainSectionWrapper })));

interface Props {
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
  onFormSubmit: (e?: any) => void;
  onBuyNow: () => void;
  onQuantityChange: (q: number) => void;
  setSelectedOffer: (o: any) => void;
  setIsQuantityUpdatedByOffer: (v: boolean) => void;
  setShowValidationErrors: (v: boolean) => void;
  setHasTriedToSubmit: (v: boolean) => void;
  updateCurrentFormData: (data: Record<string, any>) => void;
  showAddToCart: boolean;
}

const ProductMainContent: React.FC<Props> = React.memo((props) => {
  const { lowEnd = false } = props;

  // تقليل إنشاء كائنات جديدة: تمرير props كما هي لـ ProductMainSection
  const fallback = useMemo(() => <MainContentFallback isLowEnd={lowEnd} />, [lowEnd]);

  return (
    <Suspense fallback={fallback}>
      <ProductMainSectionWrapper {...props} />
    </Suspense>
  );
});

ProductMainContent.displayName = 'ProductMainContent';

export default ProductMainContent;

