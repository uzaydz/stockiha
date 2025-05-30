// نظام إدارة الثيمات الموحد - يحل مشكلة الوميض والتضارب

export interface UnifiedTheme {
  // الألوان الأساسية
  primaryColor: string;
  secondaryColor: string;
  
  // وضع المظهر
  mode: 'light' | 'dark' | 'system';
  
  // CSS مخصص
  customCss?: string;
  
  // معلومات المؤسسة
  organizationId?: string;
  subdomain?: string;
  
  // طابع زمني للتحديث
  lastUpdated: number;
}

// الألوان الافتراضية للموقع العام
const DEFAULT_GLOBAL_THEME: UnifiedTheme = {
  primaryColor: '#ff8000', // اللون البرتقالي للموقع العام
  secondaryColor: '#6b21a8', // لون بنفسجي للموقع العام
  mode: 'light',
  lastUpdated: Date.now()
};

// الألوان الافتراضية للمتاجر
const DEFAULT_STORE_THEME: UnifiedTheme = {
  primaryColor: '#22c55e', // لون أخضر للمتاجر
  secondaryColor: '#16a34a',
  mode: 'light',
  lastUpdated: Date.now()
};

// مفاتيح التخزين المحلي
const STORAGE_KEYS = {
  GLOBAL_THEME: 'bazaar_global_theme',
  STORE_THEME: 'bazaar_store_theme',
  ORGANIZATION_THEME: 'bazaar_org_theme'
};

/**
 * تحويل لون HEX إلى صيغة HSL
 */
