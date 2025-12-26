import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import POSPureLayout from '@/components/pos-layout/POSPureLayout';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';
import { useTitle } from '@/hooks/useTitle';
import { useTitlebar } from '@/context/TitlebarContext';
import { POSLayoutState, RefreshHandler } from '@/components/pos-layout/types';
import { Package, Tag, Database, Activity, Loader2, HelpCircle } from 'lucide-react';
import ProductsUserGuide from '@/components/product/ProductsUserGuide';

const ProductsTab = React.lazy(() => import('./dashboard/ProductsCached'));
const CategoriesTab = React.lazy(() => import('./dashboard/Categories'));
const InventoryTab = React.lazy(() => import('./dashboard/Inventory'));
const InventoryTrackingTab = React.lazy(() => import('../components/inventory/AdvancedInventoryTrackingPage'));

type TabKey = 'products' | 'categories' | 'inventory' | 'inventoryTracking';

interface TabDefinition {
  id: TabKey;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  loaderMessage: string;
}

const TAB_CONFIG: TabDefinition[] = [
  {
    id: 'products',
    title: 'المنتجات',
    description: 'إدارة المنتجات، الفلاتر، الإنشاء والتحديث بنظام متكامل.',
    icon: Package,
    loaderMessage: 'جاري تحميل المنتجات...'
  },
  {
    id: 'categories',
    title: 'الفئات',
    description: 'تنظيم الفئات وتصنيف المنتجات وتحديثها بسهولة.',
    icon: Tag,
    loaderMessage: 'جاري تحميل الفئات...'
  },
  {
    id: 'inventory',
    title: 'المخزون',
    description: 'متابعة مستويات المخزون الحالية وتحديث الكميات.',
    icon: Database,
    loaderMessage: 'جاري تحميل المخزون...'
  },
  {
    id: 'inventoryTracking',
    title: 'تتبع المخزون',
    description: 'تحليلات وعمليات متقدمة لتتبع حركات المخزون بذكاء.',
    icon: Activity,
    loaderMessage: 'جاري تحميل تتبع المخزون...'
  }
];


const LoadingView: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-muted-foreground">
    <Loader2 className="h-6 w-6 animate-spin" />
    <span className="text-sm">{message}</span>
  </div>
);

