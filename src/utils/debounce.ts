/**
 * /H'D E3'9/) DD@ Debouncing H Throttling
 */

/**
 * Debounce function - J$.1 *FAJ0 'D/'D) -*I JE1 HB* E9JF (/HF '3*/9'!'* ,/J/)
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return function debounced(...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, wait);
  };
}

/**
 * Throttle function - J6EF #F 'D/'D) *OFA0 E1) H'-/) 9DI 'D#C+1 AJ A*1) 2EFJ) E-//)
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  let lastResult: ReturnType<T>;

  return function throttled(...args: Parameters<T>) {
    if (!inThrottle) {
      lastResult = func(...args);
      inThrottle = true;

      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }

    return lastResult;
  };
}

/**
 * Debounce async function - F3.) */9E 'D/H'D async
 */
export function debounceAsync<T extends (...args: any[]) => Promise<any>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeoutId: NodeJS.Timeout | null = null;
  let pendingPromise: Promise<ReturnType<T>> | null = null;

  return function debouncedAsync(...args: Parameters<T>): Promise<ReturnType<T>> {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (!pendingPromise) {
      pendingPromise = new Promise<ReturnType<T>>((resolve) => {
        timeoutId = setTimeout(async () => {
          try {
            const result = await func(...args);
            resolve(result);
          } finally {
            timeoutId = null;
            pendingPromise = null;
          }
        }, wait);
      });
    }

    return pendingPromise;
  };
}

/**
 * Leading edge debounce - JFA0 'D/'D) AH1'K AJ #HD '3*/9'! +E JEF9 'D*FAJ0 'DE*C11
 */
export function debounceLeading<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  let timeoutId: NodeJS.Timeout | null = null;

  return function debouncedLeading(...args: Parameters<T>): ReturnType<T> | undefined {
    const callNow = !timeoutId;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      timeoutId = null;
    }, wait);

    if (callNow) {
      return func(...args);
    }
  };
}
