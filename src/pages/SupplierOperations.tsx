import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import POSPureLayout from '@/components/pos-layout/POSPureLayout';
import { useTitle } from '@/hooks/useTitle';
import { useTitlebar } from '@/context/TitlebarContext';
import { POSLayoutState } from '@/components/pos-layout/types';
import { Users, ShoppingBag, Receipt, FileBarChart, Loader2 } from 'lucide-react';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';
import { SuppliersList } from '@/components/suppliers/SuppliersList';

// Lazy load للصفحات الأخرى
// صفحة المشتريات الرئيسية (قائمة + إنشاء/تعديل)
const PurchasesTab = React.lazy(() => import('../features/purchases/components/PurchasesTabPage'));
const PaymentsTab = React.lazy(() => import('./dashboard/SupplierPayments'));
const ReportsTab = React.lazy(() => import('./dashboard/SupplierReports'));

type TabKey = 'suppliers' | 'purchases' | 'payments' | 'reports';

interface TabDefinition {
  id: TabKey;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TAB_CONFIG: TabDefinition[] = [
  { id: 'suppliers', title: 'الموردين', icon: Users },
  { id: 'purchases', title: 'المشتريات', icon: ShoppingBag },
  { id: 'payments', title: 'المدفوعات', icon: Receipt },
  { id: 'reports', title: 'التقارير', icon: FileBarChart },
];

const LoadingView: React.FC = () => (
  <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-muted-foreground">
    <Loader2 className="h-6 w-6 animate-spin" />
    <span className="text-sm">جاري التحميل...</span>
  </div>
);

const SupplierOperationsPage: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams<{ tab?: string }>();
  const { clearTabs, setShowTabs } = useTitlebar();
  const perms = useUnifiedPermissions();

  // تحديد التبويبات المسموح بها
  const allowedTabs = useMemo(() => {
    if (perms.isAdminMode || perms.isOrgAdmin || perms.isSuperAdmin) {
      return TAB_CONFIG;
    }
    const canSuppliers = perms.ready ? perms.anyOf(['viewSuppliers', 'manageSuppliers']) : false;
    const canPurchases = perms.ready ? perms.anyOf(['viewPurchases', 'managePurchases']) : false;
    const canPayments = perms.ready ? perms.anyOf(['viewSupplierPayments', 'manageSupplierPayments']) : false;
    const canReports = perms.ready ? perms.anyOf(['viewSupplierReports', 'viewReports']) : false;

    return TAB_CONFIG.filter(t =>
      (t.id === 'suppliers' && canSuppliers) ||
      (t.id === 'purchases' && canPurchases) ||
      (t.id === 'payments' && canPayments) ||
      (t.id === 'reports' && canReports)
    );
  }, [perms]);

  // تحديد التبويب النشط
  const activeTab = useMemo<TabKey>(() => {
    const incoming = params.tab as TabKey | undefined;
    const isAllowed = allowedTabs.some(t => t.id === incoming);
    return isAllowed ? (incoming as TabKey) : (allowedTabs[0]?.id || 'suppliers');
  }, [params.tab, allowedTabs]);

  // إعادة التوجيه إذا كان المسار غير صحيح
  useEffect(() => {
    if (!params.tab || !TAB_CONFIG.some(tab => tab.id === params.tab)) {
      navigate(`/dashboard/supplier-operations/${activeTab}`, { replace: true });
    }
  }, [params.tab, activeTab, navigate]);

  useTitle(`${TAB_CONFIG.find(t => t.id === activeTab)?.title || 'الموردين'} - إدارة الموردين`);

  const [layoutState, setLayoutState] = useState<POSLayoutState>({
    connectionStatus: 'connected',
    isRefreshing: false,
  });

  // إخفاء التبويبات في الشريط العلوي
  useEffect(() => {
    setShowTabs(false);
    return () => clearTabs();
  }, [setShowTabs, clearTabs]);

  const handleTabChange = useCallback((value: string) => {
    if (value !== activeTab) {
      navigate(`/dashboard/supplier-operations/${value}`);
    }
  }, [activeTab, navigate]);

  const handleLayoutRefresh = useCallback(async () => {
    setLayoutState(prev => ({ ...prev, isRefreshing: true }));
    await new Promise(resolve => setTimeout(resolve, 500));
    setLayoutState(prev => ({ ...prev, isRefreshing: false }));
  }, []);

  // عرض المحتوى حسب التبويب النشط
  const renderContent = useMemo(() => {
    switch (activeTab) {
      case 'suppliers':
        return <SuppliersList />;
      case 'purchases':
        return (
          <Suspense fallback={<LoadingView />}>
            <PurchasesTab />
          </Suspense>
        );
      case 'payments':
        return (
          <Suspense fallback={<LoadingView />}>
            <PaymentsTab useStandaloneLayout={false} />
          </Suspense>
        );
      case 'reports':
        return (
          <Suspense fallback={<LoadingView />}>
            <ReportsTab useStandaloneLayout={false} />
          </Suspense>
        );
      default:
        return <SuppliersList />;
    }
  }, [activeTab]);

  const layoutContent = (
    <div className="space-y-6 p-6" dir="rtl">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">إدارة الموردين والمشتريات</h1>
        <p className="text-sm text-muted-foreground">
          إدارة الموردين، المشتريات، المدفوعات والتقارير.
        </p>
      </div>

      {/* شريط التنقل */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/50">
          {allowedTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-900"
              >
                <Icon className="h-4 w-4" />
                <span>{tab.title}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* المحتوى */}
      <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm">
        {renderContent}
      </div>
    </div>
  );

  return (
    <POSPureLayout
      onRefresh={handleLayoutRefresh}
      isRefreshing={Boolean(layoutState.isRefreshing)}
      connectionStatus={layoutState.connectionStatus ?? 'connected'}
      executionTime={layoutState.executionTime}
    >
      {layoutContent}
    </POSPureLayout>
  );
};

export default SupplierOperationsPage;
