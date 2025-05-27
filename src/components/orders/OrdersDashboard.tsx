import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ShoppingBag, 
  Clock, 
  Package, 
  Truck, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  CreditCard
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

type OrderCounts = {
  all: number;
  pending: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
};

type OrdersDashboardProps = {
  orderCounts: OrderCounts;
  orderStats: {
    totalSales: number;
    avgOrderValue: number;
    salesTrend: number;
    pendingAmount: number;
  };
};

const OrdersDashboard = ({ orderCounts, orderStats }: OrdersDashboardProps) => {
  // مكون لعرض بطاقة إحصائية
  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    description = "", 
    trend = 0,
    isCurrency = false,
    badgeText = "",
    badgeVariant = "default"
  }) => {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <div className="bg-primary/10 p-2 rounded-full">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {isCurrency ? formatPrice(value) : value}
            {badgeText && (
              <Badge variant={badgeVariant} className="text-xs mr-2 py-0">
                {badgeText}
              </Badge>
            )}
          </div>
          {(description || trend !== 0) && (
            <p className="text-xs text-muted-foreground mt-1.5 flex items-center">
              {trend !== 0 && (
                <>
                  {trend > 0 ? (
                    <TrendingUp className="h-3 w-3 ml-1 text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 ml-1 text-red-500" />
                  )}
                  <span className={trend > 0 ? "text-emerald-500" : "text-red-500"}>
                    {Math.abs(trend)}% 
                  </span>
                  <span className="mx-1 text-muted-foreground">
                    مقارنة بالفترة السابقة
                  </span>
                </>
              )}
              {description && <span>{description}</span>}
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="إجمالي المبيعات"
        value={orderStats.totalSales}
        icon={ShoppingBag}
        trend={orderStats.salesTrend}
        isCurrency={true}
      />
      
      <StatCard
        title="متوسط قيمة الطلب"
        value={orderStats.avgOrderValue}
        icon={CreditCard}
        isCurrency={true}
      />
      
      <StatCard
        title="طلبات قيد الانتظار"
        value={orderCounts.pending}
        icon={Clock}
        badgeText={formatPrice(orderStats.pendingAmount)}
        badgeVariant="outline"
      />
      
      <StatCard
        title="إجمالي الطلبات"
        value={orderCounts.all}
        icon={Package}
        description="إجمالي عدد الطلبات"
      />
      
      <StatCard
        title="قيد المعالجة"
        value={orderCounts.processing}
        icon={Package}
        badgeVariant="secondary"
      />
      
      <StatCard
        title="تم الشحن"
        value={orderCounts.shipped}
        icon={Truck}
        badgeVariant="secondary"
      />
      
      <StatCard
        title="تم التسليم"
        value={orderCounts.delivered}
        icon={CheckCircle}
        badgeVariant="secondary"
      />
      
      <StatCard
        title="ملغاة"
        value={orderCounts.cancelled}
        icon={AlertTriangle}
        badgeVariant="secondary"
      />
    </div>
  );
};

export default OrdersDashboard;
