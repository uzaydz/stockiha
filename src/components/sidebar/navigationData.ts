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
  Zap,
  Ban
} from 'lucide-react';

import { NavGroup, MerchantType } from './types';

// دالة لفلترة العناصر حسب نوع التاجر
const filterItemsByMerchantType = (items: any[], merchantType: MerchantType) => {
  return items.filter(item => {
    if (!item.allowedMerchantTypes) return true; // إذا لم يتم تحديد نوع التاجر، يظهر للجميع
    return item.allowedMerchantTypes.includes(merchantType) || item.allowedMerchantTypes.includes('both');
  });
};

// دالة لفلترة المجموعات حسب نوع التاجر
const filterGroupsByMerchantType = (groups: NavGroup[], merchantType: MerchantType): NavGroup[] => {
  return groups
    .map(group => {
      const filteredItems = filterItemsByMerchantType(group.items, merchantType);
      
      return {
        ...group,
        items: filteredItems
      };
    })
    .filter(group => {
      // إزالة المجموعات التي لا تحتوي على عناصر بعد الفلترة
      if (group.items.length === 0) {
        return false;
      }
      
      // التحقق من نوع التاجر المسموح للمجموعة
      if (!group.allowedMerchantTypes) {
        return true;
      }
      
      // 'both' يعني فقط عندما يكون merchantType هو 'both'
      const shouldKeep = group.allowedMerchantTypes.includes(merchantType);
      
      return shouldKeep;
    });
};

