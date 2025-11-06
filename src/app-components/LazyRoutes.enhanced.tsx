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
    import('@tanstack/react-table').catch(() => {});
    import('lucide-react').catch(() => {});
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
    import('@tanstack/react-table').catch(() => {});
    import('date-fns').catch(() => {});
    return module;
  })
);

export const OrdersV2 = lazy(() => import('../pages/dashboard/OrdersV2'));
export const OrderDetailsV2 = lazy(() => import('../pages/dashboard/OrderDetailsV2'));
export const AdvancedOrders = lazy(() => import('../pages/dashboard/AdvancedOrders'));
export const AbandonedOrders = lazy(() => import('../pages/dashboard/AbandonedOrders'));
export const BlockedCustomers = lazy(() => import('../pages/dashboard/BlockedCustomers'));

// ============ CUSTOMER MANAGEMENT ============
export const Customers = lazy(() => import('../pages/dashboard/Customers'));
export const CustomerDebts = lazy(() => import('../pages/dashboard/CustomerDebts'));
export const CustomerDebtDetails = lazy(() => import('../pages/dashboard/CustomerDebtDetails'));
export const PaymentHistory = lazy(() => import('../pages/dashboard/PaymentHistory'));

// ============ TEAM MANAGEMENT ============
export const Employees = lazy(() => import('../pages/dashboard/Employees'));
export const OrderDistributionSettings = lazy(() => import('../pages/OrderDistributionSettings'));
export const ConfirmationCenter = lazy(() => import('../pages/dashboard/ConfirmationCenter'));

// ============ ENHANCED ANALYTICS with Heavy Chart Preloading ============
export const Analytics = lazy(() =>
  import('../pages/dashboard/Analytics').then(module => {
    // Preload ALL chart dependencies when analytics loads
    Promise.all([
      import('@nivo/bar'),
      import('@nivo/line'),
      import('@nivo/pie'),
      import('recharts'),
      import('chart.js'),
      import('react-chartjs-2')
    ]).catch(() => {});
    return module;
  })
);

export const FinancialAnalytics = lazy(() =>
  import('../pages/FinancialAnalytics').then(module => {
    // Preload financial chart dependencies
    Promise.all([
      import('recharts'),
      import('chart.js'),
      import('react-chartjs-2')
    ]).catch(() => {});
    return module;
  })
);

export const Expenses = lazy(() => import('../pages/dashboard/Expenses'));
export const Invoices = lazy(() => 
  import('../pages/dashboard/Invoices').then(module => {
    // Preload PDF generation dependencies
    import('jspdf').catch(() => {});
    import('jspdf-autotable').catch(() => {});
    import('html2canvas').catch(() => {});
    return module;
  })
);

// ============ ENHANCED POS SYSTEM ============
export const POSOptimized = lazy(() => 
  import('../pages/POSOptimized').then(module => {
    // Preload barcode dependencies
    import('react-barcode').catch(() => {});
    import('qrcode.react').catch(() => {});
    return module;
  })
);

export const POSAdvanced = lazy(() => 
  import('../pages/POSAdvanced').then(module => {
    // Preload POS dependencies
    import('react-barcode').catch(() => {});
    import('qrcode.react').catch(() => {});
    return module;
  }).catch((error) => {
    console.error('❌ فشل تحميل POSAdvanced:', error);
    // fallback في حالة فشل التحميل
    return { default: () => <div className="flex items-center justify-center min-h-screen"><div className="text-center"><div className="text-xl mb-2">⚠️ فشل تحميل نقطة البيع</div><div className="text-sm text-gray-600">يرجى تحديث الصفحة</div></div></div> };
  })
);
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

// ============ REPAIR SERVICES ============
export const RepairServices = lazy(() => import('../pages/RepairServices'));

// ============ ENHANCED STORE CUSTOMIZATION ============
export const StoreEditor = lazy(() => 
  import('../pages/admin/StoreEditor').then(module => {
    // Preload editor dependencies
    import('@monaco-editor/react').catch(() => {});
    import('@dnd-kit/core').catch(() => {});
    return module;
  })
);

export const StoreEditorV2 = lazy(() => 
  import('../pages/dashboard/StoreEditorV2').then(module => {
    // Preload visual editor dependencies
    import('@tinymce/tinymce-react').catch(() => {});
    import('@dnd-kit/core').catch(() => {});
    return module;
  })
);

export const StoreSettingsPage = lazy(() => import('../pages/StoreSettingsPage'));

// ============ PAGE BUILDERS with DnD Preloading ============
export const LandingPagesManager = lazy(() => import('../pages/LandingPagesManager'));
export const LandingPageBuilder = lazy(() => 
  import('../pages/LandingPageBuilder').then(module => {
    // Preload drag & drop dependencies
    import('@dnd-kit/core').catch(() => {});
    import('@dnd-kit/sortable').catch(() => {});
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
    import('react-hook-form').catch(() => {});
    import('zod').catch(() => {});
    return module;
  })
);

export const ThankYouPageEditor = lazy(() => import('../pages/dashboard/ThankYouPageEditor'));

// ============ SETTINGS & CONFIGURATION ============
export const SettingsPage = lazy(() => import('../pages/dashboard/settings'));
export const DomainSettings = lazy(() => import('../pages/dashboard/DomainSettings'));

// ============ DATABASE ADMIN (Electron Only) ============
export const DatabaseAdmin = lazy(() => import('../pages/DatabaseAdmin'));

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
    '/dashboard/analytics': () => import('../pages/dashboard/Analytics'),
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
        importFn().catch(() => {});
      });
    });
  }
};
