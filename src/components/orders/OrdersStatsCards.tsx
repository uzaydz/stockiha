import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Package, TrendingUp, Clock, CheckCircle, DollarSign } from "lucide-react";
import { formatCurrency } from "@/utils/ordersHelpers";

interface OrderStats {
  totalSales: number;
  avgOrderValue: number;
  salesTrend: number;
  pendingAmount: number;
}

interface OrderCounts {
  pending: number;
  delivered: number;
}

interface OrdersStatsCardsProps {
  orderStats: OrderStats;
  orderCounts: OrderCounts;
}

const OrdersStatsCards = memo(({ orderStats, orderCounts }: OrdersStatsCardsProps) => {
  const statsCards = [
    {
      title: "إجمالي المبيعات",
      value: orderStats.totalSales,
      icon: DollarSign,
      trend: orderStats.salesTrend,
      color: "bg-muted",
      bgColor: "bg-muted",
      textColor: "text-foreground",
    },
    {
      title: "متوسط قيمة الطلب",
      value: orderStats.avgOrderValue,
      icon: TrendingUp,
      color: "bg-muted",
      bgColor: "bg-muted",
      textColor: "text-foreground",
    },
    {
      title: "الطلبات المعلقة",
      value: orderCounts.pending,
      icon: Clock,
      color: "bg-muted",
      bgColor: "bg-muted",
      textColor: "text-foreground",
    },
    {
      title: "الطلبات المكتملة",
      value: orderCounts.delivered,
      icon: CheckCircle,
      color: "bg-muted",
      bgColor: "bg-muted",
      textColor: "text-foreground",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-foreground" />
        <h2 className="text-lg font-medium text-foreground">نظرة عامة</h2>
      </div>
      
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        {statsCards.map((card, index) => (
          <Card key={index} className="border-border">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between mb-2 md:mb-3">
                <div className={`p-1.5 md:p-2 rounded ${card.bgColor}`}>
                  <card.icon className={`h-3.5 md:h-4 w-3.5 md:w-4 ${card.textColor}`} />
                </div>
                {card.trend && card.trend !== 0 && card.title.includes('المبيعات') && (
                  <div className={`inline-flex items-center gap-1 px-1.5 md:px-2 py-0.5 md:py-1 rounded text-[10px] md:text-xs font-medium ${
                    card.trend > 0 ? 'bg-muted text-foreground border border-border' : 
                    'bg-muted text-foreground border border-border'
                  }`}>
                    <TrendingUp className="h-2.5 md:h-3 w-2.5 md:w-3" />
                    <span>{card.trend > 0 ? '+' : ''}{card.trend}%</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-0.5 md:space-y-1">
                <div className="text-xl md:text-2xl font-bold text-foreground">
                  {typeof card.value === 'number' && card.title.includes('المبيعات') ? 
                    formatCurrency(card.value) : card.value}
                </div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground leading-tight">{card.title}</p>
                
                {card.title === 'متوسط قيمة الطلب' && (
                  <p className="text-[10px] md:text-xs text-muted-foreground">لكل طلب</p>
                )}
                {card.title === 'الطلبات المعلقة' && (
                  <p className="text-[10px] md:text-xs text-muted-foreground leading-tight">
                    {formatCurrency(orderStats.pendingAmount)} في الانتظار
                  </p>
                )}
                {card.title === 'الطلبات المكتملة' && (
                  <p className="text-[10px] md:text-xs text-muted-foreground leading-tight">
                    {formatCurrency(orderStats.avgOrderValue)} متوسط القيمة
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
});

OrdersStatsCards.displayName = "OrdersStatsCards";

export default OrdersStatsCards;
