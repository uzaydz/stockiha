import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { getOrganizationSettings } from '@/lib/api/settings';
import { updateOrganizationTheme, initializeSystemThemeListener } from '@/lib/themeManager/index';
import type { OrganizationThemeMode } from '@/types/settings';

type Theme = 'light' | 'dark' | 'system';

interface FastThemeController {
  applyImmediate: (theme: Theme) => void;
  toggleFast: () => Theme;
  getCurrentEffectiveTheme: () => Theme;
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  reloadOrganizationTheme: () => Promise<void>;
  isTransitioning: boolean;
  fastThemeController: FastThemeController;
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

// دالة تطبيق الثيم بشكل فوري ومتزامن - محسنة لأقصى سرعة مع منع forced reflow
function applyThemeImmediate(theme: Theme): void {
  const root = document.documentElement;
  const body = document.body || null;

  // تحديد الثيم الفعلي
  let effectiveTheme = theme;
  if (theme === 'system') {
    effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  // تعطيل جميع الانتقالات والرسوم المتحركة فوراً
  const style = document.createElement('style');
  style.id = 'theme-transition-disable';
  style.textContent = `
    *, *::before, *::after {
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
    }
  `;
  document.head.appendChild(style);
  
  // إزالة التعطيل بعد تطبيق الثيم
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      style.remove();
    });
  });

  // تطبيق جميع التغييرات فوراً بدون أي تأخيرات
  // إزالة الفئات القديمة
  root.classList.remove('light', 'dark');
  if (body) body.classList.remove('light', 'dark');

  // إضافة الفئة الجديدة
  root.classList.add(effectiveTheme);
  if (body) body.classList.add(effectiveTheme);

  // تعيين data attributes فوراً
  root.setAttribute('data-theme', effectiveTheme);
  if (body) body.setAttribute('data-theme', effectiveTheme);

  // تحديث color-scheme فوراً
  root.style.colorScheme = effectiveTheme;
  if (body) body.style.colorScheme = effectiveTheme;

  // تحديث meta theme-color فوراً
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    const themeColor = effectiveTheme === 'dark' ? '#111827' : '#ffffff';
    metaThemeColor.setAttribute('content', themeColor);
  }

  // تعيين خصائص الانتقال - محسنة للسرعة
  root.style.setProperty('--theme-transition-duration', '0.05s');
  root.style.setProperty('--theme-transition-timing', 'ease-out');
  root.style.setProperty('--transition-duration', '0.05s');
  root.style.setProperty('--transition-timing', 'ease-out');
  
  // تعطيل جميع الانتقالات مؤقتاً
  root.style.setProperty('--global-transition-duration', '0.01ms');
  root.style.setProperty('--global-animation-duration', '0.01ms');
}

// دالة تطبيق الثيم مع الألوان المخصصة فوراً - محسنة لتجنب forced reflow
function applyCustomColorsImmediate(primaryColor?: string, secondaryColor?: string): void {
  const root = document.documentElement;

  const colorUpdates: Array<() => void> = [];

  if (primaryColor) {
    const primaryHSL = hexToHSL(primaryColor);
    colorUpdates.push(
      () => root.style.setProperty('--primary', primaryHSL, 'important'),
      () => root.style.setProperty('--ring', primaryHSL, 'important'),
      () => root.style.setProperty('--sidebar-primary', primaryHSL, 'important'),
      () => root.style.setProperty('--sidebar-ring', primaryHSL, 'important')
    );
  }

  if (secondaryColor) {
    const secondaryHSL = hexToHSL(secondaryColor);
    colorUpdates.push(
      () => root.style.setProperty('--secondary', secondaryHSL, 'important'),
      () => root.style.setProperty('--secondary-foreground', '0 0% 100%', 'important')
    );
  }

  // تطبيق جميع تحديثات الألوان فوراً بدون تأخيرات
  if (colorUpdates.length > 0) {
    colorUpdates.forEach(update => update());
  }
}

