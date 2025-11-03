import React, { useMemo, useState, useCallback, Suspense, lazy } from 'react';
import Layout from '@/components/Layout';
import AgentShell from '@/components/confirmation/AgentShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useConfirmation } from '@/context/ConfirmationContext';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import ConfirmationStats from '@/components/confirmation/ConfirmationStats';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, Timer, Flag, CircleX, Phone, Coins, Award, RefreshCcw } from 'lucide-react';
import type { ConfirmationOrderAssignment } from '@/types/confirmation';
import { useNavigate } from 'react-router-dom';

// استيراد مكونات OrdersV2
import OrdersHeader from '@/components/orders/OrdersHeader';
import OrdersStatsCards from '@/components/orders/OrdersStatsCards';
import OrdersAdvancedFilters from '@/components/orders/OrdersAdvancedFilters';
import { useOptimizedOrdersData } from '@/hooks/useOptimizedOrdersData';
import { useOrderOperations } from '@/hooks/useOrdersData';
import { useConfirmationAssignments } from '@/hooks/useConfirmationAssignments';

// استيراد ResponsiveOrdersTable بشكل lazy
const ResponsiveOrdersTable = lazy(() => import('@/components/orders/ResponsiveOrdersTable'));

// مكون Loading
const Loading = () => (
  <div className="p-4">
    <div className="h-8 w-40 bg-muted/40 rounded-md mb-4" />
    <div className="rounded-xl border border-border/30 shadow-sm overflow-hidden">
      <div className="h-[56px] bg-muted/20" />
      <div className="divide-y divide-border/20">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-background" />
        ))}
      </div>
    </div>
  </div>
);

