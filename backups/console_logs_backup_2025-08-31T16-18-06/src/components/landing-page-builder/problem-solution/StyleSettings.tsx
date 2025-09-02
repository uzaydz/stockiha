import React from 'react';
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

interface StyleSettingsProps {
  settings: any;
  onSettingChange: (key: string, value: any) => void;
}

const StyleSettings: React.FC<StyleSettingsProps> = ({
  settings,
  onSettingChange
}) => {
  return (
    <div className="space-y-6">
      {/* لون الخلفية */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">لون الخلفية</label>
        {settings.useGradient && (
          <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md p-2 mb-2">
            ⚠️ التدرج مفعل حالياً. تغيير لون الخلفية سيلغي التدرج.
          </div>
        )}
        <ColorPicker
          value={settings.backgroundColor || '#f8f9fa'}
          onChange={(color) => onSettingChange('backgroundColor', color)}
        />
      </div>

      {/* لون النص */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">لون النص</label>
        <ColorPicker
          value={settings.textColor || '#333333'}
          onChange={(color) => onSettingChange('textColor', color)}
        />
      </div>

      {/* اللون المميز */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">اللون المميز</label>
        <ColorPicker
          value={settings.accentColor || '#4f46e5'}
          onChange={(color) => onSettingChange('accentColor', color)}
        />
      </div>

      {/* محاذاة العنوان */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">محاذاة العنوان</label>
        <Select
          value={settings.headerAlignment || 'center'}
          onValueChange={(value) => onSettingChange('headerAlignment', value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="اختر المحاذاة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="right">يمين</SelectItem>
            <SelectItem value="center">وسط</SelectItem>
            <SelectItem value="left">يسار</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* نوع التخطيط */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">نوع التخطيط</label>
        <Select
          value={settings.layout || 'side-by-side'}
          onValueChange={(value) => onSettingChange('layout', value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="اختر التخطيط" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="side-by-side">جنباً إلى جنب</SelectItem>
            <SelectItem value="alternating">متناوب</SelectItem>
            <SelectItem value="cards">بطاقات</SelectItem>
            <SelectItem value="cascade">متدرج</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* نوع الحركة */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">نوع الحركة</label>
        <Select
          value={settings.animation || 'fade'}
          onValueChange={(value) => onSettingChange('animation', value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="اختر الحركة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">بدون</SelectItem>
            <SelectItem value="fade">تلاشي</SelectItem>
            <SelectItem value="fade-up">تلاشي للأعلى</SelectItem>
            <SelectItem value="fade-in">ظهور تدريجي</SelectItem>
            <SelectItem value="slide-in">انزلاق</SelectItem>
            <SelectItem value="scale">تكبير</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* حجم الحدود المنحنية */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">
          حجم الحدود المنحنية: {settings.borderRadius || 12}px
        </label>
        <Slider
          value={[settings.borderRadius || 12]}
          min={0}
          max={24}
          step={1}
          onValueChange={(value) => onSettingChange('borderRadius', value[0])}
          className="w-full"
        />
      </div>

      {/* المساحة الداخلية */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">
          المساحة الداخلية: {settings.containerPadding || 48}px
        </label>
        <Slider
          value={[settings.containerPadding || 48]}
          min={12}
          max={80}
          step={4}
          onValueChange={(value) => onSettingChange('containerPadding', value[0])}
          className="w-full"
        />
      </div>
    </div>
  );
};

export default StyleSettings;
