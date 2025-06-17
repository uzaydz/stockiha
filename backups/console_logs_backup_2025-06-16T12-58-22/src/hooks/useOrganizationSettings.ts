import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { toast } from '@/components/ui/use-toast';
import { 
  getOrganizationSettings, 
  updateOrganizationSettings
} from '@/lib/api/settings';
import { useTenant } from '@/context/TenantContext';
import { OrganizationSettings } from '@/types/settings';
import { useTheme } from 'next-themes';
import { supabase } from '@/lib/supabase';

interface UseOrganizationSettingsProps {
  organizationId: string | undefined;
}

interface TrackingPixels {
  facebook: { enabled: boolean; pixelId: string };
  tiktok: { enabled: boolean; pixelId: string };
  snapchat: { enabled: boolean; pixelId: string };
  google: { enabled: boolean; pixelId: string };
}

// تعريف واجهة إعدادات SEO
interface SEOSettings {
  title?: string;
  description?: string;
  keywords?: string;
  robots_txt?: string;
  enable_sitemap?: boolean;
  enable_canonical_urls?: boolean;
  generate_meta_tags?: boolean;
  enable_open_graph?: boolean;
  enable_twitter_cards?: boolean;
  enable_schema_markup?: boolean;
  default_image_url?: string;
  social_media?: {
    twitter_handle?: string;
    facebook_page?: string;
    instagram_handle?: string;
    linkedin_page?: string;
    [key: string]: string | undefined;
  };
  structured_data?: {
    business_type?: string;
    business_name?: string;
    business_logo?: string;
    business_address?: string;
    business_phone?: string;
    [key: string]: string | undefined;
  };
  advanced?: {
    custom_head_tags?: string;
    google_analytics_id?: string;
    google_tag_manager_id?: string;
    google_search_console_id?: string;
    bing_webmaster_id?: string;
    custom_robots_txt?: string;
    [key: string]: string | undefined;
  };
  [key: string]: any;
}

// تعريف واجهة بيانات custom_js
interface CustomJsData {
  trackingPixels: TrackingPixels;
  seoSettings?: SEOSettings;
  [key: string]: any;
}

interface UseOrganizationSettingsReturn {
  settings: OrganizationSettings;
  trackingPixels: TrackingPixels;
  isLoading: boolean;
  isSaving: boolean;
  saveSuccess: boolean;
  updateSetting: (key: keyof OrganizationSettings, value: any) => void;
  updateTrackingPixel: (platform: keyof TrackingPixels, field: string, value: any) => void;
  saveSettings: () => Promise<void>;
}

/**
 * هوك مخصص للتعامل مع إعدادات المؤسسة
 */
