import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart3,
  Zap,
  Layers,
  ClipboardCheck,
  FileSpreadsheet,
  Building2,
  Users,
  Package,
  ShoppingBag,
  Wrench,
  Truck,
  GraduationCap,
  Store,
  Settings,
  Search,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
const ReportsIcon = BarChart3;
import type { POSStaffSession, StaffPermissions } from '@/types/staff';
import orderGroupsApi from '@/services/orderGroupsApi';

type ModuleId =
  | 'posDashboard'
  | 'posAdvanced'
  | 'posStocktake'
  | 'posOperations'
  | 'etat104'
  | 'storeBusiness'
  | 'staffManagement'
  | 'productCenter'
  | 'salesCenter'
  | 'servicesCenter'
  | 'suppliersCenter'
  | 'coursesCenter'
  | 'storeCenter'
  | 'settingsCenter'
  | 'reportsCenter';

interface PageDef {
  id: string;
  label: string;
  route: string;
  // flags: mapping of UI action → permission key in StaffPermissions (or custom keys)
  actions?: Array<{ key: string; label: string }>;
  viewKey?: keyof StaffPermissions | string;
  manageKey?: keyof StaffPermissions | string;
}

interface ModuleDef {
  id: ModuleId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  route: string;
  accessKey?: keyof StaffPermissions | string; // toggling this grants access to module
  requiresPosAccess?: boolean; // set accessPOS when enabling
  pages?: PageDef[];
}

