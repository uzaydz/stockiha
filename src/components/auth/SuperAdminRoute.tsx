import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

/**
 * Protected route component that ensures the user is a super admin
 * Redirects to login page if not authenticated
 * Redirects to dashboard if authenticated but not a super admin
 */
export default function SuperAdminRoute() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const checkSuperAdminStatus = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // تحقق من صلاحيات المسؤول الرئيسي مباشرة من قاعدة البيانات
        const { data, error } = await supabase
          .from('users')
          .select('is_super_admin, role')
          .eq('id', user.id)
          .single();
        
        if (error) {
          setIsSuperAdmin(false);
        } else {
          // تحقق من is_super_admin flag
          setIsSuperAdmin(data?.is_super_admin === true);
          
          if (data?.is_super_admin !== true) {
          }
        }
      } catch (error) {
        setIsSuperAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSuperAdminStatus();
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">التحقق من صلاحيات الوصول...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // If not logged in, redirect to super admin login
    return <Navigate to="/super-admin/login" state={{ from: location }} replace />;
  }

  if (!isSuperAdmin) {
    // If logged in but not a super admin, redirect to normal dashboard or show access denied
    return <Navigate to="/dashboard" replace />;
  }

  // If super admin, render the protected routes
  return <Outlet />;
}
