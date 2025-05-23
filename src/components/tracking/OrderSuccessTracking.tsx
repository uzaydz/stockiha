'use client';

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ProductTrackingWrapper from './ProductTrackingWrapper';

/**
 * مكون تتبع نجاح الطلب
 * يستخدم في صفحة شكراً لتتبع التحويلات المكتملة
 */
export default function OrderSuccessTracking() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  
  // استخراج البيانات من URL parameters
  const orderNumber = searchParams.get('orderNumber');
  const productId = searchParams.get('productId');
  const quantity = parseInt(searchParams.get('quantity') || '1');
  const price = parseFloat(searchParams.get('price') || '0');
  const deliveryFee = parseFloat(searchParams.get('deliveryFee') || '0');
  const totalPrice = parseFloat(searchParams.get('totalPrice') || '0');
  const productName = searchParams.get('productName');

  // التحقق من وجود البيانات المطلوبة
  useEffect(() => {
    if (!productId || !orderNumber) {
      console.warn('⚠️ بيانات الطلب غير مكتملة في URL');
      return;
    }

    console.log('🎉 تتبع طلب مكتمل:', {
      orderNumber,
      productId,
      totalPrice,
      productName
    });
  }, [orderNumber, productId, totalPrice, productName]);

  // إذا لم تكن البيانات متوفرة، لا نعرض شيئاً
  if (!productId || !orderNumber) {
    return null;
  }

  return (
    <ProductTrackingWrapper
      productId={productId}
      orderId={orderNumber}
      eventType="purchase"
      value={totalPrice || (price * quantity + deliveryFee)}
      currency="DZD"
      customData={{
        order_id: orderNumber,
        product_name: productName,
        quantity: quantity,
        unit_price: price,
        delivery_fee: deliveryFee,
        total_price: totalPrice,
        page_type: 'thank_you'
      }}
      loadPixels={false} // البكسلات محملة مسبقاً في صفحة المنتج
    />
  );
}

// Hook للاستخدام في صفحة شكراً
export function useOrderSuccessTracking() {
  const searchParams = new URLSearchParams(useLocation().search);
  
  const orderData = {
    orderNumber: searchParams.get('orderNumber'),
    productId: searchParams.get('productId'),
    quantity: parseInt(searchParams.get('quantity') || '1'),
    price: parseFloat(searchParams.get('price') || '0'),
    deliveryFee: parseFloat(searchParams.get('deliveryFee') || '0'),
    totalPrice: parseFloat(searchParams.get('totalPrice') || '0'),
    productName: searchParams.get('productName')
  };

  const isValid = !!(orderData.orderNumber && orderData.productId && orderData.totalPrice > 0);

  const trackPurchase = async (additionalData?: Record<string, any>) => {
    if (!isValid) return;

    try {
      // إرسال حدث التحويل إلى جميع المنصات
      const response = await fetch('/api/conversion-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: orderData.productId,
          order_id: orderData.orderNumber,
          event_type: 'purchase',
          platform: 'multiple',
          custom_data: {
            ...orderData,
            ...additionalData,
            tracked_at: new Date().toISOString()
          }
        })
      });

      if (response.ok) {
        console.log('✅ تم تسجيل حدث الشراء بنجاح');
      }
    } catch (error) {
      console.error('خطأ في تسجيل حدث الشراء:', error);
    }
  };

  useEffect(() => {
    if (isValid) {
      // تأخير صغير للتأكد من تحميل البكسلات
      setTimeout(trackPurchase, 1000);
    }
  }, [isValid]);

  return {
    orderData,
    isValid,
    trackPurchase
  };
} 