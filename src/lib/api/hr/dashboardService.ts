/**
 * 📊 HR Dashboard Service - خدمة لوحة تحكم الموارد البشرية
 */

import { supabase } from '@/lib/supabase';
import type {
  HRDashboard,
  EmployeeProfile,
  HRAlerts,
  EmployeeDetailView,
  TeamOverview,
  HRReport,
} from '@/types/hr/dashboard';
import { getDailyAttendanceStats } from './attendanceService';

// ============================================
// 📊 Dashboard Statistics
// ============================================

/**
 * جلب إحصائيات لوحة تحكم HR الشاملة
 */
export async function getHRDashboardStats(
  organizationId: string
): Promise<HRDashboard> {
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.substring(0, 7);
  const startOfMonth = `${thisMonth}-01`;

  // جلب إحصائيات متعددة بالتوازي
  const [
    employeeStats,
    attendanceStats,
    leaveStats,
    payrollStats,
    performanceStats,
  ] = await Promise.all([
    getEmployeeStats(organizationId),
    getDailyAttendanceStats(organizationId, today),
    getLeaveStats(organizationId, startOfMonth, today),
    getPayrollStats(organizationId, thisMonth),
    getPerformanceStats(organizationId),
  ]);

  return {
    organization_id: organizationId,
    date: today,
    employees: employeeStats,
    attendance: {
      today: attendanceStats,
      this_week: {
        average_rate: 0, // يتم حسابها لاحقاً
        late_count: 0,
        absent_count: 0,
      },
      this_month: {
        average_rate: 0,
        total_work_hours: 0,
        overtime_hours: 0,
      },
    },
    leave: leaveStats,
    payroll: payrollStats,
    performance: performanceStats,
  };
}

/**
 * جلب إحصائيات الموظفين
 */
async function getEmployeeStats(organizationId: string) {
  const { data, count } = await supabase
    .from('users')
    .select('id, is_active, role, job_title, created_at', { count: 'exact' })
    .eq('organization_id', organizationId);

  const stats = {
    total: count || 0,
    active: 0,
    inactive: 0,
    on_probation: 0,
    new_this_month: 0,
    by_department: {} as Record<string, number>,
  };

  const thisMonth = new Date().toISOString().substring(0, 7);

  data?.forEach((emp) => {
    if (emp.is_active) stats.active++;
    else stats.inactive++;

    // استخدام job_title كبديل عن department
    if (emp.job_title) {
      stats.by_department[emp.job_title] = (stats.by_department[emp.job_title] || 0) + 1;
    }

    if (emp.created_at?.startsWith(thisMonth)) {
      stats.new_this_month++;
    }
  });

  return stats;
}

/**
 * جلب إحصائيات الإجازات
 */
async function getLeaveStats(
  organizationId: string,
  startDate: string,
  endDate: string
) {
  const { data } = await supabase
    .from('leave_requests')
    .select('status, total_days')
    .eq('organization_id', organizationId)
    .gte('start_date', startDate)
    .lte('end_date', endDate);

  const stats = {
    pending_requests: 0,
    approved_this_month: 0,
    rejected_this_month: 0,
    total_days_taken: 0,
    employees_on_leave_today: 0,
  };

  data?.forEach((req) => {
    if (req.status === 'pending') stats.pending_requests++;
    if (req.status === 'approved') {
      stats.approved_this_month++;
      stats.total_days_taken += req.total_days || 0;
    }
    if (req.status === 'rejected') stats.rejected_this_month++;
  });

  // جلب من على إجازة اليوم
  const today = new Date().toISOString().split('T')[0];
  const { count } = await supabase
    .from('leave_requests')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'approved')
    .lte('start_date', today)
    .gte('end_date', today);

  stats.employees_on_leave_today = count || 0;

  return stats;
}

/**
 * جلب إحصائيات الرواتب
 */
