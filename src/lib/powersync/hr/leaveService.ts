/**
 * 🏖️ Leave Service (PowerSync) - خدمة الإجازات أوفلاين فيرست
 * v4.0 - 2025-12-10
 */

import { powerSync } from '../PowerSyncService';
import { supabase } from '@/integrations/supabase/client';
import type {
  LeaveType,
  EmployeeLeaveBalance,
  LeaveBalanceWithType,
  LeaveRequest,
  LeaveRequestWithDetails,
  CreateLeaveTypeInput,
  SubmitLeaveRequestInput,
  ReviewLeaveRequestInput,
  LeaveRequestFilter,
  EmployeeLeaveStats,
  OrganizationLeaveStats,
  LeaveCalendarEntry,
  SubmitLeaveResponse,
  ReviewLeaveResponse,
  DEFAULT_LEAVE_TYPES,
} from '@/types/hr/leave';
import type { OfficialHoliday, CreateHolidayInput } from '@/types/hr/shifts';

// ============================================
// 📋 Leave Types CRUD
// ============================================

/**
 * جلب أنواع الإجازات للمنظمة
 */
export async function getLeaveTypes(
  organizationId: string
): Promise<LeaveType[]> {
  const data = await powerSync.query<LeaveType>({
    sql: `SELECT * FROM leave_types
          WHERE organization_id = ? AND is_active = 1
          ORDER BY sort_order`,
    parameters: [organizationId],
  });

  return data;
}

/**
 * إنشاء نوع إجازة جديد
 */
export async function createLeaveType(
  organizationId: string,
  input: CreateLeaveTypeInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const success = await powerSync.mutate({
    table: 'leave_types',
    data: {
      id,
      organization_id: organizationId,
      ...input,
      is_active: 1,
      created_at: now,
      updated_at: now,
    },
  });

  return { success, id: success ? id : undefined };
}

/**
 * تحديث نوع إجازة
 */
export async function updateLeaveType(
  id: string,
  updates: Partial<CreateLeaveTypeInput>
): Promise<{ success: boolean; error?: string }> {
  const success = await powerSync.mutate({
    table: 'leave_types',
    data: {
      id,
      ...updates,
      updated_at: new Date().toISOString(),
    },
  });

  return { success };
}

/**
 * إنشاء أنواع الإجازات الافتراضية للمنظمة
 */
export async function initializeDefaultLeaveTypes(
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  const now = new Date().toISOString();

  const result = await powerSync.mutateBatch({
    table: 'leave_types',
    operations: DEFAULT_LEAVE_TYPES.map((lt) => ({
      type: 'insert' as const,
      data: {
        id: crypto.randomUUID(),
        organization_id: organizationId,
        ...lt,
        is_active: 1,
        created_at: now,
        updated_at: now,
      },
    })),
  });

  return { success: result.successCount === DEFAULT_LEAVE_TYPES.length };
}

// ============================================
// 💰 Leave Balances
// ============================================

/**
 * جلب أرصدة إجازات الموظف
 */
export async function getEmployeeLeaveBalances(
  employeeId: string,
  year: number = new Date().getFullYear()
): Promise<LeaveBalanceWithType[]> {
  const data = await powerSync.query<EmployeeLeaveBalance & {
    leave_type_name: string;
    leave_type_name_ar: string;
    leave_type_code: string;
    leave_type_color: string;
    leave_type_icon: string;
  }>({
    sql: `
      SELECT
        b.*,
        lt.name as leave_type_name,
        lt.name_ar as leave_type_name_ar,
        lt.code as leave_type_code,
        lt.color as leave_type_color,
        lt.icon as leave_type_icon
      FROM employee_leave_balances b
      LEFT JOIN leave_types lt ON b.leave_type_id = lt.id
      WHERE b.employee_id = ? AND b.year = ?
    `,
    parameters: [employeeId, year],
  });

  return data.map((balance) => ({
    ...balance,
    remaining_days: balance.total_days - balance.used_days - balance.pending_days,
    leave_type: {
      id: balance.leave_type_id,
      name: balance.leave_type_name,
      name_ar: balance.leave_type_name_ar,
      code: balance.leave_type_code,
      color: balance.leave_type_color,
      icon: balance.leave_type_icon,
    },
  })) as LeaveBalanceWithType[];
}

