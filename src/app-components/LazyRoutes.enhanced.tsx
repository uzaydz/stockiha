import React, { lazy } from 'react';

// 🚀 ENHANCED LAZY LOADING with Strategic Code Splitting
// Based on existing LazyRoutes.tsx with optimized loading strategies

// ============ صفحات الهبوط والعامة ============
export const Index = lazy(() => import('../pages/Index'));
export const FeaturesPage = lazy(() => import('../pages/landing/FeaturesPage'));
export const OfflineFeatures = lazy(() => import('../pages/OfflineFeatures'));
export const POSFeaturesPage = lazy(() => import('../pages/POSFeaturesPage'));
export const OnlineStorePage = lazy(() => import('../pages/features/OnlineStorePage'));
export const AdvancedAnalyticsFeaturesPage = lazy(() => import('../pages/AdvancedAnalyticsFeaturesPage'));
export const ContactPage = lazy(() => import('../pages/ContactPage'));
export const ContactLandingPage = lazy(() => import('../pages/landing/ContactPage'));
export const PricingPage = lazy(() => import('../pages/PricingPage'));

// ============ صفحات التوثيق ============
export const CustomDomainsDocPage = lazy(() => import('../pages/docs/CustomDomainsDocPage'));

// ============ صفحات الشراء والمنتجات ============
export const ProductPurchase = lazy(() => import('../pages/ProductPurchase'));
export const ProductPurchasePageMax = lazy(() => import('../pages/ProductPurchasePageMax'));
export const ProductPurchasePageV3 = lazy(() => import('../pages/ProductPurchasePageV3'));
export const ProductPurchasePageMaxPublic = lazy(() => import('../pages/ProductPurchasePageMaxPublic'));
export const StoreProducts = lazy(() => import('../pages/StoreProducts'));
export const ProductDetails = lazy(() => import('../pages/ProductDetails'));
export const ThankYouPage = lazy(() => import('../pages/ThankYouPage'));
export const CartPage = lazy(() => import('../pages/CartPage'));
export const CartCheckoutPage = lazy(() => import('../pages/CartCheckoutPage'));

// ============ صفحات الخدمات العامة ============
export const PublicServiceTrackingPage = lazy(() => import('../pages/PublicServiceTrackingPage'));
export const RepairTrackingPage = lazy(() => import('../pages/RepairTrackingPage'));
export const RepairComplete = lazy(() => import('../pages/RepairComplete'));
export const PublicGameStorePage = lazy(() => import('../pages/PublicGameStorePage'));

// ============ صفحات التوثيق ============
export const LoginForm = lazy(() => import('../components/auth/LoginForm'));
export const ForgotPasswordForm = lazy(() => import('../components/auth/ForgotPasswordForm'));
export const ResetPasswordForm = lazy(() => import('../components/auth/ResetPasswordForm'));
export const AdminSignup = lazy(() => import('../pages/AdminSignup'));
export const TenantSignup = lazy(() => import('../pages/TenantSignup'));
export const OrganizationSetup = lazy(() => import('../pages/OrganizationSetup'));
export const SetupOrganization = lazy(() => import('../pages/SetupOrganization'));

// ============ صفحات لوحة التحكم ============
export const Dashboard = lazy(() => import('../pages/Dashboard').catch(() => {
  // fallback في حالة فشل التحميل
  return { default: () => <div>جاري تحميل لوحة التحكم...</div> };
}));

// ============ صفحة الهبوط الجديدة للبرنامج ============
export const ProgramLandingPage = lazy(() => import('../pages/ProgramLandingPage'));

// ============ ENHANCED PRODUCT MANAGEMENT with Preloading ============
export const Products = lazy(() =>
  import('../pages/dashboard/ProductsCached').then(module => {
    // Preload related dependencies when this component loads
    import('@tanstack/react-table').catch(() => { });
    import('lucide-react').catch(() => { });
    return module;
  })
);

export const ProductForm = lazy(() => import('../pages/ProductForm'));
export const CustomizeProductPurchasePage = lazy(() => import('../pages/dashboard/CustomizeProductPurchasePage'));

