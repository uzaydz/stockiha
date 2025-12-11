/**
 * 📅 Attendance Service - خدمة الحضور والانصراف
 */

import { supabase } from '@/lib/supabase';
import type {
  EmployeeAttendance,
  AttendanceWithEmployee,
  AttendanceLocation,
  CheckInInput,
  CheckOutInput,
  ManualAttendanceInput,
  AttendanceFilter,
  CheckInResponse,
  CheckOutResponse,
  DailyAttendanceStats,
  EmployeeAttendanceStats,
  MonthlyAttendanceSummary,
} from '@/types/hr/attendance';

// ============================================
// 📥 Check In / Check Out
// ============================================

/**
 * تسجيل حضور الموظف
 */
export async function recordCheckIn(input: CheckInInput): Promise<CheckInResponse> {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();

  // جلب معلومات الموظف
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', input.employee_id)
    .single();

  if (userError || !userData) {
    return { success: false, error: 'الموظف غير موجود' };
  }

  // التحقق من عدم وجود سجل حضور اليوم
  const { data: existingRecord } = await supabase
    .from('employee_attendance')
    .select('id')
    .eq('employee_id', input.employee_id)
    .eq('attendance_date', today)
    .single();

  if (existingRecord) {
    return { success: false, error: 'تم تسجيل الحضور مسبقاً اليوم' };
  }

  // إنشاء سجل حضور جديد
  const { data, error } = await supabase
    .from('employee_attendance')
    .insert({
      employee_id: input.employee_id,
      organization_id: userData.organization_id,
      attendance_date: today,
      check_in_time: now,
      check_in_location: input.location || null,
      check_in_device: input.device || null,
      check_in_photo_url: input.photo_url || null,
      status: 'present',
    })
    .select()
    .single();

  if (error) {
    console.error('Error recording check-in:', error);
    return { success: false, error: error.message };
  }

  return { success: true, attendance_id: data?.id };
}

/**
 * تسجيل انصراف الموظف
 */
export async function recordCheckOut(input: CheckOutInput): Promise<CheckOutResponse> {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();

  // جلب سجل الحضور اليوم
  const { data: attendanceRecord, error: fetchError } = await supabase
    .from('employee_attendance')
    .select('id, check_in_time')
    .eq('employee_id', input.employee_id)
    .eq('attendance_date', today)
    .single();

  if (fetchError || !attendanceRecord) {
    return { success: false, error: 'لم يتم تسجيل الحضور اليوم' };
  }

  // حساب مدة العمل
  const checkInTime = new Date(attendanceRecord.check_in_time);
  const checkOutTime = new Date(now);
  const workDurationMinutes = Math.round((checkOutTime.getTime() - checkInTime.getTime()) / 60000);

  // تحديث سجل الحضور بوقت الانصراف
  const { error } = await supabase
    .from('employee_attendance')
    .update({
      check_out_time: now,
      check_out_location: input.location || null,
      check_out_device: input.device || null,
      check_out_photo_url: input.photo_url || null,
      work_duration_minutes: workDurationMinutes,
      updated_at: now,
    })
    .eq('id', attendanceRecord.id);

  if (error) {
    console.error('Error recording check-out:', error);
    return { success: false, error: error.message };
  }

  return { success: true, attendance_id: attendanceRecord.id };
}

// ============================================
// 📋 CRUD Operations
// ============================================

/**
 * جلب سجلات الحضور
 */
export async function getAttendanceRecords(
  filter: AttendanceFilter,
  page: number = 1,
  perPage: number = 50
): Promise<{ data: AttendanceWithEmployee[]; total: number }> {
  let query = supabase
    .from('employee_attendance')
    .select(`
      *,
      employee:users!employee_id(id, name, email, avatar_url, job_title),
      shift:work_shifts!shift_id(id, name, start_time, end_time)
    `, { count: 'exact' });

  // تطبيق الفلاتر
  if (filter.employee_id) {
    query = query.eq('employee_id', filter.employee_id);
  }
  if (filter.organization_id) {
    query = query.eq('organization_id', filter.organization_id);
  }
  if (filter.date_from) {
    query = query.gte('attendance_date', filter.date_from);
  }
  if (filter.date_to) {
    query = query.lte('attendance_date', filter.date_to);
  }
  if (filter.status) {
    if (Array.isArray(filter.status)) {
      query = query.in('status', filter.status);
    } else {
      query = query.eq('status', filter.status);
    }
  }
  if (filter.shift_id) {
    query = query.eq('shift_id', filter.shift_id);
  }

  // ترتيب وتصفح
  query = query
    .order('attendance_date', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching attendance records:', error);
    return { data: [], total: 0 };
  }

  return {
    data: (data || []) as AttendanceWithEmployee[],
    total: count || 0,
  };
}

