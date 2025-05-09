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
  AlertCircle,
  CheckCircle,
  XCircle,
  ThumbsDown,
  ThumbsUp,
  Clock,
  Heart,
  Frown,
  Smile,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Move,
  Image,
  Upload,
  X
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { cn } from '@/lib/utils';
import ProblemSolutionComponentPreview from './ProblemSolutionComponentPreview';
import { v4 as uuidv4 } from 'uuid';

// Reorder utility function
const reorder = (list: any[], startIndex: number, endIndex: number) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

// Simple color picker component
const ColorPicker = ({ value, onChange }: { value: string, onChange: (color: string) => void }) => {
  return (
    <div className="flex items-center gap-2">
      <div 
        className="w-8 h-8 rounded-full border border-border cursor-pointer"
        style={{ backgroundColor: value }}
        onClick={() => {
          // Simple color picker implementation
          const colors = ['#4338ca', '#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#6b7280', '#333333'];
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

// Available icons for problems and solutions
const availableProblemIcons = [
  { name: 'AlertCircle', icon: AlertCircle },
  { name: 'XCircle', icon: XCircle },
  { name: 'ThumbsDown', icon: ThumbsDown },
  { name: 'Frown', icon: Frown },
];

const availableSolutionIcons = [
  { name: 'CheckCircle', icon: CheckCircle },
  { name: 'ThumbsUp', icon: ThumbsUp },
  { name: 'Smile', icon: Smile },
  { name: 'Heart', icon: Heart },
];

interface ProblemSolutionComponentEditorProps {
  settings: any;
  onChange: (newSettings: any) => void;
}

const ProblemSolutionComponentEditor: React.FC<ProblemSolutionComponentEditorProps> = ({ 
  settings, 
  onChange 
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('content');
  
  // Initialize settings if missing
  const initializedSettings = {
    title: settings.title || 'المشكلة والحل',
    subtitle: settings.subtitle || 'اكتشف كيف يمكن لمنتجنا حل مشاكلك',
    backgroundColor: settings.backgroundColor || '#f8f9fa',
    textColor: settings.textColor || '#333333',
    accentColor: settings.accentColor || '#4f46e5',
    layout: settings.layout || 'side-by-side',
    animation: settings.animation || 'fade',
    showMainImage: settings.showMainImage ?? true,
    mainImage: settings.mainImage || '',
    useGradient: settings.useGradient ?? true,
    gradientStart: settings.gradientStart || '#4338ca',
    gradientEnd: settings.gradientEnd || '#3b82f6',
    gradientDirection: settings.gradientDirection || 'to-r',
    enableShadows: settings.enableShadows ?? true,
    borderRadius: settings.borderRadius ?? 12,
    containerPadding: settings.containerPadding ?? 48,
    headerAlignment: settings.headerAlignment || 'center',
    items: settings.items || [
      {
        id: uuidv4(),
        problemTitle: 'المشكلة',
        problemDescription: 'وصف تفصيلي للمشكلة التي يواجهها العملاء.',
        problemImage: 'https://picsum.photos/id/36/400/300',
        problemIconName: 'AlertCircle',
        problemIconColor: '#ef4444',
        solutionTitle: 'الحل',
        solutionDescription: 'كيف يقدم منتجنا حلًا مثاليًا لهذه المشكلة.',
        solutionImage: 'https://picsum.photos/id/42/400/300',
        solutionIconName: 'CheckCircle',
        solutionIconColor: '#10b981',
        animationDelay: 0.1
      }
    ]
  };

  // Handle basic setting changes
  const handleSettingChange = (key: string, value: any) => {
    onChange({
      ...settings,
      [key]: value
    });
  };

  // Handle changes in problem-solution item
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

  // Add a new problem-solution item
  const handleAddItem = () => {
    const newItem = {
      id: uuidv4(),
      problemTitle: `مشكلة ${settings.items.length + 1}`,
      problemDescription: 'وصف المشكلة هنا...',
      problemImage: 'https://picsum.photos/id/36/400/300',
      problemIconName: 'AlertCircle',
      problemIconColor: '#ef4444',
      solutionTitle: `الحل ${settings.items.length + 1}`,
      solutionDescription: 'وصف الحل هنا...',
      solutionImage: 'https://picsum.photos/id/42/400/300',
      solutionIconName: 'CheckCircle',
      solutionIconColor: '#10b981',
      animationDelay: settings.items.length * 0.1
    };
    
    onChange({
      ...settings,
      items: [...settings.items, newItem]
    });
  };

  // Remove a problem-solution item
  const handleRemoveItem = (index: number) => {
    const updatedItems = [...settings.items];
    updatedItems.splice(index, 1);
    
    onChange({
      ...settings,
      items: updatedItems
    });
  };

  // Handle item drag and drop reordering
  const handleDragEnd = (result: any) => {
    if (!result.destination) {
      return;
    }
    
    if (result.destination.index === result.source.index) {
      return;
    }
    
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

  // Image upload handler (placeholder - would be implemented with actual upload functionality)
  const handleImageUpload = (key: string) => {
    // This would typically open a file picker and upload the image
    const mockImageUrl = `https://picsum.photos/id/${Math.floor(Math.random() * 100)}/400/300`;
    handleSettingChange(key, mockImageUrl);
  };

  // Item image upload handler
  const handleItemImageUpload = (index: number, key: string) => {
    // Mock image upload
    const mockImageUrl = `https://picsum.photos/id/${Math.floor(Math.random() * 100)}/400/300`;
    handleItemChange(index, key, mockImageUrl);
  };

  return (
    <div className="flex flex-col gap-6 p-4 bg-background border rounded-md">
      {/* Preview and Tabs */}
      <div className="flex flex-col gap-6">
        <div className="w-full bg-muted border rounded-md overflow-hidden">
          <ProblemSolutionComponentPreview settings={settings} />
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="content">المحتوى</TabsTrigger>
            <TabsTrigger value="style">التصميم</TabsTrigger>
            <TabsTrigger value="advanced">متقدم</TabsTrigger>
          </TabsList>
          
          {/* Content Tab */}
          <TabsContent value="content" className="space-y-4 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">العنوان الرئيسي</label>
                <Input
                  value={settings.title}
                  onChange={(e) => handleSettingChange('title', e.target.value)}
                  placeholder="أدخل العنوان الرئيسي..."
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">النص التوضيحي</label>
                <Textarea
                  value={settings.subtitle}
                  onChange={(e) => handleSettingChange('subtitle', e.target.value)}
                  placeholder="أدخل النص التوضيحي..."
                  rows={2}
                />
              </div>
              
              {settings.showMainImage && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">الصورة الرئيسية</label>
                  <div className="flex items-center gap-2">
                    <div className="relative w-full">
                      <Input
                        value={settings.mainImage}
                        onChange={(e) => handleSettingChange('mainImage', e.target.value)}
                        placeholder="رابط الصورة الرئيسية..."
                      />
                      {settings.mainImage && (
                        <button
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => handleSettingChange('mainImage', '')}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleImageUpload('mainImage')}
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                  {settings.mainImage && (
                    <div className="mt-2 relative w-32 h-20 overflow-hidden rounded-md border">
                      <img
                        src={settings.mainImage}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              )}
              
              {/* Problem-Solution Items */}
              <div className="space-y-4 mt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">المشاكل والحلول</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddItem}
                    className="flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" /> إضافة جديد
                  </Button>
                </div>
                
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="problem-solution-items">
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
                                className="border rounded-md bg-card p-4 relative"
                              >
                                <div className="flex justify-between items-start mb-4">
                                  <div
                                    {...provided.dragHandleProps}
                                    className="cursor-move text-muted-foreground hover:text-foreground"
                                  >
                                    <Move className="h-5 w-5" />
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleRemoveItem(index)}
                                      className="h-6 w-6 text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                
                                {/* Problem Section */}
                                <div className="space-y-3 p-3 border rounded-md bg-muted/50 mb-4">
                                  <h4 className="text-sm font-semibold">المشكلة</h4>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                      <label className="text-xs font-medium">عنوان المشكلة</label>
                                      <Input
                                        value={item.problemTitle}
                                        onChange={(e) => handleItemChange(index, 'problemTitle', e.target.value)}
                                        placeholder="عنوان المشكلة..."
                                        className="text-sm"
                                      />
                                    </div>
                                    
                                    <div className="space-y-2">
                                      <label className="text-xs font-medium">أيقونة المشكلة</label>
                                      <Select
                                        value={item.problemIconName}
                                        onValueChange={(value) => handleItemChange(index, 'problemIconName', value)}
                                      >
                                        <SelectTrigger className="text-sm">
                                          <SelectValue placeholder="اختر أيقونة" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {availableProblemIcons.map((iconOption) => (
                                            <SelectItem key={iconOption.name} value={iconOption.name} className="flex items-center gap-2">
                                              <iconOption.icon className="h-4 w-4 text-muted-foreground" />
                                              <span>{iconOption.name}</span>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <label className="text-xs font-medium">وصف المشكلة</label>
                                    <Textarea
                                      value={item.problemDescription}
                                      onChange={(e) => handleItemChange(index, 'problemDescription', e.target.value)}
                                      placeholder="وصف المشكلة..."
                                      rows={2}
                                      className="text-sm"
                                    />
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <label className="text-xs font-medium">صورة المشكلة</label>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleItemImageUpload(index, 'problemImage')}
                                        className="h-6 text-xs"
                                      >
                                        <Upload className="h-3 w-3 mr-1" /> رفع
                                      </Button>
                                    </div>
                                    <Input
                                      value={item.problemImage}
                                      onChange={(e) => handleItemChange(index, 'problemImage', e.target.value)}
                                      placeholder="رابط صورة المشكلة..."
                                      className="text-sm"
                                    />
                                    {item.problemImage && (
                                      <div className="mt-1 relative w-24 h-16 overflow-hidden rounded-md border">
                                        <img
                                          src={item.problemImage}
                                          alt="Problem"
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <label className="text-xs font-medium">لون أيقونة المشكلة</label>
                                    <ColorPicker
                                      value={item.problemIconColor}
                                      onChange={(color) => handleItemChange(index, 'problemIconColor', color)}
                                    />
                                  </div>
                                </div>
                                
                                {/* Solution Section */}
                                <div className="space-y-3 p-3 border rounded-md bg-muted/50">
                                  <h4 className="text-sm font-semibold">الحل</h4>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                      <label className="text-xs font-medium">عنوان الحل</label>
                                      <Input
                                        value={item.solutionTitle}
                                        onChange={(e) => handleItemChange(index, 'solutionTitle', e.target.value)}
                                        placeholder="عنوان الحل..."
                                        className="text-sm"
                                      />
                                    </div>
                                    
                                    <div className="space-y-2">
                                      <label className="text-xs font-medium">أيقونة الحل</label>
                                      <Select
                                        value={item.solutionIconName}
                                        onValueChange={(value) => handleItemChange(index, 'solutionIconName', value)}
                                      >
                                        <SelectTrigger className="text-sm">
                                          <SelectValue placeholder="اختر أيقونة" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {availableSolutionIcons.map((iconOption) => (
                                            <SelectItem key={iconOption.name} value={iconOption.name} className="flex items-center gap-2">
                                              <iconOption.icon className="h-4 w-4 text-muted-foreground" />
                                              <span>{iconOption.name}</span>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <label className="text-xs font-medium">وصف الحل</label>
                                    <Textarea
                                      value={item.solutionDescription}
                                      onChange={(e) => handleItemChange(index, 'solutionDescription', e.target.value)}
                                      placeholder="وصف الحل..."
                                      rows={2}
                                      className="text-sm"
                                    />
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <label className="text-xs font-medium">صورة الحل</label>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleItemImageUpload(index, 'solutionImage')}
                                        className="h-6 text-xs"
                                      >
                                        <Upload className="h-3 w-3 mr-1" /> رفع
                                      </Button>
                                    </div>
                                    <Input
                                      value={item.solutionImage}
                                      onChange={(e) => handleItemChange(index, 'solutionImage', e.target.value)}
                                      placeholder="رابط صورة الحل..."
                                      className="text-sm"
                                    />
                                    {item.solutionImage && (
                                      <div className="mt-1 relative w-24 h-16 overflow-hidden rounded-md border">
                                        <img
                                          src={item.solutionImage}
                                          alt="Solution"
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <label className="text-xs font-medium">لون أيقونة الحل</label>
                                    <ColorPicker
                                      value={item.solutionIconColor}
                                      onChange={(color) => handleItemChange(index, 'solutionIconColor', color)}
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
              </div>
            </div>
          </TabsContent>
          
          {/* Style Tab */}
          <TabsContent value="style" className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">لون الخلفية</label>
                <ColorPicker
                  value={settings.backgroundColor}
                  onChange={(color) => handleSettingChange('backgroundColor', color)}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">لون النص</label>
                <ColorPicker
                  value={settings.textColor}
                  onChange={(color) => handleSettingChange('textColor', color)}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">اللون المميز</label>
                <ColorPicker
                  value={settings.accentColor}
                  onChange={(color) => handleSettingChange('accentColor', color)}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">محاذاة العنوان</label>
                <Select
                  value={settings.headerAlignment}
                  onValueChange={(value) => handleSettingChange('headerAlignment', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المحاذاة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="right">يمين</SelectItem>
                    <SelectItem value="center">وسط</SelectItem>
                    <SelectItem value="left">يسار</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">نوع التخطيط</label>
                <Select
                  value={settings.layout}
                  onValueChange={(value) => handleSettingChange('layout', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر التخطيط" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="side-by-side">جنباً إلى جنب</SelectItem>
                    <SelectItem value="alternating">متناوب</SelectItem>
                    <SelectItem value="cards">بطاقات</SelectItem>
                    <SelectItem value="cascade">متدرج</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">حجم الحدود المنحنية</label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[settings.borderRadius]}
                    min={0}
                    max={24}
                    step={1}
                    onValueChange={(value) => handleSettingChange('borderRadius', value[0])}
                    className="flex-1"
                  />
                  <span className="text-sm w-8 text-center">{settings.borderRadius}px</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">المساحة الداخلية</label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[settings.containerPadding]}
                    min={12}
                    max={80}
                    step={4}
                    onValueChange={(value) => handleSettingChange('containerPadding', value[0])}
                    className="flex-1"
                  />
                  <span className="text-sm w-8 text-center">{settings.containerPadding}px</span>
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">استخدام تدرج الألوان</label>
                <Switch
                  checked={settings.useGradient}
                  onCheckedChange={(checked) => handleSettingChange('useGradient', checked)}
                />
              </div>
              
              {settings.useGradient && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">بداية التدرج</label>
                    <ColorPicker
                      value={settings.gradientStart}
                      onChange={(color) => handleSettingChange('gradientStart', color)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">نهاية التدرج</label>
                    <ColorPicker
                      value={settings.gradientEnd}
                      onChange={(color) => handleSettingChange('gradientEnd', color)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">اتجاه التدرج</label>
                    <Select
                      value={settings.gradientDirection}
                      onValueChange={(value) => handleSettingChange('gradientDirection', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الاتجاه" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="to-r">من اليسار إلى اليمين</SelectItem>
                        <SelectItem value="to-l">من اليمين إلى اليسار</SelectItem>
                        <SelectItem value="to-t">من الأسفل إلى الأعلى</SelectItem>
                        <SelectItem value="to-b">من الأعلى إلى الأسفل</SelectItem>
                        <SelectItem value="to-tr">قطري - يمين علوي</SelectItem>
                        <SelectItem value="to-tl">قطري - يسار علوي</SelectItem>
                        <SelectItem value="to-br">قطري - يمين سفلي</SelectItem>
                        <SelectItem value="to-bl">قطري - يسار سفلي</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">تمكين الظلال</label>
                <Switch
                  checked={settings.enableShadows}
                  onCheckedChange={(checked) => handleSettingChange('enableShadows', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">عرض الصورة الرئيسية</label>
                <Switch
                  checked={settings.showMainImage}
                  onCheckedChange={(checked) => handleSettingChange('showMainImage', checked)}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">نوع الحركة</label>
                <Select
                  value={settings.animation}
                  onValueChange={(value) => handleSettingChange('animation', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الحركة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون</SelectItem>
                    <SelectItem value="fade">تلاشي</SelectItem>
                    <SelectItem value="fade-up">تلاشي للأعلى</SelectItem>
                    <SelectItem value="fade-in">ظهور تدريجي</SelectItem>
                    <SelectItem value="slide-in">انزلاق</SelectItem>
                    <SelectItem value="scale">تكبير</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProblemSolutionComponentEditor; 