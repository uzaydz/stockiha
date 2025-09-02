import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger  } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Package, 
  MoreVertical, 
  Eye, 
  Copy, 
  RefreshCw,
  User,
  Key,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  Save,
  Edit,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { SubscriptionTransaction } from './types';
import { toast } from 'sonner';
import { updateSubscriptionAccountInfo, deleteSubscriptionTransaction } from '@/api/subscription-transactions';
import { useOptimizedClickHandler } from "@/lib/performance-utils";

interface TransactionsTableProps {
  transactions: SubscriptionTransaction[];
  loading: boolean;
  onTransactionDeleted?: (transactionId: string) => void;
}

export const TransactionsTable: React.FC<TransactionsTableProps> = ({ 
  transactions, 
  loading,
  onTransactionDeleted 
}) => {
  const [selectedTransaction, setSelectedTransaction] = useState<SubscriptionTransaction | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [accountInfo, setAccountInfo] = useState({
    username: '',
    email: '',
    password: '',
    notes: ''
  });

  // تحويل التاريخ إلى تنسيق ميلادي مع أرقام عادية
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // تحويل الأرقام العربية إلى أرقام عادية
  const formatNumber = (num: number) => {
    return num.toString().replace(/[\u0660-\u0669]/g, (match) => {
      return String.fromCharCode(match.charCodeAt(0) - 1584);
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'مكتمل';
      case 'pending':
        return 'قيد الانتظار';
      case 'failed':
        return 'فشل';
      case 'refunded':
        return 'مسترد';
      default:
        return status;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'sale':
        return 'بيع';
      case 'refund':
        return 'إرجاع';
      case 'exchange':
        return 'تبديل';
      default:
        return type;
    }
  };

  const handleViewDetails = (transaction: SubscriptionTransaction) => {
    try {
      setSelectedTransaction(transaction);
      setIsDetailsDialogOpen(true);
    } catch (error) {
      toast.error('فشل في فتح تفاصيل المعاملة');
    }
  };

  const handleManageAccount = (transaction: SubscriptionTransaction) => {
    try {
      setSelectedTransaction(transaction);
      // تحميل معلومات الحساب المحفوظة إذا كانت موجودة
      setAccountInfo({
        username: transaction.account_username || '',
        email: transaction.account_email || '',
        password: transaction.account_password || '',
        notes: transaction.account_notes || ''
      });
      setIsAccountDialogOpen(true);
    } catch (error) {
      toast.error('فشل في فتح نافذة إدارة الحساب');
    }
  };

  const handleSaveAccount = async () => {
    if (!selectedTransaction) return;

    try {
      // التحقق من وجود بيانات للحفظ
      if (!accountInfo.username && !accountInfo.email && !accountInfo.password && !accountInfo.notes) {
        toast.error('يرجى إدخال معلومات الحساب أولاً');
        return;
      }

      // استدعاء دالة قاعدة البيانات لحفظ معلومات الحساب
      const result = await updateSubscriptionAccountInfo({
        transactionId: selectedTransaction.id,
        username: accountInfo.username || undefined,
        email: accountInfo.email || undefined,
        password: accountInfo.password || undefined,
        notes: accountInfo.notes || undefined
      });
      
      if (result.success) {
        toast.success('تم حفظ معلومات الحساب بنجاح');
        setIsAccountDialogOpen(false);
        
        // تحديث البيانات المحلية
        if (selectedTransaction) {
          selectedTransaction.account_username = accountInfo.username;
          selectedTransaction.account_email = accountInfo.email;
          selectedTransaction.account_password = accountInfo.password;
          selectedTransaction.account_notes = accountInfo.notes;
        }
      } else {
        throw new Error(result.message || 'فشل في حفظ معلومات الحساب');
      }
    } catch (error) {
      toast.error('فشل في حفظ معلومات الحساب: ' + (error as Error).message);
    }
  };

  const handleCopyId = (id: string) => {
    try {
      navigator.clipboard.writeText(id);
      toast.success('تم نسخ المعرف');
    } catch (error) {
      toast.error('فشل في نسخ المعرف');
    }
  };

  const handleCopyTrackingCode = (code: string) => {
    try {
      navigator.clipboard.writeText(code);
      toast.success('تم نسخ كود التتبع');
    } catch (error) {
      toast.error('فشل في نسخ كود التتبع');
    }
  };

  const handleDeleteTransaction = (transaction: SubscriptionTransaction) => {
    try {
      setSelectedTransaction(transaction);
      setIsDeleteDialogOpen(true);
    } catch (error) {
      toast.error('فشل في فتح نافذة الحذف');
    }
  };

  const confirmDeleteTransaction = async () => {
    if (!selectedTransaction) return;

    try {
      setIsDeleting(true);
      
      const result = await deleteSubscriptionTransaction(selectedTransaction.id);
      
      if (result.success) {
        toast.success('تم حذف الاشتراك بنجاح');
        setIsDeleteDialogOpen(false);
        setSelectedTransaction(null);
        
        // إشعار المكون الأب بالحذف لتحديث القائمة
        if (onTransactionDeleted) {
          onTransactionDeleted(selectedTransaction.id);
        }
      } else {
        throw new Error(result.message || 'فشل في حذف الاشتراك');
      }
    } catch (error) {
      toast.error('فشل في حذف الاشتراك: ' + (error as Error).message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>طلبات الاشتراكات</CardTitle>
          <CardDescription>
            عرض وإدارة جميع معاملات الاشتراكات
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">لا توجد معاملات مطابقة للفلاتر المحددة</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الخدمة</TableHead>
                  <TableHead>العميل</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>الربح</TableHead>
                  <TableHead>طريقة الدفع</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead className="w-[120px]">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {transaction.logo_url ? (
                          <img 
                            src={transaction.logo_url} 
                            alt={transaction.service_name}
                            className="w-8 h-8 rounded object-contain"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                            <Package className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{transaction.service_name}</div>
                          <div className="text-sm text-muted-foreground">{transaction.provider}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{transaction.customer_name || 'غير محدد'}</div>
                        {transaction.customer_contact && (
                          <div className="text-sm text-muted-foreground">{transaction.customer_contact}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{formatNumber(transaction.amount || 0)} دج</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-green-600">
                        {formatNumber(transaction.profit || 0)} دج
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{transaction.payment_method || 'غير محدد'}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(transaction.payment_status)}>
                        {getStatusText(transaction.payment_status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getTypeText(transaction.transaction_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDate(transaction.created_at)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatTime(transaction.created_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetails(transaction)}>
                            <Eye className="h-4 w-4 mr-2" />
                            تفاصيل الاشتراك
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleManageAccount(transaction)}>
                            <User className="h-4 w-4 mr-2" />
                            إدارة الحساب
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopyId(transaction.id)}>
                            <Copy className="h-4 w-4 mr-2" />
                            نسخ المعرف
                          </DropdownMenuItem>
                          {transaction.tracking_code && (
                            <DropdownMenuItem onClick={() => handleCopyTrackingCode(transaction.tracking_code)}>
                              <Copy className="h-4 w-4 mr-2" />
                              نسخ كود التتبع
                            </DropdownMenuItem>
                          )}
                          {transaction.payment_status === 'completed' && (
                            <DropdownMenuItem className="text-red-600">
                              <RefreshCw className="h-4 w-4 mr-2" />
                              استرداد
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => handleDeleteTransaction(transaction)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            حذف الاشتراك
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

      {/* نافذة تفاصيل الاشتراك */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={(open) => {
        setIsDetailsDialogOpen(open);
        if (!open) {
          setSelectedTransaction(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تفاصيل الاشتراك</DialogTitle>
            <DialogDescription>
              عرض تفاصيل شاملة لمعاملة الاشتراك
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-6">
              {/* معلومات الخدمة */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">اسم الخدمة</Label>
                  <div className="flex items-center gap-2">
                    {selectedTransaction.logo_url && (
                      <img 
                        src={selectedTransaction.logo_url} 
                        alt={selectedTransaction.service_name}
                        className="w-6 h-6 rounded object-contain"
                      />
                    )}
                    <span>{selectedTransaction.service_name}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">المزود</Label>
                  <div>{selectedTransaction.provider}</div>
                </div>
              </div>

              {/* معلومات العميل */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">اسم العميل</Label>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {selectedTransaction.customer_name || 'غير محدد'}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">معلومات الاتصال</Label>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {selectedTransaction.customer_contact || 'غير محدد'}
                  </div>
                </div>
              </div>

              {/* معلومات المالية */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">المبلغ</Label>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    {formatNumber(selectedTransaction.amount || 0)} دج
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">الربح</Label>
                  <div className="flex items-center gap-2 text-green-600">
                    <DollarSign className="h-4 w-4" />
                    {formatNumber(selectedTransaction.profit || 0)} دج
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">طريقة الدفع</Label>
                  <div>{selectedTransaction.payment_method || 'غير محدد'}</div>
                </div>
              </div>

              {/* معلومات الحالة والتاريخ */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">الحالة</Label>
                  <Badge variant={getStatusBadgeVariant(selectedTransaction.payment_status)}>
                    {getStatusText(selectedTransaction.payment_status)}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">النوع</Label>
                  <Badge variant="outline">
                    {getTypeText(selectedTransaction.transaction_type)}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">التاريخ</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <div>
                      <div>{formatDate(selectedTransaction.created_at)}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatTime(selectedTransaction.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* كود التتبع */}
              {selectedTransaction.tracking_code && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">كود التتبع</Label>
                  <div className="flex items-center gap-2">
                    <code className="bg-muted px-2 py-1 rounded text-sm">
                      {selectedTransaction.tracking_code}
                    </code>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleCopyTrackingCode(selectedTransaction.tracking_code)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ملاحظات */}
              {selectedTransaction.notes && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">ملاحظات</Label>
                  <div className="bg-muted p-3 rounded-md text-sm">
                    {selectedTransaction.notes}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* نافذة إدارة الحساب */}
      <Dialog open={isAccountDialogOpen} onOpenChange={(open) => {
        setIsAccountDialogOpen(open);
        if (!open) {
          setSelectedTransaction(null);
          setAccountInfo({
            username: '',
            email: '',
            password: '',
            notes: ''
          });
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إدارة حساب العميل</DialogTitle>
            <DialogDescription>
              إضافة أو تحديث معلومات حساب العميل للاشتراك
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">اسم المستخدم</Label>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  value={accountInfo.username}
                  onChange={(e) => setAccountInfo(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="اسم المستخدم"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={accountInfo.email}
                  onChange={(e) => setAccountInfo(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="البريد الإلكتروني"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={accountInfo.password}
                  onChange={(e) => setAccountInfo(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="كلمة المرور"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">ملاحظات</Label>
              <Textarea
                id="notes"
                value={accountInfo.notes}
                onChange={(e) => setAccountInfo(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="ملاحظات إضافية..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setIsAccountDialogOpen(false);
                setSelectedTransaction(null);
                setAccountInfo({
                  username: '',
                  email: '',
                  password: '',
                  notes: ''
                });
              }}>
                إلغاء
              </Button>
              <Button onClick={handleSaveAccount} disabled={!accountInfo.username && !accountInfo.email}>
                <Save className="h-4 w-4 mr-2" />
                حفظ
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* نافذة تأكيد حذف الاشتراك */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => {
        if (!isDeleting) {
          setIsDeleteDialogOpen(open);
          if (!open) {
            setSelectedTransaction(null);
          }
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              تأكيد حذف الاشتراك
            </DialogTitle>
            <DialogDescription>
              هذا الإجراء لا يمكن التراجع عنه. سيتم حذف الاشتراك نهائياً من النظام.
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  {selectedTransaction.logo_url && (
                    <img 
                      src={selectedTransaction.logo_url} 
                      alt={selectedTransaction.service_name}
                      className="w-8 h-8 rounded object-contain"
                    />
                  )}
                  <div>
                    <div className="font-medium text-red-900">{selectedTransaction.service_name}</div>
                    <div className="text-sm text-red-700">
                      {selectedTransaction.customer_name || 'غير محدد'} - {formatNumber(selectedTransaction.amount || 0)} دج
                    </div>
                    <div className="text-xs text-red-600">
                      {formatDate(selectedTransaction.created_at)} {formatTime(selectedTransaction.created_at)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsDeleteDialogOpen(false);
                    setSelectedTransaction(null);
                  }}
                  disabled={isDeleting}
                >
                  إلغاء
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={confirmDeleteTransaction}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      جاري الحذف...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      حذف نهائياً
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
