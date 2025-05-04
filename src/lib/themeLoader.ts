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
 * تطبيق الثيم على العناصر في الصفحة
 */
function applyTheme(theme: StoreTheme): void {
  // تطبيق اللون الأساسي
  if (theme.primaryColor) {
    document.documentElement.style.setProperty('--primary', theme.primaryColor);
  }
  
  // تطبيق اللون الثانوي
  if (theme.secondaryColor) {
    document.documentElement.style.setProperty('--secondary', theme.secondaryColor);
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