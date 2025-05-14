// هذا الملف يستخدم لإصلاح مشاكل التوافق مع React في بعض البيئات

import React from 'react';

// تأكد من تحميل React بشكل صحيح
if (!React) {
  console.error('React غير محدد في react-compat.js');
  throw new Error('React غير محدد في react-compat.js');
}

// إصلاح مشكلة useLayoutEffect للأنظمة التي لا تدعمها أو تواجه مشاكل
if (typeof window === 'undefined' || typeof window.document === 'undefined') {
  // في بيئة SSR، استبدل useLayoutEffect بـ useEffect لمنع الأخطاء
  React.useLayoutEffect = React.useEffect;
} else if (!React.useLayoutEffect) {
  // في حالة عدم وجود useLayoutEffect لأي سبب آخر
  console.warn('React.useLayoutEffect غير محدد، استخدام React.useEffect كإجراء بديل');
  React.useLayoutEffect = React.useEffect;
}

// التأكد من أن كل hooks الأساسية متوفرة وتحذير إذا كانت مفقودة
const essentialHooks = ['useState', 'useEffect', 'useContext', 'useReducer', 'useCallback', 'useMemo', 'useRef'];
essentialHooks.forEach(hookName => {
  if (!React[hookName]) {
    console.error(`Hook ${hookName} مفقود من React. قد يكون هناك مشكلة في تهيئة React.`);
  }
});

// تعيين React على النافذة لضمان توفره عالميًا (قد يساعد في حالات معينة)
if (typeof window !== 'undefined') {
  window.React = window.React || React;
}

// تصدير React الذي تم إصلاحه
export default React; 