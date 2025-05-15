import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { getOrganizationSettings, getOrganizationTheme } from '@/lib/api/settings';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  reloadOrganizationTheme: (organizationId?: string) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  initialOrganizationId?: string;
}

// Función auxiliar para convertir colores HEX a HSL para CSS variables
const hexToHSL = (hex: string): string => {
  // Removemos el # si existe
  hex = hex.replace(/^#/, '');
  
  // Convertimos a RGB
  let r = 0, g = 0, b = 0;
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else if (hex.length === 6) {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  } else {
    // Si el formato no es válido, retornamos un color por defecto
    return '270 70% 60%';
  }
  
  // Normalizamos RGB a valores entre 0 y 1
  r /= 255;
  g /= 255;
  b /= 255;
  
  // Calculamos valores para HSL
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
  
  // Convertimos a formato CSS
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);
  
  return `${h} ${s}% ${l}%`;
};

// Función para aplicar CSS personalizado
const applyCustomCSS = (css: string | null) => {
  // Eliminar cualquier estilo personalizado anterior
  const existingStyle = document.getElementById('custom-org-css');
  if (existingStyle) {
    existingStyle.remove();
  }
  
  // Si hay CSS personalizado, aplicarlo
  if (css) {
    const styleEl = document.createElement('style');
    styleEl.id = 'custom-org-css';
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  }
};

// إضافة المعرف إلى واجهة Window
declare global {
  interface Window {
    _customJsExecutionId?: ReturnType<typeof setTimeout>;
  }
}

// Función para aplicar HTML personalizado en el header
const applyCustomHeader = (html: string | null) => {
  // Eliminar cualquier contenido personalizado anterior
  const existingHeader = document.getElementById('custom-org-header');
  if (existingHeader) {
    existingHeader.remove();
  }
  
  // Si hay HTML personalizado, aplicarlo
  if (html) {
    const headerEl = document.createElement('div');
    headerEl.id = 'custom-org-header';
    headerEl.innerHTML = html;
    document.head.appendChild(headerEl);
  }
};

// Función para aplicar HTML personalizado en el footer
const applyCustomFooter = (html: string | null) => {
  // Eliminar cualquier contenido personalizado anterior
  const existingFooter = document.getElementById('custom-org-footer');
  if (existingFooter) {
    existingFooter.remove();
  }
  
  // Si hay HTML personalizado, aplicarlo
  if (html) {
    const footerEl = document.createElement('div');
    footerEl.id = 'custom-org-footer';
    footerEl.innerHTML = html;
    document.body.appendChild(footerEl);
  }
};

// Función para aplicar la favicon de la organización
const applyFavicon = (faviconUrl: string | null) => {
  if (!faviconUrl) return;
  
  // Eliminar cualquier favicon existente
  const existingFavicon = document.querySelector("link[rel='icon']");
  if (existingFavicon) {
    existingFavicon.remove();
  }
  
  // Crear y agregar el nuevo favicon
  const link = document.createElement("link");
  link.type = "image/x-icon";
  link.rel = "icon";
  link.href = faviconUrl;
  document.head.appendChild(link);
};

// Función para aplicar el título del sitio
const applySiteName = (siteName: string | null) => {
  if (!siteName) return;
  
  // Cambiar el título de la página
  document.title = siteName;
};

// --- الدوال الوهمية لتهيئة بكسلات التتبع ---
const initializeFacebookPixel = (pixelId: string) => {
  
  // TODO: إضافة كود تهيئة بكسل فيسبوك الفعلي هنا
};

const initializeTikTokPixel = (pixelId: string) => {
  
  // TODO: إضافة كود تهيئة بكسل تيك توك الفعلي هنا
};

const initializeSnapchatPixel = (pixelId: string) => {
  
  // TODO: إضافة كود تهيئة بكسل سناب شات الفعلي هنا
};