/**
 * تهيئة أرصدة الإجازات للموظف
 */
export async function initializeEmployeeLeaveBalances(
  employeeId: string,
  organizationId: string,
  year: number = new Date().getFullYear()
): Promise<{ success: boolean; error?: string }> {
  const leaveTypes = await getLeaveTypes(organizationId);

  if (leaveTypes.length === 0) {
    return { success: false, error: 'لا توجد أنواع إجازات محددة' };
  }

  const now = new Date().toISOString();

  const result = await powerSync.mutateBatch({
    table: 'employee_leave_balances',
    operations: leaveTypes.map((lt) => ({
      type: 'insert' as const,
      data: {
        id: crypto.randomUUID(),
        employee_id: employeeId,
        leave_type_id: lt.id,
        organization_id: organizationId,
        year,
        total_days: lt.days_per_year,
        used_days: 0,
        pending_days: 0,
        carried_forward_days: 0,
        created_at: now,
        updated_at: now,
      },
    })),
  });

  return { success: result.successCount > 0 };
}

/**
 * تحديث رصيد إجازات
 */
export async function updateLeaveBalance(
  employeeId: string,
  leaveTypeId: string,
  year: number,
  updates: Partial<EmployeeLeaveBalance>
): Promise<{ success: boolean; error?: string }> {
  // Find the balance record
  const existing = await powerSync.queryOne<{ id: string }>({
    sql: `SELECT id FROM employee_leave_balances
          WHERE employee_id = ? AND leave_type_id = ? AND year = ?`,
    parameters: [employeeId, leaveTypeId, year],
  });

  if (!existing) {
    return { success: false, error: 'رصيد الإجازة غير موجود' };
  }

  const success = await powerSync.mutate({
    table: 'employee_leave_balances',
    data: {
      id: existing.id,
      ...updates,
      updated_at: new Date().toISOString(),
    },
  });

  return { success };
}

// ============================================
// 📝 Leave Requests
// ============================================

/**
 * تقديم طلب إجازة
 */
export async function submitLeaveRequest(
  input: SubmitLeaveRequestInput
): Promise<SubmitLeaveResponse> {
  const isOnline = powerSync.isConnected();

  if (isOnline) {
    // Use Supabase RPC for complex validation
    const { data, error } = await supabase.rpc('submit_leave_request', {
      p_employee_id: input.employee_id,
      p_leave_type_id: input.leave_type_id,
      p_start_date: input.start_date,
      p_end_date: input.end_date,
      p_reason: input.reason || null,
      p_is_half_day: input.is_half_day || false,
      p_half_day_type: input.half_day_type || null,
      p_substitute_id: input.substitute_employee_id || null,
      p_attachment_urls: input.attachment_urls || null,
    });

    if (error) {
      console.error('Error submitting leave request:', error);
      return { success: false, error: error.message };
    }

    return data as SubmitLeaveResponse;
  } else {
    // Offline: Create request locally
    return await submitLeaveRequestOffline(input);
  }
}

/**
 * تقديم طلب إجازة أوفلاين
 */
