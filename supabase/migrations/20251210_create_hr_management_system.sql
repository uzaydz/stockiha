-- =====================================================
-- Migration: نظام إدارة الموارد البشرية الشامل
-- التاريخ: 2025-12-10
-- الوصف: نظام متكامل لإدارة الموظفين، الحضور، الإجازات، الرواتب، والأداء
-- =====================================================

-- =====================================================
-- 1. جدول الورديات (Work Shifts)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.work_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_ar TEXT,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_duration_minutes INTEGER DEFAULT 60,
    grace_period_minutes INTEGER DEFAULT 15, -- فترة السماح للتأخير
    overtime_rate NUMERIC(4, 2) DEFAULT 1.5, -- معدل الأجر الإضافي
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    color TEXT DEFAULT '#3B82F6',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. جدول تعيين الورديات للموظفين
-- =====================================================
CREATE TABLE IF NOT EXISTS public.employee_shift_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    shift_id UUID NOT NULL REFERENCES public.work_shifts(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE, -- NULL يعني مستمر
    days_of_week INTEGER[] DEFAULT ARRAY[0,1,2,3,4,5,6], -- 0=الأحد ... 6=السبت
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, start_date)
);

-- =====================================================
-- 3. جدول الحضور والانصراف (Attendance)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.employee_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES public.work_shifts(id),

    -- التاريخ والأوقات
    attendance_date DATE NOT NULL,
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    expected_check_in TIME,
    expected_check_out TIME,

    -- حسابات الوقت (بالدقائق)
    late_minutes INTEGER DEFAULT 0,
    early_leave_minutes INTEGER DEFAULT 0,
    overtime_minutes INTEGER DEFAULT 0,
    work_duration_minutes INTEGER DEFAULT 0,
    break_duration_minutes INTEGER DEFAULT 0,

    -- الحالة
    status TEXT NOT NULL DEFAULT 'present' CHECK (status IN (
        'present',      -- حاضر
        'absent',       -- غائب
        'late',         -- متأخر
        'early_leave',  -- انصراف مبكر
        'half_day',     -- نصف يوم
        'on_leave',     -- في إجازة
        'sick_leave',   -- إجازة مرضية
        'remote',       -- عمل عن بعد
        'holiday'       -- عطلة رسمية
    )),

    -- معلومات إضافية
    check_in_location JSONB, -- {lat, lng, address}
    check_out_location JSONB,
    check_in_device TEXT,
    check_out_device TEXT,
    check_in_photo_url TEXT,
    check_out_photo_url TEXT,

    -- ملاحظات
    notes TEXT,
    admin_notes TEXT,
    is_manual_entry BOOLEAN DEFAULT false, -- هل تم إدخاله يدوياً
    approved_by UUID REFERENCES public.users(id),
    approved_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, attendance_date)
);

-- =====================================================
-- 4. جدول سجل تعديلات الحضور
-- =====================================================
CREATE TABLE IF NOT EXISTS public.attendance_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendance_id UUID NOT NULL REFERENCES public.employee_attendance(id) ON DELETE CASCADE,
    adjusted_by UUID NOT NULL REFERENCES public.users(id),
    field_changed TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. جدول أنواع الإجازات
-- =====================================================
CREATE TABLE IF NOT EXISTS public.leave_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    code TEXT NOT NULL, -- annual, sick, unpaid, maternity, etc.
    color TEXT DEFAULT '#10B981',
    icon TEXT DEFAULT 'calendar',

    -- الإعدادات
    days_per_year INTEGER DEFAULT 0, -- 0 = غير محدود
    can_carry_forward BOOLEAN DEFAULT false,
    max_carry_forward_days INTEGER DEFAULT 0,
    requires_approval BOOLEAN DEFAULT true,
    requires_attachment BOOLEAN DEFAULT false, -- مثل الإجازة المرضية تحتاج تقرير
    min_days_notice INTEGER DEFAULT 1, -- الحد الأدنى للإشعار المسبق
    max_consecutive_days INTEGER DEFAULT 30,

    -- مدفوعة أم لا
    is_paid BOOLEAN DEFAULT true,
    pay_percentage NUMERIC(5, 2) DEFAULT 100, -- نسبة الراتب المدفوع

    -- القيود
    gender_restriction TEXT CHECK (gender_restriction IN ('male', 'female', NULL)),
    min_service_months INTEGER DEFAULT 0, -- الحد الأدنى لمدة الخدمة

    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, code)
);

-- =====================================================
-- 6. جدول رصيد الإجازات
-- =====================================================
CREATE TABLE IF NOT EXISTS public.employee_leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES public.leave_types(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    year INTEGER NOT NULL,
    total_days NUMERIC(5, 2) DEFAULT 0, -- الرصيد الإجمالي
    used_days NUMERIC(5, 2) DEFAULT 0, -- المستخدم
    pending_days NUMERIC(5, 2) DEFAULT 0, -- في انتظار الموافقة
    carried_forward_days NUMERIC(5, 2) DEFAULT 0, -- المرحل من السنة السابقة

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, leave_type_id, year)
);

-- =====================================================
-- 7. جدول طلبات الإجازة
-- =====================================================
CREATE TABLE IF NOT EXISTS public.leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES public.leave_types(id),

    -- التواريخ
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days NUMERIC(5, 2) NOT NULL,
    is_half_day BOOLEAN DEFAULT false,
    half_day_type TEXT CHECK (half_day_type IN ('morning', 'afternoon', NULL)),

    -- الحالة
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',      -- في الانتظار
        'approved',     -- موافق عليه
        'rejected',     -- مرفوض
        'cancelled',    -- ملغي
        'withdrawn'     -- مسحوب من قبل الموظف
    )),

    -- التفاصيل
    reason TEXT,
    attachment_urls TEXT[], -- مرفقات مثل التقارير الطبية

    -- الموافقة
    reviewed_by UUID REFERENCES public.users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,

    -- البديل
    substitute_employee_id UUID REFERENCES public.users(id),
    handover_notes TEXT,

    -- الإلغاء
    cancelled_by UUID REFERENCES public.users(id),
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 8. جدول العطلات الرسمية
-- =====================================================
CREATE TABLE IF NOT EXISTS public.official_holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    date DATE NOT NULL,
    is_recurring BOOLEAN DEFAULT true, -- تتكرر كل سنة
    is_half_day BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, date)
);

