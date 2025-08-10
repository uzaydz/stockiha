/**
 * أدوات مساعدة للألوان والتباين
 * تحسين مشكلة الأزرار مع الألوان الغامقة
 */

// تحويل Hex إلى HSL
export const hexToHsl = (hex: string): string => {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
  const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
  const b = parseInt(cleanHex.slice(4, 6), 16) / 255;
  
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
  
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

// حساب لون النص المناسب بناءً على سطوع اللون - محسن للألوان الغامقة جداً
export const getContrastColor = (hex: string): string => {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  
  // حساب السطوع النسبي باستخدام معادلة W3C المحسنة
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  // للألوان الغامقة جداً (مثل الأسود) استخدم أبيض دائماً
  // للألوان الفاتحة جداً استخدم أسود دائماً
  if (brightness < 50) return '0 0% 98%'; // أبيض للألوان الغامقة جداً
  if (brightness > 200) return '222.2 84% 4.9%'; // أسود للألوان الفاتحة جداً
  
  // للألوان المتوسطة استخدم العتبة المحسنة
  return brightness < 128 ? '0 0% 98%' : '222.2 84% 4.9%';
};

// حساب لون مُخفف للهوفر
export const getLighterColor = (hex: string, factor: number = 0.15): string => {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  
  const lighterR = Math.min(255, r + (255 - r) * factor);
  const lighterG = Math.min(255, g + (255 - g) * factor);
  const lighterB = Math.min(255, b + (255 - b) * factor);
  
  const lighterHex = `#${Math.round(lighterR).toString(16).padStart(2, '0')}${Math.round(lighterG).toString(16).padStart(2, '0')}${Math.round(lighterB).toString(16).padStart(2, '0')}`;
  return hexToHsl(lighterHex);
};

// حساب لون مُغمق للهوفر  
export const getDarkerColor = (hex: string, factor: number = 0.1): string => {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  
  const darkerR = Math.max(0, r * (1 - factor));
  const darkerG = Math.max(0, g * (1 - factor));
  const darkerB = Math.max(0, b * (1 - factor));
  
  const darkerHex = `#${Math.round(darkerR).toString(16).padStart(2, '0')}${Math.round(darkerG).toString(16).padStart(2, '0')}${Math.round(darkerB).toString(16).padStart(2, '0')}`;
  return hexToHsl(darkerHex);
};

// حساب سطوع اللون
export const getBrightness = (hex: string): number => {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  
  return (r * 299 + g * 587 + b * 114) / 1000;
};

// حساب لون الهوفر المناسب بناءً على سطوع اللون الأصلي - محسن للأسود
export const getHoverColor = (hex: string): string => {
  const brightness = getBrightness(hex);
  
  // للألوان الغامقة جداً (مثل الأسود) نحتاج تفتيح أكبر
  if (brightness < 50) {
    return getLighterColor(hex, 0.3); // تفتيح أكبر للأسود
  }
  
  // للألوان الغامقة العادية
  if (brightness < 140) {
    return getLighterColor(hex, 0.15);
  }
  
  // للألوان الفاتحة
  return getDarkerColor(hex, 0.1);
};

// تطبيق ألوان محسنة على العنصر
export const applyEnhancedColors = (
  primaryColor: string, 
  secondaryColor?: string
): Record<string, string> => {
  const primaryHover = getHoverColor(primaryColor);
  const secondaryHover = secondaryColor ? getHoverColor(secondaryColor) : primaryHover;
  
  return {
    '--primary': hexToHsl(primaryColor),
    '--primary-foreground': getContrastColor(primaryColor),
    '--primary-hover': primaryHover,
    '--primary-hover-foreground': getContrastColor(primaryColor),
    '--secondary': secondaryColor ? hexToHsl(secondaryColor) : hexToHsl(primaryColor),
    '--secondary-foreground': secondaryColor ? getContrastColor(secondaryColor) : getContrastColor(primaryColor),
    '--secondary-hover': secondaryHover,
    '--secondary-hover-foreground': secondaryColor ? getContrastColor(secondaryColor) : getContrastColor(primaryColor),
  };
};

// إنشاء CSS ديناميكي لإصلاح مشاكل الهوفر - مع تركيز خاص على الأسود
export const generateHoverFixCSS = (primaryColor: string, secondaryColor?: string): string => {
  const colors = applyEnhancedColors(primaryColor, secondaryColor);
  const brightness = getBrightness(primaryColor);
  
  // تحديد ما إذا كان اللون أسود أو غامق جداً
  const isVeryDark = brightness < 50;
  const forceWhiteText = isVeryDark ? 'white' : `hsl(${colors['--primary-foreground']})`;
  
  return `
    /* إصلاح مشكلة الأزرار والهوفر للألوان الغامقة والسوداء */
    .bg-primary,
    [class*="bg-primary"] {
      background-color: hsl(${colors['--primary']}) !important;
      color: ${forceWhiteText} !important;
    }
    
    .hover\\:bg-primary\\/90:hover,
    [class*="hover:bg-primary"]:hover {
      background-color: hsl(${colors['--primary-hover']}) !important;
      color: ${forceWhiteText} !important;
    }
    
    [class*="hover:from-primary"]:hover,
    [class*="bg-gradient-to-r"][class*="from-primary"]:hover,
    [class*="hover:via-primary"]:hover,
    [class*="hover:to-primary"]:hover {
      background: linear-gradient(to right, hsl(${colors['--primary-hover']}), hsl(${colors['--primary-hover']})) !important;
      color: ${forceWhiteText} !important;
    }
    
    /* إصلاح الأزرار الثانوية */
    [class*="hover:bg-secondary"]:hover {
      background-color: hsl(${colors['--secondary-hover']}) !important;
      color: hsl(${colors['--secondary-hover-foreground']}) !important;
    }
    
    /* ضمان وضوح النصوص في جميع الحالات */
    .bg-primary *,
    [class*="bg-primary"] * {
      color: ${forceWhiteText} !important;
    }
    
    .hover\\:bg-primary:hover *,
    [class*="hover:bg-primary"]:hover *,
    [class*="bg-gradient-to-r"]:hover * {
      color: ${forceWhiteText} !important;
    }
    
    /* إصلاح خاص للنصوص داخل الأزرار */
    button.bg-primary,
    button[class*="bg-primary"],
    .btn-primary {
      color: ${forceWhiteText} !important;
    }
    
    /* إصلاح مشكلة text-white التي لا تعمل مع الأسود */
    ${isVeryDark ? `
    .text-white,
    [class*="text-white"] {
      color: white !important;
    }
    ` : ''}
  `;
};