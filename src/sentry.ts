import * as Sentry from "@sentry/react";
import { browserTracingIntegration } from "@sentry/react";

// تهيئة Sentry
Sentry.init({
  // DSN الخاص بمشروعك
  dsn: "https://4eb2e1dbef5a39d1de40252bd910dc24@o4509355583668224.ingest.de.sentry.io/4509355586814032",
  
  // تمكين إرسال معلومات إضافية عن المستخدم (عنوان IP، الكوكيز، إلخ)
  sendDefaultPii: true,
  
  // إعدادات البيئة
  environment: process.env.NODE_ENV,
  
  // نسبة أخذ العينات للأداء (1.0 يعني تتبع 100% من المعاملات)
  tracesSampleRate: 1.0,
  
  // تحديد المواقع التي سيتم تتبع الأداء لها
  tracePropagationTargets: ["localhost", /^https:\/\/yourdomain\.com/],
  
  // التكاملات
  integrations: [
    browserTracingIntegration(),
  ],
});

// إضافة مراقبة الأخطاء غير المتوقعة
window.addEventListener('error', (event) => {
  Sentry.captureException(event.error);
});

// إضافة مراقبة الوعود غير المعالجة
window.addEventListener('unhandledrejection', (event) => {
  Sentry.captureException(event.reason);
});

// تصدير وظائف مساعدة لتتبع الأخطاء يدوياً
export const logError = (error: Error, context: Record<string, any> = {}) => {
  Sentry.withScope((scope) => {
    scope.setExtras(context);
    Sentry.captureException(error);
  });
};

export const logMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  Sentry.captureMessage(message, level);
};

// تصدير وظيفة لتسجيل معلومات المستخدم
export const setUserContext = (user: { 
  id?: string; 
  email?: string; 
  username?: string; 
  [key: string]: any; 
}) => {
  Sentry.setUser(user);
};

// تصدير وظيفة لتسجيل معلومات إضافية
export const setExtraContext = (key: string, value: any) => {
  Sentry.setExtra(key, value);
};

// تصدير وظيفة لتسجيل العلامات
export const setTag = (key: string, value: string) => {
  Sentry.setTag(key, value);
};
