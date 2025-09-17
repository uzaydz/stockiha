// earlyThemeLoader.js - ملف تحميل الثيم المبكر
// يتم تحميل هذا الملف مبكراً لتطبيق الثيم قبل عرض الصفحة

(function() {
  'use strict';

  // دالة لتطبيق الثيم المبكر من البيانات المحفوظة
  function applyEarlyTheme() {
    try {
      // الحصول على البيانات من localStorage أو window object
      const earlyData = window.__EARLY_STORE_DATA__?.data;
      const cachedData = localStorage.getItem('bazaar_prefetch_data');

      let themeSettings = null;

      if (earlyData?.organization_settings) {
        themeSettings = earlyData.organization_settings;
      } else if (cachedData) {
        const parsed = JSON.parse(cachedData);
        if (parsed.settings) {
          themeSettings = parsed.settings;
        }
      }

      if (!themeSettings) return;

      // تطبيق الألوان الأساسية فوراً
      if (themeSettings.theme_primary_color) {
        document.documentElement.style.setProperty('--primary', themeSettings.theme_primary_color);
        document.documentElement.style.setProperty('--primary-foreground', getContrastColor(themeSettings.theme_primary_color));
      }

      if (themeSettings.theme_secondary_color) {
        document.documentElement.style.setProperty('--secondary', themeSettings.theme_secondary_color);
        document.documentElement.style.setProperty('--secondary-foreground', getContrastColor(themeSettings.theme_secondary_color));
      }

      // تطبيق اللغة إذا كانت متوفرة
      if (themeSettings.default_language) {
        const direction = themeSettings.default_language === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.setAttribute('dir', direction);
        document.body.setAttribute('dir', direction);
      }

      // تطبيق الثيم (فاتح/داكن)
      if (themeSettings.theme_mode) {
        document.documentElement.setAttribute('data-theme', themeSettings.theme_mode);
      }

      // تطبيق CSS مخصص إذا كان متوفراً
      if (themeSettings.custom_css) {
        const style = document.createElement('style');
        style.textContent = themeSettings.custom_css;
        document.head.appendChild(style);
      }

    } catch (error) {
      console.warn('[earlyThemeLoader] خطأ في تطبيق الثيم المبكر:', error);
    }
  }

  // دالة لحساب لون النص المناسب
  function getContrastColor(hexColor) {
    try {
      const r = parseInt(hexColor.slice(1, 3), 16);
      const g = parseInt(hexColor.slice(3, 5), 16);
      const b = parseInt(hexColor.slice(5, 7), 16);

      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness > 128 ? '#000000' : '#ffffff';
    } catch {
      return '#ffffff'; // لون افتراضي
    }
  }

  // تطبيق الثيم فوراً عند تحميل الملف
  applyEarlyTheme();

  // إتاحة الدالة عالمياً للاستخدام اللاحق
  window.applyEarlyTheme = applyEarlyTheme;

})();