import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Printer, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Clock,
  DollarSign,
  CreditCard,
  AlertTriangle,
  Download,
  FileText,
  Save,
  Loader2,
  Package
} from 'lucide-react';
import { toast } from 'sonner';
import type { POSOrderWithDetails } from '../../api/posOrdersService';

interface POSOrderActionsProps {
  order: POSOrderWithDetails;
  onStatusUpdate: (orderId: string, status: string, notes?: string) => Promise<boolean>;
  onPaymentUpdate: (orderId: string, paymentStatus: string, amountPaid?: number, paymentMethod?: string) => Promise<boolean>;
  onDelete: (orderId: string) => Promise<boolean>;
  onPrint: (order: POSOrderWithDetails) => void;
  onRefresh: () => void;
  onEditItems?: (order: POSOrderWithDetails) => void;
  className?: string;
  permissions?: {
    updateStatus?: boolean;
    updatePayment?: boolean;
    delete?: boolean;
    editItems?: boolean;
    cancel?: boolean;
  };
}

type ActionType = 'status' | 'payment' | 'delete' | 'print' | null;

const ORDER_STATUSES = [
  { value: 'pending', label: 'معلقة', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'processing', label: 'قيد المعالجة', color: 'bg-blue-100 text-blue-800' },
  { value: 'completed', label: 'مكتملة', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: 'ملغاة', color: 'bg-red-100 text-red-800' }
];

const PAYMENT_STATUSES = [
  { value: 'pending', label: 'معلق', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'partial', label: 'جزئي', color: 'bg-orange-100 text-orange-800' },
  { value: 'paid', label: 'مدفوع', color: 'bg-green-100 text-green-800' },
  { value: 'refunded', label: 'مُسترد', color: 'bg-purple-100 text-purple-800' }
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'نقدي', icon: '💵' },
  { value: 'card', label: 'بطاقة', icon: '💳' },
  { value: 'credit', label: 'آجل', icon: '📝' },
  { value: 'transfer', label: 'تحويل', icon: '🏦' }
];

