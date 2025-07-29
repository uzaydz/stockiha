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

// إضافة نظام console شامل للتتبع
const debugLog = (message: string, data?: any) => {
  console.log(`🎨 [ThemeContext] ${message}`, data ? data : '');
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
  debugLog('تطبيق الثيم على DOM:', theme);
  
  const root = document.documentElement;
  const body = document.body;
  
  // تحديد الثيم الفعلي
  let effectiveTheme = theme;
  if (theme === 'system') {
    effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  
  debugLog('الثيم الفعلي المطبق:', effectiveTheme);
  
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
  
  // فرض إعادة الرسم فوراً
  root.style.display = 'none';
  root.offsetHeight; // trigger reflow
  root.style.display = '';
  
  debugLog('تم تطبيق الثيم على DOM بنجاح');
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children, initialOrganizationId }) => {
  // استخدام console.log مباشرة في التطوير لتجنب تغيير dependencies
  const isDebug = process.env.NODE_ENV === 'development';
  const initLogRef = useRef(false);

  // تسجيل التهيئة مرة واحدة فقط بطريقة أكثر تحكماً
  if (isDebug && !initLogRef.current && initialOrganizationId) {
    debugLog('تهيئة ThemeProvider للمؤسسة:', initialOrganizationId);
    initLogRef.current = true;
  }
  
  const location = useLocation();
  const [isTransitioning] = useState(false);
  
  // حالة الثيم الأساسية
  const [theme, setThemeState] = useState<Theme>(() => {
    debugLog('تهيئة حالة الثيم الأولية');
    
    // التحقق من وجود ثيم المؤسسة أولاً (أولوية قصوى)
    try {
      const orgThemeKey = 'bazaar_org_theme';
      const storedOrgTheme = localStorage.getItem(orgThemeKey);
      if (storedOrgTheme) {
        const orgTheme = JSON.parse(storedOrgTheme);
        if (orgTheme.mode && ['light', 'dark', 'system'].includes(orgTheme.mode)) {
          debugLog('تم العثور على ثيم المؤسسة المحفوظ:', orgTheme.mode);
          return orgTheme.mode;
        }
      }
    } catch (e) {
      debugLog('خطأ في قراءة ثيم المؤسسة المحفوظ:', e);
    }
    
    // التحقق من وجود تفضيل مخزن من إعدادات المؤسسة
    const orgThemePreference = localStorage.getItem('theme-preference') as Theme;
    if (orgThemePreference && ['light', 'dark', 'system'].includes(orgThemePreference)) {
      debugLog('تم العثور على تفضيل ثيم المؤسسة:', orgThemePreference);
      return orgThemePreference;
    }
    
    // ثم التحقق من تفضيل المستخدم الشخصي
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      debugLog('تم العثور على تفضيل المستخدم الشخصي:', savedTheme);
      return savedTheme;
    }
    
    // استخدام light كقيمة افتراضية بدلاً من إعدادات النظام
    debugLog('استخدام الثيم الافتراضي: light');
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
    if (newTheme === theme) {
      debugLog('تم تجاهل تحديث الثيم - نفس الثيم مطبق مسبقاً');
      return;
    }
    
    debugLog('تحديث الثيم:', { من: theme, إلى: newTheme });
    
    // حفظ التفضيل في localStorage
    localStorage.setItem('theme', newTheme);
    
    // تحديث الحالة
    setThemeState(newTheme);
    
    // تطبيق فوري على DOM
    applyThemeToDOM(newTheme);
    
    // تحديث المرجع
    lastAppliedThemeRef.current = newTheme;
  }, [theme]);

  // دالة جلب وتطبيق ثيم المؤسسة مع حماية من التكرار
  const applyOrganizationTheme = useCallback(async () => {
    const applyStart = performance.now();
    
    debugLog('بدء تطبيق ثيم المؤسسة');
    
    // منع التشغيل المتزامن
    if (isApplyingThemeRef.current) {
      debugLog('تطبيق ثيم المؤسسة قيد التنفيذ، تم تجاهل الطلب');
      return;
    }

    if (!initialOrganizationId) {
      debugLog('لا يوجد معرف مؤسسة للتطبيق');
      return;
    }

    // منع التطبيق المتكرر لنفس المؤسسة
    if (lastAppliedOrganizationIdRef.current === initialOrganizationId && hasInitializedRef.current) {
      debugLog('تم تطبيق ثيم هذه المؤسسة مسبقاً');
      return;
    }

    // تعيين العلم
    isApplyingThemeRef.current = true;

    try {
      debugLog('جلب إعدادات المؤسسة:', initialOrganizationId);

      // تعيين معرف المؤسسة في window object لاستخدامه في ThemeManager
      if (typeof window !== 'undefined') {
        (window as any).bazaarOrganizationId = initialOrganizationId;
        
        // تعيين معرف المؤسسة في root element أيضاً
        const appRoot = document.getElementById('root');
        if (appRoot) {
          appRoot.setAttribute('data-organization-id', initialOrganizationId);
        }
      }

      // جلب إعدادات المؤسسة
      const settingsStart = performance.now();
      
      const orgSettings = await getOrganizationSettings(initialOrganizationId);
      
      const settingsEnd = performance.now();
      debugLog(`تم جلب إعدادات المؤسسة في ${settingsEnd - settingsStart}ms`);

      if (orgSettings) {
        debugLog('إعدادات المؤسسة المجلبة:', {
          theme_mode: (orgSettings as any).theme_mode,
          theme_primary_color: (orgSettings as any).theme_primary_color,
          theme_secondary_color: (orgSettings as any).theme_secondary_color
        });
        
        // تطبيق وضع الثيم فوراً إذا كان متاحاً
        if ((orgSettings as any).theme_mode) {
          const themeStart = performance.now();
          const orgTheme = convertThemeMode((orgSettings as any).theme_mode);

          debugLog('تحويل وضع الثيم:', { من: (orgSettings as any).theme_mode, إلى: orgTheme });

          // حفظ تفضيل المؤسسة
          localStorage.setItem('theme-preference', orgTheme);
          localStorage.setItem('bazaar_org_theme', JSON.stringify({
            mode: orgTheme,
            organizationId: initialOrganizationId,
            timestamp: Date.now()
          }));
          
          // تطبيق الثيم فوراً إذا كان مختلفاً
          if (orgTheme !== theme) {
            debugLog('تطبيق وضع الثيم الجديد');
            setTheme(orgTheme);
            // تطبيق فوري على DOM
            applyThemeToDOM(orgTheme);
          }
          
          const themeEnd = performance.now();
          debugLog(`تم تطبيق وضع الثيم في ${themeEnd - themeStart}ms`);
        }
        
        // تطبيق ألوان المؤسسة المخصصة فوراً باستخدام ThemeManager
        if ((orgSettings as any).theme_primary_color || (orgSettings as any).theme_secondary_color) {
          const colorsStart = performance.now();
          
          debugLog('تطبيق ألوان المؤسسة المخصصة:', {
            primary: (orgSettings as any).theme_primary_color,
            secondary: (orgSettings as any).theme_secondary_color
          });
          
          // استخدام ThemeManager لتطبيق الألوان مع إجبار التحديث
          const { updateOrganizationTheme } = await import('@/lib/themeManager');
          updateOrganizationTheme(initialOrganizationId, {
            theme_primary_color: (orgSettings as any).theme_primary_color,
            theme_secondary_color: (orgSettings as any).theme_secondary_color,
            theme_mode: (orgSettings as any).theme_mode,
            custom_css: (orgSettings as any).custom_css
          });
          
          const colorsEnd = performance.now();
          debugLog(`تم تطبيق الألوان في ${colorsEnd - colorsStart}ms`);
        }
        
        // تطبيق الخطوط المخصصة
        if ((orgSettings as any).theme_font_family) {
          const fontStart = performance.now();
          
          debugLog('تطبيق الخط المخصص:', (orgSettings as any).theme_font_family);
          
          const root = document.documentElement;
          root.style.setProperty('--font-family', (orgSettings as any).theme_font_family);
          
          const fontEnd = performance.now();
          debugLog(`تم تطبيق الخط في ${fontEnd - fontStart}ms`);
        }
        
        // تحديث المراجع
        lastAppliedOrganizationIdRef.current = initialOrganizationId;
        hasInitializedRef.current = true;
      } else {
        debugLog('لم يتم العثور على إعدادات للمؤسسة');
      }

      const applyEnd = performance.now();
      debugLog(`تم الانتهاء من تطبيق ثيم المؤسسة في ${applyEnd - applyStart}ms`);

    } catch (error) {
      const errorTime = performance.now();
      debugLog('خطأ في تطبيق ثيم المؤسسة:', error);
    } finally {
      // إزالة العلم
      isApplyingThemeRef.current = false;
      
      const applyEnd = performance.now();
      debugLog(`انتهاء عملية تطبيق ثيم المؤسسة في ${applyEnd - applyStart}ms`);
    }
  }, [initialOrganizationId, theme, setTheme]);

  // تطبيق الثيم الأولي على DOM
  useEffect(() => {
    const themeApplyStart = performance.now();
    
    debugLog('تطبيق الثيم الأولي على DOM:', theme);
    applyThemeToDOM(theme);
    lastAppliedThemeRef.current = theme;
    
    const themeApplyEnd = performance.now();
    debugLog(`تم تطبيق الثيم الأولي في ${themeApplyEnd - themeApplyStart}ms`);
  }, [theme]);

  // تطبيق فوري للثيم عند تحميل الكومبوننت لأول مرة
  useEffect(() => {
    const initialThemeStart = performance.now();
    
    debugLog('تطبيق الثيم الفوري عند التحميل');
    
    // تطبيق الثيم فوراً عند التحميل
    applyThemeToDOM(theme);
    
    // محاولة تحميل الثيم من localStorage فوراً
    const savedOrgTheme = localStorage.getItem('theme-preference');
    if (savedOrgTheme && ['light', 'dark', 'system'].includes(savedOrgTheme) && savedOrgTheme !== theme) {
      debugLog('تطبيق ثيم محفوظ مختلف:', savedOrgTheme);
      setTheme(savedOrgTheme as Theme);
      applyThemeToDOM(savedOrgTheme as Theme);
    }

    // محاولة تطبيق ثيم المؤسسة فوراً إذا كان متاحاً
    if (initialOrganizationId) {
      debugLog('محاولة تطبيق ثيم المؤسسة فوراً');
      
      // تطبيق فوري بدون انتظار
      const quickApplyTheme = async () => {
        const quickStart = performance.now();
        
        try {
          const cachedOrgTheme = localStorage.getItem('bazaar_org_theme');
          if (cachedOrgTheme) {
            const parsed = JSON.parse(cachedOrgTheme);
            if (parsed.organizationId === initialOrganizationId && parsed.mode) {
              debugLog('تطبيق ثيم المؤسسة من الكاش:', parsed.mode);
              setTheme(parsed.mode);
              applyThemeToDOM(parsed.mode);
              
              const quickEnd = performance.now();
              debugLog(`تم تطبيق ثيم المؤسسة من الكاش في ${quickEnd - quickStart}ms`);
            }
          }
        } catch (e) {
          debugLog('خطأ في تطبيق ثيم المؤسسة من الكاش:', e);
        }
      };
      quickApplyTheme();
      
      // تطبيق كامل في الخلفية
      setTimeout(() => {
        applyOrganizationTheme();
      }, 100);
    }
    
    const initialThemeEnd = performance.now();
    debugLog(`انتهاء التطبيق الفوري في ${initialThemeEnd - initialThemeStart}ms`);
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
