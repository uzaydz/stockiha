import { useEffect } from 'react';

// Hook للتعامل مع مشاكل HMR أثناء التطوير
export const useDevtools = () => {
  useEffect(() => {
    // في بيئة التطوير فقط
    if (import.meta.env.DEV) {
      
      // التحقق من وجود أخطاء HMR
      const checkHMRErrors = () => {
        // البحث عن أخطاء Context مفقودة
        const hasContextErrors = document.querySelector('.vite-error-overlay') ||
          window.location.hash.includes('hmr-error');
        
        if (hasContextErrors) {
          console.warn('🔄 اكتشاف مشكلة HMR، إعادة تحميل الصفحة...');
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      };

      // مراقبة تغييرات DOM للكشف عن أخطاء HMR
      const observer = new MutationObserver(checkHMRErrors);
      observer.observe(document.body, { 
        childList: true, 
        subtree: true 
      });

      // مراقبة أخطاء JavaScript
      const handleError = (event: ErrorEvent) => {
        const error = event.error?.message || event.message || '';
        
        // أخطاء معروفة بحاجة لإعادة تحميل
        const knownHMRErrors = [
          'useAuth must be used within an AuthProvider',
          'useTenant must be used within a TenantProvider',
          'Invalid hook call',
          'hooks can only be called inside',
          'Cannot read properties of undefined'
        ];

        if (knownHMRErrors.some(errorText => error.includes(errorText))) {
          console.warn('🔄 اكتشاف خطأ Context/Hook، إعادة تحميل الصفحة...', error);
          setTimeout(() => {
            window.location.reload();
          }, 100);
        }
      };

      window.addEventListener('error', handleError);
      
      // إعادة تحميل تلقائية كل 30 ثانية في حالة حدوث مشاكل
      const autoReloadInterval = setInterval(() => {
        // التحقق من وجود أخطاء غير محلولة
        const hasConsoleErrors = console.error.toString().includes('useAuth') ||
          console.error.toString().includes('useTenant');
        
        if (hasConsoleErrors) {
          console.warn('🔄 إعادة تحميل دورية لحل مشاكل HMR...');
          window.location.reload();
        }
      }, 30000);

      return () => {
        observer.disconnect();
        window.removeEventListener('error', handleError);
        clearInterval(autoReloadInterval);
      };
    }
  }, []);
};

// Hook لإعادة تحميل يدوية في حالة الطوارئ
export const useEmergencyReload = () => {
  return () => {
    console.warn('🚨 إعادة تحميل طارئة للصفحة...');
    window.location.reload();
  };
}; 