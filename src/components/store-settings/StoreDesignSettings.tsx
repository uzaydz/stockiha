import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { 
  Palette, 
  Monitor, 
  Sun, 
  Moon, 
  Sparkles,
  ExternalLink,
  Code,
  Eye,
  Brush,
  Zap,
  Facebook,
  Instagram,
  Twitter,
  Youtube
} from 'lucide-react';
import { OrganizationSettings } from '@/types/settings';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

// أنواع بكسل التتبع
interface TrackingPixels {
  facebook: { enabled: boolean; pixelId: string };
  tiktok: { enabled: boolean; pixelId: string };
  snapchat: { enabled: boolean; pixelId: string };
  google: { enabled: boolean; pixelId: string };
}

interface StoreDesignSettingsProps {
  settings: OrganizationSettings;
  updateSetting: (key: keyof OrganizationSettings, value: any) => void;
  trackingPixels: TrackingPixels;
  updateTrackingPixel: (platform: keyof TrackingPixels, field: string, value: any) => void;
}

// ألوان محددة مسبقاً
const presetColors = [
  { name: 'الأزرق الكلاسيكي', primary: '#3B82F6', secondary: '#10B981' },
  { name: 'الأرجواني الأنيق', primary: '#8B5CF6', secondary: '#EC4899' },
  { name: 'الأخضر الطبيعي', primary: '#10B981', secondary: '#F59E0B' },
  { name: 'الأحمر الجذاب', primary: '#EF4444', secondary: '#8B5CF6' },
  { name: 'البرتقالي الدافئ', primary: '#F59E0B', secondary: '#EF4444' },
  { name: 'الوردي العصري', primary: '#EC4899', secondary: '#8B5CF6' }
];

