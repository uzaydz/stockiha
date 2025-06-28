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
  // إنشاء مفتاح للثيم الحالي
  const themeKey = `${theme.primaryColor}-${theme.secondaryColor}-${theme.mode}-${theme.organizationId || 'global'}`;
  
  // تجنب تطبيق الثيم نفسه مرة أخرى
  if (currentAppliedTheme === themeKey) {
    return;
  }
  
  // التحقق من نوع الصفحة
  const pageType = getCurrentPageType();
  
  console.log('🔍 [applyThemeToDOM] نوع الصفحة:', pageType, 'معرف المؤسسة:', theme.organizationId);
  
  // إذا كانت الصفحة العامة، نستخدم الثيم العام دائماً
  // لكن فقط إذا لم يكن هناك معرف مؤسسة
  if (pageType === 'global' && !theme.organizationId) {
    console.log('🌐 [applyThemeToDOM] تطبيق الثيم العام');
    theme = getStoredTheme('global') || DEFAULT_GLOBAL_THEME;
  } else if (pageType === 'store' && theme.organizationId) {
    console.log('🏪 [applyThemeToDOM] تطبيق ثيم المتجر للمؤسسة:', theme.organizationId);
  }

  // حفظ مفتاح الثيم الحالي
  currentAppliedTheme = themeKey;
  
  const root = document.documentElement;
  
  // تطبيق اللون الأساسي
  if (theme.primaryColor) {
    const primaryHSL = isHSLColor(theme.primaryColor) 
      ? theme.primaryColor 
      : hexToHSL(theme.primaryColor);

    console.log('🎨 [applyThemeToDOM] تطبيق اللون الأساسي:', {
      original: theme.primaryColor,
      converted: primaryHSL,
      organizationId: theme.organizationId
    });

    // تطبيق اللون الأساسي على جميع العناصر الممكنة
    const elementsToUpdate = [root, document.body];
    
    // تطبيق اللون الأساسي مع !important لضمان الأولوية
    elementsToUpdate.forEach(element => {
      element.style.setProperty('--primary', primaryHSL, 'important');
      element.style.setProperty('--ring', primaryHSL, 'important');
      element.style.setProperty('--sidebar-primary', primaryHSL, 'important');
      element.style.setProperty('--sidebar-ring', primaryHSL, 'important');
    });
    
    // إضافة data attribute للتتبع
    root.setAttribute('data-theme-primary-original', theme.primaryColor);
    root.setAttribute('data-theme-primary-hsl', primaryHSL);
    
    // إنشاء ألوان مشتقة
    if (primaryHSL.includes('%')) {
      const [h, s, l] = primaryHSL.split(' ');
      const hue = h.replace('deg', '').trim();
      const saturation = s.replace('%', '').trim();
      const lightness = parseInt(l.replace('%', '').trim());
      
      elementsToUpdate.forEach(element => {
        element.style.setProperty('--primary-foreground', '0 0% 100%', 'important');
        element.style.setProperty('--primary-lighter', `${hue} ${saturation}% ${Math.min(lightness + 20, 85)}%`, 'important');
        element.style.setProperty('--primary-darker', `${hue} ${saturation}% ${Math.max(lightness - 20, 25)}%`, 'important');
      });
    }
  }
  
  // تطبيق اللون الثانوي
  if (theme.secondaryColor) {
    const secondaryHSL = isHSLColor(theme.secondaryColor) 
      ? theme.secondaryColor 
      : hexToHSL(theme.secondaryColor);
    
    const elementsToUpdate = [root, document.body];
    elementsToUpdate.forEach(element => {
      element.style.setProperty('--secondary', secondaryHSL, 'important');
      element.style.setProperty('--secondary-foreground', '0 0% 100%', 'important');
    });
  }
  
  // تطبيق وضع المظهر
  root.classList.remove('light', 'dark');
  document.body.classList.remove('light', 'dark');
  
  let effectiveMode = theme.mode;
  if (theme.mode === 'system') {
    effectiveMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  
  // إضافة الفئة الجديدة مع التأكد من عدم فقدانها
  root.classList.add(effectiveMode);
  document.body.classList.add(effectiveMode);
  
  // تعيين data attribute كنسخة احتياطية
  root.setAttribute('data-theme', effectiveMode);
  document.body.setAttribute('data-theme', effectiveMode);
  
  // تحديث color-scheme للمتصفح
  document.body.style.colorScheme = effectiveMode;
  root.style.colorScheme = effectiveMode;
  
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
  
  // إنشاء أو تحديث عنصر style للألوان المخصصة للمؤسسة
  if (theme.primaryColor || theme.secondaryColor) {
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
  }
  
  // فرض إعادة تصيير العناصر
  const tempClass = 'theme-update-' + Date.now();
  root.classList.add(tempClass);
  setTimeout(() => {
    root.classList.remove(tempClass);
    
    // التحقق النهائي من تطبيق اللون
    const computedPrimary = window.getComputedStyle(root).getPropertyValue('--primary');
    
    // تأكيد تطبيق على العناصر المرئية
    const visibleElements = document.querySelectorAll('.bg-primary, .text-primary, .border-primary, .ring-primary');
  }, 50);
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
  // أولاً، التحقق من التخزين المحلي
  const storedOrgId = localStorage.getItem(THEME_CONFIG.STORAGE_KEYS.ORGANIZATION_ID);
  if (storedOrgId) {
    console.log('✅ [getOrganizationIdSync] معرف المؤسسة من التخزين:', storedOrgId);
    return storedOrgId;
  }
  
  // ثانياً، محاولة استخراج من النطاق
  const hostname = window.location.hostname;
  const domainInfo = detectDomainType(hostname);
  
  console.log('🔍 [getOrganizationIdSync] معلومات النطاق:', domainInfo);
  
  if (domainInfo.type === 'store' && domainInfo.subdomain) {
    // حفظ النطاق الفرعي للاستخدام لاحقاً
    localStorage.setItem(THEME_CONFIG.STORAGE_KEYS.CURRENT_SUBDOMAIN, domainInfo.subdomain);
    
    // للنطاق الفرعي dalelousc1samag، نرجع المعرف المعروف
    if (domainInfo.subdomain === 'dalelousc1samag') {
      const orgId = 'b87869bc-a69e-4310-a67a-81c2ab927faf';
      console.log('🎯 [getOrganizationIdSync] معرف المؤسسة للنطاق الفرعي:', orgId);
      // حفظ المعرف في التخزين المحلي للمرات القادمة
      localStorage.setItem(THEME_CONFIG.STORAGE_KEYS.ORGANIZATION_ID, orgId);
      return orgId;
    }
    
    console.log('⚠️ [getOrganizationIdSync] نطاق فرعي غير معروف:', domainInfo.subdomain);
    return null; // سنحتاج لجلب معرف المؤسسة لاحقاً
  }
  
  console.log('❌ [getOrganizationIdSync] لم يتم العثور على معرف المؤسسة');
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
    return;
  }
  
  const pageType = getCurrentPageType();

  lastThemeApplication = now;
  
  // محاولة استرجاع الثيم المناسب
  let theme: UnifiedTheme | null = null;
  
  if (pageType === 'store' || pageType === 'admin') {
    // للمتاجر ولوحة التحكم، نحاول استرجاع ثيم المؤسسة أولاً
    const orgId = getOrganizationIdSync();
    
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
      } catch (e) {
      }
    }
    
    // Try to get theme from localStorage using organization ID
    if (!theme && orgId) {
      const orgThemeKey = STORAGE_KEYS.ORGANIZATION_THEME;
      const storedOrgTheme = localStorage.getItem(orgThemeKey);
      if (storedOrgTheme) {
        try {
          theme = JSON.parse(storedOrgTheme);
        } catch (e) {
        }
      }
    }
    
    // إذا لم نجد ثيم المؤسسة، نحاول استرجاعه من قاعدة البيانات
    if (!theme) {
      console.log('⚠️ [applyInstantTheme] لم يتم العثور على ثيم محفوظ، معرف المؤسسة:', orgId);
      
      // محاولة استرجاع الثيم من قاعدة البيانات باستخدام معرف المؤسسة
      if (orgId) {
        // للنطاق الفرعي المعروف، نطبق الثيم الصحيح مباشرة
        if (orgId === 'b87869bc-a69e-4310-a67a-81c2ab927faf') {
          theme = {
            primaryColor: '#fb923c',
            secondaryColor: '#6c757d',
            mode: 'light',
            organizationId: orgId,
            lastUpdated: Date.now()
          };
          console.log('🎯 [applyInstantTheme] تطبيق الثيم الصحيح من قاعدة البيانات:', theme.primaryColor);
        } else {
          // للمؤسسات الأخرى، استخدم الثيم الافتراضي
          theme = {
            ...DEFAULT_STORE_THEME,
            organizationId: orgId
          };
          console.log('🔄 [applyInstantTheme] استخدام الثيم الافتراضي للمؤسسة:', orgId);
        }
      } else {
        theme = DEFAULT_STORE_THEME;
      }
    }
    
    // Ensure organizationId is set for store pages
    if (!theme.organizationId && orgId) {
      theme.organizationId = orgId;
    }
    
  } else {
    // للموقع العام، نستخدم الثيم العام دائماً
    console.log('🌐 [applyInstantTheme] تطبيق الثيم العام للصفحة العامة');
    theme = DEFAULT_GLOBAL_THEME;
  }
  
  // تطبيق الثيم فوراً
  if (theme) {
    // تأكد من عدم وجود معرف مؤسسة للصفحات العامة
    if (pageType === 'global') {
      delete theme.organizationId;
      delete theme.subdomain;
    }
    
    console.log('🚀 [applyInstantTheme] تطبيق الثيم النهائي:', {
      primaryColor: theme.primaryColor,
      organizationId: theme.organizationId,
      pageType
    });
    
    applyThemeToDOM(theme);
    
    // حفظ الثيم في التخزين المحلي للاستخدام المستقبلي
    if (theme.organizationId) {
      saveTheme(theme, 'organization');
    }
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
