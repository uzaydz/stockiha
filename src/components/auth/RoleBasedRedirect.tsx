import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * مكون لإعادة التوجيه حسب دور المستخدم
 * يستخدم بعد تسجيل الدخول لتوجيه المستخدم للصفحة المناسبة
 */
const RoleBasedRedirect: React.FC = () => {
  const { user, userProfile, isLoading } = useAuth();

  useEffect(() => {
  }, [user, userProfile, isLoading]);

  // إذا كان النظام يحمل البيانات
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">جاري تحديد الصفحة المناسبة...</p>
        </div>
      </div>
    );
  }

  // إذا لم يكن هناك مستخدم مسجل دخول
  if (!user || !userProfile) {
    return <Navigate to="/login" replace />;
  }

  // تحديد دور المستخدم الفعلي
  const userRole = userProfile.role;
  const isCallCenterAgent = Boolean(userProfile.call_center_agent_id);
  const isConfirmationAgent = Boolean(userProfile.confirmation_agent_id);

  // إذا كان المستخدم وكيل مركز اتصال (له call_center_agent_id)
  if (isCallCenterAgent) {
    return <Navigate to="/call-center/dashboard" replace />;
  }
  if (isConfirmationAgent || userRole === 'confirmation_agent') {
    return <Navigate to="/confirmation/workspace" replace />;
  }
  
  // توجيه المستخدم حسب دوره العادي
  switch (userRole) {
    case 'admin':
    case 'owner':
      return <Navigate to="/dashboard" replace />;
    case 'employee':
      return <Navigate to="/dashboard" replace />;
    case 'customer':
      return <Navigate to="/shop" replace />;
    case 'call_center_agent':
      // هذا للحالات التي يكون فيها الدور مباشرة call_center_agent
      return <Navigate to="/call-center/dashboard" replace />;
    case 'confirmation_agent':
      return <Navigate to="/confirmation/workspace" replace />;
    default:
      // إذا كان الدور غير معروف، توجيه للوحة تحكم نقطة البيع
      return <Navigate to="/dashboard" replace />;
  }
};

export default RoleBasedRedirect;
