import React, { useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { 
  TagIcon, 
  CurrencyDollarIcon,
  CalculatorIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { CompleteProduct, ProductColor, ProductSize, getFinalPrice, getSpecialOfferSummary, SpecialOffer } from '@/lib/api/productComplete';
import { cn } from '@/lib/utils';
import { useProductPurchaseTranslation } from '@/hooks/useProductPurchaseTranslation';
import { useTranslation } from 'react-i18next';

interface ProductPriceDisplayProps {
  product: CompleteProduct;
  quantity: number;
  selectedColor?: ProductColor;
  selectedSize?: ProductSize;
  selectedOffer?: SpecialOffer | null;
  hideSpecialOfferDetails?: boolean; // إخفاء تفاصيل العرض الخاص
  className?: string;
}

const ProductPriceDisplay = memo<ProductPriceDisplayProps>(({ 
  product, 
  quantity, 
  selectedColor, 
  selectedSize,
  selectedOffer,
  hideSpecialOfferDetails = false,
  className
}) => {
  
  // استخدام الترجمة المخصصة
  const { productPriceDisplay } = useProductPurchaseTranslation();
  const { t } = useTranslation();
  
  // تحسين حسابات السعر بـ useMemo
  const priceData = useMemo(() => {
    const priceInfo = getFinalPrice(product, quantity, selectedColor?.id, selectedSize?.id);
    
    // Debug console logs
    console.log('🔍 ProductPriceDisplay Debug:', {
      productName: product.name,
      quantity,
      selectedColor: selectedColor?.name,
      selectedSize: selectedSize?.size_name,
      priceInfo,
      productPricing: product.pricing,
      basePrice: product.pricing?.price,
      compareAtPrice: product.pricing?.compare_at_price,
      hasCompareAtPrice: Boolean(product.pricing?.compare_at_price && product.pricing.compare_at_price > (product.pricing?.price || 0))
    });
    
    // حساب العروض الخاصة
    const offerSummary = getSpecialOfferSummary(product, selectedOffer, quantity);
    
    // استخدام السعر النهائي مع العروض الخاصة إذا كانت مطبقة
    const finalPrice = offerSummary.offerApplied ? offerSummary.finalPrice / offerSummary.finalQuantity : priceInfo.price / quantity;
    const finalQuantity = offerSummary.offerApplied ? offerSummary.finalQuantity : quantity;
    
    const totalPrice = offerSummary.offerApplied ? offerSummary.finalPrice : priceInfo.price;
    const totalOriginalPrice = priceInfo.originalPrice;
    const totalCompareAtPrice = priceInfo.compareAtPrice;
    
    // تنسيق الأسعار
    const formatPrice = (price: number) => {
      return new Intl.NumberFormat('ar-DZ', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }).format(price);
    };

    const result = {
      ...priceInfo,
      price: finalPrice, // استخدام السعر النهائي مع العروض الخاصة
      totalPrice,
      totalOriginalPrice,
      totalCompareAtPrice,
      finalQuantity,
      offerApplied: offerSummary.offerApplied,
      offerSavings: offerSummary.savings,
      selectedOffer,
      formattedPrice: formatPrice(finalPrice),
      formattedOriginalPrice: formatPrice(priceInfo.originalPrice / quantity),
      formattedCompareAtPrice: priceInfo.compareAtPrice ? formatPrice(priceInfo.compareAtPrice / quantity) : undefined,
      formattedTotalPrice: formatPrice(totalPrice),
      formattedTotalOriginalPrice: formatPrice(totalOriginalPrice),
      formattedTotalCompareAtPrice: totalCompareAtPrice ? formatPrice(totalCompareAtPrice) : undefined,
      formattedDiscount: priceInfo.discount ? formatPrice(priceInfo.discount + offerSummary.savings) : (offerSummary.savings > 0 ? formatPrice(offerSummary.savings) : null),
      hasDiscount: (priceInfo.originalPrice / quantity) > finalPrice || offerSummary.offerApplied,
      hasCompareAtDiscount: priceInfo.hasCompareAtPrice && (priceInfo.compareAtPrice! / quantity) > finalPrice,
      discountPercentage: priceInfo.discountPercentage || 0,
      compareAtDiscountPercentage: priceInfo.compareAtDiscountPercentage || 0
    };

    // Debug final calculations
    console.log('📊 Price Calculations Result:', {
      productName: product.name,
      finalPrice,
      originalPricePerUnit: priceInfo.originalPrice / quantity,
      compareAtPricePerUnit: priceInfo.compareAtPrice ? priceInfo.compareAtPrice / quantity : null,
      hasDiscount: result.hasDiscount,
      hasCompareAtDiscount: result.hasCompareAtDiscount,
      discountPercentage: result.discountPercentage,
      compareAtDiscountPercentage: result.compareAtDiscountPercentage,
      willShowDiscount: result.hasCompareAtDiscount && result.formattedCompareAtPrice
    });

    return result;
  }, [product, quantity, selectedColor, selectedSize, selectedOffer]);

  return (
    <div className={cn("space-y-4", className)} data-lov-id="src/components/product/ProductPriceDisplay.tsx">
      {/* البطاقة الرئيسية للسعر - مُبسطة */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-lg overflow-hidden"
      >
        {/* خط علوي ديكوري */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
        
        <div className="p-6">
          {/* السعر المقارن والخصم */}
          {(() => {
            console.log('🎯 Discount Display Check:', {
              productName: product.name,
              hasCompareAtDiscount: priceData.hasCompareAtDiscount,
              formattedCompareAtPrice: priceData.formattedCompareAtPrice,
              shouldShowDiscount: priceData.hasCompareAtDiscount && priceData.formattedCompareAtPrice
            });
            return priceData.hasCompareAtDiscount && priceData.formattedCompareAtPrice;
          })() && (
            <div className="flex items-center justify-between mb-3">
              <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white text-sm px-3 py-1 font-semibold">
                {t('productPricing.specialOffer')} {t('productPricing.discountPercent', { percent: priceData.compareAtDiscountPercentage.toFixed(0) })}
              </Badge>
              <div className="flex items-center gap-2">
                <span className="text-lg text-muted-foreground line-through">
                  {priceData.formattedCompareAtPrice}
                </span>
                <span className="text-sm text-muted-foreground line-through">
                  {productPriceDisplay.currency()}
                </span>
              </div>
            </div>
          )}

          {/* السعر الحالي */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CurrencyDollarIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">{productPriceDisplay.price()}</h3>
                {priceData.isWholesale && (
                  <Badge variant="outline" className="text-xs mt-1">
                    <TagIcon className="w-3 h-3 ml-1" />
                    سعر الجملة
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="text-right">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-primary">
                  {priceData.formattedPrice}
                </span>
                <span className="text-lg font-bold text-primary/70">
                  {productPriceDisplay.currency()}
                </span>
              </div>
            </div>
          </div>

          {/* رسالة التوفير المختصرة - يُخفى عند تفعيل hideSpecialOfferDetails */}
          {!hideSpecialOfferDetails && (priceData.hasCompareAtDiscount || priceData.offerApplied) && (
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200/50 dark:border-green-700/50">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-green-800 dark:text-green-200 font-semibold text-sm">
                  {priceData.offerApplied && priceData.selectedOffer ? (
                    <>{t('productPricing.specialOffer')}: {priceData.selectedOffer.name} - {t('productPricing.save')} {priceData.offerSavings.toLocaleString('ar-DZ')} {t('productPricing.currency')}</>
                  ) : (
                    <>{t('productPricing.save')} {((priceData.compareAtPrice! / quantity - priceData.price) * quantity).toLocaleString('ar-DZ')} {t('productPricing.currency')}</>
                  )}
                </span>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* إجمالي السعر للكمية - مُبسط - يُخفى عند تفعيل hideSpecialOfferDetails */}
      {!hideSpecialOfferDetails && (quantity > 1 || priceData.offerApplied) && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CalculatorIcon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <span className="text-base font-semibold text-foreground">المجموع الكلي</span>
                <p className="text-xs text-muted-foreground">
                  {priceData.offerApplied ? (
                    <>لعدد {priceData.finalQuantity} قطع (طلبت {quantity})</>
                  ) : (
                    <>لعدد {quantity} قطع</>
                  )}
                </p>
              </div>
            </div>
            
            <div className="text-right">
              {priceData.hasCompareAtDiscount && priceData.formattedTotalCompareAtPrice && (
                <div className="text-sm text-muted-foreground line-through mb-1">
                  {priceData.formattedTotalCompareAtPrice} {productPriceDisplay.currency()}
                </div>
              )}
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-primary">
                  {priceData.formattedTotalPrice}
                </span>
                <span className="text-sm font-bold text-primary/70">
                  {productPriceDisplay.currency()}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
});

ProductPriceDisplay.displayName = 'ProductPriceDisplay';

export default ProductPriceDisplay;
