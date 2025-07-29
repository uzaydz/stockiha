interface FacebookConversionPayload {
  data: Array<{
    event_name: string;
    event_time: number;
    event_id: string;
    action_source: string;
    event_source_url: string;
    user_data: {
      external_id?: string;
      ph?: string;
      em?: string;
      fn?: string;
      ln?: string;
      client_user_agent?: string;
      client_ip_address?: string;
      fbc?: string;
      fbp?: string;
      country?: string;
      ct?: string;
      st?: string;
      zp?: string;
    };
    custom_data: {
      content_ids: string[];
      content_type: string;
      currency: string;
      value?: number;
      order_id?: string;
      content_name?: string;
      content_category?: string;
      num_items?: number;
    };
    opt_out?: boolean;
    referrer_url?: string;
  }>;
  test_event_code?: string;
}

interface FacebookConversionResponse {
  events_received: number;
  messages: string[];
  fbtrace_id: string;
}

export class FacebookConversionAPI {
  private pixelId: string;
  private accessToken: string;
  private testEventCode?: string;

  constructor(pixelId: string, accessToken: string, testEventCode?: string) {
    this.pixelId = pixelId;
    this.accessToken = accessToken;
    this.testEventCode = testEventCode;
  }

  /**
   * إرسال حدث إلى Facebook Conversion API مباشرة
   */
  async sendEvent(payload: FacebookConversionPayload): Promise<FacebookConversionResponse> {
    const url = `https://graph.facebook.com/v18.0/${this.pixelId}/events`;
    
    const requestPayload = {
      ...payload,
      access_token: this.accessToken,
      // إضافة test_event_code إذا كان متوفراً
      ...(this.testEventCode && { test_event_code: this.testEventCode })
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': navigator.userAgent
        },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }

        // تسجيل الخطأ في بيانات التشخيص
        if (typeof window !== 'undefined') {
          if (!window.__trackingDebugData) {
            window.__trackingDebugData = [];
          }
          
          window.__trackingDebugData.push({
            timestamp: new Date().toISOString(),
            type: 'conversion_api_error',
            status: 'error',
            details: {
              status: response.status,
              statusText: response.statusText,
              error: errorData,
              url,
              payload: requestPayload
            },
            platform: 'Facebook Conversion API'
          });
        }

