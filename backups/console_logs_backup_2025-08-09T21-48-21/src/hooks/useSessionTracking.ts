import { useEffect, useRef } from 'react';

// تم تعطيل تتبع الجلسات والأجهزة مؤقتاً: لا يتم أي إرسال/جلب من قاعدة البيانات
export function useSessionTracking() {
  const sessionTokenRef = useRef<string | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    // لا شيء: معطل
    return () => {
      // لا شيء عند التفكيك
    };
  }, []);

  return {
    sessionToken: sessionTokenRef.current,
    lastActivity: lastActivityRef.current
  };
}