async function submitLeaveRequestOffline(
  input: SubmitLeaveRequestInput
): Promise<SubmitLeaveResponse> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // Get employee's organization
  const employee = await powerSync.queryOne<{ organization_id: string }>({
    sql: 'SELECT organization_id FROM users WHERE id = ?',
    parameters: [input.employee_id],
  });

  if (!employee) {
    return { success: false, error: 'الموظف غير موجود' };
  }

  // Calculate total days
  const start = new Date(input.start_date);
  const end = new Date(input.end_date);
  const totalDays = input.is_half_day
    ? 0.5
    : Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const success = await powerSync.mutate({
    table: 'leave_requests',
    data: {
      id,
      employee_id: input.employee_id,
      organization_id: employee.organization_id,
      leave_type_id: input.leave_type_id,
      start_date: input.start_date,
      end_date: input.end_date,
      total_days: totalDays,
      is_half_day: input.is_half_day ? 1 : 0,
      half_day_type: input.half_day_type,
      status: 'pending',
      reason: input.reason,
      attachment_urls: input.attachment_urls ? JSON.stringify(input.attachment_urls) : null,
      substitute_employee_id: input.substitute_employee_id,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    success,
    request_id: id,
    total_days: totalDays,
  };
}

/**
 * مراجعة طلب إجازة (موافقة/رفض)
 */
export async function reviewLeaveRequest(
  input: ReviewLeaveRequestInput
): Promise<ReviewLeaveResponse> {
  const isOnline = powerSync.isConnected();

  if (isOnline) {
    const { data, error } = await supabase.rpc('review_leave_request', {
      p_request_id: input.request_id,
      p_approved: input.approved,
      p_reviewer_id: input.reviewer_id,
      p_notes: input.notes || null,
    });

    if (error) {
      console.error('Error reviewing leave request:', error);
      return { success: false, error: error.message };
    }

    return data as ReviewLeaveResponse;
  } else {
    // Offline: Update locally
    const now = new Date().toISOString();
    const success = await powerSync.mutate({
      table: 'leave_requests',
      data: {
        id: input.request_id,
        status: input.approved ? 'approved' : 'rejected',
        reviewed_by: input.reviewer_id,
        reviewed_at: now,
        review_notes: input.notes,
        updated_at: now,
      },
    });

    return { success };
  }
}

/**
 * إلغاء طلب إجازة
 */
export async function cancelLeaveRequest(
  requestId: string,
  cancelledBy: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const now = new Date().toISOString();

  const success = await powerSync.mutate({
    table: 'leave_requests',
    data: {
      id: requestId,
      status: 'cancelled',
      cancelled_by: cancelledBy,
      cancelled_at: now,
      cancellation_reason: reason,
      updated_at: now,
    },
  });

  return { success };
}

/**
 * جلب طلبات الإجازة
 */
export async function getLeaveRequests(
  filter: LeaveRequestFilter,
  page: number = 1,
  perPage: number = 20
): Promise<{ data: LeaveRequestWithDetails[]; total: number }> {
  const offset = (page - 1) * perPage;
  let whereClause = '1=1';
  const params: (string | number)[] = [];

  if (filter.organization_id) {
    whereClause += ' AND lr.organization_id = ?';
    params.push(filter.organization_id);
  }
  if (filter.employee_id) {
    whereClause += ' AND lr.employee_id = ?';
    params.push(filter.employee_id);
  }
  if (filter.leave_type_id) {
    whereClause += ' AND lr.leave_type_id = ?';
    params.push(filter.leave_type_id);
  }
  if (filter.status) {
    if (Array.isArray(filter.status)) {
      whereClause += ` AND lr.status IN (${filter.status.map(() => '?').join(',')})`;
      params.push(...filter.status);
    } else {
      whereClause += ' AND lr.status = ?';
      params.push(filter.status);
    }
  }
  if (filter.date_from) {
    whereClause += ' AND lr.start_date >= ?';
    params.push(filter.date_from);
  }
  if (filter.date_to) {
    whereClause += ' AND lr.end_date <= ?';
    params.push(filter.date_to);
  }
  if (filter.year) {
    whereClause += ' AND lr.start_date >= ? AND lr.end_date <= ?';
    params.push(`${filter.year}-01-01`, `${filter.year}-12-31`);
  }

  // Get total count
  const countResult = await powerSync.queryOne<{ count: number }>({
    sql: `SELECT COUNT(*) as count FROM leave_requests lr WHERE ${whereClause}`,
    parameters: params,
  });

  // Get paginated data
  const data = await powerSync.query<LeaveRequest & {
    employee_name: string;
    employee_email: string;
    employee_avatar: string;
    employee_job_title: string;
    leave_type_name: string;
    leave_type_name_ar: string;
    leave_type_color: string;
    leave_type_icon: string;
    reviewer_name: string;
    substitute_name: string;
  }>({
    sql: `
      SELECT
        lr.*,
        e.name as employee_name,
        e.email as employee_email,
        e.avatar_url as employee_avatar,
        e.job_title as employee_job_title,
        lt.name as leave_type_name,
        lt.name_ar as leave_type_name_ar,
        lt.color as leave_type_color,
        lt.icon as leave_type_icon,
        r.name as reviewer_name,
        s.name as substitute_name
      FROM leave_requests lr
      LEFT JOIN users e ON lr.employee_id = e.id
      LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
      LEFT JOIN users r ON lr.reviewed_by = r.id
      LEFT JOIN users s ON lr.substitute_employee_id = s.id
      WHERE ${whereClause}
      ORDER BY lr.created_at DESC
      LIMIT ? OFFSET ?
    `,
    parameters: [...params, perPage, offset],
  });

  return {
    data: data.map((record) => ({
      ...record,
      employee: {
        id: record.employee_id,
        name: record.employee_name,
        email: record.employee_email,
        avatar_url: record.employee_avatar,
        job_title: record.employee_job_title,
      },
      leave_type: {
        id: record.leave_type_id,
        name: record.leave_type_name,
        name_ar: record.leave_type_name_ar,
        color: record.leave_type_color,
        icon: record.leave_type_icon,
      },
      reviewer: record.reviewed_by
        ? { id: record.reviewed_by, name: record.reviewer_name }
        : undefined,
      substitute: record.substitute_employee_id
        ? { id: record.substitute_employee_id, name: record.substitute_name }
        : undefined,
    })) as LeaveRequestWithDetails[],
    total: countResult?.count || 0,
  };
}

/**
 * جلب طلبات الإجازة المعلقة للمنظمة
 */
export async function getPendingLeaveRequests(
  organizationId: string
): Promise<LeaveRequestWithDetails[]> {
  const { data } = await getLeaveRequests(
    { organization_id: organizationId, status: 'pending' },
    1,
    100
  );
  return data;
}

// ============================================
// 📊 Statistics
// ============================================

/**
 * جلب إحصائيات إجازات الموظف
 */
export async function getEmployeeLeaveStats(
  employeeId: string,
  year: number = new Date().getFullYear()
): Promise<EmployeeLeaveStats> {
  const balances = await getEmployeeLeaveBalances(employeeId, year);

  const today = new Date().toISOString().split('T')[0];
  const upcomingLeaves = await powerSync.query<LeaveRequest>({
    sql: `SELECT * FROM leave_requests
          WHERE employee_id = ? AND status = 'approved' AND start_date >= ?
          ORDER BY start_date
          LIMIT 5`,
    parameters: [employeeId, today],
  });

  return {
    employee_id: employeeId,
    year,
    balances,
    total_taken_days: balances.reduce((sum, b) => sum + b.used_days, 0),
    total_remaining_days: balances.reduce(
      (sum, b) => sum + (b.remaining_days || 0),
      0
    ),
    upcoming_leaves: upcomingLeaves,
  };
}

/**
 * جلب إحصائيات الإجازات للمنظمة
 */
export async function getOrganizationLeaveStats(
  organizationId: string,
  startDate?: string,
  endDate?: string
): Promise<OrganizationLeaveStats> {
  const today = new Date().toISOString().split('T')[0];
  const periodStart = startDate || `${new Date().getFullYear()}-01-01`;
  const periodEnd = endDate || `${new Date().getFullYear()}-12-31`;

  // Get request stats
  const requests = await powerSync.query<{ status: string; leave_type_id: string; total_days: number }>({
    sql: `SELECT status, leave_type_id, total_days FROM leave_requests
          WHERE organization_id = ? AND created_at >= ? AND created_at <= ?`,
    parameters: [organizationId, periodStart, periodEnd],
  });

  // Count employees on leave today
  const onLeaveTodayResult = await powerSync.queryOne<{ count: number }>({
    sql: `SELECT COUNT(*) as count FROM leave_requests
          WHERE organization_id = ? AND status = 'approved'
          AND start_date <= ? AND end_date >= ?`,
    parameters: [organizationId, today, today],
  });

  const stats: OrganizationLeaveStats = {
    organization_id: organizationId,
    period: { start: periodStart, end: periodEnd },
    total_requests: requests.length,
    pending_requests: requests.filter((r) => r.status === 'pending').length,
    approved_requests: requests.filter((r) => r.status === 'approved').length,
    rejected_requests: requests.filter((r) => r.status === 'rejected').length,
    employees_on_leave_today: onLeaveTodayResult?.count || 0,
    most_used_leave_type: { id: '', name: '', count: 0 },
    leave_by_type: [],
  };

  return stats;
}

/**
 * جلب تقويم الإجازات
 */
export async function getLeaveCalendar(
  organizationId: string,
  month: number,
  year: number
): Promise<LeaveCalendarEntry[]> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  // Get approved leaves
  const leaves = await powerSync.query<{
    start_date: string;
    end_date: string;
    is_half_day: number;
    employee_id: string;
    employee_name: string;
    leave_type_name_ar: string;
    leave_type_color: string;
  }>({
    sql: `
      SELECT
        lr.start_date, lr.end_date, lr.is_half_day,
        lr.employee_id,
        e.name as employee_name,
        lt.name_ar as leave_type_name_ar,
        lt.color as leave_type_color
      FROM leave_requests lr
      LEFT JOIN users e ON lr.employee_id = e.id
      LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
      WHERE lr.organization_id = ? AND lr.status = 'approved'
      AND lr.start_date <= ? AND lr.end_date >= ?
    `,
    parameters: [organizationId, endDate, startDate],
  });

  // Get holidays
  const holidays = await powerSync.query<OfficialHoliday>({
    sql: `SELECT * FROM official_holidays
          WHERE organization_id = ? AND is_active = 1
          AND date >= ? AND date <= ?`,
    parameters: [organizationId, startDate, endDate],
  });

  // Build calendar
  const calendar: LeaveCalendarEntry[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const holiday = holidays.find((h) => h.date === date);

    const employeesOnLeave = leaves
      .filter((l) => date >= l.start_date && date <= l.end_date)
      .map((l) => ({
        employee_id: l.employee_id,
        employee_name: l.employee_name,
        leave_type: l.leave_type_name_ar,
        leave_type_color: l.leave_type_color,
        is_half_day: l.is_half_day === 1,
      }));

    calendar.push({
      date,
      employees_on_leave: employeesOnLeave,
      is_holiday: !!holiday,
      holiday_name: holiday?.name_ar,
    });
  }

  return calendar;
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
  let sql = `SELECT * FROM official_holidays
             WHERE organization_id = ? AND is_active = 1`;
  const params: (string | number)[] = [organizationId];

  if (year) {
    sql += ` AND date >= ? AND date <= ?`;
    params.push(`${year}-01-01`, `${year}-12-31`);
  }

  sql += ' ORDER BY date';

  const data = await powerSync.query<OfficialHoliday>({
    sql,
    parameters: params,
  });

  return data;
}

