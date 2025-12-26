import {
    UserPlus,
    Box,
    ShoppingCart,
    Users,
    Settings,
    BarChart3,
    Truck,
    Wrench,
    UserCog,
    BanknoteIcon,
    CreditCard,
    Crown,
    Building2,
    Zap
} from 'lucide-react';
import { EmployeePermissions } from '@/types/employee';

// ═══════════════════════════════════════════════════════════════════════════
// الصلاحيات الافتراضية
// ═══════════════════════════════════════════════════════════════════════════

export const defaultPermissions: EmployeePermissions = {
    accessPOS: true,
    manageOrders: false,
    processPayments: true,
    manageUsers: false,
    viewReports: false,
    manageProducts: false,
    manageServices: false,
    manageEmployees: false,
    viewProducts: true,
    addProducts: false,
    editProducts: false,
    deleteProducts: false,
    manageProductCategories: false,
    manageInventory: false,
    viewInventory: true,
    // Stocktake
    startStocktake: false,
    performStocktake: false,
    reviewStocktake: false,
    approveStocktake: false,
    deleteStocktake: false,
    viewServices: true,
    addServices: false,
    editServices: false,
    deleteServices: false,
    trackServices: false,
    viewOrders: true,
    viewPOSOrders: false,
    updateOrderStatus: false,
    cancelOrders: false,
    viewCustomers: true,
    manageCustomers: false,
    viewDebts: false,
    recordDebtPayments: false,
    viewCustomerDebtHistory: false,
    viewSuppliers: false,
    manageSuppliers: false,
    managePurchases: false,
    viewEmployees: true,
    viewFinancialReports: false,
    viewSalesReports: false,
    viewInventoryReports: false,
    viewSettings: true,
    manageProfileSettings: true,
    manageAppearanceSettings: true,
    manageSecuritySettings: true,
    manageNotificationSettings: true,
    manageOrganizationSettings: false,
    manageBillingSettings: false,
    manageIntegrations: false,
    manageAdvancedSettings: false,
    manageFlexi: false,
    manageFlexiAndDigitalCurrency: false,
    sellFlexiAndDigitalCurrency: false,
    viewFlexiAndDigitalCurrencySales: false,
};

// ═══════════════════════════════════════════════════════════════════════════
// قوالب الصلاحيات الجاهزة
// ═══════════════════════════════════════════════════════════════════════════

export interface PermissionPreset {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    permissions: Partial<EmployeePermissions>;
}

export const permissionPresets: PermissionPreset[] = [
    {
        id: 'full',
        name: 'صلاحيات كاملة',
        description: 'جميع الصلاحيات بدون قيود',
        icon: <Crown className="h-5 w-5" />,
        color: 'from-amber-500 to-orange-600',
        permissions: Object.fromEntries(
            Object.keys(defaultPermissions).map(key => [key, true])
        ) as EmployeePermissions,
    },
    {
        id: 'manager',
        name: 'مدير',
        description: 'إدارة كاملة باستثناء إعدادات النظام',
        icon: <Building2 className="h-5 w-5" />,
        color: 'from-blue-500 to-indigo-600',
        permissions: {
            ...defaultPermissions,
            accessPOS: true,
            processPayments: true,
            manageOrders: true,
            viewReports: true,
            manageProducts: true,
            viewProducts: true,
            addProducts: true,
            editProducts: true,
            deleteProducts: true,
            manageProductCategories: true,
            manageInventory: true,
            viewInventory: true,
            startStocktake: true,
            performStocktake: true,
            reviewStocktake: true,
            approveStocktake: true,
            deleteStocktake: true,
            viewServices: true,
            addServices: true,
            editServices: true,
            deleteServices: true,
            trackServices: true,
            viewOrders: true,
            viewPOSOrders: true,
            updateOrderStatus: true,
            cancelOrders: true,
            viewCustomers: true,
            manageCustomers: true,
            viewDebts: true,
            recordDebtPayments: true,
            viewCustomerDebtHistory: true,
            viewSuppliers: true,
            manageSuppliers: true,
            managePurchases: true,
            viewEmployees: true,
            viewFinancialReports: true,
            viewSalesReports: true,
            viewInventoryReports: true,
        },
    },
    {
        id: 'cashier',
        name: 'كاشير',
        description: 'نقطة البيع والمدفوعات فقط',
        icon: <Zap className="h-5 w-5" />,
        color: 'from-emerald-500 to-teal-600',
        permissions: {
            ...defaultPermissions,
            accessPOS: true,
            processPayments: true,
            viewProducts: true,
            viewInventory: true,
            viewCustomers: true,
            viewOrders: true,
            viewPOSOrders: true,
        },
    },
    {
        id: 'inventory',
        name: 'مسؤول مخزون',
        description: 'إدارة المنتجات والمخزون',
        icon: <Box className="h-5 w-5" />,
        color: 'from-purple-500 to-violet-600',
        permissions: {
            ...defaultPermissions,
            viewProducts: true,
            addProducts: true,
            editProducts: true,
            manageProductCategories: true,
            manageInventory: true,
            viewInventory: true,
            viewInventoryReports: true,
            startStocktake: true,
            performStocktake: true,
            reviewStocktake: true,
        },
    },
    {
        id: 'custom',
        name: 'تخصيص يدوي',
        description: 'اختر الصلاحيات بنفسك',
        icon: <Settings className="h-5 w-5" />,
        color: 'from-slate-500 to-slate-600',
        permissions: defaultPermissions,
    },
];

