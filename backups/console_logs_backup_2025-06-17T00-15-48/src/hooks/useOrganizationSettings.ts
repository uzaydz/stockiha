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

  // Debounced fetch settings function - محسن مع نظام fallback شامل
  const debouncedFetchSettings = useCallback(async (orgId: string) => {
    // إلغاء الطلب السابق إذا كان موجوداً
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    // التحقق من الكاش أولاً - محسن
    const cachedData = getCachedSettings(orgId);
    if (cachedData) {
      console.log('✅ useOrganizationSettings: Using cached data for org:', orgId);
      setSettings(cachedData);
      setIsLoading(false);
      return;
    }

    // منع الطلبات المتكررة
    if (lastFetchedRef.current === orgId) {
      console.log('🔄 useOrganizationSettings: Skipping duplicate request for org:', orgId);
      return;
    }

    console.log('🚀 useOrganizationSettings: Starting settings fetch for org:', orgId);

    // Debounce محسن - زيادة الوقت لتقليل الاستعلامات
    fetchTimeoutRef.current = setTimeout(async () => {
      lastFetchedRef.current = orgId;
      setIsLoading(true);

      try {
        console.log('📡 useOrganizationSettings: Executing direct Supabase query...');
        
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

        console.log('📊 useOrganizationSettings: Supabase response:', { data: latestSettings, error, orgId });

        if (error) {
          console.warn('⚠️ useOrganizationSettings: Supabase error, trying fallback...', error);
          
          // نظام fallback محسن: استخدام unified API
          try {
            console.log('🔄 useOrganizationSettings: Trying unified API fallback...');
            const defaultSettings = await getOrganizationSettings(orgId);
            if (defaultSettings) {
              console.log('✅ useOrganizationSettings: Fallback successful!', defaultSettings);
              setSettings(defaultSettings);
              setCachedSettings(orgId, defaultSettings);
            } else {
              // إذا فشل كل شيء، استخدم الإعدادات الافتراضية
              console.log('🔧 useOrganizationSettings: Using default settings as last resort');
              const fallbackSettings = {
                organization_id: orgId,
                theme_primary_color: '#0099ff',
                theme_secondary_color: '#6c757d',
                theme_mode: 'light' as const,
                site_name: 'stockiha',
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
              setSettings(fallbackSettings);
              setCachedSettings(orgId, fallbackSettings);
            }
          } catch (fallbackError) {
            console.error('❌ useOrganizationSettings: All fallbacks failed!', fallbackError);
            
            // آخر محاولة: إعدادات افتراضية محلية
            const emergencySettings = {
              organization_id: orgId,
              theme_primary_color: '#0099ff',
              theme_secondary_color: '#6c757d',
              theme_mode: 'light' as const,
              site_name: 'stockiha',
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
            setSettings(emergencySettings);
          }
          return;
        }

        if (latestSettings) {
          console.log('✅ useOrganizationSettings: Settings loaded successfully!', latestSettings);
          
          // التحقق من نوع البيانات وإصلاحها إذا كانت مصفوفة
          let settingsData = latestSettings;
          if (Array.isArray(latestSettings)) {
            console.log('🔧 useOrganizationSettings: Received array, extracting first element');
            settingsData = latestSettings[0];
          }
          
          // التأكد من وجود organization_id
          if (!settingsData.organization_id) {
            console.log('🔧 useOrganizationSettings: Adding missing organization_id');
            settingsData = {
              ...settingsData,
              organization_id: orgId
            };
          }
          
          // تحليل بيانات التتبع والـ SEO بشكل محسن
          let trackingData: TrackingPixels = {
            facebook: { enabled: false, pixelId: '' },
            tiktok: { enabled: false, pixelId: '' },
            snapchat: { enabled: false, pixelId: '' },
            google: { enabled: false, pixelId: '' },
          };

          // تحليل custom_js فقط إذا كان قصيراً لتجنب البطء
          if (settingsData.custom_js && 
              typeof settingsData.custom_js === 'string' && 
              settingsData.custom_js.length < 10000) {
            try {
              const customJsData: CustomJsData = JSON.parse(settingsData.custom_js);
              if (customJsData.trackingPixels) {
                trackingData = customJsData.trackingPixels;
                console.log('📊 useOrganizationSettings: Tracking pixels parsed:', trackingData);
              }
            } catch (parseError) {
              console.warn('⚠️ useOrganizationSettings: JSON parse error for custom_js:', parseError);
              // تجاهل أخطاء التحليل للحفاظ على الأداء
            }
          }

          setTrackingPixels(trackingData);
          setSettings(settingsData);
          setCachedSettings(orgId, settingsData);
          
          console.log('🎉 useOrganizationSettings: All data set successfully!');
        } else {
          console.warn('⚠️ useOrganizationSettings: No settings data returned from Supabase');
        }
      } catch (error) {
        console.error('❌ useOrganizationSettings: Critical error in fetch process:', error);

        // محاولة استخدام البيانات المخزنة مؤقتاً حتى لو انتهت صلاحيتها
        const expiredCache = settingsCacheRef.current.get(orgId);
        if (expiredCache) {
          console.log('🔄 useOrganizationSettings: Using expired cache as emergency fallback');
          setSettings(expiredCache.data);
        } else {
          console.log('🔧 useOrganizationSettings: Creating emergency default settings');
          // إنشاء إعدادات طوارئ
          const emergencySettings = {
            organization_id: orgId,
            theme_primary_color: '#0099ff',
            theme_secondary_color: '#6c757d',
            theme_mode: 'light' as const,
            site_name: 'stockiha',
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
          setSettings(emergencySettings);
        }
      } finally {
        setIsLoading(false);
        console.log('🏁 useOrganizationSettings: Fetch process completed for org:', orgId);
      }
    }, 1000); // زيادة debounce إلى ثانية واحدة
  }, [getCachedSettings, setCachedSettings]);

  // تحميل البيانات مع debouncing ونظام fallback للصلاحيات
  useEffect(() => {
    if (organizationId && organizationId !== lastFetchedRef.current) {
      // فحص أولي لحل مشكلة الصلاحيات
      console.log('🔍 useOrganizationSettings: Initial check for permissions issue', {
        organizationId,
        lastFetched: lastFetchedRef.current
      });
      
      debouncedFetchSettings(organizationId);
    }

    // Cleanup
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [organizationId, debouncedFetchSettings]);

  // نظام fallback للصلاحيات: إذا كانت الإعدادات موجودة لكن organization_id غير محدد
  useEffect(() => {
    if (organizationId && settings && !settings.organization_id) {
      console.warn('⚠️ useOrganizationSettings: Settings exist but organization_id is missing!', {
        organizationId,
        settings: Object.keys(settings),
        hasThemeColor: !!settings.theme_primary_color
      });
      
             // إضافة organization_id للإعدادات الموجودة
       const fixedSettings: OrganizationSettings = {
         ...settings,
         organization_id: organizationId
       };
      
      console.log('🔧 useOrganizationSettings: Fixing settings with organization_id');
      setSettings(fixedSettings);
      setCachedSettings(organizationId, fixedSettings);
    }
  }, [organizationId, settings, setCachedSettings]);

  // نظام fallback إضافي: إنشاء إعدادات افتراضية إذا فشل كل شيء
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (organizationId && !isLoading && (!settings || !settings.organization_id)) {
        console.log('🆘 useOrganizationSettings: Creating emergency default settings');
        
        const emergencySettings = {
          organization_id: organizationId,
          theme_primary_color: '#0099ff',
          theme_secondary_color: '#6c757d', 
          theme_mode: 'light' as const,
          site_name: 'متجري',
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
        
        setSettings(emergencySettings);
        setCachedSettings(organizationId, emergencySettings);
        
        console.log('✅ useOrganizationSettings: Emergency settings created successfully');
      }
    }, 5000); // انتظار 5 ثوانِ قبل إنشاء الإعدادات الافتراضية

    return () => clearTimeout(timeout);
  }, [organizationId, isLoading, settings, setCachedSettings]);

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
