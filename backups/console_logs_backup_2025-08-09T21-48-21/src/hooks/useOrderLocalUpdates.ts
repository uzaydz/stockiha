import { useCallback } from 'react';
import { Order } from '@/components/orders/table/OrderTableTypes';

// Hook للتحديثات المحلية للطلبيات فقط، بدون جلب البيانات
export const useOrderLocalUpdates = () => {
  // تحديث الطلبية محلياً في الكاش المشترك
  const updateOrderLocally = useCallback((orderId: string, updates: Partial<Order>) => {
    // البحث عن الكاش المشترك في localStorage أو sessionStorage
    const cacheKey = `orders-cache-${orderId}`;
    const cached = sessionStorage.getItem(cacheKey);
    
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const updated = { ...parsed, ...updates };
        sessionStorage.setItem(cacheKey, JSON.stringify(updated));
      } catch (error) {
        console.warn('فشل في تحديث الكاش المحلي:', error);
      }
    }
  }, []);

  // حذف الطلبية من الكاش المحلي
  const removeOrderLocally = useCallback((orderId: string) => {
    const cacheKey = `orders-cache-${orderId}`;
    sessionStorage.removeItem(cacheKey);
  }, []);

  return {
    updateOrderLocally,
    removeOrderLocally,
  };
};
