import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ShoppingCart, 
  ArrowRight, 
  AlertCircle, 
  BarChart3,
  Calendar 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSuperUnifiedData } from '@/context/SuperUnifiedDataContext';

// المكونات الفرعية
import OverviewStats from './online-orders/OverviewStats';
import ChartsGrid from './online-orders/ChartsGrid';
import { processOrderAnalytics } from './online-orders/dataProcessor';

const OnlineOrderAnalyticsCard: React.FC = () => {
  const { globalData, isLoading, error } = useSuperUnifiedData();

  // استخراج ومعالجة البيانات
  const orderAnalytics = React.useMemo(() => {
    const rawData = globalData?.additional_data?.online_order_analytics;
    return processOrderAnalytics(rawData);
  }, [globalData]);

  // حالة التحميل
  if (isLoading) {
    return (
      <div className="space-y-8">
        {/* عنوان التحميل */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-muted animate-pulse rounded"></div>
            <div className="h-4 w-96 bg-muted animate-pulse rounded"></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-6 w-24 bg-muted animate-pulse rounded"></div>
            <div className="h-8 w-32 bg-muted animate-pulse rounded"></div>
          </div>
        </div>

        {/* الإحصائيات الرئيسية */}
        <OverviewStats 
          overview={{ totalOrders: 0, totalRevenue: 0, averageOrderValue: 0, completionRate: 0 }}
          isLoading={true}
        />

        {/* المخططات */}
        <ChartsGrid
          statusBreakdown={[]}
          paymentStatusBreakdown={[]}
          callConfirmationBreakdown={[]}
          paymentMethodBreakdown={[]}
          isLoading={true}
        />
      </div>
    );
  }

  // حالة الخطأ
  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-6">
          <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/20">
            <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-foreground">
              فشل في تحميل البيانات
            </h3>
            <p className="text-muted-foreground max-w-md">
              {error}
            </p>
          </div>
          
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
            className="mt-4"
          >
            إعادة المحاولة
          </Button>
        </CardContent>
      </Card>
    );
  }

  // حالة عدم وجود بيانات
  if (!orderAnalytics || orderAnalytics.overview.totalOrders === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <ShoppingCart className="h-5 w-5" />
              </div>
              إحصائيات الطلبات الأونلاين
            </CardTitle>
            <Link to="/dashboard/orders">
              <Button variant="ghost" size="sm" className="text-sm">
                عرض الطلبات <ArrowRight className="h-4 w-4 mr-2" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-6">
            <div className="p-6 rounded-full bg-muted">
              <BarChart3 className="h-12 w-12 text-muted-foreground" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">
                لا توجد طلبات أونلاين
              </h3>
              <p className="text-muted-foreground max-w-md">
                ستظهر إحصائيات الطلبات الأونلاين هنا بمجرد وجود طلبات في النظام
              </p>
            </div>
            
            <Link to="/dashboard/orders/create">
              <Button className="mt-4">
                إنشاء طلب جديد
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-8"
    >
      {/* العنوان الرئيسي */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <ShoppingCart className="h-8 w-8" />
            </div>
            إحصائيات الطلبات الأونلاين
          </h2>
          <p className="text-muted-foreground">
            نظرة شاملة على أداء الطلبات الأونلاين خلال آخر 30 يوماً
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-sm px-3 py-1">
            <Calendar className="h-4 w-4 mr-2" />
            آخر 30 يوماً
          </Badge>
          <Link to="/dashboard/orders">
            <Button variant="outline" size="default">
              عرض جميع الطلبات 
              <ArrowRight className="h-4 w-4 mr-2" />
            </Button>
          </Link>
        </div>
      </div>

      {/* الإحصائيات الرئيسية */}
      <OverviewStats overview={orderAnalytics.overview} />

      {/* المخططات */}
      <ChartsGrid
        statusBreakdown={orderAnalytics.statusBreakdown}
        paymentStatusBreakdown={orderAnalytics.paymentStatusBreakdown}
        callConfirmationBreakdown={orderAnalytics.callConfirmationBreakdown}
        paymentMethodBreakdown={orderAnalytics.paymentMethodBreakdown}
      />
    </motion.div>
  );
};

export default OnlineOrderAnalyticsCard; 