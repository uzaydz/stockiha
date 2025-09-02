import React, { lazy } from 'react';

// 🚀 LAZY LOADING - تحميل المكونات فقط عند الحاجة إليها

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
export const Dashboard = lazy(() => import('../pages/Dashboard'));
export const Products = lazy(() => import('../pages/dashboard/ProductsCached'));
export const ProductsCached = lazy(() => import('../pages/dashboard/ProductsCached'));
export const Inventory = lazy(() => import('../pages/dashboard/Inventory'));
export const AdvancedInventoryTracking = lazy(() => import('../components/inventory/AdvancedInventoryTrackingPage'));
export const Categories = lazy(() => import('../pages/dashboard/Categories'));
export const OptimizedSales = lazy(() => import('../pages/dashboard/OptimizedSales'));
export const Orders = lazy(() => import('../pages/dashboard/Orders'));
export const OrdersV2 = lazy(() => import('../pages/dashboard/OrdersV2'));
export const OrderDetailsV2 = lazy(() => import('../pages/dashboard/OrderDetailsV2'));
export const AdvancedOrders = lazy(() => import('../pages/dashboard/AdvancedOrders'));
export const AbandonedOrders = lazy(() => import('../pages/dashboard/AbandonedOrders'));
export const Customers = lazy(() => import('../pages/dashboard/Customers'));
export const CustomerDebts = lazy(() => import('../pages/dashboard/CustomerDebts'));
export const CustomerDebtDetails = lazy(() => import('../pages/dashboard/CustomerDebtDetails'));
export const PaymentHistory = lazy(() => import('../pages/dashboard/PaymentHistory'));
export const Employees = lazy(() => import('../pages/dashboard/Employees'));
export const Expenses = lazy(() => import('../pages/dashboard/Expenses'));
export const Analytics = lazy(() => import('../pages/dashboard/Analytics'));
export const FinancialAnalytics = lazy(() => import('../pages/FinancialAnalytics'));
export const Invoices = lazy(() => import('../pages/dashboard/Invoices'));

// ============ نقطة البيع ============
export const POSOptimized = lazy(() => import('../pages/POSOptimized'));
export const POSAdvanced = lazy(() => import('../pages/POSAdvanced'));
export const POSOrdersOptimized = lazy(() => import('../pages/POSOrdersOptimized'));
export const ProductReturns = lazy(() => import('../pages/returns/ProductReturns'));
export const LossDeclarations = lazy(() => import('../pages/losses/LossDeclarations'));

// ============ الموردين ============
export const SuppliersManagement = lazy(() => import('../pages/dashboard/SuppliersManagement'));
export const SupplierPurchases = lazy(() => import('../pages/dashboard/SupplierPurchases'));
export const SupplierReports = lazy(() => import('../pages/dashboard/SupplierReports'));
export const SupplierPayments = lazy(() => import('../pages/dashboard/SupplierPayments'));

// ============ الإعدادات ============
export const SettingsPage = lazy(() => import('../pages/dashboard/settings'));
export const FormSettings = lazy(() => import('../pages/FormSettings'));
export const FormBuilder = lazy(() => import('../pages/FormBuilder'));
export const ThankYouPageEditor = lazy(() => import('../pages/dashboard/ThankYouPageEditor'));
export const DomainSettings = lazy(() => import('../pages/dashboard/DomainSettings'));
export const OrderDistributionSettings = lazy(() => import('../pages/OrderDistributionSettings'));

// ============ محرر المتجر والصفحات ============
export const StoreEditor = lazy(() => import('../pages/admin/StoreEditor'));
export const StoreEditorV2 = lazy(() => import('../pages/dashboard/StoreEditorV2'));
export const StoreSettingsPage = lazy(() => import('../pages/StoreSettingsPage'));
export const LandingPagesManager = lazy(() => import('../pages/LandingPagesManager'));
export const LandingPageBuilder = lazy(() => import('../pages/LandingPageBuilder'));
export const LandingPageView = lazy(() => import('../pages/LandingPageView'));
export const CustomPagesManager = lazy(() => import('../pages/dashboard/CustomPagesManager'));
export const CustomPageView = lazy(() => import('../pages/CustomPageView'));
export const CustomizeProductPurchasePage = lazy(() => import('../pages/dashboard/CustomizeProductPurchasePage'));

// ============ التطبيقات المتخصصة ============
export const FlexiManagement = lazy(() => import('../pages/dashboard/FlexiManagement'));
export const FlexiSales = lazy(() => import('../pages/dashboard/FlexiSales'));
export const FlexiAnalytics = lazy(() => import('../pages/dashboard/FlexiAnalytics'));
export const GameDownloadsPage = lazy(() => import('../pages/GameDownloadsPage'));
export const AppsManagement = lazy(() => import('../pages/AppsManagement'));
export const SubscriptionPage = lazy(() => import('../pages/dashboard/subscription'));
export const OnlineOrdersRechargePage = lazy(() => import('../pages/dashboard/online-orders-recharge'));
export const SubscriptionServices = lazy(() => import('../pages/dashboard/SubscriptionServices'));
export const DeliveryManagement = lazy(() => import('../pages/dashboard/DeliveryManagement'));

