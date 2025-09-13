/**
 * أدوات تشخيص البيكسل - للمساعدة في اكتشاف المشاكل
 */

// دالة مساعدة لاستخراج معرف Facebook Pixel
function extractFacebookPixelId(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    // البحث في حراسة البكسل
    const g: any = window as any;
    const pixelGuards = g.__fb_pixel_guard || {};
    const pixelIds = Object.keys(pixelGuards);
    if (pixelIds.length > 0) {
      return pixelIds[0];
    }
    
    // البحث في CSP pixel guard
    const cspGuards = g.__csp_pixel_guard || {};
    const cspPixelIds = Object.keys(cspGuards);
    if (cspPixelIds.length > 0) {
      return cspPixelIds[0];
    }
    
    // البحث في النصوص البرمجية
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      const content = script.innerHTML;
      const match = content.match(/fbq\(['"]init['"],\s*['"](\d+)['"]/);
      if (match) {
        return match[1];
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// دالة مساعدة لقراءة الكوكيز
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

interface PixelDiagnosticResult {
  timestamp: string;
  path: string;
  storeTrackingBlocked: boolean;
  productPixelActive: boolean;
  facebookPixelStatus: 'not_loaded' | 'loaded' | 'initialized';
  googleAnalyticsStatus: 'not_loaded' | 'loaded' | 'initialized';
  tiktokPixelStatus: 'not_loaded' | 'loaded' | 'initialized';
  pixelGuards: Record<string, boolean>;
  pageViewGuard: boolean;
}

export function diagnosePixelStatus(): PixelDiagnosticResult {
  const g: any = typeof window !== 'undefined' ? (window as any) : {};
  const path = typeof window !== 'undefined' && window.location ? window.location.pathname : '';
  
  // فحص حالة StoreTracking
  const isProductPurchasePage = 
    path.includes('/product-purchase-max-v2/') ||
    path.includes('/product-purchase-max-v3/') ||
    path.includes('/product-purchase-max/') ||
    path.includes('/product/');

  // فحص حالة Facebook Pixel
  let facebookPixelStatus: 'not_loaded' | 'loaded' | 'initialized' = 'not_loaded';
  if (typeof window !== 'undefined' && window.fbq) {
    facebookPixelStatus = typeof window.fbq === 'function' ? 'initialized' : 'loaded';
  }

  // فحص حالة Google Analytics
  let googleAnalyticsStatus: 'not_loaded' | 'loaded' | 'initialized' = 'not_loaded';
  if (typeof window !== 'undefined' && window.gtag) {
    googleAnalyticsStatus = typeof window.gtag === 'function' ? 'initialized' : 'loaded';
  }

  // فحص حالة TikTok Pixel
  let tiktokPixelStatus: 'not_loaded' | 'loaded' | 'initialized' = 'not_loaded';
  if (typeof window !== 'undefined' && window.ttq) {
    tiktokPixelStatus = typeof window.ttq === 'object' && window.ttq ? 'initialized' : 'loaded';
  }

  return {
    timestamp: new Date().toISOString(),
    path,
    storeTrackingBlocked: isProductPurchasePage || g.__product_pixel_active,
    productPixelActive: !!g.__product_pixel_active,
    facebookPixelStatus,
    googleAnalyticsStatus,
    tiktokPixelStatus,
    pixelGuards: g.__fb_pixel_guard || {},
    pageViewGuard: g.__fb_pageview_guard || false
  };
}

export function logPixelDiagnostics(): void {
  const diagnostics = diagnosePixelStatus();
  
  console.group('🔍 [Pixel Diagnostics] تشخيص حالة البيكسل');
  
  
  
  
  
  
  
  
  
  
  // معلومات إضافية لتشخيص "activated 2 times"
  
  const pageViewStatus = typeof diagnostics.pageViewGuard === 'string' && diagnostics.pageViewGuard === 'blocked_for_product_page' ? 'blocked' : 
                        diagnostics.pageViewGuard === true ? 'sent' : 'not_sent';
  
  // معلومات معرف البكسل
  const fbPixelId = extractFacebookPixelId();
  
  
  // معلومات الكوكيز
  const fbpCookie = getCookie('_fbp');
  const fbcCookie = getCookie('_fbc');
  
  
  if (typeof window !== 'undefined' && (window as any).fbq) {
    
  }
  
  console.groupEnd();
}

export function cleanupDuplicatePixels(): void {
  const g: any = typeof window !== 'undefined' ? (window as any) : {};
  
  console.group('🧹 [Pixel Cleanup] تنظيف البيكسلات المكررة');
  
  // إعادة تعيين جميع الحراسات
  const oldFbGuard = g.__fb_pixel_guard || {};
  const oldCspGuard = g.__csp_pixel_guard || {};
  
  g.__fb_pixel_guard = {};
  g.__csp_pixel_guard = {};
  g.__fb_pageview_guard = false;
  g.__product_pixel_active = false;
  
  
  // إزالة السكريبتات المكررة
  const scripts = document.querySelectorAll('script[src*="fbevents.js"], script[src*="gtag/js"], script[src*="tiktok.com"]');
  
  
  scripts.forEach((script, index) => {
    if (index > 0) { // الاحتفاظ بالسكريبت الأول فقط
      script.remove();
      
    }
  });
  
  console.groupEnd();
}

// دالة إعادة تهيئة البكسل في حالة الفشل
export function reinitializePixels(): void {
  console.group('🔄 [Pixel Reinitialize] إعادة تهيئة البكسلات');
  
  // تنظيف الحراسات
  cleanupDuplicatePixels();
  
  // إعادة تشغيل أحداث التهيئة
  try {
    const evt = new CustomEvent('pixel:reinitialize');
    window.dispatchEvent(evt);
    
  } catch (e) {
    console.warn('⚠️ فشل في إرسال حدث إعادة التهيئة:', e);
  }
  
  // إعادة تحميل إعدادات التتبع
  try {
    const settings = (window as any).__productTrackingSettings;
    if (settings) {
      const evt = new CustomEvent('trackingSettingsReady', { detail: settings });
      window.dispatchEvent(evt);
      
    }
  } catch (e) {
    console.warn('⚠️ فشل في إعادة إرسال إعدادات التتبع:', e);
  }
  
  
  console.groupEnd();
}

// إضافة الدالة إلى window للاستخدام من console
if (typeof window !== 'undefined') {
  (window as any).diagnosePixels = logPixelDiagnostics;
  (window as any).getPixelDiagnostics = diagnosePixelStatus;
  (window as any).cleanupPixels = cleanupDuplicatePixels;
  (window as any).reinitializePixels = reinitializePixels;
}

// تشغيل تلقائي للتشخيص عند تحميل الصفحة (في وضع التطوير فقط)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // تأخير التشخيص للسماح للبيكسل بالتحميل
  setTimeout(() => {
    logPixelDiagnostics();
  }, 3000);
}
