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
          return;
        }

        // إعادة تعيين علامات التتبع عند تغيير المنتج
        viewContentTrackedRef.current = false;
        addToCartTrackedRef.current = false;
        
        // انتظار توفر الإعدادات من useProductTracking لمدة أقصاها 1 ثانية فقط
        let trackingSettings = (window as any).__productTrackingSettings;
        
        // استخدام Promise-based waiting بدلاً من busy-wait loop
        if (!trackingSettings) {
          trackingSettings = await new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 5; // تقليل المحاولات
            
            const checkSettings = () => {
              const settings = (window as any).__productTrackingSettings;
              if (settings || attempts >= maxAttempts) {
                resolve(settings);
                return;
              }
              attempts++;
              setTimeout(checkSettings, 50); // تقليل التأخير إلى 50ms
            };
            
            checkSettings();
          });
        }
        
        if (process.env.NODE_ENV === 'development') {
        }
        
        // إذا لم تتوفر الإعدادات بعد الانتظار، استخدم إعدادات افتراضية معطلة لتجنب أي جلب إضافي
        if (!trackingSettings) {
          if (process.env.NODE_ENV === 'development') {
          }
          trackingSettings = {
            facebook: { enabled: false },
            google: { enabled: false },
            tiktok: { enabled: false },
            test_mode: true
          } as any;
        }
        
        // إنشاء ConversionTracker مع الإعدادات الموجودة
        // واجهة getConversionTracker تأخذ (productId, settings) فقط
        trackerRef.current = getConversionTracker(productId, trackingSettings);
        
        // إضافة معالج للحدث كنسخة احتياطية
        const handleSettingsUpdate = (event: any) => {
          const updatedSettings = event.detail;
          if (process.env.NODE_ENV === 'development') {
          }
          
          if (trackerRef.current && updatedSettings) {
            trackerRef.current = getConversionTracker(productId, updatedSettings);
          }
        };
        
        window.addEventListener('trackingSettingsReady', handleSettingsUpdate);
        
        setIsTrackerReady(true);
        onTrackingReady?.();
        
        // تنظيف المعالج عند إلغاء التحميل
        return () => {
          window.removeEventListener('trackingSettingsReady', handleSettingsUpdate);
        };
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
        setTrackerError(errorMessage);
        onTrackingError?.(errorMessage);
      }
    };

    initializeTracker();
  }, [productId, organizationId, onTrackingReady, onTrackingError]);

  // تتبع عرض المحتوى (ViewContent) - مع حماية من التكرار ومنع نداءات DB إذا لم تكن الإعدادات جاهزة
  useEffect(() => {
    if (isTrackerReady && trackerRef.current && product && !viewContentTrackedRef.current) {
      const trackViewContent = async () => {
        try {
          // التحقق مرة أخرى قبل الإرسال
          if (viewContentTrackedRef.current) {
            return;
          }

        // وضع علامة فوراً لمنع التكرار
        viewContentTrackedRef.current = true;

        // انتظار بسيط وموثوق للبكسل - إزالة الاعتماد على الأحداث المعقدة
        const waitForPixelReady = async () => {
          return new Promise<void>((resolve) => {
            let attempts = 0;
            const maxAttempts = 10; // 10 محاولات (ثانية واحدة)
            
            const checkPixelReady = () => {
              attempts++;
              
              // فحص توفر أي بكسل (محلي أو على مستوى المتجر)
              const fbqReady = typeof window !== 'undefined' && typeof window.fbq === 'function';
              const gtagReady = typeof window !== 'undefined' && typeof window.gtag === 'function';
              const ttqReady = typeof window !== 'undefined' && typeof (window as any).ttq?.track === 'function';
              
              const anyPixelReady = fbqReady || gtagReady || ttqReady;
              
              if (anyPixelReady || attempts >= maxAttempts) {
                if (anyPixelReady) {
                } else {
                  
                }
                resolve();
                return;
              }
              
              // إعادة المحاولة بعد 100ms
              setTimeout(checkPixelReady, 100);
            };
            
            checkPixelReady();
          });
        };

        await waitForPixelReady();

          // إذا كانت جميع المنصات معطلة ولا توجد بكسلات محمّلة على مستوى المتجر، لا ترسل أي حدث
          const settings = (window as any).__productTrackingSettings;
          const hasEnabledInSettings = !!settings && (
            !!settings.facebook?.enabled || !!settings.google?.enabled || !!settings.tiktok?.enabled
          );
          const hasAnyPixelLoaded = typeof window !== 'undefined' && (
            typeof (window as any).fbq === 'function' ||
            typeof (window as any).gtag === 'function' ||
            typeof (window as any).ttq?.track === 'function'
          );
          if (!hasEnabledInSettings && !hasAnyPixelLoaded) {
            return;
          }

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
              
          
        } catch (error) {
          // إعادة تعيين العلامة في حالة الخطأ
          viewContentTrackedRef.current = false;
        }
      };

      // استخدام requestAnimationFrame بدلاً من setTimeout للأداء الأفضل
      const rafId = requestAnimationFrame(() => {
        setTimeout(trackViewContent, 50); // تقليل التأخير
      });
      return () => cancelAnimationFrame(rafId);
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
      
      toast.success('تم إضافة المنتج للسلة مع تتبع التحويل');
    } catch (error) {
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
      
    } catch (error) {
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
      
      toast.success('تم تتبع عملية الشراء بنجاح!');
    } catch (error) {
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
