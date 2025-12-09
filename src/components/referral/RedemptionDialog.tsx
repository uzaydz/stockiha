// =====================================================
// حوار استبدال النقاط - Redemption Dialog Component
// =====================================================

import { cn } from '@/lib/utils';
import { Star, Loader2, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ReferralRewardsService } from '@/lib/referral';
import { useReferralRedemption, ALGERIA_WILAYAS } from '@/hooks/useReferralRedemption';
import type { ReferralReward } from '@/types/referral';

interface RedemptionDialogProps {
  reward: ReferralReward | null;
  isOpen: boolean;
  onClose: () => void;
  availablePoints: number;
}

export function RedemptionDialog({
  reward,
  isOpen,
  onClose,
  availablePoints,
}: RedemptionDialogProps) {
  const {
    adContent,
    shippingAddress,
    setAdContent,
    setShippingAddress,
    submitRedemption,
    isSubmitting,
    isFormValid,
  } = useReferralRedemption();

  if (!reward) return null;

  const typeIcon = ReferralRewardsService.getRewardTypeIcon(reward.reward_type);
  const isAdvertising = reward.reward_type === 'advertising';
  const isPhysicalItem = reward.reward_type === 'physical_item';
  const needsForm = isAdvertising || isPhysicalItem;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{reward.icon || typeIcon}</span>
            استبدال: {reward.name_ar}
          </DialogTitle>
          <DialogDescription>
            {reward.description_ar || 'استبدل نقاطك بهذه المكافأة'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* ملخص التكلفة */}
          <div className="rounded-lg bg-muted/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">رصيدك الحالي</span>
              <span className="font-medium">
                {new Intl.NumberFormat('ar-DZ').format(availablePoints)} نقطة
              </span>
            </div>
            <div className="my-2 border-t" />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">تكلفة المكافأة</span>
              <span className="flex items-center gap-1 font-medium text-primary">
                <Star className="h-4 w-4" />
                {new Intl.NumberFormat('ar-DZ').format(reward.points_cost)}
              </span>
            </div>
            <div className="my-2 border-t" />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">الرصيد بعد الاستبدال</span>
              <span className="font-semibold">
                {new Intl.NumberFormat('ar-DZ').format(
                  availablePoints - reward.points_cost
                )}{' '}
                نقطة
              </span>
            </div>
          </div>

          {/* نموذج الإشهار */}
          {isAdvertising && (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  سيتم مراجعة محتوى الإشهار قبل النشر على صفحاتنا الرسمية
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="ad-title">عنوان الإشهار *</Label>
                <Input
                  id="ad-title"
                  placeholder="مثال: محل الأمل للهواتف الذكية"
                  value={adContent.title || ''}
                  onChange={(e) =>
                    setAdContent({ ...adContent, title: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ad-description">وصف الإشهار *</Label>
                <Textarea
                  id="ad-description"
                  placeholder="اكتب وصفاً جذاباً لمحلك أو منتجاتك..."
                  rows={3}
                  value={adContent.description || ''}
                  onChange={(e) =>
                    setAdContent({ ...adContent, description: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ad-link">رابط (اختياري)</Label>
                <Input
                  id="ad-link"
                  type="url"
                  placeholder="https://..."
                  value={adContent.link || ''}
                  onChange={(e) =>
                    setAdContent({ ...adContent, link: e.target.value })
                  }
                />
              </div>
            </div>
          )}

          {/* نموذج الشحن */}
          {isPhysicalItem && (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  سيتم شحن المنتج إلى العنوان المحدد خلال 7-14 يوم عمل
                </AlertDescription>
              </Alert>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">الاسم الكامل *</Label>
                  <Input
                    id="name"
                    placeholder="الاسم الكامل"
                    value={shippingAddress.name}
                    onChange={(e) =>
                      setShippingAddress({ ...shippingAddress, name: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">رقم الهاتف *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="05XXXXXXXX"
                    value={shippingAddress.phone}
                    onChange={(e) =>
                      setShippingAddress({ ...shippingAddress, phone: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wilaya">الولاية *</Label>
                  <Select
                    value={shippingAddress.wilaya}
                    onValueChange={(value) =>
                      setShippingAddress({ ...shippingAddress, wilaya: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الولاية" />
                    </SelectTrigger>
                    <SelectContent>
                      {ALGERIA_WILAYAS.map((wilaya) => (
                        <SelectItem key={wilaya} value={wilaya}>
                          {wilaya}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="commune">البلدية *</Label>
                  <Input
                    id="commune"
                    placeholder="البلدية"
                    value={shippingAddress.commune}
                    onChange={(e) =>
                      setShippingAddress({ ...shippingAddress, commune: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">العنوان التفصيلي *</Label>
                  <Textarea
                    id="address"
                    placeholder="الحي، الشارع، رقم المنزل..."
                    rows={2}
                    value={shippingAddress.address}
                    onChange={(e) =>
                      setShippingAddress({ ...shippingAddress, address: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="notes">ملاحظات إضافية (اختياري)</Label>
                  <Input
                    id="notes"
                    placeholder="معلومات إضافية للتوصيل..."
                    value={shippingAddress.notes || ''}
                    onChange={(e) =>
                      setShippingAddress({ ...shippingAddress, notes: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* رسالة للمكافآت التي لا تحتاج نموذج */}
          {!needsForm && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {reward.requires_manual_fulfillment
                  ? 'سيتم معالجة طلبك وإعلامك بمجرد الانتهاء'
                  : 'سيتم تطبيق المكافأة تلقائياً على حسابك'}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            إلغاء
          </Button>
          <Button
            onClick={submitRedemption}
            disabled={isSubmitting || (needsForm && !isFormValid)}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                جاري الإرسال...
              </>
            ) : (
              <>
                تأكيد الاستبدال
                <Star className="mr-2 h-4 w-4" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RedemptionDialog;
