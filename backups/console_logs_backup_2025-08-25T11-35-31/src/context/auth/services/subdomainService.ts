/**
 * خدمة إدارة النطاقات الفرعية
 * منفصل من AuthContext لتحسين الأداء
 */

import { extractSubdomain, getDefaultOrganizationId } from '../utils/authHelpers';

/**
 * فئة خدمة النطاقات الفرعية
 */
export class SubdomainService {
  private currentSubdomain: string | null = null;
  private isInitialized = false;

  /**
   * تهيئة الخدمة - محسن لتجنب التكرار
   */
  initialize(): string | null {
    if (this.isInitialized) {
      return this.currentSubdomain;
    }

    try {
      this.currentSubdomain = extractSubdomain(window.location.hostname);
      this.isInitialized = true;

      // ⚡ تقليل الـ logging في التطوير لتحسين الأداء
      if (process.env.NODE_ENV === 'development' && !window.subdomainServiceLogged) {
        console.log('🌐 [SubdomainService] تم تهيئة الخدمة:', {
          hostname: window.location.hostname,
          subdomain: this.currentSubdomain
        });
        // منع تكرار الـ log
        window.subdomainServiceLogged = true;
      }

      return this.currentSubdomain;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ [SubdomainService] خطأ في التهيئة:', error);
      }
      return null;
    }
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
  isMainDomain(): boolean {
    const subdomain = this.getCurrentSubdomain();
    return !subdomain || subdomain === 'main' || subdomain === 'www';
  }

  /**
   * الحصول على معرف المؤسسة المناسب للنطاق
   */
  getOrganizationIdForDomain(): string | null {
    const subdomain = this.getCurrentSubdomain();
    
    // إذا كان النطاق الرئيسي، استخدم المعرف الافتراضي
    if (this.isMainDomain()) {
      return getDefaultOrganizationId();
    }

    // إذا كان نطاق فرعي، جرب الحصول على المعرف من التخزين المحلي
    try {
      const storedOrgId = localStorage.getItem('bazaar_organization_id');
      if (storedOrgId) {
        return storedOrgId;
      }
    } catch (error) {
      // تجاهل أخطاء localStorage
    }

    return null;
  }

  /**
   * تحديث النطاق الفرعي (للاستخدام عند التنقل)
   */
  updateSubdomain(newHostname?: string): string | null {
    const hostname = newHostname || window.location.hostname;
    const newSubdomain = extractSubdomain(hostname);
    
    if (newSubdomain !== this.currentSubdomain) {
      const oldSubdomain = this.currentSubdomain;
      this.currentSubdomain = newSubdomain;

      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 [SubdomainService] تحديث النطاق الفرعي:', {
          من: oldSubdomain,
          إلى: newSubdomain
        });
      }

      // إرسال حدث تغيير النطاق الفرعي
      this.dispatchSubdomainChangeEvent(oldSubdomain, newSubdomain);
    }

    return this.currentSubdomain;
  }

  /**
   * إرسال حدث تغيير النطاق الفرعي
   */
  private dispatchSubdomainChangeEvent(oldSubdomain: string | null, newSubdomain: string | null): void {
    try {
      const event = new CustomEvent('subdomainChanged', {
        detail: {
          oldSubdomain,
          newSubdomain,
          timestamp: Date.now()
        }
      });

      window.dispatchEvent(event);

      if (process.env.NODE_ENV === 'development') {
        console.log('📡 [SubdomainService] تم إرسال حدث تغيير النطاق الفرعي');
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ [SubdomainService] خطأ في إرسال الحدث:', error);
      }
    }
  }

  /**
   * التحقق من صحة النطاق الفرعي
   */
  isValidSubdomain(subdomain: string): boolean {
    if (!subdomain || typeof subdomain !== 'string') {
      return false;
    }

    // النطاق الفرعي يجب أن يكون أطول من حرف واحد
    if (subdomain.length < 2) {
      return false;
    }

    // فحص الأحرف المسموحة (أحرف، أرقام، وخط)
    const validPattern = /^[a-zA-Z0-9-]+$/;
    if (!validPattern.test(subdomain)) {
      return false;
    }

    // لا يجب أن يبدأ أو ينتهي بخط
    if (subdomain.startsWith('-') || subdomain.endsWith('-')) {
      return false;
    }

    return true;
  }

  /**
   * تطبيع النطاق الفرعي
   */
  normalizeSubdomain(subdomain: string): string {
    return subdomain.toLowerCase().trim();
  }

  /**
   * إنشاء URL كامل من النطاق الفرعي
   */
  buildSubdomainUrl(subdomain: string, baseUrl: string = 'ktobi.online'): string {
    const normalizedSubdomain = this.normalizeSubdomain(subdomain);
    
    if (normalizedSubdomain === 'main' || normalizedSubdomain === 'www') {
      return `https://${baseUrl}`;
    }
    
    return `https://${normalizedSubdomain}.${baseUrl}`;
  }

  /**
   * الحصول على معلومات النطاق الحالي
   */
  getDomainInfo() {
    return {
      hostname: window.location.hostname,
      subdomain: this.currentSubdomain,
      isMainDomain: this.isMainDomain(),
      isValidSubdomain: this.currentSubdomain ? this.isValidSubdomain(this.currentSubdomain) : true,
      organizationId: this.getOrganizationIdForDomain(),
      isInitialized: this.isInitialized
    };
  }

  /**
   * إعادة تعيين الحالة
   */
  reset(): void {
    this.currentSubdomain = null;
    this.isInitialized = false;

    try {
      sessionStorage.removeItem('bazaar_current_subdomain');
    } catch (error) {
      // تجاهل أخطاء sessionStorage
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 [SubdomainService] تم إعادة تعيين الحالة');
    }
  }
}

// إنشاء instance مشترك
export const subdomainService = new SubdomainService();
