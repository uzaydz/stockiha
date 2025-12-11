/**
 * 🏖️ Leave Management Page - صفحة إدارة الإجازات
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Calendar,
  Plus,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Users,
  CalendarDays,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { LeaveRequestsList } from '@/components/hr/LeaveRequestCard';
import {
  submitLeaveRequest,
  reviewLeaveRequest,
  getLeaveRequests,
  getEmployeeLeaveBalances,
  getLeaveTypes,
  getLeaveCalendar,
} from '@/lib/api/hr/leaveService';
import type { LeaveRequestWithDetails, EmployeeLeaveBalance, LeaveType } from '@/types/hr/leave';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';

export default function LeaveManagement() {
  const { userProfile } = useAuth();
  const { currentOrganization } = useTenant();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState('my-requests');
  const [isNewRequestDialogOpen, setIsNewRequestDialogOpen] = useState(false);
  const [reviewingRequest, setReviewingRequest] = useState<LeaveRequestWithDetails | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const organizationId = currentOrganization?.id || '';
  const isManager = userProfile?.role === 'admin' || userProfile?.role === 'manager';

  // استعلامات البيانات
  const { data: myRequestsData, isLoading: isLoadingMyRequests } = useQuery({
    queryKey: ['my-leave-requests', userProfile?.id],
    queryFn: () => getLeaveRequests({ employee_id: userProfile?.id }),
    enabled: !!userProfile?.id,
  });
  const myRequests = myRequestsData?.data || [];

  const { data: pendingRequestsData, isLoading: isLoadingPending } = useQuery({
    queryKey: ['pending-leave-requests', organizationId],
    queryFn: () => getLeaveRequests({ organization_id: organizationId, status: 'pending' }),
    enabled: !!organizationId && isManager,
  });
  const pendingRequests = pendingRequestsData?.data || [];

  const { data: myBalances = [] } = useQuery({
    queryKey: ['my-leave-balances', userProfile?.id],
    queryFn: () => getEmployeeLeaveBalances(userProfile?.id || ''),
    enabled: !!userProfile?.id,
  });

  const { data: leaveTypes = [] } = useQuery({
    queryKey: ['leave-types', organizationId],
    queryFn: () => getLeaveTypes(organizationId),
    enabled: !!organizationId,
  });

  const { data: leaveCalendar = [] } = useQuery({
    queryKey: ['leave-calendar', organizationId],
    queryFn: () => {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return getLeaveCalendar(
        organizationId,
        startOfMonth.toISOString().split('T')[0],
        endOfMonth.toISOString().split('T')[0]
      );
    },
    enabled: !!organizationId,
  });

  // تقديم طلب إجازة جديد
  const submitMutation = useMutation({
    mutationFn: submitLeaveRequest,
    onSuccess: (result) => {
      if (result.success) {
        toast.success('تم تقديم طلب الإجازة بنجاح');
        setIsNewRequestDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: ['my-leave-requests'] });
        queryClient.invalidateQueries({ queryKey: ['my-leave-balances'] });
      } else {
        toast.error(result.error || 'فشل تقديم الطلب');
      }
    },
  });

  // مراجعة طلب إجازة
  const reviewMutation = useMutation({
    mutationFn: (data: { id: string; status: 'approved' | 'rejected'; rejection_reason?: string }) =>
      reviewLeaveRequest(data.id, userProfile?.id || '', data.status, data.rejection_reason),
    onSuccess: (result) => {
      if (result.success) {
        toast.success('تمت مراجعة الطلب بنجاح');
        setReviewingRequest(null);
        setRejectionReason('');
        queryClient.invalidateQueries({ queryKey: ['pending-leave-requests'] });
      } else {
        toast.error(result.error || 'فشل مراجعة الطلب');
      }
    },
  });

  const handleApprove = (requestId: string) => {
    reviewMutation.mutate({ id: requestId, status: 'approved' });
  };

  const handleReject = () => {
    if (!reviewingRequest) return;
    reviewMutation.mutate({
      id: reviewingRequest.id,
      status: 'rejected',
      rejection_reason: rejectionReason,
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">إدارة الإجازات</h1>
          <p className="text-muted-foreground">
            إدارة طلبات الإجازات وأرصدة الموظفين
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => queryClient.invalidateQueries()}>
            <RefreshCw className="h-4 w-4 ml-2" />
            تحديث
          </Button>
          <Dialog open={isNewRequestDialogOpen} onOpenChange={setIsNewRequestDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 ml-2" />
                طلب إجازة جديد
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>تقديم طلب إجازة</DialogTitle>
              </DialogHeader>
              <NewLeaveRequestForm
                leaveTypes={leaveTypes}
                balances={myBalances}
                onSubmit={(data) => submitMutation.mutate({ ...data, employee_id: userProfile?.id || '' })}
                isLoading={submitMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* أرصدة الإجازات */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {myBalances.slice(0, 4).map((balance) => (
          <LeaveBalanceCard key={balance.id} balance={balance} />
        ))}
      </div>

      {/* تنبيه الطلبات المعلقة للمديرين */}
      {isManager && pendingRequests.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-900/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="font-medium">طلبات إجازة تحتاج مراجعتك</p>
                <p className="text-sm text-muted-foreground">
                  {pendingRequests.length} طلب بانتظار الموافقة
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => setSelectedTab('pending')}>
              مراجعة الطلبات
            </Button>
          </CardContent>
        </Card>
      )}

      {/* التبويبات */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="my-requests">طلباتي</TabsTrigger>
          {isManager && (
            <TabsTrigger value="pending">
              المعلقة
              {pendingRequests.length > 0 && (
                <Badge variant="destructive" className="mr-2 h-5 w-5 p-0 justify-center">
                  {pendingRequests.length}
                </Badge>
              )}
            </TabsTrigger>
          )}
          <TabsTrigger value="calendar">التقويم</TabsTrigger>
          <TabsTrigger value="balances">الأرصدة</TabsTrigger>
        </TabsList>

        <TabsContent value="my-requests" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                طلبات إجازاتي
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LeaveRequestsList
                requests={myRequests}
                isLoading={isLoadingMyRequests}
                emptyMessage="لم تقدم أي طلبات إجازة بعد"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {isManager && (
          <TabsContent value="pending" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  طلبات بانتظار الموافقة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LeaveRequestsList
                  requests={pendingRequests}
                  isLoading={isLoadingPending}
                  isManager={true}
                  onApprove={handleApprove}
                  onReject={(id) => {
                    const request = pendingRequests.find((r) => r.id === id);
                    if (request) setReviewingRequest(request);
                  }}
                  emptyMessage="لا توجد طلبات معلقة"
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="calendar" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                تقويم الإجازات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LeaveCalendarView data={leaveCalendar} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balances" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                أرصدة الإجازات التفصيلية
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myBalances.map((balance) => (
                  <LeaveBalanceDetailCard key={balance.id} balance={balance} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog رفض الطلب */}
      <Dialog open={!!reviewingRequest} onOpenChange={() => setReviewingRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>رفض طلب الإجازة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              أنت على وشك رفض طلب إجازة {reviewingRequest?.employee?.name}
            </p>
            <div className="space-y-2">
              <Label>سبب الرفض</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="أدخل سبب رفض الطلب..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewingRequest(null)}>
              إلغاء
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={reviewMutation.isPending}>
              {reviewMutation.isPending ? 'جاري الرفض...' : 'تأكيد الرفض'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================
// Sub Components
// ============================================

interface LeaveBalanceCardProps {
  balance: EmployeeLeaveBalance;
}

function LeaveBalanceCard({ balance }: LeaveBalanceCardProps) {
  const usedPercentage = (balance.used_days / balance.total_days) * 100;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="font-medium">{balance.leave_type?.name_ar || balance.leave_type?.name}</p>
            <p className="text-sm text-muted-foreground">
              {balance.remaining_days} يوم متبقي
            </p>
          </div>
          <Badge variant="outline">
            {balance.used_days}/{balance.total_days}
          </Badge>
        </div>
        <Progress value={usedPercentage} className="h-2" />
      </CardContent>
    </Card>
  );
}

function LeaveBalanceDetailCard({ balance }: LeaveBalanceCardProps) {
  const usedPercentage = (balance.used_days / balance.total_days) * 100;

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-medium">{balance.leave_type?.name_ar || balance.leave_type?.name}</h4>
          <Badge>{balance.year}</Badge>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-2 bg-muted/50 rounded">
            <p className="text-xl font-bold text-primary">{balance.total_days}</p>
            <p className="text-xs text-muted-foreground">إجمالي</p>
          </div>
          <div className="p-2 bg-muted/50 rounded">
            <p className="text-xl font-bold text-orange-500">{balance.used_days}</p>
            <p className="text-xs text-muted-foreground">مستخدم</p>
          </div>
          <div className="p-2 bg-muted/50 rounded">
            <p className="text-xl font-bold text-green-500">{balance.remaining_days}</p>
            <p className="text-xs text-muted-foreground">متبقي</p>
          </div>
        </div>
        <Progress value={usedPercentage} className="h-2" />
        {balance.pending_days > 0 && (
          <p className="text-xs text-orange-500">
            {balance.pending_days} يوم في طلبات معلقة
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface NewLeaveRequestFormProps {
  leaveTypes: LeaveType[];
  balances: EmployeeLeaveBalance[];
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

function NewLeaveRequestForm({
  leaveTypes,
  balances,
  onSubmit,
  isLoading,
}: NewLeaveRequestFormProps) {
  const [formData, setFormData] = useState({
    leave_type_id: '',
    start_date: '',
    end_date: '',
    reason: '',
  });

  const selectedBalance = balances.find(
    (b) => b.leave_type_id === formData.leave_type_id
  );

  const calculateDays = () => {
    if (!formData.start_date || !formData.end_date) return 0;
    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const totalDays = calculateDays();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBalance && totalDays > selectedBalance.remaining_days) {
      toast.error('عدد الأيام المطلوبة يتجاوز الرصيد المتاح');
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>نوع الإجازة</Label>
        <Select
          value={formData.leave_type_id}
          onValueChange={(value) => setFormData({ ...formData, leave_type_id: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="اختر نوع الإجازة" />
          </SelectTrigger>
          <SelectContent>
            {leaveTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name_ar || type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedBalance && (
          <p className="text-xs text-muted-foreground">
            الرصيد المتاح: {selectedBalance.remaining_days} يوم
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>من تاريخ</Label>
          <Input
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>إلى تاريخ</Label>
          <Input
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            min={formData.start_date}
            required
          />
        </div>
      </div>

      {totalDays > 0 && (
        <div className="p-3 bg-muted/50 rounded-lg text-center">
          <span className="text-sm">إجمالي الأيام: </span>
          <span className="font-bold text-primary">{totalDays} يوم</span>
        </div>
      )}

      <div className="space-y-2">
        <Label>السبب</Label>
        <Textarea
          value={formData.reason}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          placeholder="أدخل سبب الإجازة..."
          rows={3}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'جاري التقديم...' : 'تقديم الطلب'}
      </Button>
    </form>
  );
}

interface LeaveCalendarViewProps {
  data: any[];
}

function LeaveCalendarView({ data }: LeaveCalendarViewProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-12 w-12 mx-auto text-muted-foreground" />
        <p className="mt-4 text-muted-foreground">لا توجد إجازات هذا الشهر</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.map((item, index) => (
        <div
          key={index}
          className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className="text-center min-w-[60px]">
            <p className="text-lg font-bold">{new Date(item.date).getDate()}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(item.date).toLocaleDateString('ar-SA', { weekday: 'short' })}
            </p>
          </div>
          <div className="flex-1">
            <p className="font-medium">{item.employee_name}</p>
            <p className="text-sm text-muted-foreground">{item.leave_type}</p>
          </div>
          <Badge variant="outline">{item.status === 'approved' ? 'موافق عليه' : 'معلق'}</Badge>
        </div>
      ))}
    </div>
  );
}
