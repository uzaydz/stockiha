import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import queryClient from "./lib/config/queryClient";
import { Routes, Route, useLocation, useParams, Navigate } from "react-router-dom";
import { useEffect, useState } from 'react';
import { syncCategoriesDataOnStartup } from '@/lib/api/categories';
import { ShopProvider } from "./context/ShopContext";
import { HelmetProvider } from "react-helmet-async";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import SuperAdminRoute from "./components/auth/SuperAdminRoute";
import SubscriptionCheck from "./components/subscription/SubscriptionCheck";
import { SupabaseProvider } from "./context/SupabaseContext";
import SessionMonitor from "./components/SessionMonitor";
import ErrorMonitor from "./components/ErrorMonitor";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import Features from "./pages/Features";
import FeaturesPage from "./pages/landing/FeaturesPage";
import OfflineFeatures from "./pages/OfflineFeatures";
import POSFeaturesPage from "./pages/POSFeaturesPage";
import OnlineStorePage from "./pages/features/OnlineStorePage";
import AdvancedAnalyticsFeaturesPage from "./pages/AdvancedAnalyticsFeaturesPage";
import ContactPage from "./pages/ContactPage";
import ContactLandingPage from "./pages/landing/ContactPage";
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
import POSOrders from '@/pages/POSOrders';
import Expenses from '@/pages/dashboard/Expenses';
import Analytics from '@/pages/dashboard/Analytics';
import ServiceTrackingPage from './pages/ServiceTrackingPage';
import ServiceRequestsPage from './pages/dashboard/ServiceRequestsPage';
import PublicServiceTrackingPage from './pages/PublicServiceTrackingPage';
import AbandonedOrders from '@/pages/dashboard/AbandonedOrders';
import Customers from '@/pages/dashboard/Customers';
import CustomerDebts from '@/pages/dashboard/CustomerDebts';
import CustomerDebtDetails from './pages/dashboard/CustomerDebtDetails';
import PaymentHistory from './pages/dashboard/PaymentHistory';
import Employees from '@/pages/dashboard/Employees';
import OrganizationSetup from './pages/OrganizationSetup';
import OrganizationSettings from './pages/dashboard/OrganizationSettings';
import SettingsPage from './pages/dashboard/settings';
import ShippingSettingsPage from './pages/dashboard/ShippingSettings';
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
import FormSettings from '@/pages/FormSettings';
import FormBuilder from '@/pages/FormBuilder';
import ThankYouPage from '@/pages/ThankYouPage';
import ThankYouPageEditor from '@/pages/dashboard/ThankYouPageEditor';
import LandingPageBuilder from '@/pages/LandingPageBuilder';
import LandingPagesManager from '@/pages/LandingPagesManager';
import LandingPageView from '@/pages/LandingPageView';
import CustomizeProductPurchasePage from '@/pages/dashboard/CustomizeProductPurchasePage';
import CustomDomainsDocPage from './pages/docs/CustomDomainsDocPage';
import DomainSettings from '@/pages/dashboard/DomainSettings';
import StoreRouter from '@/components/routing/StoreRouter';
import ProductForm from "./pages/ProductForm";
import CustomPageView from "./pages/CustomPageView";
import CustomPagesManager from "./pages/dashboard/CustomPagesManager";
import QuickBarcodePrintPage from './pages/dashboard/QuickBarcodePrintPage';
import OrderDistributionSettings from './pages/OrderDistributionSettings';

// Super Admin Pages
import SuperAdminDashboard from '@/pages/super-admin/SuperAdminDashboard';
import SuperAdminOrganizations from '@/pages/super-admin/Organizations';
import SuperAdminSubscriptions from '@/pages/super-admin/Subscriptions';
import SuperAdminLogin from './pages/SuperAdminLogin';
import SuperAdminPaymentMethods from '@/pages/super-admin/PaymentMethods';
import ActivationCodesPage from '@/pages/super-admin/activation-codes';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import YalidineSyncPage from '@/pages/super-admin/YalidineSyncPage'; // Import new page
import SuperAdminSEO from '@/pages/SuperAdminSEO';
import SuperAdminCourses from '@/pages/SuperAdminCourses';

