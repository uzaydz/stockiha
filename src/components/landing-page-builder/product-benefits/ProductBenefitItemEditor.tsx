import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';import { useOptimizedClickHandler } from "@/lib/performance-utils";

import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger
 } from "@/components/ui/dropdown-menu";
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
  RefreshCw,
  EyeIcon,
  Sparkles,
  Clock,
  CheckCircle,
  Shield,
  Heart,
  Star,
  Zap,
  Award,
  TrendingUp,
  DollarSign,
  Users,
  Truck,
  Gift,
  ThumbsUp,
  ImageIcon,
  TextIcon
} from 'lucide-react';

interface ProductBenefitItemEditorProps {
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
  onGetRandomImage: () => string;
}

// قائمة بجميع الأيقونات المتاحة
const AVAILABLE_ICONS = [
  { name: 'Sparkles', icon: <Sparkles size={16} /> },
  { name: 'Clock', icon: <Clock size={16} /> },
  { name: 'CheckCircle', icon: <CheckCircle size={16} /> },
  { name: 'Shield', icon: <Shield size={16} /> },
  { name: 'Heart', icon: <Heart size={16} /> },
  { name: 'Star', icon: <Star size={16} /> },
  { name: 'Zap', icon: <Zap size={16} /> },
  { name: 'Award', icon: <Award size={16} /> },
  { name: 'TrendingUp', icon: <TrendingUp size={16} /> },
  { name: 'DollarSign', icon: <DollarSign size={16} /> },
  { name: 'Users', icon: <Users size={16} /> },
  { name: 'Truck', icon: <Truck size={16} /> },
  { name: 'Gift', icon: <Gift size={16} /> },
  { name: 'ThumbsUp', icon: <ThumbsUp size={16} /> }
];

// قائمة بألوان متناسقة للاختيار منها
const PREDEFINED_COLORS = [
  '#4f46e5', // indigo
  '#0ea5e9', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
];

