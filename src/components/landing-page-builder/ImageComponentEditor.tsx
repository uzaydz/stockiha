import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import ImageUploader from '@/components/ui/ImageUploader';
import ImageComponentPreview from './ImageComponentPreview';
import { 
  Image as ImageIcon,
  Link as LinkIcon,
  Type as TypeIcon,
  Palette as PaletteIcon,
  Box as BoxIcon,
  Settings as SettingsIcon,
  Eye as EyeIcon,
  CornerDownLeft as CornerDownLeftIcon
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ImageComponentEditorProps {
  settings: {
    imageUrl: string;
    altText: string;
    caption: string;
    maxWidth: string;
    alignment: string;
    border: boolean;
    borderColor: string;
    borderWidth: number;
    borderRadius: number;
    shadow: boolean;
    shadowIntensity: string;
    overlay: boolean;
    overlayColor: string;
    overlayOpacity: number;
    onClick: string;
    linkUrl: string;
    hoverEffect?: string;
    [key: string]: any;
  };
  onUpdate: (settings: Record<string, any>) => void;
}

/**
 * محرر مكون الصورة المحسن مع واجهة احترافية
 */
const ImageComponentEditor: React.FC<ImageComponentEditorProps> = ({ settings, onUpdate }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('basic');
  const [showPreview, setShowPreview] = useState(false);
  
  // تحديث أي إعداد
  const handleChange = (key: string, value: any) => {
    // Convertir 'none' a '' para mantener la compatibilidad con el código existente
    // que espera valores vacíos para estos campos específicos
    if ((key === 'onClick' || key === 'hoverEffect') && value === 'none') {
      onUpdate({ ...settings, [key]: '' });
    } else {
      onUpdate({ ...settings, [key]: value });
    }
  };
  
  // معالج تحميل الصورة
  const handleImageUploaded = (url: string) => {
    handleChange('imageUrl', url);
  };
  
  return (
    <div className="space-y-6">
      {/* معاينة سريعة للمكون */}
      <div className="relative">
        <Button 
          variant={showPreview ? "default" : "outline"} 
          size="sm" 
          className="absolute top-0 right-0 z-10 gap-1"
          onClick={() => setShowPreview(!showPreview)}
        >
          <EyeIcon size={14} />
          {showPreview ? t('إخفاء المعاينة') : t('إظهار المعاينة')}
        </Button>
        
        {showPreview && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="pt-12 pb-4"
          >
            <Card className="overflow-hidden border border-dashed">
              <div className="p-2 bg-muted/50 text-center text-xs text-muted-foreground border-b">
                {t('معاينة المكون')}
              </div>
              <div className="bg-[url('/grid-pattern-light.svg')] dark:bg-[url('/grid-pattern-dark.svg')]">
                <ImageComponentPreview settings={settings} isEditing={true} />
              </div>
            </Card>
          </motion.div>
        )}
      </div>
      
      {/* تبويبات الإعدادات */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-4 mb-4">
          <TabsTrigger value="basic" className="flex gap-1 items-center">
            <ImageIcon size={14} />
            <span className="hidden sm:inline">{t('أساسي')}</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex gap-1 items-center">
            <PaletteIcon size={14} />
            <span className="hidden sm:inline">{t('المظهر')}</span>
          </TabsTrigger>
          <TabsTrigger value="interaction" className="flex gap-1 items-center">
            <LinkIcon size={14} />
            <span className="hidden sm:inline">{t('التفاعل')}</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex gap-1 items-center">
            <SettingsIcon size={14} />
            <span className="hidden sm:inline">{t('متقدم')}</span>
          </TabsTrigger>
        </TabsList>
        
        {/* الإعدادات الأساسية */}
        <TabsContent value="basic" className="space-y-4">
          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <ImageIcon size={16} className="text-primary" />
                <h3 className="font-medium">{t('الصورة')}</h3>
              </div>
              
              {settings.imageUrl && (
                <div className="relative w-full aspect-video rounded-md overflow-hidden border mb-4 group">
                  <img 
                    src={settings.imageUrl} 
                    alt={settings.altText || t('معاينة الصورة')} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwIiBoZWlnaHQ9IjE2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTYwIiBoZWlnaHQ9IjE2MCIgZmlsbD0iI2VlZWVlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmaWxsPSIjOTk5OTk5Ij5JbWFnZTwvdGV4dD48L3N2Zz4=';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleChange('imageUrl', '')}
                    >
                      {t('إزالة الصورة')}
                    </Button>
                  </div>
                </div>
              )}
              
              <ImageUploader
                imageUrl={settings.imageUrl}
                onImageUploaded={handleImageUploaded}
                folder="landing-pages"
                label={settings.imageUrl ? t('تغيير الصورة') : t('اختر صورة')}
                maxSizeInMB={5}
              />
              
              <div className="space-y-2 mt-4">
                <Label htmlFor="image-url">{t('رابط الصورة')}</Label>
                <div className="flex gap-2">
                  <Input
                    id="image-url"
                    value={settings.imageUrl || ''}
                    onChange={(e) => handleChange('imageUrl', e.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                  {settings.imageUrl && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="shrink-0"
                      onClick={() => window.open(settings.imageUrl, '_blank')}
                    >
                      <LinkIcon size={16} />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('يمكنك استخدام رابط صورة مباشرة أو تحميل صورة باستخدام الزر أعلاه')}
                </p>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <TypeIcon size={16} className="text-primary" />
                <h3 className="font-medium">{t('الوصف والتسمية')}</h3>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="alt-text">{t('النص البديل للصورة')}</Label>
                  <Input
                    id="alt-text"
                    value={settings.altText || ''}
                    onChange={(e) => handleChange('altText', e.target.value)}
                    placeholder={t('وصف الصورة للقارئات الصوتية')}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('هذا النص سيظهر إذا تعذر تحميل الصورة ويساعد محركات البحث والقارئات الصوتية')}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="caption">{t('تعليق الصورة')}</Label>
                  <Input
                    id="caption"
                    value={settings.caption || ''}
                    onChange={(e) => handleChange('caption', e.target.value)}
                    placeholder={t('تعليق يظهر أسفل الصورة')}
                  />
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <BoxIcon size={16} className="text-primary" />
                <h3 className="font-medium">{t('الأبعاد والمحاذاة')}</h3>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="max-width">{t('الحد الأقصى للعرض')}</Label>
                  <div className="flex gap-2">
                    <Select 
                      value={settings.maxWidth || '100%'}
                      onValueChange={(value) => handleChange('maxWidth', value)}
                    >
                      <SelectTrigger id="max-width" className="flex-1">
                        <SelectValue placeholder={t('اختر العرض')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="100%">{t('عرض كامل')}</SelectItem>
                        <SelectItem value="75%">{t('ثلاثة أرباع')}</SelectItem>
                        <SelectItem value="50%">{t('نصف')}</SelectItem>
                        <SelectItem value="33%">{t('ثلث')}</SelectItem>
                        <SelectItem value="25%">{t('ربع')}</SelectItem>
                        <SelectItem value="custom">{t('مخصص')}</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {settings.maxWidth === 'custom' && (
                      <Input
                        value={settings.customWidth || ''}
                        onChange={(e) => handleChange('customWidth', e.target.value)}
                        placeholder="400px"
                        className="w-24 shrink-0"
                      />
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="alignment">{t('محاذاة الصورة')}</Label>
                  <div className="flex rounded-md border overflow-hidden">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      className={cn(
                        "flex-1 rounded-none h-10 border-0",
                        settings.alignment === 'right' ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""
                      )}
                      onClick={() => handleChange('alignment', 'right')}
                    >
                      {t('يمين')}
                    </Button>
                    <Separator orientation="vertical" />
                    <Button 
                      type="button" 
                      variant="ghost" 
                      className={cn(
                        "flex-1 rounded-none h-10 border-0",
                        settings.alignment === 'center' ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""
                      )}
                      onClick={() => handleChange('alignment', 'center')}
                    >
                      {t('وسط')}
                    </Button>
                    <Separator orientation="vertical" />
                    <Button 
                      type="button" 
                      variant="ghost" 
                      className={cn(
                        "flex-1 rounded-none h-10 border-0",
                        settings.alignment === 'left' ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""
                      )}
                      onClick={() => handleChange('alignment', 'left')}
                    >
                      {t('يسار')}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
        
        {/* إعدادات المظهر */}
        <TabsContent value="appearance" className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <BoxIcon size={16} className="text-primary" />
              <h3 className="font-medium">{t('الإطار والحواف')}</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox 
                  id="border" 
                  checked={settings.border || false}
                  onCheckedChange={(checked) => handleChange('border', checked)}
                />
                <Label htmlFor="border" className="cursor-pointer">
                  {t('إظهار إطار حول الصورة')}
                </Label>
              </div>
              
              {settings.border && (
                <div className="space-y-4 border rounded-md p-3 bg-muted/30">
                  <div className="space-y-2">
                    <Label htmlFor="border-color">{t('لون الإطار')}</Label>
                    <div className="flex gap-2">
                      <Input 
                        id="border-color-picker"
                        type="color"
                        className="w-12 h-9 p-1"
                        value={settings.borderColor || '#000000'} 
                        onChange={(e) => handleChange('borderColor', e.target.value)}
                      />
                      <Input 
                        id="border-color"
                        value={settings.borderColor || '#000000'} 
                        onChange={(e) => handleChange('borderColor', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="border-width">{t('سمك الإطار')}</Label>
                      <Badge variant="outline" className="font-mono">
                        {settings.borderWidth || 1}px
                      </Badge>
                    </div>
                    <Slider
                      id="border-width"
                      value={[settings.borderWidth || 1]}
                      min={1}
                      max={10}
                      step={1}
                      onValueChange={(value) => handleChange('borderWidth', value[0])}
                      className="py-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>1px</span>
                      <span>10px</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="border-radius">{t('تدوير الزوايا')}</Label>
                      <Badge variant="outline" className="font-mono">
                        {settings.borderRadius || 0}px
                      </Badge>
                    </div>
                    <Slider
                      id="border-radius"
                      value={[settings.borderRadius || 0]}
                      min={0}
                      max={30}
                      step={1}
                      onValueChange={(value) => handleChange('borderRadius', value[0])}
                      className="py-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0px</span>
                      <span>30px</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <PaletteIcon size={16} className="text-primary" />
              <h3 className="font-medium">{t('الظل والتأثيرات')}</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox 
                  id="shadow" 
                  checked={settings.shadow || false}
                  onCheckedChange={(checked) => handleChange('shadow', checked)}
                />
                <Label htmlFor="shadow" className="cursor-pointer">
                  {t('إضافة ظل للصورة')}
                </Label>
              </div>
              
              {settings.shadow && (
                <div className="space-y-4 border rounded-md p-3 bg-muted/30">
                  <div className="space-y-2">
                    <Label htmlFor="shadow-intensity">{t('كثافة الظل')}</Label>
                    <Select 
                      value={settings.shadowIntensity || 'medium'}
                      onValueChange={(value) => handleChange('shadowIntensity', value)}
                    >
                      <SelectTrigger id="shadow-intensity">
                        <SelectValue placeholder={t('اختر كثافة الظل')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">{t('خفيف')}</SelectItem>
                        <SelectItem value="medium">{t('متوسط')}</SelectItem>
                        <SelectItem value="heavy">{t('قوي')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              
              <Separator className="my-2" />
              
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox 
                  id="overlay" 
                  checked={settings.overlay || false}
                  onCheckedChange={(checked) => handleChange('overlay', checked)}
                />
                <Label htmlFor="overlay" className="cursor-pointer">
                  {t('إضافة طبقة تغطية للصورة')}
                </Label>
              </div>
              
              {settings.overlay && (
                <div className="space-y-4 border rounded-md p-3 bg-muted/30">
                  <div className="space-y-2">
                    <Label htmlFor="overlay-color">{t('لون طبقة التغطية')}</Label>
                    <div className="flex gap-2">
                      <Input 
                        id="overlay-color-picker"
                        type="color"
                        className="w-12 h-9 p-1"
                        value={settings.overlayColor || '#000000'} 
                        onChange={(e) => handleChange('overlayColor', e.target.value)}
                      />
                      <Input 
                        id="overlay-color"
                        value={settings.overlayColor || '#000000'} 
                        onChange={(e) => handleChange('overlayColor', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="overlay-opacity">{t('شفافية طبقة التغطية')}</Label>
                      <Badge variant="outline" className="font-mono">
                        {settings.overlayOpacity || 50}%
                      </Badge>
                    </div>
                    <Slider
                      id="overlay-opacity"
                      value={[settings.overlayOpacity || 50]}
                      min={0}
                      max={100}
                      step={5}
                      onValueChange={(value) => handleChange('overlayOpacity', value[0])}
                      className="py-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
        
        {/* إعدادات التفاعل */}
        <TabsContent value="interaction" className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <LinkIcon size={16} className="text-primary" />
              <h3 className="font-medium">{t('التفاعل عند النقر')}</h3>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="on-click">{t('عند النقر على الصورة')}</Label>
                <Select 
                  value={settings.onClick || 'none'}
                  onValueChange={(value) => handleChange('onClick', value)}
                >
                  <SelectTrigger id="on-click">
                    <SelectValue placeholder={t('اختر إجراء')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('لا شيء')}</SelectItem>
                    <SelectItem value="enlarge">{t('تكبير الصورة')}</SelectItem>
                    <SelectItem value="link">{t('فتح رابط')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {settings.onClick === 'link' && (
                <div className="space-y-2">
                  <Label htmlFor="link-url">{t('الرابط')}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="link-url"
                      value={settings.linkUrl || ''}
                      onChange={(e) => handleChange('linkUrl', e.target.value)}
                      placeholder="https://example.com"
                    />
                    <Button
                      variant="secondary"
                      size="icon"
                      type="button"
                      className="shrink-0"
                      onClick={() => settings.linkUrl && window.open(settings.linkUrl, '_blank')}
                      disabled={!settings.linkUrl}
                    >
                      <CornerDownLeftIcon size={16} />
                    </Button>
                  </div>
                </div>
              )}
              
              <Separator className="my-2" />
              
              <div className="space-y-2">
                <Label htmlFor="hover-effect">{t('تأثير التحويم')}</Label>
                <Select 
                  value={settings.hoverEffect || 'none'}
                  onValueChange={(value) => handleChange('hoverEffect', value)}
                >
                  <SelectTrigger id="hover-effect">
                    <SelectValue placeholder={t('اختر تأثير')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('لا شيء')}</SelectItem>
                    <SelectItem value="zoom">{t('تكبير')}</SelectItem>
                    <SelectItem value="lift">{t('ارتفاع لأعلى')}</SelectItem>
                    <SelectItem value="glow">{t('توهج')}</SelectItem>
                    <SelectItem value="zoom-in">{t('تكبير محتوى الصورة')}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('تأثير يظهر عند تمرير مؤشر الفأرة فوق الصورة')}
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>
        
        {/* إعدادات متقدمة */}
        <TabsContent value="advanced" className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <SettingsIcon size={16} className="text-primary" />
              <h3 className="font-medium">{t('خيارات متقدمة')}</h3>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="custom-css-class">{t('كلاس CSS مخصص')}</Label>
                <Input
                  id="custom-css-class"
                  value={settings.customCssClass || ''}
                  onChange={(e) => handleChange('customCssClass', e.target.value)}
                  placeholder="my-custom-class"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('إضافة كلاس CSS مخصص للمكون')}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="data-attributes">{t('سمات البيانات')}</Label>
                <Input
                  id="data-attributes"
                  value={settings.dataAttributes || ''}
                  onChange={(e) => handleChange('dataAttributes', e.target.value)}
                  placeholder="data-gallery=true data-index=1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('سمات بيانات مخصصة للتتبع أو التخصيص')}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="loading-strategy">{t('استراتيجية التحميل')}</Label>
                <Select 
                  value={settings.loadingStrategy || 'eager'}
                  onValueChange={(value) => handleChange('loadingStrategy', value)}
                >
                  <SelectTrigger id="loading-strategy">
                    <SelectValue placeholder={t('اختر استراتيجية')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eager">{t('فوري')}</SelectItem>
                    <SelectItem value="lazy">{t('كسول')}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('طريقة تحميل الصورة: فوري (مباشرة) أو كسول (عند الاقتراب)')}
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ImageComponentEditor; 
 
 
 