import { useState, useCallback, useRef } from 'react';

interface RobustOperationOptions<T> {
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  fallbackValue?: T;
  onError?: (error: Error, attempt: number) => void;
  onSuccess?: (result: T, attempt: number) => void;
}

interface RobustOperationState<T> {
  isLoading: boolean;
  data: T | null;
  error: Error | null;
  attempt: number;
}

/**
 * Hook لمعالجة العمليات المعقدة مع إعادة المحاولة والـ fallback
 */
export function useRobustOperation<T>(
  operation: () => Promise<T>,
  options: RobustOperationOptions<T> = {}
) {
  const {
    timeout = 8000,
    maxRetries = 2,
    retryDelay = 1000,
    fallbackValue = null,
    onError,
    onSuccess
  } = options;

  const [state, setState] = useState<RobustOperationState<T>>({
    isLoading: false,
    data: null,
    error: null,
    attempt: 0
  });

  const abortController = useRef<AbortController | null>(null);
  const retryTimeout = useRef<NodeJS.Timeout | null>(null);

  const execute = useCallback(async (): Promise<T | null> => {
    // تنظيف العمليات السابقة
    if (abortController.current) {
      abortController.current.abort();
    }
    if (retryTimeout.current) {
      clearTimeout(retryTimeout.current);
    }

    abortController.current = new AbortController();
    
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      attempt: 0
    }));

    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        setState(prev => ({ ...prev, attempt: attempt + 1 }));

        // إنشاء timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          const timeoutId = setTimeout(() => {
            if (abortController.current) {
              abortController.current.abort();
            }
            reject(new Error(`Operation timeout after ${timeout}ms`));
          }, timeout);
          
          // تنظيف timeout عند إلغاء العملية
          abortController.current?.signal.addEventListener('abort', () => {
            clearTimeout(timeoutId);
          });
        });

        // تنفيذ العملية مع سباق مع timeout
        const result = await Promise.race([
          operation(),
          timeoutPromise
        ]);

        // نجحت العملية
        setState(prev => ({
          ...prev,
          isLoading: false,
          data: result,
          error: null
        }));

        onSuccess?.(result, attempt + 1);
        return result;

      } catch (error) {
        lastError = error as Error;
        
        // إذا تم إلغاء العملية، توقف فوراً
        if (abortController.current?.signal.aborted) {
          break;
        }

        onError?.(lastError, attempt + 1);

        // إذا كانت هذه المحاولة الأخيرة، لا تنتظر
        if (attempt === maxRetries) {
          break;
        }

        // انتظار قبل إعادة المحاولة
        await new Promise<void>((resolve) => {
          retryTimeout.current = setTimeout(resolve, retryDelay * (attempt + 1));
        });
      }
    }

    // فشلت جميع المحاولات
    setState(prev => ({
      ...prev,
      isLoading: false,
      data: fallbackValue as T,
      error: lastError
    }));

    return fallbackValue as T;
  }, [operation, timeout, maxRetries, retryDelay, fallbackValue, onError, onSuccess]);

  const cancel = useCallback(() => {
    if (abortController.current) {
      abortController.current.abort();
    }
    if (retryTimeout.current) {
      clearTimeout(retryTimeout.current);
    }
    setState(prev => ({
      ...prev,
      isLoading: false
    }));
  }, []);

  const reset = useCallback(() => {
    cancel();
    setState({
      isLoading: false,
      data: null,
      error: null,
      attempt: 0
    });
  }, [cancel]);

  return {
    ...state,
    execute,
    cancel,
    reset,
    isRetrying: state.attempt > 1 && state.isLoading
  };
}

/**
 * دالة مساعدة لتنفيذ عملية واحدة مع معالجة قوية
 */
export async function executeRobustOperation<T>(
  operation: () => Promise<T>,
  options: RobustOperationOptions<T> = {}
): Promise<T | null> {
  const {
    timeout = 8000,
    maxRetries = 2,
    retryDelay = 1000,
    fallbackValue = null,
    onError,
    onSuccess
  } = options;

  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // إنشاء timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Operation timeout after ${timeout}ms (attempt ${attempt + 1})`));
        }, timeout);
      });

      // تنفيذ العملية مع سباق مع timeout
      const result = await Promise.race([
        operation(),
        timeoutPromise
      ]);

      onSuccess?.(result, attempt + 1);
      return result;

    } catch (error) {
      lastError = error as Error;
      onError?.(lastError, attempt + 1);

      // إذا كانت هذه المحاولة الأخيرة، لا تنتظر
      if (attempt === maxRetries) {
        break;
      }

      // انتظار قبل إعادة المحاولة
      await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
    }
  }

  // فشلت جميع المحاولات، إرجاع fallback value
  return fallbackValue as T;
} 