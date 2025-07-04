import { Button } from "@/components/ui/button";
import { Cloud, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SyncProductsProps {
  count: number;
  onSync: () => Promise<void>;
  isSyncing: boolean;
}

/**
 * مكون لعرض زر مزامنة المنتجات مع الخادم
 */
const SyncProducts = ({ count, onSync, isSyncing }: SyncProductsProps) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button 
          variant="outline"
          className="relative"
          onClick={onSync}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Cloud className="h-4 w-4" />
          )}
          <span className="ml-2">مزامنة المنتجات</span>
          
          {/* عداد المنتجات غير المتزامنة */}
          {count > 0 && !isSyncing && (
            <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
              {count}
            </span>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{count} منتج غير متزامن</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default SyncProducts;
