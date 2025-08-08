import React, { useState } from 'react';
import { ImageComponent } from '@/types/advanced-description';
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
import { ImageIcon, Settings, Eye, Monitor, Smartphone, Tablet } from 'lucide-react';

interface ImageComponentEditorProps {
  component: ImageComponent;
  onChange: (component: ImageComponent) => void;
  onCancel: () => void;
  onSave: () => void;
}

export const ImageComponentEditor: React.FC<ImageComponentEditorProps> = ({
  component,
  onChange,
  onCancel,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'settings'>('content');

  const updateData = (updates: Partial<ImageComponent['data']>) => {
    onChange({
      ...component,
      data: { ...component.data, ...updates }
    });
  };

  const updateSettings = (updates: Partial<ImageComponent['settings']>) => {
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
          <h3 className="text-lg font-semibold">تحرير مكون الصورة</h3>
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
          {/* Image Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                اختيار الصورة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ImageUploader
                imageUrl={component.data.url}
                onImageUploaded={(url) => updateData({ url })}
                label="رفع صورة المنتج"
                folder="advanced-descriptions"
                maxSizeInMB={5}
                className="w-full"
              />
            </CardContent>
          </Card>

          {/* Image Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">تفاصيل الصورة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="alt-text">النص البديل</Label>
                <Input
                  id="alt-text"
                  placeholder="وصف الصورة للمتصفحات وقارئات الشاشة"
                  value={component.data.alt || ''}
                  onChange={(e) => updateData({ alt: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="caption">التسمية التوضيحية</Label>
                <Textarea
                  id="caption"
                  placeholder="نص توضيحي يظهر أسفل الصورة (اختياري)"
                  value={component.data.caption || ''}
                  onChange={(e) => updateData({ caption: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="width">العرض (بكسل)</Label>
                  <Input
                    id="width"
                    type="number"
                    placeholder="تلقائي"
                    value={component.data.width || ''}
                    onChange={(e) => updateData({ 
                      width: e.target.value ? parseInt(e.target.value) : undefined 
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="height">الارتفاع (بكسل)</Label>
                  <Input
                    id="height"
                    type="number"
                    placeholder="تلقائي"
                    value={component.data.height || ''}
                    onChange={(e) => updateData({ 
                      height: e.target.value ? parseInt(e.target.value) : undefined 
                    })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Size & Fit Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                إعدادات الحجم والملء
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>وضع الحجم</Label>
                <Select 
                  value={component.data.sizeMode} 
                  onValueChange={(value: 'custom' | 'responsive' | 'full-width' | 'contain' | 'cover') => updateData({ sizeMode: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="responsive">متجاوب</SelectItem>
                    <SelectItem value="full-width">عرض كامل</SelectItem>
                    <SelectItem value="contain">احتواء</SelectItem>
                    <SelectItem value="cover">تغطية</SelectItem>
                    <SelectItem value="custom">مخصص</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {component.data.sizeMode === 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="max-width">أقصى عرض (بكسل)</Label>
                    <Input
                      id="max-width"
                      type="number"
                      placeholder="تلقائي"
                      value={component.data.maxWidth || ''}
                      onChange={(e) => updateData({ 
                        maxWidth: e.target.value ? parseInt(e.target.value) : undefined 
                      })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max-height">أقصى ارتفاع (بكسل)</Label>
                    <Input
                      id="max-height"
                      type="number"
                      placeholder="تلقائي"
                      value={component.data.maxHeight || ''}
                      onChange={(e) => updateData({ 
                        maxHeight: e.target.value ? parseInt(e.target.value) : undefined 
                      })}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>نسبة الأبعاد</Label>
                <Select 
                  value={component.data.aspectRatio} 
                  onValueChange={(value: 'auto' | '1:1' | '4:3' | '16:9' | '3:2') => updateData({ aspectRatio: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">تلقائي</SelectItem>
                    <SelectItem value="1:1">مربع (1:1)</SelectItem>
                    <SelectItem value="4:3">أفقي (4:3)</SelectItem>
                    <SelectItem value="16:9">واسع (16:9)</SelectItem>
                    <SelectItem value="3:2">كلاسيكي (3:2)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>وضع الملء</Label>
                <Select 
                  value={component.data.fitMode} 
                  onValueChange={(value: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down') => updateData({ fitMode: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contain">احتواء</SelectItem>
                    <SelectItem value="cover">تغطية</SelectItem>
                    <SelectItem value="fill">ملء</SelectItem>
                    <SelectItem value="none">بدون</SelectItem>
                    <SelectItem value="scale-down">تصغير</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>موضع الصورة</Label>
                <Select 
                  value={component.data.objectPosition} 
                  onValueChange={(value: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right') => updateData({ objectPosition: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="center">وسط</SelectItem>
                    <SelectItem value="top">أعلى</SelectItem>
                    <SelectItem value="bottom">أسفل</SelectItem>
                    <SelectItem value="left">يسار</SelectItem>
                    <SelectItem value="right">يمين</SelectItem>
                    <SelectItem value="top-left">أعلى يسار</SelectItem>
                    <SelectItem value="top-right">أعلى يمين</SelectItem>
                    <SelectItem value="bottom-left">أسفل يسار</SelectItem>
                    <SelectItem value="bottom-right">أسفل يمين</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Alignment & Style */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">المحاذاة والنمط</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>محاذاة الصورة</Label>
                <Select 
                  value={component.data.alignment} 
                  onValueChange={(value: 'left' | 'center' | 'right') => updateData({ alignment: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="right">يمين</SelectItem>
                    <SelectItem value="center">وسط</SelectItem>
                    <SelectItem value="left">يسار</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>زاوية الحدود: {component.data.borderRadius}px</Label>
                <Slider
                  value={[component.data.borderRadius]}
                  onValueChange={([value]) => updateData({ borderRadius: value })}
                  max={30}
                  step={1}
                  className="w-full"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="shadow">إضافة ظل</Label>
                <Switch
                  id="shadow"
                  checked={component.data.shadow}
                  onCheckedChange={(checked) => updateData({ shadow: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">إعدادات العرض</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="show-caption">عرض التسمية التوضيحية</Label>
                  <p className="text-xs text-muted-foreground">
                    إظهار النص التوضيحي أسفل الصورة
                  </p>
                </div>
                <Switch
                  id="show-caption"
                  checked={component.settings.showCaption}
                  onCheckedChange={(checked) => updateSettings({ showCaption: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="click-to-enlarge">إمكانية التكبير</Label>
                  <p className="text-xs text-muted-foreground">
                    السماح للمستخدمين بتكبير الصورة عند النقر
                  </p>
                </div>
                <Switch
                  id="click-to-enlarge"
                  checked={component.settings.clickToEnlarge}
                  onCheckedChange={(checked) => updateSettings({ clickToEnlarge: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="lazy-load">التحميل التدريجي</Label>
                  <p className="text-xs text-muted-foreground">
                    تحميل الصورة عند الحاجة لتحسين الأداء
                  </p>
                </div>
                <Switch
                  id="lazy-load"
                  checked={component.settings.lazyLoad}
                  onCheckedChange={(checked) => updateSettings({ lazyLoad: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Responsive Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                إعدادات الاستجابة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-blue-500" />
                  <Label className="text-sm font-medium">الهاتف المحمول</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground w-16">العرض %</Label>
                  <Slider
                    value={[component.settings.responsiveBreakpoints.mobile]}
                    onValueChange={([value]) => updateSettings({ 
                      responsiveBreakpoints: { 
                        ...component.settings.responsiveBreakpoints, 
                        mobile: value 
                      } 
                    })}
                    max={100}
                    step={5}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground w-8">
                    {component.settings.responsiveBreakpoints.mobile}%
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Tablet className="w-4 h-4 text-green-500" />
                  <Label className="text-sm font-medium">التابلت</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground w-16">العرض %</Label>
                  <Slider
                    value={[component.settings.responsiveBreakpoints.tablet]}
                    onValueChange={([value]) => updateSettings({ 
                      responsiveBreakpoints: { 
                        ...component.settings.responsiveBreakpoints, 
                        tablet: value 
                      } 
                    })}
                    max={100}
                    step={5}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground w-8">
                    {component.settings.responsiveBreakpoints.tablet}%
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-purple-500" />
                  <Label className="text-sm font-medium">الحاسوب</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground w-16">العرض %</Label>
                  <Slider
                    value={[component.settings.responsiveBreakpoints.desktop]}
                    onValueChange={([value]) => updateSettings({ 
                      responsiveBreakpoints: { 
                        ...component.settings.responsiveBreakpoints, 
                        desktop: value 
                      } 
                    })}
                    max={100}
                    step={5}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground w-8">
                    {component.settings.responsiveBreakpoints.desktop}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lightbox Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">إعدادات العرض المكبر</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="enable-lightbox">تفعيل العرض المكبر</Label>
                  <p className="text-xs text-muted-foreground">
                    إمكانية تكبير الصورة عند النقر
                  </p>
                </div>
                <Switch
                  id="enable-lightbox"
                  checked={component.settings.enableLightbox}
                  onCheckedChange={(checked) => updateSettings({ enableLightbox: checked })}
                />
              </div>

              {component.settings.enableLightbox && (
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="lightbox-zoom">إمكانية التكبير</Label>
                    <p className="text-xs text-muted-foreground">
                      السماح بتكبير الصورة في العرض المكبر
                    </p>
                  </div>
                  <Switch
                    id="lightbox-zoom"
                    checked={component.settings.lightboxZoom}
                    onCheckedChange={(checked) => updateSettings({ lightboxZoom: checked })}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="w-4 h-4" />
                معاينة سريعة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-4 bg-muted/30">
                <div 
                  className={cn(
                    "relative",
                    component.data.alignment === 'left' && "text-left",
                    component.data.alignment === 'center' && "text-center",
                    component.data.alignment === 'right' && "text-right"
                  )}
                >
                  {component.data.url ? (
                    <div className="space-y-2">
                      <img
                        src={component.data.url}
                        alt={component.data.alt || 'معاينة الصورة'}
                        className={cn(
                          "transition-all duration-300",
                          component.data.shadow && "shadow-lg",
                          component.data.sizeMode === 'full-width' && "w-full",
                          component.data.sizeMode === 'contain' && "max-w-full h-auto object-contain",
                          component.data.sizeMode === 'cover' && "w-full h-48 object-cover",
                          component.data.sizeMode === 'custom' && "max-w-full h-auto",
                          component.data.sizeMode === 'responsive' && "max-w-full h-auto"
                        )}
                        style={{
                          borderRadius: `${component.data.borderRadius}px`,
                          width: component.data.sizeMode === 'custom' && component.data.maxWidth ? `${Math.min(component.data.maxWidth, 300)}px` : undefined,
                          height: component.data.sizeMode === 'custom' && component.data.maxHeight ? `${Math.min(component.data.maxHeight, 200)}px` : undefined,
                          objectFit: component.data.fitMode,
                          objectPosition: component.data.objectPosition,
                          aspectRatio: component.data.aspectRatio !== 'auto' ? component.data.aspectRatio : undefined,
                        }}
                      />
                      {component.settings.showCaption && component.data.caption && (
                        <p className="text-sm text-muted-foreground text-center">
                          {component.data.caption}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32 bg-muted/50 rounded-lg border-2 border-dashed">
                      <div className="text-center">
                        <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">لم يتم تحديد صورة</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};