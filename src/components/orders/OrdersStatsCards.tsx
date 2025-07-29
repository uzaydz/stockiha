import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, TrendingUp, Clock, CheckCircle } from "lucide-react";
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
      icon: Package,
      trend: orderStats.salesTrend,
      color: "text-green-600",
    },
    {
      title: "متوسط قيمة الطلب",
      value: orderStats.avgOrderValue,
      icon: TrendingUp,
      color: "text-blue-600",
    },
    {
      title: "الطلبات المعلقة",
      value: orderCounts.pending,
      icon: Clock,
      color: "text-yellow-600",
    },
    {
      title: "الطلبات المكتملة",
      value: orderCounts.delivered,
      icon: CheckCircle,
      color: "text-green-600",
    },
  ];

  return (
    <div className="rounded-xl bg-background/80 border border-border/30 shadow-sm p-5">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-foreground">ملخص الطلبات</h2>
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((card, index) => (
          <Card key={index} className="rounded-xl bg-background/80 border border-border/30 shadow-sm hover:shadow-md transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex flex-col space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center h-5 w-5 bg-primary/10 text-primary rounded-md text-xs font-medium border border-primary/20">
                      {index + 1}
                    </span>
                    <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                  </div>
                  <div className={`flex items-center justify-center h-8 w-8 rounded-lg ${
                    card.color === 'text-green-600' ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 
                    card.color === 'text-blue-600' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' :
                    card.color === 'text-yellow-600' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400' :
                    'bg-primary/10 text-primary'
                  }`}>
                    <card.icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-foreground">
                    {typeof card.value === 'number' && card.title.includes('المبيعات') ? 
                      formatCurrency(card.value) : card.value}
                  </div>
                  {card.trend && card.trend !== 0 && card.title.includes('المبيعات') && (
                    <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs ${
                      card.trend > 0 ? 'bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400' : 
                      'bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400'
                    }`}>
                      <TrendingUp className="h-3 w-3" />
                      <span>{card.trend > 0 ? '+' : ''}{card.trend}%</span>
                    </div>
                  )}
                  {card.title === 'متوسط قيمة الطلب' && (
                    <p className="text-xs text-muted-foreground">
                      لكل طلب
                    </p>
                  )}
                  {card.title === 'الطلبات المعلقة' && (
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(orderStats.pendingAmount)} في الانتظار
                    </p>
                  )}
                  {card.title === 'الطلبات المكتملة' && (
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(orderStats.avgOrderValue)} متوسط القيمة
                    </p>
                  )}
                </div>
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