async function getPayrollStats(organizationId: string, month: string) {
  // month format is "YYYY-MM", extract year and month
  const [year, monthNum] = month.split('-').map(Number);

  const { data } = await supabase
    .from('payroll_records')
    .select('status, net_salary, total_deductions, total_allowances')
    .eq('organization_id', organizationId)
    .eq('pay_period_year', year)
    .eq('pay_period_month', monthNum);

  const stats = {
    total_payroll: 0,
    total_deductions: 0,
    total_allowances: 0,
    pending_payments: 0,
    paid_count: 0,
    unpaid_count: 0,
  };

  data?.forEach((record) => {
    stats.total_payroll += Number(record.net_salary) || 0;
    stats.total_deductions += Number(record.total_deductions) || 0;
    stats.total_allowances += Number(record.total_allowances) || 0;

    if (record.status === 'paid') {
      stats.paid_count++;
    } else {
      stats.unpaid_count++;
      stats.pending_payments += Number(record.net_salary) || 0;
    }
  });

  return stats;
}

/**
 * جلب إحصائيات الأداء
 */
async function getPerformanceStats(organizationId: string) {
  const { data: reviews } = await supabase
    .from('performance_reviews')
    .select('status, total_score, weighted_score')
    .eq('organization_id', organizationId);

  const { data: goals } = await supabase
    .from('employee_goals')
    .select('status, achievement_percentage')
    .eq('organization_id', organizationId);

  const stats = {
    pending_reviews: 0,
    completed_reviews: 0,
    average_score: 0,
    active_goals: 0,
    completed_goals: 0,
    overdue_goals: 0,
  };

  let totalScore = 0;
  let scoreCount = 0;

  reviews?.forEach((review) => {
    if (review.status === 'submitted' || review.status === 'draft') {
      stats.pending_reviews++;
    }
    if (review.status === 'acknowledged' || review.status === 'finalized') {
      stats.completed_reviews++;
      // استخدام weighted_score أو total_score
      const score = Number(review.weighted_score) || Number(review.total_score);
      if (score) {
        totalScore += score;
        scoreCount++;
      }
    }
  });

  stats.average_score = scoreCount > 0 ? Math.round((totalScore / scoreCount) * 100) / 100 : 0;

  goals?.forEach((goal) => {
    if (goal.status === 'in_progress') stats.active_goals++;
    if (goal.status === 'completed') stats.completed_goals++;
    // استخدام achievement_percentage بدلاً من progress_percentage
    if (goal.status === 'in_progress' && Number(goal.achievement_percentage || 0) < 100) {
      stats.overdue_goals++;
    }
  });

  return stats;
}

// ============================================
// 👤 Employee Profiles
// ============================================

/**
 * جلب الملف الشخصي الكامل للموظف
 */
export async function getEmployeeProfile(
  employeeId: string
): Promise<EmployeeProfile | null> {
  const { data: user, error } = await supabase
    .from('users')
    .select(`
      *,
      salary_structure:salary_structures!employee_id(*),
      shift_assignment:employee_shift_assignments!employee_id(
        *,
        shift:work_shifts(*)
      )
    `)
    .eq('id', employeeId)
    .single();

  if (error || !user) {
    console.error('Error fetching employee profile:', error);
    return null;
  }

  // جلب بيانات إضافية
  const [
    attendanceData,
    leaveBalance,
    recentActivities,
    warnings,
    documents,
  ] = await Promise.all([
    getEmployeeAttendanceSummary(employeeId),
    getEmployeeLeaveBalance(employeeId),
    getEmployeeRecentActivities(employeeId),
    getEmployeeWarnings(employeeId),
    getEmployeeDocuments(employeeId),
  ]);

  return {
    ...user,
    attendance_summary: attendanceData,
    leave_balance: leaveBalance,
    recent_activities: recentActivities,
    warnings_count: warnings.length,
    documents_count: documents.length,
  } as EmployeeProfile;
}

/**
 * جلب ملخص حضور الموظف
 */
async function getEmployeeAttendanceSummary(employeeId: string) {
  const thisMonth = new Date().toISOString().substring(0, 7);
  const startOfMonth = `${thisMonth}-01`;
  const today = new Date().toISOString().split('T')[0];

  const { data } = await supabase
    .from('employee_attendance')
    .select('status, work_duration_minutes, late_minutes')
    .eq('employee_id', employeeId)
    .gte('attendance_date', startOfMonth)
    .lte('attendance_date', today);

  const summary = {
    present_days: 0,
    absent_days: 0,
    late_days: 0,
    total_work_hours: 0,
    total_late_minutes: 0,
  };

  data?.forEach((record) => {
    if (record.status === 'present') summary.present_days++;
    if (record.status === 'absent') summary.absent_days++;
    if (record.status === 'late') {
      summary.late_days++;
      summary.present_days++;
    }
    summary.total_work_hours += (record.work_duration_minutes || 0) / 60;
    summary.total_late_minutes += record.late_minutes || 0;
  });

  return summary;
}

