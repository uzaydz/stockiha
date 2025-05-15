import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { EmployeePermissions } from '@/types/employee';
import { toast } from '@/hooks/use-toast';
import { checkUserPermissions } from '@/lib/api/permissions'; // استيراد دالة التحقق من الصلاحيات
// استيراد مكونات النافذة المنبثقة
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PermissionGuardProps {
  requiredPermissions: Array<keyof EmployeePermissions>;
  children: ReactNode;
  fallbackPath?: string;
}

// خريطة لتصحيح أسماء الصلاحيات
const permissionMapping: Record<string, string[]> = {
  'viewServices': ['viewServices', 'manageServices'],
  'viewProducts': ['viewProducts', 'manageProducts', 'editProducts'],
  'viewOrders': ['viewOrders', 'manageOrders'],
  'viewSalesReports': ['viewSalesReports', 'viewReports'],
  'viewFinancialReports': ['viewFinancialReports', 'viewReports'],
  'viewCustomers': ['viewCustomers', 'manageCustomers'],
  'viewDebts': ['viewDebts', 'manageCustomers', 'viewCustomers'],
  'viewEmployees': ['viewEmployees', 'manageEmployees'],
  'manageOrganizationSettings': ['manageOrganizationSettings', 'manageSettings'],
  'viewSettings': ['viewSettings', 'manageSettings'],
  'viewInventory': ['viewInventory', 'manageInventory'],
  'accessPOS': ['accessPOS'],
  'trackServices': ['trackServices', 'manageServices'],
  'viewSuppliers': ['viewSuppliers', 'manageSuppliers'],
  'managePurchases': ['managePurchases', 'manageSuppliers'],
  'viewReports': ['viewReports'],
  'manageFlexiAndDigitalCurrency': ['manageFlexi'],
  'sellFlexiAndDigitalCurrency': ['manageFlexi', 'processPayments'],
  'viewFlexiAndDigitalCurrencySales': ['manageFlexi', 'viewReports']
};

/**
 * مكون للتحقق من صلاحيات المستخدم
 * يسمح بالوصول فقط إذا كان المستخدم لديه إحدى الصلاحيات المطلوبة
 * ويعرض رسالة تنبيه عند عدم وجود الصلاحية
 */
