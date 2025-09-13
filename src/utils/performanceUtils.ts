// Performance utilities for reducing JavaScript execution time

/**
 * Defers the execution of non-critical code until the browser is idle
 */
export function deferUntilIdle<T>(
  fn: () => T | Promise<T>,
  options: { timeout?: number } = {}
): Promise<T> {
  return new Promise((resolve, reject) => {
    const { timeout = 5000 } = options;
    
    const execute = () => {
      try {
        const result = fn();
        if (result instanceof Promise) {
          result.then(resolve).catch(reject);
        } else {
          resolve(result);
        }
      } catch (error) {
        reject(error);
      }
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(execute, { timeout });
    } else {
      setTimeout(execute, 0);
    }
  });
}

/**
 * Preloads a module with retry logic for better reliability
 */
export function preloadModule(
  importFn: () => Promise<any>,
  options: { 
    maxRetries?: number; 
    retryDelay?: number;
    priority?: 'high' | 'low' | 'auto';
  } = {}
): Promise<any> {
  const { maxRetries = 2, retryDelay = 1000, priority = 'low' } = options;
  
  let attempts = 0;
  
  const tryLoad = (): Promise<any> => {
    attempts++;
    return importFn().catch((error) => {
      if (attempts < maxRetries) {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            tryLoad().then(resolve).catch(reject);
          }, retryDelay * attempts);
        });
      }
      throw error;
    });
  };

  // For low priority, defer the preload
  if (priority === 'low') {
    return deferUntilIdle(tryLoad, { timeout: 3000 });
  }
  
  return tryLoad();
}

/**
 * Splits JavaScript execution into smaller chunks to prevent blocking
 */
export function yieldToMain(): Promise<void> {
  return new Promise(resolve => {
    if (typeof MessageChannel !== 'undefined') {
      const channel = new MessageChannel();
      channel.port1.onmessage = () => resolve();
      channel.port2.postMessage(null);
    } else {
      setTimeout(resolve, 0);
    }
  });
}

/**
 * Batches multiple operations to reduce main thread blocking
 */
export async function batchOperations<T>(
  items: T[],
  processFn: (item: T) => void | Promise<void>,
  batchSize: number = 10
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    for (const item of batch) {
      await processFn(item);
    }
    
    // Yield to main thread after each batch
    if (i + batchSize < items.length) {
      await yieldToMain();
    }
  }
}

/**
 * Measures and reports component render performance
 */
export function measureRenderTime(componentName: string) {
  const startTime = performance.now();
  
  return () => {
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    if (renderTime > 16) { // More than one frame
      console.warn(`⚠️ ${componentName} took ${renderTime.toFixed(2)}ms to render`);
    }
    
    return renderTime;
  };
}

/**
 * Creates a debounced function for performance-critical operations
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Throttles function execution for performance
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Resource hints for better loading performance
 */
export const resourceHints = {
  preload: (href: string, as: string) => {
    if (typeof document === 'undefined') return;
    
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    document.head.appendChild(link);
  },
  
  prefetch: (href: string) => {
    if (typeof document === 'undefined') return;
    
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    document.head.appendChild(link);
  },
  
  preconnect: (href: string) => {
    if (typeof document === 'undefined') return;
    
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = href;
    document.head.appendChild(link);
  }
};

export default {
  deferUntilIdle,
  preloadModule,
  yieldToMain,
  batchOperations,
  measureRenderTime,
  debounce,
  throttle,
  resourceHints
};
