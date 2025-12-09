// =====================================================
// خدمة الإحالة الرئيسية - Referral Service
// =====================================================

import { supabase } from '@/lib/supabase-unified';
import type {
  ReferralDashboard,
  ReferralCode,
  Referral,
  ReferralNotification,
  RedemptionResult,
  TierUpdateResult,
  AdContent,
  ShippingAddress,
} from '@/types/referral';

/**
 * خدمة الإحالة الرئيسية
 * تتعامل مع جميع عمليات الإحالة للمستخدمين
 */
export class ReferralService {
  /**
   * إنشاء كود إحالة جديد للمؤسسة
   */
  static async createReferralCode(orgId: string): Promise<{ code: string } | null> {
    const { data, error } = await supabase.rpc('create_referral_code', {
      p_org_id: orgId,
    });

    if (error) {
      console.error('Error creating referral code:', error);
      return null;
    }

    return data;
  }

  /**
   * تسجيل إحالة جديدة (عند استخدام كود إحالة)
   */
  static async registerReferral(
    referralCode: string,
    referredOrgId: string
  ): Promise<{ success: boolean; error?: string; discount_applied?: boolean }> {
    const { data, error } = await supabase.rpc('register_referral', {
      p_referral_code: referralCode,
      p_referred_org_id: referredOrgId,
    });

    if (error) {
      console.error('Error registering referral:', error);
      return { success: false, error: error.message };
    }

    return data;
  }

  /**
   * منح النقاط عند الاشتراك أو التجديد
   * يُستدعى من نظام الاشتراكات
   */
  static async awardReferralPoints(
    referredOrgId: string,
    subscriptionType: 'monthly' | 'yearly',
    planId: string,
    isRenewal: boolean = false
  ): Promise<{ success: boolean; points_awarded?: number }> {
    const { data, error } = await supabase.rpc('award_referral_points', {
      p_referred_org_id: referredOrgId,
      p_subscription_type: subscriptionType,
      p_plan_id: planId,
      p_is_renewal: isRenewal,
    });

    if (error) {
      console.error('Error awarding referral points:', error);
      return { success: false };
    }

    return data;
  }

  /**
   * جلب لوحة تحكم الإحالة الكاملة
   */
  static async getDashboard(orgId: string): Promise<ReferralDashboard | null> {
    const { data, error } = await supabase.rpc('get_referral_dashboard', {
      p_org_id: orgId,
    });

    if (error) {
      console.error('Error fetching referral dashboard:', error);
      return null;
    }

    return data;
  }

  /**
   * استبدال النقاط بمكافأة
   */
  static async redeemPoints(
    orgId: string,
    rewardId: string,
    adContent?: AdContent,
    shippingAddress?: ShippingAddress
  ): Promise<RedemptionResult> {
    const { data, error } = await supabase.rpc('redeem_referral_points', {
      p_org_id: orgId,
      p_reward_id: rewardId,
      p_ad_content: adContent || null,
      p_shipping_address: shippingAddress || null,
    });

    if (error) {
      console.error('Error redeeming points:', error);
      return { success: false, error: error.message };
    }

    return data;
  }

  /**
   * جلب كود الإحالة للمؤسسة
   */
  static async getReferralCode(orgId: string): Promise<ReferralCode | null> {
    const { data, error } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('organization_id', orgId)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') {
        console.error('Error fetching referral code:', error);
      }
      return null;
    }

    return data;
  }

  /**
   * جلب قائمة الإحالات للمؤسسة
   */
  static async getReferrals(orgId: string): Promise<Referral[]> {
    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_org_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching referrals:', error);
      return [];
    }

    return data || [];
  }

  /**
   * جلب الإشعارات
   */
  static async getNotifications(
    orgId: string,
    limit: number = 20,
    unreadOnly: boolean = false
  ): Promise<{ notifications: ReferralNotification[]; unread_count: number }> {
    const { data, error } = await supabase.rpc('get_referral_notifications', {
      p_org_id: orgId,
      p_limit: limit,
      p_unread_only: unreadOnly,
    });

    if (error) {
      console.error('Error fetching notifications:', error);
      return { notifications: [], unread_count: 0 };
    }

    return data;
  }

  /**
   * تحديث حالة قراءة الإشعار
   */
  static async markNotificationRead(
    notificationId: string,
    orgId: string
  ): Promise<boolean> {
    const { data, error } = await supabase.rpc('mark_referral_notification_read', {
      p_notification_id: notificationId,
      p_org_id: orgId,
    });

    if (error) {
      console.error('Error marking notification read:', error);
      return false;
    }

    return data;
  }

  /**
   * تحديث المستوى تلقائياً
   */
  static async updateTier(orgId: string): Promise<TierUpdateResult | null> {
    const { data, error } = await supabase.rpc('update_referral_tier', {
      p_org_id: orgId,
    });

    if (error) {
      console.error('Error updating tier:', error);
      return null;
    }

    return data;
  }

  /**
   * إنشاء رابط الإحالة الكامل
   */
  static generateReferralLink(code: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/register?ref=${code}`;
  }

  /**
   * استخراج كود الإحالة من URL
   */
  static extractReferralCode(): string | null {
    const params = new URLSearchParams(window.location.search);
    return params.get('ref');
  }

  /**
   * حفظ كود الإحالة في localStorage
   */
  static saveReferralCode(code: string): void {
    localStorage.setItem('referral_code', code);
  }

  /**
   * جلب كود الإحالة المحفوظ
   */
  static getSavedReferralCode(): string | null {
    return localStorage.getItem('referral_code');
  }

  /**
   * مسح كود الإحالة المحفوظ
   */
  static clearSavedReferralCode(): void {
    localStorage.removeItem('referral_code');
  }

  /**
   * تسجيل نقرة على كود الإحالة
   */
  static async trackClick(code: string): Promise<void> {
    // تحديث عدد النقرات
    await supabase
      .from('referral_codes')
      .update({ total_clicks: supabase.rpc('increment', { x: 1 }) })
      .eq('code', code);
  }
}

export default ReferralService;
