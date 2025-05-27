import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { LandingPageComponent } from './types';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion';
import { 
  Card, 
  CardContent 
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutGrid, 
  Settings, 
  Palette, 
  List, 
  Plus, 
  Trash2, 
  Copy,
  MoveVertical,
  Layers,
  SlidersHorizontal,
  Image as ImageIcon
} from 'lucide-react';
import ProductBenefitItemEditor from './product-benefits/ProductBenefitItemEditor';

interface ProductBenefitsComponentEditorProps {
  component: LandingPageComponent;
  onUpdate: (component: LandingPageComponent) => void;
}

const ProductBenefitsComponentEditor: React.FC<ProductBenefitsComponentEditorProps> = ({
  component,
  onUpdate
}) => {
  const { settings } = component;
  const [activeTab, setActiveTab] = useState('general');
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  
  // توليد رابط صورة عشوائية
  const getRandomImageUrl = () => {
    const imageId = Math.floor(Math.random() * 1000);
    return `https://picsum.photos/id/${imageId}/300/200`;
  };
  
  // توسيع/طي عنصر
  const toggleItemExpand = (itemId: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };
  
  // تحديث إعدادات المكون
  const handleSettingsChange = (key: string, value: any) => {
    onUpdate({
      ...component,
      settings: {
        ...component.settings,
        [key]: value
      }
    });
  };
  
  // تحديث عنصر محدد
  const handleItemChange = (index: number, field: string, value: any) => {
    const updatedItems = [...(settings.items || [])];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };
    
    handleSettingsChange('items', updatedItems);
  };
  
  // إضافة فائدة جديدة
  const addItem = () => {
    const newItem = {
      id: uuidv4(),
      title: 'فائدة جديدة',
      description: 'اكتب وصفًا تفصيليًا للفائدة التي يقدمها منتجك للعملاء.',
      icon: 'Sparkles',
      iconColor: settings.accentColor || '#4f46e5',
      image: getRandomImageUrl()
    };
    
    handleSettingsChange('items', [...(settings.items || []), newItem]);
    
    // توسيع العنصر الجديد تلقائيًا
    setExpandedItems(prev => ({
      ...prev,
      [newItem.id]: true
    }));
  };
  
  // نسخ عنصر
  const duplicateItem = (index: number) => {
    const itemToDuplicate = settings.items[index];
    const duplicatedItem = {
      ...itemToDuplicate,
      id: uuidv4(),
      title: `${itemToDuplicate.title} (نسخة)`
    };
    
    const updatedItems = [...(settings.items || [])];
    updatedItems.splice(index + 1, 0, duplicatedItem);
    handleSettingsChange('items', updatedItems);
    
    // توسيع العنصر المنسوخ تلقائيًا
    setExpandedItems(prev => ({
      ...prev,
      [duplicatedItem.id]: true
    }));
  };
  
  // حذف عنصر
  const removeItem = (index: number) => {
    const updatedItems = [...(settings.items || [])];
    updatedItems.splice(index, 1);
    handleSettingsChange('items', updatedItems);
  };
  
  // تغيير موضع عنصر
  const moveItem = (index: number, direction: 'up' | 'down') => {
    const updatedItems = [...(settings.items || [])];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= updatedItems.length) return;
    
    const itemToMove = updatedItems[index];
    updatedItems.splice(index, 1);
    updatedItems.splice(newIndex, 0, itemToMove);
    
    handleSettingsChange('items', updatedItems);
  };
  
  return (
    <div className="space-y-4 pb-4">
      <Accordion 
        type="single" 
        defaultValue="general" 
        value={activeTab} 
        onValueChange={setActiveTab} 
        collapsible={false} 
        className="w-full"
      >
        {/* قسم الإعدادات العامة */}
        <AccordionItem value="general" className="border rounded-md mb-2 overflow-hidden shadow-sm">
          <AccordionTrigger className="px-3 py-2 hover:bg-muted/40 data-[state=open]:bg-muted/40">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                <Settings size={15} className="text-primary" />
              </div>
              <div className="text-sm font-medium">إعدادات عامة</div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pt-2 pb-3">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium">
                  العنوان الرئيسي
                </Label>
                <Input
                  id="title"
                  value={settings.title || ''}
                  onChange={(e) => handleSettingsChange('title', e.target.value)}
                  placeholder="فوائد منتجنا"
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  العنوان الرئيسي الذي سيظهر أعلى قسم الفوائد
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="subtitle" className="text-sm font-medium">
                  العنوان الفرعي
                </Label>
                <Textarea
                  id="subtitle"
                  value={settings.subtitle || ''}
                  onChange={(e) => handleSettingsChange('subtitle', e.target.value)}
                  placeholder="اكتشف الميزات الفريدة التي تجعل منتجنا الاختيار الأمثل"
                  className="w-full resize-y min-h-[80px]"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  وصف موجز يظهر تحت العنوان الرئيسي
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        
        {/* قسم المظهر */}
        <AccordionItem value="appearance" className="border rounded-md mb-2 overflow-hidden shadow-sm">
          <AccordionTrigger className="px-3 py-2 hover:bg-muted/40 data-[state=open]:bg-muted/40">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                <Palette size={15} className="text-primary" />
              </div>
              <div className="text-sm font-medium">المظهر</div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pt-2 pb-3">
            <div className="space-y-4">
              {/* الألوان */}
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="backgroundColor" className="text-sm font-medium">
                    لون الخلفية
                  </Label>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-md border overflow-hidden">
                      <input
                        type="color"
                        id="backgroundColor"
                        value={settings.backgroundColor || '#f8f9fa'}
                        onChange={(e) => handleSettingsChange('backgroundColor', e.target.value)}
                        className="w-10 h-10 -ml-1 -mt-1 cursor-pointer"
                      />
                    </div>
                    <Input
                      value={settings.backgroundColor || '#f8f9fa'}
                      onChange={(e) => handleSettingsChange('backgroundColor', e.target.value)}
                      className="w-20 text-xs"
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="textColor" className="text-sm font-medium">
                    لون النص
                  </Label>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-md border overflow-hidden">
                      <input
                        type="color"
                        id="textColor"
                        value={settings.textColor || '#333333'}
                        onChange={(e) => handleSettingsChange('textColor', e.target.value)}
                        className="w-10 h-10 -ml-1 -mt-1 cursor-pointer"
                      />
                    </div>
                    <Input
                      value={settings.textColor || '#333333'}
                      onChange={(e) => handleSettingsChange('textColor', e.target.value)}
                      className="w-20 text-xs"
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="accentColor" className="text-sm font-medium">
                    لون التمييز
                  </Label>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-md border overflow-hidden">
                      <input
                        type="color"
                        id="accentColor"
                        value={settings.accentColor || '#4f46e5'}
                        onChange={(e) => handleSettingsChange('accentColor', e.target.value)}
                        className="w-10 h-10 -ml-1 -mt-1 cursor-pointer"
                      />
                    </div>
                    <Input
                      value={settings.accentColor || '#4f46e5'}
                      onChange={(e) => handleSettingsChange('accentColor', e.target.value)}
                      className="w-20 text-xs"
                    />
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* تخطيط ووضع الصور */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">نوع التخطيط</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={settings.layout === 'grid' ? 'default' : 'outline'}
                    className="flex flex-col items-center justify-center py-3 h-auto gap-1.5"
                    onClick={() => handleSettingsChange('layout', 'grid')}
                  >
                    <LayoutGrid className="h-5 w-5" />
                    <span className="text-xs">شبكة</span>
                  </Button>
                  
                  <Button
                    type="button"
                    variant={settings.layout === 'list' ? 'default' : 'outline'}
                    className="flex flex-col items-center justify-center py-3 h-auto gap-1.5"
                    onClick={() => handleSettingsChange('layout', 'list')}
                  >
                    <List className="h-5 w-5" />
                    <span className="text-xs">قائمة</span>
                  </Button>
                </div>
              </div>
              
              {settings.layout === 'grid' && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="columns" className="text-sm font-medium">
                        عدد الأعمدة: <strong>{settings.columns || 3}</strong>
                      </Label>
                    </div>
                    <Slider
                      id="columns"
                      min={1}
                      max={4}
                      step={1}
                      value={[settings.columns || 3]}
                      onValueChange={(value) => handleSettingsChange('columns', value[0])}
                      className="py-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      عدد الأعمدة في الشاشات الكبيرة. ستظهر في عمود واحد في الأجهزة المحمولة.
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <Label htmlFor="showImages" className="text-sm font-medium">
                        إظهار الصور
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        إضافة صور توضيحية للفوائد
                      </p>
                    </div>
                    <Switch
                      id="showImages"
                      checked={settings.showImages !== false}
                      onCheckedChange={(checked) => handleSettingsChange('showImages', checked)}
                    />
                  </div>
                  
                  {settings.showImages && (
                    <div className="space-y-2 pt-2">
                      <Label className="text-sm font-medium">موضع الصور</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          type="button"
                          variant={settings.imagePosition === 'top' ? 'default' : 'outline'}
                          className="flex flex-col items-center justify-center py-2 h-auto gap-1"
                          onClick={() => handleSettingsChange('imagePosition', 'top')}
                        >
                          <div className="w-full h-6 bg-muted rounded-md mb-1 relative">
                            <div className="absolute inset-0 flex items-center justify-center">
                              <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                          <div className="w-full h-1 bg-muted rounded-md"></div>
                          <div className="w-full h-3 bg-muted rounded-md mt-1"></div>
                          <span className="text-xs mt-1">أعلى</span>
                        </Button>
                        
                        <Button
                          type="button"
                          variant={settings.imagePosition === 'side' ? 'default' : 'outline'}
                          className="flex flex-col items-center justify-center py-2 h-auto gap-1"
                          onClick={() => handleSettingsChange('imagePosition', 'side')}
                        >
                          <div className="w-full flex">
                            <div className="w-1/2 h-3 bg-muted rounded-md"></div>
                            <div className="w-1/2 h-6 bg-muted rounded-md ml-1 relative">
                              <div className="absolute inset-0 flex items-center justify-center">
                                <ImageIcon className="h-3 w-3 text-muted-foreground" />
                              </div>
                            </div>
                          </div>
                          <span className="text-xs mt-1">جانبي</span>
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
              
              <Separator />
              
              {/* تأثيرات الحركة */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">تأثير الحركة</Label>
                <Select
                  value={settings.animation || 'fade'}
                  onValueChange={(value) => handleSettingsChange('animation', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="اختر تأثير الحركة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fade">تلاشي</SelectItem>
                    <SelectItem value="slideUp">انزلاق للأعلى</SelectItem>
                    <SelectItem value="scale">مقياس</SelectItem>
                    <SelectItem value="none">بدون حركة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        
        {/* قسم العناصر */}
        <AccordionItem value="items" className="border rounded-md mb-2 overflow-hidden shadow-sm">
          <AccordionTrigger className="px-3 py-2 hover:bg-muted/40 data-[state=open]:bg-muted/40">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                <Layers size={15} className="text-primary" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">الفوائد</span>
                <Badge variant="outline" className="ml-auto rounded-full h-5 px-2 bg-muted/40 text-xs">
                  {(settings.items || []).length}
                </Badge>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="p-0">
            <div className="flex justify-between items-center p-3 bg-muted/20 border-b">
              <span className="text-sm font-medium">إدارة فوائد المنتج</span>
              <Button
                onClick={addItem}
                variant="default"
                size="sm"
                className="flex items-center gap-1.5 h-8"
              >
                <Plus size={14} />
                <span className="text-xs">إضافة فائدة</span>
              </Button>
            </div>
            
            <ScrollArea className="max-h-[350px] overflow-auto px-3 py-2">
              <div className="space-y-3">
                {(settings.items || []).map((item, index) => (
                  <ProductBenefitItemEditor
                    key={item.id}
                    item={item}
                    index={index}
                    isExpanded={!!expandedItems[item.id]}
                    isFirst={index === 0}
                    isLast={index === (settings.items || []).length - 1}
                    onToggleExpand={() => toggleItemExpand(item.id)}
                    onItemChange={handleItemChange}
                    onMoveItem={moveItem}
                    onDuplicateItem={duplicateItem}
                    onRemoveItem={removeItem}
                    onGetRandomImage={getRandomImageUrl}
                    accentColor={settings.accentColor || '#4f46e5'}
                  />
                ))}
                
                {(settings.items || []).length === 0 && (
                  <div className="text-center p-6 border-2 border-dashed rounded-md">
                    <div className="w-12 h-12 mx-auto bg-muted/40 rounded-full flex items-center justify-center mb-2">
                      <Layers className="w-6 h-6 text-muted-foreground/60" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">لا توجد فوائد حتى الآن</p>
                    <Button
                      onClick={addItem}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1.5 mx-auto"
                    >
                      <Plus size={14} />
                      <span className="text-xs">إضافة فائدة جديدة</span>
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default ProductBenefitsComponentEditor;
