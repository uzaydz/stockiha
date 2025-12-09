// =====================================================
// خدمة إدارة الإحالات للـ Super Admin
// =====================================================

import { supabase } from '@/lib/supabase-unified';
import type {
  AdminReferralStats,
  AdminReferrer,
  AdminRedemption,
  AdminTransaction,
  ReferrersFilter,
  RedemptionsFilter,
  TransactionsFilter,
  UpdateRewardData,
  UpdateTierData,
  PaginatedResponse,
} from '@/types/referral';

/**
 * خدمة إدارة الإحالات للـ Super Admin
 */
export class ReferralAdminService {
  /**
   * جلب إحصائيات النظام الشاملة
   */
  static async getStats(): Promise<AdminReferralStats | null> {
    const { data, error } = await supabase.rpc('admin_get_referral_stats');

    if (error) {
      console.error('Error fetching admin stats:', error);
      return null;
    }

    return data;
  }

  /**
   * جلب قائمة المُحيلين
   */
  static async listReferrers(
    filters: ReferrersFilter = {}
  ): Promise<PaginatedResponse<AdminReferrer>> {
    const { data, error } = await supabase.rpc('admin_list_referrers', {
      p_tier_level: filters.tier_level || null,
      p_min_points: filters.min_points || null,
      p_max_points: filters.max_points || null,
      p_is_active: filters.is_active ?? null,
      p_search: filters.search || null,
      p_limit: filters.limit || 50,
      p_offset: filters.offset || 0,
    });

    if (error) {
      console.error('Error fetching referrers:', error);
      return { data: [], total: 0, limit: 50, offset: 0 };
    }

    return {
      data: data.referrers || [],
      total: data.total || 0,
      limit: data.limit || 50,
      offset: data.offset || 0,
    };
  }

  /**
   * تعديل نقاط مؤسسة يدوياً
   */
  static async adjustPoints(
    orgId: string,
    points: number,
    reason: string
  ): Promise<{ success: boolean; error?: string; old_balance?: number; new_balance?: number }> {
    const { data, error } = await supabase.rpc('admin_adjust_points', {
      p_org_id: orgId,
      p_points: points,
      p_reason: reason,
    });

    if (error) {
      console.error('Error adjusting points:', error);
      return { success: false, error: error.message };
    }

    return data;
  }

  /**
   * جلب قائمة طلبات الاستبدال
   */
  static async listRedemptions(
    filters: RedemptionsFilter = {}
  ): Promise<PaginatedResponse<AdminRedemption>> {
    const { data, error } = await supabase.rpc('admin_list_redemptions', {
      p_status: filters.status || null,
      p_reward_type: filters.reward_type || null,
      p_search: filters.search || null,
      p_limit: filters.limit || 50,
      p_offset: filters.offset || 0,
    });

    if (error) {
      console.error('Error fetching redemptions:', error);
      return { data: [], total: 0, limit: 50, offset: 0 };
    }

    return {
      data: data.redemptions || [],
      total: data.total || 0,
      limit: data.limit || 50,
      offset: data.offset || 0,
    };
  }

  /**
   * الموافقة على طلب استبدال
   */
  static async approveRedemption(
    redemptionId: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await supabase.rpc('admin_approve_redemption', {
      p_redemption_id: redemptionId,
      p_notes: notes || null,
    });

    if (error) {
      console.error('Error approving redemption:', error);
      return { success: false, error: error.message };
    }

    return data;
  }

  /**
   * رفض طلب استبدال
   */
  static async rejectRedemption(
    redemptionId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string; points_refunded?: number }> {
    const { data, error } = await supabase.rpc('admin_reject_redemption', {
      p_redemption_id: redemptionId,
      p_reason: reason,
    });

    if (error) {
      console.error('Error rejecting redemption:', error);
      return { success: false, error: error.message };
    }

    return data;
  }

  /**
   * إكمال تنفيذ طلب
   */
  static async completeRedemption(
    redemptionId: string,
    details?: Record<string, unknown>
  ): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await supabase.rpc('admin_complete_redemption', {
      p_redemption_id: redemptionId,
      p_details: details || {},
    });

