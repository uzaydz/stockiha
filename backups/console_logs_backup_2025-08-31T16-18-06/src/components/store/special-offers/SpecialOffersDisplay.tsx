/**
 * مكون عرض العروض الخاصة المضغوط
 * 
 * مثال على الاستخدام:
 * ```tsx
 * import SpecialOffersDisplay from '@/components/store/special-offers/SpecialOffersDisplay';
 * 
 * const [selectedOffer, setSelectedOffer] = useState<SpecialOffer | null>(null);
 * 
 * <SpecialOffersDisplay
 *   config={product.special_offers_config}
 *   basePrice={100}
 *   onSelectOffer={setSelectedOffer}
 *   selectedOfferId={selectedOffer?.id}
 * />
 * ```
 */

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Gift, Crown, Star, TrendingUp, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SpecialOffersConfig, SpecialOffer } from '@/lib/api/productComplete';

interface SpecialOffersDisplayProps {
  config: SpecialOffersConfig;
  basePrice: number;
  onSelectOffer: (offer: SpecialOffer | null) => void;
  selectedOfferId?: string;
  className?: string;
}

const SpecialOffersDisplay: React.FC<SpecialOffersDisplayProps> = ({
  config,
  basePrice,
  onSelectOffer,
  selectedOfferId,
  className
}) => {
  const [expandedOfferId, setExpandedOfferId] = useState<string | null>(null);

  // التحقق من وجود عرض بكمية 1 لتجنب التكرار
  const hasUnitOffer = config.offers?.some(offer => offer.quantity === 1) || false;

  // فحص مؤقت للتشخيص

  if (!config?.enabled || !config.offers || config.offers.length === 0) {
    return null;
  }

  const formatPrice = (price: number, currency: string = config.currency) => {
    return `${price.toLocaleString()} ${currency}`;
  };

  const getBadgeVariant = (color: SpecialOffer['badgeColor']) => {
    switch (color) {
      case 'primary': return 'default';
      case 'success': return 'default';
      case 'warning': return 'secondary';
      case 'danger': return 'destructive';
      default: return 'outline';
    }
  };

  const getOfferIcon = (offer: SpecialOffer) => {
    if (offer.isRecommended) return Crown;
    if (offer.isPopular) return TrendingUp;
    if (offer.bonusQuantity && offer.bonusQuantity > 0) return Package;
    return Gift;
  };

  const toggleExpand = (offerId: string) => {
    setExpandedOfferId(expandedOfferId === offerId ? null : offerId);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* العنوان */}
      <div className="flex items-center gap-2 mb-3">
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-1.5 rounded-lg">
          <Gift className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          عروض خاصة
        </h3>
      </div>

      {/* قائمة العروض المضغوطة */}
      <div className="space-y-2">
        {config.offers.map((offer) => {
          const Icon = getOfferIcon(offer);
          const isSelected = selectedOfferId === offer.id;
          const isExpanded = expandedOfferId === offer.id;

          return (
            <Card 
              key={offer.id}
              className={cn(
                "border transition-all duration-200 cursor-pointer hover:shadow-md",
                isSelected 
                  ? "border-purple-300 bg-purple-50/50 dark:border-purple-600 dark:bg-purple-950/20" 
                  : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
              )}
              onClick={() => onSelectOffer(isSelected ? null : offer)}
              title={`اختر هذا العرض - سيتم تحديث الكمية إلى ${offer.quantity} قطعة`}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  {/* معلومات العرض الأساسية */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={cn(
                        "w-3.5 h-3.5 flex-shrink-0",
                        offer.isRecommended ? "text-yellow-500" :
                        offer.isPopular ? "text-blue-500" :
                        "text-purple-500"
                      )} />
                      
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {offer.quantity}{offer.bonusQuantity ? ` + ${offer.bonusQuantity} مجاناً` : ''} قطعة
                        </span>

                        {offer.badgeText && (
                          <Badge 
                            variant={getBadgeVariant(offer.badgeColor)} 
                            className="text-xs py-0.5 px-1.5"
                          >
                            {offer.badgeText}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* الأسعار - صف واحد مضغوط */}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-bold text-green-600 dark:text-green-400">
                        {formatPrice(offer.discountedPrice)}
                      </span>
                      
                      {config.showSavings && offer.savings > 0 && (
                        <span className="line-through text-gray-400 text-xs">
                          {formatPrice(offer.originalPrice)}
                        </span>
                      )}

                      {offer.discountPercentage > 0 && (
                        <Badge variant="destructive" className="text-xs py-0 px-1">
                          -{offer.discountPercentage}%
                        </Badge>
                      )}
                    </div>

                    {/* ميزات مضغوطة */}
                    {offer.features && offer.features.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {offer.features.slice(0, 2).map((feature, index) => (
                          <span 
                            key={index}
                            className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded"
                          >
                            {feature}
                          </span>
                        ))}
                        {offer.features.length > 2 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-5 px-1 text-purple-600 hover:text-purple-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(offer.id);
                            }}
                          >
                            +{offer.features.length - 2}
                          </Button>
                        )}
                      </div>
                    )}

                    {/* الميزات الموسعة */}
                    {isExpanded && offer.features && offer.features.length > 2 && (
                      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex flex-wrap gap-1">
                          {offer.features.slice(2).map((feature, index) => (
                            <span 
                              key={index}
                              className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded"
                            >
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* مؤشر الاختيار */}
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5",
                    isSelected 
                      ? "border-purple-500 bg-purple-500" 
                      : "border-gray-300 dark:border-gray-600"
                  )}>
                    {isSelected && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                </div>

                {/* معلومات إضافية للعرض المختار */}
                {isSelected && (
                  <div className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-800">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {config.showUnitPrice && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">السعر لكل قطعة:</span>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {formatPrice(offer.pricePerUnit)}
                          </div>
                        </div>
                      )}
                      
                      {config.showSavings && offer.savings > 0 && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">التوفير:</span>
                          <div className="font-medium text-green-600 dark:text-green-400">
                            {formatPrice(offer.savings)}
                          </div>
                        </div>
                      )}
                    </div>

                    {offer.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                        {offer.description}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* خيار العدم (شراء قطعة واحدة) - يُخفى إذا كان هناك عرض بكمية 1 */}
      {!hasUnitOffer && (
        <Card 
          className={cn(
            "border transition-all duration-200 cursor-pointer hover:shadow-md",
            !selectedOfferId 
              ? "border-gray-400 bg-gray-50 dark:border-gray-500 dark:bg-gray-800/50" 
              : "border-gray-200 hover:border-gray-300 dark:border-gray-700"
          )}
          onClick={() => onSelectOffer(null)}
        >
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-3.5 h-3.5 text-gray-500" />
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    قطعة واحدة
                  </span>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {formatPrice(basePrice)}
                  </div>
                </div>
              </div>

              <div className={cn(
                "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                !selectedOfferId 
                  ? "border-gray-500 bg-gray-500" 
                  : "border-gray-300 dark:border-gray-600"
              )}>
                {!selectedOfferId && (
                  <div className="w-2 h-2 bg-white rounded-full" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SpecialOffersDisplay;