-- =====================================================
-- 9. جدول هيكل الرواتب
-- =====================================================
CREATE TABLE IF NOT EXISTS public.salary_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- الراتب الأساسي
    basic_salary NUMERIC(12, 2) NOT NULL,
    currency TEXT DEFAULT 'DZD',

    -- البدلات
    housing_allowance NUMERIC(12, 2) DEFAULT 0,
    transport_allowance NUMERIC(12, 2) DEFAULT 0,
    food_allowance NUMERIC(12, 2) DEFAULT 0,
    phone_allowance NUMERIC(12, 2) DEFAULT 0,
    other_allowances JSONB DEFAULT '{}', -- بدلات إضافية مخصصة

    -- الخصومات الثابتة
    social_insurance NUMERIC(12, 2) DEFAULT 0,
    health_insurance NUMERIC(12, 2) DEFAULT 0,
    tax_amount NUMERIC(12, 2) DEFAULT 0,
    other_deductions JSONB DEFAULT '{}',

    -- الإعدادات
    payment_method TEXT DEFAULT 'bank_transfer' CHECK (payment_method IN (
        'bank_transfer', 'cash', 'check', 'mobile_wallet'
    )),
    bank_name TEXT,
    bank_account_number TEXT,

    -- الصلاحية
    effective_from DATE NOT NULL,
    effective_to DATE, -- NULL = مستمر
    is_current BOOLEAN DEFAULT true,

    -- معدلات
    hourly_rate NUMERIC(10, 2), -- معدل الساعة للوقت الإضافي
    daily_rate NUMERIC(10, 2), -- معدل اليوم للخصم

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 10. جدول سجل الرواتب الشهرية
-- =====================================================
CREATE TABLE IF NOT EXISTS public.payroll_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    salary_structure_id UUID REFERENCES public.salary_structures(id),

    -- الفترة
    pay_period_month INTEGER NOT NULL CHECK (pay_period_month BETWEEN 1 AND 12),
    pay_period_year INTEGER NOT NULL,

    -- الراتب الأساسي والبدلات
    basic_salary NUMERIC(12, 2) NOT NULL,
    housing_allowance NUMERIC(12, 2) DEFAULT 0,
    transport_allowance NUMERIC(12, 2) DEFAULT 0,
    food_allowance NUMERIC(12, 2) DEFAULT 0,
    phone_allowance NUMERIC(12, 2) DEFAULT 0,
    other_allowances NUMERIC(12, 2) DEFAULT 0,
    total_allowances NUMERIC(12, 2) DEFAULT 0,

    -- الإضافات
    overtime_hours NUMERIC(6, 2) DEFAULT 0,
    overtime_amount NUMERIC(12, 2) DEFAULT 0,
    bonus_amount NUMERIC(12, 2) DEFAULT 0,
    commission_amount NUMERIC(12, 2) DEFAULT 0,
    incentives NUMERIC(12, 2) DEFAULT 0,
    total_earnings NUMERIC(12, 2) DEFAULT 0,

    -- الخصومات
    absent_days NUMERIC(5, 2) DEFAULT 0,
    absent_deduction NUMERIC(12, 2) DEFAULT 0,
    late_deduction NUMERIC(12, 2) DEFAULT 0,
    advance_deduction NUMERIC(12, 2) DEFAULT 0,
    loan_deduction NUMERIC(12, 2) DEFAULT 0,
    social_insurance NUMERIC(12, 2) DEFAULT 0,
    health_insurance NUMERIC(12, 2) DEFAULT 0,
    tax_deduction NUMERIC(12, 2) DEFAULT 0,
    other_deductions NUMERIC(12, 2) DEFAULT 0,
    total_deductions NUMERIC(12, 2) DEFAULT 0,

    -- الصافي
    gross_salary NUMERIC(12, 2) NOT NULL,
    net_salary NUMERIC(12, 2) NOT NULL,

    -- الحالة
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft',        -- مسودة
        'pending',      -- في انتظار الموافقة
        'approved',     -- موافق عليه
        'paid',         -- مدفوع
        'cancelled'     -- ملغي
    )),

    -- الدفع
    payment_date DATE,
    payment_reference TEXT,
    payment_method TEXT,

    -- الموافقة
    approved_by UUID REFERENCES public.users(id),
    approved_at TIMESTAMPTZ,

    -- الملاحظات
    notes TEXT,
    details JSONB DEFAULT '{}', -- تفاصيل إضافية

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, pay_period_month, pay_period_year)
);

