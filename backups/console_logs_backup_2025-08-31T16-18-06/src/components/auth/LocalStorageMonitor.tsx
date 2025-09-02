import { useEffect } from 'react';

export const LocalStorageMonitor = () => {
  useEffect(() => {
    // مراقبة التغييرات في localStorage
    const originalSetItem = localStorage.setItem;
    const originalRemoveItem = localStorage.removeItem;
    
    localStorage.setItem = function(key: string, value: string) {
      if (key === 'bazaar_auth_state') {
      }
      return originalSetItem.apply(this, [key, value]);
    };
    
    localStorage.removeItem = function(key: string) {
      if (key === 'bazaar_auth_state') {
      }
      return originalRemoveItem.apply(this, [key]);
    };
    
    // استعادة الدوال الأصلية عند إلغاء التركيب
    return () => {
      localStorage.setItem = originalSetItem;
      localStorage.removeItem = originalRemoveItem;
    };
  }, []);
  
  return null; // هذا المكون لا يرندر شيء
};
