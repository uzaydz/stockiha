import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Truck, Package } from "lucide-react";

export interface ShippingProviderBadgeProps {
  yalidineTrackingId?: string | null;
  zrexpressTrackingId?: string | null;
  className?: string;
}

const ShippingProviderBadge = ({ 
  yalidineTrackingId, 
  zrexpressTrackingId, 
  className = "" 
}: ShippingProviderBadgeProps) => {
  // تحديد مزود الشحن النشط
  const hasYalidine = yalidineTrackingId && yalidineTrackingId.trim() !== '';
  const hasZRExpress = zrexpressTrackingId && zrexpressTrackingId.trim() !== '';

  if (!hasYalidine && !hasZRExpress) {
    return (
      <Badge variant="outline" className={`text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/30 ${className}`}>
        <Package className="w-3 h-3 ml-1" />
        <span className="text-foreground dark:text-zinc-200">لم يتم الشحن</span>
      </Badge>
    );
  }

  if (hasYalidine) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="default" className={`bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-300 dark:border-green-700/30 hover:bg-green-200 dark:hover:bg-green-900/50 ${className}`}>
              <Truck className="w-3 h-3 ml-1" />
              <span>ياليدين</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="bg-background dark:bg-zinc-800 border-border dark:border-zinc-700">
            <p className="text-xs text-foreground dark:text-zinc-200">رقم التتبع: {yalidineTrackingId}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (hasZRExpress) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="default" className={`bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-300 dark:border-blue-700/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 ${className}`}>
              <Truck className="w-3 h-3 ml-1" />
              <span>ZR Express</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="bg-background dark:bg-zinc-800 border-border dark:border-zinc-700">
            <p className="text-xs text-foreground dark:text-zinc-200">رقم التتبع: {zrexpressTrackingId}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return null;
};

export default ShippingProviderBadge;
