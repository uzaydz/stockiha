/**
 * دوال مساعدة للتعامل مع الألوان والثيمات
 */

/**
 * تحويل لون HSL إلى RGB
 */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  s /= 100;
  l /= 100;

  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };

  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

/**
 * حساب سطوع اللون (luminance)
 */
export function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * تحديد ما إذا كان اللون فاتح أم غامق
 */
export function isColorLight(r: number, g: number, b: number): boolean {
  return getLuminance(r, g, b) > 0.5;
}

/**
 * تحليل لون CSS وتحديد ما إذا كان فاتح أم غامق
 */
export function isCSSColorLight(color: string): boolean {
  // إزالة المسافات والأقواس
  const cleanColor = color.replace(/[^\d,]/g, '');
  const values = cleanColor.split(',').map(v => parseInt(v.trim()));
  
  if (values.length >= 3) {
    return isColorLight(values[0], values[1], values[2]);
  }
  
  // افتراضي: اللون غامق
  return false;
}

/**
 * الحصول على متغيرات CSS للألوان الذكية
 */
export function getSmartColorVariables(isDark: boolean, primaryColor?: string): Record<string, string> {
  const isLightPrimary = primaryColor ? isCSSColorLight(primaryColor) : true;
  
  if (isDark) {
    // في الوضع المظلم
    return {
      '--smart-primary-text': isLightPrimary 
        ? 'hsl(var(--primary))' 
        : 'hsl(var(--primary-foreground))',
      '--smart-primary-bg': 'hsl(var(--primary) / 0.15)',
      '--smart-primary-border': 'hsl(var(--primary) / 0.25)',
      '--smart-primary-icon': isLightPrimary 
        ? 'hsl(var(--primary))' 
        : 'hsl(var(--primary-foreground))',
    };
  } else {
    // في الوضع الفاتح
    return {
      '--smart-primary-text': 'hsl(var(--primary))',
      '--smart-primary-bg': 'hsl(var(--primary) / 0.1)',
      '--smart-primary-border': 'hsl(var(--primary) / 0.2)',
      '--smart-primary-icon': 'hsl(var(--primary))',
    };
  }
}

/**
 * تطبيق الألوان الذكية على العنصر
 */
export function applySmartColors(element: HTMLElement, isDark: boolean, primaryColor?: string): void {
  const variables = getSmartColorVariables(isDark, primaryColor);
  
  Object.entries(variables).forEach(([key, value]) => {
    element.style.setProperty(key, value);
  });
}

/**
 * مراقب تغيير الثيم وتطبيق الألوان الذكية
 */
export class SmartColorManager {
  private observer: MutationObserver | null = null;
  private primaryColor: string | null = null;
  
  constructor() {
    this.init();
  }
  
  private init(): void {
    // مراقبة تغييرات class على body أو html
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          this.updateColors();
        }
      });
    });
    
    // بدء مراقبة document.documentElement
    this.observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    // تطبيق الألوان عند التحميل
    this.updateColors();
  }
  
  private updateColors(): void {
    const isDark = document.documentElement.classList.contains('dark');
    const variables = getSmartColorVariables(isDark, this.primaryColor);
    
    Object.entries(variables).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
  }
  
  public setPrimaryColor(color: string): void {
    this.primaryColor = color;
    this.updateColors();
  }
  
  public destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}

// إنشاء مثيل عام
export const smartColorManager = new SmartColorManager();
