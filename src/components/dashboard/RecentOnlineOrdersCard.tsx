import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  ArrowRight, 
  Globe, 
  Clock, 
  User, 
  Phone, 
  CreditCard, 
  Package,
  Eye,
  Calendar,
  DollarSign,
  TrendingUp,
  MoreHorizontal,
  CheckCircle,
  AlertCircle,
  XCircle,
  RefreshCw,
  Truck,
  MapPin,
  ShoppingCart,
  Monitor
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase-client';

// نوع بيانات الطلب الأونلاين
interface OnlineOrder {
  id: string;
  customer_order_number: number;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  total: number;
  status: string;
  payment_status: string;
  payment_method?: string;
  shipping_cost?: number;
  notes?: string;
  created_at: string;
  items?: OnlineOrderItem[];
  metadata?: any;
}

interface OnlineOrderItem {
  id: string;
  order_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface RecentOnlineOrdersCardProps {
  limit?: number;
}

// تحويل التاريخ إلى صيغة ميلادية
const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString('ar', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    calendar: 'gregory'
  });
};

// تنسيق الوقت
const formatTime = (date: string | Date) => {
  return new Date(date).toLocaleTimeString('ar', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

// تنسيق العملة
const formatCurrency = (amount: number) => {
  return `${amount.toLocaleString('ar-DZ')} د.ج`;
};

// الحصول على لون حالة الطلب
const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'from-emerald-100 to-emerald-50 dark:from-emerald-900/20 dark:to-emerald-800/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-700/30';
    case 'processing':
      return 'from-blue-100 to-blue-50 dark:from-blue-900/20 dark:to-blue-800/10 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-700/30';
    case 'pending':
      return 'from-amber-100 to-amber-50 dark:from-amber-900/20 dark:to-amber-800/10 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-700/30';
    case 'cancelled':
      return 'from-red-100 to-red-50 dark:from-red-900/20 dark:to-red-800/10 text-red-600 dark:text-red-400 border-red-200/50 dark:border-red-700/30';
    case 'refunded':
      return 'from-orange-100 to-orange-50 dark:from-orange-900/20 dark:to-orange-800/10 text-orange-600 dark:text-orange-400 border-orange-200/50 dark:border-orange-700/30';
    default:
      return 'from-slate-100 to-slate-50 dark:from-slate-900/20 dark:to-slate-800/10 text-slate-600 dark:text-slate-400 border-slate-200/50 dark:border-slate-700/30';
  }
};

// الحصول على أيقونة حالة الطلب
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return CheckCircle;
    case 'processing':
      return RefreshCw;
    case 'pending':
      return AlertCircle;
    case 'cancelled':
      return XCircle;
    case 'refunded':
      return RefreshCw;
    default:
      return Package;
  }
};

// الحصول على نص حالة الطلب
const getStatusText = (status: string) => {
  switch (status) {
    case 'completed':
      return 'مكتمل';
    case 'processing':
      return 'قيد المعالجة';
    case 'pending':
      return 'قيد الانتظار';
    case 'cancelled':
      return 'ملغي';
    case 'refunded':
      return 'مسترجع';
    default:
      return 'غير محدد';
  }
};

// الحصول على لون حالة الدفع
const getPaymentStatusColor = (status: string) => {
  switch (status) {
    case 'paid':
      return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    case 'pending':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
    case 'failed':
      return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400';
  }
};

// الحصول على نص حالة الدفع
const getPaymentStatusText = (status: string) => {
  switch (status) {
    case 'paid':
      return 'مدفوع';
    case 'pending':
      return 'قيد الانتظار';
    case 'failed':
      return 'فشل';
    default:
      return 'غير محدد';
  }
};

