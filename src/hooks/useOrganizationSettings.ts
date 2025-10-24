import { useState, useEffect, useCallback } from "react";
import { useTenant } from "@/context/TenantContext";
import { useToast } from "@/hooks/use-toast";
import { getOrganizationSettings, updateOrganizationSettings } from "@/lib/api/settings";
import type { OrganizationSettings } from "@/types/settings";

// تعريف الأنواع المطلوبة
interface UseOrganizationSettingsProps {
  organizationId: string | undefined;
}

interface TrackingPixels {
  facebook: { enabled: boolean; pixelId: string };
  tiktok: { enabled: boolean; pixelId: string };
  snapchat: { enabled: boolean; pixelId: string };
  google: { enabled: boolean; pixelId: string };
}

interface UseOrganizationSettingsReturn {
  settings: OrganizationSettings | null;
  trackingPixels: TrackingPixels;
  isLoading: boolean;
  isSaving: boolean;
  saveSuccess: boolean;
  updateSetting: (key: keyof OrganizationSettings, value: any) => void;
  updateTrackingPixel: (platform: keyof TrackingPixels, field: string, value: any) => void;
  saveSettings: () => Promise<void>;
}

export const useOrganizationSettings = ({ organizationId }: UseOrganizationSettingsProps): UseOrganizationSettingsReturn => {
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

  // تحميل إعدادات المؤسسة
  useEffect(() => {
    const loadOrganizationSettings = async () => {
      if (!organizationId) {
        setIsLoading(false);
        return;
      }

      // مسح الكاش أولاً لضمان الحصول على أحدث البيانات
      try {
        if (typeof window !== 'undefined' && (window as any).clearOrganizationUnifiedCache) {
          (window as any).clearOrganizationUnifiedCache(organizationId);
        }
      } catch (cacheError) {
        // تجاهل أخطاء الكاش
      }

      try {
        const fetchedSettings = await getOrganizationSettings(organizationId);
        
        if (fetchedSettings) {
          setSettings(fetchedSettings);
          
          // استخراج بيانات بكسل التتبع من custom_js
          if (fetchedSettings.custom_js) {
            try {
              const customData = JSON.parse(fetchedSettings.custom_js);
              if (customData && customData.trackingPixels) {
                setTrackingPixels({
                  ...trackingPixels,
                  ...customData.trackingPixels
                });
              }
            } catch (jsonError) {
              // إذا كان custom_js يحتوي على كود JavaScript بدلاً من JSON، تجاهل استخراج بكسل التتبع
              console.warn('custom_js لا يحتوي على بيانات JSON صالحة للتتبع:', jsonError);

              // إذا كان الكود يحتوي على أخطاء JavaScript خطيرة، قم بمسحه تلقائياً
              if (fetchedSettings.custom_js && (
                  fetchedSettings.custom_js.includes('fNcqSfPLFxu') ||
                  fetchedSettings.custom_js.match(/Unexpected identifier|SyntaxError/) ||
                  fetchedSettings.custom_js.trim().startsWith('{')
              )) {
                console.error('تم اكتشاف كود JavaScript خاطئ في custom_js، سيتم مسحه تلقائياً');
                try {
                  // مسح الكود الخاطئ من الإعدادات
                  const cleanedSettings = {
                    ...fetchedSettings,
                    custom_js: null
                  };
                  setSettings(cleanedSettings);
                  console.log('✅ تم مسح الكود الخاطئ من custom_js');
                } catch (cleanError) {
                  console.error('فشل في مسح الكود الخاطئ:', cleanError);
                }
              }
            }
          }
        } else {
          // إنشاء إعدادات افتراضية إذا لم توجد
          const defaultSettings: OrganizationSettings = {
            organization_id: organizationId,
            theme_primary_color: '#3B82F6',
            theme_secondary_color: '#10B981',
            theme_mode: 'light',
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
          setSettings(defaultSettings);
        }
        
      } catch (error) {
        toast({
          variant: "destructive",
          title: "خطأ في تحميل الإعدادات",
          description: "حدث خطأ أثناء تحميل إعدادات المؤسسة",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadOrganizationSettings();
  }, [organizationId, toast]);

  // دالة تحديث إعداد
  const updateSetting = useCallback((key: keyof OrganizationSettings, value: any) => {
    if (settings) {
      setSettings(prev => prev ? { ...prev, [key]: value } : null);
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
  }, []);

  // دالة حفظ الإعدادات
  const saveSettings = useCallback(async () => {
    if (!organizationId || !settings) {
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      // تحديث custom_js مع بيانات التتبع
      const updatedCustomJs = {
        trackingPixels,
        auto_deduct_inventory: true // إضافة إعداد خصم المخزون التلقائي
      };

             const updatedSettings = {
         ...settings,
         custom_js: JSON.stringify(updatedCustomJs)
       };

       // تحويل البيانات لتتوافق مع UpdateSettingsPayload
       const payload = {
         theme_primary_color: updatedSettings.theme_primary_color,
         theme_secondary_color: updatedSettings.theme_secondary_color,
         theme_mode_org: (updatedSettings.theme_mode === 'auto' ? 'system' : updatedSettings.theme_mode) as 'light' | 'dark' | 'system',
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
         display_text_with_logo: updatedSettings.display_text_with_logo
       };

       const result = await updateOrganizationSettings(organizationId, payload);

      if (result) {
        setSettings(result);
        setSaveSuccess(true);
        
        toast({
          title: "تم الحفظ بنجاح",
          description: "تم حفظ إعدادات المؤسسة بنجاح",
        });

        // مسح الكاش بعد الحفظ
        try {
          if (typeof window !== 'undefined' && (window as any).clearOrganizationUnifiedCache) {
            (window as any).clearOrganizationUnifiedCache(organizationId);
          }
        } catch (cacheError) {
          // تجاهل أخطاء الكاش
        }
      } else {
        throw new Error('فشل في حفظ الإعدادات');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "خطأ في الحفظ",
        description: "فشل في حفظ إعدادات المؤسسة",
      });
    } finally {
      setIsSaving(false);
    }
  }, [organizationId, settings, trackingPixels, toast]);

  return {
    settings,
    trackingPixels,
    isLoading,
    isSaving,
    saveSuccess,
    updateSetting,
    updateTrackingPixel,
    saveSettings
  };
};
