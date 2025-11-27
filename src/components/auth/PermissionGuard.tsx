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
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';

interface PermissionGuardProps {
  requiredPermissions: string[];
  children: React.ReactNode;
  fallbackPath?: string;
}

// تم نقل خريطة الصلاحيات إلى permission-normalizer.ts للتوحيد

const PermissionGuard = ({ 
  requiredPermissions, 
  children, 
  fallbackPath = '/dashboard' 
}: PermissionGuardProps) => {
  const { user, userProfile } = useAuth();
  const unifiedPerms = useUnifiedPermissions();
  const location = useLocation();
  const [showPermissionAlert, setShowPermissionAlert] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  
  useEffect(() => {
    console.log('🔐 [PermissionGuard] بدء التحقق من الصلاحيات:', {
      requiredPermissions,
      hasUser: !!user,
      isAdminMode: unifiedPerms.isAdminMode,
      isStaffMode: unifiedPerms.isStaffMode,
      displayName: unifiedPerms.displayName,
      permsReady: unifiedPerms.ready,
    });

    // ✅ إذا كان في وضع المدير أو موظف مسجل → صلاحيات مباشرة
    if (unifiedPerms.isAdminMode) {
      console.log('✅ [PermissionGuard] وضع المدير - صلاحيات كاملة');
      setHasPermission(true);
      setIsChecking(false);
      return;
    }

    if (unifiedPerms.isStaffMode) {
      // موظف مسجل → تحقق من صلاحياته
      const hasRequiredPermission = unifiedPerms.anyOf(requiredPermissions);
      console.log('👤 [PermissionGuard] وضع الموظف:', {
        hasRequiredPermission,
        requiredPermissions,
      });
      setHasPermission(hasRequiredPermission);
      setIsChecking(false);
      return;
    }

    // إذا لم يكن النظام جاهزاً بعد، انتظر
    if (!unifiedPerms.ready) {
      console.log('⏳ [PermissionGuard] جاري التحميل...');
      return;
    }

    // ليس موظف ولا مدير → تحقق من المستخدم العادي
    if (!user) {
      console.log('❌ [PermissionGuard] لا يوجد user ولا موظف');
      setHasPermission(false);
      setIsChecking(false);
      return;
    }

    // استخدام Hook الصلاحيات الموحد للمستخدم العادي
    const hasRequiredPermission = unifiedPerms.anyOf(requiredPermissions);

    console.log('🎯 [PermissionGuard] النتيجة النهائية:', {
      hasRequiredPermission,
      requiredPermissions,
      isOrgAdmin: unifiedPerms.isOrgAdmin,
      role: unifiedPerms.role,
    });

    setHasPermission(hasRequiredPermission);
    setIsChecking(false);

    if (!hasRequiredPermission) {
      console.log('❌ [PermissionGuard] لا يملك الصلاحيات - سيتم التوجيه إلى:', fallbackPath);
    }
  }, [user, userProfile, requiredPermissions, location.pathname, unifiedPerms]);

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
