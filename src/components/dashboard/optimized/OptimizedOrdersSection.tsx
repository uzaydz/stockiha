import React, { Suspense } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Globe, AlertCircle, ShoppingCart } from 'lucide-react';
import { useSuperUnifiedData, useIsAppEnabled } from '../../../context/SuperUnifiedDataContext';
import RecentOrdersCard from '@/components/dashboard/RecentOrdersCard';
import { Button } from '@/components/ui/button';

// مكون التحميل للطلبات
const OrdersLoader = ({ isPOSEnabled = true }: { isPOSEnabled?: boolean }) => (
  <div className={`grid gap-8 ${isPOSEnabled ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
    {Array.from({ length: isPOSEnabled ? 2 : 1 }).map((_, i) => (
      <div key={i} className="rounded-xl bg-background/80 border border-border/30 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-24 bg-muted animate-pulse rounded"></div>
          <div className="h-4 w-16 bg-muted animate-pulse rounded"></div>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, j) => (
            <div key={j} className="h-16 bg-muted animate-pulse rounded-lg"></div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

// مكون الخطأ للطلبات
const OrdersError = ({ error, onRetry, isPOSEnabled = true }: { error: string; onRetry: () => void; isPOSEnabled?: boolean }) => (
  <div className={`grid gap-8 ${isPOSEnabled ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
    <div className="rounded-xl bg-background/80 border border-border/30 shadow-sm p-5">
      <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
        <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/20">
          <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-foreground">
            فشل في تحميل الطلبات
          </h3>
          <p className="text-sm text-muted-foreground">
            {error}
          </p>
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

  if (isLoading) {
    return (
      <div className="rounded-xl bg-background/80 border border-border/30 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-32 bg-muted animate-pulse rounded"></div>
          <div className="h-4 w-16 bg-muted animate-pulse rounded"></div>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-background/80 border border-border/30 shadow-sm p-5">
        <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
          <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/20">
            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">
              فشل في تحميل الطلبات الأونلاين
            </h3>
            <p className="text-sm text-muted-foreground">
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // التأكد من أن recentOnlineOrders هو مصفوفة
  const safeOnlineOrders = Array.isArray(recentOnlineOrders) ? recentOnlineOrders : [];

  return (
    <div className="rounded-xl bg-background/80 border border-border/30 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold flex items-center gap-2">
          <Globe className="h-4 w-4 text-blue-500" />
          آخر الطلبات الأونلاين
        </h2>
        <Link to="/dashboard/online-orders" className="text-xs text-primary hover:underline">
          عرض الكل
        </Link>
      </div>
      
      {safeOnlineOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
          <div className="p-3 rounded-full bg-muted">
            <Globe className="h-6 w-6 text-muted-foreground" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">
              لا توجد طلبات أونلاين
            </h3>
            <p className="text-sm text-muted-foreground">
              ستظهر الطلبات الأونلاين هنا
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {safeOnlineOrders.map((order, index) => (
            <div key={order.id} className="p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">طلب #{order.customer_order_number}</p>
                  <p className="text-xs text-muted-foreground">{order.customer_name || 'عميل غير محدد'}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">{order.total} دج</p>
                  <p className="text-xs text-muted-foreground">{order.status}</p>
                </div>
              </div>
            </div>
          ))}
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
        <div className="rounded-xl bg-background/80 border border-border/30 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-primary" />
              آخر الطلبات
            </h2>
            <Link to="/dashboard/orders" className="text-xs text-primary hover:underline">
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
