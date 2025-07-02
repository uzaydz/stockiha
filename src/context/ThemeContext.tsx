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
  console.log('🎬 [ThemeProvider] تهيئة ThemeProvider:', {
    initialOrganizationId,
    hasOrganizationId: !!initialOrganizationId,
    timestamp: new Date().toLocaleTimeString()
  });
  
  const location = useLocation();
  const [currentOrganizationId, setCurrentOrganizationId] = useState<string | undefined>(initialOrganizationId);
  const [isTransitioning] = useState(false);
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

  // دالة تحديث الثيم بشكل محسن
  const setTheme = useCallback((newTheme: Theme) => {
    if (newTheme === theme) return;
    
    // حفظ التفضيل في localStorage
    localStorage.setItem('theme', newTheme);
    
    // تحديث الحالة أولاً (سيؤدي إلى تطبيق الثيم عبر useEffect)
    setThemeState(newTheme);
  }, [theme]);

  // تطبيق ثيم المؤسسة
  const applyOrganizationTheme = useCallback(async () => {
    if (!currentOrganizationId) {
      console.log('⚠️ [ThemeContext] لا يوجد معرف مؤسسة لتطبيق الثيم');
      return;
    }
    
    console.log('🔍 [ThemeContext] بدء جلب إعدادات المؤسسة:', {
      organizationId: currentOrganizationId,
      currentTheme: theme,
      timestamp: new Date().toLocaleTimeString()
    });
    
    try {
      const settings = await getOrganizationSettings(currentOrganizationId);
      
      console.log('📋 [ThemeContext] إعدادات المؤسسة المُستلمة:', settings);
      console.log('🔍 [ThemeContext] تفاصيل الإعدادات:', {
        themeMode: settings?.[0]?.theme_mode,
        primaryColor: settings?.[0]?.theme_primary_color,
        secondaryColor: settings?.[0]?.theme_secondary_color,
        customCss: settings?.[0]?.custom_css,
        fullSettings: settings?.[0]
      });
      
      if (settings && settings.length > 0) {
        const orgSettings = settings[0]; // أخذ أول عنصر من المصفوفة
        
        // تطبيق وضع الثيم
        if (orgSettings.theme_mode) {
          const orgTheme = convertThemeMode(orgSettings.theme_mode);
          
          console.log('🔄 [ThemeContext] تحويل وضع الثيم:', {
            dbThemeMode: orgSettings.theme_mode,
            convertedTheme: orgTheme,
            currentTheme: theme
          });
          
          // حفظ تفضيل المؤسسة
          localStorage.setItem('theme-preference', orgTheme);
          
          // تطبيق الثيم إذا كان مختلفاً
          if (orgTheme !== theme) {
            console.log('🎨 [ThemeContext] تطبيق وضع ثيم جديد:', orgTheme);
            setTheme(orgTheme);
          } else {
            console.log('✅ [ThemeContext] وضع الثيم مطابق، لا حاجة للتغيير');
          }
        }
        
        // تطبيق ألوان المؤسسة المخصصة مباشرة
        if (orgSettings.theme_primary_color || orgSettings.theme_secondary_color || orgSettings.custom_css) {
          console.log('🎨 [ThemeContext] تطبيق ألوان مخصصة:', {
            primaryColor: orgSettings.theme_primary_color,
            secondaryColor: orgSettings.theme_secondary_color,
            hasCustomCss: !!orgSettings.custom_css
          });
          
          // استخدام setTimeout لضمان تطبيق الألوان بعد تطبيق الثيم
          setTimeout(() => {
            console.log('⏰ [ThemeContext] تطبيق الألوان بعد التأخير');
            updateOrganizationTheme(currentOrganizationId, {
              theme_primary_color: orgSettings.theme_primary_color,
              theme_secondary_color: orgSettings.theme_secondary_color,
              theme_mode: orgSettings.theme_mode,
              custom_css: orgSettings.custom_css
            });
          }, 50);
        } else {
          console.log('⚪ [ThemeContext] لا توجد ألوان مخصصة لتطبيقها في الإعدادات');
        }
      } else {
        console.log('❌ [ThemeContext] لم يتم العثور على إعدادات للمؤسسة أو المصفوفة فارغة');
      }
    } catch (error) {
      console.error('🚨 [ThemeContext] خطأ في جلب إعدادات المؤسسة:', error);
    }
  }, [currentOrganizationId, theme, setTheme]);

  // تطبيق الثيم الأولي
  useEffect(() => {
    applyThemeToDOM(theme);
  }, []);

  // إعادة تطبيق ثيم المؤسسة عند تغيير المسار
  useEffect(() => {
    console.log('🛤️ [ThemeContext] تغيير المسار:', {
      pathname: location.pathname,
      organizationId: currentOrganizationId,
      hasOrganization: !!currentOrganizationId
    });
    
    // فقط تطبيق الثيم في المسارات المهمة (تجنب POS وصفحات أخرى)
    const shouldApplyTheme = location.pathname === '/' || 
                            location.pathname.includes('/products') ||
                            location.pathname.includes('/dashboard') ||
                            location.pathname.includes('/store');
    
    if (currentOrganizationId && shouldApplyTheme) {
      console.log('🔄 [ThemeContext] إعادة تطبيق ثيم المؤسسة بسبب تغيير المسار');
      applyOrganizationTheme();
    } else {
      console.log('⚠️ [ThemeContext] تجاهل تطبيق الثيم لهذا المسار أو لعدم وجود معرف مؤسسة');
    }
  }, [location.pathname, currentOrganizationId, applyOrganizationTheme]);

  // مراقبة تغييرات معرف المؤسسة (مع debounce لتجنب التكرار)
  useEffect(() => {
    console.log('🏢 [ThemeContext] مراقبة تغيير معرف المؤسسة:', {
      initial: initialOrganizationId,
      current: currentOrganizationId,
      needsUpdate: initialOrganizationId !== currentOrganizationId
    });
    
    if (initialOrganizationId !== currentOrganizationId) {
      console.log('🔄 [ThemeContext] تحديث معرف المؤسسة الحالي');
      setCurrentOrganizationId(initialOrganizationId);
    }
  }, [initialOrganizationId, currentOrganizationId]);

  // تطبيق ثيم المؤسسة عند تغيير المعرف (مع تأخير لتجنب التكرار)
  useEffect(() => {
    console.log('🎯 [ThemeContext] مراقبة تغيير معرف المؤسسة للثيم:', {
      organizationId: currentOrganizationId,
      hasOrganization: !!currentOrganizationId
    });
    
    if (currentOrganizationId) {
      console.log('🚀 [ThemeContext] تطبيق ثيم المؤسسة الجديد مع تأخير');
      // إضافة تأخير لتجنب الاستدعاءات المتكررة
      const timeoutId = setTimeout(() => {
        applyOrganizationTheme();
      }, 500); // تأخير نصف ثانية
      
      return () => clearTimeout(timeoutId);
    } else {
      console.log('⚪ [ThemeContext] لا يوجد معرف مؤسسة، تجاهل التحديث');
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

  // تطبيق الثيم عند تغييره
  useEffect(() => {
    applyThemeToDOM(theme);
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
