/**
 * وظيفة للتحقق ما إذا كان التطبيق يعمل في بيئة Electron
 * @returns {boolean} قيمة منطقية تشير إلى ما إذا كان التطبيق يعمل في Electron
 */

// تخزين نتيجة التشخيص لتجنب التكرار
let diagResultCache: boolean | null = null;
let hasDiagnosticRun = false;

export function isElectron(): boolean {
  // إذا تم تنفيذ الفحص مسبقاً، استخدم النتيجة المخزنة
  if (diagResultCache !== null) {
    return diagResultCache;
  }

  // تحقق من وجود خاصية إلكترون أو API محدد للإلكترون
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    diagResultCache = true;
    return true;
  }

  // تحقق من وجود عملية Electron
  if (
    typeof window !== 'undefined' && 
    typeof (window as any).process === 'object' &&
    (window as any).process?.type === 'renderer'
  ) {
    diagResultCache = true;
    return true;
  }

  // تحقق من وجود كائن اتصال الإلكترون (الطريقة الأكثر موثوقية)
  if (
    typeof window !== 'undefined' &&
    typeof (window as any).require === 'function'
  ) {
    try {
      const electron = (window as any).require('electron');
      if (electron) {
        diagResultCache = true;
        return true;
      }
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
    diagResultCache = true;
    return true;
  }

  // تحقق إضافي: Electron يضيف عادة بعض الخصائص المحددة
  if (typeof window !== 'undefined' && !hasDiagnosticRun) {
    // طباعة تشخيصية لتحديد المشكلة - مرة واحدة فقط
    console.log('[isElectron] التشخيص:', {
      hasElectronAPI: !!(window as any).electronAPI,
      hasElectronProcess: typeof (window as any).process === 'object' && (window as any).process?.type === 'renderer',
      userAgent: navigator?.userAgent
    });
    hasDiagnosticRun = true; // وضع علامة بأن التشخيص قد تم تنفيذه
  }

  // تخزين النتيجة لتجنب إعادة الحساب
  diagResultCache = false;
  
  // بشكل افتراضي، نفترض أننا في بيئة المتصفح
  return false;
}

export default isElectron; 