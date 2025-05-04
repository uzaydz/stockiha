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
import ProductSelector from '../selectors/ProductSelector';

interface FeaturedProductsEditorProps {
  settings: any;
  updateSetting: (key: string, value: any) => void;
  updateNestedSetting: (path: string[], value: any) => void;
  addArrayItem: (key: string, item: any) => void;
  removeArrayItem: (key: string, index: number) => void;
  updateArrayItem: (key: string, index: number, value: any) => void;
}

const FeaturedProductsEditor: React.FC<FeaturedProductsEditorProps> = ({
  settings,
  updateSetting,
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
                <Label htmlFor="featured-title" className="text-xs font-medium">عنوان القسم</Label>
                <Input
                  id="featured-title"
                  value={settings.title || ''}
                  onChange={(e) => updateSetting('title', e.target.value)}
                  placeholder="عنوان قسم المنتجات المميزة"
                  className="h-9"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="featured-description" className="text-xs font-medium">وصف القسم</Label>
                <Textarea
                  id="featured-description"
                  value={settings.description || ''}
                  onChange={(e) => updateSetting('description', e.target.value)}
                  placeholder="وصف قسم المنتجات المميزة"
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
              <div className="bg-blue-50 p-1.5 rounded-md">
                <div className="w-3.5 h-3.5 text-blue-600">#</div>
              </div>
              <span>خيارات العرض</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="display-count" className="text-xs font-medium">عدد المنتجات للعرض</Label>
                <Select
                  value={String(settings.displayCount || 4)}
                  onValueChange={(value) => updateSetting('displayCount', parseInt(value))}
                >
                  <SelectTrigger id="display-count" className="h-9">
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
                <Label htmlFor="display-type" className="text-xs font-medium">طريقة العرض</Label>
                <Select
                  value={settings.displayType || 'grid'}
                  onValueChange={(value) => updateSetting('displayType', value)}
                >
                  <SelectTrigger id="display-type" className="h-9">
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
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="products" className="border rounded-lg mb-3 overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <div className="bg-green-50 p-1.5 rounded-md">
                <div className="w-3.5 h-3.5 text-green-600">#</div>
              </div>
              <span>اختيار المنتجات</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="selection-method" className="text-xs font-medium">طريقة اختيار المنتجات</Label>
                <Select
                  value={settings.selectionMethod || 'automatic'}
                  onValueChange={(value) => updateSetting('selectionMethod', value)}
                >
                  <SelectTrigger id="selection-method" className="h-9">
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
                  <Label htmlFor="selection-criteria" className="text-xs font-medium">معيار اختيار المنتجات</Label>
                  <Select
                    value={settings.selectionCriteria || 'featured'}
                    onValueChange={(value) => updateSetting('selectionCriteria', value)}
                  >
                    <SelectTrigger id="selection-criteria" className="h-9">
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
                <ProductSelector 
                  selectedProducts={settings.selectedProducts || []}
                  onChange={(products) => updateSetting('selectedProducts', products)}
                />
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default FeaturedProductsEditor; 