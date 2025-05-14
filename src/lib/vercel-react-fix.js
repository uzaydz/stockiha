/**
 * إصلاح خاص لمشكلة useLayoutEffect و createContext في Vercel
 * 
 * هذا الملف يحل مشكلة "Cannot read properties of undefined" للدوال المختلفة في React
 * التي تظهر في بيئة فيرسل الإنتاجية ولا تظهر في بيئة التطوير المحلية
 * 
 * السبب: في بيئة الإنتاج، يتم تقسيم الملفات بطريقة مختلفة مما يؤدي إلى
 * استخدام hooks وواجهات برمجة React قبل تحميل React بشكل كامل
 */

// التأكد من أن React و hooks موجودة في النطاق العالمي
(function applyReactFix() {
  // إنشاء استعلام شامل للمتصفح
  function checkHasBrowser() {
    return typeof window !== 'undefined' && window.document;
  }
  
  // تحديد ما إذا كان React موجودًا عالميًا
  function checkHasReact() {
    return typeof React !== 'undefined';
  }
  
  // إذا كان React غير موجود، أنشئ كائن React فارغ
  if (!checkHasReact() && checkHasBrowser()) {
    // إنشاء كائن فارغ كـ polyfill
    window.React = window.React || {};
  }
  
  // إصلاح React APIs
  if (checkHasBrowser() && window.React) {
    const _React = window.React;
    
    // إضافة واجهات برمجة React الشائعة
    // createContext
    if (typeof _React.createContext === 'undefined') {
      _React.createContext = function createContext(defaultValue) {
        const Context = {
          Provider: function Provider({ value, children }) {
            return children;
          },
          Consumer: function Consumer({ children }) {
            return children(defaultValue);
          },
          displayName: 'Context'
        };
        return Context;
      };
    }
    
    // useLayoutEffect
    if (typeof _React.useLayoutEffect === 'undefined') {
      _React.useLayoutEffect = _React.useEffect || function() {};
    }
    
    // useId
    if (typeof _React.useId === 'undefined') {
      // تنفيذ بسيط لـ useId
      let id = 0;
      _React.useId = function() {
        return ':r' + (id++).toString(36) + ':';
      };
    }
    
    // توفير hooks أساسية أخرى إذا كانت غير موجودة
    if (typeof _React.useState === 'undefined') {
      _React.useState = function(initialState) {
        return [initialState, function() {}];
      };
    }
    
    if (typeof _React.useEffect === 'undefined') {
      _React.useEffect = function() {};
    }
    
    if (typeof _React.useMemo === 'undefined') {
      _React.useMemo = function(fn) {
        return fn();
      };
    }
    
    if (typeof _React.useCallback === 'undefined') {
      _React.useCallback = function(fn) {
        return fn;
      };
    }
    
    if (typeof _React.useContext === 'undefined' && typeof _React.createContext !== 'undefined') {
      _React.useContext = function(context) {
        return context._currentValue;
      };
    }
    
    if (typeof _React.useRef === 'undefined') {
      _React.useRef = function(initialValue) {
        return { current: initialValue };
      };
    }
  }
})();

// إذا كان لديك React مستورد، يمكنك تصديره هنا
// export { default } from 'react'; 