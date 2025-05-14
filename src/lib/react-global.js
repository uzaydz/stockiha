/**
 * هذا الملف يقوم بتعريف React كمتغير عالمي في النافذة
 * لحل مشكلة المكتبات التي تعتمد على وجود React عالمياً
 */

import React from 'react';
import ReactDOM from 'react-dom';

// تعريف React كمتغير عالمي
if (typeof window !== 'undefined') {
  // تخزين مرجع للـ React الأصلي
  const originalReact = window.React;

  // تعيين React الجديد مع الاحتفاظ بأي تعريفات موجودة مسبقاً
  window.React = {
    ...originalReact,
    ...React
  };
  window.ReactDOM = window.ReactDOM || ReactDOM;

  // التأكد من توفر createContext وباقي الدوال الأساسية
  const coreFunctions = [
    'createElement', 
    'createContext', 
    'createRef', 
    'forwardRef', 
    'isValidElement', 
    'Children', 
    'cloneElement', 
    'Component', 
    'Fragment', 
    'Suspense',
    'lazy',
    'memo',
    'version'
  ];

  // إضافة كل الدوال الأساسية إلى النافذة العالمية
  coreFunctions.forEach(funcName => {
    if (!window.React[funcName] && React[funcName]) {
      console.warn(`إضافة ${funcName} إلى React العالمي`);
      window.React[funcName] = React[funcName];
    }
  });

  // التأكد من توفر useLayoutEffect
  if (!window.React.useLayoutEffect) {
    console.warn('تم اكتشاف نقص useLayoutEffect، استخدام useEffect بدلاً منه');
    window.React.useLayoutEffect = React.useEffect || window.React.useEffect;
  }

  // تعريف جميع الـ hooks الضرورية
  const hookNames = [
    'useState', 
    'useEffect', 
    'useContext', 
    'useReducer', 
    'useCallback', 
    'useMemo', 
    'useRef', 
    'useImperativeHandle',
    'useLayoutEffect',
    'useDebugValue',
    'useTransition',
    'useDeferredValue',
    'useId',
    'useSyncExternalStore',
    'useInsertionEffect'
  ];

  // التأكد من توفر جميع الـ hooks في window.React
  hookNames.forEach(hookName => {
    if (!window.React[hookName] && React[hookName]) {
      console.warn(`إضافة ${hookName} إلى React العالمي`);
      window.React[hookName] = React[hookName];
    }
  });

  // نسخ الـ hooks مباشرة إلى window لبعض المكتبات التي تستخدمها بشكل مباشر
  hookNames.forEach(hookName => {
    if (!window[hookName] && React[hookName]) {
      window[hookName] = React[hookName];
    }
  });
  
  console.log('تم تعريف React عالمياً بنجاح');
}

// تصدير React المدمج مع أي تعريفات موجودة في النافذة
export default typeof window !== 'undefined' ? window.React : React; 