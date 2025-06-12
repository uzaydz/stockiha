import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { getOrganizationSettings } from '@/lib/api/settings';
import { updateOrganizationTheme, initializeSystemThemeListener } from '@/lib/themeManager';
import type { OrganizationThemeMode } from '@/types/settings';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  reloadOrganizationTheme: () => Promise<void>;
  isTransitioning: boolean;
}

interface ThemeProviderProps {
  children: ReactNode;
  initialOrganizationId?: string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// دالة تحويل من OrganizationThemeMode إلى Theme
function convertThemeMode(orgMode: OrganizationThemeMode): Theme {
  switch (orgMode) {
    case 'auto':
      return 'system';
    case 'light':
      return 'light';
    case 'dark':
      return 'dark';
    default:
      return 'light';
  }
}

// دالة تطبيق الثيم على DOM بشكل سريع وبسيط
function applyThemeToDOM(theme: Theme) {
  const root = document.documentElement;
  const body = document.body;
  
  // تحديد الثيم الفعلي
  let effectiveTheme = theme;
  if (theme === 'system') {
    effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  
  // تطبيق الثيم بطريقة بسيطة وسريعة
  requestAnimationFrame(() => {
    // إزالة الفئات السابقة من جميع العناصر المحتملة
    root.classList.remove('light', 'dark');
    body.classList.remove('light', 'dark');
    
    // إضافة الفئة الجديدة إلى جميع العناصر
    root.classList.add(effectiveTheme);
    body.classList.add(effectiveTheme);
    
    // تعيين data attribute كنسخة احتياطية
    root.setAttribute('data-theme', effectiveTheme);
    body.setAttribute('data-theme', effectiveTheme);
    
    // تحديث color-scheme للمتصفح
    document.body.style.colorScheme = effectiveTheme;
    root.style.colorScheme = effectiveTheme;
    
    // تحديث meta theme-color للمتصفحات المحمولة
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      const themeColor = effectiveTheme === 'dark' ? '#0f172a' : '#ffffff';
      metaThemeColor.setAttribute('content', themeColor);
    }
    
    // فرض إعادة حساب الأنماط
    root.style.display = 'none';
    root.offsetHeight; // Force reflow
    root.style.display = '';
  });
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children, initialOrganizationId }) => {
  const location = useLocation();
  const [currentOrganizationId, setCurrentOrganizationId] = useState<string | undefined>(initialOrganizationId);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [theme, setThemeState] = useState<Theme>(() => {
    // التحقق من وجود تفضيل مخزن من إعدادات المؤسسة أولاً
    const orgThemePreference = localStorage.getItem('theme-preference') as Theme;
    if (orgThemePreference) {
      return orgThemePreference;
    }
    
    // ثم التحقق من تفضيل المستخدم الشخصي
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      return savedTheme;
    }
    
    // استخدام إعدادات النظام كقيمة افتراضية
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    
    return 'light';
  });

  // دالة تحديث الثيم بشكل سريع وبسيط
  const setTheme = useCallback((newTheme: Theme) => {
    if (newTheme === theme) return;
    
    setIsTransitioning(true);
    
    // حفظ التفضيل في localStorage
    localStorage.setItem('theme', newTheme);
    
    // تطبيق الثيم على DOM
    applyThemeToDOM(newTheme);
    
    // تحديث الحالة
    setThemeState(newTheme);
    
    // إنهاء حالة الانتقال بسرعة
    setTimeout(() => {
      setIsTransitioning(false);
    }, 150);
  }, [theme]);

  // تطبيق ثيم المؤسسة
  const applyOrganizationTheme = useCallback(async () => {
    if (!currentOrganizationId) return;
    
    try {
      const settings = await getOrganizationSettings(currentOrganizationId);
      
      if (settings) {
        // تطبيق وضع الثيم
        if (settings.theme_mode) {
          const orgTheme = convertThemeMode(settings.theme_mode);
          
          // حفظ تفضيل المؤسسة
          localStorage.setItem('theme-preference', orgTheme);
          
          // تطبيق الثيم إذا كان مختلفاً
          if (orgTheme !== theme) {
            setTheme(orgTheme);
          }
        }
        
        // تطبيق ألوان المؤسسة المخصصة مباشرة
        if (settings.theme_primary_color || settings.theme_secondary_color || settings.custom_css) {
          // استخدام setTimeout لضمان تطبيق الألوان بعد تطبيق الثيم
          setTimeout(() => {
            updateOrganizationTheme(currentOrganizationId, {
              theme_primary_color: settings.theme_primary_color,
              theme_secondary_color: settings.theme_secondary_color,
              theme_mode: settings.theme_mode,
              custom_css: settings.custom_css
            });
          }, 50);
        }
      }
    } catch (error) {
    }
  }, [currentOrganizationId, theme, setTheme]);

  // تطبيق الثيم الأولي
  useEffect(() => {
    applyThemeToDOM(theme);
  }, []);

  // إعادة تطبيق الثيم عند تغيير المسار (لحل مشكلة عدم تطبيق الثيم بعد التنقل)
  useEffect(() => {
    // تطبيق الثيم مع تأخير بسيط لضمان اكتمال عملية التنقل
    const timeoutId = setTimeout(() => {
      applyThemeToDOM(theme);
      
      // إعادة تطبيق ثيم المؤسسة إذا كان موجوداً
      if (currentOrganizationId) {
        applyOrganizationTheme();
      }
    }, 10);

    return () => clearTimeout(timeoutId);
  }, [location.pathname, theme, currentOrganizationId, applyOrganizationTheme]);

  // مراقبة تغييرات معرف المؤسسة
  useEffect(() => {
    if (initialOrganizationId !== currentOrganizationId) {
      setCurrentOrganizationId(initialOrganizationId);
    }
  }, [initialOrganizationId, currentOrganizationId]);

  // تطبيق ثيم المؤسسة عند تغيير المعرف
  useEffect(() => {
    if (currentOrganizationId) {
      applyOrganizationTheme();
    }
  }, [currentOrganizationId, applyOrganizationTheme]);

  // مراقبة تغييرات إعدادات النظام
  useEffect(() => {
    if (theme !== 'system') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      applyThemeToDOM('system');
    };
    
    mediaQuery.addEventListener('change', handleChange);
    
    // تطبيق الثيم الأولي
    handleChange();
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // تهيئة مستمع تغييرات النظام
  useEffect(() => {
    initializeSystemThemeListener();
  }, []);

  // مراقب للتأكد من بقاء فئة الثيم على العناصر
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    let effectiveTheme = theme;
    
    if (theme === 'system') {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    // دالة للتحقق من وتطبيق الثيم
    const ensureThemeApplied = (element: HTMLElement) => {
      if (!element.classList.contains(effectiveTheme)) {
        element.classList.remove('light', 'dark');
        element.classList.add(effectiveTheme);
        element.setAttribute('data-theme', effectiveTheme);
      }
    };

    // إنشاء مراقب للتغييرات
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const target = mutation.target as HTMLElement;
          ensureThemeApplied(target);
        }
      });
    });

    // بدء المراقبة على كل من html و body
    observer.observe(root, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    observer.observe(body, {
      attributes: true,
      attributeFilter: ['class']
    });

    // تطبيق الثيم مباشرة
    ensureThemeApplied(root);
    ensureThemeApplied(body);

    return () => observer.disconnect();
  }, [theme]);

  // تحسين الأداء بمنع إعادة الرسم غير الضرورية
  const contextValue = React.useMemo(() => ({
    theme,
    setTheme,
    reloadOrganizationTheme: applyOrganizationTheme,
    isTransitioning
  }), [theme, setTheme, applyOrganizationTheme, isTransitioning]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};
