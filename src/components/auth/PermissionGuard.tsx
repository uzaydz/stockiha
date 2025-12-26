import React, { useState, useEffect, useMemo, useRef } from 'react';
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

// ⚡ v4.0: Module-level deduplication للتحكم الشامل عبر جميع instances
const _loggedResults = new Set<string>();

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

  // ⚡ v4.0: منع التكرار على مستوى الـ instance
  const lastCheckRef = useRef<string>('');

  // ⚡ استخدام useMemo لتقليل الحسابات المتكررة
  const permissionResult = useMemo(() => {
    // ✅ إذا كان في وضع المدير → صلاحيات كاملة
    if (unifiedPerms.isAdminMode) {
      return { hasPermission: true, reason: 'admin' };
    }

    // ✅ إذا كان موظف مسجل → تحقق من صلاحياته
    if (unifiedPerms.isStaffMode) {
      return {
        hasPermission: unifiedPerms.anyOf(requiredPermissions),
        reason: 'staff'
      };
    }

    // إذا لم يكن النظام جاهزاً بعد
    if (!unifiedPerms.ready) {
      return { hasPermission: null, reason: 'loading' };
    }

    // ليس موظف ولا مدير → تحقق من المستخدم العادي
    if (!user) {
      return { hasPermission: false, reason: 'no-user' };
    }

    // استخدام Hook الصلاحيات الموحد للمستخدم العادي
    return {
      hasPermission: unifiedPerms.anyOf(requiredPermissions),
      reason: 'user'
    };
  }, [
    unifiedPerms.isAdminMode,
    unifiedPerms.isStaffMode,
    unifiedPerms.ready,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(requiredPermissions), // استقرار أفضل
    user?.id
  ]);

  useEffect(() => {
    // ⚡ تجنب التكرار: إنشاء مفتاح فريد للفحص
    const checkKey = `${permissionResult.reason}:${permissionResult.hasPermission}:${location.pathname}`;

    // إذا كان نفس الفحص السابق، تخطى
    if (lastCheckRef.current === checkKey) {
      return;
    }
    lastCheckRef.current = checkKey;

    // ⚡ v4.0: تسجيل فقط عند تغيير النتيجة الفعلية (global across all instances)
    const logKey = `${permissionResult.reason}:${permissionResult.hasPermission}:${unifiedPerms.displayName}`;
    if (!_loggedResults.has(logKey) && process.env.NODE_ENV === 'development') {
      _loggedResults.add(logKey);

      // مسح السجلات القديمة بعد 10 ثوانٍ للسماح بإعادة التسجيل عند تغيير الحالة الفعلية
      setTimeout(() => _loggedResults.delete(logKey), 10000);

      console.log('🔐 [PermissionGuard] بدء التحقق من الصلاحيات:', {
        requiredPermissions,
        hasUser: !!user,
        isAdminMode: unifiedPerms.isAdminMode,
        isStaffMode: unifiedPerms.isStaffMode,
        displayName: unifiedPerms.displayName,
        permsReady: unifiedPerms.ready,
      });

      if (permissionResult.reason === 'admin') {
        console.log('✅ [PermissionGuard] وضع المدير - صلاحيات كاملة');
      } else if (permissionResult.reason === 'staff') {
        console.log('👤 [PermissionGuard] وضع الموظف:', {
          hasRequiredPermission: permissionResult.hasPermission,
          requiredPermissions,
        });
      }
    }

    // تحديث الحالة
    if (permissionResult.hasPermission === null) {
      // لا تزال جارية التحميل
      return;
    }

    setHasPermission(permissionResult.hasPermission);
    setIsChecking(false);
  }, [permissionResult, location.pathname]);

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
