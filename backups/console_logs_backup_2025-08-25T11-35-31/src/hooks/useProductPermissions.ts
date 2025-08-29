import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext'; // Assuming AuthContext provides user object

interface UseProductPermissionsProps {
  isEditMode: boolean;
}

export const useProductPermissions = ({ isEditMode }: UseProductPermissionsProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hasPermission, setHasPermission] = useState(true); // Assume true initially, verify in effect
  const [isCheckingPermission, setIsCheckingPermission] = useState(true);
  const [permissionWarning, setPermissionWarning] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔍 [useProductPermissions] useEffect triggered');
    console.log('🔍 [useProductPermissions] user:', user);
    console.log('🔍 [useProductPermissions] isEditMode:', isEditMode);

    if (!user) {
      console.log('⚠️ [useProductPermissions] No user available yet');
      // If user is not available yet, wait or decide on a default behavior
      // For now, if no user, assume permission and let the backend handle it
      setIsCheckingPermission(false);
      setHasPermission(true); // Allow access, let backend validate
      return;
    }
    
    setIsCheckingPermission(true);
    const checkPermission = async () => {
      try {
        console.log('🔍 [useProductPermissions] Starting permission check...');
        
        // فحص الصلاحيات مباشرة من user metadata
        const permissions = user.user_metadata?.permissions || {};
        const isAdmin =
          user.user_metadata?.role === 'admin' ||
          user.user_metadata?.role === 'owner' ||
          user.user_metadata?.is_org_admin === true ||
          user.user_metadata?.is_super_admin === true;

        const requiredPermission = isEditMode ? 'editProducts' : 'addProducts';
        const hasExplicitPermission = Boolean(permissions[requiredPermission]);
        const hasManageProductsPermission = Boolean(permissions.manageProducts);
        
        console.log('🔍 [useProductPermissions] Permission check results:');
        console.log('🔍 [useProductPermissions] permissions:', permissions);
        console.log('🔍 [useProductPermissions] isAdmin:', isAdmin);
        console.log('🔍 [useProductPermissions] requiredPermission:', requiredPermission);
        console.log('🔍 [useProductPermissions] hasExplicitPermission:', hasExplicitPermission);
        console.log('🔍 [useProductPermissions] hasManageProductsPermission:', hasManageProductsPermission);

        // السماح بالوصول إذا كان:
        // 1. مدير (admin/owner/org_admin/super_admin)
        // 2. لديه الصلاحية المطلوبة مباشرة
        // 3. لديه صلاحية manageProducts
        const hasAccess = isAdmin || hasExplicitPermission || hasManageProductsPermission;
        
        console.log('🔍 [useProductPermissions] Final hasAccess:', hasAccess);
        
        setHasPermission(hasAccess);
        
        if (!hasAccess) {
          setPermissionWarning(`قد لا تملك صلاحية ${isEditMode ? 'تعديل' : 'إضافة'} المنتجات. سيتم التحقق عند الحفظ.`);
          toast.warning(`تحذير: قد لا تملك صلاحية ${isEditMode ? 'تعديل' : 'إضافة'} المنتجات`);
        } else {
          setPermissionWarning(null);
        }
      } catch (error) {
        console.error('❌ [useProductPermissions] Error checking permissions:', error);
        
        // في حالة الخطأ، نكون أكثر تساهلاً ونسمح بالوصول مع تحذير
        setHasPermission(true);
        setPermissionWarning(`لا يمكن التحقق من الصلاحيات. سيتم التحقق عند الحفظ.`);
        toast.warning(`تحذير: لا يمكن التحقق من صلاحيات ${isEditMode ? 'تعديل' : 'إضافة'} المنتجات`);
      } finally {
        setIsCheckingPermission(false);
      }
    };
    
    checkPermission();
  }, [user, isEditMode, navigate]);

  return { hasPermission, isCheckingPermission, permissionWarning };
};
