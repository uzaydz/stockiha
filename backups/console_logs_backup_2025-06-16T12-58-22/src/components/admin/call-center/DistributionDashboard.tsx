import React, { useState, useEffect } from 'react';
import {
  Activity,
  Users,
  Phone,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  MoreHorizontal,
  Play,
  Pause,
  RotateCcw,
  Target,
  Zap,
  UserCheck,
  PhoneCall,
  Timer,
  Star,
  BarChart3,
  PieChart,
  Filter,
  Calendar,
  Download
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCallCenterDistribution } from '@/hooks/useCallCenterDistribution';
import { toast } from 'sonner';

const DistributionDashboard: React.FC = () => {
  const {
    rules,
    assignments,
    agentWorkloads,
    settings,
    loading,
    saving,
    error,
    autoAssignOrder,
    updateAssignmentStatus,
    transferAssignment,
    refresh
  } = useCallCenterDistribution();

  const [activeFilter, setActiveFilter] = useState('all');
  const [timeRange, setTimeRange] = useState('today');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // تحديث تلقائي كل 30 ثانية
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refresh();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, refresh]);

  // إحصائيات سريعة
  const dashboardStats = React.useMemo(() => {
    const activeAssignments = assignments.filter(a => a.status === 'assigned' || a.status === 'in_progress');
    const completedToday = assignments.filter(a => 
      a.status === 'completed' && 
      new Date(a.completion_time || '').toDateString() === new Date().toDateString()
    );
    const totalCalls = agentWorkloads.reduce((sum, w) => sum + w.total_calls, 0);
    const successfulCalls = agentWorkloads.reduce((sum, w) => sum + w.successful_calls, 0);
    const avgSatisfaction = agentWorkloads.length > 0 
      ? agentWorkloads.reduce((sum, w) => sum + w.customer_satisfaction_avg, 0) / agentWorkloads.length 
      : 0;

    return {
      activeAssignments: activeAssignments.length,
      completedToday: completedToday.length,
      successRate: totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0,
      avgSatisfaction: avgSatisfaction,
      activeAgents: agentWorkloads.filter(w => w.is_available).length,
      pendingOrders: activeAssignments.filter(a => a.status === 'assigned').length
    };
  }, [assignments, agentWorkloads]);

  const handleAutoAssign = async (orderId: string) => {
    const success = await autoAssignOrder(orderId);
    if (success) {
      toast.success('تم التوزيع التلقائي بنجاح');
    }
  };

  const handleStatusUpdate = async (assignmentId: string, status: any) => {
    const success = await updateAssignmentStatus(assignmentId, status);
    if (success) {
      toast.success('تم تحديث الحالة بنجاح');
    }
  };

  const StatCard = ({ title, value, icon: Icon, trend, trendValue, color = "text-gray-600" }: any) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {trend && (
              <p className={`text-xs flex items-center mt-1 ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {trend === 'up' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {trendValue}
              </p>
            )}
          </div>
          <Icon className={`h-8 w-8 ${color}`} />
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* العنوان والتحكم */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">لوحة توزيع الطلبات</h1>
          <p className="text-muted-foreground">
            مراقبة وإدارة توزيع الطلبات على مركز الاتصالات
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">اليوم</SelectItem>
              <SelectItem value="week">هذا الأسبوع</SelectItem>
              <SelectItem value="month">هذا الشهر</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-green-50' : ''}
          >
            {autoRefresh ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            تحديث تلقائي
          </Button>
          
          <Button variant="outline" size="sm" onClick={refresh} disabled={saving}>
            <RotateCcw className={`h-4 w-4 mr-2 ${saving ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
        </div>
      </div>

      {/* الإحصائيات السريعة */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="المهام النشطة"
          value={dashboardStats.activeAssignments}
          icon={Activity}
          color="text-blue-600"
          trend="up"
          trendValue="+12% من أمس"
        />
        <StatCard
          title="مكتملة اليوم"
          value={dashboardStats.completedToday}
          icon={CheckCircle}
          color="text-green-600"
          trend="up"
          trendValue="+8% من أمس"
        />
        <StatCard
          title="معدل النجاح"
          value={`${dashboardStats.successRate.toFixed(1)}%`}
          icon={Target}
          color="text-purple-600"
          trend={dashboardStats.successRate > 80 ? "up" : "down"}
          trendValue={`${dashboardStats.successRate > 80 ? '+' : '-'}3%`}
        />
        <StatCard
          title="رضا العملاء"
          value={`${dashboardStats.avgSatisfaction.toFixed(1)}/5`}
          icon={Star}
          color="text-yellow-600"
          trend="up"
          trendValue="+0.2 من أمس"
        />
      </div>

      {/* التبويبات الرئيسية */}
      <Tabs defaultValue="assignments" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="assignments">المهام النشطة</TabsTrigger>
          <TabsTrigger value="agents">أداء الوكلاء</TabsTrigger>
          <TabsTrigger value="analytics">التحليلات</TabsTrigger>
          <TabsTrigger value="rules">قواعد التوزيع</TabsTrigger>
        </TabsList>

        {/* المهام النشطة */}
        <TabsContent value="assignments" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>المهام النشطة</CardTitle>
                  <CardDescription>
                    جميع المهام المخصصة للوكلاء حالياً
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Select value={activeFilter} onValueChange={setActiveFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      <SelectItem value="assigned">مخصصة</SelectItem>
                      <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                      <SelectItem value="pending">في الانتظار</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    تصدير
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الطلب</TableHead>
                    <TableHead>العميل</TableHead>
                    <TableHead>الوكيل</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الأولوية</TableHead>
                    <TableHead>المحاولات</TableHead>
                    <TableHead>التالي</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments
                    .filter(a => activeFilter === 'all' || a.status === activeFilter)
                    .map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell className="font-medium">
                          #{assignment.order_id.slice(-6)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">اسم العميل</p>
                            <p className="text-sm text-muted-foreground">رقم الهاتف</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">اسم الوكيل</p>
                            <p className="text-sm text-muted-foreground">agent@example.com</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            assignment.status === 'completed' ? 'default' :
                            assignment.status === 'in_progress' ? 'secondary' :
                            assignment.status === 'assigned' ? 'outline' : 'destructive'
                          }>
                            {assignment.status === 'assigned' && 'مخصصة'}
                            {assignment.status === 'in_progress' && 'قيد التنفيذ'}
                            {assignment.status === 'completed' && 'مكتملة'}
                            {assignment.status === 'cancelled' && 'ملغية'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            assignment.priority_level >= 4 ? 'destructive' :
                            assignment.priority_level >= 3 ? 'default' : 'secondary'
                          }>
                            {assignment.priority_level >= 4 ? 'عالية' :
                             assignment.priority_level >= 3 ? 'متوسطة' : 'منخفضة'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <span className="text-sm">
                              {assignment.call_attempts}/{assignment.max_call_attempts}
                            </span>
                            <Progress 
                              value={(assignment.call_attempts / assignment.max_call_attempts) * 100}
                              className="w-16 ml-2"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          {assignment.next_call_scheduled ? (
                            <div className="text-sm">
                              <p>{new Date(assignment.next_call_scheduled).toLocaleDateString('ar-SA')}</p>
                              <p className="text-muted-foreground">
                                {new Date(assignment.next_call_scheduled).toLocaleTimeString('ar-SA', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">غير محدد</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {assignment.status === 'assigned' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusUpdate(assignment.id, 'in_progress')}
                              >
                                <Play className="h-3 w-3 mr-1" />
                                بدء
                              </Button>
                            )}
                            {assignment.status === 'in_progress' && (
                              <Button
                                size="sm"
                                onClick={() => handleStatusUpdate(assignment.id, 'completed')}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                إنهاء
                              </Button>
                            )}
                            <Button size="sm" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              
              {assignments.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>لا توجد مهام نشطة حالياً</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* أداء الوكلاء */}
        <TabsContent value="agents" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* إحصائيات الوكلاء */}
            <Card>
              <CardHeader>
                <CardTitle>أداء الوكلاء اليوم</CardTitle>
                <CardDescription>إحصائيات الأداء لجميع الوكلاء</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {agentWorkloads.map((workload) => (
                    <div key={workload.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${workload.is_available ? 'bg-green-500' : 'bg-gray-400'}`} />
                        <div>
                          <p className="font-medium">اسم الوكيل</p>
                          <p className="text-sm text-muted-foreground">
                            {workload.completed_orders} مكتملة من {workload.assigned_orders}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {workload.completion_rate.toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          معدل الإنجاز
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* الوكلاء المتاحون */}
            <Card>
              <CardHeader>
                <CardTitle>الوكلاء المتاحون</CardTitle>
                <CardDescription>الوكلاء الجاهزون لاستقبال مهام جديدة</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {agentWorkloads
                    .filter(w => w.is_available && w.pending_orders < 5)
                    .map((workload) => (
                      <div key={workload.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <UserCheck className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="font-medium">اسم الوكيل</p>
                            <p className="text-sm text-muted-foreground">
                              {workload.pending_orders} مهام قيد التنفيذ
                            </p>
                          </div>
                        </div>
                        <Button size="sm" variant="outline">
                          تخصيص مهمة
                        </Button>
                      </div>
                    ))}
                  
                  {agentWorkloads.filter(w => w.is_available).length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>لا يوجد وكلاء متاحون حالياً</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* التحليلات */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* مخطط التوزيع */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="h-5 w-5 mr-2" />
                  توزيع المهام حسب الحالة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { label: 'مخصصة', count: dashboardStats.pendingOrders, color: 'bg-blue-500' },
                    { label: 'قيد التنفيذ', count: dashboardStats.activeAssignments - dashboardStats.pendingOrders, color: 'bg-yellow-500' },
                    { label: 'مكتملة', count: dashboardStats.completedToday, color: 'bg-green-500' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${item.color}`} />
                        <span className="text-sm">{item.label}</span>
                      </div>
                      <span className="font-medium">{item.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* الاتجاهات */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  اتجاهات الأداء
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">معدل النجاح الإجمالي</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={dashboardStats.successRate} className="w-20" />
                      <span className="text-sm font-medium">
                        {dashboardStats.successRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">متوسط وقت الاستجابة</span>
                    <span className="text-sm font-medium">8.5 دقيقة</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">رضا العملاء</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={dashboardStats.avgSatisfaction * 20} className="w-20" />
                      <span className="text-sm font-medium">
                        {dashboardStats.avgSatisfaction.toFixed(1)}/5
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* قواعد التوزيع */}
        <TabsContent value="rules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>قواعد التوزيع النشطة</CardTitle>
              <CardDescription>
                القواعد المستخدمة حالياً في توزيع الطلبات
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rules.filter(r => r.is_active).map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Zap className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium">{rule.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {rule.description || 'لا يوجد وصف'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Badge variant="outline">أولوية {rule.priority_order}</Badge>
                      <Badge variant="secondary">
                        {rule.usage_count} استخدام
                      </Badge>
                      <Badge variant={rule.success_rate > 80 ? "default" : "secondary"}>
                        {rule.success_rate.toFixed(1)}% نجاح
                      </Badge>
                    </div>
                  </div>
                ))}
                
                {rules.filter(r => r.is_active).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد قواعد توزيع نشطة</p>
                    <p className="text-sm">قم بتفعيل قواعد التوزيع من إعدادات النظام</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* إشعارات سريعة */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-800">مهام تحتاج متابعة</p>
                <p className="text-sm text-blue-600">
                  {assignments.filter(a => a.call_attempts >= 2).length} مهام تحتاج إعادة محاولة
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800">تنبيهات النظام</p>
                <p className="text-sm text-yellow-600">
                  {agentWorkloads.filter(w => !w.is_available).length} وكلاء غير متاحين
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">الأداء ممتاز</p>
                <p className="text-sm text-green-600">
                  معدل النجاح أعلى من المتوقع بـ 15%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DistributionDashboard; 