import React, { useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { 
  Image, 
  Loader2, 
  Trash2, 
  Upload, 
  Globe, 
  Store, 
  Users, 
  Shield,
  Info
} from 'lucide-react';
import { OrganizationSettings } from '@/types/settings';
import { useFileUpload } from '@/hooks/useFileUpload';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// قائمة اللغات المدعومة
const supportedLanguages = [
  { code: 'ar', name: 'العربية', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' }
];

interface BasicStoreSettingsProps {
  settings: OrganizationSettings;
  updateSetting: (key: keyof OrganizationSettings, value: any) => void;
  currentOrganization: any;
}

const BasicStoreSettings = ({ settings, updateSetting, currentOrganization }: BasicStoreSettingsProps) => {
  const { toast } = useToast();
  
  // مراجع نماذج الملفات
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const faviconFileInputRef = useRef<HTMLInputElement>(null);

  // استخدام هوك تحميل الملفات للشعار
  const { 
    isUploading: logoUploading, 
    handleInputChange: handleLogoUpload 
  } = useFileUpload({
    uploadPath: `organizations/${currentOrganization?.id}/logo`,
    onSuccess: (url) => updateSetting('logo_url', url),
    onError: (error) => console.error('فشل في رفع الشعار:', error)
  });

  // استخدام هوك تحميل الملفات للأيقونة
  const { 
    isUploading: faviconUploading, 
    handleInputChange: handleFaviconUpload 
  } = useFileUpload({
    uploadPath: `organizations/${currentOrganization?.id}/favicon`,
    onSuccess: (url) => updateSetting('favicon_url', url),
    onError: (error) => console.error('فشل في رفع الأيقونة:', error)
  });

  // حذف الشعار
  const handleDeleteLogo = () => {
    updateSetting('logo_url', null);
    toast({
      title: 'تم الحذف',
      description: 'تم حذف الشعار بنجاح',
    });
  };

  // حذف الأيقونة
  const handleDeleteFavicon = () => {
    updateSetting('favicon_url', null);
    toast({
      title: 'تم الحذف',
      description: 'تم حذف الأيقونة بنجاح',
    });
  };

  // الحصول على معلومات اللغة الحالية
  const currentLanguage = supportedLanguages.find(lang => lang.code === settings.default_language) || supportedLanguages[0];

  return (
    <div className="space-y-8">
      {/* معلومات المتجر الأساسية */}
      <Card className="border-2 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
          <CardTitle className="flex items-center gap-3 text-xl">
            <Store className="h-6 w-6 text-primary" />
            معلومات المتجر الأساسية
          </CardTitle>
          <CardDescription className="text-base">
            المعلومات الأساسية التي ستظهر للزوار في المتجر الإلكتروني والمتصفح
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* اسم المتجر */}
          <div className="space-y-3">
            <Label htmlFor="site_name" className="text-base font-medium flex items-center gap-2">
              <Store className="h-4 w-4" />
              اسم المتجر
            </Label>
            <Input 
              id="site_name" 
              value={settings.site_name || ''} 
              onChange={(e) => updateSetting('site_name', e.target.value)}
              placeholder="مثال: متجر الإلكترونيات المتميز"
              className="h-12 text-lg"
            />
            <p className="text-sm text-muted-foreground">
              سيظهر هذا الاسم في عنوان المتصفح وكعنوان رئيسي للمتجر
            </p>
          </div>

          {/* اللغة الافتراضية */}
          <div className="space-y-3">
            <Label className="text-base font-medium flex items-center gap-2">
              <Globe className="h-4 w-4" />
              اللغة الافتراضية للمتجر
            </Label>
            <div className="flex flex-col gap-3">
              <Select 
                value={settings.default_language || 'ar'} 
                onValueChange={(value) => updateSetting('default_language', value)}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="اختر اللغة الافتراضية">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{currentLanguage.flag}</span>
                      <span className="text-lg">{currentLanguage.nativeName}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {supportedLanguages.map((language) => (
                    <SelectItem key={language.code} value={language.code}>
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{language.flag}</span>
                        <div className="flex flex-col">
                          <span className="font-medium">{language.nativeName}</span>
                          <span className="text-xs text-muted-foreground">{language.name}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                ستكون هذه هي اللغة التي يراها الزوار عند دخولهم المتجر لأول مرة
              </p>
            </div>
          </div>

          {/* عرض النص مع الشعار */}
          <div className="flex items-center space-x-3 space-x-reverse bg-muted/30 rounded-lg p-4">
            <Switch 
              id="display_text_with_logo"
              checked={settings.display_text_with_logo}
              onCheckedChange={(checked) => updateSetting('display_text_with_logo', checked)}
            />
            <div className="flex-1">
              <Label htmlFor="display_text_with_logo" className="font-medium cursor-pointer">
                عرض اسم المتجر مع الشعار
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                إذا كان مفعلاً، سيظهر اسم المتجر بجانب الشعار في الرأس
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* الشعار والأيقونة */}
      <Card className="border-2 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30">
          <CardTitle className="flex items-center gap-3 text-xl">
            <Image className="h-6 w-6 text-primary" />
            الشعار والأيقونة
          </CardTitle>
          <CardDescription className="text-base">
            قم برفع شعار المتجر وأيقونة المتصفح لتعزيز هوية علامتك التجارية
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 pt-6">
          {/* رفع الشعار */}
          <div className="space-y-4">
            <Label className="text-base font-medium">شعار المتجر</Label>
            <div className="flex flex-col gap-4">
              {settings.logo_url ? (
                <div className="relative w-full border-2 border-dashed border-muted-foreground/20 rounded-xl overflow-hidden bg-gradient-to-br from-background to-muted/20">
                  <div className="aspect-video md:aspect-[4/1] flex items-center justify-center py-8">
                    <img 
                      src={settings.logo_url} 
                      alt="شعار المتجر" 
                      className="max-h-40 object-contain drop-shadow-lg"
                    />
                  </div>
                  <div className="absolute top-3 left-3 flex gap-2">
                    <Button 
                      variant="destructive" 
                      size="icon" 
                      className="w-10 h-10 rounded-full shadow-lg hover:scale-105 transition-transform"
                      onClick={handleDeleteLogo}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div 
                  className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-12 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-muted/10 to-muted/30 hover:from-muted/20 hover:to-muted/40 transition-all cursor-pointer group" 
                  onClick={() => logoFileInputRef.current?.click()}
                >
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Image className="h-10 w-10 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-lg">قم برفع شعار المتجر</p>
                    <p className="text-muted-foreground mt-2">
                      يفضل صيغة PNG أو SVG بخلفية شفافة • الحد الأقصى 5MB
                    </p>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  className="flex gap-2 items-center h-12"
                  onClick={() => logoFileInputRef.current?.click()}
                  disabled={logoUploading}
                >
                  {logoUploading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> جاري الرفع...</>
                  ) : (
                    <><Upload className="h-4 w-4" /> رفع شعار جديد</>
                  )}
                </Button>
                
                <Input 
                  id="logo_url" 
                  value={settings.logo_url || ''} 
                  onChange={(e) => updateSetting('logo_url', e.target.value)}
                  placeholder="أو أدخل رابط الشعار (https://...)"
                  className="h-12"
                />
                
                <input 
                  type="file" 
                  ref={logoFileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleLogoUpload}
                />
              </div>
            </div>
          </div>
          
          {/* رفع أيقونة المتصفح */}
          <div className="space-y-4 pt-4 border-t">
            <Label className="text-base font-medium">أيقونة المتصفح (Favicon)</Label>
            <div className="flex flex-col gap-4">
              {settings.favicon_url ? (
                <div className="relative border-2 border-dashed border-muted-foreground/20 rounded-xl overflow-hidden bg-gradient-to-br from-background to-muted/20">
                  <div className="py-8 flex items-center justify-center">
                    <div className="aspect-square w-24 h-24 flex items-center justify-center bg-white dark:bg-gray-800 rounded-xl shadow-lg">
                      <img 
                        src={settings.favicon_url} 
                        alt="أيقونة المتصفح" 
                        className="max-h-20 max-w-20 object-contain"
                      />
                    </div>
                  </div>
                  <div className="absolute top-3 left-3 flex gap-2">
                    <Button 
                      variant="destructive" 
                      size="icon" 
                      className="w-10 h-10 rounded-full shadow-lg hover:scale-105 transition-transform"
                      onClick={handleDeleteFavicon}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div 
                  className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-8 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-muted/10 to-muted/30 hover:from-muted/20 hover:to-muted/40 transition-all cursor-pointer group" 
                  onClick={() => faviconFileInputRef.current?.click()}
                >
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Image className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold">قم برفع أيقونة المتصفح</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      يفضل صيغة ICO أو PNG بحجم 32×32 أو 16×16 بكسل
                    </p>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  className="flex gap-2 items-center h-12"
                  onClick={() => faviconFileInputRef.current?.click()}
                  disabled={faviconUploading}
                >
                  {faviconUploading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> جاري الرفع...</>
                  ) : (
                    <><Upload className="h-4 w-4" /> رفع أيقونة جديدة</>
                  )}
                </Button>
                
                <Input 
                  id="favicon_url" 
                  value={settings.favicon_url || ''} 
                  onChange={(e) => updateSetting('favicon_url', e.target.value)}
                  placeholder="أو أدخل رابط الأيقونة (https://...)"
                  className="h-12"
                />
                
                <input 
                  type="file" 
                  ref={faviconFileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFaviconUpload}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* إعدادات الوصول والخصوصية */}
      <Card className="border-2 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
          <CardTitle className="flex items-center gap-3 text-xl">
            <Shield className="h-6 w-6 text-primary" />
            إعدادات الوصول والخصوصية
          </CardTitle>
          <CardDescription className="text-base">
            تحكم في من يمكنه الوصول إلى متجرك والتسجيل فيه
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* تفعيل التسجيل */}
          <div className="flex items-start space-x-3 space-x-reverse bg-muted/30 rounded-lg p-4">
            <Switch 
              id="enable_registration"
              checked={settings.enable_registration}
              onCheckedChange={(checked) => updateSetting('enable_registration', checked)}
            />
            <div className="flex-1">
              <Label htmlFor="enable_registration" className="font-medium cursor-pointer flex items-center gap-2">
                <Users className="h-4 w-4" />
                السماح بالتسجيل الجديد
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                إذا كان مفعلاً، سيتمكن المستخدمون الجدد من إنشاء حسابات في متجرك
              </p>
            </div>
          </div>

          {/* تفعيل الموقع العام */}
          <div className="flex items-start space-x-3 space-x-reverse bg-muted/30 rounded-lg p-4">
            <Switch 
              id="enable_public_site"
              checked={settings.enable_public_site}
              onCheckedChange={(checked) => updateSetting('enable_public_site', checked)}
            />
            <div className="flex-1">
              <Label htmlFor="enable_public_site" className="font-medium cursor-pointer flex items-center gap-2">
                <Globe className="h-4 w-4" />
                تفعيل الموقع العام
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                إذا كان مفعلاً، سيكون متجرك مرئياً للجمهور بدون الحاجة لتسجيل الدخول
              </p>
            </div>
          </div>

          {/* معلومات إضافية */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  ملاحظة مهمة حول الإعدادات
                </p>
                <p className="text-blue-800 dark:text-blue-200">
                  تأكد من مراجعة هذه الإعدادات بعناية قبل تشغيل متجرك، حيث أنها تؤثر على تجربة المستخدمين وإمكانية الوصول إلى المحتوى.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BasicStoreSettings;
