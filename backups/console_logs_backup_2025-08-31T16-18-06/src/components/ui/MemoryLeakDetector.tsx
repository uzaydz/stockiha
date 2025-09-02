import { useEffect, useRef } from 'react';

// Hook للكشف عن memory leaks في التطوير
export const useMemoryLeakDetector = (componentName: string) => {
  const mountedRef = useRef(true);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    // تسجيل المكون في التطوير فقط
    if (process.env.NODE_ENV === 'development') {

      return () => {
        mountedRef.current = false;
      };
    }
  }, [componentName]);

  // Helper للتأكد من أن المكون ما زال mounted
  const isMounted = () => mountedRef.current;

  // Helper لتسجيل cleanup functions
  const setCleanup = (cleanup: () => void) => {
    cleanupRef.current = cleanup;
  };

  // تنظيف عند unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  return { isMounted, setCleanup };
};

// مكون لمراقبة استخدام الذاكرة
export const MemoryMonitor = () => {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const interval = setInterval(() => {
        if ('memory' in performance) {
          const memory = (performance as any).memory;
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, []);

  return null;
};