-- =====================================================
-- 11. جدول السلف والقروض
-- =====================================================
CREATE TABLE IF NOT EXISTS public.employee_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- نوع القرض
    loan_type TEXT NOT NULL CHECK (loan_type IN (
        'salary_advance',   -- سلفة راتب
        'personal_loan',    -- قرض شخصي
        'emergency_loan'    -- قرض طوارئ
    )),

    -- المبالغ
    principal_amount NUMERIC(12, 2) NOT NULL,
    remaining_amount NUMERIC(12, 2) NOT NULL,
    monthly_deduction NUMERIC(12, 2) NOT NULL,
    total_installments INTEGER NOT NULL,
    paid_installments INTEGER DEFAULT 0,

    -- التواريخ
    request_date DATE NOT NULL,
    approval_date DATE,
    start_deduction_date DATE, -- تاريخ بدء الخصم
    expected_end_date DATE,

    -- الحالة
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'approved', 'rejected', 'active', 'completed', 'cancelled'
    )),

    -- الموافقة
    approved_by UUID REFERENCES public.users(id),
    rejection_reason TEXT,

    -- ملاحظات
    reason TEXT,
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 12. جدول سجل دفعات القروض
-- =====================================================
CREATE TABLE IF NOT EXISTS public.loan_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL REFERENCES public.employee_loans(id) ON DELETE CASCADE,
    payroll_id UUID REFERENCES public.payroll_records(id),

    payment_date DATE NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    installment_number INTEGER NOT NULL,
    payment_method TEXT DEFAULT 'salary_deduction',
    reference TEXT,
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 13. جدول معايير تقييم الأداء
-- =====================================================
CREATE TABLE IF NOT EXISTS public.performance_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    description TEXT,

    -- التصنيف
    category TEXT NOT NULL CHECK (category IN (
        'productivity',     -- الإنتاجية
        'quality',          -- الجودة
        'attendance',       -- الحضور والالتزام
        'teamwork',         -- العمل الجماعي
        'communication',    -- التواصل
        'initiative',       -- المبادرة
        'leadership',       -- القيادة
        'technical_skills', -- المهارات التقنية
        'customer_service', -- خدمة العملاء
        'sales'             -- المبيعات
    )),

    -- الوزن والحدود
    weight NUMERIC(5, 2) DEFAULT 10, -- الوزن من 100
    max_score INTEGER DEFAULT 5,

    -- الوصف لكل درجة
    score_descriptions JSONB DEFAULT '{}',

    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 14. جدول فترات التقييم
-- =====================================================
CREATE TABLE IF NOT EXISTS public.performance_review_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    name_ar TEXT NOT NULL,

    -- الفترة
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    -- مواعيد التقييم
    review_start_date DATE NOT NULL,
    review_end_date DATE NOT NULL,

    -- الحالة
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN (
        'upcoming',     -- قادم
        'in_progress',  -- جاري
        'completed',    -- مكتمل
        'cancelled'     -- ملغي
    )),

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 15. جدول تقييمات الأداء
-- =====================================================
CREATE TABLE IF NOT EXISTS public.performance_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES public.users(id),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    period_id UUID REFERENCES public.performance_review_periods(id),

    -- الفترة
    review_period_start DATE NOT NULL,
    review_period_end DATE NOT NULL,

    -- الدرجات
    scores JSONB NOT NULL DEFAULT '{}', -- {criteria_id: {score, comment}}
    total_score NUMERIC(5, 2),
    weighted_score NUMERIC(5, 2),
    grade TEXT, -- A, B, C, D, F or ممتاز، جيد جداً، جيد، مقبول، ضعيف

    -- التقييم العام
    strengths TEXT,
    areas_for_improvement TEXT,
    achievements TEXT,
    goals_for_next_period TEXT,

    -- التعليقات
    reviewer_comments TEXT,
    employee_comments TEXT,
    manager_comments TEXT,

    -- التوصيات
    recommendations JSONB DEFAULT '{}', -- {promotion: bool, salary_increase: bool, training: [...]}

    -- الحالة
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft',            -- مسودة
        'submitted',        -- مقدم للموظف
        'acknowledged',     -- اطلع عليه الموظف
        'disputed',         -- معترض عليه
        'finalized'         -- نهائي
    )),

    -- التوقيعات
    submitted_at TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,
    finalized_at TIMESTAMPTZ,
    finalized_by UUID REFERENCES public.users(id),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 16. جدول أهداف الموظفين
-- =====================================================
CREATE TABLE IF NOT EXISTS public.employee_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.users(id),

    -- تفاصيل الهدف
    title TEXT NOT NULL,
    description TEXT,
    category TEXT CHECK (category IN (
        'sales', 'productivity', 'learning', 'project', 'personal', 'team'
    )),

    -- القياس
    target_type TEXT NOT NULL CHECK (target_type IN (
        'numeric',      -- رقمي (مثل عدد المبيعات)
        'percentage',   -- نسبة مئوية
        'binary',       -- نعم/لا (إنجاز أو عدم إنجاز)
        'milestone'     -- مراحل متعددة
    )),
    target_value NUMERIC(15, 2),
    current_value NUMERIC(15, 2) DEFAULT 0,
    unit TEXT, -- الوحدة (طلب، دينار، ساعة، الخ)

    -- المراحل (للأهداف متعددة المراحل)
    milestones JSONB DEFAULT '[]',

    -- التواريخ
    start_date DATE NOT NULL,
    due_date DATE NOT NULL,
    completed_at TIMESTAMPTZ,

    -- الأولوية والوزن
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    weight NUMERIC(5, 2) DEFAULT 10, -- الوزن في التقييم

    -- الحالة
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
        'draft',        -- مسودة
        'active',       -- نشط
        'on_hold',      -- معلق
        'achieved',     -- محقق
        'partially',    -- محقق جزئياً
        'missed',       -- لم يتحقق
        'cancelled'     -- ملغي
    )),

    -- النتيجة
    achievement_percentage NUMERIC(5, 2) DEFAULT 0,
    final_notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 17. جدول تحديثات الأهداف
