/**
 * 📊 Performance Management Types - أنواع إدارة الأداء
 */

// ============================================
// 🎯 Enums & Constants
// ============================================

/** حالات التقييم */
export type ReviewStatus =
  | 'draft'        // مسودة
  | 'submitted'    // مقدم للموظف
  | 'acknowledged' // اطلع عليه الموظف
  | 'disputed'     // معترض عليه
  | 'finalized';   // نهائي

/** ألوان حالات التقييم */
export const REVIEW_STATUS_COLORS: Record<ReviewStatus, string> = {
  draft: '#6B7280',
  submitted: '#F59E0B',
  acknowledged: '#3B82F6',
  disputed: '#EF4444',
  finalized: '#10B981',
};

/** تسميات حالات التقييم */
export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  draft: 'مسودة',
  submitted: 'مقدم',
  acknowledged: 'تم الاطلاع',
  disputed: 'معترض عليه',
  finalized: 'نهائي',
};

/** فئات معايير التقييم */
export type CriteriaCategory =
  | 'productivity'     // الإنتاجية
  | 'quality'          // الجودة
  | 'attendance'       // الحضور والالتزام
  | 'teamwork'         // العمل الجماعي
  | 'communication'    // التواصل
  | 'initiative'       // المبادرة
  | 'leadership'       // القيادة
  | 'technical_skills' // المهارات التقنية
  | 'customer_service' // خدمة العملاء
  | 'sales';           // المبيعات

/** تسميات فئات المعايير */
export const CRITERIA_CATEGORY_LABELS: Record<CriteriaCategory, string> = {
  productivity: 'الإنتاجية',
  quality: 'الجودة',
  attendance: 'الحضور والالتزام',
  teamwork: 'العمل الجماعي',
  communication: 'التواصل',
  initiative: 'المبادرة',
  leadership: 'القيادة',
  technical_skills: 'المهارات التقنية',
  customer_service: 'خدمة العملاء',
  sales: 'المبيعات',
};

/** ألوان فئات المعايير */
export const CRITERIA_CATEGORY_COLORS: Record<CriteriaCategory, string> = {
  productivity: '#10B981',
  quality: '#3B82F6',
  attendance: '#F59E0B',
  teamwork: '#8B5CF6',
  communication: '#EC4899',
  initiative: '#14B8A6',
  leadership: '#F97316',
  technical_skills: '#6366F1',
  customer_service: '#06B6D4',
  sales: '#84CC16',
};

/** أنواع الأهداف */
export type GoalTargetType =
  | 'numeric'     // رقمي (مثل عدد المبيعات)
  | 'percentage'  // نسبة مئوية
  | 'binary'      // نعم/لا (إنجاز أو عدم إنجاز)
  | 'milestone';  // مراحل متعددة

/** حالات الأهداف */
export type GoalStatus =
  | 'draft'     // مسودة
  | 'active'    // نشط
  | 'on_hold'   // معلق
  | 'achieved'  // محقق
  | 'partially' // محقق جزئياً
  | 'missed'    // لم يتحقق
  | 'cancelled'; // ملغي

/** ألوان حالات الأهداف */
export const GOAL_STATUS_COLORS: Record<GoalStatus, string> = {
  draft: '#6B7280',
  active: '#3B82F6',
  on_hold: '#F59E0B',
  achieved: '#10B981',
  partially: '#8B5CF6',
  missed: '#EF4444',
  cancelled: '#9CA3AF',
};

/** تسميات حالات الأهداف */
export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  draft: 'مسودة',
  active: 'نشط',
  on_hold: 'معلق',
  achieved: 'محقق',
  partially: 'محقق جزئياً',
  missed: 'لم يتحقق',
  cancelled: 'ملغي',
};

/** أولويات الأهداف */
export type GoalPriority = 'low' | 'medium' | 'high' | 'critical';

/** تسميات الأولويات */
export const GOAL_PRIORITY_LABELS: Record<GoalPriority, string> = {
  low: 'منخفضة',
  medium: 'متوسطة',
  high: 'عالية',
  critical: 'حرجة',
};

/** درجات التقييم */
export type ReviewGrade = 'A' | 'B' | 'C' | 'D' | 'F';

/** تسميات الدرجات بالعربية */
export const REVIEW_GRADE_LABELS: Record<ReviewGrade, string> = {
  A: 'ممتاز',
  B: 'جيد جداً',
  C: 'جيد',
  D: 'مقبول',
  F: 'ضعيف',
};

