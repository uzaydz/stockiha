/**
 * ⏰ Shifts Service (PowerSync) - خدمة الورديات أوفلاين فيرست
 * v4.0 - 2025-12-10
 */

import { powerSync } from '../PowerSyncService';
import type {
  WorkShift,
  EmployeeShiftAssignment,
  ShiftAssignmentWithDetails,
  CreateShiftInput,
  CreateShiftAssignmentInput,
  ShiftFilter,
} from '@/types/hr/shifts';

// ============================================
// 📋 Work Shifts CRUD
// ============================================

/**
 * جلب جميع الورديات
 */
export async function getWorkShifts(
  organizationId: string
): Promise<WorkShift[]> {
  const data = await powerSync.query<WorkShift>({
    sql: `SELECT * FROM work_shifts
          WHERE organization_id = ? AND is_active = 1
          ORDER BY start_time`,
    parameters: [organizationId],
  });

  return data;
}

/**
 * جلب الوردية الافتراضية
 */
export async function getDefaultShift(
  organizationId: string
): Promise<WorkShift | null> {
  const result = await powerSync.queryOne<WorkShift>({
    sql: `SELECT * FROM work_shifts
          WHERE organization_id = ? AND is_default = 1 AND is_active = 1`,
    parameters: [organizationId],
  });

  return result;
}

/**
 * جلب وردية بالمعرف
 */
export async function getShiftById(
  shiftId: string
): Promise<WorkShift | null> {
  const result = await powerSync.queryOne<WorkShift>({
    sql: `SELECT * FROM work_shifts WHERE id = ?`,
    parameters: [shiftId],
  });

  return result;
}

/**
 * إنشاء وردية جديدة
 */
export async function createWorkShift(
  organizationId: string,
  input: CreateShiftInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // If this is the default, unset other defaults
  if (input.is_default) {
    await powerSync.mutate({
      table: 'work_shifts',
      data: {
        // This will be handled by watching for is_default = 1
      },
    });

    // Update all shifts to not default
    const existingShifts = await getWorkShifts(organizationId);
    for (const shift of existingShifts) {
      if (shift.is_default) {
        await powerSync.mutate({
          table: 'work_shifts',
          data: {
            id: shift.id,
            is_default: 0,
            updated_at: now,
          },
        });
      }
    }
  }

  const success = await powerSync.mutate({
    table: 'work_shifts',
    data: {
      id,
      organization_id: organizationId,
      name: input.name,
      name_ar: input.name_ar,
      start_time: input.start_time,
      end_time: input.end_time,
      break_duration_minutes: input.break_duration_minutes || 60,
      grace_period_minutes: input.grace_period_minutes || 15,
      overtime_rate: input.overtime_rate || 1.5,
      is_active: 1,
      is_default: input.is_default ? 1 : 0,
      color: input.color || '#3B82F6',
      created_at: now,
      updated_at: now,
    },
  });

  return { success, id: success ? id : undefined };
}

/**
 * تحديث وردية
 */
export async function updateWorkShift(
  id: string,
  updates: Partial<CreateShiftInput>
): Promise<{ success: boolean; error?: string }> {
  const now = new Date().toISOString();

  // If setting as default, unset others
  if (updates.is_default) {
    const shift = await getShiftById(id);
    if (shift) {
      const existingShifts = await getWorkShifts(shift.organization_id);
      for (const s of existingShifts) {
        if (s.id !== id && s.is_default) {
          await powerSync.mutate({
            table: 'work_shifts',
            data: {
              id: s.id,
              is_default: 0,
              updated_at: now,
            },
          });
        }
      }
    }
  }

  const success = await powerSync.mutate({
    table: 'work_shifts',
    data: {
      id,
      ...updates,
      is_default: updates.is_default ? 1 : 0,
      is_active: updates.is_active === false ? 0 : undefined,
      updated_at: now,
    },
  });

  return { success };
}

/**
 * حذف وردية (تعطيل)
 */
export async function deleteWorkShift(
  id: string
): Promise<{ success: boolean; error?: string }> {
  // Check if shift has active assignments
  const assignmentsCount = await powerSync.queryOne<{ count: number }>({
    sql: `SELECT COUNT(*) as count FROM employee_shift_assignments
          WHERE shift_id = ? AND is_active = 1`,
    parameters: [id],
  });

  if (assignmentsCount && assignmentsCount.count > 0) {
    return {
      success: false,
      error: 'لا يمكن حذف الوردية لأن هناك موظفين مرتبطين بها',
    };
  }

  const success = await powerSync.mutate({
    table: 'work_shifts',
    data: {
      id,
      is_active: 0,
      updated_at: new Date().toISOString(),
    },
  });

  return { success };
}

// ============================================
// 👥 Shift Assignments
// ============================================

/**
 * جلب تعيينات الورديات
 */