const initializeGooglePixel = (pixelId: string) => {
  
  // TODO: إضافة كود تهيئة بكسل جوجل الفعلي هنا
};
// --- نهاية الدوال الوهمية ---

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

  // Función para cargar y aplicar los colores de la organización
  const applyOrganizationTheme = useCallback(async (orgId?: string) => {
    const targetOrgId = orgId || currentOrganizationId;
    if (!targetOrgId) return;
    
    try {
      
      
      // استخدام دالة getOrganizationTheme بدلاً من getOrganizationSettings للحصول على إعدادات الثيم
      const themeSettings = await getOrganizationTheme(targetOrgId);
      
      // إذا لم نتمكن من الحصول على إعدادات الثيم، نحاول الحصول على إعدادات المؤسسة العامة
      const orgSettings = themeSettings || await getOrganizationSettings(targetOrgId);
      
      if (orgSettings) {
        // تطبيق الألوان الرئيسية والثانوية
        // اللون الرئيسي
        let primaryHSL = '';
        let secondaryHSL = '';
        
        if (orgSettings.theme_primary_color) {
          primaryHSL = hexToHSL(orgSettings.theme_primary_color);
          document.documentElement.style.setProperty('--primary', primaryHSL);
          
          // إضافة متغيرات إضافية مشتقة من اللون الرئيسي
          const [h, s, l] = primaryHSL.split(' ');
          // قيم أفتح وأغمق للون الرئيسي
          document.documentElement.style.setProperty('--primary-foreground', '0 0% 100%');
          document.documentElement.style.setProperty('--primary-lighter', `${h} ${s} 85%`);
          document.documentElement.style.setProperty('--primary-darker', `${h} ${s} 25%`);
          
          // حفظ اللون الرئيسي في localStorage للتحميل السريع في المرات القادمة
          try {
            localStorage.setItem('theme_primary_color', orgSettings.theme_primary_color);
          } catch (error) {
            console.error('خطأ في تخزين اللون الرئيسي:', error);
          }
        }
        
        // اللون الثانوي
        if (orgSettings.theme_secondary_color) {
          secondaryHSL = hexToHSL(orgSettings.theme_secondary_color);
          document.documentElement.style.setProperty('--secondary', secondaryHSL);
          document.documentElement.style.setProperty('--secondary-foreground', '0 0% 100%');
          
          // حفظ اللون الثانوي في localStorage للتحميل السريع في المرات القادمة
          try {
            localStorage.setItem('theme_secondary_color', orgSettings.theme_secondary_color);
          } catch (error) {
            console.error('خطأ في تخزين اللون الثانوي:', error);
          }
        }
        
        // تخزين الألوان في localStorage للتحميل السريع في المرات القادمة
        try {
          localStorage.setItem(`org_theme_${window.location.hostname}`, JSON.stringify({
            primary: primaryHSL,
            secondary: secondaryHSL,
            primaryColor: orgSettings.theme_primary_color,
            secondaryColor: orgSettings.theme_secondary_color,
            timestamp: Date.now(),
            organizationId: targetOrgId
          }));
        } catch (error) {
          console.error('خطأ في تخزين ألوان الثيم:', error);
        }
        
        // تطبيق وضع المظهر من إعدادات المؤسسة
        if (orgSettings.theme_mode) {
          // تحويل "auto" إلى "system" إذا لزم الأمر
          const themeMode = orgSettings.theme_mode === 'auto' ? 'system' : orgSettings.theme_mode;
          
          // حفظ في localStorage كتفضيل للمؤسسة
          localStorage.setItem('theme-preference', themeMode);
          
          // تطبيق الثيم
          setTheme(themeMode as Theme);
        }
        
        // متغيرات CSS الإضافية للتأكد من ظهور الألوان بشكل صحيح في كل من الوضع الفاتح والمظلم
        // قيم الخلفية والنص للوضع الفاتح
        document.documentElement.style.setProperty('--light-background', '0 0% 100%');
        document.documentElement.style.setProperty('--light-foreground', '240 10% 3.9%');
        document.documentElement.style.setProperty('--light-card', '0 0% 100%');
        document.documentElement.style.setProperty('--light-card-foreground', '240 10% 3.9%');
        document.documentElement.style.setProperty('--light-muted', '240 4.8% 95.9%');
        document.documentElement.style.setProperty('--light-accent', '240 4.8% 95.9%');
        
        // قيم الخلفية والنص للوضع المظلم
        document.documentElement.style.setProperty('--dark-background', '240 10% 3.9%');
        document.documentElement.style.setProperty('--dark-foreground', '0 0% 98%');
        document.documentElement.style.setProperty('--dark-card', '240 10% 3.9%');
        document.documentElement.style.setProperty('--dark-card-foreground', '0 0% 98%');
        document.documentElement.style.setProperty('--dark-muted', '240 3.7% 15.9%');
        document.documentElement.style.setProperty('--dark-accent', '240 3.7% 15.9%');
        
        // Aplicar CSS personalizado si existe
        if (orgSettings.custom_css) {
          applyCustomCSS(orgSettings.custom_css);
        }
        
        // استعادة وقراءة إعدادات التتبع من custom_js (الذي هو JSON)
        if (orgSettings.custom_js) {
          try {
            const trackingSettings = JSON.parse(orgSettings.custom_js);
            

            // --- منطق استدعاء تهيئة البكسلات ---
            const pixels = trackingSettings?.trackingPixels;
            if (pixels) {
              // فيسبوك
              if (pixels.facebook?.enabled && pixels.facebook?.pixelId) {
                initializeFacebookPixel(pixels.facebook.pixelId);
              }
              // تيك توك
              if (pixels.tiktok?.enabled && pixels.tiktok?.pixelId) {
                initializeTikTokPixel(pixels.tiktok.pixelId);
              }
              // سناب شات
              if (pixels.snapchat?.enabled && pixels.snapchat?.pixelId) {
                initializeSnapchatPixel(pixels.snapchat.pixelId);
              }
              // جوجل
              if (pixels.google?.enabled && pixels.google?.pixelId) {
                initializeGooglePixel(pixels.google.pixelId);
              }
            }
            // --- نهاية منطق البكسلات ---

          } catch (parseError) {
            console.error("*** فشل في تحليل custom_js كـ JSON: ***", parseError);
            console.warn("--> تأكد من أن قيمة custom_js هي JSON صالح. القيمة المستلمة:", orgSettings.custom_js);
          }
        }
        
        // Aplicar HTML personalizado en el header si existe
        if (orgSettings.custom_header) {
          applyCustomHeader(orgSettings.custom_header);
        }
        
        // Aplicar HTML personalizado en el footer si existe
        if (orgSettings.custom_footer) {
          applyCustomFooter(orgSettings.custom_footer);
        }
        
        // Aplicar favicon si existe
        if (orgSettings.favicon_url) {
          applyFavicon(orgSettings.favicon_url);
        }
        
        // Aplicar nombre del sitio si existe
        if (orgSettings.site_name) {
          applySiteName(orgSettings.site_name);
        }
        
        
      }
    } catch (error) {
      console.error('خطأ في تحميل إعدادات المؤسسة:', error);
      
      // محاولة استخدام القيم المخزنة محليًا في حالة فشل الاتصال بالخادم
      try {
        const cachedTheme = localStorage.getItem(`org_theme_${window.location.hostname}`);
        if (cachedTheme) {
          const parsedTheme = JSON.parse(cachedTheme);
          if (parsedTheme.primaryColor) {
            document.documentElement.style.setProperty('--primary', parsedTheme.primary);
            
          }
          if (parsedTheme.secondaryColor) {
            document.documentElement.style.setProperty('--secondary', parsedTheme.secondary);
            
          }
        }
      } catch (localStorageError) {
        console.error('خطأ في قراءة الألوان المخزنة محليًا:', localStorageError);
      }
    }
  }, [currentOrganizationId, setTheme]);

  // Actualizar organizationId cuando cambia la prop
  useEffect(() => {
    if (initialOrganizationId && initialOrganizationId !== currentOrganizationId) {
      setCurrentOrganizationId(initialOrganizationId);
    }
  }, [initialOrganizationId, currentOrganizationId]);

  // Cargar y aplicar los colores inicialmente
  useEffect(() => {
    if (currentOrganizationId) {
      applyOrganizationTheme();
    }
  }, [applyOrganizationTheme, currentOrganizationId]);

  // تحديث وسم HTML عند تغيير الشكل
  useEffect(() => {
    // تطبيق فئة الثيم على عنصر html
    const root = window.document.documentElement;
    
    // إزالة الفئات القديمة
    root.classList.remove('light', 'dark');
    
    // تطبيق الفئة الجديدة بناءً على الثيم المحدد
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
      
      // تطبيق المتغيرات المناسبة للثيم
      if (systemTheme === 'light') {
        applyLightModeVariables(root);
      } else {
        applyDarkModeVariables(root);
      }
    } else {
      root.classList.add(theme);
      
      // تطبيق المتغيرات المناسبة للثيم
      if (theme === 'light') {
        applyLightModeVariables(root);
      } else {
        applyDarkModeVariables(root);
      }
    }
    
    // تخزين الإعداد في التخزين المحلي
    localStorage.setItem('theme', theme);
  }, [theme]);

  // تعريف وظائف مساعدة لتطبيق متغيرات CSS الخاصة بكل وضع
  const applyLightModeVariables = (root: HTMLElement) => {
    document.body.style.colorScheme = 'light';
    // يمكن تطبيق أي متغيرات CSS إضافية هنا إذا لزم الأمر
  };
  
  const applyDarkModeVariables = (root: HTMLElement) => {
    document.body.style.colorScheme = 'dark';
    // يمكن تطبيق أي متغيرات CSS إضافية هنا إذا لزم الأمر
  };

  // الاستماع لتغييرات إعدادات النظام إذا كان الشكل مضبوطًا على "system"
  useEffect(() => {
    if (theme !== 'system') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      const systemTheme = mediaQuery.matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
      
      // تطبيق متغيرات CSS المناسبة
      if (systemTheme === 'dark') {
        applyDarkModeVariables(root);
      } else {
        applyLightModeVariables(root);
      }
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

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
};

export default ThemeProvider; 