import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';

interface UseOrganizationSyncReturn {
  isSyncing: boolean;
  syncError: string | null;
  triggerSync: () => void;
}

export const useOrganizationSync = (): UseOrganizationSyncReturn => {
  const { userProfile } = useAuth();
  const { currentOrganization } = useTenant();
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [syncError, setSyncError] = React.useState<string | null>(null);

  const triggerSync = React.useCallback(() => {
    if (!userProfile?.organization_id) {
      setSyncError('لا يوجد معرف مؤسسة');
      return;
    }

    if (currentOrganization) {
      // المؤسسة موجودة بالفعل
      return;
    }

    setIsSyncing(true);
    setSyncError(null);

    // إرسال حدث للتحقق من المؤسسة
    window.dispatchEvent(new CustomEvent('checkAuthOrganization'));

    // إعادة تعيين الحالة بعد فترة قصيرة
    setTimeout(() => {
      setIsSyncing(false);
    }, 1000);
  }, [userProfile?.organization_id, currentOrganization]);

  // مراقبة التغييرات في المؤسسة
  React.useEffect(() => {
    if (currentOrganization) {
      setIsSyncing(false);
      setSyncError(null);
    }
  }, [currentOrganization]);

  // مراقبة الأخطاء في السياق
  React.useEffect(() => {
    const handleAuthError = (event: CustomEvent) => {
      setSyncError(event.detail?.message || 'خطأ في مزامنة المؤسسة');
      setIsSyncing(false);
    };

    window.addEventListener('authOrganizationError', handleAuthError as EventListener);

    return () => {
      window.removeEventListener('authOrganizationError', handleAuthError as EventListener);
    };
  }, []);

  // تشغيل المزامنة عند تغيير معرف المؤسسة
  React.useEffect(() => {
    if (userProfile?.organization_id && !currentOrganization && !isSyncing) {
      const timer = setTimeout(() => {
        triggerSync();
      }, 500); // تأخير قصير بدلاً من 2000ms

      return () => clearTimeout(timer);
    }
  }, [userProfile?.organization_id, currentOrganization, isSyncing, triggerSync]);

  return {
    isSyncing,
    syncError,
    triggerSync
  };
};
