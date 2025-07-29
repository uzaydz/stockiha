import { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// هوك مخصص يمكن استخدامه في مكونات أخرى للتحقق من حالة الاتصال
export const useOfflineStatus = () => {
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOffline;
};

/**
 * مكون مؤشر الاتصال بالإنترنت
 * يعرض إشعارات عندما يفقد المستخدم الاتصال بالإنترنت وعندما يستعيده
 */
export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('تم استعادة الاتصال بالإنترنت', {
        description: 'جاري مزامنة البيانات...',
        duration: 3000,
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error('أنت الآن غير متصل بالإنترنت', {
        description: 'ستتم مزامنة التغييرات عند استعادة الاتصال',
        duration: 3000,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // لا نعرض أي شيء في واجهة المستخدم إذا كان متصلاً بالإنترنت
  if (isOnline) {
    return null;
  }

  // عرض مؤشر عدم الاتصال في أسفل الشاشة
  return (
    <div className={cn(
      "fixed bottom-4 left-4 z-50 flex items-center gap-2",
      "rounded-full bg-destructive px-3 py-1.5 text-sm shadow-md"
    )}>
      <WifiOff size={16} className="text-destructive-foreground" />
      <span className="font-medium text-destructive-foreground">
        غير متصل بالإنترنت
      </span>
    </div>
  );
}