export const Inventory = lazy(() => import('../pages/dashboard/Inventory'));
export const AdvancedInventoryTracking = lazy(() => import('../components/inventory/AdvancedInventoryTrackingPage'));
export const Categories = lazy(() => import('../pages/dashboard/Categories'));
export const QuickBarcodePrintPage = lazy(() => import('../pages/dashboard/QuickBarcodePrintPage'));

// ============ ENHANCED SALES & ORDERS with Analytics Preloading ============

export const Orders = lazy(() =>
  import('../pages/dashboard/Orders').then(module => {
    // Preload table dependencies
    import('@tanstack/react-table').catch(() => { });
    import('date-fns').catch(() => { });
    return module;
  })
);

export const OrdersV2 = lazy(() => import('../pages/dashboard/OrdersV2'));
export const OrderDetailsV2 = lazy(() => import('../pages/dashboard/OrderDetailsV2'));
export const AdvancedOrders = lazy(() => import('../pages/dashboard/AdvancedOrders'));
export const AbandonedOrders = lazy(() => import('../pages/dashboard/AbandonedOrders'));
export const BlockedCustomers = lazy(() => import('../pages/dashboard/BlockedCustomers'));

// ============ CUSTOMER MANAGEMENT ============
export const Customers = lazy(() =>
  import('../pages/dashboard/CustomersOptimized').then(module => {
    return module;
  }).catch((error) => {
    // تجاهل أخطاء CSS في وضع offline
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    const isCSSError = error?.message?.includes('preload CSS') || error?.message?.includes('Unable to preload');

    if (isOffline && isCSSError) {
      console.warn('⚠️ [Customers] تجاهل خطأ CSS في وضع offline، محاولة تحميل المكون');
      return import('../pages/dashboard/CustomersOptimized');
    }

    console.error('❌ فشل تحميل صفحة العملاء:', error);
    return { default: () => <div className="flex items-center justify-center min-h-screen"><div className="text-center"><div className="text-xl mb-2">⚠️ فشل تحميل صفحة العملاء</div><div className="text-sm text-gray-600">يرجى تحديث الصفحة</div></div></div> };
  })
);
export const CustomerDebts = lazy(() =>
  import('../pages/dashboard/CustomerDebts').then(module => {
    return module;
  }).catch((error) => {
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    const isCSSError = error?.message?.includes('preload CSS') || error?.message?.includes('Unable to preload');

    if (isOffline && isCSSError) {
      console.warn('⚠️ [CustomerDebts] تجاهل خطأ CSS في وضع offline');
      return import('../pages/dashboard/CustomerDebts');
    }

    console.error('❌ فشل تحميل صفحة ديون العملاء:', error);
    return { default: () => <div className="flex items-center justify-center min-h-screen"><div className="text-center"><div className="text-xl mb-2">⚠️ فشل تحميل الصفحة</div><div className="text-sm text-gray-600">يرجى تحديث الصفحة</div></div></div> };
  })
);
export const CustomerDebtDetails = lazy(() => import('../pages/dashboard/CustomerDebtDetails'));
export const PaymentHistory = lazy(() => import('../pages/dashboard/PaymentHistory'));

// ============ TEAM MANAGEMENT ============
export const Employees = lazy(() => import('../pages/dashboard/Employees'));
export const OrderDistributionSettings = lazy(() => import('../pages/OrderDistributionSettings'));
export const ConfirmationCenter = lazy(() => import('../pages/dashboard/ConfirmationCenter'));

// ============ ANALYTICS - صفحة التحليلات الجديدة ============
export const Analytics = lazy(() =>
  import('../pages/dashboard/Analytics').then(module => {
    // Preload Nivo chart dependencies for analytics
    Promise.all([
      import('@nivo/bar').catch(() => { }),
      import('@nivo/line').catch(() => { }),
      import('@nivo/pie').catch(() => { }),
    ]).catch(() => { });
    return module;
  })
);

