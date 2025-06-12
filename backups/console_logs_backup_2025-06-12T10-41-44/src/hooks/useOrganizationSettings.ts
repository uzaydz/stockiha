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
      console.log('🎨 [useOrganizationSettings] Applying theme (first time):', themeMode);
      setTheme(themeMode);
    }
  }, [settings.theme_mode, isLoading, setTheme]);

  // دالة للتحقق من صحة الكاش
  const getCachedSettings = useCallback((orgId: string) => {
    const cached = settingsCacheRef.current.get(orgId);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log('🗄️ [useOrganizationSettings] Using cached settings for:', orgId);
      return cached.data;
    }
    return null;
  }, []);

  // دالة لحفظ في الكاش
  const setCachedSettings = useCallback((orgId: string, data: OrganizationSettings) => {
    settingsCacheRef.current.set(orgId, { data, timestamp: Date.now() });
  }, []);

  // Debounced fetch settings function
  const debouncedFetchSettings = useCallback(async (orgId: string) => {
    // إلغاء الطلب السابق إذا كان موجوداً
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    // التحقق من الكاش أولاً
    const cachedData = getCachedSettings(orgId);
    if (cachedData) {
      setSettings(cachedData);
      setIsLoading(false);
      return;
    }

    // Debounce لمنع الطلبات المتكررة
    fetchTimeoutRef.current = setTimeout(async () => {
      if (lastFetchedRef.current === orgId) {
        console.log('⏭️ [useOrganizationSettings] Skipping duplicate fetch for:', orgId);
        return;
      }

      lastFetchedRef.current = orgId;
      console.log('🔧 [useOrganizationSettings] Starting fetchSettings for organizationId:', orgId);
      setIsLoading(true);

      try {
        console.log('📞 [useOrganizationSettings] Calling organization_settings table...');
        const { data: latestSettings, error } = await supabase
          .from('organization_settings')
          .select('*')
          .eq('organization_id', orgId)
          .single();

        if (error) {
          console.error('🚫 [useOrganizationSettings] Database error:', error);
          // Use default settings on error
          const defaultSettings = await getOrganizationSettings(orgId);
          if (defaultSettings) {
            setSettings(defaultSettings);
            setCachedSettings(orgId, defaultSettings);
          }
          return;
        }

        if (latestSettings) {
          console.log('✅ [useOrganizationSettings] Settings found, processing...');
          
          // تحميل بيانات بكسل التتبع من custom_js
          let trackingData: TrackingPixels = {
            facebook: { enabled: false, pixelId: '' },
            tiktok: { enabled: false, pixelId: '' },
            snapchat: { enabled: false, pixelId: '' },
            google: { enabled: false, pixelId: '' },
          };

          if (latestSettings.custom_js) {
            try {
              const customData = JSON.parse(latestSettings.custom_js);
              if (customData && customData.trackingPixels) {
                trackingData = {
                  ...trackingData,
                  ...customData.trackingPixels
                };
              }
            } catch (e) {
              console.warn('⚠️ [useOrganizationSettings] Failed to parse custom_js:', e);
            }
          }

          // تحديث الإعدادات والتتبع - إصلاح نوع البيانات theme_mode
          const processedSettings = {
            ...latestSettings,
            theme_mode: (latestSettings.theme_mode as 'light' | 'dark' | 'auto') || 'light'
          };

          setSettings(processedSettings);
          setTrackingPixels(trackingData);
          setCachedSettings(orgId, processedSettings);

          // تطبيق عنوان الصفحة
          if (latestSettings.site_name && document.title !== latestSettings.site_name) {
            console.log('📄 [useOrganizationSettings] Setting page title:', latestSettings.site_name);
            document.title = latestSettings.site_name;
          }
        }
      } catch (error) {
        console.error('💥 [useOrganizationSettings] Exception in fetchSettings:', error);
        toast({
          title: 'خطأ في التحميل',
          description: `فشل في تحميل إعدادات المؤسسة: ${error.message || 'خطأ غير معروف'}`,
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
        console.log('🏁 [useOrganizationSettings] fetchSettings completed');
      }
    }, 300); // 300ms debounce
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
      console.log('🎨 [useOrganizationSettings] Theme changed, applying:', themeMode);
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
  
  // حفظ الإعدادات
  const saveSettings = useCallback(async () => {
    const startTime = Date.now();

    if (!organizationId) {
      toast({
        title: 'خطأ في الحفظ',
        description: 'معرف المؤسسة مطلوب لحفظ الإعدادات.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      const sessionStartTime = Date.now();
      
      // تأكد من الحصول على أحدث جلسة قبل إجراء طلب RPC
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      const sessionEndTime = Date.now();

      if (sessionError) {
        toast({ 
          title: 'خطأ في الجلسة', 
          description: 'لا يمكن التحقق من جلسة المستخدم عند محاولة الحفظ.', 
          variant: 'destructive' 
        });
        setIsSaving(false);
        return;
      }

      if (!session || !session.user) {
        toast({ 
          title: 'جلسة غير نشطة', 
          description: 'يرجى تسجيل الدخول مرة أخرى قبل الحفظ.', 
          variant: 'destructive' 
        });
        setIsSaving(false);
        return;
      }

      const dataStartTime = Date.now();

      // إنشاء كائن بيانات custom_js جديد بدلاً من محاولة استرجاع البيانات القديمة
      let customJsData: CustomJsData = {
        trackingPixels,
        // يمكن إضافة المزيد من البيانات هنا
      };
      
      // استرجاع إعدادات SEO بطريقة أكثر أماناً
      if (settings.custom_js) {
        try {
          let existingSeoSettings = null;
          
          try {
            const existingData = JSON.parse(settings.custom_js);
            if (existingData && existingData.seoSettings) {
              existingSeoSettings = existingData.seoSettings;
            }
          } catch (parseError) {
          }
          
          if (existingSeoSettings) {
            customJsData.seoSettings = existingSeoSettings;
          }
        } catch (error) {
        }
      }
      
      const themeMode = settings.theme_mode === 'auto' ? 'system' : settings.theme_mode;
      
      // إنشاء عميل supabase جديد مع الجلسة المحدثة
      const freshSupabase = supabase;

      // تأكد من تحويل البيانات إلى نص JSON بشكل صحيح
      const safeCustomJsStr = JSON.stringify(customJsData);
      
      const dataEndTime = Date.now();
      
      const updateStartTime = Date.now();
      
      // إعلام المستخدم أن العملية قد تستغرق وقتاً
      toast({
        title: 'جاري الحفظ...',
        description: 'قد تستغرق العملية بضع ثوانٍ، يرجى الانتظار',
      });
      
      // حفظ إعدادات المؤسسة العامة
      const updateResult = await updateOrganizationSettings(organizationId, {
        theme_primary_color: settings.theme_primary_color,
        theme_secondary_color: settings.theme_secondary_color,
        theme_mode_org: themeMode as 'light' | 'dark' | 'system',
        site_name: settings.site_name,
        custom_css: settings.custom_css,
        logo_url: settings.logo_url,
        favicon_url: settings.favicon_url,
        custom_js: safeCustomJsStr,
        custom_header: settings.custom_header,
        custom_footer: settings.custom_footer,
        display_text_with_logo: settings.display_text_with_logo
      });
      
      const updateEndTime = Date.now();

      // حفظ إعدادات SEO بشكل منفصل في جدول store_settings
      // تم تعطيل هذا مؤقتاً لتحسين الأداء - سيتم حفظ SEO مع الإعدادات العامة
      /*
      if (customJsData.seoSettings) {
        const seoStartTime = Date.now();
        
        try {
          const { data, error } = await freshSupabase.rpc('update_store_seo_settings', {
            _organization_id: organizationId,
            _settings: customJsData.seoSettings
          });
          
          const seoEndTime = Date.now();
          
          if (error) {
            throw error;
          }

        } catch (error) {
        }
      }
      */

      setTheme(themeMode);
      
      // تطبيق الثيم مباشرة من البيانات المحفوظة
      const { updateOrganizationTheme } = await import('@/lib/themeManager');
      
      updateOrganizationTheme(organizationId, {
        theme_primary_color: settings.theme_primary_color,
        theme_secondary_color: settings.theme_secondary_color,
        theme_mode: settings.theme_mode,
        custom_css: settings.custom_css
      });

      // تحديث بيانات المؤسسة لضمان تطبيق التغييرات في جميع أنحاء التطبيق
      try {
        await refreshOrganizationData();
      } catch (refreshError) {
      }
      
      setSaveSuccess(true);
      toast({
        title: 'تم الحفظ',
        description: 'تم حفظ إعدادات المؤسسة بنجاح',
      });
      
      localStorage.setItem('theme-preference', themeMode);
      
      // التحقق من تطبيق الثيم بعد فترة قصيرة
      setTimeout(() => {
        const root = document.documentElement;
        const appliedPrimary = window.getComputedStyle(root).getPropertyValue('--primary').trim();
        
        // تحويل اللون المتوقع إلى HSL للمقارنة
        const expectedHSL = (() => {
          const hex = settings.theme_primary_color.replace('#', '');
          const r = parseInt(hex.substring(0, 2), 16) / 255;
          const g = parseInt(hex.substring(2, 4), 16) / 255;
          const b = parseInt(hex.substring(4, 6), 16) / 255;
          
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
          
          return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
        })();

        if (appliedPrimary === expectedHSL) {
        } else {
        }
      }, 100);
      
      const totalTime = Date.now() - startTime;
      
      setTimeout(() => {
        setSaveSuccess(false);
      }, 2000);
      
    } catch (error) {
      const totalTime = Date.now() - startTime;
      
      toast({
        title: 'خطأ في الحفظ',
        description: 'حدث خطأ أثناء حفظ الإعدادات، الرجاء المحاولة مرة أخرى.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [organizationId, settings, trackingPixels, setTheme]);

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