// دالة تطبيق الثيم على DOM بشكل سريع وفوري - محسنة
function applyThemeToDOM(theme: Theme): void {
  // استخدام الدالة المحسنة للتطبيق الفوري
  applyThemeImmediate(theme);

  // إضافة attributes إضافية للتأكيد
  const root = document.documentElement;
  const body = document.body || null;
  
  let effectiveTheme = theme;
  if (theme === 'system') {
    effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  root.setAttribute('data-theme-applied', effectiveTheme);
  if (body) body.setAttribute('data-theme-applied', effectiveTheme);
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
  const isDebug = process.env.NODE_ENV === 'development';
  const initLogRef = useRef(false);

  // تسجيل التهيئة مرة واحدة فقط بطريقة أكثر تحكماً
  if (isDebug && !initLogRef.current && initialOrganizationId) {
    initLogRef.current = true;
  }
  
  // حماية من استخدام useLocation خارج Router
  let location;
  try {
    location = useLocation();
  } catch (error) {
    // إذا لم يكن Router جاهزاً، استخدم location افتراضي
    location = { pathname: '/', search: '', hash: '', state: null, key: 'default' };
  }
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

  // دالة تحديث الثيم بشكل محسن - فوري ومتزامن مع منع forced reflow
  const setTheme = useCallback((newTheme: Theme) => {
    // تجنب التطبيق إذا كان الثيم نفسه
    if (newTheme === theme && lastAppliedThemeRef.current === newTheme) {
      return;
    }

    const startTime = performance.now();

    // تحديث الحالة والمراجع فوراً
    setThemeState(newTheme);
    lastAppliedThemeRef.current = newTheme;

    // تطبيق الثيم فوراً - بدون انتظار
    applyThemeImmediate(newTheme);

    // حفظ التفضيل في localStorage في الخلفية بدون block
    setTimeout(() => {
      try {
        localStorage.setItem('theme', newTheme);
      } catch (error) {
        // تجاهل أخطاء localStorage
      }
    }, 0);

    if (isDebug) {
      const endTime = performance.now();
    }
  }, [theme, isDebug]);

  // دالة جلب وتطبيق ثيم المؤسسة - محسنة لأقصى سرعة
  const applyOrganizationTheme = useCallback(async () => {
    // منع التشغيل المتزامن
    if (isApplyingThemeRef.current) {
      return;
    }

    if (!initialOrganizationId) {
      return;
    }

    // منع التطبيق المتكرر لنفس المؤسسة
    if (lastAppliedOrganizationIdRef.current === initialOrganizationId && hasInitializedRef.current) {
      return;
    }

    // تعيين العلم
    isApplyingThemeRef.current = true;

    try {
      if (isDebug) {
      }

      // جلب إعدادات المؤسسة بأسرع طريقة
      const orgSettings = await getOrganizationSettings(initialOrganizationId);

      if (orgSettings) {
        let needsThemeUpdate = false;
        let newThemeMode = theme;

        // تطبيق وضع الثيم فوراً إذا كان متاحاً
        if ((orgSettings as any).theme_mode) {
          const orgTheme = convertThemeMode((orgSettings as any).theme_mode);

          // حفظ تفضيل المؤسسة في localStorage
          try {
            localStorage.setItem('theme-preference', orgTheme);
            localStorage.setItem('bazaar_org_theme', JSON.stringify({
              mode: orgTheme,
              organizationId: initialOrganizationId,
              timestamp: Date.now()
            }));
          } catch (error) {
            // تجاهل أخطاء localStorage
          }

          // تطبيق الثيم فوراً إذا كان مختلفاً
          if (orgTheme !== theme) {
            newThemeMode = orgTheme;
            needsThemeUpdate = true;
          }
        }

        // تطبيق الألوان المخصصة فوراً
        const primaryColor = (orgSettings as any).theme_primary_color;
        const secondaryColor = (orgSettings as any).theme_secondary_color;

        if (primaryColor || secondaryColor) {
          applyCustomColorsImmediate(primaryColor, secondaryColor);
        }

        // تطبيق الخطوط المخصصة
        if ((orgSettings as any).theme_font_family) {
          const root = document.documentElement;
          root.style.setProperty('--font-family', (orgSettings as any).theme_font_family, 'important');
        }

        // تحديث الثيم إذا لزم الأمر
        if (needsThemeUpdate) {
          setTheme(newThemeMode);
        }
      }

      // تحديث المراجع
      lastAppliedOrganizationIdRef.current = initialOrganizationId;
      hasInitializedRef.current = true;

      if (isDebug) {
      }

    } catch (error) {
      if (isDebug) {
      }
    } finally {
      // إزالة العلم
      isApplyingThemeRef.current = false;
    }
  }, [initialOrganizationId, theme, isDebug, setTheme]);

  // تطبيق الثيم الأولي على DOM
  useEffect(() => {
    const themeApplyStart = performance.now();

    // إذا تم تطبيق هذا الثيم للتو عبر setTheme، نتجنب إعادة التطبيق لتفادي reflow إضافي
    if (lastAppliedThemeRef.current === theme) {
      return;
    }

    applyThemeToDOM(theme);
    lastAppliedThemeRef.current = theme;

    const themeApplyEnd = performance.now();
  }, [theme]);

  // تطبيق فوري للثيم عند تحميل الكومبوننت - محسن للأداء
  useEffect(() => {
    if (isDebug) {
    }

    // تطبيق الثيم الحالي فوراً
    applyThemeImmediate(theme);

    // محاولة تحميل الثيم من localStorage فوراً
    try {
      const savedOrgTheme = localStorage.getItem('theme-preference');
      if (savedOrgTheme && ['light', 'dark', 'system'].includes(savedOrgTheme) && savedOrgTheme !== theme) {
        setTheme(savedOrgTheme as Theme);
      }
    } catch (error) {
      // تجاهل أخطاء localStorage
    }

    // محاولة تطبيق ثيم المؤسسة من cache فوراً
    if (initialOrganizationId) {
      try {
        const cachedOrgTheme = localStorage.getItem('bazaar_org_theme');
        if (cachedOrgTheme) {
          const parsed = JSON.parse(cachedOrgTheme);
          if (parsed.organizationId === initialOrganizationId && parsed.mode && parsed.mode !== theme) {
            setTheme(parsed.mode);
          }
        }
      } catch (error) {
        // تجاهل أخطاء JSON أو localStorage
      }

      // تطبيق كامل في الخلفية بعد frame واحد
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          applyOrganizationTheme();
        });
      });
    }

    if (isDebug) {
    }
  }, []); // لا نحتاج dependencies هنا لأن هذا يعمل مرة واحدة فقط

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

  // مكون مساعد للتحكم في الثيم بدون تأخيرات - محسن للأداء القصوى
  const fastThemeController = useMemo(() => ({
    // تطبيق الثيم فوراً بدون أي تأخيرات - مع تجنب forced reflow تماماً
    applyImmediate: (targetTheme: Theme) => {
      const startTime = performance.now();

      // تجنب الوصول المباشر للخصائص التي تسبب reflow
      const root = document.documentElement;
      const body = document.body;

      let effectiveTheme = targetTheme;
      if (targetTheme === 'system') {
        effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }

      // تجميع جميع العمليات لتجنب multiple reflows
      const operations = [
        () => root.classList.remove('light', 'dark'),
        () => body && body.classList.remove('light', 'dark'),
        () => root.classList.add(effectiveTheme),
        () => body && body.classList.add(effectiveTheme),
        () => root.setAttribute('data-theme', effectiveTheme),
        () => body && body.setAttribute('data-theme', effectiveTheme),
        () => { root.style.colorScheme = effectiveTheme; },
        () => { if (body) body.style.colorScheme = effectiveTheme; }
      ];

      // تطبيق جميع العمليات فوراً بدون تأخيرات
      operations.forEach(op => op());

      if (isDebug) {
        const endTime = performance.now();
      }
    },

    // تبديل سريع بين الثيمين - محسن للأداء القصوى
    toggleFast: () => {
      const newTheme = theme === 'dark' ? 'light' : 'dark';
      
      // تطبيق الثيم فوراً بدون أي تأخيرات
      applyThemeImmediate(newTheme);
      
      // تحديث الحالة
      setTheme(newTheme);

      return newTheme;
    },

    // الحصول على الثيم الحالي الفعلي - محسن
    getCurrentEffectiveTheme: () => {
      if (theme === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return theme;
    }
  }), [theme, setTheme]);

  // تحسين الأداء بمنع إعادة الرسم غير الضرورية
  const contextValue = useMemo(() => ({
    theme,
    setTheme,
    reloadOrganizationTheme: applyOrganizationTheme,
    isTransitioning,
    fastThemeController
  }), [theme, setTheme, applyOrganizationTheme, isTransitioning, fastThemeController]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};
