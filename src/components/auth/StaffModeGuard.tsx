/**
 * StaffModeGuard - حارس وضع الموظف
 * 
 * يتحقق من وجود جلسة موظف أو وضع مدير نشط
 * إذا لم يكن أي منهما موجوداً، يوجه المستخدم لصفحة تسجيل الموظفين
 * 
 * الاستخدام:
 * - يُستخدم كـ wrapper حول صفحات نقطة البيع
 * - يسمح بالمرور إذا كان المستخدم في وضع المدير أو لديه جلسة موظف
 */

import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useStaffSession } from '@/context/StaffSessionContext';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

interface StaffModeGuardProps {
  children: React.ReactNode;
  /** 
   * إذا كان true، يسمح بالمرور للمستخدمين الإداريين بدون جلسة موظف
   * @default true
   */
  allowAdminBypass?: boolean;
  /**
   * المسار للتوجيه إذا لم تكن هناك جلسة
   * @default '/staff-login'
   */
  redirectTo?: string;
}

const StaffModeGuard: React.FC<StaffModeGuardProps> = ({
  children,
  allowAdminBypass = true,
  redirectTo = '/staff-login',
}) => {
  const { currentStaff, isAdminMode } = useStaffSession();
  const { user, userProfile, loading: authLoading } = useAuth();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // انتظر حتى يتم تحميل Auth
    if (!authLoading) {
      setIsChecking(false);
    }
  }, [authLoading]);

  // حالة التحميل
  if (isChecking || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          <span className="text-slate-400 text-sm">جاري التحقق من الجلسة...</span>
        </div>
      </div>
    );
  }

  // إذا لم يكن هناك مستخدم أساسي، وجّه لتسجيل الدخول
  if (!user) {
    console.log('[StaffModeGuard] No user, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // إذا كان في وضع المدير، اسمح بالمرور
  if (isAdminMode) {
    console.log('[StaffModeGuard] Admin mode active, allowing access');
    return <>{children}</>;
  }

  // إذا كان هناك موظف مسجل، اسمح بالمرور
  if (currentStaff) {
    console.log('[StaffModeGuard] Staff session active:', currentStaff.staff_name);
    return <>{children}</>;
  }

  // إذا كان المستخدم admin/owner وتم السماح بالمرور
  if (allowAdminBypass) {
    const isAdmin = 
      userProfile?.role === 'admin' || 
      userProfile?.role === 'owner' ||
      userProfile?.is_org_admin === true ||
      userProfile?.is_super_admin === true;
    
    if (isAdmin) {
      console.log('[StaffModeGuard] Admin user without staff session, allowing bypass');
      return <>{children}</>;
    }
  }

  // التحقق من state للتجنب من الحلقات اللانهائية
  const fromStaffLogin = location.state?.staffSignedIn === true;
  if (fromStaffLogin) {
    console.log('[StaffModeGuard] Coming from staff login, allowing access');
    return <>{children}</>;
  }

  // وجّه لصفحة تسجيل الموظفين
  console.log('[StaffModeGuard] No staff session, redirecting to:', redirectTo);
  return (
    <Navigate 
      to={redirectTo} 
      replace 
      state={{ from: location.pathname }} 
    />
  );
};

export default StaffModeGuard;

/**
 * Hook للتحقق السريع من وجود جلسة موظف أو وضع مدير
 */
export function useStaffModeRequired(): {
  hasAccess: boolean;
  isLoading: boolean;
  mode: 'admin' | 'staff' | 'none';
} {
  const { currentStaff, isAdminMode } = useStaffSession();
  const { loading: authLoading } = useAuth();

  if (authLoading) {
    return { hasAccess: false, isLoading: true, mode: 'none' };
  }

  if (isAdminMode) {
    return { hasAccess: true, isLoading: false, mode: 'admin' };
  }

  if (currentStaff) {
    return { hasAccess: true, isLoading: false, mode: 'staff' };
  }

  return { hasAccess: false, isLoading: false, mode: 'none' };
}