const StoreDesignSettings = ({ 
  settings, 
  updateSetting, 
  trackingPixels, 
  updateTrackingPixel 
}: StoreDesignSettingsProps) => {
  const { toast } = useToast();
  const [previewMode, setPreviewMode] = useState(false);

  // تطبيق مجموعة ألوان محددة مسبقاً
  const applyColorPreset = (preset: typeof presetColors[0]) => {
    updateSetting('theme_primary_color', preset.primary);
    updateSetting('theme_secondary_color', preset.secondary);
    
    toast({
      title: 'تم تطبيق الألوان',
      description: `تم تطبيق مجموعة ألوان "${preset.name}" بنجاح`,
    });
  };

  // فتح محرر المتجر المتطور
  const openAdvancedEditor = () => {
    // هنا يمكن إضافة رابط لمحرر المتجر المتطور
    window.open('/store-editor', '_blank');
  };

  return (
    <div className="space-y-8">
      {/* الألوان والثيم */}
      <Card className="border-2 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30">
          <CardTitle className="flex items-center gap-3 text-xl">
            <Palette className="h-6 w-6 text-primary" />
            الألوان والثيم
          </CardTitle>
          <CardDescription className="text-base">
            اختر الألوان الأساسية ووضع العرض لمتجرك
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* مجموعات الألوان المحددة مسبقاً */}
          <div className="space-y-4">
            <Label className="text-base font-medium">مجموعات ألوان جاهزة</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {presetColors.map((preset, index) => (
                <div
                  key={index}
                  className="relative p-4 border-2 rounded-lg cursor-pointer hover:border-primary/50 transition-colors group"
                  onClick={() => applyColorPreset(preset)}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex gap-1">
                      <div 
                        className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: preset.primary }}
                      ></div>
                      <div 
                        className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: preset.secondary }}
                      ></div>
                    </div>
                    <span className="font-medium text-sm">{preset.name}</span>
                  </div>
                  <div className="absolute inset-0 bg-primary/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button size="sm" variant="secondary">
                      تطبيق
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* الألوان المخصصة */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
            <div className="space-y-3">
              <Label htmlFor="primary_color" className="text-base font-medium">
                اللون الأساسي
              </Label>
              <div className="flex gap-3">
                <Input
                  id="primary_color"
                  type="color"
                  value={settings.theme_primary_color || '#3B82F6'}
                  onChange={(e) => updateSetting('theme_primary_color', e.target.value)}
                  className="w-16 h-12 p-1 border-2"
                />
                <Input
                  value={settings.theme_primary_color || '#3B82F6'}
                  onChange={(e) => updateSetting('theme_primary_color', e.target.value)}
                  placeholder="#3B82F6"
                  className="flex-1 h-12"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="secondary_color" className="text-base font-medium">
                اللون الثانوي
              </Label>
              <div className="flex gap-3">
                <Input
                  id="secondary_color"
                  type="color"
                  value={settings.theme_secondary_color || '#10B981'}
                  onChange={(e) => updateSetting('theme_secondary_color', e.target.value)}
                  className="w-16 h-12 p-1 border-2"
                />
                <Input
                  value={settings.theme_secondary_color || '#10B981'}
                  onChange={(e) => updateSetting('theme_secondary_color', e.target.value)}
                  placeholder="#10B981"
                  className="flex-1 h-12"
                />
              </div>
            </div>
          </div>

          {/* وضع الثيم */}
          <div className="space-y-3">
            <Label className="text-base font-medium">وضع العرض</Label>
            <Select 
              value={settings.theme_mode || 'light'} 
              onValueChange={(value) => updateSetting('theme_mode', value)}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder="اختر وضع العرض">
                  <div className="flex items-center gap-3">
                    {settings.theme_mode === 'dark' ? (
                      <><Moon className="h-4 w-4" /> الوضع المظلم</>
                    ) : settings.theme_mode === 'auto' ? (
                      <><Monitor className="h-4 w-4" /> تلقائي</>
                    ) : (
                      <><Sun className="h-4 w-4" /> الوضع الفاتح</>
                    )}
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center gap-3">
                    <Sun className="h-4 w-4" />
                    <span>الوضع الفاتح</span>
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center gap-3">
                    <Moon className="h-4 w-4" />
                    <span>الوضع المظلم</span>
                  </div>
                </SelectItem>
                <SelectItem value="auto">
                  <div className="flex items-center gap-3">
                    <Monitor className="h-4 w-4" />
                    <span>تلقائي (حسب النظام)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* محرر المتجر المتطور */}
      <Card className="border-2 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30">
          <CardTitle className="flex items-center gap-3 text-xl">
            <Brush className="h-6 w-6 text-primary" />
            محرر المتجر المتطور
          </CardTitle>
          <CardDescription className="text-base">
            استخدم المحرر المتطور لتخصيص تصميم متجرك بشكل كامل
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/50 dark:to-indigo-950/50 rounded-xl p-8 text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-3">محرر التصميم الاحترافي</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              قم بتخصيص كل تفصيل في متجرك باستخدام محرر السحب والإفلات المتطور، مع إمكانيات لا محدودة للتخصيص
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={openAdvancedEditor}
                size="lg"
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-5 w-5" />
                فتح المحرر المتطور
              </Button>
              <Button 
                variant="outline"
                size="lg"
                className="flex items-center gap-2"
                onClick={() => setPreviewMode(!previewMode)}
              >
                <Eye className="h-5 w-5" />
                معاينة المتجر
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CSS مخصص */}
      <Card className="border-2 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
          <CardTitle className="flex items-center gap-3 text-xl">
            <Code className="h-6 w-6 text-primary" />
            كود CSS مخصص
          </CardTitle>
          <CardDescription className="text-base">
            أضف كود CSS مخصص لتخصيص مظهر متجرك بشكل أكثر تفصيلاً
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <Textarea
              value={settings.custom_css || ''}
              onChange={(e) => updateSetting('custom_css', e.target.value)}
              placeholder="/* أدخل كود CSS المخصص هنا */
