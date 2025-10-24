/**
 * خدمة إدارة النطاقات الفرعية
 * منفصل من AuthContext لتحسين الأداء
 */

import { extractSubdomain, getDefaultOrganizationId } from '../utils/authHelpers';

/**
 * فئة خدمة النطاقات الفرعية
 */
export class SubdomainService {
  // Admin-only project: disable subdomain logic
  private currentSubdomain: string | null = null;
  private isInitialized = true;

  initialize(): string | null {
    this.currentSubdomain = null;
    return null;
  }

  /**
   * الحصول على النطاق الفرعي الحالي
   */
  getCurrentSubdomain(): string | null {
    if (!this.isInitialized) {
      return this.initialize();
    }
    return this.currentSubdomain;
  }

  /**
   * التحقق من النطاق الرئيسي
   */
  isMainDomain(): boolean { return true; }

  /**
   * الحصول على معرف المؤسسة المناسب للنطاق
   */
  getOrganizationIdForDomain(): string | null { return getDefaultOrganizationId(); }

  /**
   * تحديث النطاق الفرعي (للاستخدام عند التنقل)
   */
  updateSubdomain(): string | null { this.currentSubdomain = null; return null; }

  /**
   * إرسال حدث تغيير النطاق الفرعي
   */
  private dispatchSubdomainChangeEvent(): void { /* no-op */ }

  /**
   * التحقق من صحة النطاق الفرعي
   */
  isValidSubdomain(): boolean { return true; }

  /**
   * تطبيع النطاق الفرعي
   */
  normalizeSubdomain(subdomain: string): string { return subdomain; }

  /**
   * إنشاء URL كامل من النطاق الفرعي
   */
  buildSubdomainUrl(): string { return window.location.origin; }

  /**
   * الحصول على معلومات النطاق الحالي
   */
  getDomainInfo() { return { hostname: window.location.hostname, subdomain: null, isMainDomain: true, isValidSubdomain: true, organizationId: getDefaultOrganizationId(), isInitialized: true }; }

  /**
   * إعادة تعيين الحالة
   */
  reset(): void { this.currentSubdomain = null; this.isInitialized = true; try { sessionStorage.removeItem('bazaar_current_subdomain'); } catch {} }
}

// إنشاء instance مشترك
export const subdomainService = new SubdomainService();
