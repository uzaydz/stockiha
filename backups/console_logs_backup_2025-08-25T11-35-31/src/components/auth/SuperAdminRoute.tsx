import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

/**
 * Protected route component that ensures the user is a super admin
 * Redirects to login page if not authenticated
 * Redirects to dashboard if authenticated but not a super admin
 */
export default function SuperAdminRoute() {
  const { user, session } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const location = useLocation();
  const lastCheckedUserId = useRef<string | null>(null);
  const superAdminCache = useRef<{ [userId: string]: { status: boolean; timestamp: number } }>({});

  // إضافة logging للتشخيص
  useEffect(() => {
    console.log('🔍 [SuperAdminRoute] Component mounted');
    console.log('🔍 [SuperAdminRoute] User:', user?.id);
    console.log('🔍 [SuperAdminRoute] Session:', !!session);
    console.log('🔍 [SuperAdminRoute] Location:', location.pathname);
  }, [user, session, location]);

  useEffect(() => {
    const checkSuperAdminStatus = async () => {
      console.log('🔍 [SuperAdminRoute] Starting super admin check...');
      
      // لا تعتمد على localStorage لاتخاذ قرارات وصول
      
      if (!user || !session) {
        console.log('🔍 [SuperAdminRoute] No user or session, checking if we should wait...');
        // لا انتظار بناءً على localStorage بعد الآن
        
        console.log('🔍 [SuperAdminRoute] No user or session, redirecting to login');
        setIsLoading(false);
        setIsSuperAdmin(false);
        setAuthError(true);
        setDebugInfo('لا يوجد مستخدم أو جلسة نشطة');
        return;
      }

      // تجنب إعادة الفحص لنفس المستخدم
      if (lastCheckedUserId.current === user.id) {
        console.log('🔍 [SuperAdminRoute] User already checked, using cached result');
        setIsLoading(false);
        return;
      }

      // لا تستخدم localStorage كدليل صلاحية

      // التحقق من الكاش في الذاكرة (صالح لمدة 10 دقائق)
      const cached = superAdminCache.current[user.id];
      const now = Date.now();
      if (cached && (now - cached.timestamp) < 10 * 60 * 1000) {
        console.log('🔍 [SuperAdminRoute] Using cached super admin status from memory');
        setIsSuperAdmin(cached.status);
        setIsLoading(false);
        setAuthError(false);
        setDebugInfo('تم استخدام الحالة المحفوظة من الذاكرة');
        lastCheckedUserId.current = user.id;
        return;
      }

      try {
        console.log('🔍 [SuperAdminRoute] Checking database for super admin status...');
        setAuthError(false);
        setDebugInfo('جاري التحقق من قاعدة البيانات...');
        
        // تحقق من صلاحيات المسؤول الرئيسي مباشرة من قاعدة البيانات
        const { data, error } = await supabase
          .from('users')
          .select('is_super_admin, role')
          .eq('id', user.id)
          .single();
        
        console.log('🔍 [SuperAdminRoute] Database response:', { data, error });
        
        if (error) {
          console.error('🔍 [SuperAdminRoute] Database error:', error);
          setIsSuperAdmin(false);
          setAuthError(true);
          setDebugInfo(`خطأ في قاعدة البيانات: ${error.message}`);
        } else {
          const isSuper = data?.is_super_admin === true;
          console.log('🔍 [SuperAdminRoute] User super admin status:', isSuper);
          setIsSuperAdmin(isSuper);
          
          // حفظ في الكاش
          superAdminCache.current[user.id] = {
            status: isSuper,
            timestamp: now
          };
          
          // لا تحفظ/تقرأ حالة السوبر أدمين من localStorage
          
          lastCheckedUserId.current = user.id;
        }
      } catch (error) {
        console.error('🔍 [SuperAdminRoute] Unexpected error:', error);
        setIsSuperAdmin(false);
        setAuthError(true);
        setDebugInfo(`خطأ غير متوقع: ${error instanceof Error ? error.message : 'خطأ مجهول'}`);
        // إزالة بيانات localStorage عند حدوث خطأ
        localStorage.removeItem('is_super_admin');
        localStorage.removeItem('super_admin_session');
      } finally {
        console.log('🔍 [SuperAdminRoute] Check completed, setting loading to false');
        setIsLoading(false);
      }
    };

    checkSuperAdminStatus();
  }, [user, session]);

  // لا تحفظ/تنظف أي شيء متعلق بالصلاحيات في localStorage
  useEffect(() => {
    if (!user) {
      superAdminCache.current = {};
    }
  }, [user]);

  // إضافة logging لحالة التحميل
  useEffect(() => {
    console.log('🔍 [SuperAdminRoute] Loading state changed:', isLoading);
  }, [isLoading]);

  // إضافة logging لحالة السوبر أدمين
  useEffect(() => {
    console.log('🔍 [SuperAdminRoute] Super admin state changed:', isSuperAdmin);
  }, [isSuperAdmin]);

  if (isLoading) {
    console.log('🔍 [SuperAdminRoute] Rendering loading state');
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">التحقق من صلاحيات الوصول...</p>
          {debugInfo && (
            <p className="mt-2 text-sm text-gray-500">{debugInfo}</p>
          )}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 text-xs text-gray-400 text-center">
              <p>User: {user?.id || 'N/A'}</p>
              <p>Session: {session ? 'Yes' : 'No'}</p>
              <p>AuthError: {authError ? 'Yes' : 'No'}</p>
              <p>isSuperAdmin: {isSuperAdmin ? 'Yes' : 'No'}</p>
              <p>localStorage: {localStorage.getItem('is_super_admin') || 'N/A'}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!user || !session || authError) {
    console.log('🔍 [SuperAdminRoute] Redirecting to login:', { user: !!user, session: !!session, authError });
    
    // لا تعتمد على localStorage كاستثناءات قبل التوجيه
    
    // If not logged in or auth error, redirect to super admin login
    return <Navigate to="/super-admin/login" state={{ from: location }} replace />;
  }

  if (!isSuperAdmin) {
    console.log('🔍 [SuperAdminRoute] User is not super admin, showing access denied');
    // If logged in but not a super admin, show access denied message
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-6xl text-red-500 mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">ممنوع الوصول</h1>
          <p className="text-gray-600 mb-4">ليس لديك صلاحيات للوصول إلى لوحة Super Admin</p>
          {debugInfo && (
            <p className="text-sm text-gray-500 mb-4">{debugInfo}</p>
          )}
          <div className="space-x-2 space-x-reverse">
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 ml-2"
            >
              إعادة المحاولة
            </button>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              العودة إلى لوحة التحكم
            </button>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 text-xs text-gray-400 text-left">
              <p>User ID: {user?.id}</p>
              <p>Session: {session ? 'Active' : 'Inactive'}</p>
              <p>localStorage: {localStorage.getItem('is_super_admin')}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  console.log('🔍 [SuperAdminRoute] User is super admin, rendering protected routes');
  // If super admin, render the protected routes
  return <Outlet />;
}
