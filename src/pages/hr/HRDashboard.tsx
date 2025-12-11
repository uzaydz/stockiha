/**
 * 📊 HR Dashboard Page - لوحة تحكم الموارد البشرية الشاملة
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  Clock,
  Calendar,
  DollarSign,
  TrendingUp,
  Search,
  RefreshCw,
  UserCheck,
  UserX,
  AlertTriangle,
  FileText,
  Award,
  Target,
  Building,
  BarChart3,
  PieChart,
  Activity,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  HRDashboardStats,
  HRAlertsBanner,
  HRQuickActions,
  EmployeeProfileCard,
} from '@/components/hr';
import {
  getHRDashboardStats,
  getHRAlerts,
  getTeamOverview,
  searchEmployees,
  getDepartments,
} from '@/lib/api/hr/dashboardService';
import { getDailyAttendanceStats, getWeeklyAttendance } from '@/lib/api/hr/attendanceService';
import type { HRDashboard, HRAlerts, EmployeeProfile } from '@/types/hr/dashboard';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';

export default function HRDashboardPage() {
  const { userProfile } = useAuth();
  const { currentOrganization } = useTenant();
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  const organizationId = currentOrganization?.id || '';
  const isManager = userProfile?.role === 'admin' || userProfile?.role === 'manager';

  // استعلامات البيانات
  const { data: dashboardStats, isLoading: isLoadingStats, refetch: refetchStats } = useQuery({
    queryKey: ['hr-dashboard-stats', organizationId],
    queryFn: () => getHRDashboardStats(organizationId),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 دقائق
  });

  const { data: alerts } = useQuery({
    queryKey: ['hr-alerts', organizationId],
    queryFn: () => getHRAlerts(organizationId),
    enabled: !!organizationId && isManager,
  });

  const { data: teamOverview } = useQuery({
    queryKey: ['team-overview', organizationId, userProfile?.id],
    queryFn: () => getTeamOverview(organizationId, userProfile?.id),
    enabled: !!organizationId && isManager,
  });

  const { data: weeklyAttendance = [] } = useQuery({
    queryKey: ['weekly-attendance', organizationId],
    queryFn: () => getWeeklyAttendance(organizationId),
    enabled: !!organizationId,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments', organizationId],
    queryFn: () => getDepartments(organizationId),
    enabled: !!organizationId,
  });

  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ['employee-search', organizationId, searchQuery, departmentFilter],
    queryFn: () =>
      searchEmployees(organizationId, searchQuery, {
        department: departmentFilter !== 'all' ? departmentFilter : undefined,
      }),
    enabled: !!organizationId && searchQuery.length >= 2,
  });

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'check-in':
        navigate('/hr/attendance');
        break;
      case 'new-leave':
        navigate('/hr/leaves');
        break;
      case 'new-review':
        navigate('/hr/performance');
        break;
      case 'payroll':
        navigate('/hr/payroll');
        break;
    }
  };

  const handleAlertNavigate = (section: string) => {
    switch (section) {
      case 'leaves':
        navigate('/hr/leaves');
        break;
      case 'performance':
        navigate('/hr/performance');
        break;
      case 'payroll':
        navigate('/hr/payroll');
        break;
      case 'employees':
        setSelectedTab('employees');
        break;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building className="h-7 w-7" />
            لوحة تحكم الموارد البشرية
          </h1>
          <p className="text-muted-foreground">
            نظرة شاملة على إدارة الموظفين والعمليات
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetchStats()}>
            <RefreshCw className="h-4 w-4 ml-2" />
            تحديث
          </Button>
        </div>
      </div>

      {/* التنبيهات */}
      {isManager && alerts && (
        <HRAlertsBanner alerts={alerts} onNavigate={handleAlertNavigate} />
      )}

      {/* الإجراءات السريعة */}
      <HRQuickActions onAction={handleQuickAction} />

      {/* التبويبات الرئيسية */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="employees">الموظفون</TabsTrigger>
          <TabsTrigger value="analytics">التحليلات</TabsTrigger>
          <TabsTrigger value="reports">التقارير</TabsTrigger>
        </TabsList>

        {/* نظرة عامة */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          {dashboardStats && (
            <HRDashboardStats data={dashboardStats} isLoading={isLoadingStats} />
          )}

          {/* نظرة عامة على الفريق للمديرين */}
          {isManager && teamOverview && teamOverview.team_size > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  فريقك
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <TeamStatCard
                    label="حجم الفريق"
                    value={teamOverview.team_size}
                    icon={Users}
                    color="blue"
                  />
                  <TeamStatCard
                    label="حاضر اليوم"
                    value={teamOverview.present_today}
                    icon={UserCheck}
                    color="green"
                  />
                  <TeamStatCard
                    label="غائب اليوم"
                    value={teamOverview.absent_today}
                    icon={UserX}
                    color="red"
                  />
                  <TeamStatCard
                    label="طلبات معلقة"
                    value={teamOverview.pending_approvals}
                    icon={Clock}
                    color="orange"
                  />
                </div>

                {/* قائمة أعضاء الفريق */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teamOverview.members.slice(0, 6).map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.avatar_url} />
                        <AvatarFallback>{member.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{member.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {member.job_title}
                        </p>
                      </div>
                      <Badge variant={member.is_active ? 'default' : 'secondary'}>
                        {member.is_active ? 'نشط' : 'غير نشط'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* الحضور الأسبوعي */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                الحضور خلال الأسبوع
              </CardTitle>
            </CardHeader>
            <CardContent>
              <WeeklyAttendanceChart data={weeklyAttendance} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* الموظفون */}
        <TabsContent value="employees" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                دليل الموظفين
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* البحث والفلترة */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="البحث عن موظف..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10"
                  />
                </div>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="القسم" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الأقسام</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.department} value={dept.department}>
                        {dept.department} ({dept.count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* نتائج البحث */}
              {searchQuery.length >= 2 ? (
                isSearching ? (
                  <div className="text-center py-8">جاري البحث...</div>
                ) : searchResults.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    لم يتم العثور على نتائج
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {searchResults.map((employee) => (
                      <EmployeeProfileCard
                        key={employee.id}
                        employee={employee}
                        compact
                      />
                    ))}
                  </div>
                )
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-4" />
                  <p>أدخل اسم الموظف أو البريد الإلكتروني للبحث</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* إحصائيات الأقسام */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                توزيع الموظفين حسب الأقسام
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {departments.map((dept) => (
                  <div
                    key={dept.department}
                    className="p-4 border rounded-lg text-center hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => setDepartmentFilter(dept.department)}
                  >
                    <p className="text-2xl font-bold text-primary">{dept.count}</p>
                    <p className="text-sm text-muted-foreground">{dept.department}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* التحليلات */}
        <TabsContent value="analytics" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* تحليل الحضور */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  تحليل الحضور
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardStats && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <AnalyticCard
                        label="نسبة الحضور اليوم"
                        value={`${dashboardStats.attendance.today.attendance_rate}%`}
                        trend={dashboardStats.attendance.today.attendance_rate > 80 ? 'up' : 'down'}
                      />
                      <AnalyticCard
                        label="المتأخرين اليوم"
                        value={dashboardStats.attendance.today.late.toString()}
                        trend={dashboardStats.attendance.today.late > 5 ? 'down' : 'up'}
                      />
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-medium mb-2">ملخص الأسبوع</h4>
                      <WeeklyAttendanceChart data={weeklyAttendance} compact />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* تحليل الإجازات */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  تحليل الإجازات
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardStats && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <AnalyticCard
                        label="طلبات معلقة"
                        value={dashboardStats.leave.pending_requests.toString()}
                        trend={dashboardStats.leave.pending_requests > 10 ? 'down' : 'up'}
                      />
                      <AnalyticCard
                        label="في إجازة اليوم"
                        value={dashboardStats.leave.employees_on_leave_today.toString()}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                      <div className="text-center">
                        <p className="text-xl font-bold text-green-500">
                          {dashboardStats.leave.approved_this_month}
                        </p>
                        <p className="text-xs text-muted-foreground">موافق عليها هذا الشهر</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-primary">
                          {dashboardStats.leave.total_days_taken}
                        </p>
                        <p className="text-xs text-muted-foreground">إجمالي الأيام</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* تحليل الأداء */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  تحليل الأداء
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardStats && (
                  <div className="space-y-4">
                    <div className="text-center p-6 bg-primary/10 rounded-lg">
                      <p className="text-4xl font-bold text-primary">
                        {dashboardStats.performance.average_score.toFixed(1)}
                      </p>
                      <p className="text-sm text-muted-foreground">متوسط التقييم العام</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-muted/50 rounded">
                        <p className="text-xl font-bold">
                          {dashboardStats.performance.completed_reviews}
                        </p>
                        <p className="text-xs text-muted-foreground">تقييمات مكتملة</p>
                      </div>
                      <div className="text-center p-3 bg-muted/50 rounded">
                        <p className="text-xl font-bold text-orange-500">
                          {dashboardStats.performance.pending_reviews}
                        </p>
                        <p className="text-xs text-muted-foreground">معلقة</p>
                      </div>
                      <div className="text-center p-3 bg-muted/50 rounded">
                        <p className="text-xl font-bold text-green-500">
                          {dashboardStats.performance.completed_goals}
                        </p>
                        <p className="text-xs text-muted-foreground">أهداف مكتملة</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* تحليل الرواتب */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  تحليل الرواتب
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardStats && (
                  <div className="space-y-4">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm">إجمالي الرواتب</span>
                        <span className="font-bold">
                          {formatCurrency(dashboardStats.payroll.total_payroll)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">المصروف</span>
                        <Badge variant="default">{dashboardStats.payroll.paid_count}</Badge>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-sm text-muted-foreground">غير المصروف</span>
                        <Badge variant="secondary">{dashboardStats.payroll.unpaid_count}</Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded text-center">
                        <p className="text-lg font-bold text-green-600">
                          +{formatCurrency(dashboardStats.payroll.total_allowances)}
                        </p>
                        <p className="text-xs text-muted-foreground">البدلات</p>
                      </div>
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded text-center">
                        <p className="text-lg font-bold text-red-600">
                          -{formatCurrency(dashboardStats.payroll.total_deductions)}
                        </p>
                        <p className="text-xs text-muted-foreground">الخصومات</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* التقارير */}
        <TabsContent value="reports" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ReportCard
              title="تقرير الحضور الشهري"
              description="تفاصيل حضور وانصراف جميع الموظفين"
              icon={Clock}
              onClick={() => navigate('/hr/reports/attendance')}
            />
            <ReportCard
              title="تقرير الإجازات"
              description="ملخص طلبات الإجازات وأرصدة الموظفين"
              icon={Calendar}
              onClick={() => navigate('/hr/reports/leaves')}
            />
            <ReportCard
              title="تقرير الرواتب"
              description="كشف رواتب شهري مفصل"
              icon={DollarSign}
              onClick={() => navigate('/hr/reports/payroll')}
            />
            <ReportCard
              title="تقرير الأداء"
              description="ملخص تقييمات الأداء والأهداف"
              icon={TrendingUp}
              onClick={() => navigate('/hr/reports/performance')}
            />
            <ReportCard
              title="تقرير الموظفين"
              description="قائمة الموظفين وبياناتهم"
              icon={Users}
              onClick={() => navigate('/hr/reports/employees')}
            />
            <ReportCard
              title="تقرير مخصص"
              description="إنشاء تقرير حسب معاييرك"
              icon={FileText}
              onClick={() => navigate('/hr/reports/custom')}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================
// Sub Components
// ============================================

interface TeamStatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'red' | 'orange';
}

function TeamStatCard({ label, value, icon: Icon, color }: TeamStatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/30',
    orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30',
  };

  return (
    <div className="p-4 border rounded-lg text-center">
      <div className={`inline-flex p-2 rounded-lg mb-2 ${colorClasses[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

interface AnalyticCardProps {
  label: string;
  value: string;
  trend?: 'up' | 'down';
}

function AnalyticCard({ label, value, trend }: AnalyticCardProps) {
  return (
    <div className="p-4 border rounded-lg">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-2xl font-bold">{value}</span>
        {trend && (
          <TrendingUp
            className={`h-4 w-4 ${
              trend === 'up' ? 'text-green-500' : 'text-red-500 rotate-180'
            }`}
          />
        )}
      </div>
    </div>
  );
}

interface WeeklyAttendanceChartProps {
  data: { date: string; day_name: string; present: number; absent: number; late: number }[];
  compact?: boolean;
}

function WeeklyAttendanceChart({ data, compact }: WeeklyAttendanceChartProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        لا توجد بيانات للأسبوع
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.present + d.absent + d.late), 1);

  return (
    <div className={`flex gap-2 ${compact ? 'h-24' : 'h-48'} items-end`}>
      {data.map((day, index) => {
        const total = day.present + day.absent + day.late;
        const presentHeight = (day.present / maxValue) * 100;
        const lateHeight = (day.late / maxValue) * 100;
        const absentHeight = (day.absent / maxValue) * 100;

        return (
          <div key={index} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex flex-col justify-end" style={{ height: compact ? '60px' : '150px' }}>
              <div
                className="w-full bg-green-500 rounded-t"
                style={{ height: `${presentHeight}%` }}
                title={`حاضر: ${day.present}`}
              />
              <div
                className="w-full bg-yellow-500"
                style={{ height: `${lateHeight}%` }}
                title={`متأخر: ${day.late}`}
              />
              <div
                className="w-full bg-red-500 rounded-b"
                style={{ height: `${absentHeight}%` }}
                title={`غائب: ${day.absent}`}
              />
            </div>
            <span className="text-xs text-muted-foreground">{day.day_name}</span>
          </div>
        );
      })}
    </div>
  );
}

interface ReportCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  onClick: () => void;
}

function ReportCard({ title, description, icon: Icon, onClick }: ReportCardProps) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
      onClick={onClick}
    >
      <CardContent className="p-6 flex items-start gap-4">
        <div className="p-3 bg-primary/10 rounded-lg">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="font-medium">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// Utility Functions
// ============================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
