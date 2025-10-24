import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import POSPureLayout from '@/components/pos-layout/POSPureLayout';
import { useTitle } from '@/hooks/useTitle';
import { useTitlebar } from '@/context/TitlebarContext';
import { POSLayoutState, RefreshHandler } from '@/components/pos-layout/types';
import { Users, ShoppingBag, Receipt, FileBarChart, Loader2 } from 'lucide-react';

const SuppliersTab = React.lazy(() => import('./dashboard/SuppliersManagement'));
const PurchasesTab = React.lazy(() => import('./dashboard/SupplierPurchases'));
const PaymentsTab = React.lazy(() => import('./dashboard/SupplierPayments'));
const ReportsTab = React.lazy(() => import('./dashboard/SupplierReports'));

type TabKey = 'suppliers' | 'purchases' | 'payments' | 'reports';

interface TabDefinition {
  id: TabKey;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  loaderMessage: string;
}

const TAB_CONFIG: TabDefinition[] = [
  {
    id: 'suppliers',
    title: 'الموردين',
    description: 'إدارة الموردين، إضافة موردين جدد، تحديث معلومات الموردين.',
    icon: Users,
    loaderMessage: 'جاري تحميل الموردين...'
  },
  {
    id: 'purchases',
    title: 'المشتريات',
    description: 'إدارة مشتريات الموردين، إنشاء طلبات شراء جديدة وتتبع حالتها.',
    icon: ShoppingBag,
    loaderMessage: 'جاري تحميل المشتريات...'
  },
  {
    id: 'payments',
    title: 'المدفوعات',
    description: 'تسجيل مدفوعات الموردين، تتبع المستحقات والمبالغ المدفوعة.',
    icon: Receipt,
    loaderMessage: 'جاري تحميل المدفوعات...'
  },
  {
    id: 'reports',
    title: 'التقارير',
    description: 'تقارير شاملة عن الموردين، المشتريات، والمدفوعات.',
    icon: FileBarChart,
    loaderMessage: 'جاري تحميل التقارير...'
  }
];

const LoadingView: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-muted-foreground">
    <Loader2 className="h-6 w-6 animate-spin" />
    <span className="text-sm">{message}</span>
  </div>
);

const SupplierOperationsPage: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams<{ tab?: string }>();
  const { setTabs, setActiveTab: setTitlebarActiveTab, setShowTabs, clearTabs } = useTitlebar();

  const resolvedTab = useMemo<TabKey>(() => {
    const incoming = params.tab as TabKey | undefined;
    return TAB_CONFIG.some((tab) => tab.id === incoming) ? (incoming as TabKey) : TAB_CONFIG[0].id;
  }, [params.tab]);

  useEffect(() => {
    if (!params.tab || !TAB_CONFIG.some((tab) => tab.id === params.tab)) {
      navigate(`/dashboard/supplier-operations/${resolvedTab}`, { replace: true });
    }
  }, [params.tab, resolvedTab, navigate]);

  const [layoutState, setLayoutState] = useState<POSLayoutState>({
    connectionStatus: 'connected',
    isRefreshing: false,
  });
  const [refreshHandler, setRefreshHandler] = useState<RefreshHandler>(null);

  const activeTab = resolvedTab;
  const activeTabMeta = TAB_CONFIG.find((tab) => tab.id === activeTab) ?? TAB_CONFIG[0];

  useTitle(`${activeTabMeta.title} - إدارة الموردين`);

  const handleTabChange = useCallback(
    (value: string) => {
      const target = TAB_CONFIG.find((tab) => tab.id === (value as TabKey)) ?? TAB_CONFIG[0];
      if (target.id !== activeTab) {
        navigate(`/dashboard/supplier-operations/${target.id}`);
      }
    },
    [activeTab, navigate]
  );

  useEffect(() => {
    const titlebarTabs = TAB_CONFIG.map((tab) => {
      const Icon = tab.icon;
      return {
        id: tab.id,
        title: tab.title,
        icon: <Icon className="h-3 w-3" />,
        onSelect: () => handleTabChange(tab.id),
      };
    });

    setTabs(titlebarTabs);
    setShowTabs(true);

    return () => {
      clearTabs();
    };
  }, [handleTabChange, setTabs, setShowTabs, clearTabs]);

  useEffect(() => {
    setTitlebarActiveTab(activeTab);
  }, [activeTab, setTitlebarActiveTab]);

  useEffect(() => {
    setRefreshHandler(null);
    setLayoutState({
      connectionStatus: 'connected',
      isRefreshing: false,
      executionTime: undefined,
    });
  }, [activeTab]);

  const handleRegisterRefresh = useCallback((handler: RefreshHandler) => {
    setRefreshHandler(handler);
  }, []);

  const handleChildLayoutStateChange = useCallback((state: POSLayoutState) => {
    setLayoutState((prev) => ({
      ...prev,
      ...state,
    }));
  }, []);

  const handleLayoutRefresh = useCallback(() => {
    if (!refreshHandler) return;
    const result = refreshHandler();
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      void result;
    }
  }, [refreshHandler]);

  const renderActiveContent = useMemo(() => {
    switch (activeTab) {
      case 'suppliers':
        return (
          <Suspense key="suppliers" fallback={<LoadingView message={TAB_CONFIG[0].loaderMessage} />}>
            <SuppliersTab
              useStandaloneLayout={false}
              onRegisterRefresh={handleRegisterRefresh}
              onLayoutStateChange={handleChildLayoutStateChange}
            />
          </Suspense>
        );
      case 'purchases':
        return (
          <Suspense key="purchases" fallback={<LoadingView message={TAB_CONFIG[1].loaderMessage} />}>
            <PurchasesTab
              useStandaloneLayout={false}
              onRegisterRefresh={handleRegisterRefresh}
              onLayoutStateChange={handleChildLayoutStateChange}
            />
          </Suspense>
        );
      case 'payments':
        return (
          <Suspense key="payments" fallback={<LoadingView message={TAB_CONFIG[2].loaderMessage} />}>
            <PaymentsTab
              useStandaloneLayout={false}
              onRegisterRefresh={handleRegisterRefresh}
              onLayoutStateChange={handleChildLayoutStateChange}
            />
          </Suspense>
        );
      case 'reports':
        return (
          <Suspense key="reports" fallback={<LoadingView message={TAB_CONFIG[3].loaderMessage} />}>
            <ReportsTab
              useStandaloneLayout={false}
              onRegisterRefresh={handleRegisterRefresh}
              onLayoutStateChange={handleChildLayoutStateChange}
            />
          </Suspense>
        );
      default:
        return null;
    }
  }, [activeTab, handleRegisterRefresh, handleChildLayoutStateChange]);

  const layoutContent = (
    <div className="space-y-6 p-6" dir="rtl">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">إدارة الموردين والمشتريات</h1>
        <p className="text-sm text-muted-foreground">
          إدارة موحدة للموردين، المشتريات، المدفوعات والتقارير من واجهة واحدة.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4 gap-2 rounded-xl bg-slate-900/5 p-1 dark:bg-slate-800/30">
          {TAB_CONFIG.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow"
              >
                <Icon className="h-4 w-4" />
                <span>{tab.title}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      <div className="rounded-2xl border border-border/50 bg-card shadow-sm">
        <div className="border-b border-border/40 px-6 py-4">
          <p className="text-sm text-muted-foreground">{activeTabMeta.description}</p>
        </div>
        <div className="px-2 py-4 sm:px-6">{renderActiveContent}</div>
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
