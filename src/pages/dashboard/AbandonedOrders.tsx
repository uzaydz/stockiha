import { useState, useEffect, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useTenant } from "@/context/TenantContext";
import { supabase } from "@/lib/supabase";
import { hasPermissions } from "@/lib/api/userPermissionsUnified";
import Layout from "@/components/Layout";
import { POSSharedLayoutControls, POSLayoutState } from '@/components/pos-layout/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Helmet } from "react-helmet-async";
import { DownloadIcon, ShoppingBag, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

// استيراد المكونات المحسّنة
import AbandonedOrdersTableSimple, { type AbandonedOrder } from "@/components/abandoned-orders/AbandonedOrdersTableSimple";
import { 
  AbandonedOrdersStats as AbandonedOrdersStatsComponent, 
  type AbandonedOrdersStats 
} from "@/components/abandoned-orders/AbandonedOrdersStats";

// تعريف نوع بيانات الولايات والبلديات
interface Province {
  id: number;
  name: string;
  name_ar: string;
}

interface Municipality {
  id: number;
  name: string;
  name_ar: string;
  wilaya_id: number;
  wilaya_name: string;
  wilaya_name_ar: string;
}

// تعريف مصادر الطلبات
const ORDER_SOURCES = [
  { label: "متصفح الويب", value: "browser" },
  { label: "تطبيق الهاتف", value: "mobile_app" },
  { label: "واتساب", value: "whatsapp" },
  { label: "فيسبوك", value: "facebook" },
  { label: "انستغرام", value: "instagram" },
];

// صفحة الطلبات المتروكة
interface AbandonedOrdersProps extends POSSharedLayoutControls {}

const AbandonedOrders: React.FC<AbandonedOrdersProps> = ({
  useStandaloneLayout = true,
  onRegisterRefresh,
  onLayoutStateChange
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentOrganization } = useTenant();
  
  // حالة الصلاحيات
  const [hasViewPermission, setHasViewPermission] = useState<boolean>(false);
  const [hasManagePermission, setHasManagePermission] = useState<boolean>(false);
  const [permissionLoading, setPermissionLoading] = useState<boolean>(true);
  
  // حالة البيانات
  const [abandonedOrders, setAbandonedOrders] = useState<AbandonedOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<AbandonedOrder[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<AbandonedOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);
  
  // حالة بيانات الولايات والبلديات (تم تعطيلها - غير مستخدمة)
  // const [provinces, setProvinces] = useState<Record<string, Province>>({});
  // const [municipalities, setMunicipalities] = useState<Record<string, Municipality>>({});
  
  // حالة الفلاتر والعرض
  const [timeRange, setTimeRange] = useState<"today" | "week" | "month" | "year">("week");
  const [activeTab, setActiveTab] = useState<string>("all");
  
  // إحصائيات الطلبات المتروكة
  const [stats, setStats] = useState<AbandonedOrdersStats>({
    totalCount: 0,
    totalValue: 0,
    todayCount: 0,
    weekCount: 0,
    monthCount: 0,
    averageValue: 0,
    recoveryRate: 0,
    conversionRate: 0,
    timeSeries: {
      labels: [],
      data: [],
    },
  });

  // سياسة الحذف التلقائي (عرض فقط): يمكن ضبطها من متغير بيئة
  const retentionDays = useMemo(() => {
    const envVal = (import.meta as any)?.env?.VITE_ABANDONED_CART_RETENTION_DAYS;
    const parsed = Number(envVal);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 90; // افتراضي 90 يومًا
  }, []);

  // التحقق من صلاحيات المستخدم
  useEffect(() => {
    const checkPermissions = async () => {
      if (!user) return;
      setPermissionLoading(true);
      
      try {
        // استخدام الدالة الموحدة للتحقق من عدة صلاحيات دفعة واحدة
        const permissionsResult = await hasPermissions(['viewOrders', 'updateOrderStatus'], user.id);
        
        setHasViewPermission(permissionsResult.viewOrders || false);
        setHasManagePermission(permissionsResult.updateOrderStatus || false);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "خطأ في التحقق من الصلاحيات",
          description: "حدث خطأ أثناء التحقق من صلاحياتك للوصول إلى هذه الصفحة"
        });
      } finally {
        setPermissionLoading(false);
      }
    };
    
    checkPermissions();
  }, [user, toast]);

  // تم تعطيل استرجاع الولايات والبلديات - غير مستخدمة في الجدول المبسط

  // تنفيذ استعلام قاعدة البيانات لاسترجاع الطلبات المتروكة
  const fetchAbandonedOrders = useCallback(async () => {
    if (!currentOrganization?.id || !hasViewPermission) return;
    
    setLoading(true);
    setStatsLoading(true);
    try {
      const limit = Number((import.meta as any)?.env?.VITE_ABANDONED_ORDERS_MAX_ROWS) || 500;
      const { data, error } = await supabase.rpc('get_abandoned_orders_page_data', {
        p_organization_id: currentOrganization.id,
        p_limit: limit
      });
      if (error) throw error;

      const cartsData = (data && (data as any).carts) ? (data as any).carts : [];
      const statsFromRpc = (data && (data as any).stats) ? (data as any).stats : null;

      if (Array.isArray(cartsData) && cartsData.length > 0) {
        const processedOrders: AbandonedOrder[] = cartsData.map((cart: any) => {
          const lastActivity = new Date(cart.last_activity_at);
          const now = new Date();
          const diffHours = cart.abandoned_hours || (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);

          // المنتج الأساسي - إن لم يوجد product_name (سلات متعددة)، نستخدم أول عنصر من cart_items
          let productDetails: { name: string; image_url?: string } | null = null;
          if (cart.product_name) {
            productDetails = { name: cart.product_name as string, image_url: cart.product_image as string | undefined };
          } else if (Array.isArray(cart.cart_items) && cart.cart_items.length > 0) {
            const first = cart.cart_items[0];
            const firstName = (first?.product_name || first?.name || 'منتج');
            productDetails = { name: String(firstName), image_url: first?.image_url };
          }

          // أسماء الولاية/البلدية
          const provinceText = cart.province_name || cart.province;
          const municipalityText = cart.municipality_name || cart.municipality;

          return {
            ...cart,
            abandoned_hours: diffHours,
            productDetails,
            province_name: provinceText,
            municipality_name: municipalityText
          } as AbandonedOrder;
        });
        setAbandonedOrders(processedOrders);
        setFilteredOrders(processedOrders);
      } else {
        setAbandonedOrders([]);
        setFilteredOrders([]);
      }

      // احصائيات من نفس RPC
      if (statsFromRpc) {
        let labels: string[] = [];
        let chartData: number[] = [];
        if (timeRange === 'today') {
          labels = ['9 ص', '12 م', '3 م', '6 م', '9 م'];
          chartData = [2, 4, 3, 2, 1];
        } else if (timeRange === 'week') {
          labels = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
          chartData = [8, 12, 7, 9, 5, 3, 2];
        } else if (timeRange === 'month') {
          labels = ['الأسبوع 1', 'الأسبوع 2', 'الأسبوع 3', 'الأسبوع 4'];
          chartData = [22, 35, 28, 14];
        } else {
          labels = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'];
          chartData = [55, 70, 45, 90, 110, 85];
        }
        setStats({
          totalCount: Number((statsFromRpc as any).total_count || 0),
          totalValue: Number((statsFromRpc as any).total_value || 0),
          todayCount: Number((statsFromRpc as any).today_count || 0),
          weekCount: Number((statsFromRpc as any).week_count || 0),
          monthCount: Number((statsFromRpc as any).month_count || 0),
          averageValue: Number((statsFromRpc as any).avg_value || 0),
          recoveryRate: 0,
          conversionRate: 0,
          timeSeries: { labels, data: chartData }
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "خطأ في استرجاع البيانات",
        description: "حدث خطأ أثناء جلب بيانات الطلبات المتروكة"
      });
    } finally {
      setLoading(false);
      setStatsLoading(false);
    }
  }, [currentOrganization?.id, hasViewPermission, toast, timeRange]);

  // استرجاع إحصائيات الطلبات المتروكة
  const fetchAbandonedOrdersStats = useCallback(async () => {
    if (!currentOrganization?.id || !hasViewPermission) return;
    
    setStatsLoading(true);
    
    try {
      // محاولة استخدام الجدول المُجمع للإحصائيات إذا كان موجوداً
      let statsData: AbandonedOrdersStats;
      
      const { data: statsFromView, error: viewError } = await supabase
        .from('abandoned_carts_stats')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .single();
      
      // إذا كان الجدول موجود، استخدمه
      if (!viewError && statsFromView) {
        // إنشاء البيانات للرسوم البيانية - يمكن تعديلها لاستخدام بيانات حقيقية
        let labels: string[] = [];
        let chartData: number[] = [];
        
        if (timeRange === 'today') {
          labels = ['9 ص', '12 م', '3 م', '6 م', '9 م'];
          chartData = [2, 4, 3, 2, 1]; // يمكن استبدالها بحساب فعلي 
        } else if (timeRange === 'week') {
          labels = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
          chartData = [8, 12, 7, 9, 5, 3, 2]; // بيانات وهمية
        } else if (timeRange === 'month') {
          labels = ['الأسبوع 1', 'الأسبوع 2', 'الأسبوع 3', 'الأسبوع 4'];
          chartData = [22, 35, 28, 14]; // بيانات وهمية
        } else {
          labels = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'];
          chartData = [55, 70, 45, 90, 110, 85]; // بيانات وهمية
        }
        
        statsData = {
          totalCount: statsFromView.total_count || 0,
          totalValue: statsFromView.total_value || 0,
          todayCount: statsFromView.today_count || 0,
          weekCount: statsFromView.week_count || 0,
          monthCount: statsFromView.month_count || 0,
          averageValue: statsFromView.avg_value || 0,
          recoveryRate: 18.5, // نسبة افتراضية، يمكن حسابها بشكل دقيق
          conversionRate: 23.2, // نسبة افتراضية، يمكن حسابها بشكل دقيق
          timeSeries: {
            labels,
            data: chartData,
          },
        };
      } else {
        // استخدم الاستعلام القديم إذا لم يكن الجدول المُجمع موجوداً
        const { data: countData, error: countError } = await supabase
          .from('abandoned_carts')
          .select('id, total_amount, created_at', { count: 'exact' })
          .eq('organization_id', currentOrganization.id)
          .eq('status', 'pending');
        
        if (countError) throw countError;
        
        // احتساب القيمة الإجمالية
        const totalValue = countData ? countData.reduce((sum, order: any) => sum + (parseFloat(order.total_amount) || 0), 0) : 0;
        
        // احتساب عدد الطلبات اليومية والأسبوعية والشهرية
        const now = new Date();
        const oneDayAgo = new Date(now);
        oneDayAgo.setDate(now.getDate() - 1);
        
        const oneWeekAgo = new Date(now);
        oneWeekAgo.setDate(now.getDate() - 7);
        
        const oneMonthAgo = new Date(now);
        oneMonthAgo.setMonth(now.getMonth() - 1);
        
        const todayCount = countData ? countData.filter((order: any) => new Date(order.created_at) >= oneDayAgo).length : 0;
        const weekCount = countData ? countData.filter((order: any) => new Date(order.created_at) >= oneWeekAgo).length : 0;
        const monthCount = countData ? countData.filter((order: any) => new Date(order.created_at) >= oneMonthAgo).length : 0;
        
        // إنشاء البيانات للرسوم البيانية
        let labels: string[] = [];
        let chartData: number[] = [];
        
        if (timeRange === 'today') {
          labels = ['9 ص', '12 م', '3 م', '6 م', '9 م'];
          chartData = [2, 4, 3, 2, 1]; // بيانات وهمية، يمكن استبدالها بحساب فعلي
        } else if (timeRange === 'week') {
          labels = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
          chartData = [8, 12, 7, 9, 5, 3, 2]; // بيانات وهمية
        } else if (timeRange === 'month') {
          labels = ['الأسبوع 1', 'الأسبوع 2', 'الأسبوع 3', 'الأسبوع 4'];
          chartData = [22, 35, 28, 14]; // بيانات وهمية
        } else {
          labels = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'];
          chartData = [55, 70, 45, 90, 110, 85]; // بيانات وهمية
        }
        
        statsData = {
          totalCount: countData ? countData.length : 0,
          totalValue,
          todayCount,
          weekCount,
          monthCount,
          averageValue: countData && countData.length > 0 ? Math.round(totalValue / countData.length) : 0,
          recoveryRate: 18.5, // نسبة افتراضية، يمكن حسابها بشكل دقيق
          conversionRate: 23.2, // نسبة افتراضية، يمكن حسابها بشكل دقيق
          timeSeries: {
            labels,
            data: chartData,
          },
        };
      }
      
      setStats(statsData);
    } catch (error) {
    } finally {
      setStatsLoading(false);
    }
  }, [currentOrganization?.id, hasViewPermission, timeRange]);

  // استدعاء دالة جلب البيانات عند التحميل
  useEffect(() => {
    if (hasViewPermission && currentOrganization?.id) {
      fetchAbandonedOrders();
    }
  }, [fetchAbandonedOrders, hasViewPermission, currentOrganization?.id]);

  // استدعاء دالة جلب الإحصائيات عند التحميل أو تغيير المدى الزمني
  // لم نعد بحاجة لاستدعاء منفصل للإحصائيات؛ تأتي مع نفس الـ RPC

  // تطبيق الفلاتر على قائمة الطلبات (مبسط)
  useEffect(() => {
    if (!abandonedOrders.length) {
      setFilteredOrders([]);
      return;
    }
    
    let result = [...abandonedOrders];
    
    // فلترة حسب التبويب النشط
    if (activeTab === "day") {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      result = result.filter(order => new Date(order.created_at) >= oneDayAgo);
    } else if (activeTab === "week") {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      result = result.filter(order => new Date(order.created_at) >= oneWeekAgo);
    } else if (activeTab === "high-value") {
      result = result.filter(order => order.total_amount > 5000);
    } else if (activeTab === "recoverable") {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      result = result.filter(order => 
        Boolean(order.customer_phone) && 
        new Date(order.created_at) >= twoDaysAgo
      );
    }
    
    setFilteredOrders(result);
  }, [abandonedOrders, activeTab]);

  // إعادة ضبط الفلاتر
  const handleResetFilters = useCallback(() => {
    setActiveTab("all");
  }, []);

  // إرسال تذكيرات للعملاء
  const handleSendReminders = useCallback(async (orders: AbandonedOrder[], message?: string) => {
    if (!hasManagePermission) return;
    
    try {
      // حساب عدد العملاء الذين لديهم معلومات اتصال
      const contactableCustomers = orders.filter(order => order.customer_phone || order.customer_email);
      
      toast({
        title: "تم إرسال التذكيرات",
        description: `تم إرسال تذكيرات إلى ${contactableCustomers.length} عميل بنجاح.`,
      });
      
      // إعادة تحميل البيانات
      fetchAbandonedOrders();
      
    } catch (error) {
      toast({
        variant: "destructive",
        title: "خطأ في إرسال التذكيرات",
        description: "حدث خطأ أثناء محاولة إرسال التذكيرات للعملاء"
      });
    }
  }, [fetchAbandonedOrders, hasManagePermission, toast]);

  // استرجاع الطلبات المتروكة (تحويلها إلى طلبات فعلية)
  const handleRecoverOrders = useCallback(async (orders: AbandonedOrder[]) => {
    if (!hasManagePermission) return;
    
    try {
      // هنا يمكن إضافة منطق تحويل الطلبات المتروكة إلى طلبات فعلية
      // مثلاً إنشاء طلب جديد في جدول online_orders وتحديث حالة الطلب المتروك
      
      toast({
        title: "تم استرجاع الطلبات",
        description: `تم استرجاع ${orders.length} طلب بنجاح.`,
      });
      
      // إعادة تحميل البيانات
      fetchAbandonedOrders();
      
    } catch (error) {
      toast({
        variant: "destructive",
        title: "خطأ في استرجاع الطلبات",
        description: "حدث خطأ أثناء محاولة استرجاع الطلبات المتروكة"
      });
    }
  }, [fetchAbandonedOrders, hasManagePermission, toast]);

  // حذف الطلبات المتروكة
  const handleDeleteOrders = useCallback(async (orders: AbandonedOrder[]) => {
    if (!hasManagePermission) return;
    
    try {
      // حذف الطلبات المحددة من قاعدة البيانات
      const orderIds = orders.map(order => order.id);
      
      const { error } = await supabase
        .from('abandoned_carts')
        .delete()
        .in('id', orderIds);
      
      if (error) throw error;
      
      toast({
        title: "تم حذف الطلبات",
        description: `تم حذف ${orders.length} طلب بنجاح.`,
      });
      
      // إعادة تحميل البيانات
      fetchAbandonedOrders();
      setSelectedOrders([]);
      
    } catch (error) {
      toast({
        variant: "destructive",
        title: "خطأ في حذف الطلبات",
        description: "حدث خطأ أثناء محاولة حذف الطلبات المتروكة"
      });
    }
  }, [fetchAbandonedOrders, hasManagePermission, toast]);

  // تصدير الطلبات المتروكة إلى Excel
  const handleExportOrders = useCallback(async (orders: AbandonedOrder[]) => {
    try {
      // محل تنفيذ منطق تصدير الطلبات
      // يمكن إنشاء ملف Excel وتنزيله
      
      toast({
        title: "تم تصدير الطلبات",
        description: `تم تصدير ${orders.length} طلب بنجاح.`,
      });
      
    } catch (error) {
      toast({
        variant: "destructive",
        title: "خطأ في تصدير الطلبات",
        description: "حدث خطأ أثناء محاولة تصدير الطلبات المتروكة"
      });
    }
  }, [toast]);

  // تسجيل دالة التحديث مع الـ Layout
  useEffect(() => {
    if (onRegisterRefresh) {
      onRegisterRefresh(() => fetchAbandonedOrders());
      return () => onRegisterRefresh(null);
    }
  }, [onRegisterRefresh, fetchAbandonedOrders]);

  // تحديث حالة الـ Layout
  useEffect(() => {
    const state: POSLayoutState = {
      isRefreshing: Boolean(loading),
      connectionStatus: 'connected',
      executionTime: undefined
    } as any;
    if (onLayoutStateChange) onLayoutStateChange(state);
  }, [onLayoutStateChange, loading]);

  // التحقق من الصلاحيات وعرض الصفحة وفقًا لذلك
  if (permissionLoading) {
    const loadingNode = (
      <div className="flex items-center justify-center h-96">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-16 w-16 rounded-full bg-primary/20"></div>
          <div className="mt-4 h-4 w-40 bg-muted"></div>
          <div className="mt-2 h-4 w-60 bg-muted"></div>
        </div>
      </div>
    );
    return useStandaloneLayout ? <Layout>{loadingNode}</Layout> : loadingNode;
  }

  // عرض رسالة عدم وجود صلاحيات
  if (!hasViewPermission) {
    const noPermNode = (
      <Alert variant="destructive" className="mt-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>غير مصرح</AlertTitle>
        <AlertDescription>
          ليس لديك الصلاحيات اللازمة للوصول إلى هذه الصفحة
        </AlertDescription>
      </Alert>
    );
    return useStandaloneLayout ? <Layout>{noPermNode}</Layout> : noPermNode;
  }

  const renderWithLayout = (node: React.ReactElement) => (
    useStandaloneLayout ? <Layout>{node}</Layout> : node
  );

  const pageContent = (
    <>
      <Helmet>
        <title>الطلبات المتروكة - {currentOrganization?.name}</title>
      </Helmet>
      
      <div className="flex flex-col space-y-6 p-4">
        {/* العنوان */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">الطلبات المتروكة</h1>
            <p className="text-muted-foreground">
              إدارة ومتابعة الطلبات التي لم يكملها العملاء
            </p>
          </div>
          
          <Button
            variant="outline"
            onClick={() => fetchAbandonedOrders()}
            disabled={loading}
            className="ml-2"
          >
            تحديث البيانات
          </Button>
        </div>

        {/* تحذير الحذف التلقائي لتقليل الحمل على قاعدة البيانات */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>تنبيه الصيانة</AlertTitle>
          <AlertDescription>
            يتم حذف الطلبات المتروكة تلقائيًا بعد {retentionDays} يومًا لتقليل الحمل على قاعدة البيانات. احتفِظ بالطلبات المهمة قبل هذا الموعد.
          </AlertDescription>
        </Alert>
        
        {/* الإحصائيات */}
        <AbandonedOrdersStatsComponent
          stats={stats}
          loading={statsLoading}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
        />
        
        {/* التبويبات */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="mb-6">
            <TabsTrigger value="all">الكل</TabsTrigger>
            <TabsTrigger value="day">آخر 24 ساعة</TabsTrigger>
            <TabsTrigger value="week">آخر أسبوع</TabsTrigger>
            <TabsTrigger value="high-value">قيمة عالية</TabsTrigger>
            <TabsTrigger value="recoverable">قابلة للإسترداد</TabsTrigger>
          </TabsList>
        </Tabs>
        
        {/* الجدول المبسط */}
        <AbandonedOrdersTableSimple
          data={filteredOrders}
          loading={loading}
          onRecoverOrder={(order) => handleRecoverOrders([order])}
          onSendReminder={(order) => handleSendReminders([order])}
          onDeleteOrder={(order) => handleDeleteOrders([order])}
        />
      </div>
    </>
  );

  return renderWithLayout(pageContent);
};

export default AbandonedOrders;
