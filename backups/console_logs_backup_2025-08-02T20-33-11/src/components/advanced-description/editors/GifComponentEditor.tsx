import React, { useState } from 'react';
import { GifComponent } from '@/types/advanced-description';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { GifUploader } from '@/components/ui/GifUploader';
import { cn } from '@/lib/utils';
import { ImageIcon, Settings } from 'lucide-react';

interface GifComponentEditorProps {
  component: GifComponent;
  onChange: (component: GifComponent) => void;
  onCancel: () => void;
  onSave: () => void;
}

export const GifComponentEditor: React.FC<GifComponentEditorProps> = ({
  component,
  onChange,
  onCancel,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'settings'>('content');

  const updateData = (updates: Partial<GifComponent['data']>) => {
    onChange({
      ...component,
      data: { ...component.data, ...updates }
    });
  };

  const updateSettings = (updates: Partial<GifComponent['settings']>) => {
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
          <ImageIcon className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">تحرير GIF</h3>
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
          <ImageIcon className="w-4 h-4 mr-2" />
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
              placeholder="عنوان GIF"
            />
          </div>

          {/* GIF Upload */}
          <div className="space-y-2">
            <Label>رفع ملف GIF</Label>
            <GifUploader
              imageUrl={component.data.url}
              onImageUploaded={(url) => updateData({ url })}
              label="رفع ملف GIF"
              folder="products"
              maxSizeInMB={5}
            />
          </div>

          {/* Caption */}
          <div className="space-y-2">
            <Label htmlFor="caption">وصف GIF</Label>
            <Textarea
              id="caption"
              value={component.data.caption}
              onChange={(e) => updateData({ caption: e.target.value })}
              placeholder="وصف GIF"
              rows={3}
            />
          </div>

          {/* Alt Text */}
          <div className="space-y-2">
            <Label htmlFor="altText">نص بديل</Label>
            <Input
              id="altText"
              value={component.data.altText}
              onChange={(e) => updateData({ altText: e.target.value })}
              placeholder="نص بديل للـ GIF"
            />
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Width */}
          <div className="space-y-2">
            <Label>العرض (بكسل)</Label>
            <Slider
              value={[component.settings.width]}
              onValueChange={([value]) => updateSettings({ width: value })}
              min={100}
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
              min={100}
              max={600}
              step={10}
              className="w-full"
            />
            <div className="text-xs text-muted-foreground text-center">
              {component.settings.height} بكسل
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
                إضافة حدود حول GIF
              </p>
            </div>
            <Switch
              checked={component.settings.showBorder}
              onCheckedChange={(checked) => updateSettings({ showBorder: checked })}
            />
          </div>

          {/* Auto Play */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>التشغيل التلقائي</Label>
              <p className="text-xs text-muted-foreground">
                تشغيل GIF تلقائياً
              </p>
            </div>
            <Switch
              checked={component.settings.autoPlay}
              onCheckedChange={(checked) => updateSettings({ autoPlay: checked })}
            />
          </div>

          {/* Loop */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>التكرار</Label>
              <p className="text-xs text-muted-foreground">
                تكرار GIF
              </p>
            </div>
            <Switch
              checked={component.settings.loop}
              onCheckedChange={(checked) => updateSettings({ loop: checked })}
            />
          </div>
        </div>
      )}
    </div>
  );
}; 