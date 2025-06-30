// أداة تشخيص مشاكل الثيم
export function debugThemeIssues() {
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;

  // فحص النطاق الفرعي
  if (hostname.includes('localhost')) {
    const parts = hostname.split('.');
    if (parts.length > 1 && parts[0] !== 'www' && parts[0] !== 'localhost') {
    } else {
    }
  }
  
  // فحص البيانات المحفوظة
  const orgId = localStorage.getItem('bazaar_organization_id');
  const subdomain = localStorage.getItem('bazaar_current_subdomain');
  const orgTheme = localStorage.getItem('bazaar_org_theme');
  const hostTheme = localStorage.getItem(`org_theme_${hostname}`);

  // فحص الألوان المطبقة حالياً
  const root = document.documentElement;
  const primaryColor = getComputedStyle(root).getPropertyValue('--primary');
  const secondaryColor = getComputedStyle(root).getPropertyValue('--secondary');

  return {
    hostname,
    pathname,
    orgId,
    subdomain,
    primaryColor: primaryColor.trim(),
    secondaryColor: secondaryColor.trim(),
    orgTheme: orgTheme ? JSON.parse(orgTheme) : null,
    hostTheme: hostTheme ? JSON.parse(hostTheme) : null
  };
}

// تطبيق ثيم اختباري
export function applyTestTheme(color: string = '#fb923c') {
  const root = document.documentElement;
  
  // تحويل اللون إلى HSL
  function hexToHSL(hex: string): string {
    hex = hex.replace(/^#/, '');
    
    if (!/^[0-9A-F]{6}$/i.test(hex)) {
      return '0 0% 50%';
    }
    
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      
      h /= 6;
    }
    
    h = Math.round(h * 360);
    s = Math.round(s * 100);
    l = Math.round(l * 100);
    
    return `${h} ${s}% ${l}%`;
  }
  
  const hslColor = hexToHSL(color);
  
  root.style.setProperty('--primary', hslColor, 'important');
  root.style.setProperty('--ring', hslColor, 'important');
  
  return hslColor;
}

// إضافة الدوال إلى النافذة العالمية للاستخدام من وحدة التحكم
if (typeof window !== 'undefined') {
  (window as any).debugTheme = debugThemeIssues;
  (window as any).testTheme = applyTestTheme;
}
