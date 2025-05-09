import React, { useState } from 'react';
import { LandingPageComponent } from './types';
import { v4 as uuidv4 } from 'uuid';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle, CardDescription, CardHeader, CardFooter } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowUpDown, 
  Copy, 
  Trash2, 
  Plus, 
  LayoutGrid, 
  Settings, 
  Layers, 
  ImagePlus, 
  Text, 
  Move,
  ChevronUp,
  ChevronDown,
  Info,
  ExternalLink,
  Palette,
  MousePointer,
  Eye,
  Smartphone,
  Columns
} from 'lucide-react';
import BeforeAfterItemEditor from './before-after/BeforeAfterItemEditor';

interface BeforeAfterComponentEditorProps {
  component: LandingPageComponent;
  onUpdate: (component: LandingPageComponent) => void;
}

// Helper function to get random placeholder image
const getRandomImageUrl = () => {
  const imageIds = [
    '1600x900/?before-after', '1600x900/?comparison', '1600x900/?result',
    '1600x900/?change', '1600x900/?transformation', '1600x900/?renovation',
    '1600x900/?progress', '1600x900/?makeover', '1600x900/?upgrade'
  ];
  const randomId = imageIds[Math.floor(Math.random() * imageIds.length)];
  return `https://source.unsplash.com/${randomId}`;
};

