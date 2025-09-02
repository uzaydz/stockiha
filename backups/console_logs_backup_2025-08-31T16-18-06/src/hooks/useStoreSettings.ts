import { useState, useEffect, useCallback } from "react";
import { useTenant } from "@/context/TenantContext";
import { useToast } from "@/hooks/use-toast";
import { 
  getStoreSettingsComplete, 
  updateStoreSettings, 
  clearStoreSettingsCache
} from "@/lib/api/store-settings";
import type { OrganizationSettings, UpdateSettingsPayload } from "@/types/settings";

// تعريف الأنواع المطلوبة
interface UseStoreSettingsProps {
  organizationId: string | undefined;
  autoApplyTheme?: boolean;
}

interface TrackingPixels {
  facebook: { enabled: boolean; pixelId: string };
  tiktok: { enabled: boolean; pixelId: string };
  snapchat: { enabled: boolean; pixelId: string };
  google: { enabled: boolean; pixelId: string };
}

interface UseStoreSettingsReturn {
  settings: OrganizationSettings | null;
  trackingPixels: TrackingPixels;
  isLoading: boolean;
  isSaving: boolean;
  saveSuccess: boolean;
  error: string | null;
  updateSetting: (key: keyof OrganizationSettings, value: any) => void;
  updateTrackingPixel: (platform: keyof TrackingPixels, field: string, value: any) => void;
  saveSettings: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  exportSettings: () => Promise<string | null>;
  importSettings: (jsonData: string) => Promise<{ success: boolean; message: string }>;
  clearCache: () => void;
  applyTheme: () => Promise<void>;
}

