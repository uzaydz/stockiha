import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useTenant } from '@/context/TenantContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings2, Loader2, Check, AlertTriangle, Palette, Store, Cog } from 'lucide-react';
import Layout from '@/components/Layout';

// مكونات إعدادات المتجر
import BasicStoreSettings from '@/components/store-settings/BasicStoreSettings';
import StoreDesignSettings from '@/components/store-settings/StoreDesignSettings';
import AdvancedStoreSettings from '@/components/store-settings/AdvancedStoreSettings';

// هوك إعدادات المتجر المحسن
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { useTheme } from '@/context/ThemeContext.tsx';

const StoreSettingsPage = () => {
  const { toast } = useToast();
  const { currentOrganization, isOrgAdmin, refreshOrganizationData } = useTenant();
  const [activeTab, setActiveTab] = useState('basic');
  const { reloadOrganizationTheme } = useTheme();
  
  // استخدام هوك إعدادات المتجر المحسن
  const {
    settings,
    trackingPixels,
    isLoading,
    isSaving,
    saveSuccess,
    error,
    updateSetting,
    updateTrackingPixel,
    saveSettings,
    refreshSettings,
    clearCache,
    applyTheme
  } = useStoreSettings({
    organizationId: currentOrganization?.id,
    autoApplyTheme: true
  });

  // التحقق من جاهزية البيانات
  const isDataReady = !isLoading && settings && settings.organization_id;

  // حفظ الإعدادات - مبسط لأن الهوك يتعامل مع كل شيء
  const handleSaveSettings = async () => {
    try {
      await saveSettings();
      
      // تحديث بيانات المؤسسة في السياق
      try {
        await refreshOrganizationData();
      } catch (refreshError) {
      }
      
      // إطلاق حدث تحديث للمكونات الأخرى
      const settingsUpdatedEvent = new CustomEvent('organization_settings_updated', {
        detail: {
          siteName: settings?.site_name,
          logoUrl: settings?.logo_url,
          faviconUrl: settings?.favicon_url,
          displayTextWithLogo: settings?.display_text_with_logo,
          primaryColor: settings?.theme_primary_color,
          defaultLanguage: settings?.default_language,
          timestamp: Date.now()
        },
        bubbles: true
      });
      window.dispatchEvent(settingsUpdatedEvent);
      
    } catch (error) {
    }
  };

  // عرض مؤشر التحميل
  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-background">
          <div className="container mx-auto p-6">
            <div className="max-w-4xl mx-auto">
              <div className="bg-card rounded-lg shadow-sm animate-pulse p-8">
                <div className="h-8 w-48 bg-muted rounded mb-6"></div>
                <div className="space-y-4">
                  <div className="h-12 bg-muted rounded"></div>
                  <div className="h-12 bg-muted rounded"></div>
                  <div className="h-12 bg-muted rounded"></div>
                </div>
                <div className="mt-6 text-sm text-muted-foreground text-center">
                  🔄 جاري تحميل إعدادات المتجر...
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // نظام تشخيص للمشاكل
  const hasSettingsIssue = (!settings || !settings.organization_id || !currentOrganization?.id) && !isLoading;
  
  if (hasSettingsIssue) {
    return (
      <Layout>
        <div className="min-h-screen bg-background">
          <div className="container mx-auto p-6">
            <div className="max-w-4xl mx-auto">
              <div className="bg-card rounded-lg shadow-sm border-l-4 border-yellow-500 p-8">
                <div className="flex items-start gap-4">
                  <AlertTriangle className="h-8 w-8 text-yellow-500 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold text-right mb-4">مشكلة في تحميل إعدادات المتجر</h1>
                    <div className="text-muted-foreground space-y-3 text-right">
                      <p>لم نتمكن من تحميل إعدادات المتجر بشكل صحيح. يرجى التحقق من:</p>
                      <ul className="list-disc list-inside space-y-2 mr-6">
                        <li>أنك متصل بالإنترنت</li>
                        <li>لديك صلاحيات إدارة المتجر</li>
                        <li>المؤسسة محددة بشكل صحيح</li>
                      </ul>
                      
                      <div className="mt-6 p-4 bg-muted rounded text-sm font-mono text-left" dir="ltr">
                        <div className="font-semibold mb-2">تفاصيل التشخيص:</div>
                        <div>• معرف المؤسسة: {currentOrganization?.id || 'غير محدد'}</div>
                        <div>• صلاحية المدير: {isOrgAdmin ? 'نعم' : 'لا'}</div>
                        <div>• وجود الإعدادات: {settings ? 'نعم' : 'لا'}</div>
                        <div>• معرف الإعدادات: {settings?.organization_id || 'غير محدد'}</div>
                        <div>• رسالة الخطأ: {error || 'لا يوجد'}</div>
                        <div>• وقت الفحص: {new Date().toLocaleString('ar-SA')}</div>
                      </div>
                    </div>
                    
                    <div className="flex gap-3 mt-6">
                      <Button 
                        onClick={() => window.location.reload()} 
                        variant="outline"
                      >
                        إعادة تحميل الصفحة
                      </Button>
                      <Button 
                        onClick={clearCache} 
                        variant="default"
                      >
                        مسح الكاش وإعادة المحاولة
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <div className="max-w-6xl mx-auto">
            {/* رأس الصفحة */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <Settings2 className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold">إعدادات المتجر</h1>
              </div>
              <p className="text-muted-foreground text-lg">
                قم بتخصيص إعدادات متجرك الإلكتروني وتصميمه بما يناسب علامتك التجارية
              </p>
            </div>

            {/* عرض مؤشر التحميل إذا لم تكن البيانات جاهزة */}
            {!isDataReady ? (
              <div className="bg-card rounded-lg shadow-sm p-12">
                <div className="flex flex-col items-center justify-center space-y-6">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <div className="text-center space-y-2">
                    <p className="text-xl font-medium">جاري تحميل إعدادات المتجر...</p>
                    <p className="text-muted-foreground">
                      يرجى الانتظار قليلاً حتى نجلب إعداداتك المحفوظة
                    </p>
                  </div>
                  <div className="w-full max-w-md">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* نظام التابات */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid grid-cols-3 w-full max-w-2xl mx-auto mb-8 h-14">
                    <TabsTrigger value="basic" className="flex items-center gap-2 text-base">
                      <Store className="h-5 w-5" />
                      الإعدادات الأساسية
                    </TabsTrigger>
                    <TabsTrigger value="design" className="flex items-center gap-2 text-base">
                      <Palette className="h-5 w-5" />
                      تصميم المتجر
                    </TabsTrigger>
                    <TabsTrigger value="advanced" className="flex items-center gap-2 text-base">
                      <Cog className="h-5 w-5" />
                      إعدادات متقدمة
                    </TabsTrigger>
                  </TabsList>

                  {/* محتوى التابات */}
                  <div className="bg-card rounded-lg shadow-sm">
                    {/* الإعدادات الأساسية */}
                    <TabsContent value="basic" className="space-y-6 p-6">
                      <BasicStoreSettings 
                        settings={settings} 
                        updateSetting={updateSetting} 
                        currentOrganization={currentOrganization}
                      />
                    </TabsContent>

                    {/* تصميم المتجر */}
                    <TabsContent value="design" className="space-y-6 p-6">
                      <StoreDesignSettings 
                        settings={settings} 
                        updateSetting={updateSetting}
                        trackingPixels={trackingPixels}
                        updateTrackingPixel={updateTrackingPixel}
                      />
                    </TabsContent>

                    {/* الإعدادات المتقدمة */}
                    <TabsContent value="advanced" className="space-y-6 p-6">
                      <AdvancedStoreSettings 
                        settings={settings} 
                        updateSetting={updateSetting} 
                      />
                    </TabsContent>
                  </div>

                  {/* أزرار الحفظ */}
                  <div className="flex justify-end mt-8 gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => window.history.back()}
                      className="px-6"
                    >
                      إلغاء
                    </Button>
                    
                    <Button 
                      onClick={handleSaveSettings} 
                      disabled={isSaving}
                      className="min-w-[140px] px-6"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="ml-2 h-4 w-4 animate-spin" /> 
                          جاري الحفظ...
                        </>
                      ) : saveSuccess ? (
                        <>
                          <Check className="ml-2 h-4 w-4" /> 
                          تم الحفظ
                        </>
                      ) : (
                        <>
                          <Settings2 className="ml-2 h-4 w-4" />
                          حفظ الإعدادات
                        </>
                      )}
                    </Button>
                  </div>
                </Tabs>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default StoreSettingsPage;