/**
 * إنشاء عطلة رسمية
 */
export async function createOfficialHoliday(
  organizationId: string,
  input: CreateHolidayInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const success = await powerSync.mutate({
    table: 'official_holidays',
    data: {
      id,
      organization_id: organizationId,
      ...input,
      is_active: 1,
      created_at: now,
      updated_at: now,
    },
  });

  return { success, id: success ? id : undefined };
}

/**
 * حذف عطلة رسمية
 */
export async function deleteOfficialHoliday(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const success = await powerSync.mutate({
    table: 'official_holidays',
    data: {
      id,
      is_active: 0,
      updated_at: new Date().toISOString(),
    },
  });

  return { success };
}

// ============================================
// 🔄 Watch for Real-time Updates
// ============================================

/**
 * مراقبة طلبات الإجازة المعلقة
 */
export function watchPendingLeaveRequests(
  organizationId: string,
  callback: (data: LeaveRequest[]) => void
): () => void {
  return powerSync.watch<LeaveRequest>({
    sql: `SELECT * FROM leave_requests
          WHERE organization_id = ? AND status = 'pending'
          ORDER BY created_at DESC`,
    parameters: [organizationId],
    onResult: callback,
  });
}

/**
 * مراقبة أرصدة إجازات الموظف
 */
export function watchEmployeeLeaveBalances(
  employeeId: string,
  year: number,
  callback: (data: EmployeeLeaveBalance[]) => void
): () => void {
  return powerSync.watch<EmployeeLeaveBalance>({
    sql: `SELECT * FROM employee_leave_balances
          WHERE employee_id = ? AND year = ?`,
    parameters: [employeeId, year],
    onResult: callback,
  });
}
