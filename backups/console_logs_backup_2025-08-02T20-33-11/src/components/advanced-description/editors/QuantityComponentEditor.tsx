import React from 'react';
import { QuantityComponent } from '@/types/advanced-description';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Hash, 
  ArrowLeft,
  Info
} from 'lucide-react';

interface QuantityComponentEditorProps {
  component: QuantityComponent;
  onSave: (component: QuantityComponent) => void;
  onCancel: () => void;
  className?: string;
}

export const QuantityComponentEditor: React.FC<QuantityComponentEditorProps> = ({
  component,
  onSave,
  onCancel,
  className
}) => {
  const handleSave = () => {
    onSave(component);
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
            <Hash className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">محدد الكمية</CardTitle>
            <Badge variant="secondary" className="text-xs">
              تلقائي
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
        {/* Info Card */}
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                محدد الكمية التلقائي
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                هذا المكون يستخدم محدد كمية المنتج المدمج مع جميع الميزات المتقدمة.
                لا يحتاج إلى إعدادات إضافية لأنه يعمل تلقائياً مع بيانات المنتج.
              </p>
            </div>
          </div>
        </div>

        {/* Features List */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground">الميزات المدمجة:</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
              <span>أزرار الزيادة والنقصان</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
              <span>إدخال الكمية يدوياً</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
              <span>الحد الأدنى والأعلى للكمية</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
              <span>التحديث التلقائي للسعر</span>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground">المعاينة:</h4>
          <div className="relative bg-gradient-to-br from-muted/30 to-muted/50 rounded-lg border border-border/30 aspect-[4/3] flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Hash className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">محدد الكمية</p>
                <p className="text-xs text-muted-foreground px-4">
                  سيظهر محدد كمية المنتج مع جميع الميزات
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4">
          <Button 
            onClick={handleSave}
            className="w-full"
            size="sm"
          >
            إضافة
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}; 