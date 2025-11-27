import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import {
  SupplierPurchase,
  Supplier,
  getSupplierPurchases,
  getSuppliers,
  updatePurchaseStatus,
  recordPayment,
  deletePurchase
} from '@/api/supplierService';
import { SupplierPaymentDialog } from './SupplierPaymentDialog';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  MoreHorizontal,
  Search,
  Plus,
  Loader2,
  Eye,
  FileEdit,
  BanIcon,
  CheckCircle2,
  ClipboardCheck,
  AlertCircle,
  CreditCard,
  DollarSign,
  RefreshCw,
  Trash2,
  X,
  Receipt
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

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

interface SupplierPurchasesListProps {
  onPurchaseCreate?: () => void;
  refreshTrigger?: number;
  onAddNewPurchase?: () => void;
}

export function SupplierPurchasesList({ onPurchaseCreate, refreshTrigger, onAddNewPurchase }: SupplierPurchasesListProps = {}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const perms = usePermissions();
  const { toast } = useToast();
  const [organizationId, setOrganizationId] = useState<string | undefined>(undefined);

  const [purchases, setPurchases] = useState<SupplierPurchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSupplierId, setSelectedSupplierId] = useState('all');

  const canCreatePurchase = perms.ready ? perms.anyOf(['canCreatePurchase','canManagePurchases']) : false;
  const canEditPurchase = perms.ready ? perms.anyOf(['canEditPurchase','canManagePurchases']) : false;
  const canDeletePurchase = perms.ready ? perms.anyOf(['canDeletePurchase','canManagePurchases']) : false;
  const canRecordSupplierPayment = perms.ready ? perms.anyOf(['canRecordSupplierPayment','canManageSupplierPayments']) : false;

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPurchaseForPayment, setSelectedPurchaseForPayment] = useState<SupplierPurchase | null>(null);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);
  const [deletingPurchase, setDeletingPurchase] = useState<string | null>(null);
  const [confirmationDialog, setConfirmationDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {}
  });

  useEffect(() => {
    if (user && 'organization_id' in user) {
      const userOrgId = (user as { organization_id?: string }).organization_id;
      if (userOrgId) {
        setOrganizationId(userOrgId);
        return;
      }
    }
    const storedOrgId = localStorage.getItem('currentOrganizationId') ||
                        localStorage.getItem('bazaar_organization_id');
    if (storedOrgId) {
      setOrganizationId(storedOrgId);
    }
  }, [user]);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!organizationId) return;

    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const suppliersData = await getSuppliers(organizationId);
      setSuppliers(suppliersData);
      const purchasesData = await getSupplierPurchases(organizationId);
      setPurchases(purchasesData);
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحميل البيانات',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [organizationId, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      refreshTimeoutRef.current = setTimeout(() => {
        loadData(true);
      }, 300);
    }
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [refreshTrigger, loadData]);

  const getSupplierName = useCallback((supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier ? supplier.name : 'غير معروف';
  }, [suppliers]);

  const statistics = useMemo(() => {
    if (!purchases.length) {
      return { totalAmount: 0, totalPaid: 0, totalRemaining: 0, count: 0 };
    }
    return {
      totalAmount: purchases.reduce((sum, p) => sum + (p.total_amount || 0), 0),
      totalPaid: purchases.reduce((sum, p) => sum + (p.paid_amount || 0), 0),
      totalRemaining: purchases.reduce((sum, p) => sum + (p.balance_due || 0), 0),
      count: purchases.length
    };
  }, [purchases]);

  const filteredPurchases = useMemo(() => {
    if (!purchases.length) return [];
    let filtered = [...purchases];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (purchase) =>
          purchase.purchase_number.toLowerCase().includes(query) ||
          (purchase.notes && purchase.notes.toLowerCase().includes(query)) ||
          getSupplierName(purchase.supplier_id).toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((purchase) => purchase.status === statusFilter);
    }

    if (selectedSupplierId !== 'all') {
      filtered = filtered.filter((purchase) => purchase.supplier_id === selectedSupplierId);
    }

    filtered.sort((a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime());
    return filtered;
  }, [purchases, searchQuery, statusFilter, selectedSupplierId, getSupplierName]);

  const handleStatusChange = async (purchaseId: string, newStatus: SupplierPurchase['status']) => {
    if (!organizationId) return;
    const purchase = purchases.find(p => p.id === purchaseId);
    if (!purchase) return;

    if (newStatus !== 'paid' && !canEditPurchase) {
      toast({ title: 'غير مصرح', description: 'لا تملك صلاحية تعديل حالة المشتريات', variant: 'destructive' });
      return;
    }

    if (newStatus === 'paid') {
      if (!canRecordSupplierPayment || !canEditPurchase) {
        toast({ title: 'غير مصرح', description: 'لا تملك صلاحية تسجيل دفعة', variant: 'destructive' });
        return;
      }
      setConfirmationDialog({
        open: true,
        title: 'تأكيد الدفع الكامل',
        description: `تسديد ${purchase.balance_due.toFixed(2)} دج لفاتورة ${purchase.purchase_number}؟`,
        onConfirm: () => handleFullPayment(purchase)
      });
      return;
    }

    if (newStatus === 'cancelled') {
      setConfirmationDialog({
        open: true,
        title: 'تأكيد الإلغاء',
        description: `إلغاء فاتورة ${purchase.purchase_number}؟`,
        onConfirm: () => performStatusChange(purchaseId, newStatus)
      });
      return;
    }

    performStatusChange(purchaseId, newStatus);
  };

  const performStatusChange = async (purchaseId: string, newStatus: SupplierPurchase['status']) => {
    try {
      await updatePurchaseStatus(organizationId!, purchaseId, newStatus);
      setPurchases(prevPurchases =>
        prevPurchases.map(purchase =>
          purchase.id === purchaseId ? { ...purchase, status: newStatus } : purchase
        )
      );
      toast({ title: 'تم التحديث', description: 'تم تحديث الحالة بنجاح' });
    } catch (error) {
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء التحديث', variant: 'destructive' });
    }
  };

  const handleFullPayment = async (purchase: SupplierPurchase) => {
    if (!organizationId || purchase.balance_due <= 0) return;
    setProcessingPayment(purchase.id);
    try {
      const result = await recordPayment(organizationId, {
        supplier_id: purchase.supplier_id,
        purchase_id: purchase.id,
        payment_date: new Date().toISOString(),
        amount: purchase.balance_due,
        payment_method: 'cash',
        notes: 'دفع كامل',
        is_full_payment: true
      });

      if (result) {
        setPurchases(prevPurchases =>
          prevPurchases.map(p =>
            p.id === purchase.id
              ? { ...p, paid_amount: p.total_amount, balance_due: 0, status: 'paid' as SupplierPurchase['status'], payment_status: 'paid' as SupplierPurchase['payment_status'] }
              : p
          )
        );
      }
      toast({ title: 'تم الدفع', description: 'تم تسجيل الدفعة بنجاح' });
    } catch (error) {
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء الدفع', variant: 'destructive' });
    } finally {
      setProcessingPayment(null);
    }
  };

  const handleAddPayment = (purchase: SupplierPurchase) => {
    if (!canRecordSupplierPayment) {
      toast({ title: 'غير مصرح', description: 'لا تملك صلاحية تسجيل دفعات', variant: 'destructive' });
      return;
    }
    setSelectedPurchaseForPayment(purchase);
    setPaymentDialogOpen(true);
  };

  const handleSavePayment = async (paymentData: any) => {
    if (!organizationId) return;
    try {
      const result = await recordPayment(organizationId, paymentData);
      if (result && paymentData.purchase_id) {
        setPurchases(prevPurchases =>
          prevPurchases.map(purchase => {
            if (purchase.id === paymentData.purchase_id) {
              const newPaidAmount = Number(purchase.paid_amount) + Number(paymentData.amount);
              const newBalanceDue = Math.max(0, Number(purchase.total_amount) - newPaidAmount);
              let newStatus = purchase.status;
              let newPaymentStatus = 'partially_paid';
              if (newBalanceDue < 0.01) {
                newStatus = 'paid';
                newPaymentStatus = 'paid';
              }
              return { ...purchase, paid_amount: newPaidAmount, balance_due: newBalanceDue, status: newStatus as SupplierPurchase['status'], payment_status: newPaymentStatus as SupplierPurchase['payment_status'] };
            }
            return purchase;
          })
        );
      } else {
        const purchasesData = await getSupplierPurchases(organizationId);
        setPurchases(purchasesData);
      }
      setPaymentDialogOpen(false);
      setSelectedPurchaseForPayment(null);
      toast({ title: 'تم الحفظ', description: 'تم تسجيل الدفعة بنجاح' });
    } catch (error) {
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء تسجيل الدفعة', variant: 'destructive' });
      throw error;
    }
  };

  const handleDeletePurchase = (purchase: SupplierPurchase) => {
    setConfirmationDialog({
      open: true,
      title: 'تأكيد الحذف',
      description: `حذف المشتريات "${purchase.purchase_number}"؟`,
      onConfirm: () => performDeletePurchase(purchase.id)
    });
  };

  const performDeletePurchase = async (purchaseId: string) => {
    if (!organizationId || !canDeletePurchase) return;
    setDeletingPurchase(purchaseId);
    try {
      const success = await deletePurchase(organizationId, purchaseId);
      if (success) {
        toast({ title: 'تم الحذف', description: 'تم حذف المشتريات بنجاح' });
        loadData();
      }
    } catch (error) {
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء الحذف', variant: 'destructive' });
    } finally {
      setDeletingPurchase(null);
      setConfirmationDialog({ open: false, title: '', description: '', onConfirm: () => {} });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-DZ').format(amount) + ' دج';
  };

  const isOverdue = useCallback((purchase: SupplierPurchase) => {
    if (!purchase.due_date || purchase.status === 'paid' || purchase.status === 'cancelled') return false;
    return new Date(purchase.due_date) < new Date() && purchase.balance_due > 0;
  }, []);

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'مسودة',
      confirmed: 'مؤكدة',
      partially_paid: 'جزئية',
      paid: 'مدفوعة',
      overdue: 'متأخرة',
      cancelled: 'ملغاة'
    };
    return labels[status] || status;
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || selectedSupplierId !== 'all';

  return (
    <div className="space-y-4">
      {/* الإحصائيات - تصميم بسيط */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">إجمالي المشتريات</p>
            <p className="text-lg font-bold mt-1">{formatCurrency(statistics.totalAmount)}</p>
            <p className="text-xs text-muted-foreground">{statistics.count} فاتورة</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">المدفوع</p>
            <p className="text-lg font-bold mt-1 text-primary">{formatCurrency(statistics.totalPaid)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">المتبقي</p>
            <p className="text-lg font-bold mt-1">{formatCurrency(statistics.totalRemaining)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">نسبة التحصيل</p>
            <p className="text-lg font-bold mt-1 text-primary">
              {statistics.totalAmount > 0 ? ((statistics.totalPaid / statistics.totalAmount) * 100).toFixed(0) : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* الجدول الرئيسي */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              قائمة المشتريات
              {isRefreshing && <Loader2 className="h-4 w-4 animate-spin" />}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => loadData(true)} disabled={isLoading || isRefreshing}>
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              </Button>
              {canCreatePurchase && (
                <Button size="sm" onClick={() => onAddNewPurchase ? onAddNewPurchase() : navigate('/dashboard/supplier-operations/purchases')}>
                  <Plus className="h-4 w-4 ml-1" />
                  إضافة
                </Button>
              )}
            </div>
          </div>

          {/* البحث والفلاتر */}
          <div className="flex flex-col sm:flex-row gap-2 mt-3">
            <div className="relative flex-1">
              <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث..."
                className="pr-8 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <Button variant="ghost" size="sm" className="absolute left-1 top-1 h-7 w-7 p-0" onClick={() => setSearchQuery('')}>
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="draft">مسودة</SelectItem>
                <SelectItem value="confirmed">مؤكدة</SelectItem>
                <SelectItem value="partially_paid">جزئية</SelectItem>
                <SelectItem value="paid">مدفوعة</SelectItem>
                <SelectItem value="overdue">متأخرة</SelectItem>
                <SelectItem value="cancelled">ملغاة</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue placeholder="المورد" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الموردين</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name.length > 20 ? s.name.slice(0, 20) + '...' : s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-9" onClick={() => { setSearchQuery(''); setStatusFilter('all'); setSelectedSupplierId('all'); }}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="mr-2 text-muted-foreground">جاري التحميل...</span>
            </div>
          ) : filteredPurchases.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="h-10 w-10 mx-auto text-muted-foreground/50" />
              <p className="mt-2 text-muted-foreground">{hasActiveFilters ? 'لا توجد نتائج' : 'لا توجد مشتريات'}</p>
              {!hasActiveFilters && canCreatePurchase && (
                <Button variant="outline" size="sm" className="mt-3" onClick={() => onAddNewPurchase ? onAddNewPurchase() : navigate('/dashboard/supplier-operations/purchases')}>
                  <Plus className="h-4 w-4 ml-1" />
                  إضافة مشتريات
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-medium">رقم الفاتورة</TableHead>
                    <TableHead className="font-medium">المورد</TableHead>
                    <TableHead className="font-medium">التاريخ</TableHead>
                    <TableHead className="font-medium text-left">الإجمالي</TableHead>
                    <TableHead className="font-medium text-left">المدفوع</TableHead>
                    <TableHead className="font-medium text-left">المتبقي</TableHead>
                    <TableHead className="font-medium">الحالة</TableHead>
                    <TableHead className="font-medium w-[100px]">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchases.map((purchase) => (
                    <TableRow key={purchase.id} className={cn("group", isOverdue(purchase) && "bg-destructive/5")}>
                      <TableCell className="font-medium">{purchase.purchase_number}</TableCell>
                      <TableCell>
                        <span className="max-w-[150px] truncate block" title={getSupplierName(purchase.supplier_id)}>
                          {getSupplierName(purchase.supplier_id)}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(purchase.purchase_date), 'dd/MM/yyyy', { locale: ar })}
                      </TableCell>
                      <TableCell className="font-medium text-left">{formatCurrency(purchase.total_amount)}</TableCell>
                      <TableCell className="text-primary text-left">{formatCurrency(purchase.paid_amount)}</TableCell>
                      <TableCell className={cn("font-medium text-left", purchase.balance_due > 0 ? "text-destructive" : "text-primary")}>
                        {formatCurrency(purchase.balance_due)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          purchase.status === 'paid' ? 'default' :
                          purchase.status === 'cancelled' ? 'secondary' :
                          isOverdue(purchase) ? 'destructive' : 'outline'
                        } className="text-xs">
                          {isOverdue(purchase) ? 'متأخرة' : getStatusLabel(purchase.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {purchase.balance_due > 0 && purchase.status !== 'cancelled' && canRecordSupplierPayment && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => handleAddPayment(purchase)}
                              disabled={processingPayment === purchase.id}
                            >
                              <CreditCard className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {purchase.balance_due > 0 && purchase.status !== 'cancelled' && canEditPurchase && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-primary hover:text-primary"
                              onClick={() => handleStatusChange(purchase.id, 'paid')}
                              disabled={processingPayment === purchase.id}
                            >
                              {processingPayment === purchase.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <DollarSign className="h-3.5 w-3.5" />}
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => navigate(`/dashboard/suppliers/purchases/${purchase.id}`)}>
                                <Eye className="ml-2 h-4 w-4" />
                                عرض
                              </DropdownMenuItem>
                              {purchase.status !== 'cancelled' && canEditPurchase && (
                                <DropdownMenuItem onClick={() => navigate(`/dashboard/suppliers/purchases/${purchase.id}/edit`)}>
                                  <FileEdit className="ml-2 h-4 w-4" />
                                  تعديل
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {purchase.status !== 'confirmed' && purchase.status !== 'cancelled' && canEditPurchase && (
                                <DropdownMenuItem onClick={() => handleStatusChange(purchase.id, 'confirmed')}>
                                  <ClipboardCheck className="ml-2 h-4 w-4" />
                                  تأكيد
                                </DropdownMenuItem>
                              )}
                              {purchase.status !== 'overdue' && purchase.balance_due > 0 && purchase.status !== 'cancelled' && canEditPurchase && (
                                <DropdownMenuItem onClick={() => handleStatusChange(purchase.id, 'overdue')}>
                                  <AlertCircle className="ml-2 h-4 w-4" />
                                  تأخير
                                </DropdownMenuItem>
                              )}
                              {purchase.status !== 'cancelled' && canEditPurchase && (
                                <DropdownMenuItem onClick={() => handleStatusChange(purchase.id, 'cancelled')} className="text-destructive">
                                  <BanIcon className="ml-2 h-4 w-4" />
                                  إلغاء
                                </DropdownMenuItem>
                              )}
                              {(['draft', 'confirmed'].includes(purchase.status)) && canDeletePurchase && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleDeletePurchase(purchase)} className="text-destructive" disabled={deletingPurchase === purchase.id}>
                                    {deletingPurchase === purchase.id ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Trash2 className="ml-2 h-4 w-4" />}
                                    حذف
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* ملخص الجدول */}
              <div className="border-t px-4 py-3 text-sm text-muted-foreground flex flex-wrap items-center justify-between gap-2">
                <span>{filteredPurchases.length} من {purchases.length}</span>
                <div className="flex items-center gap-4">
                  <span>الإجمالي: <strong className="text-foreground">{formatCurrency(filteredPurchases.reduce((s, p) => s + p.total_amount, 0))}</strong></span>
                  <span>المتبقي: <strong className="text-destructive">{formatCurrency(filteredPurchases.reduce((s, p) => s + p.balance_due, 0))}</strong></span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* حوار التأكيد */}
      <AlertDialog open={confirmationDialog.open} onOpenChange={(open) => setConfirmationDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmationDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmationDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => { confirmationDialog.onConfirm(); setConfirmationDialog(prev => ({ ...prev, open: false })); }}>
              تأكيد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* حوار الدفع */}
      <SupplierPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        suppliers={suppliers}
        supplierPurchases={purchases}
        selectedSupplierId={selectedPurchaseForPayment?.supplier_id}
        selectedPurchaseId={selectedPurchaseForPayment?.id}
        onSave={handleSavePayment}
        onClose={() => { setPaymentDialogOpen(false); setSelectedPurchaseForPayment(null); }}
      />
    </div>
  );
}
