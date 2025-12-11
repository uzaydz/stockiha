/**
 * 🏖️ Leave Service - خدمة الإجازات
 */

import { supabase } from '@/lib/supabase';
import type {
  LeaveType,
  EmployeeLeaveBalance,
  LeaveBalanceWithType,
  LeaveRequest,
  LeaveRequestWithDetails,
  LeaveRequestStatus,
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
  const { data, error } = await supabase
    .from('leave_types')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('sort_order');

  if (error) {
    console.error('Error fetching leave types:', error);
    return [];
  }

  return data as LeaveType[];
}

/**
 * إنشاء نوع إجازة جديد
 */
export async function createLeaveType(
  organizationId: string,
  input: CreateLeaveTypeInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const { data, error } = await supabase
    .from('leave_types')
    .insert({
      organization_id: organizationId,
      ...input,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating leave type:', error);
    return { success: false, error: error.message };
  }

  return { success: true, id: data.id };
}

/**
 * تحديث نوع إجازة
 */
export async function updateLeaveType(
  id: string,
  updates: Partial<CreateLeaveTypeInput>
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('leave_types')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Error updating leave type:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * إنشاء أنواع الإجازات الافتراضية للمنظمة
 */
export async function initializeDefaultLeaveTypes(
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  const leaveTypesToInsert = DEFAULT_LEAVE_TYPES.map((lt) => ({
    ...lt,
    organization_id: organizationId,
  }));

  const { error } = await supabase.from('leave_types').insert(leaveTypesToInsert);

  if (error) {
    console.error('Error initializing default leave types:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
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
  const { data, error } = await supabase
    .from('employee_leave_balances')
    .select(`
      *,
      leave_type:leave_types(*)
    `)
    .eq('employee_id', employeeId)
    .eq('year', year);

  if (error) {
    console.error('Error fetching leave balances:', error);
    return [];
  }

  return (data || []).map((balance) => ({
    ...balance,
    remaining_days: balance.total_days - balance.used_days - balance.pending_days,
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
  // جلب أنواع الإجازات
  const leaveTypes = await getLeaveTypes(organizationId);

  if (leaveTypes.length === 0) {
    return { success: false, error: 'لا توجد أنواع إجازات محددة' };
  }

  const balances = leaveTypes.map((lt) => ({
    employee_id: employeeId,
    leave_type_id: lt.id,
    organization_id: organizationId,
    year,
    total_days: lt.days_per_year,
    used_days: 0,
    pending_days: 0,
    carried_forward_days: 0,
  }));

  const { error } = await supabase
    .from('employee_leave_balances')
    .upsert(balances, {
      onConflict: 'employee_id,leave_type_id,year',
      ignoreDuplicates: true,
    });

  if (error) {
    console.error('Error initializing leave balances:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
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
  const { error } = await supabase
    .from('employee_leave_balances')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('employee_id', employeeId)
    .eq('leave_type_id', leaveTypeId)
    .eq('year', year);

  if (error) {
    console.error('Error updating leave balance:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
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
  // جلب معلومات الموظف
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', input.employee_id)
    .single();

  if (userError || !userData) {
    return { success: false, error: 'الموظف غير موجود' };
  }

  // حساب عدد أيام الإجازة
  const startDate = new Date(input.start_date);
  const endDate = new Date(input.end_date);
  let totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // إذا كانت نصف يوم
  if (input.is_half_day) {
    totalDays = 0.5;
  }

  // إنشاء طلب الإجازة
  const { data, error } = await supabase
    .from('leave_requests')
    .insert({
      employee_id: input.employee_id,
      organization_id: userData.organization_id,
      leave_type_id: input.leave_type_id,
      start_date: input.start_date,
      end_date: input.end_date,
      total_days: totalDays,
      reason: input.reason || null,
      is_half_day: input.is_half_day || false,
      half_day_type: input.half_day_type || null,
      substitute_employee_id: input.substitute_employee_id || null,
      attachment_urls: input.attachment_urls || null,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error submitting leave request:', error);
    return { success: false, error: error.message };
  }

  // تحديث الأيام المعلقة في رصيد الإجازات
  const year = startDate.getFullYear();
  await supabase.rpc('increment_pending_days', {
    p_employee_id: input.employee_id,
    p_leave_type_id: input.leave_type_id,
    p_year: year,
    p_days: totalDays,
  }).catch(() => {
    // تجاهل الخطأ إذا لم تكن الوظيفة موجودة
  });

  return { success: true, request_id: data?.id };
}

/**
 * مراجعة طلب إجازة (موافقة/رفض)
 */
export async function reviewLeaveRequest(
  input: ReviewLeaveRequestInput
): Promise<ReviewLeaveResponse> {
  const now = new Date().toISOString();
  const status = input.approved ? 'approved' : 'rejected';

  // جلب معلومات الطلب
  const { data: request, error: fetchError } = await supabase
    .from('leave_requests')
    .select('employee_id, leave_type_id, total_days, start_date')
    .eq('id', input.request_id)
    .single();

  if (fetchError || !request) {
    return { success: false, error: 'طلب الإجازة غير موجود' };
  }

  // تحديث حالة الطلب
  const { error } = await supabase
    .from('leave_requests')
    .update({
      status,
      reviewed_by: input.reviewer_id,
      reviewed_at: now,
      reviewer_notes: input.notes || null,
      updated_at: now,
    })
    .eq('id', input.request_id);

  if (error) {
    console.error('Error reviewing leave request:', error);
    return { success: false, error: error.message };
  }

  // إذا تمت الموافقة، نقل الأيام من المعلقة إلى المستخدمة
  if (input.approved && request.total_days) {
    const year = new Date(request.start_date).getFullYear();

    // تحديث رصيد الإجازات
    const { data: balance } = await supabase
      .from('employee_leave_balances')
      .select('used_days, pending_days')
      .eq('employee_id', request.employee_id)
      .eq('leave_type_id', request.leave_type_id)
      .eq('year', year)
      .single();

    if (balance) {
      await supabase
        .from('employee_leave_balances')
        .update({
          used_days: Number(balance.used_days || 0) + Number(request.total_days),
          pending_days: Math.max(0, Number(balance.pending_days || 0) - Number(request.total_days)),
          updated_at: now,
        })
        .eq('employee_id', request.employee_id)
        .eq('leave_type_id', request.leave_type_id)
        .eq('year', year);
    }
  }

  return { success: true };
}

/**
 * إلغاء طلب إجازة
 */
export async function cancelLeaveRequest(
  requestId: string,
  cancelledBy: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('leave_requests')
    .update({
      status: 'cancelled',
      cancelled_by: cancelledBy,
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .in('status', ['pending', 'approved']);

  if (error) {
    console.error('Error cancelling leave request:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * جلب طلبات الإجازة
 */
export async function getLeaveRequests(
  filter: LeaveRequestFilter,
  page: number = 1,
  perPage: number = 20
): Promise<{ data: LeaveRequestWithDetails[]; total: number }> {
  let query = supabase
    .from('leave_requests')
    .select(`
      *,
      employee:users!employee_id(id, name, email, avatar_url, job_title),
      leave_type:leave_types(id, name, name_ar, color, icon),
      reviewer:users!reviewed_by(id, name),
      substitute:users!substitute_employee_id(id, name)
    `, { count: 'exact' });

  // تطبيق الفلاتر
  if (filter.employee_id) {
    query = query.eq('employee_id', filter.employee_id);
  }
  if (filter.leave_type_id) {
    query = query.eq('leave_type_id', filter.leave_type_id);
  }
  if (filter.status) {
    if (Array.isArray(filter.status)) {
      query = query.in('status', filter.status);
    } else {
      query = query.eq('status', filter.status);
    }
  }
  if (filter.date_from) {
    query = query.gte('start_date', filter.date_from);
  }
  if (filter.date_to) {
    query = query.lte('end_date', filter.date_to);
  }
  if (filter.year) {
    query = query
      .gte('start_date', `${filter.year}-01-01`)
      .lte('end_date', `${filter.year}-12-31`);
  }

  // ترتيب وتصفح
  query = query
    .order('created_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching leave requests:', error);
    return { data: [], total: 0 };
  }

  return {
    data: (data || []) as LeaveRequestWithDetails[],
    total: count || 0,
  };
}

/**
 * جلب طلبات الإجازة المعلقة للمنظمة
 */
export async function getPendingLeaveRequests(
  organizationId: string
): Promise<LeaveRequestWithDetails[]> {
  const { data, error } = await supabase
    .from('leave_requests')
    .select(`
      *,
      employee:users!employee_id(id, name, email, avatar_url, job_title),
      leave_type:leave_types(id, name, name_ar, color, icon)
    `)
    .eq('organization_id', organizationId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching pending leave requests:', error);
    return [];
  }

  return (data || []) as LeaveRequestWithDetails[];
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

  const { data: upcomingLeaves } = await supabase
    .from('leave_requests')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('status', 'approved')
    .gte('start_date', new Date().toISOString().split('T')[0])
    .order('start_date')
    .limit(5);

  return {
    employee_id: employeeId,
    year,
    balances,
    total_taken_days: balances.reduce((sum, b) => sum + b.used_days, 0),
    total_remaining_days: balances.reduce(
      (sum, b) => sum + (b.remaining_days || 0),
      0
    ),
    upcoming_leaves: (upcomingLeaves || []) as LeaveRequest[],
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

  // إحصائيات الطلبات
  const { data: requests, count } = await supabase
    .from('leave_requests')
    .select('status, leave_type_id, total_days', { count: 'exact' })
    .eq('organization_id', organizationId)
    .gte('created_at', periodStart)
    .lte('created_at', periodEnd);

  // الموظفين في إجازة اليوم
  const { count: onLeaveToday } = await supabase
    .from('leave_requests')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'approved')
    .lte('start_date', today)
    .gte('end_date', today);

  const stats: OrganizationLeaveStats = {
    organization_id: organizationId,
    period: { start: periodStart, end: periodEnd },
    total_requests: count || 0,
    pending_requests: (requests || []).filter((r) => r.status === 'pending').length,
    approved_requests: (requests || []).filter((r) => r.status === 'approved').length,
    rejected_requests: (requests || []).filter((r) => r.status === 'rejected').length,
    employees_on_leave_today: onLeaveToday || 0,
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
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  // جلب الإجازات المعتمدة
  const { data: leaves } = await supabase
    .from('leave_requests')
    .select(`
      start_date, end_date, is_half_day,
      employee:users!employee_id(id, name),
      leave_type:leave_types(name, name_ar, color)
    `)
    .eq('organization_id', organizationId)
    .eq('status', 'approved')
    .lte('start_date', endDate)
    .gte('end_date', startDate);

  // جلب العطلات
  const { data: holidays } = await supabase
    .from('official_holidays')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .gte('date', startDate)
    .lte('date', endDate);

  // بناء التقويم
  const calendar: LeaveCalendarEntry[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const holiday = holidays?.find((h) => h.date === date);

    const employeesOnLeave = (leaves || [])
      .filter(
        (l) => date >= l.start_date && date <= l.end_date
      )
      .map((l) => ({
        employee_id: l.employee?.id || '',
        employee_name: l.employee?.name || '',
        leave_type: l.leave_type?.name_ar || '',
        leave_type_color: l.leave_type?.color || '#gray',
        is_half_day: l.is_half_day,
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
 * حذف عطلة رسمية
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
