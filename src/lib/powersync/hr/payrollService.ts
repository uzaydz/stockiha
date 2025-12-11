/**
 * 💰 Payroll Service (PowerSync) - خدمة الرواتب أوفلاين فيرست
 * v4.0 - 2025-12-10
 */

import { powerSync } from '../PowerSyncService';
import { supabase } from '@/integrations/supabase/client';
import type {
  SalaryStructure,
  SalaryStructureWithEmployee,
  PayrollRecord,
  PayrollRecordWithDetails,
  EmployeeLoan,
  LoanWithEmployee,
  LoanPayment,
  CreateSalaryStructureInput,
  CreatePayrollInput,
  CreateLoanInput,
  PayrollFilter,
  LoanFilter,
  PayrollSummary,
  SalarySlip,
} from '@/types/hr/payroll';

// ============================================
// 💵 Salary Structures
// ============================================

/**
 * جلب هيكل الراتب الحالي للموظف
 */
export async function getCurrentSalaryStructure(
  employeeId: string
): Promise<SalaryStructure | null> {
  const result = await powerSync.queryOne<SalaryStructure>({
    sql: `SELECT * FROM salary_structures
          WHERE employee_id = ? AND is_current = 1`,
    parameters: [employeeId],
  });

  return result;
}

/**
 * جلب جميع هياكل الرواتب للمنظمة
 */
export async function getSalaryStructures(
  organizationId: string
): Promise<SalaryStructureWithEmployee[]> {
  const data = await powerSync.query<SalaryStructure & {
    employee_name: string;
    employee_email: string;
    employee_job_title: string;
  }>({
    sql: `
      SELECT
        s.*,
        u.name as employee_name,
        u.email as employee_email,
        u.job_title as employee_job_title
      FROM salary_structures s
      LEFT JOIN users u ON s.employee_id = u.id
      WHERE s.organization_id = ? AND s.is_current = 1
      ORDER BY u.name
    `,
    parameters: [organizationId],
  });

  return data.map((record) => ({
    ...record,
    employee: {
      id: record.employee_id,
      name: record.employee_name,
      email: record.employee_email,
      job_title: record.employee_job_title,
    },
  })) as SalaryStructureWithEmployee[];
}

/**
 * إنشاء هيكل راتب جديد
 */
export async function createSalaryStructure(
  input: CreateSalaryStructureInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // Deactivate current salary structure
  const currentStructure = await getCurrentSalaryStructure(input.employee_id);
  if (currentStructure) {
    await powerSync.mutate({
      table: 'salary_structures',
      data: {
        id: currentStructure.id,
        is_current: 0,
        effective_to: input.effective_from || now.split('T')[0],
        updated_at: now,
      },
    });
  }

  // Calculate rates
  const basicSalary = input.basic_salary;
  const dailyRate = basicSalary / 30;
  const hourlyRate = dailyRate / 8;

  const success = await powerSync.mutate({
    table: 'salary_structures',
    data: {
      id,
      organization_id: input.organization_id,
      employee_id: input.employee_id,
      basic_salary: basicSalary,
      currency: input.currency || 'SAR',
      housing_allowance: input.housing_allowance || 0,
      transport_allowance: input.transport_allowance || 0,
      food_allowance: input.food_allowance || 0,
      phone_allowance: input.phone_allowance || 0,
      other_allowances: input.other_allowances ? JSON.stringify(input.other_allowances) : null,
      social_insurance: input.social_insurance || 0,
      health_insurance: input.health_insurance || 0,
      tax_amount: input.tax_amount || 0,
      other_deductions: input.other_deductions ? JSON.stringify(input.other_deductions) : null,
      payment_method: input.payment_method || 'bank_transfer',
      bank_name: input.bank_name,
      bank_account_number: input.bank_account_number,
      effective_from: input.effective_from || now.split('T')[0],
      effective_to: null,
      is_current: 1,
      hourly_rate: hourlyRate,
      daily_rate: dailyRate,
      created_at: now,
      updated_at: now,
    },
  });

  return { success, id: success ? id : undefined };
}

/**
 * تحديث هيكل الراتب
 */
export async function updateSalaryStructure(
  id: string,
  updates: Partial<CreateSalaryStructureInput>
): Promise<{ success: boolean; error?: string }> {
  const success = await powerSync.mutate({
    table: 'salary_structures',
    data: {
      id,
      ...updates,
      other_allowances: updates.other_allowances
        ? JSON.stringify(updates.other_allowances)
        : undefined,
      other_deductions: updates.other_deductions
        ? JSON.stringify(updates.other_deductions)
        : undefined,
      updated_at: new Date().toISOString(),
    },
  });

  return { success };
}

// ============================================
// 📋 Payroll Records
// ============================================