-- =====================================================
CREATE TABLE IF NOT EXISTS public.goal_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES public.employee_goals(id) ON DELETE CASCADE,
    updated_by UUID NOT NULL REFERENCES public.users(id),

    previous_value NUMERIC(15, 2),
    new_value NUMERIC(15, 2),
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 18. جدول الإنذارات والتنبيهات
-- =====================================================
CREATE TABLE IF NOT EXISTS public.employee_warnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    issued_by UUID NOT NULL REFERENCES public.users(id),

    -- نوع الإنذار
    warning_type TEXT NOT NULL CHECK (warning_type IN (
        'verbal',           -- شفهي
        'written',          -- كتابي
        'final_warning',    -- إنذار نهائي
        'suspension',       -- إيقاف
        'termination'       -- إنهاء خدمة
    )),

    -- السبب
    reason_category TEXT NOT NULL CHECK (reason_category IN (
        'attendance',       -- حضور
        'performance',      -- أداء
        'behavior',         -- سلوك
        'policy_violation', -- مخالفة سياسات
        'safety',           -- سلامة
        'other'             -- أخرى
    )),

    -- التفاصيل
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    incident_date DATE,
    evidence_urls TEXT[],

    -- الإجراء
    action_required TEXT,
    improvement_deadline DATE,

    -- الحالة
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
        'draft', 'issued', 'acknowledged', 'appealed',
        'resolved', 'expired', 'revoked'
    )),

    -- الاستلام
    acknowledged_at TIMESTAMPTZ,
    employee_response TEXT,

    -- الانتهاء
    expires_at DATE, -- تاريخ انتهاء صلاحية الإنذار
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.users(id),
    resolution_notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 19. جدول ملفات الموظفين (وثائق)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.employee_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES public.users(id),

    -- نوع الوثيقة
    document_type TEXT NOT NULL CHECK (document_type IN (
        'contract',         -- عقد العمل
        'id_card',          -- بطاقة الهوية
        'passport',         -- جواز السفر
        'qualification',    -- مؤهل علمي
        'certificate',      -- شهادة
        'medical',          -- تقرير طبي
        'other'             -- أخرى
    )),

    -- التفاصيل
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER,
    file_type TEXT,

    -- الصلاحية
    issue_date DATE,
    expiry_date DATE,

    -- الحالة
    is_verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES public.users(id),
    verified_at TIMESTAMPTZ,

    is_confidential BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 20. جدول إحصائيات الموظف اليومية
-- =====================================================
CREATE TABLE IF NOT EXISTS public.employee_daily_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    stat_date DATE NOT NULL,

    -- إحصائيات المبيعات
    total_sales NUMERIC(12, 2) DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    cash_sales NUMERIC(12, 2) DEFAULT 0,
    card_sales NUMERIC(12, 2) DEFAULT 0,
    credit_sales NUMERIC(12, 2) DEFAULT 0,
    returns_amount NUMERIC(12, 2) DEFAULT 0,
    returns_count INTEGER DEFAULT 0,

    -- إحصائيات الأداء
    products_sold INTEGER DEFAULT 0,
    customers_served INTEGER DEFAULT 0,
    avg_transaction_value NUMERIC(12, 2) DEFAULT 0,
    avg_transaction_time INTEGER DEFAULT 0, -- بالثواني

    -- إحصائيات الحضور
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    work_hours NUMERIC(5, 2) DEFAULT 0,
    break_hours NUMERIC(5, 2) DEFAULT 0,
    overtime_hours NUMERIC(5, 2) DEFAULT 0,

    -- تقييم اليوم
    customer_rating NUMERIC(3, 2), -- تقييم من العملاء
    supervisor_rating NUMERIC(3, 2), -- تقييم من المشرف

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, stat_date)
);

-- =====================================================
-- الفهارس (Indexes)
-- =====================================================

