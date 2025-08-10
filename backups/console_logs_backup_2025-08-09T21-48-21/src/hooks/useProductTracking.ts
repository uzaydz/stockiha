import { useEffect, useRef, useCallback, useState } from 'react';

interface TrackingSettings {
  facebook: {
    enabled: boolean;
    pixel_id?: string;
    conversion_api_enabled?: boolean;
    access_token?: string;
    test_event_code?: string;
  };
  google: {
    enabled: boolean;
    gtag_id?: string;
    ads_conversion_id?: string;
    ads_conversion_label?: string;
  };
  tiktok: {
    enabled: boolean;
    pixel_id?: string;
    events_api_enabled?: boolean;
    access_token?: string;
    test_event_code?: string;
  };
  test_mode: boolean;
}

interface ProductTrackingOptions {
  productId: string;
  organizationId?: string;
  autoLoadSettings?: boolean;
  enableDebugMode?: boolean;
}

interface TrackingEvent {
  event_type: 'view_content' | 'add_to_cart' | 'initiate_checkout' | 'purchase';
  product_id: string;
  order_id?: string;
  value?: number;
  currency?: string;
  user_data?: {
    email?: string;
    phone?: string;
    external_id?: string;
    firstName?: string;
    lastName?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  custom_data?: Record<string, any>;
}

export const useProductTracking = (options: ProductTrackingOptions) => {
  const { productId, organizationId, autoLoadSettings = true, enableDebugMode = true } = options;
  
  const [settings, setSettings] = useState<TrackingSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedPixels, setLoadedPixels] = useState<string[]>([]);
  
  const trackerRef = useRef<any>(null);
  const settingsLoadedRef = useRef(false);

  // استخراج إعدادات التتبع من كائن منتج مكتمل البيانات (بدون أي نداء شبكة)
  const setSettingsFromProduct = useCallback((productLike: any) => {
    try {
      if (!productLike) return false;
      const marketingSettings = productLike?.marketing_settings || productLike?.data?.product?.marketing_settings || productLike?.product?.marketing_settings;
      if (!marketingSettings) return false;

      const trackingSettings: TrackingSettings = {
        facebook: {
          enabled: marketingSettings.facebook?.enabled || false,
          pixel_id: marketingSettings.facebook?.pixel_id || undefined,
          conversion_api_enabled: marketingSettings.facebook?.conversion_api_enabled || false,
          access_token: marketingSettings.facebook?.access_token || undefined,
          test_event_code: marketingSettings.facebook?.test_event_code || undefined
        },
        google: {
          enabled: marketingSettings.google?.enabled || false,
          gtag_id: marketingSettings.google?.gtag_id || undefined,
          ads_conversion_id: marketingSettings.google?.ads_conversion_id || undefined,
          ads_conversion_label: marketingSettings.google?.ads_conversion_label || undefined
        },
        tiktok: {
          enabled: marketingSettings.tiktok?.enabled || false,
          pixel_id: marketingSettings.tiktok?.pixel_id || undefined,
          events_api_enabled: marketingSettings.tiktok?.events_api_enabled || false,
          access_token: marketingSettings.tiktok?.access_token || undefined,
          test_event_code: marketingSettings.tiktok?.test_event_code || undefined
        },
        test_mode: marketingSettings.test_mode !== false
      };

      setSettings(trackingSettings);
      settingsLoadedRef.current = true;
      try {
        (window as any).__productTrackingSettings = trackingSettings;
        const evt = new CustomEvent('trackingSettingsReady', { detail: trackingSettings });
        window.dispatchEvent(evt);
      } catch {}
      return true;
    } catch {
      return false;
    }
  }, []);