/**
 * جلب رصيد إجازات الموظف
 */
async function getEmployeeLeaveBalance(employeeId: string) {
  const { data } = await supabase
    .from('employee_leave_balances')
    .select(`
      *,
      leave_type:leave_types(name, name_ar)
    `)
    .eq('employee_id', employeeId)
    .eq('year', new Date().getFullYear());

  return data || [];
}

/**
 * جلب آخر أنشطة الموظف
 */
async function getEmployeeRecentActivities(employeeId: string, limit: number = 10) {
  const { data: attendance } = await supabase
    .from('employee_attendance')
    .select('id, attendance_date, check_in_time, check_out_time, status')
    .eq('employee_id', employeeId)
    .order('attendance_date', { ascending: false })
    .limit(limit);

  const { data: leaves } = await supabase
    .from('leave_requests')
    .select('id, leave_type_id, start_date, end_date, status, created_at')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })
    .limit(limit);

  // دمج وترتيب الأنشطة
  const activities = [
    ...(attendance?.map((a) => ({
      type: 'attendance' as const,
      date: a.attendance_date,
      data: a,
    })) || []),
    ...(leaves?.map((l) => ({
      type: 'leave' as const,
      date: l.created_at,
      data: l,
    })) || []),
  ];

  return activities.sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  ).slice(0, limit);
}

/**
 * جلب تحذيرات الموظف
 */
async function getEmployeeWarnings(employeeId: string) {
  const { data } = await supabase
    .from('employee_warnings')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('is_active', true)
    .order('warning_date', { ascending: false });

  return data || [];
}

/**
 * جلب مستندات الموظف
 */
async function getEmployeeDocuments(employeeId: string) {
  const { data } = await supabase
    .from('employee_documents')
    .select('*')
    .eq('employee_id', employeeId)
    .order('uploaded_at', { ascending: false });

  return data || [];
}

// ============================================
// 🚨 Alerts & Notifications
// ============================================

/**
 * جلب تنبيهات HR
 */
export async function getHRAlerts(
  organizationId: string
): Promise<HRAlerts> {
  const today = new Date().toISOString().split('T')[0];
  const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  // تنبيهات متعددة بالتوازي
  const [
    pendingLeaves,
    pendingReviews,
    expiringSoon,
    birthdaysThisWeek,
    lowLeaveBalances,
    unpaidPayroll,
  ] = await Promise.all([
    getPendingLeaveRequests(organizationId),
    getPendingPerformanceReviews(organizationId),
    getExpiringDocuments(organizationId, weekFromNow),
    getUpcomingBirthdays(organizationId, today, weekFromNow),
    getLowLeaveBalanceEmployees(organizationId),
    getUnpaidPayrollCount(organizationId),
  ]);

  return {
    pending_leave_requests: pendingLeaves,
    pending_performance_reviews: pendingReviews,
    expiring_documents: expiringSoon,
    upcoming_birthdays: birthdaysThisWeek,
    low_leave_balance_employees: lowLeaveBalances,
    unpaid_payroll_count: unpaidPayroll,
    critical_alerts: calculateCriticalAlerts({
      pendingLeaves,
      pendingReviews,
      expiringSoon,
      unpaidPayroll,
    }),
  };
}

async function getPendingLeaveRequests(organizationId: string) {
  const { count } = await supabase
    .from('leave_requests')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'pending');

  return count || 0;
}

async function getPendingPerformanceReviews(organizationId: string) {
  const { count } = await supabase
    .from('performance_reviews')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .in('status', ['draft', 'submitted']);

  return count || 0;
}

async function getExpiringDocuments(organizationId: string, beforeDate: string) {
  const { count } = await supabase
    .from('employee_documents')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .lte('expiry_date', beforeDate)
    .gt('expiry_date', new Date().toISOString().split('T')[0]);

  return count || 0;
}

async function getUpcomingBirthdays(
  organizationId: string,
  fromDate: string,
  toDate: string
) {
  // سيتم تحسين هذا لاحقاً مع حقل تاريخ الميلاد
  return 0;
}

