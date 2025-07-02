// ⏱️ تتبع بدء تحميل App.tsx
const appTsxStartTime = performance.now();
const pageStartTime = (window as any).pageLoadStartTime || performance.now();

import React, { Suspense, useEffect, useState } from 'react';
import { Routes, Route, useLocation, useParams, Navigate } from 'react-router-dom';
// 🧠 نظام ذكي لتحميل Providers حسب نوع الصفحة
import SmartProviderWrapper from './components/routing/SmartProviderWrapper';
import { useTenant } from './context/TenantContext';
import { useQueryClient, QueryClient } from '@tanstack/react-query';

// استخدام QueryClient من main.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  },
});
import { Loader2 } from 'lucide-react';
import { syncCategoriesDataOnStartup } from '@/lib/api/categories';
import ProtectedRoute from "./components/auth/ProtectedRoute";
import PublicRoute from "./components/auth/PublicRoute";
import SuperAdminRoute from "./components/auth/SuperAdminRoute";
import SubscriptionCheck from "./components/subscription/SubscriptionCheck";

import ErrorMonitor from "./components/ErrorMonitor";

import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import POSOptimized from "./pages/POSOptimized";
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
import Sales from '@/pages/dashboard/Sales';
import OptimizedSales from '@/pages/dashboard/OptimizedSales';
import Orders from '@/pages/dashboard/Orders';
import POSOrders from '@/pages/POSOrders';
import POSOrdersOptimized from '@/pages/POSOrdersOptimized';
import POSOrdersWrapper from '@/components/pos/POSOrdersWrapper';
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

import SettingsPage from './pages/dashboard/settings';
import ShippingSettingsPage from './pages/dashboard/ShippingSettings';
import RequireTenant from './components/auth/RequireTenant';
import LandingPage from './pages/landing/LandingPage';
import ProductPurchase from './pages/ProductPurchase';
import ProductPurchasePageMax from './pages/ProductPurchasePageMax';
import ProductPurchasePageV3 from './pages/ProductPurchasePageV3';
import ProductPurchasePageMaxPublic from './pages/ProductPurchasePageMaxPublic';
// import ProductPurchaseOptimized from './pages/ProductPurchaseOptimized';
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
import RepairServices from './pages/RepairServices';
import RepairTrackingPage from './pages/RepairTrackingPage';
import RepairComplete from './pages/RepairComplete';
import StoreEditorDemo from '@/pages/admin/StoreEditorDemo';
import AppsManagement from './pages/AppsManagement';
import GameDownloadsPage from './pages/GameDownloadsPage';
import PublicGameStorePage from './pages/PublicGameStorePage';
import PublicGameTracking from './components/apps/game-downloads/PublicGameTracking';
import ConditionalRoute from './components/ConditionalRoute';
import CallCenterRoute from './components/auth/CallCenterRoute';
import CallCenterLayout from './components/call-center/CallCenterLayout';
import CallCenterDashboard from './pages/call-center/CallCenterDashboard';
import AssignedOrders from './pages/call-center/orders/AssignedOrders';
import RoleBasedRedirect from './components/auth/RoleBasedRedirect';
import SupabaseAnalyticsPanel from './components/analytics/SupabaseAnalyticsPanel';
// تم حذف نظام التحديث التلقائي - الملف غير موجود

