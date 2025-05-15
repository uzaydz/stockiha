import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
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
  Shield,
  Type,
  FileText,
  FileCode,
  Download,
  Layout,
  ArrowUpDown,
  Sparkles
} from 'lucide-react';
import GuaranteeItemEditor from './guarantees/GuaranteeItemEditor';

// تغيير واجهة المكون لتستقبل settings بدلاً من component
interface GuaranteesComponentEditorProps {
  settings: Record<string, any>;
  onUpdate: (settings: Record<string, any>) => void;
}

const GuaranteesComponentEditor: React.FC<GuaranteesComponentEditorProps> = ({
  settings,
  onUpdate
}) => {
  // تتبع حالة توسيع العناصر
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  
  // إضافة سجلات التصحيح
  
  
  // تحديث الإعدادات
  const handleSettingsChange = (key: string, value: any) => {
    
    
    onUpdate({
      ...settings,
      [key]: value
    });
  };
  
  // تبديل حالة توسيع عنصر
  const toggleItemExpand = (itemId: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };
  
  // إضافة عنصر جديد
  const addItem = () => {
    const newItem = {
      id: uuidv4(),
      title: `ضمان ${(settings.items || []).length + 1}`,
      description: 'اكتب تفاصيل الضمان هنا...',
      icon: 'shieldCheck',
      iconColor: settings.accentColor || '#4f46e5'
    };
    
    const newItems = [...(settings.items || []), newItem];
    
    handleSettingsChange('items', newItems);
    
    // توسيع العنصر الجديد تلقائيًا
    setExpandedItems(prev => ({
      ...prev,
      [newItem.id]: true
    }));
  };
  
  // تحديث عنصر
  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...(settings.items || [])];
    newItems[index] = {
      ...newItems[index],
      [field]: value
    };
    
    handleSettingsChange('items', newItems);
  };
  
  // نقل عنصر للأعلى أو للأسفل
  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...(settings.items || [])];
    
    if (direction === 'up' && index > 0) {
      // تبديل العنصر مع العنصر السابق
      [newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
    } else if (direction === 'down' && index < newItems.length - 1) {
      // تبديل العنصر مع العنصر التالي
      [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    }
    
    handleSettingsChange('items', newItems);
  };
  
  // نسخ عنصر
  const duplicateItem = (index: number) => {
    const itemToDuplicate = (settings.items || [])[index];
    
    if (!itemToDuplicate) return;
    
    const newItem = {
      ...itemToDuplicate,
      id: uuidv4(),
      title: `${itemToDuplicate.title} (نسخة)`
    };
    
    const newItems = [...(settings.items || [])];
    newItems.splice(index + 1, 0, newItem);
    
    handleSettingsChange('items', newItems);
    
    // توسيع العنصر المنسوخ تلقائيًا
    setExpandedItems(prev => ({
      ...prev,
      [newItem.id]: true
    }));
  };
  
  // حذف عنصر
  const removeItem = (index: number) => {
    const newItems = [...(settings.items || [])];
    newItems.splice(index, 1);
    
    handleSettingsChange('items', newItems);
  };

  return (
    <div className="space-y-4">
      <Accordion type="multiple" defaultValue={['content', 'style']} className="space-y-4">
        {/* قسم المحتوى */}
        <AccordionItem value="content" className="border rounded-md overflow-hidden shadow-sm">
          <AccordionTrigger className="px-3 py-2 hover:bg-muted/40 data-[state=open]:bg-muted/40">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                <Type size={15} className="text-primary" />
              </div>
              <span className="text-sm font-medium">المحتوى</span>
            </div>
          </AccordionTrigger>
          
          <AccordionContent className="pt-3 pb-1">
            <div className="px-3 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium">
                  العنوان الرئيسي
                </Label>
                <Input
                  id="title"
                  placeholder="ضمانات المنتج والإسترجاع"
                  value={settings.title || ''}
                  onChange={(e) => handleSettingsChange('title', e.target.value)}
                  className="h-9"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="subtitle" className="text-sm font-medium">
                  النص التوضيحي
                </Label>
                <Textarea
                  id="subtitle"
                  placeholder="نحن نثق بجودة منتجاتنا ونقدم لك هذه الضمانات"
                  value={settings.subtitle || ''}
                  onChange={(e) => handleSettingsChange('subtitle', e.target.value)}
                  className="resize-none h-20"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        
        {/* قسم تخصيص المظهر */}
        <AccordionItem value="style" className="border rounded-md overflow-hidden shadow-sm">
          <AccordionTrigger className="px-3 py-2 hover:bg-muted/40 data-[state=open]:bg-muted/40">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                <Palette size={15} className="text-primary" />
              </div>
              <span className="text-sm font-medium">المظهر</span>
            </div>
          </AccordionTrigger>
          
          <AccordionContent className="pt-3 pb-1">
            <div className="px-3 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="backgroundColor" className="text-sm font-medium">
                    لون الخلفية
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="backgroundColor"
                      type="color"
                      value={settings.backgroundColor || '#f8f9fa'}
                      onChange={(e) => handleSettingsChange('backgroundColor', e.target.value)}
                      className="w-12 h-9 p-1"
                    />
                    <Input
                      value={settings.backgroundColor || '#f8f9fa'}
                      onChange={(e) => handleSettingsChange('backgroundColor', e.target.value)}
                      className="h-9 flex-1"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="textColor" className="text-sm font-medium">
                    لون النص
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="textColor"
                      type="color"
                      value={settings.textColor || '#333333'}
                      onChange={(e) => handleSettingsChange('textColor', e.target.value)}
                      className="w-12 h-9 p-1"
                    />
                    <Input
                      value={settings.textColor || '#333333'}
                      onChange={(e) => handleSettingsChange('textColor', e.target.value)}
                      className="h-9 flex-1"
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="accentColor" className="text-sm font-medium">
                  اللون الرئيسي (للأيقونات)
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="accentColor"
                    type="color"
                    value={settings.accentColor || '#4f46e5'}
                    onChange={(e) => handleSettingsChange('accentColor', e.target.value)}
                    className="w-12 h-9 p-1"
                  />
                  <Input
                    value={settings.accentColor || '#4f46e5'}
                    onChange={(e) => handleSettingsChange('accentColor', e.target.value)}
                    className="h-9 flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="headingColor" className="text-sm font-medium">
                  لون العناوين
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="headingColor"
                    type="color"
                    value={settings.headingColor || settings.textColor || '#222222'}
                    onChange={(e) => handleSettingsChange('headingColor', e.target.value)}
                    className="w-12 h-9 p-1"
                  />
                  <Input
                    value={settings.headingColor || settings.textColor || '#222222'}
                    onChange={(e) => handleSettingsChange('headingColor', e.target.value)}
                    className="h-9 flex-1"
                  />
                </div>
              </div>
              
              <Separator className="my-3" />
              
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
              )}
              
              <Separator className="my-3" />
              
              <div className="space-y-3">
                <Label className="text-sm font-medium">نمط الأيقونة</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={settings.iconStyle === 'filled' ? 'default' : 'outline'}
                    className="flex flex-col items-center justify-center py-3 h-auto gap-1.5"
                    onClick={() => handleSettingsChange('iconStyle', 'filled')}
                  >
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <Shield className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-xs">معبأة</span>
                  </Button>
                  
                  <Button
                    type="button"
                    variant={settings.iconStyle === 'outlined' ? 'default' : 'outline'}
                    className="flex flex-col items-center justify-center py-3 h-auto gap-1.5"
                    onClick={() => handleSettingsChange('iconStyle', 'outlined')}
                  >
                    <div className="w-8 h-8 rounded-full border-2 border-primary flex items-center justify-center">
                      <Shield className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-xs">محددة</span>
                  </Button>
                </div>
              </div>
              
              <div className="space-y-3">
                <Label className="text-sm font-medium">حجم الأيقونة</Label>
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    type="button"
                    variant={settings.iconSize === 'small' ? 'default' : 'outline'}
                    className="flex flex-col items-center justify-center py-3 h-auto gap-1.5"
                    onClick={() => handleSettingsChange('iconSize', 'small')}
                  >
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                      <Shield className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-xs">صغير</span>
                  </Button>
                  
                  <Button
                    type="button"
                    variant={settings.iconSize === 'medium' || !settings.iconSize ? 'default' : 'outline'}
                    className="flex flex-col items-center justify-center py-3 h-auto gap-1.5"
                    onClick={() => handleSettingsChange('iconSize', 'medium')}
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <Shield className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-xs">متوسط</span>
                  </Button>
                  
                  <Button
                    type="button"
                    variant={settings.iconSize === 'large' ? 'default' : 'outline'}
                    className="flex flex-col items-center justify-center py-3 h-auto gap-1.5"
                    onClick={() => handleSettingsChange('iconSize', 'large')}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-xs">كبير</span>
                  </Button>
                </div>
              </div>
              
              <div className="space-y-3">
                <Label className="text-sm font-medium">شكل الأيقونة</Label>
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    type="button"
                    variant={settings.iconShape === 'circle' || !settings.iconShape ? 'default' : 'outline'}
                    className="flex flex-col items-center justify-center py-3 h-auto gap-1.5"
                    onClick={() => handleSettingsChange('iconShape', 'circle')}
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <Shield className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-xs">دائري</span>
                  </Button>
                  
                  <Button
                    type="button"
                    variant={settings.iconShape === 'square' ? 'default' : 'outline'}
                    className="flex flex-col items-center justify-center py-3 h-auto gap-1.5"
                    onClick={() => handleSettingsChange('iconShape', 'square')}
                  >
                    <div className="w-8 h-8 rounded-md bg-primary/20 flex items-center justify-center">
                      <Shield className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-xs">مربع</span>
                  </Button>
                  
                  <Button
                    type="button"
                    variant={settings.iconShape === 'none' ? 'default' : 'outline'}
                    className="flex flex-col items-center justify-center py-3 h-auto gap-1.5"
                    onClick={() => handleSettingsChange('iconShape', 'none')}
                  >
                    <div className="w-8 h-8 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-xs">بدون خلفية</span>
                  </Button>
                </div>
              </div>
              
              <div className="space-y-3">
                <Label className="text-sm font-medium">نمط الحدود</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={settings.borderStyle === 'none' ? 'default' : 'outline'}
                    className="flex flex-col items-center justify-center py-3 h-auto gap-1.5"
                    onClick={() => handleSettingsChange('borderStyle', 'none')}
                  >
                    <div className="w-8 h-8 flex items-center justify-center">
                      <div className="w-6 h-6 bg-primary/20" />
                    </div>
                    <span className="text-xs">بدون حدود</span>
                  </Button>
                  
                  <Button
                    type="button"
                    variant={settings.borderStyle === 'simple' ? 'default' : 'outline'}
                    className="flex flex-col items-center justify-center py-3 h-auto gap-1.5"
                    onClick={() => handleSettingsChange('borderStyle', 'simple')}
                  >
                    <div className="w-8 h-8 flex items-center justify-center">
                      <div className="w-6 h-6 border border-primary/60" />
                    </div>
                    <span className="text-xs">حدود بسيطة</span>
                  </Button>
                  
                  <Button
                    type="button"
                    variant={settings.borderStyle === 'rounded' ? 'default' : 'outline'}
                    className="flex flex-col items-center justify-center py-3 h-auto gap-1.5"
                    onClick={() => handleSettingsChange('borderStyle', 'rounded')}
                  >
                    <div className="w-8 h-8 flex items-center justify-center">
                      <div className="w-6 h-6 border border-primary/60 rounded-lg" />
                    </div>
                    <span className="text-xs">حدود دائرية</span>
                  </Button>
                  
                  <Button
                    type="button"
                    variant={settings.borderStyle === 'raised' ? 'default' : 'outline'}
                    className="flex flex-col items-center justify-center py-3 h-auto gap-1.5"
                    onClick={() => handleSettingsChange('borderStyle', 'raised')}
                  >
                    <div className="w-8 h-8 flex items-center justify-center">
                      <div className="w-6 h-6 border border-primary/60 rounded-md shadow-sm" />
                    </div>
                    <span className="text-xs">بارز</span>
                  </Button>
                </div>
              </div>
              
              <div className="space-y-3">
                <Label className="text-sm font-medium">تأثير الحركة</Label>
                <Select 
                  value={settings.animation || 'fade'} 
                  onValueChange={(value) => handleSettingsChange('animation', value)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fade">تلاشي</SelectItem>
                    <SelectItem value="slideUp">تحريك لأعلى</SelectItem>
                    <SelectItem value="slideRight">تحريك من اليمين</SelectItem>
                    <SelectItem value="slideLeft">تحريك من اليسار</SelectItem>
                    <SelectItem value="scale">تكبير</SelectItem>
                    <SelectItem value="bounce">ارتداد</SelectItem>
                    <SelectItem value="stagger">متتابع</SelectItem>
                    <SelectItem value="none">بدون تأثير</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        
        {/* قسم تخصيص متقدم */}
        <AccordionItem value="advanced" className="border rounded-md mb-2 overflow-hidden shadow-sm">
          <AccordionTrigger className="px-3 py-2 hover:bg-muted/40 data-[state=open]:bg-muted/40">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                <SlidersHorizontal size={15} className="text-primary" />
              </div>
              <span className="text-sm font-medium">خيارات متقدمة</span>
            </div>
          </AccordionTrigger>
          
          <AccordionContent className="pt-3 pb-1">
            <div className="px-3 space-y-4">
              <div className="space-y-3">
                <Label className="text-sm font-medium">تأثير الحركة</Label>
                <Select 
                  value={settings.animation || 'fade'} 
                  onValueChange={(value) => handleSettingsChange('animation', value)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fade">تلاشي</SelectItem>
                    <SelectItem value="slideUp">تحريك لأعلى</SelectItem>
                    <SelectItem value="slideRight">تحريك من اليمين</SelectItem>
                    <SelectItem value="slideLeft">تحريك من اليسار</SelectItem>
                    <SelectItem value="scale">تكبير</SelectItem>
                    <SelectItem value="bounce">ارتداد</SelectItem>
                    <SelectItem value="stagger">متتابع</SelectItem>
                    <SelectItem value="none">بدون تأثير</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="animationDuration" className="text-sm font-medium">
                    مدة التأثير: <strong>{settings.animationDuration || 0.5}s</strong>
                  </Label>
                </div>
                <Slider
                  id="animationDuration"
                  min={0.1}
                  max={2}
                  step={0.1}
                  value={[settings.animationDuration || 0.5]}
                  onValueChange={(value) => handleSettingsChange('animationDuration', value[0])}
                  className="py-2"
                />
              </div>
              
              {settings.animation === 'stagger' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="staggerDelay" className="text-sm font-medium">
                      تأخير متتابع: <strong>{settings.staggerDelay || 0.1}s</strong>
                    </Label>
                  </div>
                  <Slider
                    id="staggerDelay"
                    min={0.05}
                    max={0.5}
                    step={0.05}
                    value={[settings.staggerDelay || 0.1]}
                    onValueChange={(value) => handleSettingsChange('staggerDelay', value[0])}
                    className="py-2"
                  />
                </div>
              )}
              
              <Separator className="my-3" />
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="containerPadding" className="text-sm font-medium">
                    المساحة الداخلية: <strong>{settings.containerPadding || 40}px</strong>
                  </Label>
                </div>
                <Slider
                  id="containerPadding"
                  min={0}
                  max={80}
                  step={10}
                  value={[settings.containerPadding || 40]}
                  onValueChange={(value) => handleSettingsChange('containerPadding', value[0])}
                  className="py-2"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="itemSpacing" className="text-sm font-medium">
                    التباعد بين العناصر: <strong>{settings.itemSpacing || 20}px</strong>
                  </Label>
                </div>
                <Slider
                  id="itemSpacing"
                  min={10}
                  max={60}
                  step={5}
                  value={[settings.itemSpacing || 20]}
                  onValueChange={(value) => handleSettingsChange('itemSpacing', value[0])}
                  className="py-2"
                />
              </div>
              
              <Separator className="my-3" />
              
              <div className="space-y-3">
                <Label className="text-sm font-medium">نمط بطاقة الضمان</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={settings.itemStyle === 'card' || !settings.itemStyle ? 'default' : 'outline'}
                    className="flex flex-col items-center justify-center py-3 h-auto gap-1.5"
                    onClick={() => handleSettingsChange('itemStyle', 'card')}
                  >
                    <div className="w-12 h-8 border rounded-md bg-background flex items-center justify-center shadow-sm">
                      <div className="w-6 h-4 bg-primary/20 rounded-sm" />
                    </div>
                    <span className="text-xs">بطاقة</span>
                  </Button>
                  
                  <Button
                    type="button"
                    variant={settings.itemStyle === 'minimal' ? 'default' : 'outline'}
                    className="flex flex-col items-center justify-center py-3 h-auto gap-1.5"
                    onClick={() => handleSettingsChange('itemStyle', 'minimal')}
                  >
                    <div className="w-12 h-8 flex items-center justify-center">
                      <div className="w-6 h-4 bg-primary/20 rounded-sm" />
                    </div>
                    <span className="text-xs">مبسط</span>
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    ظل لبطاقات الضمانات
                  </Label>
                  <Switch
                    checked={settings.boxShadow || false}
                    onCheckedChange={(checked) => handleSettingsChange('boxShadow', checked)}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  إضافة ظل لكل بطاقة ضمان لإبرازها عن الخلفية
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    تأثير عند التحويم
                  </Label>
                  <Switch
                    checked={settings.hoverEffect || false}
                    onCheckedChange={(checked) => handleSettingsChange('hoverEffect', checked)}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  إضافة تأثير بصري عند تمرير المؤشر فوق كل ضمان
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    محاذاة النص
                  </Label>
                  <Select 
                    value={settings.textAlignment || 'right'} 
                    onValueChange={(value) => handleSettingsChange('textAlignment', value)}
                  >
                    <SelectTrigger className="w-36 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="right">يمين</SelectItem>
                      <SelectItem value="center">وسط</SelectItem>
                      <SelectItem value="left">يسار</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        
        {/* قسم إدارة العناصر */}
        <AccordionItem value="items" className="border rounded-md mb-2 overflow-hidden shadow-sm">
          <AccordionTrigger className="px-3 py-2 hover:bg-muted/40 data-[state=open]:bg-muted/40">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                <Shield size={15} className="text-primary" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">الضمانات</span>
                <Badge variant="outline" className="ml-auto rounded-full h-5 px-2 bg-muted/40 text-xs">
                  {(settings.items || []).length}
                </Badge>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="p-0">
            <div className="flex justify-between items-center p-3 bg-muted/20 border-b">
              <span className="text-sm font-medium">إدارة ضمانات المنتج</span>
              <Button
                onClick={addItem}
                variant="default"
                size="sm"
                className="flex items-center gap-1.5 h-8"
              >
                <Plus size={14} />
                <span className="text-xs">إضافة ضمان</span>
              </Button>
            </div>
            
            <ScrollArea className="max-h-[350px] overflow-auto px-3 py-2">
              <div className="space-y-3">
                {(settings.items || []).map((item, index) => (
                  <GuaranteeItemEditor
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
                    accentColor={settings.accentColor || '#4f46e5'}
                  />
                ))}
                
                {(settings.items || []).length === 0 && (
                  <div className="text-center py-8 px-3">
                    <Shield className="mx-auto h-10 w-10 text-muted-foreground mb-3 opacity-20" />
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">لا توجد ضمانات</h3>
                    <p className="text-xs text-muted-foreground/70 mb-3">
                      لم تقم بإضافة أي ضمانات بعد. أضف ضمانات لزيادة ثقة العملاء.
                    </p>
                    <Button
                      onClick={addItem}
                      variant="outline"
                      size="sm"
                      className="mx-auto"
                    >
                      <Plus className="mr-1" size={14} />
                      إضافة أول ضمان
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </AccordionContent>
        </AccordionItem>
        
        {/* قسم القوالب الجاهزة */}
        <AccordionItem value="templates" className="border rounded-md mb-2 overflow-hidden shadow-sm">
          <AccordionTrigger className="px-3 py-2 hover:bg-muted/40 data-[state=open]:bg-muted/40">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                <Layout size={15} className="text-primary" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">قوالب جاهزة</span>
                <Badge variant="outline" className="bg-amber-100 text-amber-900 border-amber-300 ml-2 rounded-full h-5 px-2 text-xs">
                  جديد
                </Badge>
              </div>
            </div>
          </AccordionTrigger>
          
          <AccordionContent className="p-0">
            <Tabs defaultValue="basic" className="w-full">
              <div className="flex justify-between items-center p-1.5 px-3 border-b">
                <TabsList className="h-7 p-0.5">
                  <TabsTrigger value="basic" className="text-xs px-2 py-0.5">مقترحة</TabsTrigger>
                  <TabsTrigger value="advanced" className="text-xs px-2 py-0.5">متقدمة</TabsTrigger>
                </TabsList>
                <p className="text-[10px] text-muted-foreground ml-1">اضغط لتطبيق القالب</p>
              </div>
              
              <TabsContent value="basic" className="p-2 space-y-2 mt-0">
                {/* القوالب الأساسية/المقترحة */}
                <Button
                  variant="outline"
                  className="h-auto p-0 hover:border-primary overflow-hidden w-full"
                  onClick={() => {
                    const newItems = [
                      {
                        id: uuidv4(),
                        title: "ضمان استرجاع ٣٠ يوم",
                        description: "يمكنك استرجاع المنتج خلال ٣٠ يوم من الشراء واسترداد أموالك بالكامل",
                        icon: "rotateCcw",
                        iconColor: "#4f46e5"
                      },
                      {
                        id: uuidv4(),
                        title: "شحن مجاني",
                        description: "شحن مجاني لجميع الطلبات التي تزيد قيمتها عن ٢٠٠ ريال",
                        icon: "truck",
                        iconColor: "#10b981"
                      },
                      {
                        id: uuidv4(),
                        title: "دفع آمن",
                        description: "جميع المعاملات المالية مشفرة وآمنة بنسبة ١٠٠٪",
                        icon: "lock",
                        iconColor: "#f59e0b"
                      }
                    ];
                    
                    const newSettings = {
                      ...settings,
                      title: "ضماناتنا لك",
                      subtitle: "نقدم لك أفضل الضمانات لتجربة تسوق مريحة وآمنة",
                      items: newItems,
                      layout: "grid",
                      columns: 3,
                      iconStyle: "filled",
                      animation: "fade",
                      borderStyle: "none",
                      backgroundColor: "#f8f9fa",
                      accentColor: "#4f46e5"
                    };
                    
                    onUpdate(newSettings);
                  }}
                >
                  <div className="flex w-full">
                    <div className="py-2 px-3 flex items-center border-l">
                      <span className="font-medium text-xs">قالب بسيط</span>
                    </div>
                    <div className="flex-1 p-2 bg-muted/10">
                      <div className="flex gap-1">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="flex-1 relative bg-background rounded border p-1">
                            <div className="w-4 h-4 rounded-full bg-primary/20 mb-1 mx-auto">
                              <Shield className="w-2 h-2 mx-auto mt-1 text-primary" />
                            </div>
                            <div className="h-1 w-8 bg-muted mb-1 mx-auto rounded-sm" />
                            <div className="h-1 w-full bg-muted/70 mb-1 rounded-sm" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-auto p-0 hover:border-primary overflow-hidden w-full"
                  onClick={() => {
                    const newItems = [
                      {
                        id: uuidv4(),
                        title: "ضمان استرجاع لمدة ٣٠ يوم",
                        description: "ثقتنا بمنتجاتنا تامة، ولذلك نقدم لك ضمان استرجاع شامل لمدة ٣٠ يوم من تاريخ استلام المنتج",
                        highlight: "١٠٠٪ استرداد",
                        badgeText: "الأكثر طلبًا",
                        badgeColor: "#ef4444",
                        icon: "rotateCcw",
                        iconColor: "#4f46e5",
                        featured: true,
                        specialEffect: "border",
                        borderColor: "#4f46e5"
                      },
                      {
                        id: uuidv4(),
                        title: "شحن سريع ومجاني",
                        description: "شحن مجاني لكافة الطلبات مع خدمة التوصيل السريع خلال ٢-٣ أيام عمل",
                        highlight: "توصيل سريع",
                        icon: "truck",
                        iconColor: "#10b981"
                      },
                      {
                        id: uuidv4(),
                        title: "دفع آمن ١٠٠٪",
                        description: "جميع المعاملات مشفرة وآمنة بالكامل مع دعم لجميع وسائل الدفع الشائعة",
                        highlight: "حماية كاملة",
                        icon: "lock",
                        iconColor: "#f59e0b"
                      },
                      {
                        id: uuidv4(),
                        title: "خدمة عملاء على مدار الساعة",
                        description: "فريق خدمة العملاء جاهز للرد على استفساراتك على مدار الساعة طوال أيام الأسبوع",
                        highlight: "٢٤/٧",
                        icon: "clock",
                        iconColor: "#8b5cf6"
                      }
                    ];
                    
                    const newSettings = {
                      ...settings,
                      title: "ضمانات حصرية لعملائنا",
                      subtitle: "نضمن لك تجربة تسوق مثالية من اللحظة الأولى وحتى استلام المنتج واستخدامه",
                      items: newItems,
                      layout: "grid",
                      columns: 2,
                      iconSize: "large",
                      iconStyle: "filled",
                      iconShape: "circle",
                      animation: "stagger",
                      borderStyle: "rounded",
                      boxShadow: true,
                      backgroundColor: "#f8fafc",
                      textColor: "#334155",
                      accentColor: "#4f46e5",
                      headingColor: "#1e293b",
                      containerPadding: 40,
                      itemSpacing: 30,
                      itemStyle: "card",
                      hoverEffect: true,
                      textAlignment: "right"
                    };
                    
                    onUpdate(newSettings);
                  }}
                >
                  <div className="flex w-full">
                    <div className="py-2 px-3 flex items-center border-l bg-primary/5">
                      <div className="flex flex-col items-start">
                        <span className="font-medium text-xs">قالب احترافي</span>
                        <span className="text-[10px] text-primary">منصح به</span>
                      </div>
                    </div>
                    <div className="flex-1 p-2 bg-muted/10">
                      <div className="grid grid-cols-2 gap-1">
                        {[1, 2].map((i) => (
                          <div key={i} className="relative bg-background rounded border p-1 shadow-sm">
                            <div className={`w-5 h-5 rounded-full mb-1 flex-shrink-0 flex items-center justify-center ${i === 1 ? 'bg-primary' : 'bg-primary/20'}`}>
                              <Shield className="w-2.5 h-2.5 text-white" />
                            </div>
                            {i === 1 && <div className="absolute -top-0.5 left-1 h-1 w-6 bg-red-100 rounded-sm" />}
                            <div className="h-1 w-8 bg-muted mb-0.5 rounded-sm" />
                            <div className="h-1 w-full bg-muted/70 rounded-sm" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Button>
              </TabsContent>
              
              <TabsContent value="advanced" className="p-2 space-y-2 mt-0">
                {/* القوالب المتقدمة */}
                <Button
                  variant="outline"
                  className="h-auto p-0 hover:border-primary overflow-hidden w-full"
                  onClick={() => {
                    const newItems = [
                      {
                        id: uuidv4(),
                        title: "ضمان جودة",
                        description: "نضمن لك أعلى جودة في جميع منتجاتنا",
                        icon: "checkCircle",
                        iconColor: "#0ea5e9"
                      },
                      {
                        id: uuidv4(),
                        title: "استبدال سهل",
                        description: "سهولة في استبدال المنتج في حال عدم المطابقة",
                        icon: "rotateCcw",
                        iconColor: "#0ea5e9"
                      },
                      {
                        id: uuidv4(),
                        title: "شحن مجاني",
                        description: "شحن مجاني لجميع الطلبات بدون حد أدنى",
                        icon: "truck",
                        iconColor: "#0ea5e9"
                      },
                      {
                        id: uuidv4(),
                        title: "دعم سريع",
                        description: "فريق دعم يستجيب خلال ساعات قليلة",
                        icon: "clock",
                        iconColor: "#0ea5e9"
                      }
                    ];
                    
                    const newSettings = {
                      ...settings,
                      title: "ضماناتنا",
                      subtitle: "نقدم لك أفضل الضمانات مع كل عملية شراء",
                      items: newItems,
                      layout: "grid",
                      columns: 4,
                      iconStyle: "outlined",
                      iconShape: "none",
                      animation: "fade",
                      borderStyle: "none",
                      backgroundColor: "#ffffff",
                      textColor: "#333333",
                      accentColor: "#0ea5e9",
                      containerPadding: 20,
                      itemSpacing: 15,
                      itemStyle: "minimal",
                      hoverEffect: false,
                      textAlignment: "center"
                    };
                    
                    onUpdate(newSettings);
                  }}
                >
                  <div className="flex w-full">
                    <div className="py-2 px-3 flex items-center border-l">
                      <span className="font-medium text-xs">قالب مينيمال</span>
                    </div>
                    <div className="flex-1 p-2 bg-muted/10">
                      <div className="flex justify-between gap-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="flex flex-col items-center">
                            <Shield className="w-3 h-3 text-sky-500 mb-0.5" />
                            <div className="h-1 w-3 bg-muted rounded-sm" />
                            <div className="h-1 w-6 bg-muted/70 mt-0.5 rounded-sm" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-auto p-0 hover:border-primary overflow-hidden w-full"
                  onClick={() => {
                    const newItems = [
                      {
                        id: uuidv4(),
                        title: "ضمان استرجاع كامل",
                        description: "استرجاع كامل للمنتج خلال 14 يوم من الشراء بدون أي أسئلة",
                        icon: "rotateCcw",
                        iconColor: "#ffffff",
                        specialEffect: "gradient",
                        gradientStart: "#a855f7",
                        gradientEnd: "#6366f1",
                        featured: true,
                        includeButton: true,
                        buttonText: "شروط الاسترجاع"
                      },
                      {
                        id: uuidv4(),
                        title: "شحن آمن وسريع",
                        description: "شحن آمن لمنتجاتك مع إمكانية تتبع الشحنة خطوة بخطوة",
                        icon: "truck",
                        iconColor: "#ffffff",
                        specialEffect: "gradient",
                        gradientStart: "#ec4899",
                        gradientEnd: "#f43f5e"
                      },
                      {
                        id: uuidv4(),
                        title: "ضمان لمدة عام كامل",
                        description: "ضمان شامل ضد عيوب التصنيع لمدة عام كامل من تاريخ الشراء",
                        icon: "shield",
                        iconColor: "#ffffff",
                        specialEffect: "gradient",
                        gradientStart: "#10b981",
                        gradientEnd: "#14b8a6"
                      }
                    ];
                    
                    const newSettings = {
                      ...settings,
                      title: "ضمانات استثنائية",
                      subtitle: "نقدم لك ضمانات عالية المستوى تليق بثقتك الغالية",
                      items: newItems,
                      layout: "list",
                      iconStyle: "filled",
                      iconSize: "large",
                      iconShape: "circle",
                      animation: "slideUp",
                      borderStyle: "none",
                      backgroundColor: "#fafafa",
                      textColor: "#333333",
                      accentColor: "#8b5cf6",
                      containerPadding: 40,
                      itemSpacing: 25,
                      itemStyle: "card",
                      boxShadow: true,
                      hoverEffect: true
                    };
                    
                    onUpdate(newSettings);
                  }}
                >
                  <div className="flex w-full">
                    <div className="py-2 px-3 flex items-center border-l">
                      <span className="font-medium text-xs">قالب مميز</span>
                    </div>
                    <div className="flex-1 p-2 bg-muted/10">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center">
                            <Shield className="w-2.5 h-2.5 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="h-1 w-10 bg-muted rounded-sm" />
                            <div className="h-1 w-full bg-muted/70 mt-0.5 rounded-sm" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 flex items-center justify-center">
                            <Shield className="w-2.5 h-2.5 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="h-1 w-10 bg-muted rounded-sm" />
                            <div className="h-1 w-full bg-muted/70 mt-0.5 rounded-sm" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-auto p-0 hover:border-primary overflow-hidden w-full"
                  onClick={() => {
                    const newItems = [
                      {
                        id: uuidv4(),
                        title: "ضمان الجودة",
                        description: "نضمن لك الجودة العالية في كل منتجاتنا ومطابقتها للمواصفات",
                        icon: "shieldCheck",
                        iconColor: "#ffffff",
                        specialEffect: "gradient",
                        gradientStart: "#0284c7",
                        gradientEnd: "#22d3ee"
                      },
                      {
                        id: uuidv4(),
                        title: "الاسترجاع المضمون",
                        description: "استرجاع خلال ٣٠ يوم دون أسئلة واسترداد المبلغ كاملاً",
                        icon: "rotateCcw",
                        iconColor: "#ffffff",
                        specialEffect: "gradient",
                        gradientStart: "#0284c7",
                        gradientEnd: "#22d3ee"
                      },
                      {
                        id: uuidv4(),
                        title: "الشحن المجاني",
                        description: "شحن مجاني على جميع المنتجات وتوصيل سريع",
                        icon: "truck",
                        iconColor: "#ffffff",
                        specialEffect: "gradient",
                        gradientStart: "#0284c7",
                        gradientEnd: "#22d3ee"
                      }
                    ];
                    
                    const newSettings = {
                      ...settings,
                      title: "ضمانات حصرية",
                      subtitle: "نوفر أفضل الضمانات لتجربة تسوق مثالية",
                      items: newItems,
                      layout: "grid",
                      columns: 3,
                      iconStyle: "filled",
                      iconShape: "circle",
                      animation: "fade",
                      borderStyle: "rounded",
                      backgroundColor: "#f0fdff",
                      textColor: "#0e7490",
                      accentColor: "#0ea5e9",
                      containerPadding: 30,
                      itemSpacing: 20,
                      boxShadow: true,
                      hoverEffect: true,
                      textAlignment: "center",
                      iconSize: "large"
                    };
                    
                    onUpdate(newSettings);
                  }}
                >
                  <div className="flex w-full">
                    <div className="py-2 px-3 flex items-center border-l">
                      <span className="font-medium text-xs">قالب ازرق</span>
                    </div>
                    <div className="flex-1 p-2 bg-sky-50">
                      <div className="grid grid-cols-3 gap-1">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="bg-white shadow-sm rounded border-sky-100 border p-1">
                            <div className="w-4 h-4 rounded-full bg-gradient-to-r from-sky-600 to-cyan-400 mb-0.5 mx-auto flex items-center justify-center">
                              <Shield className="w-2 h-2 text-white" />
                            </div>
                            <div className="h-1 w-5 bg-sky-100 mb-0.5 mx-auto rounded-sm" />
                            <div className="h-1 w-full bg-sky-50 rounded-sm" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Button>
              </TabsContent>
            </Tabs>
            
            <div className="bg-muted/20 p-1.5 border-t flex items-center justify-center">
              <p className="text-xs text-muted-foreground text-center">
                يمكنك تعديل تفاصيل القالب بعد تطبيقه
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default GuaranteesComponentEditor; 