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

// تصدير React الذي تم إصلاحه
export default React; 