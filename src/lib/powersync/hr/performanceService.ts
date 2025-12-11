/**
 * 📊 Performance Service (PowerSync) - خدمة تقييم الأداء أوفلاين فيرست
 * v4.0 - 2025-12-10
 */

import { powerSync } from '../PowerSyncService';
import type {
  PerformanceCriteria,
  PerformanceReviewPeriod,
  PerformanceReview,
  PerformanceReviewWithDetails,
  EmployeeGoal,
  GoalWithDetails,
  GoalUpdate,
  EmployeeWarning,
  WarningWithDetails,
  CreateCriteriaInput,
  CreateReviewPeriodInput,
  CreateReviewInput,
  CreateGoalInput,
  CreateWarningInput,
  ReviewFilter,
  GoalFilter,
  WarningFilter,
  PerformanceStats,
} from '@/types/hr/performance';

// ============================================
// 📋 Performance Criteria
// ============================================

/**
 * جلب معايير الأداء
 */
export async function getPerformanceCriteria(
  organizationId: string
): Promise<PerformanceCriteria[]> {
  const data = await powerSync.query<PerformanceCriteria>({
    sql: `SELECT * FROM performance_criteria
          WHERE organization_id = ? AND is_active = 1
          ORDER BY sort_order`,
    parameters: [organizationId],
  });

  return data;
}

/**
 * إنشاء معيار أداء
 */
export async function createPerformanceCriteria(
  organizationId: string,
  input: CreateCriteriaInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const success = await powerSync.mutate({
    table: 'performance_criteria',
    data: {
      id,
      organization_id: organizationId,
      name: input.name,
      name_ar: input.name_ar,
      description: input.description,
      category: input.category,
      weight: input.weight,
      max_score: input.max_score || 5,
      score_descriptions: input.score_descriptions
        ? JSON.stringify(input.score_descriptions)
        : null,
      is_active: 1,
      sort_order: input.sort_order || 0,
      created_at: now,
      updated_at: now,
    },
  });

  return { success, id: success ? id : undefined };
}

/**
 * تحديث معيار أداء
 */
export async function updatePerformanceCriteria(
  id: string,
  updates: Partial<CreateCriteriaInput>
): Promise<{ success: boolean; error?: string }> {
  const success = await powerSync.mutate({
    table: 'performance_criteria',
    data: {
      id,
      ...updates,
      score_descriptions: updates.score_descriptions
        ? JSON.stringify(updates.score_descriptions)
        : undefined,
      updated_at: new Date().toISOString(),
    },
  });

  return { success };
}

// ============================================
// 📆 Review Periods
// ============================================

/**
 * جلب فترات التقييم
 */
export async function getReviewPeriods(
  organizationId: string
): Promise<PerformanceReviewPeriod[]> {
  const data = await powerSync.query<PerformanceReviewPeriod>({
    sql: `SELECT * FROM performance_review_periods
          WHERE organization_id = ?
          ORDER BY start_date DESC`,
    parameters: [organizationId],
  });

  return data;
}

/**
 * جلب الفترة النشطة
 */
export async function getActiveReviewPeriod(
  organizationId: string
): Promise<PerformanceReviewPeriod | null> {
  const result = await powerSync.queryOne<PerformanceReviewPeriod>({
    sql: `SELECT * FROM performance_review_periods
          WHERE organization_id = ? AND is_active = 1 AND status = 'in_progress'`,
    parameters: [organizationId],
  });

  return result;
}

/**
 * إنشاء فترة تقييم
 */
export async function createReviewPeriod(
  organizationId: string,
  input: CreateReviewPeriodInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const success = await powerSync.mutate({
    table: 'performance_review_periods',
    data: {
      id,
      organization_id: organizationId,
      name: input.name,
      name_ar: input.name_ar,
      start_date: input.start_date,
      end_date: input.end_date,
      review_start_date: input.review_start_date,
      review_end_date: input.review_end_date,
      status: 'upcoming',
      is_active: 1,
      created_at: now,
      updated_at: now,
    },
  });

  return { success, id: success ? id : undefined };
}

/**
 * تحديث حالة فترة التقييم
 */
export async function updateReviewPeriodStatus(
  id: string,
  status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled'
): Promise<{ success: boolean; error?: string }> {
  const success = await powerSync.mutate({
    table: 'performance_review_periods',
    data: {
      id,
      status,
      updated_at: new Date().toISOString(),
    },
  });

  return { success };
}

// ============================================
// 📝 Performance Reviews
// ============================================

