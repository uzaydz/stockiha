// =====================================================
// Hook عملية استبدال النقاط
// =====================================================

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ReferralService } from '@/lib/referral';
import type {
  ReferralReward,
  AdContent,
  ShippingAddress,
  RedemptionResult,
} from '@/types/referral';
import { useTenant } from '@/context/tenant';
import { useToast } from '@/hooks/use-toast';

export function useReferralRedemption() {
  const { organization } = useTenant();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const orgId = organization?.id;

  // حالة النموذج
  const [selectedReward, setSelectedReward] = useState<ReferralReward | null>(null);
  const [adContent, setAdContent] = useState<AdContent>({});
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    name: '',
    phone: '',
    wilaya: '',
    commune: '',
    address: '',
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // تحديد ما إذا كان النموذج مكتمل
  const isFormValid = useCallback(() => {
    if (!selectedReward) return false;

    if (selectedReward.reward_type === 'advertising') {
      return !!(adContent.title && adContent.description);
    }

    if (selectedReward.reward_type === 'physical_item') {
      return !!(
        shippingAddress.name &&
        shippingAddress.phone &&
        shippingAddress.wilaya &&
        shippingAddress.commune &&
        shippingAddress.address
      );
    }

    return true;
  }, [selectedReward, adContent, shippingAddress]);

  // عملية الاستبدال
  const redemptionMutation = useMutation<
    RedemptionResult,
    Error,
    { rewardId: string; adContent?: AdContent; shippingAddress?: ShippingAddress }
  >({
    mutationFn: async ({ rewardId, adContent, shippingAddress }) => {
      if (!orgId) throw new Error('No organization ID');
      return ReferralService.redeemPoints(orgId, rewardId, adContent, shippingAddress);
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: 'تم تقديم الطلب بنجاح',
          description: `تم خصم ${result.points_spent} نقطة. رصيدك الجديد: ${result.new_balance} نقطة`,
        });

        // تحديث البيانات
        queryClient.invalidateQueries({ queryKey: ['referral-points', orgId] });
        queryClient.invalidateQueries({ queryKey: ['referral-redemptions', orgId] });
        queryClient.invalidateQueries({ queryKey: ['referral-dashboard', orgId] });

        // إغلاق الحوار وإعادة تعيين النموذج
        handleClose();
      } else {
        toast({
          title: 'فشل الطلب',
          description: result.error || 'حدث خطأ أثناء تقديم الطلب',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'خطأ',
        description: error.message || 'حدث خطأ غير متوقع',
        variant: 'destructive',
      });
    },
  });

  // فتح حوار الاستبدال
  const openRedemptionDialog = useCallback((reward: ReferralReward) => {
    setSelectedReward(reward);
    setAdContent({});
    setShippingAddress({
      name: '',
      phone: '',
      wilaya: '',
      commune: '',
      address: '',
    });
    setIsDialogOpen(true);
  }, []);

  // إغلاق الحوار
  const handleClose = useCallback(() => {
    setIsDialogOpen(false);
    setSelectedReward(null);
    setAdContent({});
    setShippingAddress({
      name: '',
      phone: '',
      wilaya: '',
      commune: '',
      address: '',
    });
  }, []);

  // تقديم الطلب
  const submitRedemption = useCallback(() => {
    if (!selectedReward || !isFormValid()) return;

    redemptionMutation.mutate({
      rewardId: selectedReward.id,
      adContent: selectedReward.reward_type === 'advertising' ? adContent : undefined,
      shippingAddress:
        selectedReward.reward_type === 'physical_item' ? shippingAddress : undefined,
    });
  }, [selectedReward, adContent, shippingAddress, isFormValid, redemptionMutation]);

  return {
    // حالة النموذج
    selectedReward,
    adContent,
    shippingAddress,
    isDialogOpen,

    // تحديث الحالة
    setAdContent,
    setShippingAddress,

    // الإجراءات
    openRedemptionDialog,
    handleClose,
    submitRedemption,

    // حالة العملية
    isSubmitting: redemptionMutation.isPending,
    isFormValid: isFormValid(),

    // أخطاء
    error: redemptionMutation.error,
  };
}

// الولايات الجزائرية للاختيار
export const ALGERIA_WILAYAS = [
  'أدرار',
  'الشلف',
  'الأغواط',
  'أم البواقي',
  'باتنة',
  'بجاية',
  'بسكرة',
  'بشار',
  'البليدة',
  'البويرة',
  'تمنراست',
  'تبسة',
  'تلمسان',
  'تيارت',
  'تيزي وزو',
  'الجزائر',
  'الجلفة',
  'جيجل',
  'سطيف',
  'سعيدة',
  'سكيكدة',
  'سيدي بلعباس',
  'عنابة',
  'قالمة',
  'قسنطينة',
  'المدية',
  'مستغانم',
  'المسيلة',
  'معسكر',
  'ورقلة',
  'وهران',
  'البيض',
  'إليزي',
  'برج بوعريريج',
  'بومرداس',
  'الطارف',
  'تندوف',
  'تيسمسيلت',
  'الوادي',
  'خنشلة',
  'سوق أهراس',
  'تيبازة',
  'ميلة',
  'عين الدفلى',
  'النعامة',
  'عين تموشنت',
  'غرداية',
  'غليزان',
  'تيميمون',
  'برج باجي مختار',
  'أولاد جلال',
  'بني عباس',
  'عين صالح',
  'عين قزام',
  'توقرت',
  'جانت',
  'المغير',
  'المنيعة',
];

export default useReferralRedemption;
