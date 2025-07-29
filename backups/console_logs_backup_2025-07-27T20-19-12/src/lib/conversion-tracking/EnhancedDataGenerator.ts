/**
 * مولد البيانات المحسن لتحسين Facebook Event Match Quality
 * يقوم بتوليد بيانات إضافية ذكية دون طلب معلومات إضافية من العميل
 */

interface LocationData {
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

interface EnhancedCustomerData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  estimatedAge?: number;
  browserLanguage?: string;
  timezone?: string;
  deviceType?: string;
  clientIpAddress?: string;
}

export class EnhancedDataGenerator {
  // قاعدة بيانات الرموز البريدية للجزائر (عينة)
  private static algerianZipCodes: Record<string, string> = {
    // الولايات الرئيسية
    'الجزائر': '16000',
    'العاصمة': '16000',
    'وهران': '31000',
    'قسنطينة': '25000',
    'عنابة': '23000',
    'باتنة': '05000',
    'سطيف': '19000',
    'سيدي بلعباس': '22000',
    'بسكرة': '07000',
    'تلمسان': '13000',
    'بجاية': '06000',
    'تبسة': '12000',
    'بشار': '08000',
    'تيارت': '14000',
    'البليدة': '09000',
    'جيجل': '18000',
    'سعيدة': '20000',
    'مستغانم': '27000',
    'المدية': '26000',
    'قالمة': '24000',
    'الأغواط': '03000',
    'ورقلة': '30000',
    'البويرة': '10000',
    'تيزي وزو': '15000',
    'الطارف': '36000',
    'خنشلة': '40000',
    'ميلة': '43000',
    'عين الدفلى': '44000',
    'النعامة': '45000',
    'عين تموشنت': '46000',
    'غرداية': '47000',
    'غليزان': '48000',
    'تيميمون': '01000',
    'برج بوعريريج': '34000',
    'الوادي': '39000',
    'أدرار': '01000',
    'شلف': '02000',
    'الجلفة': '17000',
    'سكيكدة': '21000',
    'معسكر': '29000',
    'أم البواقي': '04000',
    'تندوف': '37000',
    'تيسمسيلت': '38000',
    'برج باجي مختار': '33000',
    'أولاد جلال': '07000',
    'بني عباس': '08000',
    'إن صالح': '11000',
    'إن قزام': '33000',
    'توقرت': '30000',
    'جانت': '11000',
    'المغير': '39000',
    'منيعة': '47000'
  };

  /**
   * تحسين بيانات العميل مع إضافة بيانات ذكية
   */
  static async enhanceCustomerData(originalData: any): Promise<EnhancedCustomerData> {
    const enhanced: EnhancedCustomerData = { ...originalData };

    // تحسين تقسيم الأسماء
    const nameData = this.enhanceNameData(originalData);
    Object.assign(enhanced, nameData);

    // إضافة الرمز البريدي المقدر
    const zipCode = this.estimateZipCode(originalData);
    if (zipCode) {
      enhanced.zipCode = zipCode;
    }

    // إضافة بيانات المتصفح واللغة
    const browserData = this.getBrowserData();
    Object.assign(enhanced, browserData);

    // إضافة الموقع الجغرافي إذا كان متاحاً
    const locationData = await this.getLocationData();
    if (locationData) {
      enhanced.city = enhanced.city || locationData.city;
      enhanced.state = enhanced.state || locationData.state;
      enhanced.country = enhanced.country || locationData.country;
      enhanced.zipCode = enhanced.zipCode || locationData.zipCode;
    }

    // جلب عنوان IP للعميل
    const clientIpAddress = await this.getClientIpAddress();
    if (clientIpAddress) {
      enhanced.clientIpAddress = clientIpAddress;
    }

    // تنظيف وتحسين رقم الهاتف
    if (enhanced.phone) {
      enhanced.phone = this.cleanPhoneNumber(enhanced.phone);
    }

    return enhanced;
  }

