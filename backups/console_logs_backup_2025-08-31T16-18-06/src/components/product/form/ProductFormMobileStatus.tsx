import React, { memo } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface ProductFormMobileStatusProps {
  isValid: boolean;
  errorCount: number;
  isDirty: boolean;
  progress: number;
}

const ProductFormMobileStatus: React.FC<ProductFormMobileStatusProps> = memo(({
  isValid,
  errorCount,
  isDirty,
  progress,
}) => {
  return (
    <div className="lg:hidden mb-4">
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
        <div className="flex items-center gap-2">
          {isValid ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                النموذج صحيح
              </span>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                يحتوي على أخطاء ({errorCount})
              </span>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {isDirty && (
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 bg-amber-500 rounded-full animate-pulse" />
              <span className="text-xs text-amber-600 dark:text-amber-400">معدل</span>
            </div>
          )}
          <div className="text-xs font-medium text-primary">
            {progress}% مكتمل
          </div>
        </div>
      </div>
    </div>
  );
});

ProductFormMobileStatus.displayName = 'ProductFormMobileStatus';

export default ProductFormMobileStatus;
