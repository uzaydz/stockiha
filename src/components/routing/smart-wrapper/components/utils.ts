/**
 * 🛠️ Utility Functions for Smart Wrapper Components
 * الدوال المساعدة لمكونات Smart Wrapper
 */

/**
 * دالة لتحسين الأداء عبر debouncing
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * دالة لتحسين الأداء عبر throttling
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * دالة لفحص الأداء
 */
export const measurePerformance = (name: string, fn: () => void) => {
  const start = performance.now();
  fn();
  const end = performance.now();
};

/**
 * دالة لتحسين التحميل
 */
export const loadWithPriority = async <T>(
  loader: () => Promise<T>,
  priority: 'high' | 'medium' | 'low' = 'medium'
): Promise<T> => {
  if (priority === 'high') {
    return await loader();
  }
  
  if (priority === 'medium' && typeof window !== 'undefined' && (window as any).requestIdleCallback) {
    return new Promise((resolve, reject) => {
      (window as any).requestIdleCallback(async () => {
        try {
          const result = await loader();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });
  }
  
  // fallback لـ setTimeout
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        const result = await loader();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }, priority === 'low' ? 100 : 10);
  });
};
