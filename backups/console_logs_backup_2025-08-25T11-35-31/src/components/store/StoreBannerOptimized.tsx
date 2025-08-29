import React, { useState } from 'react';
import { 
  BannerContentLazy, 
  BannerImageLazy,
  HeroData
} from './banner';
import { useBannerData } from './banner/useBannerData';
import { cn } from '@/lib/utils';

/**
 * مكون بانر المتجر المحسّن مع Lazy Loading
 * نسخة محسّنة للأداء مع تحميل تدريجي للمكونات
 */
interface StoreBannerOptimizedProps {
  heroData?: HeroData;
}

const StoreBannerOptimized = React.memo<StoreBannerOptimizedProps>(({ heroData }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // استخدام الـ hook المخصص لمعالجة البيانات
  const processedData = useBannerData(heroData);

  return (
    <section className="relative w-full bg-background overflow-hidden">
      {/* خلفية مبسطة وأنيقة */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/10" />
      
      <div className="relative container mx-auto px-4 navbar-spacer-lg pb-8 sm:navbar-spacer-lg sm:pb-10 md:navbar-spacer md:pb-8 lg:py-12">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center min-h-[40vh] sm:min-h-[50vh] lg:min-h-[60vh]">
          
          {/* قسم المحتوى مع Lazy Loading */}
          <BannerContentLazy
            title={processedData.title}
            description={processedData.description}
            primaryButtonText={processedData.primaryButtonText}
            primaryButtonLink={processedData.primaryButtonLink}
            secondaryButtonText={processedData.secondaryButtonText}
            secondaryButtonLink={processedData.secondaryButtonLink}
            primaryButtonStyle={processedData.primaryButtonStyle}
            secondaryButtonStyle={processedData.secondaryButtonStyle}
            isRTL={processedData.isRTL}
          />

          {/* قسم الصورة مع Lazy Loading */}
          <BannerImageLazy
            imageUrl={processedData.imageUrl}
            title={processedData.title}
            isRTL={processedData.isRTL}
            onImageLoad={() => setImageLoaded(true)}
          />

        </div>
      </div>
    </section>
  );
});

StoreBannerOptimized.displayName = 'StoreBannerOptimized';

export default StoreBannerOptimized;
