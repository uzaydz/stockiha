import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { 
  Cog, 
  Code2, 
  FileText, 
  Search, 
  Globe, 
  Shield,
  Database,
  Zap,
  AlertTriangle,
  Info,
  Copy,
  Check
} from 'lucide-react';
import { OrganizationSettings } from '@/types/settings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AdvancedStoreSettingsProps {
  settings: OrganizationSettings;
  updateSetting: (key: keyof OrganizationSettings, value: any) => void;
}

const AdvancedStoreSettings = ({ settings, updateSetting }: AdvancedStoreSettingsProps) => {
  const { toast } = useToast();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // نسخ النص إلى الحافظة
  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
      toast({
        title: 'تم النسخ',
        description: `تم نسخ ${fieldName} إلى الحافظة`,
      });
    } catch (error) {
      toast({
        title: 'خطأ في النسخ',
        description: 'فشل في نسخ النص إلى الحافظة',
        variant: 'destructive',
      });
    }
  };

  // إعادة تعيين الإعدادات المتقدمة
  const resetAdvancedSettings = () => {
    updateSetting('custom_header', '');
    updateSetting('custom_footer', '');
    updateSetting('custom_js', '');
    updateSetting('custom_css', '');
    
    toast({
      title: 'تم إعادة التعيين',
      description: 'تم إعادة تعيين جميع الإعدادات المتقدمة',
    });
  };

  return (
    <div className="space-y-8">
      {/* تحذير مهم */}
      <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-yellow-900 dark:text-yellow-100 mb-1">
              تحذير: إعدادات متقدمة
            </p>
            <p className="text-yellow-800 dark:text-yellow-200">
              هذه الإعدادات مخصصة للمستخدمين المتقدمين. تأكد من معرفتك بما تقوم به قبل التعديل، حيث أن الأخطاء قد تؤثر على عمل المتجر.
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="seo" className="w-full">
        <TabsList className="grid grid-cols-4 w-full h-12">
          <TabsTrigger value="seo" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            تحسين SEO
          </TabsTrigger>
          <TabsTrigger value="code" className="flex items-center gap-2">
            <Code2 className="h-4 w-4" />
            أكواد مخصصة
          </TabsTrigger>
          <TabsTrigger value="headers" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Header & Footer
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            إعدادات النظام
          </TabsTrigger>
        </TabsList>

        {/* تحسين محركات البحث */}
        <TabsContent value="seo" className="space-y-6">
          <Card className="border-2 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
              <CardTitle className="flex items-center gap-3 text-xl">
                <Search className="h-6 w-6 text-primary" />
                تحسين محركات البحث (SEO)
              </CardTitle>
              <CardDescription className="text-base">
                إعدادات تحسين ظهور متجرك في نتائج البحث
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Meta Tags */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Meta Description</Label>
                <Textarea
                  value={settings.custom_header?.includes('meta name="description"') 
                    ? settings.custom_header.match(/content="([^"]*)"/) ?.[1] || ''
                    : ''
                  }
                  onChange={(e) => {
                    const metaTag = `<meta name="description" content="${e.target.value}" />`;
                    updateSetting('custom_header', metaTag);
                  }}
                  placeholder="وصف مختصر لمتجرك يظهر في نتائج البحث (160 حرف كحد أقصى)"
                  className="min-h-[80px]"
                  maxLength={160}
                />
                <p className="text-sm text-muted-foreground">
                  هذا الوصف سيظهر في نتائج البحث تحت عنوان متجرك
                </p>
              </div>

              {/* Keywords */}
              <div className="space-y-4">
                <Label className="text-base font-medium">الكلمات المفتاحية</Label>
                <Input
                  placeholder="متجر إلكتروني, تسوق أونلاين, منتجات عالية الجودة"
                  className="h-12"
                />
                <p className="text-sm text-muted-foreground">
                  أدخل الكلمات المفتاحية مفصولة بفواصل
                </p>
              </div>

              {/* Open Graph */}
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                      Open Graph Tags
                    </p>
                    <p className="text-blue-800 dark:text-blue-200">
                      سيتم إنشاء Open Graph tags تلقائياً بناءً على اسم المتجر والشعار والوصف المدخل أعلاه.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* الأكواد المخصصة */}
        <TabsContent value="code" className="space-y-6">
          <Card className="border-2 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
              <CardTitle className="flex items-center gap-3 text-xl">
                <Code2 className="h-6 w-6 text-primary" />
                أكواد JavaScript مخصصة
              </CardTitle>
              <CardDescription className="text-base">
                أضف أكواد JavaScript مخصصة لتعزيز وظائف متجرك
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">كود JavaScript</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(settings.custom_js || '', 'كود JavaScript')}
                    className="flex items-center gap-2"
                  >
                    {copiedField === 'كود JavaScript' ? (
                      <><Check className="h-4 w-4" /> تم النسخ</>
                    ) : (
                      <><Copy className="h-4 w-4" /> نسخ</>
                    )}
                  </Button>
                </div>
                <Textarea
                  value={settings.custom_js || ''}
                  onChange={(e) => updateSetting('custom_js', e.target.value)}
                  placeholder="// أدخل كود JavaScript المخصص هنا

