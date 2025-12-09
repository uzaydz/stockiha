// =====================================================
// إدارة المستويات - Super Admin Tiers Management
// =====================================================

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trophy, Edit, Loader2, Users } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { ReferralAdminService } from '@/lib/referral';
import { supabase } from '@/lib/supabase-unified';
import type { ReferralTier, UpdateTierData, TierLevel } from '@/types/referral';
import { TIER_ICONS, TIER_COLORS } from '@/types/referral';

export default function TiersManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // حالة الحوار
  const [editDialog, setEditDialog] = useState<ReferralTier | null>(null);
  const [formData, setFormData] = useState<UpdateTierData>({});

  // جلب المستويات
  const { data: tiers = [], isLoading } = useQuery<ReferralTier[]>({
    queryKey: ['admin-tiers'],
    queryFn: async () => {
      const { data } = await supabase
        .from('referral_tiers')
        .select('*')
        .order('level', { ascending: true });
      return data || [];
    },
  });

  // جلب عدد المستخدمين لكل مستوى
  const { data: tierCounts = {} } = useQuery({
    queryKey: ['admin-tier-counts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('referral_points')
        .select('current_tier_id');

      const counts: Record<string, number> = {};
      data?.forEach((item) => {
        counts[item.current_tier_id] = (counts[item.current_tier_id] || 0) + 1;
      });
      return counts;
    },
  });

  // تحديث مستوى
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTierData }) =>
      ReferralAdminService.updateTier(id, data),
    onSuccess: () => {
      toast({ title: 'تم تحديث المستوى' });
      queryClient.invalidateQueries({ queryKey: ['admin-tiers'] });
      handleCloseDialog();
    },
  });

  const handleOpenEdit = (tier: ReferralTier) => {
    setFormData({
      name: tier.name,
      name_ar: tier.name_ar,
      min_points: tier.min_points,
      max_points: tier.max_points,
      bonus_percentage: tier.bonus_percentage,
      badge_icon: tier.badge_icon,
      badge_color: tier.badge_color,
      perks: tier.perks,
      exclusive_rewards: tier.exclusive_rewards || '',
    });
    setEditDialog(tier);
  };

  const handleCloseDialog = () => {
    setEditDialog(null);
    setFormData({});
  };

  const handleSave = () => {
    if (editDialog) {
      updateMutation.mutate({ id: editDialog.id, data: formData });
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* العنوان */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Trophy className="h-8 w-8" />
          المستويات
        </h1>
        <p className="text-muted-foreground mt-1">
          إدارة مستويات برنامج الإحالة ومكافآتها
        </p>
      </div>

      {/* البطاقات */}
      <div className="grid gap-4 md:grid-cols-5">
        {tiers.map((tier) => {
          const level = tier.level as TierLevel;
          const count = tierCounts[tier.id] || 0;

          return (
            <Card
              key={tier.id}
              className="relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleOpenEdit(tier)}
            >
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: TIER_COLORS[level] }}
              />
              <CardContent className="pt-6 text-center">
                <span className="text-4xl">{TIER_ICONS[level]}</span>
                <h3 className="font-semibold mt-2">{tier.name_ar}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {tier.min_points.toLocaleString('ar-DZ')} -{' '}
                  {tier.max_points?.toLocaleString('ar-DZ') || '∞'}
                </p>
                <Badge className="mt-2" style={{ backgroundColor: TIER_COLORS[level] }}>
                  +{tier.bonus_percentage}%
                </Badge>
                <div className="flex items-center justify-center gap-1 mt-3 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {count} عضو
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* الجدول التفصيلي */}
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
                  <TableHead>المستوى</TableHead>
                  <TableHead>نطاق النقاط</TableHead>
                  <TableHead>المكافأة الإضافية</TableHead>
                  <TableHead>المزايا</TableHead>
                  <TableHead>الأعضاء</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tiers.map((tier) => {
                  const level = tier.level as TierLevel;

                  return (
                    <TableRow key={tier.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{TIER_ICONS[level]}</span>
                          <div>
                            <p className="font-medium">{tier.name_ar}</p>
                            <p className="text-xs text-muted-foreground">
                              {tier.name}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {tier.min_points.toLocaleString('ar-DZ')} -{' '}
                        {tier.max_points?.toLocaleString('ar-DZ') || '∞'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          style={{
                            backgroundColor: `${TIER_COLORS[level]}20`,
                            color: TIER_COLORS[level],
                          }}
                        >
                          +{tier.bonus_percentage}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          {tier.perks?.slice(0, 2).map((perk, i) => (
                            <p key={i} className="text-xs text-muted-foreground truncate">
                              • {perk}
                            </p>
                          ))}
                          {tier.perks && tier.perks.length > 2 && (
                            <p className="text-xs text-muted-foreground">
                              +{tier.perks.length - 2} أخرى
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {tierCounts[tier.id] || 0}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(tier)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* حوار التعديل */}
      <Dialog open={!!editDialog} onOpenChange={() => handleCloseDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editDialog && (
                <span className="text-2xl">
                  {TIER_ICONS[editDialog.level as TierLevel]}
                </span>
              )}
              تعديل المستوى: {editDialog?.name_ar}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الاسم (عربي)</Label>
                <Input
                  value={formData.name_ar || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, name_ar: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>الاسم (إنجليزي)</Label>
                <Input
                  value={formData.name || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>الحد الأدنى للنقاط</Label>
                <Input
                  type="number"
                  value={formData.min_points || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      min_points: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>الحد الأقصى للنقاط</Label>
                <Input
                  type="number"
                  value={formData.max_points ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      max_points: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder="بدون حد"
                />
              </div>

              <div className="space-y-2">
                <Label>نسبة المكافأة الإضافية (%)</Label>
                <Input
                  type="number"
                  value={formData.bonus_percentage || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bonus_percentage: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>لون الشارة</Label>
                <Input
                  type="color"
                  value={formData.badge_color || '#CD7F32'}
                  onChange={(e) =>
                    setFormData({ ...formData, badge_color: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label>المزايا (سطر لكل ميزة)</Label>
                <Textarea
                  value={formData.perks?.join('\n') || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      perks: e.target.value.split('\n').filter(Boolean),
                    })
                  }
                  rows={4}
                  placeholder="أدخل المزايا..."
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label>المكافآت الحصرية</Label>
                <Textarea
                  value={formData.exclusive_rewards || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      exclusive_rewards: e.target.value,
                    })
                  }
                  rows={2}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              إلغاء
            </Button>
            <Button
              disabled={updateMutation.isPending}
              onClick={handleSave}
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
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
