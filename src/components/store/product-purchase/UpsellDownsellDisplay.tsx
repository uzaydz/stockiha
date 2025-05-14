import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProductById } from '@/lib/api/products';
import type { UpsellDownsellItem, Product } from '@/lib/api/products';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, Tag, CheckCircle, ChevronLeft, ShoppingCart, Sparkles, Gem, BadgePercent, Crown, Star, ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface UpsellDownsellDisplayProps {
  items: UpsellDownsellItem[];
  type: 'upsell' | 'downsell';
  onAcceptOffer: (acceptedItem: UpsellDownsellItem, finalPrice: number, acceptedProduct: Product) => void;
  originalProductName: string;
}

// Helper function to calculate final price
const calculateFinalPrice = (basePrice: number, discountType: 'percentage' | 'fixed' | 'none', discountValue: number): number => {
  if (discountType === 'percentage') {
    return basePrice * (1 - (discountValue / 100));
  } else if (discountType === 'fixed') {
    return Math.max(0, basePrice - discountValue); // Ensure price doesn't go below 0
  } else {
    return basePrice;
  }
};

const UpsellDownsellDisplay: React.FC<UpsellDownsellDisplayProps> = ({ 
  items, 
  type, 
  onAcceptOffer, 
  originalProductName 
}) => {
  
  const offerItem = items?.[0];
  const [isHovered, setIsHovered] = useState(false);
  const [isHoveredBtn, setIsHoveredBtn] = useState(false);
  const [showPulse, setShowPulse] = useState(false);

  // Fetch product details for the offer
  const { data: suggestedProduct, isLoading, error } = useQuery<Product | null, Error>({
    queryKey: ['product', offerItem?.productId],
    queryFn: () => offerItem?.productId ? getProductById(offerItem.productId) : Promise.resolve(null),
    enabled: !!offerItem?.productId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  useEffect(() => {
    // Add pulsating effect 2 seconds after component mounts
    const timer = setTimeout(() => {
      setShowPulse(true);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);

  if (!offerItem) {
    return null; 
  }

  // Dynamic titles and descriptions based on type with improved marketing language
  const title = type === 'upsell' 
    ? `✨ عرض مميز لك فقط` 
    : `🌟 خيار بديل مناسب`;
  
  const description = type === 'upsell'
    ? `ترقية رائعة! احصل على ${suggestedProduct?.name || 'هذا المنتج المميز'} الذي يتميز بخصائص متقدمة عن ${originalProductName}`
    : `لديك خيار بديل قد يناسب ميزانيتك واحتياجاتك بشكل أفضل`;

  const basePrice = suggestedProduct?.price;
  let finalPrice = basePrice; // Initialize with base price
  let discountText = '';
  let discountPercentage = 0;

  if (basePrice !== null && basePrice !== undefined && offerItem.discountType !== 'none') {
     finalPrice = calculateFinalPrice(basePrice, offerItem.discountType, offerItem.discountValue);
     
     if (offerItem.discountType === 'percentage') {
       discountText = `خصم ${offerItem.discountValue}%`;
       discountPercentage = offerItem.discountValue;
     } else if (offerItem.discountType === 'fixed') {
       discountText = `خصم ${formatCurrency(offerItem.discountValue)}`;
       discountPercentage = Math.round((offerItem.discountValue / basePrice) * 100);
     }
  }

  const handleAcceptClick = () => {
    if (suggestedProduct && finalPrice !== null && finalPrice !== undefined) {
      onAcceptOffer(offerItem, finalPrice, suggestedProduct as Product);
    }
  };

  const IconComponent = type === 'upsell' ? Crown : Star;
  const iconColorClass = type === 'upsell' ? 'text-amber-500' : 'text-blue-500';
  const cardBorderClass = type === 'upsell' ? 'hover:border-amber-300' : 'hover:border-blue-300';
  const buttonVariant = type === 'upsell' ? 'default' : 'outline';
  const buttonHoverClass = type === 'downsell' ? 'hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300' : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <Card 
        className={cn(
          "overflow-hidden border shadow-sm transition-all duration-300 relative",
          isHovered ? (type === 'upsell' ? 'border-amber-300 shadow-amber-100/50' : 'border-blue-300 shadow-blue-100/50') : 'border-border',
          cardBorderClass
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {discountPercentage > 15 && (
          <div className="absolute -top-2 -right-2 z-10">
            <motion.div 
              className="bg-red-500 text-white text-xs font-bold rounded-full h-12 w-12 flex items-center justify-center transform rotate-12 shadow-md border-2 border-white"
              animate={showPulse ? { scale: [1, 1.1, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              خصم {discountPercentage}%
            </motion.div>
          </div>
        )}
        <div className={cn(
          "border-b p-4 flex items-center gap-2",
          type === 'upsell' ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100',
          "dark:bg-opacity-10 dark:border-opacity-10"
        )}>
          <IconComponent className={cn("h-5 w-5", iconColorClass)} />
          <h3 className="font-medium text-foreground">{title}</h3>
        </div>
        <CardContent className="p-0">
          {isLoading && (
            <div className="p-4 flex items-center space-x-4 rtl:space-x-reverse">
              <Skeleton className="h-16 w-16 rounded-md" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            </div>
          )}
          {error && (
            <p className="text-destructive text-sm p-4">خطأ في تحميل تفاصيل المنتج المقترح.</p>
          )}
          {suggestedProduct && finalPrice !== null && finalPrice !== undefined && (
            <div className="flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      <img 
                        src={suggestedProduct.thumbnail_image || '/placeholder.svg'} 
                        alt={suggestedProduct.name}
                        className={cn(
                          "w-20 h-20 object-cover rounded-md border",
                          type === 'upsell' ? 'border-amber-200' : 'border-blue-200'
                        )} 
                      />
                    </motion.div>
                    {discountText && (
                      <span className={cn(
                        "absolute -top-2 -right-2 text-white text-xs rounded-full px-2 py-0.5 font-medium shadow-sm",
                        type === 'upsell' ? 'bg-amber-500' : 'bg-blue-500'
                      )}>
                        {offerItem.discountType === 'percentage' ? `${offerItem.discountValue}%` : ''}
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">{suggestedProduct.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{description}</p>
                    {suggestedProduct.features && suggestedProduct.features.length > 0 && (
                      <div className="mt-2">
                        {suggestedProduct.features.slice(0, 2).map((feature, index) => (
                          <div key={index} className="flex items-center text-xs text-muted-foreground">
                            <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "font-bold text-lg",
                      discountText ? 'text-green-600' : 'text-foreground'
                    )}>
                      {formatCurrency(finalPrice)}
                    </span>
                    {offerItem.discountType !== 'none' && basePrice !== undefined && basePrice !== null && finalPrice !== basePrice && (
                      <span className="text-sm text-muted-foreground line-through">{formatCurrency(basePrice)}</span>
                    )}
                  </div>
                  {discountText && (
                    <Badge variant="outline" className={cn(
                      "bg-opacity-10 border-opacity-20 text-foreground text-xs",
                      type === 'upsell' ? 'bg-amber-500 border-amber-300' : 'bg-blue-500 border-blue-300'
                    )}>
                      <BadgePercent className="ml-1 h-3 w-3 text-primary" /> {discountText}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="p-4 flex justify-between items-center">
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="text-xs text-muted-foreground"
                    >
                      {type === 'upsell' ? 'ترقية ممتازة!' : 'خيار اقتصادي رائع!'}
                    </motion.div>
                  )}
                </AnimatePresence>
                <Button 
                  variant={buttonVariant} 
                  size="sm"
                  onClick={handleAcceptClick}
                  disabled={!suggestedProduct || isLoading}
                  className={cn(
                    "gap-1.5 transition-all duration-300",
                    buttonHoverClass,
                    type === 'upsell' ? 'bg-amber-500 hover:bg-amber-600 text-white border-none' : '',
                    isHoveredBtn && type === 'upsell' ? 'scale-105' : ''
                  )}
                  onMouseEnter={() => setIsHoveredBtn(true)}
                  onMouseLeave={() => setIsHoveredBtn(false)}
                >
                  {type === 'upsell' 
                    ? <ArrowUpRight className="ml-1.5 h-4 w-4"/> 
                    : <ShoppingCart className="ml-1.5 h-4 w-4"/>
                  }
                  {type === 'upsell' ? 'أضف الترقية للسلة' : 'اختيار هذا البديل'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Helper to format currency
const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) {
     return 'السعر غير متوفر';
  }
  return `${amount.toLocaleString()} د.ج`;
};

export default UpsellDownsellDisplay; 