export const POSOrderActions: React.FC<POSOrderActionsProps> = ({
  order,
  onStatusUpdate,
  onPaymentUpdate,
  onDelete,
  onPrint,
  onRefresh,
  onEditItems,
  className = '',
  permissions
}) => {
  const [activeAction, setActiveAction] = useState<ActionType>(null);
  const [loading, setLoading] = useState(false);
  
  // حالة تحديث الطلبية
  const [newStatus, setNewStatus] = useState(order.status);
  const [statusNotes, setStatusNotes] = useState('');
  
  // حالة تحديث الدفع
  const [newPaymentStatus, setNewPaymentStatus] = useState(order.payment_status);
  const [newPaymentMethod, setNewPaymentMethod] = useState(order.payment_method);
  const [amountPaid, setAmountPaid] = useState(order.amount_paid || '0');

  // Permissions defaults (true if not provided)
  const allowEditItems = (permissions?.editItems ?? true) && !!onEditItems;
  const allowUpdateStatus = permissions?.updateStatus ?? true;
  const allowCancel = permissions?.cancel ?? allowUpdateStatus;
  const allowUpdatePayment = permissions?.updatePayment ?? true;
  const allowDelete = permissions?.delete ?? true;

  const formatCurrency = (amount: number | string): string => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('ar-DZ', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numAmount) + ' دج';
  };

  const handleStatusUpdate = async () => {
    if (newStatus === order.status && !statusNotes.trim()) {
      toast.error('لم يتم إجراء أي تغيير');
      return;
    }

    setLoading(true);
    try {
      const success = await onStatusUpdate(order.id, newStatus, statusNotes.trim() || undefined);
      if (success) {
        toast.success('تم تحديث حالة الطلبية بنجاح');
        setActiveAction(null);
        setStatusNotes('');
        onRefresh();
      } else {
        toast.error('فشل في تحديث حالة الطلبية');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء تحديث الطلبية');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentUpdate = async () => {
    const amountPaidNum = parseFloat(String(amountPaid)) || 0;
    const totalAmount = parseFloat(String(order.total));
    
    if (amountPaidNum > totalAmount) {
      toast.error('المبلغ المدفوع لا يمكن أن يكون أكبر من إجمالي الطلبية');
      return;
    }

    setLoading(true);
    try {
      const success = await onPaymentUpdate(
        order.id, 
        newPaymentStatus, 
        amountPaidNum,
        newPaymentMethod
      );
      
      if (success) {
        toast.success('تم تحديث معلومات الدفع بنجاح');
        setActiveAction(null);
        onRefresh();
      } else {
        toast.error('فشل في تحديث معلومات الدفع');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء تحديث الدفع');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const success = await onDelete(order.id);
      if (success) {
        toast.success('تم حذف الطلبية بنجاح');
        setActiveAction(null);
        onRefresh();
      } else {
        toast.error('فشل في حذف الطلبية');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء حذف الطلبية');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    try {
      onPrint(order);
      toast.success('تم إرسال الطلبية للطباعة');
    } catch (error) {
      toast.error('فشل في طباعة الطلبية');
    }
  };

  const getStatusInfo = (status: string) => {
    return ORDER_STATUSES.find(s => s.value === status) || ORDER_STATUSES[0];
  };

  const getPaymentStatusInfo = (status: string) => {
    return PAYMENT_STATUSES.find(s => s.value === status) || PAYMENT_STATUSES[0];
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* أزرار الإجراءات السريعة */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">إجراءات الطلبية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              طباعة الوصل
            </Button>

            {allowEditItems && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEditItems(order)}
                className="flex items-center gap-2"
              >
                <Package className="h-4 w-4" />
                تعديل العناصر
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveAction('status')}
              className="flex items-center gap-2"
              disabled={!allowUpdateStatus}
            >
              <Edit className="h-4 w-4" />
              تحديث الحالة
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveAction('payment')}
              className="flex items-center gap-2"
              disabled={!allowUpdatePayment}
            >
              <CreditCard className="h-4 w-4" />
              تحديث الدفع
            </Button>

            {order.status !== 'completed' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStatusUpdate(order.id, 'completed')}
                className="flex items-center gap-2 text-green-600 hover:text-green-700"
                disabled={!allowUpdateStatus}
              >
                <CheckCircle className="h-4 w-4" />
                تأكيد الطلبية
              </Button>
            )}

            {order.status !== 'cancelled' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStatusUpdate(order.id, 'cancelled')}
                className="flex items-center gap-2 text-orange-600 hover:text-orange-700"
                disabled={!allowCancel}
              >
                <XCircle className="h-4 w-4" />
                إلغاء الطلبية
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveAction('delete')}
              className="flex items-center gap-2 text-red-600 hover:text-red-700"
              disabled={!allowDelete}
            >
              <Trash2 className="h-4 w-4" />
              حذف الطلبية
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* معلومات الحالة الحالية */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">الحالة الحالية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">حالة الطلبية</Label>
              <div className="flex items-center gap-2">
                <Badge className={getStatusInfo(order.status).color}>
                  {getStatusInfo(order.status).label}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">حالة الدفع</Label>
              <div className="flex items-center gap-2">
                <Badge className={getPaymentStatusInfo(order.payment_status).color}>
                  {getPaymentStatusInfo(order.payment_status).label}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* حوار تحديث الحالة */}
      <Dialog open={activeAction === 'status'} onOpenChange={() => setActiveAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              تحديث حالة الطلبية
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>الحالة الجديدة</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${status.color.replace('bg-', 'bg-').replace(' text-', ' border-')}`} />
                        {status.label}
                      </div>
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveAction(null)}>
              إلغاء
            </Button>
            <Button onClick={handleStatusUpdate} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  جاري التحديث...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  حفظ التغييرات
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* حوار تحديث الدفع */}
      <Dialog open={activeAction === 'payment'} onOpenChange={() => setActiveAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              تحديث معلومات الدفع
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>حالة الدفع</Label>
                <Select value={newPaymentStatus} onValueChange={setNewPaymentStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${status.color.replace('bg-', 'bg-').replace(' text-', ' border-')}`} />
                          {status.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>طريقة الدفع</Label>
                <Select value={newPaymentMethod} onValueChange={setNewPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        <div className="flex items-center gap-2">
                          <span>{method.icon}</span>
                          {method.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>المبلغ المدفوع</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder="0"
                  className="pl-10"
                  min="0"
                  max={String(order.total)}
                  step="0.01"
                />
              </div>
              <div className="text-xs text-muted-foreground">
                إجمالي الطلبية: {formatCurrency(order.total)}
              </div>
            </div>

            {parseFloat(String(amountPaid)) > 0 && parseFloat(String(amountPaid)) < parseFloat(String(order.total)) && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2 text-orange-800">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">دفع جزئي</span>
                </div>
                <p className="text-sm text-orange-700 mt-1">
                  المبلغ المتبقي: {formatCurrency(parseFloat(String(order.total)) - parseFloat(String(amountPaid)))}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveAction(null)}>
              إلغاء
            </Button>
            <Button onClick={handlePaymentUpdate} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  جاري التحديث...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  حفظ التغييرات
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* حوار تأكيد الحذف */}
      <AlertDialog open={activeAction === 'delete'} onOpenChange={() => setActiveAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              تأكيد حذف الطلبية
            </AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من أنك تريد حذف هذه الطلبية؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {/* تحذير مهم حول إعادة المخزون */}
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <Package className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">ملاحظة مهمة:</p>
                <p>عند حذف هذه الطلبية، سيتم تلقائياً إعادة جميع الكميات المباعة إلى المخزون.</p>
              </div>
            </div>
          </div>
          
          <AlertDialogHeader>
          </AlertDialogHeader>
          
          <div className="bg-muted p-3 rounded-lg">
            <p><strong>رقم الطلبية:</strong> {order.slug?.slice(-8) || order.id.slice(-8)}</p>
            <p><strong>المبلغ:</strong> {formatCurrency(order.total)}</p>
            <p><strong>الحالة:</strong> {getStatusInfo(order.status).label}</p>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  جاري الحذف...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  حذف الطلبية
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