/**
 * جلب سجلات الرواتب
 */
export async function getPayrollRecords(
  filter: PayrollFilter,
  page: number = 1,
  perPage: number = 20
): Promise<{ data: PayrollRecordWithDetails[]; total: number }> {
  const offset = (page - 1) * perPage;
  let whereClause = '1=1';
  const params: (string | number)[] = [];

  if (filter.organization_id) {
    whereClause += ' AND p.organization_id = ?';
    params.push(filter.organization_id);
  }
  if (filter.employee_id) {
    whereClause += ' AND p.employee_id = ?';
    params.push(filter.employee_id);
  }
  if (filter.month) {
    whereClause += ' AND p.pay_period_month = ?';
    params.push(filter.month);
  }
  if (filter.year) {
    whereClause += ' AND p.pay_period_year = ?';
    params.push(filter.year);
  }
  if (filter.status) {
    if (Array.isArray(filter.status)) {
      whereClause += ` AND p.status IN (${filter.status.map(() => '?').join(',')})`;
      params.push(...filter.status);
    } else {
      whereClause += ' AND p.status = ?';
      params.push(filter.status);
    }
  }

  // Get total count
  const countResult = await powerSync.queryOne<{ count: number }>({
    sql: `SELECT COUNT(*) as count FROM payroll_records p WHERE ${whereClause}`,
    parameters: params,
  });

  // Get paginated data
  const data = await powerSync.query<PayrollRecord & {
    employee_name: string;
    employee_email: string;
    employee_job_title: string;
    employee_department: string;
  }>({
    sql: `
      SELECT
        p.*,
        u.name as employee_name,
        u.email as employee_email,
        u.job_title as employee_job_title,
        u.department as employee_department
      FROM payroll_records p
      LEFT JOIN users u ON p.employee_id = u.id
      WHERE ${whereClause}
      ORDER BY p.pay_period_year DESC, p.pay_period_month DESC
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
        job_title: record.employee_job_title,
        department: record.employee_department,
      },
    })) as PayrollRecordWithDetails[],
    total: countResult?.count || 0,
  };
}

/**
 * إنشاء سجل راتب
 */
export async function createPayrollRecord(
  input: CreatePayrollInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // Get salary structure
  const salaryStructure = await getCurrentSalaryStructure(input.employee_id);
  if (!salaryStructure) {
    return { success: false, error: 'لا يوجد هيكل راتب للموظف' };
  }

  // Calculate totals
  const totalAllowances =
    (salaryStructure.housing_allowance || 0) +
    (salaryStructure.transport_allowance || 0) +
    (salaryStructure.food_allowance || 0) +
    (salaryStructure.phone_allowance || 0) +
    (input.other_allowances || 0);

  const totalEarnings =
    salaryStructure.basic_salary +
    totalAllowances +
    (input.overtime_amount || 0) +
    (input.bonus_amount || 0) +
    (input.commission_amount || 0) +
    (input.incentives || 0);

  const totalDeductions =
    (input.absent_deduction || 0) +
    (input.late_deduction || 0) +
    (input.advance_deduction || 0) +
    (input.loan_deduction || 0) +
    (salaryStructure.social_insurance || 0) +
    (salaryStructure.health_insurance || 0) +
    (salaryStructure.tax_amount || 0) +
    (input.other_deductions || 0);

  const grossSalary = totalEarnings;
  const netSalary = grossSalary - totalDeductions;

  const success = await powerSync.mutate({
    table: 'payroll_records',
    data: {
      id,
      organization_id: input.organization_id,
      employee_id: input.employee_id,
      salary_structure_id: salaryStructure.id,
      pay_period_month: input.pay_period_month,
      pay_period_year: input.pay_period_year,
      basic_salary: salaryStructure.basic_salary,
      housing_allowance: salaryStructure.housing_allowance,
      transport_allowance: salaryStructure.transport_allowance,
      food_allowance: salaryStructure.food_allowance,
      phone_allowance: salaryStructure.phone_allowance,
      other_allowances: input.other_allowances || 0,
      total_allowances: totalAllowances,
      overtime_hours: input.overtime_hours || 0,
      overtime_amount: input.overtime_amount || 0,
      bonus_amount: input.bonus_amount || 0,
      commission_amount: input.commission_amount || 0,
      incentives: input.incentives || 0,
      total_earnings: totalEarnings,
      absent_days: input.absent_days || 0,
      absent_deduction: input.absent_deduction || 0,
      late_deduction: input.late_deduction || 0,
      advance_deduction: input.advance_deduction || 0,
      loan_deduction: input.loan_deduction || 0,
      social_insurance: salaryStructure.social_insurance,
      health_insurance: salaryStructure.health_insurance,
      tax_deduction: salaryStructure.tax_amount,
      other_deductions: input.other_deductions || 0,
      total_deductions: totalDeductions,
      gross_salary: grossSalary,
      net_salary: netSalary,
      status: 'draft',
      notes: input.notes,
      details: input.details ? JSON.stringify(input.details) : null,
      created_at: now,
      updated_at: now,
    },
  });

  return { success, id: success ? id : undefined };
}

/**
 * تحديث سجل الراتب
 */
export async function updatePayrollRecord(
  id: string,
  updates: Partial<PayrollRecord>
): Promise<{ success: boolean; error?: string }> {
  const success = await powerSync.mutate({
    table: 'payroll_records',
    data: {
      id,
      ...updates,
      details: updates.details ? JSON.stringify(updates.details) : undefined,
      updated_at: new Date().toISOString(),
    },
  });

  return { success };
}

/**
 * الموافقة على سجل الراتب
 */
export async function approvePayrollRecord(
  id: string,
  approvedBy: string
): Promise<{ success: boolean; error?: string }> {
  const now = new Date().toISOString();

  const success = await powerSync.mutate({
    table: 'payroll_records',
    data: {
      id,
      status: 'approved',
      approved_by: approvedBy,
      approved_at: now,
      updated_at: now,
    },
  });

  return { success };
}

/**
 * تسجيل دفع الراتب
 */
export async function markPayrollAsPaid(
  id: string,
  paymentDetails: {
    payment_date: string;
    payment_reference?: string;
    payment_method?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const success = await powerSync.mutate({
    table: 'payroll_records',
    data: {
      id,
      status: 'paid',
      payment_date: paymentDetails.payment_date,
      payment_reference: paymentDetails.payment_reference,
      payment_method: paymentDetails.payment_method,
      updated_at: new Date().toISOString(),
    },
  });

  return { success };
}

/**
 * جلب ملخص الرواتب للشهر
 */
export async function getPayrollSummary(
  organizationId: string,
  month: number,
  year: number
): Promise<PayrollSummary> {
  const data = await powerSync.query<PayrollRecord>({
    sql: `SELECT * FROM payroll_records
          WHERE organization_id = ? AND pay_period_month = ? AND pay_period_year = ?`,
    parameters: [organizationId, month, year],
  });

  const summary: PayrollSummary = {
    month,
    year,
    total_employees: data.length,
    total_basic_salary: data.reduce((sum, r) => sum + (r.basic_salary || 0), 0),
    total_allowances: data.reduce((sum, r) => sum + (r.total_allowances || 0), 0),
    total_deductions: data.reduce((sum, r) => sum + (r.total_deductions || 0), 0),
    total_gross: data.reduce((sum, r) => sum + (r.gross_salary || 0), 0),
    total_net: data.reduce((sum, r) => sum + (r.net_salary || 0), 0),
    status_breakdown: {
      draft: data.filter((r) => r.status === 'draft').length,
      pending: data.filter((r) => r.status === 'pending').length,
      approved: data.filter((r) => r.status === 'approved').length,
      paid: data.filter((r) => r.status === 'paid').length,
    },
  };

  return summary;
}

// ============================================
// 💳 Employee Loans
// ============================================

/**
 * جلب قروض الموظف
 */
export async function getEmployeeLoans(
  filter: LoanFilter,
  page: number = 1,
  perPage: number = 20
): Promise<{ data: LoanWithEmployee[]; total: number }> {
  const offset = (page - 1) * perPage;
  let whereClause = '1=1';
  const params: (string | number)[] = [];

  if (filter.organization_id) {
    whereClause += ' AND l.organization_id = ?';
    params.push(filter.organization_id);
  }
  if (filter.employee_id) {
    whereClause += ' AND l.employee_id = ?';
    params.push(filter.employee_id);
  }
  if (filter.status) {
    if (Array.isArray(filter.status)) {
      whereClause += ` AND l.status IN (${filter.status.map(() => '?').join(',')})`;
      params.push(...filter.status);
    } else {
      whereClause += ' AND l.status = ?';
      params.push(filter.status);
    }
  }
  if (filter.loan_type) {
    whereClause += ' AND l.loan_type = ?';
    params.push(filter.loan_type);
  }

  // Get total count
  const countResult = await powerSync.queryOne<{ count: number }>({
    sql: `SELECT COUNT(*) as count FROM employee_loans l WHERE ${whereClause}`,
    parameters: params,
  });

  // Get paginated data
  const data = await powerSync.query<EmployeeLoan & {
    employee_name: string;
    employee_email: string;
  }>({
    sql: `
      SELECT
        l.*,
        u.name as employee_name,
        u.email as employee_email
      FROM employee_loans l
      LEFT JOIN users u ON l.employee_id = u.id
      WHERE ${whereClause}
      ORDER BY l.created_at DESC
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
      },
    })) as LoanWithEmployee[],
    total: countResult?.count || 0,
  };
}