/**
 * جلب تقييمات الأداء
 */
export async function getPerformanceReviews(
  filter: ReviewFilter,
  page: number = 1,
  perPage: number = 20
): Promise<{ data: PerformanceReviewWithDetails[]; total: number }> {
  const offset = (page - 1) * perPage;
  let whereClause = '1=1';
  const params: (string | number)[] = [];

  if (filter.organization_id) {
    whereClause += ' AND r.organization_id = ?';
    params.push(filter.organization_id);
  }
  if (filter.employee_id) {
    whereClause += ' AND r.employee_id = ?';
    params.push(filter.employee_id);
  }
  if (filter.reviewer_id) {
    whereClause += ' AND r.reviewer_id = ?';
    params.push(filter.reviewer_id);
  }
  if (filter.period_id) {
    whereClause += ' AND r.period_id = ?';
    params.push(filter.period_id);
  }
  if (filter.status) {
    if (Array.isArray(filter.status)) {
      whereClause += ` AND r.status IN (${filter.status.map(() => '?').join(',')})`;
      params.push(...filter.status);
    } else {
      whereClause += ' AND r.status = ?';
      params.push(filter.status);
    }
  }
  if (filter.grade) {
    whereClause += ' AND r.grade = ?';
    params.push(filter.grade);
  }

  // Get total count
  const countResult = await powerSync.queryOne<{ count: number }>({
    sql: `SELECT COUNT(*) as count FROM performance_reviews r WHERE ${whereClause}`,
    parameters: params,
  });

  // Get paginated data
  const data = await powerSync.query<PerformanceReview & {
    employee_name: string;
    employee_email: string;
    employee_job_title: string;
    reviewer_name: string;
    period_name: string;
  }>({
    sql: `
      SELECT
        r.*,
        e.name as employee_name,
        e.email as employee_email,
        e.job_title as employee_job_title,
        rv.name as reviewer_name,
        p.name as period_name
      FROM performance_reviews r
      LEFT JOIN users e ON r.employee_id = e.id
      LEFT JOIN users rv ON r.reviewer_id = rv.id
      LEFT JOIN performance_review_periods p ON r.period_id = p.id
      WHERE ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `,
    parameters: [...params, perPage, offset],
  });

  return {
    data: data.map((record) => ({
      ...record,
      scores: record.scores ? JSON.parse(record.scores as string) : {},
      recommendations: record.recommendations
        ? JSON.parse(record.recommendations as string)
        : [],
      employee: {
        id: record.employee_id,
        name: record.employee_name,
        email: record.employee_email,
        job_title: record.employee_job_title,
      },
      reviewer: {
        id: record.reviewer_id,
        name: record.reviewer_name,
      },
      period: {
        id: record.period_id,
        name: record.period_name,
      },
    })) as PerformanceReviewWithDetails[],
    total: countResult?.count || 0,
  };
}

/**
 * إنشاء تقييم أداء
 */
export async function createPerformanceReview(
  input: CreateReviewInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const success = await powerSync.mutate({
    table: 'performance_reviews',
    data: {
      id,
      organization_id: input.organization_id,
      employee_id: input.employee_id,
      reviewer_id: input.reviewer_id,
      period_id: input.period_id,
      review_period_start: input.review_period_start,
      review_period_end: input.review_period_end,
      scores: JSON.stringify(input.scores || {}),
      total_score: 0,
      weighted_score: 0,
      grade: null,
      status: 'draft',
      created_at: now,
      updated_at: now,
    },
  });

  return { success, id: success ? id : undefined };
}

/**
 * تحديث تقييم الأداء
 */
export async function updatePerformanceReview(
  id: string,
  updates: Partial<PerformanceReview>
): Promise<{ success: boolean; error?: string }> {
  const success = await powerSync.mutate({
    table: 'performance_reviews',
    data: {
      id,
      ...updates,
      scores: updates.scores ? JSON.stringify(updates.scores) : undefined,
      recommendations: updates.recommendations
        ? JSON.stringify(updates.recommendations)
        : undefined,
      updated_at: new Date().toISOString(),
    },
  });

  return { success };
}

/**
 * تقديم التقييم للمراجعة
 */
export async function submitPerformanceReview(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const now = new Date().toISOString();

  const success = await powerSync.mutate({
    table: 'performance_reviews',
    data: {
      id,
      status: 'submitted',
      submitted_at: now,
      updated_at: now,
    },
  });

  return { success };
}

/**
 * إتمام التقييم
 */
