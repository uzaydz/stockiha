/**
 * 🏖️ Leave Management Types - أنواع إدارة الإجازات
 */

// ============================================
// 🎯 Enums & Constants
// ============================================

/** حالات طلب الإجازة */
export type LeaveRequestStatus =
  | 'pending'     // في الانتظار
  | 'approved'    // موافق عليه
  | 'rejected'    // مرفوض
  | 'cancelled'   // ملغي
  | 'withdrawn';  // مسحوب من قبل الموظف

/** ألوان حالات الإجازة */
export const LEAVE_STATUS_COLORS: Record<LeaveRequestStatus, string> = {
  pending: '#F59E0B',    // برتقالي
  approved: '#10B981',   // أخضر
  rejected: '#EF4444',   // أحمر
  cancelled: '#6B7280',  // رمادي
  withdrawn: '#9CA3AF',  // رمادي فاتح
};

/** تسميات حالات الإجازة بالعربية */
export const LEAVE_STATUS_LABELS: Record<LeaveRequestStatus, string> = {
  pending: 'في الانتظار',
  approved: 'موافق عليه',
  rejected: 'مرفوض',
  cancelled: 'ملغي',
  withdrawn: 'مسحوب',
};

/** نوع نصف اليوم */
export type HalfDayType = 'morning' | 'afternoon';

/** أكواد أنواع الإجازات الافتراضية */
export type LeaveTypeCode =
  | 'annual'     // سنوية
  | 'sick'       // مرضية
  | 'unpaid'     // بدون راتب
  | 'maternity'  // أمومة
  | 'paternity'  // أبوة
  | 'marriage'   // زواج
  | 'bereavement'// وفاة
  | 'emergency'  // طوارئ
  | 'study'      // دراسية
  | 'hajj'       // حج
  | 'other';     // أخرى

/** أيقونات أنواع الإجازات */
export const LEAVE_TYPE_ICONS: Record<LeaveTypeCode, string> = {
  annual: 'sun',
  sick: 'thermometer',
  unpaid: 'ban',
  maternity: 'baby',
  paternity: 'baby',
  marriage: 'heart',
  bereavement: 'heart-broken',
  emergency: 'alert-triangle',
  study: 'book-open',
  hajj: 'mosque',
  other: 'calendar',
};

// ============================================
// 📋 Main Types
// ============================================

/** نوع الإجازة */
export interface LeaveType {
  id: string;
  organization_id: string;
  name: string;
  name_ar: string;
  code: LeaveTypeCode | string;
  color: string;
  icon: string;

  // الإعدادات
  days_per_year: number; // 0 = غير محدود
  can_carry_forward: boolean;
  max_carry_forward_days: number;
  requires_approval: boolean;
  requires_attachment: boolean;
  min_days_notice: number;
  max_consecutive_days: number;

  // الدفع
  is_paid: boolean;
  pay_percentage: number; // نسبة الراتب المدفوع

  // القيود
  gender_restriction?: 'male' | 'female' | null;
  min_service_months: number;

  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** رصيد إجازات الموظف */
export interface EmployeeLeaveBalance {
  id: string;
  employee_id: string;
  leave_type_id: string;
  organization_id: string;

  year: number;
  total_days: number;     // الرصيد الإجمالي
  used_days: number;      // المستخدم
  pending_days: number;   // في انتظار الموافقة
  carried_forward_days: number; // المرحل من السنة السابقة

  created_at: string;
  updated_at: string;
}

/** رصيد الإجازات مع نوع الإجازة */
export interface LeaveBalanceWithType extends EmployeeLeaveBalance {
  leave_type?: LeaveType;
  remaining_days: number; // محسوب: total - used - pending
}

/** طلب الإجازة */
export interface LeaveRequest {
  id: string;
  employee_id: string;
  organization_id: string;
  leave_type_id: string;

  // التواريخ
  start_date: string;
  end_date: string;
  total_days: number;
  is_half_day: boolean;
  half_day_type?: HalfDayType | null;

