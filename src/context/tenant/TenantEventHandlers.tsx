/**
 * TenantEventHandlers - مكون منفصل لمعالجة الأحداث في TenantProvider
 * يحتوي على جميع معالجات الأحداث والمستمعات
 */

import { useEffect, useRef } from 'react';
import type { Organization } from '@/types/tenant';
import { updateOrganizationFromData } from '@/lib/processors/organizationProcessor';
import type { TenantStateRefs } from './TenantState';

interface TenantEventHandlersProps {
  organization: Organization | null;
  setState: React.Dispatch<React.SetStateAction<any>>;
  refs: TenantStateRefs;
}

export function TenantEventHandlers({
  organization,
  setState,
  refs
}: TenantEventHandlersProps) {
  // مراجع للتحكم في معالجة الأحداث
  const isInitialized = useRef(false);
  const lastAuthOrgId = useRef<string | null>(null);
  const lastOrgId = useRef<string | null>(null);

  // 🔥 تحسين: منع إعداد المستمعين المتكررين
  useEffect(() => {
    if (isInitialized.current || refs.initialized.current) {
      return;
    }

    if (process.env.NODE_ENV === 'development') {
    }

    const handleAuthOrganizationReady = (event: CustomEvent) => {
      const { organization: authOrg } = event.detail;

      // 🔥 تحسين: منع معالجة نفس المؤسسة مرتين - تحسين لتسجيل الدخول الأول
      if (lastAuthOrgId.current === authOrg?.id && refs.initialized.current) {
        if (process.env.NODE_ENV === 'development') {
        }
        return;
      }

      if (process.env.NODE_ENV === 'development') {
      }

      if (authOrg && lastOrgId.current !== authOrg.id) {
        if (process.env.NODE_ENV === 'development') {
        }
        lastAuthOrgId.current = authOrg.id;
        lastOrgId.current = authOrg.id;
        // تحويل نوع المؤسسة إذا لزم الأمر
        const processedOrg = updateOrganizationFromData(authOrg);
        updateOrganization(setState, processedOrg);
        refs.authContextProcessed.current = true;
        refs.initialized.current = true;
        isInitialized.current = true;
        // تحديث window object للاستخدام من قبل دوال أخرى
        (window as any).__TENANT_CONTEXT_ORG__ = authOrg;

        // ⚡ تحسين: إرسال حدث تأكيد عند تحديث المؤسسة
        window.dispatchEvent(new CustomEvent('bazaar:tenant-context-ready', {
          detail: {
            organization: authOrg,
            isEarlyDetection: false,
            loadTime: Date.now() - refs.startTime.current,
            timestamp: Date.now(),
            source: 'event-handler'
          }
        }));
      } else {
        if (process.env.NODE_ENV === 'development') {
        }
      }
    };

    // ✅ إضافة مُستمع للـ Organization ID السريع
    const handleFastOrganizationIdReady = (event: CustomEvent) => {
      const { organizationId, storeIdentifier, source } = event.detail;


      if (organizationId && !organization && !refs.initialized.current) {
        // إنشاء organization مبسط للاستخدام الفوري
        const quickOrg = {
          id: organizationId,
          name: '', // سيتم تحديثه لاحقاً عند توفر الاسم الحقيقي
          description: '',
          logo_url: null,
          domain: null,
          subdomain: null,
          subscription_tier: 'free',
          subscription_status: 'active',
          settings: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          owner_id: null
        };

        updateOrganization(setState, quickOrg);
        refs.initialized.current = true;
        isInitialized.current = true;

        // إرسال حدث فوري
        window.dispatchEvent(new CustomEvent('bazaar:tenant-context-ready', {
          detail: {
            organization: quickOrg,
            isEarlyDetection: true,
            loadTime: 0,
            timestamp: Date.now(),
            source: 'fast-org-id-event'
          }
        }));
      }
    };

    window.addEventListener('authOrganizationReady', handleAuthOrganizationReady as EventListener);
    window.addEventListener('fastOrganizationIdReady', handleFastOrganizationIdReady as EventListener);

    return () => {
      window.removeEventListener('authOrganizationReady', handleAuthOrganizationReady as EventListener);
      window.removeEventListener('fastOrganizationIdReady', handleFastOrganizationIdReady as EventListener);
    };
  }, []); // ✅ تشغيل مرة واحدة فقط لإعداد المستمعين

  return null; // هذا مكون منطق فقط
}

// دوال مساعدة لمعالجة الأحداث
export const updateOrganization = (
  setState: React.Dispatch<React.SetStateAction<any>>,
  organization: Organization | null
) => {
  setState(prev => ({ ...prev, organization, isLoading: false, error: null }));
};
