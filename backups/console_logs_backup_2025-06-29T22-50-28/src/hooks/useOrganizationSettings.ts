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
      isFirstThemeSetRef.current = false;
      const themeMode = settings.theme_mode === 'auto' ? 'system' : settings.theme_mode;
      setTheme(themeMode);
    }
  }, [settings.theme_mode, isLoading, setTheme]);

  // دالة للتحقق من صحة الكاش
  const getCachedSettings = useCallback((orgId: string) => {
    // فحص التخزين المؤقت العام أولاً
    const globalCached = globalSettingsCache.get(orgId);
    if (globalCached && (Date.now() - globalCached.timestamp) < GLOBAL_CACHE_DURATION) {
      return globalCached.data;
    }
    
    // فحص التخزين المؤقت المحلي
    const cached = settingsCacheRef.current.get(orgId);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }, []);

  // دالة لحفظ في الكاش
  const setCachedSettings = useCallback((orgId: string, data: OrganizationSettings) => {
    settingsCacheRef.current.set(orgId, { data, timestamp: Date.now() });
    globalSettingsCache.set(orgId, { data, timestamp: Date.now() });
  }, []);

  // دالة جلب الإعدادات المحسنة مع Singleton Pattern
  const fetchSettings = useCallback(
    debounce(async (orgId: string) => {
      if (!orgId || lastFetchedRef.current === orgId || isFetchingRef.current) return;
      
      // فحص التخزين المؤقت أولاً
      const cachedData = getCachedSettings(orgId);
      if (cachedData) {
        console.log('🎯 استخدام إعدادات المؤسسة من التخزين المؤقت');
        setSettings(cachedData);
        setIsLoading(false);
        return;
      }

      // فحص الطلبات النشطة
      const requestKey = `settings-${orgId}`;
      if (activeSettingsRequests.has(requestKey)) {
        console.log('🔄 انتظار طلب نشط للإعدادات...');
        try {
          const result = await activeSettingsRequests.get(requestKey);
          if (result) {
            setSettings(result);
            setCachedSettings(orgId, result);
          }
          setIsLoading(false);
          return;
        } catch (error) {
          console.warn('خطأ في انتظار الطلب النشط:', error);
        }
      }
      
      lastFetchedRef.current = orgId;
      isFetchingRef.current = true;
      setIsLoading(true);
      setError(null);

      // إنشاء طلب جديد
      const requestPromise = (async (): Promise<OrganizationSettings | null> => {
        try {
          console.log('🔍 جلب إعدادات المؤسسة من قاعدة البيانات:', orgId);
          console.log('🔧 تفاصيل الطلب:', { organizationId: orgId, hasAuth: !!supabase.auth, timestamp: new Date().toISOString() });

          // فحص حالة المصادقة
          console.log('🔐 فحص حالة المصادقة...');
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          console.log('📋 حالة المصادقة:', { 
            hasSession: !!session, 
            sessionError: sessionError?.message || null, 
            userId: session?.user?.id || null,
            expiresAt: session?.expires_at || null,
            isExpired: session ? session.expires_at * 1000 < Date.now() : null
          });

          // الوصول المباشر للجدول
          console.log('🔍 استخدام الوصول المباشر للجدول...');
          
          // استخدام الدالة الجديدة لجلب الإعدادات - تتجاوز RLS
          const { data: settingsData, error: settingsError } = await supabase
            .rpc('get_organization_settings_direct', { org_id: orgId })
            .single();

          console.log('📊 نتيجة الوصول المباشر:', { 
            settingsData, 
            settingsError: settingsError?.message || null,
            errorCode: settingsError?.code || null,
            hasData: !!settingsData && (Array.isArray(settingsData) ? settingsData.length > 0 : Object.keys(settingsData).length > 0),
            dataType: typeof settingsData,
            isArray: Array.isArray(settingsData),
            dataLength: Array.isArray(settingsData) ? settingsData.length : undefined,
            firstItem: Array.isArray(settingsData) ? settingsData[0] : undefined,
            objectKeys: !Array.isArray(settingsData) ? Object.keys(settingsData || {}) : null
          });

          if (settingsError) {
            console.error('❌ خطأ في الوصول المباشر:', settingsError);
          } else if (settingsData && 
                     ((Array.isArray(settingsData) && settingsData.length > 0) || 
                      (!Array.isArray(settingsData) && Object.keys(settingsData).length > 0))) {
            console.log('✅ تم جلب الإعدادات بالوصول المباشر');
            
            // التعامل مع البيانات سواء كانت array أو object
            let settings: OrganizationSettings;
            if (Array.isArray(settingsData)) {
              settings = settingsData[0] as OrganizationSettings;
            } else {
              settings = settingsData as OrganizationSettings;
            }
            
            // التأكد من theme_mode
            if (!settings.theme_mode || !['light', 'dark', 'auto'].includes(settings.theme_mode)) {
              settings.theme_mode = 'light';
            }
            
            return settings;
          } else {
            console.warn('⚠️ البيانات موجودة لكن فارغة أو غير صالحة:', {
              settingsData,
              isNull: settingsData === null,
              isUndefined: settingsData === undefined,
              isEmpty: Array.isArray(settingsData) ? settingsData.length === 0 : Object.keys(settingsData || {}).length === 0,
              rawValue: JSON.stringify(settingsData)
            });
          }

          // إذا لم توجد إعدادات، إنشاء إعدادات جديدة باستخدام الدالة المباشرة
          console.log('📝 لا توجد إعدادات، إنشاء إعدادات جديدة...');
          const { data: createResult, error: createError } = await supabase
            .rpc('save_organization_settings_direct', {
              org_id: orgId,
              p_site_name: 'متجري',
              p_theme_primary_color: '#6366f1',
              p_theme_secondary_color: '#8b5cf6',
              p_theme_mode: 'light',
              p_default_language: 'ar',
              p_enable_registration: true,
              p_enable_public_site: true,
              p_display_text_with_logo: true
            });

          if (createError) {
            console.error('❌ فشل في إنشاء إعدادات جديدة:', createError);
            console.log('📝 استخدام الإعدادات الافتراضية');
            return getDefaultSettings(orgId);
          } else if (createResult) {
            console.log('✅ تم إنشاء إعدادات جديدة بنجاح');
            // جلب الإعدادات المنشأة حديثاً
            const { data: newSettingsData } = await supabase
              .rpc('get_organization_settings_direct', { org_id: orgId })
              .single();
            
            if (newSettingsData) {
              const settings = newSettingsData as OrganizationSettings;
              if (!settings.theme_mode) settings.theme_mode = 'light';
              return settings;
            } else {
              console.log('📝 استخدام الإعدادات الافتراضية');
              return getDefaultSettings(orgId);
            }
          } else {
            console.log('📝 استخدام الإعدادات الافتراضية');
            return getDefaultSettings(orgId);
          }

        } catch (error) {
          console.error('❌ خطأ عام في جلب الإعدادات:', error);
          setError(`خطأ عام: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
          console.log('📝 استخدام الإعدادات الافتراضية');
          return getDefaultSettings(orgId);
        }
      })();

      // حفظ الطلب في القائمة النشطة
      activeSettingsRequests.set(requestKey, requestPromise);

      try {
        const result = await requestPromise;
        if (result) {
          setSettings(result);
          setCachedSettings(orgId, result);
          setError(null);
        }
      } catch (error) {
        console.error('خطأ في معالجة النتيجة:', error);
        setSettings(getDefaultSettings(orgId));
      } finally {
        setIsLoading(false);
        isFetchingRef.current = false;
        activeSettingsRequests.delete(requestKey);
      }
    }, 500),
    [getCachedSettings, setCachedSettings]
  );

  // تحميل البيانات مع debouncing ونظام fallback للصلاحيات
  useEffect(() => {
    if (organizationId && organizationId !== lastFetchedRef.current) {
      // إعادة تعيين refs عند تغيير المؤسسة
      lastFetchedRef.current = null;
      isFetchingRef.current = false;
      
      fetchSettings(organizationId);
    }

    // Cleanup
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [organizationId]); // إزالة fetchSettings من dependencies

  // نظام fallback للصلاحيات: إذا كانت الإعدادات موجودة لكن organization_id غير محدد
  useEffect(() => {
    if (organizationId && settings && !settings.organization_id && !isLoading) {
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
        console.log('🚨 تطبيق الإعدادات الطارئة بعد انتظار 5 ثوانِ');
        
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
  }, [organizationId, isLoading, settings?.organization_id]);

  useEffect(() => {
    // إذا كانت البيانات تحتوي على site_name غير افتراضي، فهي بيانات حقيقية
    if (settings && settings.site_name && settings.site_name !== 'متجري' && settings.site_name !== '' && !hasRealData) {
      setHasRealData(true);
      console.log('✅ تم اكتشاف بيانات حقيقية:', settings.site_name);
    }
  }, [settings?.site_name, hasRealData]);

  // تحديث قيمة في الإعدادات مع منع تطبيق الثيم المتكرر
  const updateSetting = useCallback((key: keyof OrganizationSettings, value: any) => {
    console.log('🔧 تحديث الإعداد:', {
      key,
      value,
      oldValue: settings[key],
      organizationId: settings.organization_id
    });
    
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
  
  // دالة محسنة لحفظ الإعدادات باستخدام الدالة المخصصة
  const saveSettings = useCallback(async (): Promise<void> => {
    if (!organizationId || isSaving) {
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      console.log('💾 بدء عملية الحفظ:', {
        organizationId,
        currentSettings: settings,
        siteName: settings.site_name,
        themeColors: {
          primary: settings.theme_primary_color,
          secondary: settings.theme_secondary_color
        }
      });

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
          console.warn('⚠️ فشل تحليل custom_js الموجود:', error);
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

      console.log('📝 البيانات المُعدة للحفظ:', {
        siteName: updatedSettings.site_name,
        themeColors: {
          primary: updatedSettings.theme_primary_color,
          secondary: updatedSettings.theme_secondary_color
        },
        defaultLanguage: updatedSettings.default_language,
        organizationId: updatedSettings.organization_id
      });

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

      console.log('🔄 إرسال البيانات إلى Supabase:', dataToSave);

      // استخدام الدالة الجديدة للحفظ - تتجاوز RLS
      const { data: saveResult, error } = await supabase
        .rpc('save_organization_settings_direct', {
          org_id: organizationId,
          p_site_name: dataToSave.site_name,
          p_theme_primary_color: dataToSave.theme_primary_color,
          p_theme_secondary_color: dataToSave.theme_secondary_color,
          p_theme_mode: dataToSave.theme_mode,
          p_default_language: dataToSave.default_language,
          p_custom_css: dataToSave.custom_css,
          p_logo_url: dataToSave.logo_url,
          p_favicon_url: dataToSave.favicon_url,
          p_custom_js: dataToSave.custom_js,
          p_custom_header: dataToSave.custom_header,
          p_custom_footer: dataToSave.custom_footer,
          p_enable_registration: dataToSave.enable_registration,
          p_enable_public_site: dataToSave.enable_public_site,
          p_display_text_with_logo: dataToSave.display_text_with_logo
        });
      
      let savedData = null;
      if (saveResult) {
        // جلب البيانات المحدثة بعد الحفظ
        const { data: refreshedData } = await supabase
          .rpc('get_organization_settings_direct', { org_id: organizationId })
          .single();
        savedData = refreshedData ? [refreshedData] : null;
      }
        
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
          
      if (error) {
        console.error('❌ فشل في حفظ الإعدادات:', error);
         throw new Error(
           `فشل في حفظ الإعدادات. المشكلة: ${error.message || 'خطأ في الصلاحيات'}\n\n` +
           'الحلول المؤقتة:\n' +
           '1. تحديث الصفحة وإعادة المحاولة\n' +
           '2. تسجيل الخروج وإعادة الدخول\n' +
           '3. التواصل مع الدعم الفني'
         );
      } else {
        console.log('✅ تم حفظ الإعدادات بنجاح:', savedData);

        // تحديث الإعدادات المحلية بالبيانات المحفوظة فعلياً
        if (savedData && Array.isArray(savedData) && savedData.length > 0) {
          const savedSettings = savedData[0] as OrganizationSettings;
          setSettings(savedSettings);
          setCachedSettings(organizationId, savedSettings);
        } else if (savedData && !Array.isArray(savedData)) {
          setSettings(savedData as OrganizationSettings);
          setCachedSettings(organizationId, savedData as OrganizationSettings);
        }
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
