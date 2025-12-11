/**
 * 📅 Attendance Types - أنواع الحضور والانصراف
 */

// ============================================
// 🎯 Enums & Constants
// ============================================

/** حالات الحضور */
export type AttendanceStatus =
  | 'present'      // حاضر
  | 'absent'       // غائب
  | 'late'         // متأخر
  | 'early_leave'  // انصراف مبكر
  | 'half_day'     // نصف يوم
  | 'on_leave'     // في إجازة
  | 'sick_leave'   // إجازة مرضية
  | 'remote'       // عمل عن بعد
  | 'holiday';     // عطلة رسمية

/** ألوان حالات الحضور */
export const ATTENDANCE_STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: '#10B981',     // أخضر
  absent: '#EF4444',      // أحمر
  late: '#F59E0B',        // برتقالي
  early_leave: '#F97316', // برتقالي غامق
  half_day: '#8B5CF6',    // بنفسجي
  on_leave: '#3B82F6',    // أزرق
  sick_leave: '#EC4899',  // وردي
  remote: '#06B6D4',      // سماوي
  holiday: '#6366F1',     // نيلي
};

/** تسميات حالات الحضور بالعربية */
export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: 'حاضر',
  absent: 'غائب',
  late: 'متأخر',
  early_leave: 'انصراف مبكر',
  half_day: 'نصف يوم',
  on_leave: 'في إجازة',
  sick_leave: 'إجازة مرضية',
  remote: 'عمل عن بعد',
  holiday: 'عطلة رسمية',
};

// ============================================
// 📋 Main Types
// ============================================

/** موقع تسجيل الحضور */
export interface AttendanceLocation {
  lat: number;
  lng: number;
  address?: string;
  accuracy?: number;
}

/** سجل الحضور */
export interface EmployeeAttendance {
  id: string;
  employee_id: string;
  organization_id: string;
  shift_id?: string | null;

  // التاريخ والأوقات
  attendance_date: string; // DATE
  check_in_time?: string | null; // TIMESTAMPTZ
  check_out_time?: string | null;
  expected_check_in?: string | null; // TIME
  expected_check_out?: string | null;

  // حسابات الوقت (بالدقائق)
  late_minutes: number;
  early_leave_minutes: number;
  overtime_minutes: number;
  work_duration_minutes: number;
  break_duration_minutes: number;

  // الحالة
  status: AttendanceStatus;

  // معلومات إضافية
  check_in_location?: AttendanceLocation | null;
  check_out_location?: AttendanceLocation | null;
  check_in_device?: string | null;
  check_out_device?: string | null;
  check_in_photo_url?: string | null;
  check_out_photo_url?: string | null;

  // ملاحظات
  notes?: string | null;
  admin_notes?: string | null;
  is_manual_entry: boolean;
  approved_by?: string | null;
  approved_at?: string | null;

  // التواريخ
  created_at: string;
  updated_at: string;
}

/** سجل الحضور مع بيانات الموظف */
export interface AttendanceWithEmployee extends EmployeeAttendance {
  employee?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string | null;
    job_title?: string | null;
  };
  shift?: {
    id: string;
    name: string;
    start_time: string;
    end_time: string;
  };
}

/** تعديل الحضور */
export interface AttendanceAdjustment {
  id: string;
  attendance_id: string;
  adjusted_by: string;
  field_changed: string;
  old_value?: string | null;
  new_value?: string | null;
  reason: string;
  created_at: string;
}

// ============================================
// 📝 Input Types
// ============================================

/** إدخال تسجيل الحضور */
export interface CheckInInput {
  employee_id: string;
  location?: AttendanceLocation;
  device?: string;
  photo_url?: string;
}

/** إدخال تسجيل الانصراف */
export interface CheckOutInput {
  employee_id: string;
  location?: AttendanceLocation;
  device?: string;
  photo_url?: string;
}

/** إدخال تسجيل حضور يدوي */
export interface ManualAttendanceInput {
  employee_id: string;
  attendance_date: string;
  check_in_time?: string;
  check_out_time?: string;
  status: AttendanceStatus;
  notes?: string;
}

/** فلتر الحضور */
export interface AttendanceFilter {
  employee_id?: string;
  organization_id?: string;
  date_from?: string;
  date_to?: string;
  status?: AttendanceStatus | AttendanceStatus[];
  shift_id?: string;
}

// ============================================
// 📊 Statistics Types
// ============================================

/** إحصائيات الحضور اليومية */
export interface DailyAttendanceStats {
  date: string;
  total_employees: number;
  present: number;
  absent: number;
  late: number;
  on_leave: number;
  remote: number;
  not_checked_in: number;
  attendance_rate: number;
}

/** إحصائيات حضور الموظف */
export interface EmployeeAttendanceStats {
  employee_id: string;
  period_start: string;
  period_end: string;
  total_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  on_leave_days: number;
  total_work_hours: number;
  total_overtime_hours: number;
  attendance_rate: number;
  avg_check_in_time?: string;
  avg_check_out_time?: string;
}

/** ملخص الحضور الشهري */
export interface MonthlyAttendanceSummary {
  month: number;
  year: number;
  working_days: number;
  present_days: number;
  absent_days: number;
  late_count: number;
  total_late_minutes: number;
  overtime_hours: number;
  attendance_percentage: number;
}

// ============================================
// 🔔 Response Types
// ============================================

/** استجابة تسجيل الحضور */
export interface CheckInResponse {
  success: boolean;
  attendance_id?: string;
  check_in_time?: string;
  late_minutes?: number;
  status?: AttendanceStatus;
  error?: string;
}

/** استجابة تسجيل الانصراف */
export interface CheckOutResponse {
  success: boolean;
  check_out_time?: string;
  work_duration_minutes?: number;
  early_leave_minutes?: number;
  overtime_minutes?: number;
  error?: string;
}