const ConfirmationAgentWorkspace = () => {
  const { userProfile } = useAuth();
  const { currentOrganization } = useTenant();
  const navigate = useNavigate();
  const {
    agentById,
    assignments,
    payments,
    rewards,
    performanceSnapshots,
    updateAssignment,
    updateAgent,
    refreshAssignments,
    loading,
    missingSchema,
  } = useConfirmation();
  const [activeTab, setActiveTab] = useState<'queue' | 'completed' | 'history' | 'earnings'>('queue');
  const agentId = userProfile?.confirmation_agent_id || null;

  // إعدادات OrdersV2
  const hookOptions = useMemo(() => ({
    pageSize: 20,
    enablePolling: false,
    enableCache: true,
    rpcOptions: {
      includeItems: true,
      includeShared: true,
      includeCounts: true,
      fetchAllOnce: false,
    },
  }), []);

  const {
    orders,
    loading: ordersLoading,
    error: ordersError,
    hasMore,
    totalCount,
    currentPage,
    orderCounts,
    orderStats,
    sharedData,
    metadata,
    filters,
    loadMore,
    applyFilters,
    goToPage,
    updateOrderLocally,
    refresh,
    pageSize,
  } = useOptimizedOrdersData(hookOptions);

  // جلب التوزيعات للطلبات
  const orderIds = useMemo(() => orders.map(order => order.id), [orders]);
  const {
    assignmentsByOrderId,
    agentById: confirmationAgentsById,
    loading: confirmationAssignmentsLoading,
    missingSchema: confirmationAssignmentsMissing,
  } = useConfirmationAssignments(orderIds);

  // إثراء الطلبات بمعلومات التوزيع
  const enrichedOrders = useMemo(() => {
    if (!orders.length) return orders;
    return orders.map(order => {
      const assignment = assignmentsByOrderId[order.id];
      const agent = assignment?.agent_id ? confirmationAgentsById[assignment.agent_id] : null;
      return {
        ...order,
        confirmation_assignment: assignment || null,
        confirmation_agent: agent || null,
      };
    });
  }, [orders, assignmentsByOrderId, confirmationAgentsById]);

  // استخدام useOrderOperations
  const { updateOrderStatus } = useOrderOperations(updateOrderLocally);

  // دالة تحديث حالة الطلب
  const handleUpdateStatus = useCallback(async (orderId: string, newStatus: string) => {
    try {
      const result = await updateOrderStatus(orderId, newStatus);
      
      if (!result.success) {
        toast.error(result.error || "فشل في تحديث حالة الطلب");
      }
    } catch (error) {
      toast.error("حدث خطأ أثناء محاولة تحديث حالة الطلب");
    }
  }, [updateOrderStatus]);

  // دالة تحديث تأكيد الاتصال
  const handleUpdateCallConfirmation = useCallback(async (orderId: string, statusId: number, notes?: string) => {
    // يمكن إضافة منطق تحديث تأكيد الاتصال هنا
    console.log('تحديث تأكيد الاتصال:', { orderId, statusId, notes });
  }, []);

  // دالة إرسال لشركة التوصيل
  const handleSendToProvider = useCallback(async (orderId: string, providerCode: string) => {
    // يمكن إضافة منطق إرسال لشركة التوصيل هنا
    console.log('إرسال لشركة التوصيل:', { orderId, providerCode });
  }, []);

  // إعدادات الأعمدة المرئية
  const [visibleColumns] = useState<string[]>([
    'checkbox', 'expand', 'id', 'customer_name', 'customer_contact',
    'total', 'status', 'call_confirmation', 'shipping_provider', 'actions'
  ]);

  // إعدادات الصفحات
  const totalPages = Math.ceil((totalCount || 0) / (pageSize || 20));
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  const handlePageChange = useCallback((newPage: number) => {
    goToPage(newPage);
  }, [goToPage]);

  // console.log('🏢 [ConfirmationAgentWorkspace] بيانات المستخدم والموظف:', {
  //   userProfile: userProfile ? {
  //     id: userProfile.id,
  //     name: userProfile.full_name,
  //     confirmation_agent_id: userProfile.confirmation_agent_id
  //   } : null,
  //   agentId,
  //   totalAgents: Object.keys(agentById).length,
  //   agents: Object.values(agentById).map(a => ({ id: a.id, name: a.full_name, status: a.status }))
  // });

  const agent = agentId ? agentById[agentId] : null;
  
  // console.log('👤 [ConfirmationAgentWorkspace] بيانات الموظف المحدد:', {
  //   agentId,
  //   agent: agent ? {
  //     id: agent.id,
  //     name: agent.full_name,
  //     status: agent.status,
  //     email: agent.email
  //   } : null
  // });

  const queueAssignments = useMemo(() => {
    if (!agentId) return [];
    
    return assignments
      .filter((assignment) => assignment.agent_id === agentId && (assignment.status === 'assigned' || assignment.status === 'in_progress'))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [assignments, agentId]);

  const completedAssignments = useMemo(() => {
    if (!agentId) return [];
    
    return assignments
      .filter((assignment) => assignment.agent_id === agentId && (assignment.status === 'confirmed' || assignment.status === 'skipped'))
      .sort((a, b) => new Date(a.updated_at || a.created_at).getTime() - new Date(b.updated_at || b.created_at).getTime());
  }, [assignments, agentId]);

  const recentSnapshots = useMemo(() => {
    if (!agentId) return [];
    return performanceSnapshots.filter((snapshot) => snapshot.agent_id === agentId).slice(0, 5);
  }, [performanceSnapshots, agentId]);

  const myPayments = useMemo(() => {
    if (!agentId) return [];
    return payments
      .filter((payment) => payment.agent_id === agentId)
      .sort((a, b) => new Date(b.period_start).getTime() - new Date(a.period_start).getTime())
      .slice(0, 6);
  }, [payments, agentId]);

  const myRewards = useMemo(() => {
    if (!agentId) return [];
    return rewards
      .filter((reward) => reward.agent_id === agentId)
      .sort((a, b) => new Date(b.awarded_at).getTime() - new Date(a.awarded_at).getTime())
      .slice(0, 6);
  }, [rewards, agentId]);

  const confirmedCount = useMemo(() => {
    if (!agentId) return 0;
    return recentSnapshots.reduce((acc, snapshot) => acc + snapshot.total_confirmed, 0);
  }, [recentSnapshots, agentId]);

  const stats = useMemo(() => {
    return [
      {
        id: 'queue',
        label: 'طلبيات في الانتظار',
        value: queueAssignments.length.toString(),
        subtitle: 'الأولوية القصوى حالياً',
        icon: <Timer className="w-4 h-4" />,
        accent: 'amber' as const,
      },
      {
        id: 'confirmed',
        label: 'تم التأكيد',
        value: confirmedCount.toString(),
        subtitle: 'آخر ٧ أيام',
        icon: <CheckCircle2 className="w-4 h-4" />,
        accent: 'green' as const,
      },
      {
        id: 'earnings',
        label: 'مكافآت معلقة',
        value: `${myRewards.reduce((acc, reward) => acc + (reward.reward_value || 0), 0).toLocaleString('ar-DZ')} د.ج`,
        subtitle: `${myRewards.length} مكافأة في الانتظار`,
        icon: <Coins className="w-4 h-4" />,
        accent: 'purple' as const,
      },
      {
        id: 'payments',
        label: 'آخر دفعة',
        value:
          myPayments[0]?.amount != null
            ? `${myPayments[0].amount.toLocaleString('ar-DZ')} د.ج`
            : '—',
        subtitle: myPayments[0]?.status ? statusLabel(myPayments[0].status) : 'لا توجد دفعات',
        icon: <Award className="w-4 h-4" />,
        accent: 'blue' as const,
      },
    ];
  }, [queueAssignments, confirmedCount, myRewards, myPayments]);

  if (missingSchema) {
    return (
      <div className="max-w-lg mx-auto mt-20">
        <Alert>
          <AlertTitle>نظام التأكيد غير مهيأ</AlertTitle>
          <AlertDescription>
            قم بإبلاغ المدير لتفعيل الجداول الجديدة عبر الملف <code className="font-mono text-xs">supabase/confirmation_system.sql</code> قبل استخدام مساحة العمل.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!agentId || !agent) {
    return (
      <div className="max-w-lg mx-auto mt-20">
        <Alert>
          <AlertTitle>ليس لديك صلاحية الوصول</AlertTitle>
          <AlertDescription>لم يتم ربط حسابك بحساب موظف تأكيد بعد. يرجى التواصل مع مدير النظام.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleConfirm = async (assignment: ConfirmationOrderAssignment) => {
    const result = await updateAssignment(assignment.id, {
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
    });
    if (result) {
      toast.success('تم تأكيد الطلبية بنجاح');
      refreshAssignments([assignment.order_id]);
    }
  };

  const handleSkip = async (assignment: ConfirmationOrderAssignment) => {
    const result = await updateAssignment(assignment.id, {
      status: 'skipped',
      metadata: { reason: 'skipped_by_agent' },
    });
    if (result) {
      toast.info('تم تخطي الطلبية وسيتم إعادة توزيعها');
      refreshAssignments([assignment.order_id]);
    }
  };

  const toggleAvailability = async () => {
    const nextStatus = agent.status === 'active' ? 'paused' : 'active';
    await updateAgent(agent.id, { status: nextStatus });
    toast.success(`تم تحديث حالتك إلى ${nextStatus === 'active' ? 'متاح' : 'متوقف مؤقتاً'}`);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* رأس الصفحة */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">مساحة عمل الموظف</h1>
            <p className="text-muted-foreground">
              {agent ? `مرحباً ${agent.full_name}` : 'جاري تحميل البيانات...'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant={agent?.status === 'active' ? 'default' : 'outline'} onClick={toggleAvailability}>
              {agent?.status === 'active' ? 'إيقاف مؤقت' : 'أنا متاح الآن'}
            </Button>
            <Button onClick={() => refreshAssignments()} variant="outline" size="sm">
              <RefreshCcw className="h-4 w-4 mr-2" />
              تحديث
            </Button>
          </div>
        </div>

        {/* التبويبات */}
        <div className="flex space-x-1 bg-muted p-1 rounded-lg">
          <Button
            variant={activeTab === 'queue' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('queue')}
            className="flex-1"
          >
            <Timer className="h-4 w-4 mr-2" />
            طابور الطلبات ({queueAssignments.length})
          </Button>
          <Button
            variant={activeTab === 'completed' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('completed')}
            className="flex-1"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            المكتملة ({completedAssignments.length})
          </Button>
          <Button
            variant={activeTab === 'history' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('history')}
            className="flex-1"
          >
            <Flag className="h-4 w-4 mr-2" />
            التاريخ
          </Button>
          <Button
            variant={activeTab === 'earnings' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('earnings')}
            className="flex-1"
          >
            <Coins className="h-4 w-4 mr-2" />
            الأرباح
          </Button>
        </div>

        {/* الإحصائيات */}
        <ConfirmationStats stats={stats} isLoading={loading} />

        {/* محتوى التبويبات */}
        {activeTab === 'queue' && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                جاري تحميل الطلبات...
              </div>
            ) : queueAssignments.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CircleX className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">لا توجد طلبات في الطابور</h3>
                  <p className="text-muted-foreground text-center">
                    لا توجد طلبات مكلفة لك حالياً. سيتم إشعارك عند توفر طلبات جديدة.
                  </p>
                </CardContent>
              </Card>
            ) : (
              /* جدول الطلبات الكامل بنفس تصميم OrdersV2 */
              <div className="bg-card border border-border/20 rounded-lg overflow-hidden">
                <Suspense fallback={<Loading />}>
                  <ResponsiveOrdersTable
                    orders={enrichedOrders.filter(order => {
                      // تصفية الطلبات المكلفة للموظف الحالي فقط
                      const assignment = order.confirmation_assignment;
                      return assignment && assignment.agent_id === agentId && 
                             (assignment.status === 'assigned' || assignment.status === 'in_progress');
                    })}
                    loading={ordersLoading || confirmationAssignmentsLoading}
                    onUpdateStatus={handleUpdateStatus}
                    onUpdateCallConfirmation={handleUpdateCallConfirmation}
                    onSendToProvider={handleSendToProvider}
                    hasUpdatePermission={true}
                    hasCancelPermission={true}
                    visibleColumns={[
                      'checkbox', 'expand', 'id', 'customer_name', 'customer_contact',
                      'total', 'status', 'call_confirmation', 'shipping_provider', 'actions'
                    ]}
                    currentUserId={userProfile?.id}
                    currentPage={currentPage}
                    totalItems={queueAssignments.length}
                    pageSize={pageSize || 20}
                    hasNextPage={hasNextPage}
                    hasPreviousPage={hasPreviousPage}
                    onPageChange={handlePageChange}
                    hasMoreOrders={hasMore}
                    shippingProviders={sharedData?.shippingProviders || []}
                    callConfirmationStatuses={sharedData?.callConfirmationStatuses || []}
                    onSearchTermChange={(q) => applyFilters({ searchTerm: q })}
                    autoLoadMoreOnScroll={false}
                  />
                </Suspense>
              </div>
            )}
          </div>
        )}

        {activeTab === 'completed' && (
          <div className="space-y-4">
            {completedAssignments.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">لا توجد طلبات مكتملة</h3>
                  <p className="text-muted-foreground text-center">
                    لم تكمل أي طلبات بعد. ابدأ بالعمل على الطلبات في طابورك.
                  </p>
                </CardContent>
              </Card>
            ) : (
              /* جدول الطلبات المكتملة بنفس تصميم OrdersV2 */
              <div className="bg-card border border-border/20 rounded-lg overflow-hidden">
                <Suspense fallback={<Loading />}>
                  <ResponsiveOrdersTable
                    orders={enrichedOrders.filter(order => {
                      // تصفية الطلبات المكتملة للموظف الحالي فقط
                      const assignment = order.confirmation_assignment;
                      return assignment && assignment.agent_id === agentId && 
                             (assignment.status === 'confirmed' || assignment.status === 'skipped');
                    })}
                    loading={ordersLoading || confirmationAssignmentsLoading}
                    onUpdateStatus={handleUpdateStatus}
                    onUpdateCallConfirmation={handleUpdateCallConfirmation}
                    onSendToProvider={handleSendToProvider}
                    hasUpdatePermission={true}
                    hasCancelPermission={true}
                    visibleColumns={[
                      'checkbox', 'expand', 'id', 'customer_name', 'customer_contact',
                      'total', 'status', 'call_confirmation', 'shipping_provider', 'actions'
                    ]}
                    currentUserId={userProfile?.id}
                    currentPage={currentPage}
                    totalItems={completedAssignments.length}
                    pageSize={pageSize || 20}
                    hasNextPage={hasNextPage}
                    hasPreviousPage={hasPreviousPage}
                    onPageChange={handlePageChange}
                    hasMoreOrders={hasMore}
                    shippingProviders={sharedData?.shippingProviders || []}
                    callConfirmationStatuses={sharedData?.callConfirmationStatuses || []}
                    onSearchTermChange={(q) => applyFilters({ searchTerm: q })}
                    autoLoadMoreOnScroll={false}
                  />
                </Suspense>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border border-border/40">
              <CardHeader>
                <CardTitle>آخر الإنجازات</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentSnapshots.length === 0 ? (
                  <div className="text-sm text-muted-foreground">لا توجد بيانات أداء بعد.</div>
                ) : (
                  recentSnapshots.map((snapshot) => (
                    <div key={snapshot.snapshot_date} className="border border-border/30 rounded-lg p-3">
                      <div className="text-sm font-medium text-foreground">{snapshot.snapshot_date}</div>
                      <div className="text-xs text-muted-foreground">
                        مؤكد: {snapshot.total_confirmed} | مكالمات ناجحة: {snapshot.successful_contacts} | التحويل{' '}
                        {(snapshot.conversion_rate * 100).toFixed(1)}%
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
            <Card className="border border-border/40">
              <CardHeader>
                <CardTitle>مكافآتي</CardTitle>
              </CardHeader>
              <CardContent>
                {myRewards.length === 0 ? (
                  <div className="text-sm text-muted-foreground">لا توجد مكافآت حتى الآن.</div>
                ) : (
                  <ScrollArea className="h-60">
                    <div className="space-y-3">
                      {myRewards.map((reward) => (
                        <div key={reward.id} className="border border-border/30 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-foreground">{reward.reward_type}</span>
                            <Badge variant="outline">{reward.reward_value?.toLocaleString('ar-DZ')} د.ج</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">{reward.awarded_at}</div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'earnings' && (
          <Card className="border border-border/40">
            <CardHeader>
              <CardTitle>مدفوعاتي</CardTitle>
            </CardHeader>
            <CardContent>
              {myPayments.length === 0 ? (
                <div className="text-sm text-muted-foreground">لم يتم تسجيل أي دفعات حتى الآن.</div>
              ) : (
                <div className="space-y-3">
                  {myPayments.map((payment) => (
                    <div key={payment.id} className="border border-border/30 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {payment.payment_type === 'salary' && 'راتب شهري'}
                          {payment.payment_type === 'per_order' && 'أجر لكل طلب'}
                          {payment.payment_type === 'bonus' && 'مكافأة'}
                          {payment.payment_type === 'adjustment' && 'تسوية'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          الفترة: {payment.period_start} - {payment.period_end}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{statusLabel(payment.status)}</Badge>
                        <span className="text-sm font-semibold text-foreground">
                          {payment.amount.toLocaleString('ar-DZ')} د.ج
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

const statusLabel = (status: ConfirmationOrderAssignment['status'] | string) => {
  switch (status) {
    case 'confirmed':
      return 'تم التأكيد';
    case 'assigned':
      return 'بانتظار المعالجة';
    case 'in_progress':
      return 'جار التأكيد';
    case 'reassigned':
      return 'تم إعادة التوزيع';
    case 'skipped':
      return 'تم التخطي';
    case 'pending':
      return 'قيد المراجعة';
    case 'approved':
      return 'مقبول';
    case 'paid':
      return 'مدفوع';
    case 'cancelled':
      return 'ملغى';
    default:
      return status;
  }
};

export default ConfirmationAgentWorkspace;
