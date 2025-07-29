import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Globe, Search, Facebook, Twitter } from 'lucide-react';
import { seoService, SEOSettings } from '@/api/seoService';

export function GeneralSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SEOSettings>({
    site_title: '',
    site_description: '',
    site_keywords: [],
    default_og_image: '',
    google_analytics_id: '',
    google_search_console_key: '',
    facebook_pixel_id: '',
    twitter_handle: '',
    enable_sitemap: true,
    enable_robots_txt: true
  });
  const [keywordInput, setKeywordInput] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await seoService.getSettings();
      if (data) {
        setSettings(data as SEOSettings);
      }
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await seoService.updateSettings(settings);
      toast({
        title: 'تم الحفظ',
        description: 'تم حفظ إعدادات SEO بنجاح'
      });
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddKeyword = () => {
    if (keywordInput.trim()) {
      setSettings({
        ...settings,
        site_keywords: [...(settings.site_keywords || []), keywordInput.trim()]
      });
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (index: number) => {
    const keywords = [...(settings.site_keywords || [])];
    keywords.splice(index, 1);
    setSettings({ ...settings, site_keywords: keywords });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            الإعدادات العامة
          </CardTitle>
          <CardDescription>
            إعدادات SEO الأساسية للموقع
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="site_title">عنوان الموقع</Label>
            <Input
              id="site_title"
              value={settings.site_title}
              onChange={(e) => setSettings({ ...settings, site_title: e.target.value })}
              placeholder="موقع التراث الثقافي الجزائري"
              dir="rtl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="site_description">وصف الموقع</Label>
            <Textarea
              id="site_description"
              value={settings.site_description || ''}
              onChange={(e) => setSettings({ ...settings, site_description: e.target.value })}
              placeholder="وصف مختصر للموقع يظهر في نتائج البحث"
              rows={3}
              dir="rtl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="keywords">الكلمات المفتاحية</Label>
            <div className="flex gap-2">
              <Input
                id="keywords"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddKeyword())}
                placeholder="أضف كلمة مفتاحية"
                dir="rtl"
              />
              <Button onClick={handleAddKeyword} size="sm">
                إضافة
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {settings.site_keywords?.map((keyword, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => handleRemoveKeyword(index)}
                >
                  {keyword} ×
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="og_image">صورة Open Graph الافتراضية</Label>
            <Input
              id="og_image"
              type="url"
              value={settings.default_og_image || ''}
              onChange={(e) => setSettings({ ...settings, default_og_image: e.target.value })}
              placeholder="https://example.com/og-image.jpg"
              dir="ltr"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            أدوات التحليل
          </CardTitle>
          <CardDescription>
            ربط أدوات التحليل والتتبع
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ga_id">Google Analytics ID</Label>
            <Input
              id="ga_id"
              value={settings.google_analytics_id || ''}
              onChange={(e) => setSettings({ ...settings, google_analytics_id: e.target.value })}
              placeholder="G-XXXXXXXXXX"
              dir="ltr"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gsc_key">Google Search Console Key</Label>
            <Input
              id="gsc_key"
              value={settings.google_search_console_key || ''}
              onChange={(e) => setSettings({ ...settings, google_search_console_key: e.target.value })}
              placeholder="google-site-verification"
              dir="ltr"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fb_pixel">
              <Facebook className="inline h-4 w-4 mr-1" />
              Facebook Pixel ID
            </Label>
            <Input
              id="fb_pixel"
              value={settings.facebook_pixel_id || ''}
              onChange={(e) => setSettings({ ...settings, facebook_pixel_id: e.target.value })}
              placeholder="1234567890"
              dir="ltr"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="twitter">
              <Twitter className="inline h-4 w-4 mr-1" />
              Twitter Handle
            </Label>
            <Input
              id="twitter"
              value={settings.twitter_handle || ''}
              onChange={(e) => setSettings({ ...settings, twitter_handle: e.target.value })}
              placeholder="@username"
              dir="ltr"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>خيارات متقدمة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>تفعيل Sitemap</Label>
              <p className="text-sm text-muted-foreground">
                إنشاء ملف sitemap.xml تلقائياً
              </p>
            </div>
            <Switch
              checked={settings.enable_sitemap}
              onCheckedChange={(checked) => setSettings({ ...settings, enable_sitemap: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>تفعيل robots.txt</Label>
              <p className="text-sm text-muted-foreground">
                إنشاء ملف robots.txt تلقائياً
              </p>
            </div>
            <Switch
              checked={settings.enable_robots_txt}
              onCheckedChange={(checked) => setSettings({ ...settings, enable_robots_txt: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin ml-2" />
          ) : (
            <Save className="h-4 w-4 ml-2" />
          )}
          حفظ التغييرات
        </Button>
      </div>
    </div>
  );
}
