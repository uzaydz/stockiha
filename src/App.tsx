import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { Routes, Route, useLocation } from "react-router-dom";
import { ShopProvider } from "./context/ShopContext";
import { HelmetProvider } from "react-helmet-async";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import SuperAdminRoute from "./components/auth/SuperAdminRoute";
import SubscriptionCheck from "./components/subscription/SubscriptionCheck";
import { SupabaseProvider } from "./context/SupabaseContext";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import Features from "./pages/Features";
import OfflineFeatures from "./pages/OfflineFeatures";
import POSFeaturesPage from "./pages/POSFeaturesPage";
import OnlineStorePage from "./pages/features/OnlineStorePage";
import AdvancedAnalyticsFeaturesPage from "./pages/AdvancedAnalyticsFeaturesPage";
import ContactPage from "./pages/ContactPage";
import NotFound from "./pages/NotFound";
import LoginForm from "./components/auth/LoginForm";
import Signup from "./pages/Signup";
import AdminSignup from "./pages/AdminSignup";
import TenantSignup from "./pages/TenantSignup";
import Products from "./pages/dashboard/Products";
import Inventory from "./pages/dashboard/Inventory";
import Categories from "@/pages/dashboard/Categories";
import Services from "@/pages/dashboard/Services";
import Sales from '@/pages/dashboard/Sales';
import Orders from '@/pages/dashboard/Orders';
import Expenses from '@/pages/dashboard/Expenses';
import Analytics from '@/pages/dashboard/Analytics';
import ServiceTrackingPage from './pages/ServiceTrackingPage';
import ServiceRequestsPage from './pages/dashboard/ServiceRequestsPage';
import PublicServiceTrackingPage from './pages/PublicServiceTrackingPage';
import Customers from '@/pages/dashboard/Customers';
import CustomerDebts from '@/pages/dashboard/CustomerDebts';
import CustomerDebtDetails from './pages/dashboard/CustomerDebtDetails';
import PaymentHistory from './pages/dashboard/PaymentHistory';
import Employees from '@/pages/dashboard/Employees';
import OrganizationSetup from './pages/OrganizationSetup';
import OrganizationSettings from './pages/dashboard/OrganizationSettings';
import SettingsPage from './pages/dashboard/settings';
import RequireTenant from './components/auth/RequireTenant';
import LandingPage from './pages/landing/LandingPage';
import ProductPurchase from './pages/ProductPurchase';
import StoreProducts from './pages/StoreProducts';
import Invoices from './pages/dashboard/Invoices';
import FinancialReports from './pages/dashboard/reports';
import FlexiManagement from './pages/dashboard/FlexiManagement';
import FlexiSales from './pages/dashboard/FlexiSales';
import FlexiAnalytics from './pages/dashboard/FlexiAnalytics';
import SuppliersManagement from '@/pages/dashboard/SuppliersManagement';
import SupplierPurchases from '@/pages/dashboard/SupplierPurchases';
import SupplierReports from '@/pages/dashboard/SupplierReports';
import SupplierPayments from './pages/dashboard/SupplierPayments';
import ProductDetails from './pages/ProductDetails';
import PricingPage from "./pages/PricingPage";
import StoreEditor from '@/pages/admin/StoreEditor';

// Super Admin Pages
import SuperAdminDashboard from '@/pages/super-admin/SuperAdminDashboard';
import SuperAdminOrganizations from '@/pages/super-admin/Organizations';
import SuperAdminSubscriptions from '@/pages/super-admin/Subscriptions';
import SuperAdminLogin from './pages/SuperAdminLogin';
import SuperAdminPaymentMethods from '@/pages/super-admin/PaymentMethods';
import ActivationCodesPage from '@/pages/super-admin/activation-codes';
import SuperAdminLayout from '@/components/SuperAdminLayout';

// صفحة الاشتراكات
import SubscriptionPage from "./pages/dashboard/subscription";
import SyncManager from './components/SyncManager';
import PermissionGuard from './components/auth/PermissionGuard';
import useTabFocusEffect from './hooks/useTabFocusEffect';
import useReactQueryState from './hooks/useReactQueryState';
import { isElectron } from '@/lib/isElectron';

// تحقق ما إذا كان التطبيق يعمل في بيئة Electron
const isRunningInElectron = isElectron();

