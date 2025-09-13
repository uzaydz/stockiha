/**
 * 🚀 تحميل CSS غير الحرج بشكل مؤجل لتحسين الأداء
 * يتم تحميل CSS غير الحرج بعد تحميل المحتوى الأساسي
 */

let nonCriticalCSSLoaded = false;

function ensureStylesheet(href: string, id?: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      if (id && document.getElementById(id)) return resolve();
      const exists = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .some((l) => (l as HTMLLinkElement).href.includes(href));
      if (exists) return resolve();

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      // حافظ على وضع الاعتماديات مطابقاً للـ preload (fonts css)
      if (href.includes('/fonts/tajawal.css')) link.crossOrigin = '' as any;
      if (id) link.id = id;
      link.onload = () => resolve();
      link.onerror = () => resolve();
      document.head.appendChild(link);
    } catch { resolve(); }
  });
}

export const loadNonCriticalCSS = async (): Promise<void> => {
  // تجنب التحميل المتكرر
  if (nonCriticalCSSLoaded) return;

  // تعطيل تحميل non-critical CSS لأن جميع CSS الضروري محمل مع HTML مباشرة
  // CSS الرئيسي محمل بالفعل في head مع /assets/css/main-*.css
  
  // فقط تحميل خط Tajawal إذا لم يكن محملاً
  await ensureStylesheet('/fonts/tajawal.css', '__fonts_tajawal_css');

  nonCriticalCSSLoaded = true;
};

/**
 * تحميل CSS غير الحرج بعد تحميل الصفحة
 */
export const loadNonCriticalCSSAfterPageLoad = (): void => {
  // التحميل بعد تحميل الصفحة بالكامل
  if (document.readyState === 'complete') {
    loadNonCriticalCSS();
  } else {
    window.addEventListener('load', () => {
      // تأخير قصير لضمان عدم التأثير على الأداء
      setTimeout(() => {
        loadNonCriticalCSS();
      }, 100);
    });
  }
};

/**
 * تحميل CSS غير الحرج عند الحاجة (للمكونات المؤجلة)
 */
export const loadNonCriticalCSSOnDemand = (): Promise<void> => {
  return loadNonCriticalCSS();
};
