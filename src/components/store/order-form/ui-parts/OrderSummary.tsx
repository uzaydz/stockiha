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
  // TODO: Implement the order summary UI
  return (
    <div className="p-4 border rounded-lg space-y-2">
      <h3 className="text-lg font-semibold">ملخص الطلب</h3>
      <div className="flex justify-between">
        <span>المنتج (x{quantity})</span>
        <span>{basePrice * quantity} دج</span>
      </div>
      {discount > 0 && (
        <div className="flex justify-between text-green-600">
          <span>الخصم</span>
          <span>-{discount} دج</span>
        </div>
      )}
      <div className="flex justify-between">
        <span>رسوم التوصيل</span>
        {isLoadingDeliveryFee ? (
          <span>جاري الحساب...</span>
        ) : hasFreeShipping ? (
          <span className="text-green-600">مجاني (عرض خاص)</span>
        ) : (
          <span>{deliveryFee} دج</span>
        )}
      </div>
      <hr />
      <div className="flex justify-between font-bold text-xl">
        <span>المجموع</span>
        <span>{total} دج</span>
      </div>
       {productColorName && <p className='text-sm text-gray-600'>اللون: {productColorName}</p>}
      {productSizeName && <p className='text-sm text-gray-600'>الحجم: {productSizeName}</p>}
      {deliveryType && <p className='text-sm text-gray-600'>نوع التوصيل: {deliveryType === 'home' ? 'للمنزل' : 'للمكتب'}</p>}
      {shippingProviderSettings?.name && <p className='text-sm text-gray-600'>شركة التوصيل: {shippingProviderSettings.name}</p>}
    </div>
  );
};
