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

// دالة تطبيق الثيم على DOM بشكل سريع وبسيط
function applyThemeToDOM(theme: Theme) {
  const root = document.documentElement;
  const body = document.body;
  
  // تحديد الثيم الفعلي
  let effectiveTheme = theme;
  if (theme === 'system') {
    effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  
  // تطبيق الثيم بطريقة مبسطة وسريعة
  requestAnimationFrame(() => {
    // إزالة الفئات السابقة
    root.classList.remove('light', 'dark');
    body.classList.remove('light', 'dark');
    
    // إضافة الفئة الجديدة
    root.classList.add(effectiveTheme);
    body.classList.add(effectiveTheme);
    
    // تعيين data attribute
    root.setAttribute('data-theme', effectiveTheme);
    body.setAttribute('data-theme', effectiveTheme);
    
    // تحديث color-scheme بطريقة أكثر أماناً
    if (root.style.colorScheme !== effectiveTheme) {
      root.style.colorScheme = effectiveTheme;
    }
    if (body.style.colorScheme !== effectiveTheme) {
      body.style.colorScheme = effectiveTheme;
    }
    
    // تحديث meta theme-color للمتصفحات المحمولة
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      const themeColor = effectiveTheme === 'dark' ? '#111827' : '#ffffff';
      metaThemeColor.setAttribute('content', themeColor);
    }
  });
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

      const settings = await getOrganizationSettings(initialOrganizationId);
      
      if (isDebug) {
      }
      
      if (settings) {
        const orgSettings = settings;
        
        // تطبيق وضع الثيم
        if (orgSettings.theme_mode) {
          const orgTheme = convertThemeMode(orgSettings.theme_mode);
          
          if (isDebug) {
          }
          
          // حفظ تفضيل المؤسسة
          localStorage.setItem('theme-preference', orgTheme);
          
          // تطبيق الثيم إذا كان مختلفاً
          if (orgTheme !== theme && orgTheme !== lastAppliedThemeRef.current) {
            if (isDebug) {
            }
            setTheme(orgTheme);
          } else if (isDebug) {
          }
        }
        
        // تطبيق ألوان المؤسسة المخصصة
        if (orgSettings.theme_primary_color || orgSettings.theme_secondary_color || orgSettings.custom_css) {
          if (isDebug) {
          }
          
          // إلغاء أي timeout سابق
          if (organizationThemeTimeoutRef.current) {
            clearTimeout(organizationThemeTimeoutRef.current);
          }
          
          // تطبيق الألوان مع تأخير قصير
          organizationThemeTimeoutRef.current = setTimeout(() => {
            updateOrganizationTheme(initialOrganizationId, {
              theme_primary_color: orgSettings.theme_primary_color,
              theme_secondary_color: orgSettings.theme_secondary_color,
              theme_mode: orgSettings.theme_mode,
              custom_css: orgSettings.custom_css
            });
          }, 100);
        }

        // تحديث المراجع
        lastAppliedOrganizationIdRef.current = initialOrganizationId;
        hasInitializedRef.current = true;
      } else if (isDebug) {
      }
    } catch (error) {
    } finally {
      // إزالة العلم
      isApplyingThemeRef.current = false;
    }
  }, [initialOrganizationId, theme, setTheme, isDebug]);

  // تطبيق الثيم الأولي على DOM
  useEffect(() => {
    applyThemeToDOM(theme);
    lastAppliedThemeRef.current = theme;
  }, [theme]);

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
      
      // استخدام timeout لتجميع التحديثات
      organizationThemeTimeoutRef.current = setTimeout(() => {
        if (window.requestIdleCallback) {
          window.requestIdleCallback(() => {
            applyOrganizationTheme();
          }, { timeout: 500 });
        } else {
          applyOrganizationTheme();
        }
      }, 200); // تأخير 200ms لتجميع التحديثات
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
