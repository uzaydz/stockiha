import { useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RefreshCcw, Users, Workflow, BarChart3, Settings, Wallet, ClipboardList } from 'lucide-react';
import { useConfirmation } from '@/context/ConfirmationContext';
import { useConfirmationAgents } from '@/hooks/useConfirmationAgents';
import ConfirmationStats from '@/components/confirmation/ConfirmationStats';
import ConfirmationAgentManager from '@/components/confirmation/ConfirmationAgentManager';
import ConfirmationDistributionManager from '@/components/confirmation/ConfirmationDistributionManager';
import ConfirmationCompensationManager from '@/components/confirmation/ConfirmationCompensationManager';
import ConfirmationAnalyticsDashboard from '@/components/confirmation/ConfirmationAnalyticsDashboard';
import ConfirmationSettingsPanel from '@/components/confirmation/ConfirmationSettingsPanel';

const ConfirmationCenter = () => {
  const { refreshAll, assignments, rewards, payments, performanceSnapshots, loading, missingSchema } = useConfirmation();
  const { totals: agentTotals } = useConfirmationAgents();
  const [activeTab, setActiveTab] = useState('overview');

  const overviewStats = useMemo(() => {
    const totalAssignments = assignments.length;
    const pendingAssignments = assignments.filter((assignment) => assignment.status === 'assigned' || assignment.status === 'in_progress').length;
    const confirmedAssignments = assignments.filter((assignment) => assignment.status === 'confirmed').length;
    const totalBonuses = rewards.reduce((acc, reward) => acc + (reward.reward_value || 0), 0);
    return [
      {
        id: 'agents',
        label: 'فريق التأكيد',
        value: agentTotals.total.toString(),
        subtitle: 'عدد الموظفين المتاحين',
        icon: <Users className="w-4 h-4" />,
        accent: 'blue' as const,
      },
      {
        id: 'queue',
        label: 'طلبيات في الانتظار',
        value: pendingAssignments.toString(),
        subtitle: `${totalAssignments} طلب قيد المعالجة`,
        icon: <ClipboardList className="w-4 h-4" />,
        accent: 'amber' as const,
      },
      {
        id: 'confirmed',
        label: 'طلبيات مؤكدة',
        value: confirmedAssignments.toString(),
        subtitle: 'خلال آخر 48 ساعة',
        icon: <Workflow className="w-4 h-4" />,
        accent: 'green' as const,
      },
      {
        id: 'rewards',
        label: 'مكافآت ممنوحة',
        value: `${totalBonuses.toLocaleString('ar-DZ')} د.ج`,
        subtitle: `${rewards.length} مكافأة نشطة`,
        icon: <Wallet className="w-4 h-4" />,
        accent: 'purple' as const,
      },
    ];
  }, [agentTotals, assignments, rewards]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">مركز تأكيد الطلبات</h1>
            <p className="text-sm text-muted-foreground">منصة شاملة لإدارة موظفي التأكيد، التقسيم الذكي، والتحليلات العملية.</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => refreshAll()}>
            <RefreshCcw className="w-4 h-4" />
            تحديث البيانات
          </Button>
        </div>

        {missingSchema && (
          <Alert>
            <AlertTitle>التهيئة مطلوبة</AlertTitle>
            <AlertDescription>
              قم بتشغيل الملف <code className="font-mono text-xs">supabase/confirmation_system.sql</code> ثم أعد تحميل الصفحة لتفعيل جميع وظائف
              النظام.
            </AlertDescription>
          </Alert>
        )}

        <ConfirmationStats stats={overviewStats} isLoading={loading} />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              نظرة عامة
            </TabsTrigger>
            <TabsTrigger value="agents" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              فريق التأكيد
            </TabsTrigger>
            <TabsTrigger value="distribution" className="flex items-center gap-2">
              <Workflow className="w-4 h-4" />
              توزيع الطلبات
            </TabsTrigger>
            <TabsTrigger value="compensation" className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              التعويضات
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              التحليلات
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              الإعدادات
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-6">
            <ConfirmationAnalyticsDashboard />
          </TabsContent>

          <TabsContent value="agents" className="mt-6">
            <ConfirmationAgentManager />
          </TabsContent>

          <TabsContent value="distribution" className="mt-6">
            <ConfirmationDistributionManager />
          </TabsContent>

          <TabsContent value="compensation" className="mt-6">
            <ConfirmationCompensationManager />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <ConfirmationAnalyticsDashboard />
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <ConfirmationSettingsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default ConfirmationCenter;
