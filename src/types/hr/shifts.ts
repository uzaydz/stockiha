/**
 * ⏰ Work Shifts Types - أنواع الورديات
 */

// ============================================
// 🎯 Enums & Constants
// ============================================

/** أيام الأسبوع */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** تسميات أيام الأسبوع بالعربية */
export const DAY_OF_WEEK_LABELS: Record<DayOfWeek, string> = {
  0: 'الأحد',
  1: 'الإثنين',
  2: 'الثلاثاء',
  3: 'الأربعاء',
  4: 'الخميس',
  5: 'الجمعة',
  6: 'السبت',
};

/** تسميات أيام الأسبوع مختصرة */
export const DAY_OF_WEEK_SHORT: Record<DayOfWeek, string> = {
  0: 'أحد',
  1: 'إثن',
  2: 'ثلا',
  3: 'أرب',
  4: 'خمي',
  5: 'جمع',
  6: 'سبت',
};

// ============================================
// 📋 Main Types
// ============================================

/** الوردية */
export interface WorkShift {
  id: string;
  organization_id: string;
  name: string;
  name_ar?: string | null;

  // الأوقات
  start_time: string; // TIME format: "HH:MM:SS"
  end_time: string;
  break_duration_minutes: number;
  grace_period_minutes: number; // فترة السماح للتأخير

  // الإعدادات
  overtime_rate: number; // معدل الأجر الإضافي (1.5 = 150%)
  is_active: boolean;
  is_default: boolean;
  color: string;

  // التواريخ
  created_at: string;
  updated_at: string;
}

/** تعيين وردية للموظف */
export interface EmployeeShiftAssignment {
  id: string;
  employee_id: string;
  shift_id: string;
  organization_id: string;

  // الفترة
  start_date: string;
  end_date?: string | null; // NULL = مستمر

  // أيام العمل
  days_of_week: DayOfWeek[];

  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** تعيين الوردية مع البيانات الكاملة */
export interface ShiftAssignmentWithDetails extends EmployeeShiftAssignment {
  shift?: WorkShift;
  employee?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string | null;
  };
}

/** العطلة الرسمية */
export interface OfficialHoliday {
  id: string;
  organization_id: string;
  name: string;
  name_ar: string;
  date: string;
  is_recurring: boolean; // تتكرر كل سنة
  is_half_day: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// 📝 Input Types
// ============================================

/** إدخال إنشاء وردية */
export interface CreateShiftInput {
  name: string;
  name_ar?: string;
  start_time: string;
  end_time: string;
  break_duration_minutes?: number;
  grace_period_minutes?: number;
  overtime_rate?: number;
  color?: string;
  is_default?: boolean;
}

/** إدخال تحديث وردية */
export interface UpdateShiftInput extends Partial<CreateShiftInput> {
  is_active?: boolean;
}

/** إدخال تعيين وردية لموظف */
export interface AssignShiftInput {
  employee_id: string;
  shift_id: string;
  start_date: string;
  end_date?: string;
  days_of_week: DayOfWeek[];
}

/** إدخال إنشاء عطلة */
export interface CreateHolidayInput {
  name: string;
  name_ar: string;
  date: string;
  is_recurring?: boolean;
  is_half_day?: boolean;
}

// ============================================
// 📊 Statistics Types
// ============================================

/** إحصائيات الوردية */
export interface ShiftStats {
  shift_id: string;
  shift_name: string;
  total_employees: number;
  avg_attendance_rate: number;
  avg_late_minutes: number;
  total_overtime_hours: number;
}

/** جدول الورديات الأسبوعي */
export interface WeeklyShiftSchedule {
  employee_id: string;
  employee_name: string;
  schedule: {
    [key in DayOfWeek]?: {
      shift_id: string;
      shift_name: string;
      start_time: string;
      end_time: string;
      is_holiday?: boolean;
      is_on_leave?: boolean;
    } | null;
  };
}

// ============================================
// 🛠️ Helper Types
// ============================================

/** معلومات وقت الوردية */
export interface ShiftTimeInfo {
  shift_id: string;
  expected_check_in: string;
  expected_check_out: string;
  grace_period_end: string;
  total_work_hours: number;
  break_hours: number;
}

/** التحقق من الوقت ضمن الوردية */
export interface ShiftTimeValidation {
  is_within_shift: boolean;
  is_before_shift: boolean;
  is_after_shift: boolean;
  minutes_early?: number;
  minutes_late?: number;
}
