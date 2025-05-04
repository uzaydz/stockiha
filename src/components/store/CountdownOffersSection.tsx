import React from 'react';
import CountdownOffer from './CountdownOffer';

export interface CountdownOfferItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  productDescription?: string;
  productSlug?: string;
  originalPrice: number;
  discountedPrice: number;
  discountPercentage: number;
  endDate: string | Date;
}

export interface CountdownOffersSectionProps {
  title?: string;
  subtitle?: string;
  offers: CountdownOfferItem[];
  currency?: string;
  layout?: 'grid' | 'slider' | 'featured';
  maxItems?: number;
  buttonText?: string;
  theme?: 'light' | 'dark' | 'primary';
  showViewAll?: boolean;
  viewAllUrl?: string;
  className?: string;
}

const CountdownOffersSection: React.FC<CountdownOffersSectionProps> = ({
  title = 'عروض محدودة',
  subtitle = 'عروض حصرية متاحة لفترة محدودة',
  offers = [],
  currency = 'دج',
  layout = 'grid',
  maxItems = 3,
  buttonText = 'تسوق الآن',
  theme = 'light',
  showViewAll = false,
  viewAllUrl = '/offers',
  className = '',
}) => {
  // التحقق من وجود عروض نشطة (لم تنته بعد)
  const activeOffers = offers.filter(offer => new Date(offer.endDate) > new Date());
  
  // إذا لم تكن هناك عروض نشطة، لا تعرض القسم
  if (!activeOffers.length) {
    return null;
  }
  
  // تحديد التخطيط والأنماط استنادًا إلى خيارات التخطيط
  const getSectionLayout = () => {
    switch (layout) {
      case 'slider':
        return 'flex overflow-x-auto gap-4 pb-4 snap-x';
      case 'featured':
        return 'grid grid-cols-1 md:grid-cols-3 gap-6';
      case 'grid':
      default:
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
    }
  };
  
  const getItemClass = () => {
    if (layout === 'slider') {
      return 'min-w-[300px] md:min-w-[350px] snap-start';
    }
    if (layout === 'featured' && activeOffers.length >= 3) {
      return 'col-span-1 md:col-span-3 md:first:row-span-2 md:first:col-span-2';
    }
    return '';
  };
  
  const getOfferLayout = (index: number) => {
    if (layout === 'featured' && index === 0) {
      return 'horizontal';
    }
    return 'vertical';
  };

  // تحديد عدد العناصر التي سيتم عرضها
  const displayOffers = activeOffers.slice(0, maxItems);

  return (
    <div className={`py-8 ${className}`}>
      {/* العنوان والوصف */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
      </div>
      
      {/* عرض العناصر */}
      <div className={getSectionLayout()}>
        {displayOffers.map((offer, index) => (
          <div key={offer.id} className={getItemClass()}>
            <CountdownOffer
              productId={offer.productId}
              productName={offer.productName}
              productImage={offer.productImage}
              productDescription={offer.productDescription}
              productSlug={offer.productSlug}
              originalPrice={offer.originalPrice}
              discountedPrice={offer.discountedPrice}
              discountPercentage={offer.discountPercentage}
              endDate={offer.endDate}
              currency={currency}
              buttonText={buttonText}
              layout={getOfferLayout(index)}
              theme={theme}
            />
          </div>
        ))}
      </div>
      
      {/* زر "عرض الكل" */}
      {showViewAll && activeOffers.length > maxItems && (
        <div className="text-center mt-8">
          <a 
            href={viewAllUrl} 
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-muted hover:bg-muted/80 transition-colors"
          >
            عرض جميع العروض
          </a>
        </div>
      )}
    </div>
  );
};

export default CountdownOffersSection; 