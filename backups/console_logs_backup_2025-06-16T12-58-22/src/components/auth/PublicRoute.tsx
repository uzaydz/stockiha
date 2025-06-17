import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

type PublicRouteProps = {
  children: ReactNode;
  redirectTo?: string; // إعادة التوجيه إذا كان المستخدم مسجلاً الدخول
};

const PublicRoute = ({ children, redirectTo = '/dashboard' }: PublicRouteProps) => {
  const { user, userProfile, isLoading } = useAuth();
  const location = useLocation();

  // إذا كان التحميل جارياً، نعرض المحتوى
  if (isLoading) {
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
        targetPath = '/pos';
        break;
      case 'customer':
        targetPath = '/shop';
        break;
      default:
        targetPath = '/dashboard';
    }

    console.log('👤 PublicRoute: User is authenticated, redirecting to', targetPath);
    return <Navigate to={targetPath} replace />;
  }

  // إذا لم يكن المستخدم مسجل الدخول، نعرض المحتوى العام
  return <>{children}</>;
};

export default PublicRoute; 