export async function getShiftAssignments(
  filter: ShiftFilter,
  page: number = 1,
  perPage: number = 50
): Promise<{ data: ShiftAssignmentWithDetails[]; total: number }> {
  const offset = (page - 1) * perPage;
  let whereClause = 'sa.is_active = 1';
  const params: (string | number)[] = [];

  if (filter.organization_id) {
    whereClause += ' AND sa.organization_id = ?';
    params.push(filter.organization_id);
  }
  if (filter.employee_id) {
    whereClause += ' AND sa.employee_id = ?';
    params.push(filter.employee_id);
  }
  if (filter.shift_id) {
    whereClause += ' AND sa.shift_id = ?';
    params.push(filter.shift_id);
  }
  if (filter.date) {
    whereClause += ' AND sa.start_date <= ? AND (sa.end_date IS NULL OR sa.end_date >= ?)';
    params.push(filter.date, filter.date);
  }

  // Get total count
  const countResult = await powerSync.queryOne<{ count: number }>({
    sql: `SELECT COUNT(*) as count FROM employee_shift_assignments sa WHERE ${whereClause}`,
    parameters: params,
  });

  // Get paginated data
  const data = await powerSync.query<EmployeeShiftAssignment & {
    employee_name: string;
    employee_email: string;
    employee_job_title: string;
    shift_name: string;
    shift_start_time: string;
    shift_end_time: string;
    shift_color: string;
  }>({
    sql: `
      SELECT
        sa.*,
        u.name as employee_name,
        u.email as employee_email,
        u.job_title as employee_job_title,
        s.name as shift_name,
        s.start_time as shift_start_time,
        s.end_time as shift_end_time,
        s.color as shift_color
      FROM employee_shift_assignments sa
      LEFT JOIN users u ON sa.employee_id = u.id
      LEFT JOIN work_shifts s ON sa.shift_id = s.id
      WHERE ${whereClause}
      ORDER BY u.name
      LIMIT ? OFFSET ?
    `,
    parameters: [...params, perPage, offset],
  });

  return {
    data: data.map((record) => ({
      ...record,
      days_of_week: record.days_of_week
        ? JSON.parse(record.days_of_week as string)
        : [0, 1, 2, 3, 4, 5],
      employee: {
        id: record.employee_id,
        name: record.employee_name,
        email: record.employee_email,
        job_title: record.employee_job_title,
      },
      shift: {
        id: record.shift_id,
        name: record.shift_name,
        start_time: record.shift_start_time,
        end_time: record.shift_end_time,
        color: record.shift_color,
      },
    })) as ShiftAssignmentWithDetails[],
    total: countResult?.count || 0,
  };
}

/**
 * جلب وردية الموظف الحالية
 */
export async function getCurrentEmployeeShift(
  employeeId: string,
  date?: string
): Promise<ShiftAssignmentWithDetails | null> {
  const currentDate = date || new Date().toISOString().split('T')[0];
  const dayOfWeek = new Date(currentDate).getDay();

  const result = await powerSync.queryOne<EmployeeShiftAssignment & {
    shift_name: string;
    shift_start_time: string;
    shift_end_time: string;
    shift_break_duration: number;
    shift_grace_period: number;
    shift_overtime_rate: number;
    shift_color: string;
  }>({
    sql: `
      SELECT
        sa.*,
        s.name as shift_name,
        s.start_time as shift_start_time,
        s.end_time as shift_end_time,
        s.break_duration_minutes as shift_break_duration,
        s.grace_period_minutes as shift_grace_period,
        s.overtime_rate as shift_overtime_rate,
        s.color as shift_color
      FROM employee_shift_assignments sa
      LEFT JOIN work_shifts s ON sa.shift_id = s.id
      WHERE sa.employee_id = ?
        AND sa.is_active = 1
        AND sa.start_date <= ?
        AND (sa.end_date IS NULL OR sa.end_date >= ?)
        AND s.is_active = 1
    `,
    parameters: [employeeId, currentDate, currentDate],
  });

  if (!result) return null;

  // Check if the day is in the working days
  const daysOfWeek = result.days_of_week
    ? JSON.parse(result.days_of_week as string)
    : [0, 1, 2, 3, 4, 5];

  if (!daysOfWeek.includes(dayOfWeek)) {
    return null;
  }

  return {
    ...result,
    days_of_week: daysOfWeek,
    shift: {
      id: result.shift_id,
      name: result.shift_name,
      start_time: result.shift_start_time,
      end_time: result.shift_end_time,
      break_duration_minutes: result.shift_break_duration,
      grace_period_minutes: result.shift_grace_period,
      overtime_rate: result.shift_overtime_rate,
      color: result.shift_color,
    },
  } as ShiftAssignmentWithDetails;
}

/**
 * تعيين وردية لموظف
 */
