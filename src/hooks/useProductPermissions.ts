import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';

interface UseProductPermissionsProps {
  isEditMode: boolean;
}

export const useProductPermissions = ({ isEditMode }: UseProductPermissionsProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hasPermission, setHasPermission] = useState(true); // Assume true initially, verify in effect
  const [isCheckingPermission, setIsCheckingPermission] = useState(true);
  const [permissionWarning, setPermissionWarning] = useState<string | null>(null);
  const perms = usePermissions();

  useEffect(() => {
    if (!user) {
      // If user is not available yet, wait or decide on a default behavior
      // For now, if no user, assume permission and let the backend handle it
      setIsCheckingPermission(false);
      setHasPermission(true); // Allow access, let backend validate
      return;
    }
    
    setIsCheckingPermission(true);
    const checkPermission = async () => {
      try {
        // Prefer unified permissions provider
        if (perms.ready && perms.data) {
          const hasAccess = isEditMode
            ? perms.anyOf(['editProducts', 'manageProducts'])
            : perms.anyOf(['addProducts', 'manageProducts']);
          setHasPermission(hasAccess);
          if (!hasAccess) {
            setPermissionWarning(`قد لا تملك صلاحية ${isEditMode ? 'تعديل' : 'إضافة'} المنتجات. سيتم التحقق عند الحفظ.`);
            toast.warning(`تحذير: قد لا تملك صلاحية ${isEditMode ? 'تعديل' : 'إضافة'} المنتجات`);
          } else {
            setPermissionWarning(null);
          }
          return;
        }

        // Fallback to user metadata while provider loads
        const permissions = user.user_metadata?.permissions || {};
        const isAdmin =
          user.user_metadata?.role === 'admin' ||
          user.user_metadata?.role === 'owner' ||
          user.user_metadata?.is_org_admin === true ||
          user.user_metadata?.is_super_admin === true;
        const requiredPermission = isEditMode ? 'editProducts' : 'addProducts';
        const hasExplicitPermission = Boolean(permissions[requiredPermission]);
        const hasManageProductsPermission = Boolean(permissions.manageProducts);
        const hasAccess = isAdmin || hasExplicitPermission || hasManageProductsPermission;

        setHasPermission(hasAccess);
        
        if (!hasAccess) {
          setPermissionWarning(`قد لا تملك صلاحية ${isEditMode ? 'تعديل' : 'إضافة'} المنتجات. سيتم التحقق عند الحفظ.`);
          toast.warning(`تحذير: قد لا تملك صلاحية ${isEditMode ? 'تعديل' : 'إضافة'} المنتجات`);
        } else {
          setPermissionWarning(null);
        }
      } catch (error) {
        
        // في حالة الخطأ، نكون أكثر تساهلاً ونسمح بالوصول مع تحذير
        setHasPermission(true);
        setPermissionWarning(`لا يمكن التحقق من الصلاحيات. سيتم التحقق عند الحفظ.`);
        toast.warning(`تحذير: لا يمكن التحقق من صلاحيات ${isEditMode ? 'تعديل' : 'إضافة'} المنتجات`);
      } finally {
        setIsCheckingPermission(false);
      }
    };
    
    checkPermission();
  }, [user, isEditMode, navigate, perms.ready, perms.role, perms.isOrgAdmin, perms.isSuperAdmin]);

  return { hasPermission, isCheckingPermission, permissionWarning };
};
