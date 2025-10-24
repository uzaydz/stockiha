import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import POSPureLayout from '@/components/pos-layout/POSPureLayout';
import { useTitle } from '@/hooks/useTitle';
import { useTitlebar } from '@/context/TitlebarContext';
import { POSLayoutState, RefreshHandler } from '@/components/pos-layout/types';
import { Store, Settings, Layout, FileText, Truck, Loader2 } from 'lucide-react';

const StoreSettingsTab = React.lazy(() => import('./StoreSettingsPage'));
const StoreEditorTab = React.lazy(() => import('./admin/StoreEditor'));
const OrganizationComponentsTab = React.lazy(() => import('./admin/OrganizationComponentsEditor'));
const StoreThemesTab = React.lazy(() => import('./dashboard/StoreThemes'));
const LandingPagesTab = React.lazy(() => import('./LandingPagesManager'));
const ThankYouEditorTab = React.lazy(() => import('./dashboard/ThankYouPageEditor'));
const DeliveryTab = React.lazy(() => import('./dashboard/DeliveryManagement'));

type TabKey = 'store-settings' | 'store-editor' | 'components' | 'themes' | 'landing-pages' | 'thank-you' | 'delivery';

interface TabDefinition {
  id: TabKey;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  loaderMessage: string;
}

const TAB_CONFIG: TabDefinition[] = [
  {
    id: 'store-settings',
    title: 'إعدادات المتجر',
    description: 'إدارة الإعدادات العامة للمتجر الإلكتروني والخيارات الأساسية.',
    icon: Settings,
    loaderMessage: 'جاري تحميل إعدادات المتجر...'
  },
  {
    id: 'store-editor',
    title: 'تخصيص المتجر',
    description: 'تخصيص مظهر وتصميم واجهة المتجر الإلكتروني.',
    icon: Store,
    loaderMessage: 'جاري تحميل محرر المتجر...'
  },
  {
    id: 'components',
    title: 'محرر المكونات',
    description: 'إدارة وتخصيص مكونات المؤسسة والعناصر المشتركة.',
    icon: Layout,
    loaderMessage: 'جاري تحميل محرر المكونات...'
  },
  {
    id: 'themes',
    title: 'قوالب المتجر',
    description: 'اختيار وتخصيص قوالب واجهة المتجر الجاهزة.',
    icon: Layout,
    loaderMessage: 'جاري تحميل القوالب...'
  },
  {
    id: 'landing-pages',
    title: 'صفحات الهبوط',
    description: 'إنشاء وإدارة صفحات الهبوط التسويقية.',
    icon: FileText,
    loaderMessage: 'جاري تحميل صفحات الهبوط...'
  },
  {
    id: 'thank-you',
    title: 'صفحة الشكر',
    description: 'تخصيص صفحة الشكر التي تظهر بعد إتمام الطلب.',
    icon: FileText,
    loaderMessage: 'جاري تحميل محرر صفحة الشكر...'
  },
  {
    id: 'delivery',
    title: 'إدارة التوصيل',
    description: 'إدارة خيارات التوصيل، المناطق، والأسعار.',
    icon: Truck,
    loaderMessage: 'جاري تحميل إدارة التوصيل...'
  }
];

const LoadingView: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-muted-foreground">
    <Loader2 className="h-6 w-6 animate-spin" />
    <span className="text-sm">{message}</span>
  </div>
);

const StoreOperationsPage: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams<{ tab?: string }>();
  const { setTabs, setActiveTab: setTitlebarActiveTab, setShowTabs, clearTabs } = useTitlebar();

  const resolvedTab = useMemo<TabKey>(() => {
    const incoming = params.tab as TabKey | undefined;
    return TAB_CONFIG.some((tab) => tab.id === incoming) ? (incoming as TabKey) : TAB_CONFIG[0].id;
  }, [params.tab]);

  useEffect(() => {
    if (!params.tab || !TAB_CONFIG.some((tab) => tab.id === params.tab)) {
      navigate(`/dashboard/store-operations/${resolvedTab}`, { replace: true });
    }
  }, [params.tab, resolvedTab, navigate]);

  const [layoutState, setLayoutState] = useState<POSLayoutState>({
    connectionStatus: 'connected',
    isRefreshing: false,
  });
  const [refreshHandler, setRefreshHandler] = useState<RefreshHandler>(null);

  const activeTab = resolvedTab;
  const activeTabMeta = TAB_CONFIG.find((tab) => tab.id === activeTab) ?? TAB_CONFIG[0];

  useTitle(`${activeTabMeta.title} - إعدادات المتجر`);

  const handleTabChange = useCallback(
    (value: string) => {
      const target = TAB_CONFIG.find((tab) => tab.id === (value as TabKey)) ?? TAB_CONFIG[0];
      if (target.id !== activeTab) {
        navigate(`/dashboard/store-operations/${target.id}`);
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
      case 'store-settings':
        return (
          <Suspense key="store-settings" fallback={<LoadingView message={TAB_CONFIG[0].loaderMessage} />}>
            <StoreSettingsTab useStandaloneLayout={false} />
          </Suspense>
        );
      case 'store-editor':
        return (
          <Suspense key="store-editor" fallback={<LoadingView message={TAB_CONFIG[1].loaderMessage} />}>
            <StoreEditorTab useStandaloneLayout={false} />
          </Suspense>
        );
      case 'components':
        return (
          <Suspense key="components" fallback={<LoadingView message={TAB_CONFIG[2].loaderMessage} />}>
            <OrganizationComponentsTab useStandaloneLayout={false} />
          </Suspense>
        );
      case 'themes':
        return (
          <Suspense key="themes" fallback={<LoadingView message={TAB_CONFIG[3].loaderMessage} />}>
            <StoreThemesTab useStandaloneLayout={false} />
          </Suspense>
        );
      case 'landing-pages':
        return (
          <Suspense key="landing-pages" fallback={<LoadingView message={TAB_CONFIG[4].loaderMessage} />}>
            <LandingPagesTab useStandaloneLayout={false} />
          </Suspense>
        );
      case 'thank-you':
        return (
          <Suspense key="thank-you" fallback={<LoadingView message={TAB_CONFIG[5].loaderMessage} />}>
            <ThankYouEditorTab useStandaloneLayout={false} />
          </Suspense>
        );
      case 'delivery':
        return (
          <Suspense key="delivery" fallback={<LoadingView message={TAB_CONFIG[6].loaderMessage} />}>
            <DeliveryTab useStandaloneLayout={false} />
          </Suspense>
        );
      default:
        return null;
    }
  }, [activeTab, handleRegisterRefresh, handleChildLayoutStateChange]);

  const layoutContent = (
    <div className="space-y-6 p-6" dir="rtl">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">إعدادات المتجر الإلكتروني</h1>
        <p className="text-sm text-muted-foreground">
          مركز شامل لإدارة وتخصيص متجرك الإلكتروني، من التصميم إلى التوصيل.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-7 gap-2 rounded-xl bg-slate-900/5 p-1 dark:bg-slate-800/30">
          {TAB_CONFIG.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden lg:inline">{tab.title}</span>
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

export default StoreOperationsPage;
