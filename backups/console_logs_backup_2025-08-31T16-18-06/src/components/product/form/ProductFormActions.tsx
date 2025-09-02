import React, { memo } from 'react';
import { Loader2, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ProductFormActionsProps {
  isSubmitting: boolean;
  isDirty: boolean;
  isValid: boolean;
  errorCount: number;
  permissionWarning?: string;
  isEditMode: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  disabled: boolean;
}

const ProductFormActions: React.FC<ProductFormActionsProps> = memo(({
  isSubmitting,
  isDirty,
  isValid,
  errorCount,
  permissionWarning,
  isEditMode,
  onSubmit,
  onCancel,
  disabled,
}) => {
  return (
    <div className="hidden lg:block sticky bottom-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {isDirty && (
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-amber-500 rounded-full animate-pulse" />
                <span>لديك تغييرات غير محفوظة</span>
              </div>
            )}
            {isValid ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>النموذج صحيح</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span>النموذج يحتوي على أخطاء ({errorCount})</span>
              </div>
            )}
          </div>
          
          <div className="flex gap-3 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none"
            >
              إلغاء
            </Button>
            
            <Button
              type="submit"
              disabled={disabled || isSubmitting}
              className={cn(
                "flex-1 sm:flex-none",
                permissionWarning
                  ? "bg-amber-600 hover:bg-amber-700 border-amber-600"
                  : "bg-primary hover:bg-primary/90"
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  جاري المعالجة...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {permissionWarning 
                    ? `محاولة ${isEditMode ? 'حفظ التغييرات' : 'إنشاء المنتج'}`
                    : `${isEditMode ? 'حفظ التغييرات' : 'إنشاء المنتج'}`
                  }
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

ProductFormActions.displayName = 'ProductFormActions';

export default ProductFormActions;
