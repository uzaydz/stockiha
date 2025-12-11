/**
 * 💰 Payroll Service - خدمة الرواتب
 */

import { supabase } from '@/lib/supabase';
import type {
  SalaryStructure,
  PayrollRecord,
  PayrollWithEmployee,
  EmployeeLoan,
  LoanPayment,
  PayrollStatus,
  LoanStatus,
  CreateSalaryStructureInput,
  CalculatePayrollInput,
  RequestLoanInput,
  PayrollFilter,
  EmployeePayrollSummary,
  OrganizationPayrollSummary,
  PayrollCalculationResult,
  PaySlip,
} from '@/types/hr/payroll';

// ============================================
// 💵 Salary Structure
// ============================================

/**
 * جلب هيكل راتب الموظف الحالي
 */
export async function getCurrentSalaryStructure(
  employeeId: string
): Promise<SalaryStructure | null> {
  const { data, error } = await supabase
    .from('salary_structures')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('is_current', true)
    .order('effective_from', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching salary structure:', error);
    return null;
  }

  return data as SalaryStructure | null;
}

/**
 * جلب سجل هياكل الرواتب للموظف
 */
export async function getSalaryStructureHistory(
  employeeId: string
): Promise<SalaryStructure[]> {
  const { data, error } = await supabase
    .from('salary_structures')
    .select('*')
    .eq('employee_id', employeeId)
    .order('effective_from', { ascending: false });

  if (error) {
    console.error('Error fetching salary history:', error);
    return [];
  }

  return data as SalaryStructure[];
}

/**
 * إنشاء هيكل راتب جديد
 */
