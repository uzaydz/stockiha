/**
 * ==========================================
 * 💡 خدمة اقتراحات الميزات - API Service
 * ==========================================
 * تتضمن جميع العمليات الخاصة بالاقتراحات والتصويت والتعليقات
 */

import { supabase } from '@/lib/supabase';
import type {
  FeatureSuggestion,
  FeatureSuggestionDetailed,
  CreateSuggestionInput,
  UpdateSuggestionInput,
  CreateCommentInput,
  FeatureComment,
  FeatureVote,
  SuggestionFilters,
  PaginatedSuggestions,
  SuggestionStatsSummary
} from '@/types/feature-suggestions';

/**
 * ==========================================
 * 📝 عمليات الاقتراحات الأساسية
 * ==========================================
 */

/**
 * جلب جميع الاقتراحات مع التصفية والترتيب
 */
export async function fetchSuggestions(
  organizationId: string,
  filters?: SuggestionFilters
): Promise<PaginatedSuggestions> {
  try {
    let query = supabase
      .from('feature_suggestions_detailed')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId);

    // التصفية حسب الفئة
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    // التصفية حسب الحالة
    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status);
      } else {
        query = query.eq('status', filters.status);
      }
    }

    // التصفية حسب الأولوية
    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }

    // التصفية حسب المستخدم
    if (filters?.user_id) {
      query = query.eq('user_id', filters.user_id);
    }

    // البحث النصي
    if (filters?.search) {
      query = query.textSearch('search_vector', filters.search, {
        type: 'websearch',
        config: 'arabic'
      });
    }

    // الترتيب
    const sortBy = filters?.sort_by || 'created_at';
    const sortOrder = filters?.sort_order || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // الصفحات
    const limit = filters?.limit || 20;
    const offset = filters?.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    const totalPages = count ? Math.ceil(count / limit) : 0;
    const currentPage = Math.floor(offset / limit) + 1;

    return {
      data: (data || []) as FeatureSuggestionDetailed[],
      total: count || 0,
      page: currentPage,
      per_page: limit,
      total_pages: totalPages
    };
  } catch (error) {
    console.error('خطأ في جلب الاقتراحات:', error);
    throw error;
  }
}

/**
 * جلب اقتراح واحد بالتفصيل
 */
export async function fetchSuggestionById(
  suggestionId: string
): Promise<FeatureSuggestionDetailed | null> {
  try {
    const { data, error } = await supabase
      .from('feature_suggestions_detailed')
      .select('*')
      .eq('id', suggestionId)
      .single();

    if (error) throw error;
    return data as FeatureSuggestionDetailed;
  } catch (error) {
    console.error('خطأ في جلب الاقتراح:', error);
    return null;
  }
}

/**
 * إنشاء اقتراح جديد
 */
export async function createSuggestion(
  organizationId: string,
  userId: string,
  userName: string,
  input: CreateSuggestionInput
): Promise<FeatureSuggestion> {
  try {
    const { data, error } = await supabase
      .from('feature_suggestions')
      .insert({
        organization_id: organizationId,
        user_id: userId,
        user_name: userName,
        ...input
      })
      .select()
      .single();

    if (error) throw error;
    return data as FeatureSuggestion;
  } catch (error) {
    console.error('خطأ في إنشاء الاقتراح:', error);
    throw error;
  }
}

/**
 * تحديث اقتراح موجود
 */
export async function updateSuggestion(
  suggestionId: string,
  input: UpdateSuggestionInput
): Promise<FeatureSuggestion> {
  try {
    const updateData: any = { ...input };

    // تحديث status_updated_at إذا تم تحديث الحالة
    if (input.status) {
      updateData.status_updated_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('feature_suggestions')
      .update(updateData)
      .eq('id', suggestionId)
      .select()
      .single();

    if (error) throw error;
    return data as FeatureSuggestion;
  } catch (error) {
    console.error('خطأ في تحديث الاقتراح:', error);
    throw error;
  }
}

/**
 * حذف اقتراح
 */
export async function deleteSuggestion(suggestionId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('feature_suggestions')
      .delete()
      .eq('id', suggestionId);

    if (error) throw error;
  } catch (error) {
    console.error('خطأ في حذف الاقتراح:', error);
    throw error;
  }
}

