/**
 * ⏰ Shifts Service - خدمة الورديات
 */

import { supabase } from '@/lib/supabase';
import type {
  WorkShift,
  EmployeeShiftAssignment,
  ShiftAssignmentWithDetails,
  OfficialHoliday,
  DayOfWeek,
  CreateShiftInput,
  UpdateShiftInput,
  AssignShiftInput,
  CreateHolidayInput,
  ShiftStats,
  WeeklyShiftSchedule,
  ShiftTimeInfo,
} from '@/types/hr/shifts';

// ============================================
// 📋 Work Shifts CRUD
// ============================================

/**
 * جلب ورديات المنظمة
 */
export async function getWorkShifts(
  organizationId: string,
  activeOnly: boolean = true
): Promise<WorkShift[]> {
  let query = supabase
    .from('work_shifts')
    .select('*')
    .eq('organization_id', organizationId);

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query.order('name');

  if (error) {
    console.error('Error fetching work shifts:', error);
    return [];
  }

  return data as WorkShift[];
}

/**
 * جلب وردية محددة
 */
export async function getWorkShift(id: string): Promise<WorkShift | null> {
  const { data, error } = await supabase
    .from('work_shifts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching work shift:', error);
    return null;
  }

  return data as WorkShift;
}

/**
 * إنشاء وردية جديدة
 */
