import React, { useState } from 'react';
import { BeforeAfterComponent } from '@/types/advanced-description';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import ImageUploader from '@/components/ui/ImageUploader';
import { cn } from '@/lib/utils';
import { ArrowLeftRight, Settings } from 'lucide-react';

interface BeforeAfterComponentEditorProps {
  component: BeforeAfterComponent;
  onChange: (component: BeforeAfterComponent) => void;
  onCancel: () => void;
  onSave: () => void;
}

export const BeforeAfterComponentEditor: React.FC<BeforeAfterComponentEditorProps> = ({
  component,
  onChange,
  onCancel,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'settings'>('content');

  const updateData = (updates: Partial<BeforeAfterComponent['data']>) => {
    onChange({
      ...component,
      data: { ...component.data, ...updates }
    });
  };

  const updateSettings = (updates: Partial<BeforeAfterComponent['settings']>) => {
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
          <ArrowLeftRight className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">تحرير قبل/بعد</h3>
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
          <ArrowLeftRight className="w-4 h-4 mr-2" />
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
              placeholder="مقارنة قبل/بعد"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">الوصف</Label>
            <Textarea
              id="description"
              value={component.data.description}
              onChange={(e) => updateData({ description: e.target.value })}
              placeholder="وصف المقارنة"
              rows={3}
            />
          </div>

          {/* Before Image */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4" />
                صورة "قبل"
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>رفع صورة "قبل"</Label>
                  <ImageUploader
                    imageUrl={component.data.beforeImage}
                    onImageUploaded={(url) => updateData({ beforeImage: url })}
                    label="رفع صورة قبل"
                    folder="advanced-descriptions/before-after"
                    maxSizeInMB={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>نص "قبل"</Label>
                  <Input
                    value={component.data.beforeLabel}
                    onChange={(e) => updateData({ beforeLabel: e.target.value })}
                    placeholder="قبل"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* After Image */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4" />
                صورة "بعد"
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>رفع صورة "بعد"</Label>
                  <ImageUploader
                    imageUrl={component.data.afterImage}
                    onImageUploaded={(url) => updateData({ afterImage: url })}
                    label="رفع صورة بعد"
                    folder="advanced-descriptions/before-after"
                    maxSizeInMB={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>نص "بعد"</Label>
                  <Input
                    value={component.data.afterLabel}
                    onChange={(e) => updateData({ afterLabel: e.target.value })}
                    placeholder="بعد"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Layout Type */}
          <div className="space-y-2">
            <Label>نوع العرض</Label>
            <Select
              value={component.settings.layoutType}
              onValueChange={(value) => updateSettings({ layoutType: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="slider">سلايدر تفاعلي</SelectItem>
                <SelectItem value="side-by-side">جانب إلى جانب</SelectItem>
                <SelectItem value="overlay">تراكب</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Width */}
          <div className="space-y-2">
            <Label>العرض (بكسل)</Label>
            <Slider
              value={[component.settings.width]}
              onValueChange={([value]) => updateSettings({ width: value })}
              min={300}
              max={800}
              step={10}
              className="w-full"
            />
            <div className="text-xs text-muted-foreground text-center">
              {component.settings.width} بكسل
            </div>
          </div>

          {/* Height */}
          <div className="space-y-2">
            <Label>الارتفاع (بكسل)</Label>
            <Slider
              value={[component.settings.height]}
              onValueChange={([value]) => updateSettings({ height: value })}
              min={200}
              max={600}
              step={10}
              className="w-full"
            />
            <div className="text-xs text-muted-foreground text-center">
              {component.settings.height} بكسل
            </div>
          </div>

          {/* Show Labels */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>إظهار النصوص</Label>
              <p className="text-xs text-muted-foreground">
                عرض نصوص "قبل" و "بعد"
              </p>
            </div>
            <Switch
              checked={component.settings.showLabels}
              onCheckedChange={(checked) => updateSettings({ showLabels: checked })}
            />
          </div>

          {/* Show Divider */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>إظهار الفاصل</Label>
              <p className="text-xs text-muted-foreground">
                خط فاصل بين الصورتين
              </p>
            </div>
            <Switch
              checked={component.settings.showDivider}
              onCheckedChange={(checked) => updateSettings({ showDivider: checked })}
            />
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
        </div>
      )}
    </div>
  );
};