/**
 * ==========================================
 * 🗳️ عمليات التصويت
 * ==========================================
 */

/**
 * التصويت على اقتراح
 */
export async function voteSuggestion(
  suggestionId: string,
  organizationId: string,
  userId: string
): Promise<FeatureVote> {
  try {
    const { data, error } = await supabase
      .from('feature_votes')
      .insert({
        suggestion_id: suggestionId,
        organization_id: organizationId,
        user_id: userId,
        vote_type: 'upvote'
      })
      .select()
      .single();

    if (error) {
      // في حالة التصويت المكرر، نتجاهل الخطأ
      if (error.code === '23505') {
        throw new Error('لقد قمت بالتصويت على هذا الاقتراح مسبقاً');
      }
      throw error;
    }

    return data as FeatureVote;
  } catch (error) {
    console.error('خطأ في التصويت:', error);
    throw error;
  }
}

/**
 * إلغاء التصويت على اقتراح
 */
export async function unvoteSuggestion(
  suggestionId: string,
  userId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('feature_votes')
      .delete()
      .eq('suggestion_id', suggestionId)
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('خطأ في إلغاء التصويت:', error);
    throw error;
  }
}

/**
 * التحقق من تصويت المستخدم
 */
export async function checkUserVote(
  suggestionId: string,
  userId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('feature_votes')
      .select('id')
      .eq('suggestion_id', suggestionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return !!data;
  } catch (error) {
    console.error('خطأ في التحقق من التصويت:', error);
    return false;
  }
}

/**
 * جلب قائمة المصوتين
 */
