import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import POSPureLayout from '@/components/pos-layout/POSPureLayout';
import { useTitle } from '@/hooks/useTitle';
import { useTitlebar } from '@/context/TitlebarContext';
import { POSLayoutState, RefreshHandler } from '@/components/pos-layout/types';
import {
  GraduationCap, BookOpen, Loader2, Megaphone, Music2,
  Store, ShoppingCart, Building2, Wrench, Monitor
} from 'lucide-react';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';

const AllCoursesTab = React.lazy(() => import('./courses/CoursesIndex'));
const DigitalMarketingTab = React.lazy(() => import('./courses/DigitalMarketingCourse'));
const TikTokMarketingTab = React.lazy(() => import('./courses/TikTokAdsCourse'));
const ECommerceStoreTab = React.lazy(() => import('./courses/ECommerceStoreCourse'));
const ECommerceTab = React.lazy(() => import('./courses/ECommerceCourse'));
const TraditionalBusinessTab = React.lazy(() => import('./courses/TraditionalBusinessCourse'));
const ServiceProvidersTab = React.lazy(() => import('./courses/ServiceProvidersCourse'));
const SystemTrainingTab = React.lazy(() => import('./courses/SystemTrainingCourse'));

type TabKey = 'all' | 'digital-marketing' | 'tiktok-marketing' | 'e-commerce-store' | 'e-commerce' | 'traditional-business' | 'service-providers' | 'system-training';

interface TabDefinition {
  id: TabKey;
  title: string;
  shortTitle: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  loaderMessage: string;
  color: string;
}

const TAB_CONFIG: TabDefinition[] = [
  {
    id: 'all',
    title: 'جميع الدورات',
    shortTitle: 'الكل',
    description: 'استعراض جميع الدورات التدريبية المتاحة في منصة ستوكيها.',
    icon: GraduationCap,
    loaderMessage: 'جاري تحميل الدورات...',
    color: 'text-orange-500'
  },
  {
    id: 'system-training',
    title: 'شرح النظام',
    shortTitle: 'النظام',
    description: 'دليل شامل لتعلم كيفية استخدام نظام سطوكيها باحترافية.',
    icon: Monitor,
    loaderMessage: 'جاري تحميل شرح النظام...',
    color: 'text-purple-500'
  },
  {
    id: 'digital-marketing',
    title: 'التسويق الإلكتروني',
    shortTitle: 'التسويق',
    description: 'تعلم استراتيجيات التسويق الرقمي الحديثة لتنمية أعمالك.',
    icon: Megaphone,
    loaderMessage: 'جاري تحميل دورة التسويق الإلكتروني...',
    color: 'text-blue-500'
  },
  {
    id: 'tiktok-marketing',
    title: 'التسويق عبر التيك توك',
    shortTitle: 'تيك توك',
    description: 'احترف التسويق عبر منصة تيك توك وزد مبيعاتك.',
    icon: Music2,
    loaderMessage: 'جاري تحميل دورة التيك توك...',
    color: 'text-pink-500'
  },
  {
    id: 'e-commerce-store',
    title: 'صنع متجر إلكتروني',
    shortTitle: 'المتجر',
    description: 'تعلم كيفية إنشاء وإدارة متجر إلكتروني احترافي.',
    icon: Store,
    loaderMessage: 'جاري تحميل دورة المتجر الإلكتروني...',
    color: 'text-emerald-500'
  },
  {
    id: 'e-commerce',
    title: 'التجارة الإلكترونية',
    shortTitle: 'التجارة',
    description: 'دليل شامل لبدء وتطوير أعمال التجارة الإلكترونية.',
    icon: ShoppingCart,
    loaderMessage: 'جاري تحميل دورة التجارة الإلكترونية...',
    color: 'text-green-500'
  },
  {
    id: 'traditional-business',
    title: 'التجار التقليديين',
    shortTitle: 'التقليديين',
    description: 'حلول رقمية مبتكرة للتجار التقليديين لتطوير أعمالهم.',
    icon: Building2,
    loaderMessage: 'جاري تحميل دورة التجار التقليديين...',
    color: 'text-amber-500'
  },
  {
    id: 'service-providers',
    title: 'مقدمي الخدمات',
    shortTitle: 'الخدمات',
    description: 'أدوات وتقنيات لتحسين إدارة وتسويق خدماتك.',
    icon: Wrench,
    loaderMessage: 'جاري تحميل دورة مقدمي الخدمات...',
    color: 'text-cyan-500'
  }
];

const LoadingView: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-muted-foreground">
    <Loader2 className="h-6 w-6 animate-spin" />
    <span className="text-sm">{message}</span>
  </div>
);

