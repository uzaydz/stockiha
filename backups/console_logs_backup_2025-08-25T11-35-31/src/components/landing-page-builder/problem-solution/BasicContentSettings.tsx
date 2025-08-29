import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import ImageUploader from '@/components/ui/ImageUploader';

interface BasicContentSettingsProps {
  settings: any;
  onSettingChange: (key: string, value: any) => void;
}

const BasicContentSettings: React.FC<BasicContentSettingsProps> = ({
  settings,
  onSettingChange
}) => {
  return (
    <div className="space-y-6">
      {/* العنوان الرئيسي */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">العنوان الرئيسي</label>
        <Input
          value={settings.title || ''}
          onChange={(e) => onSettingChange('title', e.target.value)}
          placeholder="أدخل العنوان الرئيسي..."
          className="w-full"
        />
      </div>

      {/* النص التوضيحي */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">النص التوضيحي</label>
        <Textarea
          value={settings.subtitle || ''}
          onChange={(e) => onSettingChange('subtitle', e.target.value)}
          placeholder="أدخل النص التوضيحي..."
          rows={3}
          className="w-full resize-none"
        />
      </div>

      {/* عرض الصورة الرئيسية */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">عرض الصورة الرئيسية</label>
        <Switch
          checked={settings.showMainImage ?? true}
          onCheckedChange={(checked) => onSettingChange('showMainImage', checked)}
        />
      </div>

      {/* الصورة الرئيسية */}
      {settings.showMainImage && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">الصورة الرئيسية</label>
          <ImageUploader
            imageUrl={settings.mainImage || ''}
            onImageUploaded={(url) => onSettingChange('mainImage', url)}
            folder="problem-solution"
            label="اختر الصورة الرئيسية..."
          />
        </div>
      )}
    </div>
  );
};

export default BasicContentSettings;