// تكوين QueryClient مع خيارات مناسبة للبيئة (Electron أو متصفح)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // تعطيل التحديث التلقائي في المتصفح وتفعيله فقط في Electron
      refetchOnWindowFocus: false,
      refetchOnReconnect: isRunningInElectron,
      refetchOnMount: isRunningInElectron,
      // جعل فترة طزاجة البيانات قصيرة في Electron ولا نهائية في المتصفح
      staleTime: isRunningInElectron ? 1000 * 60 * 5 : Infinity,
      // الحفاظ على التخزين المؤقت لفترة طويلة
      gcTime: 1000 * 60 * 240,     // الاحتفاظ بالبيانات المخزنة مؤقتًا لمدة 4 ساعات
      retry: 1,                    // عدد محاولات إعادة المحاولة عند فشل الطلب
      retryDelay: 3000,            // تأخير 3 ثوانٍ بين المحاولات
      // تعطيل إعادة المحاولة عند التركيب في المتصفح وتفعيلها في Electron
      retryOnMount: isRunningInElectron,
      structuralSharing: true,     // مشاركة البنية للحفاظ على مراجع الكائنات
    },
    mutations: {
      retry: 1,                    // عدد محاولات إعادة المحاولة للطلبات الكتابية
      retryDelay: 3000,            // تأخير 3 ثوانٍ بين المحاولات
    }
  },
});

// إعداد تخزين حالة الاستعلامات بين تبديل علامات التبويب
if (typeof window !== 'undefined') {
  const localStoragePersister = createSyncStoragePersister({
    storage: window.localStorage,
    key: 'BAZAAR_REACT_QUERY_CACHE',
    throttleTime: 1000, // الوقت بين عمليات الحفظ
  });

  persistQueryClient({
    queryClient,
    persister: localStoragePersister,
    maxAge: 1000 * 60 * 60 * 72, // حفظ البيانات لمدة 3 أيام (72 ساعة)
    buster: import.meta.env.VITE_APP_VERSION || '1.0.0',
    // hydrateOptions: {
    //   // استخدام البيانات المخزنة مؤقتًا مباشرة دون التحقق من صحتها أو إعادة تحميلها
    //   defaultOptions: {
    //     queries: {
    //       // استخدام البيانات المخزنة مباشرة
    //       staleTime: Infinity,
    //     },
    //   },
    // },
    dehydrateOptions: {
      shouldDehydrateQuery: (query) => {
        // حفظ جميع الاستعلامات في التخزين المحلي
        return true;
      },
    },
  });
}

// إضافة مستمع لكشف محاولات إعادة التحميل التلقائية وتجاهلها عند تبديل النوافذ
if (typeof window !== 'undefined') {
  (window as any).__REACT_QUERY_GLOBAL_CLIENT = queryClient;

  // إضافة معالج لتغيير التبويب يناسب البيئة (Electron أو متصفح)
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // في Electron فقط، نقوم بإلغاء صلاحية الاستعلامات الحالية للحصول على أحدث البيانات
      if (isRunningInElectron) {
        console.log('[ReactQuery] تحديث الاستعلامات بعد العودة للنافذة في Electron');
        
        // استئناف الـ mutations قيد التنفيذ
        queryClient.resumePausedMutations();
        
        // إبطال صلاحية الاستعلامات لإعادة تحميلها
        // queryClient.invalidateQueries(); // تم التعليق لمنع إعادة الجلب الفورية عند كل عودة للتبويب في Electron
      } else {
        // في المتصفح، فقط نستأنف المعاملات دون تحديث الاستعلامات
        console.log('[ReactQuery] منع تحديث الاستعلامات في المتصفح عند العودة للنافذة');
        queryClient.resumePausedMutations();
        
        // تأكيد تعطيل التحديث التلقائي في المتصفح
        queryClient.setDefaultOptions({
          queries: {
            refetchOnWindowFocus: false,
            refetchOnMount: false,
            refetchOnReconnect: false,
            staleTime: Infinity,
          }
        });
      }
    } else {
      // تسجيل الابتعاد عن النافذة
      console.log('مغادرة علامة التبويب - إيقاف العمليات غير الضرورية');
      queryClient.cancelQueries();
    }
  });
}

