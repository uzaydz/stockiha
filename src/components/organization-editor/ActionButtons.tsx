import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RotateCcw, Save, CheckCircle, Loader2 } from 'lucide-react';
import { ActionButtonsProps } from './types';

const ActionButtons: React.FC<ActionButtonsProps> = ({
  isSaving,
  hasUnsavedChanges,
  onSave,
  onReset,
  isMobile,
  isTablet,
  isDesktop
}) => {
  return (
    <div className={cn(
      "flex gap-2",
      isMobile && "flex-col",
      isTablet && "flex-row items-center justify-end gap-3",
      isDesktop && "flex-row items-center justify-end gap-3"
    )}>
      <Button 
        variant="outline" 
        onClick={onReset}
        className={cn(
          "text-xs sm:text-sm",
          isMobile && "w-full",
          isTablet && "w-auto",
          isDesktop && "w-auto"
        )}
      >
        <RotateCcw className="w-4 h-4 ml-2" />
        إعادة التعيين
      </Button>
      
      <Button 
        onClick={onSave}
        disabled={isSaving || !hasUnsavedChanges}
        className={cn(
          "text-xs sm:text-sm",
          isMobile && "w-full",
          isTablet && "w-auto",
          isDesktop && "w-auto"
        )}
      >
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 ml-2 animate-spin" />
            جار الحفظ...
          </>
        ) : hasUnsavedChanges ? (
          <>
            <Save className="w-4 h-4 ml-2" />
            حفظ التغييرات
          </>
        ) : (
          <>
            <CheckCircle className="w-4 h-4 ml-2" />
            محفوظ
          </>
        )}
      </Button>
    </div>
  );
};

export default React.memo(ActionButtons);
