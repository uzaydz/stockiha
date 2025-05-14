/**
 * هذا الملف يقوم بتعريف React كمتغير عالمي في النافذة
 * لحل مشكلة المكتبات التي تعتمد على وجود React عالمياً
 */

import React from 'react';
import ReactDOM from 'react-dom';

// تعريف React كمتغير عالمي
if (typeof window !== 'undefined') {
  window.React = React;
  window.ReactDOM = ReactDOM;

  // التأكد من توفر useLayoutEffect
  if (!React.useLayoutEffect) {
    console.warn('تم اكتشاف نقص useLayoutEffect، استخدام useEffect بدلاً منه');
    React.useLayoutEffect = React.useEffect;
  }

  // تعريف البعض من الـ hooks الأخرى للتوافق
  // بعض المكتبات تتوقع وجود React في window
  const reactHooks = {
    useState: React.useState,
    useEffect: React.useEffect,
    useContext: React.useContext,
    useReducer: React.useReducer,
    useCallback: React.useCallback,
    useMemo: React.useMemo,
    useRef: React.useRef,
    useLayoutEffect: React.useLayoutEffect
  };

  // نسخ جميع الـ hooks إلى النافذة العالمية
  Object.assign(window, reactHooks);
  
  console.log('تم تعريف React عالمياً بنجاح');
}

export default React; 