const BeforeAfterComponentEditor: React.FC<BeforeAfterComponentEditorProps> = ({ 
  component, 
  onUpdate 
}) => {
  const { settings } = component;
  const [activeTab, setActiveTab] = useState('general');
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  
  // تبديل حالة توسيع/طي العنصر
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

  // تحديث إعدادات عنصر محدد
  const handleItemChange = (index: number, field: string, value: any) => {
    const updatedItems = [...(settings.items || [])];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };

    handleSettingsChange('items', updatedItems);
  };

  // إضافة عنصر جديد
  const addItem = () => {
    const newItem = {
      id: uuidv4(),
      title: 'نتيجة جديدة',
      beforeImage: getRandomImageUrl(),
      beforeLabel: 'قبل',
      afterImage: getRandomImageUrl(),
      afterLabel: 'بعد',
      description: 'وصف النتيجة الرائعة التي تحققت باستخدام منتجنا'
    };

    handleSettingsChange('items', [...(settings.items || []), newItem]);
    
    // توسيع العنصر الجديد تلقائيًا
    setExpandedItems(prev => ({
      ...prev,
      [newItem.id]: true
    }));
  };

  // حذف عنصر
  const removeItem = (index: number) => {
    const updatedItems = [...(settings.items || [])];
    updatedItems.splice(index, 1);
    handleSettingsChange('items', updatedItems);
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

  // تغيير ترتيب العناصر
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
    <div className="space-y-2 w-full">
      <div className="w-full">
        <Tabs 
          defaultValue="general" 
          value={activeTab} 
          onValueChange={setActiveTab} 
          className="w-full"
        >
          <TabsList className="w-full h-9 grid grid-cols-2 mb-2">
            <TabsTrigger value="general" className="text-xs flex items-center gap-1">
              <Settings className="h-3 w-3" />
              <span>عام</span>
            </TabsTrigger>
            <TabsTrigger value="items" className="text-xs flex items-center gap-1">
              <Layers className="h-3 w-3" />
              <span>العناصر</span>
            </TabsTrigger>
          </TabsList>

          {/* تبويب الإعدادات العامة - دمج المحتوى والتصميم والتفاعل */}
          <TabsContent value="general" className="space-y-3">
            <Card className="border shadow-sm">
              <CardHeader className="px-3 py-2 border-b bg-muted/10">
                <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                  <Eye className="h-3 w-3" />
                  المظهر العام
                </CardTitle>
              </CardHeader>
              
              <CardContent className="p-3 pt-2 space-y-3">
                {/* العنوان الرئيسي */}
                <div className="space-y-1">
                  <Label htmlFor="title" className="text-xs font-medium">
                    العنوان الرئيسي
                  </Label>
                  <Input
                    id="title"
                    value={settings.title || ''}
                    onChange={(e) => handleSettingsChange('title', e.target.value)}
                    placeholder="قبل وبعد استخدام المنتج"
                    className="h-8 text-xs"
                  />
                </div>
                
                {/* النص التوضيحي */}
                <div className="space-y-1">
                  <Label htmlFor="description" className="text-xs font-medium">
                    النص التوضيحي
                  </Label>
                  <Textarea
                    id="description"
                    value={settings.description || ''}
                    onChange={(e) => handleSettingsChange('description', e.target.value)}
                    placeholder="شاهد النتائج المذهلة مع منتجنا"
                    className="resize-none min-h-[50px] text-xs"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
            
            <Accordion type="single" collapsible defaultValue="appearance" className="w-full">
              {/* قسم مظهر المكون */}
              <AccordionItem value="appearance" className="border rounded-md shadow-sm overflow-hidden">
                <AccordionTrigger className="px-3 py-2 text-xs font-medium hover:no-underline">
                  <div className="flex items-center gap-1.5">
                    <Palette className="h-3 w-3" />
                    <span>الألوان والتصميم</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-3 pt-1 space-y-3">
                  {/* الألوان */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="backgroundColor" className="text-xs font-medium w-20">
                        لون الخلفية
                      </Label>
                      <div className="flex-1 flex items-center gap-1">
                        <div className="h-7 w-7 rounded-md border overflow-hidden">
                          <input
                            type="color"
                            id="backgroundColor"
                            value={settings.backgroundColor || '#ffffff'}
                            onChange={(e) => handleSettingsChange('backgroundColor', e.target.value)}
                            className="w-9 h-9 -ml-1 -mt-1 cursor-pointer"
                          />
                        </div>
                        <Input
                          value={settings.backgroundColor || '#ffffff'}
                          onChange={(e) => handleSettingsChange('backgroundColor', e.target.value)}
                          className="flex-1 h-7 text-xs font-mono uppercase"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Label htmlFor="textColor" className="text-xs font-medium w-20">
                        لون النص
                      </Label>
                      <div className="flex-1 flex items-center gap-1">
                        <div className="h-7 w-7 rounded-md border overflow-hidden">
                          <input
                            type="color"
                            id="textColor"
                            value={settings.textColor || '#333333'}
                            onChange={(e) => handleSettingsChange('textColor', e.target.value)}
                            className="w-9 h-9 -ml-1 -mt-1 cursor-pointer"
                          />
                        </div>
                        <Input
                          value={settings.textColor || '#333333'}
                          onChange={(e) => handleSettingsChange('textColor', e.target.value)}
                          className="flex-1 h-7 text-xs font-mono uppercase"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* التخطيط */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="layout" className="text-xs font-medium w-20">
                        التخطيط
                      </Label>
                      <select
                        id="layout"
                        value={settings.layout || 'horizontal'}
                        onChange={(e) => handleSettingsChange('layout', e.target.value)}
                        className="flex-1 h-7 rounded-md border border-input bg-transparent px-2 py-1 text-xs"
                      >
                        <option value="horizontal">أفقي</option>
                        <option value="vertical">عمودي</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="showLabels" className="text-xs font-medium">
                        عرض التسميات (قبل/بعد)
                      </Label>
                      <Switch
                        id="showLabels"
                        checked={settings.showLabels !== false}
                        onCheckedChange={(checked) => handleSettingsChange('showLabels', checked)}
                        className="scale-75 data-[state=checked]:bg-primary"
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              {/* قسم التفاعل */}
              <AccordionItem value="interaction" className="border rounded-md shadow-sm overflow-hidden mt-2">
                <AccordionTrigger className="px-3 py-2 text-xs font-medium hover:no-underline">
                  <div className="flex items-center gap-1.5">
                    <MousePointer className="h-3 w-3" />
                    <span>التفاعل</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-3 pt-1 space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="slidersCount" className="text-xs font-medium">
                        عدد شرائح المقارنة
                      </Label>
                      <span className="text-xs font-mono w-6 text-center">
                        {settings.slidersCount || 1}
                      </span>
                    </div>
                    <Slider
                      id="slidersCount"
                      value={[settings.slidersCount || 1]}
                      min={1}
                      max={5}
                      step={1}
                      onValueChange={(value) => handleSettingsChange('slidersCount', value[0])}
                      className="h-5"
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              {/* قسم التخصيص للجوال */}
              <AccordionItem value="mobile" className="border rounded-md shadow-sm overflow-hidden mt-2">
                <AccordionTrigger className="px-3 py-2 text-xs font-medium hover:no-underline">
                  <div className="flex items-center gap-1.5">
                    <Smartphone className="h-3 w-3" />
                    <span>تخصيص الجوال</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-3 pt-1 space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="stackOnMobile" className="text-xs font-medium">
                        تحويل إلى عمودي في الجوال
                      </Label>
                      <Switch
                        id="stackOnMobile"
                        checked={settings.stackOnMobile !== false}
                        onCheckedChange={(checked) => handleSettingsChange('stackOnMobile', checked)}
                        className="scale-75 data-[state=checked]:bg-primary"
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>
          
          {/* تبويب العناصر - المصمم الأكثر اختصارًا */}
          <TabsContent value="items" className="relative">
            <Card className="border shadow-sm">
              <CardHeader className="px-3 py-2 border-b flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                  <Columns className="h-3 w-3" />
                  <span>مقارنات قبل وبعد ({(settings.items || []).length})</span>
                </CardTitle>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={addItem} 
                  className="h-7 text-xs px-2 py-1 flex gap-1 items-center"
                >
                  <Plus className="h-3 w-3" />
                  <span>إضافة</span>
                </Button>
              </CardHeader>
              
              <ScrollArea className="h-[250px] overflow-auto">
                <CardContent className="p-2 space-y-2">
                  {(settings.items || []).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <p className="text-xs text-muted-foreground">
                        لا توجد عناصر حتى الآن
                      </p>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={addItem} 
                        className="mt-2 h-7 text-xs px-2 py-1"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        <span>إضافة مقارنة جديدة</span>
                      </Button>
                    </div>
                  ) : (
                    (settings.items || []).map((item, index) => (
                      <BeforeAfterItemEditor
                        key={item.id || index}
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
                      />
                    ))
                  )}
                </CardContent>
              </ScrollArea>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BeforeAfterComponentEditor; 