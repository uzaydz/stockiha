import { useLayoutEffect, useEffect } from 'react';

// تحديد ما إذا كان التطبيق يعمل في بيئة متصفح أم خادم
const canUseDOM = !!(
  typeof window !== 'undefined' &&
  window.document &&
  window.document.createElement
);

/**
 * هوك متوافق بين البيئات (Isomorphic) يستخدم useLayoutEffect في المتصفح و useEffect في الخادم
 * يحل مشكلة "useLayoutEffect does nothing on the server" التي تظهر في SSR
 */
const useIsomorphicLayoutEffect = canUseDOM ? useLayoutEffect : useEffect;

export default useIsomorphicLayoutEffect; 