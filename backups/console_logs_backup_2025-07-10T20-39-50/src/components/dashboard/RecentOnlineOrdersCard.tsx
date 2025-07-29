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
import { useTenant } from '@/context/TenantContext';

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
  organization_id: string;
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

// مكون مفرد للطلب الأونلاين الواحد - تصميم محسن وأكثر بساطة
const OnlineOrderItem = React.memo(({ order, index }: { order: OnlineOrder; index: number }) => {
  const StatusIcon = getStatusIcon(order.status);

  return (
    <div 
      className={cn(
        "relative p-4 rounded-xl transition-all duration-300 group",
        "bg-background/80 border border-border/30 shadow-sm",
        "hover:shadow-md hover:scale-[1.01] cursor-pointer",
        "hover:border-primary/20"
      )}
      style={{
        animationDelay: `${index * 100}ms`
      }}
    >
      <div className="flex items-start justify-between gap-3">
        {/* القسم الأيسر - معلومات الطلب الأساسية */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* أيقونة حالة الطلب */}
          <div className={cn(
            "flex items-center justify-center h-10 w-10 rounded-lg shrink-0",
            "bg-gradient-to-br shadow-sm", getStatusColor(order.status)
          )}>
            <StatusIcon className="h-4 w-4" />
          </div>
          
          {/* معلومات الطلب */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {/* رقم الطلب */}
              <h4 className="text-sm font-bold group-hover:text-primary transition-colors duration-300">
                طلب #{order.customer_order_number}
              </h4>
              
              {/* شارة الطلب الأونلاين */}
              <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded-md border border-blue-200/50 dark:border-blue-700/30">
                <Globe className="h-2.5 w-2.5 text-blue-600 dark:text-blue-400" />
                <span className="text-xs text-blue-600 dark:text-blue-400">أونلاين</span>
              </div>
              
              {/* حالة الدفع */}
              <div className={cn(
                "px-2 py-0.5 rounded-md text-xs font-medium",
                getPaymentStatusColor(order.payment_status)
              )}>
                {getPaymentStatusText(order.payment_status)}
              </div>
            </div>
            
            {/* التاريخ والوقت */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(order.created_at)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatTime(order.created_at)}</span>
              </div>
            </div>

            {/* معلومات العميل */}
            <div className="flex flex-wrap gap-2 text-xs">
              {order.customer_name && (
                <div className="flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded-md">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground line-clamp-1">{order.customer_name}</span>
                </div>
              )}

              {order.customer_phone && (
                <div className="flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded-md">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground line-clamp-1">{order.customer_phone}</span>
                </div>
              )}
              
              {order.payment_method && (
                <div className="flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded-md">
                  <CreditCard className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {order.payment_method === 'cash' ? 'نقداً' : 
                     order.payment_method === 'card' ? 'بطاقة' : 
                     order.payment_method === 'bank_transfer' ? 'تحويل بنكي' : 
                     order.payment_method}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* القسم الأيمن - المبلغ وحالة الطلب */}
        <div className="text-right flex flex-col items-end gap-2">
          {/* المبلغ الإجمالي */}
          <div className="text-base font-bold text-primary">
            {formatCurrency(order.total)}
          </div>
          
          {/* عدد المنتجات */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>{order.items?.length || 0} منتج</span>
            <ShoppingCart className="h-3 w-3" />
          </div>
          
          {/* حالة الطلب */}
          <div className="flex items-center gap-1 mt-1 bg-muted/40 px-2 py-0.5 rounded-md">
            <div className={cn(
              "h-2 w-2 rounded-full",
              order.status === 'completed' ? 'bg-emerald-500' :
              order.status === 'processing' ? 'bg-blue-500' :
              order.status === 'pending' ? 'bg-amber-500' :
              order.status === 'cancelled' ? 'bg-red-500' :
              order.status === 'refunded' ? 'bg-orange-500' :
              'bg-slate-500'
            )} />
            <span className="text-xs text-muted-foreground">
              {getStatusText(order.status)}
            </span>
          </div>
        </div>
      </div>
      
      {/* شريط الإجراءات */}
      <div className="mt-3 pt-3 border-t border-border/20 flex justify-between items-center">
        {/* معلومات الشحن إذا كانت متوفرة */}
        {order.shipping_cost && order.shipping_cost > 0 ? (
          <div className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-md">
            <Truck className="h-3 w-3 text-orange-600 dark:text-orange-400" />
            <span className="text-xs text-orange-600 dark:text-orange-400">
              رسوم الشحن: {formatCurrency(order.shipping_cost)}
            </span>
          </div>
        ) : (
          <div></div>
        )}
        
        {/* أزرار الإجراءات */}
        <div className="flex items-center gap-2">
          <Link 
            to={`/dashboard/online-orders/${order.id}`}
            className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-all duration-200"
            title="عرض الطلب"
          >
            <Eye className="h-4 w-4" />
          </Link>
          
          <button 
            className="p-2 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground transition-all duration-200"
            title="خيارات إضافية"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
});

OnlineOrderItem.displayName = 'OnlineOrderItem';

// مكون عرض حالة فارغة محسن
const EmptyOrdersState = () => {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-8 text-center space-y-4 rounded-xl",
      "bg-muted/30 border border-border/30"
    )}>
      <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
        <Monitor className="h-6 w-6 text-primary" />
      </div>
      
      <div className="space-y-1 max-w-xs">
        <h3 className="text-base font-bold text-foreground">
          لا توجد طلبات أونلاين حديثة
        </h3>
        <p className="text-sm text-muted-foreground">
          ستظهر الطلبات الأونلاين الجديدة هنا بمجرد إنشائها من العملاء عبر المتجر الإلكتروني
        </p>
      </div>
      
      <Button 
        asChild 
        variant="outline" 
        className="mt-2 bg-primary/10 hover:bg-primary/20 text-primary border-primary/20"
      >
        <Link to="/dashboard/online-orders" className="flex items-center gap-2">
          <Monitor className="h-4 w-4" />
          عرض جميع الطلبات الأونلاين
          <TrendingUp className="h-4 w-4 opacity-60" />
        </Link>
      </Button>
    </div>
  );
};

const RecentOnlineOrdersCard = React.memo(({ limit = 5 }: RecentOnlineOrdersCardProps) => {
  const [orders, setOrders] = React.useState<OnlineOrder[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { currentOrganization } = useTenant();

  // جلب الطلبات الأونلاين الحديثة
  React.useEffect(() => {
    const fetchRecentOnlineOrders = async () => {
      try {
        setLoading(true);
        
        // التأكد من وجود معرف المؤسسة
        if (!currentOrganization?.id) {
          setError('معرف المؤسسة غير متوفر');
          return;
        }
        
        // جلب الطلبات الأونلاين مع العناصر مفلترة حسب المؤسسة
        const { data: ordersData, error: ordersError } = await supabase
          .from('online_orders')
          .select(`
            *,
            items:online_order_items(*)
          `)
          .eq('organization_id', currentOrganization.id)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (ordersError) {
          throw ordersError;
        }

        setOrders(ordersData || []);
      } catch (err) {
        setError('فشل في جلب الطلبات الأونلاين');
      } finally {
        setLoading(false);
      }
    };

    fetchRecentOnlineOrders();
  }, [limit, currentOrganization?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">جاري تحميل الطلبات الأونلاين...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-center space-y-2">
          <AlertCircle className="h-6 w-6 text-red-500 mx-auto" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      {orders.length === 0 ? (
        <EmptyOrdersState />
      ) : (
        <div className="space-y-3">
          {orders.map((order, index) => (
            <OnlineOrderItem key={order.id} order={order} index={index} />
          ))}
          
          {/* زر عرض جميع الطلبات الأونلاين */}
          <div className="pt-2">
            <Button 
              asChild 
              variant="outline" 
              className="w-full bg-primary/5 hover:bg-primary/10 text-primary border-primary/20"
            >
              <Link to="/dashboard/online-orders" className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  <span>عرض جميع الطلبات الأونلاين</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                    <span className="text-xs font-medium">{orders.length}</span>
                  </div>
                  <ArrowRight className="h-4 w-4" />
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
