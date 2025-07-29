import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
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
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">الطلبات</h1>
        <Badge variant="outline" className="text-sm">
          {ordersCount.toLocaleString()} طلب محمل
        </Badge>
      </div>
      
      {/* أزرار التحكم */}
      <div className="flex items-center gap-3">
        {/* زر تحديث الجدول */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          تحديث
        </Button>
      </div>
    </div>
  );
});

OrdersHeader.displayName = "OrdersHeader";

export default OrdersHeader; 