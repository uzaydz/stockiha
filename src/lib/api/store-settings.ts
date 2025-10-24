import { supabase } from '../supabase-client';
import { OrganizationSettings, UpdateSettingsPayload } from '@/types/settings';

/**
 * نوع البيانات المرجعة من RPC function
 */
interface StoreSettingsResponse {
  success: boolean;
  settings?: OrganizationSettings;
  organization?: {
    name: string;
    subdomain: string;
    domain: string;
    owner_id: string;
  };
  tracking_pixels?: {
    facebook: { enabled: boolean; pixelId: string };
    google: { enabled: boolean; pixelId: string };
    tiktok: { enabled: boolean; pixelId: string };
    snapchat: { enabled: boolean; pixelId: string };
  };
  error?: string;
  message?: string;
  timestamp?: number;
}

/**
 * نوع البيانات المرجعة من تحديث الإعدادات
 */
interface UpdateStoreSettingsResponse {
  success: boolean;
  data?: OrganizationSettings;
  error?: string;
  message?: string;
  timestamp?: number;
}

/**
 * نوع البيانات المرجعة من إعدادات الثيم
 */
interface ThemeSettingsResponse {
  success: boolean;
  theme?: {
    primary_color: string;
    secondary_color: string;
    mode: string;
    custom_css: string | null;
    logo_url: string | null;
    favicon_url: string | null;
    site_name: string;
    display_text_with_logo: boolean;
  };
  error?: string;
  message?: string;
}

/**
 * جلب جميع إعدادات المتجر بشكل شامل
 */
export const getStoreSettingsComplete = async (organizationId: string): Promise<StoreSettingsResponse | null> => {
  try {
    if (!organizationId) {
      throw new Error('معرف المؤسسة مطلوب');
    }

    const { data, error } = await supabase.rpc('get_store_settings_complete' as any, {
      p_organization_id: organizationId
    });

    if (error) {
      throw error;
    }

    return data as StoreSettingsResponse;
  } catch (error) {
    return null;
  }
};

/**
 * تحديث إعدادات المتجر بشكل شامل
 */
export const updateStoreSettings = async (
  organizationId: string,
  payload: UpdateSettingsPayload
): Promise<UpdateStoreSettingsResponse | null> => {
  try {
    if (!organizationId) {
      throw new Error('معرف المؤسسة مطلوب');
    }

    // تحضير معاملات RPC
    const rpcParams = {
      org_id: organizationId,
      p_theme_primary_color: payload.theme_primary_color || null,
      p_theme_secondary_color: payload.theme_secondary_color || null,
      p_theme_mode: payload.theme_mode_org ? 
        (payload.theme_mode_org === 'system' ? 'auto' : payload.theme_mode_org) 
        : null,
      p_site_name: payload.site_name || null,
      p_custom_css: payload.custom_css !== undefined ? payload.custom_css : null,
      p_logo_url: payload.logo_url !== undefined ? payload.logo_url : null,
      p_favicon_url: payload.favicon_url !== undefined ? payload.favicon_url : null,
      p_default_language: payload.default_language || null,
      p_custom_js: payload.custom_js !== undefined ? payload.custom_js : null,
      p_custom_header: payload.custom_header !== undefined ? payload.custom_header : null,
      p_custom_footer: payload.custom_footer !== undefined ? payload.custom_footer : null,
      p_enable_registration: payload.enable_registration !== undefined ? payload.enable_registration : null,
      p_enable_public_site: payload.enable_public_site !== undefined ? payload.enable_public_site : null,
      p_display_text_with_logo: payload.display_text_with_logo !== undefined ? payload.display_text_with_logo : null
    };

    const { data, error } = await supabase.rpc('update_store_settings_comprehensive' as any, rpcParams);

    if (error) {
      throw error;
    }

    return data as UpdateStoreSettingsResponse;
  } catch (error) {
    return null;
  }
};

/**
 * جلب إعدادات الثيم فقط (للاستخدام السريع)
 */
export const getOrganizationTheme = async (organizationId: string): Promise<ThemeSettingsResponse | null> => {
  try {
    if (!organizationId) {
      throw new Error('معرف المؤسسة مطلوب');
    }

    const { data, error } = await supabase.rpc('get_organization_theme' as any, {
      p_organization_id: organizationId
    });

    if (error) {
      throw error;
    }

    return data as ThemeSettingsResponse;
  } catch (error) {
    return null;
  }
};

/**
 * تطبيق إعدادات الثيم على DOM
 */