const ProductOperationsPage: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams<{ tab?: string }>();
  const { setTabs, setActiveTab: setTitlebarActiveTab, setShowTabs, clearTabs } = useTitlebar();

  const perms = useUnifiedPermissions();

  const allowedTabs = useMemo(() => {
    // وضع المدير = صلاحيات كاملة
    if (perms.isAdminMode || perms.isOrgAdmin || perms.isSuperAdmin) {
      return TAB_CONFIG;
    }

    const canProducts = perms.ready ? perms.anyOf(['viewProducts', 'manageProducts', 'canViewProducts', 'canManageProducts']) : false;
    const canCategories = perms.ready ? perms.anyOf(['manageProductCategories', 'viewProducts', 'manageProducts', 'canViewCategories']) : false;
    const canInventory = perms.ready ? perms.anyOf(['viewInventory', 'canViewInventory']) : false;
    const canTracking = perms.ready ? perms.anyOf(['viewInventory', 'canViewInventoryTracking']) : false;
    return TAB_CONFIG.filter(t =>
      (t.id === 'products' && canProducts) ||
      (t.id === 'categories' && canCategories) ||
      (t.id === 'inventory' && canInventory) ||
      (t.id === 'inventoryTracking' && canTracking)
    );
  }, [perms.ready, perms.isAdminMode, perms.isOrgAdmin, perms.isSuperAdmin]);

  const resolvedTab = useMemo<TabKey>(() => {
    const incoming = params.tab as TabKey | undefined;
    const isAllowedIncoming = allowedTabs.some((t) => t.id === incoming);
    return isAllowedIncoming ? (incoming as TabKey) : (allowedTabs[0]?.id || 'products');
  }, [params.tab, allowedTabs]);

  useEffect(() => {
    if (!params.tab || !TAB_CONFIG.some((tab) => tab.id === params.tab)) {
      navigate(`/dashboard/product-operations/${resolvedTab}`, { replace: true });
    }
  }, [params.tab, resolvedTab, navigate]);

  const [layoutState, setLayoutState] = useState<POSLayoutState>({
    connectionStatus: 'connected',
    isRefreshing: false,
  });
  const [refreshHandler, setRefreshHandler] = useState<RefreshHandler>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const activeTab = resolvedTab;
  const activeTabMeta = TAB_CONFIG.find((tab) => tab.id === activeTab) ?? TAB_CONFIG[0];

  useTitle(`${activeTabMeta.title} - إدارة المنتجات`);

  const handleTabChange = useCallback(
    (value: string) => {
      const target = TAB_CONFIG.find((tab) => tab.id === (value as TabKey)) ?? TAB_CONFIG[0];
      if (target.id !== activeTab) {
        navigate(`/dashboard/product-operations/${target.id}`);
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
  }, [allowedTabs, handleTabChange, setTabs, setShowTabs, clearTabs]);

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
      case 'products':
        return (
          <Suspense key="products" fallback={<LoadingView message={TAB_CONFIG[0].loaderMessage} />}>
            <ProductsTab
              useStandaloneLayout={false}
              onRegisterRefresh={handleRegisterRefresh}
              onLayoutStateChange={handleChildLayoutStateChange}
            />
          </Suspense>
        );
      case 'categories':
        return (
          <Suspense key="categories" fallback={<LoadingView message={TAB_CONFIG[1].loaderMessage} />}>
            <CategoriesTab
              useStandaloneLayout={false}
              onRegisterRefresh={handleRegisterRefresh}
              onLayoutStateChange={handleChildLayoutStateChange}
            />
          </Suspense>
        );
      case 'inventory':
        return (
          <Suspense key="inventory" fallback={<LoadingView message={TAB_CONFIG[2].loaderMessage} />}>
            <InventoryTab
              useStandaloneLayout={false}
              onRegisterRefresh={handleRegisterRefresh}
              onLayoutStateChange={handleChildLayoutStateChange}
            />
          </Suspense>
        );
      case 'inventoryTracking':
        return (
          <Suspense key="inventoryTracking" fallback={<LoadingView message={TAB_CONFIG[3].loaderMessage} />}>
            <InventoryTrackingTab
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
    <div className="h-full w-full overflow-y-auto" dir="rtl">
      <div className="space-y-3 sm:space-y-4">
        {/* Header */}
        <div className="sticky top-0 z-10 space-y-3 p-3 sm:p-4 border-b border-border/50 bg-background/95 backdrop-blur">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">إدارة المنتجات</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                إدارة موحدة للمنتجات، الفئات، المخزون وتتبعه من واجهة واحدة.
              </p>
            </div>
            <button
              onClick={() => setIsGuideOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
            >
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">دليل الاستخدام</span>
            </button>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-2 rounded-xl bg-slate-900/5 p-1 dark:bg-slate-800/30">
              {allowedTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="flex items-center justify-center gap-2 rounded-lg px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow"
                  >
                    <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">{tab.title}</span>
                    <span className="sm:hidden text-xs">{tab.title}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>

        {/* Content */}
        <div>
          {renderActiveContent}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <POSPureLayout
        onRefresh={handleLayoutRefresh}
        isRefreshing={Boolean(layoutState.isRefreshing)}
        connectionStatus={layoutState.connectionStatus ?? 'connected'}
        executionTime={layoutState.executionTime}
        disableScroll={true}
      >
        {layoutContent}
      </POSPureLayout>

      <ProductsUserGuide
        open={isGuideOpen}
        onOpenChange={setIsGuideOpen}
      />
    </>
  );
};

export default ProductOperationsPage;
