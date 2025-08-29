import React, { memo, forwardRef } from 'react';
import { Button } from "@/components/ui/button";
import { Send, Loader2, ChevronDown } from 'lucide-react';

interface ProviderSelectionButtonProps {
  isLoading: boolean;
  selectedProvider: string | null;
  disabled?: boolean;
  providersCount: number;
}

const ProviderSelectionButton = forwardRef<HTMLButtonElement, ProviderSelectionButtonProps>(({
  isLoading,
  selectedProvider,
  disabled = false,
  providersCount
}, ref) => {
  return (
    <Button 
      ref={ref}
      type="button"
      variant="outline" 
      size="sm" 
      className="h-7 px-2.5 py-0.5 text-xs hover:bg-accent transition-colors rounded-full border-dashed"
      disabled={isLoading || disabled}
      style={{ 
        contain: 'layout style',
        contentVisibility: 'auto',
        willChange: isLoading ? 'contents' : 'auto'
      }}
    >
      {isLoading && selectedProvider ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin ml-1.5" />
          <span>جاري الإرسال...</span>
        </>
      ) : (
        <>
          <Send className="h-3.5 w-3.5 ml-1.5" />
          <span>اختر شركة التوصيل</span>
          <ChevronDown className="h-3 w-3 mr-0.5" />
        </>
      )}
    </Button>
  );
});

ProviderSelectionButton.displayName = 'ProviderSelectionButton';

export default memo(ProviderSelectionButton);
