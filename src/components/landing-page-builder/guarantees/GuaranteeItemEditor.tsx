import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { 
  ChevronDown,
  ChevronUp, 
  Copy, 
  Trash2, 
  Move,
  ShieldCheck, 
  RotateCcw, 
  Truck, 
  CreditCard,
  Lock,
  Clock,
  CheckCircle,
  Fingerprint,
  Shield,
  Percent,
  TextIcon,
  Palette
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';

// قائمة الأيقونات المتاحة
const AVAILABLE_ICONS = [
  { name: 'shieldCheck', icon: <ShieldCheck size={16} /> },
  { name: 'rotateCcw', icon: <RotateCcw size={16} /> },
  { name: 'truck', icon: <Truck size={16} /> },
  { name: 'creditCard', icon: <CreditCard size={16} /> },
  { name: 'lock', icon: <Lock size={16} /> },
  { name: 'clock', icon: <Clock size={16} /> },
  { name: 'checkCircle', icon: <CheckCircle size={16} /> },
  { name: 'fingerprint', icon: <Fingerprint size={16} /> },
  { name: 'shield', icon: <Shield size={16} /> },
  { name: 'percent', icon: <Percent size={16} /> }
];

// قائمة الألوان المقترحة
const SUGGESTED_COLORS = [
  '#4f46e5', // أزرق مع أرجواني
  '#3b82f6', // أزرق
  '#10b981', // أخضر
  '#f59e0b', // برتقالي
  '#ef4444', // أحمر
  '#6366f1', // بنفسجي
  '#8b5cf6', // أرجواني
  '#14b8a6', // فيروزي
  '#f43f5e', // وردي
  '#0ea5e9'  // أزرق فاتح
];

interface GuaranteeItemEditorProps {
  item: any;
  index: number;
  isExpanded: boolean;
  isFirst: boolean;
  isLast: boolean;
  accentColor: string;
  onToggleExpand: () => void;
  onItemChange: (index: number, field: string, value: any) => void;
  onMoveItem: (index: number, direction: 'up' | 'down') => void;
  onDuplicateItem: (index: number) => void;
  onRemoveItem: (index: number) => void;
}

const GuaranteeItemEditor: React.FC<GuaranteeItemEditorProps> = ({
  item,
  index,
  isExpanded,
  isFirst,
  isLast,
  accentColor,
  onToggleExpand,
  onItemChange,
  onMoveItem,
  onDuplicateItem,
  onRemoveItem
}) => {
  const [activeTab, setActiveTab] = useState('content');
  
  // تغيير الأيقونة
  const changeIcon = (iconName: string) => {
    onItemChange(index, 'icon', iconName);
  };
  
  // تغيير لون الأيقونة
  const changeIconColor = (color: string) => {
    onItemChange(index, 'iconColor', color);
  };
  
  // الحصول على مكون الأيقونة المحدد
  const getSelectedIcon = () => {
    const foundIcon = AVAILABLE_ICONS.find(i => i.name === item.icon);
    return foundIcon ? foundIcon.icon : <ShieldCheck size={16} />;
  };

  return (
    <Card className="border shadow-sm overflow-hidden">
      {/* رأس البطاقة - يظهر دائماً */}
      <div
        className="p-3 flex items-center justify-between bg-background cursor-pointer border-b"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-2">
          <div 
            className="w-6 h-6 rounded-full flex items-center justify-center text-white"
            style={{ backgroundColor: item.iconColor || accentColor }}
          >
            {getSelectedIcon()}
          </div>
          
          <span className="font-medium text-sm line-clamp-1">
            {item.title || `ضمان ${index + 1}`}
          </span>
        </div>
        
        <div className="flex items-center">
          <div className="flex items-center gap-1 mr-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveItem(index, 'up');
                    }}
                    disabled={isFirst}
                    className="h-6 w-6 text-gray-500 hover:text-gray-700"
                  >
                    <ChevronUp size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <p>نقل لأعلى</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveItem(index, 'down');
                    }}
                    disabled={isLast}
                    className="h-6 w-6 text-gray-500 hover:text-gray-700"
                  >
                    <ChevronDown size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <p>نقل لأسفل</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicateItem(index);
                    }}
                    className="h-6 w-6 text-gray-500 hover:text-gray-700"
                  >
                    <Copy size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <p>نسخ الضمان</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveItem(index);
                    }}
                    className="h-6 w-6 text-gray-500 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <p>حذف الضمان</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
      
      {/* محتوى البطاقة - يظهر عند التوسيع */}
      {isExpanded && (
        <CardContent className="p-3">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 mb-2 h-8">
              <TabsTrigger value="content" className="text-xs py-1 flex items-center gap-1">
                <TextIcon size={12} />
                <span>المحتوى</span>
              </TabsTrigger>
              <TabsTrigger value="icon" className="text-xs py-1 flex items-center gap-1">
                <Shield size={12} />
                <span>الأيقونة</span>
              </TabsTrigger>
              <TabsTrigger value="style" className="text-xs py-1 flex items-center gap-1">
                <Palette size={12} />
                <span>المظهر</span>
              </TabsTrigger>
            </TabsList>
            
            {/* تبويب المحتوى */}
            <TabsContent value="content" className="mt-2 space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`item-${index}-title`} className="text-sm font-medium">
                  عنوان الضمان
                </Label>
                <Input
                  id={`item-${index}-title`}
                  value={item.title || ''}
                  onChange={(e) => onItemChange(index, 'title', e.target.value)}
                  placeholder="مثال: ضمان استرجاع لمدة 30 يوم"
                  className="text-sm"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor={`item-${index}-description`} className="text-sm font-medium">
                  وصف الضمان
                </Label>
                <Textarea
                  id={`item-${index}-description`}
                  value={item.description || ''}
                  onChange={(e) => onItemChange(index, 'description', e.target.value)}
                  placeholder="اشرح تفاصيل الضمان هنا..."
                  className="text-sm h-20 resize-none"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor={`item-${index}-highlight`} className="text-sm font-medium">
                  نص مميز
                </Label>
                <Input
                  id={`item-${index}-highlight`}
                  value={item.highlight || ''}
                  onChange={(e) => onItemChange(index, 'highlight', e.target.value)}
                  placeholder="مثال: ضمان مضمون 100%"
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  نص قصير للإبراز (اختياري)
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor={`item-${index}-details-url`} className="text-sm font-medium">
                  رابط التفاصيل
                </Label>
                <Input
                  id={`item-${index}-details-url`}
                  value={item.detailsUrl || ''}
                  onChange={(e) => onItemChange(index, 'detailsUrl', e.target.value)}
                  placeholder="مثال: /policy/returns"
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  رابط لصفحة شروط الضمان (اختياري)
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    إظهار زر "تفاصيل أكثر"
                  </Label>
                  <Switch
                    checked={item.showDetailsButton || false}
                    onCheckedChange={(checked) => onItemChange(index, 'showDetailsButton', checked)}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  إضافة زر لعرض المزيد من التفاصيل
                </p>
              </div>
            </TabsContent>
            
            {/* تبويب الأيقونة */}
            <TabsContent value="icon" className="mt-2 space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">اختر أيقونة</Label>
                <div className="grid grid-cols-5 gap-2 p-1 border rounded-md">
                  {AVAILABLE_ICONS.map((iconOption) => (
                    <button
                      key={iconOption.name}
                      type="button"
                      className={`flex items-center justify-center p-2 rounded-md transition-colors ${
                        item.icon === iconOption.name 
                          ? 'bg-primary text-white' 
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => changeIcon(iconOption.name)}
                    >
                      {iconOption.icon}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">لون الأيقونة</Label>
                <div className="flex flex-wrap gap-2 p-1 border rounded-md">
                  {SUGGESTED_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-6 h-6 rounded-full border ${
                        item.iconColor === color ? 'ring-2 ring-primary ring-offset-1' : ''
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => changeIconColor(color)}
                    />
                  ))}
                  
                  <div className="flex items-center gap-2 mt-2 w-full">
                    <Input
                      type="color"
                      value={item.iconColor || accentColor}
                      onChange={(e) => changeIconColor(e.target.value)}
                      className="w-10 h-8 p-1"
                    />
                    <Input
                      value={item.iconColor || accentColor}
                      onChange={(e) => changeIconColor(e.target.value)}
                      placeholder="#4f46e5"
                      className="flex-1 text-xs h-8"
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    استخدام أيقونة مخصصة
                  </Label>
                  <Switch
                    checked={item.useCustomIcon || false}
                    onCheckedChange={(checked) => onItemChange(index, 'useCustomIcon', checked)}
                  />
                </div>
                {item.useCustomIcon && (
                  <div className="pt-2 space-y-2">
                    <Label htmlFor={`item-${index}-custom-icon`} className="text-sm font-medium">
                      رابط الأيقونة المخصصة (SVG أو صورة)
                    </Label>
                    <Input
                      id={`item-${index}-custom-icon`}
                      value={item.customIconUrl || ''}
                      onChange={(e) => onItemChange(index, 'customIconUrl', e.target.value)}
                      placeholder="https://example.com/icon.svg"
                      className="text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      ادخل رابط الصورة المخصصة (يفضل SVG أو PNG شفاف)
                    </p>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor={`item-${index}-badge-text`} className="text-sm font-medium">
                  نص الشارة
                </Label>
                <Input
                  id={`item-${index}-badge-text`}
                  value={item.badgeText || ''}
                  onChange={(e) => onItemChange(index, 'badgeText', e.target.value)}
                  placeholder="مثال: جديد!"
                  className="text-sm"
                />
                <div className="pt-2 flex items-center gap-2">
                  <Label htmlFor={`item-${index}-badge-color`} className="text-sm font-medium w-28">
                    لون الشارة
                  </Label>
                  <Input
                    id={`item-${index}-badge-color`}
                    type="color"
                    value={item.badgeColor || '#ef4444'}
                    onChange={(e) => onItemChange(index, 'badgeColor', e.target.value)}
                    className="w-10 h-8 p-1"
                  />
                  <Input
                    value={item.badgeColor || '#ef4444'}
                    onChange={(e) => onItemChange(index, 'badgeColor', e.target.value)}
                    className="flex-1 text-xs h-8"
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="style" className="mt-2 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    تخصيص خلفية العنصر
                  </Label>
                  <Switch
                    checked={item.customBackground || false}
                    onCheckedChange={(checked) => onItemChange(index, 'customBackground', checked)}
                  />
                </div>
                
                {item.customBackground && (
                  <>
                    <div className="pt-2 flex items-center gap-2">
                      <Label htmlFor={`item-${index}-bg-color`} className="text-sm font-medium w-28">
                        لون الخلفية
                      </Label>
                      <Input
                        id={`item-${index}-bg-color`}
                        type="color"
                        value={item.backgroundColor || '#ffffff'}
                        onChange={(e) => onItemChange(index, 'backgroundColor', e.target.value)}
                        className="w-10 h-8 p-1"
                      />
                      <Input
                        value={item.backgroundColor || '#ffffff'}
                        onChange={(e) => onItemChange(index, 'backgroundColor', e.target.value)}
                        className="flex-1 text-xs h-8"
                      />
                    </div>
                    
                    <div className="pt-2 flex items-center gap-2">
                      <Label htmlFor={`item-${index}-text-color`} className="text-sm font-medium w-28">
                        لون النص
                      </Label>
                      <Input
                        id={`item-${index}-text-color`}
                        type="color"
                        value={item.textColor || '#333333'}
                        onChange={(e) => onItemChange(index, 'textColor', e.target.value)}
                        className="w-10 h-8 p-1"
                      />
                      <Input
                        value={item.textColor || '#333333'}
                        onChange={(e) => onItemChange(index, 'textColor', e.target.value)}
                        className="flex-1 text-xs h-8"
                      />
                    </div>
                  </>
                )}
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  تأثير خاص
                </Label>
                <Select
                  value={item.specialEffect || 'none'}
                  onValueChange={(value) => onItemChange(index, 'specialEffect', value)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون تأثير</SelectItem>
                    <SelectItem value="glow">توهج خفيف</SelectItem>
                    <SelectItem value="gradient">تدرج لوني</SelectItem>
                    <SelectItem value="shadow">ظل كبير</SelectItem>
                    <SelectItem value="border">إطار ملون</SelectItem>
                    <SelectItem value="ribbon">شريط مميز</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {item.specialEffect === 'gradient' && (
                <div className="pt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`item-${index}-gradient-start`} className="text-sm font-medium w-28">
                      بداية التدرج
                    </Label>
                    <Input
                      id={`item-${index}-gradient-start`}
                      type="color"
                      value={item.gradientStart || item.iconColor || accentColor}
                      onChange={(e) => onItemChange(index, 'gradientStart', e.target.value)}
                      className="w-10 h-8 p-1"
                    />
                    <Input
                      value={item.gradientStart || item.iconColor || accentColor}
                      onChange={(e) => onItemChange(index, 'gradientStart', e.target.value)}
                      className="flex-1 text-xs h-8"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`item-${index}-gradient-end`} className="text-sm font-medium w-28">
                      نهاية التدرج
                    </Label>
                    <Input
                      id={`item-${index}-gradient-end`}
                      type="color"
                      value={item.gradientEnd || '#ffffff'}
                      onChange={(e) => onItemChange(index, 'gradientEnd', e.target.value)}
                      className="w-10 h-8 p-1"
                    />
                    <Input
                      value={item.gradientEnd || '#ffffff'}
                      onChange={(e) => onItemChange(index, 'gradientEnd', e.target.value)}
                      className="flex-1 text-xs h-8"
                    />
                  </div>
                </div>
              )}
              
              {item.specialEffect === 'border' && (
                <div className="pt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`item-${index}-border-color`} className="text-sm font-medium w-28">
                      لون الإطار
                    </Label>
                    <Input
                      id={`item-${index}-border-color`}
                      type="color"
                      value={item.borderColor || item.iconColor || accentColor}
                      onChange={(e) => onItemChange(index, 'borderColor', e.target.value)}
                      className="w-10 h-8 p-1"
                    />
                    <Input
                      value={item.borderColor || item.iconColor || accentColor}
                      onChange={(e) => onItemChange(index, 'borderColor', e.target.value)}
                      className="flex-1 text-xs h-8"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`item-${index}-border-width`} className="text-sm font-medium w-28">
                      سمك الإطار
                    </Label>
                    <Slider
                      id={`item-${index}-border-width`}
                      min={1}
                      max={5}
                      step={1}
                      value={[item.borderWidth || 2]}
                      onValueChange={(value) => onItemChange(index, 'borderWidth', value[0])}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground w-6 text-left">
                      {item.borderWidth || 2}px
                    </span>
                  </div>
                </div>
              )}
              
              {item.specialEffect === 'ribbon' && (
                <div className="pt-2 space-y-2">
                  <Label htmlFor={`item-${index}-ribbon-text`} className="text-sm font-medium">
                    نص الشريط
                  </Label>
                  <Input
                    id={`item-${index}-ribbon-text`}
                    value={item.ribbonText || 'مميز!'}
                    onChange={(e) => onItemChange(index, 'ribbonText', e.target.value)}
                    placeholder="مميز!"
                    className="text-sm"
                  />
                  
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`item-${index}-ribbon-color`} className="text-sm font-medium w-28">
                      لون الشريط
                    </Label>
                    <Input
                      id={`item-${index}-ribbon-color`}
                      type="color"
                      value={item.ribbonColor || '#ef4444'}
                      onChange={(e) => onItemChange(index, 'ribbonColor', e.target.value)}
                      className="w-10 h-8 p-1"
                    />
                    <Input
                      value={item.ribbonColor || '#ef4444'}
                      onChange={(e) => onItemChange(index, 'ribbonColor', e.target.value)}
                      className="flex-1 text-xs h-8"
                    />
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    تمييز العنصر
                  </Label>
                  <Switch
                    checked={item.featured || false}
                    onCheckedChange={(checked) => onItemChange(index, 'featured', checked)}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  إبراز هذا العنصر ليكون أكثر وضوحاً
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    تضمين زر
                  </Label>
                  <Switch
                    checked={item.includeButton || false}
                    onCheckedChange={(checked) => onItemChange(index, 'includeButton', checked)}
                  />
                </div>
                
                {item.includeButton && (
                  <>
                    <div className="pt-2">
                      <Label htmlFor={`item-${index}-button-text`} className="text-sm font-medium">
                        نص الزر
                      </Label>
                      <Input
                        id={`item-${index}-button-text`}
                        value={item.buttonText || 'عرض التفاصيل'}
                        onChange={(e) => onItemChange(index, 'buttonText', e.target.value)}
                        placeholder="عرض التفاصيل"
                        className="text-sm mt-1"
                      />
                    </div>
                    
                    <div className="pt-2">
                      <Label htmlFor={`item-${index}-button-url`} className="text-sm font-medium">
                        رابط الزر
                      </Label>
                      <Input
                        id={`item-${index}-button-url`}
                        value={item.buttonUrl || '#'}
                        onChange={(e) => onItemChange(index, 'buttonUrl', e.target.value)}
                        placeholder="#"
                        className="text-sm mt-1"
                      />
                    </div>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
};

export default GuaranteeItemEditor;