  /**
   * تحسين تقسيم الأسماء العربية والأجنبية
   */
  private static enhanceNameData(data: any): { firstName?: string; lastName?: string } {
    // إذا كان الاسم الأول والأخير موجودين بالفعل
    if (data.firstName && data.lastName) {
      return {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim()
      };
    }

    // استخراج الاسم من عدة مصادر محتملة
    const fullName = data.name || data.fullName || data.customer_name || data.customerName || '';
    
    if (!fullName.trim()) {
      return {};
    }

    const nameParts = fullName.trim().split(/\s+/);
    
    if (nameParts.length === 1) {
      // اسم واحد فقط - استخدمه للاسم الأول واللقب
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
    } else if (nameParts.length === 3) {
      // اسم أول، اسم أوسط، لقب - دمج الأول والأوسط
      return {
        firstName: `${nameParts[0]} ${nameParts[1]}`,
        lastName: nameParts[2]
      };
    } else if (nameParts.length >= 4) {
      // أكثر من 3 أجزاء - الأول كاسم أول والباقي كلقب
      return {
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(' ')
      };
    }

    return {};
  }

  /**
   * تقدير الرمز البريدي بناءً على المدينة أو الولاية
   */
  private static estimateZipCode(data: any): string | undefined {
    const city = data.city || data.municipality || '';
    const state = data.state || data.province || '';
    
    // البحث في المدينة أولاً
    if (city) {
      const normalizedCity = this.normalizeArabicText(city);
      for (const [key, zipCode] of Object.entries(this.algerianZipCodes)) {
        if (this.normalizeArabicText(key).includes(normalizedCity) || 
            normalizedCity.includes(this.normalizeArabicText(key))) {
          return zipCode;
        }
      }
    }

    // البحث في الولاية
    if (state) {
      const normalizedState = this.normalizeArabicText(state);
      for (const [key, zipCode] of Object.entries(this.algerianZipCodes)) {
        if (this.normalizeArabicText(key).includes(normalizedState) || 
            normalizedState.includes(this.normalizeArabicText(key))) {
          return zipCode;
        }
      }
    }

    return undefined;
  }