// ============ التقارير المالية الشاملة ============
export const ComprehensiveReports = lazy(() => import('../components/comprehensive-reports/ComprehensiveReports'));

export const FinancialAnalytics = lazy(() =>
  import('../pages/FinancialAnalytics').then(module => {
    // Preload financial chart dependencies
    Promise.all([
      import('recharts'),
      import('chart.js'),
      import('react-chartjs-2')
    ]).catch(() => { });
    return module;
  })
);

export const Expenses = lazy(() => import('../pages/dashboard/Expenses'));
export const Invoices = lazy(() =>
  import('../pages/dashboard/Invoices').then(module => {
    // Preload PDF generation dependencies
    import('jspdf').catch(() => { });
    import('jspdf-autotable').catch(() => { });
    import('html2canvas').catch(() => { });
    return module;
  })
);

// ============ ENHANCED POS SYSTEM ============
export const POSOptimized = lazy(() =>
  import('../pages/POSOptimized').then(module => {
    // Preload barcode dependencies
    import('react-barcode').catch(() => { });
    import('qrcode.react').catch(() => { });
    return module;
  })
);

export const POSAdvanced = lazy(async () => {
  try {
    // محاولة تحميل المكون مع معالجة الأخطاء بشكل أفضل
    const module = await import('../pages/POSAdvanced');
    
    // Preload POS dependencies (غير متزامن)
    Promise.all([
      import('react-barcode').catch(() => { }),
      import('qrcode.react').catch(() => { })
    ]).catch(() => { });
    
    // التأكد من وجود default export
    if (!module.default) {
      throw new Error('POSAdvanced module does not have a default export');
    }
    
    return module;
  } catch (error: any) {
    // تجاهل أخطاء CSS في وضع offline
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    const isCSSError = error?.message?.includes('preload CSS') || error?.message?.includes('Unable to preload');
    const isImportError = error?.message?.includes('Importing binding name') || 
                         error?.message?.includes('star export') ||
                         error?.message?.includes('Importing a module script failed') ||
                         error?.name === 'SyntaxError' ||
                         error?.name === 'TypeError';

    if (isOffline && isCSSError) {
      console.warn('⚠️ [POSAdvanced] تجاهل خطأ CSS في وضع offline، محاولة تحميل المكون بدون CSS الخارجي');
      // محاولة تحميل المكون مرة أخرى
      try {
        const retryModule = await import('../pages/POSAdvanced');
        if (retryModule.default) {
          return retryModule;
        }
      } catch (retryError) {
        // إذا فشلت المحاولة الثانية، استمر إلى fallback
      }
    }

    // في حالة خطأ الاستيراد (مثل star export أو module script failed)، إرجاع fallback component
    if (isImportError) {
      console.error('❌ فشل تحميل POSAdvanced بسبب خطأ في الاستيراد:', error);
      
      // إرجاع fallback component بسيط - استخدام function component مباشرة
      return { 
        default: function POSAdvancedErrorFallback() {
          const errorMsg = error?.message || String(error);
          const isDev = import.meta.env.DEV;
          
          return (
            <div className="flex items-center justify-center min-h-screen bg-background">
              <div className="text-center p-6 max-w-md">
                <div className="text-xl font-semibold mb-2 text-destructive">
                  ⚠️ فشل تحميل نقطة البيع
                </div>
                <div className="text-sm text-muted-foreground mb-4">
                  يرجى تحديث الصفحة أو المحاولة مرة أخرى
                </div>
                {isDev && (
                  <div className="text-xs text-muted-foreground mt-4 p-3 bg-muted rounded break-words">
                    {errorMsg}
                  </div>
                )}
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                >
                  تحديث الصفحة
                </button>
              </div>
            </div>
          );
        }
      };
    } else {
      console.error('❌ فشل تحميل POSAdvanced:', error);
      
      // إرجاع fallback component بسيط
      return { 
        default: function POSAdvancedErrorFallback() {
          return (
            <div className="flex items-center justify-center min-h-screen bg-background">
              <div className="text-center p-6">
                <div className="text-xl font-semibold mb-2 text-destructive">
                  ⚠️ فشل تحميل نقطة البيع
                </div>
                <div className="text-sm text-muted-foreground mb-4">
                  يرجى تحديث الصفحة
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                >
                  تحديث الصفحة
                </button>
              </div>
            </div>
          );
        }
      };
    }
  }
});
export const POSDashboard = lazy(() => import('../pages/POSDashboard'));
export const POSOrdersOptimized = lazy(() => import('../pages/POSOrdersOptimized'));
export const POSOperationsPage = lazy(() => import('../pages/POSOperations'));
export const POSSettingsPage = lazy(() => import('../pages/POSSettingsPage'));
export const StoreBusinessSettings = lazy(() => import('../pages/StoreBusinessSettings'));
export const StaffManagement = lazy(() => import('../pages/StaffManagement'));
export const Etat104 = lazy(() => import('../pages/dashboard/Etat104'));
export const ProductReturns = lazy(() => import('../pages/returns/ProductReturns'));
export const LossDeclarations = lazy(() => import('../pages/losses/LossDeclarations'));
export const ProductOperationsPage = lazy(() => import('../pages/ProductOperations'));

