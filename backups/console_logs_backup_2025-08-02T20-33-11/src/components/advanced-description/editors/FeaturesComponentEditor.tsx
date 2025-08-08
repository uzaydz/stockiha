import React, { useState } from 'react';
import { FeaturesComponent } from '@/types/advanced-description';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { Zap, Settings, Plus, X, CheckCircle } from 'lucide-react';

interface FeaturesComponentEditorProps {
  component: FeaturesComponent;
  onChange: (component: FeaturesComponent) => void;
  onCancel: () => void;
  onSave: () => void;
}

export const FeaturesComponentEditor: React.FC<FeaturesComponentEditorProps> = ({
  component,
  onChange,
  onCancel,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'settings'>('content');

  const updateData = (updates: Partial<FeaturesComponent['data']>) => {
    onChange({
      ...component,
      data: { ...component.data, ...updates }
    });
  };

  const updateSettings = (updates: Partial<FeaturesComponent['settings']>) => {
    onChange({
      ...component,
      settings: { ...component.settings, ...updates }
    });
  };

  const addFeature = () => {
    const newFeature = {
      id: `feature-${Date.now()}`,
      title: '',
      description: '',
      icon: '✓'
    };
    updateData({
      features: [...component.data.features, newFeature]
    });
  };

  const removeFeature = (featureId: string) => {
    updateData({
      features: component.data.features.filter(feature => feature.id !== featureId)
    });
  };

  const updateFeature = (featureId: string, updates: Partial<{
    title: string;
    description: string;
    icon: string;
  }>) => {
    updateData({
      features: component.data.features.map(feature =>
        feature.id === featureId ? { ...feature, ...updates } : feature
      )
    });
  };

  const availableIcons = [
    { name: 'CheckCircle', icon: '✓' },
    { name: 'Zap', icon: '⚡' },
    { name: 'Star', icon: '⭐' },
    { name: 'Heart', icon: '❤️' },
    { name: 'Shield', icon: '🛡️' },
    { name: 'Truck', icon: '🚚' },
    { name: 'Clock', icon: '⏰' },
    { name: 'Gift', icon: '🎁' },
    { name: 'Award', icon: '🏆' },
    { name: 'ThumbsUp', icon: '👍' },
    { name: 'Lightbulb', icon: '💡' },
    { name: 'Target', icon: '🎯' },
    { name: 'TrendingUp', icon: '📈' },
    { name: 'Users', icon: '👥' },
    { name: 'Settings', icon: '⚙️' }
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">تحرير المميزات</h3>
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
          <Zap className="w-4 h-4 mr-2" />
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
            <Label htmlFor="title">عنوان القسم</Label>
            <Input
              id="title"
              value={component.data.title}
              onChange={(e) => updateData({ title: e.target.value })}
              placeholder="مميزات المنتج"
            />
          </div>

          {/* Subtitle */}
          <div className="space-y-2">
            <Label htmlFor="subtitle">نص فرعي</Label>
            <Textarea
              id="subtitle"
              value={component.data.subtitle}
              onChange={(e) => updateData({ subtitle: e.target.value })}
              placeholder="اكتشف مميزات هذا المنتج الفريدة"
              rows={2}
            />
          </div>

          {/* Features */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  المميزات ({component.data.features.length})
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addFeature}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  إضافة ميزة
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {component.data.features.map((feature, index) => (
                  <div key={feature.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">ميزة {index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFeature(feature.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Feature Title */}
                    <div className="space-y-2">
                      <Label>عنوان الميزة</Label>
                      <Input
                        value={feature.title}
                        onChange={(e) => updateFeature(feature.id, { title: e.target.value })}
                        placeholder="عنوان الميزة"
                      />
                    </div>

                    {/* Feature Description */}
                    <div className="space-y-2">
                      <Label>وصف الميزة</Label>
                      <Textarea
                        value={feature.description}
                        onChange={(e) => updateFeature(feature.id, { description: e.target.value })}
                        placeholder="وصف تفصيلي للميزة"
                        rows={2}
                      />
                    </div>

                    {/* Feature Icon */}
                    <div className="space-y-2">
                      <Label>أيقونة الميزة</Label>
                      <Select
                        value={feature.icon}
                        onValueChange={(value) => updateFeature(feature.id, { icon: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableIcons.map((iconData) => (
                            <SelectItem key={iconData.name} value={iconData.icon}>
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{iconData.icon}</span>
                                <span>{iconData.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}

                {component.data.features.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد مميزات بعد</p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addFeature}
                      className="mt-2"
                    >
                      إضافة ميزة أولى
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
          {/* Layout */}
          <div className="space-y-2">
            <Label>نوع العرض</Label>
            <Select
              value={component.settings.layout}
              onValueChange={(value) => updateSettings({ layout: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grid">شبكة</SelectItem>
                <SelectItem value="list">قائمة</SelectItem>
                <SelectItem value="cards">بطاقات</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Columns (for grid layout) */}
          {component.settings.layout === 'grid' && (
            <div className="space-y-2">
              <Label>عدد الأعمدة</Label>
              <Slider
                value={[component.settings.columns]}
                onValueChange={([value]) => updateSettings({ columns: value })}
                min={1}
                max={4}
                step={1}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground text-center">
                {component.settings.columns} عمود
              </div>
            </div>
          )}

          {/* Show Icons */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>إظهار الأيقونات</Label>
              <p className="text-xs text-muted-foreground">
                عرض أيقونات بجانب كل ميزة
              </p>
            </div>
            <Switch
              checked={component.settings.showIcons}
              onCheckedChange={(checked) => updateSettings({ showIcons: checked })}
            />
          </div>

          {/* Icon Color */}
          {component.settings.showIcons && (
            <div className="space-y-2">
              <Label>لون الأيقونات</Label>
              <Select
                value={component.settings.iconColor}
                onValueChange={(value) => updateSettings({ iconColor: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">أساسي</SelectItem>
                  <SelectItem value="secondary">ثانوي</SelectItem>
                  <SelectItem value="accent">تأكيدي</SelectItem>
                  <SelectItem value="success">نجاح</SelectItem>
                  <SelectItem value="warning">تحذير</SelectItem>
                  <SelectItem value="destructive">خطأ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Icon Size */}
          {component.settings.showIcons && (
            <div className="space-y-2">
              <Label>حجم الأيقونات</Label>
              <Select
                value={component.settings.iconSize}
                onValueChange={(value) => updateSettings({ iconSize: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sm">صغير</SelectItem>
                  <SelectItem value="md">متوسط</SelectItem>
                  <SelectItem value="lg">كبير</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Show Dividers */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>إظهار فواصل</Label>
              <p className="text-xs text-muted-foreground">
                خطوط فاصلة بين المميزات
              </p>
            </div>
            <Switch
              checked={component.settings.showDividers}
              onCheckedChange={(checked) => updateSettings({ showDividers: checked })}
            />
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
        </div>
      )}
    </div>
  );
}; 