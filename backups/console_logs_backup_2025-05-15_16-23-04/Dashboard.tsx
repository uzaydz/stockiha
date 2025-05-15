import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import Layout from '@/components/Layout';
import { dashboardStats } from '@/data/mockData';
import { toast } from 'sonner';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';
import { useShop } from '@/context/ShopContext';
import { Link } from 'react-router-dom';
import { checkUserPermissions } from '@/lib/api/permissions';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Import icons
import { 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  Users, 
  Settings, 
  BarChart3, 
  DollarSign, 
  Wrench, 
  Store,
  FileText,
  Bell,
  Database,
  Tag,
  Truck,
  Calendar,
  User,
  Building,
  FileBarChart,
  Receipt,
  Phone,
  Wallet
} from 'lucide-react';

// Lazy load dashboard components to improve initial load time
const DashboardHeader = lazy(() => import('@/components/dashboard/DashboardHeader'));
const StatsGrid = lazy(() => import('@/components/dashboard/StatsGrid'));
const RevenueChart = lazy(() => import('@/components/dashboard/RevenueChart'));
const OrderStatusCard = lazy(() => import('@/components/dashboard/OrderStatusCard'));
const RecentOrdersCard = lazy(() => import('@/components/dashboard/RecentOrdersCard'));
const LowStockCard = lazy(() => import('@/components/dashboard/LowStockCard'));
const TrialNotification = lazy(() => import('@/components/subscription/TrialNotification'));

