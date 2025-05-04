/**
 * وظيفة للتحقق ما إذا كان التطبيق يعمل في بيئة Electron
 * @returns {boolean} قيمة منطقية تشير إلى ما إذا كان التطبيق يعمل في Electron
 */
export function isElectron(): boolean {
  // تحقق من وجود نافذة عالمية (المتصفح)
  if (typeof window !== 'undefined' && typeof window.process === 'object') {
    return true;
  }

  // تحقق من وجود خاصية إلكترون في الكائن العالمي
  if (typeof window !== 'undefined' && typeof (window as any).electron !== 'undefined') {
    return true;
  }

  // تحقق من وجود كائن اتصال الإلكترون
  if (
    typeof window !== 'undefined' &&
    typeof (window as any).require === 'function' &&
    typeof (window as any).require('electron') !== 'undefined'
  ) {
    return true;
  }

  // تحقق من نوع المستعرض
  if (
    typeof navigator === 'object' &&
    typeof navigator.userAgent === 'string' &&
    navigator.userAgent.indexOf('Electron') >= 0
  ) {
    return true;
  }

  return false;
}

export default isElectron; 