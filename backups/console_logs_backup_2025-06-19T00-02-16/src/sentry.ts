import * as Sentry from "@sentry/react";
import { browserTracingIntegration } from "@sentry/react";

// تعطيل Sentry في البيئة التطويرية لتقليل الضجيج في الكونسول
const isDevelopment = process.env.NODE_ENV === 'development';

if (!isDevelopment) {
  // تهيئة Sentry فقط في بيئة الإنتاج
  Sentry.init({
  // DSN الخاص بمشروعك
  dsn: "https://4eb2e1dbef5a39d1de40252bd910dc24@o4509355583668224.ingest.de.sentry.io/4509355586814032",
  
  // تمكين إرسال معلومات إضافية عن المستخدم (عنوان IP، الكوكيز، إلخ)
  sendDefaultPii: true,
  
  // إعدادات البيئة
  environment: process.env.NODE_ENV,
  
  // نسبة أخذ العينات للأداء (تقليل إلى 0.05 لتقليل الضجيج أكثر)
  tracesSampleRate: 0.05,
  
  // تقليل نسبة إرسال الأخطاء لتجنب الإفراط
  sampleRate: 0.2,
  
  // تحديد المواقع التي سيتم تتبع الأداء لها
  tracePropagationTargets: ["localhost", "stockiha.com", "www.stockiha.com"],
  
  // تقليل ضجيج الكونسول من Sentry في البيئة التطويرية
  debug: false,
  
  // تجاهل الأخطاء المتعلقة بالشبكة والتي لا نستطيع التحكم فيها
  beforeSend(event) {
    // تجاهل أخطاء الشبكة المعروفة
    if (event.exception) {
      const error = event.exception.values?.[0];
      if (error?.type === 'TypeError' && error?.value?.includes('Failed to fetch')) {
        return null; // لا ترسل هذا الخطأ
      }
      if (error?.type === 'NetworkError') {
        return null; // لا ترسل أخطاء الشبكة
      }
    }
    
    // تجاهل الأخطاء المتعلقة بـ Service Worker
    if (event.message?.includes('service worker') || event.message?.includes('sw-advanced')) {
      return null;
    }
    
    return event;
  },
  
  // تجاهل أخطاء معينة غير مفيدة
  ignoreErrors: [
    'Failed to fetch',
    'NetworkError',
    'ERR_NETWORK',
    'ERR_INTERNET_DISCONNECTED',
    'Network request failed',
    'Load failed',
    'The Internet connection appears to be offline',
    'Non-Error promise rejection captured',
    'ChunkLoadError'
  ],
  
  // التكاملات
  integrations: [
    browserTracingIntegration({
      // تقليل عدد العمليات المتتبعة
      enableInp: false,
      enableLongTask: false,
    }),
  ],
  });
}

// إضافة مراقبة الأخطاء غير المتوقعة (فقط في الإنتاج)
if (!isDevelopment) {
  window.addEventListener('error', (event) => {
    // تجاهل أخطاء الشبكة
    if (event.error?.message?.includes('Failed to fetch') || 
        event.error?.message?.includes('NetworkError')) {
      return;
    }
    Sentry.captureException(event.error);
  });

  // إضافة مراقبة الوعود غير المعالجة
  window.addEventListener('unhandledrejection', (event) => {
    // تجاهل أخطاء الشبكة
    if (event.reason?.message?.includes('Failed to fetch') || 
        event.reason?.message?.includes('NetworkError')) {
      return;
    }
    Sentry.captureException(event.reason);
  });
}

// تصدير وظائف مساعدة لتتبع الأخطاء يدوياً (فقط في الإنتاج)
export const logError = (error: Error, context: Record<string, any> = {}) => {
  if (!isDevelopment) {
    // تجاهل أخطاء الشبكة
    if (error.message?.includes('Failed to fetch') || 
        error.message?.includes('NetworkError')) {
      return;
    }
    
    Sentry.withScope((scope) => {
      scope.setExtras(context);
      Sentry.captureException(error);
    });
  } else {
    console.error('Development Error:', error, context);
  }
};

export const logMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  if (!isDevelopment) {
    Sentry.captureMessage(message, level);
  } else {
    console.log(`Development Message [${level}]:`, message);
  }
};

// تصدير وظيفة لتسجيل معلومات المستخدم (فقط في الإنتاج)
export const setUserContext = (user: { 
  id?: string; 
  email?: string; 
  username?: string; 
  [key: string]: any; 
}) => {
  if (!isDevelopment) {
    Sentry.setUser(user);
  }
};

// تصدير وظيفة لتسجيل معلومات إضافية (فقط في الإنتاج)
export const setExtraContext = (key: string, value: any) => {
  if (!isDevelopment) {
    Sentry.setExtra(key, value);
  }
};

// تصدير وظيفة لتسجيل العلامات (فقط في الإنتاج)
export const setTag = (key: string, value: string) => {
  if (!isDevelopment) {
    Sentry.setTag(key, value);
  }
};
