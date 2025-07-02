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
export const AdminSignup = lazy(() => import('../pages/AdminSignup'));
export const TenantSignup = lazy(() => import('../pages/TenantSignup'));
export const OrganizationSetup = lazy(() => import('../pages/OrganizationSetup'));

// ============ صفحات لوحة التحكم ============
export const Dashboard = lazy(() => import('../pages/Dashboard'));
export const Products = lazy(() => import('../pages/dashboard/Products'));
export const Inventory = lazy(() => import('../pages/dashboard/Inventory'));
export const Categories = lazy(() => import('../pages/dashboard/Categories'));
export const OptimizedSales = lazy(() => import('../pages/dashboard/OptimizedSales'));
export const Orders = lazy(() => import('../pages/dashboard/Orders'));
export const AbandonedOrders = lazy(() => import('../pages/dashboard/AbandonedOrders'));
export const Customers = lazy(() => import('../pages/dashboard/Customers'));
export const CustomerDebts = lazy(() => import('../pages/dashboard/CustomerDebts'));
export const CustomerDebtDetails = lazy(() => import('../pages/dashboard/CustomerDebtDetails'));
export const PaymentHistory = lazy(() => import('../pages/dashboard/PaymentHistory'));
export const Employees = lazy(() => import('../pages/dashboard/Employees'));
export const Expenses = lazy(() => import('../pages/dashboard/Expenses'));
export const Analytics = lazy(() => import('../pages/dashboard/Analytics'));
export const Invoices = lazy(() => import('../pages/dashboard/Invoices'));
export const FinancialReports = lazy(() => import('../pages/dashboard/reports'));

// ============ نقطة البيع ============
export const POSOptimized = lazy(() => import('../pages/POSOptimized'));
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
export const SubscriptionServices = lazy(() => import('../pages/dashboard/SubscriptionServices'));
export const DeliveryManagement = lazy(() => import('../pages/dashboard/DeliveryManagement'));

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
