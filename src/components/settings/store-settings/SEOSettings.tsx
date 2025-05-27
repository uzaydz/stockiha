import React, { useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Info, 
  Search, 
  Globe, 
  Key, 
  FileText, 
  Rss, 
  Share2,
  MapPin,
  UploadCloud,
  X,
  Loader2
} from 'lucide-react';
import { OrganizationSettings } from '@/types/settings';
import { useToast } from '@/components/ui/use-toast';
import { useSupabase } from '@/context/SupabaseContext';

// تعريف أنواع إعدادات SEO
interface SEOSettings {
  title: string;
  description: string;
  keywords: string;
  robots_txt: string;
  enable_sitemap: boolean;
  enable_canonical_urls: boolean;
  generate_meta_tags: boolean;
  enable_open_graph: boolean;
  enable_twitter_cards: boolean;
  enable_schema_markup: boolean;
  default_image_url: string;
  social_media: {
    twitter_handle: string;
    facebook_page: string;
    instagram_handle: string;
    linkedin_page: string;
    [key: string]: string;
  };
  structured_data: {
    business_type: string;
    business_name: string;
    business_logo: string;
    business_address: string;
    business_phone: string;
    [key: string]: string;
  };
  advanced: {
    custom_head_tags: string;
    google_analytics_id: string;
    google_tag_manager_id: string;
    google_search_console_id: string;
    bing_webmaster_id: string;
    custom_robots_txt: string;
    [key: string]: string;
  };
  [key: string]: any;
}

// التحقق من وجود إعدادات SEO في الإعدادات الحالية
const getDefaultSEOSettings = (settings: OrganizationSettings): SEOSettings => {
  if (settings.custom_js) {
    try {
      // التحقق من أن البيانات هي JSON صالح
      let customJsStr = settings.custom_js;
      
      // إزالة أي تعليقات أو أكواد جافاسكريبت غير صالحة
      if (customJsStr.includes('//') || customJsStr.includes('function')) {
        // إذا كانت البيانات تحتوي على تعليقات أو دوال، استخدم القيم الافتراضية
        
        // العودة مباشرة إلى القيم الافتراضية بدلاً من محاولة تحليل JSON
      } else {
        try {
          const customData = JSON.parse(customJsStr);
          if (customData && customData.seoSettings) {
            return customData.seoSettings;
          }
        } catch (innerError) {
        }
      }
    } catch (error) {
      // استمر باستخدام القيم الافتراضية
    }
  }

  // القيم الافتراضية
  return {
    title: settings.site_name || '',
    description: '',
    keywords: '',
    robots_txt: 'User-agent: *\nAllow: /',
    enable_sitemap: true,
    enable_canonical_urls: true,
    generate_meta_tags: true,
    enable_open_graph: true,
    enable_twitter_cards: true,
    enable_schema_markup: true,
    default_image_url: settings.logo_url || '',
    social_media: {
      twitter_handle: '',
      facebook_page: '',
      instagram_handle: '',
      linkedin_page: '',
    },
    structured_data: {
      business_type: 'Store',
      business_name: settings.site_name || '',
      business_logo: settings.logo_url || '',
      business_address: '',
      business_phone: '',
    },
    advanced: {
      custom_head_tags: '',
      google_analytics_id: '',
      google_tag_manager_id: '',
      google_search_console_id: '',
      bing_webmaster_id: '',
      custom_robots_txt: '',
    }
  };
};

interface SEOSettingsProps {
  settings: OrganizationSettings;
  updateSetting: (key: keyof OrganizationSettings, value: any) => void;
}

