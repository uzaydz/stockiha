import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { useTenant } from '@/context/TenantContext';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { usePOSSettings } from '@/hooks/usePOSSettings';
import POSPureLayout from '@/components/pos-layout/POSPureLayout';
import { 
  Store, 
  Palette, 
  Receipt, 
  Printer, 
  ShoppingCart,
  Shield,
  Settings,
  Save,
  Loader2,
  Check,
  Upload,
  Trash2,
  ImageIcon,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useFileUpload } from '@/hooks/useFileUpload';

// الثوابت
const LANGUAGES = [
  { code: 'ar', name: 'العربية' },
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' }
];

const PAPER_WIDTHS = [
  { value: '48', label: '48 مم' },
  { value: '58', label: '58 مم' },
  { value: '80', label: '80 مم' }
];

const RECEIPT_TEMPLATES = [
  { value: 'classic', label: 'كلاسيكي' },
  { value: 'modern', label: 'عصري' },
  { value: 'minimal', label: 'بسيط' }
];

const THEME_MODES = [
  { value: 'light', label: 'فاتح' },
  { value: 'dark', label: 'داكن' },
  { value: 'auto', label: 'تلقائي' }
];

// مكون القسم
interface SectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, description, children }) => (
  <div className="space-y-4">
    <div>
      <h3 className="text-base font-medium">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
    </div>
    <div className="space-y-4">
      {children}
    </div>
  </div>
);

// مكون حقل الإدخال
interface FieldProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  horizontal?: boolean;
}