// ═══════════════════════════════════════════════════════════════════════════
// مجموعات الصلاحيات
// ═══════════════════════════════════════════════════════════════════════════

export interface PermissionGroup {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    permissions: Array<{
        key: keyof EmployeePermissions;
        label: string;
        description?: string;
        isSensitive?: boolean;
    }>;
}

export const permissionGroups: PermissionGroup[] = [
    {
        id: 'pos',
        title: 'نقطة البيع',
        description: 'الوصول والعمليات في نقطة البيع',
        icon: <Zap className="h-5 w-5" />,
        color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
        permissions: [
            { key: 'accessPOS', label: 'الوصول لنقطة البيع', description: 'فتح واستخدام نقطة البيع' },
            { key: 'processPayments', label: 'معالجة المدفوعات', description: 'استلام الدفعات من العملاء' },
            { key: 'viewPOSOrders', label: 'عرض طلبات نقطة البيع' },
        ],
    },
    {
        id: 'products',
        title: 'المنتجات والمخزون',
        description: 'إدارة المنتجات والفئات والمخزون',
        icon: <Box className="h-5 w-5" />,
        color: 'bg-blue-500/10 text-blue-600 border-blue-200',
        permissions: [
            { key: 'viewProducts', label: 'عرض المنتجات' },
            { key: 'addProducts', label: 'إضافة منتجات' },
            { key: 'editProducts', label: 'تعديل المنتجات' },
            { key: 'deleteProducts', label: 'حذف المنتجات', isSensitive: true },
            { key: 'manageProductCategories', label: 'إدارة الفئات' },
            { key: 'viewInventory', label: 'عرض المخزون' },
            { key: 'manageInventory', label: 'إدارة المخزون', isSensitive: true },
            { key: 'startStocktake', label: 'بدء جلسة جرد' },
            { key: 'performStocktake', label: 'تنفيذ الجرد (مسح/عد)' },
            { key: 'reviewStocktake', label: 'مراجعة الجرد' },
            { key: 'approveStocktake', label: 'اعتماد الجرد', isSensitive: true },
            { key: 'deleteStocktake', label: 'حذف جلسات الجرد', isSensitive: true },
        ],
    },
    {
        id: 'services',
        title: 'الخدمات',
        description: 'خدمات الإصلاح والاشتراكات',
        icon: <Wrench className="h-5 w-5" />,
        color: 'bg-orange-500/10 text-orange-600 border-orange-200',
        permissions: [
            { key: 'viewServices', label: 'عرض الخدمات' },
            { key: 'addServices', label: 'إضافة خدمات' },
            { key: 'editServices', label: 'تعديل الخدمات' },
            { key: 'deleteServices', label: 'حذف الخدمات', isSensitive: true },
            { key: 'trackServices', label: 'متابعة الحالة' },
        ],
    },
    {
        id: 'orders',
        title: 'الطلبات والمبيعات',
        description: 'إدارة الطلبات وتحديث الحالات',
        icon: <ShoppingCart className="h-5 w-5" />,
        color: 'bg-violet-500/10 text-violet-600 border-violet-200',
        permissions: [
            { key: 'viewOrders', label: 'عرض الطلبات' },
            { key: 'manageOrders', label: 'إدارة الطلبات', isSensitive: true },
            { key: 'updateOrderStatus', label: 'تحديث حالة الطلب' },
            { key: 'cancelOrders', label: 'إلغاء الطلبات', isSensitive: true },
        ],
    },
    {
        id: 'customers',
        title: 'العملاء',
        description: 'إدارة بيانات العملاء',
        icon: <Users className="h-5 w-5" />,
        color: 'bg-cyan-500/10 text-cyan-600 border-cyan-200',
        permissions: [
            { key: 'viewCustomers', label: 'عرض العملاء' },
            { key: 'manageCustomers', label: 'إدارة العملاء' },
        ],
    },
    {
        id: 'debts',
        title: 'الديون والدفعات',
        description: 'إدارة ديون العملاء والتحصيل',
        icon: <BanknoteIcon className="h-5 w-5" />,
        color: 'bg-red-500/10 text-red-600 border-red-200',
        permissions: [
            { key: 'viewDebts', label: 'عرض الديون' },
            { key: 'recordDebtPayments', label: 'تسجيل الدفعات' },
            { key: 'viewCustomerDebtHistory', label: 'سجل ديون العملاء' },
        ],
    },
    {
        id: 'suppliers',
        title: 'الموردين والمشتريات',
        description: 'إدارة الموردين وعمليات الشراء',
        icon: <Truck className="h-5 w-5" />,
        color: 'bg-amber-500/10 text-amber-600 border-amber-200',
        permissions: [
            { key: 'viewSuppliers', label: 'عرض الموردين' },
            { key: 'manageSuppliers', label: 'إدارة الموردين' },
            { key: 'managePurchases', label: 'إدارة المشتريات' },
        ],
    },
    {
        id: 'employees',
        title: 'الموظفين',
        description: 'إدارة الموظفين والصلاحيات',
        icon: <UserCog className="h-5 w-5" />,
        color: 'bg-indigo-500/10 text-indigo-600 border-indigo-200',
        permissions: [
            { key: 'viewEmployees', label: 'عرض الموظفين' },
            { key: 'manageEmployees', label: 'إدارة الموظفين', isSensitive: true },
            { key: 'manageUsers', label: 'إدارة المستخدمين', isSensitive: true },
        ],
    },
    {
        id: 'reports',
        title: 'التقارير',
        description: 'الوصول للتقارير والتحليلات',
        icon: <BarChart3 className="h-5 w-5" />,
        color: 'bg-pink-500/10 text-pink-600 border-pink-200',
        permissions: [
            { key: 'viewReports', label: 'عرض التقارير' },
            { key: 'viewFinancialReports', label: 'التقارير المالية', isSensitive: true },
            { key: 'viewSalesReports', label: 'تقارير المبيعات' },
            { key: 'viewInventoryReports', label: 'تقارير المخزون' },
        ],
    },
    {
        id: 'settings',
        title: 'الإعدادات',
        description: 'الوصول لإعدادات النظام',
        icon: <Settings className="h-5 w-5" />,
        color: 'bg-slate-500/10 text-slate-600 border-slate-200',
        permissions: [
            { key: 'viewSettings', label: 'عرض الإعدادات' },
            { key: 'manageProfileSettings', label: 'إعدادات الملف الشخصي' },
            { key: 'manageAppearanceSettings', label: 'إعدادات المظهر' },
            { key: 'manageSecuritySettings', label: 'إعدادات الأمان', isSensitive: true },
            { key: 'manageNotificationSettings', label: 'إعدادات الإشعارات' },
            { key: 'manageOrganizationSettings', label: 'إعدادات المؤسسة', isSensitive: true },
            { key: 'manageBillingSettings', label: 'إعدادات الفوترة', isSensitive: true },
            { key: 'manageIntegrations', label: 'التكاملات', isSensitive: true },
            { key: 'manageAdvancedSettings', label: 'الإعدادات المتقدمة', isSensitive: true },
        ],
    },
    {
        id: 'flexi',
        title: 'الفليكسي والعملات الرقمية',
        description: 'خدمات الشحن والعملات',
        icon: <CreditCard className="h-5 w-5" />,
        color: 'bg-teal-500/10 text-teal-600 border-teal-200',
        permissions: [
            { key: 'manageFlexi', label: 'إدارة الفليكسي' },
            { key: 'manageFlexiAndDigitalCurrency', label: 'إدارة العملات الرقمية' },
            { key: 'sellFlexiAndDigitalCurrency', label: 'البيع' },
            { key: 'viewFlexiAndDigitalCurrencySales', label: 'عرض المبيعات' },
        ],
    },
];
