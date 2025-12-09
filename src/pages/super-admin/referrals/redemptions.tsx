// =====================================================
// إدارة طلبات الاستبدال - Super Admin Redemptions Management
// =====================================================

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Gift,
  Search,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Loader2,
  Package,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ReferralAdminService, ReferralRewardsService } from '@/lib/referral';
import type { AdminRedemption, RedemptionStatus } from '@/types/referral';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

const statusConfig: Record<
  RedemptionStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  pending: { label: 'قيد الانتظار', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  approved: { label: 'موافق عليه', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  rejected: { label: 'مرفوض', color: 'bg-red-100 text-red-700', icon: XCircle },
  completed: { label: 'مكتمل', color: 'bg-green-100 text-green-700', icon: Package },
};

export default function RedemptionsManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // حالة الفلاتر
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [page, setPage] = useState(0);
  const limit = 20;

  // حالة الحوارات
  const [viewDialog, setViewDialog] = useState<AdminRedemption | null>(null);
  const [rejectDialog, setRejectDialog] = useState<AdminRedemption | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // جلب البيانات
  const { data, isLoading } = useQuery({
    queryKey: ['admin-redemptions', search, statusFilter, page],
    queryFn: () =>
      ReferralAdminService.listRedemptions({
        search: search || undefined,
        status: statusFilter !== 'all' ? (statusFilter as RedemptionStatus) : undefined,
        limit,
        offset: page * limit,
      }),
  });

  // الموافقة على طلب
  const approveMutation = useMutation({
    mutationFn: (id: string) => ReferralAdminService.approveRedemption(id),
    onSuccess: () => {
      toast({ title: 'تمت الموافقة على الطلب' });
      queryClient.invalidateQueries({ queryKey: ['admin-redemptions'] });
    },
  });

  // رفض طلب
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      ReferralAdminService.rejectRedemption(id, reason),
    onSuccess: () => {
      toast({ title: 'تم رفض الطلب وإرجاع النقاط' });
      queryClient.invalidateQueries({ queryKey: ['admin-redemptions'] });
      setRejectDialog(null);
      setRejectReason('');
    },
  });

  // إكمال طلب
  const completeMutation = useMutation({
    mutationFn: (id: string) => ReferralAdminService.completeRedemption(id),
    onSuccess: () => {
      toast({ title: 'تم إكمال الطلب' });
      queryClient.invalidateQueries({ queryKey: ['admin-redemptions'] });
    },
  });

  const redemptions = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* العنوان */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Gift className="h-8 w-8" />
          طلبات الاستبدال
        </h1>
        <p className="text-muted-foreground mt-1">
          مراجعة وإدارة طلبات استبدال النقاط
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
                  placeholder="بحث بالاسم..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-9"
                />
              </div>
            </div>

            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList>
                <TabsTrigger value="pending">قيد الانتظار</TabsTrigger>
                <TabsTrigger value="approved">موافق عليه</TabsTrigger>
                <TabsTrigger value="completed">مكتمل</TabsTrigger>
                <TabsTrigger value="rejected">مرفوض</TabsTrigger>
                <TabsTrigger value="all">الكل</TabsTrigger>
              </TabsList>
            </Tabs>
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
          ) : redemptions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              لا توجد طلبات
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المؤسسة</TableHead>
                  <TableHead>المكافأة</TableHead>
                  <TableHead>النقاط</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {redemptions.map((redemption) => {
                  const config = statusConfig[redemption.status];
                  const StatusIcon = config.icon;

                  return (
                    <TableRow key={redemption.id}>
                      <TableCell className="font-medium">
                        {redemption.organization_name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>
                            {ReferralRewardsService.getRewardTypeIcon(
                              redemption.reward_type
                            )}
                          </span>
                          {redemption.reward_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        {redemption.points_spent.toLocaleString('ar-DZ')}
                      </TableCell>
                      <TableCell>
                        <Badge className={config.color}>
                          <StatusIcon className="h-3 w-3 ml-1" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDistanceToNow(new Date(redemption.created_at), {
                          addSuffix: true,
                          locale: ar,
                        })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewDialog(redemption)}>
                              <Eye className="h-4 w-4 ml-2" />
                              عرض التفاصيل
                            </DropdownMenuItem>

                            {redemption.status === 'pending' && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => approveMutation.mutate(redemption.id)}
                                >
                                  <CheckCircle className="h-4 w-4 ml-2 text-green-600" />
                                  موافقة
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setRejectDialog(redemption)}
                                >
                                  <XCircle className="h-4 w-4 ml-2 text-red-600" />
                                  رفض
                                </DropdownMenuItem>
                              </>
                            )}

                            {redemption.status === 'approved' && (
                              <DropdownMenuItem
                                onClick={() => completeMutation.mutate(redemption.id)}
                              >
                                <Package className="h-4 w-4 ml-2 text-blue-600" />
                                تم التنفيذ
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
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

      {/* حوار عرض التفاصيل */}
      <Dialog open={!!viewDialog} onOpenChange={() => setViewDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>تفاصيل الطلب</DialogTitle>
          </DialogHeader>
          {viewDialog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">المؤسسة</Label>
                  <p className="font-medium">{viewDialog.organization_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">المكافأة</Label>
                  <p className="font-medium">{viewDialog.reward_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">النقاط</Label>
                  <p className="font-medium">{viewDialog.points_spent}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">الحالة</Label>
                  <Badge className={statusConfig[viewDialog.status].color}>
                    {statusConfig[viewDialog.status].label}
                  </Badge>
                </div>
              </div>

              {viewDialog.ad_content && (
                <div className="border-t pt-4">
                  <Label className="text-muted-foreground">محتوى الإشهار</Label>
                  <div className="mt-2 rounded-lg bg-muted p-3 space-y-2">
                    <p>
                      <strong>العنوان:</strong> {viewDialog.ad_content.title}
                    </p>
                    <p>
                      <strong>الوصف:</strong> {viewDialog.ad_content.description}
                    </p>
                    {viewDialog.ad_content.link && (
                      <p>
                        <strong>الرابط:</strong>{' '}
                        <a
                          href={viewDialog.ad_content.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary"
                        >
                          {viewDialog.ad_content.link}
                        </a>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {viewDialog.shipping_address && (
                <div className="border-t pt-4">
                  <Label className="text-muted-foreground">عنوان الشحن</Label>
                  <div className="mt-2 rounded-lg bg-muted p-3 space-y-1 text-sm">
                    <p>
                      <strong>الاسم:</strong> {viewDialog.shipping_address.name}
                    </p>
                    <p>
                      <strong>الهاتف:</strong> {viewDialog.shipping_address.phone}
                    </p>
                    <p>
                      <strong>الولاية:</strong> {viewDialog.shipping_address.wilaya}
                    </p>
                    <p>
                      <strong>البلدية:</strong> {viewDialog.shipping_address.commune}
                    </p>
                    <p>
                      <strong>العنوان:</strong> {viewDialog.shipping_address.address}
                    </p>
                    {viewDialog.shipping_address.notes && (
                      <p>
                        <strong>ملاحظات:</strong> {viewDialog.shipping_address.notes}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {viewDialog.admin_notes && (
                <div className="border-t pt-4">
                  <Label className="text-muted-foreground">ملاحظات الإدارة</Label>
                  <p className="mt-1">{viewDialog.admin_notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* حوار الرفض */}
      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>رفض الطلب</DialogTitle>
            <DialogDescription>
              سيتم إرجاع النقاط للمستخدم مع إشعار بسبب الرفض
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="reason">سبب الرفض *</Label>
            <Textarea
              id="reason"
              placeholder="اكتب سبب الرفض..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason || rejectMutation.isPending}
              onClick={() =>
                rejectMutation.mutate({
                  id: rejectDialog!.id,
                  reason: rejectReason,
                })
              }
            >
              {rejectMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'رفض الطلب'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
