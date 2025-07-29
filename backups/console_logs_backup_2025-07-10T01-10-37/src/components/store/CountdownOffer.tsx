import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Tag, ShoppingCart, ChevronLeft } from 'lucide-react';

export interface CountdownOfferProps {
  productId: string;
  productName: string;
  productImage: string;
  productDescription?: string;
  productSlug?: string;
  originalPrice: number;
  discountedPrice: number;
  discountPercentage: number;
  endDate: string | Date;
  currency?: string;
  buttonText?: string;
  showTimer?: boolean;
  layout?: 'horizontal' | 'vertical';
  theme?: 'light' | 'dark' | 'primary';
  className?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const CountdownOffer: React.FC<CountdownOfferProps> = ({
  productId,
  productName,
  productImage,
  productDescription,
  productSlug,
  originalPrice,
  discountedPrice,
  discountPercentage,
  endDate,
  currency = 'دج',
  buttonText = 'تسوق الآن',
  showTimer = true,
  layout = 'horizontal',
  theme = 'light',
  className = '',
}) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState<boolean>(false);

  // حساب الوقت المتبقي للعرض
  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(endDate).getTime() - new Date().getTime();
      
      if (difference <= 0) {
        setIsExpired(true);
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }
      
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    };

    // تحديث الوقت المتبقي فور تحميل المكون
    setTimeLeft(calculateTimeLeft());

    // تحديث الوقت المتبقي كل ثانية
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    // تنظيف المؤقت عند إزالة المكون
    return () => clearInterval(timer);
  }, [endDate]);

  // تحديد فئة CSS استنادًا إلى السمة
  const getThemeClasses = () => {
    switch (theme) {
      case 'dark':
        return 'bg-gray-800 text-white border-gray-700';
      case 'primary':
        return 'bg-primary/10 text-primary-foreground border-primary/30';
      default:
        return 'bg-white text-gray-800 border-gray-200';
    }
  };

  // تنسيق الرقم مع فواصل الآلاف
  const formatNumber = (num: number) => {
    return num.toLocaleString('ar-DZ');
  };

  if (isExpired) {
    return null; // لا تعرض العنصر إذا انتهى العرض
  }

  // رابط المنتج
  const productUrl = productSlug ? `/product-purchase-max-v2/${productSlug}` : `/product-purchase-max-v2/${productId}`;

  return (
    <Card className={`overflow-hidden border ${getThemeClasses()} ${className}`}>
      <CardContent className={`p-0 ${layout === 'horizontal' ? 'flex flex-col md:flex-row' : 'flex flex-col'}`}>
        {/* صورة المنتج */}
        <div className={`relative ${layout === 'horizontal' ? 'md:w-1/2' : 'w-full aspect-[5/3]'}`}>
          <Link to={productUrl}>
            <img 
              src={productImage} 
              alt={productName} 
              className="w-full h-full object-cover"
            />
          </Link>
          
          {/* شارة الخصم */}
          <Badge className="absolute top-2 start-2 bg-red-600 hover:bg-red-700">
            خصم {discountPercentage}%
          </Badge>
        </div>
        
        {/* معلومات المنتج والعد التنازلي */}
        <div className={`flex flex-col justify-between p-4 ${layout === 'horizontal' ? 'md:w-1/2' : 'w-full'}`}>
          {/* معلومات المنتج */}
          <div>
            <Link to={productUrl} className="hover:underline">
              <h3 className="font-bold text-xl mb-2">{productName}</h3>
            </Link>
            
            {productDescription && (
              <p className="text-sm mb-4 line-clamp-2">{productDescription}</p>
            )}
            
            {/* الأسعار */}
            <div className="flex items-center gap-2 mb-4">
              <span className="font-bold text-xl text-red-600">{formatNumber(discountedPrice)} {currency}</span>
              <span className="text-gray-500 line-through text-sm">{formatNumber(originalPrice)} {currency}</span>
            </div>
          </div>
          
          {/* العد التنازلي */}
          {showTimer && (
            <div className="mb-4">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                <Clock className="h-3 w-3" />
                <span>ينتهي العرض بعد:</span>
              </div>
              
              <div className="grid grid-cols-4 gap-1 text-center">
                <div className="bg-gray-100 p-1 rounded-md">
                  <div className="font-mono font-bold">{timeLeft.days}</div>
                  <div className="text-xs text-muted-foreground">يوم</div>
                </div>
                <div className="bg-gray-100 p-1 rounded-md">
                  <div className="font-mono font-bold">{timeLeft.hours}</div>
                  <div className="text-xs text-muted-foreground">ساعة</div>
                </div>
                <div className="bg-gray-100 p-1 rounded-md">
                  <div className="font-mono font-bold">{timeLeft.minutes}</div>
                  <div className="text-xs text-muted-foreground">دقيقة</div>
                </div>
                <div className="bg-gray-100 p-1 rounded-md">
                  <div className="font-mono font-bold">{timeLeft.seconds}</div>
                  <div className="text-xs text-muted-foreground">ثانية</div>
                </div>
              </div>
            </div>
          )}
          
          {/* زر التسوق */}
          <Link to={productUrl}>
            <Button className="w-full gap-2 group">
              <ShoppingCart className="h-4 w-4" />
              <span>{buttonText}</span>
              <ChevronLeft className="h-4 w-4 transition-transform group-hover:translate-x-[-4px]" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default CountdownOffer;