-- فهارس الحضور
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON public.employee_attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.employee_attendance(attendance_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_org_date ON public.employee_attendance(organization_id, attendance_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON public.employee_attendance(status);

-- فهارس الإجازات
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON public.leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON public.leave_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON public.leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_balances_employee_year ON public.employee_leave_balances(employee_id, year);

-- فهارس الرواتب
CREATE INDEX IF NOT EXISTS idx_payroll_employee ON public.payroll_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_period ON public.payroll_records(pay_period_year DESC, pay_period_month DESC);
CREATE INDEX IF NOT EXISTS idx_payroll_status ON public.payroll_records(status);

-- فهارس الأداء
CREATE INDEX IF NOT EXISTS idx_reviews_employee ON public.performance_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_goals_employee ON public.employee_goals(employee_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON public.employee_goals(status);

-- فهارس الإحصائيات
CREATE INDEX IF NOT EXISTS idx_daily_stats_employee_date ON public.employee_daily_stats(employee_id, stat_date DESC);

-- =====================================================
-- تمكين RLS
-- =====================================================
ALTER TABLE public.work_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_shift_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.official_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_review_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_daily_stats ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- سياسات RLS العامة (نمط موحد)
-- =====================================================

-- دالة مساعدة للتحقق من العضوية في المنظمة
CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND organization_id = org_id
        UNION
        SELECT 1 FROM public.organizations WHERE id = org_id AND owner_id = auth.uid()
    );
END;
$$;

-- تطبيق سياسات RLS على جميع الجداول
DO $$
DECLARE
    tables TEXT[] := ARRAY[
        'work_shifts', 'employee_shift_assignments', 'employee_attendance',
        'attendance_adjustments', 'leave_types', 'employee_leave_balances',
        'leave_requests', 'official_holidays', 'salary_structures',
        'payroll_records', 'employee_loans', 'loan_payments',
        'performance_criteria', 'performance_review_periods', 'performance_reviews',
        'employee_goals', 'goal_updates', 'employee_warnings',
        'employee_documents', 'employee_daily_stats'
    ];
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY tables
    LOOP
        -- سياسة القراءة
        EXECUTE format('
            CREATE POLICY %I_select_policy ON public.%I
            FOR SELECT
            USING (public.is_org_member(organization_id))
        ', tbl, tbl);

        -- سياسة الإدراج
        EXECUTE format('
            CREATE POLICY %I_insert_policy ON public.%I
            FOR INSERT
            WITH CHECK (public.is_org_member(organization_id))
        ', tbl, tbl);

        -- سياسة التحديث
        EXECUTE format('
            CREATE POLICY %I_update_policy ON public.%I
            FOR UPDATE
            USING (public.is_org_member(organization_id))
            WITH CHECK (public.is_org_member(organization_id))
        ', tbl, tbl);

        -- سياسة الحذف
        EXECUTE format('
            CREATE POLICY %I_delete_policy ON public.%I
            FOR DELETE
            USING (public.is_org_member(organization_id))
        ', tbl, tbl);
    END LOOP;
END
$$;

-- =====================================================
-- RPC Functions
-- =====================================================

-- 1. تسجيل حضور الموظف
CREATE OR REPLACE FUNCTION public.record_employee_check_in(
    p_employee_id UUID,
    p_location JSONB DEFAULT NULL,
    p_device TEXT DEFAULT NULL,
    p_photo_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
    v_shift RECORD;
    v_attendance_id UUID;
    v_expected_check_in TIME;
    v_late_minutes INTEGER;
    v_existing RECORD;
BEGIN
    -- جلب معلومات الموظف
    SELECT organization_id INTO v_org_id
    FROM public.users WHERE id = p_employee_id;

    IF v_org_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'الموظف غير موجود');
    END IF;

    -- التحقق من عدم وجود تسجيل حضور لهذا اليوم
    SELECT * INTO v_existing
    FROM public.employee_attendance
    WHERE employee_id = p_employee_id AND attendance_date = CURRENT_DATE;

    IF v_existing IS NOT NULL AND v_existing.check_in_time IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'تم تسجيل الحضور مسبقاً', 'attendance_id', v_existing.id);
    END IF;

    -- جلب الوردية المعينة
    SELECT ws.* INTO v_shift
    FROM public.work_shifts ws
    JOIN public.employee_shift_assignments esa ON ws.id = esa.shift_id
    WHERE esa.employee_id = p_employee_id
      AND esa.is_active = true
      AND CURRENT_DATE BETWEEN esa.start_date AND COALESCE(esa.end_date, '2099-12-31')
      AND EXTRACT(DOW FROM CURRENT_DATE)::INTEGER = ANY(esa.days_of_week)
    LIMIT 1;

    -- حساب التأخير
    IF v_shift IS NOT NULL THEN
        v_expected_check_in := v_shift.start_time;
        v_late_minutes := GREATEST(0,
            EXTRACT(EPOCH FROM (CURRENT_TIME - (v_shift.start_time + (v_shift.grace_period_minutes || ' minutes')::INTERVAL))) / 60
        )::INTEGER;
    ELSE
        v_expected_check_in := NULL;
        v_late_minutes := 0;
    END IF;

    -- إنشاء أو تحديث سجل الحضور
    IF v_existing IS NOT NULL THEN
        UPDATE public.employee_attendance
        SET
            check_in_time = NOW(),
            shift_id = v_shift.id,
            expected_check_in = v_expected_check_in,
            expected_check_out = v_shift.end_time,
            late_minutes = v_late_minutes,
            status = CASE WHEN v_late_minutes > 0 THEN 'late' ELSE 'present' END,
            check_in_location = p_location,
            check_in_device = p_device,
            check_in_photo_url = p_photo_url,
            updated_at = NOW()
        WHERE id = v_existing.id
        RETURNING id INTO v_attendance_id;
    ELSE
        INSERT INTO public.employee_attendance (
            employee_id, organization_id, shift_id, attendance_date,
            check_in_time, expected_check_in, expected_check_out,
            late_minutes, status, check_in_location, check_in_device, check_in_photo_url
        ) VALUES (
            p_employee_id, v_org_id, v_shift.id, CURRENT_DATE,
            NOW(), v_expected_check_in, v_shift.end_time,
            v_late_minutes, CASE WHEN v_late_minutes > 0 THEN 'late' ELSE 'present' END,
            p_location, p_device, p_photo_url
        )
        RETURNING id INTO v_attendance_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'attendance_id', v_attendance_id,
        'check_in_time', NOW(),
        'late_minutes', v_late_minutes,
        'status', CASE WHEN v_late_minutes > 0 THEN 'late' ELSE 'present' END
    );
END;
$$;

-- 2. تسجيل انصراف الموظف
CREATE OR REPLACE FUNCTION public.record_employee_check_out(
    p_employee_id UUID,
    p_location JSONB DEFAULT NULL,
    p_device TEXT DEFAULT NULL,
    p_photo_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_attendance RECORD;
    v_work_minutes INTEGER;
    v_early_leave INTEGER;
    v_overtime INTEGER;
BEGIN
    -- جلب سجل الحضور
    SELECT * INTO v_attendance
    FROM public.employee_attendance
    WHERE employee_id = p_employee_id AND attendance_date = CURRENT_DATE;

    IF v_attendance IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'لا يوجد سجل حضور لهذا اليوم');
    END IF;

    IF v_attendance.check_out_time IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'تم تسجيل الانصراف مسبقاً');
    END IF;

    -- حساب مدة العمل
    v_work_minutes := EXTRACT(EPOCH FROM (NOW() - v_attendance.check_in_time)) / 60;

    -- حساب الانصراف المبكر
    IF v_attendance.expected_check_out IS NOT NULL THEN
        v_early_leave := GREATEST(0,
            EXTRACT(EPOCH FROM ((v_attendance.expected_check_out)::TIME - CURRENT_TIME)) / 60
        )::INTEGER;

        -- حساب الوقت الإضافي
        v_overtime := GREATEST(0,
            EXTRACT(EPOCH FROM (CURRENT_TIME - (v_attendance.expected_check_out)::TIME)) / 60
        )::INTEGER;
    ELSE
        v_early_leave := 0;
        v_overtime := 0;
    END IF;

    -- تحديث السجل
    UPDATE public.employee_attendance
    SET
        check_out_time = NOW(),
        work_duration_minutes = v_work_minutes,
        early_leave_minutes = v_early_leave,
        overtime_minutes = v_overtime,
        status = CASE
            WHEN v_early_leave > 30 THEN 'early_leave'
            WHEN v_attendance.late_minutes > 0 THEN 'late'
            ELSE 'present'
        END,
        check_out_location = p_location,
        check_out_device = p_device,
        check_out_photo_url = p_photo_url,
        updated_at = NOW()
    WHERE id = v_attendance.id;

    RETURN jsonb_build_object(
        'success', true,
        'check_out_time', NOW(),
        'work_duration_minutes', v_work_minutes,
        'early_leave_minutes', v_early_leave,
        'overtime_minutes', v_overtime
    );
END;
$$;

-- 3. طلب إجازة
CREATE OR REPLACE FUNCTION public.submit_leave_request(
    p_employee_id UUID,
    p_leave_type_id UUID,
    p_start_date DATE,
    p_end_date DATE,
    p_reason TEXT DEFAULT NULL,
    p_is_half_day BOOLEAN DEFAULT false,
    p_half_day_type TEXT DEFAULT NULL,
    p_substitute_id UUID DEFAULT NULL,
    p_attachment_urls TEXT[] DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
    v_leave_type RECORD;
    v_balance RECORD;
    v_total_days NUMERIC;
    v_request_id UUID;
BEGIN
    -- جلب معلومات الموظف
    SELECT organization_id INTO v_org_id
    FROM public.users WHERE id = p_employee_id;

    -- جلب نوع الإجازة
    SELECT * INTO v_leave_type
    FROM public.leave_types WHERE id = p_leave_type_id;

    IF v_leave_type IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'نوع الإجازة غير موجود');
    END IF;

    -- حساب عدد الأيام
    v_total_days := (p_end_date - p_start_date + 1);
    IF p_is_half_day THEN
        v_total_days := 0.5;
    END IF;

    -- التحقق من الرصيد
    SELECT * INTO v_balance
    FROM public.employee_leave_balances
    WHERE employee_id = p_employee_id
      AND leave_type_id = p_leave_type_id
      AND year = EXTRACT(YEAR FROM CURRENT_DATE);

    IF v_balance IS NOT NULL AND v_leave_type.days_per_year > 0 THEN
        IF (v_balance.used_days + v_balance.pending_days + v_total_days) > v_balance.total_days THEN
            RETURN jsonb_build_object('success', false, 'error', 'رصيد الإجازة غير كافٍ');
        END IF;
    END IF;

    -- التحقق من المرفقات المطلوبة
    IF v_leave_type.requires_attachment AND (p_attachment_urls IS NULL OR array_length(p_attachment_urls, 1) = 0) THEN
        RETURN jsonb_build_object('success', false, 'error', 'يجب إرفاق المستندات المطلوبة');
    END IF;

    -- إنشاء الطلب
    INSERT INTO public.leave_requests (
        employee_id, organization_id, leave_type_id,
        start_date, end_date, total_days,
        is_half_day, half_day_type, reason,
        substitute_employee_id, attachment_urls, status
    ) VALUES (
        p_employee_id, v_org_id, p_leave_type_id,
        p_start_date, p_end_date, v_total_days,
        p_is_half_day, p_half_day_type, p_reason,
        p_substitute_id, p_attachment_urls,
        CASE WHEN v_leave_type.requires_approval THEN 'pending' ELSE 'approved' END
    )
    RETURNING id INTO v_request_id;

    -- تحديث الرصيد المعلق
    IF v_balance IS NOT NULL THEN
        UPDATE public.employee_leave_balances
        SET pending_days = pending_days + v_total_days,
            updated_at = NOW()
        WHERE id = v_balance.id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'request_id', v_request_id,
        'status', CASE WHEN v_leave_type.requires_approval THEN 'pending' ELSE 'approved' END
    );
END;
$$;

-- 4. الموافقة/رفض طلب الإجازة
CREATE OR REPLACE FUNCTION public.review_leave_request(
    p_request_id UUID,
    p_approved BOOLEAN,
    p_reviewer_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_request RECORD;
BEGIN
    SELECT * INTO v_request
    FROM public.leave_requests WHERE id = p_request_id;

    IF v_request IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'الطلب غير موجود');
    END IF;

    IF v_request.status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'error', 'الطلب تم معالجته مسبقاً');
    END IF;

    -- تحديث الطلب
    UPDATE public.leave_requests
    SET
        status = CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END,
        reviewed_by = p_reviewer_id,
        reviewed_at = NOW(),
        review_notes = p_notes,
        updated_at = NOW()
    WHERE id = p_request_id;

    -- تحديث الرصيد
    IF p_approved THEN
        UPDATE public.employee_leave_balances
        SET
            used_days = used_days + v_request.total_days,
            pending_days = pending_days - v_request.total_days,
            updated_at = NOW()
        WHERE employee_id = v_request.employee_id
          AND leave_type_id = v_request.leave_type_id
          AND year = EXTRACT(YEAR FROM v_request.start_date);
    ELSE
        UPDATE public.employee_leave_balances
        SET
            pending_days = pending_days - v_request.total_days,
            updated_at = NOW()
        WHERE employee_id = v_request.employee_id
          AND leave_type_id = v_request.leave_type_id
          AND year = EXTRACT(YEAR FROM v_request.start_date);
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'status', CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END
    );
