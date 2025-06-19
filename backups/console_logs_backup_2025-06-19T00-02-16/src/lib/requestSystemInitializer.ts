/**
 * نظام التهيئة الرئيسي لمنع جميع الطلبات المكررة
 * يدمج جميع أنظمة الحماية في مكان واحد
 */

import { QueryClient } from '@tanstack/react-query';
import { initializeUltimateRequestController } from './ultimateRequestController';

class RequestSystemInitializer {
  private static instance: RequestSystemInitializer;
  private isInitialized = false;
  private queryClient: QueryClient | null = null;

  private constructor() {}

  public static getInstance(): RequestSystemInitializer {
    if (!RequestSystemInitializer.instance) {
      RequestSystemInitializer.instance = new RequestSystemInitializer();
    }
    return RequestSystemInitializer.instance;
  }

  public initialize(queryClient?: QueryClient): void {
    if (this.isInitialized) {
      console.log('⚠️ Request system already initialized');
      return;
    }

    console.log('🚀 Initializing comprehensive request deduplication system...');

    // إنشاء أو استخدام QueryClient مع إعدادات متوازنة
    this.queryClient = queryClient || new QueryClient({
      defaultOptions: {
        queries: {
          // إعدادات متوازنة تسمح بالتحديث الضروري
          refetchOnMount: true, // السماح بالتحديث عند تحميل المكون
          refetchOnWindowFocus: false, // منع التحديث عند التركيز على النافذة
          refetchOnReconnect: true, // السماح بالتحديث عند إعادة الاتصال
          refetchInterval: false, // منع التحديث التلقائي المجدول
          
          // إعدادات الكاش المحسنة
          staleTime: 2 * 60 * 1000, // 2 دقيقة بدلاً من 5 - يسمح بتحديث أسرع
          gcTime: 10 * 60 * 1000, // 10 دقائق
          
          // retry محسن مع السماح بإعادة المحاولة المحدودة
          retry: (failureCount, error: any) => {
            // عدم إعادة المحاولة للأخطاء 4xx
            if (error?.status >= 400 && error?.status < 500) return false;
            // إعادة المحاولة مرة واحدة فقط للأخطاء الأخرى
            return failureCount < 1;
          },
        },
        mutations: {
          retry: 1, // إعادة محاولة واحدة للطفرات
        }
      }
    });

    // تهيئة النظام الشامل
    initializeUltimateRequestController(this.queryClient);

    // تعطيل رسائل Sentry المزعجة
    this.disableSentryFetchLogging();

    // منع window.fetch المكررة
    this.setupGlobalFetchProtection();

    this.isInitialized = true;
    console.log('✅ Request deduplication system fully initialized');
  }

  private disableSentryFetchLogging(): void {
    // منع رسائل "Fetch finished loading" من Sentry وBrowser DevTools
    if (typeof window !== 'undefined') {
      // تعطيل console.log للرسائل المزعجة
      const originalConsoleLog = console.log;
      console.log = (...args) => {
        const message = args.join(' ');
        
        // تصفية رسائل Sentry والبرامج المزعجة
        if (
          message.includes('Fetch finished loading') ||
          message.includes('@sentry_react.js') ||
          message.includes('enhancedFetch') ||
          message.includes('ultimateRequestController.ts') ||
          message.includes('deduplicateSupabaseRequest') ||
          message.includes('window.fetch') ||
          (message.includes('GET "') && message.includes('supabase.co')) ||
          (message.includes('POST "') && message.includes('supabase.co')) ||
          message.includes('makeRequest @ @sentry_react.js') ||
          message.includes('sentryWrapped @ @sentry_react.js')
        ) {
          return; // منع طباعة هذه الرسائل
        }
        
        originalConsoleLog.apply(console, args);
      };

      // تطبيق تصفية إضافية لرسائل DevTools
      // ملاحظة: سيتم التعامل مع fetch في setupGlobalFetchProtection
    }
  }

  private setupGlobalFetchProtection(): void {
    if (typeof window === 'undefined') return;

    // حماية شاملة ضد fetch المكررة مع دمج Supabase deduplication
    const originalFetch = window.fetch;
    const activeRequests = new Map<string, Promise<Response>>();

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : input.toString();
      
      // إنشاء مفتاح فريد للطلب
      const requestKey = `${init?.method || 'GET'}:${url}`;
      
      // التحقق من الطلبات النشطة أولاً
      if (activeRequests.has(requestKey)) {
        console.log(`🚫 Global fetch protection: Blocked duplicate ${requestKey}`);
        return activeRequests.get(requestKey)!;
      }

      // للطلبات Supabase، استخدم النظام المتطور
      if ((url.includes('supabase.co/rest/v1/') || url.includes('/auth/v1/')) && 
          (window as any).__BAZAAR_SUPABASE_DEDUPLICATION__) {
        return (window as any).__BAZAAR_SUPABASE_DEDUPLICATION__(url, () => originalFetch(input, init));
      }

      // إنشاء طلب جديد للطلبات العادية
      const promise = originalFetch(input, init)
        .finally(() => {
          // إزالة من الطلبات النشطة بعد الانتهاء
          activeRequests.delete(requestKey);
        });

      activeRequests.set(requestKey, promise);
      return promise;
    };
  }

  public getQueryClient(): QueryClient | null {
    return this.queryClient;
  }

  public getStats() {
    return {
      isInitialized: this.isInitialized,
      queryClientExists: !!this.queryClient,
      timestamp: Date.now()
    };
  }
}

// إصدار singleton للاستخدام العام
export const requestSystemInitializer = RequestSystemInitializer.getInstance();

// دالة مساعدة للتهيئة السريعة
export const initializeRequestSystem = (queryClient?: QueryClient): QueryClient => {
  requestSystemInitializer.initialize(queryClient);
  return requestSystemInitializer.getQueryClient()!;
};

export default requestSystemInitializer; 