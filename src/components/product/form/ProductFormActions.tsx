import React, { memo, useCallback, useState } from 'react';
import { Loader2, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  onPublishNow?: () => void;
  onSaveDraft?: () => void;
  onSchedule?: () => void;
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
  onPublishNow,
  onSaveDraft,
  onSchedule,
}) => {
  // حالة لتتبع ما إذا كانت القائمة مفتوحة لتحسين الأداء
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // معالجات محسنة للأحداث لمنع إعادة الإنشاء
  const handlePublishNow = useCallback(() => {
    setIsDropdownOpen(false);
    onPublishNow?.();
  }, [onPublishNow]);

  const handleSaveDraft = useCallback(() => {
    setIsDropdownOpen(false);
    onSaveDraft?.();
  }, [onSaveDraft]);

  const handleSchedule = useCallback(() => {
    setIsDropdownOpen(false);
    onSchedule?.();
  }, [onSchedule]);
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

            <DropdownMenu 
              open={isDropdownOpen} 
              onOpenChange={setIsDropdownOpen}
            >
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  disabled={disabled || isSubmitting}
                  className={cn(
                    "flex-1 sm:flex-none transition-all duration-200",
                    permissionWarning
                      ? "bg-amber-600 hover:bg-amber-700 border-amber-600"
                      : "bg-primary hover:bg-primary/90"
                  )}
                  style={{
                    willChange: 'transform',
                    contain: 'layout style',
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      جاري المعالجة...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {isEditMode ? 'حفظ' : 'إنشاء'}
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end"
                side="top"
                sideOffset={8}
                avoidCollisions
                collisionPadding={12}
                style={{
                  willChange: 'transform, opacity',
                  contain: 'layout paint',
                }}
              >
                <DropdownMenuItem 
                  onClick={handlePublishNow} 
                  disabled={disabled || isSubmitting}
                  style={{
                    willChange: 'background-color',
                    contain: 'layout paint',
                  }}
                >
                  نشر الآن
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleSaveDraft} 
                  disabled={disabled || isSubmitting}
                  style={{
                    willChange: 'background-color',
                    contain: 'layout paint',
                  }}
                >
                  حفظ كمسودة
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleSchedule} 
                  disabled={disabled || isSubmitting}
                  style={{
                    willChange: 'background-color',
                    contain: 'layout paint',
                  }}
                >
                  جدولة النشر
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
});

ProductFormActions.displayName = 'ProductFormActions';

export default ProductFormActions;
