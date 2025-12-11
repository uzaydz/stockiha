/**
 * 📊 HR Dashboard Types - أنواع لوحة تحكم الموارد البشرية
 */

import type { AttendanceStatus, EmployeeAttendanceStats } from './attendance';
import type { LeaveRequestWithDetails } from './leave';
import type { PayrollRecord } from './payroll';
import type { PerformanceReviewWithDetails, EmployeeGoal } from './performance';
import type { DocumentWithDetails, WarningWithDetails } from './documents';

// ============================================
// 📋 Employee Profile Types
// ============================================

/** الملف الشخصي الكامل للموظف */
export interface EmployeeProfile {
  // البيانات الأساسية
  id: string;
  email: string;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;

  // البيانات الوظيفية
  role: string;
  job_title?: string | null;
  organization_id: string;
  is_active: boolean;
  is_org_admin: boolean;

  // البيانات الشخصية
  birth_date?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;

  // تواريخ مهمة
  created_at: string;
  last_login?: string | null;
  last_activity_at?: string | null;

  // الحالة
  status?: 'online' | 'offline' | 'away' | 'busy' | null;
}

/** بطاقة الموظف للعرض */
export interface EmployeeCard extends EmployeeProfile {
  // إحصائيات سريعة
  attendance_today?: {
    status: AttendanceStatus;
    check_in_time?: string;
    check_out_time?: string;
  };
  active_goals_count: number;
  pending_leaves_count: number;
  warnings_count: number;
  current_month_attendance_rate: number;
}

// ============================================
// 📊 Dashboard Stats Types
// ============================================

/** إحصائيات الموظفين */
export interface EmployeesStats {
  total: number;
  active: number;
  inactive: number;
  new_this_month: number;
  by_role: {
    role: string;
    count: number;
  }[];
  by_department?: {
    department: string;
    count: number;
  }[];
}

/** إحصائيات الحضور اليومية */
export interface DailyAttendanceOverview {
  date: string;
  present: number;
  absent: number;
  late: number;
  on_leave: number;
  remote: number;
  not_checked_in: number;
  holiday: boolean;
  holiday_name?: string;
}

/** إحصائيات الإجازات */
export interface LeavesOverview {
  pending_requests: number;
  approved_this_month: number;
  rejected_this_month: number;
  employees_on_leave_today: number;
  upcoming_leaves: LeaveRequestWithDetails[];
}

/** التنبيهات والإشعارات */
export interface HRAlerts {
  // الوثائق
  expiring_documents: number;
  expired_documents: number;

  // التقييمات
  pending_reviews: number;
  overdue_reviews: number;

  // الأهداف
  overdue_goals: number;

  // الرواتب
  pending_payroll: number;

  // الإنذارات النشطة
  active_warnings: number;

  // طلبات معلقة
  pending_loan_requests: number;
}

/** لوحة تحكم HR الرئيسية */
export interface HRDashboard {
  date: string;
  organization_id: string;

  // الإحصائيات
  employees: EmployeesStats;
  attendance: DailyAttendanceOverview;
  leaves: LeavesOverview;
  alerts: HRAlerts;

  // الرسوم البيانية
  charts_data?: HRChartsData;
}

// ============================================
// 📈 Charts Data Types
// ============================================

/** بيانات الرسوم البيانية */
export interface HRChartsData {
  // الحضور الأسبوعي
  weekly_attendance: {
    date: string;
    day_name: string;
    present: number;
    absent: number;
    late: number;
  }[];

  // الحضور الشهري
  monthly_attendance_trend: {
    month: string;
    attendance_rate: number;
  }[];

  // توزيع الإجازات
  leave_distribution: {
    leave_type: string;
    leave_type_ar: string;
    count: number;
    color: string;
  }[];

  // توزيع درجات الأداء
  performance_distribution?: {
    grade: string;
    label: string;
    count: number;
    color: string;
  }[];

  // الرواتب الشهرية
  payroll_trend?: {
    month: string;
    total_payroll: number;
    employee_count: number;
  }[];
}

// ============================================
// 👤 Employee Detail View Types
// ============================================

/** عرض تفصيلي للموظف */
export interface EmployeeDetailView {
  profile: EmployeeProfile;

  // الحضور
  attendance: {
    current_month: EmployeeAttendanceStats;
    recent_records: {
      date: string;
      status: AttendanceStatus;
      check_in?: string;
      check_out?: string;
      work_hours?: number;
    }[];
  };

  // الإجازات
  leaves: {
    balances: {
      type: string;
      type_ar: string;
      total: number;
      used: number;
      remaining: number;
    }[];
    recent_requests: LeaveRequestWithDetails[];
  };

  // الراتب
  salary?: {
    current_structure?: {
      basic_salary: number;
      total_allowances: number;
      total_deductions: number;
      net_salary: number;
    };
    recent_payslips: PayrollRecord[];
  };