/**
 * إنشاء طلب قرض
 */
export async function createLoanRequest(
  input: CreateLoanInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const success = await powerSync.mutate({
    table: 'employee_loans',
    data: {
      id,
      organization_id: input.organization_id,
      employee_id: input.employee_id,
      loan_type: input.loan_type,
      principal_amount: input.principal_amount,
      remaining_amount: input.principal_amount,
      monthly_deduction: input.monthly_deduction,
      total_installments: input.total_installments,
      paid_installments: 0,
      request_date: now.split('T')[0],
      status: 'pending',
      reason: input.reason,
      notes: input.notes,
      created_at: now,
      updated_at: now,
    },
  });

  return { success, id: success ? id : undefined };
}

/**
 * الموافقة على القرض
 */
export async function approveLoan(
  loanId: string,
  approvedBy: string,
  startDeductionDate: string
): Promise<{ success: boolean; error?: string }> {
  const loan = await powerSync.queryOne<EmployeeLoan>({
    sql: 'SELECT * FROM employee_loans WHERE id = ?',
    parameters: [loanId],
  });

  if (!loan) {
    return { success: false, error: 'القرض غير موجود' };
  }

  // Calculate expected end date
  const startDate = new Date(startDeductionDate);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + loan.total_installments);

  const now = new Date().toISOString();

  const success = await powerSync.mutate({
    table: 'employee_loans',
    data: {
      id: loanId,
      status: 'active',
      approved_by: approvedBy,
      approval_date: now.split('T')[0],
      start_deduction_date: startDeductionDate,
      expected_end_date: endDate.toISOString().split('T')[0],
      updated_at: now,
    },
  });

  return { success };
}

