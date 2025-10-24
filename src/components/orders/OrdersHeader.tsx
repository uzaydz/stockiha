import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface OrdersHeaderProps {
  ordersCount: number;
  onRefresh: () => void;
}

const OrdersHeader = memo(({ 
  ordersCount, 
  onRefresh 
}: OrdersHeaderProps) => {
  const { toast } = useToast();

  const handleRefresh = () => {
    onRefresh();
    toast({
      title: "تم تحديث البيانات",
      description: "تم تحديث الجدول بنجاح",
    });
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 md:mb-6">
      <div className="flex items-center gap-2 md:gap-3 flex-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 md:p-2 bg-primary/10 rounded-lg">
            <Package className="h-4 md:h-5 w-4 md:w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg md:text-2xl font-semibold text-foreground">إدارة الطلبات</h1>
            <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">تتبع وإدارة جميع الطلبات</p>
          </div>
        </div>
        <Badge variant="secondary" className="text-[10px] md:text-xs font-medium px-2 md:px-2.5 py-0.5 md:py-1">
          {ordersCount.toLocaleString()} طلب
        </Badge>
      </div>
      
      <Button
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        className="gap-1.5 md:gap-2 h-9 md:h-9 px-3 text-xs md:text-sm font-medium hover:bg-primary/5 hover:border-primary/20 transition-colors w-full sm:w-auto"
      >
        <RefreshCw className="h-3.5 md:h-4 w-3.5 md:w-4" />
        تحديث
      </Button>
    </div>
  );
});

OrdersHeader.displayName = "OrdersHeader";

export default OrdersHeader;
