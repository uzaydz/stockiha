import React from 'react';
import { CustomerStats } from '@/types/customer';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Users, UserPlus, UserCheck } from 'lucide-react';

interface CustomerMetricsProps {
  stats: CustomerStats;
}

const CustomerMetrics = ({ stats }: CustomerMetricsProps) => {
  // Asegurar que los porcentajes tengan sentido 
  const calculatePercentage = (value: number, total: number) => {
    if (total <= 0) return 0;
    
    // Si el valor es mayor que el total, limitamos a 100%
    const percentage = Math.min(Math.round((value / total) * 100), 100);
    return percentage;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <CardDescription className="text-md">إجمالي العملاء</CardDescription>
              <CardTitle className="text-3xl mt-2">{stats.total}</CardTitle>
            </div>
            <div className="p-4 bg-primary/10 text-primary rounded-full">
              <Users className="h-6 w-6" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <CardDescription className="text-md">عملاء جدد (آخر 30 يوم)</CardDescription>
              <CardTitle className="text-3xl mt-2">{stats.newLast30Days}</CardTitle>
              <div className="text-xs text-muted-foreground mt-1">
                {`${calculatePercentage(stats.newLast30Days, stats.total)}% من إجمالي العملاء`}
              </div>
            </div>
            <div className="p-4 bg-green-100 text-green-600 rounded-full">
              <UserPlus className="h-6 w-6" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <CardDescription className="text-md">عملاء نشطين (آخر 30 يوم)</CardDescription>
              <CardTitle className="text-3xl mt-2">{stats.activeLast30Days}</CardTitle>
              <div className="text-xs text-muted-foreground mt-1">
                {`${calculatePercentage(stats.activeLast30Days, stats.total)}% من إجمالي العملاء`}
              </div>
            </div>
            <div className="p-4 bg-blue-100 text-blue-600 rounded-full">
              <UserCheck className="h-6 w-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerMetrics;
