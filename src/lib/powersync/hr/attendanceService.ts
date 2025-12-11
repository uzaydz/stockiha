/**
 * 📅 Attendance Service (PowerSync) - خدمة الحضور والانصراف أوفلاين فيرست
 * v4.0 - 2025-12-10
 */

import { powerSync } from '../PowerSyncService';
import { supabase } from '@/integrations/supabase/client';
import type {
  EmployeeAttendance,
  AttendanceWithEmployee,
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
// 📥 Check In / Check Out (Online-first for RPC calls)
// ============================================

/**
 * تسجيل حضور الموظف
 * This uses RPC for complex logic, falls back to local insert if offline
 */
export async function recordCheckIn(input: CheckInInput): Promise<CheckInResponse> {
  const isOnline = powerSync.isConnected();

  if (isOnline) {
    // Use Supabase RPC for complex check-in logic
    const { data, error } = await supabase.rpc('record_employee_check_in', {
      p_employee_id: input.employee_id,
      p_location: input.location || null,
      p_device: input.device || null,
      p_photo_url: input.photo_url || null,
    });

    if (error) {
      console.error('Error recording check-in:', error);
      return { success: false, error: error.message };
    }

    return data as CheckInResponse;
  } else {
    // Offline: Create a local attendance record
    return await recordCheckInOffline(input);
  }
}

/**
 * تسجيل حضور أوفلاين
 */
async function recordCheckInOffline(input: CheckInInput): Promise<CheckInResponse> {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  // Get employee's organization
  const employee = await powerSync.queryOne<{ organization_id: string }>({
    sql: 'SELECT organization_id FROM users WHERE id = ?',
    parameters: [input.employee_id],
  });

  if (!employee) {
    return { success: false, error: 'الموظف غير موجود' };
  }

  // Check if already checked in today
  const existing = await powerSync.queryOne<{ id: string }>({
    sql: `SELECT id FROM employee_attendance
          WHERE employee_id = ? AND attendance_date = ?`,
    parameters: [input.employee_id, today],
  });

  if (existing) {
    return { success: false, error: 'تم تسجيل الحضور مسبقاً', attendance_id: existing.id };
  }

  // Insert attendance record
  const inserted = await powerSync.mutate({
    table: 'employee_attendance',
    data: {
      id,
      employee_id: input.employee_id,
      organization_id: employee.organization_id,
      attendance_date: today,
      check_in_time: now,
      status: 'present',
      check_in_location: input.location ? JSON.stringify(input.location) : null,
      check_in_device: input.device,
      check_in_photo_url: input.photo_url,
      late_minutes: 0,
      is_manual_entry: false,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    success: inserted,
    attendance_id: id,
    check_in_time: now,
    late_minutes: 0,
    status: 'present',
  };
}

/**
 * تسجيل انصراف الموظف
 */
export async function recordCheckOut(input: CheckOutInput): Promise<CheckOutResponse> {
  const isOnline = powerSync.isConnected();

  if (isOnline) {
    const { data, error } = await supabase.rpc('record_employee_check_out', {
      p_employee_id: input.employee_id,
      p_location: input.location || null,
      p_device: input.device || null,
      p_photo_url: input.photo_url || null,
    });

    if (error) {
      console.error('Error recording check-out:', error);
      return { success: false, error: error.message };
    }

    return data as CheckOutResponse;
  } else {
    return await recordCheckOutOffline(input);
  }
}

/**
 * تسجيل انصراف أوفلاين
 */
async function recordCheckOutOffline(input: CheckOutInput): Promise<CheckOutResponse> {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();

  // Get today's attendance
  const attendance = await powerSync.queryOne<EmployeeAttendance>({
    sql: `SELECT * FROM employee_attendance
          WHERE employee_id = ? AND attendance_date = ?`,
    parameters: [input.employee_id, today],
  });

  if (!attendance) {
    return { success: false, error: 'لا يوجد سجل حضور لهذا اليوم' };
  }

  if (attendance.check_out_time) {
    return { success: false, error: 'تم تسجيل الانصراف مسبقاً' };
  }

  // Calculate work duration
  const checkInTime = new Date(attendance.check_in_time!);
  const checkOutTime = new Date(now);
  const workDurationMinutes = Math.round((checkOutTime.getTime() - checkInTime.getTime()) / 60000);

  const updated = await powerSync.mutate({
    table: 'employee_attendance',
    data: {
      id: attendance.id,
      check_out_time: now,
      work_duration_minutes: workDurationMinutes,
      check_out_location: input.location ? JSON.stringify(input.location) : null,
      check_out_device: input.device,
      check_out_photo_url: input.photo_url,
      updated_at: now,
    },
  });

  return {
    success: updated,
    check_out_time: now,
    work_duration_minutes: workDurationMinutes,
    early_leave_minutes: 0,
    overtime_minutes: 0,
  };
}

// ============================================
// 📋 CRUD Operations (PowerSync)
// ============================================

/**
 * جلب سجلات الحضور من PowerSync
 */
export async function getAttendanceRecords(
  filter: AttendanceFilter,
  page: number = 1,
  perPage: number = 50
): Promise<{ data: AttendanceWithEmployee[]; total: number }> {
  const offset = (page - 1) * perPage;
  let whereClause = '1=1';
  const params: (string | number)[] = [];

  if (filter.organization_id) {
    whereClause += ' AND a.organization_id = ?';
    params.push(filter.organization_id);
  }
  if (filter.employee_id) {
    whereClause += ' AND a.employee_id = ?';
    params.push(filter.employee_id);
  }
  if (filter.date_from) {
    whereClause += ' AND a.attendance_date >= ?';
    params.push(filter.date_from);
  }
  if (filter.date_to) {
    whereClause += ' AND a.attendance_date <= ?';
    params.push(filter.date_to);
  }
  if (filter.status) {
    if (Array.isArray(filter.status)) {
      whereClause += ` AND a.status IN (${filter.status.map(() => '?').join(',')})`;
      params.push(...filter.status);
    } else {
      whereClause += ' AND a.status = ?';
      params.push(filter.status);
    }
  }
  if (filter.shift_id) {
    whereClause += ' AND a.shift_id = ?';
    params.push(filter.shift_id);
  }

  // Get total count
  const countResult = await powerSync.queryOne<{ count: number }>({
    sql: `SELECT COUNT(*) as count FROM employee_attendance a WHERE ${whereClause}`,
    parameters: params,
  });

  // Get paginated data with employee info
  const data = await powerSync.query<AttendanceWithEmployee>({
    sql: `
      SELECT
        a.*,
        u.name as employee_name,
        u.email as employee_email,
        u.avatar_url as employee_avatar,
        u.job_title as employee_job_title,
        s.name as shift_name,
        s.start_time as shift_start_time,
        s.end_time as shift_end_time
      FROM employee_attendance a
      LEFT JOIN users u ON a.employee_id = u.id
      LEFT JOIN work_shifts s ON a.shift_id = s.id
      WHERE ${whereClause}
      ORDER BY a.attendance_date DESC
      LIMIT ? OFFSET ?
    `,
    parameters: [...params, perPage, offset],
  });

  return {
    data: data.map(record => ({
      ...record,
      employee: {
        id: record.employee_id,
        name: (record as any).employee_name,
        email: (record as any).employee_email,
        avatar_url: (record as any).employee_avatar,
        job_title: (record as any).employee_job_title,
      },
      shift: record.shift_id ? {
        id: record.shift_id,
        name: (record as any).shift_name,
        start_time: (record as any).shift_start_time,
        end_time: (record as any).shift_end_time,
      } : undefined,
    })) as AttendanceWithEmployee[],
    total: countResult?.count || 0,
  };
}

/**
 * جلب سجل حضور اليوم للموظف
 */
export async function getTodayAttendance(
  employeeId: string
): Promise<EmployeeAttendance | null> {
  const today = new Date().toISOString().split('T')[0];

  const result = await powerSync.queryOne<EmployeeAttendance>({
    sql: `SELECT * FROM employee_attendance
          WHERE employee_id = ? AND attendance_date = ?`,
    parameters: [employeeId, today],
  });

  return result;
}

/**
 * إنشاء سجل حضور يدوي
 */
export async function createManualAttendance(
  input: ManualAttendanceInput
): Promise<{ success: boolean; error?: string }> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const employee = await powerSync.queryOne<{ organization_id: string }>({
    sql: 'SELECT organization_id FROM users WHERE id = ?',
    parameters: [input.employee_id],
  });

  if (!employee) {
    return { success: false, error: 'الموظف غير موجود' };
  }

  const success = await powerSync.mutate({
    table: 'employee_attendance',
    data: {
      id,
      employee_id: input.employee_id,
      organization_id: employee.organization_id,
      attendance_date: input.attendance_date,
      check_in_time: input.check_in_time,
      check_out_time: input.check_out_time,
      status: input.status,
      notes: input.notes,
      is_manual_entry: 1,
      created_at: now,
      updated_at: now,
    },
  });

  return { success };
}

/**
 * تحديث سجل الحضور
 */
export async function updateAttendance(
  id: string,
  updates: Partial<EmployeeAttendance>
): Promise<{ success: boolean; error?: string }> {
  const success = await powerSync.mutate({
    table: 'employee_attendance',
    data: {
      id,
      ...updates,
      updated_at: new Date().toISOString(),
    },
  });

  return { success };
}

// ============================================
// 📊 Statistics (Local Queries)
// ============================================

/**
 * جلب إحصائيات الحضور اليومية للمنظمة
 */
export async function getDailyAttendanceStats(
  organizationId: string,
  date: string = new Date().toISOString().split('T')[0]
): Promise<DailyAttendanceStats> {
  // Get total employees
  const totalResult = await powerSync.queryOne<{ count: number }>({
    sql: `SELECT COUNT(*) as count FROM users
          WHERE organization_id = ? AND is_active = 1 AND role = 'employee'`,
    parameters: [organizationId],
  });

  // Get attendance stats
  const attendanceData = await powerSync.query<{ status: string }>({
    sql: `SELECT status FROM employee_attendance
          WHERE organization_id = ? AND attendance_date = ?`,
    parameters: [organizationId, date],
  });

  const stats: DailyAttendanceStats = {
    date,
    total_employees: totalResult?.count || 0,
    present: 0,
    absent: 0,
    late: 0,
    on_leave: 0,
    remote: 0,
    not_checked_in: 0,
    attendance_rate: 0,
  };

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
        stats.present++;
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

  stats.not_checked_in = Math.max(0, stats.total_employees - attendanceData.length);
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
  const data = await powerSync.query<EmployeeAttendance>({
    sql: `SELECT * FROM employee_attendance
          WHERE employee_id = ? AND attendance_date >= ? AND attendance_date <= ?`,
    parameters: [employeeId, startDate, endDate],
  });

  const stats: EmployeeAttendanceStats = {
    employee_id: employeeId,
    period_start: startDate,
    period_end: endDate,
    total_days: data.length,
    present_days: 0,
    absent_days: 0,
    late_days: 0,
    on_leave_days: 0,
    total_work_hours: 0,
    total_overtime_hours: 0,
    attendance_rate: 0,
  };

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
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const data = await powerSync.query<EmployeeAttendance>({
    sql: `SELECT * FROM employee_attendance
          WHERE employee_id = ? AND attendance_date >= ? AND attendance_date <= ?`,
    parameters: [employeeId, startDate, endDate],
  });

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

  data.forEach((record) => {
    summary.working_days++;
    if (record.status === 'present' || record.status === 'late') {
      summary.present_days++;
    }
    if (record.status === 'absent') {
      summary.absent_days++;
    }
    if (record.status === 'late' || (record.late_minutes && record.late_minutes > 0)) {
      summary.late_count++;
      summary.total_late_minutes += record.late_minutes || 0;
    }
    summary.overtime_hours += (record.overtime_minutes || 0) / 60;
  });

  summary.attendance_percentage =
    summary.working_days > 0
      ? Math.round((summary.present_days / summary.working_days) * 100 * 100) / 100
      : 0;

  return summary;
}

// ============================================
// 🔄 Watch for Real-time Updates
// ============================================

/**
 * مراقبة تغييرات الحضور للمنظمة
 */
export function watchAttendance(
  organizationId: string,
  date: string,
  callback: (data: EmployeeAttendance[]) => void
): () => void {
  return powerSync.watch<EmployeeAttendance>({
    sql: `SELECT * FROM employee_attendance
          WHERE organization_id = ? AND attendance_date = ?
          ORDER BY check_in_time DESC`,
    parameters: [organizationId, date],
    onResult: callback,
  });
}

/**
 * مراقبة حضور موظف معين
 */
export function watchEmployeeAttendance(
  employeeId: string,
  callback: (data: EmployeeAttendance | null) => void
): () => void {
  const today = new Date().toISOString().split('T')[0];

  return powerSync.watch<EmployeeAttendance>({
    sql: `SELECT * FROM employee_attendance
          WHERE employee_id = ? AND attendance_date = ?`,
    parameters: [employeeId, today],
    onResult: (results) => callback(results[0] || null),
  });
}