export async function createSalaryStructure(
  organizationId: string,
  input: CreateSalaryStructureInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  // إلغاء الهيكل الحالي
  await supabase
    .from('salary_structures')
    .update({ is_current: false, effective_to: input.effective_from })
    .eq('employee_id', input.employee_id)
    .eq('is_current', true);

  // حساب معدل الساعة واليوم إذا لم يتم تقديمهما
  const hourlyRate = input.hourly_rate || input.basic_salary / 176; // 22 يوم * 8 ساعات
  const dailyRate = input.daily_rate || input.basic_salary / 22;

  // إنشاء الهيكل الجديد
  const { data, error } = await supabase
    .from('salary_structures')
    .insert({
      employee_id: input.employee_id,
      organization_id: organizationId,
      basic_salary: input.basic_salary,
      currency: input.currency || 'DZD',
      housing_allowance: input.housing_allowance || 0,
      transport_allowance: input.transport_allowance || 0,
      food_allowance: input.food_allowance || 0,
      phone_allowance: input.phone_allowance || 0,
      other_allowances: input.other_allowances || {},
      social_insurance: input.social_insurance || 0,
      health_insurance: input.health_insurance || 0,
      tax_amount: input.tax_amount || 0,
      other_deductions: input.other_deductions || {},
      payment_method: input.payment_method || 'bank_transfer',
      bank_name: input.bank_name,
      bank_account_number: input.bank_account_number,
      effective_from: input.effective_from,
      is_current: true,
      hourly_rate: hourlyRate,
      daily_rate: dailyRate,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating salary structure:', error);
    return { success: false, error: error.message };
  }

  return { success: true, id: data.id };
}

/**
 * تحديث هيكل الراتب
 */
export async function updateSalaryStructure(
  id: string,
  updates: Partial<CreateSalaryStructureInput>
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('salary_structures')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Error updating salary structure:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * جلب جميع هياكل الرواتب للمنظمة
 */
export async function getSalaryStructures(
  organizationId: string
): Promise<SalaryStructure[]> {
  const { data, error } = await supabase
    .from('salary_structures')
    .select(`
      *,
      employee:users!employee_id(id, name, email, avatar_url, job_title)
    `)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching salary structures:', error);
    return [];
  }

  return (data || []) as SalaryStructure[];
}

// ============================================
// 📋 Payroll Records
// ============================================

/**
 * حساب الراتب الشهري للموظف
 */
export async function calculatePayroll(
  input: CalculatePayrollInput
): Promise<PayrollCalculationResult> {
  // جلب هيكل الراتب
  const salaryStructure = await getCurrentSalaryStructure(input.employee_id);
  if (!salaryStructure) {
    return { success: false, error: 'لا يوجد هيكل راتب للموظف' };
  }

  // جلب معلومات الموظف
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', input.employee_id)
    .single();

  if (!userData) {
    return { success: false, error: 'الموظف غير موجود' };
  }

  // جلب بيانات الحضور للشهر
  const startDate = `${input.year}-${String(input.month).padStart(2, '0')}-01`;
  const endDate = new Date(input.year, input.month, 0).toISOString().split('T')[0];

  const { data: attendanceData } = await supabase
    .from('employee_attendance')
    .select('status, work_duration_minutes, late_minutes, overtime_minutes')
    .eq('employee_id', input.employee_id)
    .gte('attendance_date', startDate)
    .lte('attendance_date', endDate);

  // حساب الخصومات والإضافات
  let absentDays = 0;
  let totalLateMinutes = 0;
  let totalOvertimeMinutes = 0;

  attendanceData?.forEach((record) => {
    if (record.status === 'absent') absentDays++;
    totalLateMinutes += record.late_minutes || 0;
    totalOvertimeMinutes += record.overtime_minutes || 0;
  });

  const basicSalary = Number(salaryStructure.basic_salary);
  const dailyRate = basicSalary / 22;
  const hourlyRate = dailyRate / 8;

  // حساب البنود
  const totalAllowances =
    Number(salaryStructure.housing_allowance || 0) +
    Number(salaryStructure.transport_allowance || 0) +
    Number(salaryStructure.food_allowance || 0) +
    Number(salaryStructure.phone_allowance || 0);

  const absentDeduction = absentDays * dailyRate;
  const lateDeduction = Math.floor(totalLateMinutes / 60) * (hourlyRate * 0.5);
  const overtimeAmount = Math.floor(totalOvertimeMinutes / 60) * (hourlyRate * 1.5);

  const totalDeductions =
    absentDeduction +
    lateDeduction +
    Number(salaryStructure.social_insurance || 0) +
    Number(salaryStructure.health_insurance || 0) +
    Number(salaryStructure.tax_amount || 0);

  const grossSalary = basicSalary + totalAllowances + overtimeAmount;
  const netSalary = grossSalary - totalDeductions;

  // التحقق من وجود سجل موجود
  const { data: existingRecord } = await supabase
    .from('payroll_records')
    .select('id')
    .eq('employee_id', input.employee_id)
    .eq('pay_period_month', input.month)
    .eq('pay_period_year', input.year)
    .single();

  const payrollData = {
    employee_id: input.employee_id,
    organization_id: userData.organization_id,
    salary_structure_id: salaryStructure.id,
    pay_period_month: input.month,
    pay_period_year: input.year,
    basic_salary: basicSalary,
    housing_allowance: salaryStructure.housing_allowance,
    transport_allowance: salaryStructure.transport_allowance,
    food_allowance: salaryStructure.food_allowance,
    phone_allowance: salaryStructure.phone_allowance,
    total_allowances: totalAllowances,
    overtime_hours: totalOvertimeMinutes / 60,
    overtime_amount: overtimeAmount,
    total_earnings: grossSalary,
    absent_days: absentDays,
    absent_deduction: absentDeduction,
    late_deduction: lateDeduction,
    social_insurance: salaryStructure.social_insurance,
    health_insurance: salaryStructure.health_insurance,
    tax_deduction: salaryStructure.tax_amount,
    total_deductions: totalDeductions,
    gross_salary: grossSalary,
    net_salary: netSalary,
    status: 'draft',
    updated_at: new Date().toISOString(),
  };

  if (existingRecord) {
    // تحديث السجل الموجود
    const { error } = await supabase
      .from('payroll_records')
      .update(payrollData)
      .eq('id', existingRecord.id);

    if (error) {
      console.error('Error updating payroll:', error);
      return { success: false, error: error.message };
    }

    return { success: true, payroll_id: existingRecord.id, net_salary: netSalary };
  } else {
    // إنشاء سجل جديد
    const { data, error } = await supabase
      .from('payroll_records')
      .insert(payrollData)
      .select('id')
      .single();

    if (error) {
      console.error('Error creating payroll:', error);
      return { success: false, error: error.message };
    }

    return { success: true, payroll_id: data?.id, net_salary: netSalary };
  }
}

/**
 * حساب الرواتب لجميع موظفي المنظمة
 */
export async function calculateBulkPayroll(
  organizationId: string,
  month: number,
  year: number
): Promise<{ success: boolean; processed: number; errors: string[] }> {
  // جلب جميع الموظفين
  const { data: employees } = await supabase
    .from('users')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .eq('role', 'employee');

  if (!employees || employees.length === 0) {
    return { success: false, processed: 0, errors: ['لا يوجد موظفين'] };
  }

  const errors: string[] = [];
  let processed = 0;

  for (const employee of employees) {
    const result = await calculatePayroll({
      employee_id: employee.id,
      month,
      year,
    });

    if (result.success) {
      processed++;
    } else {
      errors.push(`الموظف ${employee.id}: ${result.error}`);
    }
  }

  return {
    success: errors.length === 0,
    processed,
    errors,
  };
}

/**
 * جلب سجلات الرواتب
 */
export async function getPayrollRecords(
  organizationId: string,
  filter: PayrollFilter,
  page: number = 1,
  perPage: number = 20
): Promise<{ data: PayrollWithEmployee[]; total: number }> {
  let query = supabase
    .from('payroll_records')
    .select(`
      *,
      employee:users!employee_id(id, name, email, avatar_url, job_title),
      approver:users!approved_by(id, name)
    `, { count: 'exact' })
    .eq('organization_id', organizationId);

  if (filter.employee_id) {
    query = query.eq('employee_id', filter.employee_id);
  }
  if (filter.month) {
    query = query.eq('pay_period_month', filter.month);
  }
  if (filter.year) {
    query = query.eq('pay_period_year', filter.year);
  }
  if (filter.status) {
    if (Array.isArray(filter.status)) {
      query = query.in('status', filter.status);
    } else {
      query = query.eq('status', filter.status);
    }
  }

  query = query
    .order('pay_period_year', { ascending: false })
    .order('pay_period_month', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching payroll records:', error);
    return { data: [], total: 0 };
  }

  return {
    data: (data || []) as PayrollWithEmployee[],
    total: count || 0,
  };
}

/**
 * جلب سجل راتب محدد
 */
export async function getPayrollRecord(
  id: string
): Promise<PayrollWithEmployee | null> {
  const { data, error } = await supabase
    .from('payroll_records')
    .select(`
      *,
      employee:users!employee_id(id, name, email, avatar_url, job_title),
      approver:users!approved_by(id, name)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching payroll record:', error);
    return null;
  }

  return data as PayrollWithEmployee;
}

/**
 * تحديث حالة الراتب
 */
export async function updatePayrollStatus(
  id: string,
  status: PayrollStatus,
  approvedBy?: string
): Promise<{ success: boolean; error?: string }> {
  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'approved' && approvedBy) {
    updates.approved_by = approvedBy;
    updates.approved_at = new Date().toISOString();
  }

  if (status === 'paid') {
    updates.payment_date = new Date().toISOString().split('T')[0];
  }

  const { error } = await supabase
    .from('payroll_records')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error updating payroll status:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * تأكيد صرف الراتب
 */
export async function markPayrollAsPaid(
  id: string
): Promise<{ success: boolean; error?: string }> {
  return updatePayrollStatus(id, 'paid');
}

/**
 * دفع رواتب متعددة
 */
export async function bulkPayPayroll(
  payrollIds: string[],
  paymentDate: string,
  paymentReference?: string
): Promise<{ success: boolean; paid: number; error?: string }> {
  const { error, count } = await supabase
    .from('payroll_records')
    .update({
      status: 'paid',
      payment_date: paymentDate,
      payment_reference: paymentReference,
      updated_at: new Date().toISOString(),
    })
    .in('id', payrollIds)
    .eq('status', 'approved');

  if (error) {
    console.error('Error bulk paying payroll:', error);
    return { success: false, paid: 0, error: error.message };
  }

  return { success: true, paid: count || 0 };
}

// ============================================
// 💳 Loans & Advances
// ============================================

/**
 * طلب قرض/سلفة
 */
export async function requestLoan(
  organizationId: string,
  input: RequestLoanInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  // حساب عدد الأقساط
  const totalInstallments = Math.ceil(input.principal_amount / input.monthly_deduction);

  const { data, error } = await supabase
    .from('employee_loans')
    .insert({
      employee_id: input.employee_id,
      organization_id: organizationId,
      loan_type: input.loan_type,
      principal_amount: input.principal_amount,
      remaining_amount: input.principal_amount,
      monthly_deduction: input.monthly_deduction,
      total_installments: totalInstallments,
      paid_installments: 0,
      request_date: new Date().toISOString().split('T')[0],
      status: 'pending',
      reason: input.reason,
      notes: input.notes,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error requesting loan:', error);
    return { success: false, error: error.message };
  }

  return { success: true, id: data.id };
}

/**
 * الموافقة على قرض
 */
export async function approveLoan(
  loanId: string,
  approvedBy: string,
  startDeductionDate: string
): Promise<{ success: boolean; error?: string }> {
  const { data: loan } = await supabase
    .from('employee_loans')
    .select('monthly_deduction, total_installments')
    .eq('id', loanId)
    .single();

  if (!loan) {
    return { success: false, error: 'القرض غير موجود' };
  }

  // حساب تاريخ الانتهاء المتوقع
  const expectedEndDate = new Date(startDeductionDate);
  expectedEndDate.setMonth(expectedEndDate.getMonth() + loan.total_installments);

  const { error } = await supabase
    .from('employee_loans')
    .update({
      status: 'active',
      approved_by: approvedBy,
      approval_date: new Date().toISOString().split('T')[0],
      start_deduction_date: startDeductionDate,
      expected_end_date: expectedEndDate.toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    })
    .eq('id', loanId);

  if (error) {
    console.error('Error approving loan:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * رفض قرض
 */
export async function rejectLoan(
  loanId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('employee_loans')
    .update({
      status: 'rejected',
      rejection_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', loanId);

  if (error) {
    console.error('Error rejecting loan:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * جلب قروض الموظف
 */
export async function getEmployeeLoans(
  employeeId: string,
  status?: LoanStatus
): Promise<EmployeeLoan[]> {
  let query = supabase
    .from('employee_loans')
    .select('*')
    .eq('employee_id', employeeId);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('request_date', { ascending: false });

  if (error) {
    console.error('Error fetching employee loans:', error);
    return [];
  }

  return data as EmployeeLoan[];
}

/**
 * جلب القروض المعلقة للمنظمة
 */
export async function getPendingLoans(
  organizationId: string
): Promise<(EmployeeLoan & { employee: { name: string } })[]> {
  const { data, error } = await supabase
    .from('employee_loans')
    .select(`
      *,
      employee:users!employee_id(name)
    `)
    .eq('organization_id', organizationId)
    .eq('status', 'pending')
    .order('request_date');

  if (error) {
    console.error('Error fetching pending loans:', error);
    return [];
  }

  return data as (EmployeeLoan & { employee: { name: string } })[];
}

/**
 * تسجيل دفعة قرض
 */
export async function recordLoanPayment(
  loanId: string,
  amount: number,
  payrollId?: string
): Promise<{ success: boolean; error?: string }> {
  // جلب معلومات القرض
  const { data: loan } = await supabase
    .from('employee_loans')
    .select('*')
    .eq('id', loanId)
    .single();

  if (!loan) {
    return { success: false, error: 'القرض غير موجود' };
  }

  // تسجيل الدفعة
  const { error: paymentError } = await supabase.from('loan_payments').insert({
    loan_id: loanId,
    payroll_id: payrollId,
    payment_date: new Date().toISOString().split('T')[0],
    amount,
    installment_number: loan.paid_installments + 1,
    payment_method: payrollId ? 'salary_deduction' : 'cash',
  });

  if (paymentError) {
    console.error('Error recording loan payment:', paymentError);
    return { success: false, error: paymentError.message };
  }

  // تحديث القرض
  const newRemainingAmount = loan.remaining_amount - amount;
  const newPaidInstallments = loan.paid_installments + 1;
  const newStatus = newRemainingAmount <= 0 ? 'completed' : 'active';

  const { error: updateError } = await supabase
    .from('employee_loans')
    .update({
      remaining_amount: Math.max(0, newRemainingAmount),
      paid_installments: newPaidInstallments,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', loanId);

  if (updateError) {
    console.error('Error updating loan:', updateError);
    return { success: false, error: updateError.message };
  }

  return { success: true };
}

// ============================================
// 📊 Statistics & Reports
// ============================================

/**
 * جلب ملخص راتب الموظف السنوي
 */
export async function getEmployeePayrollSummary(
  employeeId: string,
  year: number
): Promise<EmployeePayrollSummary> {
  const { data } = await supabase
    .from('payroll_records')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('pay_period_year', year)
    .eq('status', 'paid');

  const summary: EmployeePayrollSummary = {
    employee_id: employeeId,
    year,
    total_gross: 0,
    total_net: 0,
    total_deductions: 0,
    total_overtime: 0,
    total_bonus: 0,
    months_paid: 0,
    avg_monthly_net: 0,
  };

  if (data) {
    data.forEach((record) => {
      summary.total_gross += record.gross_salary || 0;
      summary.total_net += record.net_salary || 0;
      summary.total_deductions += record.total_deductions || 0;
      summary.total_overtime += record.overtime_amount || 0;
      summary.total_bonus += record.bonus_amount || 0;
      summary.months_paid++;
    });

    summary.avg_monthly_net =
      summary.months_paid > 0
        ? Math.round(summary.total_net / summary.months_paid)
        : 0;
  }

  return summary;
}

/**
 * جلب ملخص الرواتب للمنظمة
 */
export async function getOrganizationPayrollSummary(
  organizationId: string,
  month: number,
  year: number
): Promise<OrganizationPayrollSummary> {
  const { data } = await supabase
    .from('payroll_records')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('pay_period_month', month)
    .eq('pay_period_year', year);

  const summary: OrganizationPayrollSummary = {
    organization_id: organizationId,
    month,
    year,
    total_employees: 0,
    total_gross: 0,
    total_net: 0,
    total_deductions: 0,
    total_allowances: 0,
    total_overtime: 0,
    status_breakdown: {
      draft: 0,
      pending: 0,
      approved: 0,
      paid: 0,
    },
  };

  if (data) {
    summary.total_employees = data.length;
    data.forEach((record) => {
      summary.total_gross += record.gross_salary || 0;
      summary.total_net += record.net_salary || 0;
      summary.total_deductions += record.total_deductions || 0;
      summary.total_allowances += record.total_allowances || 0;
      summary.total_overtime += record.overtime_amount || 0;

      const status = record.status as keyof typeof summary.status_breakdown;
      if (summary.status_breakdown[status] !== undefined) {
        summary.status_breakdown[status]++;
      }
    });
  }

  return summary;
}

/**
 * إنشاء كشف راتب
 */
export async function generatePaySlip(
  payrollId: string
): Promise<PaySlip | null> {
  const payroll = await getPayrollRecord(payrollId);

  if (!payroll) {
    return null;
  }

  const monthNames = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  const paySlip: PaySlip = {
    employee: {
      id: payroll.employee?.id || '',
      name: payroll.employee?.name || '',
      email: payroll.employee?.email || '',
      job_title: payroll.employee?.job_title || undefined,
    },
    period: {
      month: payroll.pay_period_month,
      year: payroll.pay_period_year,
      month_name: monthNames[payroll.pay_period_month - 1],
    },
    earnings: {
      basic_salary: payroll.basic_salary,
      allowances: {
        housing: payroll.housing_allowance,
        transport: payroll.transport_allowance,
        food: payroll.food_allowance,
        phone: payroll.phone_allowance,
        other: payroll.other_allowances,
      },
      overtime: {
        hours: payroll.overtime_hours,
        amount: payroll.overtime_amount,
      },
      bonus: payroll.bonus_amount,
      commission: payroll.commission_amount,
      total: payroll.total_earnings,
    },
    deductions: {
      absent: {
        days: payroll.absent_days,
        amount: payroll.absent_deduction,
      },
      late: payroll.late_deduction,
      loan: payroll.loan_deduction,
      advance: payroll.advance_deduction,
      social_insurance: payroll.social_insurance,
      health_insurance: payroll.health_insurance,
      tax: payroll.tax_deduction,
      other: payroll.other_deductions,
      total: payroll.total_deductions,
    },
    summary: {
      gross: payroll.gross_salary,
      deductions: payroll.total_deductions,
      net: payroll.net_salary,
    },
    payment: {
      method: payroll.payment_method || 'bank_transfer',
      date: payroll.payment_date || undefined,
      reference: payroll.payment_reference || undefined,
    },
  };

  return paySlip;
}
