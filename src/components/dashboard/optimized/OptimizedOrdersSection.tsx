import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Globe, AlertCircle } from 'lucide-react';
import { useSuperUnifiedData, useIsAppEnabled } from '../../../context/SuperUnifiedDataContext';
import RecentOrdersCard from '@/components/dashboard/RecentOrdersCard';
import { Button } from '@/components/ui/button';

// مكون التحميل للطلبات
const OrdersLoader = ({ isPOSEnabled = true }: { isPOSEnabled?: boolean }) => (
  <div className={`grid gap-8 ${isPOSEnabled ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
    {Array.from({ length: isPOSEnabled ? 2 : 1 }).map((_, i) => (
      <div key={i} className="rounded-2xl border border-border/40 bg-background/80 p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="h-6 w-24 bg-muted animate-pulse rounded" />
          <div className="h-4 w-16 bg-muted animate-pulse rounded" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, j) => (
            <div key={j} className="h-16 bg-muted/70 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    ))}
  </div>
);

// مكون الخطأ للطلبات
const OrdersError = ({ error, onRetry, isPOSEnabled = true }: { error: string; onRetry: () => void; isPOSEnabled?: boolean }) => (
  <div className={`grid gap-8 ${isPOSEnabled ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
    <div className="rounded-2xl border border-border/40 bg-background/80 p-6">
      <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
          <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-foreground">فشل في تحميل الطلبات</h3>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
        
        <Button
          onClick={onRetry}
          variant="outline"
          className="bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800"
        >
          إعادة المحاولة
        </Button>
      </div>
    </div>
  </div>
);

// مكون الطلبات الأونلاين المحسن
const OptimizedOnlineOrdersCard = () => {
  const { recentOnlineOrders, isLoading, error } = useSuperUnifiedData();

  const statusVariants: Record<
    string,
    {
      label: string;
      className: string;
    }
  > = {
    shipped: {
      label: 'تم الشحن',
      className: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300'
    },
    completed: {
      label: 'مكتمل',
      className: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300'
    },
    delivered: {
      label: 'تم التسليم',
      className: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300'
    },
    pending: {
      label: 'قيد المعالجة',
      className: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300'
    },
    processing: {
      label: 'جارٍ التنفيذ',
      className: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300'
    },
    cancelled: {
      label: 'ملغى',
      className: 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300'
    },
    default: {
      label: 'غير محدد',
      className: 'bg-border/60 text-foreground'
    }
  };

  const normalizeOrders = (orders: unknown) => {
    if (!orders) return [];
    if (Array.isArray(orders)) return orders;
    if (typeof orders === 'object') {
      return Object.values(orders).filter((item) => typeof item === 'object' && item !== null);
    }
    return [];
  };

  const formatCurrency = (value: number | string | undefined) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '—';
    return `${numeric.toLocaleString('ar-DZ')} دج`;
  };

  const formatOrderNumber = (value: string | number | undefined, fallbackIndex: number) => {
    if (value === null || value === undefined || value === '') {
      return `طلب #${fallbackIndex}`;
    }
    return `طلب #${value}`;
  };

  const formatCustomerName = (name?: string | null) => {
    if (!name || !name.trim()) return 'عميل غير محدد';
    return name;
  };

  const formatStatus = (status?: string | null) => {
    if (!status) return statusVariants.default;
    const normalized = status.toLowerCase();
    const normalizedKey = normalized.replace(/\s+/g, '_');
    return statusVariants[normalized] || statusVariants[normalizedKey] || {
      label: status,
      className: 'bg-border/60 text-foreground'
    };
  };

  const formatDate = (dateValue?: string | null) => {
    if (!dateValue) return null;
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat('ar-DZ', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border/40 bg-background/80 p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="h-6 w-32 bg-muted animate-pulse rounded" />
          <div className="h-4 w-16 bg-muted animate-pulse rounded" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted/70 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-border/40 bg-background/80 p-6">
        <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">فشل في تحميل الطلبات الأونلاين</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const normalizedOrders = normalizeOrders(recentOnlineOrders)
    .filter((order) => order)
    .sort((a: any, b: any) => {
      const dateA = new Date(a.created_at || a.order_date || 0).getTime();
      const dateB = new Date(b.created_at || b.order_date || 0).getTime();
      return dateB - dateA;
    })
    .slice(0, 6);

  return (
    <div className="rounded-2xl border border-border/40 bg-background/80 p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold flex items-center gap-2 text-foreground">
          <Globe className="h-5 w-5 text-primary" />
          آخر الطلبات الأونلاين
        </h2>
        <Link to="/dashboard/online-orders" className="text-xs font-medium text-primary hover:text-primary/80">
          عرض الكل
        </Link>
      </div>
      
      {normalizedOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/60">
            <Globe className="h-7 w-7 text-muted-foreground" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">لا توجد طلبات أونلاين</h3>
            <p className="text-sm text-muted-foreground">ستظهر الطلبات الأونلاين هنا</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {normalizedOrders.map((order: any, index: number) => {
            const statusInfo = formatStatus(order.status || order.fulfillment_status);
            const orderNumber = formatOrderNumber(order.customer_order_number || order.increment_id || order.id, index + 1);
            const amount = formatCurrency(order.total ?? order.grand_total ?? order.final_price);
            const customer = formatCustomerName(
              order.customer_name ||
                order.customer?.name ||
                [order.customer?.first_name, order.customer?.last_name].filter(Boolean).join(' ') ||
                order.shipping_address?.full_name
            );
            const createdAt = formatDate(order.created_at || order.order_date);
            const paymentLabel = order.payment_status_label || order.payment_status;
            const shippingLabel = order.shipping_method_label || order.shipping_method || order.delivery_method;
            const channelLabel = order.channel_label || order.channel || order.source;
            const metaItems = [paymentLabel && `الدفع: ${paymentLabel}`, shippingLabel && `الشحن: ${shippingLabel}`, channelLabel && `القناة: ${channelLabel}`].filter(
              Boolean
            ) as string[];

            return (
              <article
                key={order.id || `${orderNumber}-${index}`}
                className="rounded-xl border border-border/60 bg-background px-4 py-3 transition-colors hover:border-primary/40"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">{orderNumber}</p>
                    <p className="text-xs text-muted-foreground">{customer}</p>
                    {createdAt && <p className="text-xs text-muted-foreground/80">{createdAt}</p>}
                    {metaItems.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {metaItems.map((item, metaIndex) => (
                          <span key={metaIndex} className="inline-flex items-center rounded-full bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">
                            {item}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-start gap-2 text-left sm:items-end">
                    <span className="text-sm font-bold text-foreground">{amount}</span>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusInfo.className}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

const OptimizedOrdersSection: React.FC = () => {
  const { recentOrders, recentOnlineOrders, isLoading, error } = useSuperUnifiedData();
  const isPOSEnabled = useIsAppEnabled('pos');

  // معالجة أخطاء مفردة بدلاً من متعددة
  if (isLoading) {
    return <OrdersLoader />;
  }

  if (error) {
    return <OrdersError error={error} onRetry={() => window.location.reload()} />;
  }

  // الحصول على آخر 5 طلبات فقط
  const recentOrdersSliced = recentOrders?.slice(0, 5) || [];

  return (
    <div className={`grid gap-8 ${isPOSEnabled ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
      {/* آخر الطلبات العادية - يظهر فقط إذا كان تطبيق نقطة البيع مفعل */}
      {isPOSEnabled && (
        <div className="rounded-2xl border border-border/40 bg-background/80 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold flex items-center gap-2 text-foreground">
              <ShoppingBag className="h-5 w-5 text-primary" />
              آخر الطلبات
            </h2>
            <Link to="/dashboard/orders" className="text-xs font-medium text-primary hover:text-primary/80">
              عرض الكل
            </Link>
          </div>
          <RecentOrdersCard orders={recentOrdersSliced} />
        </div>
      )}
      
      {/* آخر الطلبات الأونلاين */}
      <OptimizedOnlineOrdersCard />
    </div>
  );
};

export default OptimizedOrdersSection;
