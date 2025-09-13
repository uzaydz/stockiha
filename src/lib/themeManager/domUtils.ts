// وظائف التطبيق على DOM
import type { UnifiedTheme } from './types';
import { hexToHSL, isHSLColor, createDerivedColors } from './colorUtils';
import { NO_MOTION_CLASS } from './constants';

// متغير لتتبع آخر تطبيق للثيم
let currentAppliedTheme: string | null = null;

/**
 * تطبيق الثيم على العناصر في الصفحة - محسن للسرعة
 */
export function applyThemeToDOM(theme: UnifiedTheme): void {
  // إنشاء مفتاح للثيم الحالي
  const themeKey = `${theme.primaryColor}-${theme.secondaryColor}-${theme.mode}-${theme.organizationId || 'global'}`;

  // تجنب تطبيق الثيم نفسه مرة أخرى
  if (currentAppliedTheme === themeKey) {
    return;
  }

  // حفظ مفتاح الثيم الحالي
  currentAppliedTheme = themeKey;

  const root = document.documentElement;
  if (!root) return;

  // تعطيل الانتقالات مؤقتاً أثناء تبديل الثيم لتجنّب تغيّر العناصر واحداً تلو الآخر
  if (!root.classList.contains(NO_MOTION_CLASS)) {
    root.classList.add(NO_MOTION_CLASS);
    setTimeout(() => {
      try { root.classList.remove(NO_MOTION_CLASS); } catch {}
    }, 150);
  }

  // تحديد وضع المظهر الفعلي
  let effectiveMode = theme.mode;
  if (theme.mode === 'system') {
    effectiveMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  // إزالة الفئات السابقة وإضافة الجديدة فوراً على الجذر والجسم لضمان التوافق
  const body = document.body;
  root.classList.remove('light', 'dark');
  body && body.classList.remove('light', 'dark');
  root.classList.add(effectiveMode);
  body && body.classList.add(effectiveMode);

  // تعيين data attributes فوراً
  root.setAttribute('data-theme', effectiveMode);
  body && body.setAttribute('data-theme', effectiveMode);

  // تحديث color-scheme فوراً
  root.style.colorScheme = effectiveMode;
  body && (body.style.colorScheme = effectiveMode);

  // تحديث meta theme-color للمتصفحات المحمولة
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    const themeColor = effectiveMode === 'dark' ? '#111827' : '#ffffff';
    metaThemeColor.setAttribute('content', themeColor);
  }

  // تطبيق الألوان الأساسية فوراً
  if (theme.primaryColor) {
    const primaryHSL = isHSLColor(theme.primaryColor)
      ? theme.primaryColor
      : hexToHSL(theme.primaryColor);

    root.style.setProperty('--primary', primaryHSL, 'important');
    root.style.setProperty('--ring', primaryHSL, 'important');
    root.style.setProperty('--sidebar-primary', primaryHSL, 'important');
    root.style.setProperty('--sidebar-ring', primaryHSL, 'important');

    // إنشاء ألوان مشتقة
    const derivedColors = createDerivedColors(primaryHSL);

    root.style.setProperty('--primary-foreground', derivedColors.foreground, 'important');
    root.style.setProperty('--primary-lighter', derivedColors.lighter, 'important');
    root.style.setProperty('--primary-darker', derivedColors.darker, 'important');
  }

  // تطبيق اللون الثانوي
  if (theme.secondaryColor) {
    const secondaryHSL = isHSLColor(theme.secondaryColor)
      ? theme.secondaryColor
      : hexToHSL(theme.secondaryColor);

    root.style.setProperty('--secondary', secondaryHSL, 'important');
    root.style.setProperty('--secondary-foreground', '0 0% 100%', 'important');
  }

  // إضافة تأثير انتقال بصري
  root.style.setProperty('--theme-transition-duration', '0.3s');
  root.style.setProperty('--theme-transition-timing', 'ease-out');

  // تطبيق CSS المخصص إذا كان موجوداً
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

  // إنشاء CSS override للألوان المخصصة
  if (theme.primaryColor || theme.secondaryColor) {
    const orgStyleId = 'bazaar-org-theme-override';
    let orgStyleElement = document.getElementById(orgStyleId) as HTMLStyleElement;
    if (!orgStyleElement) {
      orgStyleElement = document.createElement('style');
      orgStyleElement.id = orgStyleId;
      document.head.appendChild(orgStyleElement);
    }

    let cssOverride = `
      :root, :root.light, :root.dark, :root[data-theme="light"], :root[data-theme="dark"],
      html, html.light, html.dark, html[data-theme="light"], html[data-theme="dark"],
      body, body.light, body.dark, body[data-theme="light"], body[data-theme="dark"] {
    `;

    if (theme.primaryColor) {
      const primaryHSL = isHSLColor(theme.primaryColor) ? theme.primaryColor : hexToHSL(theme.primaryColor);
      cssOverride += `  --primary: ${primaryHSL} !important;\n`;
      cssOverride += `  --ring: ${primaryHSL} !important;\n`;
      cssOverride += `  --sidebar-primary: ${primaryHSL} !important;\n`;
      cssOverride += `  --sidebar-ring: ${primaryHSL} !important;\n`;

      if (primaryHSL.includes('%')) {
        const derivedColors = createDerivedColors(primaryHSL);

        cssOverride += `  --primary-foreground: ${derivedColors.foreground} !important;\n`;
        cssOverride += `  --primary-lighter: ${derivedColors.lighter} !important;\n`;
        cssOverride += `  --primary-darker: ${derivedColors.darker} !important;\n`;
      }
    }

    if (theme.secondaryColor) {
      const secondaryHSL = isHSLColor(theme.secondaryColor) ? theme.secondaryColor : hexToHSL(theme.secondaryColor);
      cssOverride += `  --secondary: ${secondaryHSL} !important;\n`;
      cssOverride += `  --secondary-foreground: 0 0% 100% !important;\n`;
    }

    cssOverride += '}\n';

    // إضافة CSS للعناصر الشائعة
    cssOverride += `
      .bg-primary { background-color: hsl(var(--primary)) !important; }
      .text-primary { color: hsl(var(--primary)) !important; }
      .border-primary { border-color: hsl(var(--primary)) !important; }
      .ring-primary { --tw-ring-color: hsl(var(--primary)) !important; }

      .btn-primary, .button-primary, [class*="btn-primary"], [class*="button-primary"] {
        background-color: hsl(var(--primary)) !important;
        color: hsl(var(--primary-foreground)) !important;
      }

      .hover\\:bg-primary:hover { background-color: hsl(var(--primary-lighter)) !important; }
      .hover\\:text-primary:hover { color: hsl(var(--primary-lighter)) !important; }
      .hover\\:border-primary:hover { border-color: hsl(var(--primary-lighter)) !important; }
    `;

    orgStyleElement.textContent = cssOverride;
  }

  // تجنّب أي حيل لإجبار إعادة الرسم، نترك المتصفح يديرها طبيعيًا
}
