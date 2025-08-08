import React from 'react';
import { PriceComponent } from '@/types/advanced-description';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info, Save, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PriceComponentEditorProps {
  component: PriceComponent;
  onChange: (updatedComponent: PriceComponent) => void;
  onCancel: () => void;
  onSave: () => void;
}

export const PriceComponentEditor: React.FC<PriceComponentEditorProps> = ({
  component,
  onChange,
  onCancel,
  onSave
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">إضافة سعر المنتج</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            إلغاء
          </Button>
          <Button onClick={onSave}>
            إضافة
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-200">
            <DollarSign className="w-5 h-5" />
            مكون سعر المنتج
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                عرض السعر التلقائي
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                سيتم إضافة مكون سعر المنتج الذي يعرض السعر الحالي تلقائياً مع جميع التفاصيل:
                السعر الأساسي، الخصومات، العروض الخاصة، وسعر الجملة إن وجد.
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                لا تحتاج لأي إعدادات إضافية - السعر يأتي مباشرة من بيانات المنتج.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">معاينة المكون:</h3>
        <div className="bg-gradient-to-br from-muted/30 to-muted/50 rounded-lg border border-border/30 aspect-[4/3] flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <DollarSign className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">سعر المنتج</p>
              <p className="text-xs text-muted-foreground px-4">
                سيظهر سعر المنتج الحالي مع جميع التفاصيل
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 