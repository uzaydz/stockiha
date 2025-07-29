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
      orders: data?.pos_orders_count || 0,
      color: 'from-blue-500 to-indigo-600',
      bgColor: 'from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20'
    },
    {
      title: 'المتجر الإلكتروني',
      icon: Store,
      revenue: data?.online_sales_revenue || 0,
      cost: data?.online_sales_cost || 0,
      profit: data?.online_sales_profit || 0,
      orders: data?.online_orders_count || 0,
      color: 'from-green-500 to-emerald-600',
      bgColor: 'from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20'
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
              <TrendingUp className="h-5 w-5" />
              إجماليات المبيعات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {formatCurrency(totalSalesRevenue)}
                </div>
                <p className="text-sm text-muted-foreground">إجمالي الإيرادات</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(totalSalesProfit)}
                </div>
                <p className="text-sm text-muted-foreground">إجمالي الأرباح</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {totalOrdersCount.toLocaleString('ar-DZ')}
                </div>
                <p className="text-sm text-muted-foreground">إجمالي الطلبات</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {totalSalesRevenue > 0 ? calculateProfitMargin(totalSalesRevenue, totalSalesRevenue - totalSalesProfit).toFixed(1) : '0'}%
                </div>
                <p className="text-sm text-muted-foreground">هامش الربح</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* تفاصيل المبيعات */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {salesData.map((sale, index) => {
          const profitMargin = sale.revenue > 0 ? calculateProfitMargin(sale.revenue, sale.cost) : 0;
          const IconComponent = sale.icon;
          
          return (
            <motion.div
              key={sale.title}
              initial={{ opacity: 0, x: index === 0 ? -50 : 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 group">
                <CardHeader className={`bg-gradient-to-r ${sale.bgColor}`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg bg-gradient-to-r ${sale.color} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <IconComponent className="h-6 w-6" />
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
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(sale.revenue)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">التكلفة:</span>
                      <span className="font-semibold text-red-600 dark:text-red-400">
                        {formatCurrency(sale.cost)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center border-t pt-3">
                      <span className="font-medium">الربح الصافي:</span>
                      <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
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
                    <div className="flex justify-between items-center bg-muted/50 p-3 rounded-lg">
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
            </motion.div>
          );
        })}
      </div>
    </div>
  );
});

SalesSection.displayName = 'SalesSection';

export default SalesSection;
