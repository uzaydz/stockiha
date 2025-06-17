import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useTenant } from '@/context/TenantContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings2, Loader2, Check } from 'lucide-react';

// مكونات فرعية - استخدام المسارات المطلقة
import GeneralSettings from '@/components/settings/store-settings/GeneralSettings';
import AppearanceSettings from '@/components/settings/store-settings/AppearanceSettings';
import TrackingPixelsSettings from '@/components/settings/store-settings/TrackingPixelsSettings';
import AdvancedSettings from '@/components/settings/store-settings/AdvancedSettings';
import SEOSettings from '@/components/settings/store-settings/SEOSettings';

// هوك إعدادات المؤسسة
import { useOrganizationSettings } from '@/hooks/useOrganizationSettings';
// استيراد هوك الثيم
import { useTheme } from '@/context/ThemeContext.tsx';
import { getSupabaseClient } from '@/lib/supabase-client';

const StoreSettings = () => {
  const { toast } = useToast();
  const { currentOrganization, isOrgAdmin, refreshOrganizationData } = useTenant();
  const [activeTab, setActiveTab] = useState('general');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { reloadOrganizationTheme } = useTheme(); // استخدام هوك الثيم
  
  // استخدام هوك إعدادات المؤسسة
  const {
    settings,
    trackingPixels,
    isLoading,
    isSaving,
    saveSuccess,
    updateSetting,
    updateTrackingPixel,
    saveSettings
  } = useOrganizationSettings({
    organizationId: currentOrganization?.id
  });

  // حفظ الإعدادات وإغلاق الديالوج - محسن
  const handleSaveSettings = async () => {
    const startTime = Date.now();

    try {
      const saveStartTime = Date.now();
      
      await saveSettings();
      
      const saveEndTime = Date.now();
      
      // تحديث الإعدادات في الذاكرة بدلاً من مسح الكاش
      try {
        await refreshOrganizationData();
      } catch (refreshError) {
        console.warn('تحذير: فشل في تحديث بيانات المؤسسة:', refreshError);
      }
      
      // تطبيق التغييرات مباشرة بدون إعادة تحميل الصفحة
      await applySettingsToDOM();
      
      // إطلاق حدث تحديث محسن
      const settingsUpdatedEvent = new CustomEvent('organization_settings_updated', {
        detail: {
          siteName: settings.site_name,
          logoUrl: settings.logo_url,
          faviconUrl: settings.favicon_url,
          displayTextWithLogo: settings.display_text_with_logo,
          primaryColor: settings.theme_primary_color,
          timestamp: Date.now()
        },
        bubbles: true
      });
      window.dispatchEvent(settingsUpdatedEvent);
      
      // إجبار إعادة رسم التخطيط
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
        document.body.style.visibility = 'hidden';
        document.body.offsetHeight; // trigger reflow
        document.body.style.visibility = 'visible';
      }, 100);
      
      // إغلاق النافذة مع تأخير قصير فقط
      if (!isSaving && !isLoading) {
        setTimeout(() => {
          setIsDialogOpen(false);
          // إزالة إعادة تحميل الصفحة الكاملة
          // window.location.reload(); - هذا كان يسبب البطء!
        }, 1000);
      }
      
      const totalTime = Date.now() - startTime;
      console.log(`⚡ تم حفظ الإعدادات في ${totalTime}ms`);
      
      // إشعار بالحفظ الناجح
      toast({
        title: "تم الحفظ بنجاح",
        description: `⚡ تم حفظ إعدادات المتجر وتطبيقها في ${totalTime}ms`,
        duration: 3000,
      });
      
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`❌ فشل حفظ الإعدادات في ${totalTime}ms:`, error);
      
      toast({
        title: "خطأ في الحفظ",
        description: "فشل في حفظ الإعدادات. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
    }
  };

  // دالة محسنة لتطبيق الإعدادات على DOM
  const applySettingsToDOM = useCallback(async () => {
    try {
      // تحديث عنوان الصفحة
      if (settings.site_name && document.title !== settings.site_name) {
        document.title = settings.site_name;
      }
      
      // تحديث الأيقونة
      await updateFavicon(settings.favicon_url);
      
      // تحديث الشعار
      await updateLogos(settings.logo_url);
      
      // تحديث متغيرات CSS للثيم
      await updateThemeVariables(settings.theme_primary_color, settings.theme_secondary_color);
      
      // تطبيق الثيم باستخدام مدير الثيم
      if (currentOrganization?.id) {
        const { updateOrganizationTheme } = await import('@/lib/themeManager');
        updateOrganizationTheme(currentOrganization.id, {
          theme_primary_color: settings.theme_primary_color,
          theme_secondary_color: settings.theme_secondary_color,
          theme_mode: settings.theme_mode,
          custom_css: settings.custom_css
        });
      }
      
      // إعادة تحميل ثيم المؤسسة
      try {
        await reloadOrganizationTheme();
      } catch (themeError) {
        console.warn('تحذير: فشل في إعادة تحميل ثيم المؤسسة:', themeError);
      }
      
    } catch (error) {
      console.error('خطأ في تطبيق الإعدادات على DOM:', error);
    }
  }, [settings, currentOrganization?.id, reloadOrganizationTheme]);

  const updateFavicon = useCallback(async (faviconUrl: string | null) => {
    if (!faviconUrl) return;
    
    try {
      // إزالة الأيقونة القديمة
      const existingFavicons = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]');
      existingFavicons.forEach(favicon => favicon.remove());
      
      // إضافة الأيقونة الجديدة
      const newFavicon = document.createElement('link');
      newFavicon.rel = 'icon';
      newFavicon.type = 'image/x-icon';
      newFavicon.href = `${faviconUrl}?v=${Date.now()}`;
      document.head.appendChild(newFavicon);
      
      // إضافة shortcut icon للمتصفحات القديمة
      const shortcutFavicon = document.createElement('link');
      shortcutFavicon.rel = 'shortcut icon';
      shortcutFavicon.type = 'image/x-icon';
      shortcutFavicon.href = `${faviconUrl}?v=${Date.now()}`;
      document.head.appendChild(shortcutFavicon);
      
    } catch (error) {
      console.error('خطأ في تحديث الأيقونة:', error);
    }
  }, []);

  const updateLogos = useCallback(async (logoUrl: string | null) => {
    if (!logoUrl) return;
    
    try {
        const logoElements = document.querySelectorAll('img[data-logo="organization"]');
      const logoSelectors = [
        'img[alt*="logo"]',
        'img[src*="logo"]',
        '.logo img',
        '[data-testid="organization-logo"]'
      ];
      
      // تحديث الشعارات المحددة
        logoElements.forEach(element => {
        const imgElement = element as HTMLImageElement;
        imgElement.src = `${logoUrl}?v=${Date.now()}`;
      });
      
      // تحديث الشعارات الأخرى
      logoSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          const imgElement = element as HTMLImageElement;
          if (imgElement.src) {
            imgElement.src = `${logoUrl}?v=${Date.now()}`;
          }
        });
      });
      
    } catch (error) {
      console.error('خطأ في تحديث الشعار:', error);
    }
  }, []);

  const updateThemeVariables = useCallback(async (primaryColor: string, secondaryColor: string) => {
    try {
      const root = document.documentElement;
      
      if (primaryColor) {
        // تحويل HEX إلى HSL للمتغيرات
        const hsl = hexToHsl(primaryColor);
        root.style.setProperty('--primary', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
        root.style.setProperty('--color-primary', primaryColor);
          
        // تحديث المتغيرات ذات الصلة
        root.style.setProperty('--primary-foreground', '0 0% 98%');
        root.style.setProperty('--ring', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
      }
      
      if (secondaryColor) {
        const hsl = hexToHsl(secondaryColor);
        root.style.setProperty('--secondary', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
        root.style.setProperty('--color-secondary', secondaryColor);
        root.style.setProperty('--secondary-foreground', '0 0% 9%');
      }
      
      // إجبار إعادة رسم الصفحة
      root.style.display = 'none';
      root.offsetHeight; // trigger reflow
      root.style.display = '';
      
    } catch (error) {
      console.error('خطأ في تحديث متغيرات الثيم:', error);
    }
  }, []);

  // دالة مساعدة لتحويل HEX إلى HSL
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

  // دالة للتحقق من تطبيق التغييرات - محسنة
  const verifyChangesApplied = useCallback(() => {
    // استخدام applySettingsToDOM بدلاً من التحديث اليدوي
    applySettingsToDOM();
  }, [applySettingsToDOM]);

  // مستمع الأحداث لتطبيق التغييرات عند فتح النافذة - محسن
  useEffect(() => {
    if (isDialogOpen && !isLoading) {
      // تطبيق التغييرات فوراً بدون تأخير
      applySettingsToDOM();
    }
  }, [isDialogOpen, isLoading, applySettingsToDOM]);

  if (isLoading) {
    return (
      <div className="p-6 bg-card rounded-lg shadow-sm animate-pulse">
        <div className="h-6 w-40 bg-muted rounded mb-4"></div>
        <div className="space-y-4">
          <div className="h-10 bg-muted rounded"></div>
          <div className="h-10 bg-muted rounded"></div>
          <div className="h-10 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Button 
        onClick={() => setIsDialogOpen(true)}
        className="flex items-center gap-2"
        variant="outline"
      >
        <Settings2 className="h-4 w-4" />
        <span>إعدادات المتجر</span>
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-right mb-2">إعدادات المتجر</DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="general">عام</TabsTrigger>
              <TabsTrigger value="appearance">المظهر</TabsTrigger>
              <TabsTrigger value="seo">تحسين SEO</TabsTrigger>
              <TabsTrigger value="tracking">بكسل التتبع</TabsTrigger>
              <TabsTrigger value="advanced">متقدم</TabsTrigger>
            </TabsList>

            {/* إعدادات عامة */}
            <TabsContent value="general" className="space-y-4 mt-4">
              <GeneralSettings 
                settings={settings} 
                updateSetting={updateSetting} 
                currentOrganization={currentOrganization}
              />
            </TabsContent>

            {/* إعدادات المظهر */}
            <TabsContent value="appearance" className="space-y-4 mt-4">
              <AppearanceSettings 
                settings={settings} 
                updateSetting={updateSetting} 
              />
            </TabsContent>

            {/* إعدادات تحسين محركات البحث */}
            <TabsContent value="seo" className="space-y-4 mt-4">
              <SEOSettings 
                settings={settings} 
                updateSetting={updateSetting} 
              />
            </TabsContent>

            {/* بكسل التتبع */}
            <TabsContent value="tracking" className="space-y-4 mt-4">
              <TrackingPixelsSettings 
                trackingPixels={trackingPixels} 
                updateTrackingPixel={updateTrackingPixel} 
              />
            </TabsContent>

            {/* إعدادات متقدمة */}
            <TabsContent value="advanced" className="space-y-4 mt-4">
              <AdvancedSettings 
                settings={settings} 
                updateSetting={updateSetting} 
              />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end mt-6 gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)}
            >
              إلغاء
            </Button>
            
            <Button 
              onClick={handleSaveSettings} 
              disabled={isSaving}
              className="min-w-[120px]"
            >
              {isSaving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> جاري الحفظ...</>
              ) : saveSuccess ? (
                <><Check className="mr-2 h-4 w-4" /> تم الحفظ</>
              ) : (
                "حفظ الإعدادات"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StoreSettings;
