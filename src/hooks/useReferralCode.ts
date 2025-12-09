// =====================================================
// Hook إدارة كود الإحالة
// =====================================================

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ReferralService } from '@/lib/referral';
import type { ReferralCode } from '@/types/referral';
import { useTenant } from '@/context/tenant';
import { useToast } from '@/hooks/use-toast';

const QUERY_KEY = 'referral-code';

export function useReferralCode() {
  const { organization } = useTenant();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const orgId = organization?.id;

  // جلب الكود الحالي
  const {
    data: referralCode,
    isLoading,
    error,
  } = useQuery<ReferralCode | null>({
    queryKey: [QUERY_KEY, orgId],
    queryFn: async () => {
      if (!orgId) return null;
      return ReferralService.getReferralCode(orgId);
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 10, // 10 دقائق
  });

  // إنشاء كود جديد
  const createCodeMutation = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error('No organization ID');
      return ReferralService.createReferralCode(orgId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, orgId] });
      queryClient.invalidateQueries({ queryKey: ['referral-dashboard', orgId] });
      toast({
        title: 'تم إنشاء كود الإحالة',
        description: 'يمكنك الآن مشاركة الكود مع أصدقائك',
      });
    },
    onError: (error) => {
      toast({
        title: 'خطأ',
        description: 'فشل في إنشاء كود الإحالة',
        variant: 'destructive',
      });
      console.error('Error creating referral code:', error);
    },
  });

  // إنشاء رابط الإحالة
  const referralLink = referralCode?.code
    ? ReferralService.generateReferralLink(referralCode.code)
    : null;

  // نسخ الكود
  const copyCode = useCallback(async () => {
    if (!referralCode?.code) return false;
    try {
      await navigator.clipboard.writeText(referralCode.code);
      toast({
        title: 'تم النسخ',
        description: 'تم نسخ كود الإحالة',
      });
      return true;
    } catch {
      toast({
        title: 'خطأ',
        description: 'فشل في نسخ الكود',
        variant: 'destructive',
      });
      return false;
    }
  }, [referralCode?.code, toast]);

  // نسخ الرابط
  const copyLink = useCallback(async () => {
    if (!referralLink) return false;
    try {
      await navigator.clipboard.writeText(referralLink);
      toast({
        title: 'تم النسخ',
        description: 'تم نسخ رابط الإحالة',
      });
      return true;
    } catch {
      toast({
        title: 'خطأ',
        description: 'فشل في نسخ الرابط',
        variant: 'destructive',
      });
      return false;
    }
  }, [referralLink, toast]);

  // مشاركة عبر واتساب
  const shareViaWhatsApp = useCallback(() => {
    if (!referralLink) return;
    const text = encodeURIComponent(
      `جرب تطبيق سطوكيها لإدارة محلك التجاري! استخدم رابطي للحصول على خصم 20% على أول اشتراك: ${referralLink}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }, [referralLink]);

  // مشاركة عبر فيسبوك
  const shareViaFacebook = useCallback(() => {
    if (!referralLink) return;
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`,
      '_blank'
    );
  }, [referralLink]);

  return {
    // البيانات
    code: referralCode?.code || null,
    referralCode,
    referralLink,

    // الحالة
    isLoading,
    error,
    isActive: referralCode?.is_active ?? false,
    isCreating: createCodeMutation.isPending,

    // الإحصائيات
    totalClicks: referralCode?.total_clicks || 0,
    totalSignups: referralCode?.total_signups || 0,
    totalSubscriptions: referralCode?.total_subscriptions || 0,

    // الإجراءات
    createCode: createCodeMutation.mutate,
    copyCode,
    copyLink,
    shareViaWhatsApp,
    shareViaFacebook,

    // معلومات مشتقة
    hasCode: !!referralCode?.code,
    conversionRate:
      referralCode?.total_clicks && referralCode?.total_subscriptions
        ? Math.round((referralCode.total_subscriptions / referralCode.total_clicks) * 100)
        : 0,
  };
}

export default useReferralCode;
