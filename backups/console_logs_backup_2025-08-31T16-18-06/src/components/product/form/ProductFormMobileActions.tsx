import React, { memo } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Save, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ProductFormMobileActionsProps {
  isSubmitting: boolean;
  isEditMode: boolean;
  isDirty: boolean;
  disabled: boolean;
  permissionWarning?: string;
  onSubmit: () => void;
  onCancel: () => void;
}

const ProductFormMobileActions: React.FC<ProductFormMobileActionsProps> = memo(({
  isSubmitting,
  isEditMode,
  isDirty,
  disabled,
  permissionWarning,
  onSubmit,
  onCancel,
}) => {
  // Check if we're in browser environment
  if (typeof window === 'undefined' || !document.body) {
    return null;
  }

  return createPortal(
    <div className="lg:hidden fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[9999]" 
         style={{ 
           position: 'fixed',
           bottom: '24px',
           left: '50%',
           transform: 'translateX(-50%)',
           zIndex: 9999
         }}>
      <div className="flex items-center gap-4">
        {/* Cancel Button */}
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="h-12 w-12 rounded-full shadow-xl bg-background/95 backdrop-blur-sm border-2 hover:scale-105 active:scale-95 transition-all duration-300"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        {/* Main Action Button */}
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
          
          <Button
            type="button"
            disabled={disabled || isSubmitting}
            onClick={onSubmit}
            className={cn(
              "relative h-16 px-8 rounded-full shadow-2xl transition-all duration-300 hover:shadow-3xl hover:scale-105 active:scale-95 font-semibold text-base",
              "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80",
              "border-2 border-primary-foreground/20",
              permissionWarning && "from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800"
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                <span className="text-sm sm:text-base">جاري المعالجة...</span>
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                <span className="text-sm sm:text-base">
                  {isEditMode ? 'حفظ التغييرات' : 'إنشاء المنتج'}
                </span>
              </>
            )}
          </Button>
          
          {/* Progress indicator for mobile */}
          {isDirty && (
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center animate-bounce">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
});

ProductFormMobileActions.displayName = 'ProductFormMobileActions';

export default ProductFormMobileActions;