export const useOrganizationSettings = ({ organizationId }: UseOrganizationSettingsProps): UseOrganizationSettingsReturn => {
  const { setTheme } = useTheme();
  const { refreshOrganizationData } = useTenant();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // بيانات الإعدادات
  const [settings, setSettings] = useState<OrganizationSettings>({
    organization_id: organizationId || '',
    theme_primary_color: '#0099ff',
    theme_secondary_color: '#6c757d',
    theme_mode: 'light',
    site_name: '',
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
  });

  // بيانات بكسل التتبع
  const [trackingPixels, setTrackingPixels] = useState<TrackingPixels>({
    facebook: { enabled: false, pixelId: '' },
    tiktok: { enabled: false, pixelId: '' },
    snapchat: { enabled: false, pixelId: '' },
    google: { enabled: false, pixelId: '' },
  });

  // References لمنع re-renders والتحديثات المتكررة
  const lastFetchedRef = useRef<string | null>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const settingsCacheRef = useRef<Map<string, { data: OrganizationSettings; timestamp: number }>>(new Map());
  const isFirstThemeSetRef = useRef(true);
  
  // Cache timeout - 30 seconds
  const CACHE_DURATION = 30 * 1000;

  // تطبيق وضع الثيم عند تغييره في الإعدادات مع منع التحديث المتكرر
  useEffect(() => {
    if (!isLoading && settings.theme_mode && isFirstThemeSetRef.current) {
      isFirstThemeSetRef.current = false;
      const themeMode = settings.theme_mode === 'auto' ? 'system' : settings.theme_mode;
      setTheme(themeMode);
    }
  }, [settings.theme_mode, isLoading, setTheme]);

  // دالة للتحقق من صحة الكاش
  const getCachedSettings = useCallback((orgId: string) => {
    const cached = settingsCacheRef.current.get(orgId);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }, []);

  // دالة لحفظ في الكاش
  const setCachedSettings = useCallback((orgId: string, data: OrganizationSettings) => {
    settingsCacheRef.current.set(orgId, { data, timestamp: Date.now() });
  }, []);

  // Debounced fetch settings function - محسن
  const debouncedFetchSettings = useCallback(async (orgId: string) => {
    // إلغاء الطلب السابق إذا كان موجوداً
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    // التحقق من الكاش أولاً - محسن
    const cachedData = getCachedSettings(orgId);
    if (cachedData) {
      setSettings(cachedData);
      setIsLoading(false);
      return;
    }

    // منع الطلبات المتكررة
      if (lastFetchedRef.current === orgId) {
        return;
      }

    // Debounce محسن - زيادة الوقت لتقليل الاستعلامات
    fetchTimeoutRef.current = setTimeout(async () => {
      lastFetchedRef.current = orgId;
      setIsLoading(true);

      try {
        // استخدام الدالة المحسنة لجلب الإعدادات
        const { data: latestSettings, error } = await supabase
          .from('organization_settings')
          .select(`
            id, organization_id, theme_primary_color, theme_secondary_color,
            theme_mode, site_name, logo_url, favicon_url, default_language,
            enable_registration, enable_public_site, display_text_with_logo,
            custom_css, custom_js, custom_header, custom_footer
          `)
          .eq('organization_id', orgId)
          .single();

        if (error) {
          // استخدام الإعدادات الافتراضية عند الخطأ
          const defaultSettings = await getOrganizationSettings(orgId);
          if (defaultSettings) {
            setSettings(defaultSettings);
            setCachedSettings(orgId, defaultSettings);
          }
          return;
        }

        if (latestSettings) {
          // تحليل بيانات التتبع والـ SEO بشكل محسن
          let trackingData: TrackingPixels = {
            facebook: { enabled: false, pixelId: '' },
            tiktok: { enabled: false, pixelId: '' },
            snapchat: { enabled: false, pixelId: '' },
            google: { enabled: false, pixelId: '' },
          };

          // تحليل custom_js فقط إذا كان قصيراً لتجنب البطء
          if (latestSettings.custom_js && 
              typeof latestSettings.custom_js === 'string' && 
              latestSettings.custom_js.length < 10000) {
            try {
              const customJsData: CustomJsData = JSON.parse(latestSettings.custom_js);
              if (customJsData.trackingPixels) {
                trackingData = customJsData.trackingPixels;
              }
            } catch (parseError) {
              // تجاهل أخطاء التحليل للحفاظ على الأداء
              console.warn('تحذير: فشل في تحليل custom_js:', parseError);
            }
          }

          setTrackingPixels(trackingData);
          setSettings(latestSettings);
          setCachedSettings(orgId, latestSettings);
        }
      } catch (error) {
        console.error('خطأ في جلب إعدادات المؤسسة:', error);

        // محاولة استخدام البيانات المخزنة مؤقتاً حتى لو انتهت صلاحيتها
        const expiredCache = settingsCacheRef.current.get(orgId);
        if (expiredCache) {
          setSettings(expiredCache.data);
        }
      } finally {
        setIsLoading(false);
      }
    }, 1000); // زيادة debounce إلى ثانية واحدة
  }, [getCachedSettings, setCachedSettings]);

  // تحميل البيانات مع debouncing
  useEffect(() => {
    if (organizationId && organizationId !== lastFetchedRef.current) {
      debouncedFetchSettings(organizationId);
    }

    // Cleanup
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [organizationId, debouncedFetchSettings]);

  // تحديث قيمة في الإعدادات مع منع تطبيق الثيم المتكرر
  const updateSetting = useCallback((key: keyof OrganizationSettings, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));

    // تطبيق الثيم فقط إذا كان مختلفاً
    if (key === 'theme_mode' && value !== settings.theme_mode) {
      const themeMode = value === 'auto' ? 'system' : value;
      setTheme(themeMode);
    }
  }, [settings.theme_mode, setTheme]);

  // تحديث قيمة في بكسل التتبع
  const updateTrackingPixel = useCallback((platform: keyof TrackingPixels, field: string, value: any) => {
    setTrackingPixels((prev) => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        [field]: value,
      },
    }));
  }, []);
  
  // دالة محسنة لحفظ الإعدادات
  const saveSettings = useCallback(async (): Promise<void> => {
    if (!organizationId || isSaving) {
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      // دمج بيانات التتبع مع الإعدادات الموجودة
      const customJsData: CustomJsData = {
        trackingPixels
      };

      const updatedSettings = {
        ...settings,
        custom_js: JSON.stringify(customJsData)
      };
      
      // حفظ محسن باستخدام upsert
      const { error } = await supabase
        .from('organization_settings')
        .upsert(updatedSettings, {
          onConflict: 'organization_id'
        });
          
          if (error) {
            throw error;
          }

      // تحديث الكاش فوراً
      setCachedSettings(organizationId, updatedSettings);
      
      setSaveSuccess(true);
      
      // إزالة رسالة النجاح بعد وقت قصير
      setTimeout(() => setSaveSuccess(false), 3000);

    } catch (error: any) {
      console.error('خطأ في حفظ إعدادات المؤسسة:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [organizationId, settings, trackingPixels, isSaving, setCachedSettings]);

  // Memoized return value
  const returnValue = useMemo(() => ({
    settings,
    trackingPixels,
    isLoading,
    isSaving,
    saveSuccess,
    updateSetting,
    updateTrackingPixel,
    saveSettings,
  }), [settings, trackingPixels, isLoading, isSaving, saveSuccess, updateSetting, updateTrackingPixel, saveSettings]);

  return returnValue;
};

export default useOrganizationSettings;
