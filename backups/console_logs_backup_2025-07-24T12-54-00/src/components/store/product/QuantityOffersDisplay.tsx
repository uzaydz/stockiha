import type { QuantityOffer } from '@/lib/api/products';
import { Gift, Percent, Truck, CheckCircle, ShoppingBag, BadgePercent, Sparkles, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';

// Interface for actual offer data structure from DB/Config
// This structure should match what comes from product.purchase_page_config.quantityOffers
/*
interface ActualOfferData {
  id: string;
  minQuantity: number; // Expect minQuantity from DB
  type: string;        // Expect type string from DB
  discountValue?: number;
  freeShipping?: boolean; // Keep if potentially present
  giftProductId?: string;
}
*/

interface QuantityOffersDisplayProps {
  offers: QuantityOffer[]; // <-- Use imported QuantityOffer type
  basePrice: number;
  selectedQuantity: number;
  maxQuantity: number;
  onQuantityChange: (quantity: number) => void;
}

// تنسيق نص الكمية بالعربية
const formatQuantityText = (quantity: number): string => {
  if (quantity === 1) return 'قطعة واحدة';
  if (quantity === 2) return 'قطعتين';
  if (quantity >= 3 && quantity <= 10) return `${quantity} قطع`;
  return `${quantity} قطعة`;
};

// الحصول على نص الميزة
const getOfferBenefitText = (offer: QuantityOffer): string | null => {
  if (offer.type === 'free_shipping') {
    return "شحن مجاني";
  } else if (offer.type === 'percentage_discount' && offer.discountValue && offer.discountValue > 0) {
    return `خصم ${offer.discountValue}%`;
  } else if (offer.type === 'fixed_amount_discount' && offer.discountValue && offer.discountValue > 0) {
    return `خصم ${offer.discountValue.toLocaleString()} د.ج`;
  } else if (offer.type === 'buy_x_get_y_free' && offer.freeProductId && offer.discountValue && offer.discountValue > 0) {
    const giftQuantity = offer.discountValue;
    const giftName = offer.freeProductName ? `${offer.freeProductName}` : 'منتج هدية'; 
    return `+ ${formatQuantityText(giftQuantity)} ${giftName} مجاناً`;
  }
  return null;
};

// الحصول على أيقونة مناسبة حسب نوع العرض
const getBenefitIcon = (type: string | null) => {
  switch (type) {
    case 'free_shipping': return <Truck className="h-3.5 w-3.5" />;
    case 'percentage_discount': return <Percent className="h-3.5 w-3.5" />;
    case 'fixed_amount_discount': return <BadgePercent className="h-3.5 w-3.5" />;
    case 'buy_x_get_y_free': return <Gift className="h-3.5 w-3.5" />;
    default: return null;
  }
};

// حساب التوفير بالنسبة المئوية
const calculateSavings = (originalPrice: number, discountedPrice: number): number => {
  return Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);
};

// ألوان وأنماط العروض المختلفة متوافقة مع الوضع المظلم والفاتح
const offerTypeStyles = {
  free_shipping: {
    bg: "bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 dark:from-emerald-800/20 dark:to-emerald-900/10",
    border: "border-emerald-200 dark:border-emerald-800",
    text: "text-emerald-700 dark:text-emerald-400",
    icon: "text-emerald-500 dark:text-emerald-400"
  },
  percentage_discount: {
    bg: "bg-gradient-to-r from-blue-500/10 to-blue-500/5 dark:from-blue-800/20 dark:to-blue-900/10",
    border: "border-blue-200 dark:border-blue-800",
    text: "text-blue-700 dark:text-blue-400",
    icon: "text-blue-500 dark:text-blue-400"
  },
  fixed_amount_discount: {
    bg: "bg-gradient-to-r from-violet-500/10 to-violet-500/5 dark:from-violet-800/20 dark:to-violet-900/10",
    border: "border-violet-200 dark:border-violet-800",
    text: "text-violet-700 dark:text-violet-400",
    icon: "text-violet-500 dark:text-violet-400"
  },
  buy_x_get_y_free: {
    bg: "bg-gradient-to-r from-amber-500/10 to-amber-500/5 dark:from-amber-800/20 dark:to-amber-900/10",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-700 dark:text-amber-400",
    icon: "text-amber-500 dark:text-amber-400"
  }
};

