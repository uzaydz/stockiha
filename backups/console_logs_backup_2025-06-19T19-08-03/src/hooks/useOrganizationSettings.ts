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
          
          // نظام fallback محسن: استخدام unified API
          try {
            const defaultSettings = await getOrganizationSettings(orgId);
            if (defaultSettings) {
              setSettings(defaultSettings);
              setCachedSettings(orgId, defaultSettings);
            } else {
              // إذا فشل كل شيء، استخدم الإعدادات الافتراضية
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
          
          // التحقق من نوع البيانات وإصلاحها إذا كانت مصفوفة
          let settingsData = latestSettings;
          if (Array.isArray(latestSettings)) {
            settingsData = latestSettings[0];
          }
          
          // التأكد من وجود organization_id
          if (!settingsData.organization_id) {
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
              }
            } catch (parseError) {
              // تجاهل أخطاء التحليل للحفاظ على الأداء
            }
          }

          setTrackingPixels(trackingData);
          setSettings(settingsData);
          setCachedSettings(orgId, settingsData);
          
        } else {
        }
      } catch (error) {

        // محاولة استخدام البيانات المخزنة مؤقتاً حتى لو انتهت صلاحيتها
        const expiredCache = settingsCacheRef.current.get(orgId);
        if (expiredCache) {
          setSettings(expiredCache.data);
        } else {
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
      }
    }, 1000); // زيادة debounce إلى ثانية واحدة
  }, [getCachedSettings, setCachedSettings]);

  // تحميل البيانات مع debouncing ونظام fallback للصلاحيات
  useEffect(() => {
    if (organizationId && organizationId !== lastFetchedRef.current) {
      // فحص أولي لحل مشكلة الصلاحيات
      
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
      
             // إضافة organization_id للإعدادات الموجودة
       const fixedSettings: OrganizationSettings = {
         ...settings,
         organization_id: organizationId
       };
      
      setSettings(fixedSettings);
      setCachedSettings(organizationId, fixedSettings);
    }
  }, [organizationId, settings, setCachedSettings]);

  // نظام fallback إضافي: إنشاء إعدادات افتراضية إذا فشل كل شيء
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (organizationId && !isLoading && (!settings || !settings.organization_id)) {
        
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
        
      }
    }, 5000); // انتظار 5 ثوانِ قبل إنشاء الإعدادات الافتراضية

    return () => clearTimeout(timeout);
  }, [organizationId, isLoading, settings, setCachedSettings]);

  // تحديث قيمة في الإعدادات مع منع تطبيق الثيم المتكرر
  const updateSetting = useCallback((key: keyof OrganizationSettings, value: any) => {
    console.log(`🔄 تحديث ${key} إلى:`, value);
    
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));

    // تطبيق الثيم فقط إذا كان مختلفاً
    if (key === 'theme_mode' && value !== settings.theme_mode) {
      const themeMode = value === 'auto' ? 'system' : value;
      setTheme(themeMode);
    }
    
    // تسجيل تغيير اللغة الافتراضية
    if (key === 'default_language') {
      console.log(`🌐 تحديث اللغة الافتراضية إلى: ${value}`);
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
  
  // دالة محسنة لحفظ الإعدادات مع إعادة جلب فورية
  const saveSettings = useCallback(async (): Promise<void> => {
    if (!organizationId || isSaving) {
      return;
    }

    console.log('🔄 بدء حفظ الإعدادات:', { 
      organizationId, 
      default_language: settings.default_language,
      site_name: settings.site_name 
    });

    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      // دمج بيانات التتبع مع الإعدادات الموجودة
      const customJsData: CustomJsData = {
        trackingPixels
      };

      const updatedSettings = {
        ...settings,
        custom_js: JSON.stringify(customJsData),
        updated_at: new Date().toISOString()
      };
      
      console.log('💾 حفظ الإعدادات:', { 
        default_language: updatedSettings.default_language,
        site_name: updatedSettings.site_name 
      });
      
      // استخدام UPDATE بدلاً من upsert لتجنب مشاكل RLS
      const { data: savedData, error } = await supabase
        .from('organization_settings')
        .update({
          theme_primary_color: updatedSettings.theme_primary_color,
          theme_secondary_color: updatedSettings.theme_secondary_color,
          theme_mode: updatedSettings.theme_mode,
          site_name: updatedSettings.site_name,
          custom_css: updatedSettings.custom_css,
          logo_url: updatedSettings.logo_url,
          favicon_url: updatedSettings.favicon_url,
          default_language: updatedSettings.default_language,
          custom_js: updatedSettings.custom_js,
          custom_header: updatedSettings.custom_header,
          custom_footer: updatedSettings.custom_footer,
          enable_registration: updatedSettings.enable_registration,
          enable_public_site: updatedSettings.enable_public_site,
          display_text_with_logo: updatedSettings.display_text_with_logo,
          updated_at: new Date().toISOString()
        })
        .eq('organization_id', organizationId)
        .select()
        .single();
        
      // إذا تم تحديث اللغة الافتراضية، إرسال إشعار للمتجر العام
      if (!error && savedData && settings.default_language !== updatedSettings.default_language) {
        console.log('🔔 تم تحديث اللغة الافتراضية - إرسال إشعار للمتجر العام');
        
        // إرسال حدث للمتجر العام عبر localStorage
        try {
          const languageUpdateEvent = {
            type: 'language_updated',
            organization_id: organizationId,
            old_language: settings.default_language,
            new_language: updatedSettings.default_language,
            timestamp: Date.now()
          };
          
          localStorage.setItem(`language_update_${organizationId}`, JSON.stringify(languageUpdateEvent));
          
          // إرسال حدث عبر window للمكونات الأخرى
          window.dispatchEvent(new CustomEvent('organization_language_updated', {
            detail: languageUpdateEvent
          }));
          
          console.log('🔔 تم إرسال إشعار تحديث اللغة بنجاح');
        } catch (notificationError) {
          console.warn('تحذير: فشل في إرسال الإشعار:', notificationError);
        }
      }
          
      if (error) {
        console.error('❌ خطأ في الحفظ:', error);
        
                          // إذا فشل UPDATE، أخبر المستخدم بالخطأ بشكل واضح
         console.error('❌ فشل في تحديث الإعدادات - مشكلة صلاحيات:', error);
         
         // رسالة واضحة للمستخدم
         throw new Error(
           `فشل في حفظ الإعدادات. المشكلة: ${error.message || 'خطأ في الصلاحيات'}\n\n` +
           'الحلول المؤقتة:\n' +
           '1. تحديث الصفحة وإعادة المحاولة\n' +
           '2. تسجيل الخروج وإعادة الدخول\n' +
           '3. التواصل مع الدعم الفني'
         );
      } else {
        console.log('✅ تم الحفظ بنجاح:', { 
          default_language: savedData?.default_language,
          site_name: savedData?.site_name 
        });

        // تحديث الإعدادات المحلية بالبيانات المحفوظة فعلياً
        if (savedData) {
          setSettings(savedData as OrganizationSettings);
          setCachedSettings(organizationId, savedData as OrganizationSettings);
        }
      }
      
      // إعادة جلب البيانات من قاعدة البيانات للتأكد (مع صلاحيات أقل تقييداً)
      setTimeout(async () => {
        try {
          const { data: refreshedData, error: refreshError } = await supabase
            .from('organization_settings')
            .select('*')
            .eq('organization_id', organizationId)
            .single(); // العودة إلى single
            
          if (!refreshError && refreshedData) {
            console.log('🔄 البيانات المحدثة:', { 
              default_language: refreshedData.default_language,
              site_name: refreshedData.site_name 
            });
            setSettings(refreshedData as OrganizationSettings);
            setCachedSettings(organizationId, refreshedData as OrganizationSettings);
          }
        } catch (refreshError) {
          console.error('خطأ في إعادة الجلب:', refreshError);
        }
      }, 500);
      
      setSaveSuccess(true);
      
      // إزالة رسالة النجاح بعد وقت قصير
      setTimeout(() => setSaveSuccess(false), 3000);

    } catch (error: any) {
      console.error('❌ خطأ عام في الحفظ:', error);
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