export const createNavigationData = (
  isAppEnabledMemo: (appId: string) => boolean, 
  merchantType: MerchantType = 'both'
): NavGroup[] => {
  
  const allGroups: NavGroup[] = [
    // المجموعة الأساسية - تظهر للجميع
    {
      group: 'الرئيسية',
      icon: Home,
      requiredPermission: null,
      allowedMerchantTypes: ['traditional', 'ecommerce', 'both'],
      items: [
        {
          title: 'لوحة التحكم',
          icon: LayoutDashboard,
          href: '/dashboard',
          requiredPermission: null,
          badge: null,
          allowedMerchantTypes: ['traditional', 'ecommerce', 'both']
        },
      ]
    },

    // إدارة التطبيقات - تظهر للجميع
    {
      group: 'إدارة التطبيقات',
      icon: Grid3X3,
      requiredPermission: 'manageOrganizationSettings',
      allowedMerchantTypes: ['traditional', 'ecommerce', 'both'],
      items: [
        {
          title: 'إدارة التطبيقات',
          icon: Grid3X3,
          href: '/dashboard/apps',
          requiredPermission: 'manageOrganizationSettings',
          badge: 'جديد',
          allowedMerchantTypes: ['traditional', 'ecommerce', 'both']
        },
      ]
    },

    // نظام نقطة البيع - للتجار التقليديين أو كلاهما
    ...(isAppEnabledMemo('pos-system') ? [{
      group: 'نظام نقطة البيع',
      icon: Store,
      requiredPermission: 'accessPOS',
      allowedMerchantTypes: ['traditional', 'both'] as MerchantType[],
      items: [
        {
          title: 'نقطة البيع',
          icon: Zap,
          href: '/dashboard/pos-advanced',
          requiredPermission: 'accessPOS',
          badge: null,
          allowedMerchantTypes: ['traditional', 'both'] as MerchantType[]
        },
        {
          title: 'طلبيات نقطة البيع',
          icon: Receipt,
          href: '/dashboard/pos-orders',
          requiredPermission: 'viewPOSOrders',
          badge: null,
          allowedMerchantTypes: ['traditional', 'both'] as MerchantType[]
        },
        {
          title: 'إدارة المديونيات',
          icon: BanknoteIcon,
          href: '/dashboard/customer-debts',
          requiredPermission: 'viewDebts',
          badge: null,
          allowedMerchantTypes: ['traditional', 'both'] as MerchantType[]
        },
        {
          title: 'إرجاع المنتجات',
          icon: RotateCcw,
          href: '/dashboard/returns',
          requiredPermission: 'accessPOS',
          badge: null,
          allowedMerchantTypes: ['traditional', 'both'] as MerchantType[]
        },
        {
          title: 'التصريح بالخسائر',
          icon: AlertTriangle,
          href: '/dashboard/losses',
          requiredPermission: 'accessPOS',
          badge: null,
          allowedMerchantTypes: ['traditional', 'both'] as MerchantType[]
        },
      ]
    }] : []),

    // المنتجات والمخزون - تظهر للجميع
    {
      group: 'المنتجات والمخزون',
      icon: Package,
      requiredPermission: 'viewProducts',
      allowedMerchantTypes: ['traditional', 'ecommerce', 'both'],
      items: [
        {
          title: 'المنتجات',
          icon: Package,
          href: '/dashboard/products',
          requiredPermission: 'viewProducts',
          badge: null,
          allowedMerchantTypes: ['traditional', 'ecommerce', 'both']
        },
        {
          title: 'الفئات',
          icon: Tag,
          href: '/dashboard/categories',
          requiredPermission: 'manageProductCategories',
          badge: null,
          allowedMerchantTypes: ['traditional', 'ecommerce', 'both']
        },
        {
          title: 'المخزون',
          icon: Database,
          href: '/dashboard/inventory',
          requiredPermission: 'viewInventory',
          badge: '5',
          allowedMerchantTypes: ['traditional', 'ecommerce', 'both']
        },
        {
          title: 'تتبع المخزون المتقدم',
          icon: Activity,
          href: '/dashboard/inventory-tracking',
          requiredPermission: 'viewInventory',
          badge: 'جديد',
          allowedMerchantTypes: ['traditional', 'ecommerce', 'both']
        },
      ]
    },

    // المبيعات والطلبات - تظهر للجميع مع اختلاف في العناصر
    {
      group: 'المبيعات والطلبات',
      icon: ShoppingBag,
      requiredPermission: 'viewOrders',
      allowedMerchantTypes: ['traditional', 'ecommerce', 'both'],
      items: [
        {
          title: 'الطلبات الإلكترونية',
          icon: ShoppingBag,
          href: '/dashboard/orders-v2',
          requiredPermission: 'viewOrders',
          badge: '12',
          allowedMerchantTypes: ['ecommerce', 'both']
        },
        {
          title: 'قائمة المحظورين',
          icon: Ban,
          href: '/dashboard/blocked-customers',
          requiredPermission: 'viewOrders',
          badge: null,
          allowedMerchantTypes: ['ecommerce', 'both']
        },
        {
          title: 'الطلبات المتروكة',
          icon: ShoppingBag,
          href: '/dashboard/abandoned-orders',
          requiredPermission: 'viewOrders',
          badge: 'جديد',
          allowedMerchantTypes: ['ecommerce', 'both']
        },
        {
          title: 'المبيعات',
          icon: DollarSign,
          href: '/dashboard/sales',
          requiredPermission: 'viewSalesReports',
          badge: null,
          allowedMerchantTypes: ['traditional', 'ecommerce', 'both']
        },
        {
          title: 'الفواتير',
          icon: FileText,
          href: '/dashboard/invoices',
          requiredPermission: 'viewOrders',
          badge: null,
          allowedMerchantTypes: ['traditional', 'ecommerce', 'both']
        },
      ]
    },

    // الخدمات - تظهر للتجار التقليديين أو كلاهما
    ...(isAppEnabledMemo('repair-services') || isAppEnabledMemo('subscription-services') ? [{
      group: 'الخدمات',
      icon: Wrench,
      requiredPermission: 'viewServices',
      allowedMerchantTypes: ['traditional', 'both'] as MerchantType[],
      items: [
        ...(isAppEnabledMemo('repair-services') ? [{
          title: 'خدمات التصليح',
          icon: SlidersHorizontal,
          href: '/dashboard/repair-services',
          requiredPermission: 'viewServices',
          badge: 'جديد',
          allowedMerchantTypes: ['traditional', 'both'] as MerchantType[]
        }] : []),
        ...(isAppEnabledMemo('subscription-services') ? [{
          title: 'خدمات الاشتراكات',
          icon: Tv,
          href: '/dashboard/subscription-services',
          requiredPermission: 'viewServices',
          badge: 'جديد',
          allowedMerchantTypes: ['traditional', 'both'] as MerchantType[]
        }] : []),
      ]
    }] : []),

    // العملاء - تظهر للجميع
    {
      group: 'العملاء',
      icon: Users,
      requiredPermission: 'viewCustomers',
      allowedMerchantTypes: ['traditional', 'ecommerce', 'both'],
      items: [
        {
          title: 'العملاء',
          icon: Users,
          href: '/dashboard/customers',
          requiredPermission: 'viewCustomers',
          badge: null,
          allowedMerchantTypes: ['traditional', 'ecommerce', 'both']
        },
      ]
    },

    // الموردين والمشتريات - تظهر للجميع
    {
      group: 'الموردين والمشتريات',
      icon: Truck,
      requiredPermission: 'viewSuppliers',
      allowedMerchantTypes: ['traditional', 'ecommerce', 'both'],
      items: [
        {
          title: 'الموردين',
          icon: Users,
          href: '/dashboard/suppliers',
          requiredPermission: 'viewSuppliers',
          badge: 'جديد',
          allowedMerchantTypes: ['traditional', 'ecommerce', 'both']
        },
        {
          title: 'المشتريات',
          icon: ShoppingBag,
          href: '/dashboard/suppliers/purchases',
          requiredPermission: 'managePurchases',
          badge: null,
          allowedMerchantTypes: ['traditional', 'ecommerce', 'both']
        },
        {
          title: 'المدفوعات',
          icon: Receipt,
          href: '/dashboard/suppliers/payments',
          requiredPermission: 'managePurchases',
          badge: null,
          allowedMerchantTypes: ['traditional', 'ecommerce', 'both']
        },
      ]
    },

    // فليكسي وعملات رقمية - للتجار التقليديين أو كلاهما
    ...(isAppEnabledMemo('flexi-crypto') ? [{
      group: 'فليكسي وعملات رقمية',
      icon: Smartphone,
      requiredPermission: 'viewFlexiCrypto',
      allowedMerchantTypes: ['traditional', 'both'] as MerchantType[],
      items: [
        {
          title: 'إدارة الرصيد',
          icon: Wallet,
          href: '/dashboard/flexi-management',
          requiredPermission: 'manageFlexiBalance',
          badge: null,
          allowedMerchantTypes: ['traditional', 'both'] as MerchantType[]
        },
        {
          title: 'بيع الفليكسي والعملات',
          icon: CreditCard,
          href: '/dashboard/flexi-sales',
          requiredPermission: 'sellFlexiCrypto',
          badge: null,
          allowedMerchantTypes: ['traditional', 'both'] as MerchantType[]
        },
        {
          title: 'تحليلات المبيعات',
          icon: BarChart3,
          href: '/dashboard/flexi-analytics',
          requiredPermission: 'viewFlexiAnalytics',
          badge: null,
          allowedMerchantTypes: ['traditional', 'both'] as MerchantType[]
        },
      ]
    }] : []),

    // تحميل الألعاب - للتجار التقليديين أو كلاهما
    ...(isAppEnabledMemo('game-downloads') ? [{
      group: 'تحميل الألعاب',
      icon: Gamepad2,
      requiredPermission: 'manageGameDownloads',
      allowedMerchantTypes: ['traditional', 'both'] as MerchantType[],
      items: [
        {
          title: 'إدارة تحميل الألعاب',
          icon: Gamepad2,
          href: '/dashboard/game-downloads',
          requiredPermission: 'manageGameDownloads',
          badge: 'جديد',
          allowedMerchantTypes: ['traditional', 'both'] as MerchantType[]
        },
      ]
    }] : []),

    // إعدادات المتجر الإلكتروني - للتجار الإلكترونيين أو كلاهما
    {
      group: 'إعدادات المتجر الإلكتروني',
      icon: Store,
      requiredPermission: 'manageOrganizationSettings',
      allowedMerchantTypes: ['ecommerce', 'both'],
      items: [
        {
          title: 'إعدادات المتجر',
          icon: Settings,
          href: '/dashboard/store-settings',
          requiredPermission: 'manageOrganizationSettings',
          badge: 'جديد',
          allowedMerchantTypes: ['ecommerce', 'both']
        },
        {
          title: 'تخصيص المتجر',
          icon: Store,
          href: '/dashboard/store-editor',
          requiredPermission: 'manageOrganizationSettings',
          badge: 'جديد',
          allowedMerchantTypes: ['ecommerce', 'both']
        },
        {
          title: 'محرر المتجر V2',
          icon: Layout,
          href: '/dashboard/store-editor-v2',
          requiredPermission: 'manageOrganizationSettings',
          badge: 'تجريبي',
          allowedMerchantTypes: ['ecommerce', 'both']
        },
        {
          title: 'صفحات الهبوط',
          icon: Layout,
          href: '/dashboard/landing-pages',
          requiredPermission: 'manageOrganizationSettings',
          badge: 'جديد',
          allowedMerchantTypes: ['ecommerce', 'both']
        },
        {
          title: 'إعدادات النماذج',
          icon: FileText,
          href: '/dashboard/form-settings',
          requiredPermission: 'manageOrganizationSettings',
          badge: 'جديد',
          allowedMerchantTypes: ['ecommerce', 'both']
        },
        {
          title: 'إعدادات صفحة الشكر',
          icon: FileText,
          href: '/dashboard/thank-you-editor',
          requiredPermission: 'manageOrganizationSettings',
          badge: 'جديد',
          allowedMerchantTypes: ['ecommerce', 'both']
        },
        {
          title: 'إدارة التوصيل',
          icon: Truck,
          href: '/dashboard/delivery',
          requiredPermission: 'manageOrganizationSettings',
          badge: 'جديد',
          allowedMerchantTypes: ['ecommerce', 'both']
        },
      ]
    },

    // التقارير والتحليلات - تظهر للجميع
    {
      group: 'التقارير والتحليلات',
      icon: BarChart3,
      requiredPermission: 'viewReports',
      allowedMerchantTypes: ['traditional', 'ecommerce', 'both'],
      items: [
        {
          title: 'التحليلات المالية الشاملة',
          icon: Activity,
          href: '/dashboard/financial-analytics',
          requiredPermission: 'viewFinancialReports',
          badge: 'جديد',
          allowedMerchantTypes: ['traditional', 'ecommerce', 'both']
        },
        {
          title: 'تحليلات المبيعات',
          icon: BarChart3,
          href: '/dashboard/analytics',
          requiredPermission: 'viewSalesReports',
          badge: null,
          allowedMerchantTypes: ['traditional', 'ecommerce', 'both']
        },
        {
          title: 'المصروفات',
          icon: DollarSign,
          href: '/dashboard/expenses',
          requiredPermission: 'viewFinancialReports',
          badge: null,
          allowedMerchantTypes: ['traditional', 'ecommerce', 'both']
        },
        {
          title: 'تقارير الموردين',
          icon: FileBarChart,
          href: '/dashboard/suppliers/reports',
          requiredPermission: 'viewReports',
          badge: null,
          allowedMerchantTypes: ['traditional', 'ecommerce', 'both']
        },
      ]
    },

    // الموظفين والصلاحيات - تظهر للجميع
    {
      group: 'الموظفين والصلاحيات',
      icon: Users,
      requiredPermission: 'viewEmployees',
      allowedMerchantTypes: ['traditional', 'ecommerce', 'both'],
      items: [
        {
          title: 'الموظفين',
          icon: Users,
          href: '/dashboard/employees',
          requiredPermission: 'viewEmployees',
          badge: null,
          allowedMerchantTypes: ['traditional', 'ecommerce', 'both']
        },
        {
          title: 'تقسيم الطلبيات',
          icon: LayoutDashboard,
          href: '/dashboard/order-distribution',
          requiredPermission: 'manageEmployees',
          badge: 'جديد',
          allowedMerchantTypes: ['traditional', 'ecommerce', 'both']
        },
      ]
    },

    // مركز الاتصالات - تظهر للجميع
    {
      group: 'مركز الاتصالات',
      icon: Phone,
      requiredPermission: null,
      allowedMerchantTypes: ['traditional', 'ecommerce', 'both'],
      items: [
        {
          title: 'مركز الاتصالات',
          icon: Phone,
          href: '/dashboard/call-center',
          requiredPermission: null,
          badge: 'قريباً',
          allowedMerchantTypes: ['traditional', 'ecommerce', 'both']
        },
        {
          title: 'إدارة الوكلاء',
          icon: Users,
          href: '/dashboard/call-center/agents',
          requiredPermission: 'manageOrganizationSettings',
          badge: 'قريباً',
          allowedMerchantTypes: ['traditional', 'ecommerce', 'both']
        },
        {
          title: 'تقسيم الطلبات',
          icon: SlidersHorizontal,
          href: '/dashboard/call-center/distribution',
          requiredPermission: 'manageOrganizationSettings',
          badge: 'قريباً',
          allowedMerchantTypes: ['traditional', 'ecommerce', 'both']
        },
        {
          title: 'التقارير والتحليلات',
          icon: FileBarChart,
          href: '/dashboard/call-center/reports',
          requiredPermission: 'manageOrganizationSettings',
          badge: 'قريباً',
          allowedMerchantTypes: ['traditional', 'ecommerce', 'both']
        },
        {
          title: 'المراقبة المباشرة',
          icon: BarChart3,
          href: '/dashboard/call-center/monitoring',
          requiredPermission: 'manageOrganizationSettings',
          badge: 'قريباً',
          allowedMerchantTypes: ['traditional', 'ecommerce', 'both']
        },
      ]
    },

    // دورات سطوكيها - تظهر للجميع
    {
      group: 'دورات سطوكيها',
      icon: GraduationCap,
      requiredPermission: null,
      badge: 'قريباً',
      allowedMerchantTypes: ['traditional', 'ecommerce', 'both'],
      items: [
        {
          title: 'جميع الدورات',
          icon: GraduationCap,
          href: '/dashboard/courses',
          requiredPermission: null,
          badge: null,
          allowedMerchantTypes: ['traditional', 'ecommerce', 'both']
        },
        {
          title: 'دورة التسويق الإلكتروني',
          icon: BookOpen,
          href: '/dashboard/courses/digital-marketing',
          requiredPermission: null,
          badge: 'جديد',
          allowedMerchantTypes: ['ecommerce', 'both']
        },
        {
          title: 'دورة التسويق عبر التيك توك',
          icon: BookOpen,
          href: '/dashboard/courses/tiktok-marketing',
          requiredPermission: null,
          badge: 'جديد',
          allowedMerchantTypes: ['ecommerce', 'both']
        },
        {
          title: 'دورة صنع متجر إلكتروني',
          icon: BookOpen,
          href: '/dashboard/courses/e-commerce-store',
          requiredPermission: null,
          badge: 'جديد',
          allowedMerchantTypes: ['ecommerce', 'both']
        },
        {
          title: 'دورة التجارة الإلكترونية',
          icon: BookOpen,
          href: '/dashboard/courses/e-commerce',
          requiredPermission: null,
          badge: 'جديد',
          allowedMerchantTypes: ['ecommerce', 'both']
        },
        {
          title: 'دورة التجار التقليديين',
          icon: BookOpen,
          href: '/dashboard/courses/traditional-business',
          requiredPermission: null,
          badge: 'جديد',
          allowedMerchantTypes: ['traditional', 'both']
        },
        {
          title: 'دورة مقدمي الخدمات',
          icon: BookOpen,
          href: '/dashboard/courses/service-providers',
          requiredPermission: null,
          badge: 'جديد',
          allowedMerchantTypes: ['traditional', 'ecommerce', 'both']
        },
      ]
    },

    // الإعدادات العامة - تظهر للجميع
    {
      group: 'الإعدادات العامة',
      icon: Settings,
      requiredPermission: null,
      allowedMerchantTypes: ['traditional', 'ecommerce', 'both'],
      items: [
        {
          title: 'الإعدادات',
          icon: Settings,
          href: '/dashboard/settings',
          requiredPermission: 'viewSettings',
          badge: null,
          allowedMerchantTypes: ['traditional', 'ecommerce', 'both']
        },
        {
          title: 'الاشتراكات',
          icon: Wallet,
          href: '/dashboard/subscription',
          requiredPermission: null,
          badge: null,
          allowedMerchantTypes: ['traditional', 'ecommerce', 'both']
        },
        {
          title: 'النطاقات المخصصة',
          icon: Globe,
          href: '/dashboard/custom-domains',
          requiredPermission: 'manageOrganizationSettings',
          badge: 'جديد',
          allowedMerchantTypes: ['ecommerce', 'both']
        },
        {
          title: 'دليل النطاقات',
          icon: FileText,
          href: '/docs/custom-domains',
          requiredPermission: 'manageOrganizationSettings',
          badge: null,
          allowedMerchantTypes: ['ecommerce', 'both']
        },
      ]
    },
  ];

  // تطبيق فلترة العناصر حسب نوع التاجر
  const filteredGroups = filterGroupsByMerchantType(allGroups, merchantType);
  
  return filteredGroups;
};
