// =====================================================
// إدارة المُحيلين - Super Admin Referrers Management
// =====================================================

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Search,
  Filter,
  MoreHorizontal,
  Star,
  Edit,
  Ban,
  CheckCircle,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ReferralAdminService } from '@/lib/referral';
import { TIER_ICONS, type TierLevel, type AdminReferrer } from '@/types/referral';

export default function ReferrersManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // حالة الفلاتر
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const limit = 20;

  // حالة الحوارات
  const [adjustPointsDialog, setAdjustPointsDialog] = useState<AdminReferrer | null>(null);
  const [adjustPoints, setAdjustPoints] = useState({ points: 0, reason: '' });

  // جلب البيانات
  const { data, isLoading } = useQuery({
    queryKey: ['admin-referrers', search, tierFilter, activeFilter, page],
    queryFn: () =>
      ReferralAdminService.listReferrers({
        search: search || undefined,
        tier_level: tierFilter !== 'all' ? parseInt(tierFilter) : undefined,
        is_active: activeFilter !== 'all' ? activeFilter === 'active' : undefined,
        limit,
        offset: page * limit,
      }),
  });

  // تعديل النقاط
  const adjustPointsMutation = useMutation({
    mutationFn: ({
      orgId,
      points,
      reason,
    }: {
      orgId: string;
      points: number;
      reason: string;
    }) => ReferralAdminService.adjustPoints(orgId, points, reason),
    onSuccess: (result) => {
      if (result.success) {
        toast({ title: 'تم تعديل النقاط بنجاح' });
        queryClient.invalidateQueries({ queryKey: ['admin-referrers'] });
        setAdjustPointsDialog(null);
        setAdjustPoints({ points: 0, reason: '' });
      } else {
        toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
      }
    },
  });

  // تعطيل/تفعيل الكود
  const toggleCodeMutation = useMutation({
    mutationFn: ({ orgId, isActive }: { orgId: string; isActive: boolean }) =>
      ReferralAdminService.toggleReferralCode(orgId, isActive),
    onSuccess: () => {
      toast({ title: 'تم تحديث حالة الكود' });
      queryClient.invalidateQueries({ queryKey: ['admin-referrers'] });
    },
  });

  const referrers = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* العنوان */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Users className="h-8 w-8" />
          المُحيلين
        </h1>
        <p className="text-muted-foreground mt-1">
          إدارة المُحيلين ونقاطهم وأكواد الإحالة
        </p>
      </div>

      {/* الفلاتر */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث بالاسم أو الكود..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-9"
                />
              </div>
            </div>

            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="المستوى" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المستويات</SelectItem>
                <SelectItem value="1">🥉 برونزي</SelectItem>
                <SelectItem value="2">🥈 فضي</SelectItem>
                <SelectItem value="3">🥇 ذهبي</SelectItem>
                <SelectItem value="4">💎 بلاتيني</SelectItem>
                <SelectItem value="5">👑 ماسي</SelectItem>
              </SelectContent>
            </Select>

            <Select value={activeFilter} onValueChange={setActiveFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="inactive">معطل</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* الجدول */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : referrers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              لا توجد نتائج
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المؤسسة</TableHead>
                  <TableHead>الكود</TableHead>
                  <TableHead>المستوى</TableHead>
                  <TableHead>النقاط</TableHead>
                  <TableHead>الإحالات</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referrers.map((referrer) => (
                  <TableRow key={referrer.organization_id}>
                    <TableCell className="font-medium">
                      {referrer.organization_name}
                    </TableCell>
                    <TableCell>
                      <code className="bg-muted px-2 py-1 rounded text-sm">
                        {referrer.code}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge
                        style={{
                          backgroundColor: `${referrer.tier_color}20`,
                          color: referrer.tier_color,
                        }}
                      >
                        {TIER_ICONS[referrer.tier_level as TierLevel]}{' '}
                        {referrer.tier_name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">
                          {referrer.available_points.toLocaleString('ar-DZ')}
                        </span>
                        <span className="text-muted-foreground text-xs mr-1">
                          / {referrer.total_points.toLocaleString('ar-DZ')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{referrer.lifetime_referrals} إجمالي</div>
                        <div className="text-muted-foreground">
                          {referrer.total_subscriptions} مشترك
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {referrer.is_active ? (
                        <Badge variant="outline" className="text-green-600">
                          <CheckCircle className="h-3 w-3 ml-1" />
                          نشط
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600">
                          <Ban className="h-3 w-3 ml-1" />
                          معطل
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>إجراءات</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setAdjustPointsDialog(referrer)}
                          >
                            <Star className="h-4 w-4 ml-2" />
                            تعديل النقاط
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              toggleCodeMutation.mutate({
                                orgId: referrer.organization_id,
                                isActive: !referrer.is_active,
                              })
                            }
                          >
                            {referrer.is_active ? (
                              <>
                                <Ban className="h-4 w-4 ml-2" />
                                تعطيل الكود
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 ml-2" />
                                تفعيل الكود
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* الترقيم */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            عرض {page * limit + 1} - {Math.min((page + 1) * limit, total)} من {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              السابق
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              التالي
            </Button>
          </div>
        </div>
      )}

      {/* حوار تعديل النقاط */}
      <Dialog
        open={!!adjustPointsDialog}
        onOpenChange={() => setAdjustPointsDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل النقاط</DialogTitle>
            <DialogDescription>
              تعديل نقاط {adjustPointsDialog?.organization_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>الرصيد الحالي</Label>
              <p className="text-2xl font-bold">
                {adjustPointsDialog?.available_points.toLocaleString('ar-DZ')} نقطة
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="points">النقاط (+ للإضافة، - للخصم)</Label>
              <Input
                id="points"
                type="number"
                value={adjustPoints.points}
                onChange={(e) =>
                  setAdjustPoints({ ...adjustPoints, points: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">السبب *</Label>
              <Textarea
                id="reason"
                placeholder="سبب التعديل..."
                value={adjustPoints.reason}
                onChange={(e) =>
                  setAdjustPoints({ ...adjustPoints, reason: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustPointsDialog(null)}>
              إلغاء
            </Button>
            <Button
              disabled={
                !adjustPoints.reason ||
                adjustPoints.points === 0 ||
                adjustPointsMutation.isPending
              }
              onClick={() =>
                adjustPointsMutation.mutate({
                  orgId: adjustPointsDialog!.organization_id,
                  points: adjustPoints.points,
                  reason: adjustPoints.reason,
                })
              }
            >
              {adjustPointsMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'تأكيد'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
