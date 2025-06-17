import React, { memo } from 'react';
import { CustomerStats } from '@/types/customer';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Users, UserPlus, UserCheck } from 'lucide-react';

interface CustomerMetricsProps {
  stats: CustomerStats;
}

const CustomerMetrics = memo(({ stats }: CustomerMetricsProps) => {
  // Asegurar que los porcentajes tengan sentido 
  const calculatePercentage = (value: number, total: number) => {
    if (total <= 0) return 0;
    
    // Si el valor es mayor que el total, limitamos a 100%
    const percentage = Math.min(Math.round((value / total) * 100), 100);
    return percentage;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
      <Card className="">
        <CardContent className="pt-4 sm:pt-6 p-3 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <CardDescription className="text-sm sm:text-md truncate">إجمالي العملاء</CardDescription>
              <CardTitle className="text-xl sm:text-2xl lg:text-3xl mt-1 sm:mt-2 font-bold">{stats.total}</CardTitle>
            </div>
            <div className="p-2 sm:p-3 lg:p-4 bg-primary/10 text-primary rounded-full flex-shrink-0">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-4 sm:pt-6 p-3 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <CardDescription className="text-xs sm:text-sm lg:text-md truncate">
                <span className="hidden sm:inline">عملاء جدد (آخر 30 يوم)</span>
                <span className="sm:hidden">عملاء جدد</span>
              </CardDescription>
              <CardTitle className="text-xl sm:text-2xl lg:text-3xl mt-1 sm:mt-2 font-bold">{stats.newLast30Days}</CardTitle>
              <div className="text-xs text-muted-foreground mt-1 truncate">
                {`${calculatePercentage(stats.newLast30Days, stats.total)}% من الإجمالي`}
              </div>
            </div>
            <div className="p-2 sm:p-3 lg:p-4 bg-green-100 text-green-600 rounded-full flex-shrink-0">
              <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="sm:col-span-2 lg:col-span-1">
        <CardContent className="pt-4 sm:pt-6 p-3 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <CardDescription className="text-xs sm:text-sm lg:text-md truncate">
                <span className="hidden sm:inline">عملاء نشطين (آخر 30 يوم)</span>
                <span className="sm:hidden">نشطين</span>
              </CardDescription>
              <CardTitle className="text-xl sm:text-2xl lg:text-3xl mt-1 sm:mt-2 font-bold">{stats.activeLast30Days}</CardTitle>
              <div className="text-xs text-muted-foreground mt-1 truncate">
                {`${calculatePercentage(stats.activeLast30Days, stats.total)}% من الإجمالي`}
              </div>
            </div>
            <div className="p-2 sm:p-3 lg:p-4 bg-blue-100 text-blue-600 rounded-full flex-shrink-0">
              <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

CustomerMetrics.displayName = 'CustomerMetrics';

export default CustomerMetrics;