END;
$$;

-- 5. حساب الراتب الشهري
CREATE OR REPLACE FUNCTION public.calculate_monthly_payroll(
    p_employee_id UUID,
    p_month INTEGER,
    p_year INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_employee RECORD;
    v_salary_structure RECORD;
    v_attendance RECORD;
    v_absent_days INTEGER;
    v_late_deduction NUMERIC;
    v_overtime_amount NUMERIC;
    v_total_allowances NUMERIC;
    v_total_deductions NUMERIC;
    v_gross_salary NUMERIC;
    v_net_salary NUMERIC;
    v_payroll_id UUID;
BEGIN
    -- جلب معلومات الموظف
    SELECT * INTO v_employee FROM public.users WHERE id = p_employee_id;

    IF v_employee IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'الموظف غير موجود');
    END IF;

    -- جلب هيكل الراتب
    SELECT * INTO v_salary_structure
    FROM public.salary_structures
    WHERE employee_id = p_employee_id AND is_current = true
    ORDER BY effective_from DESC LIMIT 1;

    IF v_salary_structure IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'لا يوجد هيكل راتب للموظف');
    END IF;

    -- حساب الحضور والغياب
    SELECT
        COUNT(*) FILTER (WHERE status = 'absent') as absent_count,
        SUM(late_minutes) as total_late_minutes,
        SUM(overtime_minutes) as total_overtime_minutes
    INTO v_attendance
    FROM public.employee_attendance
    WHERE employee_id = p_employee_id
      AND EXTRACT(MONTH FROM attendance_date) = p_month
      AND EXTRACT(YEAR FROM attendance_date) = p_year;

    v_absent_days := COALESCE(v_attendance.absent_count, 0);

    -- حساب خصم التأخير
    v_late_deduction := COALESCE(v_attendance.total_late_minutes, 0) / 60.0 *
                        COALESCE(v_salary_structure.hourly_rate, v_salary_structure.basic_salary / 176);

    -- حساب الوقت الإضافي
    v_overtime_amount := COALESCE(v_attendance.total_overtime_minutes, 0) / 60.0 *
                         COALESCE(v_salary_structure.hourly_rate, v_salary_structure.basic_salary / 176) * 1.5;

    -- حساب البدلات
    v_total_allowances := COALESCE(v_salary_structure.housing_allowance, 0) +
                          COALESCE(v_salary_structure.transport_allowance, 0) +
                          COALESCE(v_salary_structure.food_allowance, 0) +
                          COALESCE(v_salary_structure.phone_allowance, 0);

    -- حساب الخصومات
    v_total_deductions := COALESCE(v_salary_structure.social_insurance, 0) +
                          COALESCE(v_salary_structure.health_insurance, 0) +
                          COALESCE(v_salary_structure.tax_amount, 0) +
                          v_late_deduction +
                          (v_absent_days * COALESCE(v_salary_structure.daily_rate, v_salary_structure.basic_salary / 22));

    -- حساب الإجمالي والصافي
    v_gross_salary := v_salary_structure.basic_salary + v_total_allowances + v_overtime_amount;
    v_net_salary := v_gross_salary - v_total_deductions;

    -- إنشاء أو تحديث سجل الراتب
    INSERT INTO public.payroll_records (
        employee_id, organization_id, salary_structure_id,
        pay_period_month, pay_period_year,
        basic_salary, housing_allowance, transport_allowance, food_allowance, phone_allowance,
        total_allowances, overtime_hours, overtime_amount,
        absent_days, absent_deduction, late_deduction,
        social_insurance, health_insurance, tax_deduction, total_deductions,
        gross_salary, net_salary, status
    ) VALUES (
        p_employee_id, v_employee.organization_id, v_salary_structure.id,
        p_month, p_year,
        v_salary_structure.basic_salary, v_salary_structure.housing_allowance,
        v_salary_structure.transport_allowance, v_salary_structure.food_allowance,
        v_salary_structure.phone_allowance, v_total_allowances,
        COALESCE(v_attendance.total_overtime_minutes, 0) / 60.0, v_overtime_amount,
        v_absent_days, v_absent_days * COALESCE(v_salary_structure.daily_rate, v_salary_structure.basic_salary / 22),
        v_late_deduction, v_salary_structure.social_insurance, v_salary_structure.health_insurance,
        v_salary_structure.tax_amount, v_total_deductions,
        v_gross_salary, v_net_salary, 'draft'
    )
    ON CONFLICT (employee_id, pay_period_month, pay_period_year)
    DO UPDATE SET
        basic_salary = EXCLUDED.basic_salary,
        total_allowances = EXCLUDED.total_allowances,
        overtime_amount = EXCLUDED.overtime_amount,
        total_deductions = EXCLUDED.total_deductions,
        gross_salary = EXCLUDED.gross_salary,
        net_salary = EXCLUDED.net_salary,
        updated_at = NOW()
    RETURNING id INTO v_payroll_id;

    RETURN jsonb_build_object(
        'success', true,
        'payroll_id', v_payroll_id,
        'gross_salary', v_gross_salary,
        'net_salary', v_net_salary,
        'total_deductions', v_total_deductions
    );