async function getLowLeaveBalanceEmployees(organizationId: string) {
  // جلب أرصدة الإجازات وحساب المتبقي يدوياً
  const { data } = await supabase
    .from('employee_leave_balances')
    .select('total_days, used_days, pending_days')
    .eq('organization_id', organizationId);

  // حساب عدد الموظفين الذين لديهم رصيد منخفض
  const lowBalanceCount = data?.filter((balance) => {
    const remaining = Number(balance.total_days || 0) - Number(balance.used_days || 0) - Number(balance.pending_days || 0);
    return remaining < 3;
  }).length || 0;

  return lowBalanceCount;
}

async function getUnpaidPayrollCount(organizationId: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const { count } = await supabase
    .from('payroll_records')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('pay_period_year', year)
    .eq('pay_period_month', month)
    .neq('status', 'paid');

  return count || 0;
}

function calculateCriticalAlerts(data: {
  pendingLeaves: number;
  pendingReviews: number;
  expiringSoon: number;
  unpaidPayroll: number;
}) {
  const alerts: string[] = [];

  if (data.pendingLeaves > 5) {
    alerts.push(`يوجد ${data.pendingLeaves} طلب إجازة بانتظار الموافقة`);
  }
  if (data.pendingReviews > 10) {
    alerts.push(`يوجد ${data.pendingReviews} تقييم أداء بانتظار المراجعة`);
  }
  if (data.expiringSoon > 0) {
    alerts.push(`يوجد ${data.expiringSoon} مستند قارب على الانتهاء`);
  }
  if (data.unpaidPayroll > 0) {
    alerts.push(`يوجد ${data.unpaidPayroll} راتب لم يتم صرفه هذا الشهر`);
  }

  return alerts;
}

// ============================================
// 👥 Team Overview
// ============================================

/**
 * جلب نظرة عامة على الفريق
 * ملاحظة: حالياً يتم جلب جميع الموظفين في المنظمة حيث لا يوجد حقل manager_id
 */
export async function getTeamOverview(
  organizationId: string,
  managerId?: string
): Promise<TeamOverview> {
  // جلب جميع الموظفين في المنظمة (حيث لا يوجد manager_id في الجدول الحالي)
  const { data: teamMembers } = await supabase
    .from('users')
    .select('id, name, email, avatar_url, job_title, is_active')
    .eq('organization_id', organizationId)
    .eq('is_active', true);

  const today = new Date().toISOString().split('T')[0];
  const memberIds = teamMembers?.map((m) => m.id) || [];

  if (memberIds.length === 0) {
    return {
      manager_id: managerId || organizationId,
      team_size: 0,
      present_today: 0,
      absent_today: 0,
      on_leave_today: 0,
      pending_approvals: 0,
      members: [],
    };
  }

  // جلب حالة الحضور اليوم
  const { data: attendanceToday } = await supabase
    .from('employee_attendance')
    .select('employee_id, status')
    .in('employee_id', memberIds)
    .eq('attendance_date', today);

  // جلب طلبات الإجازة المعلقة
  const { count: pendingLeaves } = await supabase
    .from('leave_requests')
    .select('*', { count: 'exact', head: true })
    .in('employee_id', memberIds)
    .eq('status', 'pending');

  const overview: TeamOverview = {
    manager_id: managerId || organizationId,
    team_size: teamMembers?.length || 0,
    present_today: 0,
    absent_today: 0,
    on_leave_today: 0,
    pending_approvals: pendingLeaves || 0,
    members: teamMembers || [],
  };

  attendanceToday?.forEach((record) => {
    if (record.status === 'present' || record.status === 'late') {
      overview.present_today++;
    }
    if (record.status === 'absent') {
      overview.absent_today++;
    }
    if (record.status === 'on_leave') {
      overview.on_leave_today++;
    }
  });

  // الباقون لم يسجلوا حضورهم بعد
  overview.absent_today += overview.team_size - (attendanceToday?.length || 0) - overview.on_leave_today;

  return overview;
}

// ============================================
// 📈 Reports
// ============================================

/**
 * جلب تقرير HR مخصص
 */