  // تحميل إعدادات التتبع من الخادم
  const loadTrackingSettings = useCallback(async () => {
    if (!productId || !organizationId || settingsLoadedRef.current) {
      return;
    }

    // إذا كان التحميل التلقائي معطل، لا تجلب البيانات
    if (!autoLoadSettings) {
      // استخدام إعدادات افتراضية بدلاً من جلب البيانات
      const defaultSettings: TrackingSettings = {
        facebook: { enabled: false },
        google: { enabled: false },
        tiktok: { enabled: false },
        test_mode: true
      };
      setSettings(defaultSettings);
      settingsLoadedRef.current = true;
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // تعطيل أي جلب للإعدادات: سنعتمد على setSettingsFromProduct أو الإعدادات الافتراضية
      const defaultSettings: TrackingSettings = {
        facebook: { enabled: false },
        google: { enabled: false },
        tiktok: { enabled: false },
        test_mode: true
      };
      setSettings(defaultSettings);
      settingsLoadedRef.current = true;
      (window as any).__productTrackingSettings = defaultSettings;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطأ غير معروف';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [productId, organizationId, enableDebugMode]);

  // تحميل الإعدادات تلقائياً
  useEffect(() => {
    if (autoLoadSettings && productId && organizationId && !settingsLoadedRef.current) {
      loadTrackingSettings();
    }
  }, [autoLoadSettings, productId, organizationId, loadTrackingSettings]);

  // تهيئة المتتبع عند توفر الإعدادات
  useEffect(() => {
    const initializeTracker = async () => {
      if (!settings || trackerRef.current) return;

      try {
        // استيراد ديناميكي للمتتبع
        const { getConversionTracker } = await import('@/lib/conversion-tracking/ConversionTracker');
        trackerRef.current = getConversionTracker(productId, settings);
        
        if (enableDebugMode) {
        }
      } catch (err) {
        setError('فشل في تهيئة متتبع التحويل');
      }
    };

    initializeTracker();
  }, [settings, productId, enableDebugMode]);

  // دالة تتبع الأحداث
  const trackEvent = useCallback(async (event: TrackingEvent) => {
    if (!trackerRef.current) {
      if (enableDebugMode) {
      }
      
      // تأجيل الحدث لمدة قصيرة
      setTimeout(() => trackEvent(event), 1000);
      return;
    }

    try {
      await trackerRef.current.trackEvent(event);
      
      if (enableDebugMode) {
      }
    } catch (err) {
    }
  }, [enableDebugMode]);

  // دوال تتبع محددة
  const trackViewContent = useCallback(async (productData: {
    name: string;
    price?: number;
    image?: string;
    selectedColor?: string;
    selectedSize?: string;
    quantity?: number;
  }) => {
    const event: TrackingEvent = {
      event_type: 'view_content',
      product_id: productId,
      value: productData.price || 0,
      currency: 'DZD',
      custom_data: {
        content_name: productData.name,
        content_category: 'product',
        content_ids: [productId],
        content_type: 'product',
        currency: 'DZD',
        value: productData.price || 0,
        product_name: productData.name,
        product_image: productData.image,
        selected_color: productData.selectedColor,
        selected_size: productData.selectedSize,
        quantity: productData.quantity || 1
      }
    };

    await trackEvent(event);
  }, [productId, trackEvent]);

  const trackAddToCart = useCallback(async (productData: {
    name: string;
    price: number;
    quantity: number;
    image?: string;
    selectedColor?: string;
    selectedSize?: string;
  }) => {
    const event: TrackingEvent = {
      event_type: 'add_to_cart',
      product_id: productId,
      value: productData.price * productData.quantity,
      currency: 'DZD',
      custom_data: {
        content_name: productData.name,
        content_category: 'product',
        content_ids: [productId],
        content_type: 'product',
        currency: 'DZD',
        value: productData.price * productData.quantity,
        product_name: productData.name,
        product_image: productData.image,
        selected_color: productData.selectedColor,
        selected_size: productData.selectedSize,
        quantity: productData.quantity
      }
    };

    await trackEvent(event);
  }, [productId, trackEvent]);

  const trackInitiateCheckout = useCallback(async (productData: {
    name: string;
    price: number;
    quantity: number;
    image?: string;
    selectedColor?: string;
    selectedSize?: string;
  }, customerData?: {
    email?: string;
    phone?: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    city?: string;
    state?: string;
    country?: string;
    province?: string;
    municipality?: string;
  }) => {
    const event: TrackingEvent = {
      event_type: 'initiate_checkout',
      product_id: productId,
      value: productData.price * productData.quantity,
      currency: 'DZD',
      user_data: {
        email: customerData?.email,
        phone: customerData?.phone,
        external_id: `checkout_${Date.now()}`,
        firstName: customerData?.firstName || customerData?.name?.split(' ')[0],
        lastName: customerData?.lastName || customerData?.name?.split(' ').slice(1).join(' '),
        city: customerData?.city || customerData?.municipality,
        state: customerData?.state || customerData?.province,
        country: customerData?.country || 'DZ'
      },
      custom_data: {
        content_name: productData.name,
        content_category: 'product',
        content_ids: [productId],
        content_type: 'product',
        currency: 'DZD',
        value: productData.price * productData.quantity,
        product_name: productData.name,
        product_image: productData.image,
        selected_color: productData.selectedColor,
        selected_size: productData.selectedSize,
        quantity: productData.quantity,
        checkout_step: 'initiate',
        num_items: productData.quantity
      }
    };

    await trackEvent(event);
  }, [productId, trackEvent]);

  const trackPurchase = useCallback(async (
    orderId: string,
    totalValue: number,
    productData: {
      name: string;
      price: number;
      quantity: number;
      image?: string;
      selectedColor?: string;
      selectedSize?: string;
    },
    customerData?: {
      email?: string;
      phone?: string;
      name?: string;
      firstName?: string;
      lastName?: string;
      city?: string;
      state?: string;
      country?: string;
      province?: string;
      municipality?: string;
    }
  ) => {
    const event: TrackingEvent = {
      event_type: 'purchase',
      product_id: productId,
      order_id: orderId,
      value: totalValue,
      currency: 'DZD',
      user_data: {
        email: customerData?.email,
        phone: customerData?.phone,
        external_id: orderId,
        // إضافة البيانات الشخصية الإضافية لـ Facebook
        firstName: customerData?.firstName || customerData?.name?.split(' ')[0],
        lastName: customerData?.lastName || customerData?.name?.split(' ').slice(1).join(' '),
        city: customerData?.city || customerData?.municipality,
        state: customerData?.state || customerData?.province,
        country: customerData?.country || 'DZ'
      },
      custom_data: {
        content_name: productData.name,
        content_category: 'product',
        content_ids: [productId],
        content_type: 'product',
        currency: 'DZD',
        value: totalValue,
        product_name: productData.name,
        product_image: productData.image,
        selected_color: productData.selectedColor,
        selected_size: productData.selectedSize,
        quantity: productData.quantity,
        order_id: orderId,
        transaction_id: orderId,
        num_items: productData.quantity
      }
    };

    await trackEvent(event);
  }, [productId, trackEvent]);

  return {
    // الحالة
    settings,
    isLoading,
    error,
    loadedPixels,
    isReady: !!settings && !!trackerRef.current,
    
    // الدوال
    loadTrackingSettings,
    setSettingsFromProduct,
    trackEvent,
    trackViewContent,
    trackAddToCart,
    trackInitiateCheckout,
    trackPurchase,
    
    // معلومات التشخيص
    debugInfo: enableDebugMode ? {
      hasSettings: !!settings,
      hasTracker: !!trackerRef.current,
      settingsLoaded: settingsLoadedRef.current,
      productId,
      organizationId
    } : undefined
  };
};
