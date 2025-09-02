import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAppReady } from '@/hooks/useAppReady';

interface DataReadyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireUserProfile?: boolean;
  requireOrganization?: boolean;
}

/**
 * مكون wrapper لضمان عدم عرض المحتوى قبل اكتمال تحميل البيانات المطلوبة
 * يمنع re-renders المتكررة ويضمن استقرار الواجهة
 */
const DataReadyWrapper: React.FC<DataReadyWrapperProps> = ({
  children,
  fallback,
  requireUserProfile = true,
  requireOrganization = false
}) => {
  const { user, userProfile, organization } = useAuth();
  const { isAppReady } = useAppReady();
  
  // التحقق من اكتمال البيانات المطلوبة
  const isDataReady = React.useMemo(() => {
    if (!isAppReady) return false;
    
    // إذا لم يكن هناك مستخدم، البيانات جاهزة للصفحات العامة
    if (!user) return !requireUserProfile;
    
    // إذا كان هناك مستخدم، تحقق من المتطلبات
    if (requireUserProfile && !userProfile) return false;
    if (requireOrganization && !organization) return false;
    
    return true;
  }, [isAppReady, user?.id, userProfile?.id, organization?.id, requireUserProfile, requireOrganization]);
  
  // عرض fallback إذا لم تكن البيانات جاهزة
  if (!isDataReady) {
    return fallback || (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return <>{children}</>;
};

export default DataReadyWrapper;
