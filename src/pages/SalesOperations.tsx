import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import POSPureLayout from '@/components/pos-layout/POSPureLayout';
import { useTitle } from '@/hooks/useTitle';
import { useTitlebar } from '@/context/TitlebarContext';
import { POSLayoutState, RefreshHandler } from '@/components/pos-layout/types';
import { ShoppingBag, Ban, Activity, Loader2, Users } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

const OrdersV2Tab = React.lazy(() => import('./dashboard/OrdersV2')); // استخدام OrdersV2 الأصلي المحدث بالـ hook الجديد
const BlockedCustomersTab = React.lazy(() => import('./dashboard/BlockedCustomers'));
const AbandonedOrdersTab = React.lazy(() => import('./dashboard/AbandonedOrders'));
const OrderGroupsTab = React.lazy(() => import('./dashboard/OrderGroups'));

type TabKey = 'onlineOrders' | 'blocked' | 'abandoned' | 'groups';

interface TabDefinition {
  id: TabKey;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  loaderMessage: string;
}

const TAB_CONFIG: TabDefinition[] = [
  {
    id: 'onlineOrders',
    title: 'الطلبات الإلكترونية',
    description: 'عرض وإدارة الطلبات الإلكترونية مع الفلاتر والإجراءات.',
    icon: ShoppingBag,
    loaderMessage: 'جاري تحميل الطلبات الإلكترونية...'
  },
  {
    id: 'blocked',
    title: 'قائمة المحظورين',
    description: 'إدارة قائمة العملاء المحظورين من الطلب.',
    icon: Ban,
    loaderMessage: 'جاري تحميل قائمة المحظورين...'
  },
  {
    id: 'abandoned',
    title: 'الطلبات المتروكة',
    description: 'تحليل وإدارة الطلبات المتروكة واسترجاعها.',
    icon: Activity,
    loaderMessage: 'جاري تحميل الطلبات المتروكة...'
  },
  {
    id: 'groups',
    title: 'مجموعات الطلبات',
    description: 'إدارة مجموعات الطلبات الإلكترونية وتصفية المنتجات.',
    icon: Users,
    loaderMessage: 'جاري تحميل مجموعات الطلبات...'
  }
];

const LoadingView: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-muted-foreground">
    <Loader2 className="h-6 w-6 animate-spin" />
    <span className="text-sm">{message}</span>
  </div>
);

const SalesOperationsPage: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams<{ tab?: string }>();
  const { setTabs, setActiveTab: setTitlebarActiveTab, setShowTabs, clearTabs } = useTitlebar();

  const perms = usePermissions();

  const allowedTabs = useMemo(() => {
    const canOnline = perms.ready ? perms.anyOf(['viewOrders', 'canViewOnlineOrders']) : false;
    const canBlocked = perms.ready ? perms.anyOf(['viewOrders', 'canViewBlockedCustomers']) : false;
    const canAbandoned = perms.ready ? perms.anyOf(['viewOrders', 'canViewAbandonedOrders']) : false;
    const canGroups = perms.ready ? perms.anyOf(['canManageOnlineOrderGroups']) : false;
    return TAB_CONFIG.filter(t =>
      (t.id === 'onlineOrders' && canOnline) ||
      (t.id === 'blocked' && canBlocked) ||
      (t.id === 'abandoned' && canAbandoned) ||
      (t.id === 'groups' && canGroups)
    );
  }, [perms.ready, perms.role, perms.isOrgAdmin, perms.isSuperAdmin]);

  const resolvedTab = useMemo<TabKey>(() => {
    const incoming = params.tab as TabKey | undefined;
    const isAllowedIncoming = allowedTabs.some((t) => t.id === incoming);
    return isAllowedIncoming ? (incoming as TabKey) : (allowedTabs[0]?.id || 'onlineOrders');
  }, [params.tab, allowedTabs]);

  useEffect(() => {
    if (!params.tab || !TAB_CONFIG.some((tab) => tab.id === params.tab)) {
      navigate(`/dashboard/sales-operations/${resolvedTab}`, { replace: true });
    }
  }, [params.tab, resolvedTab, navigate]);

  const [layoutState, setLayoutState] = useState<POSLayoutState>({
    connectionStatus: 'connected',
    isRefreshing: false,
  });
  const [refreshHandler, setRefreshHandler] = useState<RefreshHandler>(null);

  const activeTab = resolvedTab;
  const activeTabMeta = TAB_CONFIG.find((tab) => tab.id === activeTab) ?? TAB_CONFIG[0];

  useTitle(`${activeTabMeta.title} - مركز المبيعات والطلبات`);

  const handleTabChange = useCallback(
    (value: string) => {
      const target = TAB_CONFIG.find((tab) => tab.id === (value as TabKey)) ?? TAB_CONFIG[0];
      if (target.id !== activeTab) {
        navigate(`/dashboard/sales-operations/${target.id}`);
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
    setLayoutState((prev) => ({ ...prev, ...state }));
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
      case 'onlineOrders':
        return (
          <Suspense key="onlineOrders" fallback={<LoadingView message={TAB_CONFIG[0].loaderMessage} />}>
            <OrdersV2Tab
              useStandaloneLayout={false}
              onRegisterRefresh={handleRegisterRefresh}
              onLayoutStateChange={handleChildLayoutStateChange}
            />
          </Suspense>
        );
      case 'blocked':
        return (
          <Suspense key="blocked" fallback={<LoadingView message={TAB_CONFIG[1].loaderMessage} />}>
            <BlockedCustomersTab
              useStandaloneLayout={false}
              onRegisterRefresh={handleRegisterRefresh}
              onLayoutStateChange={handleChildLayoutStateChange}
            />
          </Suspense>
        );
      case 'abandoned':
        return (
          <Suspense key="abandoned" fallback={<LoadingView message={TAB_CONFIG[2].loaderMessage} />}>
            <AbandonedOrdersTab
              useStandaloneLayout={false}
              onRegisterRefresh={handleRegisterRefresh}
              onLayoutStateChange={handleChildLayoutStateChange}
            />
          </Suspense>
        );
      case 'groups':
        return (
          <Suspense key="groups" fallback={<LoadingView message={TAB_CONFIG[3].loaderMessage} />}>
            <OrderGroupsTab />
          </Suspense>
        );
      default:
        return null;
    }
  }, [activeTab, handleRegisterRefresh, handleChildLayoutStateChange]);

  const layoutContent = (
    <div className="space-y-6 p-6" dir="rtl">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">مركز المبيعات والطلبات</h1>
        <p className="text-sm text-muted-foreground">إدارة موحدة للطلبات الإلكترونية، المحظورين والمتروكة.</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className={`grid w-full grid-cols-4 gap-2 rounded-xl bg-slate-900/5 p-1 dark:bg-slate-800/30`}>
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

export default SalesOperationsPage;
