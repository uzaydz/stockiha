import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import POSPureLayout from '@/components/pos-layout/POSPureLayout';
import POSOrdersWrapper from '@/components/pos/POSOrdersWrapper';
import { useTitle } from '@/hooks/useTitle';
import { useTitlebar } from '@/context/TitlebarContext';
import { POSLayoutState, RefreshHandler } from '@/components/pos-layout/types';
import { ShoppingCart, Wallet, RotateCcw, ShieldAlert, Loader2, Users, FileText } from 'lucide-react';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';

const POSOrdersTab = React.lazy(() => import('./POSOrdersOptimized'));
const CustomersTab = React.lazy(() => import('./dashboard/Customers'));
const CustomerDebtsTab = React.lazy(() => import('./dashboard/CustomerDebts'));
const ProductReturnsTab = React.lazy(() => import('./returns/ProductReturns'));
const LossDeclarationsTab = React.lazy(() => import('./losses/LossDeclarations'));
const InvoicesTab = React.lazy(() => import('./dashboard/Invoices'));

type TabKey = 'orders' | 'customers' | 'debts' | 'returns' | 'losses' | 'invoices';

interface TabDefinition {
  id: TabKey;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  loaderMessage: string;
}

const TAB_CONFIG: TabDefinition[] = [
  {
    id: 'orders',
    title: 'طلبيات نقطة البيع',
    description: 'متابعة الطلبيات، حالاتها، المدفوعات والإرجاعات المرتبطة بها.',
    icon: ShoppingCart,
    loaderMessage: 'جاري تحميل الطلبيات...'
  },
  {
    id: 'customers',
    title: 'العملاء',
    description: 'إدارة قاعدة بيانات العملاء والبحث والتصفية.',
    icon: Users,
    loaderMessage: 'جاري تحميل العملاء...'
  },
  {
    id: 'debts',
    title: 'مديونيات العملاء',
    description: 'إدارة ديون العملاء، تسجيل الدفعات وتتبع المستحقات.',
    icon: Wallet,
    loaderMessage: 'جاري تحميل بيانات المديونيات...'
  },
  {
    id: 'returns',
    title: 'إرجاعات المنتجات',
    description: 'معالجة طلبات الإرجاع وفحص العناصر المرتجعة بسرعة.',
    icon: RotateCcw,
    loaderMessage: 'جاري تحميل الإرجاعات...'
  },
  {
    id: 'losses',
    title: 'التصريح بالخسائر',
    description: 'تسجيل خسائر المخزون وتتبع التحقيقات والإجراءات التصحيحية.',
    icon: ShieldAlert,
    loaderMessage: 'جاري تحميل بيانات الخسائر...'
  },
  {
    id: 'invoices',
    title: 'الفواتير',
    description: 'إدارة الفواتير، إنشاء فواتير جديدة وطباعتها.',
    icon: FileText,
    loaderMessage: 'جاري تحميل الفواتير...'
  }
];

const LoadingView: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-muted-foreground">
    <Loader2 className="h-6 w-6 animate-spin" />
    <span className="text-sm">{message}</span>
  </div>
);