export async function finalizePerformanceReview(
  id: string,
  finalizedBy: string
): Promise<{ success: boolean; error?: string }> {
  const now = new Date().toISOString();

  const success = await powerSync.mutate({
    table: 'performance_reviews',
    data: {
      id,
      status: 'finalized',
      finalized_at: now,
      finalized_by: finalizedBy,
      updated_at: now,
    },
  });

  return { success };
}

// ============================================
// 🎯 Employee Goals
// ============================================

/**
 * جلب أهداف الموظف
 */
export async function getEmployeeGoals(
  filter: GoalFilter,
  page: number = 1,
  perPage: number = 20
): Promise<{ data: GoalWithDetails[]; total: number }> {
  const offset = (page - 1) * perPage;
  let whereClause = '1=1';
  const params: (string | number)[] = [];

  if (filter.organization_id) {
    whereClause += ' AND g.organization_id = ?';
    params.push(filter.organization_id);
  }
  if (filter.employee_id) {
    whereClause += ' AND g.employee_id = ?';
    params.push(filter.employee_id);
  }
  if (filter.status) {
    if (Array.isArray(filter.status)) {
      whereClause += ` AND g.status IN (${filter.status.map(() => '?').join(',')})`;
      params.push(...filter.status);
    } else {
      whereClause += ' AND g.status = ?';
      params.push(filter.status);
    }
  }
  if (filter.category) {
    whereClause += ' AND g.category = ?';
    params.push(filter.category);
  }
  if (filter.priority) {
    whereClause += ' AND g.priority = ?';
    params.push(filter.priority);
  }
  if (filter.due_before) {
    whereClause += ' AND g.due_date <= ?';
    params.push(filter.due_before);
  }

  // Get total count
  const countResult = await powerSync.queryOne<{ count: number }>({
    sql: `SELECT COUNT(*) as count FROM employee_goals g WHERE ${whereClause}`,
    parameters: params,
  });

  // Get paginated data
  const data = await powerSync.query<EmployeeGoal & {
    employee_name: string;
    employee_email: string;
    assigned_by_name: string;
  }>({
    sql: `
      SELECT
        g.*,
        e.name as employee_name,
        e.email as employee_email,
        a.name as assigned_by_name
      FROM employee_goals g
      LEFT JOIN users e ON g.employee_id = e.id
      LEFT JOIN users a ON g.assigned_by = a.id
      WHERE ${whereClause}
      ORDER BY g.due_date ASC
      LIMIT ? OFFSET ?
    `,
    parameters: [...params, perPage, offset],
  });

  return {
    data: data.map((record) => ({
      ...record,
      milestones: record.milestones ? JSON.parse(record.milestones as string) : [],
      employee: {
        id: record.employee_id,
        name: record.employee_name,
        email: record.employee_email,
      },
      assigned_by_user: record.assigned_by
        ? { id: record.assigned_by, name: record.assigned_by_name }
        : undefined,
    })) as GoalWithDetails[],
    total: countResult?.count || 0,
  };
}

/**
 * إنشاء هدف للموظف
 */
export async function createEmployeeGoal(
  input: CreateGoalInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const success = await powerSync.mutate({
    table: 'employee_goals',
    data: {
      id,
      organization_id: input.organization_id,
      employee_id: input.employee_id,
      assigned_by: input.assigned_by,
      title: input.title,
      description: input.description,
      category: input.category,
      target_type: input.target_type,
      target_value: input.target_value,
      current_value: 0,
      unit: input.unit,
      milestones: input.milestones ? JSON.stringify(input.milestones) : null,
      start_date: input.start_date,
      due_date: input.due_date,
      priority: input.priority || 'medium',
      weight: input.weight || 1,
      status: 'draft',
      achievement_percentage: 0,
      created_at: now,
      updated_at: now,
    },
  });

  return { success, id: success ? id : undefined };
}

/**
 * تحديث تقدم الهدف
 */
