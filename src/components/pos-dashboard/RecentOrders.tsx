import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  User, 
  ShoppingCart, 
  DollarSign,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { RecentOrder } from '@/services/posDashboardService';

interface RecentOrdersProps {
  orders: RecentOrder[];
}

const RecentOrders: React.FC<RecentOrdersProps> = ({ orders }) => {
  // استخدام البيانات الممررة أو بيانات فارغة
  const recentOrders = orders || [];

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          icon: CheckCircle,
          text: 'مكتمل',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      case 'pending':
        return {
          icon: Clock,
          text: 'في الانتظار',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200'
        };
      case 'processing':
        return {
          icon: AlertCircle,
          text: 'قيد المعالجة',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
      case 'cancelled':
        return {
          icon: XCircle,
          text: 'ملغي',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      default:
        return {
          icon: Clock,
          text: 'غير محدد',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-blue-600" />
            الطلبات الأخيرة
          </CardTitle>
          <Button variant="outline" size="sm" className="gap-2">
            <Eye className="h-4 w-4" />
            عرض الكل
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentOrders.map((order) => {
            const statusInfo = getStatusInfo(order.status);
            const StatusIcon = statusInfo.icon;
            
            return (
              <div key={order.id} className="flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="text-lg">🛒</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm text-gray-900 dark:text-white">
                        #{order.order_number}
                      </h4>
                      <Badge 
                        variant="outline"
                        className={`${statusInfo.color} ${statusInfo.bgColor} ${statusInfo.borderColor} border`}
                      >
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusInfo.text}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                        <User className="h-3 w-3" />
                        {order.customer_name}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                        <ShoppingCart className="h-3 w-3" />
                        {order.items_count} منتج
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                        <DollarSign className="h-3 w-3" />
                        {order.total.toLocaleString()} دج
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: ar })}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{order.payment_method}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* إحصائيات سريعة */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {recentOrders.filter(o => o.status === 'completed').length}
              </div>
              <div className="text-xs text-gray-600">مكتمل</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-yellow-600">
                {recentOrders.filter(o => o.status === 'pending').length}
              </div>
              <div className="text-xs text-gray-600">في الانتظار</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {recentOrders.filter(o => o.status === 'processing').length}
              </div>
              <div className="text-xs text-gray-600">قيد المعالجة</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-600">
                {recentOrders.filter(o => o.status === 'cancelled').length}
              </div>
              <div className="text-xs text-gray-600">ملغي</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentOrders;
