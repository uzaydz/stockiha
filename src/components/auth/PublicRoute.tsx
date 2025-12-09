import { ReactNode, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const isDev = import.meta.env.DEV;

type PublicRouteProps = {
  children: ReactNode;
  redirectTo?: string; // إعادة التوجيه إذا كان المستخدم مسجلاً الدخول
};

// ⚡ منع تكرار logs - يسجل كل مسار مرة واحدة فقط
const loggedRedirects = new Set<string>();

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

  // ⚡ Helper لتسجيل الـ logs مرة واحدة فقط
  const logOnce = (key: string, msg: string, data?: object) => {
    if (!isDev) return;
    const fullKey = `${location.pathname}-${key}`;
    if (!loggedRedirects.has(fullKey)) {
      loggedRedirects.add(fullKey);
      if (data) {
        console.log(`[PublicRoute] ${msg}`, data);
      } else {
        console.log(`[PublicRoute] ${msg}`);
      }
    }
  };

  // محاولة استخدام useAuth مع معالجة الخطأ
  let authData = null;
  let isLoading = false;

  try {
    const auth = useAuth();
    authData = auth;
    isLoading = auth.isLoading;
  } catch (error) {
    // إذا لم يكن AuthProvider متاحاً، نعرض المحتوى مباشرة
    logOnce('no-auth', 'render children (no AuthProvider)');
    return <>{children}</>;
  }

  const { user, userProfile } = authData || {};

  // إذا كان التحميل جارياً، نعرض المحتوى
  if (isLoading) {
    return <>{children}</>;
  }

  // لا تقم بإعادة التوجيه القسري في صفحات الاسترجاع أو عند وجود أخطاء/معلمات الاسترجاع
  if (allowAnonymousEvenIfLoggedIn) {
    logOnce('recovery', 'allow anonymous (recovery/reset page)');
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

    logOnce('redirect', `redirecting logged-in user to ${targetPath}`, { role: userProfile.role });
    return <Navigate to={targetPath} replace />;
  }

  // حالة خاصة: المستخدم موجود لكن لم يكتمل تحميل الملف الشخصي بعد
  // ✅ انتظار قليلاً قبل التوجيه لتجنب التنقلات المتعددة
  if (user && !userProfile && !allowAnonymousEvenIfLoggedIn && !isLoading) {
    logOnce('no-profile', 'user present without profile -> redirecting to /dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  // إذا لم يكن المستخدم مسجل الدخول، نعرض المحتوى العام
  return <>{children}</>;
};

export default PublicRoute;