export async function assignShiftToEmployee(
  input: CreateShiftAssignmentInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // Deactivate current assignment if exists
  const currentAssignment = await powerSync.queryOne<{ id: string }>({
    sql: `SELECT id FROM employee_shift_assignments
          WHERE employee_id = ? AND is_active = 1`,
    parameters: [input.employee_id],
  });

  if (currentAssignment) {
    await powerSync.mutate({
      table: 'employee_shift_assignments',
      data: {
        id: currentAssignment.id,
        is_active: 0,
        end_date: input.start_date,
        updated_at: now,
      },
    });
  }

  const success = await powerSync.mutate({
    table: 'employee_shift_assignments',
    data: {
      id,
      organization_id: input.organization_id,
      employee_id: input.employee_id,
      shift_id: input.shift_id,
      start_date: input.start_date,
      end_date: input.end_date || null,
      days_of_week: JSON.stringify(input.days_of_week || [0, 1, 2, 3, 4, 5]),
      is_active: 1,
      created_at: now,
      updated_at: now,
    },
  });

  return { success, id: success ? id : undefined };
}

/**
 * تحديث تعيين وردية
 */
export async function updateShiftAssignment(
  id: string,
  updates: Partial<CreateShiftAssignmentInput>
): Promise<{ success: boolean; error?: string }> {
  const success = await powerSync.mutate({
    table: 'employee_shift_assignments',
    data: {
      id,
      ...updates,
      days_of_week: updates.days_of_week
        ? JSON.stringify(updates.days_of_week)
        : undefined,
      updated_at: new Date().toISOString(),
    },
  });

  return { success };
}

/**
 * إلغاء تعيين وردية
 */
export async function removeShiftAssignment(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const success = await powerSync.mutate({
    table: 'employee_shift_assignments',
    data: {
      id,
      is_active: 0,
      end_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    },
  });

  return { success };
}

/**
 * تعيين وردية لمجموعة موظفين
 */
export async function assignShiftToMultipleEmployees(
  organizationId: string,
  shiftId: string,
  employeeIds: string[],
  startDate: string,
  daysOfWeek?: number[]
): Promise<{ success: boolean; assigned: number; errors: string[] }> {
  const now = new Date().toISOString();
  const errors: string[] = [];
  let assigned = 0;

  for (const employeeId of employeeIds) {
    const result = await assignShiftToEmployee({
      organization_id: organizationId,
      employee_id: employeeId,
      shift_id: shiftId,
      start_date: startDate,
      days_of_week: daysOfWeek || [0, 1, 2, 3, 4, 5],
    });

    if (result.success) {
      assigned++;
    } else {
      errors.push(`فشل تعيين الموظف ${employeeId}: ${result.error}`);
    }
  }

  return {
    success: assigned === employeeIds.length,
    assigned,
    errors,
  };
}

// ============================================
// 📊 Shift Statistics
// ============================================

/**
 * جلب إحصائيات الورديات
 */
export async function getShiftStatistics(
  organizationId: string
): Promise<{
  total_shifts: number;
  total_assigned: number;
  shift_distribution: { shift_id: string; shift_name: string; count: number }[];
}> {
  const shifts = await getWorkShifts(organizationId);

  const assignmentCounts = await powerSync.query<{
    shift_id: string;
    count: number;
  }>({
    sql: `SELECT shift_id, COUNT(*) as count
          FROM employee_shift_assignments
          WHERE organization_id = ? AND is_active = 1
          GROUP BY shift_id`,
    parameters: [organizationId],
  });

  const shiftMap = new Map(shifts.map((s) => [s.id, s]));
  const distribution = assignmentCounts.map((ac) => ({
    shift_id: ac.shift_id,
    shift_name: shiftMap.get(ac.shift_id)?.name || 'Unknown',
    count: ac.count,
  }));

  return {
    total_shifts: shifts.length,
    total_assigned: assignmentCounts.reduce((sum, ac) => sum + ac.count, 0),
    shift_distribution: distribution,
  };
}

// ============================================
// 🔄 Watch for Real-time Updates
// ============================================

/**
 * مراقبة الورديات
 */
export function watchWorkShifts(
  organizationId: string,
  callback: (data: WorkShift[]) => void
): () => void {
  return powerSync.watch<WorkShift>({
    sql: `SELECT * FROM work_shifts
          WHERE organization_id = ? AND is_active = 1
          ORDER BY start_time`,
    parameters: [organizationId],
    onResult: callback,
  });
}

/**
 * مراقبة تعيينات الموظفين
 */
export function watchShiftAssignments(
  organizationId: string,
  callback: (data: EmployeeShiftAssignment[]) => void
): () => void {
  return powerSync.watch<EmployeeShiftAssignment>({
    sql: `SELECT * FROM employee_shift_assignments
          WHERE organization_id = ? AND is_active = 1`,
    parameters: [organizationId],
    onResult: callback,
  });
}
