/**
 * نظام preload مبكر - نسخة مبسطة جداً لصفحة الهبوط
 * لا يحتوي على أي منطق متعلق بالمتجر
 */

export interface EarlyPreloadResult {
  success: boolean;
  error?: string;
  executionTime: number;
  domainType?: string;
}

export interface OrganizationIdResult {
  organizationId: string;
  source: string;
}

class EarlyPreloader {
  private static instance: EarlyPreloader;

  static getInstance(): EarlyPreloader {
    if (!EarlyPreloader.instance) {
      EarlyPreloader.instance = new EarlyPreloader();
    }
    return EarlyPreloader.instance;
  }

  /**
   * بدء preload مبكر - نسخة مبسطة جداً
   */
  async startEarlyPreload(): Promise<EarlyPreloadResult> {
    const startTime = performance.now();
    const executionTime = performance.now() - startTime;

    return {
      success: true,
      error: null,
      executionTime,
      domainType: 'localhost'
    };
  }

  /**
   * الحصول على البيانات المحفوظة مسبقاً
   */
  getPreloadedData(storeIdentifier?: string): any | null {
    return null;
  }

  /**
   * مسح البيانات المحفوظة مسبقاً
   */
  clearPreloadedData(): void {
    // لا يوجد شيء لمسحه
  }

  /**
   * الحصول على بيانات المنتج المحملة مسبقاً
   */
  getPreloadedProduct(productSlug?: string): any | null {
    return null;
  }

  /**
   * الحصول على معلومات النطاق
   */
  getDomainInfo(): { storeIdentifier: string | null; domainType: string | null } {
    return { storeIdentifier: null, domainType: 'localhost' };
  }
}

// تصدير instance واحد
export const earlyPreloader = EarlyPreloader.getInstance();

// دوال للتوافق مع الكود الموجود
export const startEarlyPreload = () => earlyPreloader.startEarlyPreload();
export const getEarlyPreloadedData = (storeIdentifier?: string) => earlyPreloader.getPreloadedData(storeIdentifier);
export const getEarlyPreloadDomainInfo = () => earlyPreloader.getDomainInfo();
export const getPreloadedProduct = (productSlug?: string) => earlyPreloader.getPreloadedProduct(productSlug);

/**
 * الحصول على Organization ID بسرعة - نسخة مبسطة
 */
export const getFastOrganizationId = (): OrganizationIdResult | null => {
  return null;
};
