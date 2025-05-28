import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
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

// دالة تطبيق الثيم على DOM مع تحسينات الأداء
function applyThemeToDOM(theme: Theme, isTransitioning: boolean = false) {
  const root = document.documentElement;
  
  // إضافة فئة الانتقال إذا لزم الأمر
  if (isTransitioning) {
    root.classList.add('theme-switch-animation');
    
    // تأثير اهتزاز خفيف للصفحة (اختياري)
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.body.style.transform = 'scale(0.998)';
      setTimeout(() => {
        document.body.style.transform = '';
      }, 150);
    }
  }
  
  // تحديد الثيم الفعلي
  let effectiveTheme = theme;
  if (theme === 'system') {
    effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  
  // تطبيق الثيم بطريقة محسنة
  requestAnimationFrame(() => {
    // إزالة الفئات السابقة
    root.classList.remove('light', 'dark');
    
    // إضافة الفئة الجديدة
    root.classList.add(effectiveTheme);
    
    // تحديث color-scheme للمتصفح
    document.body.style.colorScheme = effectiveTheme;
    
    // تحديث meta theme-color للمتصفحات المحمولة
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      const themeColor = effectiveTheme === 'dark' ? '#0f172a' : '#ffffff';
      metaThemeColor.setAttribute('content', themeColor);
    }
    
    // إزالة فئة الانتقال بعد انتهاء الرسوم المتحركة
    if (isTransitioning) {
      setTimeout(() => {
        root.classList.remove('theme-switch-animation');
      }, 300);
    }
  });
  
  // تأثير صوتي خفيف (اختياري - يمكن تعطيله)
  if (isTransitioning && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    try {
      // إنشاء تأثير صوتي خفيف باستخدام Web Audio API
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const audioContext = new AudioContextClass();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // تردد مختلف للوضع الداكن والفاتح
        oscillator.frequency.setValueAtTime(
          effectiveTheme === 'dark' ? 800 : 1200, 
          audioContext.currentTime
        );
        oscillator.type = 'sine';
        
        // مستوى صوت منخفض جداً
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.005, audioContext.currentTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
      }
    } catch (error) {
      // تجاهل الأخطاء الصوتية
    }
  }
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children, initialOrganizationId }) => {
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

  // دالة تحديث الثيم مع تحسينات الأداء
  const setTheme = useCallback(async (newTheme: Theme) => {
    if (newTheme === theme) return;
    
    setIsTransitioning(true);
    
    try {
      // حفظ التفضيل في localStorage
      localStorage.setItem('theme', newTheme);
      
      // تطبيق الثيم على DOM
      applyThemeToDOM(newTheme, true);
      
      // تحديث الحالة
      setThemeState(newTheme);
      
      // إشعار مدير الثيم إذا لزم الأمر
      if (currentOrganizationId) {
        // يمكن إضافة منطق إضافي هنا لحفظ تفضيل المؤسسة
      }
      
    } catch (error) {
      console.error('خطأ في تطبيق الثيم:', error);
    } finally {
      // إنهاء حالة الانتقال بعد فترة قصيرة
      setTimeout(() => {
        setIsTransitioning(false);
      }, 300);
    }
  }, [theme, currentOrganizationId]);

  // تطبيق ثيم المؤسسة
  const applyOrganizationTheme = useCallback(async () => {
    if (!currentOrganizationId) return;
    
    try {
      const settings = await getOrganizationSettings(currentOrganizationId);
      
      if (settings?.theme_mode) {
        const orgTheme = convertThemeMode(settings.theme_mode);
        
        // حفظ تفضيل المؤسسة
        localStorage.setItem('theme-preference', orgTheme);
        
        // تطبيق الثيم إذا كان مختلفاً
        if (orgTheme !== theme) {
          await setTheme(orgTheme);
        }
        
        // تطبيق إعدادات إضافية للثيم
        if (settings.theme_primary_color || settings.theme_secondary_color || settings.custom_css) {
          updateOrganizationTheme(currentOrganizationId, {
            theme_primary_color: settings.theme_primary_color,
            theme_secondary_color: settings.theme_secondary_color,
            theme_mode: settings.theme_mode,
            custom_css: settings.custom_css
          });
        }
      }
    } catch (error) {
      console.error('خطأ في تحميل ثيم المؤسسة:', error);
    }
  }, [currentOrganizationId, theme, setTheme]);

  // تطبيق الثيم الأولي
  useEffect(() => {
    applyThemeToDOM(theme);
  }, []);

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