const POSOperationsPage: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams<{ tab?: string }>();
  const { setTabs, setActiveTab: setTitlebarActiveTab, setShowTabs, clearTabs } = useTitlebar();

  const perms = useUnifiedPermissions();

  const allowedTabs = useMemo(() => {
    // تحديد تبويبات مسموح بها بناءً على صلاحيات StaffPermissions الجديدة
    // وضع المدير = صلاحيات كاملة
    if (perms.isAdminMode || perms.isOrgAdmin || perms.isSuperAdmin) {
      return TAB_CONFIG;
    }

    const canOrders = perms.ready ? perms.anyOf(['accessPOS', 'canViewPosOrders', 'canManagePosOrders']) : false;
    const canCustomers = perms.ready ? perms.anyOf(['viewCustomers', 'manageCustomers', 'accessPOS']) : false;
    const canDebts = perms.ready ? perms.anyOf(['canViewDebts', 'canManageDebts', 'accessPOS']) : false;
    const canReturns = perms.ready ? perms.anyOf(['canViewReturns', 'canManageReturns']) : false;
    const canLosses = perms.ready ? perms.anyOf(['canViewLosses', 'canManageLosses']) : false;
    const canInvoices = perms.ready ? perms.anyOf(['canViewInvoices', 'canManageInvoices']) : false;

    return TAB_CONFIG.filter(t =>
      (t.id === 'orders' && canOrders) ||
      (t.id === 'customers' && canCustomers) ||
      (t.id === 'debts' && canDebts) ||
      (t.id === 'returns' && canReturns) ||
      (t.id === 'losses' && canLosses) ||
      (t.id === 'invoices' && canInvoices)
    );
  }, [perms.ready, perms.isAdminMode, perms.isOrgAdmin, perms.isSuperAdmin]);

  const resolvedTab = useMemo<TabKey>(() => {
    const incoming = params.tab as TabKey | undefined;
    const isAllowedIncoming = allowedTabs.some((t) => t.id === incoming);
    return isAllowedIncoming ? (incoming as TabKey) : (allowedTabs[0]?.id || 'orders');
  }, [params.tab, allowedTabs]);

  useEffect(() => {
    if (!params.tab || !TAB_CONFIG.some((tab) => tab.id === params.tab)) {
      navigate(`/dashboard/pos-operations/${resolvedTab}`, { replace: true });
    }
  }, [params.tab, resolvedTab, navigate]);

  const [layoutState, setLayoutState] = useState<POSLayoutState>({
    connectionStatus: 'connected',
    isRefreshing: false,
  });
  const [refreshHandler, setRefreshHandler] = useState<RefreshHandler>(null);

  const activeTab = resolvedTab;
  const activeTabMeta = TAB_CONFIG.find((tab) => tab.id === activeTab) ?? TAB_CONFIG[0];

  useTitle(`${activeTabMeta.title} - عمليات نقطة البيع`);

  const handleTabChange = useCallback(
    (value: string) => {
      const target = TAB_CONFIG.find((tab) => tab.id === (value as TabKey)) ?? TAB_CONFIG[0];
      if (target.id !== activeTab) {
        navigate(`/dashboard/pos-operations/${target.id}`);
      }
    },
    [activeTab, navigate]
  );

  useEffect(() => {
    const titlebarTabs = allowedTabs.map((tab) => {
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
      case 'orders':
        return (
          <Suspense key="orders" fallback={<LoadingView message={TAB_CONFIG[0].loaderMessage} />}>
            <POSOrdersWrapper>
              <POSOrdersTab
                useStandaloneLayout={false}
                onRegisterRefresh={handleRegisterRefresh}
                onLayoutStateChange={handleChildLayoutStateChange}
              />
            </POSOrdersWrapper>
          </Suspense>
        );
      case 'customers':
        return (
          <Suspense key="customers" fallback={<LoadingView message={TAB_CONFIG[1].loaderMessage} />}>
            <CustomersTab
              useStandaloneLayout={false}
              onRegisterRefresh={handleRegisterRefresh}
              onLayoutStateChange={handleChildLayoutStateChange}
            />
          </Suspense>
        );
      case 'debts':
        return (
          <Suspense key="debts" fallback={<LoadingView message={TAB_CONFIG[2].loaderMessage} />}>
            <CustomerDebtsTab
              useStandaloneLayout={false}
              onRegisterRefresh={handleRegisterRefresh}
              onLayoutStateChange={handleChildLayoutStateChange}
            />
          </Suspense>
        );
      case 'returns':
        return (
          <Suspense key="returns" fallback={<LoadingView message={TAB_CONFIG[3].loaderMessage} />}>
            <ProductReturnsTab
              useStandaloneLayout={false}
              onRegisterRefresh={handleRegisterRefresh}
              onLayoutStateChange={handleChildLayoutStateChange}
            />
          </Suspense>
        );
      case 'losses':
        return (
          <Suspense key="losses" fallback={<LoadingView message={TAB_CONFIG[4].loaderMessage} />}>
            <LossDeclarationsTab
              useStandaloneLayout={false}
              onRegisterRefresh={handleRegisterRefresh}
              onLayoutStateChange={handleChildLayoutStateChange}
            />
          </Suspense>
        );
      case 'invoices':
        return (
          <Suspense key="invoices" fallback={<LoadingView message={TAB_CONFIG[5].loaderMessage} />}>
            <InvoicesTab
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
        <h1 className="text-3xl font-bold text-foreground">عمليات نقطة البيع</h1>
        <p className="text-sm text-muted-foreground">
          تحكم كامل في الطلبيات، المديونيات، الإرجاعات والتصاريح من واجهة واحدة.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-6 gap-2 rounded-xl bg-slate-900/5 p-1 dark:bg-slate-800/30">
          {allowedTabs.map((tab) => {
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

export default POSOperationsPage;
