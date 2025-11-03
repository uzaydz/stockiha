import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import POSPureLayout from '@/components/pos-layout/POSPureLayout';
import { useTitle } from '@/hooks/useTitle';
import { useTitlebar } from '@/context/TitlebarContext';
import { POSLayoutState, RefreshHandler } from '@/components/pos-layout/types';
import { Activity, BarChart3, DollarSign, FileBarChart, Loader2 } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

const FinancialAnalyticsTab = React.lazy(() => import('../pages/FinancialAnalyticsOptimized'));
const SalesAnalyticsTab = React.lazy(() => import('../pages/dashboard/Analytics'));
const ExpensesTab = React.lazy(() => import('../pages/dashboard/Expenses'));
const ZakatTab = React.lazy(() => import('../pages/dashboard/Zakat'));
const SupplierReportsTab = React.lazy(() => import('../pages/dashboard/SuppliersManagement').then(m => ({ default: m.SuppliersReports || m.default })));

type TabKey = 'financial' | 'sales' | 'expenses' | 'zakat' | 'suppliers';

interface TabDefinition {
  id: TabKey;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  loaderMessage: string;
}

const TAB_CONFIG: TabDefinition[] = [
  { id: 'financial', title: 'التحليلات المالية الشاملة', description: 'لوحة التحليلات المالية المتقدمة.', icon: Activity, loaderMessage: 'جاري تحميل التحليلات المالية...' },
  { id: 'sales', title: 'تحليلات المبيعات', description: 'تقارير المبيعات والاتجاهات.', icon: BarChart3, loaderMessage: 'جاري تحميل تحليلات المبيعات...' },
  { id: 'expenses', title: 'المصروفات', description: 'إدارة واستعراض المصروفات.', icon: DollarSign, loaderMessage: 'جاري تحميل المصروفات...' },
  { id: 'zakat', title: 'الزكاة', description: 'نظام الزكاة والحسابات المرتبطة.', icon: DollarSign, loaderMessage: 'جاري تحميل نظام الزكاة...' },
  { id: 'suppliers', title: 'تقارير الموردين', description: 'تقارير وأداء الموردين.', icon: FileBarChart, loaderMessage: 'جاري تحميل تقارير الموردين...' },
];

const LoadingView: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-muted-foreground">
    <Loader2 className="h-6 w-6 animate-spin" />
    <span className="text-sm">{message}</span>
  </div>
);