// مكون مفرد للطلب الأونلاين الواحد
const OnlineOrderItem = React.memo(({ order, index }: { order: OnlineOrder; index: number }) => {
  const StatusIcon = getStatusIcon(order.status);

  return (
    <div 
      className={cn(
        "relative p-5 rounded-2xl transition-all duration-500 group overflow-hidden",
        "bg-gradient-to-br from-background/80 to-background/60 backdrop-blur-sm border border-border/40",
        "hover:shadow-xl hover:shadow-primary/10 hover:scale-[1.02] cursor-pointer",
        "hover:border-primary/30 hover:bg-gradient-to-br hover:from-background/90 hover:to-background/70"
      )}
      style={{
        animationDelay: `${index * 100}ms`
      }}
    >
      {/* التأثير المتدرج في الخلفية */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* شارة الطلب الأونلاين */}
      <div className="absolute top-3 left-3 z-20">
        <div className="flex items-center gap-1.5 bg-gradient-to-r from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/20 px-2.5 py-1 rounded-full border border-blue-200/50 dark:border-blue-700/30">
          <Globe className="h-3 w-3 text-blue-600 dark:text-blue-400" />
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400">أونلاين</span>
        </div>
      </div>
      
      {/* معلومات الطلب الأساسية */}
      <div className="relative z-10 flex items-center justify-between mb-4 mt-2">
        <div className="flex items-center gap-4">
          <div className={cn(
            "relative flex items-center justify-center h-14 w-14 rounded-2xl border-2 transition-all duration-500",
            "group-hover:scale-110 group-hover:rotate-3",
            "bg-gradient-to-br shadow-lg", getStatusColor(order.status)
          )}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl" />
            <StatusIcon className="relative z-10 h-5 w-5" />
          </div>
          
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h4 className="text-base font-bold group-hover:text-primary transition-colors duration-300">
                طلب #{order.customer_order_number}
              </h4>
              <div className={cn(
                "px-3 py-1 rounded-full text-xs font-bold border",
                getPaymentStatusColor(order.payment_status)
              )}>
                {getPaymentStatusText(order.payment_status)}
              </div>
            </div>
            
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-lg">
                <Calendar className="h-3 w-3" />
                <span className="font-medium">{formatDate(order.created_at)}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-lg">
                <Clock className="h-3 w-3" />
                <span className="font-medium">{formatTime(order.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-right space-y-1">
          <div className="text-lg font-bold bg-gradient-to-r from-primary via-primary/90 to-primary/80 bg-clip-text text-transparent">
            {formatCurrency(order.total)}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground justify-end">
            <span className="font-medium">{order.items?.length || 0} منتج</span>
            <ShoppingCart className="h-3 w-3" />
          </div>
        </div>
      </div>

      {/* معلومات العميل وحالة الطلب */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {order.customer_name && (
            <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-xl">
              <User className="h-3.5 w-3.5 text-primary/70" />
              <span className="text-xs font-medium text-muted-foreground">
                {order.customer_name}
              </span>
            </div>
          )}

          {order.customer_phone && (
            <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-xl">
              <Phone className="h-3.5 w-3.5 text-primary/70" />
              <span className="text-xs font-medium text-muted-foreground">
                {order.customer_phone}
              </span>
            </div>
          )}
          
          {order.payment_method && (
            <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-xl">
              <CreditCard className="h-3.5 w-3.5 text-primary/70" />
              <span className="text-xs font-medium text-muted-foreground">
                {order.payment_method === 'cash' ? 'نقداً' : 
                 order.payment_method === 'card' ? 'بطاقة' : 
                 order.payment_method === 'bank_transfer' ? 'تحويل بنكي' : 
                 order.payment_method}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-xl">
            <div className={cn(
              "h-2.5 w-2.5 rounded-full animate-pulse",
              order.status === 'completed' ? 'bg-emerald-500' :
              order.status === 'processing' ? 'bg-blue-500' :
              order.status === 'pending' ? 'bg-amber-500' :
              order.status === 'cancelled' ? 'bg-red-500' :
              order.status === 'refunded' ? 'bg-orange-500' :
              'bg-slate-500'
            )} />
            <span className="text-xs font-medium text-muted-foreground">
              {getStatusText(order.status)}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Link 
              to={`/dashboard/online-orders/${order.id}`}
              className={cn(
                "group/btn p-2.5 rounded-xl bg-gradient-to-br from-blue-500/15 to-blue-500/5 border border-blue-500/25",
                "hover:bg-gradient-to-br hover:from-blue-500/25 hover:to-blue-500/15 hover:border-blue-500/40",
                "text-blue-600 dark:text-blue-400 transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-blue-500/20",
                "relative overflow-hidden"
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
              <Eye className="relative z-10 h-4 w-4" />
            </Link>
            
            <button className={cn(
              "p-2.5 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/30",
              "hover:bg-gradient-to-br hover:from-muted/70 hover:to-muted/50 hover:border-border/50",
              "text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-110"
            )}>
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* شريط الشحن إذا كان متوفراً */}
      {order.shipping_cost && order.shipping_cost > 0 && (
        <div className="relative z-10 mt-4 pt-4 border-t border-border/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 bg-orange-100/50 dark:bg-orange-900/20 px-3 py-1.5 rounded-xl">
              <Truck className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
              <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
                رسوم الشحن
              </span>
            </div>
            <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
              {formatCurrency(order.shipping_cost)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

OnlineOrderItem.displayName = 'OnlineOrderItem';

const RecentOnlineOrdersCard = React.memo(({ limit = 5 }: RecentOnlineOrdersCardProps) => {
  const [orders, setOrders] = React.useState<OnlineOrder[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // جلب الطلبات الأونلاين الحديثة
  React.useEffect(() => {
    const fetchRecentOnlineOrders = async () => {
      try {
        setLoading(true);
        
        // جلب الطلبات الأونلاين مع العناصر
        const { data: ordersData, error: ordersError } = await supabase
          .from('online_orders')
          .select(`
            *,
            items:online_order_items(*)
          `)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (ordersError) {
          throw ordersError;
        }

        setOrders(ordersData || []);
      } catch (err) {
        console.error('خطأ في جلب الطلبات الأونلاين:', err);
        setError('فشل في جلب الطلبات الأونلاين');
      } finally {
        setLoading(false);
      }
    };

    fetchRecentOnlineOrders();
  }, [limit]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">جاري تحميل الطلبات الأونلاين...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      {orders.length === 0 ? (
        <div className={cn(
          "relative flex flex-col items-center justify-center h-full py-12 text-center space-y-6 rounded-2xl overflow-hidden",
          "bg-gradient-to-br from-muted/40 to-muted/20 border border-border/30"
        )}>
          {/* الخلفية المتحركة */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-green-500/5 animate-pulse" />
          
          <div className="relative z-10 flex flex-col items-center space-y-4">
            <div className={cn(
              "relative p-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/10 border border-blue-500/30",
              "shadow-lg backdrop-blur-sm"
            )}>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent rounded-2xl animate-pulse" />
              <Monitor className="relative z-10 h-8 w-8 text-blue-600" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-bold bg-gradient-to-r from-foreground via-foreground/90 to-foreground/80 bg-clip-text text-transparent">
                لا توجد طلبات أونلاين حديثة
              </h3>
              <p className="text-sm text-muted-foreground font-medium max-w-xs">
                ستظهر الطلبات الأونلاين الجديدة هنا بمجرد إنشائها من العملاء عبر المتجر الإلكتروني
              </p>
            </div>
            
            <Button 
              asChild 
              variant="outline" 
              className={cn(
                "mt-6 bg-gradient-to-br from-blue-500/15 to-blue-500/5 border-blue-500/30",
                "hover:bg-gradient-to-br hover:from-blue-500/25 hover:to-blue-500/15 hover:border-blue-500/40",
                "text-blue-600 font-semibold transition-all duration-300 hover:scale-105 hover:shadow-md",
                "relative overflow-hidden group"
              )}
            >
              <Link to="/dashboard/online-orders" className="flex items-center gap-2 relative z-10">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <Monitor className="h-4 w-4" />
                عرض جميع الطلبات الأونلاين
                <TrendingUp className="h-4 w-4 opacity-60" />
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order, index) => (
            <OnlineOrderItem key={order.id} order={order} index={index} />
          ))}
          
          {/* زر عرض جميع الطلبات الأونلاين */}
          <div className="pt-4">
            <Button 
              asChild 
              variant="outline" 
              className={cn(
                "w-full h-12 bg-gradient-to-br from-blue-500/15 to-blue-500/5 border-blue-500/30",
                "hover:bg-gradient-to-br hover:from-blue-500/25 hover:to-blue-500/15 hover:border-blue-500/40",
                "text-blue-600 font-bold transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/20",
                "relative overflow-hidden group"
              )}
            >
              <Link to="/dashboard/online-orders" className="flex items-center justify-center gap-3 relative z-10">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  <span className="text-sm">عرض جميع الطلبات الأونلاين</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="bg-blue-500/20 border border-blue-500/30 px-2.5 py-1 rounded-full">
                    <span className="text-xs font-bold">{orders.length}</span>
                  </div>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                </div>
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});

RecentOnlineOrdersCard.displayName = 'RecentOnlineOrdersCard';

export default RecentOnlineOrdersCard;