// أداة تشخيص مشاكل الثيم
export function debugThemeIssues() {
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;
  
  console.log('🔍 تشخيص الثيم:');
  console.log('النطاق:', hostname);
  console.log('المسار:', pathname);
  
  // فحص النطاق الفرعي
  if (hostname.includes('localhost')) {
    const parts = hostname.split('.');
    if (parts.length > 1 && parts[0] !== 'www' && parts[0] !== 'localhost') {
      console.log('✅ تم اكتشاف نطاق فرعي في localhost:', parts[0]);
    } else {
      console.log('❌ لم يتم اكتشاف نطاق فرعي في localhost');
    }
  }
  
  // فحص البيانات المحفوظة
  const orgId = localStorage.getItem('bazaar_organization_id');
  const subdomain = localStorage.getItem('bazaar_current_subdomain');
  const orgTheme = localStorage.getItem('bazaar_org_theme');
  const hostTheme = localStorage.getItem(`org_theme_${hostname}`);
  
  console.log('معرف المؤسسة المحفوظ:', orgId);
  console.log('النطاق الفرعي المحفوظ:', subdomain);
  console.log('ثيم المؤسسة:', orgTheme ? JSON.parse(orgTheme) : null);
  console.log('ثيم النطاق:', hostTheme ? JSON.parse(hostTheme) : null);
  
  // فحص الألوان المطبقة حالياً
  const root = document.documentElement;
  const primaryColor = getComputedStyle(root).getPropertyValue('--primary');
  const secondaryColor = getComputedStyle(root).getPropertyValue('--secondary');
  
  console.log('اللون الأساسي المطبق:', primaryColor);
  console.log('اللون الثانوي المطبق:', secondaryColor);
  
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
  console.log('🎨 تطبيق لون اختباري:', color, '->', hslColor);
  
  root.style.setProperty('--primary', hslColor, 'important');
  root.style.setProperty('--ring', hslColor, 'important');
  
  return hslColor;
}

// إضافة الدوال إلى النافذة العالمية للاستخدام من وحدة التحكم
if (typeof window !== 'undefined') {
  (window as any).debugTheme = debugThemeIssues;
  (window as any).testTheme = applyTestTheme;
} 