// Call Center Admin Pages
import AgentsManagementPage from './pages/admin/call-center/AgentsManagementPage';
import DistributionSettingsPage from './pages/admin/call-center/DistributionSettingsPage';
import ReportsPage from './pages/admin/call-center/ReportsPage';
import MonitoringPage from './pages/admin/call-center/MonitoringPage';

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
import SubscriptionServices from "./pages/dashboard/SubscriptionServices";
import DeliveryManagement from "./pages/dashboard/DeliveryManagement";
import ProductReturns from "./pages/returns/ProductReturns";
import LossDeclarations from "./pages/losses/LossDeclarations";
import SyncManager from './components/SyncManager';
import PermissionGuard from './components/auth/PermissionGuard';
import useTabFocusEffect from './hooks/useTabFocusEffect';
import useReactQueryState from './hooks/useReactQueryState';
import { useSessionTracking } from './hooks/useSessionTracking';
import { isElectron } from '@/lib/isElectron';
import { getCategoryById, getCategories } from '@/lib/api/unified-api';
import { configureCrossDomainAuth } from '@/lib/cross-domain-auth';
import { detectLoadingLoop, autoFixStorage } from '@/lib/utils/storage-helper';
import { useDevtools } from '@/hooks/useDevtools';
import { LocalStorageMonitor } from './components/auth/LocalStorageMonitor';
import { enableRequestInterception, setCurrentOrganizationId } from '@/lib/requestInterceptor';
import '@/utils/auth-debug'; // أدوات التشخيص

// مكونات SyncManager و TabFocusHandler (تم نقل import SyncManager أسفل)

// تأخير تفعيل اعتراض الطلبات حتى يصبح النظام الموحد جاهزاً
import { isSupabaseReady } from '@/lib/supabase-unified';

// تفعيل اعتراض الطلبات بعد التحقق من جاهزية النظام الموحد
setTimeout(() => {
  let attempts = 0;
  const tryEnableInterception = () => {
    attempts++;
    if (isSupabaseReady()) {
      enableRequestInterception();
    } else if (attempts < 50) {
      setTimeout(tryEnableInterception, 100);
    } else {
      enableRequestInterception();
    }
  };
  tryEnableInterception();
}, 100);

// تم حذف النظام الشامل لمنع الطلبات المكررة - الملف غير موجود

// 📊 نظام مراقبة الأداء والتحليلات الشامل
import { initializePerformanceAnalytics } from '@/lib/analytics/initializePerformanceAnalytics';

// ✨ نظام التحديث المتطور للبيانات
import { setGlobalQueryClient } from '@/lib/data-refresh-helpers';

// ✅ REQUEST DEDUPLICATION RE-ENABLED

// تفعيل نظام منع الطلبات المكررة
if (typeof window !== 'undefined') {
  import('@/lib/cache/deduplication').then(({ deduplicateRequest, clearCache }) => {
    (window as any).deduplicateRequest = deduplicateRequest;
    (window as any).clearRequestCache = clearCache;
  }).catch(() => {
  });
}

// ✅ تهيئة نظام التحديث المتطور
setGlobalQueryClient(queryClient);

// 🔧 تهيئة أداة تشخيص وحل مشاكل Cache
import { initializeCacheDebugger } from '@/lib/cache/cache-debugger-init';
initializeCacheDebugger();

// تهيئة نظام مراقبة الأداء
initializePerformanceAnalytics();

// ✨ إضافة دوال التطوير للتحديث الفوري
if (import.meta.env.DEV) {
  // دوال سهلة الوصول للتطوير
  (window as any).forceRefreshAfterMutation = (
    dataType: 'products' | 'categories' | 'orders' | 'inventory' | 'settings' | 'subscriptions' | 'apps' | 'all' = 'all',
    operation: 'create' | 'update' | 'delete' = 'update'
  ) => {
    import('@/lib/data-refresh-helpers').then(({ refreshAfterMutation }) => {
      refreshAfterMutation(dataType, operation);
    });
  };

  // دوال محددة للبيانات الشائعة
  (window as any).refreshProducts = () => (window as any).forceRefreshAfterMutation('products', 'update');
  (window as any).refreshCategories = () => (window as any).forceRefreshAfterMutation('categories', 'update');
  (window as any).refreshOrders = () => (window as any).forceRefreshAfterMutation('orders', 'update');
  (window as any).refreshInventory = () => (window as any).forceRefreshAfterMutation('inventory', 'update');
  (window as any).refreshAll = () => (window as any).forceRefreshAfterMutation('all', 'update');

}

