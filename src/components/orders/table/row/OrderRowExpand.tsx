import React, { memo, useCallback } from "react";
import { TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  TooltipProvider, 
  Tooltip, 
  TooltipTrigger, 
  TooltipContent 
} from "@/components/ui/tooltip";
import { ChevronDown, ChevronRight } from "lucide-react";

interface OrderRowExpandProps {
  expanded: boolean;
  orderId: string;
  expandedDetailsId: string;
  onToggleExpand?: () => void;
}

const OrderRowExpand: React.FC<OrderRowExpandProps> = ({
  expanded,
  orderId,
  expandedDetailsId,
  onToggleExpand,
}) => {
  const handleMouseEnter = useCallback(() => {
    try {
      const { prefetchOrderDetails } = require('@/hooks/useOrderDetails');
      prefetchOrderDetails(orderId);
    } catch {}
  }, [orderId]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand?.();
  }, [onToggleExpand]);

  return (
    <TableCell className="w-[45px] min-w-[45px] py-3 px-2 align-middle">
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-foreground/70 hover:text-foreground hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-md transition-all"
              onClick={handleClick}
              onMouseEnter={handleMouseEnter}
              aria-label={expanded ? "طي التفاصيل" : "عرض التفاصيل"}
              aria-expanded={expanded}
              aria-controls={expandedDetailsId}
            >
              {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <span>{expanded ? "طي التفاصيل" : "عرض التفاصيل"}</span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </TableCell>
  );
};

export default memo(OrderRowExpand);