export const applyThemeSettings = async (theme: ThemeSettingsResponse['theme']) => {
  if (!theme) return;

  try {
    const root = document.documentElement;

    // تحديث عنوان الصفحة
    if (theme.site_name) {
      document.title = theme.site_name;
    }

    // تحديث الأيقونة
    if (theme.favicon_url) {
      const existingFavicons = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]');
      existingFavicons.forEach(favicon => favicon.remove());

      const newFavicon = document.createElement('link');
      newFavicon.rel = 'icon';
      newFavicon.type = 'image/x-icon';
      newFavicon.href = `${theme.favicon_url}?v=${Date.now()}`;
      document.head.appendChild(newFavicon);
    }

    // تحديث متغيرات CSS للألوان
    if (theme.primary_color) {
      const hsl = hexToHsl(theme.primary_color);
      root.style.setProperty('--primary', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
      root.style.setProperty('--color-primary', theme.primary_color);
      root.style.setProperty('--primary-foreground', '0 0% 98%');
      root.style.setProperty('--ring', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
    }

    if (theme.secondary_color) {
      const hsl = hexToHsl(theme.secondary_color);
      root.style.setProperty('--secondary', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
      root.style.setProperty('--color-secondary', theme.secondary_color);
      root.style.setProperty('--secondary-foreground', '0 0% 9%');
    }

    // تطبيق CSS مخصص
    if (theme.custom_css) {
      let customStyleElement = document.getElementById('custom-organization-styles');
      if (!customStyleElement) {
        customStyleElement = document.createElement('style');
        customStyleElement.id = 'custom-organization-styles';
        document.head.appendChild(customStyleElement);
      }
      customStyleElement.textContent = theme.custom_css;
    }

    // تحديث الشعارات
    if (theme.logo_url) {
      const logoElements = document.querySelectorAll('img[data-logo="organization"]');
      logoElements.forEach(element => {
        const imgElement = element as HTMLImageElement;
        imgElement.src = `${theme.logo_url}?v=${Date.now()}`;
      });
    }

    // إجبار إعادة رسم الصفحة
    root.style.display = 'none';
    root.offsetHeight; // trigger reflow
    root.style.display = '';

  } catch (error) {
  }
};

/**
 * دالة مساعدة لتحويل HEX إلى HSL
 */
const hexToHsl = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

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

/**
 * مسح كاش إعدادات المتجر
 */
export const clearStoreSettingsCache = (organizationId: string) => {
  if (typeof window !== 'undefined') {
    // مسح الكاش المحلي
    localStorage.removeItem(`store_settings_${organizationId}`);
    localStorage.removeItem(`organization_settings_${organizationId}`);
    localStorage.removeItem(`theme_settings_${organizationId}`);
    
    // مسح كاش الجلسة
    sessionStorage.removeItem(`settings_cache_${organizationId}`);
    
    // مسح كاش React Query إذا كان متوفراً
    if ((window as any).queryClient) {
      (window as any).queryClient.invalidateQueries(['store_settings', organizationId]);
      (window as any).queryClient.invalidateQueries(['organization_settings', organizationId]);
      (window as any).queryClient.invalidateQueries(['theme_settings', organizationId]);
    }
  }
};

/**
 * تصدير الإعدادات إلى JSON
 */
export const exportStoreSettings = async (organizationId: string): Promise<string | null> => {
  try {
    const settings = await getStoreSettingsComplete(organizationId);
    if (!settings || !settings.success) {
      throw new Error('فشل في جلب الإعدادات للتصدير');
    }

    const exportData = {
      exported_at: new Date().toISOString(),
      organization_id: organizationId,
      settings: settings.settings,
      tracking_pixels: settings.tracking_pixels,
      version: '1.0'
    };

    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    return null;
  }
};

/**
 * استيراد الإعدادات من JSON
 */
export const importStoreSettings = async (
  organizationId: string, 
  jsonData: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const importData = JSON.parse(jsonData);
    
    if (!importData.settings) {
      throw new Error('بيانات الإعدادات غير صحيحة');
    }

    // تحويل البيانات المستوردة إلى UpdateSettingsPayload
    const payload: UpdateSettingsPayload = {
      theme_primary_color: importData.settings.theme_primary_color,
      theme_secondary_color: importData.settings.theme_secondary_color,
      theme_mode_org: importData.settings.theme_mode,
      site_name: importData.settings.site_name,
      custom_css: importData.settings.custom_css,
      logo_url: importData.settings.logo_url,
      favicon_url: importData.settings.favicon_url,
      default_language: importData.settings.default_language,
      custom_js: importData.settings.custom_js,
      custom_header: importData.settings.custom_header,
      custom_footer: importData.settings.custom_footer,
      enable_registration: importData.settings.enable_registration,
      enable_public_site: importData.settings.enable_public_site,
      display_text_with_logo: importData.settings.display_text_with_logo
    };

    const result = await updateStoreSettings(organizationId, payload);
    
    if (!result || !result.success) {
      throw new Error(result?.message || 'فشل في تحديث الإعدادات');
    }

    return {
      success: true,
      message: 'تم استيراد إعدادات المتجر بنجاح'
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'فشل في استيراد الإعدادات'
    };
  }
};
