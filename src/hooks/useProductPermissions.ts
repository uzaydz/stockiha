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
  const [permissionWarning, setPermissionWarning] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔍 [useProductPermissions] بدء التحقق من الصلاحيات...', {
      isEditMode,
      userExists: !!user,
      userEmail: user?.email,
      userRole: user?.user_metadata?.role,
      userPermissions: user?.user_metadata?.permissions,
      isOrgAdmin: user?.user_metadata?.is_org_admin
    });

    if (!user) {
      console.log('⚠️ [useProductPermissions] لا يوجد مستخدم، السماح بالوصول مؤقتاً');
      // If user is not available yet, wait or decide on a default behavior
      // For now, if no user, assume permission and let the backend handle it
      setIsCheckingPermission(false);
      setHasPermission(true); // Allow access, let backend validate
      return;
    }
    
    setIsCheckingPermission(true);
    const checkPermission = async () => {
      try {
        console.log('📡 [useProductPermissions] استدعاء refreshUserData...', { userId: user.id });
        const userData = await refreshUserData(user.id);
        console.log('📊 [useProductPermissions] بيانات المستخدم من قاعدة البيانات:', userData);
        
        const mergedUserData = {
          ...user,
          permissions: userData?.permissions || user.user_metadata?.permissions,
          is_org_admin: userData?.is_org_admin || user.user_metadata?.is_org_admin,
          is_super_admin: userData?.is_super_admin || user.user_metadata?.is_super_admin,
          role: userData?.role || user.user_metadata?.role,
        };
        
        console.log('🔗 [useProductPermissions] البيانات المدمجة:', {
          email: mergedUserData.email,
          role: mergedUserData.role,
          is_org_admin: mergedUserData.is_org_admin,
          is_super_admin: mergedUserData.is_super_admin,
          permissions: mergedUserData.permissions
        });
        
        const permissionAction = isEditMode ? 'editProducts' : 'addProducts';
        console.log('🔐 [useProductPermissions] فحص الصلاحية:', permissionAction);
        
        const hasRequiredPermission = await checkUserPermissions(mergedUserData, permissionAction);
        console.log('✅ [useProductPermissions] نتيجة فحص الصلاحية:', hasRequiredPermission);
        
        setHasPermission(hasRequiredPermission);
        
        if (!hasRequiredPermission) {
          console.log('⚠️ [useProductPermissions] صلاحية غير كافية، عرض تحذير');
          setPermissionWarning(`قد لا تملك صلاحية ${isEditMode ? 'تعديل' : 'إضافة'} المنتجات. سيتم التحقق عند الحفظ.`);
          // Don't navigate away, just show warning
          toast.warning(`تحذير: قد لا تملك صلاحية ${isEditMode ? 'تعديل' : 'إضافة'} المنتجات`);
        } else {
          console.log('✅ [useProductPermissions] صلاحية مقبولة');
          setPermissionWarning(null);
        }
      } catch (error) {
        console.error('❌ [useProductPermissions] فشل في التحقق من الصلاحيات:', error);
        console.log('🔄 [useProductPermissions] تطبيق fallback logic...');
        
        // Fallback permission check (simplified from original)
        const permissions = user.user_metadata?.permissions || {};
        const isAdmin =
          user.user_metadata?.role === 'admin' ||
          user.user_metadata?.role === 'owner' ||
          user.user_metadata?.is_org_admin === true ||
          user.user_metadata?.is_super_admin === true;
        
        console.log('🔍 [useProductPermissions] Fallback data:', {
          permissions,
          role: user.user_metadata?.role,
          is_org_admin: user.user_metadata?.is_org_admin,
          is_super_admin: user.user_metadata?.is_super_admin,
          isAdmin
        });
        
        const requiredPermission = isEditMode ? 'editProducts' : 'addProducts';
        const hasExplicitPermission = Boolean(permissions[requiredPermission]);
        const fallbackPermission = isAdmin || hasExplicitPermission;

        console.log('🔐 [useProductPermissions] Fallback permission check:', {
          requiredPermission,
          hasExplicitPermission,
          fallbackPermission
        });

        // Be more lenient - allow access with warning if uncertain
        if (fallbackPermission) {
          console.log('✅ [useProductPermissions] Fallback: صلاحية مقبولة');
          setHasPermission(true);
          setPermissionWarning(null);
        } else {
          console.log('⚠️ [useProductPermissions] Fallback: صلاحية غير مؤكدة، السماح مع تحذير');
          // Still allow access but with warning
          setHasPermission(true);
          setPermissionWarning(`لا يمكن التحقق من الصلاحيات. سيتم التحقق عند الحفظ.`);
          toast.warning(`تحذير: لا يمكن التحقق من صلاحيات ${isEditMode ? 'تعديل' : 'إضافة'} المنتجات`);
        }
      } finally {
        setIsCheckingPermission(false);
      }
    };
    
    checkPermission();
  }, [user, isEditMode, navigate]);

  return { hasPermission, isCheckingPermission, permissionWarning };
};
