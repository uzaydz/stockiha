import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { checkUserPermissionsLocal } from '@/lib/utils/permissions-utils';
import { usePermissions } from '@/hooks/usePermissions';

interface PermissionGuardProps {
  requiredPermissions: string[];
  children: React.ReactNode;
  fallbackPath?: string;
}

// تعيين الصلاحيات البديلة لكل صلاحية مطلوبة
const permissionMapping: Record<string, string[]> = {
  'manageProducts': ['manageProducts', 'addProducts', 'editProducts', 'admin', 'owner', 'org_admin', 'super_admin'],
  'viewFlexiAndDigitalCurrencySales': ['manageFlexi', 'viewReports'],
  'editProducts': ['editProducts', 'manageProducts', 'admin', 'owner', 'org_admin', 'super_admin'],
  'addProducts': ['addProducts', 'manageProducts', 'admin', 'owner', 'org_admin', 'super_admin'],
  'viewEmployees': ['viewEmployees', 'manageEmployees', 'admin', 'owner', 'org_admin', 'super_admin'],
  'manageEmployees': ['manageEmployees', 'viewEmployees', 'admin', 'owner', 'org_admin', 'super_admin'],
  // إضافة الصلاحيات المطلوبة لـ POS
  'accessPOS': ['accessPOS', 'processPayments', 'manageOrders', 'admin', 'owner', 'org_admin', 'super_admin'],
  'viewPOSOrders': ['viewPOSOrders', 'accessPOS', 'processPayments', 'manageOrders', 'admin', 'owner', 'org_admin', 'super_admin'],
  'processPayments': ['processPayments', 'accessPOS', 'manageOrders', 'admin', 'owner', 'org_admin', 'super_admin'],
  // إضافة الصلاحيات المطلوبة للطلبات
  'viewOrders': ['viewOrders', 'manageOrders', 'accessPOS', 'admin', 'owner', 'org_admin', 'super_admin'],
  'updateOrderStatus': ['updateOrderStatus', 'manageOrders', 'admin', 'owner', 'org_admin', 'super_admin'],
  'cancelOrders': ['cancelOrders', 'manageOrders', 'admin', 'owner', 'org_admin', 'super_admin'],
  'manageOrders': ['manageOrders', 'viewOrders', 'updateOrderStatus', 'cancelOrders', 'admin', 'owner', 'org_admin', 'super_admin'],
  // إضافة الصلاحيات المطلوبة للخدمات
  'viewServices': ['viewServices', 'manageServices', 'admin', 'owner', 'org_admin', 'super_admin'],
  'addServices': ['addServices', 'manageServices', 'admin', 'owner', 'org_admin', 'super_admin'],
  'editServices': ['editServices', 'manageServices', 'admin', 'owner', 'org_admin', 'super_admin'],
  'manageServices': ['manageServices', 'viewServices', 'addServices', 'editServices', 'admin', 'owner', 'org_admin', 'super_admin'],
  // إضافة الصلاحيات المطلوبة للمخزون
  'viewInventory': ['viewInventory', 'manageInventory', 'admin', 'owner', 'org_admin', 'super_admin'],
  'manageInventory': ['manageInventory', 'viewInventory', 'admin', 'owner', 'org_admin', 'super_admin'],
  // إضافة الصلاحيات المطلوبة للفئات
  'manageProductCategories': ['manageProductCategories', 'manageProducts', 'admin', 'owner', 'org_admin', 'super_admin'],
  // إضافة صلاحيات عرض المنتجات
  'viewProducts': ['viewProducts', 'manageProducts', 'admin', 'owner', 'org_admin', 'super_admin'],
  // الديون: توحيد مع الصلاحيات المعتمدة في EmployeePermissions
  'viewDebts': ['viewDebts', 'recordDebtPayments', 'viewCustomerDebtHistory', 'viewFinancialReports', 'admin', 'owner', 'org_admin', 'super_admin'],
  // إضافة الصلاحيات المطلوبة للتقارير
  'viewFinancialReports': ['viewFinancialReports', 'viewReports', 'admin', 'owner', 'org_admin', 'super_admin'],
  'viewSalesReports': ['viewSalesReports', 'viewReports', 'admin', 'owner', 'org_admin', 'super_admin'],
  'viewReports': ['viewReports', 'viewFinancialReports', 'viewSalesReports', 'admin', 'owner', 'org_admin', 'super_admin'],
  // إضافة الصلاحيات المطلوبة للموردين
  'manageSuppliers': ['manageSuppliers', 'viewSuppliers', 'admin', 'owner', 'org_admin', 'super_admin'],
  'viewSuppliers': ['viewSuppliers', 'manageSuppliers', 'admin', 'owner', 'org_admin', 'super_admin'],
  // إضافة الصلاحيات المطلوبة للإعدادات
  'manageOrganizationSettings': ['manageOrganizationSettings', 'admin', 'owner', 'org_admin', 'super_admin'],
  // إضافة الصلاحيات المطلوبة للعملاء
  'viewCustomers': ['viewCustomers', 'manageCustomers', 'admin', 'owner', 'org_admin', 'super_admin'],
  'manageCustomers': ['manageCustomers', 'viewCustomers', 'admin', 'owner', 'org_admin', 'super_admin'],
  'addCustomers': ['addCustomers', 'manageCustomers', 'admin', 'owner', 'org_admin', 'super_admin'],
  'editCustomers': ['editCustomers', 'manageCustomers', 'admin', 'owner', 'org_admin', 'super_admin']
};

