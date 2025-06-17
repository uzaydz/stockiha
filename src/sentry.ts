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
  
  // نسبة أخذ العينات للأداء (تقليل إلى 0.1 لتقليل الضجيج)
  tracesSampleRate: 0.1,
  
  // تحديد المواقع التي سيتم تتبع الأداء لها
  tracePropagationTargets: ["localhost", /^https:\/\/yourdomain\.com/],
  
  // تقليل ضجيج الكونسول من Sentry في البيئة التطويرية
  debug: false,
  
  // التكاملات
  integrations: [
    browserTracingIntegration(),
  ],
  });
}

// إضافة مراقبة الأخطاء غير المتوقعة (فقط في الإنتاج)
if (!isDevelopment) {
  window.addEventListener('error', (event) => {
    Sentry.captureException(event.error);
  });

  // إضافة مراقبة الوعود غير المعالجة
  window.addEventListener('unhandledrejection', (event) => {
    Sentry.captureException(event.reason);
  });
}

// تصدير وظائف مساعدة لتتبع الأخطاء يدوياً (فقط في الإنتاج)
export const logError = (error: Error, context: Record<string, any> = {}) => {
  if (!isDevelopment) {
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
