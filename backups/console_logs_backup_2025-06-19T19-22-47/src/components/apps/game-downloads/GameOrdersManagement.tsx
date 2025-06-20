import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, Edit, CheckCircle, XCircle, Clock, Package, Truck, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/context/UserContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface GameOrder {
  id: string;
  tracking_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  game_id: string;
  device_type?: string;
  device_specs?: string;
  notes?: string;
  status: string;
  status_history: any[];
  assigned_to?: string;
  processing_started_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  price: number;
  payment_status: string;
  payment_method?: string;
  amount_paid: number;
  created_at: string;
  updated_at: string;
  game?: {
    name: string;
    platform: string;
  };
  assigned_user?: {
    name: string;
  };
}

const statusOptions = [
  { value: 'pending', label: 'قيد الانتظار', color: 'bg-yellow-500' },
  { value: 'processing', label: 'قيد المعالجة', color: 'bg-blue-500' },
  { value: 'ready', label: 'جاهز للتسليم', color: 'bg-purple-500' },
  { value: 'delivered', label: 'تم التسليم', color: 'bg-green-500' },
  { value: 'cancelled', label: 'ملغي', color: 'bg-red-500' },
];

const paymentStatusOptions = [
  { value: 'unpaid', label: 'غير مدفوع', color: 'text-red-600' },
  { value: 'partial', label: 'مدفوع جزئياً', color: 'text-yellow-600' },
  { value: 'paid', label: 'مدفوع', color: 'text-green-600' },
];

export default function GameOrdersManagement() {
  const { organizationId, userId } = useUser();
  const [orders, setOrders] = useState<GameOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<GameOrder | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (organizationId) {
      fetchOrders();
    }
  }, [organizationId]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('game_download_orders')
        .select(`
          *,
          game:games_catalog(name, platform),
          assigned_user:users!assigned_to(name)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setOrders(data || []);
    } catch (error: any) {
      toast.error('فشل في تحميل الطلبات');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedOrder || !newStatus || !userId) return;

    try {
      setUpdatingStatus(true);

      const { error } = await supabase.rpc('update_game_order_status', {
        order_id: selectedOrder.id,
        new_status: newStatus,
        user_id: userId,
        notes: statusNotes || null,
      });

      if (error) throw error;

      toast.success('تم تحديث حالة الطلب بنجاح');
      setShowStatusDialog(false);
      setSelectedOrder(null);
      setNewStatus('');
      setStatusNotes('');
      fetchOrders();
    } catch (error: any) {
      toast.error('فشل في تحديث حالة الطلب');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusOption = statusOptions.find(opt => opt.value === status);
    if (!statusOption) return null;

    return (
      <Badge className={`${statusOption.color} text-white`}>
        {statusOption.label}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const option = paymentStatusOptions.find(opt => opt.value === status);
    if (!option) return null;

    return (
      <span className={`font-medium ${option.color}`}>
        {option.label}
      </span>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'processing':
        return <Package className="h-4 w-4" />;
      case 'ready':
        return <CheckCircle className="h-4 w-4" />;
      case 'delivered':
        return <Truck className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const filteredOrders = orders.filter(order => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        order.tracking_number.toLowerCase().includes(searchLower) ||
        order.customer_name.toLowerCase().includes(searchLower) ||
        order.customer_phone.includes(searchTerm) ||
        order.game?.name.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">إدارة طلبات تحميل الألعاب</h2>
            <p className="text-muted-foreground">عرض وإدارة جميع طلبات تحميل الألعاب</p>
          </div>
          <Button onClick={fetchOrders} variant="outline">
            <Download className="ml-2 h-4 w-4" />
            تحديث
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>البحث والتصفية</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث برقم التتبع، اسم العميل، رقم الهاتف، أو اسم اللعبة..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="حالة الطلب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>قائمة الطلبات</CardTitle>
            <CardDescription>عدد الطلبات: {filteredOrders.length}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم التتبع</TableHead>
                    <TableHead>العميل</TableHead>
                    <TableHead>اللعبة</TableHead>
                    <TableHead>المنصة</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الدفع</TableHead>
                    <TableHead>المسؤول</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.tracking_number}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.customer_name}</div>
                          <div className="text-sm text-muted-foreground">{order.customer_phone}</div>
                          {order.customer_email && (
                            <div className="text-sm text-muted-foreground">{order.customer_email}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{order.game?.name || 'غير محدد'}</TableCell>
                      <TableCell>{order.game?.platform || 'غير محدد'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(order.status)}
                          {getStatusBadge(order.status)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          {getPaymentStatusBadge(order.payment_status)}
                          <div className="text-sm text-muted-foreground">
                            {order.amount_paid} / {order.price} دج
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{order.assigned_user?.name || 'غير محدد'}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(order.created_at), 'dd MMM yyyy', { locale: ar })}
                          <br />
                          {format(new Date(order.created_at), 'hh:mm a', { locale: ar })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedOrder(order);
                              setNewStatus(order.status);
                              setShowStatusDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredOrders.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد طلبات مطابقة للبحث
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تحديث حالة الطلب</DialogTitle>
            <DialogDescription>
              طلب رقم: {selectedOrder?.tracking_number}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>الحالة الجديدة</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الحالة" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>ملاحظات (اختياري)</Label>
              <Textarea
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                placeholder="أضف ملاحظات حول تحديث الحالة..."
                rows={3}
              />
            </div>

            {selectedOrder && selectedOrder.status_history.length > 0 && (
              <div className="space-y-2">
                <Label>سجل الحالات</Label>
                <div className="max-h-40 overflow-y-auto space-y-2 border rounded-lg p-3">
                  {selectedOrder.status_history.map((history: any, index: number) => (
                    <div key={index} className="text-sm">
                      <div className="flex justify-between">
                        <span>
                          {statusOptions.find(opt => opt.value === history.from_status)?.label} → 
                          {' '}{statusOptions.find(opt => opt.value === history.to_status)?.label}
                        </span>
                        <span className="text-muted-foreground">
                          {format(new Date(history.changed_at), 'dd/MM/yyyy hh:mm a', { locale: ar })}
                        </span>
                      </div>
                      {history.notes && (
                        <div className="text-muted-foreground mt-1">{history.notes}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowStatusDialog(false);
                setSelectedOrder(null);
                setNewStatus('');
                setStatusNotes('');
              }}
            >
              إلغاء
            </Button>
            <Button onClick={handleStatusUpdate} disabled={updatingStatus || !newStatus}>
              {updatingStatus ? 'جاري التحديث...' : 'تحديث الحالة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
