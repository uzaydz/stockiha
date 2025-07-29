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
import { debounce } from 'lodash';

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

// دالة لإنشاء الإعدادات الافتراضية
const getDefaultSettings = (organizationId: string): OrganizationSettings => ({
  id: '',
  organization_id: organizationId,
  theme_primary_color: '#6366f1',
  theme_secondary_color: '#8b5cf6',
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
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
});

// Singleton pattern للتحكم في الاستدعاءات المتكررة
const activeSettingsRequests = new Map<string, Promise<any>>();
const globalSettingsCache = new Map<string, { data: OrganizationSettings; timestamp: number }>();
const GLOBAL_CACHE_DURATION = 3 * 60 * 1000; // 3 دقائق

// إضافة دالة console مخصصة لـ useOrganizationSettings
const settingsDebugLog = (message: string, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
  }
};

/**
 * هوك مخصص للتعامل مع إعدادات المؤسسة
 */
export const useOrganizationSettings = ({ organizationId }: UseOrganizationSettingsProps): UseOrganizationSettingsReturn => {
  const { setTheme } = useTheme();
  const { refreshOrganizationData } = useTenant();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // إضافة نظام console شامل للتتبع
  const debugLog = (message: string, data?: any) => {
  };
  
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
  const isFetchingRef = useRef(false);
  
  // منع استبدال البيانات الحقيقية بالافتراضية
  const [hasRealData, setHasRealData] = useState(false);
  
  // Cache timeout - 30 seconds
  const CACHE_DURATION = 30 * 1000;

  // تطبيق وضع الثيم عند تغييره في الإعدادات مع منع التحديث المتكرر
  useEffect(() => {
    if (!isLoading && settings.theme_mode && isFirstThemeSetRef.current) {
      settingsDebugLog('تطبيق وضع الثيم من الإعدادات:', {
        theme_mode: settings.theme_mode,
        isLoading,
        isFirstThemeSet: isFirstThemeSetRef.current,
        organizationId: settings.organization_id
      });
      
      isFirstThemeSetRef.current = false;
      const themeMode = settings.theme_mode === 'auto' ? 'system' : settings.theme_mode;
      setTheme(themeMode);
      
      settingsDebugLog('✅ تم تطبيق الثيم:', themeMode);
    }
  }, [settings.theme_mode, isLoading, setTheme]);

  // دالة للتحقق من صحة الكاش
  const getCachedSettings = useCallback((orgId: string) => {
    settingsDebugLog('فحص الكاش للمؤسسة:', orgId);
    
    // فحص التخزين المؤقت العام أولاً
    const globalCached = globalSettingsCache.get(orgId);
    if (globalCached && (Date.now() - globalCached.timestamp) < GLOBAL_CACHE_DURATION) {
      settingsDebugLog('✅ تم العثور على بيانات في الكاش العام:', {
        colors: {
          primary: globalCached.data.theme_primary_color,
          secondary: globalCached.data.theme_secondary_color
        },
        siteName: globalCached.data.site_name,
        age: Date.now() - globalCached.timestamp
      });
      return globalCached.data;
    }
    
    // فحص التخزين المؤقت المحلي
    const cached = settingsCacheRef.current.get(orgId);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      settingsDebugLog('✅ تم العثور على بيانات في الكاش المحلي:', {
        colors: {
          primary: cached.data.theme_primary_color,
          secondary: cached.data.theme_secondary_color
        },
        siteName: cached.data.site_name,
        age: Date.now() - cached.timestamp
      });
      return cached.data;
    }
    
    settingsDebugLog('❌ لم يتم العثور على بيانات في الكاش');
    return null;
  }, []);

  // دالة لحفظ في الكاش
  const setCachedSettings = useCallback((orgId: string, data: OrganizationSettings) => {
    settingsDebugLog('حفظ البيانات في الكاش:', { 
      orgId, 
      colors: { 
        primary: data.theme_primary_color, 
        secondary: data.theme_secondary_color 
      },
      siteName: data.site_name
    });
    
    settingsCacheRef.current.set(orgId, { data, timestamp: Date.now() });
    globalSettingsCache.set(orgId, { data, timestamp: Date.now() });
  }, []);

  // دالة لجلب الإعدادات من الخادم
  const fetchSettings = useCallback(async (orgId: string, forceRefresh = false) => {
    if (isFetchingRef.current && !forceRefresh) {
      settingsDebugLog('جلب الإعدادات قيد التنفيذ، تم تجاهل الطلب');
      return;
    }

    settingsDebugLog('=== بدء جلب إعدادات المؤسسة ===', {
      orgId,
      forceRefresh,
      timestamp: new Date().toISOString()
    });

    // التحقق من الكاش أولاً
    if (!forceRefresh) {
      const cachedData = getCachedSettings(orgId);
      if (cachedData) {
        settingsDebugLog('استخدام البيانات المحفوظة في الكاش');
        setSettings(cachedData);
        setHasRealData(true);
        setIsLoading(false);
        return;
      }
    }

    // التحقق من وجود طلب نشط
    const requestKey = `${orgId}-${forceRefresh ? 'force' : 'normal'}`;
    if (activeSettingsRequests.has(requestKey)) {
      settingsDebugLog('انتظار طلب نشط موجود', { requestKey });
      try {
        const result = await activeSettingsRequests.get(requestKey);
        return result;
      } catch (error) {
        settingsDebugLog('❌ فشل في انتظار الطلب النشط:', error);
      }
    }

    // إنشاء طلب جديد
    const fetchPromise = (async () => {
      try {
        isFetchingRef.current = true;
        setError(null);
        
        settingsDebugLog('بدء جلب إعدادات المؤسسة من قاعدة البيانات:', orgId);
        
        const settingsData = await getOrganizationSettings(orgId);
        
        settingsDebugLog('تم جلب الإعدادات من قاعدة البيانات:', {
          hasData: !!settingsData,
          colors: settingsData ? {
            primary: settingsData.theme_primary_color,
            secondary: settingsData.theme_secondary_color
          } : null,
          siteName: settingsData?.site_name,
          language: settingsData?.default_language
        });

        if (settingsData) {
          // التحقق من صحة البيانات
          if (settingsData.organization_id !== orgId) {
            settingsDebugLog('⚠️ تحذير: معرف المؤسسة غير متطابق!', {
              expected: orgId,
              received: settingsData.organization_id
            });
          }
          
          setSettings(settingsData);
          setHasRealData(true);
          setCachedSettings(orgId, settingsData);
          
          settingsDebugLog('✅ تم تطبيق الإعدادات بنجاح:', {
            theme_primary_color: settingsData.theme_primary_color,
            theme_secondary_color: settingsData.theme_secondary_color,
            theme_mode: settingsData.theme_mode,
            site_name: settingsData.site_name,
            default_language: settingsData.default_language
          });
          
          // تطبيق الألوان فوراً إذا كانت متاحة
          if (settingsData.theme_primary_color || settingsData.theme_secondary_color) {
            settingsDebugLog('تطبيق الألوان من الإعدادات فوراً');
            
            // استخدام ThemeManager لتطبيق الألوان
            const { updateOrganizationTheme } = await import('@/lib/themeManager');
            updateOrganizationTheme(orgId, {
              theme_primary_color: settingsData.theme_primary_color,
              theme_secondary_color: settingsData.theme_secondary_color,
              theme_mode: settingsData.theme_mode,
              custom_css: settingsData.custom_css
            });
            
            settingsDebugLog('✅ تم تطبيق الألوان عبر ThemeManager');
          }
        } else {
          settingsDebugLog('⚠️ لم يتم العثور على إعدادات للمؤسسة');
        }

        setIsLoading(false);
        lastFetchedRef.current = orgId;
        
        settingsDebugLog('=== انتهاء جلب إعدادات المؤسسة ===');

      } catch (error) {
        settingsDebugLog('❌ خطأ في جلب الإعدادات:', error);
        setError(error instanceof Error ? error.message : 'خطأ في جلب الإعدادات');
        setIsLoading(false);
      } finally {
        isFetchingRef.current = false;
        activeSettingsRequests.delete(requestKey);
      }
    })();

    activeSettingsRequests.set(requestKey, fetchPromise);
    return fetchPromise;
  }, [getCachedSettings, setCachedSettings]);

  // جلب الإعدادات عند تغيير معرف المؤسسة
  useEffect(() => {
    if (!organizationId) {
      settingsDebugLog('لا يوجد معرف مؤسسة');
      return;
    }

    if (lastFetchedRef.current === organizationId && hasRealData) {
      settingsDebugLog('تم جلب الإعدادات مسبقاً للمؤسسة:', organizationId);
      return;
    }

    settingsDebugLog('بدء جلب الإعدادات للمؤسسة:', organizationId);
    
    // تأخير بسيط لتجنب الاستدعاءات المتكررة
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    fetchTimeoutRef.current = setTimeout(() => {
      fetchSettings(organizationId);
    }, 100);

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [organizationId, fetchSettings, hasRealData]);

  // نظام fallback للصلاحيات: إذا كانت الإعدادات موجودة لكن organization_id غير محدد
  useEffect(() => {
    if (organizationId && settings && !settings.organization_id && !isLoading) {
      settingsDebugLog('إصلاح معرف المؤسسة في الإعدادات', {
        organizationId,
        currentOrgId: settings.organization_id
      });
      
      // إضافة organization_id للإعدادات الموجودة
      const fixedSettings: OrganizationSettings = {
        ...settings,
        organization_id: organizationId
      };
      
      setSettings(fixedSettings);
      setCachedSettings(organizationId, fixedSettings);
    }
  }, [organizationId, settings?.organization_id, isLoading]);

  // نظام fallback إضافي: إنشاء إعدادات افتراضية إذا فشل كل شيء ولم توجد بيانات حقيقية
  useEffect(() => {
    if (!organizationId || isLoading) return;
    
    const timeout = setTimeout(() => {
      if (organizationId && !isLoading && (!settings || !settings.organization_id)) {
        settingsDebugLog('إنشاء إعدادات افتراضية طارئة', { organizationId });
        
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
        
        settingsDebugLog('✅ تم إنشاء إعدادات افتراضية طارئة');
      }
    }, 5000); // انتظار 5 ثوانِ قبل إنشاء الإعدادات الافتراضية

    return () => clearTimeout(timeout);
  }, [organizationId, isLoading, settings?.organization_id]);

  useEffect(() => {
    // إذا كانت البيانات تحتوي على site_name غير افتراضي، فهي بيانات حقيقية
    if (settings && settings.site_name && settings.site_name !== 'متجري' && settings.site_name !== '' && !hasRealData) {
      settingsDebugLog('تم اكتشاف بيانات حقيقية:', {
        siteName: settings.site_name,
        colors: {
          primary: settings.theme_primary_color,
          secondary: settings.theme_secondary_color
        }
      });
      setHasRealData(true);
    }
  }, [settings?.site_name, hasRealData]);

  // تحديث قيمة في الإعدادات مع منع تطبيق الثيم المتكرر
  const updateSetting = useCallback((key: keyof OrganizationSettings, value: any) => {
    debugLog('تحديث الإعداد:', { key, value, oldValue: settings[key] });
    
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));

    // تطبيق الثيم فقط إذا كان مختلفاً
    if (key === 'theme_mode' && value !== settings.theme_mode) {
      const themeMode = value === 'auto' ? 'system' : value;
      debugLog('تطبيق وضع الثيم الجديد:', { old: settings.theme_mode, new: themeMode });
      setTheme(themeMode);
    }
    
    // تسجيل تغيير اللون الرئيسي
    if (key === 'theme_primary_color') {
      debugLog('تغيير اللون الرئيسي:', { old: settings.theme_primary_color, new: value });
    }
    
    // تسجيل تغيير اللون الثانوي
    if (key === 'theme_secondary_color') {
      debugLog('تغيير اللون الثانوي:', { old: settings.theme_secondary_color, new: value });
    }
    
    // تسجيل تغيير اللغة الافتراضية
    if (key === 'default_language') {
      debugLog('تغيير اللغة الافتراضية:', { old: settings.default_language, new: value });
    }
  }, [settings.theme_mode, settings.theme_primary_color, settings.theme_secondary_color, settings.default_language, setTheme]);

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
  
  // دالة محسنة لحفظ الإعدادات باستخدام الدالة المخصصة
  const saveSettings = useCallback(async (): Promise<void> => {
    if (!organizationId || isSaving) {
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);
    
    try {

      // دمج بيانات التتبع مع الإعدادات الموجودة
      let existingCustomJs: CustomJsData = {
        trackingPixels: {
          facebook: { enabled: false, pixelId: '' },
          tiktok: { enabled: false, pixelId: '' },
          snapchat: { enabled: false, pixelId: '' },
          google: { enabled: false, pixelId: '' },
        }
      };
      
      // محاولة قراءة البيانات الموجودة مسبقاً
      if (settings.custom_js) {
        try {
          const parsed = JSON.parse(settings.custom_js);
          if (parsed && typeof parsed === 'object') {
            existingCustomJs = { ...existingCustomJs, ...parsed };
          }
        } catch (error) {
        }
      }
      
      // تحديث بيانات التتبع فقط مع الاحتفاظ بالبيانات الأخرى
      const customJsData: CustomJsData = {
        ...existingCustomJs,
        trackingPixels
      };

      const updatedSettings = {
        ...settings,
        custom_js: JSON.stringify(customJsData),
        updated_at: new Date().toISOString()
      };

      // استخدام الطريقة المباشرة للحفظ
      const dataToSave = {
        organization_id: organizationId,
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
        updated_at: updatedSettings.updated_at
      };

      // استخدام API لحفظ الإعدادات
      debugLog('بدء حفظ الإعدادات:', dataToSave);
      
      // تحويل theme_mode إلى النوع الصحيح
      const settingsPayload = {
        ...dataToSave,
        theme_mode: (dataToSave.theme_mode === 'auto' ? 'system' : dataToSave.theme_mode) as 'light' | 'dark' | 'system'
      };
      
      const savedData = await updateOrganizationSettings(organizationId, settingsPayload);
      
      debugLog('نتيجة حفظ الإعدادات:', savedData);
        
      // إذا تم تحديث اللغة الافتراضية، إرسال إشعار للمتجر العام
      if (!error && savedData && settings.default_language !== updatedSettings.default_language) {
        
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
          
        } catch (notificationError) {
        }
      }
      if (savedData) {
        debugLog('تم حفظ الإعدادات بنجاح');
        
        // تحديث الإعدادات المحلية بالبيانات المحفوظة فعلياً
        setSettings(savedData);
        setCachedSettings(organizationId, savedData);
      } else {
        throw new Error('فشل في حفظ الإعدادات');
      }

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
