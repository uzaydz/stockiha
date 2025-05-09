import React, { useState, useRef } from 'react';
import { 
  Card, 
  CardContent
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ImagePlus, 
  Text, 
  ChevronUp, 
  ChevronDown,
  Copy,
  Trash2,
  Move,
  EyeIcon,
  Upload,
  RefreshCw,
  X,
  Check,
  ArrowUpDown
} from 'lucide-react';
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
import ImageUploader from '@/components/ui/ImageUploader';
import { Separator } from '@/components/ui/separator';

interface BeforeAfterItemEditorProps {
  item: any;
  index: number;
  isExpanded: boolean;
  isFirst: boolean;
  isLast: boolean;
  onToggleExpand: () => void;
  onItemChange: (index: number, field: string, value: any) => void;
  onMoveItem: (index: number, direction: 'up' | 'down') => void;
  onDuplicateItem: (index: number) => void;
  onRemoveItem: (index: number) => void;
  onGetRandomImage: () => string;
}

const BeforeAfterItemEditor: React.FC<BeforeAfterItemEditorProps> = ({
  item,
  index,
  isExpanded,
  isFirst,
  isLast,
  onToggleExpand,
  onItemChange,
  onMoveItem,
  onDuplicateItem,
  onRemoveItem,
  onGetRandomImage
}) => {
  const [activeTab, setActiveTab] = useState('before');
  const beforeImageUploaderRef = useRef(null);
  const afterImageUploaderRef = useRef(null);
  
  // معاينة الصورة في نافذة جديدة
  const openImagePreview = (imageUrl: string) => {
    window.open(imageUrl, '_blank');
  };
  
  // تغيير الصورة عشوائيًا
  const changeRandomImage = (field: 'beforeImage' | 'afterImage') => {
    const newImageUrl = onGetRandomImage();
    onItemChange(index, field, newImageUrl);
  };

  // التعامل مع رفع الصور
  const handleImageUploaded = (field: 'beforeImage' | 'afterImage', url: string) => {
    onItemChange(index, field, url);
  };
  
  return (
    <Card className="overflow-hidden border shadow-sm">
      {/* رأس العنصر - مصغر ومنظم */}
      <div 
        className="px-2 py-1.5 flex items-center justify-between bg-muted/20 hover:bg-muted/30 cursor-pointer border-b"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-1">
          <div 
            className="text-gray-500 transition-transform duration-200 w-3.5 h-3.5" 
            style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
          >
            <ChevronDown size={14} />
          </div>
          <span className="font-medium text-xs truncate max-w-[120px]">
            {item.title || `نتيجة ${index + 1}`}
          </span>
          
          {/* مؤشرات الصور */}
          <div className="flex items-center gap-0.5 mr-1">
            {item.beforeImage && (
              <div className="w-2.5 h-2.5 rounded-full bg-purple-100 border border-purple-300 flex items-center justify-center">
                <Check size={6} className="text-purple-500" />
              </div>
            )}
            {item.afterImage && (
              <div className="w-2.5 h-2.5 rounded-full bg-green-100 border border-green-300 flex items-center justify-center">
                <Check size={6} className="text-green-500" />
              </div>
            )}
          </div>
        </div>
        
        {/* أزرار إدارة العنصر */}
        <div className="flex items-center gap-0.5">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicateItem(index);
                  }}
                >
                  <Copy size={12} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">نسخ</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ArrowUpDown size={12} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="bottom" align="end" className="w-fit text-xs">
                    <DropdownMenuItem 
                      onClick={() => onMoveItem(index, 'up')}
                      disabled={isFirst}
                      className="text-xs"
                    >
                      <ChevronUp size={12} className="mr-1.5" />
                      <span>تحريك لأعلى</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onMoveItem(index, 'down')}
                      disabled={isLast}
                      className="text-xs"
                    >
                      <ChevronDown size={12} className="mr-1.5" />
                      <span>تحريك لأسفل</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">تغيير الترتيب</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveItem(index);
                  }}
                >
                  <Trash2 size={12} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">حذف</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      {/* محتوى العنصر */}
      {isExpanded && (
        <CardContent className="p-2 space-y-2">
          {/* حقول العنوان والوصف */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-3 space-y-1">
              <Label htmlFor={`item-${index}-title`} className="text-xs font-medium">عنوان النتيجة</Label>
              <Input
                id={`item-${index}-title`}
                value={item.title || ''}
                onChange={(e) => onItemChange(index, 'title', e.target.value)}
                placeholder="أدخل عنوانًا للنتيجة"
                className="h-7 text-xs"
              />
            </div>
            
            <div className="col-span-3 space-y-1">
              <Label htmlFor={`item-${index}-description`} className="text-xs font-medium flex items-center">
                <Text className="mr-1 h-3 w-3" />
                <span>الوصف</span>
              </Label>
              <Textarea
                id={`item-${index}-description`}
                value={item.description || ''}
                onChange={(e) => onItemChange(index, 'description', e.target.value)}
                placeholder="وصف مختصر للنتيجة"
                className="text-xs min-h-[50px] resize-none"
                rows={2}
              />
            </div>
          </div>
          
          {/* مربعات قبل وبعد */}
          <Tabs defaultValue="before" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full h-7 grid grid-cols-2 mb-1">
              <TabsTrigger value="before" className="text-xs flex items-center gap-1 h-7">
                <span>صورة قبل</span>
              </TabsTrigger>
              <TabsTrigger value="after" className="text-xs flex items-center gap-1 h-7">
                <span>صورة بعد</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="before" className="space-y-2 border rounded-md p-2 mt-1 bg-muted/10">
              <div className="flex items-center gap-2">
                <Label htmlFor={`item-${index}-before-label`} className="text-xs font-medium w-16">
                  التسمية
                </Label>
                <Input
                  id={`item-${index}-before-label`}
                  value={item.beforeLabel || 'قبل'}
                  onChange={(e) => onItemChange(index, 'beforeLabel', e.target.value)}
                  placeholder="قبل"
                  className="h-7 text-xs flex-1"
                />
              </div>
              
              <div className="w-full">
                <ImageUploader
                  ref={beforeImageUploaderRef}
                  imageUrl={item.beforeImage || ''}
                  onImageUploaded={(url) => handleImageUploaded('beforeImage', url)}
                  label="رفع صورة قبل"
                  folder="before-after"
                  aspectRatio="1:1"
                  maxSizeInMB={5}
                  className="w-full"
                  compact={true}
                />
              </div>
              
              <div className="flex justify-between gap-1 mt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => changeRandomImage('beforeImage')}
                  className="h-6 text-xs px-1.5 py-0 flex-1"
                >
                  <RefreshCw size={10} className="mr-1" /> صورة عشوائية
                </Button>
                
                {item.beforeImage && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openImagePreview(item.beforeImage)}
                    className="h-6 text-xs px-1.5 py-0"
                  >
                    <EyeIcon size={10} className="mr-1" /> معاينة
                  </Button>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="after" className="space-y-2 border rounded-md p-2 mt-1 bg-muted/10">
              <div className="flex items-center gap-2">
                <Label htmlFor={`item-${index}-after-label`} className="text-xs font-medium w-16">
                  التسمية
                </Label>
                <Input
                  id={`item-${index}-after-label`}
                  value={item.afterLabel || 'بعد'}
                  onChange={(e) => onItemChange(index, 'afterLabel', e.target.value)}
                  placeholder="بعد"
                  className="h-7 text-xs flex-1"
                />
              </div>
              
              <div className="w-full">
                <ImageUploader
                  ref={afterImageUploaderRef}
                  imageUrl={item.afterImage || ''}
                  onImageUploaded={(url) => handleImageUploaded('afterImage', url)}
                  label="رفع صورة بعد"
                  folder="before-after"
                  aspectRatio="1:1"
                  maxSizeInMB={5}
                  className="w-full"
                  compact={true}
                />
              </div>
              
              <div className="flex justify-between gap-1 mt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => changeRandomImage('afterImage')}
                  className="h-6 text-xs px-1.5 py-0 flex-1"
                >
                  <RefreshCw size={10} className="mr-1" /> صورة عشوائية
                </Button>
                
                {item.afterImage && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openImagePreview(item.afterImage)}
                    className="h-6 text-xs px-1.5 py-0"
                  >
                    <EyeIcon size={10} className="mr-1" /> معاينة
                  </Button>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
};

export default BeforeAfterItemEditor; 