export const useStoreSettings = ({ 
  organizationId, 
  autoApplyTheme = true 
}: UseStoreSettingsProps): UseStoreSettingsReturn => {
  const { toast } = useToast();
  
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [trackingPixels, setTrackingPixels] = useState<TrackingPixels>({
    facebook: { enabled: false, pixelId: '' },
    tiktok: { enabled: false, pixelId: '' },
    snapchat: { enabled: false, pixelId: '' },
    google: { enabled: false, pixelId: '' },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // دالة مساعدة لتحويل HEX إلى HSL
  const hexToHsl = (hex: string) => {
    // إزالة # إذا كانت موجودة
    hex = hex.replace('#', '');
    
    // تحويل HEX إلى RGB
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  };

  // دالة تطبيق الثيم
  const applyTheme = useCallback(async () => {
    if (!settings) return;
    
    try {
      // تطبيق الإعدادات المحلية مباشرة
      const root = document.documentElement;
      
      // تحديث عنوان الصفحة
      if (settings.site_name) {
        document.title = settings.site_name;
      }

      // تحديث الأيقونة
      if (settings.favicon_url) {
        const existingFavicons = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]');
        existingFavicons.forEach(favicon => favicon.remove());

        const newFavicon = document.createElement('link');
        newFavicon.rel = 'icon';
        newFavicon.type = 'image/x-icon';
        newFavicon.href = `${settings.favicon_url}?v=${Date.now()}`;
        document.head.appendChild(newFavicon);
      }

      // تحديث متغيرات CSS للألوان
      if (settings.theme_primary_color) {
        const hsl = hexToHsl(settings.theme_primary_color);
        root.style.setProperty('--primary', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
        root.style.setProperty('--color-primary', settings.theme_primary_color);
        root.style.setProperty('--primary-foreground', '0 0% 98%');
        root.style.setProperty('--ring', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
      }

      if (settings.theme_secondary_color) {
        const hsl = hexToHsl(settings.theme_secondary_color);
        root.style.setProperty('--secondary', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
        root.style.setProperty('--color-secondary', settings.theme_secondary_color);
        root.style.setProperty('--secondary-foreground', '0 0% 9%');
      }

      // تطبيق CSS مخصص
      if (settings.custom_css) {
        let customStyleElement = document.getElementById('custom-organization-styles');
        if (!customStyleElement) {
          customStyleElement = document.createElement('style');
          customStyleElement.id = 'custom-organization-styles';
          document.head.appendChild(customStyleElement);
        }
        customStyleElement.textContent = settings.custom_css;
      }

      // تطبيق الوضع (الوضع المظلم/الفاتح)
      if (settings.theme_mode) {
        const mode = settings.theme_mode === 'auto' ? 'light' : settings.theme_mode;
        root.setAttribute('data-theme', mode);
        root.classList.remove('light', 'dark');
        root.classList.add(mode);
      }

    } catch (error) {
    }
  }, [settings]);

  // تحميل إعدادات المتجر
  const loadStoreSettings = useCallback(async () => {
    if (!organizationId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // مسح الكاش أولاً لضمان الحصول على أحدث البيانات
      clearStoreSettingsCache(organizationId);

      const response = await getStoreSettingsComplete(organizationId);
      
      if (response && response.success && response.settings) {
        setSettings(response.settings);
        
        // تحديث بيانات التتبع
        if (response.tracking_pixels) {
          setTrackingPixels({
            facebook: response.tracking_pixels.facebook || { enabled: false, pixelId: '' },
            tiktok: response.tracking_pixels.tiktok || { enabled: false, pixelId: '' },
            snapchat: response.tracking_pixels.snapchat || { enabled: false, pixelId: '' },
            google: response.tracking_pixels.google || { enabled: false, pixelId: '' },
          });
        }

        // تطبيق الثيم تلقائياً إذا كان مفعلاً
        if (autoApplyTheme) {
          // تطبيق الثيم مباشرة من الإعدادات المحلية
          setTimeout(() => {
            applyTheme();
          }, 100);
        }
      } else {
        // إنشاء إعدادات افتراضية إذا لم توجد
        const defaultSettings: OrganizationSettings = {
          organization_id: organizationId,
          theme_primary_color: '#3B82F6',
          theme_secondary_color: '#10B981',
          theme_mode: 'light',
          site_name: 'متجري الإلكتروني',
          custom_css: null,
          logo_url: null,
          favicon_url: null,
          default_language: 'ar',
          custom_js: null,
          custom_header: null,
          custom_footer: null,
          enable_registration: true,
          enable_public_site: true,
          display_text_with_logo: true,
        };
        setSettings(defaultSettings);
        setError(response?.message || 'فشل في تحميل الإعدادات');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ غير متوقع';
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "خطأ في تحميل الإعدادات",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, autoApplyTheme, toast]);

  // تحميل الإعدادات عند تغيير معرف المؤسسة
  useEffect(() => {
    loadStoreSettings();
  }, [loadStoreSettings]);

  // تطبيق الثيم عند تغيير الإعدادات
  useEffect(() => {
    if (settings && autoApplyTheme) {
      // تأخير صغير لضمان تحديث الحالة
      const timer = setTimeout(() => {
        applyTheme();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [settings, autoApplyTheme, applyTheme]);

  // دالة تحديث إعداد واحد
  const updateSetting = useCallback((key: keyof OrganizationSettings, value: any) => {
    if (settings) {
      setSettings(prev => prev ? { ...prev, [key]: value } : null);
      setSaveSuccess(false);
    }
  }, [settings]);

  // دالة تحديث بكسل التتبع
  const updateTrackingPixel = useCallback((platform: keyof TrackingPixels, field: string, value: any) => {
    setTrackingPixels(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        [field]: value
      }
    }));
    setSaveSuccess(false);
  }, []);

  // دالة حفظ الإعدادات
  const saveSettings = useCallback(async () => {
    if (!organizationId || !settings) {
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);
    setError(null);

    try {
      // تحديث custom_js مع بيانات التتبع
      const updatedCustomJs = {
        trackingPixels,
        auto_deduct_inventory: true // إضافة إعداد خصم المخزون التلقائي
      };

      const payload: UpdateSettingsPayload = {
        theme_primary_color: settings.theme_primary_color,
        theme_secondary_color: settings.theme_secondary_color,
        theme_mode_org: settings.theme_mode === 'auto' ? 'system' : settings.theme_mode as 'light' | 'dark' | 'system',
        site_name: settings.site_name,
        custom_css: settings.custom_css,
        logo_url: settings.logo_url,
        favicon_url: settings.favicon_url,
        default_language: settings.default_language,
        custom_js: JSON.stringify(updatedCustomJs),
        custom_header: settings.custom_header,
        custom_footer: settings.custom_footer,
        enable_registration: settings.enable_registration,
        enable_public_site: settings.enable_public_site,
        display_text_with_logo: settings.display_text_with_logo
      };

      const result = await updateStoreSettings(organizationId, payload);

      if (result && result.success && result.data) {
        setSettings(result.data);
        setSaveSuccess(true);
        
        toast({
          title: "تم الحفظ بنجاح",
          description: "تم حفظ إعدادات المتجر بنجاح",
        });

        // مسح الكاش بعد الحفظ
        clearStoreSettingsCache(organizationId);

      } else {
        throw new Error(result?.message || 'فشل في حفظ الإعدادات');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ غير متوقع';
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "خطأ في الحفظ",
        description: errorMessage,
      });
    } finally {
      setIsSaving(false);
    }
  }, [organizationId, settings, trackingPixels, autoApplyTheme, toast, applyTheme]);

  // دالة إعادة تحميل الإعدادات
  const refreshSettings = useCallback(async () => {
    await loadStoreSettings();
  }, [loadStoreSettings]);

  // دالة تصدير الإعدادات
  const exportSettings = useCallback(async (): Promise<string | null> => {
    if (!organizationId) return null;
    
    try {
      const { exportStoreSettings } = await import("@/lib/api/store-settings");
      return await exportStoreSettings(organizationId);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "خطأ في التصدير",
        description: "فشل في تصدير إعدادات المتجر",
      });
      return null;
    }
  }, [organizationId, toast]);

  // دالة استيراد الإعدادات
  const importSettings = useCallback(async (jsonData: string): Promise<{ success: boolean; message: string }> => {
    if (!organizationId) {
      return { success: false, message: 'معرف المؤسسة غير متوفر' };
    }
    
    try {
      const { importStoreSettings } = await import("@/lib/api/store-settings");
      const result = await importStoreSettings(organizationId, jsonData);
      
      if (result.success) {
        await refreshSettings(); // إعادة تحميل الإعدادات بعد الاستيراد
        toast({
          title: "تم الاستيراد بنجاح",
          description: result.message,
        });
      } else {
        toast({
          variant: "destructive",
          title: "خطأ في الاستيراد",
          description: result.message,
        });
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'فشل في استيراد الإعدادات';
      toast({
        variant: "destructive",
        title: "خطأ في الاستيراد",
        description: errorMessage,
      });
      return { success: false, message: errorMessage };
    }
  }, [organizationId, refreshSettings, toast]);

  // دالة مسح الكاش
  const clearCache = useCallback(() => {
    if (organizationId) {
      clearStoreSettingsCache(organizationId);
      toast({
        title: "تم مسح الكاش",
        description: "تم مسح كاش إعدادات المتجر بنجاح",
      });
    }
  }, [organizationId, toast]);

  return {
    settings,
    trackingPixels,
    isLoading,
    isSaving,
    saveSuccess,
    error,
    updateSetting,
    updateTrackingPixel,
    saveSettings,
    refreshSettings,
    exportSettings,
    importSettings,
    clearCache,
    applyTheme
  };
};
