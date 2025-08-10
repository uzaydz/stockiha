import React, { memo, useCallback } from "react";
import { TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  TooltipProvider, 
  Tooltip, 
  TooltipTrigger, 
  TooltipContent 
} from "@/components/ui/tooltip";
import { Copy } from "lucide-react";
import { toast } from "sonner";

interface OrderRowNumberProps {
  formattedOrderNumber: string;
}

const OrderRowNumber: React.FC<OrderRowNumberProps> = ({
  formattedOrderNumber,
}) => {
  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(formattedOrderNumber);
      toast.success('تم نسخ رقم الطلب بنجاح');
    } catch (err) {
      // الطريقة القديمة للمتصفحات القديمة
      const textArea = document.createElement('textarea');
      textArea.value = formattedOrderNumber;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success('تم نسخ رقم الطلب بنجاح');
    }
  }, [formattedOrderNumber]);

  const handleCopyClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    copyToClipboard();
  }, [copyToClipboard]);

  return (
    <TableCell className="py-4 px-4 select-text" style={{ contain: 'layout' }}>
      <div className="flex items-center gap-2 group">
        <div 
          className="font-semibold text-foreground bg-accent/30 px-2 py-1 rounded-md text-sm select-text" 
          title={formattedOrderNumber}
          style={{ willChange: 'auto' }}
        >
          {formattedOrderNumber}
        </div>
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 invisible group-hover:visible transform translate-x-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-md"
                onClick={handleCopyClick}
                aria-label="نسخ رقم الطلب"
                title="نسخ رقم الطلب"
                style={{ willChange: 'transform' }}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <span>نسخ رقم الطلب</span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </TableCell>
  );
};

export default memo(OrderRowNumber);
