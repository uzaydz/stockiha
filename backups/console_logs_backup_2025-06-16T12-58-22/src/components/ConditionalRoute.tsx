import React from 'react';
import { useApps } from '@/context/AppsContext';
import { Navigate } from 'react-router-dom';

interface ConditionalRouteProps {
  appId: string;
  children: React.ReactNode;
  fallbackPath?: string;
}

/**
 * مكون لعرض المحتوى بشكل مشروط بناءً على حالة تفعيل التطبيق
 * يستخدم كـ wrapper للمكونات بدلاً من الروتس
 */
const ConditionalRoute: React.FC<ConditionalRouteProps> = ({ 
  appId, 
  children, 
  fallbackPath = '/dashboard' 
}) => {
  const { isAppEnabled } = useApps();

  // إذا لم يكن التطبيق مفعّل، إعادة توجيه إلى المسار الافتراضي
  if (!isAppEnabled(appId)) {
    return <Navigate to={fallbackPath} replace />;
  }

  // إذا كان التطبيق مفعّل، عرض المحتوى العادي
  return <>{children}</>;
};

export default ConditionalRoute; 