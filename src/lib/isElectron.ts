/**
 * وظيفة للتحقق ما إذا كان التطبيق يعمل في بيئة Electron
 * @returns {boolean} قيمة منطقية تشير إلى ما إذا كان التطبيق يعمل في Electron
 */
export function isElectron(): boolean {
  // تحقق من وجود خاصية إلكترون أو API محدد للإلكترون
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    return true;
  }

  // تحقق من وجود عملية Electron
  if (
    typeof window !== 'undefined' && 
    typeof (window as any).process === 'object' &&
    (window as any).process?.type === 'renderer'
  ) {
    return true;
  }

  // تحقق من وجود كائن اتصال الإلكترون (الطريقة الأكثر موثوقية)
  if (
    typeof window !== 'undefined' &&
    typeof (window as any).require === 'function'
  ) {
    try {
      const electron = (window as any).require('electron');
      if (electron) return true;
    } catch (e) {
      // حدث خطأ أثناء محاولة استدعاء require('electron')
      // هذا يعني أننا لسنا في بيئة Electron
    }
  }

  // التحقق من نوع المستعرض (لا ينصح به كثيراً ولكنه مفيد)
  if (
    typeof navigator === 'object' &&
    typeof navigator.userAgent === 'string' &&
    navigator.userAgent.indexOf('Electron') >= 0
  ) {
    return true;
  }

  // تحقق إضافي: Electron يضيف عادة بعض الخصائص المحددة
  if (typeof window !== 'undefined') {
    // طباعة تشخيصية لتحديد المشكلة
    console.log('[isElectron] التشخيص:', {
      hasElectronAPI: !!(window as any).electronAPI,
      hasElectronProcess: typeof (window as any).process === 'object' && (window as any).process?.type === 'renderer',
      userAgent: navigator?.userAgent
    });
  }

  // بشكل افتراضي، نفترض أننا في بيئة المتصفح
  return false;
}

export default isElectron; 