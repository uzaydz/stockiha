import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import POSPureLayout from '@/components/pos-layout/POSPureLayout';
import { useTitle } from '@/hooks/useTitle';
import { useTitlebar } from '@/context/TitlebarContext';
import { POSLayoutState, RefreshHandler } from '@/components/pos-layout/types';
import { Wrench, Tv, Loader2, Download } from 'lucide-react';

const RepairServicesTab = React.lazy(() => import('../pages/RepairServices'));
const SubscriptionServicesTab = React.lazy(() => import('../pages/dashboard/SubscriptionServices'));
const GameDownloadsTab = React.lazy(() => import('../pages/GameDownloadsPage'));

type TabKey = 'repair' | 'subscription' | 'gameDownloads';

interface TabDefinition {
  id: TabKey;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  loaderMessage: string;
}

const TAB_CONFIG: TabDefinition[] = [
  {
    id: 'repair',
    title: 'خدمات التصليح',
    description: 'لوحة إدارة خدمات التصليح والطلبات ذات الصلة.',
    icon: Wrench,
    loaderMessage: 'جاري تحميل خدمات التصليح...'
  },
  {
    id: 'subscription',
    title: 'خدمات الاشتراكات',
    description: 'إدارة خدمات الاشتراكات وسجلاتها.',
    icon: Tv,
    loaderMessage: 'جاري تحميل خدمات الاشتراكات...'
  },
  {
    id: 'gameDownloads',
    title: 'تحميل الألعاب',
    description: 'إدارة تطبيق تحميل الألعاب والمحتوى.',
    icon: Download,
    loaderMessage: 'جاري تحميل تطبيق الألعاب...'
  }
];

const LoadingView: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-muted-foreground">
    <Loader2 className="h-6 w-6 animate-spin" />
    <span className="text-sm">{message}</span>
  </div>
);

const ServicesOperationsPage: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams<{ tab?: string }>();
  const { setTabs, setActiveTab: setTitlebarActiveTab, setShowTabs, clearTabs } = useTitlebar();

  const resolvedTab = useMemo<TabKey>(() => {
    const incoming = params.tab as TabKey | undefined;
    return TAB_CONFIG.some((tab) => tab.id === incoming) ? (incoming as TabKey) : TAB_CONFIG[0].id;
  }, [params.tab]);

  useEffect(() => {
    if (!params.tab || !TAB_CONFIG.some((tab) => tab.id === params.tab)) {
      navigate(`/dashboard/services-operations/${resolvedTab}`, { replace: true });
    }
  }, [params.tab, resolvedTab, navigate]);

  const [layoutState, setLayoutState] = useState<POSLayoutState>({
    connectionStatus: 'connected',
    isRefreshing: false,
  });
  const [refreshHandler, setRefreshHandler] = useState<RefreshHandler>(null);

  const activeTab = resolvedTab;
  const activeTabMeta = TAB_CONFIG.find((tab) => tab.id === activeTab) ?? TAB_CONFIG[0];

  useTitle(`${activeTabMeta.title} - مركز الخدمات`);

  const handleTabChange = useCallback(
    (value: string) => {
      const target = TAB_CONFIG.find((tab) => tab.id === (value as TabKey)) ?? TAB_CONFIG[0];
      if (target.id !== activeTab) {
        navigate(`/dashboard/services-operations/${target.id}`);
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
      case 'repair':
        return (
          <Suspense key="repair" fallback={<LoadingView message={TAB_CONFIG[0].loaderMessage} />}>
            <RepairServicesTab
              useStandaloneLayout={false}
              onRegisterRefresh={handleRegisterRefresh}
              onLayoutStateChange={handleChildLayoutStateChange}
            />
          </Suspense>
        );
      case 'subscription':
        return (
          <Suspense key="subscription" fallback={<LoadingView message={TAB_CONFIG[1].loaderMessage} />}>
            <SubscriptionServicesTab
              useStandaloneLayout={false}
              onRegisterRefresh={handleRegisterRefresh}
              onLayoutStateChange={handleChildLayoutStateChange}
            />
          </Suspense>
        );
      case 'gameDownloads':
        return (
          <Suspense key="gameDownloads" fallback={<LoadingView message={TAB_CONFIG[2].loaderMessage} />}>
            <GameDownloadsTab
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
        <h1 className="text-3xl font-bold text-foreground">مركز الخدمات</h1>
        <p className="text-sm text-muted-foreground">إدارة موحدة لخدمات التصليح والاشتراكات وتحميل الألعاب.</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3 gap-2 rounded-xl bg-slate-900/5 p-1 dark:bg-slate-800/30">
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

export default ServicesOperationsPage;


