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
    <TableCell className="w-10 py-4 px-2" style={{ contain: 'layout' }}>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-70 hover:opacity-100 text-foreground hover:bg-accent will-change-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-md"
              onClick={handleClick}
              onMouseEnter={handleMouseEnter}
              aria-label={expanded ? "طي التفاصيل" : "عرض التفاصيل"}
              aria-expanded={expanded}
              aria-controls={expandedDetailsId}
              style={{ willChange: 'transform' }}
            >
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
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