function hexToHSL(hex: string): string {
  // إزالة # في حال وجودها
  hex = hex.replace(/^#/, '');
  
  // التحقق من صحة اللون
  if (!/^[0-9A-F]{6}$/i.test(hex)) {
    console.warn('لون غير صالح:', hex);
    return '0 0% 50%'; // لون رمادي كقيمة افتراضية
  }
  
  // تحويل إلى RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
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
}

/**
 * التحقق مما إذا كان اللون بصيغة HSL
 */
function isHSLColor(color: string): boolean {
  return color.includes('hsl') || (color.includes('%') && color.split(' ').length === 3);
}

/**
 * تطبيق الثيم على العناصر في الصفحة
 */
function applyThemeToDOM(theme: UnifiedTheme): void {
  // التحقق من نوع الصفحة
  const pageType = getCurrentPageType();
  
  // إذا كانت الصفحة العامة، نستخدم الثيم العام دائماً
  if (pageType === 'global') {
    theme = getStoredTheme('global') || DEFAULT_GLOBAL_THEME;
  }

  console.log('🎨 [themeManager] تطبيق الثيم:', {
    primaryColor: theme.primaryColor,
    secondaryColor: theme.secondaryColor,
    mode: theme.mode,
    organizationId: theme.organizationId,
    pageType: pageType
  });
  
  const root = document.documentElement;
  
  // تطبيق اللون الأساسي
  if (theme.primaryColor) {
    const primaryHSL = isHSLColor(theme.primaryColor) 
      ? theme.primaryColor 
      : hexToHSL(theme.primaryColor);
    
    // تطبيق اللون الأساسي مع !important لضمان الأولوية
    root.style.setProperty('--primary', primaryHSL, 'important');
    root.style.setProperty('--ring', primaryHSL, 'important');
    root.style.setProperty('--sidebar-primary', primaryHSL, 'important');
    root.style.setProperty('--sidebar-ring', primaryHSL, 'important');
    
    // إنشاء ألوان مشتقة
    if (primaryHSL.includes('%')) {
      const [h, s, l] = primaryHSL.split(' ');
      const hue = h.replace('deg', '').trim();
      const saturation = s.replace('%', '').trim();
      const lightness = parseInt(l.replace('%', '').trim());
      
      root.style.setProperty('--primary-foreground', '0 0% 100%', 'important');
      root.style.setProperty('--primary-lighter', `${hue} ${saturation}% ${Math.min(lightness + 20, 85)}%`, 'important');
      root.style.setProperty('--primary-darker', `${hue} ${saturation}% ${Math.max(lightness - 20, 25)}%`, 'important');
    }
  }
  
  // تطبيق اللون الثانوي
  if (theme.secondaryColor) {
    const secondaryHSL = isHSLColor(theme.secondaryColor) 
      ? theme.secondaryColor 
      : hexToHSL(theme.secondaryColor);
    
    root.style.setProperty('--secondary', secondaryHSL, 'important');
    root.style.setProperty('--secondary-foreground', '0 0% 100%', 'important');
  }
  
  // تطبيق وضع المظهر
  root.classList.remove('light', 'dark');
  
  let effectiveMode = theme.mode;
  if (theme.mode === 'system') {
    effectiveMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  
  root.classList.add(effectiveMode);
  document.body.style.colorScheme = effectiveMode;
  
  // تطبيق CSS المخصص
  if (theme.customCss) {
    const styleId = 'bazaar-unified-custom-css';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = theme.customCss;
  }
  
  // فرض إعادة تصيير العناصر
  const tempClass = 'theme-update-' + Date.now();
  root.classList.add(tempClass);
  setTimeout(() => {
    root.classList.remove(tempClass);
  }, 50);
  
  // التحقق النهائي
  const computedPrimary = window.getComputedStyle(root).getPropertyValue('--primary');
  console.log('✅ [themeManager] تم تطبيق الثيم بنجاح:', {
    primary: computedPrimary.trim(),
    mode: effectiveMode,
    pageType: pageType
  });
}

/**
 * الحصول على معرف المؤسسة من التخزين المحلي أو النطاق
 */
function getOrganizationIdSync(): string | null {
  // أولاً، التحقق من التخزين المحلي
  const storedOrgId = localStorage.getItem('bazaar_organization_id');
  if (storedOrgId) {
    return storedOrgId;
  }
  
  // ثانياً، محاولة استخراج من النطاق
  const hostname = window.location.hostname;
  
  // التحقق من النطاق الفرعي
  if (hostname.includes('.') && !hostname.startsWith('www.')) {
    const parts = hostname.split('.');
    if (parts.length > 1 && parts[0] !== 'www' && parts[0] !== 'localhost') {
      // حفظ النطاق الفرعي للاستخدام لاحقاً
      localStorage.setItem('bazaar_current_subdomain', parts[0]);
      return null; // سنحتاج لجلب معرف المؤسسة لاحقاً
    }
  }
  
  return null;
}

/**
 * تحديد نوع الصفحة الحالية
 */
function getCurrentPageType(): 'global' | 'store' | 'admin' {
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;
  
  // تحقق من المسارات المحددة للصفحة العامة
  const globalPaths = ['/', '/about', '/contact', '/blog', '/pricing', '/features'];
  if (globalPaths.includes(pathname)) {
    return 'global';
  }

  // إذا كان في لوحة التحكم
  if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard')) {
    return 'admin';
  }
  
  // التحقق من النطاق المخصص أو الفرعي
  if (hostname.includes('.') && !hostname.startsWith('www.')) {
    const parts = hostname.split('.');
    if (parts.length > 2 || (parts.length === 2 && parts[1] === 'localhost')) {
      return 'store';
    }
  }
  
  // التحقق من وجود معرف المؤسسة
  const orgId = getOrganizationIdSync();
  if (orgId) {
    return 'store';
  }

  // التحقق من المسار إذا كان يبدأ بـ /store
  if (pathname.startsWith('/store/')) {
    return 'store';
  }
  
  // إذا لم يتم التعرف على نوع الصفحة، نفترض أنها صفحة عامة
  return 'global';
}

/**
 * حفظ الثيم في التخزين المحلي
 */
function saveTheme(theme: UnifiedTheme, type: 'global' | 'store' | 'organization'): void {
  const key = type === 'global' ? STORAGE_KEYS.GLOBAL_THEME :
              type === 'store' ? STORAGE_KEYS.STORE_THEME :
              STORAGE_KEYS.ORGANIZATION_THEME;
  
  const themeWithTimestamp = {
    ...theme,
    lastUpdated: Date.now()
  };
  
  try {
    localStorage.setItem(key, JSON.stringify(themeWithTimestamp));
    
    // حفظ إضافي للمؤسسة مع hostname
    if (type === 'organization' && theme.organizationId) {
      const hostname = window.location.hostname;
      const hostKey = `org_theme_${hostname}`;
      
      const hostTheme = {
        primary: isHSLColor(theme.primaryColor) ? theme.primaryColor : hexToHSL(theme.primaryColor),
        secondary: isHSLColor(theme.secondaryColor) ? theme.secondaryColor : hexToHSL(theme.secondaryColor),
        primaryColor: theme.primaryColor,
        secondaryColor: theme.secondaryColor,
        mode: theme.mode,
        timestamp: Date.now(),
        organizationId: theme.organizationId
      };
      
      localStorage.setItem(hostKey, JSON.stringify(hostTheme));
    }
    
    console.log('💾 [saveTheme] تم حفظ الثيم:', type);
  } catch (error) {
    console.error('💥 [saveTheme] خطأ في حفظ الثيم:', error);
  }
}

/**
 * استرجاع الثيم من التخزين المحلي
 */
function getStoredTheme(type: 'global' | 'store' | 'organization'): UnifiedTheme | null {
  const key = type === 'global' ? STORAGE_KEYS.GLOBAL_THEME :
              type === 'store' ? STORAGE_KEYS.STORE_THEME :
              STORAGE_KEYS.ORGANIZATION_THEME;
  
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    
    const theme = JSON.parse(stored) as UnifiedTheme;
    
    // التحقق من صحة البيانات
    if (!theme.primaryColor || !theme.mode) {
      return null;
    }
    
    return theme;
  } catch (error) {
    console.warn('خطأ في استرجاع الثيم:', error);
    return null;
  }
}

/**
 * تطبيق الثيم الفوري قبل تحميل React
 */
