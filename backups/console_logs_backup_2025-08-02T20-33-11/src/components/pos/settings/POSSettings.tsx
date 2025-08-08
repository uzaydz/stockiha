import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useTenant } from '@/context/TenantContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Zap
} from 'lucide-react';

// استيراد مكونات الإعدادات الفرعية
import StoreInfoSettings from './StoreInfoSettings';
import ReceiptAppearanceSettings from './ReceiptAppearanceSettings';
import PrintingSettings from './PrintingSettings';
import ReceiptPreview from './ReceiptPreview';

// استيراد هوك إعدادات نقطة البيع وأنواع البيانات
import { usePOSData } from '@/context/POSDataContext';
import { usePOSSettings } from '@/hooks/usePOSSettings';
import { type POSSettings, defaultPOSSettings } from '@/types/posSettings';

interface POSSettingsProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const POSSettings: React.FC<POSSettingsProps> = ({ isOpen, onOpenChange }) => {
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
    await savePOSSettings();
  }, [savePOSSettings]);
  
  // استخدام الإعدادات للعرض - تأكد من أن البيانات المحملة لها الأولوية
  const displaySettings = localSettings || { ...defaultPOSSettings, organization_id: currentOrganization?.id || '' };

  // إضافة سجل للتأكد من البيانات
  console.log('🔍 POSSettings - settings from hook:', settings);
  console.log('🔍 POSSettings - displaySettings:', displaySettings);

  // إنشاء دالة updateSetting للتوافق مع المكونات الفرعية
  const updateSetting = useCallback(<K extends keyof POSSettings>(key: K, value: POSSettings[K]) => {
    updateSettings({ [key]: value } as Partial<POSSettings>);
  }, [updateSettings]);

  // دالة لإعادة تعيين الإعدادات للافتراضية
  const resetToDefaults = useCallback(() => {
    updateSettings(defaultPOSSettings);
  }, [updateSettings]);

  // حفظ الإعدادات وإغلاق النافذة
  const handleSaveAndClose = async () => {
    await saveSettings();
    
    if (!isSaving && !error) {
      // إغلاق النافذة بعد الحفظ بنجاح بعد تأخير قصير
      setTimeout(() => {
        onOpenChange(false);
      }, 500);
    }
  };

  // حالة التحميل
  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">جاري تحميل إعدادات نقطة البيع...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // حالة الخطأ في الصلاحيات
  if (!hasPermission() || (error && error.includes('صلاحية'))) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-destructive">
              غير مصرح لك
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            <p className="mb-4">
              {error || 'ليس لديك الصلاحية للوصول إلى إعدادات نقطة البيع.'}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              يرجى التواصل مع مدير النظام لمنحك الصلاحيات اللازمة.
            </p>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="mt-4"
            >
              إغلاق
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // حالة أخطاء أخرى
  if (error && !error.includes('صلاحية')) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-destructive">
              خطأ في تحميل الإعدادات
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">{error}</p>
            <div className="space-x-2">
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
                disabled={isLoading}
              >
                <RotateCcw className="h-4 w-4 ml-2" />
                إعادة المحاولة
              </Button>
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                إغلاق
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl font-bold text-right mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>إعدادات نقطة البيع</span>
              {saveSuccess && (
                <div className="flex items-center text-green-600 text-sm">
                  <Check className="h-4 w-4 ml-1" />
                  تم الحفظ
                </div>
              )}
            </div>
            <Settings2 className="h-5 w-5 text-primary" />
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex gap-6 overflow-hidden">
          {/* الجانب الأيسر - التبويبات والإعدادات */}
          <div className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="grid grid-cols-4 w-full flex-shrink-0">
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

              <div className="flex-1 overflow-auto mt-4">
                {/* معلومات المتجر */}
                <TabsContent value="store-info" className="mt-0 h-full">
                  <StoreInfoSettings 
                    settings={displaySettings} 
                    updateSetting={updateSetting}
                  />
                </TabsContent>

                {/* مظهر الوصل */}
                <TabsContent value="receipt-appearance" className="mt-0 h-full">
                  <ReceiptAppearanceSettings 
                    settings={displaySettings} 
                    updateSetting={updateSetting}
                  />
                </TabsContent>

                {/* إعدادات الطباعة */}
                <TabsContent value="printing" className="mt-0 h-full">
                  <PrintingSettings 
                    settings={displaySettings} 
                    updateSetting={updateSetting}
                  />
                </TabsContent>

                {/* إعدادات متقدمة */}
                <TabsContent value="advanced" className="mt-0 h-full">
                  <div className="space-y-6">
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <h3 className="text-lg font-medium mb-2">الإعدادات المتقدمة</h3>
                      <p className="text-sm text-muted-foreground">
                        هذا القسم قيد التطوير وسيتم إضافة المزيد من الخيارات قريباً
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* الجانب الأيمن - معاينة الوصل */}
          <div className="w-80 flex-shrink-0 border-l border-border pl-6">
            <div className="h-full flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="font-medium">معاينة الوصل</h3>
              </div>
              
              <div className="flex-1 overflow-auto">
                <ReceiptPreview settings={settings} />
              </div>
            </div>
          </div>
        </div>

        {/* أزرار التحكم */}
        <div className="flex-shrink-0 mt-6 flex justify-between items-center gap-3 border-t border-border pt-4">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={resetToDefaults}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              إعادة تعيين
            </Button>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              إلغاء
            </Button>
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
            <Button 
              onClick={handleSaveAndClose}
              disabled={isSaving}
              variant="default"
              className="bg-gradient-to-r from-primary to-primary/90"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 ml-2" />
                  حفظ وإغلاق
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default POSSettings;
