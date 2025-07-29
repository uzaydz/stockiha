import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ProductSelector from '../selectors/ProductSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Save, Settings, Palette, Star, ShoppingBag } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface FeaturedProductsEditorProps {
  settings: any;
  updateSetting: (key: string, value: any) => void;
  updateNestedSetting: (path: string[], value: any) => void;
  addArrayItem: (key: string, item: any) => void;
  removeArrayItem: (key: string, index: number) => void;
  updateArrayItem: (key: string, index: number, value: any) => void;
  onSave?: () => Promise<void>;
}

const FeaturedProductsEditor: React.FC<FeaturedProductsEditorProps> = ({
  settings,
  updateSetting,
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
        description: "تم حفظ إعدادات المنتجات المميزة بنجاح",
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
  
  return (
    <div className="space-y-6">
      {/* Header with Save Button */}
      <Card className="border-border/50 shadow-lg dark:shadow-2xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-4 bg-gradient-to-r from-amber-50/60 via-yellow-50/40 to-transparent dark:from-amber-950/30 dark:via-yellow-950/20 dark:to-transparent rounded-t-lg border-b border-border/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/60 dark:to-yellow-900/60 p-2.5 rounded-xl shadow-sm">
                <Star className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-foreground">تحرير المنتجات المميزة</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">قم بتخصيص عرض المنتجات المميزة في متجرك</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="flex items-center gap-2 h-9 px-4 text-sm bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 shadow-lg hover:shadow-xl transition-all duration-300"
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
                  <p className="text-xs text-muted-foreground mt-0.5">العنوان والوصف</p>
                </div>
                <Badge variant="secondary" className="text-xs shadow-sm">مطلوب</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="featured-title" className="text-sm font-medium text-foreground">عنوان القسم</Label>
                  <Input
                    id="featured-title"
                    value={settings.title || ''}
                    onChange={(e) => updateSetting('title', e.target.value)}
                    placeholder="عنوان قسم المنتجات المميزة"
                    className="h-10 text-sm bg-background/80 dark:bg-background/60 border-border/60 hover:border-amber-500/60 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="featured-description" className="text-sm font-medium text-foreground">وصف القسم</Label>
                  <Textarea
                    id="featured-description"
                    value={settings.description || ''}
                    onChange={(e) => updateSetting('description', e.target.value)}
                    placeholder="وصف قسم المنتجات المميزة"
                    rows={3}
                    className="resize-none text-sm bg-background/80 dark:bg-background/60 border-border/60 hover:border-amber-500/60 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg"
                  />
                </div>
              </div>
            </AccordionContent>
          </Card>
        </AccordionItem>

        <AccordionItem value="display" className="border-0">
          <Card className="border-border/50 shadow-lg dark:shadow-2xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm overflow-hidden">
            <AccordionTrigger className="px-6 py-4 hover:bg-muted/30 dark:hover:bg-muted/20 transition-all duration-300 [&[data-state=open]]:bg-muted/40 dark:[&[data-state=open]]:bg-muted/25">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/60 dark:to-indigo-900/60 p-2 rounded-xl shadow-sm">
                  <Palette className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-left">
                  <span className="font-medium text-foreground">خيارات العرض</span>
                  <p className="text-xs text-muted-foreground mt-0.5">طريقة عرض المنتجات والتصميم</p>
                </div>
                <Badge variant="outline" className="text-xs shadow-sm">اختياري</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="display-count" className="text-sm font-medium text-foreground">عدد المنتجات للعرض</Label>
                    <Select
                      value={String(settings.displayCount || 4)}
                      onValueChange={(value) => updateSetting('displayCount', parseInt(value))}
                    >
                      <SelectTrigger id="display-count" className="h-10 text-sm">
                        <SelectValue placeholder="اختر عدد المنتجات" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 منتج</SelectItem>
                        <SelectItem value="3">3 منتجات</SelectItem>
                        <SelectItem value="4">4 منتجات</SelectItem>
                        <SelectItem value="6">6 منتجات</SelectItem>
                        <SelectItem value="8">8 منتجات</SelectItem>
                        <SelectItem value="12">12 منتج</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="display-type" className="text-sm font-medium text-foreground">طريقة العرض</Label>
                    <Select
                      value={settings.displayType || 'grid'}
                      onValueChange={(value) => updateSetting('displayType', value)}
                    >
                      <SelectTrigger id="display-type" className="h-10 text-sm">
                        <SelectValue placeholder="اختر طريقة العرض" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="grid">شبكة</SelectItem>
                        <SelectItem value="carousel">شريط متحرك</SelectItem>
                        <SelectItem value="list">قائمة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </Card>
        </AccordionItem>
        
        <AccordionItem value="products" className="border-0">
          <Card className="border-border/50 shadow-lg dark:shadow-2xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm overflow-hidden">
            <AccordionTrigger className="px-6 py-4 hover:bg-muted/30 dark:hover:bg-muted/20 transition-all duration-300 [&[data-state=open]]:bg-muted/40 dark:[&[data-state=open]]:bg-muted/25">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/60 dark:to-green-900/60 p-2 rounded-xl shadow-sm">
                  <ShoppingBag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-left">
                  <span className="font-medium text-foreground">اختيار المنتجات</span>
                  <p className="text-xs text-muted-foreground mt-0.5">كيفية اختيار المنتجات للعرض</p>
                </div>
                <Badge variant="outline" className="text-xs shadow-sm">مطلوب</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="selection-method" className="text-sm font-medium text-foreground">طريقة اختيار المنتجات</Label>
                  <Select
                    value={settings.selectionMethod || 'automatic'}
                    onValueChange={(value) => {
                      updateSetting('selectionMethod', value);
                      
                      // إذا تم تغيير الطريقة إلى تلقائي، امسح المنتجات المختارة يدوياً
                      if (value === 'automatic' && settings.selectedProducts && settings.selectedProducts.length > 0) {
                        updateSetting('selectedProducts', []);
                      }
                      
                      // إذا تم تغيير الطريقة إلى يدوي وليس هناك منتجات محددة، تهيئة مصفوفة فارغة
                      if (value === 'manual' && !settings.selectedProducts) {
                        updateSetting('selectedProducts', []);
                      }
                    }}
                  >
                    <SelectTrigger id="selection-method" className="h-10 text-sm">
                      <SelectValue placeholder="اختر طريقة الاختيار" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="automatic">تلقائي (حسب المعيار)</SelectItem>
                      <SelectItem value="manual">يدوي (اختيار محدد)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {settings.selectionMethod !== 'manual' && (
                  <div className="space-y-2">
                    <Label htmlFor="selection-criteria" className="text-sm font-medium text-foreground">معيار اختيار المنتجات</Label>
                    <Select
                      value={settings.selectionCriteria || 'featured'}
                      onValueChange={(value) => updateSetting('selectionCriteria', value)}
                    >
                      <SelectTrigger id="selection-criteria" className="h-10 text-sm">
                        <SelectValue placeholder="اختر معيار الاختيار" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="featured">المنتجات المميزة</SelectItem>
                        <SelectItem value="best_selling">الأكثر مبيعاً</SelectItem>
                        <SelectItem value="newest">المنتجات الجديدة</SelectItem>
                        <SelectItem value="discounted">المنتجات المخفضة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {settings.selectionMethod === 'manual' && (
                  <Card className="border border-border/60 bg-muted/20 dark:bg-muted/10">
                    <CardContent className="p-4">
                      <ProductSelector 
                        selectedProducts={settings.selectedProducts || []}
                        onChange={(products) => {
                          updateSetting('selectedProducts', products);
                        }}
                      />
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
              className="flex items-center gap-2 px-6 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 shadow-lg hover:shadow-xl transition-all duration-300"
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

export default FeaturedProductsEditor;