export async function createWorkShift(
  organizationId: string,
  input: CreateShiftInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  // إذا كانت افتراضية، إلغاء الافتراضي من الورديات الأخرى
  if (input.is_default) {
    await supabase
      .from('work_shifts')
      .update({ is_default: false })
      .eq('organization_id', organizationId);
  }

  const { data, error } = await supabase
    .from('work_shifts')
    .insert({
      organization_id: organizationId,
      name: input.name,
      name_ar: input.name_ar,
      start_time: input.start_time,
      end_time: input.end_time,
      break_duration_minutes: input.break_duration_minutes || 60,
      grace_period_minutes: input.grace_period_minutes || 15,
      overtime_rate: input.overtime_rate || 1.5,
      color: input.color || '#3B82F6',
      is_default: input.is_default || false,
      is_active: true,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating work shift:', error);
    return { success: false, error: error.message };
  }

  return { success: true, id: data.id };
}

/**
 * تحديث وردية
 */
export async function updateWorkShift(
  id: string,
  updates: UpdateShiftInput
): Promise<{ success: boolean; error?: string }> {
  if (updates.is_default) {
    // جلب organization_id أولاً
    const { data: shift } = await supabase
      .from('work_shifts')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (shift) {
      await supabase
        .from('work_shifts')
        .update({ is_default: false })
        .eq('organization_id', shift.organization_id);
    }
  }

  const { error } = await supabase
    .from('work_shifts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Error updating work shift:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * حذف وردية (تعطيل)
 */
export async function deleteWorkShift(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('work_shifts')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Error deleting work shift:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * جلب الوردية الافتراضية
 */
export async function getDefaultShift(
  organizationId: string
): Promise<WorkShift | null> {
  const { data, error } = await supabase
    .from('work_shifts')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_default', true)
    .eq('is_active', true)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching default shift:', error);
    return null;
  }

  return data as WorkShift | null;
}

// ============================================
// 👤 Employee Shift Assignments
// ============================================

/**
 * تعيين وردية لموظف
 */
export async function assignShiftToEmployee(
  organizationId: string,
  input: AssignShiftInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  // إلغاء التعيين الحالي
  await supabase
    .from('employee_shift_assignments')
    .update({
      is_active: false,
      end_date: input.start_date,
      updated_at: new Date().toISOString(),
    })
    .eq('employee_id', input.employee_id)
    .eq('is_active', true);

  // إنشاء التعيين الجديد
  const { data, error } = await supabase
    .from('employee_shift_assignments')
    .insert({
      employee_id: input.employee_id,
      shift_id: input.shift_id,
      organization_id: organizationId,
      start_date: input.start_date,
      end_date: input.end_date,
      days_of_week: input.days_of_week,
      is_active: true,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error assigning shift:', error);
    return { success: false, error: error.message };
  }

  return { success: true, id: data.id };
}

/**
 * جلب تعيينات الورديات للموظف
 */
export async function getEmployeeShiftAssignments(
  employeeId: string,
  activeOnly: boolean = true
): Promise<ShiftAssignmentWithDetails[]> {
  let query = supabase
    .from('employee_shift_assignments')
    .select(`
      *,
      shift:work_shifts(*)
    `)
    .eq('employee_id', employeeId);

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query.order('start_date', { ascending: false });

  if (error) {
    console.error('Error fetching employee shift assignments:', error);
    return [];
  }

  return data as ShiftAssignmentWithDetails[];
}

/**
 * جلب الوردية الحالية للموظف
 */
export async function getCurrentEmployeeShift(
  employeeId: string
): Promise<ShiftAssignmentWithDetails | null> {
  const today = new Date().toISOString().split('T')[0];
  const dayOfWeek = new Date().getDay() as DayOfWeek;

  const { data, error } = await supabase
    .from('employee_shift_assignments')
    .select(`
      *,
      shift:work_shifts(*)
    `)
    .eq('employee_id', employeeId)
    .eq('is_active', true)
    .lte('start_date', today)
    .or(`end_date.is.null,end_date.gte.${today}`)
    .contains('days_of_week', [dayOfWeek])
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching current shift:', error);
    return null;
  }

  return data as ShiftAssignmentWithDetails | null;
}

/**
 * جلب جميع تعيينات الورديات للمنظمة
 */
export async function getOrganizationShiftAssignments(
  organizationId: string,
  shiftId?: string
): Promise<ShiftAssignmentWithDetails[]> {
  let query = supabase
    .from('employee_shift_assignments')
    .select(`
      *,
      shift:work_shifts(*),
      employee:users!employee_id(id, name, email, avatar_url)
    `)
    .eq('organization_id', organizationId)
    .eq('is_active', true);

  if (shiftId) {
    query = query.eq('shift_id', shiftId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching organization shift assignments:', error);
    return [];
  }

  return data as ShiftAssignmentWithDetails[];
}

/**
 * إلغاء تعيين وردية
 */
export async function removeShiftAssignment(
  assignmentId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('employee_shift_assignments')
    .update({
      is_active: false,
      end_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    })
    .eq('id', assignmentId);

  if (error) {
    console.error('Error removing shift assignment:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================
// 📅 Official Holidays
// ============================================

/**
 * جلب العطلات الرسمية
 */
export async function getOfficialHolidays(
  organizationId: string,
  year?: number
): Promise<OfficialHoliday[]> {
  let query = supabase
    .from('official_holidays')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true);

  if (year) {
    query = query
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31`);
  }

  const { data, error } = await query.order('date');

  if (error) {
    console.error('Error fetching holidays:', error);
    return [];
  }

  return data as OfficialHoliday[];
}

/**
 * إنشاء عطلة رسمية
 */
export async function createOfficialHoliday(
  organizationId: string,
  input: CreateHolidayInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const { data, error } = await supabase
    .from('official_holidays')
    .insert({
      organization_id: organizationId,
      ...input,
      is_active: true,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating holiday:', error);
    return { success: false, error: error.message };
  }

  return { success: true, id: data.id };
}

/**
 * تحديث عطلة
 */
export async function updateOfficialHoliday(
  id: string,
  updates: Partial<CreateHolidayInput>
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('official_holidays')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Error updating holiday:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * حذف عطلة
 */
export async function deleteOfficialHoliday(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('official_holidays')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting holiday:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * التحقق مما إذا كان اليوم عطلة
 */
export async function isHoliday(
  organizationId: string,
  date: string
): Promise<{ isHoliday: boolean; holiday?: OfficialHoliday }> {
  const { data, error } = await supabase
    .from('official_holidays')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('date', date)
    .eq('is_active', true)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking holiday:', error);
  }

  return {
    isHoliday: !!data,
    holiday: data as OfficialHoliday | undefined,
  };
}

// ============================================
// 📊 Statistics & Reports
// ============================================

/**
 * جلب إحصائيات الورديات
 */
export async function getShiftStats(
  organizationId: string
): Promise<ShiftStats[]> {
  const { data: shifts } = await supabase
    .from('work_shifts')
    .select(`
      id,
      name,
      employee_shift_assignments!inner(employee_id)
    `)
    .eq('organization_id', organizationId)
    .eq('is_active', true);

  // يمكن إضافة المزيد من الإحصائيات هنا
  const stats: ShiftStats[] = (shifts || []).map((s) => ({
    shift_id: s.id,
    shift_name: s.name,
    total_employees: s.employee_shift_assignments?.length || 0,
    avg_attendance_rate: 0, // يمكن حسابه من جدول الحضور
    avg_late_minutes: 0,
    total_overtime_hours: 0,
  }));

  return stats;
}

/**
 * جلب جدول الورديات الأسبوعي
 */
export async function getWeeklyShiftSchedule(
  organizationId: string,
  startDate: string
): Promise<WeeklyShiftSchedule[]> {
  const { data: employees } = await supabase
    .from('users')
    .select('id, name')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .eq('role', 'employee');

  if (!employees) return [];

  const schedules: WeeklyShiftSchedule[] = [];

  for (const employee of employees) {
    const assignment = await getCurrentEmployeeShift(employee.id);

    const schedule: WeeklyShiftSchedule = {
      employee_id: employee.id,
      employee_name: employee.name,
      schedule: {},
    };

    if (assignment && assignment.shift) {
      (assignment.days_of_week as DayOfWeek[]).forEach((day) => {
        schedule.schedule[day] = {
          shift_id: assignment.shift!.id,
          shift_name: assignment.shift!.name,
          start_time: assignment.shift!.start_time,
          end_time: assignment.shift!.end_time,
        };
      });
    }

    schedules.push(schedule);
  }

  return schedules;
}

/**
 * جلب معلومات وقت الوردية
 */
export async function getShiftTimeInfo(
  shiftId: string
): Promise<ShiftTimeInfo | null> {
  const shift = await getWorkShift(shiftId);

  if (!shift) return null;

  // حساب ساعات العمل
  const startParts = shift.start_time.split(':').map(Number);
  const endParts = shift.end_time.split(':').map(Number);

  const startMinutes = startParts[0] * 60 + startParts[1];
  const endMinutes = endParts[0] * 60 + endParts[1];

  let totalMinutes = endMinutes - startMinutes;
  if (totalMinutes < 0) totalMinutes += 24 * 60; // للورديات الليلية

  const workMinutes = totalMinutes - shift.break_duration_minutes;

  // حساب نهاية فترة السماح
  const graceMinutes = startMinutes + shift.grace_period_minutes;
  const graceHours = Math.floor(graceMinutes / 60);
  const graceRemaining = graceMinutes % 60;
  const gracePeriodEnd = `${String(graceHours).padStart(2, '0')}:${String(graceRemaining).padStart(2, '0')}:00`;

  return {
    shift_id: shift.id,
    expected_check_in: shift.start_time,
    expected_check_out: shift.end_time,
    grace_period_end: gracePeriodEnd,
    total_work_hours: workMinutes / 60,
    break_hours: shift.break_duration_minutes / 60,
  };
}

// ============================================
// 🛠️ Utility Functions
// ============================================

/**
 * إنشاء الورديات الافتراضية
 */
export async function initializeDefaultShifts(
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  const defaultShifts = [
    {
      name: 'Morning Shift',
      name_ar: 'وردية صباحية',
      start_time: '08:00:00',
      end_time: '16:00:00',
      break_duration_minutes: 60,
      grace_period_minutes: 15,
      overtime_rate: 1.5,
      color: '#10B981',
      is_default: true,
    },
    {
      name: 'Evening Shift',
      name_ar: 'وردية مسائية',
      start_time: '16:00:00',
      end_time: '00:00:00',
      break_duration_minutes: 60,
      grace_period_minutes: 15,
      overtime_rate: 1.5,
      color: '#F59E0B',
      is_default: false,
    },
    {
      name: 'Night Shift',
      name_ar: 'وردية ليلية',
      start_time: '00:00:00',
      end_time: '08:00:00',
      break_duration_minutes: 60,
      grace_period_minutes: 15,
      overtime_rate: 2.0, // معدل أعلى للوردية الليلية
      color: '#6366F1',
      is_default: false,
    },
  ];

  const shiftsToInsert = defaultShifts.map((s) => ({
    ...s,
    organization_id: organizationId,
    is_active: true,
  }));

  const { error } = await supabase.from('work_shifts').insert(shiftsToInsert);

  if (error) {
    console.error('Error initializing default shifts:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * تعيين الوردية الافتراضية لموظف جديد
 */
export async function assignDefaultShiftToNewEmployee(
  employeeId: string,
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  const defaultShift = await getDefaultShift(organizationId);

  if (!defaultShift) {
    return { success: false, error: 'لا توجد وردية افتراضية' };
  }

  return assignShiftToEmployee(organizationId, {
    employee_id: employeeId,
    shift_id: defaultShift.id,
    start_date: new Date().toISOString().split('T')[0],
    days_of_week: [0, 1, 2, 3, 4, 5] as DayOfWeek[], // الأحد إلى الجمعة
  });
}