const ProductBenefitItemEditor: React.FC<ProductBenefitItemEditorProps> = ({
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
  onRemoveItem,
  onGetRandomImage
}) => {
  const [activeTab, setActiveTab] = useState('content');
  
  // معاينة الصورة
  const openImagePreview = (imageUrl: string) => {
    window.open(imageUrl, '_blank');
  };
  
  // تغيير الأيقونة
  const changeIcon = (iconName: string) => {
    onItemChange(index, 'icon', iconName);
  };
  
  // تغيير لون الأيقونة
  const changeIconColor = (color: string) => {
    onItemChange(index, 'iconColor', color);
  };
  
  // استخدام صورة عشوائية
  const handleRandomImage = () => {
    const newImageUrl = onGetRandomImage();
    onItemChange(index, 'image', newImageUrl);
  };
  
  // الحصول على مكون الأيقونة المحدد
  const getSelectedIcon = () => {
    const foundIcon = AVAILABLE_ICONS.find(i => i.name === item.icon);
    return foundIcon ? foundIcon.icon : <Sparkles size={16} />;
  };
  
  return (
    <Card className="overflow-hidden border shadow-sm">
      {/* رأس العنصر - مضغوط ومنظم */}
      <div 
        className="p-2 flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 cursor-pointer border-b"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-1.5">
          <div 
            className="text-gray-500 transition-transform duration-200 w-4 h-4" 
            style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
          >
            <ChevronDown size={16} />
          </div>
          
          {/* عرض أيقونة الفائدة ولونها */}
          <div 
            className="w-5 h-5 rounded-md flex items-center justify-center text-white mr-1"
            style={{ backgroundColor: item.iconColor || accentColor }}
          >
            {getSelectedIcon()}
          </div>
          
          <span className="font-medium text-sm truncate max-w-[140px]">
            {item.title || `فائدة ${index + 1}`}
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
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-500 hover:text-gray-700">
                <Move size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem 
                onClick={() => onDuplicateItem(index)}
                className="cursor-pointer text-xs"
              >
                <Copy className="mr-2 h-3.5 w-3.5" />
                نسخ الفائدة
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onRemoveItem(index)}
                className="text-red-600 focus:text-red-600 cursor-pointer text-xs"
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                حذف الفائدة
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* محتوى تفاصيل العنصر */}
      {isExpanded && (
        <CardContent className="p-3">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 mb-2 h-8">
              <TabsTrigger value="content" className="text-xs py-1 flex items-center gap-1">
                <TextIcon size={12} />
                <span>المحتوى</span>
              </TabsTrigger>
              <TabsTrigger value="icon" className="text-xs py-1 flex items-center gap-1">
                <Sparkles size={12} />
                <span>الأيقونة</span>
              </TabsTrigger>
              <TabsTrigger value="image" className="text-xs py-1 flex items-center gap-1">
                <ImageIcon size={12} />
                <span>الصورة</span>
              </TabsTrigger>
            </TabsList>
            
            {/* تبويب المحتوى */}
            <TabsContent value="content" className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor={`item-${index}-title`} className="text-xs font-medium">
                  عنوان الفائدة
                </Label>
                <Input
                  id={`item-${index}-title`}
                  value={item.title || ''}
                  onChange={(e) => onItemChange(index, 'title', e.target.value)}
                  placeholder="أدخل عنوان الفائدة"
                  className="h-8 text-sm"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor={`item-${index}-description`} className="text-xs font-medium">
                  وصف الفائدة
                </Label>
                <Textarea
                  id={`item-${index}-description`}
                  value={item.description || ''}
                  onChange={(e) => onItemChange(index, 'description', e.target.value)}
                  placeholder="اشرح فائدة المنتج بالتفصيل..."
                  className="resize-y min-h-[70px] text-sm"
                />
              </div>
            </TabsContent>
            
            {/* تبويب الأيقونة */}
            <TabsContent value="icon" className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium">اختر أيقونة</Label>
                <div className="grid grid-cols-7 gap-1 border rounded-md p-2">
                  {AVAILABLE_ICONS.map((iconObj) => (
                    <TooltipProvider key={iconObj.name}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant={item.icon === iconObj.name ? "default" : "ghost"}
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => changeIcon(iconObj.name)}
                          >
                            {iconObj.icon}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <p>{iconObj.name}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs font-medium">لون الأيقونة</Label>
                <div className="grid grid-cols-5 gap-2">
                  {PREDEFINED_COLORS.map((color) => (
                    <Button
                      key={color}
                      type="button"
                      variant="outline"
                      className={`h-8 w-full p-0.5 ${item.iconColor === color ? 'ring-2 ring-offset-2' : ''}`}
                      style={{ borderColor: color }}
                      onClick={() => changeIconColor(color)}
                    >
                      <div 
                        className="w-full h-full rounded-sm" 
                        style={{ backgroundColor: color }}
                      ></div>
                    </Button>
                  ))}
                </div>
                
                <div className="flex gap-2 items-center pt-1">
                  <Label htmlFor={`item-${index}-custom-color`} className="text-xs font-medium">
                    لون مخصص
                  </Label>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md border overflow-hidden">
                      <input
                        type="color"
                        id={`item-${index}-custom-color`}
                        value={item.iconColor || accentColor}
                        onChange={(e) => onItemChange(index, 'iconColor', e.target.value)}
                        className="w-9 h-9 -ml-1 -mt-1 cursor-pointer"
                      />
                    </div>
                    <Input
                      value={item.iconColor || accentColor}
                      onChange={(e) => onItemChange(index, 'iconColor', e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
              </div>
              
              {/* معاينة الأيقونة */}
              <div className="pt-2">
                <Label className="text-xs font-medium">معاينة</Label>
                <div className="mt-2 flex justify-center">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white"
                    style={{ backgroundColor: item.iconColor || accentColor }}
                  >
                    {React.cloneElement(getSelectedIcon(), { size: 22 })}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {/* تبويب الصورة */}
            <TabsContent value="image" className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`item-${index}-image`} className="text-xs font-medium">
                    رابط الصورة
                  </Label>
                  <div className="flex gap-1">
                    {item.image && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => openImagePreview(item.image)}
                              className="h-6 w-6 p-0"
                            >
                              <EyeIcon size={12} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">
                            <p>معاينة الصورة</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleRandomImage}
                            className="h-6 w-6 p-0"
                          >
                            <RefreshCw size={12} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">
                          <p>صورة عشوائية</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
                
                <Input
                  id={`item-${index}-image`}
                  value={item.image || ''}
                  onChange={(e) => onItemChange(index, 'image', e.target.value)}
                  placeholder="أدخل رابط الصورة"
                  className="h-7 text-sm"
                />
                
                {item.image && (
                  <div className="border rounded-md overflow-hidden aspect-video h-[100px] bg-muted/30">
                    <img 
                      src={item.image} 
                      alt={item.title || `فائدة ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=صورة+غير+متوفرة';
                      }}
                    />
                  </div>
                )}
                
                {!item.image && (
                  <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-md p-3 text-muted-foreground">
                    <ImageIcon className="h-8 w-8 mb-1" />
                    <p className="text-xs">لم يتم تحديد صورة</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRandomImage}
                      className="mt-2 h-7 text-xs"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      <span>استخدام صورة عشوائية</span>
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
};

export default ProductBenefitItemEditor;
