/**
 * 🔄 أدوات إجبار إعادة الرسم والتحديث الفوري
 * حل مشكلة عدم ظهور التحديثات فوراً في الواجهة
 */

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState, useEffect, useRef } from 'react';

// =================================================================
// 🎯 Force Rerender Hook - إجبار إعادة الرسم
// =================================================================

/**
 * Hook لإجبار إعادة رسم المكون
 */
export function useForceRerender() {
  const [, setForceUpdate] = useState({});
  
  const forceRerender = useCallback(() => {
    setForceUpdate({});
  }, []);
  
  return forceRerender;
}

// =================================================================
// 🎯 Reactive State Hook - حالة تفاعلية
// =================================================================

/**
 * Hook للحصول على حالة تفاعلية تُحدث الواجهة فوراً
 */
export function useReactiveState<T>(initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const forceRerender = useForceRerender();
  
  const setReactiveValue = useCallback((newValue: T | ((prev: T) => T)) => {
    setValue(newValue);
    // إجبار إعادة الرسم بعد تحديث القيمة
    setTimeout(forceRerender, 0);
  }, [forceRerender]);
  
  return [value, setReactiveValue] as const;
}

// =================================================================
// 🎯 Immediate Update Hook - تحديث فوري
// =================================================================

/**
 * Hook للتحديث الفوري للبيانات مع تجاوز جميع القيود
 */
export function useImmediateUpdate() {
  const queryClient = useQueryClient();
  const forceRerender = useForceRerender();
  
  const immediateUpdate = useCallback(async (
    queryKeys: string[] = [],
    options: {
      clearCache?: boolean;
      forceRefetch?: boolean;
      updateUI?: boolean;
    } = {}
  ) => {
    const { clearCache = true, forceRefetch = true, updateUI = true } = options;
    
    try {
      // 1. مسح الكاش إذا طُلب ذلك
      if (clearCache && typeof window !== 'undefined') {
        const controller = (window as any).requestController;
        if (controller) {
          controller.clearAllCaches();
        }
      }
      
      // 2. إجبار تحديث React Query
      if (queryKeys.length > 0) {
        await Promise.all(
          queryKeys.map(key => 
            queryClient.invalidateQueries({ 
              queryKey: [key],
              exact: false,
              refetchType: 'all'
            })
          )
        );
      } else {
        // تحديث شامل
        await queryClient.invalidateQueries({ 
          type: 'all',
          refetchType: 'all'
        });
      }
      
      // 3. إجبار إعادة جلب البيانات
      if (forceRefetch) {
        await queryClient.refetchQueries({
          type: 'active',
          stale: true
        });
      }
      
      // 4. تحديث الواجهة فوراً
      if (updateUI) {
        forceRerender();
      }

    } catch (error) {
    }
  }, [queryClient, forceRerender]);
  
  return immediateUpdate;
}

// =================================================================
// 🎯 Form State Sync Hook - مزامنة حالة النماذج
// =================================================================

/**
 * Hook لمزامنة حالة النماذج مع التحديثات الفورية
 */
export function useFormStateSync<T>(
  formValue: T,
  onUpdate?: (value: T) => void,
  dependencies: any[] = []
) {
  const [syncedValue, setSyncedValue] = useReactiveState(formValue);
  const forceRerender = useForceRerender();
  
  // مزامنة القيمة عند تغيير المدخل
  useEffect(() => {
    if (JSON.stringify(syncedValue) !== JSON.stringify(formValue)) {
      setSyncedValue(formValue);
      forceRerender();
    }
  }, [formValue, ...dependencies]);
  
  // تحديث القيمة مع إشعار
  const updateValue = useCallback((newValue: T) => {
    setSyncedValue(newValue);
    onUpdate?.(newValue);
    forceRerender();
  }, [setSyncedValue, onUpdate, forceRerender]);
  
  return [syncedValue, updateValue] as const;
}

// =================================================================
// 🎯 Component Visibility Hook - مراقبة ظهور المكون
// =================================================================

/**
 * Hook لمراقبة ظهور المكون وإجبار التحديث عند الحاجة
 */
export function useVisibilityUpdate(
  enabled: boolean = true,
  updateInterval: number = 1000
) {
  const forceRerender = useForceRerender();
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    if (!enabled) return;
    
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      setIsVisible(visible);
      
      if (visible) {
        // إجبار تحديث عند العودة للصفحة
        forceRerender();
      }
    };
    
    // مراقبة تغيير الرؤية
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // تحديث دوري
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        forceRerender();
      }
    }, updateInterval);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [enabled, updateInterval, forceRerender]);
  
  return isVisible;
}

// =================================================================
// 🎯 Global Update Functions - دوال التحديث العامة
// =================================================================

/**
 * دالة عامة لإجبار تحديث مكون معين
 */
export function forceComponentUpdate(componentId?: string) {
  // إرسال حدث مخصص لإجبار التحديث
  const event = new CustomEvent('forceComponentUpdate', {
    detail: { componentId, timestamp: Date.now() }
  });
  
  window.dispatchEvent(event);
}

/**
 * دالة عامة لإجبار تحديث جميع المكونات
 */
export function forceAllComponentsUpdate() {
  // إرسال حدث عام للتحديث
  const event = new CustomEvent('forceAllComponentsUpdate', {
    detail: { timestamp: Date.now() }
  });
  
  window.dispatchEvent(event);
}

// =================================================================
// 🎯 Auto Update Hook - تحديث تلقائي
// =================================================================

/**
 * Hook للتحديث التلقائي عند تغيير البيانات
 */
export function useAutoUpdate(
  watchedValues: any[],
  updateFn: () => void,
  delay: number = 100
) {
  const [lastValues, setLastValues] = useState(watchedValues);
  
  useEffect(() => {
    const hasChanged = JSON.stringify(lastValues) !== JSON.stringify(watchedValues);
    
    if (hasChanged) {
      const timeoutId = setTimeout(() => {
        updateFn();
        setLastValues(watchedValues);
      }, delay);
      
      return () => clearTimeout(timeoutId);
    }
  }, [watchedValues, updateFn, delay]);
}

// =================================================================
// 🎯 Smart Rerender Hook - إعادة رسم ذكية
// =================================================================

/**
 * Hook لإعادة الرسم الذكية مع تجنب الإفراط
 */
export function useSmartRerender(debounceMs: number = 100) {
  const [, setRenderKey] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const smartRerender = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setRenderKey(prev => prev + 1);
    }, debounceMs);
  }, [debounceMs]);
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return smartRerender;
}
