import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { getOrganizationSettings, updateOrganizationSettings } from '@/lib/api/settings';
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
  const { toast } = useToast();
  const { setTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
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

  // تطبيق وضع الثيم عند تغييره في الإعدادات
  useEffect(() => {
    if (!isLoading && settings.theme_mode) {
      const themeMode = settings.theme_mode === 'auto' ? 'system' : settings.theme_mode;
      setTheme(themeMode);
    }
  }, [settings.theme_mode, isLoading, setTheme]);

  // جلب الإعدادات
  useEffect(() => {
    const fetchSettings = async () => {
      if (!organizationId) return;
      
      setIsLoading(true);
      try {
        const orgSettings = await getOrganizationSettings(organizationId);
        if (orgSettings) {
          setSettings(orgSettings);
          
          if (orgSettings.custom_js) {
            try {
              const pixelSettings = JSON.parse(orgSettings.custom_js);
              if (pixelSettings.trackingPixels) {
                setTrackingPixels(pixelSettings.trackingPixels);
              }
            } catch (error) {
              console.error('فشل تحليل بيانات بكسل التتبع', error);
            }
          }
        }
      } catch (error) {
        console.error('فشل في جلب إعدادات المؤسسة', error);
        toast({
          title: 'خطأ',
          description: 'فشل في جلب إعدادات المؤسسة',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [organizationId, toast]);

  // تحديث قيمة في الإعدادات
  const updateSetting = (key: keyof OrganizationSettings, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));

    if (key === 'theme_mode') {
      const themeMode = value === 'auto' ? 'system' : value;
      setTheme(themeMode);
    }
  };

  // تحديث قيمة في بكسل التتبع
  const updateTrackingPixel = (platform: keyof TrackingPixels, field: string, value: any) => {
    setTrackingPixels((prev) => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        [field]: value,
      },
    }));
  };
  
  // حفظ إعدادات SEO في جدول store_settings
  const saveSEOSettings = async (customJsData: CustomJsData) => {
    if (!organizationId) return;
    
    try {
      if (customJsData.seoSettings) {
        const { data, error } = await supabase.rpc('update_store_seo_settings', {
          _organization_id: organizationId,
          _settings: customJsData.seoSettings
        });
        
        if (error) {
          console.error('فشل في حفظ إعدادات SEO', error);
          throw error;
        }
        
        console.log('تم حفظ إعدادات SEO بنجاح', data);
      }
    } catch (error) {
      console.error('فشل في حفظ إعدادات SEO', error);
      throw error;
    }
  };

  // حفظ الإعدادات
  const saveSettings = async () => {
    if (!organizationId) {
      toast({
        title: 'خطأ',
        description: 'معرف المؤسسة غير متوفر',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      let customJsData: CustomJsData = {
        trackingPixels,
      };
      
      // استرجاع إعدادات SEO إذا كانت موجودة
      if (settings.custom_js) {
        try {
          const existingData = JSON.parse(settings.custom_js);
          if (existingData.seoSettings) {
            customJsData = {
              ...customJsData,
              seoSettings: existingData.seoSettings
            };
          }
        } catch (error) {
          console.error('فشل تحليل بيانات custom_js', error);
        }
      }
      
      const themeMode = settings.theme_mode === 'auto' ? 'system' : settings.theme_mode;
      
      // حفظ إعدادات المؤسسة العامة
      await updateOrganizationSettings(organizationId, {
        theme_primary_color: settings.theme_primary_color,
        theme_secondary_color: settings.theme_secondary_color,
        theme_mode_org: themeMode as 'light' | 'dark' | 'system',
        site_name: settings.site_name,
        custom_css: settings.custom_css,
        logo_url: settings.logo_url,
        favicon_url: settings.favicon_url,
        custom_js: JSON.stringify(customJsData),
        custom_header: settings.custom_header,
        custom_footer: settings.custom_footer,
        display_text_with_logo: settings.display_text_with_logo
      });
      
      // حفظ إعدادات SEO بشكل منفصل في جدول store_settings
      await saveSEOSettings(customJsData);
      
      setTheme(themeMode);
      
      setSaveSuccess(true);
      toast({
        title: 'تم الحفظ',
        description: 'تم حفظ إعدادات المؤسسة بنجاح',
      });
      
      localStorage.setItem('theme-preference', themeMode);
      
      setTimeout(() => {
        setSaveSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('فشل في حفظ إعدادات المؤسسة', error);
      toast({
        title: 'خطأ',
        description: 'فشل في حفظ إعدادات المؤسسة',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return {
    settings,
    trackingPixels,
    isLoading,
    isSaving,
    saveSuccess,
    updateSetting,
    updateTrackingPixel,
    saveSettings,
  };
};

export default useOrganizationSettings; 