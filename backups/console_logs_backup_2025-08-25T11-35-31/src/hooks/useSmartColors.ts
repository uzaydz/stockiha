import { useCallback, useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { smartColorManager } from '@/utils/colorUtils';
import type { Theme } from '@/context/ThemeContext';

/**
 * Hook لاستخدام النظام الذكي للألوان
 */
export function useSmartColors(primaryColor?: string) {
  const { theme } = useTheme();
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    // تعيين اللون الأساسي إذا كان متوفراً
    if (primaryColor) {
      smartColorManager.setPrimaryColor(primaryColor);
    }
    
    // تحديد حالة الجاهزية
    setIsReady(true);
    
    return () => {
      // تنظيف عند إلغاء المكون
      if (!primaryColor) {
        smartColorManager.destroy();
      }
    };
  }, [primaryColor]);
  
  return {
    isReady,
    isDark: theme === 'dark',
    smartColorManager
  };
}

/**
 * Hook مبسط للحصول على الألوان الذكية كـ CSS variables
 */
export function useSmartColorVariables() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return {
    '--smart-primary-text': isDark ? 'var(--smart-primary-text)' : 'hsl(var(--primary))',
    '--smart-primary-bg': isDark ? 'var(--smart-primary-bg)' : 'hsl(var(--primary) / 0.1)',
    '--smart-primary-border': isDark ? 'var(--smart-primary-border)' : 'hsl(var(--primary) / 0.2)',
    '--smart-primary-icon': isDark ? 'var(--smart-primary-icon)' : 'hsl(var(--primary))',
  };
}

interface ThemeTransitionOptions {
  duration?: number;
  timing?: string;
  withAnimation?: boolean;
}

interface UseSmartColorsReturn {
  toggleTheme: (options?: ThemeTransitionOptions) => Promise<void>;
  setThemeMode: (theme: Theme, options?: ThemeTransitionOptions) => Promise<void>;
  isTransitioning: boolean;
  currentTheme: Theme;
}

/**
 * Hook محسن للتحكم في ألوان الثيم والانتقالات
 */
export function useSmartThemeColors(): UseSmartColorsReturn {
  const { theme, setTheme } = useTheme();
  const [isTransitioning, setIsTransitioning] = useState(false);

  // دالة تطبيق انتقال الثيم مع تأثيرات بصرية
  const applyThemeTransition = useCallback((targetTheme: Theme, options: ThemeTransitionOptions = {}) => {
    const {
      duration = 300,
      timing = 'ease-out',
      withAnimation = true
    } = options;

    return new Promise<void>((resolve) => {
      setIsTransitioning(true);

      // إضافة تأثيرات بصرية للتحويل
      if (withAnimation) {
        const root = document.documentElement;
        const body = document.body;

        // إضافة فئة التحويل
        root.classList.add('theme-transition-active');
        body.classList.add('theme-transition-active');

        // تحديث متغيرات CSS للانتقال
        root.style.setProperty('--theme-transition-duration', `${duration}ms`);
        root.style.setProperty('--theme-transition-timing', timing);

        // إضافة تأثير وهج مؤقت
        const glowClass = targetTheme === 'dark' ? 'theme-glow-dark' : 'theme-glow-light';
        root.classList.add(glowClass);
        body.classList.add(glowClass);

        // تنظيف التأثيرات بعد الانتقال
        setTimeout(() => {
          root.classList.remove('theme-transition-active', glowClass);
          body.classList.remove('theme-transition-active', glowClass);
          setIsTransitioning(false);
          resolve();
        }, duration + 50);
      } else {
        // تحويل فوري بدون تأثيرات
        setTimeout(() => {
          setIsTransitioning(false);
          resolve();
        }, 50);
      }
    });
  }, []);

  // دالة تبديل الثيم المحسنة
  const toggleTheme = useCallback(async (options?: ThemeTransitionOptions) => {
    if (isTransitioning) return;

    const newTheme = theme === 'dark' ? 'light' : 'dark';

    // تطبيق الثيم الجديد
    setTheme(newTheme);

    // تطبيق الانتقال البصري
    await applyThemeTransition(newTheme, options);
  }, [theme, setTheme, isTransitioning, applyThemeTransition]);

  // دالة تعيين وضع الثيم مباشرة
  const setThemeMode = useCallback(async (newTheme: Theme, options?: ThemeTransitionOptions) => {
    if (isTransitioning || newTheme === theme) return;

    // تطبيق الثيم الجديد
    setTheme(newTheme);

    // تطبيق الانتقال البصري
    await applyThemeTransition(newTheme, options);
  }, [theme, setTheme, isTransitioning, applyThemeTransition]);

  return {
    toggleTheme,
    setThemeMode,
    isTransitioning,
    currentTheme: theme
  };
}

// Hook إضافي للحصول على ألوان محسنة حسب الثيم الحالي
export function useThemeColors() {
  const { theme } = useTheme();

  const colors = {
    primary: theme === 'dark' ? 'hsl(15, 96%, 62%)' : 'hsl(15, 96%, 62%)',
    secondary: theme === 'dark' ? 'hsl(217.2, 32.6%, 17.5%)' : 'hsl(210, 40%, 96%)',
    background: theme === 'dark' ? 'hsl(222.2, 84%, 4.9%)' : 'hsl(0, 0%, 100%)',
    foreground: theme === 'dark' ? 'hsl(210, 40%, 98%)' : 'hsl(222.2, 84%, 4.9%)',
    card: theme === 'dark' ? 'hsl(222.2, 84%, 4.9%)' : 'hsl(0, 0%, 100%)',
    border: theme === 'dark' ? 'hsl(217.2, 32.6%, 17.5%)' : 'hsl(214.3, 31.8%, 91.4%)',
  };

  return colors;
}

// Hook لقياس أداء الثيم - محسن لتجنب forced reflow
export function useThemePerformance() {
  const { theme, fastThemeController } = useTheme();

  const measureThemeSwitch = useCallback(async (targetTheme: Theme) => {
    const startTime = performance.now();

    // تطبيق الثيم بطريقة محسنة
    fastThemeController.applyImmediate(targetTheme);

    // انتظار frame واحد فقط
    await new Promise(resolve => requestAnimationFrame(resolve));

    const endTime = performance.now();
    const duration = endTime - startTime;

    if (duration > 50) {
      console.warn(`⚠️ Slow theme switch detected: ${duration.toFixed(2)}ms`);
    } else {
      console.log(`✅ Fast theme switch: ${duration.toFixed(2)}ms`);
    }

    return {
      duration,
      startTime,
      endTime,
      targetTheme
    };
  }, [fastThemeController]);

  const measureTogglePerformance = useCallback(async () => {
    const startTime = performance.now();

    const newTheme = fastThemeController.toggleFast();

    // انتظار frame واحد فقط
    await new Promise(resolve => requestAnimationFrame(resolve));

    const endTime = performance.now();
    const duration = endTime - startTime;

    if (duration > 50) {
      console.warn(`⚠️ Slow theme toggle detected: ${duration.toFixed(2)}ms`);
    } else {
      console.log(`✅ Fast theme toggle: ${duration.toFixed(2)}ms`);
    }

    return {
      duration,
      newTheme,
      startTime,
      endTime
    };
  }, [fastThemeController]);

  return {
    measureThemeSwitch,
    measureTogglePerformance,
    currentTheme: theme,
    effectiveTheme: fastThemeController.getCurrentEffectiveTheme()
  };
}
