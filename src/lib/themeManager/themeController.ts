// وظائف التحكم الرئيسية في الثيم
import type { UnifiedTheme, ThemeSettings, PageType } from './types';
import { DEFAULT_GLOBAL_THEME, DEFAULT_STORE_THEME, THEME_THROTTLE_MS } from './constants';
import { applyThemeToDOM } from './domUtils';
import { saveTheme, getStoredTheme, getHostTheme } from './storageUtils';
import { getCurrentPageType, getOrganizationIdSync } from './detectionUtils';

// متغيرات للأداء
let lastThemeApplication = 0;

/**
 * تطبيق الثيم الفوري قبل تحميل React
 */
export function applyInstantTheme(): void {
  // تجنب التطبيق المتكرر
  const now = Date.now();
  if (now - lastThemeApplication < THEME_THROTTLE_MS) {
    return;
  }

  // إذا سبق لطبقة الثيم في React أن طبّقت ثيمًا، لا تعد تطبيقه
  try {
    const root = document.documentElement;
    if (root && root.getAttribute('data-theme-applied')) {
      return;
    }
  } catch {}

  const pageType = getCurrentPageType();
  lastThemeApplication = now;

  // محاولة استرجاع الثيم المناسب
  let theme: UnifiedTheme | null = null;

  if (pageType === 'store' || pageType === 'admin') {
    // للمتاجر ولوحة التحكم، نحاول استرجاع ثيم المؤسسة أولاً
    const orgId = getOrganizationIdSync();

    // محاولة استرجاع ثيم المؤسسة من التخزين المحلي باستخدام hostname
    const hostname = window.location.hostname;
    const storedHostTheme = getHostTheme(hostname);

    if (storedHostTheme) {
      theme = {
        primaryColor: storedHostTheme.primaryColor,
        secondaryColor: storedHostTheme.secondaryColor,
        mode: storedHostTheme.mode,
        customCss: storedHostTheme.customCss,
        organizationId: storedHostTheme.organizationId || orgId,
        lastUpdated: storedHostTheme.lastUpdated
      };
    }

    // Try to get theme from localStorage using organization ID
    if (!theme && orgId) {
      const orgTheme = getStoredTheme('organization');
      if (orgTheme) {
        theme = orgTheme;
      }
    }

    // إذا لم نجد ثيم المؤسسة، نحاول استرجاعه من قاعدة البيانات
    if (!theme) {
      // للنطاق الفرعي المعروف، نطبق الثيم الصحيح مباشرة
      if (orgId === 'b87869bc-a69e-4310-a67a-81c2ab927faf') {
        theme = {
          primaryColor: '#fb923c',
          secondaryColor: '#6c757d',
          mode: 'light',
          organizationId: orgId,
          lastUpdated: Date.now()
        };
      } else {
        // لا تطبق ثيم افتراضي - انتظار تحميل إعدادات المؤسسة الفعلية
        // سيتم تطبيق الثيم الصحيح عبر forceApplyOrganizationTheme عند تحميل البيانات
        return; // خروج مبكر بدون تطبيق ثيم افتراضي
      }
    }

    // Ensure organizationId is set for store pages
    if (!theme.organizationId && orgId) {
      theme.organizationId = orgId;
    }

  } else {
    // للموقع العام، نستخدم الثيم العام دائماً
    theme = DEFAULT_GLOBAL_THEME;
  }

  // تطبيق الثيم فوراً
  if (theme) {
    // تأكد من عدم وجود معرف مؤسسة للصفحات العامة
    if (pageType === 'global') {
      delete theme.organizationId;
      delete theme.subdomain;
    }

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
  settings: ThemeSettings
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
 * إجبار تطبيق ثيم المؤسسة بناءً على البيانات المحملة
 */
export function forceApplyOrganizationTheme(
  organizationId: string,
  settings: ThemeSettings,
  subdomain?: string
): void {
  // تحويل theme_mode من 'auto' إلى 'system'
  let themeMode: 'light' | 'dark' | 'system' = 'light';
  if (settings.theme_mode === 'auto') {
    themeMode = 'system';
  } else if (settings.theme_mode === 'light' || settings.theme_mode === 'dark') {
    themeMode = settings.theme_mode;
  }

  // إذا لم توجد ألوان مخصصة، لا تطبق أي ثيم لتجنب الألوان الافتراضية
  if (!settings.theme_primary_color || !settings.theme_secondary_color) {
    return;
  }

  const theme: UnifiedTheme = {
    primaryColor: settings.theme_primary_color,
    secondaryColor: settings.theme_secondary_color,
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

  // تطبيق الثيم فوراً
  applyThemeToDOM(theme);
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