// Fallback loading component
const ComponentLoader = () => (
  <div className="flex items-center justify-center py-6">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

// Supabase API
import { getProducts, createProduct } from '@/lib/api/products';
import { getOrders, Order as SupabaseOrder } from '@/lib/api/orders';
import { supabase } from '@/lib/supabase';
import { checkDatabaseConnection, checkOrganizationAccess, testUserData } from '@/lib/api/debug';
import { DashboardStats } from '@/types';
import { getAllAnalytics, AnalyticsPeriod } from '@/lib/api/analytics';
import { InsertProduct } from '@/lib/api/products';
import { Order } from '@/types';

// نوع للفترة الزمنية في واجهة المستخدم (يستخدم في المكونات)
type TimeframeType = 'daily' | 'weekly' | 'monthly' | 'annual' | 'custom';

// دالة تحويل بين أنواع الفترات الزمنية
const timeframeToAnalyticsPeriod = (timeframe: TimeframeType): AnalyticsPeriod => {
  switch (timeframe) {
    case 'daily': return 'day';
    case 'weekly': return 'week';
    case 'monthly': return 'month';
    case 'annual': return 'year';
    case 'custom': return 'custom';
    default: return 'month';
  }
};

// مكون تشخيصي لعرض معلومات التشخيص
const DiagnosticsPanel = ({ isVisible, setIsVisible, createTestProduct, orgId }) => {
  const { currentOrganization, isLoading: tenantLoading, refreshOrganizationData } = useTenant();
  const { user, currentSubdomain, loading: authLoading } = useAuth();
  const { refreshData } = useShop();
  const [isCreating, setIsCreating] = useState(false);
  const [dbConnectionStatus, setDbConnectionStatus] = useState<{success: boolean, message: string} | null>(null);
  const [dbConnectionChecking, setDbConnectionChecking] = useState(false);
  const [userDataResults, setUserDataResults] = useState<any>(null);
  const [accessCheckResults, setAccessCheckResults] = useState<any>(null);
  const [checkingAccess, setCheckingAccess] = useState(false);

  console.log("DiagnosticsPanel - currentOrganization:", currentOrganization);
  console.log("DiagnosticsPanel - user:", user);
  console.log("DiagnosticsPanel - orgId:", orgId);

  // وظيفة للتحقق من اتصال قاعدة البيانات
  const handleCheckDbConnection = async () => {
    try {
      setDbConnectionChecking(true);
      const result = await checkDatabaseConnection();
      console.log("Database connection check result:", result);
      setDbConnectionStatus({
        success: result.success,
        message: result.success ? 'تم الاتصال بقاعدة البيانات بنجاح' : `فشل الاتصال: ${result.error}`
      });
    } catch (error) {
      console.error("Error checking database connection:", error);
      setDbConnectionStatus({
        success: false,
        message: `خطأ غير متوقع: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`
      });
    } finally {
      setDbConnectionChecking(false);
    }
  };

  // وظيفة للتحقق من وصول المستخدم إلى المؤسسة
  const handleCheckAccess = async () => {
    if (!user?.id || !orgId) {
      toast.error("معرف المستخدم أو المؤسسة غير متوفر");
      return;
    }

    try {
      setCheckingAccess(true);
      const result = await checkOrganizationAccess(user.id, orgId);
      console.log("Organization access check result:", result);
      setAccessCheckResults(result);
      toast.success(result.hasAccess ? 
        "لديك صلاحية الوصول إلى هذه المؤسسة" : 
        "ليس لديك صلاحية الوصول إلى هذه المؤسسة");
    } catch (error) {
      console.error("Error checking organization access:", error);
      toast.error(`خطأ في التحقق من صلاحيات الوصول: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
    } finally {
      setCheckingAccess(false);
    }
  };

  // وظيفة لاختبار جلب بيانات المستخدم
  const handleTestUserData = async () => {
    if (!user?.id) {
      toast.error("معرف المستخدم غير متوفر");
      return;
    }

    try {
      const result = await testUserData(user.id);
      console.log("User data test result:", result);
      setUserDataResults(result);
      if (result.success) {
        toast.success("تم جلب بيانات المستخدم بنجاح");
      } else {
        toast.error(`فشل جلب بيانات المستخدم: ${result.error}`);
      }
    } catch (error) {
      console.error("Error testing user data:", error);
      toast.error(`خطأ في اختبار بيانات المستخدم: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
    }
  };

  // وظيفة لحذف معرف المؤسسة من التخزين المحلي
  const handleClearLocalOrgId = () => {
    try {
      localStorage.removeItem('bazaar_organization_id');
      console.log("تم حذف معرف المؤسسة من التخزين المحلي");
      toast.success("تم حذف معرف المؤسسة من التخزين المحلي. سيتم إعادة تحميل الصفحة...");
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("خطأ في حذف معرف المؤسسة:", error);
      toast.error("حدث خطأ أثناء حذف معرف المؤسسة");
    }
  };

  if (!isVisible) {
    return (
      <button 
        onClick={() => setIsVisible(true)}
        className="fixed left-4 bottom-4 p-2 bg-blue-500 text-white rounded-full z-50"
      >
        ℹ️
      </button>
    );
  }

  const handleCreateTestProduct = async () => {
    try {
      setIsCreating(true);
      await createTestProduct();
    } finally {
      setIsCreating(false);
    }
  };

  const handleRefreshContexts = async () => {
    try {
      console.log("===== بدء تحديث السياقات يدوياً =====");
      // أولاً، تحديث سياق المؤسسة
      await refreshOrganizationData();
      // ثم، تحديث سياق المتجر بعد تأخير قصير للتأكد من تحديث سياق المؤسسة أولاً
      setTimeout(() => {
        refreshData();
      }, 300);
      console.log("===== تم طلب تحديث السياقات =====");
    } catch (error) {
      console.error("خطأ في تحديث السياقات:", error);
    }
  };

  const handleSaveOrgIdManually = () => {
    try {
      if (currentOrganization?.id) {
        localStorage.setItem('bazaar_organization_id', currentOrganization.id);
        console.log("تم حفظ معرف المؤسسة يدوياً:", currentOrganization.id);
        toast.success("تم حفظ معرف المؤسسة بنجاح. جاري إعادة تحميل الصفحة...");
        
        // إعادة تحميل الصفحة بعد ثانية واحدة
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        console.error("لا يمكن حفظ معرف المؤسسة: المعرف غير متوفر");
        toast.error("لا يمكن حفظ معرف المؤسسة: المعرف غير متوفر");
      }
    } catch (error) {
      console.error("خطأ في حفظ معرف المؤسسة:", error);
      toast.error("حدث خطأ أثناء حفظ معرف المؤسسة");
    }
  };

  // وظيفة للتحقق من تطابق معرف المؤسسة المخزن مع المعرف الحالي
  const checkIfOrgIdMatches = () => {
    const storedOrgId = localStorage.getItem('bazaar_organization_id');
    if (!storedOrgId) {
      toast.error("لا يوجد معرف مؤسسة مخزن محلياً");
      return;
    }
    
    if (!currentOrganization?.id) {
      toast.error("لا يوجد معرف مؤسسة حالي للمقارنة");
      return;
    }
    
    if (storedOrgId === currentOrganization.id) {
      toast.success("المعرف المخزن يتطابق مع معرف المؤسسة الحالي");
    } else {
      toast.error("المعرف المخزن لا يتطابق مع معرف المؤسسة الحالي");
      console.log("المعرف المخزن:", storedOrgId);
      console.log("معرف المؤسسة الحالي:", currentOrganization.id);
    }
  };

  return (
    <div className="fixed left-4 bottom-4 p-4 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-w-md text-right overflow-auto max-h-[80vh]">
      <button 
        onClick={() => setIsVisible(false)}
        className="absolute left-2 top-2 text-gray-700"
      >
        ✕
      </button>
      <h3 className="font-bold text-lg mb-2">معلومات تشخيصية</h3>
      
      <div className="mb-3">
        <h4 className="font-semibold">المستخدم:</h4>
        <p>تحميل: {authLoading ? "جاري" : "مكتمل"}</p>
        <p>معرف: {user?.id || "غير مسجل"}</p>
        <p>البريد: {user?.email || "غير متوفر"}</p>
      </div>
      
      <div className="mb-3">
        <h4 className="font-semibold">النطاق الفرعي:</h4>
        <p>{currentSubdomain || "لا يوجد نطاق فرعي"}</p>
      </div>
      
      <div className="mb-3 bg-blue-50 p-2 rounded-md">
        <h4 className="font-semibold">المؤسسة:</h4>
        <p>تحميل: {tenantLoading ? "جاري" : "مكتمل"}</p>
        <p>معرف السياق: {currentOrganization?.id || "غير متوفر"}</p>
        <p>معرف المحلي: <span className={orgId ? "text-green-600 font-bold" : "text-red-600"}>{orgId || "غير متوفر"}</span></p>
        <p>الاسم: {currentOrganization?.name || "غير متوفر"}</p>
        <p>النطاق الفرعي: {currentOrganization?.subdomain || "غير متوفر"}</p>
        
        {orgId && currentOrganization?.id && orgId !== currentOrganization.id && (
          <div className="mt-2 p-2 bg-red-100 rounded-md text-red-700">
            <p className="font-bold">⚠️ تحذير: عدم تطابق معرف المؤسسة!</p>
            <p>المعرف المخزن: {orgId}</p>
            <p>المعرف الصحيح: {currentOrganization.id}</p>
            <button
              onClick={handleSaveOrgIdManually}
              className="bg-red-600 text-white px-3 py-1 mt-1 rounded-md text-sm w-full"
            >
              إصلاح المشكلة: تحديث المعرف
            </button>
          </div>
        )}
      </div>

      {dbConnectionStatus && (
        <div className={`mb-3 p-2 rounded-md ${dbConnectionStatus.success ? "bg-green-50" : "bg-red-50"}`}>
          <h4 className="font-semibold">حالة اتصال قاعدة البيانات:</h4>
          <p>{dbConnectionStatus.message}</p>
        </div>
      )}

      {accessCheckResults && (
        <div className={`mb-3 p-2 rounded-md ${accessCheckResults.hasAccess ? "bg-green-50" : "bg-red-50"}`}>
          <h4 className="font-semibold">نتيجة فحص صلاحيات الوصول:</h4>
          <p>النتيجة: {accessCheckResults.hasAccess ? "لديك صلاحية الوصول" : "ليس لديك صلاحية الوصول"}</p>
          {accessCheckResults.error && <p>الخطأ: {accessCheckResults.error}</p>}
        </div>
      )}

      {userDataResults && (
        <div className={`mb-3 p-2 rounded-md ${userDataResults.success ? "bg-green-50" : "bg-red-50"}`}>
          <h4 className="font-semibold">نتيجة اختبار بيانات المستخدم:</h4>
          <p>النتيجة: {userDataResults.success ? "تم جلب البيانات بنجاح" : "فشل جلب البيانات"}</p>
          {userDataResults.error && <p>الخطأ: {userDataResults.error}</p>}
          {userDataResults.userData && (
            <div className="mt-1 text-xs">
              <p>الدور: {userDataResults.userData.role}</p>
              <p>معرف المؤسسة: {userDataResults.userData.organization_id}</p>
            </div>
          )}
        </div>
      )}

      <div className="mb-3">
        <h4 className="font-semibold">أدوات تشخيصية:</h4>
        <div className="flex flex-col gap-2 mt-2">
          <button
            onClick={handleCheckDbConnection}
            disabled={dbConnectionChecking}
            className="bg-indigo-500 text-white px-3 py-1 rounded-md text-sm disabled:bg-gray-300"
          >
            {dbConnectionChecking ? "جاري التحقق..." : "التحقق من اتصال قاعدة البيانات"}
          </button>

          <button
            onClick={handleCheckAccess}
            disabled={checkingAccess || !user?.id || !orgId}
            className="bg-teal-500 text-white px-3 py-1 rounded-md text-sm disabled:bg-gray-300"
          >
            {checkingAccess ? "جاري التحقق..." : "فحص صلاحيات الوصول"}
          </button>

          <button
            onClick={handleTestUserData}
            disabled={!user?.id}
            className="bg-pink-500 text-white px-3 py-1 rounded-md text-sm disabled:bg-gray-300"
          >
            اختبار جلب بيانات المستخدم
          </button>
          
          <button
            onClick={checkIfOrgIdMatches}
            className="bg-amber-500 text-white px-3 py-1 rounded-md text-sm"
          >
            التحقق من تطابق معرف المؤسسة
          </button>
          
          <button
            onClick={handleRefreshContexts}
            className="bg-yellow-500 text-white px-3 py-1 rounded-md text-sm"
          >
            تحديث السياقات يدوياً
          </button>
          
          <button
            onClick={handleCreateTestProduct}
            disabled={isCreating || !orgId}
            className="bg-green-500 text-white px-3 py-1 rounded-md text-sm disabled:bg-gray-300"
          >
            {isCreating ? "جاري الإنشاء..." : "إنشاء منتج اختباري"}
          </button>
          
          <button
            onClick={handleSaveOrgIdManually}
            className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm"
          >
            حفظ معرف المؤسسة يدوياً
          </button>
          
          <button
            onClick={handleClearLocalOrgId}
            className="bg-red-500 text-white px-3 py-1 rounded-md text-sm"
          >
            حذف معرف المؤسسة المخزن
          </button>
          
          <button
            onClick={() => window.location.reload()}
            className="bg-purple-500 text-white px-3 py-1 rounded-md text-sm"
          >
            إعادة تحميل الصفحة
          </button>
        </div>
      </div>
      
      <div className="border-t border-gray-200 pt-2 mt-3">
        <p className="text-xs text-gray-600">إذا ظهرت لوحة التحكم فارغة، تأكد من أن معرف المؤسسة متوفر وأنك قمت بإنشاء منتج اختباري على الأقل.</p>
      </div>
    </div>
  );
};

// دالة للحصول على إحصائيات لوحة التحكم من API
const getDashboardStats = async (
  orgId: string,
  period: AnalyticsPeriod = 'month',
  startDate?: Date,
  endDate?: Date
): Promise<DashboardStats | null> => {
  try {
    console.log("جلب إحصائيات لوحة التحكم للمؤسسة:", orgId, "للفترة:", period);
    
    if (!orgId) {
      console.error("معرف المؤسسة مفقود");
      return null;
    }
    
    // استخدام API التحليلات للحصول على البيانات
    const analyticsData = await getAllAnalytics(orgId, period, startDate, endDate);
    
    if (!analyticsData) {
      console.error("فشل في الحصول على بيانات التحليلات");
      return null;
    }

    console.log("===== بيانات التحليلات المستلمة =====");
    console.log("إجمالي المبيعات:", analyticsData.totalSales);
    console.log("إجمالي الطلبات:", analyticsData.totalOrders);
    console.log("إجمالي الأرباح:", analyticsData.totalProfit);
    console.log("================================");
    
    // تحويل بيانات التحليلات إلى تنسيق DashboardStats
    const dashboardStats: DashboardStats = {
      sales: {
        daily: period === 'day' ? analyticsData.totalSales : analyticsData.totalSales / 30, // تقريبي
        weekly: period === 'week' ? analyticsData.totalSales : analyticsData.totalSales / 4, // تقريبي
        monthly: period === 'month' ? analyticsData.totalSales : analyticsData.totalSales,
        annual: period === 'year' ? analyticsData.totalSales : analyticsData.totalSales * 12 // تقريبي
      },
      revenue: {
        daily: period === 'day' ? analyticsData.totalSales : analyticsData.totalSales / 30, // تقريبي
        weekly: period === 'week' ? analyticsData.totalSales : analyticsData.totalSales / 4, // تقريبي
        monthly: period === 'month' ? analyticsData.totalSales : analyticsData.totalSales,
        annual: period === 'year' ? analyticsData.totalSales : analyticsData.totalSales * 12 // تقريبي
      },
      profits: {
        daily: period === 'day' ? analyticsData.totalProfit : analyticsData.totalProfit / 30, // تقريبي
        weekly: period === 'week' ? analyticsData.totalProfit : analyticsData.totalProfit / 4, // تقريبي
        monthly: period === 'month' ? analyticsData.totalProfit : analyticsData.totalProfit,
        annual: period === 'year' ? analyticsData.totalProfit : analyticsData.totalProfit * 12 // تقريبي
      },
      orders: {
        pending: Math.round(analyticsData.totalOrders * 0.1), // تقريبي - 10% من الطلبات قيد الانتظار
        processing: Math.round(analyticsData.totalOrders * 0.2), // تقريبي - 20% من الطلبات قيد المعالجة
        completed: Math.round(analyticsData.totalOrders * 0.7), // تقريبي - 70% من الطلبات مكتملة
        total: analyticsData.totalOrders
      },
      inventory: {
        totalProducts: analyticsData.inventory.totalItems,
        lowStock: analyticsData.inventory.lowStock,
        outOfStock: analyticsData.inventory.outOfStock
      },
      customers: {
        total: Math.round(analyticsData.totalOrders * 0.8), // تقريبي - تقدير إجمالي العملاء
        new: Math.round(analyticsData.totalOrders * 0.2) // تقريبي - تقدير العملاء الجدد
      }
    };
    
    console.log("===== إحصائيات لوحة التحكم النهائية =====");
    console.log("المبيعات:", dashboardStats.sales);
    console.log("الإيرادات:", dashboardStats.revenue);
    console.log("الأرباح:", dashboardStats.profits);
    console.log("الطلبات:", dashboardStats.orders);
    console.log("=====================================");
    
    return dashboardStats;
  } catch (error) {
    console.error("خطأ في الحصول على إحصائيات لوحة التحكم:", error);
    return null;
  }
};

// توليد بيانات فارغة للوحة التحكم
const getEmptyDashboardStats = (): DashboardStats => {
  console.log("استخدام بيانات فارغة للوحة التحكم");
  return {
    sales: {
      daily: 0,
      weekly: 0,
      monthly: 0,
      annual: 0
    },
    revenue: {
      daily: 0,
      weekly: 0,
      monthly: 0,
      annual: 0
    },
    profits: {
      daily: 0,
      weekly: 0,
      monthly: 0,
      annual: 0
    },
    orders: {
      pending: 0,
      processing: 0,
      completed: 0,
      total: 0
    },
    inventory: {
      totalProducts: 0,
      lowStock: 0,
      outOfStock: 0
    },
    customers: {
      total: 0,
      new: 0
    }
  };
};

// دالة لجلب بيانات لوحة التحكم باستخدام React Query
const fetchDashboardStats = async (orgId: string, period: AnalyticsPeriod, startDate?: Date, endDate?: Date): Promise<DashboardStats> => {
  if (!orgId) {
    console.log("No organization ID available, returning empty stats");
    return getEmptyDashboardStats();
  }

  try {
    console.log("Fetching dashboard stats for organization:", orgId);
    const statsData = await getDashboardStats(orgId, period, startDate, endDate);
    return statsData || getEmptyDashboardStats();
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return getEmptyDashboardStats();
  }
};

// دالة لجلب المنتجات باستخدام React Query
const fetchProducts = async (orgId: string) => {
  if (!orgId) return [];
  try {
    return await getProducts(orgId) || [];
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
};

// دالة لجلب الطلبات باستخدام React Query
const fetchOrders = async (orgId: string) => {
  if (!orgId) return [];
  try {
    const supabaseOrders = await getOrders(orgId) || [];
    // تحويل بيانات الطلبات من Supabase إلى نوع Order
    return supabaseOrders.map(order => ({
      id: order.id,
      customerId: order.customer_id,
      items: [], // نحتاج إلى جلب عناصر الطلب بشكل منفصل إذا لزم الأمر
      subtotal: order.subtotal,
      tax: order.tax,
      discount: order.discount || 0,
      total: order.total,
      status: order.status as any,
      paymentMethod: order.payment_method,
      paymentStatus: order.payment_status as any,
      notes: order.notes || '',
      isOnline: order.is_online,
      createdAt: new Date(order.created_at),
      updatedAt: new Date(order.updated_at)
    })) as Order[];
  } catch (error) {
    console.error("Error fetching orders:", error);
    return [];
  }
};

const Dashboard = () => {
  const [timeframe, setTimeframe] = useState<TimeframeType>('monthly');
  const { currentOrganization, isLoading: orgLoading } = useTenant();
  const { currentSubdomain, user } = useAuth();
  const [isDiagnosticsVisible, setIsDiagnosticsVisible] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const queryClient = useQueryClient();
  const [customDateRange, setCustomDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(new Date().setDate(new Date().getDate() - 30)),
    end: new Date(),
  });
  
  // استخدام مرجع لمعرف المؤسسة لتجنب إعادة التصيير غير الضرورية
  const orgId = currentOrganization?.id || null;

  // تحويل timeframe إلى نوع AnalyticsPeriod
  const getAnalyticsPeriod = useCallback((): AnalyticsPeriod => {
    return timeframeToAnalyticsPeriod(timeframe);
  }, [timeframe]);
  
  // استخدام React Query لجلب الإحصائيات
  const { 
    data: stats, 
    isLoading: isStatsLoading,
    error: statsError
  } = useQuery({
    queryKey: ['dashboardStats', orgId, getAnalyticsPeriod(), customDateRange.start, customDateRange.end],
    queryFn: () => fetchDashboardStats(orgId as string, getAnalyticsPeriod(), customDateRange.start, customDateRange.end),
    enabled: !!orgId && !orgLoading,
    staleTime: 5 * 60 * 1000, // 5 دقائق قبل اعتبار البيانات قديمة
    gcTime: 30 * 60 * 1000, // 30 دقيقة قبل حذف البيانات من الذاكرة المؤقتة
  });
  
  // استخدام React Query لجلب المنتجات
  const { 
    data: products = [], 
    isLoading: isProductsLoading
  } = useQuery({
    queryKey: ['products', orgId],
    queryFn: () => fetchProducts(orgId as string),
    enabled: !!orgId && !orgLoading,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
  
  // استخدام React Query لجلب الطلبات
  const { 
    data: orders = [], 
    isLoading: isOrdersLoading
  } = useQuery({
    queryKey: ['orders', orgId],
    queryFn: () => fetchOrders(orgId as string),
    enabled: !!orgId && !orgLoading,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
  
  // جمع حالات التحميل من جميع الاستعلامات
  const isLoading = isStatsLoading || isProductsLoading || isOrdersLoading || orgLoading;
  
  // إضافة وظيفة لتبديل حالة الـ sidebar
  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };
  
  // معالج تغيير الفترة الزمنية
  const handleTimeframeChange = (newTimeframe: TimeframeType) => {
    console.log("تغيير الفترة الزمنية إلى:", newTimeframe);
    setTimeframe(newTimeframe);
  };

  // معالج تغيير الفترة الزمنية المخصصة
  const handleCustomDateChange = (startDate: Date, endDate: Date) => {
    console.log("تغيير نطاق التاريخ المخصص:", { startDate, endDate });
    setCustomDateRange({
      start: startDate,
      end: endDate
    });
  };
  
  // دالة منفصلة لإنشاء منتج اختباري
  const createTestProduct = async () => {
    console.log("createTestProduct function called");
    try {
      if (!orgId) {
        console.error("معرف المؤسسة غير متوفر. يرجى الانتظار لاكتمال تحميل بيانات المؤسسة");
        toast.error("معرف المؤسسة غير متوفر. يرجى الانتظار لاكتمال تحميل بيانات المؤسسة");
        return;
      }
      
      console.log("إنشاء منتج اختباري للمؤسسة:", orgId);
      
      let categoryId;
      
      console.log("Checking for product categories");
      const { data: categories, error: catError } = await supabase
        .from('product_categories')
        .select('id')
        .eq('organization_id', orgId)
        .limit(1);
      
      console.log("Categories query result:", categories);
      console.log("Categories query error:", catError);
      
      if (catError) {
        console.error("خطأ في التحقق من فئات المنتجات:", catError);
        throw catError;
      }
      
      if (categories?.length === 0 || !categories) {
        console.log("إنشاء فئة منتجات جديدة");
        const { data: newCat, error: newCatError } = await supabase
          .from('product_categories')
          .insert({
            name: 'فئة افتراضية',
            slug: 'default-category',
            organization_id: orgId
          })
          .select('id')
          .single();
          
        console.log("New category creation result:", newCat);
        console.log("New category creation error:", newCatError);
          
        if (newCatError) {
          console.error("خطأ في إنشاء فئة المنتجات:", newCatError);
          throw newCatError;
        }
        
        categoryId = newCat.id;
      } else {
        categoryId = categories[0].id;
      }
      
      // إنشاء اسم وسلاج للمنتج
      const productName = `منتج اختباري ${new Date().toLocaleTimeString()}`;
      // إنشاء slug من الاسم باستبدال المسافات بعلامات - وإزالة الأحرف الخاصة
      const productSlug = `test-product-${Math.floor(Math.random() * 10000)}`;
      
      // إنشاء منتج اختباري
      console.log("Creating test product with category ID:", categoryId);
      const testProduct: InsertProduct = {
        name: productName,
        description: 'هذا منتج اختباري تم إنشاؤه لأغراض التشخيص',
        price: 100,
        purchase_price: 70,
        stock_quantity: 10,
        sku: `TEST-${Math.floor(Math.random() * 10000)}`,
        category_id: categoryId,
        organization_id: orgId,
        images: [],
        thumbnail_image: '',
        is_digital: false,
        slug: productSlug,
        // إضافة الحقول المطلوبة
        allow_retail: true,
        allow_wholesale: false,
        allow_partial_wholesale: false,
        is_featured: false,
        is_new: true,
        has_variants: false,
        show_price_on_landing: true,
        features: [],
        specifications: {}
      };
      
      const createdProduct = await createProduct(testProduct);
      console.log("تم إنشاء المنتج بنجاح:", createdProduct);
      
      toast.success("تم إنشاء منتج اختباري بنجاح");
      
      // إعادة تحميل المنتجات
      const productsData = await getProducts(orgId);
      return productsData || [];
    } catch (error) {
      console.error("Error creating test product:", error);
      toast.error("حدث خطأ أثناء إنشاء المنتج الاختباري");
    }
  };
  
  // عرض بيانات التشخيص بدون إعادة تصيير الصفحة
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log("=========== معلومات تشخيصية ===========");
      console.log("النطاق الفرعي:", currentSubdomain);
      console.log("معرف المؤسسة:", currentOrganization?.id);
      console.log("اسم المؤسسة:", currentOrganization?.name);
      console.log("النطاق الفرعي للمؤسسة:", currentOrganization?.subdomain);
      console.log("تحميل المؤسسة:", orgLoading ? "جاري" : "مكتمل");
      console.log("=======================================");
    }
  }, [currentOrganization, currentSubdomain, orgLoading]);
  
  // Low stock products - محاولة تحسين الأداء
  const lowStockProducts = Array.isArray(products)
    ? products.filter(product => product.stock_quantity <= 5 && product.stock_quantity > 0)
      .slice(0, 5)
    : [];
  
  // Recent orders - محاولة تحسين الأداء
  const recentOrders = orders?.slice(0, 5) || [];
  
  // Revenue data
  const revenueData = [
    { month: 'يناير', revenue: 25000 },
    { month: 'فبراير', revenue: 30000 },
    { month: 'مارس', revenue: 35000 },
    { month: 'أبريل', revenue: 40000 },
    { month: 'مايو', revenue: 45000 },
    { month: 'يونيو', revenue: 42000 },
    { month: 'يوليو', revenue: 48000 },
    { month: 'أغسطس', revenue: 52000 },
    { month: 'سبتمبر', revenue: 55000 },
    { month: 'أكتوبر', revenue: 58000 },
    { month: 'نوفمبر', revenue: 62000 },
    { month: 'ديسمبر', revenue: 68000 }
  ];
  
  // قائمة الروابط السريعة للصفحات المهمة
  const quickAccessPages = [
    {
      title: 'نقطة البيع',
      icon: Store,
      href: '/dashboard/pos',
      color: 'bg-blue-500',
      description: 'إدارة المبيعات والمدفوعات'
    },
    {
      title: 'المنتجات',
      icon: Package,
      href: '/dashboard/products',
      color: 'bg-purple-500',
      description: 'إدارة المنتجات والعروض'
    },
    {
      title: 'المخزون',
      icon: Database,
      href: '/dashboard/inventory',
      color: 'bg-yellow-500',
      description: 'متابعة المخزون والكميات',
      requiredPermission: 'viewInventory'
    },
    {
      title: 'الخدمات',
      icon: Wrench,
      href: '/dashboard/services',
      color: 'bg-green-500',
      description: 'إدارة خدمات الصيانة'
    },
    {
      title: 'متابعة الخدمات',
      icon: Calendar,
      href: '/dashboard/service-tracking',
      color: 'bg-teal-500',
      description: 'جدولة وتتبع الخدمات'
    },
    {
      title: 'الفئات',
      icon: Tag,
      href: '/dashboard/categories',
      color: 'bg-indigo-500',
      description: 'تصنيف المنتجات والخدمات'
    },
    {
      title: 'المبيعات',
      icon: DollarSign,
      href: '/dashboard/sales',
      color: 'bg-emerald-500',
      description: 'متابعة إحصائيات المبيعات'
    },
    {
      title: 'الطلبات',
      icon: ShoppingBag,
      href: '/dashboard/orders',
      color: 'bg-red-500',
      description: 'إدارة طلبات العملاء'
    },
    {
      title: 'الفواتير',
      icon: FileText,
      href: '/dashboard/invoices',
      color: 'bg-orange-500',
      description: 'عرض وطباعة الفواتير'
    },
    {
      title: 'الموردين',
      icon: Truck,
      href: '/dashboard/suppliers',
      color: 'bg-cyan-500',
      description: 'إدارة الموردين والمشتريات'
    },
    {
      title: 'العملاء',
      icon: Users,
      href: '/dashboard/customers',
      color: 'bg-pink-500',
      description: 'إدارة بيانات العملاء'
    },
    {
      title: 'الموظفين',
      icon: User,
      href: '/dashboard/employees',
      color: 'bg-amber-500',
      description: 'إدارة فريق العمل'
    },
    {
      title: 'المصروفات',
      icon: Receipt,
      href: '/dashboard/expenses',
      color: 'bg-lime-500',
      description: 'تسجيل وتتبع المصروفات'
    },
    {
      title: 'التقارير المالية',
      icon: FileBarChart,
      href: '/dashboard/reports',
      color: 'bg-sky-500',
      description: 'تقارير الأرباح والخسائر'
    },
    {
      title: 'التحليلات',
      icon: BarChart3,
      href: '/dashboard/analytics',
      color: 'bg-violet-500',
      description: 'تحليل أداء المبيعات'
    },
    {
      title: 'الفليكسي',
      icon: Phone,
      href: '/dashboard/flexi-management',
      color: 'bg-fuchsia-500',
      description: 'إدارة بطاقات الفليكسي'
    },
    {
      title: 'الإعدادات',
      icon: Settings,
      href: '/dashboard/settings',
      color: 'bg-gray-500',
      description: 'إعدادات النظام'
    },
    {
      title: 'إعدادات المؤسسة',
      icon: Building,
      href: '/dashboard/organization',
      color: 'bg-blue-700',
      description: 'تخصيص بيانات المؤسسة'
    },
  ];

  // إضافة وظيفة لتحديث البيانات يدوياً
  const refreshDashboard = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    toast.success("تم تحديث بيانات لوحة التحكم");
  };

  return (
    <Layout>
      <div className="container px-4 sm:px-6 mx-auto max-w-7xl">
        <Suspense fallback={<ComponentLoader />}>
          <DashboardHeader 
            toggleSidebar={toggleSidebar} 
            onTimeframeChange={handleTimeframeChange} 
            onCustomDateChange={handleCustomDateChange}
          />
        
          {/* إضافة إشعار الفترة التجريبية */}
          <TrialNotification />
        </Suspense>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="mt-4 text-muted-foreground">جاري تحميل بيانات لوحة التحكم...</p>
          </div>
        ) : statsError ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] bg-card p-6 rounded-lg shadow-sm border">
            <p className="text-red-500 font-medium text-lg">حدث خطأ أثناء تحميل البيانات</p>
            <button
              onClick={refreshDashboard}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : (
          stats ? (
            <div className="space-y-8">
              <Suspense fallback={<ComponentLoader />}>
                {/* عرض الإحصائيات الرئيسية */}
                <div className="bg-card p-6 rounded-lg shadow-sm border">
                  <StatsGrid 
                    sales={stats.sales}
                    revenue={stats.revenue}
                    profits={stats.profits}
                    orders={stats.orders}
                    timeframe={timeframe}
                  />
                </div>
              </Suspense>

              {/* قسم الوصول السريع للصفحات المهمة */}
              <div className="bg-card p-6 rounded-lg shadow-sm border space-y-5">
                <div className="flex justify-between items-center pb-3 border-b">
                  <h2 className="text-xl font-bold">الصفحات الرئيسية</h2>
                  <p className="text-sm text-muted-foreground">الوصول السريع لإدارة متجرك</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {quickAccessPages
                    .filter(page => !page.requiredPermission || checkUserPermissions(user, page.requiredPermission as any))
                    .map((page, index) => (
                    <Link 
                      key={index} 
                      to={page.href}
                      className="group flex flex-col h-full p-5 rounded-lg border border-border hover:border-primary/50 bg-background hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-center gap-4 mb-3">
                        <div className={`w-12 h-12 rounded-lg ${page.color} text-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-200`}>
                          <page.icon className="h-6 w-6" />
                        </div>
                        <h3 className="font-semibold text-lg group-hover:text-primary transition-colors duration-200">{page.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mt-auto">{page.description}</p>
                    </Link>
                  ))}
                </div>
              </div>
              
              {/* عرض الرسم البياني للإيرادات والأقسام الإضافية */}
              <Suspense fallback={<ComponentLoader />}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-card p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-medium mb-4">تحليل المبيعات</h3>
                    <RevenueChart data={revenueData} />
                  </div>
                  <div className="bg-card p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-medium mb-4">حالة الطلبات</h3>
                    <OrderStatusCard stats={stats.orders} />
                  </div>
                </div>
                
                {/* عرض المنتجات منخفضة المخزون والطلبات الأخيرة */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                  <div className="bg-card p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-medium mb-4">المنتجات منخفضة المخزون</h3>
                    <LowStockCard products={lowStockProducts} />
                  </div>
                  <div className="bg-card p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-medium mb-4">آخر الطلبات</h3>
                    <RecentOrdersCard orders={recentOrders} />
                  </div>
                </div>
              </Suspense>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-card p-6 rounded-lg shadow-sm border">
              <p className="text-muted-foreground text-lg">لا توجد بيانات متاحة للوحة التحكم.</p>
              <button
                onClick={refreshDashboard}
                className="mt-5 px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                تحديث البيانات
              </button>
            </div>
          )
        )}
      </div>
      
      {/* مكون الدياجنوستكس لتشخيص المشاكل */}
      {isDiagnosticsVisible && (
        <DiagnosticsPanel 
          isVisible={isDiagnosticsVisible} 
          setIsVisible={setIsDiagnosticsVisible}
          createTestProduct={createTestProduct}
          orgId={orgId}
        />
      )}
    </Layout>
  );
};

export default Dashboard;
