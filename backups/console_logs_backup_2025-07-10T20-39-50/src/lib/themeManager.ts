// نظام إدارة الثيمات الموحد - يحل مشكلة الوميض والتضارب
import { THEME_CONFIG, detectDomainType, getThemeStorageKey } from '@/config/theme-config';

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

// إضافة نظام console شامل للتتبع
const debugLog = (message: string, data?: any) => {
  console.log(`🎨 [ThemeManager] ${message}`, data || '');
};

// إضافة دالة console مخصصة لـ ThemeManager
const themeDebugLog = (message: string, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`🎨 [ThemeManager-Debug] ${message}`, data || '');
  }
};

// الألوان الافتراضية للموقع العام
const DEFAULT_GLOBAL_THEME: UnifiedTheme = {
  primaryColor: THEME_CONFIG.DEFAULT_GLOBAL_COLORS.primary,
  secondaryColor: THEME_CONFIG.DEFAULT_GLOBAL_COLORS.secondary,
  mode: 'light',
  lastUpdated: Date.now()
};

// الألوان الافتراضية للمتاجر
const DEFAULT_STORE_THEME: UnifiedTheme = {
  primaryColor: THEME_CONFIG.DEFAULT_STORE_COLORS.primary,
  secondaryColor: THEME_CONFIG.DEFAULT_STORE_COLORS.secondary,
  mode: 'light',
  lastUpdated: Date.now()
};

// استخدام مفاتيح التخزين من التكوين
const STORAGE_KEYS = THEME_CONFIG.STORAGE_KEYS;

/**
 * تحويل لون HEX إلى صيغة HSL
 */
