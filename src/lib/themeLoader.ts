// نظام تحميل الثيم الفوري

// الألوان الافتراضية للمتجر
const DEFAULT_THEME = {
  primaryColor: 'hsl(142, 76%, 36%)',
  secondaryColor: 'hsl(142, 72%, 29%)',
  darkMode: false,
  customCss: ''
};

// اسم مفتاح التخزين المحلي للثيم
const THEME_STORAGE_KEY = 'bazaar_store_theme';

/**
 * واجهة بيانات الثيم
 */
export interface StoreTheme {
  primaryColor: string;
  secondaryColor: string;
  darkMode: boolean;
  customCss: string;
  subdomain?: string;
  lastUpdated?: number;
}

/**
 * تحويل لون HEX إلى صيغة HSL
 */
function hexToHSL(hex: string): string {
  // إزالة # في حال وجودها
  hex = hex.replace(/^#/, '');
  
  // تحويل إلى RGB
  let r = 0, g = 0, b = 0;
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else if (hex.length === 6) {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  } else {
    // إذا كان التنسيق غير صالح، نعيد لون افتراضي
    return DEFAULT_THEME.primaryColor;
  }
  
  // تطبيع RGB إلى قيم بين 0 و 1
  r /= 255;
  g /= 255;
  b /= 255;
  
  // حساب قيم HSL
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
  
  // تحويل إلى صيغة CSS
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);
  
  return `${h} ${s}% ${l}%`;
};

/**
 * التحقق مما إذا كان اللون بصيغة HSL
 */
function isHSLColor(color: string): boolean {
  return color.includes('hsl') || (color.includes('%') && color.split(' ').length === 3);
}

/**
 * تطبيق الثيم على العناصر في الصفحة
 */
function applyTheme(theme: StoreTheme): void {
  // تطبيق اللون الأساسي
  if (theme.primaryColor) {
    // تحويل اللون إلى HSL إذا كان بصيغة HEX
    const primaryHSL = isHSLColor(theme.primaryColor) ? theme.primaryColor : hexToHSL(theme.primaryColor);
    document.documentElement.style.setProperty('--primary', primaryHSL);
    
    // استخراج مكونات HSL لإنشاء ألوان مشتقة
    if (primaryHSL.includes('%')) {
      const [h, s, l] = primaryHSL.split(' ');
      // قيم أفتح وأغمق للون الرئيسي
      document.documentElement.style.setProperty('--primary-foreground', '0 0% 100%');
      document.documentElement.style.setProperty('--primary-lighter', `${h} ${s} 85%`);
      document.documentElement.style.setProperty('--primary-darker', `${h} ${s} 25%`);
    }
  }
  
  // تطبيق اللون الثانوي
  if (theme.secondaryColor) {
    // تحويل اللون إلى HSL إذا كان بصيغة HEX
    const secondaryHSL = isHSLColor(theme.secondaryColor) ? theme.secondaryColor : hexToHSL(theme.secondaryColor);
    document.documentElement.style.setProperty('--secondary', secondaryHSL);
    document.documentElement.style.setProperty('--secondary-foreground', '0 0% 100%');
  }
  
  // تطبيق وضع الظلام
  if (theme.darkMode) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  
  // تطبيق CSS المخصص
  if (theme.customCss) {
    const styleId = 'bazaar-store-custom-css';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    
    // إنشاء عنصر style إذا لم يكن موجوداً
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    
    // تحديث محتوى CSS
    styleElement.textContent = theme.customCss;
  }
  
  // طباعة تأكيد في وحدة التحكم
  console.log("[ThemeLoader] تم تطبيق الثيم:", {
    primaryColor: theme.primaryColor,
    secondaryColor: theme.secondaryColor,
    darkMode: theme.darkMode,
    hasCustomCSS: !!theme.customCss
  });
}

/**
 * حفظ الثيم في التخزين المحلي
 */
export function saveTheme(theme: StoreTheme): void {
  // إضافة طابع زمني لآخر تحديث
  const themeWithTimestamp = {
    ...theme,
    lastUpdated: Date.now()
  };
  
  localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(themeWithTimestamp));
  
  // تطبيق الثيم مباشرة
  applyTheme(theme);
}

/**
 * استرجاع الثيم من التخزين المحلي
 */
export function getStoredTheme(): StoreTheme | null {
  try {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (!storedTheme) return null;
    
    return JSON.parse(storedTheme) as StoreTheme;
  } catch (error) {
    console.error('خطأ في قراءة الثيم من التخزين المحلي:', error);
    return null;
  }
}

/**
 * تحديث الثيم من البيانات المجلوبة
 */
export function updateTheme(subdomain: string, settings: any): void {
  // بناء كائن الثيم من الإعدادات
  const newTheme: StoreTheme = {
    primaryColor: settings?.theme_primary_color || DEFAULT_THEME.primaryColor,
    secondaryColor: settings?.theme_secondary_color || DEFAULT_THEME.secondaryColor,
    darkMode: settings?.theme_mode === 'dark',
    customCss: settings?.custom_css || '',
    subdomain
  };
  
  // حفظ الثيم الجديد
  saveTheme(newTheme);
}

/**
 * تطبيق الثيم الافتراضي
 */
export function applyDefaultTheme(): void {
  applyTheme(DEFAULT_THEME);
}

/**
 * وظيفة بدء التحميل الفوري للثيم
 * تُستدعى في بداية تحميل التطبيق - يفضل استدعاؤها في ملف index.html أو أقرب ملف يتم تحميله
 */
export function initializeTheme(subdomain?: string): void {
  // استرجاع الثيم المحفوظ
  const storedTheme = getStoredTheme();
  
  // إذا كان هناك ثيم محفوظ ويخص نفس النطاق الفرعي، نطبقه
  if (storedTheme && (!subdomain || storedTheme.subdomain === subdomain)) {
    console.log('[ThemeLoader] تطبيق الثيم المحفوظ');
    applyTheme(storedTheme);
    return;
  }
  
  // تطبيق الثيم الافتراضي
  console.log('[ThemeLoader] تطبيق الثيم الافتراضي');
  applyDefaultTheme();
}

// تصدير الدوال
export default {
  initializeTheme,
  applyTheme,
  saveTheme,
  getStoredTheme,
  updateTheme
}; 