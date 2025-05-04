import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Order } from '@/types';
import { ArrowRight, ShoppingBag } from 'lucide-react';

interface RecentOrdersCardProps {
  orders: Order[];
}

const RecentOrdersCard = ({ orders }: RecentOrdersCardProps) => {
  // تحويل التاريخ إلى صيغة ميلادية
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('ar', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      calendar: 'gregory'
    });
  };

  return (
    <div className="h-full">
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full py-8 text-center space-y-4">
          <div className="bg-primary/10 p-3 rounded-full">
            <ShoppingBag className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-medium">لا توجد طلبات حديثة</p>
            <p className="text-sm text-muted-foreground mt-1">ستظهر الطلبات الجديدة هنا بمجرد إنشائها</p>
          </div>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/dashboard/orders">إنشاء طلب جديد</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link 
              key={order.id} 
              to={`/dashboard/orders/${order.id}`}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group border border-border"
            >
              <div className={`flex items-center justify-center h-10 w-10 rounded-md ${
                order.status === 'completed' ? 'bg-green-100 text-green-600' :
                order.status === 'processing' ? 'bg-blue-100 text-blue-600' :
                order.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                'bg-red-100 text-red-600'
              }`}>
                <span className="text-xs font-bold">{order.id}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {`طلب #${order.id}`}
                </p>
                <div className="flex items-center text-xs text-muted-foreground mt-0.5">
                  <div className={`h-2 w-2 rounded-full ${
                    order.status === 'completed' ? 'bg-green-500' :
                    order.status === 'processing' ? 'bg-blue-500' :
                    order.status === 'pending' ? 'bg-yellow-500' :
                    'bg-red-500'
                  } ml-1`} />
                  <span>
                    {order.status === 'completed' ? 'مكتمل' :
                     order.status === 'processing' ? 'قيد المعالجة' :
                     order.status === 'pending' ? 'قيد الانتظار' :
                     'ملغي'}
                  </span>
                </div>
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">{order.total} د.ج</p>
                <p className="text-xs text-muted-foreground mt-0.5 whitespace-nowrap">
                  {formatDate(order.createdAt)}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </Link>
          ))}
          <Button asChild variant="outline" className="w-full">
            <Link to="/dashboard/orders" className="flex items-center justify-center gap-2">
              عرض جميع الطلبات
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
};

export default RecentOrdersCard;
