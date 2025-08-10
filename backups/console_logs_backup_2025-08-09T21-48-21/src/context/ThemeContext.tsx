import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback, useRef, useMemo } from 'react';
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

// دالة تطبيق الثيم على DOM بشكل سريع وفوري
function applyThemeToDOM(theme: Theme) {
  const root = document.documentElement;
  const body = document.body;
  
  // تحديد الثيم الفعلي
  let effectiveTheme = theme;
  if (theme === 'system') {
    effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  
  // تطبيق الثيم فوراً بدون requestAnimationFrame لتجنب التأخير
  // إزالة الفئات السابقة
  root.classList.remove('light', 'dark');
  body.classList.remove('light', 'dark');
  
  // إضافة الفئة الجديدة
  root.classList.add(effectiveTheme);
  body.classList.add(effectiveTheme);
  
  // تعيين data attribute
  root.setAttribute('data-theme', effectiveTheme);
  body.setAttribute('data-theme', effectiveTheme);
  
  // تحديث color-scheme فوراً
  root.style.colorScheme = effectiveTheme;
  body.style.colorScheme = effectiveTheme;
  
  // تحديث meta theme-color للمتصفحات المحمولة
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    const themeColor = effectiveTheme === 'dark' ? '#111827' : '#ffffff';
    metaThemeColor.setAttribute('content', themeColor);
  }
  
  // إضافة فئة إضافية للتأكد من التطبيق
  root.setAttribute('data-theme-applied', effectiveTheme);
  body.setAttribute('data-theme-applied', effectiveTheme);
  
  // تجنب forced reflow: لا حاجة لإجبار إعادة الرسم هنا
}

