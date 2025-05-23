// إضافة تعريفات للنوافذ العامة
declare global {
  interface Window {
    fbq?: (action: string, event: string, data?: any) => void;
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

      // محاولة جلب الإعدادات من API route المحلي أولاً
      let response = await fetch(`/api/conversion-settings/${this.productId}`, {
        headers: { 'Cache-Control': 'max-age=300' } // 5 دقائق
      });
      
      if (!response.ok) {
        console.warn('فشل في API route المحلي، محاولة Edge Function...');
        // fallback إلى Edge Function
        const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/conversion-settings`;
        response = await fetch(`${edgeFunctionUrl}?productId=${this.productId}`, {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          }
        });
      }
      
      if (response.ok) {
        const data = await response.json();
        this.settings = data.settings;
        this.cacheSettings(data.settings);
      } else {
        console.error('فشل في جلب إعدادات التتبع من جميع المصادر');
      }
    } catch (error) {
      console.warn('فشل في تحميل إعدادات التتبع:', error);
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
      console.warn('إعدادات التتبع غير متوفرة');
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
    this.logEventToDatabase(event).catch(console.error);
  }

  /**
   * إرسال إلى Facebook (Pixel + Conversion API)
   */
  private async sendToFacebook(event: ConversionEvent): Promise<void> {
    try {
      // Facebook Pixel (Client-side)
      if (typeof window !== 'undefined' && window.fbq) {
        const eventData: any = {
          content_ids: [event.product_id],
          content_type: 'product',
          currency: event.currency || 'DZD'
        };

        if (event.value) eventData.value = event.value;
        if (event.order_id) eventData.order_id = event.order_id;

        window.fbq('track', this.mapEventType(event.event_type), eventData);
      }

      // Facebook Conversion API (Server-side)
      if (this.settings?.facebook.conversion_api_enabled && this.settings.facebook.access_token) {
        await this.sendToFacebookConversionAPI(event);
      }
    } catch (error) {
      console.error('خطأ في إرسال إلى Facebook:', error);
    }
  }

  /**
   * إرسال إلى Facebook Conversion API
   */
  private async sendToFacebookConversionAPI(event: ConversionEvent): Promise<void> {
    const payload = {
      data: [{
        event_name: this.mapEventType(event.event_type),
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website',
        event_source_url: window.location.href,
        user_data: {
          em: event.user_data?.email ? this.hashData(event.user_data.email) : undefined,
          ph: event.user_data?.phone ? this.hashData(event.user_data.phone) : undefined,
          external_id: event.user_data?.external_id,
          client_ip_address: event.user_data?.client_ip_address,
          client_user_agent: event.user_data?.client_user_agent,
          fbc: event.user_data?.fbc,
          fbp: event.user_data?.fbp
        },
        custom_data: {
          content_ids: [event.product_id],
          content_type: 'product',
          currency: event.currency || 'DZD',
          value: event.value,
          order_id: event.order_id
        },
        event_id: this.generateEventId(event) // لمنع التكرار
      }],
      test_event_code: this.settings?.test_mode ? 'TEST12345' : undefined
    };

    await fetch('/api/facebook-conversion-api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pixel_id: this.settings?.facebook.pixel_id,
        access_token: this.settings?.facebook.access_token,
        payload
      })
    });
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
      console.error('خطأ في إرسال إلى Google:', error);
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
      console.error('خطأ في إرسال إلى TikTok:', error);
    }
  }

  /**
   * تسجيل الحدث في قاعدة البيانات
   */
  private async logEventToDatabase(event: ConversionEvent): Promise<void> {
    try {
      await fetch('/api/conversion-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: event.product_id,
          order_id: event.order_id,
          event_type: event.event_type,
          platform: 'multiple',
          user_data: event.user_data,
          custom_data: event.custom_data,
          event_id: this.generateEventId(event)
        })
      });
    } catch (error) {
      console.error('خطأ في تسجيل الحدث:', error);
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

  private generateEventId(event: ConversionEvent): string {
    return `${event.product_id}_${event.event_type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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