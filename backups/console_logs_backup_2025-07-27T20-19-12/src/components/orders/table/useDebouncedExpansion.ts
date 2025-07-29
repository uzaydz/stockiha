import { useState, useCallback, useRef } from "react";

interface UseDebouncedExpansionProps {
  delay?: number;
}

export const useDebouncedExpansion = ({ delay = 150 }: UseDebouncedExpansionProps = {}) => {
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const timeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  const toggleExpansion = useCallback((orderId: string) => {
    // إلغاء أي timeout سابق لنفس الطلب
    if (timeoutRef.current[orderId]) {
      clearTimeout(timeoutRef.current[orderId]);
    }

    // إذا كان الطلب متوسعاً، أغلقه فوراً
    if (expandedOrders[orderId]) {
      setExpandedOrders(prev => ({
        ...prev,
        [orderId]: false
      }));
      delete timeoutRef.current[orderId];
      return;
    }

    // إذا لم يكن متوسعاً، أضف debounce للفتح
    timeoutRef.current[orderId] = setTimeout(() => {
      setExpandedOrders(prev => ({
        ...prev,
        [orderId]: true
      }));
      delete timeoutRef.current[orderId];
    }, delay);
  }, [expandedOrders, delay]);

  const isExpanded = useCallback((orderId: string) => {
    return !!expandedOrders[orderId];
  }, [expandedOrders]);

  const collapseAll = useCallback(() => {
    // إلغاء جميع timeouts المعلقة
    Object.values(timeoutRef.current).forEach(timeout => {
      clearTimeout(timeout);
    });
    timeoutRef.current = {};
    
    setExpandedOrders({});
  }, []);

  const expandedCount = Object.keys(expandedOrders).filter(key => expandedOrders[key]).length;

  return {
    expandedOrders,
    toggleExpansion,
    isExpanded,
    collapseAll,
    expandedCount,
  };
}; 