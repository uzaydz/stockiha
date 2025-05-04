import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface OrderStats {
  pending: number;
  processing: number;
  completed: number;
  total: number;
}

interface OrderStatusCardProps {
  stats: OrderStats;
}

const OrderStatusCard = ({ stats }: OrderStatusCardProps) => {
  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle className="text-right">حالة الطلبات</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-2 w-2 rounded-full bg-yellow-500 ml-1" />
                <div className="text-sm font-medium">قيد الانتظار</div>
              </div>
              <div className="text-sm font-medium">{stats.pending}</div>
            </div>
            <Progress 
              value={(stats.pending / stats.total) * 100} 
              className="h-2 bg-muted"
            />
            <div className="h-1 w-1 bg-yellow-500 hidden"></div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-2 w-2 rounded-full bg-blue-500 ml-1" />
                <div className="text-sm font-medium">قيد المعالجة</div>
              </div>
              <div className="text-sm font-medium">{stats.processing}</div>
            </div>
            <Progress 
              value={(stats.processing / stats.total) * 100} 
              className="h-2 bg-muted"
            />
            <div className="h-1 w-1 bg-blue-500 hidden"></div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-2 w-2 rounded-full bg-green-500 ml-1" />
                <div className="text-sm font-medium">مكتملة</div>
              </div>
              <div className="text-sm font-medium">{stats.completed}</div>
            </div>
            <Progress 
              value={(stats.completed / stats.total) * 100} 
              className="h-2 bg-muted"
            />
            <div className="h-1 w-1 bg-green-500 hidden"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderStatusCard;
