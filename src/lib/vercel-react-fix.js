/**
 * إصلاح خاص لمشكلة useLayoutEffect في Vercel
 * 
 * هذا الملف يحل مشكلة "Cannot read properties of undefined (reading 'useLayoutEffect')"
 * التي تظهر في بيئة فيرسل الإنتاجية ولا تظهر في بيئة التطوير المحلية
 * 
 * السبب: في بيئة الإنتاج، يتم تقسيم الملفات بطريقة مختلفة مما يؤدي إلى
 * استخدام hooks قبل تحميل React بشكل كامل
 */

// التأكد من أن React و hooks موجودة في النطاق العالمي
(function applyReactFix() {
  // إضافة React للنطاق العالمي إذا كان موجوداً
  if (typeof React !== 'undefined' && typeof window !== 'undefined') {
    window.React = React;
  }

  // إصلاح hooks في النطاق العالمي
  if (typeof window !== 'undefined' && window.React) {
    const _React = window.React;
    
    // إصلاح useLayoutEffect
    if (typeof _React.useLayoutEffect === 'undefined') {
      _React.useLayoutEffect = _React.useEffect;
    }
    
    // إصلاح hooks أخرى إذا لزم الأمر
    if (typeof _React.useId === 'undefined') {
      // تنفيذ بسيط لـ useId إذا كان غير متوفر
      let id = 0;
      _React.useId = function() {
        return ':r' + (id++).toString(36) + ':';
      };
    }
  }
})();

// إذا كان لديك React مستورد، يمكنك تصديره هنا
// export { default } from 'react'; 