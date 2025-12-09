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
  Layers,
  Ban,
  FileSpreadsheet,
  Crown,
  PieChart,
  Gift
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
          title: 'لوحة تحكم نقطة البيع',
          icon: BarChart3,
          href: '/dashboard/pos-dashboard',
          requiredPermission: 'accessPOS',
          badge: null,
          allowedMerchantTypes: ['traditional', 'both'] as MerchantType[]
        },
        {
          title: 'نقطة البيع',
          icon: Zap,
          href: '/dashboard/pos-advanced',
          requiredPermission: 'accessPOS',
          badge: null,
          allowedMerchantTypes: ['traditional', 'both'] as MerchantType[]
        },
        {
          title: 'إدارة نقطة البيع',
          icon: Layers,
          href: '/dashboard/pos-operations/orders',
          requiredPermission: 'accessPOS',
          badge: null,
          allowedMerchantTypes: ['traditional', 'both'] as MerchantType[]
        },
        {
          title: 'كشف حساب 104',
          icon: FileSpreadsheet,
          href: '/dashboard/etat104',
          requiredPermission: 'accessPOS',
          badge: 'جديد',
          allowedMerchantTypes: ['traditional', 'both'] as MerchantType[]
        }
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
          title: 'مركز المنتجات',
          icon: Package,
          href: '/dashboard/product-operations/products',
          requiredPermission: 'viewProducts',
          badge: null,
          allowedMerchantTypes: ['traditional', 'ecommerce', 'both']
        }
      ]
    },

    // المبيعات والطلبات - عنصر واحد للمركز
    {
      group: 'المبيعات والطلبات',
      icon: ShoppingBag,
      requiredPermission: 'viewOrders',
      allowedMerchantTypes: ['traditional', 'ecommerce', 'both'],
      items: [
        {
          title: 'مركز المبيعات والطلبات',
          icon: ShoppingBag,
          href: '/dashboard/sales-operations/onlineOrders',
          requiredPermission: 'viewOrders',
          badge: null,
          allowedMerchantTypes: ['traditional', 'ecommerce', 'both']
        }
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
          title: 'إدارة الموردين',
          icon: Truck,
          href: '/dashboard/supplier-operations/suppliers',
          requiredPermission: 'viewSuppliers',
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
          title: 'إدارة المتجر',
          icon: Store,
          href: '/dashboard/store-operations/store-settings',
          requiredPermission: 'manageOrganizationSettings',
          badge: null,
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
          title: 'التقارير الشاملة',
          icon: PieChart,
          href: '/dashboard/comprehensive-reports',
          requiredPermission: 'viewReports',
          badge: 'جديد',
          allowedMerchantTypes: ['traditional', 'ecommerce', 'both']
        },
        {
          title: 'التحليلات المالية الشاملة',
          icon: Activity,
          href: '/dashboard/reports-operations/financial',
          requiredPermission: 'viewFinancialReports',
          badge: 'جديد',
          allowedMerchantTypes: ['traditional', 'ecommerce', 'both']
        },
        {
          title: 'تحليلات المبيعات',
          icon: BarChart3,
          href: '/dashboard/reports-operations/sales',
          requiredPermission: 'viewSalesReports',
          badge: null,
          allowedMerchantTypes: ['traditional', 'ecommerce', 'both']
        },
        {
          title: 'المصروفات',
          icon: DollarSign,
          href: '/dashboard/reports-operations/expenses',
          requiredPermission: 'viewFinancialReports',
          badge: null,
          allowedMerchantTypes: ['traditional', 'ecommerce', 'both']
        },
        {
          title: 'الزكاة',
          icon: DollarSign,
          href: '/dashboard/reports-operations/zakat',
          requiredPermission: 'viewFinancialReports',
          badge: 'جديد',
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

    // نظام التأكيد - إدارة فريق التأكيد
    {
      group: 'نظام التأكيد',
      icon: Phone,
      requiredPermission: 'manageEmployees',
      allowedMerchantTypes: ['traditional', 'ecommerce', 'both'],
      items: [
        {
          title: 'مركز التأكيد',
          icon: Phone,
          href: '/dashboard/confirmation-center',
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
      badge: null,
      allowedMerchantTypes: ['traditional', 'ecommerce', 'both'],
      items: [
        {
          title: 'دورات ستوكيها',
          icon: GraduationCap,
          href: '/dashboard/courses-operations/all',
          requiredPermission: null,
          badge: null,
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
          title: 'الإعدادات العامة',
          icon: Settings,
          href: '/dashboard/settings-operations/settings',
          requiredPermission: null,
          badge: null,
          allowedMerchantTypes: ['traditional', 'ecommerce', 'both']
        },
        {
          title: 'مستكشف قاعدة البيانات',
          icon: Database,
          href: '/dashboard/database-admin',
          requiredPermission: 'manageOrganizationSettings',
          badge: 'جديد',
          allowedMerchantTypes: ['traditional', 'ecommerce', 'both']
        },
      ]
    },

    // الاشتراك - تظهر للجميع
    {
      group: 'الاشتراك',
      icon: Crown,
      requiredPermission: 'manageOrganizationSettings',
      allowedMerchantTypes: ['traditional', 'ecommerce', 'both'],
      items: [
        {
          title: 'إدارة الاشتراك',
          icon: Crown,
          href: '/dashboard/subscription',
          requiredPermission: 'manageOrganizationSettings',
          badge: null,
          allowedMerchantTypes: ['traditional', 'ecommerce', 'both']
        },
        {
          title: 'برنامج الإحالة',
          icon: Gift,
          href: '/dashboard/referral',
          requiredPermission: 'manageOrganizationSettings',
          badge: 'جديد',
          allowedMerchantTypes: ['traditional', 'ecommerce', 'both']
        },
      ]
    },
  ];

  // تطبيق فلترة العناصر حسب نوع التاجر
  const filteredGroups = filterGroupsByMerchantType(allGroups, merchantType);
  
  return filteredGroups;
};
