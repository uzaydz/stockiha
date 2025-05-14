/**
 * ملف preload.js
 * يتم تحميله قبل أي JavaScript آخر لضمان توفر React والـ hooks الأساسية
 */

// (function() {
//   if (typeof window === 'undefined') return;
//   
//   console.log('تهيئة React والـ hooks في preload.js - النسخة المحسنة');
//   
//   // تعريف الـ hooks الأساسية وتوصيلها للنافذة العالمية
//   const noop = () => {};
//   const useStateHook = () => [undefined, () => {}];
//   
//   // ضمان تعريف جميع الـ hooks مباشرة في النافذة العالمية
//   // خاصة useLayoutEffect الذي يسبب المشكلة الرئيسية
//   window.useLayoutEffect = function useLayoutEffect(fn, deps) {
//     console.log('تم استدعاء useLayoutEffect من النافذة العالمية');
//     return undefined;
//   };
//   
//   window.useState = useStateHook;
//   window.useEffect = noop;
//   window.useRef = () => ({ current: null });
//   window.useContext = () => null;
//   window.useReducer = () => [null, noop];
//   window.useCallback = (cb) => cb;
//   window.useMemo = (fn) => fn();
//   window.useImperativeHandle = noop;
//   window.useDebugValue = noop;
//   window.useTransition = () => [false, noop];
//   window.useDeferredValue = (value) => value;
//   window.useId = () => "id";
//   
//   // نعرف أيضًا React كمتغير عالمي حتى لو كان موجودًا بالفعل
//   // للتأكد من توفر جميع الـ hooks المطلوبة
//   window.React = window.React || {};
//   
//   // نضمن توفر الدوال الأساسية لـ React
//   window.React.createElement = window.React.createElement || function(type, props, ...children) {
//     return { type, props, children };
//   };
//   
//   window.React.createContext = window.React.createContext || function() {
//     return {
//       Provider: noop,
//       Consumer: noop,
//       displayName: ''
//     };
//   };
//   
//   // نضيف جميع الـ hooks إلى React مباشرة
//   window.React.useLayoutEffect = window.useLayoutEffect;
//   window.React.useState = window.useState;
//   window.React.useEffect = window.useEffect;
//   window.React.useRef = window.useRef;
//   window.React.useContext = window.useContext;
//   window.React.useReducer = window.useReducer;
//   window.React.useCallback = window.useCallback;
//   window.React.useMemo = window.useMemo;
//   window.React.useImperativeHandle = window.useImperativeHandle;
//   window.React.useDebugValue = window.useDebugValue;
//   window.React.useTransition = window.useTransition;
//   window.React.useDeferredValue = window.useDeferredValue;
//   window.React.useId = window.useId;
//   
//   // نضيف دوال وكائنات React الأخرى
//   window.React.Fragment = window.React.Fragment || Symbol('Fragment');
//   window.React.Children = window.React.Children || {
//     map: (children, fn) => Array.isArray(children) ? children.map(fn) : [],
//     forEach: (children, fn) => Array.isArray(children) && children.forEach(fn),
//     count: (children) => Array.isArray(children) ? children.length : 0,
//     only: (children) => Array.isArray(children) ? children[0] : children,
//     toArray: (children) => Array.isArray(children) ? children : [children]
//   };
//   
//   // تعريف ReactDOM إذا لم يكن موجوداً
//   window.ReactDOM = window.ReactDOM || {
//     createRoot: () => ({
//       render: noop,
//       unmount: noop
//     }),
//     render: noop,
//     hydrate: noop,
//     unmountComponentAtNode: noop,
//     findDOMNode: noop
//   };
//   
//   console.log('تم تهيئة React وجميع الـ hooks بنجاح في preload.js');
//   
//   // نتأكد من أن preload قد تم تنفيذه أولاً
//   window.__REACT_PRELOAD_EXECUTED = true;
// })();