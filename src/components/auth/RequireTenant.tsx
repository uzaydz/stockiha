import { useEffect } from 'react';
import { Navigate, useNavigate, Outlet } from 'react-router-dom';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

type RequireTenantProps = {
  children?: React.ReactNode;
};

/**
 * مكون للتحقق من وجود مؤسسة وتوجيه المستخدم لإنشاء مؤسسة إذا لم تكن موجودة
 * أو التحقق من وجود النطاق الفرعي
 */
const RequireTenant = ({ children }: RequireTenantProps) => {
  const { currentOrganization, isLoading, error } = useTenant();
  const { currentSubdomain, isTenant } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // في حالة وجود خطأ في تحميل بيانات المؤسسة، توجيه المستخدم لصفحة إعداد المؤسسة
    if (error && !isLoading) {
      console.error('Error loading organization data:', error);
      navigate('/organization/setup');
    }
  }, [error, isLoading, navigate]);

  // في حالة جاري تحميل بيانات المؤسسة، عرض مؤشر التحميل
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
        <p className="text-muted-foreground">جاري التحقق من بيانات المؤسسة...</p>
      </div>
    );
  }

  // إذا كان هناك نطاق فرعي ولكن لا توجد مؤسسة مرتبطة به
  if (currentSubdomain && !currentOrganization) {
    // Special handling for localhost subdomains during development
    const isLocalhost = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' ||
                        window.location.hostname.endsWith('localhost');
    
    // If we're on a localhost subdomain, try redirecting to the main dashboard
    // This is mostly for development since in production we'd want to show an error
    if (isLocalhost) {
      console.log("[RequireTenant] Invalid subdomain on localhost, redirecting to main dashboard.");
      return <Navigate to="/dashboard" replace />;
    }
    
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <div className="p-6 max-w-md bg-card rounded-lg border border-border shadow-sm text-center">
          <h1 className="text-2xl font-bold mb-4">نطاق فرعي غير صالح</h1>
          <p className="text-muted-foreground mb-6">
            النطاق الفرعي "{currentSubdomain}" غير مرتبط بأي مؤسسة أو غير متاح حالياً.
          </p>
          <a 
            href={`${window.location.protocol}//${window.location.hostname.split('.').slice(1).join('.')}`}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            العودة للصفحة الرئيسية
          </a>
        </div>
      </div>
    );
  }

  // إذا لم تكن هناك مؤسسة، توجيه المستخدم لصفحة إعداد المؤسسة
  if (!currentOrganization) {
    console.log("[RequireTenant] No current organization found, redirecting to setup.");
    return <Navigate to="/organization/setup" replace />;
  }

  // Render children if provided, otherwise render Outlet for nested routes
  return children ? <>{children}</> : <Outlet />;
};

export default RequireTenant; 