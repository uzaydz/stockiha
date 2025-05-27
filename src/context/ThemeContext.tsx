import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { getOrganizationSettings } from '@/lib/api/settings';
import { updateOrganizationTheme, initializeSystemThemeListener } from '@/lib/themeManager';
import type { OrganizationThemeMode } from '@/types/settings';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  reloadOrganizationTheme: (orgId?: string) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
  initialOrganizationId?: string;
}

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

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children, initialOrganizationId }) => {
  const [currentOrganizationId, setCurrentOrganizationId] = useState<string | undefined>(initialOrganizationId);
  const [theme, setTheme] = useState<Theme>(() => {
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

  // تطبيق ثيم المؤسسة باستخدام النظام الموحد الجديد
  const applyOrganizationTheme = useCallback(async (orgId?: string) => {
    const startTime = Date.now();
    const targetOrgId = orgId || currentOrganizationId;
    
    console.log('🎨 [ThemeContext] بدء تطبيق ثيم المؤسسة:', {
      targetOrgId,
      currentOrganizationId,
      timestamp: new Date().toISOString()
    });
    
    if (!targetOrgId) {
      console.warn('⚠️ [ThemeContext] معرف المؤسسة مفقود');
      return;
    }

    try {
      console.log('📡 [ThemeContext] جلب إعدادات المؤسسة...');
      const fetchStartTime = Date.now();
      
      // جلب إعدادات المؤسسة
      const orgSettings = await getOrganizationSettings(targetOrgId);
      
      const fetchEndTime = Date.now();
      console.log(`⏱️ [ThemeContext] وقت جلب الإعدادات: ${fetchEndTime - fetchStartTime}ms`);
      
      if (orgSettings) {
        console.log('✅ [ThemeContext] تم جلب الإعدادات:', {
          theme_primary_color: orgSettings.theme_primary_color,
          theme_secondary_color: orgSettings.theme_secondary_color,
          theme_mode: orgSettings.theme_mode,
          custom_css: orgSettings.custom_css ? 'موجود' : 'غير موجود'
        });
        
        console.log('🔧 [ThemeContext] تطبيق الثيم على DOM...');
        const applyStartTime = Date.now();
        
        // استخدام النظام الموحد لتحديث الثيم
        updateOrganizationTheme(targetOrgId, {
          theme_primary_color: orgSettings.theme_primary_color,
          theme_secondary_color: orgSettings.theme_secondary_color,
          theme_mode: orgSettings.theme_mode,
          custom_css: orgSettings.custom_css
        });
        
        const applyEndTime = Date.now();
        console.log(`⏱️ [ThemeContext] وقت تطبيق الثيم: ${applyEndTime - applyStartTime}ms`);
        
        // تطبيق وضع المظهر من إعدادات المؤسسة
        if (orgSettings.theme_mode) {
          const themeMode = convertThemeMode(orgSettings.theme_mode);
          console.log('🌓 [ThemeContext] تحديث وضع المظهر:', {
            original: orgSettings.theme_mode,
            converted: themeMode
          });
          
          localStorage.setItem('theme-preference', themeMode);
          setTheme(themeMode);
        }
        
        // إجبار إعادة تصيير فوري
        console.log('🔄 [ThemeContext] إجبار إعادة تصيير...');
        const root = document.documentElement;
        const forceClass = 'theme-force-update-' + Date.now();
        root.classList.add(forceClass);
        
        // إزالة الفئة بعد فترة قصيرة لإجبار إعادة التصيير
        setTimeout(() => {
          root.classList.remove(forceClass);
          console.log('✨ [ThemeContext] تم إجبار إعادة التصيير');
        }, 10);
        
        // فرض إعادة حساب الأنماط
        window.getComputedStyle(root).getPropertyValue('--primary');
        
        const totalTime = Date.now() - startTime;
        console.log(`🎉 [ThemeContext] اكتمل تطبيق الثيم في ${totalTime}ms`);
      } else {
        console.warn('⚠️ [ThemeContext] لم يتم العثور على إعدادات المؤسسة');
      }
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error('💥 [ThemeContext] خطأ في تطبيق ثيم المؤسسة:', {
        error,
        message: error instanceof Error ? error.message : 'خطأ غير معروف',
        totalTime: `${totalTime}ms`
      });
      
      // محاولة استخدام القيم المخزنة محلياً في حالة فشل الاتصال بالخادم
      try {
        console.log('🔄 [ThemeContext] محاولة استخدام الثيم المخزن محلياً...');
        const cachedTheme = localStorage.getItem(`org_theme_${window.location.hostname}`);
        if (cachedTheme) {
          const parsedTheme = JSON.parse(cachedTheme);
          if (parsedTheme.organizationId === targetOrgId) {
            console.log('✅ [ThemeContext] تم العثور على ثيم مخزن محلياً:', parsedTheme);
            updateOrganizationTheme(targetOrgId, {
              theme_primary_color: parsedTheme.primaryColor,
              theme_secondary_color: parsedTheme.secondaryColor,
              theme_mode: parsedTheme.mode
            });
          }
        } else {
          console.warn('⚠️ [ThemeContext] لم يتم العثور على ثيم مخزن محلياً');
        }
      } catch (localStorageError) {
        console.error('💥 [ThemeContext] خطأ في استرجاع الثيم المخزن محلياً:', localStorageError);
      }
    }
  }, [currentOrganizationId, setTheme]);

  // تحديث organizationId عند تغيير الخاصية
  useEffect(() => {
    if (initialOrganizationId && initialOrganizationId !== currentOrganizationId) {
      setCurrentOrganizationId(initialOrganizationId);
    }
  }, [initialOrganizationId, currentOrganizationId]);

  // تحميل وتطبيق الألوان عند تحديد المؤسسة
  useEffect(() => {
    if (currentOrganizationId) {
      applyOrganizationTheme();
    }
  }, [applyOrganizationTheme, currentOrganizationId]);

  // تحديث وسم HTML عند تغيير الثيم
  useEffect(() => {
    const root = window.document.documentElement;
    
    // إزالة الفئات القديمة
    root.classList.remove('light', 'dark');
    
    // تطبيق الفئة الجديدة بناءً على الثيم المحدد
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
      document.body.style.colorScheme = systemTheme;
    } else {
      root.classList.add(theme);
      document.body.style.colorScheme = theme;
    }
    
    // تخزين الإعداد في التخزين المحلي
    localStorage.setItem('theme', theme);
  }, [theme]);

  // تهيئة مستمع تغييرات النظام
  useEffect(() => {
    initializeSystemThemeListener();
  }, []);

  // الاستماع لتغييرات إعدادات النظام إذا كان الثيم مضبوطاً على "system"
  useEffect(() => {
    if (theme !== 'system') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      const systemTheme = mediaQuery.matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
      document.body.style.colorScheme = systemTheme;
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      setTheme,
      reloadOrganizationTheme: applyOrganizationTheme
    }}>
      {children}
    </ThemeContext.Provider>
  );
}; 