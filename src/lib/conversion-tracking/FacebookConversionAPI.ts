import EnhancedDataGenerator from './EnhancedDataGenerator';

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
   * إنشاء payload لحدث معين مع تحسينات Event Match Quality
   */
  async createEventPayload(
    eventName: string,
    productId: string,
    value?: number,
    orderId?: string,
    customData?: Record<string, any>,
    customerData?: any
  ): Promise<FacebookConversionPayload> {
    // جلب معرفات Facebook المحسنة
    const fbp = this.getFacebookBrowserId();
    const fbc = await this.getEnhancedFacebookClickId();
    
    // إنشاء معرف خارجي فريد
    const externalId = orderId || 
                      customData?.customer_id ||
                      `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // تحسين البيانات باستخدام EnhancedDataGenerator
    const enhancedCustomerData = await EnhancedDataGenerator.enhanceCustomerData(customerData || {});
    
    // تشفير البيانات المطلوبة
    const hashedCountry = await this.hashData('dz');
    const hashedCustomerData = await this.createHashedUserData(enhancedCustomerData);

    // إنشاء البيانات المخصصة المحسنة
    const enhancedCustomData = {
      content_ids: [productId],
      content_type: 'product',
      currency: this.normalizeCurrencyForFacebook((customData && (customData.currency || customData.currency_code)) || 'DZD'),
      value: value,
      content_name: `منتج ${productId}`,
      content_category: 'ecommerce',
      num_items: 1,
      ...(orderId && { order_id: orderId }),
      // إضافة معلومات إضافية للتحليل
      device_type: enhancedCustomerData.deviceType,
      browser_language: enhancedCustomerData.browserLanguage,
      timezone: enhancedCustomerData.timezone,
      ...customData
    };

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
          client_ip_address: enhancedCustomerData.clientIpAddress,
          fbc: fbc,
          fbp: fbp,
          country: hashedCountry,
          ...hashedCustomerData
        },
        custom_data: enhancedCustomData,
        opt_out: false,
        referrer_url: document.referrer || undefined
      }],
      ...(this.testEventCode && { test_event_code: this.testEventCode })
    };
  }

  /**
   * تطبيع رمز العملة لاستخدامه مع Facebook Conversion API
   */
  private normalizeCurrencyForFacebook(input: string): string {
    if (!input) return 'USD';
    const trimmed = input.trim();
    const symbolMap: Record<string, string> = {
      'د.ج': 'DZD',
      'دج': 'DZD',
      'DA': 'DZD',
      '$': 'USD',
      '€': 'EUR',
      '£': 'GBP',
      '¥': 'JPY'
    };
    const mapped = symbolMap[trimmed] || trimmed.toUpperCase();
    if (mapped === 'DZD') return 'USD';
    if (/^[A-Z]{3}$/.test(mapped)) return mapped;
    const onlyLetters = mapped.replace(/[^A-Z]/g, '');
    if (onlyLetters.length === 3) return onlyLetters;
    return 'USD';
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
   * جلب Facebook Click ID
   */
  private getFacebookClickId(): string | undefined {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const fbclid = urlParams.get('fbclid');
      
      if (fbclid) {
        const fbc = `fb.1.${Date.now()}.${fbclid}`;
        try {
          localStorage.setItem('facebook_click_id', fbc);
        } catch {}
        return fbc;
      }
      
      try {
        const storedFbc = localStorage.getItem('facebook_click_id');
        if (storedFbc) {
          return storedFbc;
        }
      } catch {}
      
      return undefined;
    } catch {
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
   * إنشاء بيانات المستخدم مع التشفير المطلوب - محسنة
   */
  private async createHashedUserData(customerData?: any): Promise<any> {
    const userData: any = {};

    if (customerData) {
      // البيانات الأساسية
      if (customerData.email) {
        userData.em = await this.hashData(customerData.email);
      }
      if (customerData.phone) {
        // تنظيف رقم الهاتف قبل التشفير
        const cleanPhone = this.cleanPhoneNumber(customerData.phone);
        if (cleanPhone) {
          userData.ph = await this.hashData(cleanPhone);
        }
      }
      
      // الأسماء المحسنة
      if (customerData.firstName) {
        userData.fn = await this.hashData(customerData.firstName);
      }
      if (customerData.lastName) {
        userData.ln = await this.hashData(customerData.lastName);
      }
      
      // الموقع الجغرافي
      if (customerData.city || customerData.municipality) {
        const city = customerData.city || customerData.municipality;
        userData.ct = await this.hashData(city);
      }
      if (customerData.state || customerData.province) {
        const state = customerData.state || customerData.province;
        userData.st = await this.hashData(state);
      }
      if (customerData.country) {
        userData.country = await this.hashData(customerData.country);
      }
      
      // إضافة الرمز البريدي إذا كان متوفراً (حتى لو لم نطلبه من العميل)
      if (customerData.zipCode || customerData.postalCode) {
        userData.zp = await this.hashData(customerData.zipCode || customerData.postalCode);
      }
    }

    return userData;
  }

  /**
   * تنظيف رقم الهاتف لتحسين المطابقة
   */
  private cleanPhoneNumber(phone: string): string | null {
    if (!phone) return null;
    
    // إزالة جميع الأحرف غير الرقمية
    let cleaned = phone.replace(/\D/g, '');
    
    // معالجة أرقام الجزائر
    if (cleaned.startsWith('213')) {
      // إزالة رمز البلد إذا كان موجوداً
      cleaned = cleaned.substring(3);
    }
    
    // التأكد من أن الرقم يبدأ بـ 0
    if (!cleaned.startsWith('0') && cleaned.length === 9) {
      cleaned = '0' + cleaned;
    }
    
    // إضافة رمز البلد للرقم المنظف
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      return '+213' + cleaned.substring(1);
    }
    
    // إذا كان الرقم بتنسيق دولي بالفعل
    if (cleaned.length >= 10) {
      return '+' + cleaned;
    }
    
    return null;
  }

  /**
   * تحسين تقسيم الأسماء العربية والأجنبية
   */
  private enhanceNameSplitting(customerData?: any): { firstName?: string; lastName?: string } {
    if (!customerData?.name && !customerData?.firstName && !customerData?.lastName) {
      return {};
    }

    // إذا كان الاسم الأول والأخير موجودين بالفعل، استخدمهما
    if (customerData.firstName && customerData.lastName) {
      return {
        firstName: customerData.firstName.trim(),
        lastName: customerData.lastName.trim()
      };
    }

    // إذا كان لدينا اسم كامل فقط
    const fullName = customerData.name || customerData.fullName || '';
    if (!fullName.trim()) {
      return {};
    }

    const nameParts = fullName.trim().split(/\s+/);
    
    if (nameParts.length === 1) {
      // اسم واحد فقط - استخدمه كاسم أول ولقب
      return {
        firstName: nameParts[0],
        lastName: nameParts[0]
      };
    } else if (nameParts.length === 2) {
      // اسم أول ولقب
      return {
        firstName: nameParts[0],
        lastName: nameParts[1]
      };
    } else if (nameParts.length >= 3) {
      // أكثر من جزء - الأول كاسم أول والباقي كلقب
      return {
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(' ')
      };
    }

    return {};
  }

  /**
   * جلب عنوان IP للعميل باستخدام خدمة مجانية - تم إزالتها لصالح EnhancedDataGenerator
   */
  // تم نقل هذه الوظيفة إلى EnhancedDataGenerator.getClientIpAddress()

  /**
   * تحسين جلب Facebook Click ID
   */
  private async getEnhancedFacebookClickId(): Promise<string | undefined> {
    try {
      // أولاً: البحث في URL الحالي
      const urlParams = new URLSearchParams(window.location.search);
      const fbclid = urlParams.get('fbclid');
      
      if (fbclid) {
        const fbc = `fb.1.${Date.now()}.${fbclid}`;
        try {
          // حفظ في localStorage و cookie
          localStorage.setItem('facebook_click_id', fbc);
          const expirationDate = new Date();
          expirationDate.setTime(expirationDate.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 أيام
          document.cookie = `_fbc=${fbc}; expires=${expirationDate.toUTCString()}; path=/; domain=${window.location.hostname}`;
        } catch (e) {
          // تجاهل أخطاء الحفظ
        }
        return fbc;
      }
      
      // ثانياً: البحث في cookie
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === '_fbc' && value) {
          return value;
        }
      }
      
      // ثالثاً: البحث في localStorage
      try {
        const storedFbc = localStorage.getItem('facebook_click_id');
        if (storedFbc) {
          return storedFbc;
        }
      } catch (e) {
        // تجاهل أخطاء localStorage
      }
      
      // رابعاً: البحث في referrer URL
      if (document.referrer) {
        try {
          const referrerUrl = new URL(document.referrer);
          const referrerFbclid = referrerUrl.searchParams.get('fbclid');
          if (referrerFbclid) {
            const fbc = `fb.1.${Date.now()}.${referrerFbclid}`;
            try {
              localStorage.setItem('facebook_click_id', fbc);
            } catch (e) {
              // تجاهل الأخطاء
            }
            return fbc;
          }
        } catch (e) {
          // تجاهل أخطاء تحليل URL
        }
      }
      
      return undefined;
    } catch (error) {
      return undefined;
    }
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
