import React, { useMemo } from 'react';
import {
  BannerContentLazy,
  BannerImageLazy,
  HeroData
} from './banner';

// استيراد مكونات FeaturedProducts للمعاينة
// import FeaturedProductsPreview from './FeaturedProductsPreview';
import { useBannerData } from './banner/useBannerData';
import { cn } from '@/lib/utils';

/**
 * مكون بانر المتجر المحسّن مخصص للمعاينة
 * نسخة محسّنة للأداء بدون تفاعلات أو انتقالات
 */
interface PreviewStoreBannerProps {
  heroData?: HeroData;
}

const PreviewStoreBanner = React.memo<PreviewStoreBannerProps>(({ heroData }) => {
  // استخدام useBannerData في المستوى الأعلى (قاعدة React)
  const processedData = useBannerData(heroData);

  // الحصول على organizationId من localStorage أو استخدام قيمة افتراضية للمعاينة
  const organizationId = localStorage.getItem('bazaar_organization_id') || '6c2ed605-0880-4e40-af50-78f80f7283bb';

  // استخدام useMemo للبيانات المعالجة لتجنب إعادة الحساب
  const memoizedData = useMemo(() => ({
    title: processedData.title,
    description: processedData.description,
    primaryButtonText: processedData.primaryButtonText,
    primaryButtonLink: '#', // رابط ثابت للمعاينة
    secondaryButtonText: processedData.secondaryButtonText,
    secondaryButtonLink: '#', // رابط ثابت للمعاينة
    primaryButtonStyle: processedData.primaryButtonStyle,
    secondaryButtonStyle: processedData.secondaryButtonStyle,
    isRTL: processedData.isRTL,
    imageUrl: processedData.imageUrl,
    // إضافة بيانات المنتجات
    selectedProducts: processedData.selectedProducts,
    showProducts: processedData.showProducts,
    productsDisplay: processedData.productsDisplay,
    productsLimit: processedData.productsLimit,
    productsType: processedData.productsType,
    organizationId: organizationId
  }), [processedData, organizationId]);

  return (
    <section className="relative w-full bg-background overflow-hidden">
      {/* خلفية مبسطة وأنيقة */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/10" />
      
      <div className="relative container mx-auto px-4 navbar-spacer-lg pb-8 sm:navbar-spacer-lg sm:pb-10 md:navbar-spacer md:pb-8 lg:py-12">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center min-h-[40vh] sm:min-h-[50vh] lg:min-h-[60vh]">
          
          {/* قسم المحتوى مع Lazy Loading */}
          <BannerContentLazy
            title={memoizedData.title}
            description={memoizedData.description}
            primaryButtonText={memoizedData.primaryButtonText}
            primaryButtonLink={memoizedData.primaryButtonLink}
            secondaryButtonText={memoizedData.secondaryButtonText}
            secondaryButtonLink={memoizedData.secondaryButtonLink}
            primaryButtonStyle={memoizedData.primaryButtonStyle}
            secondaryButtonStyle={memoizedData.secondaryButtonStyle}
            isRTL={memoizedData.isRTL}
            isPreview={true} // إشارة للمكونات الفرعية أن هذا معاينة
            // تمرير بيانات المنتجات
            selectedProducts={memoizedData.selectedProducts}
            showProducts={memoizedData.showProducts}
            productsDisplay={memoizedData.productsDisplay}
            productsLimit={memoizedData.productsLimit}
          />

          {/* قسم الصورة مع Lazy Loading */}
          <BannerImageLazy
            imageUrl={memoizedData.imageUrl}
            title={memoizedData.title}
            isRTL={memoizedData.isRTL}
            onImageLoad={() => {}} // دالة فارغة للمعاينة
            isPreview={true} // إشارة للمكونات الفرعية أن هذا معاينة
            // تمرير خصائص المنتجات
            selectedProducts={memoizedData.selectedProducts}
            showProducts={memoizedData.showProducts}
            productsDisplay={memoizedData.productsDisplay}
            productsLimit={memoizedData.productsLimit}
            productsType={memoizedData.productsType}
            organizationId={memoizedData.organizationId}
          />

        </div>
      </div>
    </section>
  );
});

PreviewStoreBanner.displayName = 'PreviewStoreBanner';

export default PreviewStoreBanner;