  // الحالة
  status: LeaveRequestStatus;

  // التفاصيل
  reason?: string | null;
  attachment_urls?: string[] | null;

  // الموافقة
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;

  // البديل
  substitute_employee_id?: string | null;
  handover_notes?: string | null;

  // الإلغاء
  cancelled_by?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;

  created_at: string;
  updated_at: string;
}

/** طلب الإجازة مع التفاصيل */
export interface LeaveRequestWithDetails extends LeaveRequest {
  employee?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string | null;
    job_title?: string | null;
  };
  leave_type?: LeaveType;
  reviewer?: {
    id: string;
    name: string;
  };
  substitute?: {
    id: string;
    name: string;
  };
}

// ============================================
// 📝 Input Types
// ============================================

/** إدخال إنشاء نوع إجازة */
export interface CreateLeaveTypeInput {
  name: string;
  name_ar: string;
  code: string;
  color?: string;
  icon?: string;
  days_per_year?: number;
  can_carry_forward?: boolean;
  max_carry_forward_days?: number;
  requires_approval?: boolean;
  requires_attachment?: boolean;
  min_days_notice?: number;
  max_consecutive_days?: number;
  is_paid?: boolean;
  pay_percentage?: number;
  gender_restriction?: 'male' | 'female';
  min_service_months?: number;
}

/** إدخال طلب إجازة */
export interface SubmitLeaveRequestInput {
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  reason?: string;
  is_half_day?: boolean;
  half_day_type?: HalfDayType;
  substitute_employee_id?: string;
  handover_notes?: string;
  attachment_urls?: string[];
}

/** إدخال مراجعة طلب إجازة */
export interface ReviewLeaveRequestInput {
  request_id: string;
  approved: boolean;
  reviewer_id: string;
  notes?: string;
}

/** فلتر طلبات الإجازة */
export interface LeaveRequestFilter {
  employee_id?: string;
  leave_type_id?: string;
  status?: LeaveRequestStatus | LeaveRequestStatus[];
  date_from?: string;
  date_to?: string;
  year?: number;
}

// ============================================
// 📊 Statistics Types
// ============================================

/** إحصائيات الإجازات للموظف */
export interface EmployeeLeaveStats {
  employee_id: string;
  year: number;
  balances: LeaveBalanceWithType[];
  total_taken_days: number;
  total_remaining_days: number;
  upcoming_leaves: LeaveRequest[];
}

/** إحصائيات الإجازات للمنظمة */
export interface OrganizationLeaveStats {
  organization_id: string;
  period: {
    start: string;
    end: string;
  };
  total_requests: number;
  pending_requests: number;
  approved_requests: number;
  rejected_requests: number;
  employees_on_leave_today: number;
  most_used_leave_type: {
    id: string;
    name: string;
    count: number;
  };
  leave_by_type: {
    leave_type_id: string;
    leave_type_name: string;
    total_days: number;
    total_requests: number;
  }[];
}

/** تقويم الإجازات */
export interface LeaveCalendarEntry {
  date: string;
  employees_on_leave: {
    employee_id: string;
    employee_name: string;
    leave_type: string;
    leave_type_color: string;
    is_half_day: boolean;
  }[];
  is_holiday: boolean;
  holiday_name?: string;
}

// ============================================
// 🔔 Response Types
// ============================================

/** استجابة طلب الإجازة */
export interface SubmitLeaveResponse {
  success: boolean;
  request_id?: string;
  status?: LeaveRequestStatus;
  error?: string;
}

/** استجابة مراجعة الطلب */
export interface ReviewLeaveResponse {
  success: boolean;
  status?: LeaveRequestStatus;
  error?: string;
}

// ============================================
// 📅 Default Leave Types
// ============================================

