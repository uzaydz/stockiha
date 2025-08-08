import React, { useState } from 'react';
import { GalleryComponent } from '@/types/advanced-description';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { ImageIcon, Settings, Info } from 'lucide-react';

interface GalleryComponentEditorProps {
  component: GalleryComponent;
  onChange: (component: GalleryComponent) => void;
  onCancel: () => void;
  onSave: () => void;
}

export const GalleryComponentEditor: React.FC<GalleryComponentEditorProps> = ({
  component,
  onChange,
  onCancel,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState<'content'>('content');

  const updateData = (updates: Partial<GalleryComponent['data']>) => {
    onChange({
      ...component,
      data: { ...component.data, ...updates }
    });
  };

  const updateSettings = (updates: Partial<GalleryComponent['settings']>) => {
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
          <h3 className="text-lg font-semibold">تحرير معرض الصور</h3>
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

      {/* Content Section */}
        <div className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">عنوان المعرض</Label>
            <Input
              id="title"
              value={component.data.title}
              onChange={(e) => updateData({ title: e.target.value })}
              placeholder="معرض صور المنتج"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">وصف المعرض (اختياري)</Label>
            <Textarea
              id="description"
              value={component.data.description || ''}
              onChange={(e) => updateData({ description: e.target.value })}
              placeholder="وصف قصير لمعرض الصور"
              rows={3}
            />
          </div>

          {/* Info about gallery */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                  معرض الصور التلقائي
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  سيتم عرض معرض الصور الاحترافي الخاص بالمنتج (نفس المعرض الموجود في صفحة الشراء) 
                  مع جميع الميزات المتقدمة مثل الزوم والتنقل والصور المصغرة.
                </p>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
};