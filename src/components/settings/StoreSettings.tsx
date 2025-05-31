import React, { useState } from 'react';
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

const StoreSettings = () => {
  const { toast } = useToast();
  const { currentOrganization, isOrgAdmin } = useTenant();
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

  // حفظ الإعدادات وإغلاق الديالوج
  const handleSaveSettings = async () => {
    const startTime = Date.now();
    console.log('🚀 [StoreSettings] بدء عملية حفظ الإعدادات من واجهة المستخدم:', {
      currentOrganization: currentOrganization?.id,
      activeTab,
      isSaving,
      isLoading,
      timestamp: new Date().toISOString()
    });

    try {
      console.log('📤 [StoreSettings] استدعاء saveSettings من الهوك...');
      const saveStartTime = Date.now();
      
      await saveSettings();
      
      const saveEndTime = Date.now();
      console.log(`⏱️ [StoreSettings] وقت تنفيذ saveSettings: ${saveEndTime - saveStartTime}ms`);
      
      // لا حاجة لإعادة تحميل الثيم لأنه يطبق مباشرة في useOrganizationSettings
      console.log('ℹ️ [StoreSettings] الثيم يطبق مباشرة، لا حاجة لإعادة التحميل');
      
      // إطلاق حدث تحديث إعدادات المؤسسة لإعلام المكونات الأخرى
      const settingsUpdatedEvent = new CustomEvent('organization_settings_updated', {
        detail: {
          siteName: settings.site_name,
          logoUrl: settings.logo_url,
          faviconUrl: settings.favicon_url,
          displayTextWithLogo: settings.display_text_with_logo,
          primaryColor: settings.theme_primary_color,
          timestamp: Date.now()
        }
      });
      console.log('🔔 [StoreSettings] إطلاق حدث تحديث إعدادات المؤسسة:', settingsUpdatedEvent.detail);
      window.dispatchEvent(settingsUpdatedEvent);
      
      // تطبيق التغييرات في الواجهة بشكل مباشر
      if (settings.site_name) {
        document.title = settings.site_name;
      }
      
      // تحديث الأيقونة في المتصفح إذا تغيرت
      if (settings.favicon_url) {
        const faviconElement = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
        if (faviconElement) {
          faviconElement.href = `${settings.favicon_url}?t=${Date.now()}`;
        } else {
          const newFavicon = document.createElement('link');
          newFavicon.rel = 'icon';
          newFavicon.href = `${settings.favicon_url}?t=${Date.now()}`;
          document.head.appendChild(newFavicon);
        }
      }
      
      // تحديث الشعار في جميع أنحاء التطبيق
      if (settings.logo_url) {
        const logoElements = document.querySelectorAll('img[data-logo="organization"]');
        logoElements.forEach(element => {
          const imgElement = element as HTMLImageElement;
          imgElement.src = `${settings.logo_url}?t=${Date.now()}`;
        });
      }
      
      if (!isSaving && !isLoading) {
        console.log('✅ [StoreSettings] الحفظ مكتمل، إغلاق النافذة بعد 1000ms...');
        // إغلاق النافذة المنبثقة بعد الحفظ بنجاح
        setTimeout(() => {
          setIsDialogOpen(false);
          console.log('🔒 [StoreSettings] تم إغلاق نافذة الإعدادات');
        }, 1000); // تقليل التأخير لأن الثيم يطبق مباشرة
      }
      
      const totalTime = Date.now() - startTime;
      console.log(`🎉 [StoreSettings] اكتملت عملية الحفظ الكاملة في ${totalTime}ms`);
      
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error('💥 [StoreSettings] خطأ في عملية الحفظ:', {
        error,
        message: error instanceof Error ? error.message : 'خطأ غير معروف',
        totalTime: `${totalTime}ms`
      });
    }
  };

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
