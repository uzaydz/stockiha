import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  Calendar,
  DollarSign,
  Building,
  Mail,
  Phone,
  User,
  RefreshCw,
  Filter,
  Search,
  Loader2
} from 'lucide-react';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

interface SubscriptionRequest {
  request_id: string;
  organization_id: string;
  organization_name: string;
  organization_email: string;
  plan_id: string;
  plan_name: string;
  plan_code: string;
  billing_cycle: string;
  amount: number;
  currency: string;
  payment_method: string | null;
  payment_proof_url: string | null;
  payment_reference: string | null;
  payment_notes: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'processing';
  customer_notes: string | null;
  admin_notes: string | null;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

const SubscriptionRequests: React.FC = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<SubscriptionRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<SubscriptionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<SubscriptionRequest | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_subscription_requests' as any, {
        p_status: statusFilter === 'all' ? null : statusFilter,
        p_limit: 100,
        p_offset: 0
      });

      if (error) {
        console.error('Error fetching requests:', error);
        toast({
          variant: 'destructive',
          title: 'خطأ في جلب الطلبات',
          description: error.message
        });
        return;
      }

      setRequests(data || []);
      setFilteredRequests(data || []);
    } catch (err: any) {
      console.error('Error:', err);
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'فشل في تحميل الطلبات'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = requests.filter(req =>
        req.organization_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.organization_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.plan_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredRequests(filtered);
    } else {
      setFilteredRequests(requests);
    }
  }, [searchQuery, requests]);

  const handleApprove = async () => {
    if (!selectedRequest) return;

    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc('admin_approve_subscription_request' as any, {
        p_request_id: selectedRequest.request_id,
        p_admin_notes: adminNotes || null
      });

      if (error) throw error;

      if (!(data as any)?.success) {
        throw new Error((data as any)?.error || 'فشل في قبول الطلب');
      }

      toast({
        title: 'تم قبول الطلب',
        description: 'تم تفعيل اشتراك المؤسسة بنجاح'
      });

      setApproveDialogOpen(false);
      setAdminNotes('');
      fetchRequests();
    } catch (err: any) {
      console.error('Error approving request:', err);
      toast({
        variant: 'destructive',
        title: 'خطأ في قبول الطلب',
        description: err.message
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason) return;

    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc('admin_reject_subscription_request' as any, {
        p_request_id: selectedRequest.request_id,
        p_rejection_reason: rejectionReason,
        p_admin_notes: adminNotes || null
      });

      if (error) throw error;

      if (!(data as any)?.success) {
        throw new Error((data as any)?.error || 'فشل في رفض الطلب');
      }

      toast({
        title: 'تم رفض الطلب',
        description: 'تم رفض طلب الاشتراك'
      });

      setRejectDialogOpen(false);
      setRejectionReason('');
      setAdminNotes('');
      fetchRequests();
    } catch (err: any) {
      console.error('Error rejecting request:', err);
      toast({
        variant: 'destructive',
        title: 'خطأ في رفض الطلب',
        description: err.message
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">قيد المراجعة</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">مقبول</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">مرفوض</Badge>;
      case 'processing':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">قيد المعالجة</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-DZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('ar-DZ', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">طلبات الاشتراك</h1>
            <p className="text-muted-foreground mt-1">إدارة ومراجعة طلبات الاشتراك من العملاء</p>
          </div>
          <Button onClick={fetchRequests} variant="outline" className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي الطلبات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{requests.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-amber-600">قيد المراجعة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">{pendingCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-600">المقبولة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{approvedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-red-600">المرفوضة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{rejectedCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>قائمة الطلبات</CardTitle>
            <CardDescription>عرض وإدارة طلبات الاشتراك</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث عن مؤسسة أو خطة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-4 pr-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="حالة الطلب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="pending">قيد المراجعة</SelectItem>
                  <SelectItem value="approved">مقبول</SelectItem>
                  <SelectItem value="rejected">مرفوض</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">لا توجد طلبات</p>
              </div>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المؤسسة</TableHead>
                      <TableHead>الباقة</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>تاريخ الطلب</TableHead>
                      <TableHead className="text-left">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((request) => (
                      <TableRow key={request.request_id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{request.organization_name}</div>
                            <div className="text-sm text-muted-foreground">{request.organization_email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{request.plan_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {request.billing_cycle === 'monthly' ? 'شهري' : 'سنوي'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{formatAmount(request.amount, request.currency)}</TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell className="text-sm">{formatDate(request.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedRequest(request);
                                setViewDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {request.status === 'pending' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-green-600 hover:text-green-700"
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setApproveDialogOpen(true);
                                  }}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setRejectDialogOpen(true);
                                  }}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل الطلب</DialogTitle>
            <DialogDescription>معلومات كاملة عن طلب الاشتراك</DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-6">
              {/* Organization Info */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  معلومات المؤسسة
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">الاسم:</span>
                    <span className="font-medium mr-2">{selectedRequest.organization_name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">البريد:</span>
                    <span className="font-medium mr-2">{selectedRequest.organization_email}</span>
                  </div>
                </div>
              </div>

              {/* Plan Info */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  معلومات الباقة
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">الباقة:</span>
                    <span className="font-medium mr-2">{selectedRequest.plan_name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">دورة الفوترة:</span>
                    <span className="font-medium mr-2">
                      {selectedRequest.billing_cycle === 'monthly' ? 'شهري' : 'سنوي'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">المبلغ:</span>
                    <span className="font-medium mr-2">
                      {formatAmount(selectedRequest.amount, selectedRequest.currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              {(selectedRequest.contact_name || selectedRequest.contact_email || selectedRequest.contact_phone) && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    معلومات التواصل
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {selectedRequest.contact_name && (
                      <div>
                        <span className="text-muted-foreground">الاسم:</span>
                        <span className="font-medium mr-2">{selectedRequest.contact_name}</span>
                      </div>
                    )}
                    {selectedRequest.contact_email && (
                      <div>
                        <span className="text-muted-foreground">البريد:</span>
                        <span className="font-medium mr-2">{selectedRequest.contact_email}</span>
                      </div>
                    )}
                    {selectedRequest.contact_phone && (
                      <div>
                        <span className="text-muted-foreground">الهاتف:</span>
                        <span className="font-medium mr-2">{selectedRequest.contact_phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Payment Info */}
              {selectedRequest.payment_method && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    معلومات الدفع
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">طريقة الدفع:</span>
                      <span className="font-medium mr-2">{selectedRequest.payment_method}</span>
                    </div>
                    {selectedRequest.payment_reference && (
                      <div>
                        <span className="text-muted-foreground">رقم المرجع:</span>
                        <span className="font-medium mr-2">{selectedRequest.payment_reference}</span>
                      </div>
                    )}
                    {selectedRequest.payment_proof_url && (
                      <div>
                        <a
                          href={selectedRequest.payment_proof_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          عرض إثبات الدفع
                        </a>
                      </div>
                    )}
                    {selectedRequest.payment_notes && (
                      <div>
                        <span className="text-muted-foreground block mb-1">ملاحظات الدفع:</span>
                        <p className="text-sm bg-gray-50 p-2 rounded">{selectedRequest.payment_notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Customer Notes */}
              {selectedRequest.customer_notes && (
                <div>
                  <h3 className="font-semibold mb-2">ملاحظات العميل</h3>
                  <p className="text-sm bg-gray-50 p-3 rounded">{selectedRequest.customer_notes}</p>
                </div>
              )}

              {/* Status */}
              <div>
                <h3 className="font-semibold mb-2">الحالة</h3>
                <div className="flex items-center gap-4">
                  {getStatusBadge(selectedRequest.status)}
                  <span className="text-sm text-muted-foreground">
                    تم الإنشاء: {formatDate(selectedRequest.created_at)}
                  </span>
                </div>
              </div>

              {/* Admin Review */}
              {selectedRequest.reviewed_by && (
                <div>
                  <h3 className="font-semibold mb-2">معلومات المراجعة</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">تمت المراجعة بواسطة:</span>
                      <span className="font-medium mr-2">{selectedRequest.reviewed_by_name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">تاريخ المراجعة:</span>
                      <span className="font-medium mr-2">
                        {selectedRequest.reviewed_at && formatDate(selectedRequest.reviewed_at)}
                      </span>
                    </div>
                    {selectedRequest.admin_notes && (
                      <div>
                        <span className="text-muted-foreground block mb-1">ملاحظات الإدارة:</span>
                        <p className="bg-gray-50 p-2 rounded">{selectedRequest.admin_notes}</p>
                      </div>
                    )}
                    {selectedRequest.rejection_reason && (
                      <div>
                        <span className="text-muted-foreground block mb-1">سبب الرفض:</span>
                        <p className="bg-red-50 p-2 rounded text-red-700">{selectedRequest.rejection_reason}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>قبول طلب الاشتراك</DialogTitle>
            <DialogDescription>
              سيتم تفعيل اشتراك المؤسسة بالباقة المختارة
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="admin-notes-approve">ملاحظات (اختياري)</Label>
              <Textarea
                id="admin-notes-approve"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="أضف أي ملاحظات..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)} disabled={processing}>
              إلغاء
            </Button>
            <Button onClick={handleApprove} disabled={processing}>
              {processing ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري القبول...
                </>
              ) : (
                <>
                  <CheckCircle className="ml-2 h-4 w-4" />
                  قبول وتفعيل
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>رفض طلب الاشتراك</DialogTitle>
            <DialogDescription>
              يرجى تحديد سبب رفض الطلب
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection-reason">سبب الرفض *</Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="اذكر سبب رفض الطلب..."
                rows={3}
                required
              />
            </div>
            <div>
              <Label htmlFor="admin-notes-reject">ملاحظات إضافية (اختياري)</Label>
              <Textarea
                id="admin-notes-reject"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="أضف أي ملاحظات..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)} disabled={processing}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processing || !rejectionReason}
            >
              {processing ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري الرفض...
                </>
              ) : (
                <>
                  <XCircle className="ml-2 h-4 w-4" />
                  رفض الطلب
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
};

export default SubscriptionRequests;