// ============ OPERATIONS CENTERS ============
export const SalesOperationsPage = lazy(() => import('../pages/SalesOperations'));
export const ServicesOperationsPage = lazy(() => import('../pages/ServicesOperations'));
export const ReportsOperationsPage = lazy(() => import('../pages/ReportsOperations'));
export const SettingsOperationsPage = lazy(() => import('../pages/SettingsOperations'));
export const StaffOperationsPage = lazy(() => import('../pages/StaffOperations'));
export const SupplierOperationsPage = lazy(() => import('../pages/SupplierOperations'));
export const StoreOperationsPage = lazy(() => import('../pages/StoreOperations'));
export const CoursesOperationsPage = lazy(() => import('../pages/CoursesOperations'));
export const OpenStoreRedirect = lazy(() => import('../pages/dashboard/OpenStoreRedirect'));

// ============ SUPPLIER MANAGEMENT ============
export const SuppliersManagement = lazy(() => import('../pages/dashboard/SuppliersManagement'));
export const SupplierPurchases = lazy(() => import('../pages/dashboard/SupplierPurchases'));
export const SupplierReports = lazy(() => import('../pages/dashboard/SupplierReports'));
export const SupplierPayments = lazy(() => import('../pages/dashboard/SupplierPayments'));

// ============ SMART PURCHASE SYSTEM - نظام المشتريات الذكي ============
export const SmartPurchasePage = lazy(() =>
  import('../features/purchases/components/SmartPurchasePage').then(module => {
    // Preload related dependencies
    Promise.all([
      import('@tanstack/react-table').catch(() => { }),
      import('zod').catch(() => { })
    ]).catch(() => { });
    return module;
  })
);

// ============ REPAIR SERVICES ============
export const RepairServices = lazy(() => import('../pages/RepairServices'));

// ============ ENHANCED STORE CUSTOMIZATION ============
export const StoreEditor = lazy(() =>
  import('../pages/admin/StoreEditor').then(module => {
    // Preload editor dependencies
    import('@monaco-editor/react').catch(() => { });
    import('@dnd-kit/core').catch(() => { });
    return module;
  })
);

export const StoreEditorV2 = lazy(() =>
  import('../pages/dashboard/StoreEditorV2').then(module => {
    // Preload visual editor dependencies
    import('@tinymce/tinymce-react').catch(() => { });
    import('@dnd-kit/core').catch(() => { });
    return module;
  })
);

export const StoreSettingsPage = lazy(() => import('../pages/StoreSettingsPage'));

// ============ PAGE BUILDERS with DnD Preloading ============
export const LandingPagesManager = lazy(() => import('../pages/LandingPagesManager'));
export const LandingPageBuilder = lazy(() =>
  import('../pages/LandingPageBuilder').then(module => {
    // Preload drag & drop dependencies
    import('@dnd-kit/core').catch(() => { });
    import('@dnd-kit/sortable').catch(() => { });
    return module;
  })
);

