// =====================================================
// خدمة نقاط الإحالة - Referral Points Service
// =====================================================

import { supabase } from '@/lib/supabase-unified';
import type {
  ReferralPoints,
  ReferralPointsTransaction,
  ReferralTier,
  TransactionType,
} from '@/types/referral';

/**
 * خدمة إدارة نقاط الإحالة
 */
export class ReferralPointsService {
  /**
   * جلب رصيد النقاط للمؤسسة
   */
  static async getPoints(orgId: string): Promise<ReferralPoints | null> {
    const { data, error } = await supabase
      .from('referral_points')
      .select(`
        *,
        current_tier:referral_tiers(*)
      `)
      .eq('organization_id', orgId)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') {
        console.error('Error fetching points:', error);
      }
      return null;
    }

    return data;
  }

  /**
   * جلب سجل المعاملات
   */
  static async getTransactions(
    orgId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ReferralPointsTransaction[]> {
    const { data, error } = await supabase
      .from('referral_points_transactions')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }

    return data || [];
  }

  /**
   * جلب المعاملات حسب النوع
   */
  static async getTransactionsByType(
    orgId: string,
    type: TransactionType,
    limit: number = 20
  ): Promise<ReferralPointsTransaction[]> {
    const { data, error } = await supabase
      .from('referral_points_transactions')
      .select('*')
      .eq('organization_id', orgId)
      .eq('transaction_type', type)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching transactions by type:', error);
      return [];
    }

    return data || [];
  }

  /**
   * جلب جميع المستويات
   */
  static async getTiers(): Promise<ReferralTier[]> {
    const { data, error } = await supabase
      .from('referral_tiers')
      .select('*')
      .order('level', { ascending: true });

    if (error) {
      console.error('Error fetching tiers:', error);
      return [];
    }

    return data || [];
  }

  /**
   * جلب مستوى معين
   */
  static async getTier(tierId: string): Promise<ReferralTier | null> {
    const { data, error } = await supabase
      .from('referral_tiers')
      .select('*')
      .eq('id', tierId)
      .single();

    if (error) {
      console.error('Error fetching tier:', error);
      return null;
    }

    return data;
  }

  /**
   * جلب المستوى التالي
   */
  static async getNextTier(currentLevel: number): Promise<ReferralTier | null> {
    const { data, error } = await supabase
      .from('referral_tiers')
      .select('*')
      .eq('level', currentLevel + 1)
      .single();

    if (error) {
      // لا يوجد مستوى تالي (المستوى الأقصى)
      return null;
    }

    return data;
  }

  /**
   * حساب النقاط المطلوبة للمستوى التالي
   */
  static calculatePointsToNextTier(
    currentPoints: number,
    nextTierMinPoints: number
  ): number {
    return Math.max(0, nextTierMinPoints - currentPoints);
  }

  /**
   * حساب نسبة التقدم للمستوى التالي
   */
  static calculateProgress(
    currentPoints: number,
    currentTierMinPoints: number,
    nextTierMinPoints: number | null
  ): number {
    if (!nextTierMinPoints) return 100; // المستوى الأقصى

    const pointsInCurrentTier = currentPoints - currentTierMinPoints;
    const pointsNeededForNextTier = nextTierMinPoints - currentTierMinPoints;

    return Math.min(100, (pointsInCurrentTier / pointsNeededForNextTier) * 100);
  }

  /**
   * تنسيق عرض النقاط
   */
  static formatPoints(points: number): string {
    return new Intl.NumberFormat('ar-DZ').format(points);
  }

  /**
   * حساب النقاط المكتسبة مع المكافأة
   */
  static calculatePointsWithBonus(
    basePoints: number,
    bonusPercentage: number
  ): { base: number; bonus: number; total: number } {
    const bonus = Math.round((basePoints * bonusPercentage) / 100);
    return {
      base: basePoints,
      bonus,
      total: basePoints + bonus,
    };
  }

  /**
   * جلب إحصائيات النقاط
   */
  static async getPointsStats(orgId: string): Promise<{
    total_earned: number;
    total_spent: number;
    this_month_earned: number;
    this_month_spent: number;
  }> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('referral_points_transactions')
      .select('points, transaction_type, created_at')
      .eq('organization_id', orgId);

    if (error || !data) {
      console.error('Error fetching points stats:', error);
      return {
        total_earned: 0,
        total_spent: 0,
        this_month_earned: 0,
        this_month_spent: 0,
      };
    }

    const stats = data.reduce(
      (acc, tx) => {
        const isThisMonth = new Date(tx.created_at) >= startOfMonth;

        if (tx.points > 0) {
          acc.total_earned += tx.points;
          if (isThisMonth) acc.this_month_earned += tx.points;
        } else {
          acc.total_spent += Math.abs(tx.points);
          if (isThisMonth) acc.this_month_spent += Math.abs(tx.points);
        }

        return acc;
      },
      { total_earned: 0, total_spent: 0, this_month_earned: 0, this_month_spent: 0 }
    );

    return stats;
  }
}

export default ReferralPointsService;
