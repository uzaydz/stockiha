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

interface TextComponentEditorProps {
  settings: {
    content: string;
    textColor: string;
    alignment: string;
    padding: string;
    [key: string]: any;
  };
  onUpdate: (settings: Record<string, any>) => void;
}

/**
 * محرر مكون النص
 */
const TextComponentEditor: React.FC<TextComponentEditorProps> = ({ settings, onUpdate }) => {
  const { t } = useTranslation();
  const [content, setContent] = useState(settings.content || '<p>أدخل المحتوى النصي هنا...</p>');
  
  // تحديث المحتوى النصي
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    onUpdate({ ...settings, content: newContent });
  };
  
  // تحديث أي إعداد
  const handleChange = (key: string, value: any) => {
    onUpdate({ ...settings, [key]: value });
  };
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t('المحتوى النصي')}</Label>
        
        {/* محرر النص البسيط - يمكن استبداله بمحرر متقدم */}
        <div className="border rounded-md p-3 bg-muted/50">
          <textarea 
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            rows={8}
            className="w-full p-2 border rounded-md resize-y"
            placeholder={t('أدخل المحتوى النصي هنا...')}
          />
          <p className="text-xs text-muted-foreground mt-2">
            {t('يمكنك استخدام وسوم HTML الأساسية مثل <p>, <strong>, <em>, <a>, <ul>, <li>, <h1> إلخ.')}
          </p>
        </div>
      </div>
      
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="styles">
          <AccordionTrigger>{t('خيارات التنسيق')}</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="text-color">{t('لون النص')}</Label>
                <div className="flex gap-2">
                  <Input 
                    id="text-color-picker"
                    type="color"
                    className="w-12 h-9 p-1"
                    value={settings.textColor || '#333333'} 
                    onChange={(e) => handleChange('textColor', e.target.value)}
                  />
                  <Input 
                    id="text-color"
                    value={settings.textColor || '#333333'} 
                    onChange={(e) => handleChange('textColor', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="text-alignment">{t('محاذاة النص')}</Label>
                <Select 
                  value={settings.alignment || 'right'}
                  onValueChange={(value) => handleChange('alignment', value)}
                >
                  <SelectTrigger id="text-alignment">
                    <SelectValue placeholder={t('اختر المحاذاة')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="right">{t('يمين')}</SelectItem>
                    <SelectItem value="center">{t('وسط')}</SelectItem>
                    <SelectItem value="left">{t('يسار')}</SelectItem>
                    <SelectItem value="justify">{t('ضبط')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="text-padding">{t('المساحة الداخلية (Padding)')}</Label>
                <Input 
                  id="text-padding"
                  value={settings.padding || '20px'} 
                  onChange={(e) => handleChange('padding', e.target.value)}
                  placeholder="20px"
                />
                <p className="text-xs text-muted-foreground">
                  {t('يمكنك استخدام وحدات مثل px أو % أو em')}
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default TextComponentEditor;