/** ألوان الدرجات */
export const REVIEW_GRADE_COLORS: Record<ReviewGrade, string> = {
  A: '#10B981',
  B: '#3B82F6',
  C: '#F59E0B',
  D: '#F97316',
  F: '#EF4444',
};

// ============================================
// 📋 Main Types
// ============================================

/** وصف الدرجات لمعيار معين */
export interface ScoreDescription {
  score: number;
  label: string;
  description: string;
}

/** معيار التقييم */
export interface PerformanceCriteria {
  id: string;
  organization_id: string;

  name: string;
  name_ar: string;
  description?: string | null;

  category: CriteriaCategory;
  weight: number; // الوزن من 100
  max_score: number;

  score_descriptions: Record<number, ScoreDescription>;

  is_active: boolean;
  sort_order: number;

  created_at: string;
  updated_at: string;
}

/** فترة التقييم */
export interface PerformanceReviewPeriod {
  id: string;
  organization_id: string;

  name: string;
  name_ar: string;

  start_date: string;
  end_date: string;

  review_start_date: string;
  review_end_date: string;

  status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled';

  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** درجة معيار فردي */
export interface CriteriaScore {
  criteria_id: string;
  score: number;
  comment?: string;
}

/** توصيات التقييم */
export interface ReviewRecommendations {
  promotion?: boolean;
  salary_increase?: boolean;
  salary_increase_percentage?: number;
  training?: string[];
  role_change?: string;
  other?: string;
}

/** تقييم الأداء */
export interface PerformanceReview {
  id: string;
  employee_id: string;
  reviewer_id: string;
  organization_id: string;
  period_id?: string | null;

  review_period_start: string;
  review_period_end: string;

  // الدرجات
  scores: Record<string, CriteriaScore>; // {criteria_id: {score, comment}}
  total_score?: number | null;
  weighted_score?: number | null;
  grade?: ReviewGrade | null;

  // التقييم العام
  strengths?: string | null;
  areas_for_improvement?: string | null;
  achievements?: string | null;
  goals_for_next_period?: string | null;

  // التعليقات
  reviewer_comments?: string | null;
  employee_comments?: string | null;
  manager_comments?: string | null;

  // التوصيات
  recommendations: ReviewRecommendations;

  // الحالة
  status: ReviewStatus;

  // التوقيعات
  submitted_at?: string | null;
  acknowledged_at?: string | null;
  finalized_at?: string | null;
  finalized_by?: string | null;

  created_at: string;
  updated_at: string;
}

/** تقييم الأداء مع التفاصيل */
export interface PerformanceReviewWithDetails extends PerformanceReview {
  employee?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string | null;
    job_title?: string | null;
  };
  reviewer?: {
    id: string;
    name: string;
  };
  period?: PerformanceReviewPeriod;
  criteria_details?: PerformanceCriteria[];
}

/** مرحلة الهدف */
export interface GoalMilestone {
  id: string;
  title: string;
  description?: string;
  target_date: string;
  is_completed: boolean;
  completed_at?: string;
}

/** هدف الموظف */
export interface EmployeeGoal {
  id: string;
  employee_id: string;
  organization_id: string;
  assigned_by?: string | null;

  title: string;
  description?: string | null;
  category?: string | null;

  // القياس
  target_type: GoalTargetType;
  target_value?: number | null;
  current_value: number;
  unit?: string | null;

  // المراحل
  milestones: GoalMilestone[];

  // التواريخ
  start_date: string;
  due_date: string;
  completed_at?: string | null;

  // الأولوية والوزن
  priority: GoalPriority;
  weight: number;

  // الحالة
  status: GoalStatus;

  // النتيجة
  achievement_percentage: number;
  final_notes?: string | null;

  created_at: string;
  updated_at: string;
}

/** تحديث الهدف */
export interface GoalUpdate {
  id: string;
  goal_id: string;
  updated_by: string;

  previous_value?: number | null;
  new_value?: number | null;
  notes?: string | null;

  created_at: string;
}

// ============================================
// 📝 Input Types
// ============================================

/** إدخال إنشاء معيار تقييم */
export interface CreateCriteriaInput {
  name: string;
  name_ar: string;
  description?: string;
  category: CriteriaCategory;
  weight?: number;
  max_score?: number;
  score_descriptions?: Record<number, ScoreDescription>;
}

/** إدخال إنشاء تقييم */
export interface CreateReviewInput {
  employee_id: string;
  reviewer_id: string;
  period_id?: string;
  review_period_start: string;
  review_period_end: string;
}

