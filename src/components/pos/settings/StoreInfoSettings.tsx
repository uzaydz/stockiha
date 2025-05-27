import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Store, Phone, Mail, MapPin, Globe, Image } from 'lucide-react';
import { POSSettings } from '@/types/posSettings';

interface StoreInfoSettingsProps {
  settings: POSSettings | null;
  updateSetting: <K extends keyof POSSettings>(key: K, value: POSSettings[K]) => void;
}

const StoreInfoSettings: React.FC<StoreInfoSettingsProps> = ({ settings, updateSetting }) => {
  if (!settings) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">جاري تحميل الإعدادات...</p>
      </div>
    );
  }

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // هنا يمكن إضافة منطق رفع الشعار إلى التخزين السحابي
      // مؤقتاً سنستخدم URL وهمي
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          updateSetting('store_logo_url', e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* معلومات المتجر الأساسية */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Store className="h-5 w-5" />
            معلومات المتجر
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* اسم المتجر */}
          <div className="space-y-2">
            <Label htmlFor="store_name" className="text-sm font-medium">
              اسم المتجر *
            </Label>
            <Input
              id="store_name"
              value={settings.store_name}
              onChange={(e) => updateSetting('store_name', e.target.value)}
              placeholder="أدخل اسم المتجر"
              className="text-right"
            />
          </div>

          {/* رقم الهاتف */}
          <div className="space-y-2">
            <Label htmlFor="store_phone" className="text-sm font-medium flex items-center gap-2">
              <Phone className="h-4 w-4" />
              رقم الهاتف
            </Label>
            <Input
              id="store_phone"
              value={settings.store_phone || ''}
              onChange={(e) => updateSetting('store_phone', e.target.value)}
              placeholder="أدخل رقم الهاتف"
              className="text-right"
              dir="ltr"
            />
          </div>

          {/* البريد الإلكتروني */}
          <div className="space-y-2">
            <Label htmlFor="store_email" className="text-sm font-medium flex items-center gap-2">
              <Mail className="h-4 w-4" />
              البريد الإلكتروني
            </Label>
            <Input
              id="store_email"
              type="email"
              value={settings.store_email || ''}
              onChange={(e) => updateSetting('store_email', e.target.value)}
              placeholder="أدخل البريد الإلكتروني"
              className="text-right"
              dir="ltr"
            />
          </div>

          {/* الموقع الإلكتروني */}
          <div className="space-y-2">
            <Label htmlFor="store_website" className="text-sm font-medium flex items-center gap-2">
              <Globe className="h-4 w-4" />
              الموقع الإلكتروني
            </Label>
            <Input
              id="store_website"
              value={settings.store_website || ''}
              onChange={(e) => updateSetting('store_website', e.target.value)}
              placeholder="https://example.com"
              className="text-right"
              dir="ltr"
            />
          </div>

          {/* العنوان */}
          <div className="space-y-2">
            <Label htmlFor="store_address" className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              العنوان
            </Label>
            <Textarea
              id="store_address"
              value={settings.store_address || ''}
              onChange={(e) => updateSetting('store_address', e.target.value)}
              placeholder="أدخل عنوان المتجر"
              className="text-right min-h-[80px] resize-none"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* شعار المتجر */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Image className="h-5 w-5" />
            شعار المتجر
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {/* معاينة الشعار */}
            <div className="w-20 h-20 border-2 border-dashed border-border rounded-lg flex items-center justify-center overflow-hidden">
              {settings.store_logo_url ? (
                <img 
                  src={settings.store_logo_url} 
                  alt="شعار المتجر" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <Image className="h-8 w-8 text-muted-foreground" />
              )}
            </div>

            {/* رفع الشعار */}
            <div className="flex-1">
              <Label htmlFor="logo_upload" className="cursor-pointer">
                <div className="flex items-center gap-2 p-3 border border-input rounded-md hover:bg-accent/50 transition-colors">
                  <Upload className="h-4 w-4" />
                  <span className="text-sm">
                    {settings.store_logo_url ? 'تغيير الشعار' : 'رفع شعار'}
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
              <p className="text-xs text-muted-foreground mt-2">
                يُفضل صورة بأبعاد مربعة (PNG، JPG) بحجم أقصى 2MB
              </p>
            </div>
          </div>

          {/* إزالة الشعار */}
          {settings.store_logo_url && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateSetting('store_logo_url', '')}
              className="text-destructive hover:text-destructive"
            >
              إزالة الشعار
            </Button>
          )}
        </CardContent>
      </Card>

      {/* معلومات تجارية إضافية */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            معلومات تجارية
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* رقم السجل التجاري */}
          <div className="space-y-2">
            <Label htmlFor="business_license" className="text-sm font-medium">
              رقم السجل التجاري
            </Label>
            <Input
              id="business_license"
              value={settings.business_license || ''}
              onChange={(e) => updateSetting('business_license', e.target.value)}
              placeholder="أدخل رقم السجل التجاري"
              className="text-right"
            />
          </div>

          {/* الرقم الضريبي */}
          <div className="space-y-2">
            <Label htmlFor="tax_number" className="text-sm font-medium">
              الرقم الضريبي
            </Label>
            <Input
              id="tax_number"
              value={settings.tax_number || ''}
              onChange={(e) => updateSetting('tax_number', e.target.value)}
              placeholder="أدخل الرقم الضريبي"
              className="text-right"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StoreInfoSettings;
