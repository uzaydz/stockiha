import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  Crown, 
  Star, 
  Truck, 
  Gift,
  TrendingUp,
  CheckCircle,
  Zap
} from 'lucide-react';
import { SpecialOffer, SpecialOffersConfig } from '@/types/specialOffers';
import { cn } from '@/lib/utils';

interface SpecialOffersPreviewProps {
  config: SpecialOffersConfig;
  productName: string;
  productImage?: string;
}

const SpecialOffersPreview: React.FC<SpecialOffersPreviewProps> = ({
  config,
  productName,
  productImage
}) => {
  const [selectedOffer, setSelectedOffer] = useState<string | null>(
    config.offers.find(offer => offer.isRecommended)?.id || config.offers[0]?.id || null
  );

  if (!config.enabled || config.offers.length === 0) {
    return null;
  }

  const currentOffer = config.offers.find(offer => offer.id === selectedOffer);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">اختر العرض المناسب لك</h2>
        <p className="text-muted-foreground">
          احصل على توفير أكبر مع الكميات الأكثر
        </p>
      </div>

      {/* العروض */}
      <RadioGroup 
        value={selectedOffer || ''} 
        onValueChange={setSelectedOffer}
        className="grid gap-4"
      >
        {config.offers.map((offer, index) => (
          <motion.div
            key={offer.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Label 
              htmlFor={offer.id}
              className="cursor-pointer"
            >
              <Card className={cn(
                "relative overflow-hidden transition-all duration-300 hover:shadow-lg",
                selectedOffer === offer.id 
                  ? "ring-2 ring-primary shadow-lg" 
                  : "hover:shadow-md",
                offer.isRecommended && "border-green-500/50",
                offer.isPopular && "border-orange-500/50"
              )}>
                {/* خلفية متدرجة للعروض المميزة */}
                {(offer.isRecommended || offer.isPopular) && (
                  <div className={cn(
                    "absolute inset-0 opacity-5",
                    offer.isRecommended && "bg-gradient-to-br from-green-500 to-emerald-500",
                    offer.isPopular && "bg-gradient-to-br from-orange-500 to-yellow-500"
                  )} />
                )}

                {/* شارات */}
                <div className="absolute top-4 left-4 z-10 flex gap-2">
                  {offer.isRecommended && (
                    <Badge className="bg-green-500 text-white flex items-center gap-1 shadow-lg">
                      <Crown className="w-3 h-3" />
                      الأفضل
                    </Badge>
                  )}
                  {offer.isPopular && (
                    <Badge className="bg-orange-500 text-white flex items-center gap-1 shadow-lg">
                      <Star className="w-3 h-3" />
                      شائع
                    </Badge>
                  )}
                  {offer.badgeText && (
                    <Badge 
                      variant={offer.badgeColor as any} 
                      className="flex items-center gap-1 shadow-lg"
                    >
                      <Zap className="w-3 h-3" />
                      {offer.badgeText}
                    </Badge>
                  )}
                </div>

                {/* Radio Button */}
                <div className="absolute top-4 right-4 z-10">
                  <RadioGroupItem 
                    value={offer.id} 
                    id={offer.id}
                    className="w-5 h-5"
                  />
                </div>

                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
                    {/* معلومات العرض */}
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold">{offer.name}</h3>
                      {offer.description && (
                        <p className="text-sm text-muted-foreground">
                          {offer.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <Gift className="w-4 h-4 text-primary" />
                        <span className="font-semibold">
                          {offer.quantity} قطع
                          {offer.bonusQuantity && offer.bonusQuantity > 0 && (
                            <span className="text-green-600"> + {offer.bonusQuantity} مجاناً</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* السعر */}
                    <div className="text-center space-y-2">
                      {offer.originalPrice !== offer.discountedPrice && (
                        <div className="space-y-1">
                          <div className="text-lg text-muted-foreground line-through">
                            {offer.originalPrice.toLocaleString()} {config.currency}
                          </div>
                          <Badge variant="destructive" className="text-xs">
                            -{offer.discountPercentage}%
                          </Badge>
                        </div>
                      )}
                      <div className="text-2xl font-bold text-primary">
                        {offer.discountedPrice.toLocaleString()} {config.currency}
                      </div>
                      {config.showUnitPrice && (
                        <div className="text-sm text-muted-foreground">
                          {offer.pricePerUnit.toLocaleString()} {config.currency}/قطعة
                        </div>
                      )}
                    </div>

                    {/* التوفير */}
                    {config.showSavings && offer.savings > 0 && (
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2 text-green-600 mb-1">
                          <TrendingUp className="w-5 h-5" />
                          <span className="font-bold">توفير</span>
                        </div>
                        <div className="text-xl font-bold text-green-600">
                          {offer.savings.toLocaleString()} {config.currency}
                        </div>
                      </div>
                    )}

                    {/* الميزات */}
                    <div className="space-y-2">
                      {offer.freeShipping && (
                        <div className="flex items-center gap-2 text-green-600">
                          <Truck className="w-4 h-4" />
                          <span className="text-sm font-medium">التوصيل مجاني</span>
                        </div>
                      )}
                      {offer.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Label>
          </motion.div>
        ))}
      </RadioGroup>

      {/* ملخص العرض المختار */}
      {currentOffer && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-xl p-6 border border-primary/20"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h3 className="text-lg font-bold">العرض المختار: {currentOffer.name}</h3>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>الكمية: {currentOffer.quantity} قطع</span>
                {currentOffer.bonusQuantity && currentOffer.bonusQuantity > 0 && (
                  <span className="text-green-600">+ {currentOffer.bonusQuantity} مجاناً</span>
                )}
                <span>السعر: {currentOffer.discountedPrice.toLocaleString()} {config.currency}</span>
                {currentOffer.savings > 0 && (
                  <span className="text-green-600">توفير: {currentOffer.savings.toLocaleString()} {config.currency}</span>
                )}
              </div>
            </div>
            <Button size="lg" className="px-8">
              اختيار هذا العرض
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default SpecialOffersPreview; 