// صفحة الاشتراكات
import SubscriptionPage from "./pages/dashboard/subscription";
import SyncManager from './components/SyncManager';
import PermissionGuard from './components/auth/PermissionGuard';
import useTabFocusEffect from './hooks/useTabFocusEffect';
import useReactQueryState from './hooks/useReactQueryState';
import { useSessionTracking } from './hooks/useSessionTracking';
import { isElectron } from '@/lib/isElectron';
import { useTenant } from '@/context/TenantContext';
import { getCategoryById, getCategories } from '@/lib/api/categories';

// تحقق ما إذا كان التطبيق يعمل في بيئة Electron
const isRunningInElectron = isElectron();

// تسجيل بيئة التطبيق بوضوح

// وضع علامة عالمية على نوع البيئة
if (typeof window !== 'undefined') {
  (window as any).__IS_ELECTRON_APP = isRunningInElectron;
  
  // منع المزامنة والتحديث التلقائي في المتصفح
  if (!isRunningInElectron) {
    
    (window as any).__SYNC_DISABLED_IN_BROWSER = true;
    (window as any).__PREVENT_AUTO_REFRESH = true;
  }
}

// استخدام queryClient المحسن من الملف المنفصل
// يتم التحكم في الإعدادات من src/lib/config/queryClient.ts

// التخزين المؤقت تتم إدارته في src/lib/config/queryClient.ts

