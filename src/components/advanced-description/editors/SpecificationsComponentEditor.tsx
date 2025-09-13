import React, { useState } from 'react';
import { SpecificationsComponent } from '@/types/advanced-description';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { List, Settings, Plus, X } from 'lucide-react';

interface SpecificationsComponentEditorProps {
  component: SpecificationsComponent;
  onChange: (component: SpecificationsComponent) => void;
  onCancel: () => void;
  onSave: () => void;
}

export const SpecificationsComponentEditor: React.FC<SpecificationsComponentEditorProps> = ({
  component,
  onChange,
  onCancel,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'settings'>('content');

  const updateData = (updates: Partial<SpecificationsComponent['data']>) => {
    onChange({
      ...component,
      data: { ...component.data, ...updates }
    });
  };

  const updateSettings = (updates: Partial<SpecificationsComponent['settings']>) => {
    onChange({
      ...component,
      settings: { ...component.settings, ...updates }
    });
  };

  const addSpecification = () => {
    const newSpec = {
      id: `spec-${Date.now()}`,
      name: '',
      value: '',
      unit: '',
      description: ''
    };
    updateData({
      specifications: [...(component.data.specifications || []), newSpec]
    });
  };

  const removeSpecification = (specId: string) => {
    updateData({
      specifications: (component.data.specifications || []).filter(spec => spec.id !== specId)
    });
  };

  const updateSpecification = (specId: string, updates: Partial<{
    name: string;
    value: string;
    unit: string;
    description: string;
  }>) => {
    updateData({
      specifications: (component.data.specifications || []).map(spec =>
        spec.id === specId ? { ...spec, ...updates } : spec
      )
    });
  };

  const addCategory = () => {
    const newCategory = {
      id: `category-${Date.now()}`,
      name: '',
      specifications: []
    };
    updateData({
      categories: [...(component.data.categories || []), newCategory]
    });
  };

  const removeCategory = (categoryId: string) => {
    updateData({
      categories: (component.data.categories || []).filter(category => category.id !== categoryId)
    });
  };

  const updateCategory = (categoryId: string, updates: Partial<{
    name: string;
    specifications?: Array<{name: string, value: string, unit?: string}>;
  }>) => {
    updateData({
      categories: (component.data.categories || []).map(category =>
        category.id === categoryId ? { ...category, ...updates } : category
      )
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative">
        <div className="flex items-center justify-between p-6 bg-gradient-to-r from-background via-background/95 to-muted/20 rounded-xl border border-border/30 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg border border-primary/20">
              <List className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                تحرير المواصفات
              </h3>
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                قم بإضافة وتخصيص مواصفات المنتج
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={onCancel}
              className="bg-background/50 border-border/40 hover:bg-muted/50 transition-all duration-200"
            >
              إلغاء
            </Button>
            <Button 
              onClick={onSave}
              className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-md hover:shadow-lg transition-all duration-200"
            >
              حفظ
            </Button>
          </div>
        </div>
        {/* خط زخرفي */}
        <div className="absolute -bottom-2 left-6 right-6 h-0.5 bg-gradient-to-r from-primary/20 via-primary/40 to-secondary/20 rounded-full" />
      </div>

      {/* Tabs */}
      <div className="relative">
        <div className="flex gap-2 bg-gradient-to-r from-muted/20 via-muted/30 to-muted/20 p-2 rounded-xl border border-border/30 backdrop-blur-sm">
          <Button
            variant={activeTab === 'content' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('content')}
            className={cn(
              "flex-1 transition-all duration-300 font-medium",
              activeTab === 'content' 
                ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-md hover:shadow-lg" 
                : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
            )}
          >
            <List className="w-4 h-4 mr-2" />
            المحتوى
          </Button>
          <Button
            variant={activeTab === 'settings' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('settings')}
            className={cn(
              "flex-1 transition-all duration-300 font-medium",
              activeTab === 'settings' 
                ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-md hover:shadow-lg" 
                : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
            )}
          >
            <Settings className="w-4 h-4 mr-2" />
            الإعدادات
          </Button>
        </div>
      </div>

      {/* Content Tab */}
      {activeTab === 'content' && (
        <div className="space-y-8">
          {/* Basic Information Section */}
          <div className="bg-gradient-to-br from-background via-background/95 to-muted/10 p-6 rounded-xl border border-border/30 shadow-sm space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-gradient-to-b from-primary to-secondary rounded-full" />
              <h4 className="text-lg font-semibold text-foreground/90">المعلومات الأساسية</h4>
            </div>
            
            {/* Title */}
            <div className="space-y-3">
              <Label htmlFor="title" className="text-sm font-medium text-foreground/80">عنوان القسم</Label>
              <Input
                id="title"
                value={component.data.title || ''}
                onChange={(e) => updateData({ title: e.target.value })}
                placeholder="مواصفات المنتج"
                className="bg-background/50 border-border/40 focus:border-primary/50 transition-all duration-200"
              />
            </div>

            {/* Subtitle */}
            <div className="space-y-3">
              <Label htmlFor="subtitle" className="text-sm font-medium text-foreground/80">نص فرعي</Label>
              <Textarea
                id="subtitle"
                value={component.data.subtitle || ''}
                onChange={(e) => updateData({ subtitle: e.target.value })}
                placeholder="المواصفات التقنية والفنية للمنتج"
                rows={2}
                className="bg-background/50 border-border/40 focus:border-primary/50 transition-all duration-200 resize-none"
              />
            </div>

            {/* Layout Type */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground/80">نوع التنظيم</Label>
              <Select
                value={component.data.layoutType}
                onValueChange={(value) => updateData({ layoutType: value as any })}
              >
                <SelectTrigger className="bg-background/50 border-border/40 focus:border-primary/50 transition-all duration-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background/95 backdrop-blur-sm border-border/30">
                  <SelectItem value="simple" className="hover:bg-muted/50">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary/60 rounded-full" />
                      قائمة بسيطة
                    </div>
                  </SelectItem>
                  <SelectItem value="categorized" className="hover:bg-muted/50">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-secondary/60 rounded-full" />
                      مقسمة لفئات
                    </div>
                  </SelectItem>
                  <SelectItem value="table" className="hover:bg-muted/50">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-accent/60 rounded-full" />
                      جدول
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Simple Layout */}
          {component.data.layoutType === 'simple' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <List className="w-4 h-4" />
                    المواصفات ({(component.data.specifications || []).length})
                  </CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addSpecification}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    إضافة مواصفة
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(component.data.specifications || []).map((spec, index) => (
                    <div key={spec.id} className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">مواصفة {index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSpecification(spec.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Specification Name */}
                      <div className="space-y-2">
                        <Label>اسم المواصفة</Label>
                        <Input
                          value={spec.name}
                          onChange={(e) => updateSpecification(spec.id, { name: e.target.value })}
                          placeholder="مثال: الوزن"
                        />
                      </div>

                      {/* Specification Value */}
                      <div className="space-y-2">
                        <Label>قيمة المواصفة</Label>
                        <Input
                          value={spec.value}
                          onChange={(e) => updateSpecification(spec.id, { value: e.target.value })}
                          placeholder="مثال: 500"
                        />
                      </div>

                      {/* Unit */}
                      <div className="space-y-2">
                        <Label>الوحدة</Label>
                        <Input
                          value={spec.unit}
                          onChange={(e) => updateSpecification(spec.id, { unit: e.target.value })}
                          placeholder="مثال: جرام"
                        />
                      </div>

                      {/* Description */}
                      <div className="space-y-2">
                        <Label>وصف إضافي</Label>
                        <Textarea
                          value={spec.description}
                          onChange={(e) => updateSpecification(spec.id, { description: e.target.value })}
                          placeholder="وصف تفصيلي للمواصفة"
                          rows={2}
                        />
                      </div>
                    </div>
                  ))}

                  {(component.data.specifications || []).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <List className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>لا توجد مواصفات بعد</p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addSpecification}
                        className="mt-2"
                      >
                        إضافة مواصفة أولى
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Categorized Layout */}
          {component.data.layoutType === 'categorized' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <List className="w-4 h-4" />
                    الفئات ({(component.data.categories || []).length})
                  </CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCategory}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    إضافة فئة
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(component.data.categories || []).map((category, index) => (
                    <div key={category.id} className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">فئة {index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCategory(category.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Category Name */}
                      <div className="space-y-2">
                        <Label>اسم الفئة</Label>
                        <Input
                          value={category.name}
                          onChange={(e) => updateCategory(category.id, { name: e.target.value })}
                          placeholder="مثال: المواصفات الفيزيائية"
                        />
                      </div>

                      {/* Category Specifications */}
                      <div className="space-y-2">
                        <Label>مواصفات الفئة</Label>
                        <div className="space-y-2">
                          {(category.specifications || []).map((spec, specIndex) => (
                            <div key={specIndex} className="flex gap-2">
                              <Input
                                value={spec.name}
                                onChange={(e) => {
                                  const updatedSpecs = [...(category.specifications || [])];
                                  updatedSpecs[specIndex] = { ...spec, name: e.target.value };
                                  updateCategory(category.id, { specifications: updatedSpecs });
                                }}
                                placeholder="اسم المواصفة"
                              />
                              <Input
                                value={spec.value}
                                onChange={(e) => {
                                  const updatedSpecs = [...(category.specifications || [])];
                                  updatedSpecs[specIndex] = { ...spec, value: e.target.value };
                                  updateCategory(category.id, { specifications: updatedSpecs });
                                }}
                                placeholder="القيمة"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const updatedSpecs = (category.specifications || []).filter((_, i) => i !== specIndex);
                                  updateCategory(category.id, { specifications: updatedSpecs });
                                }}
                                className="text-red-600"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const updatedSpecs = [...(category.specifications || []), { name: '', value: '' }];
                              updateCategory(category.id, { specifications: updatedSpecs });
                            }}
                            className="gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            إضافة مواصفة
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {(component.data.categories || []).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <List className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>لا توجد فئات بعد</p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addCategory}
                        className="mt-2"
                      >
                        إضافة فئة أولى
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Show Units */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>إظهار الوحدات</Label>
              <p className="text-xs text-muted-foreground">
                عرض وحدات القياس بجانب القيم
              </p>
            </div>
            <Switch
              checked={component.settings.showUnits}
              onCheckedChange={(checked) => updateSettings({ showUnits: checked })}
            />
          </div>

          {/* Show Descriptions */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>إظهار الأوصاف</Label>
              <p className="text-xs text-muted-foreground">
                عرض الأوصاف التفصيلية للمواصفات
              </p>
            </div>
            <Switch
              checked={component.settings.showDescriptions}
              onCheckedChange={(checked) => updateSettings({ showDescriptions: checked })}
            />
          </div>

          {/* Alternating Colors */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>ألوان متناوبة</Label>
              <p className="text-xs text-muted-foreground">
                ألوان مختلفة للصفوف المتناوبة
              </p>
            </div>
            <Switch
              checked={component.settings.alternatingColors}
              onCheckedChange={(checked) => updateSettings({ alternatingColors: checked })}
            />
          </div>

          {/* Border Style */}
          <div className="space-y-2">
            <Label>نمط الحدود</Label>
            <Select
              value={component.settings.borderStyle}
              onValueChange={(value) => updateSettings({ borderStyle: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">بدون حدود</SelectItem>
                <SelectItem value="bordered">حدود كاملة</SelectItem>
                <SelectItem value="separated">فواصل فقط</SelectItem>
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
        </div>
      )}
    </div>
  );
};
