// إضافة تعريفات للنوافذ العامة
declare global {
  interface Window {
    fbq?: (action: string, event: string, data?: any, options?: any) => void;
    gtag?: (action: string, event: string, data?: any) => void;
    ttq?: {
      track: (event: string, data?: any) => void;
    };
    __trackingDebugData?: Array<{
      timestamp: string;
      type: string;
      status: 'success' | 'error';
      details: any;
      platform?: string;
    }>;
  }
}

interface ConversionSettings {
  facebook: {
    enabled: boolean;
    pixel_id?: string;
    conversion_api_enabled: boolean;
    access_token?: string;
    dataset_id?: string;
    test_event_code?: string;
  };
  google: {
    enabled: boolean;
    conversion_id?: string;
    conversion_label?: string;
    gtag_id?: string;
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

interface ConversionEvent {
  event_type: 'purchase' | 'view_content' | 'add_to_cart' | 'initiate_checkout';
  product_id: string;
  order_id?: string;
  value?: number;
  currency?: string;
  user_data?: {
    email?: string;
    phone?: string;
    external_id?: string;
    client_ip_address?: string;
    client_user_agent?: string;
    fbc?: string; // Facebook Click ID
    fbp?: string; // Facebook Browser ID
    firstName?: string;
    lastName?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  custom_data?: Record<string, any>;
}

class ConversionTracker {
  private settings: ConversionSettings | null = null;
  private eventQueue: ConversionEvent[] = [];
  private isProcessing = false;
  private retryDelays = [1000, 3000, 5000, 10000]; // تدرج في التأخير
  private apiAvailable: boolean | null = null; // حالة توفر API
  private lastApiCheck: number = 0; // آخر وقت تم فيه فحص API
  private readonly API_CHECK_INTERVAL = 5 * 60 * 1000; // 5 دقائق
  private recentEvents: Map<string, number> = new Map(); // تتبع الأحداث الحديثة لمنع التكرار

  /**
   * حفظ حدث التتبع للتشخيص
   */
  private logTrackingEvent(type: string, status: 'success' | 'error', details: any, platform?: string): void {
    try {
      if (typeof window !== 'undefined') {
        if (!window.__trackingDebugData) {
          window.__trackingDebugData = [];
        }
        
        window.__trackingDebugData.push({
          timestamp: new Date().toISOString(),
          type,
          status,
          details,
          platform
        });
        
        // الحفاظ على آخر 50 حدث فقط
        if (window.__trackingDebugData.length > 50) {
          window.__trackingDebugData = window.__trackingDebugData.slice(-50);
        }
      }
    } catch (error) {
      // تجاهل أخطاء التسجيل
    }
  }

  /**
   * التحقق من تكرار الأحداث
   */
  private isDuplicateEvent(event: ConversionEvent): boolean {
    const eventKey = `${event.event_type}_${event.product_id}_${event.value || 0}`;
    const now = Date.now();
    const lastEventTime = this.recentEvents.get(eventKey);
    
    // إذا كان الحدث نفسه حدث في آخر 5 ثواني، فهو مكرر
    if (lastEventTime && (now - lastEventTime) < 5000) {
      return true;
    }
    
    // حفظ وقت الحدث الحالي
    this.recentEvents.set(eventKey, now);
    
    // تنظيف الأحداث القديمة (أكثر من دقيقة)
    for (const [key, time] of this.recentEvents.entries()) {
      if (now - time > 60000) {
        this.recentEvents.delete(key);
      }
    }
    
    return false;
  }

  constructor(private productId: string, private externalSettings?: any) {
    if (externalSettings) {
      this.setExternalSettings(externalSettings);
    } else {
    this.initializeSettings();
    }
  }

  /**
   * تعيين الإعدادات من مصدر خارجي (useProductTracking)
   */
  setExternalSettings(externalSettings: any): void {
    if (externalSettings) {
      this.settings = {
        facebook: {
          enabled: externalSettings.facebook?.enabled || false,
          pixel_id: externalSettings.facebook?.pixel_id || undefined,
          conversion_api_enabled: externalSettings.facebook?.conversion_api_enabled || false,
          access_token: externalSettings.facebook?.access_token || undefined,
          dataset_id: externalSettings.facebook?.dataset_id || undefined,
          test_event_code: externalSettings.facebook?.test_event_code || undefined
        },
        google: {
          enabled: externalSettings.google?.enabled || false,
          conversion_id: externalSettings.google?.ads_conversion_id || undefined,
          conversion_label: externalSettings.google?.ads_conversion_label || undefined,
          gtag_id: externalSettings.google?.gtag_id || undefined
        },
        tiktok: {
          enabled: externalSettings.tiktok?.enabled || false,
          pixel_id: externalSettings.tiktok?.pixel_id || undefined,
          events_api_enabled: externalSettings.tiktok?.events_api_enabled || false,
          access_token: externalSettings.tiktok?.access_token || undefined,
          test_event_code: externalSettings.tiktok?.test_event_code || undefined
        },
        test_mode: externalSettings.test_mode !== false
      };
      
    }
  }

  /**
   * تحميل إعدادات التتبع مع التخزين المؤقت
   */
  private async initializeSettings(): Promise<void> {
    try {
      // محاولة جلب الإعدادات من المخزن المؤقت المحلي أولاً
      const cached = this.getCachedSettings();
      if (cached && this.isCacheValid(cached)) {
        this.settings = cached.settings;
        return;
      }

      // استخدام Supabase client المشترك بدلاً من إنشاء instance جديد
      const { supabase } = await import('@/lib/supabase-client');

      // استدعاء دالة get_product_complete_data مباشرة
      // تجنب أي جلب إضافي هنا: إذا لم تكن الإعدادات قادمة من الخارج، نستخدم إعدادات افتراضية معطلة
      const rpcResult: any = { data: null, error: null };

      // إعدادات افتراضية لمنع أي استدعاءات شبكة إضافية من هنا
      const settings: ConversionSettings = {
        facebook: { enabled: false, conversion_api_enabled: false },
        google: { enabled: false },
        tiktok: { enabled: false },
        test_mode: true
      };
      this.settings = settings;
    } catch (error) {
    }
  }

  /**
   * تتبع حدث التحويل
   */
  async trackEvent(event: ConversionEvent): Promise<void> {
    if (!this.settings) {
      await this.initializeSettings();
    }

    if (!this.settings) {
      return;
    }

    // فحص التكرار
    if (this.isDuplicateEvent(event)) {
      this.logTrackingEvent(event.event_type, 'error', {
        reason: 'duplicate_event',
        product_id: event.product_id,
        value: event.value
      }, 'ConversionTracker');
      return;
    }

    // إضافة الحدث إلى الطابور
    this.eventQueue.push(event);
    
    // معالجة الطابور إذا لم تكن قيد المعالجة
    if (!this.isProcessing) {
      this.processEventQueue();
    }
  }

  /**
   * معالجة طابور الأحداث
   */
  private async processEventQueue(): Promise<void> {
    if (this.isProcessing || this.eventQueue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      if (event) {
        await this.sendEvent(event);
      }
    }
    
    this.isProcessing = false;
  }

  /**
   * إرسال الحدث إلى المنصات المختلفة
   */
  private async sendEvent(event: ConversionEvent): Promise<void> {
    const promises: Promise<void>[] = [];

    // Facebook Pixel + Conversion API
    if (this.settings?.facebook.enabled) {
      promises.push(this.sendToFacebook(event));
    }

    // Google Ads
    if (this.settings?.google.enabled) {
      promises.push(this.sendToGoogle(event));
    }

    // TikTok Pixel
    if (this.settings?.tiktok.enabled) {
      promises.push(this.sendToTikTok(event));
    }

    // تنفيذ جميع الإرسالات بشكل متوازي
    await Promise.allSettled(promises);
    
    // تسجيل الحدث في قاعدة البيانات (بشكل غير متزامن)
    try {
      await this.logEventToDatabase(event);
    } catch (dbError) {
      // لا نوقف العملية، tracking الأساسي يكفي
    }
  }

  /**
   * إرسال إلى Facebook (Pixel + Conversion API)
   */
  private async sendToFacebook(event: ConversionEvent): Promise<void> {
    try {
      // استخدام نفس event_id لكل من Pixel و Conversion API لتفعيل deduplication
      const baseEventId = this.generateEventId(event);
      const pixelEventId = baseEventId;
      const apiEventId = baseEventId;
      
      // Facebook Pixel (Client-side) - يعمل بنجاح
      if (typeof window !== 'undefined' && window.fbq) {
        const eventData: any = {
          content_ids: [event.product_id],
          content_type: 'product'
        };

        // إضافة البيانات الأساسية
        const hasNumericValue = typeof event.value === 'number' && isFinite(event.value as number);
        if (hasNumericValue) eventData.value = event.value;
        if (event.order_id) eventData.order_id = event.order_id;

        // تعزيز بيانات المنتج لرفع EMQ: contents و num_items و content_name
        const quantity = Number(event.custom_data?.quantity ?? 1) || 1;
        const unitPrice = ((): number | undefined => {
          const fromCustom = event.custom_data?.unit_price;
          if (typeof fromCustom === 'number' && isFinite(fromCustom)) return fromCustom;
          if (hasNumericValue && quantity > 0) {
            const computed = Number((event.value as number) / quantity);
            return isFinite(computed) ? computed : undefined;
          }
          return undefined;
        })();
        eventData.contents = [
          {
            id: event.product_id,
            quantity,
            ...(typeof unitPrice === 'number' ? { item_price: unitPrice } : {})
          }
        ];
        eventData.num_items = quantity;
        if (!eventData.content_name) {
          const nameFromCustom = event.custom_data?.content_name || event.custom_data?.product_name;
          if (typeof nameFromCustom === 'string' && nameFromCustom.trim()) {
            eventData.content_name = nameFromCustom.trim();
          }
        }
        
        // إضافة العملة للأحداث التي تتطلبها (Purchase فقط)
        // Facebook يتطلب العملة لأحداث Purchase
        if (event.event_type === 'purchase') {
          // أرسل العملة فقط عند وجود قيمة رقمية، وإلا سيعطي Pixel تحذيرًا
          if (hasNumericValue) {
            const rawCurrency = (event.currency || 'DZD').toString();
            const currencyCode = this.normalizeCurrencyForFacebook(rawCurrency);
            eventData.currency = currencyCode;
          }
        }

        // تمرير eventID الموحد للـ Pixel
        const fbqOptions: any = { eventID: pixelEventId };
        
        // إضافة test_event_code في وضع الاختبار
        if (this.settings?.test_mode && this.settings?.facebook?.test_event_code) {
          fbqOptions.testEventCode = this.settings.facebook.test_event_code;
        }

        // إرسال الحدث
        window.fbq('track', this.mapEventType(event.event_type), eventData, fbqOptions);
        
        // تسجيل نجاح Facebook Pixel
        this.logTrackingEvent(event.event_type, 'success', {
          platform: 'facebook_pixel',
          event_id: pixelEventId,
          value: event.value,
          currency: event.currency,
          order_id: event.order_id
        }, 'Facebook Pixel');

        // إظهار تقرير Event Match Quality للمطورين (في وضع التطوير فقط)
        if (process.env.NODE_ENV === 'development' || this.settings?.test_mode) {
          try {
            const { EventMatchQualityAnalyzer } = await import('../../utils/eventMatchQualityReport');
            EventMatchQualityAnalyzer.logReport(eventData, event.user_data);
          } catch (reportError) {
          }
        }
      }

      // Facebook Conversion API (Server-side)
      if (this.settings?.facebook.conversion_api_enabled && this.settings.facebook.access_token) {
        try {
          await this.sendToFacebookConversionAPI(event, apiEventId);
          
          // تسجيل نجاح Conversion API
          this.logTrackingEvent(event.event_type, 'success', {
            platform: 'facebook_conversion_api',
            event_id: apiEventId,
            value: event.value,
            currency: event.currency,
            order_id: event.order_id
          }, 'Facebook Conversion API');
          
        } catch (conversionApiError) {
          // تسجيل فشل Conversion API
          this.logTrackingEvent(event.event_type, 'error', {
            platform: 'facebook_conversion_api',
            error: conversionApiError instanceof Error ? conversionApiError.message : 'خطأ غير معروف',
            event_id: apiEventId
          }, 'Facebook Conversion API');
        }
      }
    } catch (error) {
      // تسجيل فشل عام في Facebook
      this.logTrackingEvent(event.event_type, 'error', {
        platform: 'facebook',
        error: error instanceof Error ? error.message : 'خطأ غير معروف'
      }, 'Facebook');
    }
  }

  /**
   * إرسال إلى Facebook Conversion API مع تحسينات شاملة للـ Event Match Quality
   */
  private async sendToFacebookConversionAPI(event: ConversionEvent, eventId: string): Promise<void> {
    // استخدام Facebook Conversion API المباشر
    const { createFacebookConversionAPI } = await import('./FacebookConversionAPI');
    
    const conversionAPI = createFacebookConversionAPI(
      this.settings!.facebook.pixel_id!,
      this.settings!.facebook.access_token!,
      this.settings?.test_mode ? this.settings.facebook.test_event_code : undefined
    );

    // إعداد بيانات العميل للتمرير إلى Facebook Conversion API
    const customerData = {
      ...event.user_data,
      // التأكد من وجود البيانات الأساسية
      email: event.user_data?.email,
      phone: event.user_data?.phone,
      firstName: event.user_data?.firstName,
      lastName: event.user_data?.lastName,
      city: event.user_data?.city,
      state: event.user_data?.state,
      country: event.user_data?.country || 'DZ'
    };

    const payload = await conversionAPI.createEventPayload(
      this.mapEventType(event.event_type),
      event.product_id,
      event.value,
      event.order_id,
      event.custom_data,
      customerData
    );

    // تمرير event_id الموحّد للتخلص من التكرار بين Pixel وCAPI
    if (payload?.data && payload.data[0]) {
      payload.data[0].event_id = eventId;
    }

    await conversionAPI.sendEvent(payload);
  }

  /**
   * جلب Facebook Browser ID من الكوكيز مع تحسينات شاملة
   */
  private getFacebookBrowserId(): string | undefined {
    try {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === '_fbp' && value) {
          return value;
        }
      }
      
      // إذا لم يتم العثور على _fbp، قم بإنشاء واحد افتراضي
      // هذا يحدث عندما لا يكون Facebook Pixel محمل بعد أو لم ينشئ cookie
      const generatedFbp = `fb.1.${Date.now()}.${Math.random().toString(36).substr(2, 9)}`;
      
      try {
        // محاولة إنشاء cookie _fbp للاستخدام المستقبلي
        const expirationDate = new Date();
        expirationDate.setTime(expirationDate.getTime() + (90 * 24 * 60 * 60 * 1000)); // 90 يوم
        document.cookie = `_fbp=${generatedFbp}; expires=${expirationDate.toUTCString()}; path=/; domain=${window.location.hostname}`;
        return generatedFbp;
      } catch (cookieError) {
        return generatedFbp;
      }
      
    } catch (error) {
      
      // إنشاء قيمة احتياطية
      const fallbackFbp = `fb.1.${Date.now()}.fallback`;
      return fallbackFbp;
    }
  }

  /**
   * جلب Facebook Click ID من URL أو localStorage مع تحسينات شاملة
   */
  private getFacebookClickId(): string | undefined {
    try {
      // أولاً: محاولة جلب من URL الحالي
      const urlParams = new URLSearchParams(window.location.search);
      let fbclid = urlParams.get('fbclid');
      
      if (fbclid) {
        // تكوين fbc وفقاً لتنسيق Facebook الصحيح
        const fbc = `fb.1.${Date.now()}.${fbclid}`;
        
        // حفظ في localStorage للاستخدام المستقبلي
        try {
          localStorage.setItem('facebook_click_id', fbc);
          localStorage.setItem('facebook_click_timestamp', Date.now().toString());
        } catch {
          // تجاهل أخطاء localStorage
        }
        return fbc;
      }
      
      // ثانياً: محاولة جلب من localStorage (إذا كان محفوظ من زيارة سابقة)
      try {
        const storedFbc = localStorage.getItem('facebook_click_id');
        const storedTimestamp = localStorage.getItem('facebook_click_timestamp');
        
        if (storedFbc && storedTimestamp) {
          const age = Date.now() - parseInt(storedTimestamp);
          const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 أيام
          
          if (age < maxAge) {
            return storedFbc;
          } else {
            // انتهت صلاحية fbc، احذفه
            localStorage.removeItem('facebook_click_id');
            localStorage.removeItem('facebook_click_timestamp');
          }
        }
      } catch {
        // تجاهل أخطاء localStorage
      }
      
      // ثالثاً: محاولة جلب من document.referrer
      if (document.referrer) {
        try {
          const referrerUrl = new URL(document.referrer);
          const referrerFbclid = referrerUrl.searchParams.get('fbclid');
          
          if (referrerFbclid) {
            const fbc = `fb.1.${Date.now()}.${referrerFbclid}`;
            
            // حفظ في localStorage
            try {
              localStorage.setItem('facebook_click_id', fbc);
              localStorage.setItem('facebook_click_timestamp', Date.now().toString());
            } catch {
              // تجاهل أخطاء localStorage
            }
            
            return fbc;
          }
        } catch {
          // تجاهل أخطاء parsing URL
        }
      }
      
      // رابعاً: محاولة جلب من cookie _fbc إذا كان موجود
      try {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === '_fbc' && value) {
            return value;
          }
        }
      } catch {
        // تجاهل أخطاء parsing cookies
      }
      return undefined;
      
    } catch (error) {
      return undefined;
    }
  }

  /**
   * إرسال إلى Google Ads
   */
  private async sendToGoogle(event: ConversionEvent): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.gtag) {
        const conversionData: any = {
          send_to: `${this.settings?.google.conversion_id}/${this.settings?.google.conversion_label}`,
          currency: event.currency || 'DZD',
          transaction_id: event.order_id || this.generateEventId(event)
        };

        if (event.value) conversionData.value = event.value;

        window.gtag('event', 'conversion', conversionData);
      }
    } catch (error) {
    }
  }

  /**
   * إرسال إلى TikTok
   */
  private async sendToTikTok(event: ConversionEvent): Promise<void> {
    try {
      // إرسال إلى TikTok Pixel (client-side)
      if (typeof window !== 'undefined' && window.ttq) {
        const eventData: any = {
          content_id: event.product_id,
          content_type: 'product',
          currency: event.currency || 'DZD'
        };

        if (event.value) eventData.value = event.value;
        if (event.order_id) eventData.order_id = event.order_id;

        const tiktokEvent = this.mapEventTypeForTikTok(event.event_type);
        
        // إضافة test event code في وضع الاختبار
        if (this.settings?.test_mode && this.settings?.tiktok?.test_event_code) {
          eventData.test_event_code = this.settings.tiktok.test_event_code;
        }
        
        window.ttq.track(tiktokEvent, eventData);
      }

      // إرسال إلى TikTok Events API (server-side) إذا كان مفعل
      if (this.settings?.tiktok?.events_api_enabled && this.settings?.tiktok?.access_token) {
        console.log('🔥 TikTok Events API enabled, sending server-side event:', {
          event_type: event.event_type,
          product_id: event.product_id,
          has_access_token: !!this.settings.tiktok.access_token,
          pixel_id: this.settings.tiktok.pixel_id
        });
        await this.sendToTikTokEventsAPI(event);
      } else {
        console.log('⚠️ TikTok Events API not enabled or missing access token:', {
          events_api_enabled: this.settings?.tiktok?.events_api_enabled,
          has_access_token: !!this.settings?.tiktok?.access_token,
          settings: this.settings?.tiktok
        });
      }
    } catch (error) {
      this.logTrackingEvent('tiktok_pixel', 'error', { error: (error as Error).message }, 'tiktok');
    }
  }

  /**
   * إرسال إلى TikTok Events API (server-side)
   */
  private async sendToTikTokEventsAPI(event: ConversionEvent): Promise<void> {
    try {
      const eventData = {
        event_type: this.mapEventTypeForTikTok(event.event_type),
        product_id: event.product_id,
        order_id: event.order_id,
        value: event.value,
        currency: event.currency || 'DZD',
        user_data: event.user_data,
        custom_data: {
          ...event.custom_data,
          content_id: event.product_id,
          content_type: 'product'
        },
        platform: 'tiktok',
        pixel_id: this.settings?.tiktok?.pixel_id,
        access_token: this.settings?.tiktok?.access_token,
        test_event_code: this.settings?.test_mode ? this.settings?.tiktok?.test_event_code : undefined
      };

      console.log('📡 Sending TikTok Events API request:', {
        url: '/api/conversion-events/tiktok',
        event_type: eventData.event_type,
        pixel_id: eventData.pixel_id,
        has_access_token: !!eventData.access_token,
        test_mode: this.settings?.test_mode
      });

      // إرسال إلى API endpoint
      const response = await fetch('/api/conversion-events/tiktok', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
      });

      console.log('📡 TikTok Events API response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ TikTok Events API error response:', errorText);
        throw new Error(`TikTok Events API error: ${response.statusText} - ${errorText}`);
      }

      const responseData = await response.json();
      console.log('✅ TikTok Events API success:', responseData);

      this.logTrackingEvent('tiktok_events_api', 'success', { 
        event_type: event.event_type,
        response: responseData
      }, 'tiktok');
    } catch (error) {
      console.error('❌ TikTok Events API error:', error);
      this.logTrackingEvent('tiktok_events_api', 'error', { 
        error: (error as Error).message,
        stack: (error as Error).stack 
      }, 'tiktok');
    }
  }

  /**
   * التحقق من توفر API endpoint
   */
  private async checkApiAvailability(): Promise<boolean> {
    // إذا تم الفحص مؤخراً، استخدم النتيجة المحفوظة
    if (this.apiAvailable !== null && Date.now() - this.lastApiCheck < this.API_CHECK_INTERVAL) {
      return this.apiAvailable;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 ثواني

      const response = await fetch('/api/conversion-events/health', {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      this.apiAvailable = response.ok;
      this.lastApiCheck = Date.now();
      
      return this.apiAvailable;
    } catch (error) {
      // إذا فشل الفحص، افترض أن API غير متاح
      this.apiAvailable = false;
      this.lastApiCheck = Date.now();
      return false;
    }
  }

  /**
   * تسجيل الحدث في قاعدة البيانات
   */
  private async logEventToDatabase(event: ConversionEvent): Promise<void> {
    // التحقق من توفر API أولاً
    const isApiAvailable = await this.checkApiAvailability();
    if (!isApiAvailable) {
      // إذا كان API غير متاح، لا تحاول الإرسال
      return;
    }

    try {
      const eventData = {
        product_id: event.product_id,
        order_id: event.order_id,
        event_type: event.event_type,
        platform: 'multiple',
        user_data: event.user_data,
        custom_data: event.custom_data,
        event_id: this.generateEventId(event)
      };

      // إضافة timeout للطلب
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 seconds timeout

      try {
        const response = await fetch('/api/conversion-events', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(eventData),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // إذا فشل الطلب، قم بتحديث حالة API
          if (response.status === 404 || response.status === 503) {
            this.apiAvailable = false;
            this.lastApiCheck = Date.now();
          }
          
          const errorData = await response.text();
          // لا نرمي خطأ، فقط نسجل التحذير
          return;
        }

        const responseData = await response.json();
        
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          // timeout - قد يكون API بطيء
        } else {
          // خطأ في الشبكة - API غير متاح على الأرجح
          this.apiAvailable = false;
          this.lastApiCheck = Date.now();
        }
        // لا نرمي خطأ، فقط نسجل التحذير
      }
      
    } catch (error) {
      // لا نرمي خطأ، فقط نسجل التحذير - نريد أن يستمر tracking الأساسي
    }
  }

  // Helper Methods
  private mapEventType(eventType: string): string {
    const mapping: Record<string, string> = {
      'view_content': 'ViewContent',
      'add_to_cart': 'AddToCart',
      'initiate_checkout': 'InitiateCheckout',
      'purchase': 'Purchase'
    };
    return mapping[eventType] || eventType;
  }

  private mapEventTypeForTikTok(eventType: string): string {
    const mapping: Record<string, string> = {
      'view_content': 'ViewContent',
      'add_to_cart': 'AddToCart',
      'initiate_checkout': 'InitiateCheckout',
      'purchase': 'CompletePayment'
    };
    return mapping[eventType] || eventType;
  }

  /**
   * إنشاء معرف فريد للحدث لمنع التكرار
   */
  private generateEventId(event: ConversionEvent): string {
    // إنشاء ID فريد يجمع بين معلومات الحدث والوقت
    const timestamp = Date.now();
    const eventInfo = `${event.event_type}_${event.product_id}_${event.order_id || 'no_order'}_${timestamp}`;
    
    // إنشاء hash قصير من المعلومات
    let hash = 0;
    for (let i = 0; i < eventInfo.length; i++) {
      const char = eventInfo.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // تحويل إلى 32-bit integer
    }
    
    // تحويل إلى string موجب وإضافة timestamp مختصر
    const uniqueId = `${Math.abs(hash).toString(36)}_${timestamp.toString(36)}`;
    
    return uniqueId;
  }

  private hashData(data: string): string {
    // تطبيق SHA-256 للبيانات الحساسة
    return btoa(data); // مبسط للمثال
  }

  private getCachedSettings(): { settings: ConversionSettings; timestamp: number } | null {
    try {
      const cached = localStorage.getItem(`conversion_settings_${this.productId}`);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }

  private isCacheValid(cached: { timestamp: number }): boolean {
    return Date.now() - cached.timestamp < 5 * 60 * 1000; // 5 دقائق
  }

  private cacheSettings(settings: ConversionSettings): void {
    try {
      localStorage.setItem(`conversion_settings_${this.productId}`, JSON.stringify({
        settings,
        timestamp: Date.now()
      }));
    } catch {
      // تجاهل أخطاء التخزين المحلي
    }
  }

  /**
   * تطبيع رمز العملة بما يتوافق مع متطلبات Facebook Pixel (3 حروف كبيرة)
   * مع بعض التحسينات للأكواد الشائعة المكتوبة بصيغ مختلفة
   */
  private normalizeCurrencyForFacebook(input: string): string {
    if (!input) return 'USD';
    const trimmed = input.trim();
    // استبدال الرموز الشائعة بالنُسخ القياسية
    const symbolMap: Record<string, string> = {
      'د.ج': 'DZD',
      'دج': 'DZD',
      'DA': 'DZD',
      'د.م.': 'MAD',
      'د.م': 'MAD',
      'DH': 'MAD',
      '$': 'USD',
      '€': 'EUR',
      '£': 'GBP',
      '¥': 'JPY'
    };
    if (symbolMap[trimmed]) return symbolMap[trimmed];
    const upper = trimmed.toUpperCase();
    // خرائط خاصة لعملات غير مدعومة من Facebook Pixel
    if (upper === 'DZD') return 'USD';
    // إن كان 3 أحرف لاتينية اعتبره صالحًا
    if (/^[A-Z]{3}$/.test(upper)) return upper;
    // محاولة استخراج حروف لاتينية فقط
    const onlyLetters = upper.replace(/[^A-Z]/g, '');
    if (onlyLetters.length === 3) return onlyLetters;
    // افتراضي آمن
    return 'USD';
  }

  // ملاحظة: تطبيق Advanced Matching يتم عبر PixelLoader عند init لتجنب تكرار تهيئة Pixel
}

// تصدير كـ Singleton لكل منتج
const trackers = new Map<string, ConversionTracker>();

export function getConversionTracker(productId: string, settings?: any): ConversionTracker {
  const cacheKey = `${productId}_${settings ? 'with_settings' : 'no_settings'}`;
  
  if (!trackers.has(cacheKey)) {
    trackers.set(cacheKey, new ConversionTracker(productId, settings));
  } else if (settings) {
    // تحديث الإعدادات إذا كانت متوفرة
    trackers.get(cacheKey)!.setExternalSettings(settings);
  }
  
  return trackers.get(cacheKey)!;
}

export { ConversionTracker };
export type { ConversionEvent, ConversionSettings };
