/**
 * PublicTenantProvider — مزود خفيف للصفحات العامة للمنتج (بدون Auth/User/Permissions)
 * يقرأ بيانات المؤسسة من JSON المحقون في DOM عبر العامل أو من المنتج المحمّل
 */

import React from 'react';
import { getFastOrganizationId } from '@/utils/earlyPreload';
import { getPreloadedProductFromDOM } from '@/utils/productDomPreload';
import type { TenantContextType } from '@/types/tenant';

// استيراد TenantContext من TenantProvider
import { TenantContext } from './TenantProvider';

export const PublicTenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // اشتقاق مؤسسة عامة من JSON المحقون أو من النطاق الفرعي
  let org: any = null;

  try {
    // 1) محاولة الحصول على البيانات من DOM preload أولاً
    const dom = getPreloadedProductFromDOM();
    const data = dom?.data;
    const product = data?.product;
    org = product?.organization || null;

    if (org && typeof org === 'object') {
      // تأكد من وجود الحقول الأساسية وفق نوع Organization
      org = {
        id: org.id || product?.organization_id || dom?.organization_id || null,
        name: org.name || '',
        description: org.description || '',
        logo_url: org.logo_url || org.logo || null,
        domain: org.domain || null,
        subdomain: org.subdomain || null,
        subscription_tier: org.subscription_tier || 'free',
        subscription_status: org.subscription_status || 'active',
        settings: org.settings || {},
        created_at: org.created_at || new Date().toISOString(),
        updated_at: org.updated_at || new Date().toISOString(),
        owner_id: org.owner_id || null
      };
    } else if (product?.organization_id || dom?.organization_id) {
      // إنشاء كائن مبسط للمؤسسة من organization_id فقط
      const orgId = product?.organization_id || dom?.organization_id;
      org = {
        id: orgId,
        name: '',
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
    }

    // 2) 🔥 إصلاح: إذا لم نحصل على organization، ابحث في مصادر أخرى
    if (!org) {
      // البحث في window object
      const win: any = typeof window !== 'undefined' ? window : {};
      const earlyData = win.__EARLY_STORE_DATA__?.data || win.__CURRENT_STORE_DATA__ || win.__PREFETCHED_STORE_DATA__;

      if (earlyData?.organization_details || earlyData?.organization) {
        const orgData = earlyData.organization_details || earlyData.organization;
        org = {
          id: orgData.id || null,
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
      }

      // 3) البحث في localStorage كـ fallback أخير
      if (!org) {
        const fastOrgId = getFastOrganizationId();
        if (fastOrgId?.organizationId) {
          // الحصول على subdomain من hostname
          const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
          const subdomain = hostname.includes('.stockiha.com') ? hostname.split('.')[0] : null;

          org = {
            id: fastOrgId.organizationId,
            name: '',
            description: '',
            logo_url: null,
            domain: null,
            subdomain: subdomain,
            subscription_tier: 'free',
            subscription_status: 'active',
            settings: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            owner_id: null
          };
        }
      }
    }
  } catch (error) {
    console.warn('⚠️ [PublicTenantProvider] خطأ في الحصول على بيانات المؤسسة:', error);
  }

  const hasValidOrgId = !!(org?.id && org.id.length > 10);

  const value: TenantContextType = {
    currentOrganization: org,
    tenant: org,
    organization: org,
    isOrgAdmin: false,
    isLoading: false,
    error: null,
    // ✅ إضافة: للتحقق من جاهزية organization ID
    isOrganizationReady: hasValidOrgId,
    isReady: hasValidOrgId,
    createOrganization: async () => ({ success: false, error: new Error('Not available in public mode') }),
    inviteUserToOrganization: async () => ({ success: false, error: new Error('Not available in public mode') }),
    refreshOrganizationData: async () => {},
    refreshTenant: async () => {}
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};

PublicTenantProvider.displayName = 'PublicTenantProvider';
