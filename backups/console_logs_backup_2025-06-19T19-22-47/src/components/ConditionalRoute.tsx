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
  const { isAppEnabled, organizationApps } = useApps();

  // تحسين فحص تفعيل التطبيق مع memoization
  const isEnabled = useMemo(() => {
    return isAppEnabled(appId);
  }, [appId, organizationApps, isAppEnabled]);

  // إذا لم يكن التطبيق مفعّل، إعادة توجيه إلى المسار الافتراضي
  if (!isEnabled) {
    return <Navigate to={fallbackPath} replace />;
  }

  // إذا كان التطبيق مفعّل، عرض المحتوى العادي
  return <>{children}</>;
};

export default ConditionalRoute;
