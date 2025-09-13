// ملف index.ts لنظام إدارة الثيمات - يجمع كل الوحدات
export { applyInstantTheme, updateOrganizationTheme, updateGlobalTheme, getCurrentTheme, initializeSystemThemeListener, forceApplyOrganizationTheme } from './themeController';
export { cleanupOldThemes } from './storageUtils';
export { smartPrefetch, applyCachedPrefetchData, clearPrefetchCache } from './prefetchManager';

// تصدير الواجهات والأنواع
export type { UnifiedTheme, ThemeSettings, PageType, ThemeType } from './types';

// تصدير الثوابت الافتراضية
export { DEFAULT_GLOBAL_THEME, DEFAULT_STORE_THEME } from './constants';

// تصدير الدوال المساعدة للاستخدام المباشر إذا لزم الأمر
export { hexToHSL, isHSLColor, hslToRgb } from './colorUtils';
export { applyThemeToDOM } from './domUtils';
export { saveTheme, getStoredTheme } from './storageUtils';
export { getCurrentPageType, getOrganizationIdSync } from './detectionUtils';

// تصدير كائن default للتوافق مع الكود الموجود
const themeManager = {
  applyInstantTheme: () => import('./themeController').then(m => m.applyInstantTheme()),
  updateOrganizationTheme: (orgId: string, settings: any) =>
    import('./themeController').then(m => m.updateOrganizationTheme(orgId, settings)),
  updateGlobalTheme: (primary: string, secondary: string, mode: any) =>
    import('./themeController').then(m => m.updateGlobalTheme(primary, secondary, mode)),
  getCurrentTheme: () => import('./themeController').then(m => m.getCurrentTheme()),
  initializeSystemThemeListener: () => import('./themeController').then(m => m.initializeSystemThemeListener()),
  cleanupOldThemes: () => import('./storageUtils').then(m => m.cleanupOldThemes()),
  forceApplyOrganizationTheme: (orgId: string, settings: any, subdomain?: string) =>
    import('./themeController').then(m => m.forceApplyOrganizationTheme(orgId, settings, subdomain))
};

export default themeManager;
