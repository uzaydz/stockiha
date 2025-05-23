import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext'; // Assuming AuthContext provides user object
import { checkUserPermissions, refreshUserData } from '@/lib/api/permissions'; // API functions

interface UseProductPermissionsProps {
  isEditMode: boolean;
}

export const useProductPermissions = ({ isEditMode }: UseProductPermissionsProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hasPermission, setHasPermission] = useState(true); // Assume true initially, verify in effect
  const [isCheckingPermission, setIsCheckingPermission] = useState(true);

  useEffect(() => {
    if (!user) {
      // If user is not available yet, wait or decide on a default behavior
      // For now, if no user, assume no permission after a brief check period
      setIsCheckingPermission(false);
      // setHasPermission(false); // Or navigate to login, etc.
      return;
    }
    
    setIsCheckingPermission(true);
    const checkPermission = async () => {
      try {
        const userData = await refreshUserData(user.id);
        const mergedUserData = {
          ...user,
          permissions: userData?.permissions || user.user_metadata?.permissions,
          is_org_admin: userData?.is_org_admin || user.user_metadata?.is_org_admin,
          is_super_admin: userData?.is_super_admin || user.user_metadata?.is_super_admin,
          role: userData?.role || user.user_metadata?.role,
        };
        
        const permissionAction = isEditMode ? 'editProducts' : 'addProducts';
        const hasRequiredPermission = await checkUserPermissions(mergedUserData, permissionAction);
        
        setHasPermission(hasRequiredPermission);
        
        if (!hasRequiredPermission) {
          toast.error(`ليس لديك صلاحية ${isEditMode ? 'تعديل' : 'إضافة'} المنتجات`);
          navigate('/products');
        }
      } catch (error) {
        console.error('Error checking permissions:', error);
        // Fallback permission check (simplified from original)
        const permissions = user.user_metadata?.permissions || {};
        const isAdmin =
          user.user_metadata?.role === 'admin' ||
          user.user_metadata?.role === 'owner' ||
          user.user_metadata?.is_org_admin === true ||
          user.user_metadata?.is_super_admin === true;
        
        const requiredPermission = isEditMode ? 'editProducts' : 'addProducts';
        const hasExplicitPermission = Boolean(permissions[requiredPermission]);
        const fallbackPermission = isAdmin || hasExplicitPermission;

        setHasPermission(fallbackPermission);
        
        if (!fallbackPermission) {
          toast.error(`ليس لديك صلاحية ${isEditMode ? 'تعديل' : 'إضافة'} المنتجات`);
          navigate('/products');
        }
      } finally {
        setIsCheckingPermission(false);
      }
    };
    
    checkPermission();
  }, [user, isEditMode, navigate]);

  return { hasPermission, isCheckingPermission };
}; 