.my-custom-class {
  background-color: #f3f4f6;
  padding: 1rem;
  border-radius: 0.5rem;
}"
              className="min-h-[200px] font-mono text-sm"
              dir="ltr"
            />
            <p className="text-sm text-muted-foreground">
              ⚠️ تأكد من صحة كود CSS قبل الحفظ لتجنب مشاكل في التصميم
            </p>
          </div>
        </CardContent>
      </Card>

      {/* بكسل التتبع */}
      <Card className="border-2 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30">
          <CardTitle className="flex items-center gap-3 text-xl">
            <Zap className="h-6 w-6 text-primary" />
            بكسل التتبع والتحليلات
          </CardTitle>
          <CardDescription className="text-base">
            أضف أكواد التتبع لمنصات التواصل الاجتماعي والتحليلات
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Facebook Pixel */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Facebook className="h-5 w-5 text-blue-600" />
              <Label className="text-base font-medium">Facebook Pixel</Label>
            </div>
            <div className="flex items-center space-x-3 space-x-reverse">
              <Switch
                checked={trackingPixels.facebook.enabled}
                onCheckedChange={(checked) => updateTrackingPixel('facebook', 'enabled', checked)}
              />
              <div className="flex-1">
                <Input
                  value={trackingPixels.facebook.pixelId}
                  onChange={(e) => updateTrackingPixel('facebook', 'pixelId', e.target.value)}
                  placeholder="معرف بكسل Facebook"
                  disabled={!trackingPixels.facebook.enabled}
                  className="h-11"
                />
              </div>
            </div>
          </div>

          {/* Google Analytics */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-gradient-to-r from-blue-500 to-green-500 rounded-full"></div>
              <Label className="text-base font-medium">Google Analytics</Label>
            </div>
            <div className="flex items-center space-x-3 space-x-reverse">
              <Switch
                checked={trackingPixels.google.enabled}
                onCheckedChange={(checked) => updateTrackingPixel('google', 'enabled', checked)}
              />
              <div className="flex-1">
                <Input
                  value={trackingPixels.google.pixelId}
                  onChange={(e) => updateTrackingPixel('google', 'pixelId', e.target.value)}
                  placeholder="معرف Google Analytics (GA4)"
                  disabled={!trackingPixels.google.enabled}
                  className="h-11"
                />
              </div>
            </div>
          </div>

          {/* TikTok Pixel */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-full"></div>
              </div>
              <Label className="text-base font-medium">TikTok Pixel</Label>
            </div>
            <div className="flex items-center space-x-3 space-x-reverse">
              <Switch
                checked={trackingPixels.tiktok.enabled}
                onCheckedChange={(checked) => updateTrackingPixel('tiktok', 'enabled', checked)}
              />
              <div className="flex-1">
                <Input
                  value={trackingPixels.tiktok.pixelId}
                  onChange={(e) => updateTrackingPixel('tiktok', 'pixelId', e.target.value)}
                  placeholder="معرف بكسل TikTok"
                  disabled={!trackingPixels.tiktok.enabled}
                  className="h-11"
                />
              </div>
            </div>
          </div>

          {/* Snapchat Pixel */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-yellow-400 rounded-full"></div>
              <Label className="text-base font-medium">Snapchat Pixel</Label>
            </div>
            <div className="flex items-center space-x-3 space-x-reverse">
              <Switch
                checked={trackingPixels.snapchat.enabled}
                onCheckedChange={(checked) => updateTrackingPixel('snapchat', 'enabled', checked)}
              />
              <div className="flex-1">
                <Input
                  value={trackingPixels.snapchat.pixelId}
                  onChange={(e) => updateTrackingPixel('snapchat', 'pixelId', e.target.value)}
                  placeholder="معرف بكسل Snapchat"
                  disabled={!trackingPixels.snapchat.enabled}
                  className="h-11"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StoreDesignSettings;
