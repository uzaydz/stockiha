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
} from 'lucide-react';
const ReportsIcon = BarChart3;
import type { POSStaffSession, StaffPermissions } from '@/types/staff';
import orderGroupsApi from '@/services/orderGroupsApi';

type ModuleId =
  | 'posDashboard'
  | 'posAdvanced'
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
  const [selectedModule, setSelectedModule] = useState<ModuleId | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
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

  const filteredModules = useMemo(() => {
    if (!search.trim()) return MODULES;
    const s = search.trim().toLowerCase();
    return MODULES.filter(m => m.label.toLowerCase().includes(s));
  }, [search]);

  const toggleFlag = (key: string, value?: boolean) => {
    const next = { ...perms, [key]: value ?? !perms[key] };
    onChange(next);
  };

  const handleToggleModule = (m: ModuleDef) => {
    const enabled = Boolean(perms[m.accessKey as string]);
    const next = { ...perms, [m.accessKey as string]: !enabled } as Record<string, any>;
    if (m.requiresPosAccess && !next['accessPOS']) next['accessPOS'] = true;
    onChange(next);
  };

  const activeModule = MODULES.find(m => m.id === selectedModule) || null;
  const activePage = activeModule?.pages?.find(p => p.id === selectedPageId) || null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-2">
      <div className="border rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">المجموعات</h3>
          <Input placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 w-36" />
        </div>
        <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
          {filteredModules.map(m => {
            const Icon = m.icon;
            const enabled = Boolean((perms as any)[m.accessKey as string]);
            return (
              <label key={m.id} className={`flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer ${selectedModule === m.id ? 'bg-muted' : ''}`}
                     onClick={() => setSelectedModule(m.id)}>
                <Checkbox checked={enabled} onCheckedChange={() => handleToggleModule(m)} />
                <Icon className="h-4 w-4" />
                <span className="text-sm">{m.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="border rounded-lg p-3">
        <h3 className="font-semibold mb-2">الصفحات الفرعية</h3>
        {!activeModule?.pages?.length ? (
          <div className="text-sm text-muted-foreground">اختر مجموعة لعرض صفحاتها</div>
        ) : (
          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {activeModule.pages.map(p => {
              const viewKey = p.viewKey as string | undefined;
              const manageKey = p.manageKey as string | undefined;
              const enabled = viewKey ? Boolean((perms as any)[viewKey]) || (manageKey ? Boolean((perms as any)[manageKey]) : false) : true;
              return (
                <label key={p.id} className={`flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer ${selectedPageId === p.id ? 'bg-muted' : ''}`}
                       onClick={() => setSelectedPageId(p.id)}>
                  {viewKey && <Checkbox checked={enabled} onCheckedChange={() => toggleFlag(viewKey!, !enabled)} />}
                  <span className="text-sm">{p.label}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div className="border rounded-lg p-3">
        <h3 className="font-semibold mb-2">خيارات الصفحة</h3>
        {!activePage ? (
          <div className="text-sm text-muted-foreground">اختر صفحة لعرض خياراتها</div>
        ) : (
          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {activePage.viewKey && (
              <label className="flex items-center gap-2 px-2 py-2 rounded-md">
                <Checkbox checked={Boolean((perms as any)[activePage.viewKey!])} onCheckedChange={() => toggleFlag(activePage.viewKey!)} />
                <span className="text-sm">مشاهدة</span>
              </label>
            )}
            {activePage.manageKey && (
              <label className="flex items-center gap-2 px-2 py-2 rounded-md">
                <Checkbox checked={Boolean((perms as any)[activePage.manageKey!])} onCheckedChange={() => toggleFlag(activePage.manageKey!)} />
                <span className="text-sm">إدارة</span>
              </label>
            )}
            {activePage.actions?.map(a => (
              <label key={a.key} className="flex items-center gap-2 px-2 py-2 rounded-md">
                <Checkbox checked={Boolean((perms as any)[a.key])} onCheckedChange={() => toggleFlag(a.key)} />
                <span className="text-sm">{a.label}</span>
              </label>
            ))}

            {/* إعدادات إضافية للطلبات الإلكترونية */}
            {activePage.id === 'onlineOrders' && (
              <div className="mt-2 space-y-3">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">مجموعة الطلبات الإلكترونية</div>
                  <Select value={(perms as any).onlineOrdersGroupId || ''} onValueChange={(v) => onChange({ ...perms, onlineOrdersGroupId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المجموعة" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map(g => (
                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div>
                    <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => { window.location.href = '/dashboard/sales-operations/groups'; }}>إدارة المجموعات</Button>
                  </div>
                </div>
                <label className="flex items-center gap-2 px-2 py-2 rounded-md">
                  <Checkbox checked={Boolean((perms as any).canSelfAssignOnlineOrders)} onCheckedChange={() => toggleFlag('canSelfAssignOnlineOrders')} />
                  <span className="text-sm">تعيين الطلب لنفسي (Claim)</span>
                </label>
                <label className="flex items-center gap-2 px-2 py-2 rounded-md">
                  <Checkbox checked={Boolean((perms as any).canReassignOnlineOrders)} onCheckedChange={() => toggleFlag('canReassignOnlineOrders')} />
                  <span className="text-sm">إعادة تعيين الطلبات</span>
                </label>
                <label className="flex items-center gap-2 px-2 py-2 rounded-md">
                  <Checkbox checked={Boolean((perms as any).canManageOnlineOrderGroups)} onCheckedChange={() => toggleFlag('canManageOnlineOrderGroups')} />
                  <span className="text-sm">إدارة مجموعات الطلبات</span>
                </label>
              </div>
            )}
          </div>
        )}
      </div>
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
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>تخصيص صلاحيات الموظف: {staff.staff_name}</DialogTitle>
        </DialogHeader>
        <PermissionsDesignerPanel perms={perms} onChange={setPerms} staffOrgId={staff.organization_id} />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={working}>إلغاء</Button>
          <Button onClick={handleSave} disabled={working}>{working ? 'جارٍ الحفظ...' : 'حفظ'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PermissionsDesignerDialog;