/** إدخال تقديم التقييم */
export interface SubmitReviewInput {
  review_id: string;
  scores: Record<string, CriteriaScore>;
  strengths?: string;
  areas_for_improvement?: string;
  achievements?: string;
  goals_for_next_period?: string;
  reviewer_comments?: string;
  recommendations?: ReviewRecommendations;
}

/** إدخال إنشاء هدف */
export interface CreateGoalInput {
  employee_id: string;
  title: string;
  description?: string;
  category?: string;
  target_type: GoalTargetType;
  target_value?: number;
  unit?: string;
  milestones?: Omit<GoalMilestone, 'id' | 'is_completed' | 'completed_at'>[];
  start_date: string;
  due_date: string;
  priority?: GoalPriority;
  weight?: number;
}

/** إدخال تحديث تقدم الهدف */
export interface UpdateGoalProgressInput {
  goal_id: string;
  new_value: number;
  notes?: string;
}

/** فلتر التقييمات */
export interface ReviewFilter {
  employee_id?: string;
  reviewer_id?: string;
  period_id?: string;
  status?: ReviewStatus | ReviewStatus[];
  grade?: ReviewGrade | ReviewGrade[];
  date_from?: string;
  date_to?: string;
}

/** فلتر الأهداف */
export interface GoalFilter {
  employee_id?: string;
  assigned_by?: string;
  status?: GoalStatus | GoalStatus[];
  priority?: GoalPriority | GoalPriority[];
  category?: string;
  due_date_from?: string;
  due_date_to?: string;
}

// ============================================
// 📊 Statistics Types
// ============================================

/** إحصائيات أداء الموظف */
export interface EmployeePerformanceStats {
  employee_id: string;
  reviews_count: number;
  avg_score: number;
  latest_grade?: ReviewGrade;
  improvement_trend: 'improving' | 'stable' | 'declining';
  score_history: {
    period: string;
    score: number;
    grade: ReviewGrade;
  }[];
  category_scores: {
    category: CriteriaCategory;
    avg_score: number;
  }[];
}

/** إحصائيات الأهداف */
export interface GoalStats {
  total: number;
  achieved: number;
  active: number;
  overdue: number;
  achievement_rate: number;
  by_priority: {
    priority: GoalPriority;
    count: number;
    achieved: number;
  }[];
  by_category: {
    category: string;
    count: number;
    achieved: number;
  }[];
}

/** ملخص أداء المنظمة */
export interface OrganizationPerformanceSummary {
  organization_id: string;
  period?: {
    start: string;
    end: string;
  };
  total_employees: number;
  reviews_completed: number;
  pending_reviews: number;
  avg_organization_score: number;
  grade_distribution: Record<ReviewGrade, number>;
  top_performers: {
    employee_id: string;
    employee_name: string;
    score: number;
    grade: ReviewGrade;
  }[];
  needs_improvement: {
    employee_id: string;
    employee_name: string;
    score: number;
    grade: ReviewGrade;
  }[];
  goal_completion_rate: number;
}

// ============================================
// 📅 Default Criteria
// ============================================

