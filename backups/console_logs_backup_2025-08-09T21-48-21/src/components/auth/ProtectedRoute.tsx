import { ReactNode, useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { isCallCenterAgent } from '@/lib/api/permissions';

// Define a simple loading spinner component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-lg text-foreground">جارٍ تحميل البيانات...</p>
      <p className="text-sm text-muted-foreground mt-2">
        الرجاء الانتظار...
      </p>
    </div>
  </div>
);

type ProtectedRouteProps = {
  children?: ReactNode;
  allowedRoles?: string[]; // الأدوار المسموحة
  redirectBasedOnRole?: boolean; // إعادة التوجيه حسب الدور
};

const ProtectedRoute = ({ 
  children, 
  allowedRoles, 
  redirectBasedOnRole = false 
}: ProtectedRouteProps) => {
  const { user, userProfile, isLoading } = useAuth();
  const location = useLocation();
  const [hasWaited, setHasWaited] = useState(false);
  
  // معرفة ما إذا كانت هذه زيارة مباشرة (refresh أو URL مباشر)
  const isDirectVisit = !location.state || performance.navigation.type === 1;

  // تشخيص شامل
  if (import.meta.env.DEV) {
  }

  // إضافة timeout قصير لتجنب الفلاش السريع لشاشة التحميل
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasWaited(true);
    }, 300); // انتظار أطول قليلاً لضمان تحميل البيانات المحفوظة

    return () => clearTimeout(timer);
  }, []);

  // عرض شاشة التحميل فقط إذا كان isLoading صحيح وانتظرنا قليلاً
  if (isLoading && hasWaited) {
    return <LoadingSpinner />;
  }

  // إذا لم ننتظ بعد، لا نعرض شيئاً (تجنب الفلاش)
  if (isLoading && !hasWaited) {
    return null;
  }

  // إذا انتهى التحميل ولم يكن هناك مستخدم، إعادة توجيه لتسجيل الدخول
  if (!isLoading && (!user || !userProfile)) {
    if (import.meta.env.DEV) {
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // التحقق من الأدوار المسموحة
  if (allowedRoles && allowedRoles.length > 0 && userProfile) {
    const userRole = userProfile.role;
    if (!allowedRoles.includes(userRole)) {
      if (import.meta.env.DEV) {
      }
      
      // إعادة توجيه حسب دور المستخدم
      switch (userRole) {
        case 'call_center_agent':
          return <Navigate to="/call-center" replace />;
        case 'admin':
        case 'owner':
          return <Navigate to="/dashboard" replace />;
        case 'employee':
          return <Navigate to="/pos" replace />;
        case 'customer':
          return <Navigate to="/shop" replace />;
        default:
          return <Navigate to="/unauthorized" replace />;
      }
    }
  }

  // إعادة التوجيه التلقائي حسب الدور إذا كان مطلوباً
  if (redirectBasedOnRole && userProfile) {
  } else if (import.meta.env.DEV) {
  }
  
  if (redirectBasedOnRole && userProfile) {
    const userRole = userProfile.role;
    const currentPath = location.pathname;

    // تجنب إعادة التوجيه اللانهائي - فقط من الصفحة الرئيسية أو صفحة تسجيل الدخول
    // ولا نعيد التوجيه إذا كان المستخدم في مسار صالح بالفعل
    const isRootOrLoginPath = currentPath === '/login' || currentPath === '/' || currentPath === '';
    const isAlreadyInCorrectPath = 
      (userRole === 'call_center_agent' && currentPath.startsWith('/call-center')) ||
      ((userRole === 'admin' || userRole === 'owner') && currentPath.startsWith('/dashboard')) ||
      (userRole === 'employee' && (currentPath.startsWith('/pos') || currentPath.startsWith('/dashboard'))) ||
      (userRole === 'customer' && currentPath.startsWith('/shop'));

    // لا نعيد التوجيه إذا كان المستخدم يحدث الصفحة في مكان صالح
    const shouldNotRedirectOnRefresh = isDirectVisit && isAlreadyInCorrectPath;

    if (import.meta.env.DEV) {
    }

    if (isRootOrLoginPath && !isAlreadyInCorrectPath && !shouldNotRedirectOnRefresh) {
      if (import.meta.env.DEV) {
      }
      
      switch (userRole) {
        case 'call_center_agent':
          return <Navigate to="/call-center/dashboard" replace />;
        case 'admin':
        case 'owner':
          return <Navigate to="/dashboard" replace />;
        case 'employee':
          return <Navigate to="/pos" replace />;
        case 'customer':
          return <Navigate to="/shop" replace />;
        default:
          break;
      }
    }
  }

  // إعادة توجيه تلقائية لوكلاء مركز الاتصال إذا حاولوا الوصول لصفحات غير مخصصة لهم
  if (userProfile) {
    const userRole = userProfile.role;
    const currentPath = location.pathname;
    const isCallCenterAgent = Boolean(userProfile.call_center_agent_id) || userRole === 'call_center_agent';
    
    if (import.meta.env.DEV) {
    }
    
    if (isCallCenterAgent) {
      // إذا كان وكيل مركز اتصال يحاول الوصول لصفحات الأدمين أو POS
      // لكن استثناء: إذا كان موظف عادي في نقطة البيع، لا تعيد التوجيه
      const isEmployeeInPOS = userRole === 'employee' && currentPath.startsWith('/pos');
      
      if ((currentPath.startsWith('/dashboard') || currentPath.startsWith('/pos')) && !isEmployeeInPOS) {
        if (import.meta.env.DEV) {
        }
        return <Navigate to="/call-center/dashboard" replace />;
      }
    }
  }

  // If children are provided, render them. Otherwise, render the nested routes.
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
