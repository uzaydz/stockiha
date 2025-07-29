import { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { smartColorManager } from '@/utils/colorUtils';

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
