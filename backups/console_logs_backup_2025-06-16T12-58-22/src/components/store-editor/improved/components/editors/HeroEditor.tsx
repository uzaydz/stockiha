import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PropertySection } from '../PropertySection';
import { Type, Image as ImageIcon, MousePointer, Settings } from 'lucide-react';
import ImageUploader from '@/components/ui/ImageUploader';

interface HeroEditorProps {
  settings: any;
  onUpdate: (key: string, value: any) => void;
  onUpdateNested: (path: string[], value: any) => void;
}

export const HeroEditor: React.FC<HeroEditorProps> = ({
  settings,
  onUpdate,
  onUpdateNested
}) => {
  return (
    <div className="space-y-6">
      {/* المحتوى الأساسي */}
      <PropertySection title="المحتوى الأساسي" icon={<Type className="w-4 h-4" />}>
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">العنوان الرئيسي</Label>
            <Input
              id="title"
              value={settings.title || ''}
              onChange={(e) => onUpdate('title', e.target.value)}
              placeholder="أدخل العنوان الرئيسي"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="description">الوصف</Label>
            <Textarea
              id="description"
              value={settings.description || ''}
              onChange={(e) => onUpdate('description', e.target.value)}
              placeholder="أدخل وصفاً للقسم"
              rows={3}
              className="mt-1"
            />
          </div>
        </div>
      </PropertySection>

      {/* صورة الخلفية */}
      <PropertySection title="صورة الخلفية" icon={<ImageIcon className="w-4 h-4" />}>
        <div className="space-y-4">
          <ImageUploader
            imageUrl={settings.imageUrl || ''}
            onImageUploaded={(url) => onUpdate('imageUrl', url)}
            label="صورة الخلفية"
            folder="hero-images"
            maxSizeInMB={5}
            aspectRatio="16:9"
            className="w-full"
          />
        </div>
      </PropertySection>

      {/* الزر الرئيسي */}
      <PropertySection title="الزر الرئيسي" icon={<MousePointer className="w-4 h-4" />}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>تفعيل الزر الرئيسي</Label>
            <Switch
              checked={!!settings.primaryButton?.text}
              onCheckedChange={(checked) => {
                if (checked) {
                  onUpdate('primaryButton', {
                    text: 'تصفح الآن',
                    link: '/products'
                  });
                } else {
                  onUpdate('primaryButton', null);
                }
              }}
            />
          </div>
          
          {settings.primaryButton?.text && (
            <>
              <div>
                <Label htmlFor="primaryButtonText">نص الزر</Label>
                <Input
                  id="primaryButtonText"
                  value={settings.primaryButton.text || ''}
                  onChange={(e) => onUpdateNested(['primaryButton', 'text'], e.target.value)}
                  placeholder="نص الزر"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="primaryButtonLink">رابط الزر</Label>
                <Input
                  id="primaryButtonLink"
                  value={settings.primaryButton.link || ''}
                  onChange={(e) => onUpdateNested(['primaryButton', 'link'], e.target.value)}
                  placeholder="/products"
                  className="mt-1"
                />
              </div>
            </>
          )}
        </div>
      </PropertySection>

      {/* الزر الثانوي */}
      <PropertySection title="الزر الثانوي" icon={<MousePointer className="w-4 h-4" />}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>تفعيل الزر الثانوي</Label>
            <Switch
              checked={!!settings.secondaryButton?.text}
              onCheckedChange={(checked) => {
                if (checked) {
                  onUpdate('secondaryButton', {
                    text: 'تعرف أكثر',
                    link: '/about'
                  });
                } else {
                  onUpdate('secondaryButton', null);
                }
              }}
            />
          </div>
          
          {settings.secondaryButton?.text && (
            <>
              <div>
                <Label htmlFor="secondaryButtonText">نص الزر</Label>
                <Input
                  id="secondaryButtonText"
                  value={settings.secondaryButton.text || ''}
                  onChange={(e) => onUpdateNested(['secondaryButton', 'text'], e.target.value)}
                  placeholder="نص الزر"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="secondaryButtonLink">رابط الزر</Label>
                <Input
                  id="secondaryButtonLink"
                  value={settings.secondaryButton.link || ''}
                  onChange={(e) => onUpdateNested(['secondaryButton', 'link'], e.target.value)}
                  placeholder="/about"
                  className="mt-1"
                />
              </div>
            </>
          )}
        </div>
      </PropertySection>

      {/* التصميم */}
      <PropertySection title="التصميم" icon={<Settings className="w-4 h-4" />}>
        <div className="space-y-4">
          <div>
            <Label htmlFor="textAlignment">محاذاة النص</Label>
            <Select
              value={settings.textAlignment || 'center'}
              onValueChange={(value) => onUpdate('textAlignment', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">يسار</SelectItem>
                <SelectItem value="center">وسط</SelectItem>
                <SelectItem value="right">يمين</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </PropertySection>
    </div>
  );
};
