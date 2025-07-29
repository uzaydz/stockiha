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
  console.log(`🎨 [ThemeManager] ${message}`, data ? data : '');
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
 * تطبيق الثيم على العناصر في الصفحة
 */
function applyThemeToDOM(theme: UnifiedTheme): void {
  debugLog('بدء تطبيق الثيم على DOM:', {
    primaryColor: theme.primaryColor,
    secondaryColor: theme.secondaryColor,
    mode: theme.mode,
    organizationId: theme.organizationId
  });
  
  // إنشاء مفتاح للثيم الحالي
  const themeKey = `${theme.primaryColor}-${theme.secondaryColor}-${theme.mode}-${theme.organizationId || 'global'}`;

  // تجنب تطبيق الثيم نفسه مرة أخرى
  if (currentAppliedTheme === themeKey) {
    debugLog('تم تجاهل تطبيق الثيم - نفس الثيم مطبق مسبقاً');
    return;
  }
  
  // التحقق من نوع الصفحة
  const pageType = getCurrentPageType();
  debugLog('نوع الصفحة المكتشف:', pageType);

  // إذا كانت الصفحة العامة، نستخدم الثيم العام دائماً
  // لكن فقط إذا لم يكن هناك معرف مؤسسة
  if (pageType === 'global' && !theme.organizationId) {
    const globalTheme = getStoredTheme('global') || DEFAULT_GLOBAL_THEME;
    theme = globalTheme;
    debugLog('تطبيق الثيم العام:', theme);
  } else if (pageType === 'store' && theme.organizationId) {
    debugLog('تطبيق ثيم المتجر للمؤسسة:', theme.organizationId);
  }

  // حفظ مفتاح الثيم الحالي
  currentAppliedTheme = themeKey;
  
  const root = document.documentElement;

  // تطبيق اللون الأساسي
  if (theme.primaryColor) {
    debugLog('تطبيق اللون الأساسي:', theme.primaryColor);
    
    const primaryHSL = isHSLColor(theme.primaryColor) 
      ? theme.primaryColor 
      : hexToHSL(theme.primaryColor);

    debugLog('اللون الأساسي بصيغة HSL:', primaryHSL);

    // تطبيق اللون الأساسي على جميع العناصر الممكنة
    const elementsToUpdate = [root, document.body];
    
    // تطبيق اللون الأساسي مع !important لضمان الأولوية
    elementsToUpdate.forEach(element => {
      element.style.setProperty('--primary', primaryHSL, 'important');
      element.style.setProperty('--ring', primaryHSL, 'important');
      element.style.setProperty('--sidebar-primary', primaryHSL, 'important');
      element.style.setProperty('--sidebar-ring', primaryHSL, 'important');
    });
    
    debugLog('تم تطبيق اللون الأساسي على متغيرات CSS');
    
    // إضافة data attribute للتتبع
    root.setAttribute('data-theme-primary-original', theme.primaryColor);
    root.setAttribute('data-theme-primary-hsl', primaryHSL);
    
    // إنشاء ألوان مشتقة
    if (primaryHSL.includes('%')) {
      const [h, s, l] = primaryHSL.split(' ');
      const hue = h.replace('deg', '').trim();
      const saturation = s.replace('%', '').trim();
      const lightness = parseInt(l.replace('%', '').trim());
      
      debugLog('إنشاء ألوان مشتقة:', { hue, saturation, lightness });
      
      elementsToUpdate.forEach(element => {
        element.style.setProperty('--primary-foreground', '0 0% 100%', 'important');
        element.style.setProperty('--primary-lighter', `${hue} ${saturation}% ${Math.min(lightness + 20, 85)}%`, 'important');
        element.style.setProperty('--primary-darker', `${hue} ${saturation}% ${Math.max(lightness - 20, 25)}%`, 'important');
      });
      
      debugLog('تم إنشاء الألوان المشتقة');
    }
  }
  
  // تطبيق اللون الثانوي
  if (theme.secondaryColor) {
    debugLog('تطبيق اللون الثانوي:', theme.secondaryColor);
    
    const secondaryHSL = isHSLColor(theme.secondaryColor) 
      ? theme.secondaryColor 
      : hexToHSL(theme.secondaryColor);

    debugLog('اللون الثانوي بصيغة HSL:', secondaryHSL);

    const elementsToUpdate = [root, document.body];
    elementsToUpdate.forEach(element => {
      element.style.setProperty('--secondary', secondaryHSL, 'important');
      element.style.setProperty('--secondary-foreground', '0 0% 100%', 'important');
    });
    
    debugLog('تم تطبيق اللون الثانوي على متغيرات CSS');
  }
  
  // تطبيق وضع المظهر
  root.classList.remove('light', 'dark');
  document.body.classList.remove('light', 'dark');
  
  let effectiveMode = theme.mode;
  if (theme.mode === 'system') {
    effectiveMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  debugLog('تطبيق وضع المظهر:', { mode: theme.mode, effectiveMode });

  // إضافة الفئة الجديدة مع التأكد من عدم فقدانها
  root.classList.add(effectiveMode);
  document.body.classList.add(effectiveMode);
  
  // تعيين data attribute كنسخة احتياطية
  root.setAttribute('data-theme', effectiveMode);
  document.body.setAttribute('data-theme', effectiveMode);
  
  // تحديث color-scheme للمتصفح
  document.body.style.colorScheme = effectiveMode;
  root.style.colorScheme = effectiveMode;
  
  debugLog('تم تطبيق وضع المظهر بنجاح');
  
  // تطبيق CSS المخصص
  if (theme.customCss) {
    debugLog('تطبيق CSS المخصص');
    
    const styleId = 'bazaar-unified-custom-css';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = theme.customCss;
    debugLog('تم تطبيق CSS المخصص بنجاح');
  }
  
  // إنشاء أو تحديث عنصر style للألوان المخصصة للمؤسسة
  if (theme.primaryColor || theme.secondaryColor) {
    debugLog('إنشاء CSS override للألوان المخصصة');
    
    const orgStyleId = 'bazaar-org-theme-override';
    let orgStyleElement = document.getElementById(orgStyleId) as HTMLStyleElement;
    
    if (!orgStyleElement) {
      orgStyleElement = document.createElement('style');
      orgStyleElement.id = orgStyleId;
      // Always append to ensure it's at the end
      document.head.appendChild(orgStyleElement);
    } else {
      // Remove and re-append to ensure it's at the end
      orgStyleElement.remove();
      document.head.appendChild(orgStyleElement);
    }
    
    // إنشاء CSS يحتوي على الألوان المخصصة مع أولوية عالية
    let cssOverride = `
      /* تطبيق الألوان على جميع العناصر مع الأولوية القصوى */
      :root,
      :root.light,
      :root.dark,
      :root[data-theme="light"],
      :root[data-theme="dark"],
      html,
      html.light,
      html.dark,
      html[data-theme="light"],
      html[data-theme="dark"],
      body,
      body.light,
      body.dark,
      body[data-theme="light"],
      body[data-theme="dark"] {
    `;
    
    if (theme.primaryColor) {
      const primaryHSL = isHSLColor(theme.primaryColor) ? theme.primaryColor : hexToHSL(theme.primaryColor);
      cssOverride += `  --primary: ${primaryHSL} !important;\n`;
      cssOverride += `  --ring: ${primaryHSL} !important;\n`;
      cssOverride += `  --sidebar-primary: ${primaryHSL} !important;\n`;
      cssOverride += `  --sidebar-ring: ${primaryHSL} !important;\n`;
      
      debugLog('إضافة اللون الأساسي إلى CSS override:', primaryHSL);
      
      // استخراج مكونات HSL
      if (primaryHSL.includes('%')) {
        const [h, s, l] = primaryHSL.split(' ');
        const hue = h.replace('deg', '').trim();
        const saturation = s.replace('%', '').trim();
        const lightness = parseInt(l.replace('%', '').trim());
        
        cssOverride += `  --primary-foreground: 0 0% 100% !important;\n`;
        cssOverride += `  --primary-lighter: ${hue} ${saturation}% ${Math.min(lightness + 20, 85)}% !important;\n`;
        cssOverride += `  --primary-darker: ${hue} ${saturation}% ${Math.max(lightness - 20, 25)}% !important;\n`;
        
        // إضافة متغيرات RGB للاستخدام في الحالات الخاصة
        const rgbColor = hslToRgb(parseInt(hue), parseInt(saturation), lightness);
        cssOverride += `  --primary-rgb: ${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b} !important;\n`;
      }
    }
    
    if (theme.secondaryColor) {
      const secondaryHSL = isHSLColor(theme.secondaryColor) ? theme.secondaryColor : hexToHSL(theme.secondaryColor);
      cssOverride += `  --secondary: ${secondaryHSL} !important;\n`;
      cssOverride += `  --secondary-foreground: 0 0% 100% !important;\n`;
      
      debugLog('إضافة اللون الثانوي إلى CSS override:', secondaryHSL);
    }
    
    cssOverride += '}\n';
    
    // أضف CSS إضافي لضمان تطبيق الألوان على العناصر الشائعة
    cssOverride += `
      /* تطبيق الألوان على فئات Tailwind الشائعة */
      .bg-primary {
        --tw-bg-opacity: 1 !important;
        background-color: hsl(var(--primary) / var(--tw-bg-opacity)) !important;
      }
      
      .text-primary {
        --tw-text-opacity: 1 !important;
        color: hsl(var(--primary) / var(--tw-text-opacity)) !important;
      }
      
      .border-primary {
        --tw-border-opacity: 1 !important;
        border-color: hsl(var(--primary) / var(--tw-border-opacity)) !important;
      }
      
      .ring-primary {
        --tw-ring-opacity: 1 !important;
        --tw-ring-color: hsl(var(--primary) / var(--tw-ring-opacity)) !important;
      }
      
      /* تطبيق الألوان على أزرار الواجهة الشائعة */
      .btn-primary,
      .button-primary,
      [class*="btn-primary"],
      [class*="button-primary"] {
        background-color: hsl(var(--primary) / 1) !important;
        color: hsl(var(--primary-foreground) / 1) !important;
      }
      
      /* تطبيق الألوان على الهوفر */
      .hover\\:bg-primary:hover,
      .hover\\:text-primary:hover,
      .hover\\:border-primary:hover {
        --tw-bg-opacity: 1 !important;
        background-color: hsl(var(--primary) / var(--tw-bg-opacity)) !important;
        --tw-text-opacity: 1 !important;
        color: hsl(var(--primary) / var(--tw-text-opacity)) !important;
        --tw-border-opacity: 1 !important;
        border-color: hsl(var(--primary) / var(--tw-border-opacity)) !important;
      }
    `;

    orgStyleElement.textContent = cssOverride;
    debugLog('تم إنشاء CSS override بنجاح');
  }
  
  // فرض إعادة تصيير العناصر
  const tempClass = 'theme-update-' + Date.now();
  root.classList.add(tempClass);
  
  requestAnimationFrame(() => {
    root.classList.remove(tempClass);
    debugLog('تم فرض إعادة تصيير العناصر');
  });
  
  // إجبار تحديث العناصر التي تستخدم الألوان الأساسية
  setTimeout(() => {
    const elementsWithPrimary = document.querySelectorAll('[class*="bg-primary"], [class*="text-primary"], [class*="border-primary"]');
    debugLog('عدد العناصر التي تستخدم الألوان الأساسية:', elementsWithPrimary.length);
    
    elementsWithPrimary.forEach((el, index) => {
      const element = el as HTMLElement;
      element.style.opacity = '0.99';
      requestAnimationFrame(() => {
        element.style.opacity = '';
      });
      
      if (index < 5) { // تسجيل أول 5 عناصر فقط لتجنب الإفراط في الرسائل
        debugLog(`تحديث العنصر ${index + 1}:`, {
          tagName: element.tagName,
          className: element.className,
          computedStyle: window.getComputedStyle(element).backgroundColor
        });
      }
    });
  }, 100);
  
  debugLog('تم الانتهاء من تطبيق الثيم على DOM بنجاح');
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
let currentAppliedTheme: string | null = null;
const THEME_THROTTLE_MS = 500; // تقليل المدة إلى 500ms

/**
 * تطبيق الثيم الفوري قبل تحميل React
 */
export function applyInstantTheme(): void {
  // تجنب التطبيق المتكرر
  const now = Date.now();
  if (now - lastThemeApplication < THEME_THROTTLE_MS) {
    debugLog('تم تجاهل التطبيق الفوري - تم التطبيق مؤخراً');
    return;
  }
  
  const pageType = getCurrentPageType();
  debugLog('التطبيق الفوري للثيم، نوع الصفحة:', pageType);

  lastThemeApplication = now;
  
  // محاولة استرجاع الثيم المناسب
  let theme: UnifiedTheme | null = null;
  
  if (pageType === 'store' || pageType === 'admin') {
    // للمتاجر ولوحة التحكم، نحاول استرجاع ثيم المؤسسة أولاً
    const orgId = getOrganizationIdSync();
    debugLog('معرف المؤسسة المكتشف:', orgId);
    
    // تنظيف localStorage من البيانات الخاطئة
    cleanupInvalidThemeData(orgId);
    
    // محاولة استرجاع ثيم المؤسسة من التخزين المحلي باستخدام hostname
    const hostname = window.location.hostname;
    const hostKey = getThemeStorageKey(hostname);
    const storedHostTheme = localStorage.getItem(hostKey);
    
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
        debugLog('تم العثور على ثيم من hostname:', theme);
      } catch (e) {
        debugLog('خطأ في قراءة ثيم hostname:', e);
      }
    }
    
    // Try to get theme from localStorage using organization ID
    if (!theme && orgId) {
      const orgThemeKey = STORAGE_KEYS.ORGANIZATION_THEME;
      const storedOrgTheme = localStorage.getItem(orgThemeKey);
      if (storedOrgTheme) {
        try {
          theme = JSON.parse(storedOrgTheme);
          debugLog('تم العثور على ثيم المؤسسة من localStorage:', theme);
        } catch (e) {
          debugLog('خطأ في قراءة ثيم المؤسسة:', e);
        }
      }
    }
    
    // إذا لم نجد ثيم المؤسسة، نحاول استرجاعه من قاعدة البيانات
    if (!theme) {
      debugLog('لم يتم العثور على ثيم محفوظ، استخدام الثيم الافتراضي');
      
      // للنطاق الفرعي المعروف، نطبق الثيم الصحيح مباشرة
      if (orgId === 'b87869bc-a69e-4310-a67a-81c2ab927faf') {
        theme = {
          primaryColor: '#fb923c',
          secondaryColor: '#6c757d',
          mode: 'light',
          organizationId: orgId,
          lastUpdated: Date.now()
        };
        debugLog('تطبيق ثيم خاص للمؤسسة المعروفة');
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
        debugLog('استخدام ثيم افتراضي مؤقت');
      }
    }
    
    // Ensure organizationId is set for store pages
    if (!theme.organizationId && orgId) {
      theme.organizationId = orgId;
    }
    
  } else {
    // للموقع العام، نستخدم الثيم العام دائماً
    theme = DEFAULT_GLOBAL_THEME;
    debugLog('استخدام الثيم العام');
  }
  
  // تطبيق الثيم فوراً
  if (theme) {
    // تأكد من عدم وجود معرف مؤسسة للصفحات العامة
    if (pageType === 'global') {
      delete theme.organizationId;
      delete theme.subdomain;
    }

    debugLog('تطبيق الثيم الفوري:', theme);
    applyThemeToDOM(theme);
    
    // حفظ الثيم في التخزين المحلي للاستخدام المستقبلي
    if (theme.organizationId) {
      saveTheme(theme, 'organization');
    }
  }
}

