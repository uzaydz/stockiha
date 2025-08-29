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
  const { user, userProfile, isLoading, authReady } = useAuth();
  const location = useLocation();
  const [hasWaited, setHasWaited] = useState(false);
  const [profileWaitTime, setProfileWaitTime] = useState(0);
  
  // معرفة ما إذا كانت هذه زيارة مباشرة (refresh أو URL مباشر)
  const isDirectVisit = !location.state || performance.navigation.type === 1;

  // تشخيص شامل
  if (import.meta.env.DEV) {
  }

  // إضافة timeout قصير لتجنب الفلاش السريع لشاشة التحميل
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasWaited(true);
    }, 0); // ✅ إزالة التأخير لحل مشكلة عرض المتجر

    return () => clearTimeout(timer);
  }, []);

  // تتبع وقت انتظار userProfile
  useEffect(() => {
    if (user && !userProfile && !isLoading) {
      const timer = setInterval(() => {
        setProfileWaitTime(prev => prev + 1000);
      }, 1000);

      return () => clearInterval(timer);
    } else {
      setProfileWaitTime(0);
    }
  }, [user, userProfile, isLoading]);

  // عرض شاشة التحميل فقط إذا كان isLoading صحيح وانتظرنا قليلاً
  if (isLoading && hasWaited) {
    return <LoadingSpinner />;
  }

  // إذا لم ننتظ بعد، لا نعرض شيئاً (تجنب الفلاش)
  if (isLoading && !hasWaited) {
    return null;
  }

  // إذا AuthContext ليس جاهزاً بعد، أظهر شاشة انتظار
  if (!authReady) {
    if (import.meta.env.DEV) {
      console.log('⏳ [ProtectedRoute] انتظار اكتمال فحص المصادقة...');
    }
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">جاري التحقق من حالة تسجيل الدخول...</p>
      </div>
    </div>;
  }

  // الآن فقط، إذا كان AuthContext جاهزاً ولم يكن هناك مستخدم، إعادة توجيه لتسجيل الدخول
  if (authReady && !user) {
    if (import.meta.env.DEV) {
      console.log('🚫 [ProtectedRoute] لا يوجد مستخدم - إعادة توجيه لتسجيل الدخول');
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // إذا كان هناك مستخدم لكن لا يوجد userProfile بعد، أظهر شاشة تحميل أو أعد التوجيه
  if (authReady && user && !userProfile) {
    // تحقق من وجود بيانات محفوظة أولاً
    const savedUserData = localStorage.getItem('user_data_cache');
    const savedOrgData = localStorage.getItem('current_organization');
    
    if (savedUserData && savedOrgData) {
      try {
        const userData = JSON.parse(savedUserData);
        const orgData = JSON.parse(savedOrgData);
        
        // إذا كانت البيانات متاحة ومحدثة، لا تنتظر كثيراً
        const now = Date.now();
        const userDataAge = now - (userData.timestamp || 0);
        
        if (userDataAge < 60000 && userData.data?.id && orgData?.id) {
          // البيانات متاحة، انتظار أقل
          if (profileWaitTime < 3000) {
            if (import.meta.env.DEV) {
              console.log(`⚡ [ProtectedRoute] بيانات محفوظة متاحة، انتظار قصير... (${profileWaitTime/1000}s)`);
            }
            return <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 text-lg font-medium">جاري تحميل البيانات...</p>
                <p className="text-gray-500 text-sm mt-2">البيانات محفوظة، تحميل سريع...</p>
              </div>
            </div>;
          }
        }
      } catch (error) {
        // خطأ في قراءة البيانات المحفوظة
      }
    }
    
    // انتظار عادي إذا لم تكن البيانات محفوظة
    if (profileWaitTime < 12000) {
      if (import.meta.env.DEV) {
        console.log(`⏳ [ProtectedRoute] في انتظار تحميل userProfile... (${profileWaitTime/1000}s)`);
      }
      return <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">جاري تحميل بيانات المستخدم...</p>
          <p className="text-gray-500 text-sm mt-2">({Math.floor(profileWaitTime/1000)}s)</p>
          {profileWaitTime > 5000 && (
            <p className="text-orange-500 text-sm mt-2">
              يرجى الانتظار، جاري تحميل البيانات...
            </p>
          )}
          {profileWaitTime > 8000 && (
            <p className="text-red-500 text-sm mt-2">
              يبدو أن هناك مشكلة في الاتصال...
            </p>
          )}
        </div>
      </div>;
    } else {
      // بعد 12 ثانية، أعد التوجيه لتسجيل الدخول
      if (import.meta.env.DEV) {
        console.log('⚠️ [ProtectedRoute] انتهت مهلة انتظار userProfile - إعادة توجيه');
      }
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
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
          return <Navigate to="/dashboard" replace />;
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
          return <Navigate to="/dashboard" replace />;
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
