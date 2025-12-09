// =====================================================
// إدارة المكافآت - Super Admin Rewards Management
// =====================================================

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Star,
  Plus,
  Edit,
  Loader2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ReferralAdminService, ReferralRewardsService } from '@/lib/referral';
import { supabase } from '@/lib/supabase-unified';
import type { ReferralReward, RewardType, TierLevel, UpdateRewardData } from '@/types/referral';
import { TIER_NAMES } from '@/types/referral';

const rewardTypes: { value: RewardType; label: string }[] = [
  { value: 'subscription_extension', label: 'تمديد اشتراك' },
  { value: 'advertising', label: 'إشهار' },
  { value: 'physical_item', label: 'منتج مادي' },
  { value: 'service', label: 'خدمة' },
  { value: 'other', label: 'أخرى' },
];

export default function RewardsManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // حالة الحوار
  const [editDialog, setEditDialog] = useState<ReferralReward | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [formData, setFormData] = useState<UpdateRewardData>({});

  // جلب المكافآت
  const { data: rewards = [], isLoading } = useQuery<ReferralReward[]>({
    queryKey: ['admin-rewards'],
    queryFn: async () => {
      const { data } = await supabase
        .from('referral_rewards')
        .select('*')
        .order('points_cost', { ascending: true });
      return data || [];
    },
  });

  // تحديث مكافأة
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRewardData }) =>
      ReferralAdminService.updateReward(id, data),
    onSuccess: () => {
      toast({ title: 'تم تحديث المكافأة' });
      queryClient.invalidateQueries({ queryKey: ['admin-rewards'] });
      handleCloseDialog();
    },
  });

  // إنشاء مكافأة
  const createMutation = useMutation({
    mutationFn: (data: UpdateRewardData) => ReferralAdminService.createReward(data),
    onSuccess: () => {
      toast({ title: 'تم إنشاء المكافأة' });
      queryClient.invalidateQueries({ queryKey: ['admin-rewards'] });
      handleCloseDialog();
    },
  });

  const handleOpenNew = () => {
    setIsNew(true);
    setFormData({
      name_ar: '',
      description_ar: '',
      reward_type: 'other',
      points_cost: 1000,
      min_tier_level: 1,
      requires_manual_fulfillment: true,
      is_active: true,
    });
    setEditDialog({} as ReferralReward);
  };

  const handleOpenEdit = (reward: ReferralReward) => {
    setIsNew(false);
    setFormData({
      name_ar: reward.name_ar,
      description_ar: reward.description_ar || '',
      reward_type: reward.reward_type,
      points_cost: reward.points_cost,
      monetary_value: reward.monetary_value || undefined,
      min_tier_level: reward.min_tier_level,
      duration_days: reward.duration_days || undefined,
      requires_manual_fulfillment: reward.requires_manual_fulfillment,
      is_active: reward.is_active,
      icon: reward.icon || '',
    });
    setEditDialog(reward);
  };

  const handleCloseDialog = () => {
    setEditDialog(null);
    setFormData({});
    setIsNew(false);
  };

  const handleSave = () => {
    if (isNew) {
      createMutation.mutate(formData);
    } else if (editDialog) {
      updateMutation.mutate({ id: editDialog.id, data: formData });
    }
  };

  // تبديل حالة النشاط
  const toggleActive = (reward: ReferralReward) => {
    updateMutation.mutate({
      id: reward.id,
      data: { is_active: !reward.is_active },
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* العنوان */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Star className="h-8 w-8" />
            المكافآت
          </h1>
          <p className="text-muted-foreground mt-1">
            إدارة المكافآت المتاحة في برنامج الإحالة
          </p>
        </div>
        <Button onClick={handleOpenNew}>
          <Plus className="h-4 w-4 ml-2" />
          إضافة مكافأة
        </Button>
      </div>

      {/* الجدول */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المكافأة</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>النقاط</TableHead>
                  <TableHead>المستوى المطلوب</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rewards.map((reward) => (
                  <TableRow key={reward.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">
                          {reward.icon ||
                            ReferralRewardsService.getRewardTypeIcon(reward.reward_type)}
                        </span>
                        <div>
                          <p className="font-medium">{reward.name_ar}</p>
                          {reward.description_ar && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {reward.description_ar}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {ReferralRewardsService.getRewardTypeName(reward.reward_type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {reward.points_cost.toLocaleString('ar-DZ')}
                    </TableCell>
                    <TableCell>
                      {TIER_NAMES[reward.min_tier_level as TierLevel]?.ar || 'برونزي'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive(reward)}
                      >
                        {reward.is_active ? (
                          <ToggleRight className="h-5 w-5 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(reward)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* حوار التعديل/الإضافة */}
      <Dialog open={!!editDialog} onOpenChange={() => handleCloseDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isNew ? 'إضافة مكافأة' : 'تعديل المكافأة'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>اسم المكافأة *</Label>
                <Input
                  value={formData.name_ar || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, name_ar: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label>الوصف</Label>
                <Textarea
                  value={formData.description_ar || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, description_ar: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>النوع *</Label>
                <Select
                  value={formData.reward_type || 'other'}
                  onValueChange={(v) =>
                    setFormData({ ...formData, reward_type: v as RewardType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {rewardTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>تكلفة النقاط *</Label>
                <Input
                  type="number"
                  value={formData.points_cost || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      points_cost: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>المستوى المطلوب *</Label>
                <Select
                  value={String(formData.min_tier_level || 1)}
                  onValueChange={(v) =>
                    setFormData({
                      ...formData,
                      min_tier_level: parseInt(v) as TierLevel,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((level) => (
                      <SelectItem key={level} value={String(level)}>
                        {TIER_NAMES[level as TierLevel].ar}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>القيمة المالية (دج)</Label>
                <Input
                  type="number"
                  value={formData.monetary_value || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      monetary_value: parseFloat(e.target.value) || undefined,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>المدة (أيام)</Label>
                <Input
                  type="number"
                  value={formData.duration_days || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      duration_days: parseInt(e.target.value) || undefined,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>الأيقونة (Emoji)</Label>
                <Input
                  value={formData.icon || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, icon: e.target.value })
                  }
                  placeholder="🎁"
                />
              </div>

              <div className="flex items-center gap-4 col-span-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.requires_manual_fulfillment}
                    onCheckedChange={(v) =>
                      setFormData({ ...formData, requires_manual_fulfillment: v })
                    }
                  />
                  <Label>يتطلب تنفيذ يدوي</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(v) =>
                      setFormData({ ...formData, is_active: v })
                    }
                  />
                  <Label>نشط</Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              إلغاء
            </Button>
            <Button
              disabled={
                !formData.name_ar ||
                !formData.points_cost ||
                updateMutation.isPending ||
                createMutation.isPending
              }
              onClick={handleSave}
            >
              {updateMutation.isPending || createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isNew ? (
                'إنشاء'
              ) : (
                'حفظ'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
