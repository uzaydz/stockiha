/**
 * 👥 HR Operations Center - مركز عمليات الموارد البشرية
 * v4.0 - 2025-12-10
 *
 * مركز شامل لإدارة:
 * - الحضور والانصراف
 * - الإجازات
 * - الرواتب
 * - الأداء
 * - الورديات
 */

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import POSPureLayout from '@/components/pos-layout/POSPureLayout';
import { useTitle } from '@/hooks/useTitle';
import { useTitlebar } from '@/context/TitlebarContext';
import { POSLayoutState, RefreshHandler } from '@/components/pos-layout/types';
import {
  LayoutDashboard,
  Clock,
  CalendarDays,
  Wallet,
  TrendingUp,
  Loader2,
} from 'lucide-react';

// Lazy load HR pages
const HRDashboardTab = React.lazy(() => import('./hr/HRDashboard'));
const AttendanceTab = React.lazy(() => import('./hr/AttendanceManagement'));
const LeaveTab = React.lazy(() => import('./hr/LeaveManagement'));
const PayrollTab = React.lazy(() => import('./hr/PayrollManagement'));
const PerformanceTab = React.lazy(() => import('./hr/PerformanceManagement'));

type TabKey = 'dashboard' | 'attendance' | 'leave' | 'payroll' | 'performance';

interface TabDefinition {
  id: TabKey;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  loaderMessage: string;
}

const TAB_CONFIG: TabDefinition[] = [
  {
    id: 'dashboard',
    title: 'نظرة عامة',
    description: 'لوحة تحكم شاملة لإدارة الموارد البشرية مع إحصائيات وتقارير فورية.',
    icon: LayoutDashboard,
    loaderMessage: 'جاري تحميل لوحة التحكم...'
  },
  {
    id: 'attendance',
    title: 'الحضور والانصراف',
    description: 'تسجيل ومتابعة حضور وانصراف الموظفين مع إحصائيات يومية وشهرية.',
    icon: Clock,
    loaderMessage: 'جاري تحميل بيانات الحضور...'
  },
  {
    id: 'leave',
    title: 'الإجازات',
    description: 'إدارة طلبات الإجازات، أرصدة الموظفين، والموافقات.',
    icon: CalendarDays,
    loaderMessage: 'جاري تحميل بيانات الإجازات...'
  },
  {
    id: 'payroll',
    title: 'الرواتب',
    description: 'إدارة هياكل الرواتب، المسيرات الشهرية، والسلف.',
    icon: Wallet,
    loaderMessage: 'جاري تحميل بيانات الرواتب...'
  },
  {
    id: 'performance',
    title: 'الأداء',
    description: 'تقييم أداء الموظفين، الأهداف، والتنبيهات.',
    icon: TrendingUp,
    loaderMessage: 'جاري تحميل بيانات الأداء...'
  },
];

const LoadingView: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-muted-foreground">
    <Loader2 className="h-6 w-6 animate-spin" />
    <span className="text-sm">{message}</span>
  </div>
);

const HROperationsPage: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams<{ tab?: string }>();
  const { setTabs, setActiveTab: setTitlebarActiveTab, setShowTabs, clearTabs } = useTitlebar();

  const resolvedTab = useMemo<TabKey>(() => {
    const incoming = params.tab as TabKey | undefined;
    return TAB_CONFIG.some((tab) => tab.id === incoming) ? (incoming as TabKey) : TAB_CONFIG[0].id;
  }, [params.tab]);

  useEffect(() => {
    if (!params.tab || !TAB_CONFIG.some((tab) => tab.id === params.tab)) {
      navigate(`/dashboard/hr-operations/${resolvedTab}`, { replace: true });
    }
  }, [params.tab, resolvedTab, navigate]);

  const [layoutState, setLayoutState] = useState<POSLayoutState>({
    connectionStatus: 'connected',
    isRefreshing: false,
  });
  const [refreshHandler, setRefreshHandler] = useState<RefreshHandler>(null);

  const activeTab = resolvedTab;
  const activeTabMeta = TAB_CONFIG.find((tab) => tab.id === activeTab) ?? TAB_CONFIG[0];

  useTitle(`${activeTabMeta.title} - الموارد البشرية`);

  const handleTabChange = useCallback(
    (value: string) => {
      const target = TAB_CONFIG.find((tab) => tab.id === (value as TabKey)) ?? TAB_CONFIG[0];
      if (target.id !== activeTab) {
        navigate(`/dashboard/hr-operations/${target.id}`);
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
    // صفحات HR الحالية لا تتوقع props خاصة بالـ layout
    // يتم تحميلها كما هي داخل الـ wrapper

    switch (activeTab) {
      case 'dashboard':
        return (
          <Suspense key="dashboard" fallback={<LoadingView message={TAB_CONFIG[0].loaderMessage} />}>
            <HRDashboardTab />
          </Suspense>
        );
      case 'attendance':
        return (
          <Suspense key="attendance" fallback={<LoadingView message={TAB_CONFIG[1].loaderMessage} />}>
            <AttendanceTab />
          </Suspense>
        );
      case 'leave':
        return (
          <Suspense key="leave" fallback={<LoadingView message={TAB_CONFIG[2].loaderMessage} />}>
            <LeaveTab />
          </Suspense>
        );
      case 'payroll':
        return (
          <Suspense key="payroll" fallback={<LoadingView message={TAB_CONFIG[3].loaderMessage} />}>
            <PayrollTab />
          </Suspense>
        );
      case 'performance':
        return (
          <Suspense key="performance" fallback={<LoadingView message={TAB_CONFIG[4].loaderMessage} />}>
            <PerformanceTab />
          </Suspense>
        );
      default:
        return null;
    }
  }, [activeTab]);

  const layoutContent = (
    <div className="space-y-6 p-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
            <activeTabMeta.icon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">الموارد البشرية</h1>
            <p className="text-sm text-muted-foreground">
              إدارة شاملة للحضور، الإجازات، الرواتب، والأداء
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-5 gap-2 rounded-xl bg-slate-900/5 p-1 dark:bg-slate-800/30">
          {TAB_CONFIG.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.title}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* Content Area */}
      <div className="rounded-2xl border border-border/50 bg-card shadow-sm">
        <div className="border-b border-border/40 px-6 py-4">
          <div className="flex items-center gap-2">
            <activeTabMeta.icon className="h-5 w-5 text-primary" />
            <span className="font-semibold">{activeTabMeta.title}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{activeTabMeta.description}</p>
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

export default HROperationsPage;