END;
$$;

-- 6. إحصائيات الموظف
CREATE OR REPLACE FUNCTION public.get_employee_hr_stats(
    p_employee_id UUID,
    p_month INTEGER DEFAULT NULL,
    p_year INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_month INTEGER := COALESCE(p_month, EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER);
    v_year INTEGER := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);
    v_attendance JSONB;
    v_leaves JSONB;
    v_goals JSONB;
    v_performance JSONB;
BEGIN
    -- إحصائيات الحضور
    SELECT jsonb_build_object(
        'total_days', COUNT(*),
        'present_days', COUNT(*) FILTER (WHERE status = 'present'),
        'absent_days', COUNT(*) FILTER (WHERE status = 'absent'),
        'late_days', COUNT(*) FILTER (WHERE status = 'late'),
        'on_leave_days', COUNT(*) FILTER (WHERE status = 'on_leave'),
        'total_work_hours', SUM(work_duration_minutes) / 60.0,
        'total_overtime_hours', SUM(overtime_minutes) / 60.0,
        'attendance_rate', ROUND(
            COUNT(*) FILTER (WHERE status IN ('present', 'late')) * 100.0 / NULLIF(COUNT(*), 0), 2
        )
    ) INTO v_attendance
    FROM public.employee_attendance
    WHERE employee_id = p_employee_id
      AND EXTRACT(MONTH FROM attendance_date) = v_month
      AND EXTRACT(YEAR FROM attendance_date) = v_year;

    -- إحصائيات الإجازات
    SELECT jsonb_build_object(
        'total_balance', SUM(total_days),
        'used_days', SUM(used_days),
        'remaining_days', SUM(total_days - used_days - pending_days),
        'pending_requests', (
            SELECT COUNT(*) FROM public.leave_requests
            WHERE employee_id = p_employee_id AND status = 'pending'
        )
    ) INTO v_leaves
    FROM public.employee_leave_balances
    WHERE employee_id = p_employee_id AND year = v_year;

    -- إحصائيات الأهداف
    SELECT jsonb_build_object(
        'total_goals', COUNT(*),
        'achieved_goals', COUNT(*) FILTER (WHERE status = 'achieved'),
        'active_goals', COUNT(*) FILTER (WHERE status = 'active'),
        'avg_achievement', ROUND(AVG(achievement_percentage), 2)
    ) INTO v_goals
    FROM public.employee_goals
    WHERE employee_id = p_employee_id
      AND EXTRACT(YEAR FROM due_date) = v_year;

    -- آخر تقييم أداء
    SELECT jsonb_build_object(
        'last_review_date', review_period_end,
        'total_score', total_score,
        'grade', grade,
        'status', status
    ) INTO v_performance
    FROM public.performance_reviews
    WHERE employee_id = p_employee_id
    ORDER BY review_period_end DESC
    LIMIT 1;

    RETURN jsonb_build_object(
        'success', true,
        'month', v_month,
        'year', v_year,
        'attendance', COALESCE(v_attendance, '{}'::jsonb),
        'leaves', COALESCE(v_leaves, '{}'::jsonb),
        'goals', COALESCE(v_goals, '{}'::jsonb),
        'performance', COALESCE(v_performance, '{}'::jsonb)
    );
