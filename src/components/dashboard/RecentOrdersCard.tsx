
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Order } from '@/types';

interface RecentOrdersCardProps {
  orders: Order[];
}

const RecentOrdersCard = ({ orders }: RecentOrdersCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>أحدث الطلبات</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">طلب #{order.id}</p>
                <div className="flex items-center text-sm text-muted-foreground">
                  <div className={`h-2 w-2 rounded-full ${
                    order.status === 'completed' ? 'bg-green-500' :
                    order.status === 'processing' ? 'bg-blue-500' :
                    order.status === 'pending' ? 'bg-yellow-500' :
                    'bg-red-500'
                  } mr-1`} />
                  <span>
                    {order.status === 'completed' ? 'مكتمل' :
                     order.status === 'processing' ? 'قيد المعالجة' :
                     order.status === 'pending' ? 'قيد الانتظار' :
                     'ملغي'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{order.total} ر.س</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString('ar-SA')}
                </p>
              </div>
            </div>
          ))}
          <Button asChild variant="outline" className="w-full">
            <Link to="/dashboard/orders">عرض جميع الطلبات</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentOrdersCard;
