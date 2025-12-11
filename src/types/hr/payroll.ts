/**
 * 💰 Payroll Types - أنواع الرواتب
 */

// ============================================
// 🎯 Enums & Constants
// ============================================

/** حالات الراتب */
export type PayrollStatus =
  | 'draft'      // مسودة
  | 'pending'    // في انتظار الموافقة
  | 'approved'   // موافق عليه
  | 'paid'       // مدفوع
  | 'cancelled'; // ملغي

/** ألوان حالات الراتب */
export const PAYROLL_STATUS_COLORS: Record<PayrollStatus, string> = {
  draft: '#6B7280',
  pending: '#F59E0B',
  approved: '#3B82F6',
  paid: '#10B981',
  cancelled: '#EF4444',
};

/** تسميات حالات الراتب */
export const PAYROLL_STATUS_LABELS: Record<PayrollStatus, string> = {
  draft: 'مسودة',
  pending: 'في الانتظار',
  approved: 'موافق عليه',
  paid: 'مدفوع',
  cancelled: 'ملغي',
};

/** طرق الدفع */
export type PaymentMethod = 'bank_transfer' | 'cash' | 'check' | 'mobile_wallet';

/** تسميات طرق الدفع */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  bank_transfer: 'تحويل بنكي',
  cash: 'نقدي',
  check: 'شيك',
  mobile_wallet: 'محفظة إلكترونية',
};

/** أنواع القروض/السلف */
export type LoanType = 'salary_advance' | 'personal_loan' | 'emergency_loan';

/** تسميات أنواع القروض */
export const LOAN_TYPE_LABELS: Record<LoanType, string> = {
  salary_advance: 'سلفة راتب',
  personal_loan: 'قرض شخصي',
  emergency_loan: 'قرض طوارئ',
};

/** حالات القرض */
export type LoanStatus = 'pending' | 'approved' | 'rejected' | 'active' | 'completed' | 'cancelled';

// ============================================
// 📋 Main Types
// ============================================

/** هيكل الراتب */
export interface SalaryStructure {
  id: string;
  employee_id: string;
  organization_id: string;

  // الراتب الأساسي
  basic_salary: number;
  currency: string;

  // البدلات
  housing_allowance: number;
  transport_allowance: number;
  food_allowance: number;
  phone_allowance: number;
  other_allowances: Record<string, number>; // بدلات إضافية مخصصة

  // الخصومات الثابتة
  social_insurance: number;
  health_insurance: number;
  tax_amount: number;
  other_deductions: Record<string, number>;

  // معلومات الدفع
  payment_method: PaymentMethod;
  bank_name?: string | null;
  bank_account_number?: string | null;

  // الصلاحية
  effective_from: string;
  effective_to?: string | null;
  is_current: boolean;

  // معدلات
  hourly_rate?: number | null;
  daily_rate?: number | null;

  created_at: string;
  updated_at: string;
}

/** سجل الراتب الشهري */
export interface PayrollRecord {
  id: string;
  employee_id: string;
  organization_id: string;
  salary_structure_id?: string | null;

  // الفترة
  pay_period_month: number;
  pay_period_year: number;

  // الراتب الأساسي والبدلات
  basic_salary: number;
  housing_allowance: number;
  transport_allowance: number;
  food_allowance: number;
  phone_allowance: number;
  other_allowances: number;
  total_allowances: number;

  // الإضافات
  overtime_hours: number;
  overtime_amount: number;
  bonus_amount: number;
  commission_amount: number;
  incentives: number;
  total_earnings: number;

  // الخصومات
  absent_days: number;
  absent_deduction: number;
  late_deduction: number;
  advance_deduction: number;
  loan_deduction: number;
  social_insurance: number;
  health_insurance: number;
  tax_deduction: number;
  other_deductions: number;
  total_deductions: number;

  // الصافي
  gross_salary: number;
  net_salary: number;

  // الحالة
  status: PayrollStatus;

  // الدفع
  payment_date?: string | null;
  payment_reference?: string | null;
  payment_method?: string | null;

  // الموافقة
  approved_by?: string | null;
  approved_at?: string | null;

  // الملاحظات
  notes?: string | null;
  details: Record<string, unknown>;

  created_at: string;
  updated_at: string;
}

/** سجل الراتب مع تفاصيل الموظف */
export interface PayrollWithEmployee extends PayrollRecord {
  employee?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string | null;
    job_title?: string | null;
  };
  approver?: {
    id: string;
    name: string;
  };
}

/** القرض/السلفة */
export interface EmployeeLoan {
  id: string;
  employee_id: string;
  organization_id: string;

  // نوع القرض
  loan_type: LoanType;

  // المبالغ
  principal_amount: number;
  remaining_amount: number;
  monthly_deduction: number;
  total_installments: number;
  paid_installments: number;