    if (error) {
      console.error('Error completing redemption:', error);
      return { success: false, error: error.message };
    }

    return data;
  }

  /**
   * تحديث مكافأة
   */
  static async updateReward(
    rewardId: string,
    data: UpdateRewardData
  ): Promise<{ success: boolean; error?: string }> {
    const { data: result, error } = await supabase.rpc('admin_update_reward', {
      p_reward_id: rewardId,
      p_data: data,
    });

    if (error) {
      console.error('Error updating reward:', error);
      return { success: false, error: error.message };
    }

    return result;
  }

  /**
   * إضافة مكافأة جديدة
   */
  static async createReward(
    data: UpdateRewardData
  ): Promise<{ success: boolean; error?: string; reward_id?: string }> {
    const { data: result, error } = await supabase.rpc('admin_create_reward', {
      p_data: data,
    });

    if (error) {
      console.error('Error creating reward:', error);
      return { success: false, error: error.message };
    }

    return result;
  }

  /**
   * تحديث مستوى
   */
  static async updateTier(
    tierId: string,
    data: UpdateTierData
  ): Promise<{ success: boolean; error?: string }> {
    const { data: result, error } = await supabase.rpc('admin_update_tier', {
      p_tier_id: tierId,
      p_data: data,
    });

    if (error) {
      console.error('Error updating tier:', error);
      return { success: false, error: error.message };
    }

    return result;
  }

  /**
   * جلب قائمة المعاملات
   */
  static async listTransactions(
    filters: TransactionsFilter = {}
  ): Promise<PaginatedResponse<AdminTransaction>> {
    const { data, error } = await supabase.rpc('admin_list_transactions', {
      p_org_id: filters.org_id || null,
      p_type: filters.type || null,
      p_start_date: filters.start_date || null,
      p_end_date: filters.end_date || null,
      p_limit: filters.limit || 100,
      p_offset: filters.offset || 0,
    });

    if (error) {
      console.error('Error fetching transactions:', error);
      return { data: [], total: 0, limit: 100, offset: 0 };
    }

    return {
      data: data.transactions || [],
      total: data.total || 0,
      limit: data.limit || 100,
      offset: data.offset || 0,
    };
  }

  /**
   * تعطيل/تفعيل كود إحالة
   */
  static async toggleReferralCode(
    orgId: string,
    isActive: boolean
  ): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await supabase.rpc('admin_toggle_referral_code', {
      p_org_id: orgId,
      p_is_active: isActive,
    });

    if (error) {
      console.error('Error toggling referral code:', error);
      return { success: false, error: error.message };
    }

    return data;
  }

  /**
   * تغيير مستوى مؤسسة يدوياً
   */
  static async setTier(
    orgId: string,
    tierLevel: number,
    reason: string
  ): Promise<{ success: boolean; error?: string; new_tier?: string }> {
    const { data, error } = await supabase.rpc('admin_set_tier', {
      p_org_id: orgId,
      p_tier_level: tierLevel,
      p_reason: reason,
    });

    if (error) {
      console.error('Error setting tier:', error);
      return { success: false, error: error.message };
    }

    return data;
  }

  /**
   * تصدير المعاملات (يُرجع البيانات للتصدير)
   */
  static async exportTransactions(
    filters: TransactionsFilter = {}
  ): Promise<AdminTransaction[]> {
    // جلب جميع المعاملات بدون حد
    const result = await this.listTransactions({
      ...filters,
      limit: 10000,
      offset: 0,
    });

    return result.data;
  }

  /**
   * جلب إحصائيات سريعة للوحة التحكم
   */
  static async getQuickStats(): Promise<{
    pending_redemptions: number;
    new_referrals_today: number;
    total_active_referrers: number;
  }> {
    // طلبات الاستبدال المعلقة
    const { count: pendingCount } = await supabase
      .from('referral_redemptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // الإحالات الجديدة اليوم
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: newToday } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    // المُحيلين النشطين
    const { count: activeReferrers } = await supabase
      .from('referral_codes')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    return {
      pending_redemptions: pendingCount || 0,
      new_referrals_today: newToday || 0,
      total_active_referrers: activeReferrers || 0,
    };
  }
}

export default ReferralAdminService;