function hexToHSL(hex: string): string {
  // إزالة # في حال وجودها
  hex = hex.replace(/^#/, '');
  
  // التحقق من صحة اللون
  if (!/^[0-9A-F]{6}$/i.test(hex)) {
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
 * إرجاع اللون الطبيعي بدون تخفيف أو تعديل
 * (تم تعطيل التخفيف للحفاظ على اللون الأصلي)
 */
function createSoftenedColor(hslColor: string): string {
  // إرجاع اللون كما هو بدون أي تعديل
  return hslColor;
}

/**
 * تطبيق الثيم على العناصر في الصفحة
 */
function applyThemeToDOM(theme: UnifiedTheme): void {
  const currentTime = Date.now();
  
  console.log('🎨 [applyThemeToDOM] === بدء تطبيق الثيم على DOM ===', {
    primaryColor: theme.primaryColor,
    secondaryColor: theme.secondaryColor,
    mode: theme.mode,
    organizationId: theme.organizationId,
    timestamp: new Date().toISOString(),
    currentAppliedTheme,
    lastThemeApplicationTime: new Date(lastThemeApplicationTime).toISOString()
  });
  
  // إنشاء مفتاح للثيم الحالي
  const themeKey = `${theme.primaryColor}-${theme.secondaryColor}-${theme.mode}-${theme.organizationId || 'global'}`;
  console.log('🎨 [applyThemeToDOM] مفتاح الثيم:', themeKey);

  // تجنب تطبيق الثيم نفسه مرة أخرى
  if (currentAppliedTheme === themeKey) {
    console.log('🎨 [applyThemeToDOM] ❌ تم تجاهل تطبيق الثيم - نفس الثيم مطبق مسبقاً', { themeKey });
    return;
  }
  
  // منع التطبيق المتكرر خلال فترة قصيرة
  if (currentTime - lastThemeApplicationTime < THEME_APPLICATION_DEBOUNCE) {
    console.log('🎨 [applyThemeToDOM] ❌ تم تجاهل تطبيق الثيم - تم التطبيق مؤخراً', { 
      timeSinceLastApplication: currentTime - lastThemeApplicationTime,
      debounceTime: THEME_APPLICATION_DEBOUNCE
    });
    return;
  }
  
  // تحديث وقت آخر تطبيق
  lastThemeApplicationTime = currentTime;
  console.log('🎨 [applyThemeToDOM] تم تحديث وقت آخر تطبيق');
  
  // التحقق من نوع الصفحة
  const pageType = getCurrentPageType();
  console.log('🎨 [applyThemeToDOM] نوع الصفحة المكتشف:', pageType);

  // إذا كانت الصفحة العامة، نستخدم الثيم العام دائماً
  // لكن فقط إذا لم يكن هناك معرف مؤسسة
  if (pageType === 'global' && !theme.organizationId) {
    const globalTheme = getStoredTheme('global') || DEFAULT_GLOBAL_THEME;
    theme = globalTheme;
    console.log('🎨 [applyThemeToDOM] تطبيق الثيم العام:', theme);
  } else if (pageType === 'store' && theme.organizationId) {
    console.log('🎨 [applyThemeToDOM] تطبيق ثيم المتجر للمؤسسة:', theme.organizationId);
  }

  // حفظ مفتاح الثيم الحالي
  const oldAppliedTheme = currentAppliedTheme;
  currentAppliedTheme = themeKey;
  console.log('🎨 [applyThemeToDOM] تم تعيين مفتاح الثيم الحالي من', oldAppliedTheme, 'إلى', themeKey);
  
  const root = document.documentElement;

  // تطبيق اللون الأساسي
  if (theme.primaryColor) {
    console.log('🎨 [applyThemeToDOM] بدء تطبيق اللون الأساسي:', theme.primaryColor);
    
    const primaryHSL = isHSLColor(theme.primaryColor) 
      ? theme.primaryColor 
      : hexToHSL(theme.primaryColor);

    console.log('🎨 [applyThemeToDOM] اللون الأساسي بصيغة HSL:', primaryHSL);

    // تطبيق اللون الأساسي على جميع العناصر الممكنة
    const elementsToUpdate = [root, document.body];
    
    // استخدام اللون الطبيعي بدون تخفيف أو تعديل
    // تطبيق اللون الأساسي مع !important لضمان الأولوية
    elementsToUpdate.forEach((element, index) => {
      console.log(`🎨 [applyThemeToDOM] تطبيق اللون الأساسي على العنصر ${index + 1}`, {
        element: element.tagName,
        naturalColor: primaryHSL
      });
      
      // استخدام اللون الطبيعي بدون أي تعديل
      element.style.setProperty('--primary', primaryHSL, 'important');
      element.style.setProperty('--ring', primaryHSL, 'important');
      element.style.setProperty('--sidebar-primary', primaryHSL, 'important');
      element.style.setProperty('--sidebar-ring', primaryHSL, 'important');
      
      // الاحتفاظ باللون الأصلي للاستخدامات الخاصة
      element.style.setProperty('--primary-vibrant', primaryHSL, 'important');
      
      // فحص ما إذا تم تطبيق اللون فعلاً
      const appliedColor = element.style.getPropertyValue('--primary');
      console.log(`🎨 [applyThemeToDOM] تم تطبيق اللون على ${element.tagName}:`, appliedColor);
    });
    
    console.log('🎨 [applyThemeToDOM] ✅ تم الانتهاء من تطبيق اللون الأساسي');
  } else {
    console.log('🎨 [applyThemeToDOM] ❌ لا يوجد لون أساسي لتطبيقه');
  }
  
  // تطبيق اللون الثانوي
  if (theme.secondaryColor) {
    console.log('🎨 [applyThemeToDOM] بدء تطبيق اللون الثانوي:', theme.secondaryColor);
    
    const secondaryHSL = isHSLColor(theme.secondaryColor) 
      ? theme.secondaryColor 
      : hexToHSL(theme.secondaryColor);

    console.log('🎨 [applyThemeToDOM] اللون الثانوي بصيغة HSL:', secondaryHSL);

    const elementsToUpdate = [root, document.body];
    elementsToUpdate.forEach(element => {
      element.style.setProperty('--secondary', secondaryHSL, 'important');
      element.style.setProperty('--secondary-foreground', '0 0% 100%', 'important');
    });
    
    console.log('🎨 [applyThemeToDOM] ✅ تم تطبيق اللون الثانوي على متغيرات CSS');
  }
  
  // تطبيق وضع المظهر
  root.classList.remove('light', 'dark');
  document.body.classList.remove('light', 'dark');
  
  let effectiveMode = theme.mode;
  if (theme.mode === 'system') {
    effectiveMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  console.log('🎨 [applyThemeToDOM] تطبيق وضع المظهر:', { mode: theme.mode, effectiveMode });

  // إضافة الفئة الجديدة مع التأكد من عدم فقدانها
  root.classList.add(effectiveMode);
  document.body.classList.add(effectiveMode);
  
  // تعيين data attribute كنسخة احتياطية
  root.setAttribute('data-theme', effectiveMode);
  document.body.setAttribute('data-theme', effectiveMode);
  
  // تحديث color-scheme للمتصفح
  document.body.style.colorScheme = effectiveMode;
  root.style.colorScheme = effectiveMode;
  
  console.log('🎨 [applyThemeToDOM] ✅ تم تطبيق وضع المظهر بنجاح');
  
  // تطبيق CSS المخصص
  if (theme.customCss) {
    console.log('🎨 [applyThemeToDOM] تطبيق CSS المخصص');
    
    const styleId = 'bazaar-unified-custom-css';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = theme.customCss;
    console.log('🎨 [applyThemeToDOM] ✅ تم تطبيق CSS المخصص بنجاح');
  }
  
  // تنظيف الأنماط المتضاربة أولاً
  setTimeout(() => {
    console.log('🧹 [applyThemeToDOM] تنظيف الأنماط المتضاربة قبل التحديث');
    
    // إزالة جميع الأنماط المباشرة المتعلقة بالألوان
    const elementsWithInlineColors = document.querySelectorAll('[style*="background-color"], [style*="color"]:not([style*="color-scheme"])');
    elementsWithInlineColors.forEach((el) => {
      const element = el as HTMLElement;
      element.style.removeProperty('background-color');
      element.style.removeProperty('color');
      element.style.removeProperty('border-color');
    });
    
    // إجبار تحديث العناصر التي تستخدم الألوان الأساسية
    const elementsWithPrimary = document.querySelectorAll('[class*="bg-primary"], [class*="text-primary"], [class*="border-primary"], [class*="hover:bg-primary"], [class*="focus:bg-primary"]');
    console.log('🧹 [applyThemeToDOM] عدد العناصر التي تستخدم الألوان الأساسية:', elementsWithPrimary.length);
    
    elementsWithPrimary.forEach((el, index) => {
      const element = el as HTMLElement;
      // تنظيف أي أنماط مباشرة أولاً
      element.style.removeProperty('background-color');
      element.style.removeProperty('color');
      element.style.removeProperty('border-color');
      
      // إجبار إعادة رسم العنصر
      element.style.opacity = '0.99';
      element.style.transform = 'translateZ(0)';
      requestAnimationFrame(() => {
        element.style.opacity = '';
        element.style.transform = '';
        // إجبار إعادة حساب الأنماط
        element.offsetHeight;
      });
      
      if (index < 5) { // تسجيل أول 5 عناصر فقط لتجنب الإفراط في الرسائل
        console.log(`🧹 [applyThemeToDOM] تحديث العنصر ${index + 1}:`, {
          tagName: element.tagName,
          className: element.className,
          computedStyle: window.getComputedStyle(element).backgroundColor
        });
    }
    });
    
    console.log('🧹 [applyThemeToDOM] ✅ تم تنظيف وتحديث العناصر');
  }, 100);
  
  // إضافة تحديث إضافي بعد فترة أطول للتأكد من التطبيق
  setTimeout(() => {
    console.log('🔄 [applyThemeToDOM] تطبيق تحديث إضافي للألوان');
    forceCompleteColorUpdate(theme);
  }, 500);
  
  console.log('🎨 [applyThemeToDOM] === تم الانتهاء من تطبيق الثيم على DOM بنجاح ===');
}

/**
 * إجبار تحديث كامل للألوان في الصفحة
 */
function forceCompleteColorUpdate(theme: UnifiedTheme): void {
  console.log('🔄 [Force Update] بدء تحديث كامل للألوان');
  
  const root = document.documentElement;
  
  // إعادة تطبيق الألوان بقوة
    if (theme.primaryColor) {
    const primaryHSL = isHSLColor(theme.primaryColor) 
      ? theme.primaryColor 
      : hexToHSL(theme.primaryColor);
    
    root.style.setProperty('--primary', primaryHSL, 'important');
    root.style.setProperty('--ring', primaryHSL, 'important');
    root.style.setProperty('--sidebar-primary', primaryHSL, 'important');
    root.style.setProperty('--sidebar-ring', primaryHSL, 'important');
    
    console.log('🔄 [Force Update] إعادة تطبيق اللون الأساسي:', primaryHSL);
    }
    
    if (theme.secondaryColor) {
    const secondaryHSL = isHSLColor(theme.secondaryColor) 
      ? theme.secondaryColor 
      : hexToHSL(theme.secondaryColor);
    
    root.style.setProperty('--secondary', secondaryHSL, 'important');
    root.style.setProperty('--secondary-foreground', '0 0% 100%', 'important');
    
    console.log('🔄 [Force Update] إعادة تطبيق اللون الثانوي:', secondaryHSL);
  }
  
  // إجبار تحديث جميع العناصر التي تستخدم الألوان
  const allColorElements = document.querySelectorAll('*[class*="primary"], *[class*="secondary"]');
  console.log('🔄 [Force Update] عدد العناصر للتحديث:', allColorElements.length);
  
  allColorElements.forEach((el) => {
    const element = el as HTMLElement;
    element.style.willChange = 'auto';
    element.offsetHeight; // إجبار reflow
    element.style.willChange = '';
  });
  
  // إضافة فئة مؤقتة لإجبار إعادة التطبيق
  document.body.classList.add('force-theme-update');
  requestAnimationFrame(() => {
    document.body.classList.remove('force-theme-update');
    console.log('🔄 [Force Update] ✅ تم انتهاء التحديث الكامل للألوان');
  });
}

/**
 * تحويل HSL إلى RGB
 */
function hslToRgb(h: number, s: number, l: number): { r: number, g: number, b: number } {
  s /= 100;
  l /= 100;
  
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  
  let r = 0, g = 0, b = 0;
  
  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }
  
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  };
}

/**
 * الحصول على معرف المؤسسة من التخزين المحلي أو النطاق
 */
function getOrganizationIdSync(): string | null {
  // محاولة الحصول على معرف المؤسسة من URL أولاً
  const urlOrgId = getOrgIdFromUrl();
  if (urlOrgId) {
    debugLog('تم العثور على معرف المؤسسة من URL:', urlOrgId);
    // حفظ المعرف الصحيح في localStorage
    localStorage.setItem(THEME_CONFIG.STORAGE_KEYS.ORGANIZATION_ID, urlOrgId);
    return urlOrgId;
  }

  // محاولة الحصول على معرف المؤسسة من React Context
  const contextOrgId = getOrgIdFromContext();
  if (contextOrgId) {
    debugLog('تم العثور على معرف المؤسسة من Context:', contextOrgId);
    // حفظ المعرف الصحيح في localStorage
    localStorage.setItem(THEME_CONFIG.STORAGE_KEYS.ORGANIZATION_ID, contextOrgId);
    return contextOrgId;
  }

  // التحقق من التخزين المحلي
  const storedOrgId = localStorage.getItem(THEME_CONFIG.STORAGE_KEYS.ORGANIZATION_ID);
  if (storedOrgId) {
    debugLog('تم العثور على معرف المؤسسة من localStorage:', storedOrgId);
    return storedOrgId;
  }
  
  // محاولة استخراج من النطاق
  const hostname = window.location.hostname;
  const domainInfo = detectDomainType(hostname);

  if (domainInfo.type === 'store' && domainInfo.subdomain) {
    // حفظ النطاق الفرعي للاستخدام لاحقاً
    localStorage.setItem(THEME_CONFIG.STORAGE_KEYS.CURRENT_SUBDOMAIN, domainInfo.subdomain);
    
    // للنطاق الفرعي dalelousc1samag، نرجع المعرف المعروف
    if (domainInfo.subdomain === 'dalelousc1samag') {
      const orgId = 'b87869bc-a69e-4310-a67a-81c2ab927faf';
      // حفظ المعرف في التخزين المحلي للمرات القادمة
      localStorage.setItem(THEME_CONFIG.STORAGE_KEYS.ORGANIZATION_ID, orgId);
      return orgId;
    }
    
    return null; // سنحتاج لجلب معرف المؤسسة لاحقاً
  }
  
  return null;
}

/**
 * محاولة الحصول على معرف المؤسسة من URL
 */
function getOrgIdFromUrl(): string | null {
  const pathname = window.location.pathname;
  
  // البحث عن patterns مختلفة في URL
  const patterns = [
    /\/dashboard\/([a-f0-9-]{36})/i,
    /\/admin\/([a-f0-9-]{36})/i,
    /\/org\/([a-f0-9-]{36})/i,
    /\/organization\/([a-f0-9-]{36})/i
  ];
  
  for (const pattern of patterns) {
    const match = pathname.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  // التحقق من query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const orgFromQuery = urlParams.get('org') || urlParams.get('organization') || urlParams.get('orgId');
  if (orgFromQuery && /^[a-f0-9-]{36}$/i.test(orgFromQuery)) {
    return orgFromQuery;
  }
  
  return null;
}

/**
 * محاولة الحصول على معرف المؤسسة من React Context عبر window object
 */
function getOrgIdFromContext(): string | null {
  try {
    // محاولة الوصول إلى Context عبر window object إذا كان متاحاً
    if (typeof window !== 'undefined') {
      // البحث عن معرف المؤسسة في DOM elements التي قد تحتوي على البيانات
      const appRoot = document.getElementById('root');
      if (appRoot) {
        const orgIdAttr = appRoot.getAttribute('data-organization-id');
        if (orgIdAttr && /^[a-f0-9-]{36}$/i.test(orgIdAttr)) {
          return orgIdAttr;
        }
      }
      
      // البحث في meta tags
      const metaOrgId = document.querySelector('meta[name="organization-id"]');
      if (metaOrgId) {
        const content = metaOrgId.getAttribute('content');
        if (content && /^[a-f0-9-]{36}$/i.test(content)) {
          return content;
        }
      }
      
      // محاولة الوصول عبر global variables إذا كانت متاحة
      if ((window as any).bazaarOrganizationId) {
        const orgId = (window as any).bazaarOrganizationId;
        if (typeof orgId === 'string' && /^[a-f0-9-]{36}$/i.test(orgId)) {
          return orgId;
        }
      }
    }
  } catch (error) {
    debugLog('خطأ في الحصول على معرف المؤسسة من Context:', error);
  }
  
  return null;
}

/**
 * تنظيف localStorage من البيانات القديمة أو الخاطئة
 */
function cleanupInvalidThemeData(currentOrgId: string | null): void {
  debugLog('بدء تنظيف localStorage من البيانات الخاطئة');
  
  try {
    // الحصول على جميع مفاتيح localStorage
    const keys = Object.keys(localStorage);
    
    // تنظيف الثيمات القديمة للمؤسسات الأخرى
    keys.forEach(key => {
      if (key.startsWith('org_theme_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          
          // إذا كان معرف المؤسسة مختلف عن الحالي، احذف البيانات
          if (data.organizationId && currentOrgId && data.organizationId !== currentOrgId) {
            debugLog('حذف ثيم مؤسسة قديمة:', { key, oldOrgId: data.organizationId, currentOrgId });
            localStorage.removeItem(key);
          }
        } catch (e) {
          // إذا كانت البيانات تالفة، احذفها
          localStorage.removeItem(key);
        }
      }
    });
    
    // تنظيف معرف المؤسسة المحفوظ إذا كان مختلف
    const storedOrgId = localStorage.getItem(THEME_CONFIG.STORAGE_KEYS.ORGANIZATION_ID);
    if (storedOrgId && currentOrgId && storedOrgId !== currentOrgId) {
      debugLog('تحديث معرف المؤسسة المحفوظ:', { من: storedOrgId, إلى: currentOrgId });
      localStorage.setItem(THEME_CONFIG.STORAGE_KEYS.ORGANIZATION_ID, currentOrgId);
    }
    
    debugLog('تم الانتهاء من تنظيف localStorage');
  } catch (error) {
    debugLog('خطأ في تنظيف localStorage:', error);
  }
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
  
  // استخدام دالة التحقق الجديدة من التكوين
  const domainInfo = detectDomainType(hostname);
  if (domainInfo.type === 'store') {
    return 'store';
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
      const hostKey = getThemeStorageKey(hostname);
      
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
    
  } catch (error) {
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
    return null;
  }
}

// متغير لتتبع آخر تطبيق للثيم وcache للثيم الحالي
let lastThemeApplication = 0;
// متغير لتتبع الثيم المطبق حالياً لتجنب التكرار - محسن
let currentAppliedTheme: string | null = null;
let lastThemeApplicationTime = 0;
const THEME_APPLICATION_DEBOUNCE = 500; // تأخير نصف ثانية بين التطبيقات
const THEME_THROTTLE_MS = 500; // تقليل المدة إلى 500ms

/**
 * تطبيق الثيم الفوري قبل تحميل React
 */
export function applyInstantTheme(): void {
  // تجنب التطبيق المتكرر
  const now = Date.now();
  if (now - lastThemeApplication < THEME_THROTTLE_MS) {
    console.log('🎨 [applyInstantTheme] ❌ تم تجاهل التطبيق الفوري - تم التطبيق مؤخراً');
    return;
  }
  
  const pageType = getCurrentPageType();
  console.log('🎨 [applyInstantTheme] === بدء التطبيق الفوري للثيم ===', { 
    pageType, 
    timestamp: new Date().toISOString(),
    hostname: window.location.hostname,
    pathname: window.location.pathname
  });

  lastThemeApplication = now;
  
  // 🚀 أولاً: محاولة الحصول على الثيم من AppInitializer
  let theme: UnifiedTheme | null = null;
  
  console.log('🎨 [applyInstantTheme] محاولة الحصول على الثيم من AppInitializer...');
  try {
    const appInitData = localStorage.getItem('bazaar_app_init_data');
    console.log('🎨 [applyInstantTheme] بيانات AppInitializer:', appInitData ? 'موجودة' : 'غير موجودة');
    
    if (appInitData) {
      const parsedData = JSON.parse(appInitData);
      console.log('🎨 [applyInstantTheme] بيانات AppInitializer المحللة:', {
        hasOrganization: !!parsedData.organization,
        organizationId: parsedData.organization?.id,
        theme: parsedData.theme
      });
      
      if (parsedData.theme && parsedData.organization?.id) {
        theme = {
          primaryColor: parsedData.theme.primaryColor,
          secondaryColor: parsedData.theme.secondaryColor,
          mode: parsedData.theme.mode,
          organizationId: parsedData.organization.id,
          lastUpdated: Date.now()
        };
        console.log('🎨 [applyInstantTheme] ✅ تم الحصول على الثيم من AppInitializer:', theme);
      }
    }
  } catch (e) {
    console.log('🎨 [applyInstantTheme] ❌ خطأ في تحليل بيانات AppInitializer:', e);
  }

  // 🚀 ثانياً: محاولة الحصول على الثيم من الإعدادات المحفوظة
  if (!theme) {
    console.log('🎨 [applyInstantTheme] محاولة الحصول على الثيم من الإعدادات المحفوظة...');
    
    const organizationId = localStorage.getItem('bazaar_organization_id');
    console.log('🎨 [applyInstantTheme] معرف المؤسسة المحفوظ:', organizationId || 'غير موجود');
    
    if (organizationId) {
      // محاولة الحصول على الثيم المحفوظ للمؤسسة
      const savedOrgTheme = getStoredTheme('organization');
      console.log('🎨 [applyInstantTheme] الثيم المحفوظ للمؤسسة:', savedOrgTheme || 'غير موجود');
      
      if (savedOrgTheme && savedOrgTheme.organizationId === organizationId) {
        theme = savedOrgTheme;
        console.log('🎨 [applyInstantTheme] ✅ تم الحصول على الثيم من الإعدادات المحفوظة:', theme);
      } else {
        // محاولة الحصول على إعدادات المؤسسة من localStorage
        const savedOrgData = localStorage.getItem('current_organization');
        console.log('🎨 [applyInstantTheme] بيانات المؤسسة المحفوظة:', savedOrgData ? 'موجودة' : 'غير موجودة');
        
        if (savedOrgData) {
          try {
            const orgData = JSON.parse(savedOrgData);
            console.log('🎨 [applyInstantTheme] إعدادات المؤسسة المحفوظة:', {
              organizationId: orgData.id,
              primaryColor: orgData.settings?.theme_primary_color,
              secondaryColor: orgData.settings?.theme_secondary_color,
              mode: orgData.settings?.theme_mode
            });
            
            if (orgData.settings?.theme_primary_color || orgData.settings?.theme_secondary_color) {
              theme = {
                primaryColor: orgData.settings.theme_primary_color || DEFAULT_STORE_THEME.primaryColor,
                secondaryColor: orgData.settings.theme_secondary_color || DEFAULT_STORE_THEME.secondaryColor,
                mode: orgData.settings.theme_mode === 'auto' ? 'system' : (orgData.settings.theme_mode || 'light'),
                organizationId: orgData.id,
                lastUpdated: Date.now()
              };
              console.log('🎨 [applyInstantTheme] ✅ تم بناء الثيم من بيانات المؤسسة المحفوظة:', theme);
            }
          } catch (e) {
            console.log('🎨 [applyInstantTheme] ❌ خطأ في تحليل بيانات المؤسسة:', e);
          }
        }
      }
    }
  }

  // 🚀 ثالثاً: استخدام الثيم الافتراضي إذا لم نجد شيئاً
  if (!theme) {
    console.log('🎨 [applyInstantTheme] لم يتم العثور على ثيم، استخدام الثيم الافتراضي');
    theme = { ...DEFAULT_STORE_THEME };
  }
  
  // إذا وجدنا ثيم من AppInitializer، نطبقه مباشرة
  if (theme) {
    console.log('🎨 [applyInstantTheme] تطبيق الثيم من AppInitializer مباشرة:', theme);
    applyThemeToDOM(theme);
    saveTheme(theme, 'organization');
    console.log('🎨 [applyInstantTheme] === انتهاء التطبيق الفوري للثيم من AppInitializer ===');
    return;
  }
  
  // إذا لم نجد ثيم من AppInitializer، نتابع بالطريقة العادية
  console.log('🎨 [applyInstantTheme] لم يتم العثور على ثيم في AppInitializer، المتابعة بالطريقة العادية');
  
  if (pageType === 'store' || pageType === 'admin') {
    // للمتاجر ولوحة التحكم، نحاول استرجاع ثيم المؤسسة أولاً
    const orgId = getOrganizationIdSync();
    console.log('🎨 [applyInstantTheme] معرف المؤسسة المكتشف:', orgId);
    
    // تنظيف localStorage من البيانات الخاطئة
    cleanupInvalidThemeData(orgId);
    
    // محاولة استرجاع ثيم المؤسسة من التخزين المحلي باستخدام hostname
    const hostname = window.location.hostname;
    const hostKey = getThemeStorageKey(hostname);
    const storedHostTheme = localStorage.getItem(hostKey);
    
    console.log('🎨 [applyInstantTheme] البحث عن ثيم hostname:', { hostname, hostKey, hasStoredTheme: !!storedHostTheme });
    
    if (storedHostTheme) {
      try {
        const hostThemeData = JSON.parse(storedHostTheme);
        theme = {
          primaryColor: hostThemeData.primaryColor || DEFAULT_STORE_THEME.primaryColor,
          secondaryColor: hostThemeData.secondaryColor || DEFAULT_STORE_THEME.secondaryColor,
          mode: hostThemeData.mode || 'light',
          customCss: hostThemeData.customCss,
          organizationId: hostThemeData.organizationId || orgId,
          lastUpdated: hostThemeData.timestamp || Date.now()
        };
        console.log('🎨 [applyInstantTheme] ✅ تم العثور على ثيم من hostname:', theme);
      } catch (e) {
        console.log('🎨 [applyInstantTheme] ❌ خطأ في قراءة ثيم hostname:', e);
      }
    }
    
    // Try to get theme from localStorage using organization ID
    if (!theme && orgId) {
      const orgThemeKey = STORAGE_KEYS.ORGANIZATION_THEME;
      const storedOrgTheme = localStorage.getItem(orgThemeKey);
      console.log('🎨 [applyInstantTheme] البحث عن ثيم المؤسسة:', { orgThemeKey, hasStoredOrgTheme: !!storedOrgTheme });
      
      if (storedOrgTheme) {
        try {
          theme = JSON.parse(storedOrgTheme);
          console.log('🎨 [applyInstantTheme] ✅ تم العثور على ثيم المؤسسة من localStorage:', theme);
        } catch (e) {
          console.log('🎨 [applyInstantTheme] ❌ خطأ في قراءة ثيم المؤسسة:', e);
        }
      }
    }
    
    // إذا لم نجد ثيم المؤسسة، نحاول استرجاعه من قاعدة البيانات
    if (!theme) {
      console.log('🎨 [applyInstantTheme] لم يتم العثور على ثيم محفوظ، استخدام الثيم الافتراضي');
      
        // للنطاق الفرعي المعروف، نطبق الثيم الصحيح مباشرة
        if (orgId === 'b87869bc-a69e-4310-a67a-81c2ab927faf') {
          theme = {
            primaryColor: '#fb923c',
            secondaryColor: '#6c757d',
            mode: 'light',
            organizationId: orgId,
            lastUpdated: Date.now()
          };
        console.log('🎨 [applyInstantTheme] تطبيق ثيم خاص للمؤسسة المعروفة');
        } else {
        // للمؤسسات الأخرى، استخدم الثيم الافتراضي بدون ألوان محددة
        // سيتم تحديثه لاحقاً عند جلب البيانات من قاعدة البيانات
          theme = {
          primaryColor: '#6366f1', // لون محايد
          secondaryColor: '#8b5cf6', // لون محايد
          mode: 'light',
          organizationId: orgId,
          lastUpdated: Date.now()
          };
        console.log('🎨 [applyInstantTheme] استخدام ثيم افتراضي مؤقت');
      }
    }
    
    // Ensure organizationId is set for store pages
    if (!theme.organizationId && orgId) {
      theme.organizationId = orgId;
      console.log('🎨 [applyInstantTheme] تم تعيين معرف المؤسسة للثيم:', orgId);
    }
    
  } else {
    // للموقع العام، نستخدم الثيم العام دائماً
    theme = DEFAULT_GLOBAL_THEME;
    console.log('🎨 [applyInstantTheme] استخدام الثيم العام');
  }
  
  // تطبيق الثيم فوراً
  if (theme) {
    // تأكد من عدم وجود معرف مؤسسة للصفحات العامة
    if (pageType === 'global') {
      delete theme.organizationId;
      delete theme.subdomain;
      console.log('🎨 [applyInstantTheme] تم إزالة معرف المؤسسة للصفحة العامة');
    }

    console.log('🎨 [applyInstantTheme] تطبيق الثيم الفوري:', theme);
    applyThemeToDOM(theme);
    
    // حفظ الثيم في التخزين المحلي للاستخدام المستقبلي
    if (theme.organizationId) {
      saveTheme(theme, 'organization');
      console.log('🎨 [applyInstantTheme] تم حفظ الثيم في التخزين المحلي');
    }
  } else {
    console.log('🎨 [applyInstantTheme] ❌ لم يتم العثور على ثيم لتطبيقه');
  }
  
  console.log('🎨 [applyInstantTheme] === انتهاء التطبيق الفوري للثيم ===');
}

/**
 * تحديث ثيم المؤسسة بناءً على الإعدادات
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
  console.log('🎨 [updateOrganizationTheme] === بدء تحديث ثيم المؤسسة ===', {
    organizationId,
    settings: {
      primaryColor: settings.theme_primary_color,
      secondaryColor: settings.theme_secondary_color,
      mode: settings.theme_mode
    },
    timestamp: new Date().toISOString(),
    currentAppliedTheme,
    lastThemeApplicationTime: new Date(lastThemeApplicationTime).toISOString()
  });
  
  // تحويل theme_mode من 'auto' إلى 'system'
  let themeMode: 'light' | 'dark' | 'system' = 'light';
  if (settings.theme_mode === 'auto') {
    themeMode = 'system';
    console.log('🎨 [updateOrganizationTheme] تم تحويل وضع auto إلى system');
  } else if (settings.theme_mode === 'light' || settings.theme_mode === 'dark') {
    themeMode = settings.theme_mode;
    console.log('🎨 [updateOrganizationTheme] تم تطبيق الوضع:', themeMode);
  }

  const theme: UnifiedTheme = {
    primaryColor: settings.theme_primary_color || DEFAULT_STORE_THEME.primaryColor,
    secondaryColor: settings.theme_secondary_color || DEFAULT_STORE_THEME.secondaryColor,
    mode: themeMode,
    customCss: settings.custom_css || '',
    organizationId,
    lastUpdated: Date.now()
  };

  console.log('🎨 [updateOrganizationTheme] الثيم المُكوَّن:', theme);

  // فحص إذا كان الثيم نفسه مطبق بالفعل
  const currentThemeKey = `${theme.primaryColor}-${theme.secondaryColor}-${theme.mode}-${theme.organizationId}`;
  console.log('🎨 [updateOrganizationTheme] مفتاح الثيم الجديد:', currentThemeKey);
  console.log('🎨 [updateOrganizationTheme] مفتاح الثيم الحالي:', currentAppliedTheme);
  
  if (currentAppliedTheme === currentThemeKey) {
    console.log('🎨 [updateOrganizationTheme] ❌ تم تجاهل تحديث الثيم - نفس الثيم مطبق بالفعل');
    return;
  }

  console.log('🎨 [updateOrganizationTheme] ✅ الثيم مختلف، سيتم التطبيق');
  
  // حفظ الثيم في التخزين المحلي
  saveTheme(theme, 'organization');
  console.log('🎨 [updateOrganizationTheme] ✅ تم حفظ الثيم في التخزين المحلي');
  
  // إعادة تعيين متغير التطبيق لضمان التطبيق
  const oldAppliedTheme = currentAppliedTheme;
  currentAppliedTheme = null;
  console.log('🎨 [updateOrganizationTheme] تم إعادة تعيين متغير التطبيق من', oldAppliedTheme, 'إلى null');
  
  // تطبيق الثيم فوراً مع إجبار التحديث
  console.log('🎨 [updateOrganizationTheme] بدء تطبيق الثيم عبر forceColorUpdate');
  forceColorUpdate(theme);
  
  console.log('🎨 [updateOrganizationTheme] === انتهاء تحديث ثيم المؤسسة ===');
}

/**
 * إجبار تطبيق الألوان على جميع العناصر
 */
function forceColorUpdate(theme: UnifiedTheme): void {
  console.log('🎨 [forceColorUpdate] === بدء إجبار تطبيق الألوان ===', {
    theme: {
      primaryColor: theme.primaryColor,
      organizationId: theme.organizationId,
      mode: theme.mode
    },
    timestamp: new Date().toISOString()
  });
  
  // إزالة أي CSS override سابق
  const existingOverride = document.getElementById('bazaar-org-theme-override');
  if (existingOverride) {
    console.log('🎨 [forceColorUpdate] إزالة CSS override موجود مسبقاً');
    existingOverride.remove();
  } else {
    console.log('🎨 [forceColorUpdate] لا يوجد CSS override سابق');
  }
  
  // إعادة تطبيق الثيم
  console.log('🎨 [forceColorUpdate] بدء تطبيق الثيم بعد 50ms');
  setTimeout(() => {
    console.log('🎨 [forceColorUpdate] تطبيق الثيم على DOM الآن');
    applyThemeToDOM(theme);
  
    // فرض تحديث جميع العناصر التي تستخدم الألوان
    const elementsToUpdate = document.querySelectorAll(`
      [class*="bg-primary"], 
      [class*="text-primary"], 
      [class*="border-primary"],
      [class*="bg-secondary"], 
      [class*="text-secondary"], 
      [class*="bg-accent"], 
      [class*="text-accent"],
      .btn-primary,
      .button-primary,
      [class*="btn-primary"],
      [class*="button-primary"]
    `);
    
    console.log('🎨 [forceColorUpdate] عدد العناصر المحدثة:', elementsToUpdate.length);
    
    if (elementsToUpdate.length === 0) {
      console.log('🎨 [forceColorUpdate] ⚠️ لم يتم العثور على عناصر تحتوي على ألوان أساسية');
    }
    
    elementsToUpdate.forEach((el, index) => {
      const element = el as HTMLElement;
      
      // فرض إعادة حساب الأنماط
      element.style.opacity = '0.99';
      requestAnimationFrame(() => {
        element.style.opacity = '';
        
        // إزالة أي تطبيق مباشر للألوان - نترك CSS يتولى الأمر
        element.style.removeProperty('background-color');
        element.style.removeProperty('color');
        element.style.removeProperty('border-color');
      });
      
      if (index < 3) {
        console.log(`🎨 [forceColorUpdate] تحديث العنصر ${index + 1}:`, {
          tagName: element.tagName,
          className: element.className,
          computedStyles: {
            backgroundColor: window.getComputedStyle(element).backgroundColor,
            color: window.getComputedStyle(element).color
          }
        });
      }
    });
    
    console.log('🎨 [forceColorUpdate] === انتهاء إجبار تطبيق الألوان ===');
  }, 50);
  
  // 🔄 إعادة المحاولة إذا لم تكن العناصر جاهزة بعد - خارج setTimeout
  const elementsToUpdate = document.querySelectorAll(`
    [class*="bg-primary"], 
    [class*="text-primary"], 
    [class*="border-primary"],
    [class*="bg-secondary"], 
    [class*="text-secondary"], 
    [class*="bg-accent"], 
    [class*="text-accent"],
    .btn-primary,
    .button-primary,
    [class*="btn-primary"],
    [class*="button-primary"]
  `);
  
  if (elementsToUpdate.length === 0) {
    console.log('🔄 [forceColorUpdate] إعادة المحاولة بعد ثانية واحدة...');
    
    setTimeout(() => {
      console.log('🔄 [forceColorUpdate] محاولة ثانية لتطبيق الثيم');
      // إعادة تطبيق الثيم مرة أخرى
      applyThemeToDOM(theme);
      
      // محاولة ثالثة بعد 3 ثوانٍ إذا لزم الأمر
      setTimeout(() => {
        console.log('🔄 [forceColorUpdate] محاولة ثالثة وأخيرة لتطبيق الثيم');
        applyThemeToDOM(theme);
      }, 3000);
    }, 1000);
  }
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

/**
 * إجبار تطبيق ثيم المؤسسة بناءً على البيانات المحملة
 * هذه الدالة تستخدم عند تحميل بيانات المتجر للتأكد من تطبيق الثيم الصحيح
 */
export function forceApplyOrganizationTheme(
  organizationId: string,
  settings: {
    theme_primary_color?: string;
    theme_secondary_color?: string;
    theme_mode?: 'light' | 'dark' | 'auto';
    custom_css?: string;
  },
  subdomain?: string
): void {
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
    subdomain,
    lastUpdated: Date.now()
  };
  
  // حفظ الثيم في التخزين المحلي
  saveTheme(theme, 'organization');
  
  // حفظ إضافي للنطاق المحدد
  if (subdomain) {
    localStorage.setItem('bazaar_current_subdomain', subdomain);
  }
  
  // إعادة تعيين متغير التطبيق لضمان التطبيق
  currentAppliedTheme = null;
  
  // تطبيق الثيم فوراً
  applyThemeToDOM(theme);
}

// تصدير الدوال الرئيسية
export default {
  applyInstantTheme,
  updateOrganizationTheme,
  updateGlobalTheme,
  getCurrentTheme,
  initializeSystemThemeListener,
  cleanupOldThemes,
  forceApplyOrganizationTheme
};

/**
 * تنظيف تضارب الأنماط وإصلاح مشاكل التطبيق المزدوج
 */
export function cleanupStyleConflicts(): void {
  
  // إزالة الأنماط المكررة والمتضاربة
  const duplicateStyles = document.querySelectorAll('style[id*="bazaar"], style[data-emotion], style[data-styled]');
  duplicateStyles.forEach((style, index) => {
    if (index > 0) { // احتفظ بالأول فقط
      style.remove();
    }
  });
  
  // تنظيف العناصر التي تحتوي على أنماط متضاربة
  const conflictedElements = document.querySelectorAll('[data-state="active"], [class*="data-"]');
  conflictedElements.forEach((el) => {
    const element = el as HTMLElement;
    
    // إزالة الأنماط المباشرة المتضاربة
    element.style.removeProperty('background-color');
    element.style.removeProperty('color');
    element.style.removeProperty('border-color');
    
    // إجبار إعادة حساب الأنماط
    element.offsetHeight;
  });
  
  // إزالة CSS variables المكررة
  const root = document.documentElement;
  const computedStyle = getComputedStyle(root);
  
  // فحص المتغيرات المكررة وتنظيفها
  const cssVariables = [
    '--primary', '--secondary', '--background', '--foreground',
    '--primary-foreground', '--secondary-foreground'
  ];
  
  cssVariables.forEach(variable => {
    const value = computedStyle.getPropertyValue(variable);
    if (value) {
      // إعادة تعيين القيمة لإزالة أي تكرار
      root.style.setProperty(variable, value.trim(), 'important');
    }
  });
  
}

/**
 * دالة لإصلاح مشاكل الألوان والأنماط يدوياً
 */
export function fixColorIssues(): void {
  
  // تنظيف التضاربات أولاً
  cleanupStyleConflicts();
  
  // الحصول على الثيم الحالي
  const currentTheme = getCurrentTheme();
  if (!currentTheme) {
    return;
  }

  // إعادة تطبيق الثيم بشكل نظيف
  setTimeout(() => {
    applyThemeToDOM(currentTheme);
    
    // تحديث إضافي بعد فترة قصيرة
    setTimeout(() => {
      forceCompleteColorUpdate(currentTheme);
    }, 300);
  }, 100);
}

/**
 * إزالة جميع الأنماط المباشرة من العناصر
 */
export function removeInlineStyles(): void {
  
  const elementsWithInlineStyles = document.querySelectorAll('[style]');
  let removedCount = 0;
  
  elementsWithInlineStyles.forEach((el) => {
    const element = el as HTMLElement;
    const style = element.getAttribute('style') || '';
    
    // إزالة الأنماط المتعلقة بالألوان فقط
    if (style.includes('background-color') || style.includes('color') || style.includes('border-color')) {
      element.style.removeProperty('background-color');
      element.style.removeProperty('color');
      element.style.removeProperty('border-color');
      removedCount++;
    }
  });

  // إجبار إعادة تطبيق الأنماط
  document.body.offsetHeight;
}

// إضافة الدوال إلى النافذة العالمية للاستخدام المباشر من وحدة التحكم
if (typeof window !== 'undefined') {
  (window as any).applyInstantTheme = applyInstantTheme;
  (window as any).fixColorIssues = fixColorIssues;
  (window as any).cleanupStyleConflicts = cleanupStyleConflicts;
  (window as any).removeInlineStyles = removeInlineStyles;
  (window as any).getBazaarTheme = getCurrentTheme;
  
}
