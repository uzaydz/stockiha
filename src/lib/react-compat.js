// هذا الملف يستخدم لإصلاح مشاكل التوافق مع React في بعض البيئات

import React from 'react';

// إصلاح مشكلة useLayoutEffect للأنظمة التي لا تدعمها أو تواجه مشاكل
if (typeof window === 'undefined' || typeof window.document === 'undefined') {
  // في بيئة SSR، استبدل useLayoutEffect بـ useEffect لمنع الأخطاء
  React.useLayoutEffect = React.useEffect;
} else if (typeof React.useLayoutEffect === 'undefined') {
  // في حالة عدم وجود useLayoutEffect لأي سبب آخر
  React.useLayoutEffect = React.useEffect;
}

// إضافة إصلاح عالمي لـ React
if (typeof window !== 'undefined') {
  // تعريف React في النطاق العالمي لاستخدامه من قبل المكتبات الأخرى
  window.React = window.React || React;
  
  // التأكد من وجود APIs الأساسية لـ React
  if (window.React) {
    const _React = window.React;
    
    // التأكد من وجود useLayoutEffect
    if (!_React.useLayoutEffect) {
      _React.useLayoutEffect = _React.useEffect;
    }
    
    // التأكد من وجود createContext
    if (!_React.createContext) {
      _React.createContext = React.createContext;
    }
    
    // التأكد من وجود useState
    if (!_React.useState) {
      _React.useState = React.useState;
    }
    
    // التأكد من وجود useEffect
    if (!_React.useEffect) {
      _React.useEffect = React.useEffect;
    }
    
    // التأكد من وجود useRef
    if (!_React.useRef) {
      _React.useRef = React.useRef;
    }
    
    // التأكد من وجود useMemo
    if (!_React.useMemo) {
      _React.useMemo = React.useMemo;
    }
    
    // التأكد من وجود useCallback
    if (!_React.useCallback) {
      _React.useCallback = React.useCallback;
    }
    
    // التأكد من وجود useContext
    if (!_React.useContext) {
      _React.useContext = React.useContext;
    }
    
    // التأكد من وجود memo
    if (!_React.memo) {
      _React.memo = React.memo;
    }
    
    // التأكد من وجود forwardRef
    if (!_React.forwardRef) {
      _React.forwardRef = React.forwardRef;
    }
  }
}

// تصدير React الذي تم إصلاحه
export default React; 