/**
 * تحديد ما إذا كان التطبيق يعمل في بيئة متصفح
 */
export const isBrowser = typeof window !== 'undefined';

/**
 * تحديد ما إذا كان التطبيق يعمل في بيئة خادم
 */
export const isServer = !isBrowser;

/**
 * تحديد ما إذا كان التطبيق يعمل في بيئة إنتاج
 */
export const isProduction = process.env.NODE_ENV === 'production';

/**
 * تحديد ما إذا كان التطبيق يعمل في بيئة تطوير
 */
export const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * تنفيذ دالة فقط في بيئة المتصفح
 * @param callback الدالة المراد تنفيذها في المتصفح
 */
export function runOnlyInBrowser(callback: () => void): void {
  if (isBrowser) {
    callback();
  }
}

/**
 * تنفيذ دالة فقط في بيئة الخادم
 * @param callback الدالة المراد تنفيذها في الخادم
 */
export function runOnlyOnServer(callback: () => void): void {
  if (isServer) {
    callback();
  }
} 