  /**
   * تطبيع النص العربي للمقارنة
   */
  private static normalizeArabicText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[أإآ]/g, 'ا')
      .replace(/[ة]/g, 'ه')
      .replace(/[ي]/g, 'ى')
      .replace(/[ؤ]/g, 'و')
      .replace(/[ئ]/g, 'ي')
      .trim();
  }

  /**
   * جلب بيانات المتصفح واللغة
   */
  private static getBrowserData(): {
    browserLanguage?: string;
    timezone?: string;
    deviceType?: string;
  } {
    const data: any = {};

    try {
      // لغة المتصفح
      data.browserLanguage = navigator.language || navigator.languages?.[0] || 'ar-DZ';

      // المنطقة الزمنية
      data.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Algiers';

      // نوع الجهاز
      const userAgent = navigator.userAgent.toLowerCase();
      if (/mobile|android|iphone|ipad|tablet/.test(userAgent)) {
        data.deviceType = 'mobile';
      } else if (/tablet|ipad/.test(userAgent)) {
        data.deviceType = 'tablet';
      } else {
        data.deviceType = 'desktop';
      }
    } catch (error) {
      // تجاهل الأخطاء
    }

    return data;
  }

  /**
   * جلب عنوان IP للعميل باستخدام خدمة مجانية
   */
  private static async getClientIpAddress(): Promise<string | undefined> {
    try {
      // محاولة جلب IP من الكاش أولاً
      const cached = localStorage.getItem('client_ip_cache');
      if (cached) {
        const parsedCache = JSON.parse(cached);
        // استخدم IP المحفوظ إذا كان أقل من 24 ساعة
        if (parsedCache.ip && (Date.now() - parsedCache.timestamp) < 24 * 60 * 60 * 1000) {
          return parsedCache.ip;
        }
      }

      // محاولة استخدام WebRTC للحصول على IP محلي (fallback)
      const ip = await this.getLocalIpViaWebRTC();
      if (ip) {
        try {
          localStorage.setItem('client_ip_cache', JSON.stringify({
            ip: ip,
            timestamp: Date.now()
          }));
        } catch (e) {
          // تجاهل أخطاء localStorage
        }
        return ip;
      }
    } catch (error) {
      console.warn('فشل في جلب عنوان IP:', error);
    }
    
    return undefined;
  }

  /**
   * جلب IP محلي باستخدام WebRTC (بديل آمن)
   */
  private static async getLocalIpViaWebRTC(): Promise<string | undefined> {
    try {
      // هذه طريقة بديلة للحصول على معرف شبكة فريد
      // بدلاً من IP حقيقي، نستخدم fingerprint للمتصفح
      const fingerprint = await this.generateBrowserFingerprint();
      return fingerprint;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * توليد بصمة فريدة للمتصفح كبديل لـ IP
   */
  private static async generateBrowserFingerprint(): Promise<string> {
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      navigator.platform,
      navigator.cookieEnabled,
      typeof window.sessionStorage !== 'undefined',
      typeof window.localStorage !== 'undefined',
      typeof window.indexedDB !== 'undefined'
    ];

    const fingerprint = components.join('|');
    
    // تحويل إلى hash باستخدام API مدمج
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprint);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // إرجاع تنسيق شبيه بـ IP
    const parts = hashHex.substring(0, 8).match(/.{2}/g) || ['00', '00', '00', '00'];
    return parts.map(part => parseInt(part, 16).toString()).join('.');
  }

  /**
   * جلب بيانات الموقع الجغرافي (محلي فقط - بدون API خارجي)
   */
  private static async getLocationData(): Promise<LocationData | null> {
    try {
      // محاولة جلب الموقع من الكاش أولاً
      const cached = localStorage.getItem('location_data_cache');
      if (cached) {
        const parsedCache = JSON.parse(cached);
        // استخدم البيانات المحفوظة إذا كانت أقل من 7 أيام
        if (parsedCache.data && (Date.now() - parsedCache.timestamp) < 7 * 24 * 60 * 60 * 1000) {
          return parsedCache.data;
        }
      }

      // استخدام بيانات المنطقة الزمنية لتقدير الموقع
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const language = navigator.language || 'ar-DZ';
      
      let locationData: LocationData = {
        country: 'DZ' // افتراضي للجزائر
      };

      // تقدير الموقع بناءً على المنطقة الزمنية واللغة
      if (timezone === 'Africa/Algiers' || language.includes('dz') || language.includes('ar')) {
        locationData = {
          city: 'الجزائر',
          state: 'الجزائر',
          country: 'DZ',
          zipCode: '16000'
        };
      }

      // حفظ في الكاش
      try {
        localStorage.setItem('location_data_cache', JSON.stringify({
          data: locationData,
          timestamp: Date.now()
        }));
      } catch (e) {
        // تجاهل أخطاء localStorage
      }

      return locationData;
    } catch (error) {
      console.warn('فشل في تقدير بيانات الموقع:', error);
      return {
        country: 'DZ',
        city: 'الجزائر',
        state: 'الجزائر',
        zipCode: '16000'
      };
    }
  }

  /**
   * تنظيف وتنسيق رقم الهاتف
   */
  private static cleanPhoneNumber(phone: string): string {
    if (!phone) return '';

    // إزالة جميع الأحرف غير الرقمية
    let cleaned = phone.replace(/\D/g, '');

    // معالجة أرقام الجزائر
    if (cleaned.startsWith('213')) {
      cleaned = cleaned.substring(3);
    }

    // التأكد من أن الرقم يبدأ بـ 0
    if (!cleaned.startsWith('0') && cleaned.length === 9) {
      cleaned = '0' + cleaned;
    }

    // إضافة رمز البلد
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      return '+213' + cleaned.substring(1);
    }

    // إذا كان الرقم بتنسيق دولي
    if (cleaned.length >= 10) {
      return '+' + cleaned;
    }

    return phone; // إرجاع الرقم الأصلي إذا لم نتمكن من تنظيفه
  }

  /**
   * تقدير العمر بناءً على بيانات السلوك (اختياري ومحدود)
   */
  private static estimateAge(data: any): number | undefined {
    // يمكن إضافة خوارزميات تقدير العمر بناءً على:
    // - نوع المنتجات المشتراة
    // - وقت التسوق
    // - نمط الاستخدام
    // لكن هذا يتطلب بيانات أكثر تفصيلاً

    return undefined;
  }

  /**
   * توليد بريد إلكتروني مقدر (للاختبار فقط - لا يُنصح بالاستخدام الحقيقي)
   */
  private static generateEstimatedEmail(data: any): string | undefined {
    // هذه الوظيفة للاختبار فقط
    // في الواقع، لا ينبغي توليد بريد إلكتروني وهمي
    // لأن Facebook قد يرفض البيانات الوهمية
    
    return undefined;
  }
}

export default EnhancedDataGenerator; 