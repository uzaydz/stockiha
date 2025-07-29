import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

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
  };
  structured_data?: {
    business_type?: string;
    business_name?: string;
    business_logo?: string;
    business_address?: string;
    business_phone?: string;
  };
  advanced?: {
    custom_head_tags?: string;
    google_analytics_id?: string;
    google_tag_manager_id?: string;
    google_search_console_id?: string;
    bing_webmaster_id?: string;
    custom_robots_txt?: string;
  };
}

interface UseSEOSettingsProps {
  organizationId?: string;
}

export const useSEOSettings = ({ organizationId }: UseSEOSettingsProps) => {
  const [seoSettings, setSeoSettings] = useState<SEOSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // جلب إعدادات SEO
  const fetchSEOSettings = useCallback(async () => {
    if (!organizationId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('store_settings')
        .select('settings')
        .eq('organization_id', organizationId)
        .eq('component_type', 'seo_settings')
        .eq('is_active', true)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (data?.settings) {
        setSeoSettings(data.settings as SEOSettings);
      } else {
        // إذا لم توجد إعدادات، إنشاء إعدادات افتراضية
        const defaultSettings: SEOSettings = {
          title: '',
          description: '',
          keywords: '',
          robots_txt: 'User-agent: *\nAllow: /',
          enable_sitemap: true,
          enable_canonical_urls: true,
          generate_meta_tags: true,
          enable_open_graph: true,
          enable_twitter_cards: true,
          enable_schema_markup: true,
          default_image_url: '',
          social_media: {
            twitter_handle: '',
            facebook_page: '',
            instagram_handle: '',
            linkedin_page: '',
          },
          structured_data: {
            business_type: 'Store',
            business_name: '',
            business_logo: '',
            business_address: '',
            business_phone: '',
          },
          advanced: {
            custom_head_tags: '',
            google_analytics_id: '',
            google_tag_manager_id: '',
            google_search_console_id: '',
            bing_webmaster_id: '',
            custom_robots_txt: '',
          },
        };
        setSeoSettings(defaultSettings);
      }
    } catch (err: any) {
      console.error('خطأ في جلب إعدادات SEO:', err);
      setError(err.message || 'فشل في جلب إعدادات SEO');
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  // حفظ إعدادات SEO
  const saveSEOSettings = useCallback(async (settings: SEOSettings) => {
    if (!organizationId) {
      toast({
        title: 'خطأ',
        description: 'معرف المؤسسة مطلوب لحفظ الإعدادات',
        variant: 'destructive',
      });
      return false;
    }

    try {
             const { data, error: saveError } = await supabase.rpc('update_store_seo_settings', {
         _organization_id: organizationId,
         _settings: settings as any
       });

      if (saveError) {
        throw saveError;
      }

      setSeoSettings(settings);
      toast({
        title: 'تم الحفظ',
        description: 'تم حفظ إعدادات SEO بنجاح',
      });

      return true;
    } catch (err: any) {
      console.error('خطأ في حفظ إعدادات SEO:', err);
      toast({
        title: 'خطأ في الحفظ',
        description: err.message || 'فشل في حفظ إعدادات SEO',
        variant: 'destructive',
      });
      return false;
    }
  }, [organizationId, toast]);

  // جلب الإعدادات عند تغيير organizationId
  useEffect(() => {
    fetchSEOSettings();
  }, [fetchSEOSettings]);

  return {
    seoSettings,
    loading,
    error,
    fetchSEOSettings,
    saveSEOSettings,
    setSeoSettings
  };
}; 