export async function updateGoalProgress(
  goalId: string,
  newValue: number,
  updatedBy: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const goal = await powerSync.queryOne<EmployeeGoal>({
    sql: 'SELECT * FROM employee_goals WHERE id = ?',
    parameters: [goalId],
  });

  if (!goal) {
    return { success: false, error: 'الهدف غير موجود' };
  }

  const now = new Date().toISOString();
  const previousValue = goal.current_value || 0;
  const achievementPercentage = goal.target_value
    ? Math.min(100, (newValue / goal.target_value) * 100)
    : 0;

  // Create update record
  await powerSync.mutate({
    table: 'goal_updates',
    data: {
      id: crypto.randomUUID(),
      organization_id: goal.organization_id,
      goal_id: goalId,
      updated_by: updatedBy,
      previous_value: previousValue,
      new_value: newValue,
      notes,
      created_at: now,
    },
  });

  // Update goal
  let status = goal.status;
  if (achievementPercentage >= 100) {
    status = 'achieved';
  } else if (achievementPercentage > 0 && goal.status === 'draft') {
    status = 'active';
  }

  const success = await powerSync.mutate({
    table: 'employee_goals',
    data: {
      id: goalId,
      current_value: newValue,
      achievement_percentage: achievementPercentage,
      status,
      completed_at: status === 'achieved' ? now : null,
      updated_at: now,
    },
  });

  return { success };
}

/**
 * تغيير حالة الهدف
 */
export async function updateGoalStatus(
  goalId: string,
  status: string,
  finalNotes?: string
): Promise<{ success: boolean; error?: string }> {
  const now = new Date().toISOString();

  const success = await powerSync.mutate({
    table: 'employee_goals',
    data: {
      id: goalId,
      status,
      final_notes: finalNotes,
      completed_at: ['achieved', 'partially', 'missed'].includes(status) ? now : null,
      updated_at: now,
    },
  });

  return { success };
}

// ============================================
// ⚠️ Employee Warnings
// ============================================

/**
 * جلب إنذارات الموظف
 */
export async function getEmployeeWarnings(
  filter: WarningFilter,
  page: number = 1,
  perPage: number = 20
): Promise<{ data: WarningWithDetails[]; total: number }> {
  const offset = (page - 1) * perPage;
  let whereClause = '1=1';
  const params: (string | number)[] = [];

  if (filter.organization_id) {
    whereClause += ' AND w.organization_id = ?';
    params.push(filter.organization_id);
  }
  if (filter.employee_id) {
    whereClause += ' AND w.employee_id = ?';
    params.push(filter.employee_id);
  }
  if (filter.status) {
    if (Array.isArray(filter.status)) {
      whereClause += ` AND w.status IN (${filter.status.map(() => '?').join(',')})`;
      params.push(...filter.status);
    } else {
      whereClause += ' AND w.status = ?';
      params.push(filter.status);
    }
  }
  if (filter.warning_type) {
    whereClause += ' AND w.warning_type = ?';
    params.push(filter.warning_type);
  }
  if (filter.reason_category) {
    whereClause += ' AND w.reason_category = ?';
    params.push(filter.reason_category);
  }

  // Get total count
  const countResult = await powerSync.queryOne<{ count: number }>({
    sql: `SELECT COUNT(*) as count FROM employee_warnings w WHERE ${whereClause}`,
    parameters: params,
  });

  // Get paginated data
  const data = await powerSync.query<EmployeeWarning & {
    employee_name: string;
    employee_email: string;
    issued_by_name: string;
    resolved_by_name: string;
  }>({
    sql: `
      SELECT
        w.*,
        e.name as employee_name,
        e.email as employee_email,
        i.name as issued_by_name,
        r.name as resolved_by_name
      FROM employee_warnings w
      LEFT JOIN users e ON w.employee_id = e.id
      LEFT JOIN users i ON w.issued_by = i.id
      LEFT JOIN users r ON w.resolved_by = r.id
      WHERE ${whereClause}
      ORDER BY w.created_at DESC
      LIMIT ? OFFSET ?
    `,
    parameters: [...params, perPage, offset],
  });

  return {
    data: data.map((record) => ({
      ...record,
      evidence_urls: record.evidence_urls
        ? JSON.parse(record.evidence_urls as string)
        : [],
      employee: {
        id: record.employee_id,
        name: record.employee_name,
        email: record.employee_email,
      },
      issued_by_user: {
        id: record.issued_by,
        name: record.issued_by_name,
      },
      resolved_by_user: record.resolved_by
        ? { id: record.resolved_by, name: record.resolved_by_name }
        : undefined,
    })) as WarningWithDetails[],
    total: countResult?.count || 0,
  };
}

/**
 * إنشاء إنذار للموظف
 */
export async function createEmployeeWarning(
  input: CreateWarningInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const success = await powerSync.mutate({
    table: 'employee_warnings',
    data: {
      id,
      organization_id: input.organization_id,
      employee_id: input.employee_id,
      issued_by: input.issued_by,
      warning_type: input.warning_type,
      reason_category: input.reason_category,
      title: input.title,
      description: input.description,
      incident_date: input.incident_date,
      evidence_urls: input.evidence_urls
        ? JSON.stringify(input.evidence_urls)
        : null,
      action_required: input.action_required,
      improvement_deadline: input.improvement_deadline,
      status: 'draft',
      created_at: now,
      updated_at: now,
    },
  });

  return { success, id: success ? id : undefined };
}

