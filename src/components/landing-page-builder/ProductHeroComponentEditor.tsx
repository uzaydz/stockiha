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
  ImageIcon, 
  Settings, 
  Palette, 
  List, 
  Plus, 
  Trash2, 
  Copy,
  MoveVertical,
  Layers,
  SlidersHorizontal, 
  Type,
  FileText,
  FileCode,
  Layout,
  ArrowUpDown,
  Sparkles,
  Image,
  Phone,
  MonitorSmartphone,
  Tag,
  TextIcon
} from 'lucide-react';
import ImageUploader from '@/components/ui/ImageUploader';

interface ProductHeroComponentEditorProps {
  settings: Record<string, any>;
  onUpdate: (settings: Record<string, any>) => void;
}

const ProductHeroComponentEditor: React.FC<ProductHeroComponentEditorProps> = ({
  settings,
  onUpdate
}) => {
  // State for tracking expanded template categories
  const [activeTemplateTab, setActiveTemplateTab] = useState<string>('basic');
  
  // Handle settings change
  const handleSettingsChange = (key: string, value: any) => {
    onUpdate({
      ...settings,
      [key]: value
    });
  };

  // Handle image upload
  const handleImageUploaded = (url: string, type: 'mainImage' | 'gallery' = 'mainImage') => {
    if (type === 'mainImage') {
      handleSettingsChange('imageUrl', url);
    } else {
      // Add to gallery
      const gallery = [...(settings.gallery || [])];
      gallery.push({
        id: uuidv4(),
        url: url,
        alt: 'صورة المنتج'
      });
      handleSettingsChange('gallery', gallery);
    }
  };

  // Main component render
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
                <Label htmlFor="productTitle" className="text-sm font-medium">
                  عنوان المنتج
                </Label>
                <Input
                  id="productTitle"
                  placeholder="سماعات بلوتوث احترافية"
                  value={settings.productTitle || ''}
                  onChange={(e) => handleSettingsChange('productTitle', e.target.value)}
                  className="h-9"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tagline" className="text-sm font-medium">
                  الشعار التسويقي
                </Label>
                <Input
                  id="tagline"
                  placeholder="تجربة صوتية استثنائية ترتقي بمستوى استماعك"
                  value={settings.tagline || ''}
                  onChange={(e) => handleSettingsChange('tagline', e.target.value)}
                  className="h-9"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  وصف المنتج
                </Label>
                <Textarea
                  id="description"
                  placeholder="أحدث تقنيات البلوتوث مع جودة صوت عالية ونقاء استثنائي، تصميم مريح وبطارية تدوم طويلًا..."
                  value={settings.description || ''}
                  onChange={(e) => handleSettingsChange('description', e.target.value)}
                  className="resize-none h-20"
                />
              </div>

              <Separator className="my-3" />
              
              <div className="space-y-3">
                <Label className="text-sm font-medium">معلومات السعر</Label>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price" className="text-xs text-muted-foreground">
                      السعر الحالي
                    </Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        id="price"
                        type="number"
                        placeholder="199"
                        value={settings.price || ''}
                        onChange={(e) => handleSettingsChange('price', e.target.value)}
                        className="h-9"
                      />
                      <Select 
                        value={settings.currency || 'دج'} 
                        onValueChange={(value) => handleSettingsChange('currency', value)}
                      >
                        <SelectTrigger className="w-24 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="دج">دج</SelectItem>
                          <SelectItem value="ريال">ريال</SelectItem>
                          <SelectItem value="دولار">دولار</SelectItem>
                          <SelectItem value="يورو">يورو</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="oldPrice" className="text-xs text-muted-foreground">
                      السعر القديم (اختياري)
                    </Label>
                    <Input
                      id="oldPrice"
                      type="number"
                      placeholder="299"
                      value={settings.oldPrice || ''}
                      onChange={(e) => handleSettingsChange('oldPrice', e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">
                      إظهار شارة الخصم
                    </Label>
                    <Switch
                      checked={settings.showDiscount || false}
                      onCheckedChange={(checked) => handleSettingsChange('showDiscount', checked)}
                    />
                  </div>
                  {settings.showDiscount && settings.price && settings.oldPrice && (
                    <div className="w-fit">
                      <Badge className="bg-red-500 text-white">
                        خصم {Math.round((1 - Number(settings.price) / Number(settings.oldPrice)) * 100)}%
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priceLabel" className="text-xs text-muted-foreground">
                    نص إضافي (اختياري)
                  </Label>
                  <Input
                    id="priceLabel"
                    placeholder="شامل الضريبة | شحن مجاني"
                    value={settings.priceLabel || ''}
                    onChange={(e) => handleSettingsChange('priceLabel', e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>

              <Separator className="my-3" />
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">أزرار الدعوة للإجراء</Label>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="primaryButtonText" className="text-xs text-muted-foreground">
                        الزر الرئيسي
                      </Label>
                      <Input
                        id="primaryButtonText"
                        placeholder="اطلب الآن"
                        value={settings.primaryButtonText || ''}
                        onChange={(e) => handleSettingsChange('primaryButtonText', e.target.value)}
                        className="h-9"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="primaryButtonLink" className="text-xs text-muted-foreground">
                        رابط الزر الرئيسي
                      </Label>
                      <Input
                        id="primaryButtonLink"
                        placeholder="#order"
                        value={settings.primaryButtonLink || ''}
                        onChange={(e) => handleSettingsChange('primaryButtonLink', e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="secondaryButtonText" className="text-xs text-muted-foreground">
                        الزر الثانوي (اختياري)
                      </Label>
                      <Input
                        id="secondaryButtonText"
                        placeholder="تفاصيل أكثر"
                        value={settings.secondaryButtonText || ''}
                        onChange={(e) => handleSettingsChange('secondaryButtonText', e.target.value)}
                        className="h-9"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="secondaryButtonLink" className="text-xs text-muted-foreground">
                        رابط الزر الثانوي
                      </Label>
                      <Input
                        id="secondaryButtonLink"
                        placeholder="#details"
                        value={settings.secondaryButtonLink || ''}
                        onChange={(e) => handleSettingsChange('secondaryButtonLink', e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        
        {/* قسم الوسائط */}
        <AccordionItem value="media" className="border rounded-md overflow-hidden shadow-sm">
          <AccordionTrigger className="px-3 py-2 hover:bg-muted/40 data-[state=open]:bg-muted/40">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                <Image size={15} className="text-primary" />
              </div>
              <span className="text-sm font-medium">الصور والوسائط</span>
            </div>
          </AccordionTrigger>
          
          <AccordionContent className="pt-3 pb-1">
            <div className="px-3 space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  الصورة الرئيسية للمنتج
                </Label>
                
                {settings.imageUrl && (
                  <div className="w-full aspect-video rounded-md overflow-hidden border mb-3">
                    <img 
                      src={settings.imageUrl}
                      alt="صورة المنتج الرئيسية"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwIiBoZWlnaHQ9IjE2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTYwIiBoZWlnaHQ9IjE2MCIgZmlsbD0iI2VlZWVlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmaWxsPSIjOTk5OTk5Ij5JbWFnZTwvdGV4dD48L3N2Zz4=';
                      }}
                    />
                  </div>
                )}
                
                <ImageUploader
                  imageUrl={settings.imageUrl}
                  onImageUploaded={(url) => handleImageUploaded(url, 'mainImage')}
                  folder="products"
                  label="إضافة الصورة الرئيسية"
                  maxSizeInMB={5}
                />
                
                <div className="space-y-2 mt-2">
                  <Label htmlFor="imageAlt" className="text-xs text-muted-foreground">
                    النص البديل للصورة
                  </Label>
                  <Input
                    id="imageAlt"
                    placeholder="وصف الصورة للقراء البصريين"
                    value={settings.imageAlt || ''}
                    onChange={(e) => handleSettingsChange('imageAlt', e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
              
              <Separator className="my-3" />
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    إظهار معرض صور إضافية
                  </Label>
                  <Switch
                    checked={settings.showGallery || false}
                    onCheckedChange={(checked) => handleSettingsChange('showGallery', checked)}
                  />
                </div>
                
                {settings.showGallery && (
                  <div className="space-y-3 mt-3">
                    <Label className="text-sm">صور المعرض</Label>
                    
                    <div className="grid grid-cols-3 gap-2">
                      {(settings.gallery || []).map((image: any, index: number) => (
                        <div key={image.id} className="relative group border rounded-md overflow-hidden">
                          <img 
                            src={image.url} 
                            alt={image.alt || 'صورة المنتج'} 
                            className="aspect-square object-cover w-full h-full"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                            <Button
                              variant="destructive"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                const newGallery = [...(settings.gallery || [])];
                                newGallery.splice(index, 1);
                                handleSettingsChange('gallery', newGallery);
                              }}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>
                      ))}
                      
                      <div className="border border-dashed rounded-md aspect-square flex items-center justify-center">
                        <Button 
                          onClick={() => {
                            const fileInput = document.createElement('input');
                            fileInput.type = 'file';
                            fileInput.accept = 'image/*';
                            fileInput.onchange = (e) => {
                              const target = e.target as HTMLInputElement;
                              if (target.files && target.files[0]) {
                                const file = target.files[0];
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  const url = event.target?.result as string;
                                  handleImageUploaded(url, 'gallery');
                                };
                                reader.readAsDataURL(file);
                              }
                            };
                            fileInput.click();
                          }}
                          variant="ghost"
                          className="h-8 w-8 rounded-full p-0"
                        >
                          <Plus size={14} />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">
                          تكبير الصور عند النقر
                        </Label>
                        <Switch
                          checked={settings.enableZoom || false}
                          onCheckedChange={(checked) => handleSettingsChange('enableZoom', checked)}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        تمكين ميزة تكبير الصور عند النقر عليها
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              <Separator className="my-3" />
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    إظهار فيديو للمنتج
                  </Label>
                  <Switch
                    checked={settings.showVideo || false}
                    onCheckedChange={(checked) => handleSettingsChange('showVideo', checked)}
                  />
                </div>
                
                {settings.showVideo && (
                  <div className="space-y-3 mt-3">
                    <div className="space-y-2">
                      <Label htmlFor="videoUrl" className="text-xs text-muted-foreground">
                        رابط الفيديو (YouTube أو Vimeo)
                      </Label>
                      <Input
                        id="videoUrl"
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={settings.videoUrl || ''}
                        onChange={(e) => handleSettingsChange('videoUrl', e.target.value)}
                        className="h-9"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="videoThumbnail" className="text-xs text-muted-foreground">
                        صورة مصغرة للفيديو (اختياري)
                      </Label>
                      {settings.videoThumbnail && (
                        <div className="w-full aspect-video rounded-md overflow-hidden border mb-3">
                          <img 
                            src={settings.videoThumbnail}
                            alt="صورة مصغرة للفيديو"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      
                      <ImageUploader
                        imageUrl={settings.videoThumbnail}
                        onImageUploaded={(url) => handleSettingsChange('videoThumbnail', url)}
                        folder="products/thumbnails"
                        label="إضافة صورة مصغرة"
                        maxSizeInMB={2}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        
        {/* قسم المظهر */}
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
              <div className="space-y-3">
                <Label className="text-sm font-medium">نوع التخطيط</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={settings.layout === 'classic' || !settings.layout ? 'default' : 'outline'}
                    className="flex flex-col items-center justify-center py-3 h-auto gap-1.5"
                    onClick={() => handleSettingsChange('layout', 'classic')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <div className="h-8 w-8 border-r border-dashed"></div>
                      <div className="h-8 w-8 bg-primary/20 rounded-sm"></div>
                    </div>
                    <span className="text-xs">صورة جانبية</span>
                  </Button>
                  
                  <Button
                    type="button"
                    variant={settings.layout === 'stacked' ? 'default' : 'outline'}
                    className="flex flex-col items-center justify-center py-3 h-auto gap-1.5"
                    onClick={() => handleSettingsChange('layout', 'stacked')}
                  >
                    <div className="flex flex-col items-center justify-center gap-1">
                      <div className="h-4 w-12 bg-primary/20 rounded-sm"></div>
                      <div className="h-4 w-12 border-t border-dashed"></div>
                    </div>
                    <span className="text-xs">عمودي</span>
                  </Button>
                  
                  <Button
                    type="button"
                    variant={settings.layout === 'overlay' ? 'default' : 'outline'}
                    className="flex flex-col items-center justify-center py-3 h-auto gap-1.5"
                    onClick={() => handleSettingsChange('layout', 'overlay')}
                  >
                    <div className="relative w-16 h-8">
                      <div className="absolute inset-0 bg-primary/20 rounded-sm"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-3 bg-white/80 rounded-sm"></div>
                      </div>
                    </div>
                    <span className="text-xs">متراكب</span>
                  </Button>
                  
                  <Button
                    type="button"
                    variant={settings.layout === 'asymmetric' ? 'default' : 'outline'}
                    className="flex flex-col items-center justify-center py-3 h-auto gap-1.5"
                    onClick={() => handleSettingsChange('layout', 'asymmetric')}
                  >
                    <div className="relative w-16 h-8">
                      <div className="absolute left-0 top-0 w-10 h-8 bg-primary/20 rounded-sm"></div>
                      <div className="absolute right-0 bottom-0 w-8 h-5 bg-primary/40 rounded-sm"></div>
                    </div>
                    <span className="text-xs">غير متماثل</span>
                  </Button>
                </div>
              </div>
              
              <Separator className="my-3" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="backgroundColor" className="text-sm font-medium">
                    لون الخلفية
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="backgroundColor"
                      type="color"
                      value={settings.backgroundColor || '#ffffff'}
                      onChange={(e) => handleSettingsChange('backgroundColor', e.target.value)}
                      className="w-12 h-9 p-1"
                    />
                    <Input
                      value={settings.backgroundColor || '#ffffff'}
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
                      value={settings.textColor || '#000000'}
                      onChange={(e) => handleSettingsChange('textColor', e.target.value)}
                      className="w-12 h-9 p-1"
                    />
                    <Input
                      value={settings.textColor || '#000000'}
                      onChange={(e) => handleSettingsChange('textColor', e.target.value)}
                      className="h-9 flex-1"
                    />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="accentColor" className="text-sm font-medium">
                    اللون الرئيسي
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="accentColor"
                      type="color"
                      value={settings.accentColor || '#0ea5e9'}
                      onChange={(e) => handleSettingsChange('accentColor', e.target.value)}
                      className="w-12 h-9 p-1"
                    />
                    <Input
                      value={settings.accentColor || '#0ea5e9'}
                      onChange={(e) => handleSettingsChange('accentColor', e.target.value)}
                      className="h-9 flex-1"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="secondaryColor" className="text-sm font-medium">
                    اللون الثانوي
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={settings.secondaryColor || '#6b7280'}
                      onChange={(e) => handleSettingsChange('secondaryColor', e.target.value)}
                      className="w-12 h-9 p-1"
                    />
                    <Input
                      value={settings.secondaryColor || '#6b7280'}
                      onChange={(e) => handleSettingsChange('secondaryColor', e.target.value)}
                      className="h-9 flex-1"
                    />
                  </div>
                </div>
              </div>
              
              <Separator className="my-3" />
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    استخدام خلفية متدرجة
                  </Label>
                  <Switch
                    checked={settings.useGradient || false}
                    onCheckedChange={(checked) => handleSettingsChange('useGradient', checked)}
                  />
                </div>
                
                {settings.useGradient && (
                  <div className="space-y-3 mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="gradientStart" className="text-xs text-muted-foreground">
                        لون بداية التدرج
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="gradientStart"
                          type="color"
                          value={settings.gradientStart || '#4f46e5'}
                          onChange={(e) => handleSettingsChange('gradientStart', e.target.value)}
                          className="w-12 h-9 p-1"
                        />
                        <Input
                          value={settings.gradientStart || '#4f46e5'}
                          onChange={(e) => handleSettingsChange('gradientStart', e.target.value)}
                          className="h-9 flex-1"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="gradientEnd" className="text-xs text-muted-foreground">
                        لون نهاية التدرج
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="gradientEnd"
                          type="color"
                          value={settings.gradientEnd || '#0ea5e9'}
                          onChange={(e) => handleSettingsChange('gradientEnd', e.target.value)}
                          className="w-12 h-9 p-1"
                        />
                        <Input
                          value={settings.gradientEnd || '#0ea5e9'}
                          onChange={(e) => handleSettingsChange('gradientEnd', e.target.value)}
                          className="h-9 flex-1"
                        />
                      </div>
                    </div>
                    
                    <div className="col-span-2 space-y-1">
                      <Label htmlFor="gradientDirection" className="text-xs text-muted-foreground">
                        اتجاه التدرج
                      </Label>
                      <Select 
                        value={settings.gradientDirection || 'to-r'} 
                        onValueChange={(value) => handleSettingsChange('gradientDirection', value)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="to-r">من اليمين إلى اليسار</SelectItem>
                          <SelectItem value="to-l">من اليسار إلى اليمين</SelectItem>
                          <SelectItem value="to-t">من الأعلى إلى الأسفل</SelectItem>
                          <SelectItem value="to-b">من الأسفل إلى الأعلى</SelectItem>
                          <SelectItem value="to-tr">قطري (أعلى اليمين)</SelectItem>
                          <SelectItem value="to-bl">قطري (أسفل اليسار)</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <div className="h-6 mt-2 rounded-md overflow-hidden"
                        style={{
                          background: `linear-gradient(${settings.gradientDirection === 'to-r' ? 'to right' : 
                                                        settings.gradientDirection === 'to-l' ? 'to left' :
                                                        settings.gradientDirection === 'to-t' ? 'to top' :
                                                        settings.gradientDirection === 'to-b' ? 'to bottom' :
                                                        settings.gradientDirection === 'to-tr' ? 'to top right' :
                                                        settings.gradientDirection === 'to-bl' ? 'to bottom left' : 'to right'}, 
                                                        ${settings.gradientStart || '#4f46e5'}, ${settings.gradientEnd || '#0ea5e9'})`
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    إظهار ظلال العناصر
                  </Label>
                  <Switch
                    checked={settings.enableShadows || false}
                    onCheckedChange={(checked) => handleSettingsChange('enableShadows', checked)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    تأثيرات حركية للعناصر
                  </Label>
                  <Switch
                    checked={settings.enableAnimations || false}
                    onCheckedChange={(checked) => handleSettingsChange('enableAnimations', checked)}
                  />
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* سيتم إضافة الأقسام الإضافية لاحقاً */}
      </Accordion>
    </div>
  );
};

export default ProductHeroComponentEditor; 