const Field: React.FC<FieldProps> = ({ label, description, children, horizontal }) => (
  <div className={cn(
    "space-y-2",
    horizontal && "flex items-center justify-between space-y-0"
  )}>
    <div className={cn(horizontal && "flex-1")}>
      <Label className="text-sm font-normal">{label}</Label>
      {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
    </div>
    <div className={cn(!horizontal && "mt-2")}>
      {children}
    </div>
  </div>
);

// مكون رفع الصور
interface ImageUploadProps {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  uploadPath: string;
  label: string;
  aspectRatio?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ value, onChange, uploadPath, label, aspectRatio = "aspect-video" }) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { isUploading, handleInputChange } = useFileUpload({
    uploadPath,
    onSuccess: onChange,
    onError: (error) => console.error('Upload failed:', error)
  });

  return (
    <div className="space-y-3">
      <div className={cn(
        "relative border border-dashed rounded-lg overflow-hidden bg-muted/30",
        aspectRatio
      )}>
        {value ? (
          <>
            <img src={value} alt={label} className="w-full h-full object-contain" />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8"
              onClick={() => onChange(null)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <div 
            className="flex flex-col items-center justify-center h-full cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => inputRef.current?.click()}
          >
            <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">{label}</span>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Upload className="h-4 w-4 ml-2" />}
          {value ? 'تغيير' : 'رفع'}
        </Button>
        <Input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleInputChange}
        />
      </div>
    </div>
  );
};

// الصفحة الرئيسية
const UnifiedSettingsPage: React.FC = () => {
  const { toast } = useToast();
  const { currentOrganization } = useTenant();
  const [activeTab, setActiveTab] = useState('store');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // إعدادات المتجر
  const {
    settings: storeSettings,
    isLoading: storeLoading,
    error: storeError,
    updateSetting: updateStoreSetting,
    saveSettings: saveStoreSettings,
    trackingPixels,
    updateTrackingPixel,
    refreshSettings: refreshStoreSettings
  } = useStoreSettings({
    organizationId: currentOrganization?.id,
    autoApplyTheme: false
  });

  // إعدادات POS
  const {
    settings: posSettings,
    isLoading: posLoading,
    error: posError,
    updateSettings: updatePosSettings,
    saveSettings: savePosSettings
  } = usePOSSettings({
    organizationId: currentOrganization?.id || ''
  });

  // طباعة معلومات التحميل للتشخيص
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[UnifiedSettings] حالة التحميل:', {
        storeLoading,
        posLoading,
        hasStoreSettings: !!storeSettings,
        hasPosSettings: !!posSettings,
        storeError,
        posError,
        organizationId: currentOrganization?.id
      });
    }
  }, [storeLoading, posLoading, storeSettings, posSettings, storeError, posError, currentOrganization?.id]);

  // استخراج إعداد السلة من custom_js
  const enableCart = React.useMemo(() => {
    try {
      const raw = storeSettings?.custom_js;
      if (!raw) return false;
      const js = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return !!js?.enable_cart;
    } catch {
      return false;
    }
  }, [storeSettings?.custom_js]);

  // تحديث إعداد السلة
  const setEnableCart = useCallback((enabled: boolean) => {
    try {
      const raw = storeSettings?.custom_js;
      const js = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {};
      js.enable_cart = enabled;
      updateStoreSetting('custom_js', JSON.stringify(js));
    } catch {
      updateStoreSetting('custom_js', JSON.stringify({ enable_cart: enabled }));
    }
  }, [storeSettings?.custom_js, updateStoreSetting]);

  // حفظ جميع الإعدادات
  const handleSaveAll = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      await Promise.all([
        saveStoreSettings(),
        savePosSettings()
      ]);
      
      setSaveSuccess(true);
      toast({
        title: "تم الحفظ",
        description: "تم حفظ جميع الإعدادات بنجاح"
      });
      
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في حفظ الإعدادات",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = storeLoading || posLoading;

  // عرض حالة التحميل
  if (isLoading) {
    return (
      <POSPureLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">جاري تحميل الإعدادات...</p>
          </div>
        </div>
      </POSPureLayout>
    );
  }

  // عرض خطأ إذا فشل تحميل البيانات
  if ((storeError || posError) && !storeSettings && !posSettings) {
    return (
      <POSPureLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4 max-w-md">
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <Settings className="h-6 w-6 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold">تعذر تحميل الإعدادات</h2>
            <p className="text-sm text-muted-foreground">
              {storeError || posError || 'حدث خطأ أثناء تحميل الإعدادات. تأكد من اتصالك بالإنترنت.'}
            </p>
            <Button onClick={() => window.location.reload()} variant="outline" size="sm">
              إعادة المحاولة
            </Button>
          </div>
        </div>
      </POSPureLayout>
    );
  }

  const navItems = [
    { id: 'store', label: 'المتجر', icon: Store },
    { id: 'cart', label: 'السلة', icon: ShoppingCart },
    { id: 'appearance', label: 'المظهر', icon: Palette },
    { id: 'receipt', label: 'الوصل', icon: Receipt },
    { id: 'printing', label: 'الطباعة', icon: Printer },
    { id: 'access', label: 'الوصول', icon: Shield },
    { id: 'advanced', label: 'متقدم', icon: Settings }
  ];

  return (
    <POSPureLayout>
      <div className="h-full overflow-auto bg-background">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
          <div className="container flex h-14 items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <h1 className="text-lg font-semibold">إعدادات المتجر</h1>
            </div>
            <Button onClick={handleSaveAll} disabled={isSaving} size="sm">
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              ) : saveSuccess ? (
                <Check className="h-4 w-4 ml-2" />
              ) : (
                <Save className="h-4 w-4 ml-2" />
              )}
              {isSaving ? 'جاري الحفظ...' : saveSuccess ? 'تم الحفظ' : 'حفظ الإعدادات'}
            </Button>
          </div>
        </div>

        <div className="container py-6">
          <div className="flex gap-6">
            {/* Sidebar Navigation */}
            <aside className="hidden md:block w-56 shrink-0">
              <nav className="space-y-1 sticky top-20">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors",
                        isActive 
                          ? "bg-primary text-primary-foreground" 
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                      {isActive && <ChevronRight className="h-4 w-4 mr-auto" />}
                    </button>
                  );
                })}
              </nav>
            </aside>

            {/* Mobile Navigation */}
            <div className="md:hidden w-full mb-4">
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-2 pb-2">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 text-sm rounded-md border transition-colors",
                          isActive 
                            ? "bg-primary text-primary-foreground border-primary" 
                            : "bg-background border-border text-muted-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Content */}
            <main className="flex-1 min-w-0">
              <Card>
                <CardContent className="p-6">
                  {/* المتجر */}
                  {activeTab === 'store' && storeSettings && (
                    <div className="space-y-8">
                      <Section title="معلومات المتجر" description="المعلومات الأساسية التي تظهر للزوار">
                        <Field label="اسم المتجر">
                          <Input
                            value={storeSettings.site_name || ''}
                            onChange={(e) => updateStoreSetting('site_name', e.target.value)}
                            placeholder="أدخل اسم المتجر"
                          />
                        </Field>
                        
                        <Field label="اللغة الافتراضية">
                          <Select
                            value={storeSettings.default_language || 'ar'}
                            onValueChange={(value) => updateStoreSetting('default_language', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {LANGUAGES.map((lang) => (
                                <SelectItem key={lang.code} value={lang.code}>
                                  {lang.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                      </Section>

                      <Separator />

                      <Section title="الشعار والأيقونة">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <Label className="text-sm font-normal mb-3 block">شعار المتجر</Label>
                            <ImageUpload
                              value={storeSettings.logo_url}
                              onChange={(url) => updateStoreSetting('logo_url', url)}
                              uploadPath={`organizations/${currentOrganization?.id}/logo`}
                              label="رفع الشعار"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-normal mb-3 block">أيقونة المتصفح</Label>
                            <ImageUpload
                              value={storeSettings.favicon_url}
                              onChange={(url) => updateStoreSetting('favicon_url', url)}
                              uploadPath={`organizations/${currentOrganization?.id}/favicon`}
                              label="رفع الأيقونة"
                              aspectRatio="aspect-square max-w-[120px]"
                            />
                          </div>
                        </div>
                        
                        <Field label="عرض اسم المتجر مع الشعار" horizontal>
                          <Switch
                            checked={storeSettings.display_text_with_logo || false}
                            onCheckedChange={(checked) => updateStoreSetting('display_text_with_logo', checked)}
                          />
                        </Field>
                      </Section>

                      <Separator />

                      <Section title="معلومات التواصل" description="معلومات الاتصال الخاصة بنقطة البيع">
                        {posSettings && (
                          <>
                            <Field label="رقم الهاتف">
                              <Input
                                value={posSettings.store_phone || ''}
                                onChange={(e) => updatePosSettings({ store_phone: e.target.value })}
                                placeholder="أدخل رقم الهاتف"
                                dir="ltr"
                              />
                            </Field>
                            
                            <Field label="البريد الإلكتروني">
                              <Input
                                value={posSettings.store_email || ''}
                                onChange={(e) => updatePosSettings({ store_email: e.target.value })}
                                placeholder="أدخل البريد الإلكتروني"
                                type="email"
                                dir="ltr"
                              />
                            </Field>
                            
                            <Field label="العنوان">
                              <Textarea
                                value={posSettings.store_address || ''}
                                onChange={(e) => updatePosSettings({ store_address: e.target.value })}
                                placeholder="أدخل عنوان المتجر"
                                rows={2}
                              />
                            </Field>
                          </>
                        )}
                      </Section>
                    </div>
                  )}

                  {/* السلة */}
                  {activeTab === 'cart' && (
                    <div className="space-y-8">
                      <Section title="إعدادات السلة" description="تحكم في ظهور وسلوك سلة التسوق">
                        <Field 
                          label="تفعيل السلة" 
                          description="عند التفعيل، سيظهر زر أضف للسلة بجانب زر الطلب"
                          horizontal
                        >
                          <Switch
                            checked={enableCart}
                            onCheckedChange={setEnableCart}
                          />
                        </Field>
                      </Section>

                      {enableCart && (
                        <>
                          <Separator />
                          <Section title="خيارات إضافية">
                            <div className="p-4 bg-muted/50 rounded-lg">
                              <p className="text-sm text-muted-foreground">
                                المزيد من خيارات السلة ستكون متاحة قريباً
                              </p>
                            </div>
                          </Section>
                        </>
                      )}
                    </div>
                  )}

                  {/* المظهر */}
                  {activeTab === 'appearance' && storeSettings && (
                    <div className="space-y-8">
                      <Section title="الألوان" description="اختر ألوان متجرك">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <Field label="اللون الأساسي">
                            <div className="flex gap-2">
                              <Input
                                type="color"
                                value={storeSettings.theme_primary_color || '#3B82F6'}
                                onChange={(e) => updateStoreSetting('theme_primary_color', e.target.value)}
                                className="w-12 h-10 p-1 cursor-pointer"
                              />
                              <Input
                                value={storeSettings.theme_primary_color || '#3B82F6'}
                                onChange={(e) => updateStoreSetting('theme_primary_color', e.target.value)}
                                className="flex-1"
                                dir="ltr"
                              />
                            </div>
                          </Field>
                          
                          <Field label="اللون الثانوي">
                            <div className="flex gap-2">
                              <Input
                                type="color"
                                value={storeSettings.theme_secondary_color || '#10B981'}
                                onChange={(e) => updateStoreSetting('theme_secondary_color', e.target.value)}
                                className="w-12 h-10 p-1 cursor-pointer"
                              />
                              <Input
                                value={storeSettings.theme_secondary_color || '#10B981'}
                                onChange={(e) => updateStoreSetting('theme_secondary_color', e.target.value)}
                                className="flex-1"
                                dir="ltr"
                              />
                            </div>
                          </Field>
                        </div>
                      </Section>

                      <Separator />

                      <Section title="وضع العرض">
                        <Field label="الوضع">
                          <Select
                            value={storeSettings.theme_mode || 'light'}
                            onValueChange={(value) => updateStoreSetting('theme_mode', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {THEME_MODES.map((mode) => (
                                <SelectItem key={mode.value} value={mode.value}>
                                  {mode.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                      </Section>

                      <Separator />

                      <Section title="CSS مخصص" description="أضف أنماط CSS مخصصة">
                        <Textarea
                          value={storeSettings.custom_css || ''}
                          onChange={(e) => updateStoreSetting('custom_css', e.target.value)}
                          placeholder="/* CSS مخصص */"
                          className="font-mono text-sm min-h-[150px]"
                          dir="ltr"
                        />
                      </Section>
                    </div>
                  )}

                  {/* الوصل */}
                  {activeTab === 'receipt' && posSettings && (
                    <div className="space-y-8">
                      <Section title="نصوص الوصل">
                        <Field label="نص الرأس">
                          <Input
                            value={posSettings.receipt_header_text || ''}
                            onChange={(e) => updatePosSettings({ receipt_header_text: e.target.value })}
                            placeholder="شكراً لتعاملكم معنا"
                          />
                        </Field>
                        
                        <Field label="نص التذييل">
                          <Input
                            value={posSettings.receipt_footer_text || ''}
                            onChange={(e) => updatePosSettings({ receipt_footer_text: e.target.value })}
                            placeholder="نتطلع لخدمتكم مرة أخرى"
                          />
                        </Field>
                        
                        <Field label="رسالة الترحيب">
                          <Input
                            value={posSettings.welcome_message || ''}
                            onChange={(e) => updatePosSettings({ welcome_message: e.target.value })}
                            placeholder="أهلاً وسهلاً بكم"
                          />
                        </Field>
                      </Section>

                      <Separator />

                      <Section title="العناصر المرئية" description="تحكم في ما يظهر على الوصل">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Field label="عرض رمز QR" horizontal>
                            <Switch
                              checked={posSettings.show_qr_code || false}
                              onCheckedChange={(checked) => updatePosSettings({ show_qr_code: checked })}
                            />
                          </Field>
                          
                          <Field label="عرض كود التتبع" horizontal>
                            <Switch
                              checked={posSettings.show_tracking_code || false}
                              onCheckedChange={(checked) => updatePosSettings({ show_tracking_code: checked })}
                            />
                          </Field>
                          
                          <Field label="عرض معلومات العميل" horizontal>
                            <Switch
                              checked={posSettings.show_customer_info || false}
                              onCheckedChange={(checked) => updatePosSettings({ show_customer_info: checked })}
                            />
                          </Field>
                          
                          <Field label="عرض شعار المتجر" horizontal>
                            <Switch
                              checked={posSettings.show_store_logo || false}
                              onCheckedChange={(checked) => updatePosSettings({ show_store_logo: checked })}
                            />
                          </Field>
                          
                          <Field label="عرض التاريخ والوقت" horizontal>
                            <Switch
                              checked={posSettings.show_date_time || false}
                              onCheckedChange={(checked) => updatePosSettings({ show_date_time: checked })}
                            />
                          </Field>
                          
                          <Field label="عرض اسم الموظف" horizontal>
                            <Switch
                              checked={posSettings.show_employee_name || false}
                              onCheckedChange={(checked) => updatePosSettings({ show_employee_name: checked })}
                            />
                          </Field>
                        </div>
                      </Section>

                      <Separator />

                      <Section title="قالب الوصل">
                        <Field label="القالب">
                          <Select
                            value={posSettings.receipt_template || 'classic'}
                            onValueChange={(value) => updatePosSettings({ receipt_template: value as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {RECEIPT_TEMPLATES.map((template) => (
                                <SelectItem key={template.value} value={template.value}>
                                  {template.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                      </Section>
                    </div>
                  )}

                  {/* الطباعة */}
                  {activeTab === 'printing' && posSettings && (
                    <div className="space-y-8">
                      <Section title="إعدادات الورق">
                        <Field label="عرض الورق">
                          <Select
                            value={String(posSettings.paper_width || 58)}
                            onValueChange={(value) => updatePosSettings({ paper_width: Number(value) })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PAPER_WIDTHS.map((width) => (
                                <SelectItem key={width.value} value={width.value}>
                                  {width.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                      </Section>

                      <Separator />

                      <Section title="إعدادات الخط">
                        <Field label="حجم الخط">
                          <div className="flex items-center gap-4">
                            <Input
                              type="number"
                              value={posSettings.font_size || 10}
                              onChange={(e) => updatePosSettings({ font_size: Number(e.target.value) })}
                              className="w-24"
                              min={8}
                              max={16}
                            />
                            <span className="text-sm text-muted-foreground">بكسل</span>
                          </div>
                        </Field>
                        
                        <Field label="تباعد الأسطر">
                          <div className="flex items-center gap-4">
                            <Input
                              type="number"
                              value={posSettings.line_spacing || 1.2}
                              onChange={(e) => updatePosSettings({ line_spacing: Number(e.target.value) })}
                              className="w-24"
                              min={1}
                              max={2}
                              step={0.1}
                            />
                          </div>
                        </Field>
                      </Section>

                      <Separator />

                      <Section title="خيارات الطباعة">
                        <Field label="كثافة الطباعة">
                          <Select
                            value={posSettings.print_density || 'normal'}
                            onValueChange={(value) => updatePosSettings({ print_density: value as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="light">خفيفة</SelectItem>
                              <SelectItem value="normal">عادية</SelectItem>
                              <SelectItem value="dark">داكنة</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                        
                        <Field label="القطع التلقائي" description="قطع الورق تلقائياً بعد الطباعة" horizontal>
                          <Switch
                            checked={posSettings.auto_cut || false}
                            onCheckedChange={(checked) => updatePosSettings({ auto_cut: checked })}
                          />
                        </Field>
                      </Section>
                    </div>
                  )}

                  {/* الوصول */}
                  {activeTab === 'access' && storeSettings && (
                    <div className="space-y-8">
                      <Section title="إعدادات الوصول" description="تحكم في من يمكنه الوصول لمتجرك">
                        <Field 
                          label="السماح بالتسجيل" 
                          description="السماح للمستخدمين الجدد بإنشاء حسابات"
                          horizontal
                        >
                          <Switch
                            checked={storeSettings.enable_registration || false}
                            onCheckedChange={(checked) => updateStoreSetting('enable_registration', checked)}
                          />
                        </Field>
                        
                        <Field 
                          label="الموقع العام" 
                          description="جعل المتجر مرئياً للجمهور بدون تسجيل دخول"
                          horizontal
                        >
                          <Switch
                            checked={storeSettings.enable_public_site || false}
                            onCheckedChange={(checked) => updateStoreSetting('enable_public_site', checked)}
                          />
                        </Field>
                      </Section>

                      {posSettings && (
                        <>
                          <Separator />
                          
                          <Section title="صلاحيات نقطة البيع">
                            <Field 
                              label="السماح بتعديل الأسعار" 
                              description="السماح للموظفين بتعديل أسعار المنتجات"
                              horizontal
                            >
                              <Switch
                                checked={posSettings.allow_price_edit || false}
                                onCheckedChange={(checked) => updatePosSettings({ allow_price_edit: checked })}
                              />
                            </Field>
                            
                            <Field 
                              label="طلب موافقة المدير" 
                              description="طلب موافقة المدير للعمليات الحساسة"
                              horizontal
                            >
                              <Switch
                                checked={posSettings.require_manager_approval || false}
                                onCheckedChange={(checked) => updatePosSettings({ require_manager_approval: checked })}
                              />
                            </Field>
                          </Section>
                        </>
                      )}
                    </div>
                  )}

                  {/* متقدم */}
                  {activeTab === 'advanced' && (
                    <div className="space-y-8">
                      {posSettings && (
                        <Section title="المعلومات التجارية" description="معلومات للفواتير الرسمية">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field label="رقم السجل التجاري">
                              <Input
                                value={posSettings.business_license || ''}
                                onChange={(e) => updatePosSettings({ business_license: e.target.value })}
                                placeholder="RC"
                              />
                            </Field>
                            
                            <Field label="الرقم الضريبي">
                              <Input
                                value={posSettings.tax_number || ''}
                                onChange={(e) => updatePosSettings({ tax_number: e.target.value })}
                                placeholder="NIF"
                              />
                            </Field>
                            
                            <Field label="رقم التعريف الإحصائي">
                              <Input
                                value={posSettings.nis || ''}
                                onChange={(e) => updatePosSettings({ nis: e.target.value })}
                                placeholder="NIS"
                              />
                            </Field>
                            
                            <Field label="الهوية البنكية">
                              <Input
                                value={posSettings.rib || ''}
                                onChange={(e) => updatePosSettings({ rib: e.target.value })}
                                placeholder="RIB"
                              />
                            </Field>
                          </div>
                        </Section>
                      )}

                      <Separator />

                      {storeSettings && (
                        <Section title="أكواد مخصصة" description="للمطورين فقط">
                          <Field label="JavaScript مخصص">
                            <Textarea
                              value={(() => {
                                try {
                                  const raw = storeSettings.custom_js;
                                  if (!raw) return '';
                                  const js = typeof raw === 'string' ? JSON.parse(raw) : raw;
                                  // إزالة enable_cart من العرض
                                  const { enable_cart, trackingPixels, ...rest } = js;
                                  return Object.keys(rest).length > 0 ? JSON.stringify(rest, null, 2) : '';
                                } catch {
                                  return '';
                                }
                              })()}
                              onChange={(e) => {
                                try {
                                  const currentRaw = storeSettings.custom_js;
                                  const current = currentRaw ? (typeof currentRaw === 'string' ? JSON.parse(currentRaw) : currentRaw) : {};
                                  const newValue = e.target.value ? JSON.parse(e.target.value) : {};
                                  // الحفاظ على enable_cart و trackingPixels
                                  updateStoreSetting('custom_js', JSON.stringify({
                                    ...newValue,
                                    enable_cart: current.enable_cart,
                                    trackingPixels: current.trackingPixels
                                  }));
                                } catch {
                                  // تجاهل الأخطاء أثناء الكتابة
                                }
                              }}
                              placeholder="{}"
                              className="font-mono text-sm min-h-[100px]"
                              dir="ltr"
                            />
                          </Field>
                          
                          <Field label="Header مخصص">
                            <Textarea
                              value={storeSettings.custom_header || ''}
                              onChange={(e) => updateStoreSetting('custom_header', e.target.value)}
                              placeholder="<!-- HTML للرأس -->"
                              className="font-mono text-sm min-h-[100px]"
                              dir="ltr"
                            />
                          </Field>
                          
                          <Field label="Footer مخصص">
                            <Textarea
                              value={storeSettings.custom_footer || ''}
                              onChange={(e) => updateStoreSetting('custom_footer', e.target.value)}
                              placeholder="<!-- HTML للتذييل -->"
                              className="font-mono text-sm min-h-[100px]"
                              dir="ltr"
                            />
                          </Field>
                        </Section>
                      )}

                      <Separator />

                      <Section title="معلومات النظام">
                        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">معرف المؤسسة</span>
                            <code className="bg-background px-2 py-0.5 rounded text-xs">
                              {currentOrganization?.id || '-'}
                            </code>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">آخر تحديث</span>
                            <span className="text-xs">
                              {storeSettings?.updated_at 
                                ? new Date(storeSettings.updated_at).toLocaleString('ar-SA')
                                : '-'
                              }
                            </span>
                          </div>
                        </div>
                      </Section>
                    </div>
                  )}
                </CardContent>
              </Card>
            </main>
          </div>
        </div>
      </div>
    </POSPureLayout>
  );
};

export default UnifiedSettingsPage;