// إضافة دالة تحويل HEX إلى HSL
function hexToHSL(hex: string): string {
  // إزالة # في حال وجودها
  hex = hex.replace(/^#/, '');
  
  // التحقق من صحة اللون
  if (!/^[0-9A-F]{6}$/i.test(hex) && !/^[0-9A-F]{3}$/i.test(hex)) {
    return '217.2 91.2% 59.8%'; // لون افتراضي
  }
  
  // تحويل إلى RGB
  let r = 0, g = 0, b = 0;
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else if (hex.length === 6) {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  }
  
  // تطبيع RGB إلى قيم بين 0 و 1
  r /= 255;
  g /= 255;
  b /= 255;
  
  // حساب قيم HSL
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    
    h /= 6;
  }
  
  // تحويل إلى صيغة CSS
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);
  
  return `${h} ${s}% ${l}%`;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children, initialOrganizationId }) => {
  // استخدام console.log مباشرة في التطوير لتجنب تغيير dependencies
  const isDebug = process.env.NODE_ENV === 'development';
  const initLogRef = useRef(false);

  // تسجيل التهيئة مرة واحدة فقط بطريقة أكثر تحكماً
  if (isDebug && !initLogRef.current && initialOrganizationId) {
    initLogRef.current = true;
  }
  
  const location = useLocation();
  const [isTransitioning] = useState(false);
  
  // حالة الثيم الأساسية
  const [theme, setThemeState] = useState<Theme>(() => {
    // التحقق من وجود ثيم المؤسسة أولاً (أولوية قصوى)
    try {
      const orgThemeKey = 'bazaar_org_theme';
      const storedOrgTheme = localStorage.getItem(orgThemeKey);
      if (storedOrgTheme) {
        const orgTheme = JSON.parse(storedOrgTheme);
        if (orgTheme.mode && ['light', 'dark', 'system'].includes(orgTheme.mode)) {
          return orgTheme.mode;
        }
      }
    } catch (e) {
      // تجاهل الأخطاء وانتقل للخيار التالي
    }
    
    // التحقق من وجود تفضيل مخزن من إعدادات المؤسسة
    const orgThemePreference = localStorage.getItem('theme-preference') as Theme;
    if (orgThemePreference && ['light', 'dark', 'system'].includes(orgThemePreference)) {
      return orgThemePreference;
    }
    
    // ثم التحقق من تفضيل المستخدم الشخصي
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      return savedTheme;
    }
    
    // استخدام light كقيمة افتراضية بدلاً من إعدادات النظام
    return 'light';
  });

  // مراجع لمنع الاستدعاءات المتكررة
  const organizationThemeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastAppliedOrganizationIdRef = useRef<string | undefined>(undefined);
  const lastAppliedThemeRef = useRef<Theme | undefined>(undefined);
  const isApplyingThemeRef = useRef(false);
  const hasInitializedRef = useRef(false);

  // دالة تحديث الثيم بشكل محسن
  const setTheme = useCallback((newTheme: Theme) => {
    if (newTheme === theme) return;
    
    if (isDebug) {
    }
    
    // حفظ التفضيل في localStorage
    localStorage.setItem('theme', newTheme);
    
    // تحديث الحالة
    setThemeState(newTheme);
    
    // تطبيق فوري على DOM
    applyThemeToDOM(newTheme);
    
    // تحديث المرجع
    lastAppliedThemeRef.current = newTheme;
  }, [theme, isDebug]);

  // دالة جلب وتطبيق ثيم المؤسسة مع حماية من التكرار
  const applyOrganizationTheme = useCallback(async () => {
    const applyStart = performance.now();
    
    // منع التشغيل المتزامن
    if (isApplyingThemeRef.current) {
      if (isDebug) {
      }
      return;
    }

    if (!initialOrganizationId) {
      if (isDebug) {
      }
      return;
    }

    // منع التطبيق المتكرر لنفس المؤسسة
    if (lastAppliedOrganizationIdRef.current === initialOrganizationId && hasInitializedRef.current) {
      if (isDebug) {
      }
      return;
    }

    // تعيين العلم
    isApplyingThemeRef.current = true;

    try {
      if (isDebug) {
      }

      // جلب إعدادات المؤسسة
      const settingsStart = performance.now();
      
      const orgSettings = await getOrganizationSettings(initialOrganizationId);
      
      const settingsEnd = performance.now();

      if (orgSettings) {
        // تطبيق وضع الثيم فوراً إذا كان متاحاً
        if ((orgSettings as any).theme_mode) {
          const themeStart = performance.now();
          const orgTheme = convertThemeMode((orgSettings as any).theme_mode);

          // حفظ تفضيل المؤسسة
          localStorage.setItem('theme-preference', orgTheme);
          localStorage.setItem('bazaar_org_theme', JSON.stringify({
            mode: orgTheme,
            organizationId: initialOrganizationId,
            timestamp: Date.now()
          }));
          
          // تطبيق الثيم فوراً إذا كان مختلفاً
          if (orgTheme !== theme) {
            setTheme(orgTheme);
            // تطبيق فوري على DOM
            applyThemeToDOM(orgTheme);
          }
          
          const themeEnd = performance.now();
        }
        
        // تطبيق ألوان المؤسسة المخصصة فوراً
        if ((orgSettings as any).theme_primary_color || (orgSettings as any).theme_secondary_color) {
          const colorsStart = performance.now();
          
          const root = document.documentElement;
          
          if ((orgSettings as any).theme_primary_color) {
            root.style.setProperty('--primary', hexToHSL((orgSettings as any).theme_primary_color));
          }
          if ((orgSettings as any).theme_secondary_color) {
            root.style.setProperty('--secondary', hexToHSL((orgSettings as any).theme_secondary_color));
          }
          
          const colorsEnd = performance.now();
        }
        
        // تطبيق الخطوط المخصصة
        if ((orgSettings as any).theme_font_family) {
          const fontStart = performance.now();
          
          const root = document.documentElement;
          root.style.setProperty('--font-family', (orgSettings as any).theme_font_family);
          
          const fontEnd = performance.now();
        }
        }

        // تحديث المراجع
        lastAppliedOrganizationIdRef.current = initialOrganizationId;
        hasInitializedRef.current = true;

      if (isDebug) {
      }

    } catch (error) {
      const errorTime = performance.now();
    } finally {
      // إزالة العلم
      isApplyingThemeRef.current = false;
      
      const applyEnd = performance.now();
    }
  }, [initialOrganizationId, theme, isDebug]);

  // تطبيق الثيم الأولي على DOM
  useEffect(() => {
    const themeApplyStart = performance.now();
    
    applyThemeToDOM(theme);
    lastAppliedThemeRef.current = theme;
    
    const themeApplyEnd = performance.now();
  }, [theme]);

  // تطبيق فوري للثيم عند تحميل الكومبوننت لأول مرة
  useEffect(() => {
    const initialThemeStart = performance.now();
    
    // تطبيق الثيم فوراً عند التحميل
    applyThemeToDOM(theme);
    
    // محاولة تحميل الثيم من localStorage فوراً
    const savedOrgTheme = localStorage.getItem('theme-preference');
    if (savedOrgTheme && ['light', 'dark', 'system'].includes(savedOrgTheme) && savedOrgTheme !== theme) {
      setTheme(savedOrgTheme as Theme);
      applyThemeToDOM(savedOrgTheme as Theme);
    }

    // محاولة تطبيق ثيم المؤسسة فوراً إذا كان متاحاً
    if (initialOrganizationId) {
      // تطبيق فوري بدون انتظار
      const quickApplyTheme = async () => {
        const quickStart = performance.now();
        
        try {
          const cachedOrgTheme = localStorage.getItem('bazaar_org_theme');
          if (cachedOrgTheme) {
            const parsed = JSON.parse(cachedOrgTheme);
            if (parsed.organizationId === initialOrganizationId && parsed.mode) {
              setTheme(parsed.mode);
              applyThemeToDOM(parsed.mode);
              
              const quickEnd = performance.now();
            }
          }
        } catch (e) {
        }
      };
      quickApplyTheme();
      
      // تطبيق كامل في الخلفية
      setTimeout(() => {
        applyOrganizationTheme();
      }, 100);
    }
    
    const initialThemeEnd = performance.now();
  }, []);

  // تطبيق ثيم المؤسسة عند تغيير المعرف - مع تحسين
  useEffect(() => {
    if (initialOrganizationId && initialOrganizationId !== lastAppliedOrganizationIdRef.current) {
      const orgThemeStart = performance.now();
      
      // تطبيق سريع من cache أولاً
      const cachedOrgTheme = localStorage.getItem('bazaar_org_theme');
      if (cachedOrgTheme) {
        try {
          const parsed = JSON.parse(cachedOrgTheme);
          if (parsed.organizationId === initialOrganizationId && parsed.mode) {
            setTheme(parsed.mode);
            applyThemeToDOM(parsed.mode);
          }
        } catch (e) {
        }
      }
      
      // تطبيق كامل
      applyOrganizationTheme();
      
      const orgThemeEnd = performance.now();
    }
  }, [initialOrganizationId, applyOrganizationTheme]);

  // تطبيق الثيم عند تغيير المسار
  useEffect(() => {
    // إعادة تطبيق الثيم الحالي عند تغيير المسار
    applyThemeToDOM(theme);
  }, [location.pathname, theme]);

  // تطبيق ثيم المؤسسة عند تحميل المؤسسة أو تغيير المسار المهم مع تحسين الأداء
  useEffect(() => {
    if (!initialOrganizationId) {
      return;
    }

    // منع التطبيق المتكرر
    if (lastAppliedOrganizationIdRef.current === initialOrganizationId && hasInitializedRef.current) {
      return;
    }

    // تطبيق فقط للصفحات التي تحتاج ثيم المؤسسة
    const shouldApplyOrganizationTheme = !location.pathname.includes('/login') && 
      !location.pathname.includes('/register') &&
      !location.pathname.includes('/forgot-password');
    
    if (shouldApplyOrganizationTheme) {
      if (isDebug) {
      }
      
      // إلغاء أي timeout سابق
      if (organizationThemeTimeoutRef.current) {
        clearTimeout(organizationThemeTimeoutRef.current);
      }
      
      // تطبيق فوري للثيم لتجنب الفلاش
      organizationThemeTimeoutRef.current = setTimeout(() => {
        applyOrganizationTheme();
      }, 50); // تقليل التأخير إلى 50ms فقط
    }
  }, [initialOrganizationId, location.pathname, applyOrganizationTheme, isDebug]);

  // مراقبة تغييرات إعدادات النظام للثيم
  useEffect(() => {
    if (theme !== 'system') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      applyThemeToDOM('system');
    };
    
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // تهيئة مستمع تغييرات النظام (مرة واحدة فقط)
  useEffect(() => {
    initializeSystemThemeListener();
  }, []);

  // مراقب تغييرات ثيم المؤسسة في localStorage
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'bazaar_org_theme' && e.newValue) {
        try {
          const orgTheme = JSON.parse(e.newValue);
          if (orgTheme.mode && ['light', 'dark', 'system'].includes(orgTheme.mode)) {
            setTheme(orgTheme.mode);
          }
        } catch (error) {
          // تجاهل الأخطاء
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [setTheme]);

  // تنظيف الموارد
  useEffect(() => {
    return () => {
      if (organizationThemeTimeoutRef.current) {
        clearTimeout(organizationThemeTimeoutRef.current);
      }
    };
  }, []);

  // تحسين الأداء بمنع إعادة الرسم غير الضرورية
  const contextValue = useMemo(() => ({
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