// مكون لتحديد متى يتم عرض مؤشر المزامنة
const SyncManagerWrapper = () => {
  const location = useLocation();
  
  // التحقق إذا كان المسار الحالي هو صفحة لوحة التحكم
  const isDashboardPage = location.pathname.includes('/dashboard') || 
                          location.pathname.includes('/super-admin');
  
  // إظهار SyncManager فقط في صفحات لوحة التحكم وفي بيئة Electron
  if (!isDashboardPage || !isRunningInElectron) {
    return null;
  }
  
  return <SyncManager autoSync={true} syncInterval={60000} showIndicator={true} />;
};

// مكون لمعالجة تبديل علامات التبويب
const TabFocusHandler = ({ children }: { children: React.ReactNode }) => {
  useTabFocusEffect({
    onFocus: () => {
      console.log('عودة إلى علامة التبويب - استخدام البيانات المخزنة مؤقتًا');
      // عند العودة بعد فترة طويلة، يمكن تحديث بعض البيانات الهامة
      // لكن معظم البيانات ستبقى مخزنة وجاهزة للاستخدام
    },
    onBlur: () => {
      console.log('مغادرة علامة التبويب - إيقاف العمليات غير الضرورية');
      // إيقاف أي طلبات قيد التنفيذ
      const queryClient = (window as any).__REACT_QUERY_GLOBAL_CLIENT;
      if (queryClient) {
        queryClient.cancelQueries();
      }
    },
    // اعتبار العودة خلال 5 دقائق عودة سريعة لا تتطلب إعادة تحميل
    fastReturnThreshold: 1000 * 60 * 5
  });
  
  // استخدام الخطاف الجديد للتعامل مع حالة React Query
  useReactQueryState();
  
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <TabFocusHandler>
        <SupabaseProvider>
          <ShopProvider>
            <HelmetProvider>
              <Toaster />
              <Sonner />
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/features" element={<Features />} />
                <Route path="/offline-features" element={<OfflineFeatures />} />
                <Route path="/features/pos" element={<POSFeaturesPage />} />
                <Route path="/features/online-store" element={<OnlineStorePage />} />
                <Route path="/features/advanced-analytics" element={<AdvancedAnalyticsFeaturesPage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/login" element={<LoginForm />} />
                <Route path="/super-admin/login" element={<SuperAdminLogin />} />
                <Route path="/signup" element={<NotFound />} />
                <Route path="/admin/signup" element={<AdminSignup />} />
                <Route path="/tenant/signup" element={<TenantSignup />} />
                
                {/* Super Admin Routes - Protected with SuperAdminRoute */}
                <Route element={<SuperAdminRoute />}>
                  <Route path="/super-admin" element={<SuperAdminDashboard />} />
                  <Route path="/super-admin/organizations" element={<SuperAdminOrganizations />} />
                  <Route path="/super-admin/organizations/requests" element={<SuperAdminOrganizations />} />
                  <Route path="/super-admin/subscriptions" element={<SuperAdminSubscriptions />} />
                  <Route path="/super-admin/payment-methods" element={<SuperAdminPaymentMethods />} />
                  <Route path="/super-admin/activation-codes" element={<ActivationCodesPage />} />
                  <Route path="/super-admin/users" element={<SuperAdminDashboard />} />
                  <Route path="/super-admin/admins" element={<SuperAdminDashboard />} />
                  <Route path="/super-admin/settings" element={<SuperAdminDashboard />} />
                  <Route path="/super-admin/analytics" element={<SuperAdminDashboard />} />
                  <Route path="/super-admin/payments" element={<SuperAdminDashboard />} />
                  <Route path="/super-admin/logs" element={<SuperAdminDashboard />} />
                  <Route path="/super-admin/permissions" element={<SuperAdminDashboard />} />
                </Route>
                
                {/* صفحات عامة للزوار بدون تسجيل دخول */}
                {/* صفحة جميع المنتجات */}
                <Route path="/products" element={<StoreProducts />} />
                
                {/* صفحة تفاصيل المنتج */}
                <Route path="/products/details/:productId" element={<ProductDetails />} />
                
                {/* صفحة شراء المنتج */}
                <Route path="/products/:slug" element={<ProductPurchase />} />
                
                {/* صفحة متابعة الخدمات العامة للعملاء */}
                <Route path="/service-tracking/:trackingId" element={<PublicServiceTrackingPage />} />
                <Route path="/service-tracking-public" element={<PublicServiceTrackingPage />} />
                
                {/* صفحة خدمات الإصلاح العامة */}
                <Route path="/services" element={<PublicServiceTrackingPage />} />

                {/* صفحات إعداد المؤسسة */}
                <Route
                  path="/organization/setup"
                  element={
                    <ProtectedRoute>
                      <OrganizationSetup />
                    </ProtectedRoute>
                  }
                />

                <Route element={<ProtectedRoute />}>
                  {/* صفحات لوحة التحكم التي تتطلب تسجيل الدخول والمؤسسة */}
                  <Route element={<RequireTenant />}>
                    <Route path="/dashboard" element={
                      <SubscriptionCheck>
                        <Dashboard />
                      </SubscriptionCheck>
                    } />
                    
                    {/* صفحة إدارة الاشتراك */}
                    <Route path="/dashboard/subscription" element={<SubscriptionPage />} />
                    
                    <Route path="/dashboard/categories" element={
                      <SubscriptionCheck>
                        <PermissionGuard requiredPermissions={['manageProductCategories']}>
                          <Categories />
                        </PermissionGuard>
                      </SubscriptionCheck>
                    } />
                    <Route path="/dashboard/services" element={
                      <SubscriptionCheck>
                        <Services />
                      </SubscriptionCheck>
                    } />
                    <Route path="/dashboard/sales" element={
                      <SubscriptionCheck>
                        <Sales />
                      </SubscriptionCheck>
                    } />
                    <Route path="/dashboard/orders" element={
                      <SubscriptionCheck>
                        <Orders />
                      </SubscriptionCheck>
                    } />
                    <Route path="/dashboard/expenses" element={
                      <SubscriptionCheck>
                        <PermissionGuard requiredPermissions={['viewFinancialReports']}>
                          <Expenses />
                        </PermissionGuard>
                      </SubscriptionCheck>
                    } />
                    <Route path="/dashboard/analytics" element={
                      <SubscriptionCheck>
                        <PermissionGuard requiredPermissions={['viewSalesReports']}>
                          <Analytics />
                        </PermissionGuard>
                      </SubscriptionCheck>
                    } />
                    <Route path="/dashboard/customers" element={
                      <SubscriptionCheck>
                        <Customers />
                      </SubscriptionCheck>
                    } />
                    <Route path="/dashboard/customer-debts" element={
                      <SubscriptionCheck>
                        <CustomerDebts />
                      </SubscriptionCheck>
                    } />
                    <Route path="/dashboard/customer-debt-details/:customerId" element={
                      <PermissionGuard requiredPermissions={['viewDebts']}>
                        <CustomerDebtDetails />
                      </PermissionGuard>
                    } />
                    <Route path="/dashboard/payment-history" element={
                      <PermissionGuard requiredPermissions={['viewFinancialReports']}>
                        <PaymentHistory />
                      </PermissionGuard>
                    } />
                    <Route path="/dashboard/employees" element={
                      <SubscriptionCheck>
                        <PermissionGuard requiredPermissions={['viewEmployees']}>
                          <Employees />
                        </PermissionGuard>
                      </SubscriptionCheck>
                    } />
                    <Route path="/dashboard/organization" element={
                      <SubscriptionCheck>
                        <OrganizationSettings />
                      </SubscriptionCheck>
                    } />
                    <Route path="/dashboard/invoices" element={
                      <SubscriptionCheck>
                        <Invoices />
                      </SubscriptionCheck>
                    } />
                    <Route path="/dashboard/reports" element={
                      <SubscriptionCheck>
                        <PermissionGuard requiredPermissions={['viewFinancialReports']}>
                          <FinancialReports />
                        </PermissionGuard>
                      </SubscriptionCheck>
                    } />
                    {/* مسارات صفحات الفليكسي والعملات الرقمية */}
                    <Route path="/dashboard/flexi-management" element={
                      <SubscriptionCheck>
                        <PermissionGuard requiredPermissions={['manageFlexiAndDigitalCurrency']}>
                          <FlexiManagement />
                        </PermissionGuard>
                      </SubscriptionCheck>
                    } />
                    <Route path="/dashboard/flexi-sales" element={
                      <SubscriptionCheck>
                        <PermissionGuard requiredPermissions={['sellFlexiAndDigitalCurrency']}>
                          <FlexiSales />
                        </PermissionGuard>
                      </SubscriptionCheck>
                    } />
                    <Route path="/dashboard/flexi-analytics" element={
                      <SubscriptionCheck>
                        <PermissionGuard requiredPermissions={['viewFlexiAndDigitalCurrencySales']}>
                          <FlexiAnalytics />
                        </PermissionGuard>
                      </SubscriptionCheck>
                    } />

                    {/* مسارات إدارة الموردين */}
                    <Route path="/dashboard/suppliers" element={
                      <SubscriptionCheck>
                        <SuppliersManagement />
                      </SubscriptionCheck>
                    } />
                    <Route path="/dashboard/suppliers/purchases" element={
                      <SubscriptionCheck>
                        <SupplierPurchases />
                      </SubscriptionCheck>
                    } />
                    <Route path="/dashboard/suppliers/purchases/new" element={
                      <SubscriptionCheck>
                        <SupplierPurchases />
                      </SubscriptionCheck>
                    } />
                    <Route path="/dashboard/suppliers/purchases/:purchaseId" element={
                      <SubscriptionCheck>
                        <SupplierPurchases />
                      </SubscriptionCheck>
                    } />
                    <Route path="/dashboard/suppliers/purchases/:purchaseId/edit" element={
                      <SubscriptionCheck>
                        <SupplierPurchases />
                      </SubscriptionCheck>
                    } />
                    <Route path="/dashboard/suppliers/payments" element={
                      <SubscriptionCheck>
                        <SupplierPayments />
                      </SubscriptionCheck>
                    } />
                    <Route path="/dashboard/suppliers/payments/new" element={
                      <SubscriptionCheck>
                        <SupplierPayments />
                      </SubscriptionCheck>
                    } />
                    <Route path="/dashboard/suppliers/payments/:paymentId" element={
                      <SubscriptionCheck>
                        <SupplierPayments />
                      </SubscriptionCheck>
                    } />
                    <Route path="/dashboard/suppliers/reports" element={
                      <SubscriptionCheck>
                        <PermissionGuard requiredPermissions={['viewReports']}>
                          <SupplierReports />
                        </PermissionGuard>
                      </SubscriptionCheck>
                    } />

                    {/* صفحة تخصيص المتجر */}
                    <Route path="/dashboard/store-editor" element={
                      <SubscriptionCheck>
                        <StoreEditor />
                      </SubscriptionCheck>
                    } />
                  </Route>
                  
                  {/* صفحات الإعدادات */}
                  <Route path="/dashboard/settings" element={
                    <SubscriptionCheck>
                      <SettingsPage />
                    </SubscriptionCheck>
                  } />
                  <Route path="/dashboard/settings/:section" element={
                    <SubscriptionCheck>
                      <SettingsPage />
                    </SubscriptionCheck>
                  } />
                  
                  {/* إضافة صفحة جديدة في المستقبل */}
                  <Route path="/dashboard/products" element={
                    <SubscriptionCheck>
                      <PermissionGuard requiredPermissions={['viewProducts']}>
                        <Products />
                      </PermissionGuard>
                    </SubscriptionCheck>
                  } />
                  <Route path="/dashboard/inventory" element={
                    <SubscriptionCheck>
                      <PermissionGuard requiredPermissions={['viewInventory']}>
                        <Inventory />
                      </PermissionGuard>
                    </SubscriptionCheck>
                  } />

                  {/* صفحة نقطة البيع */}
                  <Route path="/dashboard/pos" element={
                    <SubscriptionCheck>
                      <PermissionGuard requiredPermissions={['accessPOS']}>
                        <POS />
                      </PermissionGuard>
                    </SubscriptionCheck>
                  } />

                  {/* صفحة متابعة الخدمات */}
                  <Route path="/dashboard/service-tracking" element={
                    <SubscriptionCheck>
                      <PermissionGuard requiredPermissions={['trackServices']}>
                        <ServiceTrackingPage />
                      </PermissionGuard>
                    </SubscriptionCheck>
                  } />
                  
                  {/* صفحة طلبات الخدمات */}
                  <Route path="/dashboard/service-requests" element={
                    <SubscriptionCheck>
                      <PermissionGuard requiredPermissions={['trackServices']}>
                        <ServiceRequestsPage />
                      </PermissionGuard>
                    </SubscriptionCheck>
                  } />
                  
                  <Route path="*" element={<NotFound />} />
                </Route>
                
                <Route path="*" element={<NotFound />} />
              </Routes>
              
              {/* استخدام المكون الجديد بدلاً من SyncManager مباشرة */}
              <SyncManagerWrapper />
            </HelmetProvider>
          </ShopProvider>
        </SupabaseProvider>
      </TabFocusHandler>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