const SEOSettings = ({ settings, updateSetting }: SEOSettingsProps) => {
  // استخراج إعدادات SEO الحالية أو استخدام القيم الافتراضية
  // تأخير تهيئة الحالة باستخدام دالة للتعامل مع الأخطاء بشكل أفضل
  const [seoSettings, setSeoSettings] = React.useState<SEOSettings>(() => {
    try {
      return getDefaultSEOSettings(settings);
    } catch (error) {
      // العودة إلى القيم الافتراضية في حالة الخطأ
      return {
        title: settings.site_name || '',
        description: '',
        keywords: '',
      } as SEOSettings;
    }
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const { toast } = useToast();
  
  // استخدام عميل Supabase من السياق
  const { supabase } = useSupabase();

  // تحديث إعدادات SEO عند تغيير قيمة
  const updateSEOSetting = (
    category: keyof SEOSettings | string,
    field: string,
    value: string | boolean
  ) => {
    setSeoSettings((prev) => {
      // نسخة جديدة من الإعدادات
      const updated = { ...prev };

      // التحقق مما إذا كان الحقل جزءًا من فئة فرعية
      if (field.includes('.')) {
        // مثال: social_media.twitter_handle
        const [subCategory, subField] = field.split('.');
        updated[subCategory as keyof SEOSettings][subField] = value;
      } else if (typeof updated[category as keyof SEOSettings] === 'object') {
        // إذا كان الحقل الرئيسي كائنًا
        updated[category as keyof SEOSettings][field] = value;
      } else {
        // تحديث حقل مباشر
        updated[field as keyof SEOSettings] = value;
      }

      // تحديث الإعدادات العامة
      // تعريف الكائن بنوع مناسب لتجنب أخطاء TypeScript
      let customJs: { seoSettings?: SEOSettings } = {};
      
      try {
        // التحقق من أن البيانات هي JSON صالح
        if (settings.custom_js) {
          // التحقق من وجود تعليقات أو دوال جافاسكريبت
          if (settings.custom_js.includes('//') || settings.custom_js.includes('function')) {
            
          } else {
            // تحليل JSON والتأكد من أنه كائن
            const parsed = JSON.parse(settings.custom_js);
            if (parsed && typeof parsed === 'object') {
              customJs = parsed;
            }
          }
        }
      } catch (error) {
      }
      
      customJs.seoSettings = updated;
      updateSetting('custom_js', JSON.stringify(customJs));

      return updated;
    });
  };
  
  // تحميل صورة جديدة
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // التحقق من نوع الملف
    if (!file.type.startsWith('image/')) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار ملف صورة صالح",
        variant: "destructive",
      });
      return;
    }
    
    // التحقق من حجم الملف (الحد الأقصى 5 ميجا بايت)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "خطأ",
        description: "حجم الصورة كبير جداً، يجب أن يكون أقل من 5 ميجا بايت",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    
    try {
      // استخدام اسم ملف بسيط مع timestamp لضمان فرادة الاسم
      const fileExt = file.name.split('.').pop();
      const fileName = `seo-image-${Date.now()}.${fileExt}`;
      
      // محاولة رفع الملف مباشرة
      const { data, error } = await supabase.storage
        .from('store-assets')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (error) {
        throw new Error(error.message || 'فشل في رفع الملف');
      }
      
      // الحصول على URL العام للصورة
      const { data: urlData } = supabase.storage
        .from('store-assets')
        .getPublicUrl(fileName);
      
      // تحديث الإعدادات بالصورة الجديدة
      updateSEOSetting('social', 'default_image_url', urlData.publicUrl);
      
      toast({
        title: "تم التحميل بنجاح",
        description: "تم تحميل الصورة وتعيينها كصورة افتراضية للمشاركات",
      });
    } catch (error: any) {
      
      // تحديد رسالة خطأ مناسبة بناءً على نوع الخطأ
      let errorMessage = 'حدث خطأ أثناء تحميل الصورة';
      
      if (error.statusCode === 403) {
        errorMessage = 'ليس لديك صلاحية لتحميل الملفات. يرجى تسجيل الدخول أولاً.';
      } else if (error.statusCode === 404 || error.message.includes('not found')) {
        errorMessage = 'حاوية التخزين غير متاحة. يرجى التواصل مع مسؤول النظام.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "فشل التحميل",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // إعادة تعيين حقل الملف
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  // فتح نافذة اختيار الملف
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };
  
  // حذف الصورة الحالية
  const removeCurrentImage = () => {
    updateSEOSetting('social', 'default_image_url', '');
    toast({
      title: "تم الحذف",
      description: "تم حذف الصورة الافتراضية للمشاركات",
    });
  };

  return (
    <Card className="border-2 shadow-sm">
      <CardHeader className="bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              إعدادات تحسين محركات البحث (SEO)
            </CardTitle>
            <CardDescription>
              تحسين ظهور متجرك في نتائج البحث وزيادة عدد الزيارات العضوية
            </CardDescription>
          </div>
          <Badge variant="outline" className="px-3 py-1 bg-primary/10">
            متقدم
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid grid-cols-4 mb-6">
            <TabsTrigger value="basic">أساسيات</TabsTrigger>
            <TabsTrigger value="social">المنصات الاجتماعية</TabsTrigger>
            <TabsTrigger value="structured">البيانات المنظمة</TabsTrigger>
            <TabsTrigger value="advanced">إعدادات متقدمة</TabsTrigger>
          </TabsList>

          {/* إعدادات أساسية */}
          <TabsContent value="basic" className="space-y-6">
            <div className="grid gap-6">
              {/* عنوان الموقع الرئيسي */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-base font-medium">
                  عنوان الموقع الرئيسي
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="عنوان الموقع الرئيسي الذي سيظهر في نتائج البحث"
                  value={seoSettings.title}
                  onChange={(e) => updateSEOSetting('basic', 'title', e.target.value)}
                  className="h-11"
                />
                <p className="text-sm text-muted-foreground">
                  العنوان الرئيسي لمتجرك (يوصى بـ 50-60 حرف). هذا ما سيظهر في نتائج البحث.
                </p>
                <div className="mt-2 p-4 border rounded-md bg-background">
                  <div className="text-sm text-blue-600 hover:underline font-medium">
                    {seoSettings.title || 'عنوان المتجر الإلكتروني'}
                  </div>
                  <div className="text-sm text-green-600 mt-1">
                    https://yourstore.bazaar.com/
                  </div>
                  <div className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {seoSettings.description || 'وصف المتجر سيظهر هنا. تأكد من إضافة وصف جذاب وشامل لمتجرك لجذب العملاء.'}
                  </div>
                </div>
              </div>

              {/* وصف الموقع */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-base font-medium">
                  وصف الموقع
                  <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="وصف مختصر لمتجرك سيظهر في نتائج البحث"
                  value={seoSettings.description}
                  onChange={(e) => updateSEOSetting('basic', 'description', e.target.value)}
                  rows={3}
                  className="resize-none"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>يوصى بـ 150-160 حرف</span>
                  <span className={`${seoSettings.description.length > 160 ? 'text-destructive' : ''}`}>
                    {seoSettings.description.length}/160
                  </span>
                </div>
              </div>

              {/* الكلمات المفتاحية */}
              <div className="space-y-2">
                <Label htmlFor="keywords" className="text-base font-medium">
                  الكلمات المفتاحية
                </Label>
                <Textarea
                  id="keywords"
                  placeholder="أدخل الكلمات المفتاحية مفصولة بفواصل"
                  value={seoSettings.keywords}
                  onChange={(e) => updateSEOSetting('basic', 'keywords', e.target.value)}
                  rows={3}
                  className="resize-none"
                />
                <p className="text-sm text-muted-foreground">
                  أدخل الكلمات المفتاحية المتعلقة بمتجرك مفصولة بفواصل (مثال: ملابس، أحذية، إكسسوارات)
                </p>
              </div>

              {/* خيارات أساسية */}
              <div className="space-y-4 mt-2">
                <div className="grid gap-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="enable_sitemap" className="text-base font-medium">
                        تفعيل خريطة الموقع
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        إنشاء خريطة موقع تساعد محركات البحث في فهرسة صفحاتك
                      </p>
                    </div>
                    <Switch
                      id="enable_sitemap"
                      checked={seoSettings.enable_sitemap}
                      onCheckedChange={(checked) => updateSEOSetting('basic', 'enable_sitemap', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="enable_canonical_urls" className="text-base font-medium">
                        تفعيل الروابط الأساسية
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        تجنب مشاكل المحتوى المكرر بإضافة علامات canonical
                      </p>
                    </div>
                    <Switch
                      id="enable_canonical_urls"
                      checked={seoSettings.enable_canonical_urls}
                      onCheckedChange={(checked) => updateSEOSetting('basic', 'enable_canonical_urls', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="generate_meta_tags" className="text-base font-medium">
                        توليد وسوم Meta تلقائياً
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        إنشاء وسوم meta تلقائياً لجميع صفحات المتجر
                      </p>
                    </div>
                    <Switch
                      id="generate_meta_tags"
                      checked={seoSettings.generate_meta_tags}
                      onCheckedChange={(checked) => updateSEOSetting('basic', 'generate_meta_tags', checked)}
                    />
                  </div>
                </div>
              </div>

              {/* توجيهات ملف Robots.txt */}
              <div className="space-y-2">
                <Label htmlFor="robots_txt" className="text-base font-medium">
                  توجيهات ملف Robots.txt
                </Label>
                <Textarea
                  id="robots_txt"
                  value={seoSettings.robots_txt}
                  onChange={(e) => updateSEOSetting('basic', 'robots_txt', e.target.value)}
                  rows={4}
                  className="font-mono text-sm"
                />
                <p className="text-sm text-muted-foreground">
                  توجيهات لمحركات البحث حول كيفية زحف وفهرسة موقعك
                </p>
              </div>
            </div>
          </TabsContent>

          {/* إعدادات المنصات الاجتماعية */}
          <TabsContent value="social" className="space-y-6">
            <div className="space-y-5">
              <div className="flex items-center justify-between mb-4">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">وسوم Open Graph</Label>
                  <p className="text-sm text-muted-foreground">
                    تحسين مظهر المشاركات على فيسبوك وشبكات التواصل الأخرى
                  </p>
                </div>
                <Switch
                  checked={seoSettings.enable_open_graph}
                  onCheckedChange={(checked) => updateSEOSetting('social', 'enable_open_graph', checked)}
                />
              </div>

              <div className="flex items-center justify-between mb-4">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">وسوم Twitter Cards</Label>
                  <p className="text-sm text-muted-foreground">
                    تحسين مظهر التغريدات التي تحتوي روابط لمتجرك
                  </p>
                </div>
                <Switch
                  checked={seoSettings.enable_twitter_cards}
                  onCheckedChange={(checked) => updateSEOSetting('social', 'enable_twitter_cards', checked)}
                />
              </div>

              <div className="border-t pt-4 mt-4"></div>

              <div className="space-y-2">
                <Label htmlFor="default_image_url" className="text-base font-medium">
                  الصورة الافتراضية للمشاركات
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="default_image_url"
                    placeholder="https://example.com/image.jpg"
                    value={seoSettings.default_image_url}
                    onChange={(e) => updateSEOSetting('social', 'default_image_url', e.target.value)}
                    className="h-11 flex-1"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={triggerFileInput}
                    disabled={isUploading}
                    className="h-11"
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    ) : (
                      <UploadCloud className="h-4 w-4 ml-2" />
                    )}
                    تحميل صورة
                  </Button>
                  
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
                
                {seoSettings.default_image_url && (
                  <div className="mt-3 relative">
                    <div className="w-full max-w-md rounded-md overflow-hidden border">
                      <div className="relative group">
                        <img 
                          src={seoSettings.default_image_url} 
                          alt="صورة افتراضية للمشاركة"
                          className="w-full h-auto object-cover"
                        />
                        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={removeCurrentImage}
                            className="rounded-full h-8 w-8"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <p className="text-sm text-muted-foreground">
                  ستستخدم هذه الصورة عند مشاركة روابط متجرك على وسائل التواصل الاجتماعي (يوصى 1200×630 بكسل)
                </p>
              </div>

              <div className="border-t pt-4 mt-4"></div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="twitter_handle" className="text-base font-medium">
                    معرّف تويتر
                  </Label>
                  <div className="relative">
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">
                      @
                    </span>
                    <Input
                      id="twitter_handle"
                      placeholder="username"
                      value={seoSettings.social_media.twitter_handle}
                      onChange={(e) => updateSEOSetting('social_media', 'twitter_handle', e.target.value)}
                      className="h-11 pr-8"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="facebook_page" className="text-base font-medium">
                    صفحة فيسبوك
                  </Label>
                  <Input
                    id="facebook_page"
                    placeholder="https://facebook.com/yourpage"
                    value={seoSettings.social_media.facebook_page}
                    onChange={(e) => updateSEOSetting('social_media', 'facebook_page', e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instagram_handle" className="text-base font-medium">
                    معرّف انستجرام
                  </Label>
                  <div className="relative">
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">
                      @
                    </span>
                    <Input
                      id="instagram_handle"
                      placeholder="username"
                      value={seoSettings.social_media.instagram_handle}
                      onChange={(e) => updateSEOSetting('social_media', 'instagram_handle', e.target.value)}
                      className="h-11 pr-8"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linkedin_page" className="text-base font-medium">
                    صفحة لينكد إن
                  </Label>
                  <Input
                    id="linkedin_page"
                    placeholder="https://linkedin.com/company/yourcompany"
                    value={seoSettings.social_media.linkedin_page}
                    onChange={(e) => updateSEOSetting('social_media', 'linkedin_page', e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-muted/30 border rounded-lg mt-6">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-primary mt-0.5" />
                <p className="text-sm">
                  <strong>نصيحة احترافية:</strong> استخدام وسوم Open Graph و Twitter Cards يزيد من نسبة النقر على روابط متجرك عند مشاركتها على وسائل التواصل الاجتماعي بنسبة تصل إلى 40%.
                </p>
              </div>
            </div>
          </TabsContent>

          {/* البيانات المنظمة */}
          <TabsContent value="structured" className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">تفعيل البيانات المنظمة (Schema Markup)</Label>
                <p className="text-sm text-muted-foreground">
                  تحسين ظهور متجرك في نتائج البحث من خلال مقتطفات غنية ومعلومات إضافية
                </p>
              </div>
              <Switch
                checked={seoSettings.enable_schema_markup}
                onCheckedChange={(checked) => updateSEOSetting('structured', 'enable_schema_markup', checked)}
              />
            </div>

            {seoSettings.enable_schema_markup && (
              <div className="space-y-6 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="business_type" className="text-base font-medium">
                    نوع العمل التجاري
                  </Label>
                  <Select 
                    value={seoSettings.structured_data.business_type}
                    onValueChange={(value) => updateSEOSetting('structured_data', 'business_type', value)}
                  >
                    <SelectTrigger id="business_type" className="h-11">
                      <SelectValue placeholder="اختر نوع العمل التجاري" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Store">متجر إلكتروني</SelectItem>
                      <SelectItem value="LocalBusiness">متجر محلي</SelectItem>
                      <SelectItem value="Restaurant">مطعم</SelectItem>
                      <SelectItem value="Organization">مؤسسة</SelectItem>
                      <SelectItem value="Service">خدمات</SelectItem>
                      <SelectItem value="Brand">علامة تجارية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business_name" className="text-base font-medium">
                    اسم العمل التجاري
                  </Label>
                  <Input
                    id="business_name"
                    placeholder="اسم متجرك أو شركتك"
                    value={seoSettings.structured_data.business_name}
                    onChange={(e) => updateSEOSetting('structured_data', 'business_name', e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business_logo" className="text-base font-medium">
                    شعار العمل التجاري (URL)
                  </Label>
                  <Input
                    id="business_logo"
                    placeholder="https://example.com/logo.png"
                    value={seoSettings.structured_data.business_logo}
                    onChange={(e) => updateSEOSetting('structured_data', 'business_logo', e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business_address" className="text-base font-medium">
                    عنوان العمل التجاري
                  </Label>
                  <Textarea
                    id="business_address"
                    placeholder="العنوان الكامل لمتجرك أو شركتك"
                    value={seoSettings.structured_data.business_address}
                    onChange={(e) => updateSEOSetting('structured_data', 'business_address', e.target.value)}
                    rows={2}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business_phone" className="text-base font-medium">
                    رقم هاتف العمل التجاري
                  </Label>
                  <Input
                    id="business_phone"
                    placeholder="+966xxxxxxxxx"
                    value={seoSettings.structured_data.business_phone}
                    onChange={(e) => updateSEOSetting('structured_data', 'business_phone', e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="p-4 bg-primary/5 border rounded-lg mt-4">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-primary mt-0.5" />
                    <div className="text-sm w-full">
                      <p className="font-medium mb-1">مثال على البيانات المنظمة التي سيتم إنشاؤها:</p>
                      <div className="relative bg-card rounded-md mt-2 border overflow-hidden">
                        <div className="bg-muted/50 px-3 py-1.5 text-xs font-medium border-b flex justify-between items-center">
                          <span>JSON-LD (schema.org)</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 text-xs"
                            onClick={() => {
                              const code = `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "${seoSettings.structured_data.business_type}",
  "name": "${seoSettings.structured_data.business_name || '[اسم المتجر]'}",
  "image": "${seoSettings.structured_data.business_logo || '[رابط الشعار]'}",
  "address": "${seoSettings.structured_data.business_address || '[العنوان]'}",
  "telephone": "${seoSettings.structured_data.business_phone || '[رقم الهاتف]'}"
}
</script>`;
                              navigator.clipboard.writeText(code);
                              // يمكن إضافة إشعار بنجاح النسخ هنا
                            }}
                          >
                            نسخ الكود
                          </Button>
                        </div>
                        <pre className="p-3 text-xs overflow-x-auto whitespace-pre-wrap" dir="ltr">
{`<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "${seoSettings.structured_data.business_type}",
  "name": "${seoSettings.structured_data.business_name || '[اسم المتجر]'}",
  "image": "${seoSettings.structured_data.business_logo || '[رابط الشعار]'}",
  "address": "${seoSettings.structured_data.business_address || '[العنوان]'}",
  "telephone": "${seoSettings.structured_data.business_phone || '[رقم الهاتف]'}"
}
</script>`}
                        </pre>
                      </div>
                      
                      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                        <p className="text-xs text-amber-800">
                          <strong>ملاحظة:</strong> يتم إضافة هذه البيانات تلقائياً إلى صفحات متجرك، ولا تحتاج إلى نسخ هذا الكود يدوياً. هذا مجرد مثال توضيحي.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* إعدادات متقدمة */}
          <TabsContent value="advanced" className="space-y-6">
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="google_analytics_id" className="text-base font-medium">
                    معرّف Google Analytics
                  </Label>
                  <Input
                    id="google_analytics_id"
                    placeholder="G-XXXXXXXXXX أو UA-XXXXXXXX-X"
                    value={seoSettings.advanced.google_analytics_id}
                    onChange={(e) => updateSEOSetting('advanced', 'google_analytics_id', e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="google_tag_manager_id" className="text-base font-medium">
                    معرّف Google Tag Manager
                  </Label>
                  <Input
                    id="google_tag_manager_id"
                    placeholder="GTM-XXXXXXX"
                    value={seoSettings.advanced.google_tag_manager_id}
                    onChange={(e) => updateSEOSetting('advanced', 'google_tag_manager_id', e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="google_search_console_id" className="text-base font-medium">
                    معرّف Google Search Console
                  </Label>
                  <Input
                    id="google_search_console_id"
                    placeholder="تأكيد ملكية الموقع"
                    value={seoSettings.advanced.google_search_console_id}
                    onChange={(e) => updateSEOSetting('advanced', 'google_search_console_id', e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bing_webmaster_id" className="text-base font-medium">
                    معرّف Bing Webmaster Tools
                  </Label>
                  <Input
                    id="bing_webmaster_id"
                    placeholder="تأكيد ملكية الموقع"
                    value={seoSettings.advanced.bing_webmaster_id}
                    onChange={(e) => updateSEOSetting('advanced', 'bing_webmaster_id', e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <Label htmlFor="custom_head_tags" className="text-base font-medium">
                  وسوم مخصصة لعنصر Head
                </Label>
                <Textarea
                  id="custom_head_tags"
                  placeholder="<meta name='example' content='value'>"
                  value={seoSettings.advanced.custom_head_tags}
                  onChange={(e) => updateSEOSetting('advanced', 'custom_head_tags', e.target.value)}
                  rows={5}
                  className="font-mono text-sm"
                />
                <p className="text-sm text-muted-foreground">
                  أضف وسوم HTML مخصصة لعنصر head. استخدم هذا الحقل لإضافة كود تتبع أو تحليلات إضافية.
                </p>
              </div>

              <div className="space-y-2 mt-4">
                <Label htmlFor="custom_robots_txt" className="text-base font-medium">
                  ملف Robots.txt مخصص
                </Label>
                <Textarea
                  id="custom_robots_txt"
                  placeholder="User-agent: *\nDisallow: /admin\nDisallow: /private"
                  value={seoSettings.advanced.custom_robots_txt}
                  onChange={(e) => updateSEOSetting('advanced', 'custom_robots_txt', e.target.value)}
                  rows={5}
                  className="font-mono text-sm"
                />
                <p className="text-sm text-muted-foreground">
                  استبدال ملف robots.txt الافتراضي بمحتوى مخصص. استخدم هذا لتحديد كيفية قيام روبوتات محركات البحث بفهرسة موقعك.
                </p>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mt-6">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-amber-600 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    <strong>تنبيه:</strong> هذه الإعدادات المتقدمة مخصصة للمطورين ومحترفي SEO. قد يؤدي التكوين غير الصحيح إلى مشاكل في فهرسة موقعك أو ظهوره في نتائج البحث.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="border-t mt-8 pt-6">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-primary mt-1" />
            <div>
              <h3 className="text-base font-medium">تفضيلات الـ SEO متقدمة</h3>
              <p className="text-sm text-muted-foreground mt-1">
                هذه الإعدادات ستزيد من فرص ظهور متجرك في نتائج البحث وتحسين تجربة المستخدم لزيادة التحويلات. تذكر أن تحسين الـ SEO هو عملية مستمرة تتطلب تحديث المحتوى والكلمات المفتاحية بشكل دوري.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SEOSettings;