// ============ الدورات التعليمية ============
export const CoursesIndex = lazy(() => import('../pages/courses/CoursesIndex'));
export const DigitalMarketingCourse = lazy(() => import('../pages/courses/DigitalMarketingCourse'));
export const ECommerceCourse = lazy(() => import('../pages/courses/ECommerceCourse'));
export const ECommerceStoreCourse = lazy(() => import('../pages/courses/ECommerceStoreCourse'));
export const TikTokAdsCourse = lazy(() => import('../pages/courses/TikTokAdsCourse'));
export const TraditionalBusinessCourse = lazy(() => import('../pages/courses/TraditionalBusinessCourse'));
export const ServiceProvidersCourse = lazy(() => import('../pages/courses/ServiceProvidersCourse'));
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
export const ECommerceModule1 = lazy(() => import('../pages/courses/modules/ECommerceModule1'));
export const ECommerceModule2 = lazy(() => import('../pages/courses/modules/ECommerceModule2'));
// ============ الخدمات ============
export const RepairServices = lazy(() => import('../pages/RepairServices'));
export const ServiceRequestsPage = lazy(() => import('../pages/dashboard/ServiceRequestsPage'));

// ============ Super Admin ============
export const SuperAdminLogin = lazy(() => import('../pages/SuperAdminLogin'));
export const SuperAdminDashboard = lazy(() => import('../pages/super-admin/SuperAdminDashboard'));
export const SuperAdminOrganizations = lazy(() => import('../pages/super-admin/Organizations'));
export const SuperAdminSubscriptions = lazy(() => import('../pages/super-admin/Subscriptions'));
export const SuperAdminPaymentMethods = lazy(() => import('../pages/super-admin/PaymentMethods'));
export const ActivationCodesPage = lazy(() => import('../pages/super-admin/activation-codes'));
export const YalidineSyncPage = lazy(() => import('../pages/super-admin/YalidineSyncPage'));
export const SuperAdminSEO = lazy(() => import('../pages/SuperAdminSEO'));
export const SuperAdminCourses = lazy(() => import('../pages/SuperAdminCourses'));

// ============ Call Center ============
export const CallCenterLayout = lazy(() => import('../components/call-center/CallCenterLayout'));
export const CallCenterDashboard = lazy(() => import('../pages/call-center/CallCenterDashboard'));
export const AssignedOrders = lazy(() => import('../pages/call-center/orders/AssignedOrders'));
export const CallCenterComingSoon = lazy(() => import('../pages/dashboard/call-center/CallCenterComingSoon'));
export const AgentsManagementPage = lazy(() => import('../pages/admin/call-center/AgentsManagementPage'));
export const DistributionSettingsPage = lazy(() => import('../pages/admin/call-center/DistributionSettingsPage'));
export const ReportsPage = lazy(() => import('../pages/admin/call-center/ReportsPage'));
export const MonitoringPage = lazy(() => import('../pages/admin/call-center/MonitoringPage'));

// ============ أدوات أخرى ============
export const ProductForm = lazy(() => import('../pages/ProductForm'));
export const QuickBarcodePrintPage = lazy(() => import('../pages/dashboard/QuickBarcodePrintPage'));
export const NotFound = lazy(() => import('../pages/NotFound'));

// ============ مكونات خاصة ============
export const PublicGameTracking = lazy(() => import('../components/apps/game-downloads/PublicGameTracking'));

// Lazy loading للمكونات الخاصة بـ QR
export const GameDownloadStart = lazy(() => 
  import('../components/apps/game-downloads/QuickScanActions').then(module => ({ 
    default: module.GameDownloadStart 
  }))
);

export const GameOrderComplete = lazy(() => 
  import('../components/apps/game-downloads/QuickScanActions').then(module => ({ 
    default: module.GameOrderComplete 
  }))
);

// ============ تيك توك أدس ============
export const TikTokMarketingCourse = lazy(() => import('../pages/courses/TikTokAdsCourse'));
export const TikTokAdsModule0 = lazy(() => import('../pages/courses/modules/TikTokAdsModule0'));
export const TikTokAdsModule1 = lazy(() => import('../pages/courses/modules/TikTokAdsModule1'));
export const TikTokAdsModule2 = lazy(() => import('../pages/courses/modules/TikTokAdsModule2'));
export const TikTokAdsModule3 = lazy(() => import('../pages/courses/modules/TikTokAdsModule3'));
export const TikTokAdsModule4 = lazy(() => import('../pages/courses/modules/TikTokAdsModule4'));
export const TikTokAdsModule5 = lazy(() => import('../pages/courses/modules/TikTokAdsModule5'));
export const TikTokAdsModule6 = lazy(() => import('../pages/courses/modules/TikTokAdsModule6'));
export const TikTokAdsModule7 = lazy(() => import('../pages/courses/modules/TikTokAdsModule7'));
export const TikTokAdsModule8 = lazy(() => import('../pages/courses/modules/TikTokAdsModule8'));
