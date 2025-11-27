import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

type PublicRouteProps = {
  children: ReactNode;
  redirectTo?: string; // إعادة التوجيه إذا كان المستخدم مسجلاً الدخول
};

const PublicRoute = ({ children, redirectTo = '/dashboard' }: PublicRouteProps) => {
  const location = useLocation();

  // السماح دائماً بعرض صفحات استرجاع/إعادة تعيين كلمة المرور حتى لو كان المستخدم مسجلاً الدخول
  // وكذلك عند وجود أخطاء/معلمات الاسترجاع في الرابط القادم من Supabase
  const currentPath = location.pathname;
  const allowAnonymousEvenIfLoggedIn = (
    currentPath === '/reset-password' ||
    currentPath === '/forgot-password' ||
    location.search.includes('type=recovery') ||
    location.hash.includes('type=recovery') ||
    location.hash.includes('error=') ||
    location.hash.includes('error_code=')
  );

  // محاولة استخدام useAuth مع معالجة الخطأ
  let authData = null;
  let isLoading = false;

  try {
    const auth = useAuth();
    authData = auth;
    isLoading = auth.isLoading;
  } catch (error) {
    // إذا لم يكن AuthProvider متاحاً، نعرض المحتوى مباشرة
    if (import.meta.env.DEV) {
    try { console.log('[PublicRoute] render children (public)'); } catch {}
  }
  return <>{children}</>;
  }

  const { user, userProfile } = authData || {};
  if (import.meta.env.DEV) {
    try {
      console.log('[PublicRoute] enter', {
        path: location.pathname,
        search: location.search,
        hash: location.hash,
        isLoading,
        hasUser: !!user,
        hasProfile: !!userProfile,
      });
    } catch {}
  }

  // إذا كان التحميل جارياً، نعرض المحتوى
  if (isLoading) {
    if (import.meta.env.DEV) {
      try { console.log('[PublicRoute] render children (loading)'); } catch {}
    }
    return <>{children}</>;
  }

  // لا تقم بإعادة التوجيه القسري في صفحات الاسترجاع أو عند وجود أخطاء/معلمات الاسترجاع
  if (allowAnonymousEvenIfLoggedIn) {
    if (import.meta.env.DEV) {
      try { console.log('[PublicRoute] allow anonymous even if logged in'); } catch {}
    }
    return <>{children}</>;
  }

  // إذا كان المستخدم مسجلاً الدخول ومعه ملف شخصي كامل، نعيد توجيهه حسب الدور
  if (user && userProfile) {
    // تحديد المسار المناسب حسب دور المستخدم
    let targetPath = redirectTo;
    switch (userProfile.role) {
      case 'call_center_agent':
        targetPath = '/call-center/dashboard';
        break;
      case 'admin':
      case 'owner':
        targetPath = '/dashboard';
        break;
      case 'employee':
        targetPath = '/dashboard';
        break;
      case 'customer':
        targetPath = '/shop';
        break;
      default:
        targetPath = '/dashboard';
    }

    if (import.meta.env.DEV) {
      try { console.log('[PublicRoute] redirecting logged-in user to', targetPath); } catch {}
    }
    return <Navigate to={targetPath} replace />;
  }

  // حالة خاصة: المستخدم موجود لكن لم يكتمل تحميل الملف الشخصي بعد
  // ✅ انتظار قليلاً قبل التوجيه لتجنب التنقلات المتعددة
  if (user && !userProfile && !allowAnonymousEvenIfLoggedIn && !isLoading) {
    if (import.meta.env.DEV) {
      try { console.log('[PublicRoute] user present without profile -> redirecting to /dashboard'); } catch {}
    }
    return <Navigate to="/dashboard" replace />;
  }

  // إذا لم يكن المستخدم مسجل الدخول، نعرض المحتوى العام
  return <>{children}</>;
};

export default PublicRoute;
