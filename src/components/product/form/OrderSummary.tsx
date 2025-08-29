import React, { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import ProductVariantInfo from './ProductVariantInfo';
import PriceDisplayRow from './PriceDisplayRow';
import { ProductColor, ProductSize } from '@/types/productForm';

interface OrderSummaryProps {
  selectedColor?: ProductColor;
  selectedSize?: ProductSize;
  deliveryFee?: number;
  subtotal?: number;
  total?: number;
  quantity?: number;
  isLoadingDeliveryFee?: boolean;
  isCalculatingDelivery?: boolean;
  selectedProvince?: { id: string; name: string };
  selectedMunicipality?: { id: string; name: string };
}

const OrderSummary = memo<OrderSummaryProps>(({
  selectedColor,
  selectedSize,
  deliveryFee,
  subtotal,
  total,
  quantity,
  isLoadingDeliveryFee,
  isCalculatingDelivery,
  selectedProvince,
  selectedMunicipality
}) => {
  const { t } = useTranslation();

  // حساب الأسعار مع useMemo
  const calculatedPrices = useMemo(() => {
    let basePrice = 0;
    
    if (subtotal && subtotal > 0) {
      basePrice = subtotal / (quantity || 1);
    }
    
    const productQuantity = quantity || 1;
    const productTotal = subtotal && subtotal > 0 ? subtotal : (basePrice * productQuantity);
    const deliveryCost = deliveryFee !== undefined ? deliveryFee : 0;
    const grandTotal = total && total > 0 ? total : (productTotal + deliveryCost);
    
    const hasLocationData = Boolean(selectedProvince && selectedMunicipality);
    const showAsFree = hasLocationData && deliveryFee === 0;
    
    return {
      productQuantity,
      productTotal,
      deliveryCost,
      grandTotal,
      hasDeliveryFee: deliveryFee !== undefined,
      isFreeDelivery: showAsFree,
      noLocationSelected: !hasLocationData,
      hasLocationData
    };
  }, [subtotal, quantity, deliveryFee, total, selectedProvince?.id, selectedMunicipality?.id]);

  // تنسيق السعر
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ar-DZ', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(price);
  };

  // عرض سعر التوصيل
  const deliveryPriceDisplay = useMemo(() => {
    const loadingDelivery = isLoadingDeliveryFee || isCalculatingDelivery;
    
    if (loadingDelivery) {
      return (
        <span className="text-sm text-muted-foreground animate-pulse flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {t('form.calculating')}
        </span>
      );
    }
    
    if (calculatedPrices.noLocationSelected) {
      return (
        <div className="text-sm text-amber-600 font-medium">
          <div className="bg-amber-50 text-amber-700 px-2 py-1 rounded text-xs">
            {t('form.selectLocationFirst')}
          </div>
        </div>
      );
    }
    
    if (calculatedPrices.isFreeDelivery) {
      return (
        <span className="font-medium text-green-600 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {t('form.free')}
        </span>
      );
    }
    
    return (
      <span className="font-semibold text-foreground">
        {formatPrice(calculatedPrices.deliveryCost)} {t('form.currency')}
      </span>
    );
  }, [isLoadingDeliveryFee, isCalculatingDelivery, calculatedPrices, t]);

  // الأيقونات
  const icons = useMemo(() => ({
    delivery: (
      <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    product: (
      <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    ),
    total: (
      <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
      </svg>
    )
  }), []);

  return (
    <div className="bg-gradient-to-br from-primary/5 to-transparent p-5 rounded-2xl border border-primary/20">
      <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        {t('form.orderSummary')}
      </h3>
      
      <ProductVariantInfo 
        selectedColor={selectedColor}
        selectedSize={selectedSize}
        t={t}
      />
      
      <div className="space-y-3">
        <PriceDisplayRow
          icon={icons.delivery}
          label={t('form.deliveryPrice')}
          value={deliveryPriceDisplay}
          loading={isLoadingDeliveryFee || isCalculatingDelivery}
        />

        <PriceDisplayRow
          icon={icons.product}
          label={`${t('form.productPrice')} (${formatPrice(calculatedPrices.productQuantity)} ${calculatedPrices.productQuantity === 1 ? t('form.piece') : t('form.pieces')})`}
          value={`${formatPrice(calculatedPrices.productTotal)} ${t('form.currency')}`}
        />

        <div className="flex items-center justify-between py-3 mt-4 pt-4 border-t-2 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent rounded-lg px-3">
          <div className="flex items-center gap-2">
            {icons.total}
            <span className="font-bold text-primary">{t('form.totalCost')}</span>
          </div>
          <div className="text-right">
            {calculatedPrices.noLocationSelected ? (
              <div className="text-right">
                <span className="text-xl font-bold text-primary">
                  {formatPrice(calculatedPrices.productTotal)} {t('form.currency')}
                </span>
                <div className="text-xs text-muted-foreground mt-1">
                  <div>+ {t('form.deliveryFees')}</div>
                </div>
              </div>
            ) : (
              <span className="text-xl font-bold text-primary">
                {formatPrice(calculatedPrices.grandTotal)} {t('form.currency')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

OrderSummary.displayName = 'OrderSummary';

export default OrderSummary;
