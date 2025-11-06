import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStaffSession } from '@/context/StaffSessionContext';
import { useAuth } from '@/context/AuthContext';

/**
 * مكون لتوجيه المستخدمين بعد تسجيل الدخول
 * - للمديرين (admin/owner): يوجههم لصفحة staff-login لاختيار وضع العمل
 * - للموظفين العاديين: يسمح لهم بالمرور مباشرة
 */
const StaffLoginRedirect: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const { currentStaff, isAdminMode } = useStaffSession();
  const location = useLocation();
  const { user, userProfile } = useAuth();

  useEffect(() => {
    const currentPath = location.pathname;

    // تجنب التوجيه المستمر - إذا كان المستخدم في /staff-login، لا نفعل شيء
    if (currentPath === '/staff-login') {
      return;
    }

    // إذا كان المستخدم مسجل دخول وفي مسار dashboard
    if (user && userProfile && currentPath.startsWith('/dashboard')) {
      const userRole = userProfile.role;

      // فقط المديرين (admin/owner) يحتاجون لاختيار وضع العمل
      const isAdminOrOwner = userRole === 'admin' || userRole === 'owner';

      if (isAdminOrOwner) {
        // إذا لم يكن لديه جلسة موظف ولا في وضع أدمن، يوجه لصفحة اختيار الوضع
        if (!currentStaff && !isAdminMode) {
          navigate('/staff-login', { replace: true });
        }
      }
      // الموظفين العاديين (employee) لا يحتاجون staff-login
    }
  }, [user, userProfile, currentStaff, isAdminMode, navigate, location.pathname]);

  return <>{children}</>;
};

export default StaffLoginRedirect;
