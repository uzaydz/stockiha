// ===========================================
// نظام إدارة صفحات المنتج
// ===========================================

import { performanceTracker } from './PerformanceTracker';

/**
 * نظام إدارة صفحات المنتج المحسن
 * - يكشف نوع الصفحة الحالية
 * - يستخرج معرفات المنتجات والمؤسسات
 * - يدير preload المنتجات
 */
export class ProductPageManager {
  /**
   * كشف ما إذا كانت الصفحة الحالية صفحة منتج
   */
  isProductPage(): boolean {
    if (typeof window === 'undefined') return false;

    const pathname = window.location.pathname;
    const productPatterns = [
      '/product-purchase-max-v2/',
      '/product-purchase/',
      '/product/'
    ];

    return productPatterns.some(pattern => pathname.includes(pattern));
  }

  /**
   * استخراج معرف المنتج من المسار الحالي
   */
  extractProductId(): string | null {
    if (typeof window === 'undefined') return null;

    const pathname = window.location.pathname;
    const productMatch = pathname.match(/\/(?:product-purchase-max-v2|product-purchase|product)\/([^\/]+)/);
    return productMatch ? productMatch[1] : null;
  }

  /**
   * بدء preload صفحة المنتج إذا لزم الأمر
   */
  async preloadIfNeeded(): Promise<void> {
    if (!this.isProductPage() || !ENABLE_PRODUCT_PRELOADER) return;

    const productId = this.extractProductId();
    if (!productId) return;

    // انتظار توفر organizationId عبر الأحداث
    const handleDataReady = (event: any) => {
      const organizationId = event.detail?.organizationId;
      if (organizationId) {
        this.startProductPreload(productId, organizationId);
        // إزالة المستمع بعد الاستخدام الأول
        window.removeEventListener('organizationDataSaved', handleDataReady);
        window.removeEventListener('domain-detected', handleDataReady);
      }
    };

    window.addEventListener('organizationDataSaved', handleDataReady);
    window.addEventListener('domain-detected', handleDataReady);
  }

  /**
   * بدء تحميل بيانات المنتج
   */
  async startProductPreload(productId: string, organizationId: string): Promise<void> {
    try {
      const { startProductPagePreload } = await import('../utils/productPagePreloader');

      const result = await startProductPagePreload({
        productId,
        organizationId,
        dataScope: 'full',
        forceUltraOnly: false
      });

      if (result.success) {
        performanceTracker.log('تم تحميل بيانات المنتج بنجاح', { productId, organizationId });
      } else {
        performanceTracker.log('فشل في تحميل بيانات المنتج', { productId, organizationId });
      }
    } catch (error) {
      performanceTracker.log('خطأ في تحميل بيانات المنتج', { productId, organizationId, error });
    }
  }
}

// إعدادات Preloader المنتج
const ENABLE_PRODUCT_PRELOADER = false;

// إنشاء نسخة عالمية
export const productPageManager = new ProductPageManager();
