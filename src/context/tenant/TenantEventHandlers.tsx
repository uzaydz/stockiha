/**
 * TenantEventHandlers - مكون منفصل لمعالجة الأحداث في TenantProvider
 * يحتوي على جميع معالجات الأحداث والمستمعات
 */

import { useEffect, useRef } from 'react';
import type { Organization } from '@/types/tenant';
import { updateOrganizationFromData } from '@/lib/processors/organizationProcessor';
import type { TenantStateRefs } from './TenantState';
import { updateOrganization } from './TenantState';
import { addAppEventListener, dispatchAppEvent } from '@/lib/events/eventManager';
import { dbInitManager } from '@/lib/db/DatabaseInitializationManager';

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
        // ⚡ PowerSync يتعامل مع المزامنة تلقائياً
        try {
            void dbInitManager.initialize(authOrg.id);
          } catch (e) {
          // تجاهل الأخطاء - التهيئة قد تكون قيد التنفيذ بالفعل
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
        dispatchAppEvent('bazaar:tenant-context-ready', {
          organization: authOrg,
          isEarlyDetection: false,
          loadTime: Date.now() - refs.startTime.current,
          timestamp: Date.now(),
          source: 'event-handler'
        }, {
          dedupeKey: `tenant-ready:${authOrg.id}`
        });
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

        // ⚡ PowerSync يتعامل مع المزامنة تلقائياً
        // if (isSQLiteAvailable()) {
        //   try {
        //     sqliteWriteQueue.setOrganizationId(organizationId);
        //     void dbInitManager.initialize(organizationId);
        //   } catch (e) {
        if (true) { // ⚡ PowerSync stub
          try {
            // sqliteWriteQueue.setOrganizationId(organizationId);
            void dbInitManager.initialize(organizationId);
          } catch (e) {
          }
        }

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

    const unsubscribeAuthReady = addAppEventListener<{ organization: Organization }>(
      'authOrganizationReady',
      (detail) => handleAuthOrganizationReady({ detail } as CustomEvent)
    );
    const unsubscribeFastOrg = addAppEventListener<{
      organizationId: string;
      storeIdentifier?: string;
      source?: string;
    }>(
      'fastOrganizationIdReady',
      (detail) => handleFastOrganizationIdReady({ detail } as CustomEvent)
    );

    return () => {
      unsubscribeAuthReady();
      unsubscribeFastOrg();
    };
  }, []); // ✅ تشغيل مرة واحدة فقط لإعداد المستمعين

  return null; // هذا مكون منطق فقط
}
