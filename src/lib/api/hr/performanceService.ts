/**
 * 📊 Performance Service - خدمة تقييم الأداء
 */

import { supabase } from '@/lib/supabase';
import type {
  PerformanceCriteria,
  PerformanceReviewPeriod,
  PerformanceReview,
  PerformanceReviewWithDetails,
  EmployeeGoal,
  GoalUpdate,
  ReviewStatus,
  GoalStatus,
  ReviewGrade,
  CreateCriteriaInput,
  CreateReviewInput,
  SubmitReviewInput,
  CreateGoalInput,
  UpdateGoalProgressInput,
  ReviewFilter,
  GoalFilter,
  EmployeePerformanceStats,
  GoalStats,
  OrganizationPerformanceSummary,
  CriteriaScore,
  DEFAULT_PERFORMANCE_CRITERIA,
} from '@/types/hr/performance';

// ============================================
// 📋 Performance Criteria
// ============================================

/**
 * جلب معايير التقييم للمنظمة
 */
export async function getPerformanceCriteria(
  organizationId: string
): Promise<PerformanceCriteria[]> {
  const { data, error } = await supabase
    .from('performance_criteria')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('sort_order');

  if (error) {
    console.error('Error fetching performance criteria:', error);
    return [];
  }

  return data as PerformanceCriteria[];
}

/**
 * إنشاء معيار تقييم
 */
