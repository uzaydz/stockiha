import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import ProductQuickInfoPanel from './ProductQuickInfoPanel';
import { UseFormReturn } from 'react-hook-form';
import { ProductFormValues } from '@/types/product';

interface ProductFormSidebarProps {
  form: UseFormReturn<ProductFormValues>;
  isEditMode: boolean;
  productId?: string;
  thumbnailImage?: string;
  progress: number;
  isDirty: boolean;
  isValid: boolean;
  autoSaveDrafts: boolean;
  onAutoSaveChange: (enabled: boolean) => void;
}

const ProductFormSidebar: React.FC<ProductFormSidebarProps> = memo(({
  form,
  isEditMode,
  productId,
  thumbnailImage,
  progress,
  isDirty,
  isValid,
  autoSaveDrafts,
  onAutoSaveChange,
}) => {
  return (
    <div className="hidden lg:block lg:col-span-1 space-y-6">
      <div className="sticky top-24">
        <ProductQuickInfoPanel
          form={form}
          isEditMode={isEditMode}
          productId={productId}
          thumbnailImage={thumbnailImage}
        />
        
        {/* Enhanced Settings Panel - Hidden on mobile */}
        <Card className="hidden lg:block mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              تقدم النموذج
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">مكتمل</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <Label htmlFor="autosave" className="text-sm">
                الحفظ التلقائي
              </Label>
              <Switch
                id="autosave"
                checked={autoSaveDrafts}
                onCheckedChange={onAutoSaveChange}
                disabled={isEditMode}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">حالة النموذج</Label>
              <div className="flex flex-wrap gap-1">
                <Badge variant={isValid ? 'default' : 'secondary'} className="text-xs">
                  {isValid ? 'صحيح' : 'غير مكتمل'}
                </Badge>
                {isDirty && (
                  <Badge variant="outline" className="text-xs">
                    معدل
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

ProductFormSidebar.displayName = 'ProductFormSidebar';

export default ProductFormSidebar;