// تعريف المجموعات والصفحات وفق الطلب
export const MODULES: ModuleDef[] = [
  { id: 'posDashboard', label: 'لوحة تحكم نقطة البيع', icon: BarChart3, route: '/dashboard/pos-dashboard', accessKey: 'canAccessPosDashboard', requiresPosAccess: true },
  { id: 'posAdvanced', label: 'نقطة البيع', icon: Zap, route: '/dashboard/pos-advanced', accessKey: 'canAccessPosAdvanced', requiresPosAccess: true },
  {
    id: 'posStocktake',
    label: 'الجرد',
    icon: ClipboardCheck,
    route: '/dashboard/pos-stocktake',
    accessKey: 'canPerformStocktake',
    requiresPosAccess: true,
    pages: [
      {
        id: 'stocktake',
        label: 'الجرد',
        route: '/dashboard/pos-stocktake',
        actions: [
          { key: 'canStartStocktake', label: 'بدء جلسة جرد' },
          { key: 'canPerformStocktake', label: 'تنفيذ الجرد (المسح/التسجيل)' },
          { key: 'canReviewStocktake', label: 'مراجعة الجرد' },
          { key: 'canApproveStocktake', label: 'اعتماد الجرد' },
          { key: 'canDeleteStocktake', label: 'حذف جلسة جرد' },
        ],
      },
    ],
  },
  {
    id: 'posOperations',
    label: 'إدارة نقطة البيع',
    icon: Layers,
    route: '/dashboard/pos-operations/orders',
    accessKey: 'canAccessPosOperations',
    requiresPosAccess: true,
    pages: [
      { id: 'orders', label: 'الطلبيات', route: '/dashboard/pos-operations/orders', viewKey: 'canViewPosOrders', manageKey: 'canManagePosOrders' },
      { id: 'debts', label: 'الديون', route: '/dashboard/pos-operations/debts', viewKey: 'canViewDebts', manageKey: 'canManageDebts' },
      { id: 'returns', label: 'الإرجاعات', route: '/dashboard/pos-operations/returns', viewKey: 'canViewReturns', manageKey: 'canManageReturns' },
      { id: 'losses', label: 'الخسائر', route: '/dashboard/pos-operations/losses', viewKey: 'canViewLosses', manageKey: 'canManageLosses' },
      { id: 'invoices', label: 'الفواتير', route: '/dashboard/pos-operations/invoices', viewKey: 'canViewInvoices', manageKey: 'canManageInvoices' },
    ],
  },
  { id: 'etat104', label: 'كشف حساب 104', icon: FileSpreadsheet, route: '/dashboard/etat104', accessKey: 'canAccessEtat104', requiresPosAccess: true },
  { id: 'storeBusiness', label: 'إعدادات المحل', icon: Building2, route: '/dashboard/store-business-settings', accessKey: 'canManageStoreSettings' },
  {
    id: 'staffManagement',
    label: 'إدارة الموظفين والجلسات',
    icon: Users,
    route: '/dashboard/staff-management',
    accessKey: 'canManageStaff',
    pages: [
      {
        id: 'staff',
        label: 'الموظفين',
        route: '/dashboard/staff-management',
        viewKey: 'canViewStaff',
        manageKey: 'canManageStaff',
        actions: [
          { key: 'canAddStaff', label: 'إضافة موظف' },
          { key: 'canEditStaff', label: 'تعديل موظف' },
          { key: 'canDeleteStaff', label: 'حذف موظف' },
          { key: 'canManageStaffPermissions', label: 'إدارة صلاحيات الموظفين' },
          { key: 'canToggleStaffStatus', label: 'تفعيل/تعطيل الموظفين' },
        ],
      },
      {
        id: 'sessions',
        label: 'جلسات العمل',
        route: '/dashboard/staff-management',
        viewKey: 'canViewWorkSessions',
        manageKey: 'canManageWorkSessions',
        actions: [
          { key: 'canStartWorkSession', label: 'بدء جلسة عمل' },
          { key: 'canEndWorkSession', label: 'إنهاء جلسة عمل' },
          { key: 'canViewSessionReports', label: 'عرض تقارير الجلسات' },
          { key: 'canExportSessionData', label: 'تصدير بيانات الجلسات' },
        ],
      },
    ],
  },
  {
    id: 'productCenter', label: 'مركز المنتجات', icon: Package, route: '/dashboard/product-operations/products', accessKey: 'canAccessProductOperations',
    pages: [
      {
        id: 'products', label: 'المنتجات', route: '/dashboard/product-operations/products',
        viewKey: 'canViewProducts', manageKey: 'canManageProducts',
        actions: [
          { key: 'canAddProducts', label: 'إضافة منتجات' },
          { key: 'canEditProducts', label: 'تعديل المنتجات' },
          { key: 'canDeleteProducts', label: 'حذف المنتجات' },
          { key: 'canRestoreProductDraft', label: 'إرجاع مسودات' },
        ],
      },
      { id: 'categories', label: 'الفئات', route: '/dashboard/product-operations/categories', viewKey: 'canViewCategories', manageKey: 'canManageCategories' },
      { id: 'inventory', label: 'المخزون', route: '/dashboard/product-operations/inventory', viewKey: 'canViewInventory', manageKey: 'canManageInventory' },
      { id: 'inventoryTracking', label: 'تتبع المخزون', route: '/dashboard/product-operations/inventory-tracking', viewKey: 'canViewInventoryTracking' },
    ],
  },
  {
    id: 'salesCenter',
    label: 'مركز المبيعات والطلبات',
    icon: ShoppingBag,
    route: '/dashboard/sales-operations/onlineOrders',
    accessKey: 'canAccessSalesOperations',
    pages: [
      {
        id: 'onlineOrders',
        label: 'الطلبات الإلكترونية',
        route: '/dashboard/sales-operations/onlineOrders',
        viewKey: 'canViewOnlineOrders',
        actions: [
          { key: 'canUpdateOrderStatus', label: 'تحديث حالة الطلب' },
          { key: 'canCancelOrders', label: 'إلغاء الطلب' },
          { key: 'canProcessOrderPayments', label: 'معالجة المدفوعات' },
        ],
      },
      {
        id: 'blocked',
        label: 'المحظورين',
        route: '/dashboard/sales-operations/blocked',
        viewKey: 'canViewBlockedCustomers',
        manageKey: 'canManageBlockedCustomers',
      },
      {
        id: 'abandoned',
        label: 'الطلبات المتروكة',
        route: '/dashboard/sales-operations/abandoned',
        viewKey: 'canViewAbandonedOrders',
        actions: [
          { key: 'canRecoverAbandonedOrder', label: 'استرجاع الطلب المتروك' },
          { key: 'canExportAbandonedReports', label: 'تصدير تقارير المتروكة' },
        ],
      },
    ],
  },
  {
    id: 'servicesCenter',
    label: 'مركز الخدمات',
    icon: Wrench,
    route: '/dashboard/services-operations/repair',
    accessKey: 'canAccessServicesOperations',
    pages: [
      {
        id: 'repair',
        label: 'تصليح',
        route: '/dashboard/services-operations/repair',
        viewKey: 'canViewRepairServices',
        manageKey: 'canManageRepairServices',
        actions: [
          { key: 'canCreateRepairOrder', label: 'إنشاء تذكرة تصليح' },
          { key: 'canUpdateRepairStatus', label: 'تحديث حالة التصليح' },
          { key: 'canDeleteRepairOrder', label: 'حذف تذكرة' },
          { key: 'canPrintRepairTicket', label: 'طباعة التذكرة' },
        ],
      },
      {
        id: 'subscription',
        label: 'الاشتراكات',
        route: '/dashboard/services-operations/subscription',
        viewKey: 'canViewSubscriptionServices',
        manageKey: 'canManageSubscriptionServices',
        actions: [
          { key: 'canCreateSubscriptionService', label: 'إضافة خدمة اشتراك' },
          { key: 'canEditSubscriptionService', label: 'تعديل خدمة اشتراك' },
          { key: 'canDeleteSubscriptionService', label: 'حذف خدمة اشتراك' },
          { key: 'canViewSubscriptionTransactions', label: 'عرض معاملات الاشتراكات' },
          { key: 'canRefundSubscriptionPayment', label: 'استرجاع مدفوعات الاشتراك' },
        ],
      },
    ],
  },
  {
    id: 'suppliersCenter',
    label: 'مركز الموردين',
    icon: Truck,
    route: '/dashboard/supplier-operations/suppliers',
    accessKey: 'canAccessSupplierOperations',
    pages: [
      {
        id: 'suppliers',
        label: 'الموردون',
        route: '/dashboard/supplier-operations/suppliers',
        viewKey: 'canViewSuppliers',
        manageKey: 'canManageSuppliers',
        actions: [
          { key: 'canCreateSupplier', label: 'إضافة مورد' },
          { key: 'canEditSupplier', label: 'تعديل مورد' },
          { key: 'canDeleteSupplier', label: 'حذف مورد' },
        ],
      },
      {
        id: 'purchases',
        label: 'المشتريات',
        route: '/dashboard/supplier-operations/purchases',
        viewKey: 'canViewPurchases',
        manageKey: 'canManagePurchases',
        actions: [
          { key: 'canCreatePurchase', label: 'إنشاء مشتريات' },
          { key: 'canEditPurchase', label: 'تعديل مشتريات' },
          { key: 'canDeletePurchase', label: 'حذف مشتريات' },
        ],
      },
      {
        id: 'payments',
        label: 'مدفوعات الموردين',
        route: '/dashboard/supplier-operations/payments',
        viewKey: 'canViewSupplierPayments',
        manageKey: 'canManageSupplierPayments',
        actions: [
          { key: 'canRecordSupplierPayment', label: 'تسجيل دفع' },
          { key: 'canEditSupplierPayment', label: 'تعديل دفع' },
          { key: 'canDeleteSupplierPayment', label: 'حذف دفع' },
          { key: 'canExportSupplierPayments', label: 'تصدير المدفوعات' },
        ],
      },
      {
        id: 'reports',
        label: 'تقارير الموردين',
        route: '/dashboard/supplier-operations/reports',
        viewKey: 'canViewSupplierReports',
        actions: [
          { key: 'canExportSupplierReports', label: 'تصدير تقارير الموردين' },
        ],
      },
    ],
  },
  { id: 'coursesCenter', label: 'دورات سطوكيها', icon: GraduationCap, route: '/dashboard/courses-operations/all', accessKey: 'canAccessCoursesOperations' },
  { id: 'storeCenter', label: 'إدارة المتجر', icon: Store, route: '/dashboard/store-operations/store-settings', accessKey: 'canAccessStoreOperations' },
  {
    id: 'settingsCenter',
    label: 'الإعدادات',
    icon: Settings,
    route: '/dashboard/settings-operations/settings',
    accessKey: 'canAccessSettingsOperations',
    pages: [
      {
        id: 'settings',
        label: 'الإعدادات',
        route: '/dashboard/settings-operations/settings',
        viewKey: 'canViewSettings',
        manageKey: 'canManageSettings',
      },
      {
        id: 'subscription',
        label: 'الاشتراكات',
        route: '/dashboard/settings-operations/subscription',
        viewKey: 'canViewSubscription',
        manageKey: 'canManageSubscription',
      },
      {
        id: 'customDomains',
        label: 'النطاقات المخصصة',
        route: '/dashboard/settings-operations/custom-domains',
        viewKey: 'canViewCustomDomains',
        manageKey: 'canManageCustomDomains',
      },
      {
        id: 'domainsDocs',
        label: 'دليل النطاقات',
        route: '/dashboard/settings-operations/domains-docs',
        viewKey: 'canViewDomainsDocs',
      },
    ],
  },
  {
    id: 'reportsCenter',
    label: 'مركز التقارير',
    icon: ReportsIcon,
    route: '/dashboard/reports-operations/financial',
    accessKey: 'canAccessReportsOperations',
    pages: [
      {
        id: 'financial',
        label: 'المالية',
        route: '/dashboard/reports-operations/financial',
        viewKey: 'canViewFinancialReports',
        actions: [
          { key: 'canExportFinancialReports', label: 'تصدير التقارير المالية' },
        ],
      },
      {
        id: 'sales',
        label: 'المبيعات',
        route: '/dashboard/reports-operations/sales',
        viewKey: 'canViewSalesReports',
        actions: [
          { key: 'canExportSalesReports', label: 'تصدير تقارير المبيعات' },
        ],
      },
      {
        id: 'expenses',
        label: 'المصروفات',
        route: '/dashboard/reports-operations/expenses',
        viewKey: 'canViewExpenses',
        manageKey: 'canManageExpenses',
        actions: [
          { key: 'canCreateExpense', label: 'إضافة مصروف' },
          { key: 'canEditExpense', label: 'تعديل مصروف' },
          { key: 'canDeleteExpense', label: 'حذف مصروف' },
          { key: 'canExportExpenses', label: 'تصدير المصروفات' },
        ],
      },
      {
        id: 'zakat',
        label: 'الزكاة',
        route: '/dashboard/reports-operations/zakat',
        viewKey: 'canViewZakat',
        manageKey: 'canManageZakat',
        actions: [
          { key: 'canExportZakatReports', label: 'تصدير تقارير الزكاة' },
        ],
      },
      {
        id: 'suppliersReports',
        label: 'تقارير الموردين',
        route: '/dashboard/reports-operations/suppliers',
        viewKey: 'canViewSupplierReportsInReports',
        actions: [
          { key: 'canExportSupplierReportsInReports', label: 'تصدير تقارير الموردين (مركز التقارير)' },
        ],
      },
    ],
  },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: POSStaffSession;
  onSave: (perms: StaffPermissions) => Promise<void>;
}