const PermissionGuard = ({ 
  requiredPermissions, 
  children, 
  fallbackPath = '/dashboard' 
}: PermissionGuardProps) => {
  const { user } = useAuth();
  const location = useLocation();
  const [showPermissionAlert, setShowPermissionAlert] = useState(false);
  const [redirect, setRedirect] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [shouldRedirectToLogin, setShouldRedirectToLogin] = useState(false);
  
  // وظيفة لمسح تنبيهات قديمة (أكثر من يوم)
  const clearOldAlerts = () => {
    try {
      const now = Date.now();
      const expireTime = 24 * 60 * 60 * 1000; // 24 ساعة
      
      // البحث عن جميع مفاتيح تنبيهات الصلاحيات
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('permission_alert_')) {
          const timestamp = Number(localStorage.getItem(key));
          if (isNaN(timestamp) || (now - timestamp) > expireTime) {
            localStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.error('خطأ عند محاولة مسح التنبيهات القديمة:', error);
    }
  };
  
  // نتحقق من وجود المستخدم ونعد الكومبوننت للتحقق من الصلاحيات
  useEffect(() => {
    // التحقق من وجود المستخدم أولاً
    if (!user) {
      setShouldRedirectToLogin(true);
      setIsChecking(false);
      return;
    }
    
    const checkPermissions = async () => {
      setIsChecking(true);
      
      try {
        // التحقق من دور المستخدم - إذا كان مسؤولاً، يمكنه الوصول بغض النظر عن الصلاحيات
        const userRole = user.user_metadata?.role || user.app_metadata?.role || (user as any).role;
        const isAdmin = userRole === 'admin' || userRole === 'owner';
        const isOrgAdmin = user.user_metadata?.is_org_admin === true || 
                          user.app_metadata?.is_org_admin === true || 
                          (user as any).is_org_admin === true;
        
        if (isAdmin || isOrgAdmin) {
          
          setHasPermission(true);
          setIsChecking(false);
          return;
        }
        
        // إذا لم يكن هناك صلاحيات مطلوبة
        if (requiredPermissions.length === 0) {
          setHasPermission(true);
          setIsChecking(false);
          return;
        }
        
        // التحقق من كل صلاحية مطلوبة
        const permissionChecks = await Promise.all(
          requiredPermissions.map(async (permission) => {
            return await checkUserPermissions(user, permission);
          })
        );
        
        // السماح بالوصول إذا كان لديه أي صلاحية من الصلاحيات المطلوبة
        const hasAnyPermission = permissionChecks.some(result => result === true);
        
        // طباعة معلومات تشخيصية
        
        
        setHasPermission(hasAnyPermission);
      } catch (error) {
        console.error('[PermissionGuard] خطأ أثناء التحقق من الصلاحيات:', error);
        setHasPermission(false);
      } finally {
        setIsChecking(false);
      }
    };
    
    checkPermissions();
  }, [user, requiredPermissions, location.pathname]);
  
  // التعامل مع حالة عدم وجود الصلاحية
  useEffect(() => {
    // فقط إذا اكتمل التحقق وليس لديه الصلاحية
    if (!isChecking && !hasPermission && user && !shouldRedirectToLogin) {
      // مسح التنبيهات القديمة
      clearOldAlerts();
      
      // مفتاح تخزين فريد لهذا المسار
      const alertKey = `permission_alert_${location.pathname}`;
      const lastAlertTime = localStorage.getItem(alertKey);
      const now = Date.now();
      
      // التحقق من عدم عرض التنبيه في آخر 10 دقائق
      const showAlertTimeout = 10 * 60 * 1000; // 10 دقائق
      const shouldShowAlert = !lastAlertTime || (now - Number(lastAlertTime)) > showAlertTimeout;
      
      if (shouldShowAlert) {
        // تحديث وقت آخر تنبيه
        localStorage.setItem(alertKey, now.toString());
        // عرض النافذة المنبثقة
        setShowPermissionAlert(true);
        
        // سجل الصلاحيات المطلوبة للتشخيص
        const requiredPermissionNames = requiredPermissions.join(', ');
        
        // عرض رسالة توست
        toast({
          title: "ليس لديك الصلاحية للوصول",
          description: `لا تملك الصلاحيات المطلوبة (${requiredPermissionNames}) للوصول إلى هذه الصفحة`,
          variant: "destructive",
        });
      } else {
        // إذا تم عرض التنبيه مؤخراً، نقوم بإعادة التوجيه مباشرة
        setRedirect(true);
      }
    }
  }, [isChecking, hasPermission, location.pathname, requiredPermissions, user, shouldRedirectToLogin]);

  // التعامل مع إغلاق نافذة التنبيه
  const handleDialogClose = () => {
    setShowPermissionAlert(false);
    setRedirect(true);
  };

  // عرض المحتوى المناسب بناءً على حالة المكون
  if (shouldRedirectToLogin) {
    return <Navigate to="/login" replace />;
  }

  if (redirect) {
    return <Navigate to={fallbackPath} replace />;
  }

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      {showPermissionAlert && (
        <AlertDialog open={showPermissionAlert} onOpenChange={(open) => {
          if (!open) handleDialogClose();
        }}>
          <AlertDialogContent dir="rtl" className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>ليس لديك الصلاحية</AlertDialogTitle>
              <AlertDialogDescription>
                لا تملك الصلاحيات الكافية للوصول إلى هذه الصفحة. سيتم إعادة توجيهك إلى لوحة التحكم.
                <br />
                <br />
                <span className="text-xs text-muted-foreground">
                  الصلاحيات المطلوبة: {requiredPermissions.join(', ')}
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={handleDialogClose}>فهمت</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      
      {/* نعرض محتوى الصفحة فقط إذا لدينا الصلاحية وليست هناك أي عملية إعادة توجيه مطلوبة */}
      {hasPermission && !redirect && !showPermissionAlert ? children : null}
    </>
  );
};

export default PermissionGuard; 