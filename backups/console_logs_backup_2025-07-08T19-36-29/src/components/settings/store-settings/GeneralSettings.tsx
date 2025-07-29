import React, { useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Image, Loader2, Trash2, Upload, Globe } from 'lucide-react';
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

interface GeneralSettingsProps {
  settings: OrganizationSettings;
  updateSetting: (key: keyof OrganizationSettings, value: any) => void;
  currentOrganization: any;
}

const GeneralSettings = ({ settings, updateSetting, currentOrganization }: GeneralSettingsProps) => {
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
    <div className="space-y-6">
      <Card className="border-2 shadow-sm">
        <CardHeader className="bg-muted/30">
          <CardTitle>معلومات المتجر الأساسية</CardTitle>
          <CardDescription>
            المعلومات الأساسية التي ستظهر للزوار في المتجر الإلكتروني
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-2">
            <Label htmlFor="site_name" className="text-base font-medium">اسم المتجر</Label>
            <Input 
              id="site_name" 
              value={settings.site_name || ''} 
              onChange={(e) => updateSetting('site_name', e.target.value)}
              placeholder="اسم المتجر الإلكتروني"
              className="h-11"
            />
          </div>

          {/* إعداد اللغة الافتراضية */}
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
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="اختر اللغة الافتراضية">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{currentLanguage.flag}</span>
                      <span>{currentLanguage.nativeName}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {supportedLanguages.map((language) => (
                    <SelectItem key={language.code} value={language.code}>
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{language.flag}</span>
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
          
          {/* رفع الشعار */}
          <div className="space-y-3">
            <Label className="text-base font-medium">شعار المتجر</Label>
            <div className="flex flex-col gap-3">
              {settings.logo_url ? (
                <div className="relative w-full border-2 rounded-lg overflow-hidden bg-background">
                  <div className="aspect-video md:aspect-[4/1] flex items-center justify-center py-4">
                    <img 
                      src={settings.logo_url} 
                      alt="شعار المتجر" 
                      className="max-h-32 object-contain"
                    />
                  </div>
                  <div className="absolute top-2 left-2 flex gap-2">
                    <Button 
                      variant="destructive" 
                      size="icon" 
                      className="w-8 h-8 rounded-full shadow-md"
                      onClick={handleDeleteLogo}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-3 bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => logoFileInputRef.current?.click()}>
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Image className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">قم برفع شعار المتجر</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      يفضل صيغة PNG أو SVG بخلفية شفافة
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex gap-2 items-center"
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
                  className="flex-1"
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
          <div className="space-y-3 pt-2">
            <Label className="text-base font-medium">أيقونة المتصفح (Favicon)</Label>
            <div className="flex flex-col gap-3">
              {settings.favicon_url ? (
                <div className="relative border-2 rounded-lg overflow-hidden bg-background">
                  <div className="py-4 flex items-center justify-center">
                    <div className="aspect-square w-20 h-20 flex items-center justify-center bg-muted/20 rounded-md">
                      <img 
                        src={settings.favicon_url} 
                        alt="أيقونة المتصفح" 
                        className="max-h-16 max-w-16 object-contain"
                      />
                    </div>
                  </div>
                  <div className="absolute top-2 left-2 flex gap-2">
                    <Button 
                      variant="destructive" 
                      size="icon" 
                      className="w-8 h-8 rounded-full shadow-md"
                      onClick={handleDeleteFavicon}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-3 bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => faviconFileInputRef.current?.click()}>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Image className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">قم برفع أيقونة المتصفح</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      يفضل صيغة ICO أو PNG بحجم 32×32 أو 16×16
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex gap-2 items-center"
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
                  className="flex-1"
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
          
          <div className="flex items-center space-x-2 space-x-reverse border rounded-lg p-4 mt-4 bg-muted/10">
            <Switch 
              id="display_text_with_logo"
              checked={settings.display_text_with_logo}
              onCheckedChange={(checked) => updateSetting('display_text_with_logo', checked)}
            />
            <Label htmlFor="display_text_with_logo" className="mr-2 font-medium">عرض اسم المتجر مع الشعار</Label>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GeneralSettings;
