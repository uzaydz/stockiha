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
  Database,
  Tag,
  Truck,
  Home,
  FileBarChart,
  Receipt,
  Phone,
  Wallet,
  BanknoteIcon,
  Layout,
  Globe,
  GraduationCap,
  BookOpen,
  SlidersHorizontal,
  Tv,
  RotateCcw,
  AlertTriangle,
  Grid3X3,
  Smartphone,
  CreditCard,
  Gamepad2,
  Activity,
  Zap
} from 'lucide-react';

import { NavGroup } from './types';

export const createNavigationData = (isAppEnabledMemo: (appId: string) => boolean): NavGroup[] => [
  // المجموعة الأساسية
  {
    group: 'الرئيسية',
    icon: Home,
    requiredPermission: null,
    items: [
      {
        title: 'لوحة التحكم',
        icon: LayoutDashboard,
        href: '/dashboard',
        requiredPermission: null,
        badge: null
      },
    ]
  },

  // إدارة التطبيقات
  {
    group: 'إدارة التطبيقات',
    icon: Grid3X3,
    requiredPermission: 'manageOrganizationSettings',
    items: [
      {
        title: 'إدارة التطبيقات',
        icon: Grid3X3,
        href: '/dashboard/apps',
        requiredPermission: 'manageOrganizationSettings',
        badge: 'جديد'
      },
    ]
  },

  // نظام نقطة البيع - يظهر فقط إذا كان مفعّل
  ...(isAppEnabledMemo('pos-system') ? [{
    group: 'نظام نقطة البيع',
    icon: Store,
    requiredPermission: 'accessPOS',
    items: [
      {
        title: 'نقطة البيع',
        icon: Zap,
        href: '/dashboard/pos-advanced',
        requiredPermission: 'accessPOS',
        badge: null
      },
      {
        title: 'طلبيات نقطة البيع',
        icon: Receipt,
        href: '/dashboard/pos-orders',
        requiredPermission: 'accessPOS',
        badge: null
      },
      {
        title: 'إدارة المديونيات',
        icon: BanknoteIcon,
        href: '/dashboard/customer-debts',
        requiredPermission: 'viewDebts',
        badge: null
      },
      {
        title: 'إرجاع المنتجات',
        icon: RotateCcw,
        href: '/dashboard/returns',
        requiredPermission: 'accessPOS',
        badge: null
      },
      {
        title: 'التصريح بالخسائر',
        icon: AlertTriangle,
        href: '/dashboard/losses',
        requiredPermission: 'accessPOS',
        badge: null
      },
    ]
  }] : []),

  // المنتجات والمخزون
  {
    group: 'المنتجات والمخزون',
    icon: Package,
    requiredPermission: 'viewProducts',
    items: [
      {
        title: 'المنتجات',
        icon: Package,
        href: '/dashboard/products',
        requiredPermission: 'viewProducts',
        badge: null
      },
      {
        title: 'الفئات',
        icon: Tag,
        href: '/dashboard/categories',
        requiredPermission: 'manageProductCategories',
        badge: null
      },
      {
        title: 'المخزون',
        icon: Database,
        href: '/dashboard/inventory',
        requiredPermission: 'viewInventory',
        badge: '5'
      },
      {
        title: 'تتبع المخزون المتقدم',
        icon: Activity,
        href: '/dashboard/inventory-tracking',
        requiredPermission: 'viewInventory',
        badge: 'جديد'
      },
    ]
  },

  // الخدمات - تظهر فقط إذا كان هناك تطبيق مفعّل
  ...(isAppEnabledMemo('repair-services') || isAppEnabledMemo('subscription-services') ? [{
    group: 'الخدمات',
    icon: Wrench,
    requiredPermission: 'viewServices',
    items: [
      ...(isAppEnabledMemo('repair-services') ? [{
        title: 'خدمات التصليح',
        icon: SlidersHorizontal,
        href: '/dashboard/repair-services',
        requiredPermission: 'viewServices',
        badge: 'جديد'
      }] : []),
      ...(isAppEnabledMemo('subscription-services') ? [{
        title: 'خدمات الاشتراكات',
        icon: Tv,
        href: '/dashboard/subscription-services',
        requiredPermission: 'viewServices',
        badge: 'جديد'
      }] : []),
    ]
  }] : []),

  // فليكسي وعملات رقمية
  ...(isAppEnabledMemo('flexi-crypto') ? [{
    group: 'فليكسي وعملات رقمية',
    icon: Smartphone,
    requiredPermission: 'viewFlexiCrypto',
    items: [
      {
        title: 'إدارة الرصيد',
        icon: Wallet,
        href: '/dashboard/flexi-management',
        requiredPermission: 'manageFlexiBalance',
        badge: null
      },
      {
        title: 'بيع الفليكسي والعملات',
        icon: CreditCard,
        href: '/dashboard/flexi-sales',
        requiredPermission: 'sellFlexiCrypto',
        badge: null
      },
      {
        title: 'تحليلات المبيعات',
        icon: BarChart3,
        href: '/dashboard/flexi-analytics',
        requiredPermission: 'viewFlexiAnalytics',
        badge: null
      },
    ]
  }] : []),

  // تحميل الألعاب
  ...(isAppEnabledMemo('game-downloads') ? [{
    group: 'تحميل الألعاب',
    icon: Gamepad2,
    requiredPermission: 'manageGameDownloads',
    items: [
      {
        title: 'إدارة تحميل الألعاب',
        icon: Gamepad2,
        href: '/dashboard/game-downloads',
        requiredPermission: 'manageGameDownloads',
        badge: 'جديد'
      },
    ]
  }] : []),

  // المبيعات والطلبات
  {
    group: 'المبيعات والطلبات',
    icon: ShoppingBag,
    requiredPermission: 'viewOrders',
    items: [
      {
        title: 'الطلبات',
        icon: ShoppingBag,
        href: '/dashboard/orders',
        requiredPermission: 'viewOrders',
        badge: '12'
      },
      {
        title: 'الطلبات المتروكة',
        icon: ShoppingBag,
        href: '/dashboard/abandoned-orders',
        requiredPermission: 'viewOrders',
        badge: 'جديد'
      },
      {
        title: 'المبيعات',
        icon: DollarSign,
        href: '/dashboard/sales',
        requiredPermission: 'viewSalesReports',
        badge: null
      },
      {
        title: 'الفواتير',
        icon: FileText,
        href: '/dashboard/invoices',
        requiredPermission: 'viewOrders',
        badge: null
      },
    ]
  },

  // العملاء
  {
    group: 'العملاء',
    icon: Users,
    requiredPermission: 'viewCustomers',
    items: [
      {
        title: 'العملاء',
        icon: Users,
        href: '/dashboard/customers',
        requiredPermission: 'viewCustomers',
        badge: null
      },
    ]
  },

  // الموردين والمشتريات
  {
    group: 'الموردين والمشتريات',
    icon: Truck,
    requiredPermission: 'viewSuppliers',
    items: [
      {
        title: 'الموردين',
        icon: Users,
        href: '/dashboard/suppliers',
        requiredPermission: 'viewSuppliers',
        badge: 'جديد'
      },
      {
        title: 'المشتريات',
        icon: ShoppingBag,
        href: '/dashboard/suppliers/purchases',
        requiredPermission: 'managePurchases',
        badge: null
      },
      {
        title: 'المدفوعات',
        icon: Receipt,
        href: '/dashboard/suppliers/payments',
        requiredPermission: 'managePurchases',
        badge: null
      },
    ]
  },

  // التقارير والتحليلات
  {
    group: 'التقارير والتحليلات',
    icon: BarChart3,
    requiredPermission: 'viewReports',
    items: [
      {
        title: 'التحليلات المالية الشاملة',
        icon: Activity,
        href: '/dashboard/financial-analytics',
        requiredPermission: 'viewFinancialReports',
        badge: 'جديد'
      },
      {
        title: 'التقارير المالية',
        icon: BarChart3,
        href: '/dashboard/reports',
        requiredPermission: 'viewFinancialReports',
        badge: null
      },
      {
        title: 'تحليلات المبيعات',
        icon: BarChart3,
        href: '/dashboard/analytics',
        requiredPermission: 'viewSalesReports',
        badge: null
      },
      {
        title: 'المصروفات',
        icon: DollarSign,
        href: '/dashboard/expenses',
        requiredPermission: 'viewFinancialReports',
        badge: null
      },
      {
        title: 'تقارير الموردين',
        icon: FileBarChart,
        href: '/dashboard/suppliers/reports',
        requiredPermission: 'viewReports',
        badge: null
      },
    ]
  },

  // الموظفين والصلاحيات
  {
    group: 'الموظفين والصلاحيات',
    icon: Users,
    requiredPermission: 'viewEmployees',
    items: [
      {
        title: 'الموظفين',
        icon: Users,
        href: '/dashboard/employees',
        requiredPermission: 'viewEmployees',
        badge: null
      },
      {
        title: 'تقسيم الطلبيات',
        icon: LayoutDashboard,
        href: '/dashboard/order-distribution',
        requiredPermission: 'manageEmployees',
        badge: 'جديد'
      },
    ]
  },

  // مركز الاتصالات
  {
    group: 'مركز الاتصالات',
    icon: Phone,
    requiredPermission: null,
    items: [
      {
        title: 'مركز الاتصالات',
        icon: Phone,
        href: '/dashboard/call-center',
        requiredPermission: null,
        badge: 'قريباً'
      },
      {
        title: 'إدارة الوكلاء',
        icon: Users,
        href: '/dashboard/call-center/agents',
        requiredPermission: 'manageOrganizationSettings',
        badge: 'قريباً'
      },
      {
        title: 'تقسيم الطلبات',
        icon: SlidersHorizontal,
        href: '/dashboard/call-center/distribution',
        requiredPermission: 'manageOrganizationSettings',
        badge: 'قريباً'
      },
      {
        title: 'التقارير والتحليلات',
        icon: FileBarChart,
        href: '/dashboard/call-center/reports',
        requiredPermission: 'manageOrganizationSettings',
        badge: 'قريباً'
      },
      {
        title: 'المراقبة المباشرة',
        icon: BarChart3,
        href: '/dashboard/call-center/monitoring',
        requiredPermission: 'manageOrganizationSettings',
        badge: 'قريباً'
      },
    ]
  },

  // دورات سطوكيها
  {
    group: 'دورات سطوكيها',
    icon: GraduationCap,
    requiredPermission: null,
    badge: 'قريباً',
    items: [
      {
        title: 'دورة التسويق الإلكتروني',
        icon: BookOpen,
        href: '/dashboard/courses/digital-marketing',
        requiredPermission: null,
        badge: 'جديد'
      },
      {
        title: 'دورة التسويق عبر التيك توك',
        icon: BookOpen,
        href: '/dashboard/courses/tiktok-marketing',
        requiredPermission: null,
        badge: 'جديد'
      },
      {
        title: 'دورة صنع متجر إلكتروني',
        icon: BookOpen,
        href: '/dashboard/courses/e-commerce-store',
        requiredPermission: null,
        badge: 'جديد'
      },
      {
        title: 'دورة التجارة الإلكترونية',
        icon: BookOpen,
        href: '/dashboard/courses/e-commerce',
        requiredPermission: null,
        badge: 'جديد'
      },
    ]
  },

  // إعدادات المتجر
  {
    group: 'إعدادات المتجر',
    icon: Store,
    requiredPermission: 'manageOrganizationSettings',
    items: [
      {
        title: 'تخصيص المتجر',
        icon: Store,
        href: '/dashboard/store-editor',
        requiredPermission: 'manageOrganizationSettings',
        badge: 'جديد'
      },
      {
        title: 'صفحات الهبوط',
        icon: Layout,
        href: '/dashboard/landing-pages',
        requiredPermission: 'manageOrganizationSettings',
        badge: 'جديد'
      },
      {
        title: 'إعدادات النماذج',
        icon: FileText,
        href: '/dashboard/form-settings',
        requiredPermission: 'manageOrganizationSettings',
        badge: 'جديد'
      },
      {
        title: 'إعدادات صفحة الشكر',
        icon: FileText,
        href: '/dashboard/thank-you-editor',
        requiredPermission: 'manageOrganizationSettings',
        badge: 'جديد'
      },
      {
        title: 'إدارة التوصيل',
        icon: Truck,
        href: '/dashboard/delivery',
        requiredPermission: 'manageOrganizationSettings',
        badge: 'جديد'
      },
    ]
  },

  // الإعدادات العامة
  {
    group: 'الإعدادات العامة',
    icon: Settings,
    requiredPermission: null,
    items: [
      {
        title: 'الإعدادات',
        icon: Settings,
        href: '/dashboard/settings',
        requiredPermission: 'viewSettings',
        badge: null
      },
      {
        title: 'الاشتراكات',
        icon: Wallet,
        href: '/dashboard/subscription',
        requiredPermission: null,
        badge: null
      },
      {
        title: 'النطاقات المخصصة',
        icon: Globe,
        href: '/dashboard/custom-domains',
        requiredPermission: 'manageOrganizationSettings',
        badge: 'جديد'
      },
      {
        title: 'دليل النطاقات',
        icon: FileText,
        href: '/docs/custom-domains',
        requiredPermission: 'manageOrganizationSettings',
        badge: null
      },
    ]
  },
]; 