export const LandingPageView = lazy(() => import('../pages/LandingPageView'));
export const CustomPagesManager = lazy(() => import('../pages/dashboard/CustomPagesManager'));
export const CustomPageView = lazy(() => import('../pages/CustomPageView'));

// ============ FORMS & CONTENT ============
export const FormSettings = lazy(() => import('../pages/FormSettings'));
export const FormBuilder = lazy(() =>
  import('../pages/FormBuilder').then(module => {
    // Preload form building dependencies
    import('react-hook-form').catch(() => { });
    import('zod').catch(() => { });
    return module;
  })
);

export const ThankYouPageEditor = lazy(() => import('../pages/dashboard/ThankYouPageEditor'));

// ============ SETTINGS & CONFIGURATION ============
export const SettingsPage = lazy(() => import('../pages/dashboard/settings'));
export const DomainSettings = lazy(() => import('../pages/dashboard/DomainSettings'));
export const UnifiedSettingsPage = lazy(() => import('../pages/UnifiedSettingsPage'));

// ============ DATABASE ADMIN (Electron Only) ============
export const DatabaseAdmin = lazy(() => import('../pages/DatabaseAdmin'));
export const SyncPanel = lazy(() => import('@/pages/debug/SyncPanel'));

// ============ BUSINESS FEATURES ============
export const GameDownloadsPage = lazy(() => import('../pages/GameDownloadsPage'));
export const SubscriptionServices = lazy(() => import('../pages/dashboard/SubscriptionServices'));
export const DeliveryManagement = lazy(() => import('../pages/dashboard/DeliveryManagement'));
export const AppsManagement = lazy(() => import('../pages/AppsManagement'));

// ============ CALL CENTER SYSTEM ============
export const CallCenterComingSoon = lazy(() => import('../pages/dashboard/call-center/CallCenterComingSoon'));

// ============ COURSES & EDUCATION ============
export const CoursesIndex = lazy(() => import('../pages/courses/CoursesIndex'));
export const DigitalMarketingCourse = lazy(() => import('../pages/courses/DigitalMarketingCourse'));
export const ECommerceCourse = lazy(() => import('../pages/courses/ECommerceCourse'));
export const ECommerceStoreCourse = lazy(() => import('../pages/courses/ECommerceStoreCourse'));
export const TikTokAdsCourse = lazy(() => import('../pages/courses/TikTokAdsCourse'));
export const TraditionalBusinessCourse = lazy(() => import('../pages/courses/TraditionalBusinessCourse'));
export const ServiceProvidersCourse = lazy(() => import('../pages/courses/ServiceProvidersCourse'));

// ============ COURSE MODULES - Use existing paths ============
// Digital Marketing Modules
export const DigitalMarketingModule1 = lazy(() => import('../pages/courses/modules/DigitalMarketingModule1'));
export const DigitalMarketingModule2 = lazy(() => import('../pages/courses/modules/DigitalMarketingModule2'));
export const DigitalMarketingModule3 = lazy(() => import('../pages/courses/modules/DigitalMarketingModule3'));
export const DigitalMarketingModule4 = lazy(() => import('../pages/courses/modules/DigitalMarketingModule4'));
export const DigitalMarketingModule5 = lazy(() => import('../pages/courses/modules/DigitalMarketingModule5'));
export const DigitalMarketingModule6 = lazy(() => import('../pages/courses/modules/DigitalMarketingModule6'));
export const DigitalMarketingModule7 = lazy(() => import('../pages/courses/modules/DigitalMarketingModule7'));
export const DigitalMarketingModule8 = lazy(() => import('../pages/courses/modules/DigitalMarketingModule8'));
export const DigitalMarketingModule9 = lazy(() => import('../pages/courses/modules/DigitalMarketingModule9'));
export const DigitalMarketingModule10 = lazy(() => import('../pages/courses/modules/DigitalMarketingModule10'));
export const DigitalMarketingModule11 = lazy(() => import('../pages/courses/modules/DigitalMarketingModule11'));
export const DigitalMarketingModule12 = lazy(() => import('../pages/courses/modules/DigitalMarketingModule12'));