export async function generateHRReport(
  organizationId: string,
  reportType: 'attendance' | 'leave' | 'payroll' | 'performance',
  startDate: string,
  endDate: string
): Promise<HRReport> {
  const report: HRReport = {
    type: reportType,
    organization_id: organizationId,
    start_date: startDate,
    end_date: endDate,
    generated_at: new Date().toISOString(),
    data: {},
    summary: {},
  };

  switch (reportType) {
    case 'attendance':
      report.data = await generateAttendanceReport(organizationId, startDate, endDate);
      break;
    case 'leave':
      report.data = await generateLeaveReport(organizationId, startDate, endDate);
      break;
    case 'payroll':
      report.data = await generatePayrollReport(organizationId, startDate, endDate);
      break;
    case 'performance':
      report.data = await generatePerformanceReport(organizationId, startDate, endDate);
      break;
  }

  return report;
}

async function generateAttendanceReport(
  organizationId: string,
  startDate: string,
  endDate: string
) {
  const { data } = await supabase
    .from('employee_attendance')
    .select(`
      *,
      employee:users!employee_id(id, name, email, job_title)
    `)
    .eq('organization_id', organizationId)
    .gte('attendance_date', startDate)
    .lte('attendance_date', endDate)
    .order('attendance_date', { ascending: false });

  // تجميع البيانات
  const byEmployee: Record<string, any> = {};
  const byDate: Record<string, any> = {};

  data?.forEach((record) => {
    // تجميع حسب الموظف
    if (!byEmployee[record.employee_id]) {
      byEmployee[record.employee_id] = {
        employee: record.employee,
        records: [],
        total_present: 0,
        total_absent: 0,
        total_late: 0,
        total_work_hours: 0,
      };
    }
    byEmployee[record.employee_id].records.push(record);
    if (record.status === 'present') byEmployee[record.employee_id].total_present++;
    if (record.status === 'absent') byEmployee[record.employee_id].total_absent++;
    if (record.status === 'late') byEmployee[record.employee_id].total_late++;
    byEmployee[record.employee_id].total_work_hours += (record.work_duration_minutes || 0) / 60;

    // تجميع حسب التاريخ
    if (!byDate[record.attendance_date]) {
      byDate[record.attendance_date] = { present: 0, absent: 0, late: 0 };
    }
    if (record.status === 'present') byDate[record.attendance_date].present++;
    if (record.status === 'absent') byDate[record.attendance_date].absent++;
    if (record.status === 'late') byDate[record.attendance_date].late++;
  });

  return {
    by_employee: Object.values(byEmployee),
    by_date: byDate,
    total_records: data?.length || 0,
  };
}

async function generateLeaveReport(
  organizationId: string,
  startDate: string,
  endDate: string
) {
  const { data } = await supabase
    .from('leave_requests')
    .select(`
      *,
      employee:users!employee_id(id, name, email, job_title),
      leave_type:leave_types(name, name_ar)
    `)
    .eq('organization_id', organizationId)
    .gte('start_date', startDate)
    .lte('end_date', endDate)
    .order('start_date', { ascending: false });

  const byType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  let totalDays = 0;

  data?.forEach((request) => {
    const typeName = request.leave_type?.name_ar || 'غير محدد';
    byType[typeName] = (byType[typeName] || 0) + (request.total_days || 0);
    byStatus[request.status] = (byStatus[request.status] || 0) + 1;
    if (request.status === 'approved') {
      totalDays += request.total_days || 0;
    }
  });

  return {
    requests: data || [],
    by_type: byType,
    by_status: byStatus,
    total_approved_days: totalDays,
    total_requests: data?.length || 0,
  };
}