  // الأداء
  performance: {
    latest_review?: PerformanceReviewWithDetails;
    active_goals: EmployeeGoal[];
    goals_completion_rate: number;
  };

  // الوثائق
  documents: {
    total: number;
    expiring_soon: DocumentWithDetails[];
    by_type: {
      type: string;
      count: number;
    }[];
  };

  // الإنذارات
  warnings: {
    active: WarningWithDetails[];
    history_count: number;
  };
}

// ============================================
// 🔍 Search & Filter Types
// ============================================

/** فلتر بحث الموظفين */
export interface EmployeeSearchFilter {
  query?: string;
  status?: 'active' | 'inactive' | 'all';
  role?: string;
  department?: string;
  attendance_status?: AttendanceStatus;
  has_active_warnings?: boolean;
  joined_from?: string;
  joined_to?: string;
  sort_by?: 'name' | 'created_at' | 'last_activity' | 'attendance_rate';
  sort_order?: 'asc' | 'desc';
}

/** نتائج البحث */
export interface EmployeeSearchResults {
  employees: EmployeeCard[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

// ============================================
// 📤 Export Types
// ============================================

/** خيارات تصدير التقارير */
export interface ExportOptions {
  format: 'excel' | 'pdf' | 'csv';
  date_from?: string;
  date_to?: string;
  include_charts?: boolean;
  language?: 'ar' | 'en';
}

/** أنواع التقارير القابلة للتصدير */
export type ReportType =
  | 'attendance_summary'
  | 'attendance_detailed'
  | 'leave_summary'
  | 'payroll_summary'
  | 'performance_summary'
  | 'employee_directory';

/** طلب تصدير تقرير */
export interface ExportReportRequest {
  report_type: ReportType;
  options: ExportOptions;
  employee_ids?: string[]; // إذا كان فارغاً = جميع الموظفين
}

// ============================================
// 📱 Quick Actions Types
// ============================================

/** الإجراءات السريعة */
export interface QuickAction {
  id: string;
  label: string;
  label_ar: string;
  icon: string;
  color: string;
  action: string;
  requires_permission?: string;
}

/** الإجراءات السريعة الافتراضية */
export const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'add_employee',
    label: 'Add Employee',
    label_ar: 'إضافة موظف',
    icon: 'user-plus',
    color: '#10B981',
    action: 'add_employee',
    requires_permission: 'manageEmployees',
  },
  {
    id: 'record_attendance',
    label: 'Record Attendance',
    label_ar: 'تسجيل حضور',
    icon: 'clock',
    color: '#3B82F6',
    action: 'record_attendance',
    requires_permission: 'manageEmployees',
  },
  {
    id: 'approve_leave',
    label: 'Approve Leaves',
    label_ar: 'الموافقة على الإجازات',
    icon: 'check-circle',
    color: '#8B5CF6',
    action: 'approve_leave',
    requires_permission: 'manageEmployees',
  },
  {
    id: 'process_payroll',
    label: 'Process Payroll',
    label_ar: 'معالجة الرواتب',
    icon: 'wallet',
    color: '#F59E0B',
    action: 'process_payroll',
    requires_permission: 'manageEmployees',
  },
  {
    id: 'create_review',
    label: 'Create Review',
    label_ar: 'إنشاء تقييم',
    icon: 'star',
    color: '#EC4899',
    action: 'create_review',
    requires_permission: 'manageEmployees',
  },
  {
    id: 'export_report',
    label: 'Export Report',
    label_ar: 'تصدير تقرير',
    icon: 'download',
    color: '#06B6D4',
    action: 'export_report',
    requires_permission: 'viewReports',
  },
];

// ============================================
// 📊 Widget Types
// ============================================

/** أنواع الويدجت */
export type WidgetType =
  | 'attendance_overview'
  | 'leave_requests'
  | 'payroll_summary'
  | 'performance_overview'
  | 'alerts'
  | 'quick_actions'
  | 'birthday_calendar'
  | 'new_employees';

/** إعدادات الويدجت */
export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  title_ar: string;
  size: 'small' | 'medium' | 'large';
  position: {
    row: number;
    col: number;
  };
  is_visible: boolean;
  refresh_interval?: number; // بالثواني
}

/** تخطيط لوحة التحكم */
export interface DashboardLayout {
  user_id: string;
  widgets: WidgetConfig[];
  updated_at: string;
}

// ============================================
// 🔔 Notification Types
// ============================================

/** أنواع الإشعارات */
export type HRNotificationType =
  | 'leave_request'
  | 'leave_approved'
  | 'leave_rejected'
  | 'document_expiring'
  | 'review_due'
  | 'goal_overdue'
  | 'payroll_ready'
  | 'warning_issued'
  | 'birthday';

/** إشعار HR */
export interface HRNotification {
  id: string;
  type: HRNotificationType;
  title: string;
  message: string;
  employee_id?: string;
  employee_name?: string;
  action_url?: string;
  is_read: boolean;
  created_at: string;
}