  // التواريخ
  request_date: string;
  approval_date?: string | null;
  start_deduction_date?: string | null;
  expected_end_date?: string | null;

  // الحالة
  status: LoanStatus;

  // الموافقة
  approved_by?: string | null;
  rejection_reason?: string | null;

  // ملاحظات
  reason?: string | null;
  notes?: string | null;

  created_at: string;
  updated_at: string;
}

/** دفعة قرض */
export interface LoanPayment {
  id: string;
  loan_id: string;
  payroll_id?: string | null;

  payment_date: string;
  amount: number;
  installment_number: number;
  payment_method: string;
  reference?: string | null;
  notes?: string | null;

  created_at: string;
}

// ============================================
// 📝 Input Types
// ============================================

/** إدخال إنشاء هيكل راتب */
export interface CreateSalaryStructureInput {
  employee_id: string;
  basic_salary: number;
  currency?: string;
  housing_allowance?: number;
  transport_allowance?: number;
  food_allowance?: number;
  phone_allowance?: number;
  other_allowances?: Record<string, number>;
  social_insurance?: number;
  health_insurance?: number;
  tax_amount?: number;
  other_deductions?: Record<string, number>;
  payment_method?: PaymentMethod;
  bank_name?: string;
  bank_account_number?: string;
  effective_from: string;
  hourly_rate?: number;
  daily_rate?: number;
}

/** إدخال حساب الراتب */
export interface CalculatePayrollInput {
  employee_id: string;
  month: number;
  year: number;
  overtime_hours?: number;
  bonus_amount?: number;
  commission_amount?: number;
  incentives?: number;
  additional_deductions?: Record<string, number>;
}

/** إدخال طلب قرض */
export interface RequestLoanInput {
  employee_id: string;
  loan_type: LoanType;
  principal_amount: number;
  monthly_deduction: number;
  reason?: string;
  notes?: string;
}

/** فلتر الرواتب */
export interface PayrollFilter {
  employee_id?: string;
  month?: number;
  year?: number;
  status?: PayrollStatus | PayrollStatus[];
}

// ============================================
// 📊 Statistics Types
// ============================================

/** ملخص راتب الموظف */
export interface EmployeePayrollSummary {
  employee_id: string;
  year: number;
  total_gross: number;
  total_net: number;
  total_deductions: number;
  total_overtime: number;
  total_bonus: number;
  months_paid: number;
  avg_monthly_net: number;
}

/** ملخص الرواتب للمنظمة */
export interface OrganizationPayrollSummary {
  organization_id: string;
  month: number;
  year: number;
  total_employees: number;
  total_gross: number;
  total_net: number;
  total_deductions: number;
  total_allowances: number;
  total_overtime: number;
  status_breakdown: {
    draft: number;
    pending: number;
    approved: number;
    paid: number;
  };
}

/** تحليل الرواتب */
export interface PayrollAnalytics {
  period: {
    start_month: number;
    start_year: number;
    end_month: number;
    end_year: number;
  };
  monthly_data: {
    month: number;
    year: number;
    total_gross: number;
    total_net: number;
    total_deductions: number;
    employee_count: number;
  }[];
  top_earners: {
    employee_id: string;
    employee_name: string;
    total_net: number;
  }[];
  deduction_breakdown: {
    category: string;
    amount: number;
    percentage: number;
  }[];
}

// ============================================
// 🧮 Calculation Types
// ============================================

/** نتيجة حساب الراتب */
export interface PayrollCalculationResult {
  success: boolean;
  payroll_id?: string;
  gross_salary?: number;
  net_salary?: number;
  total_deductions?: number;
  breakdown?: {
    earnings: {
      label: string;
      amount: number;
    }[];
    deductions: {
      label: string;
      amount: number;
    }[];
  };
  error?: string;
}

/** كشف الراتب */
export interface PaySlip {
  employee: {
    id: string;
    name: string;
    email: string;
    job_title?: string;
    employee_number?: string;
  };
  period: {
    month: number;
    year: number;
    month_name: string;
  };
  earnings: {
    basic_salary: number;
    allowances: {
      housing: number;
      transport: number;
      food: number;
      phone: number;
      other: number;
    };
    overtime: {
      hours: number;
      amount: number;
    };
    bonus: number;
    commission: number;
    total: number;
  };
  deductions: {
    absent: {
      days: number;
      amount: number;
    };
    late: number;
    loan: number;
    advance: number;
    social_insurance: number;
    health_insurance: number;
    tax: number;
    other: number;
    total: number;
  };
  summary: {
    gross: number;
    deductions: number;
    net: number;
  };
  payment: {
    method: string;
    date?: string;
    reference?: string;
  };
}
