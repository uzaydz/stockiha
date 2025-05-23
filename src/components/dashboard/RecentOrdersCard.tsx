import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Order } from '@/types';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';

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
        <div className={cn(
          "flex flex-col items-center justify-center h-full py-8 text-center space-y-4 rounded-xl",
          "bg-gradient-to-br from-muted/30 to-muted/20 border border-border/20"
        )}>
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
            <ShoppingBag className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-semibold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">لا توجد طلبات حديثة</p>
            <p className="text-sm text-muted-foreground mt-1 font-medium">ستظهر الطلبات الجديدة هنا بمجرد إنشائها</p>
          </div>
          <Button 
            asChild 
            variant="outline" 
            className={cn(
              "mt-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20",
              "hover:bg-gradient-to-br hover:from-primary/20 hover:to-primary/10 hover:border-primary/30",
              "text-primary font-semibold transition-all duration-300"
            )}
          >
            <Link to="/dashboard/orders" className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              إنشاء طلب جديد
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link 
              key={order.id} 
              to={`/dashboard/orders/${order.id}`}
              className={cn(
                "flex items-center gap-3 p-4 rounded-xl transition-all duration-300 group",
                "bg-gradient-to-br from-background/60 to-background/40 backdrop-blur-sm border border-border/30",
                "hover:shadow-md hover:scale-[1.02] cursor-pointer"
              )}
            >
              <div className={cn(
                "flex items-center justify-center h-12 w-12 rounded-xl border transition-all duration-300 group-hover:scale-110",
                order.status === 'completed' ? 'bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/20 dark:to-green-800/10 text-green-600 dark:text-green-400 border-green-200/50 dark:border-green-700/30' :
                order.status === 'processing' ? 'bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/20 dark:to-blue-800/10 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-700/30' :
                order.status === 'pending' ? 'bg-gradient-to-br from-yellow-100 to-yellow-50 dark:from-yellow-900/20 dark:to-yellow-800/10 text-yellow-600 dark:text-yellow-400 border-yellow-200/50 dark:border-yellow-700/30' :
                'bg-gradient-to-br from-red-100 to-red-50 dark:from-red-900/20 dark:to-red-800/10 text-red-600 dark:text-red-400 border-red-200/50 dark:border-red-700/30'
              )}>
                <span className="text-xs font-bold">{order.id}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors duration-300">
                  {`طلب #${order.id}`}
                </p>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <div className={cn(
                    "h-2 w-2 rounded-full ml-1",
                    order.status === 'completed' ? 'bg-green-500' :
                    order.status === 'processing' ? 'bg-blue-500' :
                    order.status === 'pending' ? 'bg-yellow-500' :
                    'bg-red-500'
                  )} />
                  <span className="font-medium">
                    {order.status === 'completed' ? 'مكتمل' :
                     order.status === 'processing' ? 'قيد المعالجة' :
                     order.status === 'pending' ? 'قيد الانتظار' :
                     'ملغي'}
                  </span>
                </div>
              </div>
              <div className="text-left">
                <p className="text-sm font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">{order.total} د.ج</p>
                <p className="text-xs text-muted-foreground mt-1 whitespace-nowrap font-medium">
                  {formatDate(order.createdAt)}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:text-primary group-hover:translate-x-1" />
            </Link>
          ))}
          <Button 
            asChild 
            variant="outline" 
            className={cn(
              "w-full mt-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20",
              "hover:bg-gradient-to-br hover:from-primary/20 hover:to-primary/10 hover:border-primary/30",
              "text-primary font-semibold transition-all duration-300"
            )}
          >
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
