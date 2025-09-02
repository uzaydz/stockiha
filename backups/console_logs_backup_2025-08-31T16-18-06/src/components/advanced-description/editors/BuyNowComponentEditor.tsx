import React, { useState } from 'react';
import { BuyNowComponent } from '@/types/advanced-description';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  ShoppingCart, 
  ArrowLeft,
  Palette,
  Type,
  Settings
} from 'lucide-react';

interface BuyNowComponentEditorProps {
  component: BuyNowComponent;
  onSave: (component: BuyNowComponent) => void;
  onCancel: () => void;
  className?: string;
}

export const BuyNowComponentEditor: React.FC<BuyNowComponentEditorProps> = ({
  component,
  onSave,
  onCancel,
  className
}) => {
  const [editedComponent, setEditedComponent] = useState<BuyNowComponent>(component);

  const handleSave = () => {
    onSave(editedComponent);
  };

  const updateData = (field: string, value: any) => {
    setEditedComponent(prev => ({
      ...prev,
      data: {
        ...prev.data,
        [field]: value
      }
    }));
  };

  const updateSettings = (field: string, value: any) => {
    setEditedComponent(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [field]: value
      }
    }));
  };

  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-300",
      "border border-border/50 bg-card/50 backdrop-blur-sm",
      className
    )}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">تحرير زر أطلب الآن</CardTitle>
            <Badge variant="secondary" className="text-xs">
              قابل للتخصيص
            </Badge>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-6 w-6 p-0"
          >
            <ArrowLeft className="w-3 h-3" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-6">
        {/* Content Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-medium">محتوى الزر</h4>
          </div>
          
          <div className="space-y-3">
            <div>
              <Label htmlFor="title">العنوان</Label>
              <Input
                id="title"
                value={editedComponent.data.title}
                onChange={(e) => updateData('title', e.target.value)}
                placeholder="أطلب الآن"
              />
            </div>
            
            <div>
              <Label htmlFor="description">الوصف (اختياري)</Label>
              <Input
                id="description"
                value={editedComponent.data.description || ''}
                onChange={(e) => updateData('description', e.target.value)}
                placeholder="زر الطلب السريع"
              />
            </div>
            
            <div>
              <Label htmlFor="buttonText">نص الزر</Label>
              <Input
                id="buttonText"
                value={editedComponent.data.buttonText}
                onChange={(e) => updateData('buttonText', e.target.value)}
                placeholder="أطلب الآن"
              />
            </div>
          </div>
        </div>

        {/* Appearance Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-medium">المظهر</h4>
          </div>
          
          <div className="space-y-3">
            <div>
              <Label htmlFor="buttonColor">لون الزر</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="buttonColor"
                  type="color"
                  value={editedComponent.settings.buttonColor}
                  onChange={(e) => updateSettings('buttonColor', e.target.value)}
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={editedComponent.settings.buttonColor}
                  onChange={(e) => updateSettings('buttonColor', e.target.value)}
                  placeholder="#3b82f6"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="buttonTextColor">لون النص</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="buttonTextColor"
                  type="color"
                  value={editedComponent.settings.buttonTextColor}
                  onChange={(e) => updateSettings('buttonTextColor', e.target.value)}
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={editedComponent.settings.buttonTextColor}
                  onChange={(e) => updateSettings('buttonTextColor', e.target.value)}
                  placeholder="#ffffff"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="buttonSize">حجم الزر</Label>
              <Select
                value={editedComponent.settings.buttonSize}
                onValueChange={(value) => updateSettings('buttonSize', value)}
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
            
            <div>
              <Label htmlFor="borderRadius">زوايا الزر</Label>
              <Input
                id="borderRadius"
                type="number"
                value={editedComponent.settings.borderRadius}
                onChange={(e) => updateSettings('borderRadius', parseInt(e.target.value))}
                min="0"
                max="50"
              />
            </div>
          </div>
        </div>

        {/* Behavior Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-medium">السلوك</h4>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="showIcon">إظهار الأيقونة</Label>
              <Switch
                id="showIcon"
                checked={editedComponent.settings.showIcon}
                onCheckedChange={(checked) => updateSettings('showIcon', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="fullWidth">عرض كامل</Label>
              <Switch
                id="fullWidth"
                checked={editedComponent.settings.fullWidth}
                onCheckedChange={(checked) => updateSettings('fullWidth', checked)}
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">المعاينة</h4>
          <div className="flex justify-center">
            <Button
              size={editedComponent.settings.buttonSize}
              className={cn(
                "font-semibold transition-all duration-200",
                editedComponent.settings.fullWidth ? "w-full" : "px-8",
                editedComponent.settings.showIcon && "gap-2"
              )}
              style={{
                backgroundColor: editedComponent.settings.buttonColor,
                color: editedComponent.settings.buttonTextColor,
                borderRadius: `${editedComponent.settings.borderRadius}px`,
              }}
            >
              {editedComponent.settings.showIcon && <ShoppingCart className="w-4 h-4" />}
              {editedComponent.data.buttonText}
            </Button>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4">
          <Button 
            onClick={handleSave}
            className="w-full"
            size="sm"
          >
            حفظ التغييرات
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
