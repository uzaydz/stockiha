import React from 'react';
import { ShippingProviderSettings } from '../types'; // Assuming types.ts is one level up

interface OrderSummaryProps {
  productId: string;
  quantity: number;
  basePrice: number;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  hasFreeShipping: boolean;
  total: number;
  isLoadingDeliveryFee: boolean;
  productColorName?: string | null;
  productSizeName?: string | null;
  // Optional: Pass more product details if needed for display
  // productName?: string;
  // productImage?: string;
  deliveryType?: 'home' | 'desk';
  shippingProviderSettings?: ShippingProviderSettings;
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({
  productId,
  quantity,
  basePrice,
  subtotal,
  discount,
  deliveryFee,
  hasFreeShipping,
  total,
  isLoadingDeliveryFee,
  productColorName,
  productSizeName,
  deliveryType,
  shippingProviderSettings,
}) => {
  return (
    <div className="bg-gradient-to-br from-primary/5 via-transparent to-primary/5 rounded-2xl p-6 space-y-4">
      {/* عنوان ملخص الطلب */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-primary/10 rounded-xl">
          <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold">ملخص الطلب</h3>
      </div>

      {/* تفاصيل المنتج */}
      {(productColorName || productSizeName) && (
        <div className="bg-background/50 rounded-xl p-4 space-y-2">
          {productColorName && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">اللون:</span>
              <span className="font-medium">{productColorName}</span>
            </div>
          )}
          {productSizeName && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">الحجم:</span>
              <span className="font-medium">{productSizeName}</span>
            </div>
          )}
        </div>
      )}

      {/* تفاصيل الأسعار */}
      <div className="space-y-3">
        {/* سعر المنتج */}
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">المنتج ({quantity} قطعة)</span>
          <span className="font-medium">{basePrice * quantity} دج</span>
        </div>

        {/* الخصم */}
        {discount > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">الخصم</span>
            <span className="font-medium text-green-600">-{discount} دج</span>
          </div>
        )}

        {/* رسوم التوصيل */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">رسوم التوصيل</span>
            {deliveryType && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                {deliveryType === 'home' ? 'للمنزل' : 'للمكتب'}
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
            <span className="font-medium">{deliveryFee} دج</span>
          )}
        </div>

        {/* شركة التوصيل */}
        {shippingProviderSettings?.name && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">شركة التوصيل</span>
            <span className="font-medium">{shippingProviderSettings.name}</span>
          </div>
        )}
      </div>

      {/* خط فاصل */}
      <div className="h-px bg-border/50" />

      {/* المجموع الكلي */}
      <div className="flex justify-between items-center">
        <span className="text-lg font-semibold">المجموع الكلي</span>
        <div className="text-right">
          <span className="text-2xl font-bold text-primary">{total}</span>
          <span className="text-lg font-semibold text-primary mr-1">دج</span>
        </div>
      </div>
    </div>
  );
};