/** معايير التقييم الافتراضية */
export const DEFAULT_PERFORMANCE_CRITERIA: Omit<PerformanceCriteria, 'id' | 'organization_id' | 'created_at' | 'updated_at'>[] = [
  {
    name: 'Work Quality',
    name_ar: 'جودة العمل',
    description: 'مستوى جودة ودقة العمل المنجز',
    category: 'quality',
    weight: 20,
    max_score: 5,
    score_descriptions: {
      1: { score: 1, label: 'ضعيف', description: 'جودة العمل أقل من المقبول' },
      2: { score: 2, label: 'مقبول', description: 'جودة العمل تحتاج للتحسين' },
      3: { score: 3, label: 'جيد', description: 'جودة العمل تلبي التوقعات' },
      4: { score: 4, label: 'جيد جداً', description: 'جودة العمل تتجاوز التوقعات' },
      5: { score: 5, label: 'ممتاز', description: 'جودة العمل استثنائية' },
    },
    is_active: true,
    sort_order: 1,
  },
  {
    name: 'Productivity',
    name_ar: 'الإنتاجية',
    description: 'حجم العمل المنجز في الوقت المحدد',
    category: 'productivity',
    weight: 20,
    max_score: 5,
    score_descriptions: {
      1: { score: 1, label: 'ضعيف', description: 'إنتاجية أقل من المطلوب' },
      2: { score: 2, label: 'مقبول', description: 'إنتاجية تحتاج للتحسين' },
      3: { score: 3, label: 'جيد', description: 'إنتاجية تلبي التوقعات' },
      4: { score: 4, label: 'جيد جداً', description: 'إنتاجية تتجاوز التوقعات' },
      5: { score: 5, label: 'ممتاز', description: 'إنتاجية استثنائية' },
    },
    is_active: true,
    sort_order: 2,
  },
  {
    name: 'Attendance & Punctuality',
    name_ar: 'الحضور والالتزام',
    description: 'الالتزام بأوقات العمل والحضور المنتظم',
    category: 'attendance',
    weight: 15,
    max_score: 5,
    score_descriptions: {
      1: { score: 1, label: 'ضعيف', description: 'غيابات متكررة وتأخير مستمر' },
      2: { score: 2, label: 'مقبول', description: 'بعض الغيابات والتأخير' },
      3: { score: 3, label: 'جيد', description: 'التزام مقبول بأوقات العمل' },
      4: { score: 4, label: 'جيد جداً', description: 'التزام ممتاز بأوقات العمل' },
      5: { score: 5, label: 'ممتاز', description: 'التزام تام وحضور منتظم' },
    },
    is_active: true,
    sort_order: 3,
  },
  {
    name: 'Teamwork',
    name_ar: 'العمل الجماعي',
    description: 'القدرة على العمل ضمن فريق والتعاون مع الزملاء',
    category: 'teamwork',
    weight: 15,
    max_score: 5,
    score_descriptions: {
      1: { score: 1, label: 'ضعيف', description: 'صعوبة في العمل مع الآخرين' },
      2: { score: 2, label: 'مقبول', description: 'تعاون محدود مع الفريق' },
      3: { score: 3, label: 'جيد', description: 'تعاون جيد مع الفريق' },
      4: { score: 4, label: 'جيد جداً', description: 'عضو فعال في الفريق' },
      5: { score: 5, label: 'ممتاز', description: 'قائد في العمل الجماعي' },
    },
    is_active: true,
    sort_order: 4,
  },
  {
    name: 'Communication',
    name_ar: 'التواصل',
    description: 'مهارات التواصل مع الزملاء والعملاء',
    category: 'communication',
    weight: 10,
    max_score: 5,
    score_descriptions: {
      1: { score: 1, label: 'ضعيف', description: 'صعوبة في التواصل' },
      2: { score: 2, label: 'مقبول', description: 'تواصل يحتاج للتحسين' },
      3: { score: 3, label: 'جيد', description: 'تواصل واضح وفعال' },
      4: { score: 4, label: 'جيد جداً', description: 'تواصل ممتاز' },
      5: { score: 5, label: 'ممتاز', description: 'مهارات تواصل استثنائية' },
    },
    is_active: true,
    sort_order: 5,
  },
  {
    name: 'Initiative',
    name_ar: 'المبادرة',
    description: 'القدرة على أخذ المبادرة وتقديم الأفكار الجديدة',
    category: 'initiative',
    weight: 10,
    max_score: 5,
    score_descriptions: {
      1: { score: 1, label: 'ضعيف', description: 'يعتمد على التوجيه المستمر' },
      2: { score: 2, label: 'مقبول', description: 'مبادرة محدودة' },
      3: { score: 3, label: 'جيد', description: 'يأخذ المبادرة عند الحاجة' },
      4: { score: 4, label: 'جيد جداً', description: 'مبادر ويقدم أفكاراً جديدة' },
      5: { score: 5, label: 'ممتاز', description: 'قائد في المبادرة والابتكار' },
    },
    is_active: true,
    sort_order: 6,
  },
  {
    name: 'Customer Service',
    name_ar: 'خدمة العملاء',
    description: 'التعامل مع العملاء وتلبية احتياجاتهم',
    category: 'customer_service',
    weight: 10,
    max_score: 5,
    score_descriptions: {
      1: { score: 1, label: 'ضعيف', description: 'خدمة عملاء ضعيفة' },
      2: { score: 2, label: 'مقبول', description: 'خدمة عملاء تحتاج للتحسين' },
      3: { score: 3, label: 'جيد', description: 'خدمة عملاء جيدة' },
      4: { score: 4, label: 'جيد جداً', description: 'خدمة عملاء ممتازة' },
      5: { score: 5, label: 'ممتاز', description: 'خدمة عملاء استثنائية' },
    },
    is_active: true,
    sort_order: 7,
  },
];
