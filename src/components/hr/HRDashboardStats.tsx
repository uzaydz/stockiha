/**
 * 📊 HR Dashboard Stats Component - مكون إحصائيات لوحة تحكم الموارد البشرية
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  Clock,
  Calendar,
  DollarSign,
  TrendingUp,
  UserCheck,
  UserX,
  AlertTriangle,
} from 'lucide-react';
import type { HRDashboard } from '@/types/hr/dashboard';

interface HRDashboardStatsProps {
  data: HRDashboard;
  isLoading?: boolean;
}

export function HRDashboardStats({ data, isLoading }: HRDashboardStatsProps) {
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* الصف الأول - إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي الموظفين"
          value={data.employees.total}
          subtitle={`${data.employees.active} نشط`}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="الحضور اليوم"
          value={data.attendance.today.present}
          subtitle={`${data.attendance.today.attendance_rate}% نسبة الحضور`}
          icon={UserCheck}
          color="green"
        />
        <StatCard
          title="طلبات الإجازة المعلقة"
          value={data.leave.pending_requests}
          subtitle={`${data.leave.employees_on_leave_today} في إجازة اليوم`}
          icon={Calendar}
          color="orange"
        />
        <StatCard
          title="الرواتب غير المصروفة"
          value={data.payroll.unpaid_count}
          subtitle={`${formatCurrency(data.payroll.pending_payments)} ريال`}
          icon={DollarSign}
          color="red"
        />
      </div>

      {/* الصف الثاني - تفاصيل الحضور والأداء */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AttendanceOverviewCard data={data.attendance.today} />
        <PerformanceOverviewCard data={data.performance} />
      </div>

      {/* الصف الثالث - الرواتب والإجازات */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PayrollSummaryCard data={data.payroll} />
        <LeaveSummaryCard data={data.leave} />
      </div>
    </div>
  );
}

// ============================================
// Sub Components
// ============================================

interface StatCardProps {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'orange' | 'red' | 'purple';
}

function StatCard({ title, value, subtitle, icon: Icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <div className={`p-3 rounded-full ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface AttendanceOverviewCardProps {
  data: HRDashboard['attendance']['today'];
}

function AttendanceOverviewCard({ data }: AttendanceOverviewCardProps) {
  const items = [
    { label: 'حاضر', value: data.present, color: 'bg-green-500' },
    { label: 'متأخر', value: data.late, color: 'bg-yellow-500' },
    { label: 'غائب', value: data.absent, color: 'bg-red-500' },
    { label: 'في إجازة', value: data.on_leave, color: 'bg-blue-500' },
    { label: 'لم يسجل بعد', value: data.not_checked_in, color: 'bg-gray-400' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          نظرة عامة على الحضور اليوم
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">{data.attendance_rate}%</span>
            <span className="text-sm text-muted-foreground">
              من {data.total_employees} موظف
            </span>
          </div>
          <Progress value={data.attendance_rate} className="h-3" />
          <div className="grid grid-cols-2 gap-4 mt-4">
            {items.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${item.color}`} />
                <span className="text-sm">{item.label}</span>
                <span className="text-sm font-medium mr-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface PerformanceOverviewCardProps {
  data: HRDashboard['performance'];
}

function PerformanceOverviewCard({ data }: PerformanceOverviewCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          نظرة عامة على الأداء
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <p className="text-3xl font-bold text-primary">{data.average_score}</p>
            <p className="text-sm text-muted-foreground mt-1">متوسط التقييم</p>
          </div>
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <p className="text-3xl font-bold text-primary">{data.completed_reviews}</p>
            <p className="text-sm text-muted-foreground mt-1">تقييمات مكتملة</p>
          </div>
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <p className="text-3xl font-bold text-orange-500">{data.pending_reviews}</p>
            <p className="text-sm text-muted-foreground mt-1">تقييمات معلقة</p>
          </div>
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <p className="text-3xl font-bold text-green-500">{data.completed_goals}</p>
            <p className="text-sm text-muted-foreground mt-1">أهداف مكتملة</p>
          </div>
        </div>
        {data.active_goals > 0 && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm">
              <span className="font-medium">{data.active_goals}</span> هدف نشط قيد التنفيذ
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface PayrollSummaryCardProps {
  data: HRDashboard['payroll'];
}

function PayrollSummaryCard({ data }: PayrollSummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          ملخص الرواتب هذا الشهر
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
            <span className="text-sm">إجمالي الرواتب</span>
            <span className="font-bold text-lg">{formatCurrency(data.total_payroll)} ريال</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-muted-foreground">البدلات</p>
              <p className="font-bold text-green-600">+{formatCurrency(data.total_allowances)}</p>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-sm text-muted-foreground">الخصومات</p>
              <p className="font-bold text-red-600">-{formatCurrency(data.total_deductions)}</p>
            </div>
          </div>
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-green-500" />
              <span className="text-sm">{data.paid_count} مصروف</span>
            </div>
            <div className="flex items-center gap-2">
              <UserX className="w-4 h-4 text-red-500" />
              <span className="text-sm">{data.unpaid_count} غير مصروف</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface LeaveSummaryCardProps {
  data: HRDashboard['leave'];
}

function LeaveSummaryCard({ data }: LeaveSummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          ملخص الإجازات هذا الشهر
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.pending_requests > 0 && (
            <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <span className="text-sm">
                <span className="font-bold">{data.pending_requests}</span> طلب إجازة بانتظار الموافقة
              </span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-green-500">{data.approved_this_month}</p>
              <p className="text-sm text-muted-foreground mt-1">موافق عليها</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-red-500">{data.rejected_this_month}</p>
              <p className="text-sm text-muted-foreground mt-1">مرفوضة</p>
            </div>
          </div>
          <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
            <span className="text-sm">إجمالي أيام الإجازة</span>
            <span className="font-bold">{data.total_days_taken} يوم</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{data.employees_on_leave_today} موظف في إجازة اليوم</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-48 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ar-SA').format(amount);
}

export default HRDashboardStats;
