// نظام إدارة الثيم المخصص لمركز الاتصالات

export interface CallCenterTheme {
  mode: 'light' | 'dark' | 'system';
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  customCss?: string;
  lastUpdated: number;
}

// الألوان الافتراضية لمركز الاتصالات
const DEFAULT_CALL_CENTER_THEME: CallCenterTheme = {
  mode: 'light',
  primaryColor: '#2563eb', // أزرق مركز الاتصالات
  secondaryColor: '#1e40af', // أزرق داكن
  accentColor: '#3b82f6', // أزرق فاتح
  lastUpdated: Date.now()
};

// مفتاح التخزين المحلي
const CALL_CENTER_THEME_KEY = 'bazaar_call_center_theme';

/**
 * تحويل لون HEX إلى صيغة HSL
 */
function hexToHSL(hex: string): string {
  hex = hex.replace(/^#/, '');
  
  if (!/^[0-9A-F]{6}$/i.test(hex)) {
    return '221 83% 53%'; // أزرق افتراضي
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

/**
 * تطبيق ثيم مركز الاتصالات على DOM
 */
export function applyCallCenterTheme(theme: CallCenterTheme): void {
  const root = document.documentElement;
  const body = document.body;
  
  // تحديد الوضع الفعلي
  let effectiveMode = theme.mode;
  if (theme.mode === 'system') {
    effectiveMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  
  // تطبيق الوضع بقوة
  root.classList.remove('light', 'dark');
  body.classList.remove('light', 'dark');
  
  // إضافة الفئة الجديدة
  root.classList.add(effectiveMode);
  body.classList.add(effectiveMode);
  
  // تعيين data attributes
  root.setAttribute('data-theme', effectiveMode);
  root.setAttribute('data-call-center-theme', 'true');
  body.setAttribute('data-theme', effectiveMode);
  
  // تحديث color-scheme
  document.body.style.colorScheme = effectiveMode;
  root.style.colorScheme = effectiveMode;
  
  // تطبيق الألوان المخصصة
  const primaryHSL = hexToHSL(theme.primaryColor);
  const secondaryHSL = hexToHSL(theme.secondaryColor);
  const accentHSL = hexToHSL(theme.accentColor);
  
  // متغيرات CSS لمركز الاتصالات مع تحسينات للدارك مود
  const cssVariables = {
    // الألوان الأساسية
    '--call-center-primary': primaryHSL,
    '--call-center-secondary': secondaryHSL,
    '--call-center-accent': accentHSL,
    
    // ألوان الخلفية - محسنة للدارك مود
    '--call-center-bg': effectiveMode === 'dark' ? '222 84% 4%' : '210 40% 98%',
    '--call-center-bg-secondary': effectiveMode === 'dark' ? '217 33% 8%' : '220 14% 96%',
    '--call-center-bg-muted': effectiveMode === 'dark' ? '215 28% 12%' : '210 40% 94%',
    
    // ألوان النصوص - محسنة للتباين
    '--call-center-foreground': effectiveMode === 'dark' ? '210 40% 98%' : '222 84% 4%',
    '--call-center-foreground-muted': effectiveMode === 'dark' ? '215 20% 65%' : '215 16% 47%',
    
    // ألوان الحدود - محسنة للوضوح
    '--call-center-border': effectiveMode === 'dark' ? '217 33% 17%' : '214 32% 91%',
    '--call-center-border-hover': effectiveMode === 'dark' ? '215 28% 25%' : '210 40% 85%',
    
    // ألوان البطاقات - محسنة للعمق
    '--call-center-card': effectiveMode === 'dark' ? '222 84% 6%' : '0 0% 100%',
    '--call-center-card-hover': effectiveMode === 'dark' ? '217 33% 10%' : '210 40% 98%',
    
    // ألوان الحالة - ثابتة ومقروءة
    '--call-center-success': effectiveMode === 'dark' ? '142 76% 36%' : '142 71% 45%',
    '--call-center-warning': effectiveMode === 'dark' ? '48 96% 53%' : '43 96% 56%',
    '--call-center-error': effectiveMode === 'dark' ? '0 84% 60%' : '0 84% 60%',
    '--call-center-info': primaryHSL,
    
    // تأثيرات الشفافية - محسنة للدارك مود
    '--call-center-glass-bg': effectiveMode === 'dark' 
      ? 'rgba(15, 23, 42, 0.85)' 
      : 'rgba(255, 255, 255, 0.85)',
    '--call-center-glass-border': effectiveMode === 'dark' 
      ? 'rgba(148, 163, 184, 0.15)' 
      : 'rgba(148, 163, 184, 0.2)',
      
    // متغيرات إضافية للتحكم الدقيق
    '--call-center-shadow': effectiveMode === 'dark' 
      ? 'rgba(0, 0, 0, 0.5)' 
      : 'rgba(0, 0, 0, 0.1)',
    '--call-center-shadow-lg': effectiveMode === 'dark' 
      ? 'rgba(0, 0, 0, 0.7)' 
      : 'rgba(0, 0, 0, 0.15)',
  };
  
  // تطبيق المتغيرات مع !important لضمان الأولوية
  Object.entries(cssVariables).forEach(([property, value]) => {
    root.style.setProperty(property, value, 'important');
  });
  
  // تطبيق CSS مخصص إضافي
  if (theme.customCss) {
    const styleId = 'call-center-custom-css';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = theme.customCss;
  }
  
  // إضافة أنماط CSS أساسية لمركز الاتصالات مع تحسينات
  const baseStyleId = 'call-center-base-styles';
  if (!document.getElementById(baseStyleId)) {
    const baseStyle = document.createElement('style');
    baseStyle.id = baseStyleId;
    baseStyle.textContent = `
      /* أنماط أساسية لمركز الاتصالات */
      [data-call-center-theme="true"] {
        --primary: var(--call-center-primary) !important;
        --secondary: var(--call-center-secondary) !important;
        --accent: var(--call-center-accent) !important;
        --background: var(--call-center-bg) !important;
        --foreground: var(--call-center-foreground) !important;
        --card: var(--call-center-card) !important;
        --border: var(--call-center-border) !important;
        --muted: var(--call-center-bg-muted) !important;
        --muted-foreground: var(--call-center-foreground-muted) !important;
      }
      
      /* فرض تطبيق الثيم على جميع العناصر */
      [data-call-center-theme="true"] * {
        border-color: hsl(var(--call-center-border)) !important;
      }
      
      /* تأثيرات Glass Morphism محسنة */
      .call-center-glass {
        background: var(--call-center-glass-bg) !important;
        backdrop-filter: blur(12px) saturate(180%) !important;
        -webkit-backdrop-filter: blur(12px) saturate(180%) !important;
        border: 1px solid var(--call-center-glass-border) !important;
        box-shadow: 
          0 8px 32px var(--call-center-shadow),
          inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
      }
      
      /* تدرجات مخصصة */
      .call-center-gradient {
        background: linear-gradient(135deg, 
          hsl(var(--call-center-primary)) 0%, 
          hsl(var(--call-center-secondary)) 100%) !important;
      }
      
      /* حالات التفاعل محسنة */
      .call-center-hover:hover {
        background-color: hsl(var(--call-center-card-hover)) !important;
        border-color: hsl(var(--call-center-border-hover)) !important;
        box-shadow: 0 4px 12px var(--call-center-shadow) !important;
      }
      
      /* أنماط الأزرار محسنة */
      .call-center-btn-primary {
        background: linear-gradient(135deg, 
          hsl(var(--call-center-primary)) 0%, 
          hsl(var(--call-center-secondary)) 100%) !important;
        color: white !important;
        border: 1px solid hsl(var(--call-center-primary)) !important;
        box-shadow: 0 2px 8px var(--call-center-shadow) !important;
      }
      
      .call-center-btn-primary:hover {
        background: linear-gradient(135deg, 
          hsl(var(--call-center-secondary)) 0%, 
          hsl(var(--call-center-primary)) 100%) !important;
        box-shadow: 0 4px 16px var(--call-center-shadow-lg) !important;
        transform: translateY(-1px) !important;
      }
      
      /* أنماط النصوص */
      .call-center-text-primary {
        color: hsl(var(--call-center-primary)) !important;
      }
      
      .call-center-text-muted {
        color: hsl(var(--call-center-foreground-muted)) !important;
      }
      
      /* تحسين الإدخالات والنماذج */
      .call-center-input {
        background: hsl(var(--call-center-card)) !important;
        border: 1px solid hsl(var(--call-center-border)) !important;
        color: hsl(var(--call-center-foreground)) !important;
      }
      
      .call-center-input:focus {
        border-color: hsl(var(--call-center-primary)) !important;
        box-shadow: 0 0 0 3px hsl(var(--call-center-primary) / 0.1) !important;
      }
      
      /* تحسين القوائم المنسدلة */
      .call-center-dropdown {
        background: var(--call-center-glass-bg) !important;
        border: 1px solid var(--call-center-glass-border) !important;
        box-shadow: 0 20px 25px var(--call-center-shadow-lg) !important;
      }
      
      /* رسوم متحركة */
      .call-center-pulse {
        animation: call-center-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }
      
      @keyframes call-center-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      
      /* تحسين للدارك مود */
      [data-call-center-theme="true"].dark {
        color-scheme: dark !important;
      }
      
      [data-call-center-theme="true"].light {
        color-scheme: light !important;
      }
      
      /* تحسين شريط التمرير */
      [data-call-center-theme="true"] ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      
      [data-call-center-theme="true"] ::-webkit-scrollbar-track {
        background: hsl(var(--call-center-bg-muted)) !important;
        border-radius: 4px;
      }
      
      [data-call-center-theme="true"] ::-webkit-scrollbar-thumb {
        background: hsl(var(--call-center-primary) / 0.3) !important;
        border-radius: 4px;
      }
      
      [data-call-center-theme="true"] ::-webkit-scrollbar-thumb:hover {
        background: hsl(var(--call-center-primary) / 0.5) !important;
      }
    `;
    document.head.appendChild(baseStyle);
  }
  
  // فرض إعادة رسم الصفحة
  requestAnimationFrame(() => {
    document.body.style.display = 'none';
    document.body.offsetHeight; // Force reflow
    document.body.style.display = '';
  });
}

/**
 * حفظ ثيم مركز الاتصالات
 */
export function saveCallCenterTheme(theme: CallCenterTheme): void {
  try {
    const themeWithTimestamp = {
      ...theme,
      lastUpdated: Date.now()
    };
    localStorage.setItem(CALL_CENTER_THEME_KEY, JSON.stringify(themeWithTimestamp));
  } catch (error) {
  }
}

/**
 * استرجاع ثيم مركز الاتصالات المحفوظ
 */
export function getStoredCallCenterTheme(): CallCenterTheme | null {
  try {
    const stored = localStorage.getItem(CALL_CENTER_THEME_KEY);
    if (!stored) return null;
    
    const theme = JSON.parse(stored) as CallCenterTheme;
    
    // التحقق من صحة البيانات
    if (!theme.primaryColor || !theme.mode) {
      return null;
    }
    
    return theme;
  } catch (error) {
    return null;
  }
}

/**
 * الحصول على الثيم الحالي أو الافتراضي
 */
export function getCurrentCallCenterTheme(): CallCenterTheme {
  return getStoredCallCenterTheme() || DEFAULT_CALL_CENTER_THEME;
}

/**
 * تحديث وضع الثيم (فاتح/داكن/نظام)
 */
export function updateCallCenterThemeMode(mode: 'light' | 'dark' | 'system'): void {
  const currentTheme = getCurrentCallCenterTheme();
  const updatedTheme = { ...currentTheme, mode };
  
  saveCallCenterTheme(updatedTheme);
  applyCallCenterTheme(updatedTheme);
}

/**
 * تحديث ألوان الثيم
 */
export function updateCallCenterColors(colors: {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
}): void {
  const currentTheme = getCurrentCallCenterTheme();
  const updatedTheme = { 
    ...currentTheme, 
    ...colors,
    lastUpdated: Date.now()
  };
  
  saveCallCenterTheme(updatedTheme);
  applyCallCenterTheme(updatedTheme);
}

/**
 * تطبيق ثيم المؤسسة على مركز الاتصالات
 */
export function applyOrganizationThemeToCallCenter(orgSettings: {
  theme_primary_color?: string;
  theme_secondary_color?: string;
  theme_mode?: 'light' | 'dark' | 'auto';
  custom_css?: string;
}): void {
  const currentTheme = getCurrentCallCenterTheme();
  
  // تحويل وضع الثيم
  let themeMode: 'light' | 'dark' | 'system' = currentTheme.mode;
  if (orgSettings.theme_mode === 'auto') {
    themeMode = 'system';
  } else if (orgSettings.theme_mode === 'light' || orgSettings.theme_mode === 'dark') {
    themeMode = orgSettings.theme_mode;
  }
  
  const updatedTheme: CallCenterTheme = {
    mode: themeMode,
    primaryColor: orgSettings.theme_primary_color || currentTheme.primaryColor,
    secondaryColor: orgSettings.theme_secondary_color || currentTheme.secondaryColor,
    accentColor: currentTheme.accentColor, // الاحتفاظ باللون المميز
    customCss: orgSettings.custom_css || currentTheme.customCss,
    lastUpdated: Date.now()
  };
  
  saveCallCenterTheme(updatedTheme);
  applyCallCenterTheme(updatedTheme);
}

/**
 * تهيئة نظام الثيم لمركز الاتصالات
 */
export function initializeCallCenterTheme(): (() => void) | void {
  const theme = getCurrentCallCenterTheme();
  applyCallCenterTheme(theme);
  
  // مراقبة تغييرات إعدادات النظام
  if (theme.mode === 'system') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      applyCallCenterTheme(theme);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    
    // إرجاع دالة التنظيف
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }
}

/**
 * إزالة ثيم مركز الاتصالات والعودة للثيم العادي
 */
export function removeCallCenterTheme(): void {
  const root = document.documentElement;
  
  // إزالة data attribute
  root.removeAttribute('data-call-center-theme');
  
  // إزالة الأنماط المخصصة
  const customStyle = document.getElementById('call-center-custom-css');
  if (customStyle) {
    customStyle.remove();
  }
  
  const baseStyle = document.getElementById('call-center-base-styles');
  if (baseStyle) {
    baseStyle.remove();
  }
  
  // إزالة متغيرات CSS المخصصة
  const callCenterVars = [
    '--call-center-primary', '--call-center-secondary', '--call-center-accent',
    '--call-center-bg', '--call-center-bg-secondary', '--call-center-bg-muted',
    '--call-center-foreground', '--call-center-foreground-muted',
    '--call-center-border', '--call-center-border-hover',
    '--call-center-card', '--call-center-card-hover',
    '--call-center-success', '--call-center-warning', '--call-center-error', '--call-center-info',
    '--call-center-glass-bg', '--call-center-glass-border'
  ];
  
  callCenterVars.forEach(varName => {
    root.style.removeProperty(varName);
  });
}
