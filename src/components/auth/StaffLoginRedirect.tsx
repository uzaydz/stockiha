import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStaffSession } from '@/context/StaffSessionContext';
import { useAuth } from '@/context/AuthContext';

/**
 * مكون لتوجيه المستخدمين بعد تسجيل الدخول
 * - إذا كان لديه جلسة موظف أو وضع أدمن نشط: يذهب للوحة التحكم
 * - وإلا: يذهب لصفحة تسجيل دخول الموظف
 */
const StaffLoginRedirect: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const { currentStaff, isAdminMode } = useStaffSession();
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    // إذا كان المستخدم مسجل دخول
    if (user) {
      // إذا لم يكن لديه جلسة موظف ولا في وضع أدمن
      if (!currentStaff && !isAdminMode) {
        // التوجيه لصفحة تسجيل دخول الموظف
        const currentPath = location.pathname;
        
        // تجنب التوجيه المستمر (loop)
        if (currentPath !== '/staff-login' && currentPath.startsWith('/dashboard')) {
          navigate('/staff-login', { replace: true });
        }
      }
    }
  }, [user, currentStaff, isAdminMode, navigate, location.pathname]);

  return <>{children}</>;
};

export default StaffLoginRedirect;
