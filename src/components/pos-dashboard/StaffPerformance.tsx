import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  TrendingUp, 
  Clock, 
  DollarSign,
  Award,
  Activity,
  Eye,
  ChevronRight
} from 'lucide-react';

interface StaffMember {
  id: string;
  name: string;
  total_sales: number;
  total_orders: number;
  avg_order_value: number;
  hours_worked: number;
  status: 'active' | 'paused' | 'closed';
  session_started_at?: string;
}

interface StaffPerformanceProps {
  staffData: StaffMember[];
  isLoading?: boolean;
}

const StaffPerformance: React.FC<StaffPerformanceProps> = ({ staffData, isLoading = false }) => {
  // حساب الإحصائيات
  const stats = useMemo(() => {
    if (!staffData || staffData.length === 0) {
      return {
        totalStaff: 0,
        activeStaff: 0,
        totalSales: 0,
        totalOrders: 0,
        topPerformer: null
      };
    }

    const activeStaff = staffData.filter(s => s.status === 'active').length;
    const totalSales = staffData.reduce((sum, s) => sum + s.total_sales, 0);
    const totalOrders = staffData.reduce((sum, s) => sum + s.total_orders, 0);
    const topPerformer = [...staffData].sort((a, b) => b.total_sales - a.total_sales)[0];

    return {
      totalStaff: staffData.length,
      activeStaff,
      totalSales,
      totalOrders,
      topPerformer
    };
  }, [staffData]);

  // ترتيب الموظفين حسب الأداء
  const sortedStaff = useMemo(() => {
    if (!staffData) return [];
    return [...staffData].sort((a, b) => b.total_sales - a.total_sales);
  }, [staffData]);

  // الحصول على لون الحالة
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'paused':
        return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'closed':
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'نشط';
      case 'paused':
        return 'متوقف';
      case 'closed':
        return 'مغلق';
      default:
        return 'غير معروف';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            أداء الموظفين
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!staffData || staffData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            أداء الموظفين
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>لا توجد بيانات موظفين</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            أداء الموظفين
          </CardTitle>
          <Button variant="outline" size="sm" className="gap-2">
            <Eye className="h-4 w-4" />
            عرض التفاصيل
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* الإحصائيات السريعة */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">إجمالي الموظفين</span>
            </div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.totalStaff}</div>
          </div>

          <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-100 dark:border-green-900">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-green-600" />
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">نشط الآن</span>
            </div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.activeStaff}</div>
          </div>

          <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-100 dark:border-purple-900">
            <div className="flex items-center justify-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-purple-600" />
              <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">إجمالي المبيعات</span>
            </div>
            <div className="text-lg font-bold text-purple-700 dark:text-purple-300">
              {stats.totalSales.toLocaleString()}
            </div>
          </div>

          <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-100 dark:border-orange-900">
            <div className="flex items-center justify-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">إجمالي الطلبات</span>
            </div>
            <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">{stats.totalOrders}</div>
          </div>
        </div>

        {/* أفضل موظف */}
        {stats.topPerformer && (
          <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 rounded-lg border border-yellow-200 dark:border-yellow-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500 rounded-lg">
                  <Award className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400">أفضل موظف اليوم</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">{stats.topPerformer.name}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                  {stats.topPerformer.total_sales.toLocaleString()}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">دج</div>
              </div>
            </div>
          </div>
        )}

        {/* قائمة الموظفين */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">تفاصيل الأداء</h3>
            <Badge variant="secondary" className="text-xs">
              {sortedStaff.length} موظف
            </Badge>
          </div>

          <div className="space-y-2">
            {sortedStaff.map((staff, index) => (
              <div
                key={staff.id}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors border border-gray-100 dark:border-gray-800"
              >
                {/* الترتيب */}
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 font-bold text-sm text-gray-700 dark:text-gray-300">
                  {index + 1}
                </div>

                {/* معلومات الموظف */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                      {staff.name}
                    </h4>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getStatusColor(staff.status)}`}
                    >
                      {getStatusText(staff.status)}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      <span>{staff.total_sales.toLocaleString()} دج</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      <span>{staff.total_orders} طلب</span>
                    </div>
                    {staff.hours_worked > 0 && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{staff.hours_worked.toFixed(1)} ساعة</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* متوسط قيمة الطلب */}
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                    {staff.avg_order_value.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">متوسط الطلب</div>
                </div>

                {/* زر التفاصيل */}
                <Button variant="ghost" size="sm" className="flex-shrink-0 h-8 w-8 p-0">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* مقارنة الأداء */}
        {sortedStaff.length > 1 && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">مقارنة الأداء</h3>
            <div className="space-y-2">
              {sortedStaff.slice(0, 3).map((staff) => {
                const percentage = stats.totalSales > 0 
                  ? (staff.total_sales / stats.totalSales) * 100 
                  : 0;
                
                return (
                  <div key={staff.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">{staff.name}</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StaffPerformance;
