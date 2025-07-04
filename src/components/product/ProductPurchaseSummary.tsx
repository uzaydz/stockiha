import React, { memo, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  ShoppingCartIcon, 
  CubeIcon, 
  TruckIcon, 
  CalculatorIcon,
  TagIcon,
  CurrencyDollarIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { useProductPurchaseTranslation } from '@/hooks/useProductPurchaseTranslation';

interface ProductPurchaseSummaryProps {
  // بيانات المنتج
  productName?: string;
  productImage?: string;
  basePrice: number;
  quantity: number;
  
  // بيانات الألوان والأحجام
  selectedColor?: {
    name: string;
    value: string;
    price_modifier?: number;
  };
  selectedSize?: {
    name: string;
    value: string;
    price_modifier?: number;
  };
  
  // بيانات التسعير
  subtotal: number;
  discount?: number;
  deliveryFee?: number;
  total: number;
  
  // بيانات التوصيل
  isLoadingDeliveryFee?: boolean;
  deliveryType?: 'home' | 'desk';
  shippingProvider?: {
    name: string;
    logo?: string;
  };
  
  // بيانات الموقع
  selectedProvince?: {
    id: number;
    name: string;
  };
  selectedMunicipality?: {
    id: number;
    name: string;
  };
  
  // بيانات العملة
  currency?: string;
  className?: string;
}

// تحسين الانميشن للأداء
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
      staggerChildren: 0.1
    }
  }
};

const sectionVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.3,
      ease: "easeOut"
    }
  }
};

const ProductPurchaseSummary = memo<ProductPurchaseSummaryProps>(({
  productName,
  productImage,
  basePrice,
  quantity,
  selectedColor,
  selectedSize,
  subtotal,
  discount = 0,
  deliveryFee = 0,
  total,
  isLoadingDeliveryFee = false,
  deliveryType,
  shippingProvider,
  selectedProvince,
  selectedMunicipality,
  currency = 'دج',
  className = ''
}) => {
  const { productPurchaseSummary } = useProductPurchaseTranslation();

  // تحسين تنسيق السعر بـ useCallback
  const formatPrice = useCallback((price: number) => {
    return new Intl.NumberFormat('ar-DZ', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(price);
  }, []);

  const hasFreeShipping = deliveryFee === 0;

  return (
    <div className={cn("bg-gradient-to-br from-primary/5 via-transparent to-primary/5 rounded-2xl p-6 space-y-4", className)}>
      {/* عنوان ملخص الطلب */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-primary/10 rounded-xl">
          <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold">{productPurchaseSummary.orderSummary()}</h3>
      </div>

      {/* تفاصيل المنتج (الألوان والأحجام) */}
      {(selectedColor || selectedSize) && (
        <div className="bg-background/50 rounded-xl p-4 space-y-2">
          {selectedColor && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{productPurchaseSummary.color()}:</span>
              <span className="font-medium">{selectedColor.name}</span>
            </div>
          )}
          {selectedSize && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{productPurchaseSummary.size()}:</span>
              <span className="font-medium">{selectedSize.name}</span>
            </div>
          )}
        </div>
      )}

      {/* تفاصيل الأسعار */}
      <div className="space-y-3">
        {/* سعر المنتج */}
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">{productPurchaseSummary.productPrice()} ({quantity} قطعة):</span>
          <span className="font-medium">{formatPrice(basePrice * quantity)} {currency}</span>
        </div>

        {/* الخصم */}
        {discount > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">الخصم</span>
            <span className="font-medium text-green-600">-{formatPrice(discount)} {currency}</span>
          </div>
        )}

        {/* رسوم التوصيل */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{productPurchaseSummary.deliveryFees()}:</span>
            {deliveryType && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                {deliveryType === 'home' ? productPurchaseSummary.toHome() : productPurchaseSummary.toOffice()}
              </span>
            )}
          </div>
          {isLoadingDeliveryFee ? (
            <span className="text-sm text-muted-foreground animate-pulse">جاري الحساب...</span>
          ) : hasFreeShipping ? (
            <span className="font-medium text-green-600 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              مجاني
            </span>
          ) : (
            <span className="font-medium">{formatPrice(deliveryFee)} {currency}</span>
          )}
        </div>

        {/* شركة التوصيل */}
        {shippingProvider?.name && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">شركة التوصيل</span>
            <span className="font-medium">{shippingProvider.name}</span>
          </div>
        )}
      </div>

      {/* خط فاصل */}
      <div className="h-px bg-border/50" />

      {/* المجموع الكلي */}
      <div className="flex justify-between items-center">
        <span className="text-lg font-semibold">{productPurchaseSummary.totalAmount()}</span>
        <div className="text-right">
          <span className="text-2xl font-bold text-primary">{formatPrice(total)}</span>
          <span className="text-lg font-semibold text-primary mr-1">{currency}</span>
        </div>
      </div>
    </div>
  );
});

ProductPurchaseSummary.displayName = 'ProductPurchaseSummary';

export { ProductPurchaseSummary };
export default ProductPurchaseSummary;