/**
 * إصدار الإنذار
 */
export async function issueWarning(
  warningId: string
): Promise<{ success: boolean; error?: string }> {
  const success = await powerSync.mutate({
    table: 'employee_warnings',
    data: {
      id: warningId,
      status: 'issued',
      updated_at: new Date().toISOString(),
    },
  });

  return { success };
}

/**
 * تسجيل اعتراف الموظف بالإنذار
 */
export async function acknowledgeWarning(
  warningId: string,
  response?: string
): Promise<{ success: boolean; error?: string }> {
  const now = new Date().toISOString();

  const success = await powerSync.mutate({
    table: 'employee_warnings',
    data: {
      id: warningId,
      status: 'acknowledged',
      acknowledged_at: now,
      employee_response: response,
      updated_at: now,
    },
  });

  return { success };
}

/**
 * حل الإنذار
 */
export async function resolveWarning(
  warningId: string,
  resolvedBy: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const now = new Date().toISOString();

  const success = await powerSync.mutate({
    table: 'employee_warnings',
    data: {
      id: warningId,
      status: 'resolved',
      resolved_at: now,
      resolved_by: resolvedBy,
      resolution_notes: notes,
      updated_at: now,
    },
  });

  return { success };
}

// ============================================
// 📊 Performance Statistics
// ============================================

/**
 * جلب إحصائيات أداء الموظف
 */
export async function getEmployeePerformanceStats(
  employeeId: string,
  year?: number
): Promise<PerformanceStats> {
  const currentYear = year || new Date().getFullYear();
  const startDate = `${currentYear}-01-01`;
  const endDate = `${currentYear}-12-31`;

  // Get reviews
  const reviews = await powerSync.query<PerformanceReview>({
    sql: `SELECT * FROM performance_reviews
          WHERE employee_id = ? AND review_period_start >= ? AND review_period_end <= ?`,
    parameters: [employeeId, startDate, endDate],
  });

  // Get goals
  const goals = await powerSync.query<EmployeeGoal>({
    sql: `SELECT * FROM employee_goals
          WHERE employee_id = ? AND start_date >= ?`,
    parameters: [employeeId, startDate],
  });

  // Get warnings
  const warnings = await powerSync.query<EmployeeWarning>({
    sql: `SELECT * FROM employee_warnings
          WHERE employee_id = ? AND created_at >= ?`,
    parameters: [employeeId, startDate],
  });

  const avgScore = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + (r.weighted_score || 0), 0) / reviews.length
    : 0;

  return {
    employee_id: employeeId,
    year: currentYear,
    reviews_count: reviews.length,
    average_score: Math.round(avgScore * 100) / 100,
    goals: {
      total: goals.length,
      achieved: goals.filter((g) => g.status === 'achieved').length,
      active: goals.filter((g) => g.status === 'active').length,
      missed: goals.filter((g) => g.status === 'missed').length,
    },
    warnings: {
      total: warnings.length,
      active: warnings.filter((w) =>
        ['issued', 'acknowledged'].includes(w.status)
      ).length,
    },
    latest_grade: reviews.length > 0 ? reviews[reviews.length - 1].grade : null,
  };
}

// ============================================
// 🔄 Watch for Real-time Updates
// ============================================

/**
 * مراقبة أهداف الموظف
 */
export function watchEmployeeGoals(
  employeeId: string,
  callback: (data: EmployeeGoal[]) => void
): () => void {
  return powerSync.watch<EmployeeGoal>({
    sql: `SELECT * FROM employee_goals
          WHERE employee_id = ? AND status IN ('draft', 'active', 'on_hold')
          ORDER BY due_date ASC`,
    parameters: [employeeId],
    onResult: callback,
  });
}

/**
 * مراقبة إنذارات الموظف
 */
export function watchEmployeeWarnings(
  employeeId: string,
  callback: (data: EmployeeWarning[]) => void
): () => void {
  return powerSync.watch<EmployeeWarning>({
    sql: `SELECT * FROM employee_warnings
          WHERE employee_id = ? AND status NOT IN ('resolved', 'expired', 'revoked')
          ORDER BY created_at DESC`,
    parameters: [employeeId],
    onResult: callback,
  });
}