const QuantityOffersDisplay = ({ 
  offers, 
  basePrice, 
  selectedQuantity, 
  maxQuantity, 
  onQuantityChange 
}: QuantityOffersDisplayProps) => {
  const [expanded, setExpanded] = useState(false);
  const [showCount, setShowCount] = useState(3);
  
  // تكييف عدد العروض المعروضة حسب عدد الكلي
  useEffect(() => {
    const totalCount = offers.length + 1; // +1 للخيار الأساسي
    
    if (totalCount <= 3) {
      setShowCount(totalCount);
    } else {
      setShowCount(expanded ? totalCount : 3);
    }
  }, [offers.length, expanded]);
  
  // إنشاء الخيار الأساسي (شراء قطعة واحدة)
  const baseOption = {
    id: 'base',
    quantity: 1,
    totalPrice: basePrice,
    benefit: null,
    isAvailable: maxQuantity >= 1,
    type: null,
    originalOffer: null
  };

  // فرز وتحويل العروض إلى تنسيق قابل للعرض
  const offerOptions = [...offers]
    .sort((a, b) => a.minQuantity - b.minQuantity)
    .map(offer => {
      const benefitText = getOfferBenefitText(offer);
      return {
        id: offer.id,
        quantity: offer.minQuantity,
        totalPrice: basePrice * offer.minQuantity,
        benefit: benefitText,
        isAvailable: maxQuantity >= offer.minQuantity && benefitText !== null,
        type: offer.type,
        originalOffer: offer
      };
    })
    .filter(option => option.isAvailable);

  // دمج الخيار الأساسي مع خيارات العروض
  const allOptions = [baseOption, ...offerOptions];

  // لا تعرض شيئًا إذا كان العرض الوحيد المتاح هو الخيار الأساسي وهو غير متاح
  if (allOptions.length <= 1 && !baseOption.isAvailable) {
    return null;
  }

  // العثور على أفضل عرض (الخيار الموصى به)
  const recommendedOption = allOptions.length > 1 ? 
    allOptions.filter(opt => opt.benefit !== null)
      .reduce((prev, current) => {
        // منطق تحديد أفضل عرض: الأولوية للعروض ذات الكميات الأكبر
        return prev.quantity > current.quantity ? prev : current;
      }, allOptions[0]) 
    : null;

  // حساب أقصى نسبة توفير
  const maxSavingsPercent = recommendedOption?.originalOffer ? 
    calculateSavings(
      recommendedOption.quantity * basePrice,
      recommendedOption.originalOffer.type === 'percentage_discount' 
        ? recommendedOption.totalPrice * (1 - (recommendedOption.originalOffer.discountValue || 0) / 100)
        : recommendedOption.originalOffer.type === 'fixed_amount_discount'
          ? recommendedOption.totalPrice - (recommendedOption.originalOffer.discountValue || 0)
          : recommendedOption.totalPrice
    ) : 0;

  // عرض العناصر المرئية للمستخدم
  const visibleOptions = allOptions.slice(0, showCount);
  const hasMoreOptions = allOptions.length > showCount;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 dark:bg-primary/20">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <h3 className="text-sm font-medium text-foreground dark:text-foreground">اختر الكمية</h3>
        </div>
        {recommendedOption && maxSavingsPercent > 0 && (
          <Badge 
            variant="outline" 
            className="text-xs bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 text-primary dark:text-primary-foreground border-primary/20 dark:border-primary/40 px-2 py-0.5 font-medium"
          >
            وفر حتى {maxSavingsPercent}%
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        <AnimatePresence>
          {visibleOptions.map((option, index) => {
            const isSelected = selectedQuantity === option.quantity;
            const isRecommended = recommendedOption && recommendedOption.id === option.id;
            
            // حساب الخصم والسعر النهائي
            let finalPrice = option.totalPrice;
            let percentOff = 0;
            
            if (option.originalOffer?.type === 'percentage_discount' && option.originalOffer.discountValue) {
              percentOff = option.originalOffer.discountValue;
              finalPrice = option.totalPrice * (1 - (percentOff / 100));
            } else if (option.originalOffer?.type === 'fixed_amount_discount' && option.originalOffer.discountValue) {
              finalPrice = option.totalPrice - option.originalOffer.discountValue;
              percentOff = calculateSavings(option.totalPrice, finalPrice);
            }

            // الحصول على أنماط وألوان العرض المناسبة
            const offerStyle = option.type ? offerTypeStyles[option.type as keyof typeof offerTypeStyles] : null;

            return (
              <motion.div
                key={option.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, delay: 0.03 * index }}
              >
                <div 
                  className={cn(
                    "relative rounded-xl px-3.5 py-3 cursor-pointer transition-all duration-200",
                    "backdrop-blur-sm dark:backdrop-blur-md",
                    "border border-border/60 dark:border-border/30",
                    "hover:shadow-sm dark:hover:shadow-md dark:hover:shadow-black/5",
                    isSelected 
                      ? "ring-1 ring-primary/70 dark:ring-primary/60 bg-primary/5 dark:bg-primary/10"
                      : "hover:border-primary/40 dark:hover:border-primary/30 hover:bg-background/80 dark:hover:bg-background/50",
                    isRecommended && !isSelected && "border-primary/30 dark:border-primary/40 bg-primary/3 dark:bg-primary/5",
                    option.type && !isSelected && offerStyle?.bg
                  )}
                  onClick={() => onQuantityChange(option.quantity)}
                >
                  {/* علامة العرض الموصى به */}
                  {isRecommended && (
                    <div className="absolute top-0 right-3 transform -translate-y-1/2">
                      <Badge 
                        className="bg-gradient-to-r from-primary to-primary/90 dark:from-primary/90 dark:to-primary/70 text-primary-foreground dark:text-primary-foreground text-[10px] px-2 py-0.5 whitespace-nowrap font-medium shadow-sm dark:shadow-black/10"
                      >
                        أفضل قيمة
                      </Badge>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* زر الاختيار */}
                      <div className={cn(
                        "relative h-5 w-5 rounded-full border-2 flex-shrink-0 transition-colors",
                        isSelected 
                          ? "border-primary bg-primary dark:border-primary dark:bg-primary"
                          : "border-muted-foreground/30 dark:border-muted-foreground/50"
                      )}>
                        {isSelected && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="h-2 w-2 rounded-full bg-background dark:bg-background"></div>
                          </div>
                        )}
                      </div>
                      
                      {/* تفاصيل العرض */}
                      <div>
                        <span className={cn(
                          "font-medium text-sm",
                          isSelected ? "text-primary dark:text-primary" : "text-foreground dark:text-foreground"
                        )}>
                          {formatQuantityText(option.quantity)}
                        </span>
                        
                        {/* معلومات العرض */}
                        {option.benefit && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <div className={cn(
                              "rounded-md px-1.5 py-0.5",
                              option.type && offerStyle 
                                ? cn(offerStyle.bg, offerStyle.border, "border") 
                                : "bg-primary/10 dark:bg-primary/20"
                            )}>
                              <span className="flex items-center gap-1 text-xs">
                                <span className={cn(
                                  option.type && offerStyle ? offerStyle.icon : "text-primary dark:text-primary-foreground"
                                )}>
                                  {getBenefitIcon(option.type)}
                                </span>
                                <span className={cn(
                                  "font-medium",
                                  option.type && offerStyle ? offerStyle.text : "text-foreground dark:text-foreground"
                                )}>
                                  {option.benefit}
                                </span>
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* معلومات السعر */}
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1.5">
                        {percentOff > 0 && (
                          <Badge className="bg-green-500/10 dark:bg-green-600/20 text-green-600 dark:text-green-400 border-0 px-1.5 py-0.5 text-[10px] font-medium">
                            - {percentOff}%
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex flex-col items-end mt-0.5">
                        {finalPrice !== option.totalPrice && (
                          <span className="text-xs line-through text-muted-foreground dark:text-muted-foreground/80">
                            {option.totalPrice.toLocaleString()} <span className="text-[10px]">د.ج</span>
                          </span>
                        )}
                        <span className={cn(
                          "font-medium text-sm",
                          finalPrice !== option.totalPrice ? "text-green-600 dark:text-green-400" : "",
                          isSelected ? "text-primary dark:text-primary" : "text-foreground dark:text-foreground"
                        )}>
                          {finalPrice.toLocaleString()} <span className="text-xs">د.ج</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {/* زر عرض المزيد من الخيارات */}
        {hasMoreOptions && (
          <div className="mt-2">
            <button
              type="button"
              className="flex items-center justify-center w-full text-xs text-muted-foreground dark:text-muted-foreground/80 hover:text-primary dark:hover:text-primary transition-colors py-1.5"
              onClick={() => setExpanded(!expanded)}
            >
              <ChevronUp className={`h-4 w-4 mr-1.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
              {expanded ? "عرض أقل" : `عرض المزيد (${allOptions.length - showCount})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuantityOffersDisplay;