async function generatePayrollReport(
  organizationId: string,
  startDate: string,
  endDate: string
) {
  // استخراج السنة والشهر من التواريخ
  const [startYear, startMonth] = startDate.substring(0, 7).split('-').map(Number);
  const [endYear, endMonth] = endDate.substring(0, 7).split('-').map(Number);

  // جلب جميع السجلات ثم فلترتها
  const { data } = await supabase
    .from('payroll_records')
    .select(`
      *,
      employee:users!employee_id(id, name, email, job_title)
    `)
    .eq('organization_id', organizationId)
    .gte('pay_period_year', startYear)
    .lte('pay_period_year', endYear)
    .order('pay_period_year', { ascending: false })
    .order('pay_period_month', { ascending: false });

  // فلترة إضافية للأشهر
  const filteredData = data?.filter((record) => {
    const recordDate = record.pay_period_year * 100 + record.pay_period_month;
    const start = startYear * 100 + startMonth;
    const end = endYear * 100 + endMonth;
    return recordDate >= start && recordDate <= end;
  });

  const byMonth: Record<string, any> = {};
  let totalGross = 0;
  let totalNet = 0;
  let totalDeductions = 0;

  filteredData?.forEach((record) => {
    const monthKey = `${record.pay_period_year}-${String(record.pay_period_month).padStart(2, '0')}`;
    if (!byMonth[monthKey]) {
      byMonth[monthKey] = {
        total_gross: 0,
        total_net: 0,
        total_deductions: 0,
        employee_count: 0,
      };
    }
    byMonth[monthKey].total_gross += Number(record.gross_salary) || 0;
    byMonth[monthKey].total_net += Number(record.net_salary) || 0;
    byMonth[monthKey].total_deductions += Number(record.total_deductions) || 0;
    byMonth[monthKey].employee_count++;

    totalGross += Number(record.gross_salary) || 0;
    totalNet += Number(record.net_salary) || 0;
    totalDeductions += Number(record.total_deductions) || 0;
  });

  return {
    records: filteredData || [],
    by_month: byMonth,
    total_gross_salary: totalGross,
    total_net_salary: totalNet,
    total_deductions: totalDeductions,
    total_records: filteredData?.length || 0,
  };
}

async function generatePerformanceReport(
  organizationId: string,
  startDate: string,
  endDate: string
) {
  const { data } = await supabase
    .from('performance_reviews')
    .select(`
      *,
      employee:users!employee_id(id, name, email, job_title),
      reviewer:users!reviewer_id(id, name)
    `)
    .eq('organization_id', organizationId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: false });

  const scoreDistribution: Record<string, number> = {
    excellent: 0,
    good: 0,
    average: 0,
    needs_improvement: 0,
    poor: 0,
  };

  let totalScore = 0;
  let scoreCount = 0;

  data?.forEach((review) => {
    // استخدام weighted_score أو total_score بدلاً من overall_score
    const score = Number(review.weighted_score) || Number(review.total_score);
    if (score) {
      totalScore += score;
      scoreCount++;

      if (score >= 4.5) scoreDistribution.excellent++;
      else if (score >= 3.5) scoreDistribution.good++;
      else if (score >= 2.5) scoreDistribution.average++;
      else if (score >= 1.5) scoreDistribution.needs_improvement++;
      else scoreDistribution.poor++;
    }
  });

  return {
    reviews: data || [],
    score_distribution: scoreDistribution,
    average_score: scoreCount > 0 ? Math.round((totalScore / scoreCount) * 100) / 100 : 0,
    total_reviews: data?.length || 0,
  };
}

// ============================================
// 🔍 Search & Filter
// ============================================

/**
 * البحث المتقدم في الموظفين
 * ملاحظة: استخدام job_title بدلاً من department
 */
export async function searchEmployees(
  organizationId: string,
  query: string,
  filters?: {
    department?: string;
    status?: 'active' | 'inactive';
    role?: string;
  }
): Promise<EmployeeProfile[]> {
  let dbQuery = supabase
    .from('users')
    .select('*')
    .eq('organization_id', organizationId)
    .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`);

  // استخدام job_title بدلاً من department
  if (filters?.department) {
    dbQuery = dbQuery.eq('job_title', filters.department);
  }
  if (filters?.status) {
    dbQuery = dbQuery.eq('is_active', filters.status === 'active');
  }
  if (filters?.role) {
    dbQuery = dbQuery.eq('role', filters.role);
  }

  const { data, error } = await dbQuery.limit(50);

  if (error) {
    console.error('Error searching employees:', error);
    return [];
  }

  return (data || []) as EmployeeProfile[];
}

/**
 * جلب قائمة الأقسام في المنظمة
 * ملاحظة: استخدام job_title كبديل عن department حيث لا يوجد حقل department
 */
export async function getDepartments(
  organizationId: string
): Promise<{ department: string; count: number }[]> {
  const { data } = await supabase
    .from('users')
    .select('job_title')
    .eq('organization_id', organizationId)
    .not('job_title', 'is', null);

  const departments: Record<string, number> = {};
  data?.forEach((user) => {
    if (user.job_title) {
      departments[user.job_title] = (departments[user.job_title] || 0) + 1;
    }
  });

  return Object.entries(departments).map(([department, count]) => ({
    department,
    count,
  }));
}