const CoursesOperationsPage: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams<{ tab?: string }>();
  const { setTabs, setActiveTab: setTitlebarActiveTab, setShowTabs, clearTabs } = useTitlebar();
  const perms = useUnifiedPermissions();

  // الدورات متاحة لجميع المستخدمين مع صلاحية accessPOS أو المديرين
  const allowedTabs = useMemo(() => {
    // وضع المدير = صلاحيات كاملة
    if (perms.isAdminMode || perms.isOrgAdmin || perms.isSuperAdmin) {
      return TAB_CONFIG;
    }

    const canAccessCourses = perms.ready ? perms.anyOf(['accessPOS', 'canAccessCoursesOperations', 'canViewAllCourses']) : false;
    // جميع الدورات متاحة لمن لديه صلاحية الوصول
    return canAccessCourses ? TAB_CONFIG : [];
  }, [perms.ready, perms.isAdminMode, perms.isOrgAdmin, perms.isSuperAdmin]);

  const resolvedTab = useMemo<TabKey>(() => {
    const incoming = params.tab as TabKey | undefined;
    const isAllowedIncoming = allowedTabs.some((t) => t.id === incoming);
    return isAllowedIncoming ? (incoming as TabKey) : (allowedTabs[0]?.id || 'all');
  }, [params.tab, allowedTabs]);

  useEffect(() => {
    if (!params.tab || !TAB_CONFIG.some((tab) => tab.id === params.tab)) {
      navigate(`/dashboard/courses-operations/${resolvedTab}`, { replace: true });
    }
  }, [params.tab, resolvedTab, navigate]);

  const [layoutState, setLayoutState] = useState<POSLayoutState>({
    connectionStatus: 'connected',
    isRefreshing: false,
  });
  const [refreshHandler, setRefreshHandler] = useState<RefreshHandler>(null);

  const activeTab = resolvedTab;
  const activeTabMeta = TAB_CONFIG.find((tab) => tab.id === activeTab) ?? TAB_CONFIG[0];

  useTitle(`${activeTabMeta.title} - دورات ستوكيها`);

  const handleTabChange = useCallback(
    (value: string) => {
      const target = TAB_CONFIG.find((tab) => tab.id === (value as TabKey)) ?? TAB_CONFIG[0];
      if (target.id !== activeTab) {
        navigate(`/dashboard/courses-operations/${target.id}`);
      }
    },
    [activeTab, navigate]
  );

  useEffect(() => {
    const titlebarTabs = allowedTabs.map((tab) => {
      const Icon = tab.icon;
      return {
        id: tab.id,
        title: tab.shortTitle,
        icon: <Icon className={`h-3.5 w-3.5 ${tab.color}`} />,
        onSelect: () => handleTabChange(tab.id),
      };
    });

    setTabs(titlebarTabs);
    setShowTabs(true);

    return () => {
      clearTabs();
    };
  }, [handleTabChange, setTabs, setShowTabs, clearTabs, allowedTabs]);

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
      case 'all':
        return (
          <Suspense key="all" fallback={<LoadingView message={TAB_CONFIG[0].loaderMessage} />}>
            <AllCoursesTab useStandaloneLayout={false} />
          </Suspense>
        );
      case 'digital-marketing':
        return (
          <Suspense key="digital-marketing" fallback={<LoadingView message={TAB_CONFIG[1].loaderMessage} />}>
            <DigitalMarketingTab useStandaloneLayout={false} />
          </Suspense>
        );
      case 'tiktok-marketing':
        return (
          <Suspense key="tiktok-marketing" fallback={<LoadingView message={TAB_CONFIG[2].loaderMessage} />}>
            <TikTokMarketingTab useStandaloneLayout={false} />
          </Suspense>
        );
      case 'e-commerce-store':
        return (
          <Suspense key="e-commerce-store" fallback={<LoadingView message={TAB_CONFIG[3].loaderMessage} />}>
            <ECommerceStoreTab useStandaloneLayout={false} />
          </Suspense>
        );
      case 'e-commerce':
        return (
          <Suspense key="e-commerce" fallback={<LoadingView message={TAB_CONFIG[4].loaderMessage} />}>
            <ECommerceTab useStandaloneLayout={false} />
          </Suspense>
        );
      case 'traditional-business':
        return (
          <Suspense key="traditional-business" fallback={<LoadingView message={TAB_CONFIG[5].loaderMessage} />}>
            <TraditionalBusinessTab useStandaloneLayout={false} />
          </Suspense>
        );
      case 'service-providers':
        return (
          <Suspense key="service-providers" fallback={<LoadingView message={TAB_CONFIG[6].loaderMessage} />}>
            <ServiceProvidersTab useStandaloneLayout={false} />
          </Suspense>
        );
      case 'system-training':
        return (
          <Suspense key="system-training" fallback={<LoadingView message={TAB_CONFIG[7].loaderMessage} />}>
            <SystemTrainingTab useStandaloneLayout={false} />
          </Suspense>
        );
      default:
        return null;
    }
  }, [activeTab, handleRegisterRefresh, handleChildLayoutStateChange]);

  const layoutContent = (
    <div className="h-full overflow-y-auto" dir="rtl">
      {/* المحتوى مباشرة بدون header إضافي - الـ tabs في التايتل بار */}
      <div className="h-full">
        {renderActiveContent}
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

export default CoursesOperationsPage;