        throw new Error(`Facebook Conversion API فشل: ${response.status} - ${errorData.error?.message || errorData.message || 'خطأ غير معروف'}`);
      }

      const responseData = await response.json();

      // تسجيل النجاح في بيانات التشخيص
      if (typeof window !== 'undefined') {
        if (!window.__trackingDebugData) {
          window.__trackingDebugData = [];
        }
        
        window.__trackingDebugData.push({
          timestamp: new Date().toISOString(),
          type: 'conversion_api_success',
          status: 'success',
          details: {
            events_received: responseData.events_received,
            fbtrace_id: responseData.fbtrace_id,
            messages: responseData.messages,
            url,
            payload: requestPayload
          },
          platform: 'Facebook Conversion API'
        });
      }

      return responseData;
    } catch (error) {
      throw error;
    }
  }

  /**
   * إنشاء payload لحدث معين
   */
  async createEventPayload(
    eventName: string,
    productId: string,
    value?: number,
    orderId?: string,
    customData?: Record<string, any>,
    customerData?: any
  ): Promise<FacebookConversionPayload> {
    // جلب معرفات Facebook
    const fbp = this.getFacebookBrowserId();
    const fbc = this.getFacebookClickId();
    
    // إنشاء معرف خارجي فريد
    const externalId = orderId || 
                      customData?.customer_id ||
                      `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // تشفير البيانات المطلوبة
    const hashedCountry = await this.hashData('dz');
    const hashedCustomerData = await this.createHashedUserData(customerData);

    return {
      data: [{
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: this.generateEventId(eventName, productId),
        action_source: 'website',
        event_source_url: window.location.href,
        user_data: {
          external_id: externalId,
          client_user_agent: navigator.userAgent,
          fbc: fbc,
          fbp: fbp,
          country: hashedCountry,
          ...hashedCustomerData
        },
        custom_data: {
          content_ids: [productId],
          content_type: 'product',
          currency: 'DZD',
          value: value,
          content_name: `منتج ${productId}`,
          content_category: 'ecommerce',
          num_items: 1,
          ...(orderId && { order_id: orderId }),
          ...customData
        },
        opt_out: false,
        referrer_url: document.referrer || undefined
      }],
      ...(this.testEventCode && { test_event_code: this.testEventCode })
    };
  }

  /**
   * جلب Facebook Browser ID
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
      
      // إنشاء fbp افتراضي
      const generatedFbp = `fb.1.${Date.now()}.${Math.random().toString(36).substr(2, 9)}`;
      
      try {
        const expirationDate = new Date();
        expirationDate.setTime(expirationDate.getTime() + (90 * 24 * 60 * 60 * 1000));
        document.cookie = `_fbp=${generatedFbp}; expires=${expirationDate.toUTCString()}; path=/`;
        return generatedFbp;
      } catch {
        return generatedFbp;
      }
    } catch {
      return `fb.1.${Date.now()}.fallback`;
    }
  }

  /**
   * جلب Facebook Click ID مع تحسينات شاملة
   */
  private getFacebookClickId(): string | undefined {
    try {
      // 1. البحث في URL الحالي عن fbclid
      const urlParams = new URLSearchParams(window.location.search);
      const fbclid = urlParams.get('fbclid');
      
      if (fbclid) {
        const fbc = `fb.1.${Date.now()}.${fbclid}`;
        try {
          // حفظ في localStorage للاستخدام اللاحق
          localStorage.setItem('facebook_click_id', fbc);
          localStorage.setItem('facebook_click_id_timestamp', Date.now().toString());
        } catch (error) {
        }
        return fbc;
      }
      
      // 2. البحث في الكوكيز عن _fbc
      try {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === '_fbc' && value) {
            return decodeURIComponent(value);
          }
        }
      } catch (error) {
      }
      
      // 3. البحث في localStorage
      try {
        const storedFbc = localStorage.getItem('facebook_click_id');
        const storedTimestamp = localStorage.getItem('facebook_click_id_timestamp');
        
        if (storedFbc && storedTimestamp) {
          const timestamp = parseInt(storedTimestamp);
          const now = Date.now();
          
          // التحقق من أن الـ fbc ليس قديماً جداً (أقل من 7 أيام)
          if (now - timestamp < 7 * 24 * 60 * 60 * 1000) {
            return storedFbc;
          } else {
            // إزالة البيانات القديمة
            localStorage.removeItem('facebook_click_id');
            localStorage.removeItem('facebook_click_id_timestamp');
          }
        }
      } catch (error) {
      }
      
      // 4. البحث في document.referrer عن fbclid
      try {
        if (document.referrer) {
          const referrerUrl = new URL(document.referrer);
          const referrerFbclid = referrerUrl.searchParams.get('fbclid');
          
          if (referrerFbclid) {
            const fbc = `fb.1.${Date.now()}.${referrerFbclid}`;
            try {
              localStorage.setItem('facebook_click_id', fbc);
              localStorage.setItem('facebook_click_id_timestamp', Date.now().toString());
            } catch {}
            return fbc;
          }
        }
      } catch (error) {
      }
      
      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * إنشاء معرف فريد للحدث
   */
  private generateEventId(eventName: string, productId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${eventName}_${productId}_${timestamp}_${random}`;
  }

  /**
   * تشفير البيانات بـ SHA256
   */
  private async hashData(data: string): Promise<string> {
    if (!data) return '';
    
    try {
      // تحويل النص إلى bytes
      const encoder = new TextEncoder();
      const dataBytes = encoder.encode(data.toLowerCase().trim());
      
      // تشفير بـ SHA256
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBytes);
      
      // تحويل إلى hex string
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      return hashHex;
    } catch (error) {
      return '';
    }
  }

  /**
   * تقسيم الأسماء بذكاء للأسماء العربية والإنجليزية
   */
  private splitName(fullName: string): { firstName: string; lastName: string } {
    if (!fullName || typeof fullName !== 'string') {
      return { firstName: '', lastName: '' };
    }

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      return { firstName: '', lastName: '' };
    }

    // تقسيم الاسم إلى أجزاء
    const nameParts = trimmedName.split(/\s+/).filter(part => part.length > 0);

    if (nameParts.length === 0) {
      return { firstName: '', lastName: '' };
    } else if (nameParts.length === 1) {
      // اسم واحد فقط - نضعه كـ firstName
      return { firstName: nameParts[0], lastName: '' };
    } else if (nameParts.length === 2) {
      // اسمان - الأول firstName والثاني lastName
      return { firstName: nameParts[0], lastName: nameParts[1] };
    } else {
      // أكثر من اسمين - الأول firstName والباقي lastName
      return { 
        firstName: nameParts[0], 
        lastName: nameParts.slice(1).join(' ') 
      };
    }
  }

  /**
   * جلب عنوان IP للعميل (من جانب العميل)
   */
  private async getClientIPAddress(): Promise<string | undefined> {
    try {
      // محاولة جلب IP من خدمة خارجية موثوقة
      const response = await fetch('https://api.ipify.org?format=json', {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.ip;
      }
    } catch (error) {
    }
    
    // في حالة فشل الحصول على IP، نعيد undefined
    // Facebook سيستخدم IP الخادم بدلاً من ذلك
    return undefined;
  }

  /**
   * إنشاء بيانات المستخدم مع التشفير المطلوب
   */
  private async createHashedUserData(customerData?: any): Promise<any> {
    const userData: any = {};

    if (customerData) {
      // معالجة البريد الإلكتروني
      if (customerData.email) {
        userData.em = await this.hashData(customerData.email);
      }
      
      // معالجة رقم الهاتف
      if (customerData.phone) {
        userData.ph = await this.hashData(customerData.phone);
      }
      
      // معالجة الأسماء بذكاء
      const fullName = customerData.name || customerData.fullName || customerData.customer_name;
      if (fullName) {
        const { firstName, lastName } = this.splitName(fullName);
        
        if (firstName) {
          userData.fn = await this.hashData(firstName);
        }
        if (lastName) {
          userData.ln = await this.hashData(lastName);
        }
      } else {
        // إذا لم يكن هناك اسم كامل، نحاول استخدام firstName و lastName منفصلين
        if (customerData.firstName) {
          userData.fn = await this.hashData(customerData.firstName);
        }
        if (customerData.lastName) {
          userData.ln = await this.hashData(customerData.lastName);
        }
      }
      
      // معالجة المدينة
      if (customerData.city || customerData.municipality) {
        const city = customerData.city || customerData.municipality;
        userData.ct = await this.hashData(city);
      }
      
      // معالجة الولاية
      if (customerData.state || customerData.province) {
        const state = customerData.state || customerData.province;
        userData.st = await this.hashData(state);
      }
      
      // معالجة الدولة
      if (customerData.country) {
        userData.country = await this.hashData(customerData.country);
      }
      
      // محاولة جلب عنوان IP
      try {
        const clientIP = await this.getClientIPAddress();
        if (clientIP) {
          userData.client_ip_address = clientIP; // عنوان IP لا يحتاج تشفير
        }
      } catch (error) {
      }
    }

    return userData;
  }
}

/**
 * دالة مساعدة لإنشاء instance من FacebookConversionAPI
 */
export function createFacebookConversionAPI(
  pixelId: string, 
  accessToken: string, 
  testEventCode?: string
): FacebookConversionAPI {
  return new FacebookConversionAPI(pixelId, accessToken, testEventCode);
}
