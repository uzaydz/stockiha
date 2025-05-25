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
      <Badge variant="outline" className={`text-gray-500 ${className}`}>
        <Package className="w-3 h-3 ml-1" />
        لم يتم الشحن
      </Badge>
    );
  }

  if (hasYalidine) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="default" className={`bg-green-100 text-green-800 border-green-300 hover:bg-green-200 ${className}`}>
              <Truck className="w-3 h-3 ml-1" />
              ياليدين
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">رقم التتبع: {yalidineTrackingId}</p>
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
            <Badge variant="default" className={`bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200 ${className}`}>
              <Truck className="w-3 h-3 ml-1" />
              ZR Express
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">رقم التتبع: {zrexpressTrackingId}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return null;
};

export default ShippingProviderBadge; 