// ملف JavaScript لتحميل الثيم مبكراً قبل تحميل React
// يتم تضمينه في HTML لتحسين الأداء

(function() {
  'use strict';

  // دالة لتحويل HEX إلى HSL
  function hexToHSL(hex) {
    hex = hex.replace(/^#/, '');
    if (!/^[0-9A-F]{6}$/i.test(hex)) {
      return '0 0% 50%';
    }

    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }

      h /= 6;
    }

    h = Math.round(h * 360);
    s = Math.round(s * 100);
    l = Math.round(l * 100);

    return `${h} ${s}% ${l}%`;
  }

  // دالة للحصول على مفتاح التخزين للثيم
  function getThemeStorageKey(hostname) {
    return `org_theme_${hostname}`;
  }

  // دالة لتطبيق الثيم على DOM مباشرة
  function applyEarlyTheme() {
    try {
      // الحصول على البيانات المحفوظة من التحميل المسبق
      const prefetchData = localStorage.getItem('bazaar_prefetch_data');
      if (!prefetchData) return;

      const data = JSON.parse(prefetchData);
      if (!data.settings) return;

      const settings = data.settings;
      const root = document.documentElement;

      // تطبيق اللغة فوراً
      if (settings.default_language) {
        const direction = settings.default_language === 'ar' ? 'rtl' : 'ltr';
        root.setAttribute('dir', direction);
        if (document.body) {
          document.body.setAttribute('dir', direction);
        }
      }

      // تطبيق الألوان فوراً
      if (settings.theme_primary_color || settings.theme_secondary_color) {
        const primaryHSL = hexToHSL(settings.theme_primary_color || '#fc5a3e');
        const secondaryHSL = hexToHSL(settings.theme_secondary_color || '#6b21a8');

        // تطبيق الألوان الأساسية
        root.style.setProperty('--primary', primaryHSL, 'important');
        root.style.setProperty('--secondary', secondaryHSL, 'important');
        root.style.setProperty('--ring', primaryHSL, 'important');

        // تطبيق وضع الثيم
        const themeMode = settings.theme_mode || 'light';
        const effectiveMode = themeMode === 'system' ?
          (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') :
          themeMode;

        root.classList.add(effectiveMode);
        if (document.body) {
          document.body.classList.add(effectiveMode);
        }

        root.setAttribute('data-theme', effectiveMode);
        if (document.body) {
          document.body.setAttribute('data-theme', effectiveMode);
        }

        // تحديث meta theme-color
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
          const themeColor = effectiveMode === 'dark' ? '#111827' : '#ffffff';
          metaThemeColor.setAttribute('content', themeColor);
        }

        console.log('🎨 [EarlyThemeLoader] تم تطبيق الثيم المبكر بنجاح');
      }

      // وضع علامة أن الثيم قد تم تطبيقه مبكراً
      root.setAttribute('data-early-theme-applied', 'true');

    } catch (error) {
      console.warn('⚠️ [EarlyThemeLoader] خطأ في تطبيق الثيم المبكر:', error);
    }
  }

  // تشغيل التحميل المبكر للثيم
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyEarlyTheme);
  } else {
    applyEarlyTheme();
  }

  // ربط مع window للاستخدام في التطوير
  window.applyEarlyTheme = applyEarlyTheme;

})();
