import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';
import { isElectronEnv } from '@/lib/navigation';

/**
 * مكون لإعادة التوجيه حسب دور المستخدم
 * يستخدم بعد تسجيل الدخول لتوجيه المستخدم للصفحة المناسبة
 */
const RoleBasedRedirect: React.FC = () => {
  const { user, userProfile, isLoading, hasInitialSessionCheck, authReady } = useAuth();
  const [fallbackElapsed, setFallbackElapsed] = useState(false);

  // فallback ذكي: إذا طال التحميل بدون نتيجة، توجيه سريع لصفحة الدخول
  useEffect(() => {
    if (hasInitialSessionCheck) return; // لا حاجة للفallback إذا انتهى الفحص الأولي
    const timeout = setTimeout(() => setFallbackElapsed(true), 1500);
    return () => clearTimeout(timeout);
  }, [hasInitialSessionCheck]);

  const shouldRedirectToLogin = useMemo(() => {
    // إذا اكتمل الفحص الأولي ولا يوجد مستخدم
    if (hasInitialSessionCheck && (!user || !userProfile)) return true;
    // إذا نحن أوفلاين أو في Electron وتأخر الفحص الأولي
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (!hasInitialSessionCheck && fallbackElapsed && (offline || isElectronEnv())) return true;
    return false;
  }, [hasInitialSessionCheck, user, userProfile, fallbackElapsed]);

  useEffect(() => {
  }, [user, userProfile, isLoading]);

  // توجيه سريع إذا لزم
  if (shouldRedirectToLogin) {
    return <Navigate to="/login" replace />;
  }

  // إذا كان النظام يحمل البيانات (وما زال لم يصل لنتيجة)
  if (isLoading || (!hasInitialSessionCheck && !authReady)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">جاري تحديد الصفحة المناسبة...</p>
        </div>
      </div>
    );
  }

  // إذا لم يكن هناك مستخدم مسجل دخول
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // إذا كان المستخدم موجوداً لكن الملف الشخصي لم يحمّل بعد، أظهر انتظار بسيط بدلاً من الإرجاع للّوجين
  if (user && !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">جاري تحميل بيانات المستخدم...</p>
        </div>
      </div>
    );
  }

  // تحديد دور المستخدم الفعلي
  const userRole = userProfile.role;
  const isCallCenterAgent = Boolean(userProfile.call_center_agent_id);
  const isConfirmationAgent = Boolean(userProfile.confirmation_agent_id);

  // إذا كان المستخدم وكيل مركز اتصال (له call_center_agent_id)
  if (isCallCenterAgent) {
    return <Navigate to="/call-center/dashboard" replace />;
  }
  if (isConfirmationAgent || userRole === 'confirmation_agent') {
    return <Navigate to="/confirmation/workspace" replace />;
  }
  
  // توجيه المستخدم حسب دوره العادي
  switch (userRole) {
    case 'admin':
    case 'owner':
      return <Navigate to="/dashboard" replace />;
    case 'employee':
      return <Navigate to="/dashboard" replace />;
    case 'customer':
      return <Navigate to="/shop" replace />;
    case 'call_center_agent':
      // هذا للحالات التي يكون فيها الدور مباشرة call_center_agent
      return <Navigate to="/call-center/dashboard" replace />;
    case 'confirmation_agent':
      return <Navigate to="/confirmation/workspace" replace />;
    default:
      // إذا كان الدور غير معروف، توجيه للوحة تحكم نقطة البيع
      return <Navigate to="/dashboard" replace />;
  }
};

export default RoleBasedRedirect;
