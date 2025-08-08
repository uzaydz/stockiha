import React, { useState } from 'react';
import { TextComponent } from '@/types/advanced-description';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { Type, Settings, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';

interface TextComponentEditorProps {
  component: TextComponent;
  onChange: (component: TextComponent) => void;
  onCancel: () => void;
  onSave: () => void;
}

export const TextComponentEditor: React.FC<TextComponentEditorProps> = ({
  component,
  onChange,
  onCancel,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'settings'>('content');

  const updateData = (updates: Partial<TextComponent['data']>) => {
    onChange({
      ...component,
      data: { ...component.data, ...updates }
    });
  };

  const updateSettings = (updates: Partial<TextComponent['settings']>) => {
    onChange({
      ...component,
      settings: { ...component.settings, ...updates }
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Type className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">تحرير النص</h3>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            إلغاء
          </Button>
          <Button onClick={onSave}>
            حفظ
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/30 p-1 rounded-lg">
        <Button
          variant={activeTab === 'content' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('content')}
          className="flex-1"
        >
          <Type className="w-4 h-4 mr-2" />
          المحتوى
        </Button>
        <Button
          variant={activeTab === 'settings' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('settings')}
          className="flex-1"
        >
          <Settings className="w-4 h-4 mr-2" />
          الإعدادات
        </Button>
      </div>

      {/* Content Tab */}
      {activeTab === 'content' && (
        <div className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">العنوان</Label>
            <Input
              id="title"
              value={component.data.title}
              onChange={(e) => updateData({ title: e.target.value })}
              placeholder="عنوان النص"
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">المحتوى</Label>
            <Textarea
              id="content"
              value={component.data.content}
              onChange={(e) => updateData({ content: e.target.value })}
              placeholder="أدخل محتوى النص هنا..."
              rows={8}
              className="font-sans"
            />
          </div>

          {/* Text Formatting */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Type className="w-4 h-4" />
                تنسيق النص
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={component.data.bold ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateData({ bold: !component.data.bold })}
                  className="gap-2"
                >
                  <Bold className="w-4 h-4" />
                  عريض
                </Button>
                <Button
                  type="button"
                  variant={component.data.italic ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateData({ italic: !component.data.italic })}
                  className="gap-2"
                >
                  <Italic className="w-4 h-4" />
                  مائل
                </Button>
                <Button
                  type="button"
                  variant={component.data.underline ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateData({ underline: !component.data.underline })}
                  className="gap-2"
                >
                  <Underline className="w-4 h-4" />
                  تحته خط
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Text Alignment */}
          <div className="space-y-2">
            <Label>محاذاة النص</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={component.settings.textAlign === 'left' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateSettings({ textAlign: 'left' })}
                className="gap-2"
              >
                <AlignLeft className="w-4 h-4" />
                يسار
              </Button>
              <Button
                type="button"
                variant={component.settings.textAlign === 'center' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateSettings({ textAlign: 'center' })}
                className="gap-2"
              >
                <AlignCenter className="w-4 h-4" />
                وسط
              </Button>
              <Button
                type="button"
                variant={component.settings.textAlign === 'right' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateSettings({ textAlign: 'right' })}
                className="gap-2"
              >
                <AlignRight className="w-4 h-4" />
                يمين
              </Button>
              <Button
                type="button"
                variant={component.settings.textAlign === 'justify' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateSettings({ textAlign: 'justify' })}
                className="gap-2"
              >
                <AlignJustify className="w-4 h-4" />
                ضبط
              </Button>
            </div>
          </div>

          {/* Font Size */}
          <div className="space-y-2">
            <Label>حجم الخط</Label>
            <Select
              value={component.settings.fontSize}
              onValueChange={(value) => updateSettings({ fontSize: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="xs">صغير جداً</SelectItem>
                <SelectItem value="sm">صغير</SelectItem>
                <SelectItem value="base">عادي</SelectItem>
                <SelectItem value="lg">كبير</SelectItem>
                <SelectItem value="xl">كبير جداً</SelectItem>
                <SelectItem value="2xl">ضخم</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Line Height */}
          <div className="space-y-2">
            <Label>ارتفاع السطر</Label>
            <Slider
              value={[component.settings.lineHeight]}
              onValueChange={([value]) => updateSettings({ lineHeight: value })}
              min={1}
              max={3}
              step={0.1}
              className="w-full"
            />
            <div className="text-xs text-muted-foreground text-center">
              {component.settings.lineHeight}
            </div>
          </div>

          {/* Text Color */}
          <div className="space-y-2">
            <Label>لون النص</Label>
            <Select
              value={component.settings.textColor}
              onValueChange={(value) => updateSettings({ textColor: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="foreground">افتراضي</SelectItem>
                <SelectItem value="muted-foreground">باهت</SelectItem>
                <SelectItem value="primary">أساسي</SelectItem>
                <SelectItem value="secondary">ثانوي</SelectItem>
                <SelectItem value="accent">تأكيدي</SelectItem>
                <SelectItem value="destructive">خطأ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Background Color */}
          <div className="space-y-2">
            <Label>لون الخلفية</Label>
            <Select
              value={component.settings.backgroundColor}
              onValueChange={(value) => updateSettings({ backgroundColor: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transparent">شفاف</SelectItem>
                <SelectItem value="background">افتراضي</SelectItem>
                <SelectItem value="muted">باهت</SelectItem>
                <SelectItem value="primary/5">أساسي فاتح</SelectItem>
                <SelectItem value="secondary/5">ثانوي فاتح</SelectItem>
                <SelectItem value="accent/5">تأكيدي فاتح</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Padding */}
          <div className="space-y-2">
            <Label>المساحة الداخلية (بكسل)</Label>
            <Slider
              value={[component.settings.padding]}
              onValueChange={([value]) => updateSettings({ padding: value })}
              min={0}
              max={48}
              step={4}
              className="w-full"
            />
            <div className="text-xs text-muted-foreground text-center">
              {component.settings.padding} بكسل
            </div>
          </div>

          {/* Border Radius */}
          <div className="space-y-2">
            <Label>تقويس الحواف</Label>
            <Select
              value={component.settings.borderRadius}
              onValueChange={(value) => updateSettings({ borderRadius: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">بدون</SelectItem>
                <SelectItem value="sm">صغير</SelectItem>
                <SelectItem value="md">متوسط</SelectItem>
                <SelectItem value="lg">كبير</SelectItem>
                <SelectItem value="xl">كبير جداً</SelectItem>
                <SelectItem value="full">دائري</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Show Border */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>إظهار الحدود</Label>
              <p className="text-xs text-muted-foreground">
                إضافة حدود حول النص
              </p>
            </div>
            <Switch
              checked={component.settings.showBorder}
              onCheckedChange={(checked) => updateSettings({ showBorder: checked })}
            />
          </div>
        </div>
      )}
    </div>
  );
}; 