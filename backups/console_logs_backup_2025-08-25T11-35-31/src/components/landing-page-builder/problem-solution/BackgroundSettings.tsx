import React from 'react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

// مكون ColorPicker محسن
const ColorPicker = ({ value, onChange }: { value: string, onChange: (color: string) => void }) => {
  return (
    <div className="flex items-center gap-3">
      <div 
        className="w-10 h-10 rounded-md border border-border shadow-sm"
        style={{ backgroundColor: value }}
      />
      <input 
        type="color" 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="w-10 h-10 rounded-md border border-border cursor-pointer"
      />
      <input
        type="text" 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        placeholder="#000000"
      />
    </div>
  );
};

interface BackgroundSettingsProps {
  settings: any;
  onSettingChange: (key: string, value: any) => void;
}

const BackgroundSettings: React.FC<BackgroundSettingsProps> = ({
  settings,
  onSettingChange
}) => {
  return (
    <div className="space-y-6">
      {/* استخدام تدرج الألوان */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">استخدام تدرج الألوان</label>
        <Switch
          checked={settings.useGradient ?? true}
          onCheckedChange={(checked) => onSettingChange('useGradient', checked)}
        />
      </div>

      {/* إعدادات التدرج */}
      {settings.useGradient && (
        <>
          {/* بداية التدرج */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">بداية التدرج</label>
            <ColorPicker
              value={settings.gradientStart || '#4338ca'}
              onChange={(color) => onSettingChange('gradientStart', color)}
            />
          </div>

          {/* نهاية التدرج */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">نهاية التدرج</label>
            <ColorPicker
              value={settings.gradientEnd || '#3b82f6'}
              onChange={(color) => onSettingChange('gradientEnd', color)}
            />
          </div>

          {/* اتجاه التدرج */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">اتجاه التدرج</label>
            <Select
              value={settings.gradientDirection || 'to-r'}
              onValueChange={(value) => onSettingChange('gradientDirection', value)}
            >
              <SelectTrigger className="w-full">
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

      {/* صورة الخلفية */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">صورة الخلفية</label>
        <Input
          type="url"
          placeholder="رابط صورة الخلفية (اختياري)"
          value={settings.backgroundImage || ''}
          onChange={(e) => onSettingChange('backgroundImage', e.target.value)}
          className="w-full"
        />
        {settings.backgroundImage && (
          <div className="mt-3">
            <div className="relative w-32 h-20 overflow-hidden rounded-md border bg-muted">
              <img
                src={settings.backgroundImage}
                alt="معاينة الخلفية"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* إعدادات صورة الخلفية */}
      {settings.backgroundImage && (
        <>
          {/* موضع صورة الخلفية */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">موضع صورة الخلفية</label>
            <Select
              value={settings.backgroundPosition || 'center'}
              onValueChange={(value) => onSettingChange('backgroundPosition', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="center">وسط</SelectItem>
                <SelectItem value="top">أعلى</SelectItem>
                <SelectItem value="bottom">أسفل</SelectItem>
                <SelectItem value="left">يسار</SelectItem>
                <SelectItem value="right">يمين</SelectItem>
                <SelectItem value="top left">أعلى يسار</SelectItem>
                <SelectItem value="top right">أعلى يمين</SelectItem>
                <SelectItem value="bottom left">أسفل يسار</SelectItem>
                <SelectItem value="bottom right">أسفل يمين</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* حجم صورة الخلفية */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">حجم صورة الخلفية</label>
            <Select
              value={settings.backgroundSize || 'cover'}
              onValueChange={(value) => onSettingChange('backgroundSize', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cover">تغطية كاملة</SelectItem>
                <SelectItem value="contain">احتواء كامل</SelectItem>
                <SelectItem value="auto">حجم طبيعي</SelectItem>
                <SelectItem value="100% 100%">تمدد كامل</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* تكرار صورة الخلفية */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">تكرار صورة الخلفية</label>
            <Select
              value={settings.backgroundRepeat || 'no-repeat'}
              onValueChange={(value) => onSettingChange('backgroundRepeat', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-repeat">بدون تكرار</SelectItem>
                <SelectItem value="repeat">تكرار</SelectItem>
                <SelectItem value="repeat-x">تكرار أفقي</SelectItem>
                <SelectItem value="repeat-y">تكرار عمودي</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {/* شفافية الخلفية */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">
          شفافية الخلفية: {Math.round((settings.backgroundOpacity || 1) * 100)}%
        </label>
        <Slider
          min={0}
          max={1}
          step={0.1}
          value={[settings.backgroundOpacity || 1]}
          onValueChange={(value) => onSettingChange('backgroundOpacity', value[0])}
          className="w-full"
        />
      </div>

      {/* طبقة تراكب ملونة */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">طبقة تراكب ملونة</label>
        <Switch
          checked={settings.useBackgroundOverlay || false}
          onCheckedChange={(checked) => onSettingChange('useBackgroundOverlay', checked)}
        />
      </div>

      {/* إعدادات طبقة التراكب */}
      {settings.useBackgroundOverlay && (
        <>
          {/* لون طبقة التراكب */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">لون طبقة التراكب</label>
            <ColorPicker
              value={settings.backgroundOverlayColor || '#000000'}
              onChange={(color) => onSettingChange('backgroundOverlayColor', color)}
            />
          </div>

          {/* شفافية طبقة التراكب */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              شفافية طبقة التراكب: {Math.round((settings.backgroundOverlayOpacity || 0.3) * 100)}%
            </label>
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={[settings.backgroundOverlayOpacity || 0.3]}
              onValueChange={(value) => onSettingChange('backgroundOverlayOpacity', value[0])}
              className="w-full"
            />
          </div>
        </>
      )}

      {/* نمط الخلفية */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">نمط الخلفية</label>
        <Select
          value={settings.backgroundPattern || 'none'}
          onValueChange={(value) => onSettingChange('backgroundPattern', value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">بدون نمط</SelectItem>
            <SelectItem value="dots">نقاط</SelectItem>
            <SelectItem value="grid">شبكة</SelectItem>
            <SelectItem value="diagonal">خطوط قطرية</SelectItem>
            <SelectItem value="waves">موجات</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* كثافة النمط */}
      {settings.backgroundPattern && settings.backgroundPattern !== 'none' && (
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">
            كثافة النمط: {Math.round((settings.backgroundPatternOpacity || 0.1) * 100)}%
          </label>
          <Slider
            min={0.05}
            max={0.5}
            step={0.05}
            value={[settings.backgroundPatternOpacity || 0.1]}
            onValueChange={(value) => onSettingChange('backgroundPatternOpacity', value[0])}
            className="w-full"
          />
        </div>
      )}

      {/* تمكين الظلال */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">تمكين الظلال</label>
        <Switch
          checked={settings.enableShadows ?? true}
          onCheckedChange={(checked) => onSettingChange('enableShadows', checked)}
        />
      </div>
    </div>
  );
};

export default BackgroundSettings;
