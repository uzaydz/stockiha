import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useTenant } from '@/context/TenantContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Settings2, 
  Loader2, 
  Check, 
  Save, 
  RotateCcw,
  Store,
  Palette,
  Printer,
  FileText,
  Zap,
  ArrowRight,
  Home
} from 'lucide-react';
import { Link } from 'react-router-dom';

// استيراد تخطيط نقطة البيع
import POSPureLayout from '@/components/pos-layout/POSPureLayout';

// استيراد مكونات الإعدادات الفرعية
import StoreInfoSettings from '@/components/pos/settings/StoreInfoSettings';
import ReceiptAppearanceSettings from '@/components/pos/settings/ReceiptAppearanceSettings';
import PrintingSettings from '@/components/pos/settings/PrintingSettings';

// استيراد هوك إعدادات نقطة البيع وأنواع البيانات
import { usePOSData } from '@/context/POSDataContext';
import { usePOSSettings } from '@/hooks/usePOSSettings';
import { type POSSettings, defaultPOSSettings } from '@/types/posSettings';

const POSSettingsPage: React.FC = () => {
  const { toast } = useToast();
  const { currentOrganization, isOrgAdmin } = useTenant();
  const [activeTab, setActiveTab] = useState('store-info');
  
  // استخدام هوك إعدادات نقطة البيع الحقيقي
  const {
    settings,
    isLoading,
    error,
    updateSettings,
    saveSettings: savePOSSettings,
    isSaving,
    saveSuccess,
    hasPermission
  } = usePOSSettings({ organizationId: currentOrganization?.id || '' });
  
  // استخدام الإعدادات من الهوك مباشرة
  const localSettings = settings;
  
  // استخدام وظيفة الحفظ من الهوك
  const saveSettings = useCallback(async () => {
    try {
      await savePOSSettings();
      toast({
        title: "تم الحفظ بنجاح",
        description: "تم حفظ إعدادات نقطة البيع بنجاح",
      });
    } catch (error) {
      toast({
        title: "خطأ في الحفظ",
        description: "حدث خطأ أثناء حفظ الإعدادات",
        variant: "destructive",
      });
    }
  }, [savePOSSettings, toast]);
  
  // استخدام الإعدادات للعرض - تأكد من أن البيانات المحملة لها الأولوية
  const displaySettings = localSettings || { ...defaultPOSSettings, organization_id: currentOrganization?.id || '' };

  // إنشاء دالة updateSetting للتوافق مع المكونات الفرعية
  const updateSetting = useCallback(<K extends keyof POSSettings>(key: K, value: POSSettings[K]) => {
    updateSettings({ [key]: value } as Partial<POSSettings>);
  }, [updateSettings]);

  // دالة لإعادة تعيين الإعدادات للافتراضية
  const resetToDefaults = useCallback(() => {
    updateSettings(defaultPOSSettings);
    toast({
      title: "تم إعادة التعيين",
      description: "تم إعادة تعيين الإعدادات للقيم الافتراضية",
    });
  }, [updateSettings, toast]);

  // حالة التحميل
  if (isLoading) {
    return (
      <POSPureLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <h2 className="text-xl font-semibold mb-2">جاري تحميل إعدادات نقطة البيع...</h2>
            <p className="text-muted-foreground">يرجى الانتظار قليلاً</p>
          </div>
        </div>
      </POSPureLayout>
    );
  }

  // حالة الخطأ في الصلاحيات
  if (!hasPermission() || (error && error.includes('صلاحية'))) {
    return (
      <POSPureLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
          <Card className="max-w-md mx-4">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                <Settings2 className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-xl text-destructive">غير مصرح لك</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                {error || 'ليس لديك الصلاحية للوصول إلى إعدادات نقطة البيع.'}
              </p>
              <p className="text-sm text-muted-foreground">
                يرجى التواصل مع مدير النظام لمنحك الصلاحيات اللازمة.
              </p>
              <div className="flex gap-2 justify-center">
                <Button asChild variant="outline">
                  <Link to="/dashboard">
                    <Home className="h-4 w-4 ml-2" />
                    العودة للرئيسية
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </POSPureLayout>
    );
  }

  // حالة أخطاء أخرى
  if (error && !error.includes('صلاحية')) {
    return (
      <POSPureLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
          <Card className="max-w-md mx-4">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                <Settings2 className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-xl text-destructive">خطأ في تحميل الإعدادات</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">{error}</p>
              <div className="flex gap-2 justify-center">
                <Button 
                  variant="outline" 
                  onClick={() => window.location.reload()}
                  disabled={isLoading}
                >
                  <RotateCcw className="h-4 w-4 ml-2" />
                  إعادة المحاولة
                </Button>
                <Button asChild variant="outline">
                  <Link to="/dashboard">
                    <Home className="h-4 w-4 ml-2" />
                    العودة للرئيسية
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </POSPureLayout>
    );
  }

  return (
    <POSPureLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        {/* Header */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-border/50 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <Button asChild variant="ghost" size="sm">
                  <Link to="/dashboard" className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    الرئيسية
                  </Link>
                </Button>
                <div className="h-6 w-px bg-border" />
                <div className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-primary" />
                  <h1 className="text-xl font-bold">إعدادات نقطة البيع</h1>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {saveSuccess && (
                  <div className="flex items-center text-green-600 text-sm">
                    <Check className="h-4 w-4 ml-1" />
                    تم الحفظ
                  </div>
                )}
                <Button 
                  onClick={saveSettings}
                  disabled={isSaving}
                  className="flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      حفظ الإعدادات
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 gap-8">
            {/* التبويبات والإعدادات */}
            <div>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger 
                    value="store-info"
                    className="flex items-center gap-2 text-sm"
                  >
                    <Store className="h-4 w-4" />
                    معلومات المتجر
                  </TabsTrigger>
                  <TabsTrigger 
                    value="receipt-appearance"
                    className="flex items-center gap-2 text-sm"
                  >
                    <Palette className="h-4 w-4" />
                    مظهر الوصل
                  </TabsTrigger>
                  <TabsTrigger 
                    value="printing"
                    className="flex items-center gap-2 text-sm"
                  >
                    <Printer className="h-4 w-4" />
                    إعدادات الطباعة
                  </TabsTrigger>
                  <TabsTrigger 
                    value="advanced"
                    className="flex items-center gap-2 text-sm"
                  >
                    <Zap className="h-4 w-4" />
                    متقدم
                  </TabsTrigger>
                </TabsList>

                <div className="space-y-6">
                  {/* معلومات المتجر */}
                  <TabsContent value="store-info" className="mt-0">
                    <StoreInfoSettings 
                      settings={displaySettings} 
                      updateSetting={updateSetting}
                    />
                  </TabsContent>

                  {/* مظهر الوصل */}
                  <TabsContent value="receipt-appearance" className="mt-0">
                    <ReceiptAppearanceSettings 
                      settings={displaySettings} 
                      updateSetting={updateSetting}
                    />
                  </TabsContent>

                  {/* إعدادات الطباعة */}
                  <TabsContent value="printing" className="mt-0">
                    <PrintingSettings 
                      settings={displaySettings} 
                      updateSetting={updateSetting}
                    />
                  </TabsContent>

                  {/* إعدادات متقدمة */}
                  <TabsContent value="advanced" className="mt-0">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Zap className="h-5 w-5" />
                          الإعدادات المتقدمة
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center py-12">
                          <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                          <h3 className="text-lg font-medium mb-2">الإعدادات المتقدمة</h3>
                          <p className="text-sm text-muted-foreground">
                            هذا القسم قيد التطوير وسيتم إضافة المزيد من الخيارات قريباً
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </POSPureLayout>
  );
};

export default POSSettingsPage;
