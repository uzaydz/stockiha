/**
 * 🚀 Context Performance Optimizer
 * أدوات تحسين الأداء للـ contexts لمنع re-renders غير الضرورية
 */

import React, { useRef, useCallback, useMemo } from 'react';

/**
 * Hook لمنع re-renders غير الضرورية عبر deep comparison
 */
export function useStableValue<T>(value: T): T {
  const ref = useRef<T>(value);
  
  // مقارنة عميقة مبسطة
  const isEqual = useMemo(() => {
    if (value === ref.current) return true;
    if (typeof value !== 'object' || typeof ref.current !== 'object') return false;
    if (!value || !ref.current) return value === ref.current;
    
    const keys1 = Object.keys(value);
    const keys2 = Object.keys(ref.current);
    
    if (keys1.length !== keys2.length) return false;
    
    for (const key of keys1) {
      if ((value as any)[key] !== (ref.current as any)[key]) return false;
    }
    
    return true;
  }, [value]);
  
  if (!isEqual) {
    ref.current = value;
  }
  
  return ref.current;
}

/**
 * Hook لتجميع التحديثات لمنع multiple re-renders
 */
export function useBatchedUpdates() {
  const pendingUpdates = useRef<(() => void)[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const batchUpdate = useCallback((updateFn: () => void) => {
    pendingUpdates.current.push(updateFn);
    
    if (timeoutRef.current) return;
    
    timeoutRef.current = setTimeout(() => {
      const updates = pendingUpdates.current.splice(0);
      updates.forEach(update => update());
      timeoutRef.current = null;
    }, 0);
  }, []);
  
  return batchUpdate;
}

/**
 * Hook لـ debouncing قيم الـ state
 */
export function useDebounced<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  React.useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);
  
  return debouncedValue;
}

/**
 * HOC لتحسين أداء الـ Context Providers
 */
export function optimizeContextProvider<P extends object>(
  Component: React.ComponentType<P>,
  displayName?: string
) {
  const OptimizedComponent = React.memo(Component);
  if (displayName) {
    OptimizedComponent.displayName = displayName;
  }
  return OptimizedComponent;
}

/**
 * Hook لمراقبة عدد re-renders (للـ development فقط)
 */
export function useRenderCount(componentName: string) {
  const renderCount = useRef(0);
  renderCount.current++;
  
  if (process.env.NODE_ENV === 'development') {
    React.useEffect(() => {
      console.log(`🔄 [${componentName}] Render count: ${renderCount.current}`);
    });
  }
}

/**
 * Hook لمراقبة تغييرات الـ dependencies
 */
export function useDependencyTracker(dependencies: any[], componentName: string) {
  const previousDependencies = useRef(dependencies);
  
  if (process.env.NODE_ENV === 'development') {
    React.useEffect(() => {
      dependencies.forEach((dep, index) => {
        if (dep !== previousDependencies.current[index]) {
          console.log(`📝 [${componentName}] Dependency ${index} changed:`, {
            from: previousDependencies.current[index],
            to: dep
          });
        }
      });
      previousDependencies.current = dependencies;
    });
  }
}

/**
 * Hook محسن لـ useCallback مع dependency tracking
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  const callbackRef = useRef<T>(callback);
  const depsRef = useRef(deps);
  
  // تحقق من تغيير الـ dependencies
  const depsChanged = useMemo(() => {
    if (deps.length !== depsRef.current.length) return true;
    return deps.some((dep, index) => dep !== depsRef.current[index]);
  }, [deps]);
  
  if (depsChanged) {
    callbackRef.current = callback;
    depsRef.current = deps;
  }
  
  return useCallback(callbackRef.current, deps);
}

/**
 * Hook محسن لـ useMemo مع performance monitoring
 */
export function useStableMemo<T>(
  factory: () => T,
  deps: React.DependencyList,
  debugName?: string
): T {
  const startTime = performance.now();
  
  const result = useMemo(() => {
    const value = factory();
    const endTime = performance.now();
    
    if (process.env.NODE_ENV === 'development' && debugName) {
      console.log(`⚡ [${debugName}] useMemo execution time: ${endTime - startTime}ms`);
    }
    
    return value;
  }, deps);
  
  return result;
}
