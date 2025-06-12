import { useEffect } from 'react';

export const LocalStorageMonitor = () => {
  useEffect(() => {
    // مراقبة التغييرات في localStorage
    const originalSetItem = localStorage.setItem;
    const originalRemoveItem = localStorage.removeItem;
    
    localStorage.setItem = function(key: string, value: string) {
      if (key === 'bazaar_auth_state') {
        console.log('📝 [LocalStorage] SET bazaar_auth_state:', {
          timestamp: new Date().toISOString(),
          valuePreview: value.substring(0, 100) + '...',
          stackTrace: new Error().stack?.split('\n').slice(1, 4)
        });
      }
      return originalSetItem.apply(this, [key, value]);
    };
    
    localStorage.removeItem = function(key: string) {
      if (key === 'bazaar_auth_state') {
        console.log('🗑️ [LocalStorage] REMOVE bazaar_auth_state:', {
          timestamp: new Date().toISOString(),
          stackTrace: new Error().stack?.split('\n').slice(1, 4)
        });
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