/**
 * ==========================================
 * 💡 نظام اقتراح الميزات - Types
 * ==========================================
 */

export type SuggestionCategory = 'pos' | 'inventory' | 'analytics' | 'customers' | 'products' | 'settings' | 'other';

export type SuggestionPriority = 'low' | 'medium' | 'high' | 'urgent';

export type SuggestionStatus =
  | 'pending'           // قيد الانتظار
  | 'under_review'      // قيد المراجعة
  | 'planned'           // مخطط لها
  | 'in_progress'       // قيد التنفيذ
  | 'completed'         // مكتملة
  | 'rejected'          // مرفوضة
  | 'duplicate';        // مكررة

export type VoteType = 'upvote';

/**
 * ==========================================
 * 📝 واجهة الاقتراح الأساسية
 * ==========================================
 */
export interface FeatureSuggestion {
  id: string;
  organization_id: string;
  user_id: string;
  user_name: string;
  user_email?: string;

  // معلومات الاقتراح
  title: string;
  description: string;
  category: SuggestionCategory;
  priority: SuggestionPriority;

  // الحالة
  status: SuggestionStatus;
  status_updated_at?: string;
  status_updated_by?: string;
  admin_response?: string;

  // الإحصائيات
  votes_count: number;
  comments_count: number;

  // التوقيتات
  created_at: string;
  updated_at: string;

  // اختياري
  image_url?: string;
  public_id?: string;
}

/**
 * ==========================================
 * 📝 واجهة الاقتراح المفصّلة (مع بيانات إضافية)
 * ==========================================
 */
export interface FeatureSuggestionDetailed extends FeatureSuggestion {
  user_full_name?: string;
  user_has_voted?: boolean;
  status_order?: number;
}

/**
 * ==========================================
 * 🗳️ واجهة التصويت
 * ==========================================
 */
export interface FeatureVote {
  id: string;
  suggestion_id: string;
  organization_id: string;
  user_id: string;
  vote_type: VoteType;
  created_at: string;
}

/**
 * ==========================================
 * 💬 واجهة التعليق
 * ==========================================
 */
export interface FeatureComment {
  id: string;
  suggestion_id: string;
  organization_id: string;
  user_id: string;
  user_name: string;
  comment: string;
  parent_comment_id?: string;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
  edited_at?: string;

  // بيانات محلية (لا تُخزّن في قاعدة البيانات)
  replies?: FeatureComment[];
}

/**
 * ==========================================
 * 📊 واجهة الإحصائيات
 * ==========================================
 */
export interface FeatureSuggestionStats {
  id: string;
  organization_id: string;
  date: string;
  total_suggestions: number;
  pending_suggestions: number;
  completed_suggestions: number;
  rejected_suggestions: number;
  total_votes: number;
  total_comments: number;
  active_users: number;
  created_at: string;
}

/**
 * ==========================================
 * 📝 نموذج إنشاء اقتراح جديد
 * ==========================================
 */
export interface CreateSuggestionInput {
  title: string;
  description: string;
  category: SuggestionCategory;
  priority?: SuggestionPriority;
  image_url?: string;
}

/**
 * ==========================================
 * ✏️ نموذج تحديث اقتراح
 * ==========================================
 */
export interface UpdateSuggestionInput {
  title?: string;
  description?: string;
  category?: SuggestionCategory;
  priority?: SuggestionPriority;
  status?: SuggestionStatus;
  admin_response?: string;
  image_url?: string;
}

/**
 * ==========================================
 * 💬 نموذج إنشاء تعليق
 * ==========================================
 */
export interface CreateCommentInput {
  suggestion_id: string;
  comment: string;
  parent_comment_id?: string;
}

/**
 * ==========================================
 * 🔍 معايير البحث والتصفية
 * ==========================================
 */
export interface SuggestionFilters {
  category?: SuggestionCategory;
  status?: SuggestionStatus | SuggestionStatus[];
  priority?: SuggestionPriority;
  user_id?: string;
  search?: string;
  sort_by?: 'created_at' | 'votes_count' | 'comments_count' | 'updated_at';
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * ==========================================
 * 📄 نتيجة الصفحات
 * ==========================================
 */
export interface PaginatedSuggestions {
  data: FeatureSuggestionDetailed[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

/**
 * ==========================================
 * 🎨 تكوين عرض الفئات
 * ==========================================
 */
export interface CategoryConfig {
  id: SuggestionCategory;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  description: string;
}

/**
 * ==========================================
 * 🎨 تكوين عرض الحالات
 * ==========================================
 */
export interface StatusConfig {
  id: SuggestionStatus;
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  description: string;
}

/**
 * ==========================================
 * 🎨 تكوين عرض الأولويات
 * ==========================================
 */
export interface PriorityConfig {
  id: SuggestionPriority;
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}

/**
 * ==========================================
 * 📊 ملخص الإحصائيات
 * ==========================================
 */
export interface SuggestionStatsSummary {
  total: number;
  pending: number;
  under_review: number;
  planned: number;
  in_progress: number;
  completed: number;
  rejected: number;
  total_votes: number;
  total_comments: number;
  top_category: SuggestionCategory | null;
  trending: FeatureSuggestionDetailed[];
}
