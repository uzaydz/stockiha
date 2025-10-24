import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { ShoppingCart, Store, TrendingUp, Package } from 'lucide-react';
import { formatCurrency, calculateProfitMargin } from './utils';
import type { FinancialData } from './types';

interface SalesSectionProps {
  data: FinancialData | undefined;
  isLoading?: boolean;
}

const SalesSection = React.memo<SalesSectionProps>(({ data, isLoading = false }) => {
  // حساب إجماليات المبيعات
  const totalSalesRevenue = (data?.pos_sales_revenue || 0) + (data?.online_sales_revenue || 0);
  const totalSalesProfit = (data?.pos_sales_profit || 0) + (data?.online_sales_profit || 0);
  const totalOrdersCount = (data?.pos_orders_count || 0) + (data?.online_orders_count || 0);

  // بيانات المبيعات
  const salesData = [
    {
      title: 'نقطة البيع (POS)',
      icon: ShoppingCart,
      revenue: data?.pos_sales_revenue || 0,
      cost: data?.pos_sales_cost || 0,
      profit: data?.pos_sales_profit || 0,
      orders: data?.pos_orders_count || 0
    },
    {
      title: 'المتجر الإلكتروني',
      icon: Store,
      revenue: data?.online_sales_revenue || 0,
      cost: data?.online_sales_cost || 0,
      profit: data?.online_sales_profit || 0,
      orders: data?.online_orders_count || 0
    }
  ];

  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[1, 2].map((index) => (
        <Card key={index}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted animate-pulse rounded-lg"></div>
              <div className="space-y-2">
                <div className="h-5 bg-muted animate-pulse rounded w-32"></div>
                <div className="h-4 bg-muted animate-pulse rounded w-24"></div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="flex justify-between">
                <div className="h-4 bg-muted animate-pulse rounded w-20"></div>
                <div className="h-4 bg-muted animate-pulse rounded w-24"></div>
              </div>
            ))}
            <div className="h-2 bg-muted animate-pulse rounded w-full"></div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* إحصائيات المبيعات الإجمالية */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            إجماليات المبيعات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(totalSalesRevenue)}
              </div>
              <p className="text-sm text-muted-foreground">إجمالي الإيرادات</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(totalSalesProfit)}
              </div>
              <p className="text-sm text-muted-foreground">إجمالي الأرباح</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {totalOrdersCount.toLocaleString('ar-DZ')}
              </div>
              <p className="text-sm text-muted-foreground">إجمالي الطلبات</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {totalSalesRevenue > 0 ? calculateProfitMargin(totalSalesRevenue, totalSalesRevenue - totalSalesProfit).toFixed(1) : '0'}%
              </div>
              <p className="text-sm text-muted-foreground">هامش الربح</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* تفاصيل المبيعات */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {salesData.map((sale, index) => {
          const profitMargin = sale.revenue > 0 ? calculateProfitMargin(sale.revenue, sale.cost) : 0;
          const IconComponent = sale.icon;
          
          return (
            <Card key={sale.title} className="overflow-hidden hover:shadow-md transition-all">
              <CardHeader className="bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <IconComponent className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{sale.title}</CardTitle>
                    <CardDescription>
                      {sale.orders.toLocaleString('ar-DZ')} {sale.orders === 1 ? 'طلب' : 'طلب'} مكتمل
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
                
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">الإيرادات:</span>
                    <span className="font-semibold text-primary">
                      {formatCurrency(sale.revenue)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">التكلفة:</span>
                    <span className="font-semibold text-muted-foreground">
                      {formatCurrency(sale.cost)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center border-t pt-3">
                    <span className="font-medium">الربح الصافي:</span>
                    <span className="font-bold text-lg text-primary">
                      {formatCurrency(sale.profit)}
                    </span>
                  </div>
                </div>
                
                {/* شريط تقدم هامش الربح */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">هامش الربح</span>
                    <span className="font-medium">{profitMargin.toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={Math.min(profitMargin, 100)} 
                    className="h-2"
                  />
                </div>
                
                {/* متوسط قيمة الطلب */}
                {sale.orders > 0 && (
                  <div className="flex justify-between items-center bg-muted/30 p-3 rounded-lg">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      متوسط قيمة الطلب:
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(sale.revenue / sale.orders)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
});

SalesSection.displayName = 'SalesSection';

export default SalesSection;
