import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import { 
  Award, 
  Trophy, 
  Headphones, 
  Star, 
  Shield, 
  Zap, 
  Clock, 
  Heart, 
  Plus, 
  Trash2, 
  ChevronUp, 
  ChevronDown,
  Move,
  Image
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { cn } from '@/lib/utils';
import WhyChooseUsComponentPreview from './WhyChooseUsComponentPreview';
import { v4 as uuidv4 } from 'uuid';

// Simple reorder utility function if it doesn't exist in utils
const reorder = (list: any[], startIndex: number, endIndex: number) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

// Assuming there's a ColorPicker component
const ColorPicker = ({ value, onChange }: { value: string, onChange: (color: string) => void }) => {
  return (
    <div className="flex items-center gap-2">
      <div 
        className="w-8 h-8 rounded-full border border-border cursor-pointer"
        style={{ backgroundColor: value }}
        onClick={() => {
          // Simple color picker - in real implementation, this would open a color picker
          const colors = ['#8b5cf6', '#4f46e5', '#0ea5e9', '#ef4444', '#f59e0b', '#10b981', '#6b7280', '#333333', '#111111'];
          const currentIndex = colors.indexOf(value);
          const nextIndex = (currentIndex + 1) % colors.length;
          onChange(colors[nextIndex]);
        }}
      />
      <Input 
        type="text" 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="flex-1"
      />
    </div>
  );
};

// Iconography options
const availableIcons = [
  { name: 'Award', icon: Award },
  { name: 'Trophy', icon: Trophy },
  { name: 'HeadphonesIcon', icon: Headphones },
  { name: 'Star', icon: Star },
  { name: 'Shield', icon: Shield },
  { name: 'Zap', icon: Zap },
  { name: 'Clock', icon: Clock },
  { name: 'Heart', icon: Heart },
];

interface WhyChooseUsComponentEditorProps {
  settings: any;
  onChange: (newSettings: any) => void;
}

const WhyChooseUsComponentEditor: React.FC<WhyChooseUsComponentEditorProps> = ({ 
  settings, 
  onChange 
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('content');
  
  // Initializes settings if some are missing
  const initializedSettings = {
    title: settings.title || 'لماذا تختار منتجنا',
    subtitle: settings.subtitle || 'مميزات فريدة تجعلنا الخيار الأمثل لك',
    backgroundColor: settings.backgroundColor || '#f9f8ff',
    textColor: settings.textColor || '#333333',
    accentColor: settings.accentColor || '#8b5cf6',
    layout: settings.layout || 'modern',
    animation: settings.animation || 'fade',
    backgroundImage: settings.backgroundImage || '',
    useGradient: settings.useGradient ?? true,
    gradientStart: settings.gradientStart || '#8b5cf6',
    gradientEnd: settings.gradientEnd || '#6366f1',
    gradientDirection: settings.gradientDirection || 'to-r',
    enableShadows: settings.enableShadows ?? true,
    borderRadius: settings.borderRadius ?? 12,
    containerPadding: settings.containerPadding ?? 48,
    headerAlignment: settings.headerAlignment || 'center',
    showDivider: settings.showDivider ?? true,
    dividerColor: settings.dividerColor || 'rgba(139, 92, 246, 0.3)',
    itemsCount: settings.itemsCount ?? 3,
    columns: settings.columns ?? 3,
    showcaseImage: settings.showcaseImage || '',
    imagePosition: settings.imagePosition || 'right',
    items: settings.items || [
      {
        id: uuidv4(),
        title: 'جودة استثنائية',
        description: 'نحن نقدم منتجات ذات جودة عالية تتجاوز توقعاتك وتدوم طويلاً',
        icon: 'Award',
        iconColor: '#8b5cf6',
        iconBackground: 'rgba(139, 92, 246, 0.1)',
        animation: 'fade-up',
        animationDelay: 0.1
      },
      {
        id: uuidv4(),
        title: 'خبرة متميزة',
        description: 'فريقنا من الخبراء يمتلك سنوات من الخبرة في تقديم أفضل الحلول',
        icon: 'Trophy',
        iconColor: '#8b5cf6',
        iconBackground: 'rgba(139, 92, 246, 0.1)',
        animation: 'fade-up',
        animationDelay: 0.2
      },
      {
        id: uuidv4(),
        title: 'دعم متواصل',
        description: 'نحن نقدم دعم فني على مدار الساعة لضمان تجربة مثالية لعملائنا',
        icon: 'HeadphonesIcon',
        iconColor: '#8b5cf6',
        iconBackground: 'rgba(139, 92, 246, 0.1)',
        animation: 'fade-up',
        animationDelay: 0.3
      }
    ],
    testimonial: settings.testimonial || {
      enabled: true,
      quote: 'أفضل منتج استخدمته على الإطلاق. لقد غير حياتي للأفضل!',
      author: 'أحمد محمد',
      role: 'عميل سعيد',
      image: '',
      rating: 5
    }
  };

  // Handle basic text setting changes
  const handleSettingChange = (key: string, value: any) => {
    onChange({
      ...settings,
      [key]: value
    });
  };

  // Handle feature item updates
  const handleItemChange = (index: number, key: string, value: any) => {
    const updatedItems = [...settings.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [key]: value
    };
    
    onChange({
      ...settings,
      items: updatedItems
    });
  };

  // Add a new feature item
  const handleAddItem = () => {
    const newItem = {
      id: uuidv4(),
      title: `ميزة ${settings.items.length + 1}`,
      description: 'وصف الميزة هنا',
      icon: 'Star',
      iconColor: settings.accentColor,
      iconBackground: `${settings.accentColor}20`,
      animation: 'fade-up',
      animationDelay: settings.items.length * 0.1
    };
    
    onChange({
      ...settings,
      items: [...settings.items, newItem]
    });
  };

  // Remove a feature item
  const handleRemoveItem = (index: number) => {
    const updatedItems = [...settings.items];
    updatedItems.splice(index, 1);
    
    onChange({
      ...settings,
      items: updatedItems
    });
  };

  // Handle testimonial changes
  const handleTestimonialChange = (key: string, value: any) => {
    onChange({
      ...settings,
      testimonial: {
        ...settings.testimonial,
        [key]: value
      }
    });
  };

  // Handle item reordering
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const reorderedItems = reorder(
      settings.items,
      result.source.index,
      result.destination.index
    );
    
    onChange({
      ...settings,
      items: reorderedItems
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-muted p-4 rounded-lg">
        <WhyChooseUsComponentPreview settings={settings} />
      </div>
      
      <Tabs defaultValue="content" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-4 mb-4">
          <TabsTrigger value="content">المحتوى</TabsTrigger>
          <TabsTrigger value="features">الميزات</TabsTrigger>
          <TabsTrigger value="style">التصميم</TabsTrigger>
          <TabsTrigger value="testimonial">آراء العملاء</TabsTrigger>
        </TabsList>
        
        {/* Content Tab */}
        <TabsContent value="content" className="space-y-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">العنوان الرئيسي</label>
              <Input
                value={settings.title}
                onChange={(e) => handleSettingChange('title', e.target.value)}
                placeholder="لماذا تختار منتجنا"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">النص الفرعي</label>
              <Textarea
                value={settings.subtitle}
                onChange={(e) => handleSettingChange('subtitle', e.target.value)}
                placeholder="مميزات فريدة تجعلنا الخيار الأمثل لك"
                rows={2}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">محاذاة العنوان</label>
              <Select 
                value={settings.headerAlignment} 
                onValueChange={(value) => handleSettingChange('headerAlignment', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر المحاذاة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="center">وسط</SelectItem>
                  <SelectItem value="right">يمين</SelectItem>
                  <SelectItem value="left">يسار</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center">
              <Switch
                checked={settings.showDivider}
                onCheckedChange={(checked) => handleSettingChange('showDivider', checked)}
                id="show-divider"
              />
              <label htmlFor="show-divider" className="mr-2 text-sm">
                إظهار خط فاصل
              </label>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">نمط التخطيط</label>
              <Select 
                value={settings.layout} 
                onValueChange={(value) => handleSettingChange('layout', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر نمط التخطيط" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="modern">عصري</SelectItem>
                  <SelectItem value="cards">بطاقات</SelectItem>
                  <SelectItem value="feature-focus">تركيز على الميزات</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">عدد الأعمدة</label>
              <Select 
                value={String(settings.columns)} 
                onValueChange={(value) => handleSettingChange('columns', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر عدد الأعمدة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">عمود واحد</SelectItem>
                  <SelectItem value="2">عمودان</SelectItem>
                  <SelectItem value="3">ثلاثة أعمدة</SelectItem>
                  <SelectItem value="4">أربعة أعمدة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">صورة العرض</label>
              <div className="flex items-center gap-2">
                <Input
                  value={settings.showcaseImage}
                  onChange={(e) => handleSettingChange('showcaseImage', e.target.value)}
                  placeholder="رابط الصورة"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  className="flex-shrink-0"
                  type="button"
                >
                  <Image className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="mt-2">
                <label className="block text-sm font-medium mb-1">موضع الصورة</label>
                <Select 
                  value={settings.imagePosition} 
                  onValueChange={(value) => handleSettingChange('imagePosition', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر موضع الصورة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="right">يمين</SelectItem>
                    <SelectItem value="left">يسار</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </TabsContent>
        
        {/* Features Tab */}
        <TabsContent value="features" className="space-y-4">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="features-list">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-4"
                >
                  {settings.items.map((item: any, index: number) => (
                    <Draggable key={item.id} draggableId={item.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className="border border-border rounded-md p-4 bg-background"
                        >
                          <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center">
                              <div {...provided.dragHandleProps} className="mr-2 cursor-move">
                                <Move className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <h3 className="font-medium">الميزة {index + 1}</h3>
                            </div>
                            <div className="flex gap-1">
                              {index > 0 && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    const newItems = [...settings.items];
                                    [newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
                                    handleSettingChange('items', newItems);
                                  }}
                                >
                                  <ChevronUp className="h-4 w-4" />
                                </Button>
                              )}
                              {index < settings.items.length - 1 && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    const newItems = [...settings.items];
                                    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
                                    handleSettingChange('items', newItems);
                                  }}
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive/80"
                                onClick={() => handleRemoveItem(index)}
                                disabled={settings.items.length <= 1}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium mb-1">عنوان الميزة</label>
                              <Input
                                value={item.title}
                                onChange={(e) => handleItemChange(index, 'title', e.target.value)}
                                placeholder="عنوان الميزة"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium mb-1">وصف الميزة</label>
                              <Textarea
                                value={item.description}
                                onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                placeholder="وصف الميزة"
                                rows={2}
                              />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-medium mb-1">الأيقونة</label>
                                <Select 
                                  value={item.icon} 
                                  onValueChange={(value) => handleItemChange(index, 'icon', value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="اختر أيقونة" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableIcons.map((icon) => (
                                      <SelectItem key={icon.name} value={icon.name}>
                                        <div className="flex items-center">
                                          <icon.icon className="h-4 w-4 mr-2" />
                                          {icon.name}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium mb-1">لون الأيقونة</label>
                                <ColorPicker
                                  value={item.iconColor}
                                  onChange={(color) => handleItemChange(index, 'iconColor', color)}
                                />
                              </div>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium mb-1">لون خلفية الأيقونة</label>
                              <ColorPicker
                                value={item.iconBackground}
                                onChange={(color) => handleItemChange(index, 'iconBackground', color)}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleAddItem}
          >
            <Plus className="h-4 w-4 mr-2" /> إضافة ميزة جديدة
          </Button>
        </TabsContent>
        
        {/* Style Tab */}
        <TabsContent value="style" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">لون الخلفية</label>
              <ColorPicker
                value={settings.backgroundColor}
                onChange={(color) => handleSettingChange('backgroundColor', color)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">لون النص</label>
              <ColorPicker
                value={settings.textColor}
                onChange={(color) => handleSettingChange('textColor', color)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">اللون المميز</label>
              <ColorPicker
                value={settings.accentColor}
                onChange={(color) => handleSettingChange('accentColor', color)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">لون الفاصل</label>
              <ColorPicker
                value={settings.dividerColor}
                onChange={(color) => handleSettingChange('dividerColor', color)}
              />
            </div>
          </div>
          
          <div className="flex items-center mb-4">
            <Switch
              checked={settings.useGradient}
              onCheckedChange={(checked) => handleSettingChange('useGradient', checked)}
              id="use-gradient"
            />
            <label htmlFor="use-gradient" className="mr-2 text-sm">
              استخدام تدرج لوني
            </label>
          </div>
          
          {settings.useGradient && (
            <div className="space-y-4 border border-border rounded-md p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">بداية التدرج</label>
                  <ColorPicker
                    value={settings.gradientStart}
                    onChange={(color) => handleSettingChange('gradientStart', color)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">نهاية التدرج</label>
                  <ColorPicker
                    value={settings.gradientEnd}
                    onChange={(color) => handleSettingChange('gradientEnd', color)}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">اتجاه التدرج</label>
                <Select 
                  value={settings.gradientDirection} 
                  onValueChange={(value) => handleSettingChange('gradientDirection', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر اتجاه التدرج" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="to-r">من اليمين إلى اليسار</SelectItem>
                    <SelectItem value="to-l">من اليسار إلى اليمين</SelectItem>
                    <SelectItem value="to-b">من الأعلى إلى الأسفل</SelectItem>
                    <SelectItem value="to-t">من الأسفل إلى الأعلى</SelectItem>
                    <SelectItem value="to-tr">من اليمين العلوي</SelectItem>
                    <SelectItem value="to-tl">من اليسار العلوي</SelectItem>
                    <SelectItem value="to-br">من اليمين السفلي</SelectItem>
                    <SelectItem value="to-bl">من اليسار السفلي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium mb-1">صورة الخلفية</label>
            <div className="flex items-center gap-2">
              <Input
                value={settings.backgroundImage}
                onChange={(e) => handleSettingChange('backgroundImage', e.target.value)}
                placeholder="رابط صورة الخلفية"
              />
              <Button 
                variant="outline" 
                size="icon"
                className="flex-shrink-0"
                type="button"
              >
                <Image className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center mb-2">
            <Switch
              checked={settings.enableShadows}
              onCheckedChange={(checked) => handleSettingChange('enableShadows', checked)}
              id="enable-shadows"
            />
            <label htmlFor="enable-shadows" className="mr-2 text-sm">
              تفعيل الظلال
            </label>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              دائرية الحواف: {settings.borderRadius}px
            </label>
            <Slider
              value={[settings.borderRadius]}
              min={0}
              max={24}
              step={1}
              onValueChange={(values) => handleSettingChange('borderRadius', values[0])}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              تباعد داخلي: {settings.containerPadding}px
            </label>
            <Slider
              value={[settings.containerPadding]}
              min={0}
              max={80}
              step={4}
              onValueChange={(values) => handleSettingChange('containerPadding', values[0])}
            />
          </div>
        </TabsContent>
        
        {/* Testimonial Tab */}
        <TabsContent value="testimonial" className="space-y-4">
          <div className="flex items-center mb-4">
            <Switch
              checked={settings.testimonial?.enabled}
              onCheckedChange={(checked) => handleTestimonialChange('enabled', checked)}
              id="enable-testimonial"
            />
            <label htmlFor="enable-testimonial" className="mr-2 text-sm">
              إظهار رأي العميل
            </label>
          </div>
          
          {settings.testimonial?.enabled && (
            <div className="space-y-4 border border-border rounded-md p-4">
              <div>
                <label className="block text-sm font-medium mb-1">نص الشهادة</label>
                <Textarea
                  value={settings.testimonial?.quote}
                  onChange={(e) => handleTestimonialChange('quote', e.target.value)}
                  placeholder="رأي العميل"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">اسم العميل</label>
                  <Input
                    value={settings.testimonial?.author}
                    onChange={(e) => handleTestimonialChange('author', e.target.value)}
                    placeholder="اسم العميل"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">صفة العميل</label>
                  <Input
                    value={settings.testimonial?.role}
                    onChange={(e) => handleTestimonialChange('role', e.target.value)}
                    placeholder="صفة العميل"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">صورة العميل</label>
                <div className="flex items-center gap-2">
                  <Input
                    value={settings.testimonial?.image}
                    onChange={(e) => handleTestimonialChange('image', e.target.value)}
                    placeholder="رابط صورة العميل"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="flex-shrink-0"
                    type="button"
                  >
                    <Image className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  التقييم: {settings.testimonial?.rating} / 5
                </label>
                <Slider
                  value={[settings.testimonial?.rating]}
                  min={1}
                  max={5}
                  step={1}
                  onValueChange={(values) => handleTestimonialChange('rating', values[0])}
                />
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WhyChooseUsComponentEditor;
