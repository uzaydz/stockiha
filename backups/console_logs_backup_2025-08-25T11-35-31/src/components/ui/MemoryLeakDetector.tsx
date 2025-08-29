import { useEffect, useRef } from 'react';

// Hook للكشف عن memory leaks في التطوير
export const useMemoryLeakDetector = (componentName: string) => {
  const mountedRef = useRef(true);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    // تسجيل المكون في التطوير فقط
    if (process.env.NODE_ENV === 'development') {
      console.log(`🟢 ${componentName} mounted`);

      return () => {
        mountedRef.current = false;
        console.log(`🔴 ${componentName} unmounted`);
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
          console.log('📊 Memory Usage:', {
            usedJSHeapSize: Math.round(memory.usedJSHeapSize / 1048576 * 100) / 100 + ' MB',
            totalJSHeapSize: Math.round(memory.totalJSHeapSize / 1048576 * 100) / 100 + ' MB',
            jsHeapSizeLimit: Math.round(memory.jsHeapSizeLimit / 1048576 * 100) / 100 + ' MB'
          });
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, []);

  return null;
};
