import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { DailySale } from '@/services/posDashboardService';

interface SalesChartProps {
  dailySales: DailySale[];
}

const SalesChart: React.FC<SalesChartProps> = ({ dailySales }) => {
  // تحويل البيانات للصيغة المطلوبة
  const chartData = useMemo(() => {
    if (!dailySales || !Array.isArray(dailySales) || dailySales.length === 0) {
      return [];
    }
    
    return dailySales.map(day => ({
      day: format(new Date(day.date), 'EEEE', { locale: ar }),
      sales: day.sales || 0,
      orders: day.orders || 0
    }));
  }, [dailySales]);

  const maxSales = chartData.length > 0 ? Math.max(...chartData.map(d => d.sales), 1) : 1;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            المبيعات الأسبوعية
          </CardTitle>
          <Badge variant="secondary" className="bg-green-50 text-green-700">
            +12.5% هذا الأسبوع
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>لا توجد بيانات مبيعات</p>
          </div>
        ) : (
        <div className="space-y-4">
          {/* إحصائيات سريعة */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {chartData.reduce((sum, day) => sum + day.sales, 0).toLocaleString()}
              </div>
              <div className="text-sm text-blue-600">إجمالي المبيعات</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {chartData.reduce((sum, day) => sum + day.orders, 0)}
              </div>
              <div className="text-sm text-green-600">إجمالي الطلبات</div>
            </div>
          </div>

          {/* الرسم البياني البسيط */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>المبيعات اليومية</span>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>آخر 7 أيام</span>
              </div>
            </div>
            
            <div className="flex items-end justify-between h-32 gap-1">
              {chartData.map((data, index) => (
                <div key={index} className="flex flex-col items-center flex-1">
                  <div className="w-full bg-gray-100 rounded-t-lg relative">
                    <div 
                      className="bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg transition-all duration-500"
                      style={{ 
                        height: `${(data.sales / maxSales) * 100}%`,
                        minHeight: '4px'
                      }}
                    />
                  </div>
                  <div className="text-xs text-gray-600 mt-2 text-center">
                    {data.day}
                  </div>
                  <div className="text-xs font-medium text-gray-900">
                    {data.sales.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* أفضل يوم */}
          <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">أفضل يوم مبيعات</span>
            </div>
            <div className="text-right">
              <div className="font-bold text-yellow-900">
                {Math.max(...chartData.map(d => d.sales)).toLocaleString()} دج
              </div>
              <div className="text-xs text-yellow-700">
                {chartData.find(d => d.sales === Math.max(...chartData.map(d => d.sales)))?.day}
              </div>
            </div>
          </div>
        </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SalesChart;