const ReportsOperationsPage: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams<{ tab?: string }>();
  const { setTabs, setActiveTab: setTitlebarActiveTab, setShowTabs, clearTabs } = useTitlebar();

  const perms = usePermissions();

  const allowedTabs = useMemo(() => {
    const canFinancial = perms.ready ? perms.anyOf(['viewFinancialReports']) : false;
    const canSales = perms.ready ? perms.anyOf(['viewSalesReports','viewReports']) : false;
    const canExpenses = perms.ready ? perms.anyOf(['viewFinancialReports']) : false;
    const canZakat = perms.ready ? perms.anyOf(['viewFinancialReports']) : false;
    const canSuppliers = perms.ready ? perms.anyOf(['viewReports','viewSuppliers','viewSupplierReportsInReports']) : false;

    return TAB_CONFIG.filter(t =>
      (t.id === 'financial' && canFinancial) ||
      (t.id === 'sales' && canSales) ||
      (t.id === 'expenses' && canExpenses) ||
      (t.id === 'zakat' && canZakat) ||
      (t.id === 'suppliers' && canSuppliers)
    );
  }, [perms.ready, perms.role, perms.isOrgAdmin, perms.isSuperAdmin]);

  const resolvedTab = useMemo<TabKey>(() => {
    const incoming = params.tab as TabKey | undefined;
    const isAllowedIncoming = allowedTabs.some((t) => t.id === incoming);
    return isAllowedIncoming ? (incoming as TabKey) : (allowedTabs[0]?.id || 'financial');
  }, [params.tab, allowedTabs]);

  useEffect(() => {
    if (!params.tab || !TAB_CONFIG.some((tab) => tab.id === params.tab)) {
      navigate(`/dashboard/reports-operations/${resolvedTab}`, { replace: true });
    }
  }, [params.tab, resolvedTab, navigate]);

  const [layoutState, setLayoutState] = useState<POSLayoutState>({ connectionStatus: 'connected', isRefreshing: false });
  const [refreshHandler, setRefreshHandler] = useState<RefreshHandler>(null);

  const activeTab = resolvedTab;
  const activeTabMeta = TAB_CONFIG.find((tab) => tab.id === activeTab) ?? TAB_CONFIG[0];
  useTitle(`${activeTabMeta.title} - مركز التقارير`);

  const handleTabChange = useCallback((value: string) => {
    const target = TAB_CONFIG.find((tab) => tab.id === (value as TabKey)) ?? TAB_CONFIG[0];
    if (target.id !== activeTab) navigate(`/dashboard/reports-operations/${target.id}`);
  }, [activeTab, navigate]);

  useEffect(() => {
    const titlebarTabs = allowedTabs.map((tab) => {
      const Icon = tab.icon;
      return { id: tab.id, title: tab.title, icon: <Icon className="h-3 w-3" />, onSelect: () => handleTabChange(tab.id) };
    });
    setTabs(titlebarTabs);
    setShowTabs(true);
    return () => { clearTabs(); };
  }, [handleTabChange, setTabs, setShowTabs, clearTabs]);

  useEffect(() => { setTitlebarActiveTab(activeTab); }, [activeTab, setTitlebarActiveTab]);

  useEffect(() => {
    setRefreshHandler(null);
    setLayoutState({ connectionStatus: 'connected', isRefreshing: false, executionTime: undefined });
  }, [activeTab]);

  const handleRegisterRefresh = useCallback((handler: RefreshHandler) => { setRefreshHandler(handler); }, []);
  const handleChildLayoutStateChange = useCallback((state: POSLayoutState) => { setLayoutState((prev) => ({ ...prev, ...state })); }, []);
  const handleLayoutRefresh = useCallback(() => { if (refreshHandler) { const r = refreshHandler(); if ((r as any)?.then) void r; } }, [refreshHandler]);

  const renderActiveContent = useMemo(() => {
    switch (activeTab) {
      case 'financial':
        return (
          <Suspense key="financial" fallback={<LoadingView message={TAB_CONFIG[0].loaderMessage} />}>
            <FinancialAnalyticsTab useStandaloneLayout={false} onRegisterRefresh={handleRegisterRefresh} onLayoutStateChange={handleChildLayoutStateChange} />
          </Suspense>
        );
      case 'sales':
        return (
          <Suspense key="sales" fallback={<LoadingView message={TAB_CONFIG[1].loaderMessage} />}>
            <SalesAnalyticsTab useStandaloneLayout={false} onRegisterRefresh={handleRegisterRefresh} onLayoutStateChange={handleChildLayoutStateChange} />
          </Suspense>
        );
      case 'expenses':
        return (
          <Suspense key="expenses" fallback={<LoadingView message={TAB_CONFIG[2].loaderMessage} />}>
            <ExpensesTab useStandaloneLayout={false} onRegisterRefresh={handleRegisterRefresh} onLayoutStateChange={handleChildLayoutStateChange} />
          </Suspense>
        );
      case 'zakat':
        return (
          <Suspense key="zakat" fallback={<LoadingView message={TAB_CONFIG[3].loaderMessage} />}>
            <ZakatTab useStandaloneLayout={false} onRegisterRefresh={handleRegisterRefresh} onLayoutStateChange={handleChildLayoutStateChange} />
          </Suspense>
        );
      case 'suppliers':
        return (
          <Suspense key="suppliers" fallback={<LoadingView message={TAB_CONFIG[4].loaderMessage} />}>
            <SupplierReportsTab useStandaloneLayout={false} onRegisterRefresh={handleRegisterRefresh} onLayoutStateChange={handleChildLayoutStateChange} />
          </Suspense>
        );
      default:
        return null;
    }
  }, [activeTab, handleRegisterRefresh, handleChildLayoutStateChange]);

  const layoutContent = (
    <div className="space-y-6 p-6" dir="rtl">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">مركز التقارير والتحليلات</h1>
        <p className="text-sm text-muted-foreground">إدارة موحدة للتحليلات المالية، تحليلات المبيعات، المصروفات، الزكاة وتقارير الموردين.</p>
      </div>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-5 gap-2 rounded-xl bg-slate-900/5 p-1 dark:bg-slate-800/30">
          {allowedTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.id} value={tab.id} className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow">
                <Icon className="h-4 w-4" />
                <span>{tab.title}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
      <div className="rounded-2xl border border-border/50 bg-card shadow-sm">
        <div className="border-b border-border/40 px-6 py-4"><p className="text-sm text-muted-foreground">{activeTabMeta.description}</p></div>
        <div className="px-2 py-4 sm:px-6">{renderActiveContent}</div>
      </div>
    </div>
  );

  return (
    <POSPureLayout onRefresh={handleLayoutRefresh} isRefreshing={Boolean(layoutState.isRefreshing)} connectionStatus={layoutState.connectionStatus ?? 'connected'} executionTime={layoutState.executionTime}>
      {layoutContent}
    </POSPureLayout>
  );
};

export default ReportsOperationsPage;