/**
 * جلب سجل حضور اليوم للموظف
 */
export async function getTodayAttendance(
  employeeId: string
): Promise<EmployeeAttendance | null> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('employee_attendance')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('attendance_date', today)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching today attendance:', error);
    return null;
  }

  return data as EmployeeAttendance | null;
}

/**
 * إنشاء سجل حضور يدوي
 */
export async function createManualAttendance(
  input: ManualAttendanceInput
): Promise<{ success: boolean; error?: string }> {
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', input.employee_id)
    .single();

  if (!userData) {
    return { success: false, error: 'الموظف غير موجود' };
  }

  const { error } = await supabase.from('employee_attendance').upsert(
    {
      employee_id: input.employee_id,
      organization_id: userData.organization_id,
      attendance_date: input.attendance_date,
      check_in_time: input.check_in_time,
      check_out_time: input.check_out_time,
      status: input.status,
      notes: input.notes,
      is_manual_entry: true,
    },
    { onConflict: 'employee_id,attendance_date' }
  );

  if (error) {
    console.error('Error creating manual attendance:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * تحديث سجل الحضور
 */
export async function updateAttendance(
  id: string,
  updates: Partial<EmployeeAttendance>
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('employee_attendance')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Error updating attendance:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================
// 📊 Statistics
// ============================================

/**
 * جلب إحصائيات الحضور اليومية للمنظمة
 */
export async function getDailyAttendanceStats(
  organizationId: string,
  date: string = new Date().toISOString().split('T')[0]
): Promise<DailyAttendanceStats> {
  // جلب إجمالي الموظفين
  const { count: totalEmployees } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .eq('role', 'employee');

  // جلب إحصائيات الحضور
  const { data: attendanceData } = await supabase
    .from('employee_attendance')
    .select('status')
    .eq('organization_id', organizationId)
    .eq('attendance_date', date);

  const stats: DailyAttendanceStats = {
    date,
    total_employees: totalEmployees || 0,
    present: 0,
    absent: 0,
    late: 0,
    on_leave: 0,
    remote: 0,
    not_checked_in: 0,
    attendance_rate: 0,
  };

  if (attendanceData) {
    attendanceData.forEach((record) => {
      switch (record.status) {
        case 'present':
          stats.present++;
          break;
        case 'absent':
          stats.absent++;
          break;
        case 'late':
          stats.late++;
          stats.present++; // المتأخر يعتبر حاضر أيضاً
          break;
        case 'on_leave':
        case 'sick_leave':
          stats.on_leave++;
          break;
        case 'remote':
          stats.remote++;
          stats.present++;
          break;
      }
    });
  }

  stats.not_checked_in = Math.max(
    0,
    stats.total_employees - (attendanceData?.length || 0)
  );
  stats.attendance_rate =
    stats.total_employees > 0
      ? Math.round((stats.present / stats.total_employees) * 100 * 100) / 100
      : 0;

  return stats;
}

/**
 * جلب إحصائيات حضور الموظف
 */
export async function getEmployeeAttendanceStats(
  employeeId: string,
  startDate: string,
  endDate: string
): Promise<EmployeeAttendanceStats> {
  const { data } = await supabase
    .from('employee_attendance')
    .select('*')
    .eq('employee_id', employeeId)
    .gte('attendance_date', startDate)
    .lte('attendance_date', endDate);

  const stats: EmployeeAttendanceStats = {
    employee_id: employeeId,
    period_start: startDate,
    period_end: endDate,
    total_days: data?.length || 0,
    present_days: 0,
    absent_days: 0,
    late_days: 0,
    on_leave_days: 0,
    total_work_hours: 0,
    total_overtime_hours: 0,
    attendance_rate: 0,
  };

  if (data) {
    data.forEach((record) => {
      switch (record.status) {
        case 'present':
          stats.present_days++;
          break;
        case 'absent':
          stats.absent_days++;
          break;
        case 'late':
          stats.late_days++;
          stats.present_days++;
          break;
        case 'on_leave':
        case 'sick_leave':
          stats.on_leave_days++;
          break;
      }
      stats.total_work_hours += (record.work_duration_minutes || 0) / 60;
      stats.total_overtime_hours += (record.overtime_minutes || 0) / 60;
    });
  }

  const workingDays = stats.present_days + stats.absent_days + stats.late_days;
  stats.attendance_rate =
    workingDays > 0
      ? Math.round((stats.present_days / workingDays) * 100 * 100) / 100
      : 0;

  return stats;
}

/**
 * جلب ملخص الحضور الشهري للموظف
 */
export async function getMonthlyAttendanceSummary(
  employeeId: string,
  month: number,
  year: number
): Promise<MonthlyAttendanceSummary> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  const { data } = await supabase
    .from('employee_attendance')
    .select('*')
    .eq('employee_id', employeeId)
    .gte('attendance_date', startDate)
    .lte('attendance_date', endDate);

  const summary: MonthlyAttendanceSummary = {
    month,
    year,
    working_days: 0,
    present_days: 0,
    absent_days: 0,
    late_count: 0,
    total_late_minutes: 0,
    overtime_hours: 0,
    attendance_percentage: 0,
  };

  if (data) {
    data.forEach((record) => {
      summary.working_days++;
      if (record.status === 'present' || record.status === 'late') {
        summary.present_days++;
      }
      if (record.status === 'absent') {
        summary.absent_days++;
      }
      if (record.status === 'late' || record.late_minutes > 0) {
        summary.late_count++;
        summary.total_late_minutes += record.late_minutes || 0;
      }
      summary.overtime_hours += (record.overtime_minutes || 0) / 60;
    });
  }

  summary.attendance_percentage =
    summary.working_days > 0
      ? Math.round((summary.present_days / summary.working_days) * 100 * 100) / 100
      : 0;

  return summary;
}

// ============================================
// 🔍 Queries
// ============================================

/**
 * جلب الموظفين الذين لم يسجلوا حضور اليوم
 */
export async function getEmployeesNotCheckedIn(
  organizationId: string
): Promise<{ id: string; name: string; email: string }[]> {
  const today = new Date().toISOString().split('T')[0];

  // جلب جميع الموظفين النشطين
  const { data: allEmployees } = await supabase
    .from('users')
    .select('id, name, email')
    .eq('organization_id', organizationId)
    .eq('is_active', true);

  if (!allEmployees || allEmployees.length === 0) {
    return [];
  }

  // جلب الموظفين الذين سجلوا حضورهم اليوم
  const { data: checkedInEmployees } = await supabase
    .from('employee_attendance')
    .select('employee_id')
    .eq('organization_id', organizationId)
    .eq('attendance_date', today);

  const checkedInIds = new Set(checkedInEmployees?.map((e) => e.employee_id) || []);

  // فلترة الموظفين الذين لم يسجلوا حضورهم
  return allEmployees.filter((emp) => !checkedInIds.has(emp.id));
}

/**
 * جلب سجلات الحضور للأسبوع الحالي
 */
export async function getWeeklyAttendance(
  organizationId: string
): Promise<{ date: string; day_name: string; present: number; absent: number; late: number }[]> {
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const { data } = await supabase
    .from('employee_attendance')
    .select('attendance_date, status')
    .eq('organization_id', organizationId)
    .gte('attendance_date', weekAgo.toISOString().split('T')[0])
    .lte('attendance_date', today.toISOString().split('T')[0]);

  // تجميع البيانات حسب اليوم
  const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const grouped: Record<string, { present: number; absent: number; late: number }> = {};

  data?.forEach((record) => {
    if (!grouped[record.attendance_date]) {
      grouped[record.attendance_date] = { present: 0, absent: 0, late: 0 };
    }
    if (record.status === 'present') grouped[record.attendance_date].present++;
    if (record.status === 'absent') grouped[record.attendance_date].absent++;
    if (record.status === 'late') {
      grouped[record.attendance_date].late++;
      grouped[record.attendance_date].present++;
    }
  });

  return Object.entries(grouped).map(([date, stats]) => ({
    date,
    day_name: dayNames[new Date(date).getDay()],
    ...stats,
  }));
}
