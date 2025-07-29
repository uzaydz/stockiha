import React, { useMemo } from 'react';
import { useApps } from '@/context/AppsContext';
import { Navigate } from 'react-router-dom';

interface ConditionalRouteProps {
  appId: string;
  children: React.ReactNode;
  fallbackPath?: string;
}

/**
 * مكون محسن لعرض المحتوى بشكل مشروط بناءً على حالة تفعيل التطبيق
 * يستخدم مemoization لتحسين الأداء
 */
const ConditionalRoute: React.FC<ConditionalRouteProps> = ({ 
  appId, 
  children, 
  fallbackPath = '/dashboard' 
}) => {
  const { isAppEnabled, organizationApps, isLoading } = useApps();

  // تحسين فحص تفعيل التطبيق مع memoization
  const isEnabled = useMemo(() => {
    const enabled = isAppEnabled(appId);

    return enabled;
  }, [appId, organizationApps, isAppEnabled]);

  // انتظار تحميل بيانات التطبيقات قبل اتخاذ قرار
  if (isLoading || organizationApps.length === 0) {
    // عرض شاشة تحميل بسيطة أثناء جلب بيانات التطبيقات
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="mr-3 text-gray-600">جاري التحقق من التطبيق...</span>
      </div>
    );
  }

  // إذا لم يكن التطبيق مفعّل، إعادة توجيه إلى المسار الافتراضي
  if (!isEnabled) {
    if (import.meta.env.DEV) {
    }
    return <Navigate to={fallbackPath} replace />;
  }

  // إذا كان التطبيق مفعّل، عرض المحتوى العادي
  return <>{children}</>;
};

export default ConditionalRoute;
