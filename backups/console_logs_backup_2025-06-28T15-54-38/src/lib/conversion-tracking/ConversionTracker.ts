// إضافة تعريفات للنوافذ العامة
declare global {
  interface Window {
    fbq?: (action: string, event: string, data?: any, options?: any) => void;
    gtag?: (action: string, event: string, data?: any) => void;
    ttq?: {
      track: (event: string, data?: any) => void;
    };
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
    access_token?: string;
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

  constructor(private productId: string) {
    this.initializeSettings();
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

      // محاولة جلب الإعدادات من Edge Function أولاً (نفس طريقة ProductTrackingWrapper)
      const SUPABASE_URL = 'https://wrnssatuvmumsczyldth.supabase.co';
      const CONVERSION_SETTINGS_URL = `${SUPABASE_URL}/functions/v1/conversion-settings`;
      
      let response = await fetch(`${CONVERSION_SETTINGS_URL}?productId=${this.productId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`,
        }
      });

      if (!response.ok) {
        // fallback إلى API route المحلي
        response = await fetch(`/api/conversion-settings/${this.productId}`, {
          headers: { 'Cache-Control': 'max-age=300' } // 5 دقائق
        });
      }
      
      if (response.ok) {
        const data = await response.json();
        this.settings = data.settings;
        this.cacheSettings(data.settings);
      } else {
      }
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
      // إنشاء event_id فريد مرة واحدة للاستخدام في كلاهما
      const eventId = this.generateEventId(event);
      
      // Facebook Pixel (Client-side) - يعمل بنجاح
      if (typeof window !== 'undefined' && window.fbq) {
        const eventData: any = {
          content_ids: [event.product_id],
          content_type: 'product',
          currency: event.currency || 'DZD'
        };

        if (event.value) eventData.value = event.value;
        if (event.order_id) eventData.order_id = event.order_id;

        // إضافة event_id للتكرار مع Server-side
        const fbqOptions: any = { eventID: eventId };
        
        // إضافة test_event_code في وضع الاختبار
        if (this.settings?.test_mode && this.settings?.facebook?.test_event_code) {
          fbqOptions.testEventCode = this.settings.facebook.test_event_code;
        }

        window.fbq('track', this.mapEventType(event.event_type), eventData, fbqOptions);
      }

      // Facebook Conversion API (Server-side)
      if (this.settings?.facebook.conversion_api_enabled && this.settings.facebook.access_token) {
        try {
          await this.sendToFacebookConversionAPI(event, eventId);
        } catch (conversionApiError) {
          // لا نوقف العملية، Client-side pixel يكفي
          // فقط نسجل تحذير بدلاً من خطأ
        }
      } else {
        if (!this.settings?.facebook.access_token) {
        } else {
        }
      }
    } catch (error) {
    }
  }

  /**
   * إرسال إلى Facebook Conversion API مع تحسينات شاملة للـ Event Match Quality
   */
  private async sendToFacebookConversionAPI(event: ConversionEvent, eventId: string): Promise<void> {
    // جمع معلومات شاملة للمطابقة المتقدمة
    const userAgent = navigator.userAgent;
    const language = navigator.language || 'ar';
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // جلب معرفات Facebook المحسنة
    const fbp = this.getFacebookBrowserId();
    const fbc = this.getFacebookClickId();
    
    // جمع معلومات إضافية للمطابقة
    const screenResolution = `${screen.width}x${screen.height}`;
    const colorDepth = screen.colorDepth;
    const pixelRatio = window.devicePixelRatio || 1;
    
    // معرف خارجي فريد (order_id أو customer_id أو إنشاء واحد)
    const externalId = event.order_id || 
                      event.user_data?.external_id || 
                      event.custom_data?.customer_id ||
                      `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const payload = {
      data: [{
        event_name: this.mapEventType(event.event_type),
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: 'website',
        event_source_url: window.location.href,
        user_data: {
          // المعرف الخارجي (أولوية عالية للمطابقة)
          external_id: externalId,
          
          // معلومات الاتصال (إذا كانت متوفرة)
          ph: event.user_data?.phone || undefined, // سيتم hash في server
          
          // معلومات المتصفح والجهاز (بيانات هامة للمطابقة)
          client_user_agent: userAgent,
          client_ip_address: undefined, // سيتم جلبها من server
          
          // معرفات Facebook (أهم البيانات للمطابقة)
          fbc: fbc,
          fbp: fbp,
          
          // معلومات جغرافية ولغوية
          country: 'dz', // الجزائر
          language: language,
          timezone: timezone,
          
          // معلومات إضافية للمطابقة المتقدمة
          device_info: {
            screen_resolution: screenResolution,
            color_depth: colorDepth,
            pixel_ratio: pixelRatio,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            platform: navigator.platform,
            cookie_enabled: navigator.cookieEnabled
          }
        },
        custom_data: {
          content_ids: [event.product_id],
          content_type: 'product',
          currency: event.currency || 'DZD',
          value: event.value,
          order_id: event.order_id,
          customer_id: event.custom_data?.customer_id,
          
          // معلومات إضافية للتتبع
          content_name: `منتج ${event.product_id}`,
          content_category: 'ecommerce',
          num_items: 1,
          
          // معلومات الصفحة
          page_title: document.title,
          page_url: window.location.href,
          referrer_url: document.referrer || undefined,
          
          // معلومات السلة/الطلب
          ...(event.custom_data && event.custom_data)
        },
        
        // معلومات إضافية للتتبع
        opt_out: false,
        referrer_url: document.referrer || undefined
      }],
      
      // test_event_code فقط في وضع الاختبار
      test_event_code: this.settings?.test_mode ? this.settings?.facebook?.test_event_code : undefined
    };

    // محاولة إرسال إلى Facebook Conversion API مع handling أفضل للأخطاء
    let apiUrl = '/api/facebook-conversion-api';
    
    // إصلاح مؤقت لمشكلة base URL في بعض البيئات
    if (typeof window !== 'undefined' && window.location.origin) {
      const origin = window.location.origin;
      if (!origin.includes('techocenter.com')) {
        apiUrl = `${origin}/api/facebook-conversion-api`;
      }
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        pixel_id: this.settings?.facebook.pixel_id,
        access_token: this.settings?.facebook.access_token,
        payload
      })
    });

    if (!response.ok) {
      let errorText;
      let errorData;
      
      try {
        errorText = await response.text();
        errorData = JSON.parse(errorText);
      } catch (parseError) {
        errorData = { message: errorText || 'خطأ غير معروف' };
      }
      
      // في حالة خطأ 400، أظهر تفاصيل أكثر
      if (response.status === 400) {
      }
      
      throw new Error(`Facebook Conversion API فشل: ${response.status} - ${errorData.error || errorData.message || 'خطأ غير معروف'}`);
    }

    const responseData = await response.json();

    // طباعة تفاصيل إضافية في وضع الاختبار
    if (this.settings?.test_mode) {
    }
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
      if (typeof window !== 'undefined' && window.ttq) {
        const eventData: any = {
          content_id: event.product_id,
          content_type: 'product',
          currency: event.currency || 'DZD'
        };

        if (event.value) eventData.value = event.value;
        if (event.order_id) eventData.order_id = event.order_id;

        window.ttq.track(this.mapEventTypeForTikTok(event.event_type), eventData);
      }
    } catch (error) {
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
}

// تصدير كـ Singleton لكل منتج
const trackers = new Map<string, ConversionTracker>();

export function getConversionTracker(productId: string): ConversionTracker {
  if (!trackers.has(productId)) {
    trackers.set(productId, new ConversionTracker(productId));
  }
  return trackers.get(productId)!;
}

export { ConversionTracker };
export type { ConversionEvent, ConversionSettings };