/**
 * رفض القرض
 */
export async function rejectLoan(
  loanId: string,
  rejectedBy: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const success = await powerSync.mutate({
    table: 'employee_loans',
    data: {
      id: loanId,
      status: 'rejected',
      approved_by: rejectedBy,
      rejection_reason: reason,
      updated_at: new Date().toISOString(),
    },
  });

  return { success };
}

/**
 * تسجيل دفعة قرض
 */
export async function recordLoanPayment(
  loanId: string,
  payrollId: string | null,
  amount: number
): Promise<{ success: boolean; error?: string }> {
  const loan = await powerSync.queryOne<EmployeeLoan>({
    sql: 'SELECT * FROM employee_loans WHERE id = ?',
    parameters: [loanId],
  });

  if (!loan) {
    return { success: false, error: 'القرض غير موجود' };
  }

  const now = new Date().toISOString();
  const paymentId = crypto.randomUUID();

  // Create payment record
  await powerSync.mutate({
    table: 'loan_payments',
    data: {
      id: paymentId,
      organization_id: loan.organization_id,
      loan_id: loanId,
      payroll_id: payrollId,
      payment_date: now.split('T')[0],
      amount,
      installment_number: loan.paid_installments + 1,
      created_at: now,
    },
  });

  // Update loan
  const newRemainingAmount = loan.remaining_amount - amount;
  const newPaidInstallments = loan.paid_installments + 1;
  const isCompleted = newRemainingAmount <= 0 || newPaidInstallments >= loan.total_installments;

  const success = await powerSync.mutate({
    table: 'employee_loans',
    data: {
      id: loanId,
      remaining_amount: Math.max(0, newRemainingAmount),
      paid_installments: newPaidInstallments,
      status: isCompleted ? 'completed' : 'active',
      updated_at: now,
    },
  });

  return { success };
}

// ============================================
// 🔄 Watch for Real-time Updates
// ============================================

/**
 * مراقبة سجلات الرواتب
 */
export function watchPayrollRecords(
  organizationId: string,
  month: number,
  year: number,
  callback: (data: PayrollRecord[]) => void
): () => void {
  return powerSync.watch<PayrollRecord>({
    sql: `SELECT * FROM payroll_records
          WHERE organization_id = ? AND pay_period_month = ? AND pay_period_year = ?
          ORDER BY created_at DESC`,
    parameters: [organizationId, month, year],
    onResult: callback,
  });
}

/**
 * مراقبة قروض الموظف
 */
export function watchEmployeeLoans(
  employeeId: string,
  callback: (data: EmployeeLoan[]) => void
): () => void {
  return powerSync.watch<EmployeeLoan>({
    sql: `SELECT * FROM employee_loans
          WHERE employee_id = ? AND status IN ('pending', 'active')
          ORDER BY created_at DESC`,
    parameters: [employeeId],
    onResult: callback,
  });
}