// مثال: تتبع النقرات
document.addEventListener('click', function(e) {
  // كود التتبع هنا
});"
                  className="min-h-[300px] font-mono text-sm"
                  dir="ltr"
                />
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-red-900 dark:text-red-100 mb-1">
                        تحذير مهم
                      </p>
                      <p className="text-red-800 dark:text-red-200">
                        تأكد من اختبار الكود جيداً قبل الحفظ. الأكواد الخاطئة قد تؤثر على عمل المتجر.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Header & Footer مخصص */}
        <TabsContent value="headers" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Header مخصص */}
            <Card className="border-2 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30">
                <CardTitle className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary" />
                  Header مخصص
                </CardTitle>
                <CardDescription>
                  كود HTML يتم إدراجه في رأس الصفحة
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium">كود Header</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(settings.custom_header || '', 'Header')}
                      className="flex items-center gap-2"
                    >
                      {copiedField === 'Header' ? (
                        <><Check className="h-4 w-4" /> تم النسخ</>
                      ) : (
                        <><Copy className="h-4 w-4" /> نسخ</>
                      )}
                    </Button>
                  </div>
                  <Textarea
                    value={settings.custom_header || ''}
                    onChange={(e) => updateSetting('custom_header', e.target.value)}
                    placeholder="<!-- كود HTML مخصص للرأس -->
<meta name=&quot;description&quot; content=&quot;وصف متجرك&quot; />
<meta name=&quot;keywords&quot; content=&quot;كلمات مفتاحية&quot; />
<link rel=&quot;stylesheet&quot; href=&quot;custom.css&quot; />"
                    className="min-h-[200px] font-mono text-sm"
                    dir="ltr"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Footer مخصص */}
            <Card className="border-2 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30">
                <CardTitle className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary" />
                  Footer مخصص
                </CardTitle>
                <CardDescription>
                  كود HTML يتم إدراجه قبل إغلاق الصفحة
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium">كود Footer</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(settings.custom_footer || '', 'Footer')}
                      className="flex items-center gap-2"
                    >
                      {copiedField === 'Footer' ? (
                        <><Check className="h-4 w-4" /> تم النسخ</>
                      ) : (
                        <><Copy className="h-4 w-4" /> نسخ</>
                      )}
                    </Button>
                  </div>
                  <Textarea
                    value={settings.custom_footer || ''}
                    onChange={(e) => updateSetting('custom_footer', e.target.value)}
                    placeholder="<!-- كود HTML مخصص للتذييل -->\n<script>\n  // أكواد التتبع والتحليلات\n  console.log('تم تحميل الصفحة');\n</script>"
                    className="min-h-[200px] font-mono text-sm"
                    dir="ltr"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* إعدادات النظام */}
        <TabsContent value="system" className="space-y-6">
          <Card className="border-2 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-950/30 dark:to-slate-950/30">
              <CardTitle className="flex items-center gap-3 text-xl">
                <Database className="h-6 w-6 text-primary" />
                إعدادات النظام المتقدمة
              </CardTitle>
              <CardDescription className="text-base">
                إعدادات تقنية متقدمة لتحسين أداء المتجر
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* معلومات النظام */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="font-medium">معرف المؤسسة</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={settings.organization_id}
                      readOnly
                      className="bg-muted font-mono"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(settings.organization_id, 'معرف المؤسسة')}
                    >
                      {copiedField === 'معرف المؤسسة' ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="font-medium">تاريخ آخر تحديث</Label>
                  <Input
                    value={settings.updated_at ? new Date(settings.updated_at).toLocaleString('ar-SA') : 'غير محدد'}
                    readOnly
                    className="bg-muted"
                  />
                </div>
              </div>

              {/* أدوات النظام */}
              <div className="border-t pt-6">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  أدوات النظام
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      // مسح الكاش
                      localStorage.clear();
                      sessionStorage.clear();
                      toast({
                        title: 'تم مسح الكاش',
                        description: 'تم مسح جميع البيانات المحفوظة مؤقتاً',
                      });
                    }}
                    className="flex items-center gap-2"
                  >
                    <Database className="h-4 w-4" />
                    مسح الكاش
                  </Button>

                  <Button
                    variant="outline"
                    onClick={resetAdvancedSettings}
                    className="flex items-center gap-2 text-red-600 hover:text-red-700"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    إعادة تعيين الإعدادات
                  </Button>
                </div>
              </div>

              {/* تصدير/استيراد الإعدادات */}
              <div className="border-t pt-6">
                <h4 className="font-semibold mb-4">تصدير/استيراد الإعدادات</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const settingsData = JSON.stringify(settings, null, 2);
                      const blob = new Blob([settingsData], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `store-settings-${Date.now()}.json`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      
                      toast({
                        title: 'تم التصدير',
                        description: 'تم تصدير إعدادات المتجر بنجاح',
                      });
                    }}
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    تصدير الإعدادات
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.json';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (e) => {
                            try {
                              const importedSettings = JSON.parse(e.target?.result as string);
                              // تطبيق الإعدادات المستوردة
                              Object.keys(importedSettings).forEach(key => {
                                if (key !== 'id' && key !== 'organization_id') {
                                  updateSetting(key as keyof OrganizationSettings, importedSettings[key]);
                                }
                              });
                              toast({
                                title: 'تم الاستيراد',
                                description: 'تم استيراد إعدادات المتجر بنجاح',
                              });
                            } catch (error) {
                              toast({
                                title: 'خطأ في الاستيراد',
                                description: 'فشل في قراءة ملف الإعدادات',
                                variant: 'destructive',
                              });
                            }
                          };
                          reader.readAsText(file);
                        }
                      };
                      input.click();
                    }}
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    استيراد الإعدادات
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedStoreSettings;