export async function createPerformanceCriteria(
  organizationId: string,
  input: CreateCriteriaInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const { data, error } = await supabase
    .from('performance_criteria')
    .insert({
      organization_id: organizationId,
      ...input,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating criteria:', error);
    return { success: false, error: error.message };
  }

  return { success: true, id: data.id };
}

/**
 * تحديث معيار تقييم
 */
export async function updatePerformanceCriteria(
  id: string,
  updates: Partial<CreateCriteriaInput>
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('performance_criteria')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Error updating criteria:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * إنشاء معايير التقييم الافتراضية
 */
export async function initializeDefaultCriteria(
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  const criteriaToInsert = DEFAULT_PERFORMANCE_CRITERIA.map((c) => ({
    ...c,
    organization_id: organizationId,
  }));

  const { error } = await supabase
    .from('performance_criteria')
    .insert(criteriaToInsert);

  if (error) {
    console.error('Error initializing default criteria:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================
// 📅 Review Periods
// ============================================

/**
 * جلب فترات التقييم
 */
export async function getReviewPeriods(
  organizationId: string,
  activeOnly: boolean = false
): Promise<PerformanceReviewPeriod[]> {
  let query = supabase
    .from('performance_review_periods')
    .select('*')
    .eq('organization_id', organizationId);

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query.order('start_date', { ascending: false });

  if (error) {
    console.error('Error fetching review periods:', error);
    return [];
  }

  return data as PerformanceReviewPeriod[];
}

/**
 * إنشاء فترة تقييم
 */
export async function createReviewPeriod(
  organizationId: string,
  input: {
    name: string;
    name_ar: string;
    start_date: string;
    end_date: string;
    review_start_date: string;
    review_end_date: string;
  }
): Promise<{ success: boolean; id?: string; error?: string }> {
  const { data, error } = await supabase
    .from('performance_review_periods')
    .insert({
      organization_id: organizationId,
      ...input,
      status: 'upcoming',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating review period:', error);
    return { success: false, error: error.message };
  }

  return { success: true, id: data.id };
}

// ============================================
// 📝 Performance Reviews
// ============================================

/**
 * إنشاء تقييم جديد
 */
export async function createReview(
  organizationId: string,
  input: CreateReviewInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const { data, error } = await supabase
    .from('performance_reviews')
    .insert({
      employee_id: input.employee_id,
      reviewer_id: input.reviewer_id,
      organization_id: organizationId,
      period_id: input.period_id,
      review_period_start: input.review_period_start,
      review_period_end: input.review_period_end,
      scores: {},
      recommendations: {},
      status: 'draft',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating review:', error);
    return { success: false, error: error.message };
  }

  return { success: true, id: data.id };
}

/**
 * تقديم التقييم
 */
export async function submitReview(
  input: SubmitReviewInput
): Promise<{ success: boolean; error?: string }> {
  // حساب الدرجة الإجمالية
  const scores = input.scores;
  let totalScore = 0;
  let totalWeight = 0;

  Object.values(scores).forEach((score: CriteriaScore) => {
    totalScore += score.score;
    totalWeight++;
  });

  const avgScore = totalWeight > 0 ? totalScore / totalWeight : 0;

  // تحديد الدرجة
  let grade: ReviewGrade;
  if (avgScore >= 4.5) grade = 'A';
  else if (avgScore >= 3.5) grade = 'B';
  else if (avgScore >= 2.5) grade = 'C';
  else if (avgScore >= 1.5) grade = 'D';
  else grade = 'F';

  const { error } = await supabase
    .from('performance_reviews')
    .update({
      scores: input.scores,
      total_score: avgScore,
      weighted_score: avgScore, // يمكن تعديلها لحساب الوزن
      grade,
      strengths: input.strengths,
      areas_for_improvement: input.areas_for_improvement,
      achievements: input.achievements,
      goals_for_next_period: input.goals_for_next_period,
      reviewer_comments: input.reviewer_comments,
      recommendations: input.recommendations || {},
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.review_id);

  if (error) {
    console.error('Error submitting review:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * تأكيد اطلاع الموظف على التقييم
 */
export async function acknowledgeReview(
  reviewId: string,
  employeeComments?: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('performance_reviews')
    .update({
      status: 'acknowledged',
      acknowledged_at: new Date().toISOString(),
      employee_comments: employeeComments,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reviewId);

  if (error) {
    console.error('Error acknowledging review:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * إنهاء التقييم
 */
export async function finalizeReview(
  reviewId: string,
  finalizedBy: string,
  managerComments?: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('performance_reviews')
    .update({
      status: 'finalized',
      finalized_at: new Date().toISOString(),
      finalized_by: finalizedBy,
      manager_comments: managerComments,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reviewId);

  if (error) {
    console.error('Error finalizing review:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * جلب التقييمات
 */
export async function getReviews(
  organizationId: string,
  filter: ReviewFilter,
  page: number = 1,
  perPage: number = 20
): Promise<{ data: PerformanceReviewWithDetails[]; total: number }> {
  let query = supabase
    .from('performance_reviews')
    .select(`
      *,
      employee:users!employee_id(id, name, email, avatar_url, job_title),
      reviewer:users!reviewer_id(id, name),
      period:performance_review_periods(*)
    `, { count: 'exact' })
    .eq('organization_id', organizationId);

  if (filter.employee_id) {
    query = query.eq('employee_id', filter.employee_id);
  }
  if (filter.reviewer_id) {
    query = query.eq('reviewer_id', filter.reviewer_id);
  }
  if (filter.period_id) {
    query = query.eq('period_id', filter.period_id);
  }
  if (filter.status) {
    if (Array.isArray(filter.status)) {
      query = query.in('status', filter.status);
    } else {
      query = query.eq('status', filter.status);
    }
  }
  if (filter.grade) {
    if (Array.isArray(filter.grade)) {
      query = query.in('grade', filter.grade);
    } else {
      query = query.eq('grade', filter.grade);
    }
  }

  query = query
    .order('created_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching reviews:', error);
    return { data: [], total: 0 };
  }

  return {
    data: (data || []) as PerformanceReviewWithDetails[],
    total: count || 0,
  };
}

/**
 * جلب تقييم محدد
 */
export async function getReview(
  id: string
): Promise<PerformanceReviewWithDetails | null> {
  const { data, error } = await supabase
    .from('performance_reviews')
    .select(`
      *,
      employee:users!employee_id(id, name, email, avatar_url, job_title),
      reviewer:users!reviewer_id(id, name),
      period:performance_review_periods(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching review:', error);
    return null;
  }

  return data as PerformanceReviewWithDetails;
}

// ============================================
// 🎯 Employee Goals
// ============================================

/**
 * إنشاء هدف جديد
 */
export async function createGoal(
  organizationId: string,
  input: CreateGoalInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const milestones = (input.milestones || []).map((m, index) => ({
    id: `milestone_${index}_${Date.now()}`,
    ...m,
    is_completed: false,
  }));

  const { data, error } = await supabase
    .from('employee_goals')
    .insert({
      employee_id: input.employee_id,
      organization_id: organizationId,
      title: input.title,
      description: input.description,
      category: input.category,
      target_type: input.target_type,
      target_value: input.target_value,
      current_value: 0,
      unit: input.unit,
      milestones,
      start_date: input.start_date,
      due_date: input.due_date,
      priority: input.priority || 'medium',
      weight: input.weight || 10,
      status: 'active',
      achievement_percentage: 0,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating goal:', error);
    return { success: false, error: error.message };
  }

  return { success: true, id: data.id };
}

/**
 * تحديث تقدم الهدف
 */
export async function updateGoalProgress(
  input: UpdateGoalProgressInput,
  updatedBy: string
): Promise<{ success: boolean; error?: string }> {
  // جلب الهدف الحالي
  const { data: goal } = await supabase
    .from('employee_goals')
    .select('*')
    .eq('id', input.goal_id)
    .single();

  if (!goal) {
    return { success: false, error: 'الهدف غير موجود' };
  }

  // حساب نسبة الإنجاز
  let achievementPercentage = 0;
  if (goal.target_type === 'binary') {
    achievementPercentage = input.new_value >= 1 ? 100 : 0;
  } else if (goal.target_value && goal.target_value > 0) {
    achievementPercentage = Math.min(100, (input.new_value / goal.target_value) * 100);
  }

  // تحديد الحالة
  let status: GoalStatus = goal.status;
  if (achievementPercentage >= 100) {
    status = 'achieved';
  } else if (achievementPercentage > 0 && new Date(goal.due_date) < new Date()) {
    status = 'partially';
  } else if (achievementPercentage === 0 && new Date(goal.due_date) < new Date()) {
    status = 'missed';
  }

  // تسجيل التحديث
  await supabase.from('goal_updates').insert({
    goal_id: input.goal_id,
    updated_by: updatedBy,
    previous_value: goal.current_value,
    new_value: input.new_value,
    notes: input.notes,
  });

  // تحديث الهدف
  const { error } = await supabase
    .from('employee_goals')
    .update({
      current_value: input.new_value,
      achievement_percentage: achievementPercentage,
      status,
      completed_at: status === 'achieved' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.goal_id);

  if (error) {
    console.error('Error updating goal progress:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * تحديث حالة الهدف
 */
export async function updateGoalStatus(
  goalId: string,
  status: GoalStatus,
  finalNotes?: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('employee_goals')
    .update({
      status,
      final_notes: finalNotes,
      completed_at: ['achieved', 'partially', 'missed'].includes(status)
        ? new Date().toISOString()
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', goalId);

  if (error) {
    console.error('Error updating goal status:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * جلب أهداف الموظف
 */
export async function getEmployeeGoals(
  employeeId: string,
  filter?: GoalFilter
): Promise<EmployeeGoal[]> {
  let query = supabase
    .from('employee_goals')
    .select('*')
    .eq('employee_id', employeeId);

  if (filter?.status) {
    if (Array.isArray(filter.status)) {
      query = query.in('status', filter.status);
    } else {
      query = query.eq('status', filter.status);
    }
  }
  if (filter?.priority) {
    if (Array.isArray(filter.priority)) {
      query = query.in('priority', filter.priority);
    } else {
      query = query.eq('priority', filter.priority);
    }
  }
  if (filter?.category) {
    query = query.eq('category', filter.category);
  }

  const { data, error } = await query.order('due_date');

  if (error) {
    console.error('Error fetching employee goals:', error);
    return [];
  }

  return data as EmployeeGoal[];
}

/**
 * جلب تحديثات الهدف
 */
export async function getGoalUpdates(goalId: string): Promise<GoalUpdate[]> {
  const { data, error } = await supabase
    .from('goal_updates')
    .select(`
      *,
      updater:users!updated_by(name)
    `)
    .eq('goal_id', goalId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching goal updates:', error);
    return [];
  }

  return data as GoalUpdate[];
}

// ============================================
// 📊 Statistics
// ============================================

/**
 * جلب إحصائيات أداء الموظف
 */
export async function getEmployeePerformanceStats(
  employeeId: string
): Promise<EmployeePerformanceStats> {
  const { data: reviews } = await supabase
    .from('performance_reviews')
    .select('*')
    .eq('employee_id', employeeId)
    .in('status', ['finalized', 'acknowledged'])
    .order('review_period_end', { ascending: false });

  const stats: EmployeePerformanceStats = {
    employee_id: employeeId,
    reviews_count: reviews?.length || 0,
    avg_score: 0,
    latest_grade: undefined,
    improvement_trend: 'stable',
    score_history: [],
    category_scores: [],
  };

  if (reviews && reviews.length > 0) {
    // حساب المتوسط
    const totalScore = reviews.reduce((sum, r) => sum + (r.total_score || 0), 0);
    stats.avg_score = Math.round((totalScore / reviews.length) * 100) / 100;

    // آخر درجة
    stats.latest_grade = reviews[0].grade;

    // سجل الدرجات
    stats.score_history = reviews.map((r) => ({
      period: r.review_period_end,
      score: r.total_score || 0,
      grade: r.grade,
    }));

    // تحديد اتجاه التحسن
    if (reviews.length >= 2) {
      const latest = reviews[0].total_score || 0;
      const previous = reviews[1].total_score || 0;
      if (latest > previous + 0.2) stats.improvement_trend = 'improving';
      else if (latest < previous - 0.2) stats.improvement_trend = 'declining';
    }
  }

  return stats;
}

/**
 * جلب إحصائيات الأهداف للموظف
 */
export async function getEmployeeGoalStats(
  employeeId: string,
  year?: number
): Promise<GoalStats> {
  let query = supabase
    .from('employee_goals')
    .select('*')
    .eq('employee_id', employeeId);

  if (year) {
    query = query.gte('due_date', `${year}-01-01`).lte('due_date', `${year}-12-31`);
  }

  const { data: goals } = await query;

  const stats: GoalStats = {
    total: goals?.length || 0,
    achieved: 0,
    active: 0,
    overdue: 0,
    achievement_rate: 0,
    by_priority: [],
    by_category: [],
  };

  if (goals) {
    const today = new Date();

    goals.forEach((g) => {
      if (g.status === 'achieved') stats.achieved++;
      if (g.status === 'active') stats.active++;
      if (g.status === 'active' && new Date(g.due_date) < today) stats.overdue++;
    });

    stats.achievement_rate =
      stats.total > 0
        ? Math.round((stats.achieved / stats.total) * 100)
        : 0;
  }

  return stats;
}

/**
 * جلب ملخص أداء المنظمة
 */
export async function getOrganizationPerformanceSummary(
  organizationId: string,
  periodId?: string
): Promise<OrganizationPerformanceSummary> {
  let reviewsQuery = supabase
    .from('performance_reviews')
    .select('*')
    .eq('organization_id', organizationId);

  if (periodId) {
    reviewsQuery = reviewsQuery.eq('period_id', periodId);
  }

  const { data: reviews } = await reviewsQuery;
  const { count: totalEmployees } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .eq('role', 'employee');

  const summary: OrganizationPerformanceSummary = {
    organization_id: organizationId,
    total_employees: totalEmployees || 0,
    reviews_completed: 0,
    pending_reviews: 0,
    avg_organization_score: 0,
    grade_distribution: { A: 0, B: 0, C: 0, D: 0, F: 0 },
    top_performers: [],
    needs_improvement: [],
    goal_completion_rate: 0,
  };

  if (reviews) {
    const completed = reviews.filter((r) =>
      ['finalized', 'acknowledged'].includes(r.status)
    );
    const pending = reviews.filter((r) =>
      ['draft', 'submitted'].includes(r.status)
    );

    summary.reviews_completed = completed.length;
    summary.pending_reviews = pending.length;

    // حساب المتوسط وتوزيع الدرجات
    let totalScore = 0;
    completed.forEach((r) => {
      totalScore += r.total_score || 0;
      if (r.grade) {
        summary.grade_distribution[r.grade as ReviewGrade]++;
      }
    });

    summary.avg_organization_score =
      completed.length > 0
        ? Math.round((totalScore / completed.length) * 100) / 100
        : 0;
  }

  return summary;
}