export async function fetchVoters(suggestionId: string): Promise<FeatureVote[]> {
  try {
    const { data, error } = await supabase
      .from('feature_votes')
      .select('*')
      .eq('suggestion_id', suggestionId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as FeatureVote[];
  } catch (error) {
    console.error('خطأ في جلب المصوتين:', error);
    return [];
  }
}

/**
 * ==========================================
 * 💬 عمليات التعليقات
 * ==========================================
 */

/**
 * جلب تعليقات اقتراح
 */
export async function fetchComments(suggestionId: string): Promise<FeatureComment[]> {
  try {
    const { data, error } = await supabase
      .from('feature_comments')
      .select('*')
      .eq('suggestion_id', suggestionId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const comments = (data || []) as FeatureComment[];

    // تنظيم التعليقات والردود
    const rootComments = comments.filter(c => !c.parent_comment_id);
    const repliesMap = new Map<string, FeatureComment[]>();

    comments.forEach(comment => {
      if (comment.parent_comment_id) {
        const replies = repliesMap.get(comment.parent_comment_id) || [];
        replies.push(comment);
        repliesMap.set(comment.parent_comment_id, replies);
      }
    });

    rootComments.forEach(comment => {
      comment.replies = repliesMap.get(comment.id) || [];
    });

    return rootComments;
  } catch (error) {
    console.error('خطأ في جلب التعليقات:', error);
    return [];
  }
}

/**
 * إضافة تعليق
 */
export async function createComment(
  organizationId: string,
  userId: string,
  userName: string,
  input: CreateCommentInput
): Promise<FeatureComment> {
  try {
    const { data, error } = await supabase
      .from('feature_comments')
      .insert({
        organization_id: organizationId,
        user_id: userId,
        user_name: userName,
        ...input
      })
      .select()
      .single();

    if (error) throw error;
    return data as FeatureComment;
  } catch (error) {
    console.error('خطأ في إضافة التعليق:', error);
    throw error;
  }
}

/**
 * تحديث تعليق
 */
export async function updateComment(
  commentId: string,
  comment: string
): Promise<FeatureComment> {
  try {
    const { data, error } = await supabase
      .from('feature_comments')
      .update({
        comment,
        is_edited: true,
        edited_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .select()
      .single();

    if (error) throw error;
    return data as FeatureComment;
  } catch (error) {
    console.error('خطأ في تحديث التعليق:', error);
    throw error;
  }
}

/**
 * حذف تعليق
 */
export async function deleteComment(commentId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('feature_comments')
      .delete()
      .eq('id', commentId);

    if (error) throw error;
  } catch (error) {
    console.error('خطأ في حذف التعليق:', error);
    throw error;
  }
}

/**
 * ==========================================
 * 📊 الإحصائيات والملخصات
 * ==========================================
 */

/**
 * جلب ملخص الإحصائيات
 */
export async function fetchStatsSummary(
  organizationId: string
): Promise<SuggestionStatsSummary> {
  try {
    // جلب جميع الاقتراحات
    const { data: suggestions, error } = await supabase
      .from('feature_suggestions')
      .select('*')
      .eq('organization_id', organizationId);

    if (error) throw error;

    const allSuggestions = suggestions || [];

    // حساب الإحصائيات
    const stats: SuggestionStatsSummary = {
      total: allSuggestions.length,
      pending: allSuggestions.filter(s => s.status === 'pending').length,
      under_review: allSuggestions.filter(s => s.status === 'under_review').length,
      planned: allSuggestions.filter(s => s.status === 'planned').length,
      in_progress: allSuggestions.filter(s => s.status === 'in_progress').length,
      completed: allSuggestions.filter(s => s.status === 'completed').length,
      rejected: allSuggestions.filter(s => s.status === 'rejected').length,
      total_votes: allSuggestions.reduce((sum, s) => sum + s.votes_count, 0),
      total_comments: allSuggestions.reduce((sum, s) => sum + s.comments_count, 0),
      top_category: null,
      trending: []
    };

    // حساب الفئة الأكثر شيوعاً
    if (allSuggestions.length > 0) {
      const categoryCounts = allSuggestions.reduce((acc, s) => {
        acc[s.category] = (acc[s.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      stats.top_category = Object.entries(categoryCounts)
        .sort(([, a], [, b]) => b - a)[0][0] as any;
    }

    // جلب الاقتراحات الشائعة (أكثر 5 تصويتاً)
    const { data: trending } = await supabase
      .from('feature_suggestions_detailed')
      .select('*')
      .eq('organization_id', organizationId)
      .in('status', ['pending', 'under_review', 'planned', 'in_progress'])
      .order('votes_count', { ascending: false })
      .limit(5);

    stats.trending = (trending || []) as FeatureSuggestionDetailed[];

    return stats;
  } catch (error) {
    console.error('خطأ في جلب الإحصائيات:', error);
    throw error;
  }
}

/**
 * ==========================================
 * 🔔 إشعارات الوقت الفعلي (Realtime)
 * ==========================================
 */

/**
 * الاشتراك في تحديثات الاقتراحات
 */
export function subscribeToSuggestions(
  organizationId: string,
  callback: (payload: any) => void
) {
  return supabase
    .channel(`suggestions:${organizationId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'feature_suggestions',
        filter: `organization_id=eq.${organizationId}`
      },
      callback
    )
    .subscribe();
}

/**
 * الاشتراك في تحديثات التصويت
 */
export function subscribeToVotes(
  suggestionId: string,
  callback: (payload: any) => void
) {
  return supabase
    .channel(`votes:${suggestionId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'feature_votes',
        filter: `suggestion_id=eq.${suggestionId}`
      },
      callback
    )
    .subscribe();
}

/**
 * الاشتراك في تحديثات التعليقات
 */
export function subscribeToComments(
  suggestionId: string,
  callback: (payload: any) => void
) {
  return supabase
    .channel(`comments:${suggestionId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'feature_comments',
        filter: `suggestion_id=eq.${suggestionId}`
      },
      callback
    )
    .subscribe();
}
