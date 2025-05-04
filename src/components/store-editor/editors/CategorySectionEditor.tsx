import React from 'react';
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

interface CategorySectionEditorProps {
  settings: any;
  updateSetting: (key: string, value: any) => void;
  updateNestedSetting: (path: string[], value: any) => void;
  addArrayItem: (key: string, item: any) => void;
  removeArrayItem: (key: string, index: number) => void;
  updateArrayItem: (key: string, index: number, value: any) => void;
  type: 'CategorySection' | 'ProductCategories';
}

const CategorySectionEditor: React.FC<CategorySectionEditorProps> = ({
  settings,
  updateSetting,
  type,
}) => {
  return (
    <div className="space-y-6">
      <Accordion type="single" collapsible defaultValue="content" className="w-full">
        <AccordionItem value="content" className="border rounded-lg mb-3 overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 p-1.5 rounded-md">
                <div className="w-3.5 h-3.5 text-primary">Aa</div>
              </div>
              <span>المحتوى الرئيسي</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category-title" className="text-xs font-medium">العنوان الرئيسي</Label>
                <Input
                  id="category-title"
                  value={settings.title || ''}
                  onChange={(e) => updateSetting('title', e.target.value)}
                  placeholder="عنوان قسم الفئات"
                  className="h-9"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category-description" className="text-xs font-medium">وصف القسم</Label>
                <Textarea
                  id="category-description"
                  value={settings.description || ''}
                  onChange={(e) => updateSetting('description', e.target.value)}
                  placeholder="وصف قسم الفئات"
                  rows={3}
                  className="resize-none text-sm"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="display" className="border rounded-lg mb-3 overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <div className="bg-emerald-50 p-1.5 rounded-md">
                <div className="w-3.5 h-3.5 text-emerald-600">📋</div>
              </div>
              <span>إعدادات العرض</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="display-count" className="text-xs font-medium">عدد الفئات للعرض</Label>
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
                  className="h-9"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="display-style" className="text-xs font-medium">طريقة العرض</Label>
                <Select
                  value={settings.displayStyle || 'cards'}
                  onValueChange={(value) => updateSetting('displayStyle', value)}
                >
                  <SelectTrigger id="display-style" className="h-9">
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
              
              <div className="space-y-2">
                <Label htmlFor="background-style" className="text-xs font-medium">لون الخلفية</Label>
                <Select
                  value={settings.backgroundStyle || 'light'}
                  onValueChange={(value) => updateSetting('backgroundStyle', value)}
                >
                  <SelectTrigger id="background-style" className="h-9">
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
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="show-description" className="text-xs cursor-pointer">إظهار وصف الفئات</Label>
                  <Switch
                    id="show-description"
                    checked={!!settings.showDescription}
                    onCheckedChange={(checked) => updateSetting('showDescription', checked)}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="show-product-count" className="text-xs cursor-pointer">إظهار عدد المنتجات</Label>
                  <Switch
                    id="show-product-count"
                    checked={!!settings.showProductCount}
                    onCheckedChange={(checked) => updateSetting('showProductCount', checked)}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="enable-view-all" className="text-xs cursor-pointer">تفعيل زر "عرض الكل"</Label>
                  <Switch
                    id="enable-view-all"
                    checked={!!settings.enableViewAll}
                    onCheckedChange={(checked) => updateSetting('enableViewAll', checked)}
                  />
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="selection" className="border rounded-lg mb-3 overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <div className="bg-blue-50 p-1.5 rounded-md">
                <div className="w-3.5 h-3.5 text-blue-600">🔍</div>
              </div>
              <span>طريقة اختيار الفئات</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="selection-method" className="text-xs font-medium">طريقة الاختيار</Label>
                <Select
                  value={settings.selectionMethod || 'random'}
                  onValueChange={(value) => updateSetting('selectionMethod', value)}
                >
                  <SelectTrigger id="selection-method" className="h-9">
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
                <CategorySelector 
                  selectedCategories={settings.selectedCategories || []}
                  onChange={(categories) => updateSetting('selectedCategories', categories)}
                />
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default CategorySectionEditor; 