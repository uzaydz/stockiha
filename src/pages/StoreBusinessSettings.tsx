import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useTenant } from '@/context/TenantContext';
import { usePOSSettings } from '@/hooks/usePOSSettings';
import { useTitle } from '@/hooks/useTitle';
import { 
  Store, 
  Phone, 
  Mail, 
  MapPin, 
  Globe, 
  Image as ImageIcon,
  Upload,
  Loader2,
  Save,
  Building2,
  FileText,
  CreditCard,
  BarChart3,
  Hash,
  Briefcase,
  AlertCircle
} from 'lucide-react';
import POSPureLayout from '@/components/pos-layout/POSPureLayout';
import { Alert, AlertDescription } from '@/components/ui/alert';

const StoreBusinessSettings: React.FC = () => {
  const { toast } = useToast();
  const { currentOrganization, isOrgAdmin } = useTenant();
  
  useTitle('إعدادات المحل - نقطة البيع');
  
  const {
    settings,
    isLoading,
    error,
    updateSettings,
    saveSettings,
    isSaving,
    saveSuccess,
    hasPermission
  } = usePOSSettings({ organizationId: currentOrganization?.id || '' });

  const [localLogo, setLocalLogo] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (settings?.store_logo_url) {
      setLocalLogo(settings.store_logo_url);
    }
  }, [settings?.store_logo_url]);

  const handleLogoUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: 'حجم الملف كبير',
          description: 'يجب أن يكون حجم الشعار أقل من 2 ميجابايت',
          variant: 'destructive',
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          const logoUrl = e.target.result as string;
          setLocalLogo(logoUrl);
          updateSettings({ store_logo_url: logoUrl });
          setHasUnsavedChanges(true);
        }
      };
      reader.readAsDataURL(file);
    }
  }, [updateSettings, toast]);

  const handleRemoveLogo = useCallback(() => {
    setLocalLogo(null);
    updateSettings({ store_logo_url: '' });
    setHasUnsavedChanges(true);
  }, [updateSettings]);

  const handleFieldChange = useCallback((field: string, value: string) => {
    updateSettings({ [field]: value });
    setHasUnsavedChanges(true);
  }, [updateSettings]);

  const handleSave = useCallback(async () => {
    try {
      await saveSettings();
      setHasUnsavedChanges(false);
      toast({
        title: 'تم الحفظ بنجاح',
        description: 'تم حفظ إعدادات المحل بنجاح',
      });
    } catch (err) {
      toast({
        title: 'خطأ في الحفظ',
        description: 'حدث خطأ أثناء حفظ الإعدادات',
        variant: 'destructive',
      });
    }
  }, [saveSettings, toast]);

  if (isLoading) {
    return (
      <POSPureLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">جاري تحميل الإعدادات...</p>
          </div>
        </div>
      </POSPureLayout>
    );
  }

  // السماح لمديري المؤسسة بالوصول دائماً
  const canAccess = isOrgAdmin || hasPermission();
  
  if (!canAccess || (error && error.includes('صلاحية'))) {
    return (
      <POSPureLayout>
        <Alert variant="destructive" className="max-w-2xl mx-auto mt-8">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            ليس لديك الصلاحية للوصول إلى إعدادات المحل. يرجى التواصل مع مدير النظام.
          </AlertDescription>
        </Alert>
      </POSPureLayout>
    );
  }

  return (
    <POSPureLayout>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* عنوان الصفحة */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            إعدادات المحل
          </h1>
          <p className="text-muted-foreground mt-2">
            إدارة معلومات المحل والبيانات التجارية التي تظهر في الفواتير والوصولات
          </p>
        </div>

        {/* زر الحفظ العائم */}
        {hasUnsavedChanges && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              size="lg"
              className="shadow-lg bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 ml-2" />
                  حفظ التغييرات
                </>
              )}
            </Button>
          </div>
        )}

        {/* معلومات المحل الأساسية */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              معلومات المحل
            </CardTitle>
            <CardDescription>
              البيانات الأساسية للمحل التي تظهر في الفواتير والوصولات
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="store_name" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  اسم المؤسسة *
                </Label>
                <Input
                  id="store_name"
                  value={settings?.store_name || ''}
                  onChange={(e) => handleFieldChange('store_name', e.target.value)}
                  placeholder="أدخل اسم المؤسسة"
                  className="text-right"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="activity" className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  النشاط التجاري
                </Label>
                <Input
                  id="activity"
                  value={settings?.activity || ''}
                  onChange={(e) => handleFieldChange('activity', e.target.value)}
                  placeholder="مثال: تجارة التجزئة"
                  className="text-right"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="store_address" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                العنوان الكامل
              </Label>
              <Textarea
                id="store_address"
                value={settings?.store_address || ''}
                onChange={(e) => handleFieldChange('store_address', e.target.value)}
                placeholder="أدخل العنوان الكامل للمحل"
                className="text-right min-h-[80px] resize-none"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="store_phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  رقم الهاتف
                </Label>
                <Input
                  id="store_phone"
                  value={settings?.store_phone || ''}
                  onChange={(e) => handleFieldChange('store_phone', e.target.value)}
                  placeholder="0555 12 34 56"
                  className="text-right"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="store_email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  البريد الإلكتروني
                </Label>
                <Input
                  id="store_email"
                  type="email"
                  value={settings?.store_email || ''}
                  onChange={(e) => handleFieldChange('store_email', e.target.value)}
                  placeholder="store@example.com"
                  className="text-right"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="store_website" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                الموقع الإلكتروني
              </Label>
              <Input
                id="store_website"
                value={settings?.store_website || ''}
                onChange={(e) => handleFieldChange('store_website', e.target.value)}
                placeholder="https://example.com"
                className="text-right"
                dir="ltr"
              />
            </div>
          </CardContent>
        </Card>

        {/* شعار المحل */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              شعار المحل
            </CardTitle>
            <CardDescription>
              الشعار الذي يظهر في الفواتير والوصولات
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <div className="w-32 h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center overflow-hidden bg-muted/30">
                {localLogo ? (
                  <img 
                    src={localLogo} 
                    alt="شعار المحل" 
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  <ImageIcon className="h-12 w-12 text-muted-foreground" />
                )}
              </div>

              <div className="flex-1 space-y-3">
                <Label htmlFor="logo_upload" className="cursor-pointer">
                  <div className="flex items-center gap-2 p-3 border border-input rounded-md hover:bg-accent/50 transition-colors w-fit">
                    <Upload className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {localLogo ? 'تغيير الشعار' : 'رفع شعار'}
                    </span>
                  </div>
                </Label>
                <input
                  id="logo_upload"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <p className="text-xs text-muted-foreground">
                  يُفضل صورة بأبعاد مربعة (PNG، JPG) بحجم أقصى 2MB
                </p>
                {localLogo && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveLogo}
                    className="text-destructive hover:text-destructive"
                  >
                    إزالة الشعار
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* المعلومات التجارية والضريبية */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              المعلومات التجارية والضريبية
            </CardTitle>
            <CardDescription>
              الأرقام والمعلومات الرسمية المطلوبة في الفواتير
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rc" className="flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  رقم السجل التجاري (RC)
                </Label>
                <Input
                  id="rc"
                  value={settings?.rc || ''}
                  onChange={(e) => handleFieldChange('rc', e.target.value)}
                  placeholder="00/00-0000000B00"
                  className="text-right"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nif" className="flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  رقم التعريف الجبائي (NIF)
                </Label>
                <Input
                  id="nif"
                  value={settings?.nif || ''}
                  onChange={(e) => handleFieldChange('nif', e.target.value)}
                  placeholder="000000000000000"
                  className="text-right"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nis" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  رقم التعريف الإحصائي (NIS)
                </Label>
                <Input
                  id="nis"
                  value={settings?.nis || ''}
                  onChange={(e) => handleFieldChange('nis', e.target.value)}
                  placeholder="000000000000000"
                  className="text-right"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rib" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  الهوية البنكية (RIB)
                </Label>
                <Input
                  id="rib"
                  value={settings?.rib || ''}
                  onChange={(e) => handleFieldChange('rib', e.target.value)}
                  placeholder="00000000000000000000"
                  className="text-right"
                  dir="ltr"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* زر الحفظ الثابت في الأسفل */}
        <div className="flex justify-end pt-4">
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
            size="lg"
            className="min-w-[200px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 ml-2" />
                حفظ الإعدادات
              </>
            )}
          </Button>
        </div>
      </div>
    </POSPureLayout>
  );
};

export default StoreBusinessSettings;
