import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { isCallCenterAgent } from '@/lib/api/permissions';
import { Loader2 } from 'lucide-react';

interface CallCenterRouteProps {
  children?: React.ReactNode;
  requireSupervisor?: boolean; // هل يتطلب صلاحيات مشرف
}

/**
 * مكون حماية مسارات مركز الاتصال
 * يتحقق من أن المستخدم موظف مركز اتصال ولديه الصلاحيات المطلوبة
 */
export const CallCenterRoute: React.FC<CallCenterRouteProps> = ({ 
  children, 
  requireSupervisor = false 
}) => {
  const { user, userProfile, isLoading } = useAuth();
  const location = useLocation();

  // إذا كان النظام يحمل البيانات
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  // إذا لم يكن هناك مستخدم مسجل دخول
  if (!user || !userProfile) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // التحقق من أن المستخدم موظف مركز اتصال
  const isCallCenterAgent = Boolean(userProfile.call_center_agent_id) || userProfile.role === 'call_center_agent';
  
  if (!isCallCenterAgent) {
    
    // إعادة توجيه حسب دور المستخدم
    const userRole = userProfile.role;
    
    switch (userRole) {
      case 'admin':
      case 'owner':
        return <Navigate to="/dashboard" replace />;
      case 'employee':
        return <Navigate to="/pos" replace />;
      case 'customer':
        return <Navigate to="/shop" replace />;
      default:
        return <Navigate to="/unauthorized" replace />;
    }
  }

  // التحقق من صلاحيات المشرف إذا كانت مطلوبة
  if (requireSupervisor) {
    const isSupervisor = 
      userProfile.is_call_center_supervisor === true ||
      userProfile.user_metadata?.is_call_center_supervisor === true ||
      userProfile.app_metadata?.is_call_center_supervisor === true;

    if (!isSupervisor) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              غير مصرح لك بالوصول
            </h2>
            <p className="text-gray-600 mb-4">
              هذه الصفحة تتطلب صلاحيات مشرف مركز الاتصال
            </p>
            <button
              onClick={() => window.history.back()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              العودة للخلف
            </button>
          </div>
        </div>
      );
    }
  }

  // إذا تم التحقق من جميع الشروط، عرض المحتوى
  return children ? <>{children}</> : <Outlet />;
};

export default CallCenterRoute;
