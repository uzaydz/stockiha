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
  const location = useLocation();
  const lastCheckedUserId = useRef<string | null>(null);
  const superAdminCache = useRef<{ [userId: string]: { status: boolean; timestamp: number } }>({});

  useEffect(() => {
    const checkSuperAdminStatus = async () => {
      if (!user || !session) {
        setIsLoading(false);
        setIsSuperAdmin(false);
        setAuthError(true);
        return;
      }

      // تجنب إعادة الفحص لنفس المستخدم
      if (lastCheckedUserId.current === user.id) {
        setIsLoading(false);
        return;
      }

      // التحقق من localStorage أولاً
      const storedSuperAdminStatus = localStorage.getItem('is_super_admin');
      const storedSession = localStorage.getItem('super_admin_session');
      
      if (storedSuperAdminStatus === 'true' && storedSession) {
        try {
          const sessionData = JSON.parse(storedSession);
          // التحقق من أن الجلسة المحفوظة تخص نفس المستخدم وليست قديمة جداً (24 ساعة)
          if (sessionData.userId === user.id && (now - sessionData.timestamp) < 24 * 60 * 60 * 1000) {
            setIsSuperAdmin(true);
            setIsLoading(false);
            setAuthError(false);
            lastCheckedUserId.current = user.id;
            return;
          }
        } catch (e) {
          // إذا كانت البيانات المحفوظة تالفة، امسحها
          localStorage.removeItem('is_super_admin');
          localStorage.removeItem('super_admin_session');
        }
      }

      // التحقق من الكاش في الذاكرة (صالح لمدة 10 دقائق)
      const cached = superAdminCache.current[user.id];
      const now = Date.now();
      if (cached && (now - cached.timestamp) < 10 * 60 * 1000) {
        setIsSuperAdmin(cached.status);
        setIsLoading(false);
        setAuthError(false);
        lastCheckedUserId.current = user.id;
        return;
      }

      try {
        setAuthError(false);
        
        // تحقق من صلاحيات المسؤول الرئيسي مباشرة من قاعدة البيانات
        const { data, error } = await supabase
          .from('users')
          .select('is_super_admin, role')
          .eq('id', user.id)
          .single();
        
        if (error) {
          setIsSuperAdmin(false);
          setAuthError(true);
        } else {
          const isSuper = data?.is_super_admin === true;
          setIsSuperAdmin(isSuper);
          
          // حفظ في الكاش
          superAdminCache.current[user.id] = {
            status: isSuper,
            timestamp: now
          };
          
          // حفظ في localStorage إذا كان Super Admin
          if (isSuper) {
            localStorage.setItem('is_super_admin', 'true');
            localStorage.setItem('super_admin_session', JSON.stringify({
              userId: user.id,
              timestamp: now
            }));
          } else {
            // إزالة من localStorage إذا لم يكن Super Admin
            localStorage.removeItem('is_super_admin');
            localStorage.removeItem('super_admin_session');
          }
          
          lastCheckedUserId.current = user.id;
          
          if (!isSuper) {
          }
        }
      } catch (error) {
        setIsSuperAdmin(false);
        setAuthError(true);
        // إزالة بيانات localStorage عند حدوث خطأ
        localStorage.removeItem('is_super_admin');
        localStorage.removeItem('super_admin_session');
      } finally {
        setIsLoading(false);
      }
    };

    checkSuperAdminStatus();
  }, [user, session]);

  // تنظيف localStorage عند تسجيل الخروج
  useEffect(() => {
    if (!user) {
      localStorage.removeItem('is_super_admin');
      localStorage.removeItem('super_admin_session');
      superAdminCache.current = {};
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">التحقق من صلاحيات الوصول...</p>
        </div>
      </div>
    );
  }

  if (!user || !session || authError) {
    // If not logged in or auth error, redirect to super admin login
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
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            العودة إلى لوحة التحكم
          </button>
        </div>
      </div>
    );
  }

  // If super admin, render the protected routes
  return <Outlet />;
}
