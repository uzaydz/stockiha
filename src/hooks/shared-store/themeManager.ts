import { updateLanguageFromSettings } from '@/lib/language/languageManager';

/**
 * إدارة السمات والألوان للمتجر
 */

/**
 * تطبيق الألوان على document.documentElement
 */
export const applyThemeColors = (settings: any): void => {
  try {
    if (!settings) {
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
        console.log('⚠️ [ThemeManager] لا توجد إعدادات مؤسسة للألوان');
      }
      return;
    }

    const primaryColor = settings.theme_primary_color;
    const secondaryColor = settings.theme_secondary_color;
    const accentColor = settings.accent_color;

    if (primaryColor) {
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
        console.log('🎯 [ThemeManager] تطبيق اللون الأساسي:', primaryColor);
      }
      document.documentElement.style.setProperty('--primary-color', primaryColor);
      document.documentElement.style.setProperty('--primary', primaryColor);
      document.documentElement.style.setProperty('--color-primary', primaryColor);
      // إضافة متغيرات Tailwind
      document.documentElement.style.setProperty('--tw-color-primary', primaryColor);
    } else {
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
        console.log('⚠️ [ThemeManager] لا يوجد لون أساسي');
      }
    }

    if (secondaryColor) {
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
        console.log('🎯 [ThemeManager] تطبيق اللون الثانوي:', secondaryColor);
      }
      document.documentElement.style.setProperty('--secondary-color', secondaryColor);
      document.documentElement.style.setProperty('--secondary', secondaryColor);
    } else {
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
        console.log('⚠️ [ThemeManager] لا يوجد لون ثانوي');
      }
    }

    if (accentColor) {
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
        console.log('🎯 [ThemeManager] تطبيق لون التمييز:', accentColor);
      }
      document.documentElement.style.setProperty('--accent-color', accentColor);
      document.documentElement.style.setProperty('--accent', accentColor);
    } else {
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
        console.log('⚠️ [ThemeManager] لا يوجد لون تمييز');
      }
    }
  } catch (e) {
    console.warn('⚠️ خطأ في تطبيق إعدادات الألوان:', e);
  }
};

/**
 * تطبيق اللغة والاتجاه
 */
export const applyLanguageSettings = (settings: any): void => {
  try {
    if (!settings) return;

    const language = settings.default_language;
    if (language && ['ar', 'en', 'fr'].includes(language)) {
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
        console.log('🎯 [ThemeManager] تطبيق اللغة:', language);
      }

      // حفظ سريع للوصول من مزودات أخرى إن لزم
      (window as any).__SHARED_STORE_ORG_SETTINGS__ = {
        ...(settings as any),
        default_language: language
      };

      updateLanguageFromSettings(language);
    }
  } catch (e) {
    console.warn('⚠️ خطأ في تطبيق إعدادات اللغة:', e);
  }
};

/**
 * تطبيق جميع إعدادات السمات
 */
export const applyThemeSettings = (
  organizationId: string,
  organizationSettings: any
): void => {
  if (!organizationId || !organizationSettings) return;

  try {
    // تطبيق الألوان
    applyThemeColors(organizationSettings);

    // تطبيق اللغة
    applyLanguageSettings(organizationSettings);

    // إعدادات أخرى محتملة
    const settings = organizationSettings as any;
    if (settings.theme_mode) {
      document.documentElement.setAttribute('data-theme', settings.theme_mode);
    }

    if (settings.custom_css) {
      // يمكن إضافة CSS مخصص هنا
      const style = document.createElement('style');
      style.textContent = settings.custom_css;
      style.setAttribute('data-theme-custom', 'true');
      document.head.appendChild(style);
    }

  } catch (e) {
    console.warn('⚠️ خطأ في تطبيق إعدادات المؤسسة:', e);
  }
};

/**
 * تنظيف السمات المطبقة
 */
export const cleanupThemeSettings = (): void => {
  try {
    // إزالة المتغيرات المخصصة
    const root = document.documentElement;
    root.style.removeProperty('--primary-color');
    root.style.removeProperty('--primary');
    root.style.removeProperty('--color-primary');
    root.style.removeProperty('--tw-color-primary');
    root.style.removeProperty('--secondary-color');
    root.style.removeProperty('--secondary');
    root.style.removeProperty('--accent-color');
    root.style.removeProperty('--accent');

    // إزالة السمة data-theme
    root.removeAttribute('data-theme');

    // إزالة CSS المخصص
    const customStyles = document.querySelectorAll('style[data-theme-custom]');
    customStyles.forEach(style => style.remove());

    // تنظيف window object
    if ((window as any).__SHARED_STORE_ORG_SETTINGS__) {
      delete (window as any).__SHARED_STORE_ORG_SETTINGS__;
    }

  } catch (e) {
    console.warn('⚠️ خطأ في تنظيف إعدادات السمات:', e);
  }
};

/**
 * الحصول على إعدادات السمات الحالية
 */
export const getCurrentThemeSettings = () => {
  try {
    const computedStyle = getComputedStyle(document.documentElement);
    return {
      primaryColor: computedStyle.getPropertyValue('--primary-color') || null,
      secondaryColor: computedStyle.getPropertyValue('--secondary-color') || null,
      accentColor: computedStyle.getPropertyValue('--accent-color') || null,
      themeMode: document.documentElement.getAttribute('data-theme') || null,
      language: (window as any).__SHARED_STORE_ORG_SETTINGS__?.default_language || null
    };
  } catch {
    return {
      primaryColor: null,
      secondaryColor: null,
      accentColor: null,
      themeMode: null,
      language: null
    };
  }
};
