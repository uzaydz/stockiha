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
    console.warn('AuthProvider غير متاح، عرض المحتوى العام');
    return <>{children}</>;
  }

  const { user, userProfile } = authData || {};

  // إذا كان التحميل جارياً، نعرض المحتوى
  if (isLoading) {
    return <>{children}</>;
  }

  // لا تقم بإعادة التوجيه القسري في صفحات الاسترجاع أو عند وجود أخطاء/معلمات الاسترجاع
  if (allowAnonymousEvenIfLoggedIn) {
    return <>{children}</>;
  }

  // إذا كان المستخدم مسجل الدخول، نعيد توجيهه
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

    return <Navigate to={targetPath} replace />;
  }

  // إذا لم يكن المستخدم مسجل الدخول، نعرض المحتوى العام
  return <>{children}</>;
};

export default PublicRoute;
