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
import { Switch } from "@/components/ui/switch";
import CategorySelector from '../selectors/CategorySelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Save, Settings, Palette, Grid, Filter } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface CategorySectionEditorProps {
  settings: any;
  updateSetting: (key: string, value: any) => void;
  updateNestedSetting: (path: string[], value: any) => void;
  addArrayItem: (key: string, item: any) => void;
  removeArrayItem: (key: string, index: number) => void;
  updateArrayItem: (key: string, index: number, value: any) => void;
  type: 'CategorySection' | 'ProductCategories';
  onSave?: () => Promise<void>;
}

const CategorySectionEditor: React.FC<CategorySectionEditorProps> = ({
  settings,
  updateSetting,
  type,
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
        description: "تم حفظ إعدادات قسم الفئات بنجاح",
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
        <CardHeader className="pb-4 bg-gradient-to-r from-emerald-50/60 via-green-50/40 to-transparent dark:from-emerald-950/30 dark:via-green-950/20 dark:to-transparent rounded-t-lg border-b border-border/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/60 dark:to-green-900/60 p-2.5 rounded-xl shadow-sm">
                <Grid className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-foreground">تحرير قسم الفئات</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">قم بتخصيص عرض فئات المنتجات في متجرك</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="flex items-center gap-2 h-9 px-4 text-sm bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-lg hover:shadow-xl transition-all duration-300"
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
                  <Label htmlFor="category-title" className="text-sm font-medium text-foreground">العنوان الرئيسي</Label>
                  <Input
                    id="category-title"
                    value={settings.title || ''}
                    onChange={(e) => updateSetting('title', e.target.value)}
                    placeholder="عنوان قسم الفئات"
                    className="h-10 text-sm bg-background/80 dark:bg-background/60 border-border/60 hover:border-emerald-500/60 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category-description" className="text-sm font-medium text-foreground">وصف القسم</Label>
                  <Textarea
                    id="category-description"
                    value={settings.description || ''}
                    onChange={(e) => updateSetting('description', e.target.value)}
                    placeholder="وصف قسم الفئات"
                    rows={3}
                    className="resize-none text-sm bg-background/80 dark:bg-background/60 border-border/60 hover:border-emerald-500/60 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg"
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
                  <span className="font-medium text-foreground">إعدادات العرض</span>
                  <p className="text-xs text-muted-foreground mt-0.5">طريقة عرض الفئات والتصميم</p>
                </div>
                <Badge variant="outline" className="text-xs shadow-sm">اختياري</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="display-count" className="text-sm font-medium text-foreground">عدد الفئات للعرض</Label>
                    <Input
                      id="display-count"
                      type="number"
                      min="1"
                      max="12"
                      value={settings.displayCount || settings.maxCategories || 6}
                      onChange={(e) => updateSetting(
                        type === 'CategorySection' ? 'maxCategories' : 'displayCount', 
                        parseInt(e.target.value)
                      )}
                      className="h-10 text-sm"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="display-style" className="text-sm font-medium text-foreground">طريقة العرض</Label>
                    <Select
                      value={settings.displayStyle || 'cards'}
                      onValueChange={(value) => updateSetting('displayStyle', value)}
                    >
                      <SelectTrigger id="display-style" className="h-10 text-sm">
                        <SelectValue placeholder="اختر طريقة العرض" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cards">بطاقات</SelectItem>
                        <SelectItem value="grid">شبكة</SelectItem>
                        <SelectItem value="carousel">شريط متحرك</SelectItem>
                        <SelectItem value="list">قائمة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="background-style" className="text-sm font-medium text-foreground">لون الخلفية</Label>
                  <Select
                    value={settings.backgroundStyle || 'light'}
                    onValueChange={(value) => updateSetting('backgroundStyle', value)}
                  >
                    <SelectTrigger id="background-style" className="h-10 text-sm">
                      <SelectValue placeholder="اختر لون الخلفية" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">فاتح</SelectItem>
                      <SelectItem value="dark">داكن</SelectItem>
                      <SelectItem value="muted">هادئ</SelectItem>
                      <SelectItem value="color">ملون</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border border-border/60 rounded-lg bg-muted/20 dark:bg-muted/10">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="show-description" className="text-sm font-medium cursor-pointer">إظهار وصف الفئات</Label>
                    </div>
                    <Switch
                      id="show-description"
                      checked={!!settings.showDescription}
                      onCheckedChange={(checked) => updateSetting('showDescription', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border border-border/60 rounded-lg bg-muted/20 dark:bg-muted/10">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="show-product-count" className="text-sm font-medium cursor-pointer">إظهار عدد المنتجات</Label>
                    </div>
                    <Switch
                      id="show-product-count"
                      checked={!!settings.showProductCount}
                      onCheckedChange={(checked) => updateSetting('showProductCount', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border border-border/60 rounded-lg bg-muted/20 dark:bg-muted/10">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="enable-view-all" className="text-sm font-medium cursor-pointer">تفعيل زر "عرض الكل"</Label>
                    </div>
                    <Switch
                      id="enable-view-all"
                      checked={!!settings.enableViewAll}
                      onCheckedChange={(checked) => updateSetting('enableViewAll', checked)}
                    />
                  </div>
                </div>
              </div>
            </AccordionContent>
          </Card>
        </AccordionItem>
        
        <AccordionItem value="selection" className="border-0">
          <Card className="border-border/50 shadow-lg dark:shadow-2xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm overflow-hidden">
            <AccordionTrigger className="px-6 py-4 hover:bg-muted/30 dark:hover:bg-muted/20 transition-all duration-300 [&[data-state=open]]:bg-muted/40 dark:[&[data-state=open]]:bg-muted/25">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/60 dark:to-orange-900/60 p-2 rounded-xl shadow-sm">
                  <Filter className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="text-left">
                  <span className="font-medium text-foreground">طريقة اختيار الفئات</span>
                  <p className="text-xs text-muted-foreground mt-0.5">كيفية اختيار الفئات للعرض</p>
                </div>
                <Badge variant="outline" className="text-xs shadow-sm">اختياري</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="selection-method" className="text-sm font-medium text-foreground">طريقة الاختيار</Label>
                  <Select
                    value={settings.selectionMethod || 'random'}
                    onValueChange={(value) => updateSetting('selectionMethod', value)}
                  >
                    <SelectTrigger id="selection-method" className="h-10 text-sm">
                      <SelectValue placeholder="اختر طريقة الاختيار" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="random">عشوائي</SelectItem>
                      <SelectItem value="manual">اختيار يدوي</SelectItem>
                      <SelectItem value="popular">الأكثر شعبية</SelectItem>
                      <SelectItem value="newest">الأحدث</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {settings.selectionMethod === 'manual' && (
                  <Card className="border border-border/60 bg-muted/20 dark:bg-muted/10">
                    <CardContent className="p-4">
                      <CategorySelector 
                        selectedCategories={settings.selectedCategories || []}
                        onChange={(categories) => updateSetting('selectedCategories', categories)}
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
              className="flex items-center gap-2 px-6 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-lg hover:shadow-xl transition-all duration-300"
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

export default CategorySectionEditor;
