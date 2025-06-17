import React from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import ImageUploader from '@/components/ui/ImageUploader';

interface HeroComponentEditorProps {
  settings: {
    title?: string;
    subtitle?: string;
    buttonText?: string;
    buttonLink?: string;
    imageUrl?: string;
    backgroundColor?: string;
    textColor?: string;
    [key: string]: any;
  };
  onUpdate: (settings: Record<string, any>) => void;
}

/**
 * محرر مكون القسم الرئيسي (هيرو)
 */
const HeroComponentEditor: React.FC<HeroComponentEditorProps> = ({ settings, onUpdate }) => {
  const { t } = useTranslation();
  
  // تحديث أي إعداد
  const handleChange = (key: string, value: any) => {
    onUpdate({ ...settings, [key]: value });
  };
  
  // معالج تحميل الصورة
  const handleImageUploaded = (url: string) => {
    handleChange('imageUrl', url);
  };
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="hero-title">{t('العنوان الرئيسي')}</Label>
        <Input
          id="hero-title"
          value={settings.title || ''}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder={t('عنوان ترويجي')}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="hero-subtitle">{t('النص الفرعي')}</Label>
        <Textarea
          id="hero-subtitle"
          value={settings.subtitle || ''}
          onChange={(e) => handleChange('subtitle', e.target.value)}
          placeholder={t('النص الثانوي هنا')}
          rows={3}
        />
      </div>
      
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="button">
          <AccordionTrigger>{t('إعدادات الزر')}</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="button-text">{t('نص الزر')}</Label>
                <Input
                  id="button-text"
                  value={settings.buttonText || ''}
                  onChange={(e) => handleChange('buttonText', e.target.value)}
                  placeholder={t('اشتري الآن')}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="button-link">{t('رابط الزر')}</Label>
                <Input
                  id="button-link"
                  value={settings.buttonLink || ''}
                  onChange={(e) => handleChange('buttonLink', e.target.value)}
                  placeholder="#"
                />
                <p className="text-xs text-muted-foreground">
                  {t('يمكنك استخدام رابط كامل (مثل https://example.com) أو رابط داخلي (مثل /contact)')}
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="image">
          <AccordionTrigger>{t('الصورة')}</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              {settings.imageUrl && (
                <div className="w-full aspect-video rounded-md overflow-hidden border mb-3">
                  <img 
                    src={settings.imageUrl} 
                    alt={t('معاينة صورة القسم الرئيسي')} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwIiBoZWlnaHQ9IjE2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTYwIiBoZWlnaHQ9IjE2MCIgZmlsbD0iI2VlZWVlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmaWxsPSIjOTk5OTk5Ij5JbWFnZTwvdGV4dD48L3N2Zz4=';
                    }}
                  />
                </div>
              )}
              
              <ImageUploader
                imageUrl={settings.imageUrl}
                onImageUploaded={handleImageUploaded}
                folder="landing-pages"
                label={t('اختر صورة')}
                maxSizeInMB={5}
              />
              
              <div className="space-y-2">
                <Label htmlFor="image-url">{t('رابط الصورة')}</Label>
                <Input
                  id="image-url"
                  value={settings.imageUrl || ''}
                  onChange={(e) => handleChange('imageUrl', e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
                <p className="text-xs text-muted-foreground">
                  {t('يمكنك أيضًا إدخال رابط صورة مباشرة')}
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="colors">
          <AccordionTrigger>{t('الألوان')}</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="background-color">{t('لون الخلفية')}</Label>
                <div className="flex gap-2">
                  <Input 
                    id="background-color-picker"
                    type="color"
                    className="w-12 h-9 p-1"
                    value={settings.backgroundColor || '#ffffff'} 
                    onChange={(e) => handleChange('backgroundColor', e.target.value)}
                  />
                  <Input 
                    id="background-color"
                    value={settings.backgroundColor || '#ffffff'} 
                    onChange={(e) => handleChange('backgroundColor', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="text-color">{t('لون النص')}</Label>
                <div className="flex gap-2">
                  <Input 
                    id="text-color-picker"
                    type="color"
                    className="w-12 h-9 p-1"
                    value={settings.textColor || '#000000'} 
                    onChange={(e) => handleChange('textColor', e.target.value)}
                  />
                  <Input 
                    id="text-color"
                    value={settings.textColor || '#000000'} 
                    onChange={(e) => handleChange('textColor', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default HeroComponentEditor;
