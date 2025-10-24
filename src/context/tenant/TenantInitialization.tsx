/**
 * TenantInitialization - مكون منفصل لمنطق تهيئة TenantProvider
 * يحتوي على جميع منطق التهيئة والتحميل الأولي
 */

import { useEffect, useRef } from 'react';
import type { Organization } from '@/types/tenant';
import { updateOrganizationFromData } from '@/lib/processors/organizationProcessor';
import { getFastOrganizationId } from '@/utils/earlyPreload';
import { getPreloadedProductFromDOM } from '@/utils/productDomPreload';
import { globalCache, CacheKeys } from '@/lib/globalCache';
import type { TenantStateRefs } from './TenantState';
import { dispatchAppEvent } from '@/lib/events/eventManager';

interface TenantInitializationProps {
  organization: Organization | null;
  authOrganization: any;
  user: any;
  authLoading: boolean;
  currentSubdomain: string | null;
  setState: React.Dispatch<React.SetStateAction<any>>;
  refs: TenantStateRefs;
  checkCustomDomainOnStartup: () => Promise<void>;
  loadFallbackOrganization: () => Promise<void>;
  handleOrganizationChange: () => () => void;
  isOrgAdmin: boolean;
}

export function TenantInitialization({
  organization,
  authOrganization,
  user,
  authLoading,
  currentSubdomain,
  setState,
  refs,
  checkCustomDomainOnStartup,
  loadFallbackOrganization,
  handleOrganizationChange,
  isOrgAdmin
}: TenantInitializationProps) {
  // مراجع للتحكم في التهيئة
  const isInitialized = useRef(false);
  const lastAuthOrgId = useRef<string | null>(null);
  const lastOrgId = useRef<string | null>(null);
  const initializationCount = useRef(0);
  const renderCount = useRef(0);
  const hasRendered = useRef(false);
  const tenantStartTime = useRef(performance.now());

  // 🔥 تحسين: منع زيادة renderCount في كل render
  if (!hasRendered.current) {
    renderCount.current++;
    hasRendered.current = true;
  }

  // إعادة تعيين العلامات العالمية للحماية من التعليق
  useEffect(() => {
    if (window.bazaarTenantLoading) {
      window.bazaarTenantLoading = false;
    }
  }, []);

  // ✅ تبسيط: تهيئة مبسطة وسريعة
  useEffect(() => {
    // فحص بسيط - إذا تم التهيئة، توقف
    if (isInitialized.current || organization) {
      return;
    }

    isInitialized.current = true;

    // ⚡ تحسين جديد: فحص Organization ID السريع مع البيانات الكاملة
    const fastOrgCheck = getFastOrganizationId();
    if (fastOrgCheck && !organization && !refs.initialized.current) {

      // ✅ محاولة الحصول على البيانات الكاملة من early preload مباشرة
      let preloadedData = null;
      try {
        // استخدام dynamic import بدون await في useEffect
        import('@/utils/earlyPreload').then((earlyPreloadModule) => {
          preloadedData = earlyPreloadModule.getEarlyPreloadedData();

          if (preloadedData?.organization_details || preloadedData?.organization) {
            // استخدام البيانات الكاملة المحملة مسبقاً
            const orgData = preloadedData.organization_details || preloadedData.organization;
            const quickOrg = {
              id: orgData.id || fastOrgCheck.organizationId,
              name: orgData.name || '',
              description: orgData.description || '',
              logo_url: orgData.logo_url || null,
              domain: orgData.domain || null,
              subdomain: orgData.subdomain || null,
              subscription_tier: orgData.subscription_tier || 'free',
              subscription_status: orgData.subscription_status || 'active',
              settings: orgData.settings || {},
              created_at: orgData.created_at || new Date().toISOString(),
              updated_at: orgData.updated_at || new Date().toISOString(),
              owner_id: orgData.owner_id || null
            };

            updateOrganization(setState, quickOrg);
            refs.initialized.current = true;
            isInitialized.current = true;

            // إرسال حدث فوري
            dispatchAppEvent('bazaar:tenant-context-ready', {
              organization: quickOrg,
              isEarlyDetection: true,
              loadTime: 0,
              timestamp: Date.now(),
              source: 'preloaded-data'
            }, {
              dedupeKey: `tenant-ready:${quickOrg.id ?? 'preloaded'}`
            });
          }
        }).catch((e) => {
          console.warn('⚠️ [TenantProvider] فشل في تحميل early preload:', e);
        });
      } catch (e) {
        console.warn('⚠️ [TenantProvider] خطأ في early preload:', e);
      }

      // إنشاء organization مبسط كـ fallback فوري
      const quickOrg = {
        id: fastOrgCheck.organizationId,
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
      dispatchAppEvent('bazaar:tenant-context-ready', {
        organization: quickOrg,
        isEarlyDetection: true,
        loadTime: 0,
        timestamp: Date.now(),
        source: 'fast-org-id'
      }, {
        dedupeKey: `tenant-ready:${quickOrg.id ?? 'fast'}`
      });
    }

    // ⚡ تنفيذ فوري للتهيئة الحرجة بدون requestIdleCallback
    const immediateStartTime = performance.now();
    if (!refs.customDomainProcessed.current && !organization) {

      checkCustomDomainOnStartup();
      const immediateTime = performance.now() - immediateStartTime;
    } else {

    }

    const initEffectTime = performance.now() - immediateStartTime;

    return () => {

    };
  }, []); // ✅ تشغيل مرة واحدة فقط عند التحميل

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

  // تحميل المؤسسة الاحتياطي - محسن لمنع الدورات اللانهائية
  useEffect(() => {
    // ✅ فحص مبكر أكثر صرامة
    if (refs.fallbackProcessed.current || refs.loadingOrganization.current ||
        refs.initialized.current || authOrganization) {
      return;
    }


    refs.fallbackProcessed.current = true; // ✅ تعيين العلامة مبكراً لمنع التكرار
    loadFallbackOrganization();
  }, []); // ✅ تشغيل مرة واحدة فقط

  // الاستماع إلى تغييرات المؤسسة - تشغيل مرة واحدة فقط
  useEffect(() => {
    return handleOrganizationChange();
  }, []); // ✅ تشغيل مرة واحدة فقط

  return null; // هذا مكون منطق فقط
}

// دوال مساعدة للتهيئة
export const updateOrganization = (
  setState: React.Dispatch<React.SetStateAction<any>>,
  organization: Organization | null
) => {
  setState(prev => ({ ...prev, organization, isLoading: false, error: null }));
};
