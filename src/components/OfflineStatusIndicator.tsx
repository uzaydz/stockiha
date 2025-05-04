import { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';

/**
 * مكون لعرض حالة الاتصال بالإنترنت وتنبيه المستخدم عند تغير الحالة
 */
export default function OfflineStatusIndicator() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    // دالة مساعدة لتحديث حالة الاتصال
    const updateOnlineStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      
      if (online) {
        toast.success('تم استعادة الاتصال بالإنترنت', {
          description: 'جارٍ مزامنة البيانات المحلية...',
          duration: 5000,
        });
      } else {
        toast.warning('أنت الآن في وضع عدم الاتصال', {
          description: 'يمكنك الاستمرار في العمل وستتم المزامنة عند استعادة الاتصال',
          duration: 7000,
        });
      }
    };

    // إضافة مستمعي الأحداث
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // التنظيف عند إلغاء التحميل
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // إذا كان المستخدم متصلاً بالإنترنت، لا نعرض شيئًا
  if (isOnline) {
    return null;
  }

  // عرض مؤشر وضع عدم الاتصال
  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full bg-orange-100 dark:bg-orange-900 px-3 py-1.5 text-sm shadow-md">
      <WifiOff size={16} className="text-orange-600 dark:text-orange-300" />
      <span className="font-medium text-orange-700 dark:text-orange-200">
        وضع عدم الاتصال
      </span>
    </div>
  );
} 