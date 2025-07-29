import React, { useEffect, useRef, useState, useCallback } from 'react';
import { getConversionTracker } from '@/lib/conversion-tracking/ConversionTracker';
import { toast } from 'sonner';

interface ProductConversionTrackerProps {
  productId: string;
  organizationId?: string;
  product?: {
    id: string;
    name: string;
    pricing?: {
      price: number;
    };
    images?: {
      thumbnail_image?: string;
    };
  };
  selectedColor?: {
    id: string;
    name: string;
  };
  selectedSize?: {
    id: string;
    size_name: string;
  };
  quantity: number;
  userEmail?: string;
  userPhone?: string;
  currency?: string;
  onTrackingReady?: () => void;
  onTrackingError?: (error: string) => void;
}

interface ConversionEvent {
  event_type: 'view_content' | 'add_to_cart' | 'initiate_checkout' | 'purchase';
  product_id: string;
  order_id?: string;
  value?: number;
  currency?: string;
  user_data?: {
    email?: string;
    phone?: string;
    external_id?: string;
  };
  custom_data?: Record<string, any>;
}

export const ProductConversionTracker = React.forwardRef<any, ProductConversionTrackerProps>(({
  productId,
  organizationId,
  product,
  selectedColor,
  selectedSize,
  quantity,
  userEmail,
  userPhone,
  currency = 'DZD',
  onTrackingReady,
  onTrackingError
}, ref) => {
  const [isTrackerReady, setIsTrackerReady] = useState(false);
  const [trackerError, setTrackerError] = useState<string | null>(null);
  const trackerRef = useRef<any>(null);
  const viewContentTrackedRef = useRef(false);
  const addToCartTrackedRef = useRef(false);

  // تهيئة المتتبع
  useEffect(() => {
    const initializeTracker = async () => {
      try {
        if (!productId || !organizationId) {
          console.warn('🚨 تتبع التحويل: productId أو organizationId مفقود');
          return;
        }

        console.log('🔄 تهيئة متتبع التحويل...', { productId, organizationId });
        
        // إعادة تعيين علامات التتبع عند تغيير المنتج
        viewContentTrackedRef.current = false;
        addToCartTrackedRef.current = false;
        
        // الحصول على الإعدادات من useProductTracking إذا كانت متوفرة
        const trackingSettings = (window as any).__productTrackingSettings;
        
        trackerRef.current = getConversionTracker(productId, trackingSettings);
        
        // انتظار تحميل الإعدادات
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setIsTrackerReady(true);
        onTrackingReady?.();
        
        console.log('✅ متتبع التحويل جاهز');
      } catch (error) {
        console.error('❌ خطأ في تهيئة متتبع التحويل:', error);
        const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
        setTrackerError(errorMessage);
        onTrackingError?.(errorMessage);
      }
    };

    initializeTracker();
  }, [productId, organizationId, onTrackingReady, onTrackingError]);

  // تتبع عرض المحتوى (ViewContent) - مع حماية من التكرار
  useEffect(() => {
    if (isTrackerReady && trackerRef.current && product && !viewContentTrackedRef.current) {
      const trackViewContent = async () => {
        try {
          // التحقق مرة أخرى قبل الإرسال
          if (viewContentTrackedRef.current) {
            console.log('⚠️ تم تجاهل ViewContent - تم تتبعه مسبقاً');
            return;
          }

          // وضع علامة فوراً لمنع التكرار
          viewContentTrackedRef.current = true;

          const event: ConversionEvent = {
            event_type: 'view_content',
            product_id: productId,
            value: product.pricing?.price || 0,
            currency,
            user_data: {
              email: userEmail,
              phone: userPhone,
              external_id: `user_${Date.now()}`
            },
            custom_data: {
              content_name: product.name,
              content_category: 'product',
              content_ids: [productId],
              content_type: 'product',
              currency,
              value: product.pricing?.price || 0,
              product_name: product.name,
              product_image: product.images?.thumbnail_image,
              selected_color: selectedColor?.name,
              selected_size: selectedSize?.size_name,
              quantity
            }
          };

          await trackerRef.current.trackEvent(event);
          
          console.log('📊 تم تتبع عرض المحتوى:', event);
        } catch (error) {
          console.error('❌ خطأ في تتبع عرض المحتوى:', error);
          // إعادة تعيين العلامة في حالة الخطأ
          viewContentTrackedRef.current = false;
        }
      };

      // تأخير صغير لتجنب التكرار السريع
      const timeoutId = setTimeout(trackViewContent, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isTrackerReady, product, productId, currency]);

  // دالة تتبع إضافة للسلة
  const trackAddToCart = useCallback(async () => {
    if (!isTrackerReady || !trackerRef.current || !product) return;

    try {
      const event: ConversionEvent = {
        event_type: 'add_to_cart',
        product_id: productId,
        value: (product.pricing?.price || 0) * quantity,
        currency,
        user_data: {
          email: userEmail,
          phone: userPhone,
          external_id: `user_${Date.now()}`
        },
        custom_data: {
          content_name: product.name,
          content_category: 'product',
          content_ids: [productId],
          content_type: 'product',
          currency,
          value: (product.pricing?.price || 0) * quantity,
          product_name: product.name,
          product_image: product.images?.thumbnail_image,
          selected_color: selectedColor?.name,
          selected_size: selectedSize?.size_name,
          quantity
        }
      };

      await trackerRef.current.trackEvent(event);
      addToCartTrackedRef.current = true;
      
      console.log('🛒 تم تتبع إضافة للسلة:', event);
      toast.success('تم إضافة المنتج للسلة مع تتبع التحويل');
    } catch (error) {
      console.error('❌ خطأ في تتبع إضافة للسلة:', error);
    }
  }, [isTrackerReady, product, productId, quantity, currency, userEmail, userPhone, selectedColor, selectedSize]);

  // دالة تتبع بدء الشراء
  const trackInitiateCheckout = useCallback(async (formData?: Record<string, any>) => {
    if (!isTrackerReady || !trackerRef.current || !product) return;

    try {
      const event: ConversionEvent = {
        event_type: 'initiate_checkout',
        product_id: productId,
        value: (product.pricing?.price || 0) * quantity,
        currency,
        user_data: {
          email: userEmail || formData?.email || formData?.customer_email,
          phone: userPhone || formData?.phone || formData?.customer_phone,
          external_id: `checkout_${Date.now()}`
        },
        custom_data: {
          content_name: product.name,
          content_category: 'product',
          content_ids: [productId],
          content_type: 'product',
          currency,
          value: (product.pricing?.price || 0) * quantity,
          product_name: product.name,
          product_image: product.images?.thumbnail_image,
          selected_color: selectedColor?.name,
          selected_size: selectedSize?.size_name,
          quantity,
          checkout_step: 'initiate',
          customer_name: formData?.customer_name || formData?.name,
          customer_phone: formData?.customer_phone || formData?.phone,
          province: formData?.province,
          municipality: formData?.municipality
        }
      };

      await trackerRef.current.trackEvent(event);
      
      console.log('🛍️ تم تتبع بدء الشراء:', event);
    } catch (error) {
      console.error('❌ خطأ في تتبع بدء الشراء:', error);
    }
  }, [isTrackerReady, product, productId, quantity, currency, userEmail, userPhone, selectedColor, selectedSize]);

  // دالة تتبع إتمام الشراء
  const trackPurchase = useCallback(async (orderId: string, totalValue: number, formData?: Record<string, any>) => {
    if (!isTrackerReady || !trackerRef.current || !product) return;

    try {
      const event: ConversionEvent = {
        event_type: 'purchase',
        product_id: productId,
        order_id: orderId,
        value: totalValue,
        currency,
        user_data: {
          email: userEmail || formData?.email || formData?.customer_email,
          phone: userPhone || formData?.phone || formData?.customer_phone,
          external_id: orderId
        },
        custom_data: {
          content_name: product.name,
          content_category: 'product',
          content_ids: [productId],
          content_type: 'product',
          currency,
          value: totalValue,
          product_name: product.name,
          product_image: product.images?.thumbnail_image,
          selected_color: selectedColor?.name,
          selected_size: selectedSize?.size_name,
          quantity,
          order_id: orderId,
          transaction_id: orderId,
          customer_name: formData?.customer_name || formData?.name,
          customer_phone: formData?.customer_phone || formData?.phone,
          province: formData?.province,
          municipality: formData?.municipality
        }
      };

      await trackerRef.current.trackEvent(event);
      
      console.log('💰 تم تتبع إتمام الشراء:', event);
      toast.success('تم تتبع عملية الشراء بنجاح!');
    } catch (error) {
      console.error('❌ خطأ في تتبع إتمام الشراء:', error);
    }
  }, [isTrackerReady, product, productId, quantity, currency, userEmail, userPhone, selectedColor, selectedSize]);

  // إرجاع دوال التتبع للاستخدام في المكون الأب
  React.useImperativeHandle(ref, () => ({
    trackAddToCart,
    trackInitiateCheckout,
    trackPurchase,
    isReady: isTrackerReady,
    hasError: !!trackerError
  }));

  // عرض حالة التتبع في وضع التطوير
  if (process.env.NODE_ENV === 'development') {
    return (
      <div className="fixed bottom-4 right-4 bg-background border border-border rounded-lg p-3 shadow-lg z-50 max-w-xs">
        <div className="text-xs space-y-1">
          <div className="font-semibold text-foreground">🎯 حالة التتبع</div>
          <div className={`flex items-center gap-2 ${isTrackerReady ? 'text-green-600' : 'text-yellow-600'}`}>
            <div className={`w-2 h-2 rounded-full ${isTrackerReady ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
            <span>{isTrackerReady ? 'جاهز' : 'قيد التحميل'}</span>
          </div>
          {trackerError && (
            <div className="text-red-600 text-xs">
              خطأ: {trackerError}
            </div>
          )}
          <div className="text-muted-foreground">
            <div>عرض المحتوى: {viewContentTrackedRef.current ? '✅' : '⏳'}</div>
            <div>إضافة للسلة: {addToCartTrackedRef.current ? '✅' : '⏳'}</div>
          </div>
        </div>
      </div>
    );
  }

  return null;
});

ProductConversionTracker.displayName = 'ProductConversionTracker';

export default ProductConversionTracker; 