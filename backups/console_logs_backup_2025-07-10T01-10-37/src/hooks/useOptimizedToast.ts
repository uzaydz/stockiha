import { useCallback, useRef, useMemo } from 'react';
import { toast } from 'sonner';

interface ToastOptions {
  duration?: number;
  dismissible?: boolean;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
}

interface BatchedToast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'loading';
  message: string;
  options?: ToastOptions;
  timestamp: number;
}

export const useOptimizedToast = () => {
  const batchedToasts = useRef<BatchedToast[]>([]);
  const batchTimeout = useRef<NodeJS.Timeout | null>(null);
  const activeToasts = useRef<Map<string, string>>(new Map());

  // تجميع Toast messages لتقليل DOM updates
  const batchToasts = useCallback(() => {
    if (batchTimeout.current) {
      clearTimeout(batchTimeout.current);
    }

    batchTimeout.current = setTimeout(() => {
      if (batchedToasts.current.length === 0) return;

      // معالجة Toast في دفعات صغيرة لتجنب blocking
      const processBatch = () => {
        const batch = batchedToasts.current.splice(0, 3); // معالجة 3 toasts في المرة الواحدة
        
        requestAnimationFrame(() => {
          batch.forEach(({ id, type, message, options }) => {
            const toastId = toast[type](message, options);
            
            activeToasts.current.set(id, String(toastId));
          });

          // إذا كان هناك المزيد، متابعة المعالجة
          if (batchedToasts.current.length > 0) {
            setTimeout(processBatch, 50); // تأخير قصير بين الدفعات
          }
        });
      };

      processBatch();
    }, 16); // تأخير frame واحد
  }, []);

  // دالة محسنة لإضافة Toast
  const addToast = useCallback((
    type: 'success' | 'error' | 'warning' | 'info' | 'loading',
    message: string,
    options?: ToastOptions
  ): string => {
    const id = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // تجنب إضافة نفس الرسالة مرة أخرى
    const existingToast = batchedToasts.current.find(t => 
      t.message === message && t.type === type && Date.now() - t.timestamp < 1000
    );
    
    if (existingToast) {
      return existingToast.id;
    }

    batchedToasts.current.push({
      id,
      type,
      message,
      options,
      timestamp: Date.now()
    });

    batchToasts();
    return id;
  }, [batchToasts]);

  // دوال مختصرة محسنة
  const success = useCallback((message: string, options?: ToastOptions) => 
    addToast('success', message, options), [addToast]);
  
  const error = useCallback((message: string, options?: ToastOptions) => 
    addToast('error', message, options), [addToast]);
  
  const warning = useCallback((message: string, options?: ToastOptions) => 
    addToast('warning', message, options), [addToast]);
  
  const info = useCallback((message: string, options?: ToastOptions) => 
    addToast('info', message, options), [addToast]);
  
  const loading = useCallback((message: string, options?: ToastOptions) => 
    addToast('loading', message, options), [addToast]);

  // إلغاء Toast محدد
  const dismiss = useCallback((toastId?: string) => {
    if (toastId && activeToasts.current.has(toastId)) {
      const realToastId = activeToasts.current.get(toastId);
      if (realToastId) {
        toast.dismiss(realToastId);
        activeToasts.current.delete(toastId);
      }
    } else {
      toast.dismiss();
      activeToasts.current.clear();
    }
  }, []);

  // إلغاء جميع Toast
  const dismissAll = useCallback(() => {
    batchedToasts.current = [];
    if (batchTimeout.current) {
      clearTimeout(batchTimeout.current);
    }
    toast.dismiss();
    activeToasts.current.clear();
  }, []);

  // Toast محسن للعمليات الطويلة
  const promiseToast = useCallback(async <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    },
    options?: ToastOptions
  ): Promise<T> => {
    const loadingId = loading(messages.loading, { 
      ...options, 
      duration: Infinity // لا ينتهي تلقائياً
    });

    try {
      const result = await promise;
      dismiss(loadingId);
      
      const successMessage = typeof messages.success === 'function' 
        ? messages.success(result) 
        : messages.success;
      
      success(successMessage, options);
      return result;
    } catch (err) {
      dismiss(loadingId);
      
      const errorMessage = typeof messages.error === 'function' 
        ? messages.error(err as Error) 
        : messages.error;
      
      error(errorMessage, options);
      throw err;
    }
  }, [loading, dismiss, success, error]);

  // Toast متسلسل للعمليات المتعددة
  const sequentialToast = useCallback((steps: Array<{
    message: string;
    duration?: number;
  }>) => {
    let currentStep = 0;
    
    const showNextStep = () => {
      if (currentStep < steps.length) {
        const step = steps[currentStep];
        const stepId = info(step.message, { 
          duration: step.duration || 2000 
        });
        
        currentStep++;
        
        setTimeout(() => {
          dismiss(stepId);
          showNextStep();
        }, step.duration || 2000);
      }
    };
    
    showNextStep();
  }, [info, dismiss]);

  return useMemo(() => ({
    success,
    error,
    warning,
    info,
    loading,
    dismiss,
    dismissAll,
    promiseToast,
    sequentialToast,
    // للتوافق مع الكود الموجود
    toast: {
      success,
      error,
      warning,
      info,
      loading,
      dismiss,
      promise: promiseToast
    }
  }), [
    success, error, warning, info, loading, 
    dismiss, dismissAll, promiseToast, sequentialToast
  ]);
}; 