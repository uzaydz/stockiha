import React, { useState } from 'react';
import { VideoComponent } from '@/types/advanced-description';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { Video, Settings } from 'lucide-react';

interface VideoComponentEditorProps {
  component: VideoComponent;
  onChange: (component: VideoComponent) => void;
  onCancel: () => void;
  onSave: () => void;
}

export const VideoComponentEditor: React.FC<VideoComponentEditorProps> = ({
  component,
  onChange,
  onCancel,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'settings'>('content');

  const updateData = (updates: Partial<VideoComponent['data']>) => {
    onChange({
      ...component,
      data: { ...component.data, ...updates }
    });
  };

  const updateSettings = (updates: Partial<VideoComponent['settings']>) => {
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
          <Video className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">تحرير الفيديو</h3>
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
          <Video className="w-4 h-4 mr-2" />
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
              placeholder="عنوان الفيديو"
            />
          </div>

          {/* Video URL */}
          <div className="space-y-2">
            <Label htmlFor="url">رابط الفيديو</Label>
            <Input
              id="url"
              value={component.data.url}
              onChange={(e) => updateData({ url: e.target.value })}
              placeholder="https://www.youtube.com/watch?v=..."
            />
            <p className="text-xs text-muted-foreground">
              يدعم YouTube و Vimeo و روابط الفيديو المباشرة
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">وصف الفيديو</Label>
            <Textarea
              id="description"
              value={component.data.description}
              onChange={(e) => updateData({ description: e.target.value })}
              placeholder="وصف الفيديو"
              rows={3}
            />
          </div>

          {/* Thumbnail URL */}
          <div className="space-y-2">
            <Label htmlFor="thumbnail">صورة مصغرة</Label>
            <Input
              id="thumbnail"
              value={component.data.thumbnail}
              onChange={(e) => updateData({ thumbnail: e.target.value })}
              placeholder="رابط الصورة المصغرة"
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
              min={200}
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
              min={150}
              max={600}
              step={10}
              className="w-full"
            />
            <div className="text-xs text-muted-foreground text-center">
              {component.settings.height} بكسل
            </div>
          </div>

          {/* Auto Play */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>التشغيل التلقائي</Label>
              <p className="text-xs text-muted-foreground">
                تشغيل الفيديو تلقائياً
              </p>
            </div>
            <Switch
              checked={component.settings.autoPlay}
              onCheckedChange={(checked) => updateSettings({ autoPlay: checked })}
            />
          </div>

          {/* Show Controls */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>إظهار أزرار التحكم</Label>
              <p className="text-xs text-muted-foreground">
                أزرار التشغيل والإيقاف
              </p>
            </div>
            <Switch
              checked={component.settings.showControls}
              onCheckedChange={(checked) => updateSettings({ showControls: checked })}
            />
          </div>

          {/* Loop */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>التكرار</Label>
              <p className="text-xs text-muted-foreground">
                تكرار الفيديو
              </p>
            </div>
            <Switch
              checked={component.settings.loop}
              onCheckedChange={(checked) => updateSettings({ loop: checked })}
            />
          </div>

          {/* Muted */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>كتم الصوت</Label>
              <p className="text-xs text-muted-foreground">
                تشغيل الفيديو بدون صوت
              </p>
            </div>
            <Switch
              checked={component.settings.muted}
              onCheckedChange={(checked) => updateSettings({ muted: checked })}
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
        </div>
      )}
    </div>
  );
};
