// ===========================================
// نظام إدارة المؤسسات
// ===========================================

import { performanceTracker } from './PerformanceTracker';

/**
 * نظام إدارة المؤسسات المحسن
 * - يستخرج معرف المؤسسة من مصادر متعددة
 * - يدير التخزين المؤقت والأحداث
 * - يتعامل مع أنواع النطاقات المختلفة
 */
export class OrganizationManager {
  /**
   * استخراج معرف المؤسسة من النطاق
   */
  async extractFromDomain(): Promise<string | null> {
    try {
      // محاولة فورية من window object
      const win: any = window as any;
      const early = win.__EARLY_STORE_DATA__?.data || win.__EARLY_STORE_DATA__ || win.__PREFETCHED_STORE_DATA__;
      const shared = win.__SHARED_STORE_DATA__;
      const fromWin = early?.organization_details?.id || early?.organization?.id || shared?.organization?.id;

      if (fromWin) {
        performanceTracker.log('تم العثور على معرف المؤسسة من window object', { id: fromWin });
        return String(fromWin);
      }

      const hostname = window.location.hostname;
      const baseDomains = ['.ktobi.online', '.stockiha.com', '.bazaar.dev', '.vercel.app', '.bazaar.com'];
      const isBaseDomain = baseDomains.some((d) => hostname.endsWith(d));
      const isLocalhost = hostname.includes('localhost') || hostname.startsWith('127.');
      const isCustomDomain = !isLocalhost && !isBaseDomain;

      // إذا كان localhost، استخرج subdomain
      if (isLocalhost && hostname.includes('localhost')) {
        const subdomain = hostname.split('.')[0];
        if (subdomain && subdomain !== 'localhost') {
          const cachedOrg = localStorage.getItem(`early_preload_${subdomain}`);
          if (cachedOrg) {
            const parsed = JSON.parse(cachedOrg);
            if (parsed.data?.organization?.id) {
              performanceTracker.log('تم العثور على معرف المؤسسة من localhost cache', { subdomain, id: parsed.data.organization.id });
              return parsed.data.organization.id;
            }
          }
        }
      }

      // للنطاقات المخصصة
      if (isCustomDomain) {
        const domainParts = hostname.split('.');
        if (domainParts.length > 2 && domainParts[0] && domainParts[0] !== 'www') {
          const possibleSubdomain = domainParts[0].toLowerCase().trim();

          // البحث باستخدام subdomain
          const cachedOrg = localStorage.getItem(`early_preload_${possibleSubdomain}`);
          if (cachedOrg) {
            const parsed = JSON.parse(cachedOrg);
            if (parsed.data?.organization?.id) {
              performanceTracker.log('تم العثور على معرف المؤسسة من custom domain subdomain', { subdomain: possibleSubdomain, id: parsed.data.organization.id });
              return parsed.data.organization.id;
            }
          }

          // البحث بالنطاق كاملاً
          const cachedOrgFull = localStorage.getItem(`early_preload_${hostname}`);
          if (cachedOrgFull) {
            const parsed = JSON.parse(cachedOrgFull);
            if (parsed.data?.organization?.id) {
              performanceTracker.log('تم العثور على معرف المؤسسة من custom domain full', { hostname, id: parsed.data.organization.id });
              return parsed.data.organization.id;
            }
          }
        }
      }

      // البحث في localStorage العام
      const orgId = localStorage.getItem('bazaar_organization_id');
      if (orgId && orgId.length > 10) {
        performanceTracker.log('تم العثور على معرف المؤسسة من general localStorage', { id: orgId });
        return orgId;
      }

      performanceTracker.log('لم يتم العثور على معرف المؤسسة');
      return null;
    } catch (error) {
      performanceTracker.log('خطأ في استخراج معرف المؤسسة', { error });
      return null;
    }
  }

  /**
   * الحصول على معرف المؤسسة الحالي
   */
  async getCurrentId(): Promise<string | null> {
    return await this.extractFromDomain();
  }
}

// إنشاء نسخة عالمية
export const organizationManager = new OrganizationManager();
