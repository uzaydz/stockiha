import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash, Info } from 'lucide-react';
import ImageUploader from '@/components/ui/ImageUploader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AboutEditorProps {
  settings: any;
  updateSetting: (key: string, value: any) => void;
  updateNestedSetting: (path: string[], value: any) => void;
  addArrayItem: (key: string, item: any) => void;
  removeArrayItem: (key: string, index: number) => void;
  updateArrayItem: (key: string, index: number, value: any) => void;
}

const AboutEditor: React.FC<AboutEditorProps> = ({
  settings,
  updateSetting,
  updateNestedSetting,
}) => {
  const [activeTab, setActiveTab] = useState("content");

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
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="content">المحتوى الرئيسي</TabsTrigger>
          <TabsTrigger value="info">معلومات المتجر</TabsTrigger>
          <TabsTrigger value="features">المميزات</TabsTrigger>
        </TabsList>
        
        <TabsContent value="content" className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="about-title" className="text-xs font-medium">العنوان الرئيسي</Label>
            <Input
              id="about-title"
              value={settings.title || 'عن متجرنا'}
              onChange={(e) => updateSetting('title', e.target.value)}
              placeholder="عنوان قسم عن المتجر"
              className="h-9"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="about-subtitle" className="text-xs font-medium">العنوان الفرعي</Label>
            <Input
              id="about-subtitle"
              value={settings.subtitle || 'متجر إلكترونيات وتقنية متميز'}
              onChange={(e) => updateSetting('subtitle', e.target.value)}
              placeholder="العنوان الفرعي"
              className="h-9"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="about-description" className="text-xs font-medium">الوصف</Label>
            <Textarea
              id="about-description"
              value={settings.description || ''}
              onChange={(e) => updateSetting('description', e.target.value)}
              placeholder="وصف عن المتجر"
              rows={4}
              className="resize-none text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              يمكنك استخدام علامة السطر الجديد (\n) لإنشاء فقرات متعددة.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="about-image" className="text-xs font-medium">صورة القسم</Label>
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
        </TabsContent>
        
        <TabsContent value="info" className="space-y-6 pt-4">
          <div className="bg-muted/30 p-3 rounded-md">
            <h3 className="text-sm font-medium flex items-center gap-2 mb-1">
              <Info className="h-4 w-4 text-primary" />
              معلومات إحصائية عن المتجر
            </h3>
            <p className="text-xs text-muted-foreground">
              هذه المعلومات تُستخدم لعرض الإحصائيات عن متجرك للزوار. قم بتعبئة المعلومات الصحيحة لزيادة ثقة العملاء.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="year-founded" className="text-xs font-medium">سنة التأسيس</Label>
              <Input
                id="year-founded"
                type="number"
                min="1900"
                max={new Date().getFullYear()}
                value={storeInfo.yearFounded || new Date().getFullYear()}
                onChange={(e) => updateStoreInfo('yearFounded', parseInt(e.target.value))}
                className="h-9"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="customers-count" className="text-xs font-medium">عدد العملاء</Label>
              <Input
                id="customers-count"
                type="number"
                min="0"
                value={storeInfo.customersCount || 0}
                onChange={(e) => updateStoreInfo('customersCount', parseInt(e.target.value))}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">
                سيتم عرضه بصيغة "عميل سعيد +"
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="products-count" className="text-xs font-medium">عدد المنتجات</Label>
              <Input
                id="products-count"
                type="number"
                min="0"
                value={storeInfo.productsCount || 0}
                onChange={(e) => updateStoreInfo('productsCount', parseInt(e.target.value))}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">
                سيتم عرضه بصيغة "منتج متنوع +"
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="branches" className="text-xs font-medium">عدد الفروع</Label>
              <Input
                id="branches"
                type="number"
                min="0"
                value={storeInfo.branches || 0}
                onChange={(e) => updateStoreInfo('branches', parseInt(e.target.value))}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">
                سيتم عرضه بصيغة "فروع في الجزائر"
              </p>
            </div>
          </div>
          
          <div className="mt-2 pt-2 border-t">
            <h4 className="text-sm font-medium mb-2">معاينة الإحصائيات</h4>
            <div className="grid grid-cols-2 gap-3">
              {storeInfo.yearFounded > 0 && (
                <Card className="overflow-hidden">
                  <CardContent className="p-3">
                    <span className="text-lg font-bold text-primary">{storeInfo.yearFounded}</span>
                    <p className="text-xs text-muted-foreground mt-1">سنة التأسيس</p>
                  </CardContent>
                </Card>
              )}
              
              {storeInfo.customersCount > 0 && (
                <Card className="overflow-hidden">
                  <CardContent className="p-3">
                    <span className="text-lg font-bold text-primary">{storeInfo.customersCount}+</span>
                    <p className="text-xs text-muted-foreground mt-1">عميل سعيد</p>
                  </CardContent>
                </Card>
              )}
              
              {storeInfo.productsCount > 0 && (
                <Card className="overflow-hidden">
                  <CardContent className="p-3">
                    <span className="text-lg font-bold text-primary">{storeInfo.productsCount}+</span>
                    <p className="text-xs text-muted-foreground mt-1">منتج متنوع</p>
                  </CardContent>
                </Card>
              )}
              
              {storeInfo.branches > 0 && (
                <Card className="overflow-hidden">
                  <CardContent className="p-3">
                    <span className="text-lg font-bold text-primary">{storeInfo.branches}</span>
                    <p className="text-xs text-muted-foreground mt-1">فروع في الجزائر</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="features" className="space-y-4 pt-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center mb-2">
              <Label className="text-xs font-medium">مميزات المتجر</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const features = [...(settings.features || [])];
                        features.push('ميزة جديدة');
                        updateSetting('features', features);
                      }}
                      className="flex items-center gap-1 h-7 text-xs"
                    >
                      <Plus className="h-3 w-3" />
                      <span>إضافة ميزة</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">إضافة ميزة جديدة لمتجرك تظهر في قسم عن المتجر</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {settings.features && settings.features.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto rounded-md border p-2">
                {settings.features.map((feature: string, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={feature}
                      onChange={(e) => {
                        const features = [...settings.features];
                        features[index] = e.target.value;
                        updateSetting('features', features);
                      }}
                      className="h-8 text-xs"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        const features = [...settings.features];
                        features.splice(index, 1);
                        updateSetting('features', features);
                      }}
                      className="h-7 w-7 text-destructive"
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-dashed rounded-md p-3 text-center text-muted-foreground text-sm">
                لا توجد ميزات. أضف ميزات لعرضها للعملاء.
              </div>
            )}
            
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">معاينة الميزات</h4>
              {settings.features && settings.features.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-muted/20 p-3 rounded-md">
                  {settings.features.map((feature: string, index: number) => (
                    <div key={index} className="flex items-center">
                      <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                        <Plus className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground text-sm p-4">
                  أضف ميزات لرؤية معاينة لها هنا
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AboutEditor; 