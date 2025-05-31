import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useTheme } from '@/context/ThemeContext';
import { getOrganizationSettings, updateOrganizationSettings } from '@/lib/api/settings';
import { Check, Loader2, Upload } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getSupabaseClient } from '@/lib/supabase';
import { Switch } from '@/components/ui/switch';

const OrganizationBrandSettings = () => {
  const { toast } = useToast();
  const { reloadOrganizationTheme } = useTheme();
  const { currentOrganization, isOrgAdmin, refreshOrganizationData } = useTenant();
  const { user } = useAuth();
  
  // Estados para los campos de marca
  const [siteName, setSiteName] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [faviconUrl, setFaviconUrl] = useState<string>('');
  const [displayTextWithLogo, setDisplayTextWithLogo] = useState<boolean>(true);
  
  // Estados para archivos y carga
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  
  // Estados de UI
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  
  // Cargar datos iniciales
  useEffect(() => {
    const loadSettings = async () => {
      if (!currentOrganization?.id) return;
      
      try {
        const settings = await getOrganizationSettings(currentOrganization.id);
        if (settings) {
          setSiteName(settings.site_name || currentOrganization.name || '');
          setLogoUrl(settings.logo_url || currentOrganization.logo_url || '');
          setFaviconUrl(settings.favicon_url || '');
          setDisplayTextWithLogo(settings.display_text_with_logo !== false);
        }
      } catch (error) {
        toast({
          title: 'خطأ',
          description: 'حدث خطأ أثناء تحميل إعدادات المؤسسة',
          variant: 'destructive',
        });
      }
    };
    
    loadSettings();
  }, [currentOrganization?.id, toast]);
  
  // Función para subir una imagen a Supabase Storage
  const uploadImage = async (file: File, path: string): Promise<string> => {
    if (!currentOrganization?.id || !file) return '';
    
    // التحقق من حجم الملف (الحد الأقصى 5 ميجابايت)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`حجم الملف كبير جدًا. الحد الأقصى المسموح به هو 5 ميجابايت.`);
    }
    
    // التحقق من نوع الملف
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error(`نوع الملف غير مدعوم. الأنواع المدعومة هي: JPEG, PNG, GIF, WebP, SVG.`);
    }
    
    // تعطيل معالج الـ 406 مؤقتًا إذا كان موجودًا
    const originalFetch = window.fetch;
    let handlerDisabled = false;
    
    try {
      // محاولة تعطيل معالج 406 باستخدام الدالة العامة
      if (typeof (window as any).disable406Handler === 'function') {
        (window as any).disable406Handler();
        handlerDisabled = true;
        console.log('✅ تم تعطيل معالج 406 مؤقتًا لرفع الصورة');
      }
      
      const supabaseClient = getSupabaseClient();
      const fileExt = file.name.split('.').pop();
      // إضافة معرف فريد لتجنب تعارض الأسماء
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `${path}/${currentOrganization.id}/${fileName}`;
      
      console.log(`🖼️ بدء رفع الملف: ${fileName} إلى المسار: ${filePath}`);
      
      // تنفيذ عملية الرفع
      const { data, error } = await supabaseClient.storage
        .from('organization-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type // تحديد نوع المحتوى بشكل صريح
        });
      
      if (error) {
        console.error('خطأ في رفع الملف:', error);
        throw error;
      }
      
      console.log(`✅ تم رفع الملف بنجاح: ${filePath}`);
      
      // الحصول على الرابط العام للملف
      const { data: urlData } = supabaseClient.storage
        .from('organization-assets')
        .getPublicUrl(filePath);
      
      if (!urlData || !urlData.publicUrl) {
        throw new Error('لم يتم استلام رابط الملف المرفوع');
      }
      
      // إضافة معلمة للتحكم في التخزين المؤقت للمتصفح
      return `${urlData.publicUrl}?t=${Date.now()}`;
    } catch (error) {
      console.error('خطأ غير متوقع أثناء رفع الملف:', error);
      throw error;
    } finally {
      // إعادة تفعيل معالج الـ 406 إذا كان قد تم تعطيله
      if (handlerDisabled && typeof (window as any).enable406Handler === 'function') {
        (window as any).enable406Handler();
        console.log('✅ تم إعادة تفعيل معالج 406 بعد رفع الصورة');
      }
    }
  };
  
  // Manejador de subida de logo
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogoFile(e.target.files[0]);
      // Crear una URL temporal para vista previa
      const objectUrl = URL.createObjectURL(e.target.files[0]);
      setLogoUrl(objectUrl);
    }
  };
  
  // Manejador de subida de favicon
  const handleFaviconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFaviconFile(e.target.files[0]);
      // Crear una URL temporal para vista previa
      const objectUrl = URL.createObjectURL(e.target.files[0]);
      setFaviconUrl(objectUrl);
    }
  };
  
  // Guardar configuraciones
  const saveSettings = async () => {
    if (!currentOrganization?.id || !isOrgAdmin) {
      toast({
        title: 'خطأ',
        description: 'ليس لديك صلاحية لتحديث إعدادات المؤسسة',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSaving(true);
    setIsUploading(false);
    
    try {
      // Subir imágenes si existen
      let finalLogoUrl = logoUrl;
      let finalFaviconUrl = faviconUrl;
      
      // التحقق من وجود ملفات جديدة للرفع
      const hasNewFiles = logoFile || faviconFile;
      
      if (hasNewFiles) {
        setIsUploading(true);
        
        // رفع الشعار
        if (logoFile) {
          try {
            finalLogoUrl = await uploadImage(logoFile, 'logos');
            setLogoFile(null); // مسح الملف بعد الرفع بنجاح
          } catch (error) {
            // الاحتفاظ بعنوان URL السابق في حالة فشل الرفع
            toast({
              title: 'خطأ في رفع الشعار',
              description: error instanceof Error ? error.message : 'فشل في رفع الشعار',
              variant: 'destructive',
            });
          }
        }
        
        // رفع الأيقونة
        if (faviconFile) {
          try {
            finalFaviconUrl = await uploadImage(faviconFile, 'favicons');
            setFaviconFile(null); // مسح الملف بعد الرفع بنجاح
          } catch (error) {
            // الاحتفاظ بعنوان URL السابق في حالة فشل الرفع
            toast({
              title: 'خطأ في رفع الأيقونة',
              description: error instanceof Error ? error.message : 'فشل في رفع أيقونة المتجر',
              variant: 'destructive',
            });
          }
        }
        
        setIsUploading(false);
      }
      
      // التحقق من الجلسة
      const supabaseClient = getSupabaseClient();
      const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

      if (sessionError) {
        toast({ title: 'خطأ في الجلسة', description: 'لا يمكن التحقق من جلسة المستخدم', variant: 'destructive' });
        setIsSaving(false);
        return;
      }

      if (!session || !session.user) {
        toast({ title: 'جلسة غير نشطة', description: 'يرجى تسجيل الدخول مرة أخرى', variant: 'destructive' });
        setIsSaving(false);
        return;
      }

      // تحديث الإعدادات
      await updateOrganizationSettings(currentOrganization.id, {
        site_name: siteName,
        logo_url: finalLogoUrl,
        favicon_url: finalFaviconUrl,
        display_text_with_logo: displayTextWithLogo
      });
      
      // تحديث الثيم وإعادة تحميل بيانات المؤسسة
      if (currentOrganization.id) {
        await reloadOrganizationTheme();
      }
      
      // إعادة تحميل بيانات المؤسسة لتحديث الواجهة بشكل كامل
      await refreshOrganizationData();
      
      // تطبيق التغييرات في الواجهة بشكل مباشر
      document.title = siteName;
      
      // تحديث الأيقونة في المتصفح إذا تغيرت
      if (finalFaviconUrl) {
        const faviconElement = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
        if (faviconElement) {
          faviconElement.href = `${finalFaviconUrl}?t=${Date.now()}`;
        } else {
          const newFavicon = document.createElement('link');
          newFavicon.rel = 'icon';
          newFavicon.href = `${finalFaviconUrl}?t=${Date.now()}`;
          document.head.appendChild(newFavicon);
        }
      }
      
      // تحديث الشعار في جميع أنحاء التطبيق
      const logoElements = document.querySelectorAll('img[data-logo="organization"]');
      logoElements.forEach(element => {
        const imgElement = element as HTMLImageElement;
        imgElement.src = `${finalLogoUrl}?t=${Date.now()}`;
      });
      
      // إطلاق حدث تحديث إعدادات المؤسسة لإعلام المكونات الأخرى
      const settingsUpdatedEvent = new CustomEvent('organization_settings_updated', {
        detail: {
          siteName,
          logoUrl: finalLogoUrl,
          faviconUrl: finalFaviconUrl,
          displayTextWithLogo,
          timestamp: Date.now()
        }
      });
      console.log('🔔 [OrganizationBrandSettings] إطلاق حدث تحديث إعدادات المؤسسة:', settingsUpdatedEvent.detail);
      window.dispatchEvent(settingsUpdatedEvent);
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      
      toast({
        title: 'تم الحفظ',
        description: 'تم حفظ إعدادات العلامة التجارية بنجاح، قد تحتاج إلى تحديث الصفحة لرؤية جميع التغييرات',
      });
    } catch (error) {
      console.error('خطأ في حفظ الإعدادات:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في حفظ إعدادات العلامة التجارية',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Si no hay organización o el usuario no es administrador
  if (!currentOrganization || !isOrgAdmin) {
    return (
      <div className="flex items-center justify-center h-40 text-center p-4 border rounded-md bg-muted">
        <p>ليس لديك صلاحية لعرض هذه الإعدادات</p>
      </div>
    );
  }
  
  return (
    <div>
      <h2 className="text-xl font-bold mb-4 text-right">إعدادات منصة الألعاب</h2>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-right">معلومات المنصة الأساسية</CardTitle>
          <CardDescription className="text-right">
            تخصيص اسم وشعار منصة الألعاب الخاصة بك
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* اسم المنصة */}
          <div className="space-y-2">
            <Label htmlFor="site-name" className="text-right block">اسم المنصة</Label>
            <Input
              id="site-name"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="أدخل اسم منصة الألعاب"
              className="w-full"
              dir="rtl"
            />
            <p className="text-sm text-muted-foreground text-right">
              هذا الاسم سيظهر في عنوان الصفحة والواجهة العامة للمنصة
            </p>
          </div>
          
          {/* شعار المنصة */}
          <div className="space-y-2">
            <Label htmlFor="logo-upload" className="text-right block">شعار المنصة</Label>
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              {logoUrl && (
                <div className="w-32 h-32 border rounded-md flex items-center justify-center p-2 bg-slate-50">
                  <img
                    src={logoUrl}
                    alt="شعار المنصة"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor="logo-upload"
                    className="cursor-pointer border rounded-md px-4 py-2 bg-muted hover:bg-muted/80 flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    اختر شعار المنصة
                  </Label>
                  <Input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2 text-right">
                  يفضل استخدام صورة بحجم 512×512 بيكسل بصيغة PNG أو JPEG
                </p>
              </div>
            </div>
          </div>
          
          {/* خيار عرض النص مع الشعار */}
          {logoUrl && (
            <div className="flex flex-row-reverse items-center justify-between mt-2">
              <Label htmlFor="display-text-with-logo" className="text-right flex-1">
                عرض اسم المنصة بجانب الشعار في شريط التنقل
                <p className="text-sm text-muted-foreground mt-1">
                  إذا كان هذا الخيار معطلاً، سيظهر الشعار فقط دون نص في شريط التنقل
                </p>
              </Label>
              <Switch
                id="display-text-with-logo"
                checked={displayTextWithLogo}
                onCheckedChange={setDisplayTextWithLogo}
              />
            </div>
          )}
          
          {/* أيقونة المنصة (Favicon) */}
          <div className="space-y-2">
            <Label htmlFor="favicon-upload" className="text-right block">أيقونة المتصفح (Favicon)</Label>
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              {faviconUrl && (
                <div className="w-16 h-16 border rounded-md flex items-center justify-center p-2 bg-slate-50">
                  <img
                    src={faviconUrl}
                    alt="أيقونة المتصفح"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor="favicon-upload"
                    className="cursor-pointer border rounded-md px-4 py-2 bg-muted hover:bg-muted/80 flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    اختر أيقونة المتصفح
                  </Label>
                  <Input
                    id="favicon-upload"
                    type="file"
                    accept="image/png,image/x-icon,image/svg+xml"
                    onChange={handleFaviconChange}
                    className="hidden"
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2 text-right">
                  يفضل استخدام صورة مربعة بحجم 32×32 أو 64×64 بيكسل بصيغة ICO أو PNG
                </p>
              </div>
            </div>
          </div>
          
          {/* زر الحفظ */}
          <div className="flex justify-end mt-6">
            <Button
              onClick={saveSettings}
              disabled={isSaving || isUploading}
              className="w-full sm:w-auto"
            >
              {isUploading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> جاري رفع الملفات...</>
              ) : isSaving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> جاري الحفظ...</>
              ) : saveSuccess ? (
                <><Check className="mr-2 h-4 w-4" /> تم الحفظ</>
              ) : (
                "حفظ إعدادات المنصة"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrganizationBrandSettings;