/**
 * تحديث ثيم المؤسسة مع الألوان الجديدة
 */
export function updateOrganizationTheme(organizationId: string, settings: {
  theme_primary_color?: string;
  theme_secondary_color?: string;
  theme_mode?: string;
  custom_css?: string;
}): void {
  debugLog('تحديث ثيم المؤسسة:', { organizationId, settings });
  
  // إنشاء ثيم جديد مع الألوان المحدثة
  const updatedTheme: UnifiedTheme = {
    primaryColor: settings.theme_primary_color || '#0099ff',
    secondaryColor: settings.theme_secondary_color || '#6c757d',
    mode: (settings.theme_mode === 'auto' ? 'system' : settings.theme_mode || 'light') as 'light' | 'dark' | 'system',
    customCss: settings.custom_css,
    organizationId: organizationId,
    lastUpdated: Date.now()
  };
  
  debugLog('الثيم المحدث:', updatedTheme);
  
  // حفظ الثيم
  saveTheme(updatedTheme, 'organization');
  
  // تطبيق الثيم الجديد فوراً مع إجبار التحديث
  applyThemeToDOM(updatedTheme);
  
  // إجبار إعادة تطبيق الألوان على جميع العناصر
  forceColorUpdate(updatedTheme);
}

/**
 * إجبار إعادة تطبيق الألوان على جميع العناصر
 */