const PermissionGuard = ({ 
  requiredPermissions, 
  children, 
  fallbackPath = '/dashboard' 
}: PermissionGuardProps) => {
  const { user, userProfile } = useAuth();
  const perms = usePermissions();
  const location = useLocation();
  const [showPermissionAlert, setShowPermissionAlert] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  
  useEffect(() => {
    console.log('🔐 [PermissionGuard] بدء التحقق من الصلاحيات:', {
      requiredPermissions,
      hasUser: !!user,
      hasUserProfile: !!userProfile,
      userRole: userProfile?.role,
      permsReady: perms?.ready,
    });

    if (!user) {
      console.log('❌ [PermissionGuard] لا يوجد user');
      setHasPermission(false);
      setIsChecking(false);
      return;
    }

    // استخدام مزود الصلاحيات الموحد إن كان جاهزاً
    const checkWithProvider = (perm: string) => {
      // إذا لم يكن PermissionsProvider متوفراً، إرجاع undefined للانتقال للفحص المحلي
      if (!perms || !perms.ready || !perms.data) return undefined;
      
      // دعم بدائل الأدوار
      if (perm === 'org_admin') return perms.isOrgAdmin;
      if (perm === 'super_admin') return perms.isSuperAdmin;
      if (perm === 'admin') return perms.role === 'admin';
      if (perm === 'owner') return perms.role === 'owner';
      return perms.has(perm);
    };

    // فحص الصلاحيات المطلوبة مع الصلاحيات البديلة
    const hasRequiredPermission = requiredPermissions.some(requiredPermission => {
      // الحصول على الصلاحيات البديلة لهذه الصلاحية
      const alternativePermissions = permissionMapping[requiredPermission] || [requiredPermission];

      // فحص كل صلاحية بديلة
      const hasAnyPermission = alternativePermissions.some(permission => {
        // جرّب مزود الصلاحيات أولاً
        const providerResult = checkWithProvider(permission);
        
        // إذا كان مزود الصلاحيات متوفر وله نتيجة، استخدمها
        if (providerResult !== undefined) {
          
          return providerResult;
        }
        
        // فحص الأدوار الإدارية محلياً كحل احتياطي
        if (['admin', 'owner', 'org_admin', 'super_admin'].includes(permission)) {
          const isAdmin =
            user?.user_metadata?.role === 'admin' ||
            user?.user_metadata?.role === 'owner' ||
            user?.user_metadata?.is_org_admin === true ||
            user?.user_metadata?.is_super_admin === true ||
            userProfile?.role === 'admin' ||
            userProfile?.role === 'owner' ||
            userProfile?.role === 'org_admin' ||
            userProfile?.role === 'super_admin';
          
          return !!isAdmin;
        }
        
        // فحص محلي كحل احتياطي - يجب أن يحدث لجميع الصلاحيات
        const localResult = checkUserPermissionsLocal(user, permission as any, userProfile);
        
        return localResult;
      });
      
      return hasAnyPermission;
    });

    console.log('🎯 [PermissionGuard] النتيجة النهائية:', {
      hasRequiredPermission,
      requiredPermissions,
    });

    setHasPermission(hasRequiredPermission);
    setIsChecking(false);

    if (!hasRequiredPermission) {
      console.log('❌ [PermissionGuard] لا يملك الصلاحيات - سيتم التوجيه إلى:', fallbackPath);
      // لا نعرض التنبيه، بل نوجه مباشرة
    }
  }, [user, userProfile, requiredPermissions, location.pathname, perms.ready, perms.role, perms.isOrgAdmin, perms.isSuperAdmin]);

  const handleDialogClose = () => {
    setShowPermissionAlert(false);
  };

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // إذا لم يكن لديه صلاحية، توجيه إلى fallbackPath
  if (!hasPermission && fallbackPath) {
    console.log('🔀 [PermissionGuard] توجيه إلى:', fallbackPath);
    return <Navigate to={fallbackPath} replace />;
  }

  // إذا لم يكن لديه صلاحية ولا يوجد fallbackPath، عرض رسالة
  if (!hasPermission) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="text-6xl">🔒</div>
          <h2 className="text-xl font-bold">ليس لديك الصلاحية</h2>
          <p className="text-muted-foreground">
            لا تملك الصلاحيات الكافية للوصول إلى هذه الصفحة
          </p>
          <p className="text-xs text-muted-foreground">
            الصلاحيات المطلوبة: {requiredPermissions.join(', ')}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default PermissionGuard;
