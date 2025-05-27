import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash, Info, Save, Settings, BarChart3, Star, Image as ImageIcon } from 'lucide-react';
import ImageUploader from '@/components/ui/ImageUploader';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';

interface AboutEditorProps {
  settings: any;
  updateSetting: (key: string, value: any) => void;
  updateNestedSetting: (path: string[], value: any) => void;
  addArrayItem: (key: string, item: any) => void;
  removeArrayItem: (key: string, index: number) => void;
  updateArrayItem: (key: string, index: number, value: any) => void;
  onSave?: () => Promise<void>;
}

const AboutEditor: React.FC<AboutEditorProps> = ({
  settings,
  updateSetting,
  updateNestedSetting,
  onSave
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // حفظ التغييرات
  const handleSaveChanges = async () => {
    if (!onSave) {
      toast({
        title: "خطأ",
        description: "دالة الحفظ غير متوفرة",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave();
      
      toast({
        title: "تم الحفظ بنجاح",
        description: "تم حفظ إعدادات قسم عن متجرنا بنجاح",
      });
    } catch (error) {
      toast({
        title: "خطأ في الحفظ",
        description: "حدث خطأ أثناء حفظ التغييرات",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // تعريف إعدادات المؤسسة الافتراضية إذا لم تكن موجودة
  const storeInfo = settings.storeInfo || {
    yearFounded: new Date().getFullYear(),
    customersCount: 0,
    productsCount: 0,
    branches: 0
  };

  // تحديث بيانات المؤسسة
  const updateStoreInfo = (key: string, value: any) => {
    const updatedStoreInfo = {
      ...storeInfo,
      [key]: value
    };
    updateSetting('storeInfo', updatedStoreInfo);
  };

  return (
    <div className="space-y-6">
      {/* Header with Save Button */}
      <Card className="border-border/50 shadow-lg dark:shadow-2xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-4 bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-transparent dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-transparent rounded-t-lg border-b border-border/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/60 dark:to-indigo-900/60 p-2.5 rounded-xl shadow-sm">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-foreground">تحرير قسم عن متجرنا</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">قم بتخصيص معلومات وقصة متجرك</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="flex items-center gap-2 h-9 px-4 text-sm bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Editor Sections */}
      <Accordion type="single" collapsible defaultValue="content" className="w-full space-y-4">
        <AccordionItem value="content" className="border-0">
          <Card className="border-border/50 shadow-lg dark:shadow-2xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm overflow-hidden">
            <AccordionTrigger className="px-6 py-4 hover:bg-muted/30 dark:hover:bg-muted/20 transition-all duration-300 [&[data-state=open]]:bg-muted/40 dark:[&[data-state=open]]:bg-muted/25">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/15 p-2 rounded-xl shadow-sm">
                  <Settings className="w-4 h-4 text-primary dark:text-primary-foreground" />
                </div>
                <div className="text-left">
                  <span className="font-medium text-foreground">المحتوى الرئيسي</span>
                  <p className="text-xs text-muted-foreground mt-0.5">العنوان والوصف والصورة</p>
                </div>
                <Badge variant="secondary" className="text-xs shadow-sm">مطلوب</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="about-title" className="text-sm font-medium text-foreground">العنوان الرئيسي</Label>
                  <Input
                    id="about-title"
                    value={settings.title || 'عن متجرنا'}
                    onChange={(e) => updateSetting('title', e.target.value)}
                    placeholder="عنوان قسم عن المتجر"
                    className="h-10 text-sm bg-background/80 dark:bg-background/60 border-border/60 hover:border-blue-500/60 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="about-subtitle" className="text-sm font-medium text-foreground">العنوان الفرعي</Label>
                  <Input
                    id="about-subtitle"
                    value={settings.subtitle || 'متجر إلكترونيات وتقنية متميز'}
                    onChange={(e) => updateSetting('subtitle', e.target.value)}
                    placeholder="العنوان الفرعي"
                    className="h-10 text-sm bg-background/80 dark:bg-background/60 border-border/60 hover:border-blue-500/60 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="about-description" className="text-sm font-medium text-foreground">الوصف</Label>
                  <Textarea
                    id="about-description"
                    value={settings.description || ''}
                    onChange={(e) => updateSetting('description', e.target.value)}
                    placeholder="وصف عن المتجر"
                    rows={4}
                    className="resize-none text-sm bg-background/80 dark:bg-background/60 border-border/60 hover:border-blue-500/60 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    يمكنك استخدام علامة السطر الجديد (\n) لإنشاء فقرات متعددة.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="about-image" className="text-sm font-medium text-foreground flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    صورة القسم
                  </Label>
                  <ImageUploader
                    imageUrl={settings.image || ''}
                    onImageUploaded={(url) => updateSetting('image', url)}
                    folder="about-images"
                    maxSizeInMB={5}
                    label="صورة قسم عن المتجر"
                    aspectRatio="16:9"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    يُفضل استخدام صورة عالية الجودة بنسبة عرض إلى ارتفاع 16:9 وحجم لا يقل عن 1200×675 بكسل.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </Card>
        </AccordionItem>
        
        <AccordionItem value="info" className="border-0">
          <Card className="border-border/50 shadow-lg dark:shadow-2xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm overflow-hidden">
            <AccordionTrigger className="px-6 py-4 hover:bg-muted/30 dark:hover:bg-muted/20 transition-all duration-300 [&[data-state=open]]:bg-muted/40 dark:[&[data-state=open]]:bg-muted/25">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/60 dark:to-green-900/60 p-2 rounded-xl shadow-sm">
                  <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-left">
                  <span className="font-medium text-foreground">معلومات المتجر</span>
                  <p className="text-xs text-muted-foreground mt-0.5">الإحصائيات والأرقام</p>
                </div>
                <Badge variant="outline" className="text-xs shadow-sm">اختياري</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
              <div className="space-y-5">
                <Card className="border border-border/60 bg-gradient-to-r from-muted/40 to-muted/20 dark:from-muted/20 dark:to-muted/10 backdrop-blur-sm shadow-sm">
                  <CardContent className="p-4">
                    <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
                      <Info className="h-4 w-4 text-primary" />
                      معلومات إحصائية عن المتجر
                    </h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      هذه المعلومات تُستخدم لعرض الإحصائيات عن متجرك للزوار. قم بتعبئة المعلومات الصحيحة لزيادة ثقة العملاء.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="year-founded" className="text-sm font-medium text-foreground">سنة التأسيس</Label>
                        <Input
                          id="year-founded"
                          type="number"
                          min="1900"
                          max={new Date().getFullYear()}
                          value={storeInfo.yearFounded || new Date().getFullYear()}
                          onChange={(e) => updateStoreInfo('yearFounded', parseInt(e.target.value))}
                          className="h-10 text-sm"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="customers-count" className="text-sm font-medium text-foreground">عدد العملاء</Label>
                        <Input
                          id="customers-count"
                          type="number"
                          min="0"
                          value={storeInfo.customersCount || 0}
                          onChange={(e) => updateStoreInfo('customersCount', parseInt(e.target.value))}
                          className="h-10 text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                          سيتم عرضه بصيغة "عميل سعيد +"
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="products-count" className="text-sm font-medium text-foreground">عدد المنتجات</Label>
                        <Input
                          id="products-count"
                          type="number"
                          min="0"
                          value={storeInfo.productsCount || 0}
                          onChange={(e) => updateStoreInfo('productsCount', parseInt(e.target.value))}
                          className="h-10 text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                          سيتم عرضه بصيغة "منتج متنوع +"
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="branches" className="text-sm font-medium text-foreground">عدد الفروع</Label>
                        <Input
                          id="branches"
                          type="number"
                          min="0"
                          value={storeInfo.branches || 0}
                          onChange={(e) => updateStoreInfo('branches', parseInt(e.target.value))}
                          className="h-10 text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                          سيتم عرضه بصيغة "فروع في الجزائر"
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </AccordionContent>
          </Card>
        </AccordionItem>
        
        <AccordionItem value="features" className="border-0">
          <Card className="border-border/50 shadow-lg dark:shadow-2xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm overflow-hidden">
            <AccordionTrigger className="px-6 py-4 hover:bg-muted/30 dark:hover:bg-muted/20 transition-all duration-300 [&[data-state=open]]:bg-muted/40 dark:[&[data-state=open]]:bg-muted/25">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/60 dark:to-yellow-900/60 p-2 rounded-xl shadow-sm">
                  <Star className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="text-left">
                  <span className="font-medium text-foreground">المميزات</span>
                  <p className="text-xs text-muted-foreground mt-0.5">مميزات وخدمات المتجر</p>
                </div>
                <Badge variant="outline" className="text-xs shadow-sm">اختياري</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
              <div className="space-y-5">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium text-sm text-foreground">مميزات المتجر</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const features = [...(settings.features || [])];
                      features.push('ميزة جديدة');
                      updateSetting('features', features);
                    }}
                    className="flex items-center gap-2 h-8 px-3 text-xs border-border/60 hover:bg-gradient-to-r hover:from-amber-50/50 hover:to-yellow-50/30 dark:hover:from-amber-950/20 dark:hover:to-yellow-950/10 hover:border-amber-300/50 dark:hover:border-amber-600/30 transition-all duration-300 shadow-sm hover:shadow-md"
                  >
                    <Plus className="h-3 w-3" />
                    إضافة ميزة
                  </Button>
                </div>
                
                {settings.features && settings.features.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {settings.features.map((feature: string, index: number) => (
                      <Card key={index} className="border border-border/60 bg-gradient-to-r from-muted/30 to-muted/15 dark:from-muted/20 dark:to-muted/10 backdrop-blur-sm shadow-sm group hover:shadow-md transition-all duration-300">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2">
                            <Input
                              value={feature}
                              onChange={(e) => {
                                const features = [...settings.features];
                                features[index] = e.target.value;
                                updateSetting('features', features);
                              }}
                              className="h-8 text-sm"
                              placeholder="اكتب الميزة هنا..."
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                const features = [...settings.features];
                                features.splice(index, 1);
                                updateSetting('features', features);
                              }}
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            >
                              <Trash className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="border border-dashed border-border/60 bg-muted/20 dark:bg-muted/10">
                    <CardContent className="p-6 text-center">
                      <div className="text-muted-foreground text-sm">
                        <Star className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="font-medium mb-1">لا توجد مميزات</p>
                        <p className="text-xs">أضف مميزات لعرضها للعملاء</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </AccordionContent>
          </Card>
        </AccordionItem>
      </Accordion>

      {/* Bottom Save Button */}
      <Card className="border-border/50 shadow-lg dark:shadow-2xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              تأكد من حفظ التغييرات قبل مغادرة الصفحة
            </div>
            <Button
              onClick={handleSaveChanges}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'جاري الحفظ...' : 'حفظ جميع التغييرات'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AboutEditor;
