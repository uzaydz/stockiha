/**
 * محسن مشاركة Facebook وOpen Graph
 * يضمن ظهور معلومات المتجر الصحيحة عند المشاركة
 */

interface FacebookOptimization {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: string;
  siteName?: string;
}

/**
 * تحسين Open Graph tags للمتجر
 */
export function optimizeFacebookSharing(storeInfo: FacebookOptimization): void {
  try {
    // دالة مساعدة لتحديث أو إنشاء meta tag
    const updateMetaTag = (property: string, content: string) => {
      if (!content) return;
      
      let meta = document.querySelector(`meta[property="${property}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // تحديث Open Graph tags الأساسية
    updateMetaTag('og:title', storeInfo.title);
    updateMetaTag('og:description', storeInfo.description);
    updateMetaTag('og:type', storeInfo.type || 'website');
    updateMetaTag('og:site_name', storeInfo.siteName || storeInfo.title);
    
    // URL الحالي
    updateMetaTag('og:url', storeInfo.url || window.location.href);
    
    // الصورة إذا كانت متوفرة
    if (storeInfo.image) {
      updateMetaTag('og:image', storeInfo.image);
      updateMetaTag('og:image:width', '1200');
      updateMetaTag('og:image:height', '630');
      updateMetaTag('og:image:type', 'image/jpeg');
    }
    
    // إضافة Twitter Cards أيضاً
    const updateTwitterMeta = (name: string, content: string) => {
      if (!content) return;
      
      let meta = document.querySelector(`meta[name="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };
    
    updateTwitterMeta('twitter:card', 'summary_large_image');
    updateTwitterMeta('twitter:title', storeInfo.title);
    updateTwitterMeta('twitter:description', storeInfo.description);
    if (storeInfo.image) {
      updateTwitterMeta('twitter:image', storeInfo.image);
    }
    
    // إضافة structured data للمتجر
    addStoreStructuredData(storeInfo);
    
  } catch (error) {
    console.warn('خطأ في تحسين Facebook sharing:', error);
  }
}

/**
 * إضافة structured data للمتجر (JSON-LD)
 */
function addStoreStructuredData(storeInfo: FacebookOptimization): void {
  try {
    // إزالة structured data الموجود
    const existingLD = document.querySelector('#store-structured-data');
    if (existingLD) {
      existingLD.remove();
    }
    
    // إنشاء structured data جديد
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Store",
      "name": storeInfo.title,
      "description": storeInfo.description,
      "url": window.location.href,
      "@id": window.location.href,
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": `${window.location.origin}/search?q={search_term_string}`
        },
        "query-input": "required name=search_term_string"
      }
    };
    
    // إضافة الصورة إذا كانت متوفرة
    if (storeInfo.image) {
      (structuredData as any).image = storeInfo.image;
      (structuredData as any).logo = storeInfo.image;
    }
    
    // إنشاء script tag
    const script = document.createElement('script');
    script.id = 'store-structured-data';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);
    
  } catch (error) {
    console.warn('خطأ في إضافة structured data:', error);
  }
}

/**
 * تحديث title والوصف فوراً لتحسين SEO
 */
export function updatePageMetadata(title: string, description?: string): void {
  try {
    // تحديث عنوان الصفحة
    if (title && document.title !== title) {
      document.title = title;
    }
    
    // تحديث meta description
    if (description) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'description');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', description);
    }
    
  } catch (error) {
    console.warn('خطأ في تحديث metadata:', error);
  }
}

/**
 * إعادة تحميل Facebook debugger (للتطوير)
 */
export function triggerFacebookDebugger(): void {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    // إرسال ping لـ Facebook debugger لإعادة كشط الصفحة
    const currentUrl = encodeURIComponent(window.location.href);
    const debuggerUrl = `https://developers.facebook.com/tools/debug/sharing/?q=${currentUrl}`;
    
    // فتح في tab جديد للتطوير
    if (process.env.NODE_ENV === 'development') {
      console.log('Facebook Debugger URL:', debuggerUrl);
    }
  }
}

/**
 * التحقق من صحة Open Graph tags
 */
export function validateOpenGraphTags(): boolean {
  try {
    const requiredTags = ['og:title', 'og:description', 'og:type', 'og:url'];
    
    for (const tag of requiredTags) {
      const meta = document.querySelector(`meta[property="${tag}"]`);
      if (!meta || !meta.getAttribute('content')) {
        console.warn(`Open Graph tag مفقود: ${tag}`);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.warn('خطأ في التحقق من Open Graph tags:', error);
    return false;
  }
}

/**
 * حفظ معلومات المتجر لاستخدام المشاركة السريعة
 */
export function cacheStoreInfoForSharing(storeInfo: FacebookOptimization): void {
  try {
    const subdomain = window.location.hostname.split('.')[0];
    if (subdomain && subdomain !== 'localhost' && subdomain !== 'www') {
      const sharingCache = {
        title: storeInfo.title,
        description: storeInfo.description,
        image: storeInfo.image,
        url: storeInfo.url || window.location.href,
        timestamp: Date.now()
      };
      
      sessionStorage.setItem(`facebook_share_${subdomain}`, JSON.stringify(sharingCache));
    }
  } catch (error) {
    // تجاهل أخطاء التخزين
  }
}

/**
 * استرجاع معلومات المشاركة المحفوظة
 */
export function getCachedSharingInfo(): FacebookOptimization | null {
  try {
    const subdomain = window.location.hostname.split('.')[0];
    if (!subdomain || subdomain === 'localhost' || subdomain === 'www') {
      return null;
    }
    
    const cached = sessionStorage.getItem(`facebook_share_${subdomain}`);
    if (cached) {
      const data = JSON.parse(cached);
      // التحقق من أن البيانات ليست قديمة (أقل من ساعة)
      if (Date.now() - data.timestamp < 60 * 60 * 1000) {
        return data;
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}