// E-Commerce Modules
export const ECommerceModule1 = lazy(() => import('../pages/courses/modules/ECommerceModule1'));
export const ECommerceModule2 = lazy(() => import('../pages/courses/modules/ECommerceModule2'));

// TikTok Ads Modules
export const TikTokAdsModule0 = lazy(() => import('../pages/courses/modules/TikTokAdsModule0'));
export const TikTokAdsModule1 = lazy(() => import('../pages/courses/modules/TikTokAdsModule1'));
export const TikTokAdsModule2 = lazy(() => import('../pages/courses/modules/TikTokAdsModule2'));
export const TikTokAdsModule3 = lazy(() => import('../pages/courses/modules/TikTokAdsModule3'));
export const TikTokAdsModule4 = lazy(() => import('../pages/courses/modules/TikTokAdsModule4'));
export const TikTokAdsModule5 = lazy(() => import('../pages/courses/modules/TikTokAdsModule5'));
export const TikTokAdsModule6 = lazy(() => import('../pages/courses/modules/TikTokAdsModule6'));
export const TikTokAdsModule7 = lazy(() => import('../pages/courses/modules/TikTokAdsModule7'));
export const TikTokAdsModule8 = lazy(() => import('../pages/courses/modules/TikTokAdsModule8'));

// ============ ADMIN & SUPER ADMIN ============
export const SuperAdminLogin = lazy(() => import('../pages/SuperAdminLogin'));
export const SubscriptionPage = lazy(() => import('../pages/dashboard/subscription'));
export const OnlineOrdersRechargePage = lazy(() => import('../pages/dashboard/online-orders-recharge'));
export const ConfirmationAgentWorkspace = lazy(() => import('../pages/dashboard/ConfirmationAgentWorkspace'));

// ============ REFERRAL SYSTEM ============
export const ReferralPage = lazy(() => import('../pages/dashboard/referral'));

// ============ PRELOAD UTILITIES ============
// Function to preload critical components
export const preloadCriticalComponents = async () => {
  const criticalComponents = [
    () => import('../pages/Dashboard'),
    () => import('../pages/dashboard/ProductsCached'),
    () => import('../pages/dashboard/Orders'),
  ];

  return Promise.allSettled(
    criticalComponents.map(importFn => importFn())
  );
};

// Function to preload components by route pattern
export const preloadByRoute = (pathname: string) => {
  const routePreloadMap: Record<string, () => Promise<any>> = {
    '/dashboard/products': () => import('../pages/dashboard/ProductsCached'),
    '/dashboard/orders': () => import('../pages/dashboard/Orders'),
    '/dashboard/customers': () => import('../pages/dashboard/Customers'),
    // '/dashboard/analytics': () => import('../pages/dashboard/Analytics'), // تم حذفها
    '/dashboard/pos': () => import('../pages/POSOptimized'),
    '/dashboard/store-editor': () => import('../pages/admin/StoreEditor'),
    '/dashboard/settings': () => import('../pages/dashboard/settings'),
  };

  const preloadFn = routePreloadMap[pathname];
  if (preloadFn) {
    return preloadFn().catch(() => {
      // Silent fail for preloading
    });
  }
};

// Function to preload heavy dependencies during idle time
export const preloadHeavyDependencies = () => {
  const heavyDeps = [
    () => import('@nivo/bar'),
    () => import('@nivo/line'),
    () => import('@nivo/pie'),
    () => import('recharts'),
    () => import('chart.js'),
    () => import('react-chartjs-2'),
    () => import('jspdf'),
    () => import('@monaco-editor/react'),
    () => import('@dnd-kit/core'),
  ];

  if ('requestIdleCallback' in window) {
    heavyDeps.forEach(importFn => {
      window.requestIdleCallback(() => {
        importFn().catch(() => { });
      });
    });
  }
};
