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
    console.log('=== RoleBasedRedirect Debug ===');
    console.log('User ID:', user?.id);
    console.log('User Email:', user?.email);
    console.log('UserProfile:', userProfile);
    console.log('IsLoading:', isLoading);
    console.log('User Role:', userProfile?.role);
    console.log('Call Center Agent ID:', userProfile?.call_center_agent_id);
    console.log('Is Call Center Agent:', Boolean(userProfile?.call_center_agent_id));
    console.log('================================');
  }, [user, userProfile, isLoading]);

  // إذا كان النظام يحمل البيانات
  if (isLoading) {
    console.log('RoleBasedRedirect: Still loading...');
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
    console.log('RoleBasedRedirect: No user or profile, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // تحديد دور المستخدم الفعلي
  const userRole = userProfile.role;
  const isCallCenterAgent = Boolean(userProfile.call_center_agent_id);
  
  console.log('RoleBasedRedirect: Final decision making...');
  console.log('User Role:', userRole);
  console.log('Is Call Center Agent:', isCallCenterAgent);
  console.log('Agent ID:', userProfile.call_center_agent_id);
  
  // إذا كان المستخدم وكيل مركز اتصال (له call_center_agent_id)
  if (isCallCenterAgent) {
    console.log('✅ Redirecting to call center dashboard - Agent ID:', userProfile.call_center_agent_id);
    return <Navigate to="/call-center/dashboard" replace />;
  }
  
  // توجيه المستخدم حسب دوره العادي
  switch (userRole) {
    case 'admin':
    case 'owner':
      console.log('✅ Redirecting to admin dashboard - Role:', userRole);
      return <Navigate to="/dashboard" replace />;
    case 'employee':
      console.log('⚠️ Redirecting to POS - Role:', userRole, '(Not a call center agent)');
      return <Navigate to="/pos" replace />;
    case 'customer':
      console.log('✅ Redirecting to shop - Role:', userRole);
      return <Navigate to="/shop" replace />;
    case 'call_center_agent':
      // هذا للحالات التي يكون فيها الدور مباشرة call_center_agent
      console.log('✅ Redirecting to call center dashboard - Direct role');
      return <Navigate to="/call-center/dashboard" replace />;
    default:
      // إذا كان الدور غير معروف، توجيه للوحة التحكم الافتراضية
      console.log('⚠️ Redirecting to default dashboard - Unknown role:', userRole);
      return <Navigate to="/dashboard" replace />;
  }
};

export default RoleBasedRedirect; 