/** أنواع الإجازات الافتراضية */
export const DEFAULT_LEAVE_TYPES: Omit<LeaveType, 'id' | 'organization_id' | 'created_at' | 'updated_at'>[] = [
  {
    name: 'Annual Leave',
    name_ar: 'إجازة سنوية',
    code: 'annual',
    color: '#10B981',
    icon: 'sun',
    days_per_year: 30,
    can_carry_forward: true,
    max_carry_forward_days: 15,
    requires_approval: true,
    requires_attachment: false,
    min_days_notice: 3,
    max_consecutive_days: 30,
    is_paid: true,
    pay_percentage: 100,
    gender_restriction: null,
    min_service_months: 0,
    is_active: true,
    sort_order: 1,
  },
  {
    name: 'Sick Leave',
    name_ar: 'إجازة مرضية',
    code: 'sick',
    color: '#EF4444',
    icon: 'thermometer',
    days_per_year: 15,
    can_carry_forward: false,
    max_carry_forward_days: 0,
    requires_approval: true,
    requires_attachment: true,
    min_days_notice: 0,
    max_consecutive_days: 15,
    is_paid: true,
    pay_percentage: 100,
    gender_restriction: null,
    min_service_months: 0,
    is_active: true,
    sort_order: 2,
  },
  {
    name: 'Unpaid Leave',
    name_ar: 'إجازة بدون راتب',
    code: 'unpaid',
    color: '#6B7280',
    icon: 'ban',
    days_per_year: 0,
    can_carry_forward: false,
    max_carry_forward_days: 0,
    requires_approval: true,
    requires_attachment: false,
    min_days_notice: 7,
    max_consecutive_days: 60,
    is_paid: false,
    pay_percentage: 0,
    gender_restriction: null,
    min_service_months: 3,
    is_active: true,
    sort_order: 3,
  },
  {
    name: 'Maternity Leave',
    name_ar: 'إجازة أمومة',
    code: 'maternity',
    color: '#EC4899',
    icon: 'baby',
    days_per_year: 98,
    can_carry_forward: false,
    max_carry_forward_days: 0,
    requires_approval: true,
    requires_attachment: true,
    min_days_notice: 30,
    max_consecutive_days: 98,
    is_paid: true,
    pay_percentage: 100,
    gender_restriction: 'female',
    min_service_months: 6,
    is_active: true,
    sort_order: 4,
  },
  {
    name: 'Paternity Leave',
    name_ar: 'إجازة أبوة',
    code: 'paternity',
    color: '#3B82F6',
    icon: 'baby',
    days_per_year: 3,
    can_carry_forward: false,
    max_carry_forward_days: 0,
    requires_approval: true,
    requires_attachment: true,
    min_days_notice: 0,
    max_consecutive_days: 3,
    is_paid: true,
    pay_percentage: 100,
    gender_restriction: 'male',
    min_service_months: 0,
    is_active: true,
    sort_order: 5,
  },
  {
    name: 'Marriage Leave',
    name_ar: 'إجازة زواج',
    code: 'marriage',
    color: '#F472B6',
    icon: 'heart',
    days_per_year: 5,
    can_carry_forward: false,
    max_carry_forward_days: 0,
    requires_approval: true,
    requires_attachment: true,
    min_days_notice: 7,
    max_consecutive_days: 5,
    is_paid: true,
    pay_percentage: 100,
    gender_restriction: null,
    min_service_months: 0,
    is_active: true,
    sort_order: 6,
  },
  {
    name: 'Bereavement Leave',
    name_ar: 'إجازة وفاة',
    code: 'bereavement',
    color: '#374151',
    icon: 'heart-broken',
    days_per_year: 5,
    can_carry_forward: false,
    max_carry_forward_days: 0,
    requires_approval: true,
    requires_attachment: false,
    min_days_notice: 0,
    max_consecutive_days: 5,
    is_paid: true,
    pay_percentage: 100,
    gender_restriction: null,
    min_service_months: 0,
    is_active: true,
    sort_order: 7,
  },
];
