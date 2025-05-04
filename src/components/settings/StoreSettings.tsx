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
import { useTheme } from '@/context/ThemeContext';

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
    await saveSettings();
    
    // تحديث الثيم في كل التطبيق باستخدام الهوك
    if (currentOrganization?.id) {
      await reloadOrganizationTheme(currentOrganization.id);
    }
    
    if (!isSaving && !isLoading) {
      // إغلاق النافذة المنبثقة بعد الحفظ بنجاح بعد تأخير قصير
      setTimeout(() => {
        setIsDialogOpen(false);
      }, 500);
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
              disabled={isSaving || !isOrgAdmin}
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