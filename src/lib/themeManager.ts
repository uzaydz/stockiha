// ملف themeManager.ts - الآن يستخدم الوحدات المنفصلة
// تم تقسيم الملف الأصلي إلى وحدات منفصلة لسهولة الصيانة والتطوير

import {
  applyInstantTheme,
  updateOrganizationTheme,
  updateGlobalTheme,
  getCurrentTheme,
  initializeSystemThemeListener,
  cleanupOldThemes,
  forceApplyOrganizationTheme,
  UnifiedTheme,
  ThemeSettings
} from './themeManager/index';

// إعادة تصدير الواجهات والأنواع للتوافق
export type { UnifiedTheme, ThemeSettings };

// إعادة تصدير الدوال الرئيسية
export {
  applyInstantTheme,
  updateOrganizationTheme,
  updateGlobalTheme,
  getCurrentTheme,
  initializeSystemThemeListener,
  cleanupOldThemes,
  forceApplyOrganizationTheme
};

// تصدير كائن default للتوافق مع الكود الموجود
export default {
  applyInstantTheme,
  updateOrganizationTheme,
  updateGlobalTheme,
  getCurrentTheme,
  initializeSystemThemeListener,
  cleanupOldThemes,
  forceApplyOrganizationTheme
};

// تحميل الثيم المبكر
if (typeof window !== 'undefined') {
  // تحميل script الخارجي للثيم المبكر
  const script = document.createElement('script');
  script.src = '/src/lib/themeManager/earlyThemeLoader.js';
  script.async = true;
  document.head.appendChild(script);

  // إضافة الدالة إلى النافذة العالمية للاستخدام المباشر من وحدة التحكم
  (window as any).applyInstantTheme = applyInstantTheme;
}
