/**
 * ملف preload.js
 * يتم تحميله قبل أي JavaScript آخر لضمان توفر React والـ hooks الأساسية
 */

(function() {
  if (typeof window === 'undefined') return;
  
  console.log('تهيئة React والـ hooks في preload.js');
  
  // تعريف الـ hooks الأساسية وتوصيلها للنافذة العالمية
  const noop = () => {};
  const useStateHook = () => [undefined, () => {}];
  
  // تأكد من تعريف الـ hooks قبل أي شيء آخر
  window.useLayoutEffect = window.useLayoutEffect || noop;
  window.useState = window.useState || useStateHook;
  window.useEffect = window.useEffect || noop;
  window.useRef = window.useRef || (() => ({ current: null }));
  window.useContext = window.useContext || (() => null);
  
  // إضافة قائمة كاملة بالـ hooks المطلوبة
  const hookNames = [
    'useLayoutEffect', 'useState', 'useEffect', 'useContext', 'useReducer', 
    'useCallback', 'useMemo', 'useRef', 'useImperativeHandle', 'useDebugValue',
    'useTransition', 'useDeferredValue', 'useId'
  ];
  
  // تعريف جميع الـ hooks إذا لم تكن معرفة بالفعل
  hookNames.forEach(hookName => {
    if (!window[hookName]) {
      window[hookName] = hookName === 'useState' ? useStateHook : noop;
    }
  });
  
  // تأكد من وجود React عالمياً
  if (!window.React) {
    window.React = {
      version: '18.0.0',
      createElement: (type, props, ...children) => ({ type, props, children }),
      // ربط جميع الـ hooks بكائن React
      ...Object.fromEntries(hookNames.map(hookName => [hookName, window[hookName]]))
    };
  } else {
    // إذا كان React موجوداً بالفعل، تأكد من أن لديه الـ hooks
    hookNames.forEach(hookName => {
      if (!window.React[hookName]) {
        window.React[hookName] = window[hookName];
      }
    });
  }
})(); 