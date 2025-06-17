import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { checkCallCenterPermissions } from '@/lib/api/permissions';
import { CallCenterPermissions } from '@/types';
import { Loader2, Lock } from 'lucide-react';

interface CallCenterPermissionGuardProps {
  children: React.ReactNode;
  permission: keyof CallCenterPermissions;
  fallback?: React.ReactNode;
  showLoader?: boolean;
  showError?: boolean;
}

/**
 * مكون حماية الصلاحيات لمركز الاتصال
 * يتحقق من صلاحية محددة قبل عرض المحتوى
 */
export const CallCenterPermissionGuard: React.FC<CallCenterPermissionGuardProps> = ({
  children,
  permission,
  fallback,
  showLoader = true,
  showError = true,
}) => {
  const { user, userProfile } = useAuth();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkPermission = async () => {
      if (!user || !userProfile) {
        setHasPermission(false);
        setIsLoading(false);
        return;
      }

      try {
        const result = await checkCallCenterPermissions(userProfile, permission);
        setHasPermission(result);
      } catch (error) {
        console.error('خطأ في التحقق من الصلاحيات:', error);
        setHasPermission(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkPermission();
  }, [user, userProfile, permission]);

  // إذا كان النظام يحمل البيانات
  if (isLoading && showLoader) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
        <span className="mr-2 text-sm text-gray-600">جاري التحقق من الصلاحيات...</span>
      </div>
    );
  }

  // إذا لم تكن لديه الصلاحية
  if (!hasPermission) {
    // إذا تم تمرير fallback مخصص
    if (fallback !== undefined) {
      return <>{fallback}</>;
    }

    // إذا كان showError = false، لا نعرض شيء
    if (!showError) {
      return null;
    }

    // عرض رسالة خطأ افتراضية
    return (
      <div className="flex items-center justify-center p-6 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-center">
          <div className="bg-red-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-sm font-medium text-gray-900 mb-1">
            غير مصرح لك بالوصول
          </h3>
          <p className="text-xs text-gray-600">
            ليس لديك الصلاحية المطلوبة لعرض هذا المحتوى
          </p>
        </div>
      </div>
    );
  }

  // إذا كان لديه الصلاحية، عرض المحتوى
  return <>{children}</>;
};

/**
 * Hook للتحقق من صلاحيات مركز الاتصال
 */
export const useCallCenterPermission = (permission: keyof CallCenterPermissions) => {
  const { user, userProfile } = useAuth();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkPermission = async () => {
      if (!user || !userProfile) {
        setHasPermission(false);
        setIsLoading(false);
        return;
      }

      try {
        const result = await checkCallCenterPermissions(userProfile, permission);
        setHasPermission(result);
      } catch (error) {
        console.error('خطأ في التحقق من الصلاحيات:', error);
        setHasPermission(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkPermission();
  }, [user, userProfile, permission]);

  return { hasPermission, isLoading };
};

/**
 * Hook للتحقق من عدة صلاحيات مركز اتصال
 */
export const useCallCenterPermissions = (permissions: (keyof CallCenterPermissions)[]) => {
  const { user, userProfile } = useAuth();
  const [permissionsMap, setPermissionsMap] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkPermissions = async () => {
      if (!user || !userProfile) {
        const emptyMap = permissions.reduce((acc, perm) => {
          acc[perm] = false;
          return acc;
        }, {} as Record<string, boolean>);
        setPermissionsMap(emptyMap);
        setIsLoading(false);
        return;
      }

      try {
        const results = await Promise.all(
          permissions.map(async (permission) => {
            const hasPermission = await checkCallCenterPermissions(userProfile, permission);
            return { permission, hasPermission };
          })
        );

        const newPermissionsMap = results.reduce((acc, { permission, hasPermission }) => {
          acc[permission] = hasPermission;
          return acc;
        }, {} as Record<string, boolean>);

        setPermissionsMap(newPermissionsMap);
      } catch (error) {
        console.error('خطأ في التحقق من الصلاحيات:', error);
        const errorMap = permissions.reduce((acc, perm) => {
          acc[perm] = false;
          return acc;
        }, {} as Record<string, boolean>);
        setPermissionsMap(errorMap);
      } finally {
        setIsLoading(false);
      }
    };

    checkPermissions();
  }, [user, userProfile, permissions]);

  return { permissions: permissionsMap, isLoading };
};

export default CallCenterPermissionGuard; 