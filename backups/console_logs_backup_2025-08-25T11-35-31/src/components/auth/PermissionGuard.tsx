import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
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
  // إضافة الصلاحيات المطلوبة للديون
  'viewDebts': ['viewDebts', 'manageDebts', 'viewFinancialReports', 'admin', 'owner', 'org_admin', 'super_admin'],
  'manageDebts': ['manageDebts', 'viewDebts', 'admin', 'owner', 'org_admin', 'super_admin'],
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
  const location = useLocation();
  const [showPermissionAlert, setShowPermissionAlert] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  
  useEffect(() => {
    console.log('🔍 [PermissionGuard] useEffect triggered');
    console.log('🔍 [PermissionGuard] user:', user);
    console.log('🔍 [PermissionGuard] requiredPermissions:', requiredPermissions);
    console.log('🔍 [PermissionGuard] location.pathname:', location.pathname);
    
    if (!user) {
      console.log('🚫 [PermissionGuard] No user');
      setHasPermission(false);
      setIsChecking(false);
      return;
    }

    // فحص الصلاحيات المطلوبة مع الصلاحيات البديلة
    const hasRequiredPermission = requiredPermissions.some(requiredPermission => {
      // الحصول على الصلاحيات البديلة لهذه الصلاحية
      const alternativePermissions = permissionMapping[requiredPermission] || [requiredPermission];
      
      console.log('🔍 [PermissionGuard] Checking permission:', requiredPermission);
      console.log('🔍 [PermissionGuard] Alternative permissions:', alternativePermissions);
      
      // فحص كل صلاحية بديلة
      const hasAnyPermission = alternativePermissions.some(permission => {
        // فحص الأدوار الإدارية أولاً
        if (['admin', 'owner', 'org_admin', 'super_admin'].includes(permission)) {
          const isAdmin = 
            user.user_metadata?.role === 'admin' ||
            user.user_metadata?.role === 'owner' ||
            user.user_metadata?.is_org_admin === true ||
            user.user_metadata?.is_super_admin === true;
          
          console.log('🔍 [PermissionGuard] Checking admin role:', permission, 'result:', isAdmin);
          return isAdmin;
        }
        
        // فحص الصلاحية المحددة
        const hasSpecificPermission = checkUserPermissionsLocal(user, permission as any, userProfile);
        console.log('🔍 [PermissionGuard] Checking specific permission:', permission, 'result:', hasSpecificPermission);
        
        // إضافة فحص إضافي للصلاحيات
        if (permission === 'accessPOS') {
          console.log('🔍 [PermissionGuard] Special check for accessPOS');
          console.log('🔍 [PermissionGuard] User metadata:', user.user_metadata);
          console.log('🔍 [PermissionGuard] App metadata:', user.app_metadata);
          console.log('🔍 [PermissionGuard] Direct permissions:', (user as any).permissions);
        }
        
        return hasSpecificPermission;
      });
      
      console.log('🔍 [PermissionGuard] Has any permission for', requiredPermission, ':', hasAnyPermission);
      return hasAnyPermission;
    });

    console.log('🔍 [PermissionGuard] Final hasRequiredPermission:', hasRequiredPermission);
    
    setHasPermission(hasRequiredPermission);
    setIsChecking(false);

    if (!hasRequiredPermission) {
      console.log('🚫 [PermissionGuard] No permission, showing alert');
      setShowPermissionAlert(true);
    }
  }, [user, userProfile, requiredPermissions, location.pathname]);

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
                لا تملك الصلاحيات الكافية للوصول إلى هذه الصفحة.
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
      
      {hasPermission ? children : null}
    </>
  );
};

export default PermissionGuard;
