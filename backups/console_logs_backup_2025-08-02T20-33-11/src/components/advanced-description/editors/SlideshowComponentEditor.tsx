import React, { useState } from 'react';
import { SlideshowComponent } from '@/types/advanced-description';
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
import { Presentation, Settings, Eye, Plus, X } from 'lucide-react';

interface SlideshowComponentEditorProps {
  component: SlideshowComponent;
  onChange: (component: SlideshowComponent) => void;
  onCancel: () => void;
  onSave: () => void;
}

export const SlideshowComponentEditor: React.FC<SlideshowComponentEditorProps> = ({
  component,
  onChange,
  onCancel,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'settings'>('content');

  const updateData = (updates: Partial<SlideshowComponent['data']>) => {
    onChange({
      ...component,
      data: { ...component.data, ...updates }
    });
  };

  const updateSettings = (updates: Partial<SlideshowComponent['settings']>) => {
    onChange({
      ...component,
      settings: { ...component.settings, ...updates }
    });
  };

  const addSlide = () => {
    const newSlide = {
      url: '',
      caption: '',
      alt: ''
    };
    updateData({
      images: [...(component.data.images || []), newSlide]
    });
  };

  const removeSlide = (slideIndex: number) => {
    updateData({
      images: (component.data.images || []).filter((_, index) => index !== slideIndex)
    });
  };

  const updateSlide = (slideIndex: number, updates: Partial<{ url: string; caption: string; alt: string }>) => {
    updateData({
      images: (component.data.images || []).map((slide, index) =>
        index === slideIndex ? { ...slide, ...updates } : slide
      )
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Presentation className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">تحرير السلايد شو</h3>
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
          <Presentation className="w-4 h-4 mr-2" />
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
          {/* Slides */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Presentation className="w-4 h-4" />
                  الشرائح ({(component.data.images || []).length})
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSlide}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  إضافة شريحة
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(component.data.images || []).map((slide, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">شريحة {index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSlide(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Image Upload */}
                    <div className="space-y-2">
                      <Label>صورة الشريحة</Label>
                      <ImageUploader
                        imageUrl={slide.url}
                        onImageUploaded={(url) => updateSlide(index, { url })}
                        label="رفع صورة الشريحة"
                        folder="advanced-descriptions/slideshows"
                        maxSizeInMB={2}
                      />
                    </div>

                    {/* Caption */}
                    <div className="space-y-2">
                      <Label>وصف الشريحة</Label>
                      <Textarea
                        value={slide.caption || ''}
                        onChange={(e) => updateSlide(index, { caption: e.target.value })}
                        placeholder="أدخل وصف الشريحة"
                        rows={2}
                      />
                    </div>

                    {/* Alt Text */}
                    <div className="space-y-2">
                      <Label>نص بديل للصورة</Label>
                      <Input
                        value={slide.alt || ''}
                        onChange={(e) => updateSlide(index, { alt: e.target.value })}
                        placeholder="نص بديل للصورة"
                      />
                    </div>
                  </div>
                ))}

                {(component.data.images || []).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Presentation className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد شرائح بعد</p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addSlide}
                      className="mt-2"
                    >
                      إضافة شريحة أولى
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Auto Play */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>التشغيل التلقائي</Label>
              <p className="text-xs text-muted-foreground">
                تبديل الشرائح تلقائياً
              </p>
            </div>
            <Switch
              checked={component.data.autoPlay}
              onCheckedChange={(checked) => updateData({ autoPlay: checked })}
            />
          </div>

          {/* Auto Play Speed */}
          {component.data.autoPlay && (
            <div className="space-y-2">
              <Label>سرعة التشغيل التلقائي (ثانية)</Label>
              <Slider
                value={[component.data.autoPlayInterval / 1000]}
                onValueChange={([value]) => updateData({ autoPlayInterval: value * 1000 })}
                min={1}
                max={10}
                step={0.5}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground text-center">
                {component.data.autoPlayInterval / 1000} ثانية
              </div>
            </div>
          )}

          {/* Show Navigation */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>إظهار أزرار التنقل</Label>
              <p className="text-xs text-muted-foreground">
                أزرار السابق والتالي
              </p>
            </div>
            <Switch
              checked={component.data.showArrows}
              onCheckedChange={(checked) => updateData({ showArrows: checked })}
            />
          </div>

          {/* Show Dots */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>إظهار النقاط</Label>
              <p className="text-xs text-muted-foreground">
                نقاط التنقل أسفل السلايد شو
              </p>
            </div>
            <Switch
              checked={component.data.showDots}
              onCheckedChange={(checked) => updateData({ showDots: checked })}
            />
          </div>

          {/* Transition Effect */}
          <div className="space-y-2">
            <Label>نوع الانتقال</Label>
            <Select
              value={component.settings.transitionEffect}
              onValueChange={(value) => updateSettings({ transitionEffect: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fade">تلاشي</SelectItem>
                <SelectItem value="slide">انزلاق</SelectItem>
                <SelectItem value="zoom">تكبير</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Height */}
          <div className="space-y-2">
            <Label>ارتفاع السلايد شو (بكسل)</Label>
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
        </div>
      )}
    </div>
  );
}; 