// إضافة مستمع لكشف محاولات إعادة التحميل التلقائية وتجاهلها عند تبديل النوافذ
if (typeof window !== 'undefined') {
  (window as any).__REACT_QUERY_GLOBAL_CLIENT = queryClient;

  // إعدادات إضافية بناءً على البيئة
  if (!isRunningInElectron) {
    // تعطيل إضافي للتحديث التلقائي في المتصفح
    queryClient.setDefaultOptions({
      queries: {
        ...queryClient.getDefaultOptions().queries,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
      }
    });
  }

  // إضافة معالج لتغيير التبويب يناسب البيئة (Electron أو متصفح)
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // في Electron فقط، نقوم بإلغاء صلاحية الاستعلامات الحالية للحصول على أحدث البيانات
      if (isRunningInElectron) {

        // استئناف الـ mutations قيد التنفيذ
        queryClient.resumePausedMutations();
        
        // إبطال صلاحية الاستعلامات لإعادة تحميلها
        // queryClient.invalidateQueries(); // تم التعليق لمنع إعادة الجلب الفورية عند كل عودة للتبويب في Electron
      } else {
        // في المتصفح، فقط نستأنف المعاملات دون تحديث الاستعلامات
        
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
  // تتبع الجلسات تلقائياً
  useSessionTracking();
  
  useTabFocusEffect({
    onFocus: () => {
      
      // عند العودة بعد فترة طويلة، يمكن تحديث بعض البيانات الهامة
      // لكن معظم البيانات ستبقى مخزنة وجاهزة للاستخدام
    },
    onBlur: () => {
      
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

// مكون إعادة التوجيه للفئات المحسن
const CategoryRedirect = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const { currentOrganization } = useTenant();
  const [actualCategoryId, setActualCategoryId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const findCategory = async () => {
      if (!categoryId || !currentOrganization) {
        setIsLoading(false);
        return;
      }
      
      try {
        // أولاً: محاولة البحث بالـ ID مباشرة
        let category = await getCategoryById(categoryId, currentOrganization.id);
        
        if (category) {
          setActualCategoryId(category.id);
          setIsLoading(false);
          return;
        }
        
        // ثانياً: البحث بالـ slug في جميع الفئات
        const allCategories = await getCategories(currentOrganization.id);
        const categoryBySlug = allCategories.find(cat => 
          cat.slug === categoryId || 
          cat.slug?.includes(categoryId) ||
          cat.name.toLowerCase().replace(/\s+/g, '-') === categoryId
        );
        
        if (categoryBySlug) {
          setActualCategoryId(categoryBySlug.id);
        }
        
      } catch (error) {
        console.error('Error finding category:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    findCategory();
  }, [categoryId, currentOrganization]);
  
  if (isLoading) {
    return <div>جاري التحميل...</div>;
  }
  
  if (!categoryId) {
    return <Navigate to="/products" replace />;
  }
  
  if (actualCategoryId) {
    return <Navigate to={`/products?category=${actualCategoryId}`} replace />;
  }
  
  // إذا لم نجد الفئة، نوجه إلى صفحة المنتجات العامة
  return <Navigate to="/products" replace />;
};

const App = () => {
  useEffect(() => {
    syncCategoriesDataOnStartup();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <TabFocusHandler>
          <SupabaseProvider>
            <SessionMonitor />
            <ErrorMonitor />
            <ShopProvider>
              <HelmetProvider>
                <Toaster />
                <Sonner />
                <Routes>
                  <Route path="/" element={<StoreRouter />} />
                  <Route path="/features" element={<FeaturesPage />} />
                  <Route path="/offline-features" element={<OfflineFeatures />} />
                  <Route path="/features/pos" element={<POSFeaturesPage />} />
                  <Route path="/features/online-store" element={<OnlineStorePage />} />
                  <Route path="/features/advanced-analytics" element={<AdvancedAnalyticsFeaturesPage />} />
                  <Route path="/pricing" element={<PricingPage />} />
                  <Route path="/contact" element={<ContactLandingPage />} />
                  <Route path="/contact-old" element={<ContactPage />} />
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
                    <Route path="/super-admin/yalidine-sync" element={<YalidineSyncPage />} /> {/* Add new route here */}
                    <Route path="/super-admin/seo" element={<SuperAdminSEO />} />
                    <Route path="/super-admin/courses" element={<SuperAdminCourses />} />
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
                  
                  {/* مسار الفئات - يوجه إلى صفحة المنتجات مع فلتر الفئة */}
                  <Route path="/category/:categoryId" element={<CategoryRedirect />} />
                  
                  {/* صفحة تفاصيل المنتج */}
                  <Route path="/products/details/:productId" element={<ProductDetails />} />
                  
                  {/* صفحة شراء المنتج */}
                  <Route path="/products/:slug" element={<ProductPurchase />} />
                  
                  {/* صفحة الشكر بعد إتمام الشراء */}
                  <Route path="/thank-you" element={<ThankYouPage />} />
                  
                  {/* صفحة متابعة الخدمات العامة للعملاء */}
                  <Route path="/service-tracking/:trackingId" element={<PublicServiceTrackingPage />} />
                  <Route path="/service-tracking-public" element={<PublicServiceTrackingPage />} />
                  
                  {/* صفحة خدمات الإصلاح العامة */}
                  <Route path="/services" element={<PublicServiceTrackingPage />} />

                  {/* صفحات التوثيق */}
                  <Route path="/docs/custom-domains" element={<CustomDomainsDocPage />} />

                  {/* الصفحات المخصصة التي يتم إنشاؤها في محرر الفوتر */}
                  <Route path="/page/:slug" element={<CustomPageView />} />

                  {/* الصفحة الرئيسية للمتجر - يتم توجيه النطاقات المخصصة إليها */}
                  {/* تم تغييره من LandingPage إلى StoreRouter للتوجيه المباشر إلى المتجر عند استخدام دومين مخصص */}
                  <Route index element={<StoreRouter />} />

                  {/* صفحات الهبوط المخصصة - يجب أن تكون في النهاية لتجنب توجيه النطاقات المخصصة إليها */}
                  <Route path="/:slug" element={<LandingPageView />} />

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
                      
                      <Route path="/dashboard/products" element={
                        <SubscriptionCheck>
                          <Products />
                        </SubscriptionCheck>
                      } />
                      <Route path="/dashboard/inventory" element={
                        <SubscriptionCheck>
                          <Inventory />
                        </SubscriptionCheck>
                      } />
                      {/* START - Quick Barcode Print Route */}
                      <Route path="/dashboard/quick-barcode-print" element={
                        <SubscriptionCheck>
                          <QuickBarcodePrintPage />
                        </SubscriptionCheck>
                      } />
                      {/* END - Quick Barcode Print Route */}
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
                      <Route path="/dashboard/abandoned-orders" element={
                        <SubscriptionCheck>
                          <PermissionGuard requiredPermissions={['viewOrders']}>
                            <AbandonedOrders />
                          </PermissionGuard>
                        </SubscriptionCheck>
                      } />
                      <Route path="/dashboard/pos-orders" element={
                        <SubscriptionCheck>
                          <PermissionGuard requiredPermissions={['accessPOS']}>
                            <POSOrders />
                          </PermissionGuard>
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
                      <Route path="/dashboard/order-distribution" element={
                        <SubscriptionCheck>
                          <PermissionGuard requiredPermissions={['manageEmployees']}>
                            <OrderDistributionSettings />
                          </PermissionGuard>
                        </SubscriptionCheck>
                      } />
                      <Route path="/dashboard/organization" element={
                        <SubscriptionCheck>
                          <OrganizationSettings />
                        </SubscriptionCheck>
                      } />
                      <Route path="/dashboard/custom-domains" element={
                        <SubscriptionCheck>
                          <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
                            <DomainSettings />
                          </PermissionGuard>
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

                      {/* صفحات إعدادات نموذج الطلب */}
                      <Route path="/dashboard/form-settings" element={
                        <SubscriptionCheck>
                          <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
                            <FormSettings />
                          </PermissionGuard>
                        </SubscriptionCheck>
                      } />
                      <Route path="/form-builder/:formId" element={
                        <SubscriptionCheck>
                          <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
                            <FormBuilder />
                          </PermissionGuard>
                        </SubscriptionCheck>
                      } />

                      {/* صفحة إعدادات صفحة الشكر */}
                      <Route path="/dashboard/thank-you-editor" element={
                        <SubscriptionCheck>
                          <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
                            <ThankYouPageEditor />
                          </PermissionGuard>
                        </SubscriptionCheck>
                      } />

                      {/* صفحة إعدادات الشحن والتوصيل */}
                      <Route path="/dashboard/shipping-settings" element={
                        <SubscriptionCheck>
                          <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
                            <ShippingSettingsPage />
                          </PermissionGuard>
                        </SubscriptionCheck>
                      } />

                      {/* صفحات إدارة صفحات الهبوط */}
                      <Route path="/dashboard/landing-pages" element={
                        <SubscriptionCheck>
                          <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
                            <LandingPagesManager />
                          </PermissionGuard>
                        </SubscriptionCheck>
                      } />
                      <Route path="/landing-page-builder/:id" element={
                        <SubscriptionCheck>
                          <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
                            <LandingPageBuilder />
                          </PermissionGuard>
                        </SubscriptionCheck>
                      } />

                      {/* صفحة إدارة الصفحات المخصصة */}
                      <Route path="/dashboard/custom-pages" element={
                        <SubscriptionCheck>
                          <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
                            <CustomPagesManager />
                          </PermissionGuard>
                        </SubscriptionCheck>
                      } />

                      {/* صفحة معاينة صفحات الهبوط */}
                      <Route path="/:slug" element={<LandingPageView />} />

                      {/* صفحة تخصيص المتجر */}
                      <Route path="/dashboard/store-editor" element={
                        <SubscriptionCheck>
                          <StoreEditor />
                        </SubscriptionCheck>
                      } />

                      {/* صفحة إدارة المنتجات */}
                      <Route path="/dashboard/products" element={
                        <SubscriptionCheck>
                          <PermissionGuard requiredPermissions={['viewProducts']}>
                            <Products />
                          </PermissionGuard>
                        </SubscriptionCheck>
                      } />
                      <Route path="/dashboard/product/new" element={
                        <PermissionGuard requiredPermissions={['addProducts']}>
                          <ProductForm />
                        </PermissionGuard>
                      } />
                      <Route path="/dashboard/product/:id" element={
                        <PermissionGuard requiredPermissions={['editProducts']}>
                          <ProductForm />
                        </PermissionGuard>
                      } />
                      <Route path="/dashboard/products/:productId/customize-purchase-page" element={
                        <SubscriptionCheck>
                          <PermissionGuard requiredPermissions={['editProducts']}>
                            <CustomizeProductPurchasePage />
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
                    
                    <Route path="*" element={<NotFound />} />
                  </Route>
                  
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <SyncManagerWrapper />
              </HelmetProvider>
            </ShopProvider>
          </SupabaseProvider>
        </TabFocusHandler>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
