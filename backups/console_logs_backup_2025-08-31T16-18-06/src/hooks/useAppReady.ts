import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

/**
 * Hook لمراقبة حالة جاهزية التطبيق الكاملة
 * يتأكد من اكتمال تحميل جميع البيانات الأساسية قبل عرض المحتوى
 */
export const useAppReady = () => {
  const { authReady, user, userProfile, organization } = useAuth();
  const [isAppReady, setIsAppReady] = useState(false);
  
  useEffect(() => {
    // التحقق من جاهزية التطبيق
    const checkAppReadiness = () => {
      if (!authReady) return false;
      
      // إذا لم يكن هناك مستخدم، التطبيق جاهز للصفحات العامة
      if (!user) return true;
      
      // إذا كان هناك مستخدم، يجب أن يكون userProfile متاحاً
      if (!userProfile) return false;
      
      // كل شيء جاهز
      return true;
    };
    
    const ready = checkAppReadiness();
    if (ready && !isAppReady) {
      // تأخير قصير لضمان استقرار جميع المكونات
      const timer = setTimeout(() => {
        setIsAppReady(true);
      }, 50);
      
      return () => clearTimeout(timer);
    } else if (!ready && isAppReady) {
      setIsAppReady(false);
    }
  }, [authReady, user?.id, userProfile?.id, organization?.id, isAppReady]);
  
  return {
    isAppReady,
    authReady,
    hasUser: !!user,
    hasUserProfile: !!userProfile,
    hasOrganization: !!organization
  };
};

export default useAppReady;
