import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStaffSession } from '@/context/StaffSessionContext';
import { useAuth } from '@/context/AuthContext';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';

// ⚡ v3.0: Module-level deduplication للتحكم الشامل
let _lastLoggedState = '';

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
  const unifiedPerms = useUnifiedPermissions();

  // ✅ منع التنقلات المتعددة باستخدام sessionStorage
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // ✅ انتظار صغير للسماح بتحميل القيم من localStorage
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // ✅ عدم التنفيذ قبل الانتهاء من التهيئة
    if (!isInitialized) {
      return;
    }

    const currentPath = location.pathname;

    // تجنب التوجيه المستمر - إذا كان المستخدم في /staff-login، لا نفعل شيء
    if (currentPath === '/staff-login') {
      return;
    }

    // ✅ التحقق من أننا لم نوجه مسبقاً في هذه الجلسة
    const lastRedirectTime = sessionStorage.getItem('staff_last_redirect_time');
    const now = Date.now();
    if (lastRedirectTime && (now - parseInt(lastRedirectTime)) < 5000) {
      // تم التوجيه خلال آخر 5 ثوان، لا نكرر
      if (process.env.NODE_ENV === 'development') {
        console.log('[StaffLoginRedirect] ⏸️ تخطي التوجيه - تم التوجيه مؤخراً');
      }
      return;
    }

    // إذا كان المستخدم مسجل دخول وفي مسار dashboard
    if (user && userProfile && currentPath.startsWith('/dashboard')) {
      const navState: any = (location as any).state;
      const justSignedInStaff = navState?.staffSignedIn === true;
      if (justSignedInStaff) {
        return;
      }

      let storedStaff: any = null;
      try {
        const raw = localStorage.getItem('staff_session');
        storedStaff = raw ? JSON.parse(raw) : null;
      } catch {}
      const storedAdminMode = localStorage.getItem('admin_mode') === 'true';

      const userRole = userProfile.role;

      // فقط المديرين (admin/owner) يحتاجون لاختيار وضع العمل
      const isAdminOrOwner = userRole === 'admin' || userRole === 'owner';

      // ⚡ v3.0: منع الـ logging المتكرر عبر جميع الـ instances
      const stateKey = `${isAdminOrOwner}:${!!currentStaff}:${unifiedPerms.isAdminMode}:${unifiedPerms.isStaffMode}`;
      if (process.env.NODE_ENV === 'development' && _lastLoggedState !== stateKey) {
        _lastLoggedState = stateKey;
        console.log('[StaffLoginRedirect] 🔍 فحص حالة الموظف:', {
          isAdminOrOwner,
          userRole,
          hasCurrentStaff: !!currentStaff,
          isAdminMode: unifiedPerms.isAdminMode,
          isStaffMode: unifiedPerms.isStaffMode,
          hasStoredStaff: !!storedStaff,
          storedAdminMode,
          displayName: unifiedPerms.displayName,
          shouldRedirect: isAdminOrOwner && !currentStaff && !isAdminMode && !storedStaff && !storedAdminMode
        });
      }

      if (isAdminOrOwner) {
        // إذا لم يكن لديه جلسة موظف ولا في وضع أدمن، يوجه لصفحة اختيار الوضع
        if (!currentStaff && !isAdminMode && !storedStaff && !storedAdminMode) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[StaffLoginRedirect] 🔀 توجيه المدير إلى staff-login');
          }
          // ✅ حفظ وقت التوجيه
          sessionStorage.setItem('staff_last_redirect_time', now.toString());
          navigate('/staff-login', { replace: true });
        }
      }
      // الموظفين العاديين (employee) لا يحتاجون staff-login
    }
  }, [user, userProfile, currentStaff, isAdminMode, navigate, location.pathname, isInitialized, unifiedPerms.isAdminMode, unifiedPerms.isStaffMode]);

  return <>{children}</>;
};

export default StaffLoginRedirect;