// تحقق ما إذا كان التطبيق يعمل في بيئة Electron
const isRunningInElectron = isElectron();

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
                    refetchOnMount: true, // ✅ السماح بالتحديث عند تحميل المكون
          refetchOnReconnect: true, // ✅ السماح بإعادة الاتصال
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
        
        // تأكيد تعطيل التحديث التلقائي المفرط مع السماح بالتحديث الضروري
        queryClient.setDefaultOptions({
          queries: {
            refetchOnWindowFocus: false,
            refetchOnMount: true, // ✅ السماح بالتحديث عند تحميل المكون
            refetchOnReconnect: true, // ✅ السماح بإعادة الاتصال
            staleTime: 0, // 🚫 CACHE DISABLED - Always fresh
            gcTime: 0, // 🚫 CACHE DISABLED - No cache retention
          }
        });
      }
    } else {
      // تسجيل الابتعاد عن النافذة
      
      // إلغاء آمن للاستعلامات النشطة فقط
      queryClient.cancelQueries({
        predicate: (query) => {
          const state = query.state;
          return state.fetchStatus === 'fetching' || state.status === 'pending';
        }
      });
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
      
      // إيقاف أي طلبات قيد التنفيذ بشكل آمن
      const queryClient = (window as any).__REACT_QUERY_GLOBAL_CLIENT;
      if (queryClient) {
        queryClient.cancelQueries({
          predicate: (query) => {
            const state = query.state;
            return state.fetchStatus === 'fetching' || state.status === 'pending';
          }
        });
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
  // ⏱️ تتبع بدء تحميل App component
  const appComponentStartTime = performance.now();

  // تفعيل مراقبة أخطاء التطوير والـ HMR
  useDevtools();
  
  useEffect(() => {
    // ⏱️ تتبع useEffect في App
    const useEffectStartTime = performance.now();
    // تم حذف نظام التحديث التلقائي - الملف غير موجود
    
    // 🚀 إزالة شاشة التحميل عند جاهزية React App
    let removeLoadingTimeout: NodeJS.Timeout | undefined;
    if (typeof window !== 'undefined' && (window as any).removeInitialLoading) {
      // تأخير صغير للتأكد من اكتمال الرندر الأول
      removeLoadingTimeout = setTimeout(() => {
        (window as any).removeInitialLoading();
      }, 50);
    }
    
    // تأجيل مزامنة الفئات لتجنب التكرار مع React Strict Mode
    const syncTimeout = setTimeout(() => {
      syncCategoriesDataOnStartup();
    }, 1000); // تأخير ثانية واحدة
    
    configureCrossDomainAuth();
    
    // تهيئة معالج أخطاء Supabase Auth
    import('@/lib/supabase/authErrorHandler').then(({ setupAuthErrorFiltering }) => {
      setupAuthErrorFiltering();
    }).catch(console.warn);

    // تنظيف timeout عند إلغاء المكون
    return () => {
      clearTimeout(syncTimeout);
      if (removeLoadingTimeout) clearTimeout(removeLoadingTimeout);
    };
  }, []);

  return (
    <SmartProviderWrapper>
      {/* 
      🧠 SmartProviderWrapper: نظام ذكي لتحميل البيانات حسب نوع الصفحة
      - صفحات المنتجات: ProductPageContext فقط (3-4 استدعاءات)
      - لوحة التحكم: جميع الـ contexts (للوظائف الكاملة)
      - صفحات أخرى: الحد الأدنى المطلوب فقط
      */}
      <TabFocusHandler>
        <ErrorMonitor />
        {/* نظام المراقبة الشامل - يعمل في بيئة التطوير فقط */}
        
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
                  <Route path="/login" element={
                    <PublicRoute>
                      <LoginForm />
                    </PublicRoute>
                  } />
                  
                  {/* مسار افتراضي لتوجيه المستخدمين حسب أدوارهم بعد تسجيل الدخول */}
                  <Route path="/redirect" element={<RoleBasedRedirect />} />
                  <Route path="/super-admin/login" element={<SuperAdminLogin />} />
                  <Route path="/signup" element={<NotFound />} />
                  <Route path="/admin/signup" element={
                    <PublicRoute>
                      <AdminSignup />
                    </PublicRoute>
                  } />
                  <Route path="/tenant/signup" element={
                    <PublicRoute>
                      <TenantSignup />
                    </PublicRoute>
                  } />
                  
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
                  
                  {/* Call Center Routes - Protected with CallCenterRoute */}
                  <Route element={<CallCenterRoute />}>
                    <Route path="/call-center/*" element={<CallCenterLayout />}>
                      <Route index element={<Navigate to="/call-center/dashboard" replace />} />
                      <Route path="dashboard" element={<CallCenterDashboard />} />
                      <Route path="orders" element={<Navigate to="/call-center/orders/assigned" replace />} />
                      <Route path="orders/assigned" element={<AssignedOrders />} />
                      <Route path="orders/pending" element={<div>Pending Orders - Coming Soon</div>} />
                      <Route path="orders/completed" element={<div>Completed Orders - Coming Soon</div>} />
                      <Route path="performance" element={<div>Performance Stats - Coming Soon</div>} />
                      <Route path="profile" element={<div>Agent Profile - Coming Soon</div>} />
                    </Route>
                  </Route>
                  
                  {/* Call Center Supervisor Routes - Requires supervisor permissions */}
                  <Route element={<CallCenterRoute requireSupervisor={true} />}>
                    <Route path="/call-center/management" element={<div>Agent Management - Coming Soon</div>} />
                    <Route path="/call-center/reports" element={<div>Call Center Reports - Coming Soon</div>} />
                    <Route path="/call-center/settings" element={<div>Call Center Settings - Coming Soon</div>} />
                    <Route path="/call-center/monitoring" element={<div>Live Monitoring - Coming Soon</div>} />
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
                  
                  {/* صفحة شراء المنتج المحسنة - للاختبار */}
                  <Route path="/product-max/:productId" element={<ProductPurchasePageMax />} />
                  <Route path="/product-purchase-max/:productId" element={<ProductPurchasePageMax />} />
                  <Route path="/product-purchase-max-v2/:productId" element={<ProductPurchasePageV3 />} />
                  
                  {/* صفحة شراء المنتج العامة - بدون تسجيل دخول */}
                  <Route path="/product-public/:productId" element={<ProductPurchasePageMaxPublic />} />
                  
                  {/* صفحة الشكر بعد إتمام الشراء */}
                  <Route path="/thank-you" element={<ThankYouPage />} />
                  
                  {/* صفحة متابعة الخدمات العامة للعملاء */}
                  <Route path="/service-tracking/:trackingId" element={<PublicServiceTrackingPage />} />
                  <Route path="/service-tracking-public" element={<PublicServiceTrackingPage />} />
                  
                  {/* صفحة خدمات الإصلاح العامة */}
                  <Route path="/services" element={<PublicServiceTrackingPage />} />
                  <Route path="/repair-tracking" element={<RepairTrackingPage />} />
                  <Route path="/repair-tracking/:trackingCode" element={<RepairTrackingPage />} />
                  
                  {/* صفحة إنهاء التصليح عبر QR code */}
                  <Route path="/repair-complete/:orderId" element={<RepairComplete />} />

                  {/* صفحة عرض تحميل الألعاب العامة */}
                  <Route path="/games" element={<PublicGameStorePage />} />
                  <Route path="/games/:organizationId" element={<PublicGameStorePage />} />
                  
                  {/* صفحة تتبع طلبات الألعاب العامة */}
                  <Route path="/game-tracking" element={<PublicGameTracking />} />
                  <Route path="/game-tracking/:trackingNumber" element={<PublicGameTracking />} />
                  
                  {/* صفحات QR للمسؤول - بدون الحاجة لتسجيل الدخول */}
                  <Route path="/game-download-start/:orderId" element={
                    <Suspense fallback={<div>جاري التحميل...</div>}>
                      {React.createElement(React.lazy(() => import('./components/apps/game-downloads/QuickScanActions').then(module => ({ default: module.GameDownloadStart }))))}
                    </Suspense>
                  } />
                  <Route path="/game-complete/:orderId" element={
                    <Suspense fallback={<div>جاري التحميل...</div>}>
                      {React.createElement(React.lazy(() => import('./components/apps/game-downloads/QuickScanActions').then(module => ({ default: module.GameOrderComplete }))))}
                    </Suspense>
                  } />

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

                  {/* مسار نقطة البيع المباشر للموظفين - خارج RequireTenant */}
                  <Route path="/pos" element={
                    <ProtectedRoute>
                      <ConditionalRoute appId="pos-system">
                        <PermissionGuard requiredPermissions={['accessPOS']}>
                          <POSOptimized />
                        </PermissionGuard>
                      </ConditionalRoute>
                    </ProtectedRoute>
                  } />

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
                      
                      {/* صفحة خدمات الاشتراكات */}
                      <Route path="/dashboard/subscription-services" element={
                        <ConditionalRoute appId="subscription-services">
                          <SubscriptionCheck>
                            <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
                              <SubscriptionServices />
                            </PermissionGuard>
                          </SubscriptionCheck>
                        </ConditionalRoute>
                      } />

                      {/* صفحة إدارة التوصيل */}
                      <Route path="/dashboard/delivery" element={
                        <SubscriptionCheck>
                          <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
                            <DeliveryManagement />
                          </PermissionGuard>
                        </SubscriptionCheck>
                      } />
                      
                      {/* صفحة إدارة التطبيقات */}
                      <Route path="/dashboard/apps" element={
                        <SubscriptionCheck>
                          <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
                            <AppsManagement />
                          </PermissionGuard>
                        </SubscriptionCheck>
                      } />
                      
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
                      <Route path="/dashboard/repair-services" element={
                        <ConditionalRoute appId="repair-services">
                          <SubscriptionCheck>
                            <PermissionGuard requiredPermissions={['viewServices']}>
                              <RepairServices />
                            </PermissionGuard>
                          </SubscriptionCheck>
                        </ConditionalRoute>
                      } />
                      <Route path="/dashboard/sales" element={
                        <SubscriptionCheck>
                          <OptimizedSales />
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
                        <ConditionalRoute appId="pos-system">
                          <SubscriptionCheck>
                            <PermissionGuard requiredPermissions={['accessPOS']}>
                              <POSOrdersWrapper>
                                <POSOrdersOptimized />
                              </POSOrdersWrapper>
                            </PermissionGuard>
                          </SubscriptionCheck>
                        </ConditionalRoute>
                      } />
                      <Route path="/dashboard/returns" element={
                        <ConditionalRoute appId="pos-system">
                          <SubscriptionCheck>
                            <PermissionGuard requiredPermissions={['accessPOS']}>
                              <ProductReturns />
                            </PermissionGuard>
                          </SubscriptionCheck>
                        </ConditionalRoute>
                      } />
                      <Route path="/dashboard/losses" element={
                        <ConditionalRoute appId="pos-system">
                          <SubscriptionCheck>
                            <PermissionGuard requiredPermissions={['accessPOS']}>
                              <LossDeclarations />
                            </PermissionGuard>
                          </SubscriptionCheck>
                        </ConditionalRoute>
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
                        <ConditionalRoute appId="pos-system">
                          <SubscriptionCheck>
                            <CustomerDebts />
                          </SubscriptionCheck>
                        </ConditionalRoute>
                      } />
                      <Route path="/dashboard/customer-debt-details/:customerId" element={
                        <ConditionalRoute appId="pos-system">
                          <PermissionGuard requiredPermissions={['viewDebts']}>
                            <CustomerDebtDetails />
                          </PermissionGuard>
                        </ConditionalRoute>
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
                      
                      {/* Call Center Management Routes for Admins */}
                      <Route path="/dashboard/call-center/agents" element={
                        <ConditionalRoute appId="call-center">
                          <SubscriptionCheck>
                            <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
                              <AgentsManagementPage />
                            </PermissionGuard>
                          </SubscriptionCheck>
                        </ConditionalRoute>
                      } />
                      <Route path="/dashboard/call-center/distribution" element={
                        <ConditionalRoute appId="call-center">
                          <SubscriptionCheck>
                            <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
                              <DistributionSettingsPage />
                            </PermissionGuard>
                          </SubscriptionCheck>
                        </ConditionalRoute>
                      } />
                      <Route path="/dashboard/call-center/reports" element={
                        <ConditionalRoute appId="call-center">
                          <SubscriptionCheck>
                            <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
                              <ReportsPage />
                            </PermissionGuard>
                          </SubscriptionCheck>
                        </ConditionalRoute>
                      } />
                      <Route path="/dashboard/call-center/monitoring" element={
                        <ConditionalRoute appId="call-center">
                          <SubscriptionCheck>
                            <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
                              <MonitoringPage />
                            </PermissionGuard>
                          </SubscriptionCheck>
                        </ConditionalRoute>
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
                      {/* مسارات صفحات الفليكسي والعملات الرقمية - مشروطة بتفعيل التطبيق */}
                      <Route path="/dashboard/flexi-management" element={
                        <ConditionalRoute appId="flexi-crypto">
                          <SubscriptionCheck>
                            <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
                              <FlexiManagement />
                            </PermissionGuard>
                          </SubscriptionCheck>
                        </ConditionalRoute>
                      } />
                      <Route path="/dashboard/flexi-sales" element={
                        <ConditionalRoute appId="flexi-crypto">
                          <SubscriptionCheck>
                            <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
                              <FlexiSales />
                            </PermissionGuard>
                          </SubscriptionCheck>
                        </ConditionalRoute>
                      } />
                      <Route path="/dashboard/flexi-analytics" element={
                        <ConditionalRoute appId="flexi-crypto">
                          <SubscriptionCheck>
                            <PermissionGuard requiredPermissions={['viewReports']}>
                              <FlexiAnalytics />
                            </PermissionGuard>
                          </SubscriptionCheck>
                        </ConditionalRoute>
                      } />

                      {/* مسارات تطبيق تحميل الألعاب */}
                      <Route path="/dashboard/game-downloads" element={
                        <ConditionalRoute appId="game-downloads">
                          <SubscriptionCheck>
                            <GameDownloadsPage />
                          </SubscriptionCheck>
                        </ConditionalRoute>
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

                      {/* صفحة إدارة الصفحات المخصصة */}
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

                      {/* صفحة نقطة البيع المحسنة مع POSDataContext */}
                      <Route path="/dashboard/pos" element={
                        <ConditionalRoute appId="pos-system">
                          <SubscriptionCheck>
                            <PermissionGuard requiredPermissions={['accessPOS']}>
                              <POSOptimized />
                            </PermissionGuard>
                          </SubscriptionCheck>
                        </ConditionalRoute>
                      } />

                      {/* صفحة طلبات الخدمات */}
                      <Route path="/dashboard/service-requests" element={
                        <SubscriptionCheck>
                          <PermissionGuard requiredPermissions={['trackServices']}>
                            <ServiceRequestsPage />
                          </PermissionGuard>
                        </SubscriptionCheck>
                      } />
                      
                      <Route path="/repair-services" element={<RequireTenant><RepairServices /></RequireTenant>} />
                      
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
                
                {import.meta.env.DEV && <LocalStorageMonitor />}
                {import.meta.env.DEV && <SupabaseAnalyticsPanel />}
      </TabFocusHandler>
    </SmartProviderWrapper>
  );
};

export default App;
