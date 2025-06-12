/**
 * Critical CSS Extraction and Inlining Utility
 * يستخرج CSS الحرج ويضعه inline لتحسين FCP/LCP
 */

// Critical CSS للصفحة الرئيسية - الأساسيات فقط
export const criticalCSS = `
  /* Reset وأساسيات */
  *,::before,::after{box-sizing:border-box;border-width:0;border-style:solid;border-color:#e5e7eb}
  *::before,*::after{--tw-content:''}
  html{line-height:1.5;-webkit-text-size-adjust:100%;-moz-tab-size:4;tab-size:4;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans",sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji";font-feature-settings:normal;font-variation-settings:normal}
  body{margin:0;line-height:inherit}
  
  /* Layout أساسي */
  .min-h-screen{min-height:100vh}
  .flex{display:flex}
  .flex-col{flex-direction:column}
  .items-center{align-items:center}
  .justify-center{justify-content:center}
  .w-full{width:100%}
  .h-full{height:100%}
  
  /* Colors أساسية */
  .bg-white{background-color:#fff}
  .bg-gray-50{background-color:#f9fafb}
  .text-gray-900{color:#111827}
  .text-gray-600{color:#4b5563}
  
  /* Typography أساسي */
  .text-sm{font-size:.875rem;line-height:1.25rem}
  .text-base{font-size:1rem;line-height:1.5rem}
  .text-lg{font-size:1.125rem;line-height:1.75rem}
  .text-xl{font-size:1.25rem;line-height:1.75rem}
  .text-2xl{font-size:1.5rem;line-height:2rem}
  .font-medium{font-weight:500}
  .font-semibold{font-weight:600}
  
  /* Spacing أساسي */
  .p-4{padding:1rem}
  .px-4{padding-left:1rem;padding-right:1rem}
  .py-2{padding-top:.5rem;padding-bottom:.5rem}
  .py-4{padding-top:1rem;padding-bottom:1rem}
  .mt-4{margin-top:1rem}
  .mb-4{margin-bottom:1rem}
  
  /* Loading spinner */
  .animate-spin{animation:spin 1s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}
  
  /* Rounded corners */
  .rounded{border-radius:.25rem}
  .rounded-full{border-radius:9999px}
  
  /* Shadow */
  .shadow{box-shadow:0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)}
  
  /* Button أساسي */
  .btn-primary{background-color:#3b82f6;color:#fff;padding:.5rem 1rem;border-radius:.375rem;font-weight:500;transition:background-color .15s ease-in-out}
  .btn-primary:hover{background-color:#2563eb}
`;

// دالة لحقن Critical CSS في الـ head
export const injectCriticalCSS = () => {
  if (typeof document === 'undefined') return;
  
  // تحقق من عدم وجود critical css مسبقاً
  if (document.getElementById('critical-css')) return;
  
  const style = document.createElement('style');
  style.id = 'critical-css';
  style.innerHTML = criticalCSS;
  
  // إضافة CSS في بداية head لأولوية عالية
  const head = document.head;
  const firstChild = head.firstChild;
  if (firstChild) {
    head.insertBefore(style, firstChild);
  } else {
    head.appendChild(style);
  }
};

// دالة لتحميل CSS غير الحرج بشكل async
export const loadNonCriticalCSS = (href: string) => {
  if (typeof document === 'undefined') return;
  
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'style';
  link.href = href;
  link.onload = () => {
    link.rel = 'stylesheet';
  };
  
  document.head.appendChild(link);
  
  // Fallback للمتصفحات القديمة
  const noscript = document.createElement('noscript');
  const fallbackLink = document.createElement('link');
  fallbackLink.rel = 'stylesheet';
  fallbackLink.href = href;
  noscript.appendChild(fallbackLink);
  document.head.appendChild(noscript);
};

// دالة للكشف عن CSS المستخدم في viewport الحالي
export const extractUsedCSS = () => {
  if (typeof document === 'undefined') return '';
  
  const usedSelectors = new Set<string>();
  
  // الحصول على جميع العناصر المرئية في viewport
  const viewportElements = document.querySelectorAll('*');
  
  viewportElements.forEach(element => {
    // الحصول على computed styles
    const computedStyle = window.getComputedStyle(element);
    
    // استخراج classes المستخدمة
    if (element.className && typeof element.className === 'string') {
      element.className.split(' ').forEach(className => {
        if (className.trim()) {
          usedSelectors.add(`.${className.trim()}`);
        }
      });
    }
    
    // استخراج tag selectors
    usedSelectors.add(element.tagName.toLowerCase());
  });
  
  return Array.from(usedSelectors);
};

// Web Performance API لقياس أداء CSS
export const measureCSSPerformance = () => {
  if (typeof window === 'undefined' || !window.performance) return null;
  
  const paintEntries = performance.getEntriesByType('paint');
  const firstContentfulPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint');
  const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
  
  return {
    firstPaint: firstPaint?.startTime || 0,
    firstContentfulPaint: firstContentfulPaint?.startTime || 0,
    domInteractive: performance.timing.domInteractive - performance.timing.navigationStart,
    domComplete: performance.timing.domComplete - performance.timing.navigationStart,
  };
}; 