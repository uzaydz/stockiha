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
  const { user, session, userProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const location = useLocation();
  const lastCheckedUserId = useRef<string | null>(null);
  const superAdminCache = useRef<{ [userId: string]: { status: boolean; timestamp: number } }>({});

  // إضافة logging للتشخيص
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
    }
  }, [user, session, userProfile, location]);

  useEffect(() => {
    const checkSuperAdminStatus = async () => {
      // إعادة تعيين authError عند بداية الفحص
      setAuthError(false);
      
      // التحقق من وجود المستخدم - لا نحتاج session
      if (!user) {
        if (process.env.NODE_ENV === 'development') {
        }
        
        // انتظار قليل قبل إعلان الخطأ
        const timeoutId = setTimeout(() => {
          if (!user) {
            setIsLoading(false);
            setIsSuperAdmin(false);
            setAuthError(true);
            setDebugInfo('لا يوجد مستخدم نشط بعد الانتظار');
          }
        }, 3000); // انتظار 3 ثوان
        
        // تنظيف الـ timeout إذا تم تحديث user
        return () => clearTimeout(timeoutId);
      }

      // تجنب إعادة الفحص لنفس المستخدم
      if (lastCheckedUserId.current === user.id) {
        setIsLoading(false);
        setAuthError(false);
        setIsSuperAdmin(true);
        return;
      }

      // التحقق من الكاش في الذاكرة (صالح لمدة 10 دقائق)
      const cached = superAdminCache.current[user.id];
      const now = Date.now();
      if (cached && (now - cached.timestamp) < 10 * 60 * 1000) {
        setIsSuperAdmin(cached.status);
        setIsLoading(false);
        setAuthError(false);
        setDebugInfo('تم استخدام الحالة المحفوظة من الذاكرة');
        lastCheckedUserId.current = user.id;
        return;
      }

      try {
        setAuthError(false);
        setDebugInfo('جاري التحقق من قاعدة البيانات...');
        
        // تحقق من صلاحيات المسؤول الرئيسي مباشرة من قاعدة البيانات
        const { data, error } = await supabase
          .from('users')
          .select('is_super_admin, role')
          .eq('id', user.id)
          .single();

        if (error) {
          setIsSuperAdmin(false);
          setDebugInfo(`خطأ في قاعدة البيانات: ${error.message}`);
        } else {
          const isSuper = data?.is_super_admin === true || data?.role === 'super_admin';
          setIsSuperAdmin(isSuper);
          
          // حفظ في الكاش
          superAdminCache.current[user.id] = {
            status: isSuper,
            timestamp: now
          };
          
          lastCheckedUserId.current = user.id;
          
          if (process.env.NODE_ENV === 'development') {
          }
        }
      } catch (error) {
        setIsSuperAdmin(false);
        setDebugInfo(`خطأ غير متوقع: ${error instanceof Error ? error.message : 'خطأ مجهول'}`);
      } finally {
        setIsLoading(false);
      }
    };

    checkSuperAdminStatus();
  }, [user, userProfile]); // إزالة session من dependencies

  // تنظيف الكاش عند تغيير المستخدم
  useEffect(() => {
    if (!user) {
      superAdminCache.current = {};
    }
  }, [user]);

  if (isLoading) {
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
              <p>UserProfile: {userProfile ? 'Yes' : 'No'}</p>
              <p>AuthError: {authError ? 'Yes' : 'No'}</p>
              <p>isSuperAdmin: {isSuperAdmin ? 'Yes' : 'No'}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!user) {
    if (process.env.NODE_ENV === 'development') {
    }
    
    // إعطاء وقت إضافي لـ AuthContext لتهيئة نفسه
    if (!user) {
      return (
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">جاري تهيئة المصادقة...</p>
            <p className="mt-2 text-sm text-gray-500">يرجى الانتظار</p>
          </div>
        </div>
      );
    }
    
    // If not logged in, redirect to super admin login
    return <Navigate to="/super-admin/login" state={{ from: location }} replace />;
  }

  if (!isSuperAdmin) {
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
              <p>User Email: {user?.email}</p>
              <p>UserProfile: {userProfile ? 'Loaded' : 'Not Loaded'}</p>
              <p>Session: {session ? 'Active' : 'Inactive'}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // If super admin, render the protected routes
  return <Outlet />;
}
