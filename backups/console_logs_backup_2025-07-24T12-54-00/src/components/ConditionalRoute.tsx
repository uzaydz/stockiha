import React, { useMemo } from 'react';
import { useAppsData, useIsAppEnabled, useSuperUnifiedData } from '@/context/SuperUnifiedDataContext';
import { Navigate } from 'react-router-dom';

interface ConditionalRouteProps {
  appId: string;
  children: React.ReactNode;
  fallbackPath?: string;
}

/**
 * مكون محسن لعرض المحتوى بشكل مشروط بناءً على حالة تفعيل التطبيق
 * يستخدم memoization لتحسين الأداء
 */
const ConditionalRoute: React.FC<ConditionalRouteProps> = ({ 
  appId, 
  children, 
  fallbackPath = '/dashboard' 
}) => {
  const { organizationApps } = useAppsData();
  const { isLoading } = useSuperUnifiedData();
  const isEnabled = useIsAppEnabled(appId);

  // إضافة console.log للتشخيص
  console.log('🔍 [ConditionalRoute] التحقق من التطبيق:', {
    appId,
    isEnabled,
    isLoading,
    organizationAppsCount: organizationApps.length,
    organizationApps: organizationApps
  });

  // انتظار تحميل البيانات قبل اتخاذ قرار
  if (isLoading || organizationApps.length === 0) {
    // عرض شاشة تحميل بسيطة أثناء جلب بيانات التطبيقات
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
          <span className="text-sm text-muted-foreground">جاري التحقق من التطبيق...</span>
        </div>
      </div>
    );
  }

  // إذا لم يكن التطبيق مفعّل، إعادة توجيه إلى المسار الافتراضي
  if (!isEnabled) {
    if (import.meta.env.DEV) {
      console.log(`التطبيق ${appId} غير مفعل، إعادة توجيه إلى ${fallbackPath}`);
    }
    return <Navigate to={fallbackPath} replace />;
  }

  // إذا كان التطبيق مفعّل، عرض المحتوى العادي
  return <>{children}</>;
};

export default ConditionalRoute;
