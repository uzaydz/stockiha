import React, { useMemo } from 'react';
import { useAppsData, useIsAppEnabled, useSuperUnifiedData } from '@/context/SuperUnifiedDataContext';
import { useApps } from '@/context/AppsContext';
import { Navigate } from 'react-router-dom';

interface ConditionalRouteProps {
  appId: string;
  children: React.ReactNode;
  fallbackPath?: string;
}

/**
 * مكون محسن لعرض المحتوى بشكل مشروط بناءً على حالة تفعيل التطبيق
 * يستخدم memoization لتحسين الأداء
 * يعمل مع AppsContext كبديل عندما لا يكون SuperUnifiedDataProvider متاحاً
 */
const ConditionalRoute: React.FC<ConditionalRouteProps> = ({ 
  appId, 
  children, 
  fallbackPath = '/dashboard' 
}) => {
  // محاولة استخدام SuperUnifiedDataContext أولاً
  let organizationApps: any[] = [];
  let isLoading = false;
  let isEnabled = false;

  try {
    const superUnifiedData = useSuperUnifiedData();
    const appsData = useAppsData();
    organizationApps = appsData.organizationApps || [];
    isLoading = superUnifiedData.isLoading;
    isEnabled = useIsAppEnabled(appId);
  } catch (error) {
    // إذا لم يكن SuperUnifiedDataProvider متاحاً، استخدم AppsContext
    try {
      const appsContext = useApps();
      organizationApps = appsContext.organizationApps || [];
      isLoading = appsContext.isLoading;
      isEnabled = appsContext.isAppEnabled(appId);
    } catch (appsError) {
      // إذا لم يكن أي من السياقين متاحاً، استخدم قيم افتراضية
      organizationApps = [];
      isLoading = false;
      isEnabled = false;
    }
  }

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
    }
    return <Navigate to={fallbackPath} replace />;
  }

  // إذا كان التطبيق مفعل، عرض المحتوى العادي
  return <>{children}</>;
};

export default ConditionalRoute;