export function applyInstantTheme(): void {
  const pageType = getCurrentPageType();
  
  console.log('🔍 [applyInstantTheme] نوع الصفحة المكتشف:', pageType);
  
  // محاولة استرجاع الثيم المناسب
  let theme: UnifiedTheme | null = null;
  
  if (pageType === 'store' || pageType === 'admin') {
    // للمتاجر ولوحة التحكم، نحاول استرجاع ثيم المؤسسة أولاً
    theme = getStoredTheme('organization');
    
    // إذا لم نجد ثيم المؤسسة، نستخدم ثيم المتجر الافتراضي
    if (!theme) {
      theme = getStoredTheme('store') || DEFAULT_STORE_THEME;
    }
    
    console.log('🏪 [applyInstantTheme] تطبيق ثيم المتجر/لوحة التحكم');
  } else {
    // للموقع العام، نستخدم الثيم العام دائماً
    theme = DEFAULT_GLOBAL_THEME;
    console.log('🌐 [applyInstantTheme] تطبيق الثيم العام');
  }
  
  // تطبيق الثيم فوراً
  if (theme) {
    // تأكد من عدم وجود معرف مؤسسة للصفحات العامة
    if (pageType === 'global') {
      delete theme.organizationId;
      delete theme.subdomain;
    }
    
    applyThemeToDOM(theme);
  }
}

/**
 * تحديث ثيم المؤسسة
 */
export function updateOrganizationTheme(
  organizationId: string,
  settings: {
    theme_primary_color?: string;
    theme_secondary_color?: string;
    theme_mode?: 'light' | 'dark' | 'auto';
    custom_css?: string;
  }
): void {
  console.log('🔧 [updateOrganizationTheme] تحديث ثيم المؤسسة:', {
    organizationId,
    primary: settings.theme_primary_color,
    mode: settings.theme_mode
  });
  
  // تحويل theme_mode من 'auto' إلى 'system'
  let themeMode: 'light' | 'dark' | 'system' = 'light';
  if (settings.theme_mode === 'auto') {
    themeMode = 'system';
  } else if (settings.theme_mode === 'light' || settings.theme_mode === 'dark') {
    themeMode = settings.theme_mode;
  }

  const theme: UnifiedTheme = {
    primaryColor: settings.theme_primary_color || DEFAULT_STORE_THEME.primaryColor,
    secondaryColor: settings.theme_secondary_color || DEFAULT_STORE_THEME.secondaryColor,
    mode: themeMode,
    customCss: settings.custom_css || '',
    organizationId,
    lastUpdated: Date.now()
  };
  
  // حفظ وتطبيق الثيم
  saveTheme(theme, 'organization');
  applyThemeToDOM(theme);
  
  console.log('✅ [updateOrganizationTheme] اكتمل تحديث الثيم');
}

/**
 * تحديث الثيم العام
 */
export function updateGlobalTheme(
  primaryColor: string,
  secondaryColor: string,
  mode: 'light' | 'dark' | 'system'
): void {
  const theme: UnifiedTheme = {
    primaryColor,
    secondaryColor,
    mode,
    lastUpdated: Date.now()
  };
  
  saveTheme(theme, 'global');
  applyThemeToDOM(theme);
}

/**
 * الحصول على الثيم الحالي
 */
export function getCurrentTheme(): UnifiedTheme {
  const pageType = getCurrentPageType();
  
  if (pageType === 'store' || pageType === 'admin') {
    return getStoredTheme('organization') || 
           getStoredTheme('store') || 
           DEFAULT_STORE_THEME;
  } else {
    return getStoredTheme('global') || DEFAULT_GLOBAL_THEME;
  }
}

/**
 * مراقبة تغييرات النظام للوضع المظلم/الفاتح
 */
export function initializeSystemThemeListener(): void {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  const handleChange = () => {
    const currentTheme = getCurrentTheme();
    if (currentTheme.mode === 'system') {
      applyThemeToDOM(currentTheme);
    }
  };
  
  mediaQuery.addEventListener('change', handleChange);
  
  // تطبيق الثيم الأولي
  handleChange();
}

/**
 * تنظيف الثيمات القديمة
 */
export function cleanupOldThemes(): void {
  // إزالة الثيمات القديمة التي تزيد عن 30 يوم
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  
  ['global', 'store', 'organization'].forEach(type => {
    const theme = getStoredTheme(type as any);
    if (theme && theme.lastUpdated < thirtyDaysAgo) {
      const key = type === 'global' ? STORAGE_KEYS.GLOBAL_THEME :
                  type === 'store' ? STORAGE_KEYS.STORE_THEME :
                  STORAGE_KEYS.ORGANIZATION_THEME;
      localStorage.removeItem(key);
    }
  });
}

// تصدير الدوال الرئيسية
export default {
  applyInstantTheme,
  updateOrganizationTheme,
  updateGlobalTheme,
  getCurrentTheme,
  initializeSystemThemeListener,
  cleanupOldThemes
}; 