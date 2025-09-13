// وظائف التخزين والحفظ
import { THEME_CONFIG, getThemeStorageKey } from '@/config/theme-config';
import type { UnifiedTheme, ThemeType } from './types';
import { STORAGE_KEYS } from './constants';

/**
 * حفظ الثيم في التخزين المحلي
 */
export function saveTheme(theme: UnifiedTheme, type: ThemeType): void {
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
        primary: theme.primaryColor.includes('#') ? theme.primaryColor : theme.primaryColor,
        secondary: theme.secondaryColor.includes('#') ? theme.secondaryColor : theme.secondaryColor,
        primaryColor: theme.primaryColor,
        secondaryColor: theme.secondaryColor,
        mode: theme.mode,
        timestamp: Date.now(),
        organizationId: theme.organizationId
      };

      localStorage.setItem(hostKey, JSON.stringify(hostTheme));
    }

  } catch (error) {
    console.warn('⚠️ [ThemeManager] خطأ في حفظ الثيم:', error);
  }
}

/**
 * استرجاع الثيم من التخزين المحلي
 */
export function getStoredTheme(type: ThemeType): UnifiedTheme | null {
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
    console.warn('⚠️ [ThemeManager] خطأ في استرجاع الثيم:', error);
    return null;
  }
}

/**
 * الحصول على الثيم المحفوظ للنطاق المحدد
 */
export function getHostTheme(hostname: string): UnifiedTheme | null {
  const hostKey = getThemeStorageKey(hostname);

  try {
    const stored = localStorage.getItem(hostKey);
    if (!stored) return null;

    const hostThemeData = JSON.parse(stored);
    return {
      primaryColor: hostThemeData.primaryColor || hostThemeData.primary,
      secondaryColor: hostThemeData.secondaryColor || hostThemeData.secondary,
      mode: hostThemeData.mode || 'light',
      customCss: hostThemeData.customCss,
      organizationId: hostThemeData.organizationId,
      lastUpdated: hostThemeData.timestamp || Date.now()
    };
  } catch (error) {
    console.warn('⚠️ [ThemeManager] خطأ في استرجاع ثيم النطاق:', error);
    return null;
  }
}

/**
 * تنظيف الثيمات القديمة
 */
export function cleanupOldThemes(): void {
  // إزالة الثيمات القديمة التي تزيد عن 30 يوم
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

  ['global', 'store', 'organization'].forEach(type => {
    const theme = getStoredTheme(type as ThemeType);
    if (theme && theme.lastUpdated < thirtyDaysAgo) {
      const key = type === 'global' ? STORAGE_KEYS.GLOBAL_THEME :
                  type === 'store' ? STORAGE_KEYS.STORE_THEME :
                  STORAGE_KEYS.ORGANIZATION_THEME;
      localStorage.removeItem(key);
    }
  });
}