const clone = <T,>(obj: T): T => JSON.parse(JSON.stringify(obj));

// لوحة مصمم الصلاحيات القابلة لإعادة الاستخدام (بدون Dialog)
export const PermissionsDesignerPanel: React.FC<{
  perms: Record<string, any>;
  onChange: (next: Record<string, any>) => void;
  staffOrgId?: string;
}> = ({ perms, onChange, staffOrgId }) => {
  const [search, setSearch] = useState('');
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    const load = async () => {
      if (!staffOrgId) return;
      await orderGroupsApi.ensureDefault(staffOrgId);
      const gs = await orderGroupsApi.list(staffOrgId);
      setGroups(gs.map(g => ({ id: g.id, name: g.name })));
    };
    void load();
  }, [staffOrgId]);

  const toggleFlag = (key: string, value?: boolean) => {
    const next = { ...perms, [key]: value ?? !perms[key] };
    onChange(next);
  };

  const handleToggleModule = (m: ModuleDef, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent accordion toggle
    const enabled = Boolean(perms[m.accessKey as string]);
    const next = { ...perms, [m.accessKey as string]: !enabled } as Record<string, any>;
    if (m.requiresPosAccess && !next['accessPOS']) next['accessPOS'] = true;
    onChange(next);
  };

  const isSensitive = (key: string) => {
    const sensitiveKeywords = ['delete', 'manage', 'settings', 'financial', 'zakat', 'edit', 'expenses', 'refund', 'cancel'];
    return sensitiveKeywords.some(k => key.toLowerCase().includes(k.toLowerCase()));
  };

  // Helper to collect all permissions in a module for counting
  const getModulePermissions = (m: ModuleDef) => {
    const keys: string[] = [];
    if (m.accessKey) keys.push(m.accessKey as string);
    m.pages?.forEach(p => {
      if (p.viewKey) keys.push(p.viewKey as string);
      if (p.manageKey) keys.push(p.manageKey as string);
      p.actions?.forEach(a => keys.push(a.key));
    });
    return keys;
  };

  // Filter modules based on search
  const filteredModules = useMemo(() => {
    if (!search.trim()) return MODULES;
    const s = search.trim().toLowerCase();
    return MODULES.filter(m => {
      // Search in module label
      if (m.label.toLowerCase().includes(s)) return true;
      // Search in pages
      if (m.pages?.some(p => p.label.toLowerCase().includes(s))) return true;
      // Search in actions/permissions
      const permMatch = m.pages?.some(p =>
        p.actions?.some(a => a.label.toLowerCase().includes(s))
      );
      return permMatch;
    });
  }, [search]);

  // Calculate totals
  const totalPermissions = useMemo(() => {
    let count = 0;
    MODULES.forEach(m => count += getModulePermissions(m).length);
    return count;
  }, []);

  const activePermissions = useMemo(() => {
    let count = 0;
    MODULES.forEach(m => {
      getModulePermissions(m).forEach(k => {
        if (perms[k]) count++;
      });
    });
    return count;
  }, [perms]);

  const progress = totalPermissions > 0 ? (activePermissions / totalPermissions) * 100 : 0;

  return (
    <div className="space-y-3 py-1">
      {/* Header Stats & Search - Compact Design */}
      <div className="bg-muted/30 border border-dashed rounded-xl p-3 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full md:w-auto min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="بحث سريع..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pr-9 h-9 text-sm bg-background/50 border-input/50 focus:bg-background transition-all"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto bg-background/50 p-1.5 px-3 rounded-lg border border-input/20">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-muted-foreground font-medium">مستوى الصلاحيات</span>
            <span className="text-xs font-bold text-primary">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-1.5 w-24 md:w-32" />
        </div>
      </div>

      {/* Modules List - Elegant Accordion */}
      <Accordion type="multiple" className="space-y-2">
        {filteredModules.map(m => {
          const Icon = m.icon;
          const isAccessEnabled = Boolean((perms as any)[m.accessKey as string]);
          const modulePerms = getModulePermissions(m);
          const activeModulePerms = modulePerms.filter(k => perms[k]).length;

          return (
            <AccordionItem key={m.id} value={m.id} className="border rounded-lg bg-card/40 px-0 overflow-hidden transition-all hover:border-primary/20">
              <div className="flex items-center justify-between p-1 pl-2 pr-1">
                <AccordionTrigger className="hover:no-underline py-1.5 flex-1 group">
                  <div className="flex items-center gap-3 text-right w-full">
                    <div className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-md transition-colors duration-300",
                      isAccessEnabled ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "bg-muted text-muted-foreground"
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-sm group-hover:text-primary transition-colors">{m.label}</span>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-[9px] px-1.5 py-0 rounded-full font-medium transition-colors border",
                          isAccessEnabled ? "bg-green-500/5 text-green-600 border-green-500/20" : "bg-slate-500/5 text-slate-500 border-slate-200 dark:border-slate-800"
                        )}>
                          {isAccessEnabled ? 'نشط' : 'معطل'}
                        </span>
                        <span className="text-[11px] text-muted-foreground/50 font-mono">
                          {activeModulePerms}/{modulePerms.length}
                        </span>
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>

                {/* Module Toggle Switch */}
                <div className="flex items-center gap-2 mr-2 bg-background/50 p-0.5 px-1 rounded-md border border-input/20" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isAccessEnabled}
                    onCheckedChange={(c) => handleToggleModule(m, { stopPropagation: () => { } } as any)}
                    className="h-3.5 w-3.5 rounded-[3px] data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                </div>
              </div>

              <AccordionContent className="px-3 pb-3 pt-0 bg-muted/5 border-t border-dashed">
                <div className="space-y-4 pt-2">
                  {/* Permissions per page */}
                  {!m.pages && (
                    <div className="text-center py-4 text-muted-foreground/40 text-[10px] italic">
                      لا توجد خيارات فرعية
                    </div>
                  )}

                  {m.pages?.map(p => (
                    <div key={p.id} className="space-y-2">
                      <div className="flex items-center gap-2 pb-1 border-b border-border/30">
                        <div className="h-1 w-1 rounded-full bg-primary/40" />
                        <h4 className="font-medium text-[11px] text-muted-foreground uppercase tracking-wider">{p.label}</h4>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                        {/* View Permission */}
                        {p.viewKey && (
                          <div className={cn(
                            "flex items-center gap-2 p-2 rounded-md border transition-all cursor-pointer select-none group relative overflow-hidden h-9 bg-card hover:shadow-sm",
                            perms[p.viewKey as string]
                              ? "bg-primary/5 border-primary/20"
                              : "border-border/50 hover:border-primary/20"
                          )} onClick={() => toggleFlag(p.viewKey as string)}>
                            <div className={cn(
                              "w-0.5 absolute right-0 top-1.5 bottom-1.5 rounded-full transition-all duration-300",
                              perms[p.viewKey as string] ? "bg-primary opacity-100" : "bg-transparent opacity-0"
                            )} />

                            <Checkbox
                              checked={Boolean(perms[p.viewKey as string])}
                              className="h-3.5 w-3.5 rounded-[3px] data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />

                            <span className={cn(
                              "text-xs transition-colors duration-200 truncate",
                              perms[p.viewKey as string] ? "font-medium text-foreground" : "text-muted-foreground font-normal"
                            )}>
                              عرض
                            </span>
                          </div>
                        )}

                        {/* Manage Permission */}
                        {p.manageKey && (
                          <div className={cn(
                            "flex items-center gap-2 p-2 rounded-md border transition-all cursor-pointer select-none group relative overflow-hidden h-9 bg-card hover:shadow-sm",
                            perms[p.manageKey as string]
                              ? "bg-primary/5 border-primary/20"
                              : "border-border/50 hover:border-primary/20"
                          )} onClick={() => toggleFlag(p.manageKey as string)}>
                            <div className={cn(
                              "w-0.5 absolute right-0 top-1.5 bottom-1.5 rounded-full transition-all duration-300",
                              perms[p.manageKey as string] ? "bg-primary opacity-100" : "bg-transparent opacity-0"
                            )} />

                            <Checkbox
                              checked={Boolean(perms[p.manageKey as string])}
                              className="h-3.5 w-3.5 rounded-[3px] data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />

                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={cn(
                                "text-xs transition-colors duration-200 truncate",
                                perms[p.manageKey as string] ? "font-medium text-foreground" : "text-muted-foreground font-normal"
                              )}>
                                إدارة
                              </span>

                              {isSensitive(p.manageKey as string) && (
                                <AlertTriangle className="h-3 w-3 text-orange-500/80 shrink-0" />
                              )}
                            </div>
                          </div>
                        )}

                        {/* Custom Actions */}
                        {p.actions?.map(a => (
                          <div key={a.key} className={cn(
                            "flex items-center gap-2 p-2 rounded-md border transition-all cursor-pointer select-none group relative overflow-hidden h-9 bg-card hover:shadow-sm",
                            perms[a.key]
                              ? "bg-primary/5 border-primary/20"
                              : "border-border/50 hover:border-primary/20"
                          )} onClick={() => toggleFlag(a.key)}>
                            <div className={cn(
                              "w-0.5 absolute right-0 top-1.5 bottom-1.5 rounded-full transition-all duration-300",
                              perms[a.key] ? "bg-primary opacity-100" : "bg-transparent opacity-0"
                            )} />

                            <Checkbox
                              checked={Boolean(perms[a.key])}
                              className="h-3.5 w-3.5 rounded-[3px] data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />

                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={cn(
                                "text-xs transition-colors duration-200 truncate",
                                perms[a.key] ? "font-medium text-foreground" : "text-muted-foreground font-normal"
                              )}>
                                {a.label}
                              </span>

                              {isSensitive(a.key) && (
                                <AlertTriangle className="h-3 w-3 text-orange-500/80 shrink-0" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Online Orders Special Config */}
                      {p.id === 'onlineOrders' && perms['canAccessSalesOperations'] && (
                        <div className="mt-3 bg-muted/30 p-3 rounded-lg border border-dashed text-xs">
                          <h5 className="font-medium mb-2 flex items-center gap-2 opacity-80">
                            <Settings className="h-3 w-3" />
                            إعدادات الطلبات المتقدمة
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] text-muted-foreground uppercase">مجموعة الطلبات الإلكترونية</label>
                              <Select value={(perms as any).onlineOrdersGroupId || ''} onValueChange={(v) => onChange({ ...perms, onlineOrdersGroupId: v })}>
                                <SelectTrigger className="h-8 text-xs bg-background">
                                  <SelectValue placeholder="-- اختر المجموعة --" />
                                </SelectTrigger>
                                <SelectContent>
                                  {groups.map(g => (
                                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1 pt-4">
                              <div className="flex items-center gap-4">
                                <div className={cn(
                                  "flex items-center gap-2 transition-all cursor-pointer opacity-80 hover:opacity-100",
                                  perms['canSelfAssignOnlineOrders'] ? "text-primary" : "text-muted-foreground"
                                )} onClick={() => toggleFlag('canSelfAssignOnlineOrders')}>
                                  <Checkbox checked={Boolean(perms['canSelfAssignOnlineOrders'])} className="h-3 w-3" />
                                  <span>تعيين لنفسي</span>
                                </div>
                                <div className={cn(
                                  "flex items-center gap-2 transition-all cursor-pointer opacity-80 hover:opacity-100",
                                  perms['canReassignOnlineOrders'] ? "text-primary" : "text-muted-foreground"
                                )} onClick={() => toggleFlag('canReassignOnlineOrders')}>
                                  <Checkbox checked={Boolean(perms['canReassignOnlineOrders'])} className="h-3 w-3" />
                                  <span>إعادة تعيين</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
};

const PermissionsDesignerDialog: React.FC<Props> = ({ open, onOpenChange, staff, onSave }) => {
  const [working, setWorking] = useState(false);
  const [perms, setPerms] = useState<Record<string, any>>(() => clone((staff.permissions as any) || {}));

  const handleSave = async () => {
    try {
      setWorking(true);
      await onSave(perms as unknown as StaffPermissions);
      onOpenChange(false);
    } finally {
      setWorking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-background z-10">
          <DialogTitle>تخصيص صلاحيات الموظف: {staff.staff_name}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <PermissionsDesignerPanel perms={perms} onChange={setPerms} staffOrgId={staff.organization_id} />
        </div>

        <DialogFooter className="p-4 border-t bg-muted/10 z-10 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={working}>إلغاء</Button>
          <Button onClick={handleSave} disabled={working}>{working ? 'جارٍ الحفظ...' : 'حفظ'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PermissionsDesignerDialog;