END;
$$;

-- 7. لوحة تحكم HR
CREATE OR REPLACE FUNCTION public.get_hr_dashboard_stats(
    p_organization_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_employees JSONB;
    v_attendance JSONB;
    v_leaves JSONB;
    v_alerts JSONB;
BEGIN
    -- إحصائيات الموظفين
    SELECT jsonb_build_object(
        'total', COUNT(*),
        'active', COUNT(*) FILTER (WHERE is_active = true),
        'inactive', COUNT(*) FILTER (WHERE is_active = false),
        'new_this_month', COUNT(*) FILTER (WHERE
            EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM p_date) AND
            EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM p_date)
        )
    ) INTO v_employees
    FROM public.users
    WHERE organization_id = p_organization_id AND role = 'employee';

    -- إحصائيات الحضور اليومية
    SELECT jsonb_build_object(
        'present', COUNT(*) FILTER (WHERE status IN ('present', 'late')),
        'absent', COUNT(*) FILTER (WHERE status = 'absent'),
        'on_leave', COUNT(*) FILTER (WHERE status = 'on_leave'),
        'late', COUNT(*) FILTER (WHERE status = 'late'),
        'remote', COUNT(*) FILTER (WHERE status = 'remote'),
        'not_checked_in', (
            SELECT COUNT(*) FROM public.users u
            WHERE u.organization_id = p_organization_id
              AND u.is_active = true
              AND u.role = 'employee'
              AND NOT EXISTS (
                  SELECT 1 FROM public.employee_attendance a
                  WHERE a.employee_id = u.id AND a.attendance_date = p_date
              )
        )
    ) INTO v_attendance
    FROM public.employee_attendance
    WHERE organization_id = p_organization_id AND attendance_date = p_date;

    -- طلبات الإجازة المعلقة
    SELECT jsonb_build_object(
        'pending_requests', COUNT(*) FILTER (WHERE status = 'pending'),
        'approved_this_month', COUNT(*) FILTER (WHERE
            status = 'approved' AND
            EXTRACT(MONTH FROM reviewed_at) = EXTRACT(MONTH FROM p_date)
        ),
        'employees_on_leave_today', (
            SELECT COUNT(DISTINCT employee_id) FROM public.leave_requests
            WHERE organization_id = p_organization_id
              AND status = 'approved'
              AND p_date BETWEEN start_date AND end_date
        )
    ) INTO v_leaves
    FROM public.leave_requests
    WHERE organization_id = p_organization_id;

    -- التنبيهات
    SELECT jsonb_build_object(
        'expiring_documents', (
            SELECT COUNT(*) FROM public.employee_documents
            WHERE organization_id = p_organization_id
              AND expiry_date BETWEEN p_date AND (p_date + INTERVAL '30 days')
        ),
        'pending_reviews', (
            SELECT COUNT(*) FROM public.performance_reviews
            WHERE organization_id = p_organization_id AND status = 'draft'
        ),
        'overdue_goals', (
            SELECT COUNT(*) FROM public.employee_goals
            WHERE organization_id = p_organization_id
              AND status = 'active' AND due_date < p_date
        ),
        'pending_payroll', (
            SELECT COUNT(*) FROM public.payroll_records
            WHERE organization_id = p_organization_id
              AND status IN ('draft', 'pending')
              AND pay_period_month = EXTRACT(MONTH FROM p_date - INTERVAL '1 month')
        )
    ) INTO v_alerts;

    RETURN jsonb_build_object(
        'success', true,
        'date', p_date,
        'employees', COALESCE(v_employees, '{}'::jsonb),
        'attendance', COALESCE(v_attendance, '{}'::jsonb),
        'leaves', COALESCE(v_leaves, '{}'::jsonb),
        'alerts', COALESCE(v_alerts, '{}'::jsonb)
    );
END;
$$;

-- =====================================================
-- منح الصلاحيات
-- =====================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- =====================================================
-- إدراج بيانات أولية
-- =====================================================

-- سيتم إدراج أنواع الإجازات الافتراضية عند إنشاء المنظمة
-- عبر trigger أو عند التسجيل الأول

COMMENT ON TABLE public.work_shifts IS 'جدول الورديات - يحدد أوقات العمل';
COMMENT ON TABLE public.employee_attendance IS 'جدول الحضور والانصراف اليومي';
COMMENT ON TABLE public.leave_types IS 'أنواع الإجازات المتاحة';
COMMENT ON TABLE public.leave_requests IS 'طلبات الإجازات';
COMMENT ON TABLE public.salary_structures IS 'هيكل الرواتب لكل موظف';
COMMENT ON TABLE public.payroll_records IS 'سجلات الرواتب الشهرية';
COMMENT ON TABLE public.performance_reviews IS 'تقييمات أداء الموظفين';
COMMENT ON TABLE public.employee_goals IS 'أهداف الموظفين';
