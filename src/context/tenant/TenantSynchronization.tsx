/**
 * TenantSynchronization - مكون منفصل للمزامنة في TenantProvider
 * يحتوي على منطق المزامنة مع السياقات الأخرى
 */

import { useEffect, useRef } from 'react';
import type { Organization } from '@/types/tenant';
import { updateOrganizationFromData } from '@/lib/processors/organizationProcessor';
import { globalCache, CacheKeys } from '@/lib/globalCache';
import type { TenantStateRefs } from './TenantState';
import { updateOrganization } from './TenantState';
import { dispatchAppEvent } from '@/lib/events/eventManager';

interface TenantSynchronizationProps {
  organization: Organization | null;
  authOrganization: any;
  user: any;
  authLoading: boolean;
  currentSubdomain: string | null;
  setState: React.Dispatch<React.SetStateAction<any>>;
  refs: TenantStateRefs;
}

export function TenantSynchronization({
  organization,
  authOrganization,
  user,
  authLoading,
  currentSubdomain,
  setState,
  refs
}: TenantSynchronizationProps) {
  // مراجع للتحكم في المزامنة
  const lastAuthOrgId = useRef<string | null>(null);
  const lastOrgId = useRef<string | null>(null);
  const isInitialized = useRef(false);

  // مزامنة مع AuthContext - محسنة لمنع الدورات اللانهائية
  useEffect(() => {
    // ✅ فحص مبكر لمنع التشغيل غير الضروري
    if (!authOrganization || refs.authContextProcessed.current) {
      return;
    }

    // ✅ منع معالجة نفس المؤسسة مرتين
    if (lastAuthOrgId.current === authOrganization.id) {

      return;
    }

    const authSyncStartTime = performance.now();



    // تحديث المؤسسة مباشرة مع حفظ في global cache
    const processedOrg = updateOrganizationFromData(authOrganization);
    const updateStartTime = performance.now();
    updateOrganization(setState, processedOrg);
    const updateTime = performance.now() - updateStartTime;


    // حفظ في global cache لتجنب الاستدعاءات المتكررة
    globalCache.set(CacheKeys.ORGANIZATION(authOrganization.id), authOrganization);

    lastAuthOrgId.current = authOrganization.id;
    lastOrgId.current = authOrganization.id;
    refs.authContextProcessed.current = true;
    refs.initialized.current = true;
    isInitialized.current = true;
    // تحديث window object للاستخدام من قبل دوال أخرى
    (window as any).__TENANT_CONTEXT_ORG__ = authOrganization;


    // إرسال حدث تأكيد
    dispatchAppEvent('bazaar:tenant-context-ready', {
      organization: authOrganization,
      isEarlyDetection: false,
      loadTime: Date.now() - refs.startTime.current,
      timestamp: Date.now(),
      source: 'auth-sync'
    }, {
      dedupeKey: `tenant-ready:${authOrganization.id}`
    });

    const authSyncTime = performance.now() - authSyncStartTime;

  }, [authOrganization?.id]); // ✅ تحسين التبعيات لمنع إعادة التشغيل المتكررة

  // مراقبة حالة تسجيل الدخول الأول - لضمان التهيئة الصحيحة
  useEffect(() => {
    // إذا كان المستخدم موجود ولم يتم التهيئة بعد، ابدأ عملية التهيئة
    if (user && !authLoading && !refs.initialized.current && !refs.authContextProcessed.current) {
      if (process.env.NODE_ENV === 'development') {
      }

      // إذا كانت المؤسسة متاحة، قم بتحديثها فوراً
      if (authOrganization) {
        if (process.env.NODE_ENV === 'development') {
        }

        const processedOrg = updateOrganizationFromData(authOrganization);
        updateOrganization(setState, processedOrg);
        lastAuthOrgId.current = authOrganization.id;
        lastOrgId.current = authOrganization.id;
        refs.authContextProcessed.current = true;
        refs.initialized.current = true;
        isInitialized.current = true;
        // تحديث window object للاستخدام من قبل دوال أخرى
        (window as any).__TENANT_CONTEXT_ORG__ = authOrganization;

        // إرسال حدث تأكيد
        dispatchAppEvent('bazaar:tenant-context-ready', {
          organization: authOrganization,
          isEarlyDetection: false,
          loadTime: Date.now() - refs.startTime.current,
          timestamp: Date.now(),
          source: 'initial-login-sync'
        }, {
          dedupeKey: `tenant-ready:${authOrganization.id}`
        });
      }
    }
  }, [user?.id, authOrganization?.id]); // ✅ تحسين التبعيات

  return null; // هذا مكون منطق فقط
}