function forceColorUpdate(theme: UnifiedTheme): void {
  debugLog('إجبار إعادة تطبيق الألوان');
  
  // إزالة أي CSS override سابق
  const existingOverride = document.getElementById('bazaar-org-theme-override');
  if (existingOverride) {
    existingOverride.remove();
  }
  
  // إعادة تطبيق الثيم
  setTimeout(() => {
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
    
    debugLog('عدد العناصر المحدثة:', elementsToUpdate.length);
    
    elementsToUpdate.forEach((el, index) => {
      const element = el as HTMLElement;
      
      // فرض إعادة حساب الأنماط
      element.style.opacity = '0.99';
      requestAnimationFrame(() => {
        element.style.opacity = '';
        
        // تطبيق الألوان مباشرة للتأكد
        const elementClasses = element.className?.toString() || '';
        
        if (elementClasses.includes('bg-primary')) {
          const primaryHSL = isHSLColor(theme.primaryColor) ? theme.primaryColor : hexToHSL(theme.primaryColor);
          element.style.setProperty('background-color', `hsl(${primaryHSL})`, 'important');
        }
        
        if (elementClasses.includes('text-primary')) {
          const primaryHSL = isHSLColor(theme.primaryColor) ? theme.primaryColor : hexToHSL(theme.primaryColor);
          element.style.setProperty('color', `hsl(${primaryHSL})`, 'important');
        }
      });
      
      if (index < 3) {
        debugLog(`تحديث العنصر ${index + 1}:`, {
          tagName: element.tagName,
          className: element.className
        });
      }
    });
  }, 50);
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

// إضافة الدالة إلى النافذة العالمية للاستخدام المباشر من وحدة التحكم
if (typeof window !== 'undefined') {
  (window as any).applyInstantTheme = applyInstantTheme;
}
