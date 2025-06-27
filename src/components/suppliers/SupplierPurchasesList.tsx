import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { 
  SupplierPurchase, 
  Supplier, 
  getSupplierPurchases, 
  getSuppliers,
  updatePurchaseStatus,
  recordPayment
} from '@/api/supplierService';
import { SupplierPaymentDialog } from './SupplierPaymentDialog';
import { 
  Card, 
  CardContent, 
  CardDescription, 
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { 
  MoreVertical, 
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
  RefreshCw
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
  onPurchaseCreate?: () => void; // callback عند إنشاء مشتريات جديدة
  refreshTrigger?: number; // trigger لإعادة التحميل
}

export function SupplierPurchasesList({ onPurchaseCreate, refreshTrigger }: SupplierPurchasesListProps = {}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [organizationId, setOrganizationId] = useState<string | undefined>(undefined);
  
  const [purchases, setPurchases] = useState<SupplierPurchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false); // للتمييز بين التحميل الأولي وإعادة التحميل
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null); // لـ debouncing التحديثات
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedSupplierId, setSelectedSupplierId] = useState('all');
  
  // حالات جديدة للدفعات والتأكيدات
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPurchaseForPayment, setSelectedPurchaseForPayment] = useState<SupplierPurchase | null>(null);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null); // معرف المشتريات التي يتم معالجة دفعتها
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
  
  // تحديد organization_id عند تهيئة المكون
  useEffect(() => {
    // محاولة الحصول على organization_id من كائن المستخدم
    if (user && 'organization_id' in user) {
      
      setOrganizationId((user as any).organization_id);
      return;
    }
    
    // محاولة الحصول من التخزين المحلي
    const storedOrgId = localStorage.getItem('bazaar_organization_id');
    if (storedOrgId) {
      
      setOrganizationId(storedOrgId);
      return;
    }
    
    // القيمة الاحتياطية النهائية (يمكن تغييرها حسب احتياجك)
    
    setOrganizationId("10c02497-45d4-417a-857b-ad383816d7a0");
  }, [user]);
  
  // دالة تحميل البيانات
  const loadData = useCallback(async (isRefresh = false) => {
    if (!organizationId) return;
    
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    
    try {
      // جلب الموردين
      const suppliersData = await getSuppliers(organizationId);
      setSuppliers(suppliersData);
      
      // جلب المشتريات
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

  // جلب البيانات عند التهيئة
  useEffect(() => {
    loadData();
  }, [loadData]);

  // إزالة التحديث التلقائي المفرط - سيتم التحديث فقط عند الحاجة الفعلية

  // إعادة تحميل البيانات عند تغيير refreshTrigger مع debouncing
  useEffect(() => {
    if (refreshTrigger > 0) { // تحديث فقط عندما يكون هناك trigger فعلي
      // إلغاء أي timeout سابق
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      
      // تأخير التحديث لتجنب التحديثات المتعددة
      refreshTimeoutRef.current = setTimeout(() => {
        loadData(true); // تمرير true للإشارة أنها عملية تحديث
      }, 300); // تأخير 300ms
    }
    
    // تنظيف timeout عند unmount
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [refreshTrigger, loadData]);
  
  // تطبيق الفلترة باستخدام useMemo لتحسين الأداء
  const filteredPurchases = useMemo(() => {
    if (!purchases.length) return [];
    
    let filtered = [...purchases];
    
    // تطبيق البحث
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (purchase) =>
          purchase.purchase_number.toLowerCase().includes(query) ||
          (purchase.notes && purchase.notes.toLowerCase().includes(query))
      );
    }
    
    // تطبيق فلتر الحالة
    if (statusFilter !== 'all') {
      filtered = filtered.filter((purchase) => purchase.status === statusFilter);
    }
    
    // تطبيق فلتر المورد
    if (selectedSupplierId !== 'all') {
      filtered = filtered.filter((purchase) => purchase.supplier_id === selectedSupplierId);
    }
    
    // تطبيق فلتر التاريخ
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneMonthAgo = new Date(today);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    if (dateFilter !== 'all') {
      filtered = filtered.filter((purchase) => {
        const purchaseDate = new Date(purchase.purchase_date);
        
        switch (dateFilter) {
          case 'today':
            return purchaseDate >= today;
          case 'week':
            return purchaseDate >= oneWeekAgo;
          case 'month':
            return purchaseDate >= oneMonthAgo;
          default:
            return true;
        }
      });
    }
    
    return filtered;
  }, [purchases, searchQuery, statusFilter, dateFilter, selectedSupplierId]);
  
  // تغيير حالة المشتريات مع التأكيد
  const handleStatusChange = async (purchaseId: string, newStatus: SupplierPurchase['status']) => {
    if (!organizationId) return;
    
    const purchase = purchases.find(p => p.id === purchaseId);
    if (!purchase) return;

    // إظهار تأكيد للحالات الحساسة
    if (newStatus === 'paid') {
      setConfirmationDialog({
        open: true,
        title: 'تأكيد الدفع الكامل',
        description: `هل أنت متأكد من أنك تريد تسديد المبلغ الكامل (${purchase.balance_due.toFixed(2)} دج) لفاتورة ${purchase.purchase_number}؟ سيتم تسجيل دفعة تلقائيًا.`,
        onConfirm: () => handleFullPayment(purchase)
      });
      return;
    }
    
    if (newStatus === 'cancelled') {
      setConfirmationDialog({
        open: true,
        title: 'تأكيد الإلغاء',
        description: `هل أنت متأكد من أنك تريد إلغاء فاتورة ${purchase.purchase_number}؟ لا يمكن التراجع عن هذا الإجراء.`,
        onConfirm: () => performStatusChange(purchaseId, newStatus)
      });
      return;
    }

    // للحالات الأخرى، تنفيذ التغيير مباشرة
    performStatusChange(purchaseId, newStatus);
  };

  // تنفيذ تغيير الحالة
  const performStatusChange = async (purchaseId: string, newStatus: SupplierPurchase['status']) => {
    try {
      await updatePurchaseStatus(organizationId!, purchaseId, newStatus);
      
      // تحديث القائمة
      setPurchases(prevPurchases => 
        prevPurchases.map(purchase => 
          purchase.id === purchaseId
            ? { ...purchase, status: newStatus }
            : purchase
        )
      );
      
      toast({
        title: 'تم التحديث',
        description: 'تم تحديث حالة المشتريات بنجاح',
      });
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحديث حالة المشتريات',
        variant: 'destructive',
      });
    }
  };

  // معالجة الدفع الكامل
  const handleFullPayment = async (purchase: SupplierPurchase) => {
    if (!organizationId || purchase.balance_due <= 0) return;

    setProcessingPayment(purchase.id);
    try {
      // تسجيل دفعة تلقائية للمبلغ المتبقي
      const result = await recordPayment(organizationId, {
        supplier_id: purchase.supplier_id,
        purchase_id: purchase.id,
        payment_date: new Date().toISOString(),
        amount: purchase.balance_due,
        payment_method: 'cash',
        notes: 'دفع كامل تلقائي من الجدول',
        is_full_payment: true
      });

      if (result) {
        // تحديث البيانات محلياً
        setPurchases(prevPurchases => 
          prevPurchases.map(p => 
            p.id === purchase.id 
              ? { 
                  ...p, 
                  paid_amount: p.total_amount,
                  balance_due: 0,
                  status: 'paid' as SupplierPurchase['status'],
                  payment_status: 'paid' as SupplierPurchase['payment_status']
                }
              : p
          )
        );
      }

      toast({
        title: 'تم الدفع',
        description: 'تم تسجيل الدفعة وتحديث حالة المشتريات بنجاح',
      });
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تسجيل الدفعة',
        variant: 'destructive',
      });
    } finally {
      setProcessingPayment(null);
    }
  };

  // فتح حوار الدفع لمشتريات محددة
  const handleAddPayment = (purchase: SupplierPurchase) => {
    setSelectedPurchaseForPayment(purchase);
    setPaymentDialogOpen(true);
  };

  // حفظ دفعة جديدة
  const handleSavePayment = async (paymentData: any) => {
    if (!organizationId) return;

    try {
      const result = await recordPayment(organizationId, paymentData);
      
      if (result && paymentData.purchase_id) {
        // تحديث البيانات محلياً بدلاً من إعادة التحميل الكاملة
        setPurchases(prevPurchases => 
          prevPurchases.map(purchase => {
            if (purchase.id === paymentData.purchase_id) {
              const newPaidAmount = Number(purchase.paid_amount) + Number(paymentData.amount);
              const newBalanceDue = Math.max(0, Number(purchase.total_amount) - newPaidAmount);
              
              // تحديد الحالة الجديدة
              let newStatus = purchase.status;
              let newPaymentStatus = 'partially_paid';
              
              if (newBalanceDue < 0.01) {
                newStatus = 'paid';
                newPaymentStatus = 'paid';
              } else if (newPaidAmount === 0) {
                newPaymentStatus = 'unpaid';
              }
              
              return {
                ...purchase,
                paid_amount: newPaidAmount,
                balance_due: newBalanceDue,
                status: newStatus as SupplierPurchase['status'],
                payment_status: newPaymentStatus as SupplierPurchase['payment_status']
              };
            }
            return purchase;
          })
        );
      } else {
        // في حالة عدم الربط بمشتريات، إعادة تحميل البيانات
        const purchasesData = await getSupplierPurchases(organizationId);
        setPurchases(purchasesData);
      }

      setPaymentDialogOpen(false);
      setSelectedPurchaseForPayment(null);

      toast({
        title: 'تم الحفظ',
        description: 'تم تسجيل الدفعة بنجاح',
      });
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تسجيل الدفعة',
        variant: 'destructive',
      });
      throw error;
    }
  };
  
  // الحصول على اسم المورد من معرفه
  const getSupplierName = useCallback((supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier ? supplier.name : 'غير معروف';
  }, [suppliers]);
  
  // عرض حالة المشتريات بشكل ملائم
  const renderStatusBadge = (status: SupplierPurchase['status']) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">مسودة</Badge>;
      case 'confirmed':
        return <Badge variant="default">مؤكدة</Badge>;
      case 'partially_paid':
        return <Badge variant="secondary">مدفوعة جزئياً</Badge>;
      case 'paid':
        return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">مدفوعة</Badge>;
      case 'overdue':
        return <Badge variant="destructive">متأخرة</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-muted">ملغاة</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // عرض شارة حالة الدفع
  const renderPaymentStatusBadge = (purchase: SupplierPurchase) => {
    const paymentStatus = purchase.payment_status || 'unpaid';
    
    switch (paymentStatus) {
      case 'unpaid':
        return <Badge variant="outline" className="text-red-600 border-red-200">غير مدفوع</Badge>;
      case 'partially_paid':
        return <Badge variant="secondary" className="text-orange-600">جزئي</Badge>;
      case 'paid':
        return <Badge variant="default" className="bg-green-100 text-green-800">مدفوع</Badge>;
      default:
        return <Badge variant="outline">{paymentStatus}</Badge>;
    }
  };

  // تحديد ما إذا كانت المشتريات متأخرة
  const isOverdue = useCallback((purchase: SupplierPurchase) => {
    if (!purchase.due_date || purchase.status === 'paid' || purchase.status === 'cancelled') {
      return false;
    }
    return new Date(purchase.due_date) < new Date() && purchase.balance_due > 0;
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              قائمة المشتريات
              {isRefreshing && (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              )}
            </CardTitle>
            <CardDescription>
              إدارة مشتريات الموردين وتتبع حالتها
              {isRefreshing && (
                <span className="text-blue-600 mr-2">• جاري التحديث...</span>
              )}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                // تحديث فوري عند الضغط على الزر
                loadData(true);
                toast({
                  title: 'تم التحديث',
                  description: 'تم تحديث قائمة المشتريات',
                });
              }}
              disabled={isLoading || isRefreshing}
              title="تحديث القائمة"
            >
              <RefreshCw className={`h-4 w-4 ml-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
            <Button onClick={() => {
            
            try {
              // نتأكد من أننا نستخدم window.location بدلاً من navigate في حالة وجود مشاكل مع الـ React Router
              if (window.location.pathname.includes('/new')) {
                
                window.location.reload();
              } else {
                navigate('/dashboard/suppliers/purchases/new');
                // استخدم window.location كخطة بديلة إذا لم يعمل navigate
                setTimeout(() => {
                  if (!window.location.pathname.includes('/new')) {
                    
                    window.location.href = '/dashboard/suppliers/purchases/new';
                  }
                }, 100);
              }
            } catch (error) {
              // النقطة النهائية - تغيير المسار مباشرة
              window.location.href = '/dashboard/suppliers/purchases/new';
            }
          }}>
            <Plus className="h-4 w-4 ml-2" />
            إضافة مشتريات
          </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* أدوات البحث والفلترة */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث عن رقم الفاتورة..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="draft">مسودة</SelectItem>
                <SelectItem value="confirmed">مؤكدة</SelectItem>
                <SelectItem value="partially_paid">مدفوعة جزئياً</SelectItem>
                <SelectItem value="paid">مدفوعة</SelectItem>
                <SelectItem value="overdue">متأخرة</SelectItem>
                <SelectItem value="cancelled">ملغاة</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="المورد" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الموردين</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="التاريخ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع التواريخ</SelectItem>
                <SelectItem value="today">اليوم</SelectItem>
                <SelectItem value="week">آخر أسبوع</SelectItem>
                <SelectItem value="month">آخر شهر</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* جدول المشتريات */}
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredPurchases.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            لا توجد مشتريات مطابقة لمعايير البحث
          </div>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الفاتورة</TableHead>
                  <TableHead>المورد</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الاستحقاق</TableHead>
                  <TableHead>المبلغ الإجمالي</TableHead>
                  <TableHead>المدفوع</TableHead>
                  <TableHead>المتبقي</TableHead>
                  <TableHead>حالة الطلب</TableHead>
                  <TableHead>حالة الدفع</TableHead>
                  <TableHead>دفع سريع</TableHead>
                  <TableHead className="text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPurchases.map((purchase) => (
                  <TableRow key={purchase.id} className={isOverdue(purchase) ? 'bg-red-50' : ''}>
                    <TableCell className="font-medium">{purchase.purchase_number}</TableCell>
                    <TableCell>{getSupplierName(purchase.supplier_id)}</TableCell>
                    <TableCell>
                      {format(new Date(purchase.purchase_date), 'dd/MM/yyyy', { locale: ar })}
                    </TableCell>
                    <TableCell>
                      {purchase.due_date ? (
                        <div className={isOverdue(purchase) ? 'text-red-600 font-medium' : ''}>
                          {format(new Date(purchase.due_date), 'dd/MM/yyyy', { locale: ar })}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{purchase.total_amount.toFixed(2)} دج</TableCell>
                    <TableCell className="text-green-600">{purchase.paid_amount.toFixed(2)} دج</TableCell>
                    <TableCell className={purchase.balance_due > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                      {purchase.balance_due.toFixed(2)} دج
                    </TableCell>
                    <TableCell>{renderStatusBadge(purchase.status)}</TableCell>
                    <TableCell>{renderPaymentStatusBadge(purchase)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {purchase.balance_due > 0 && purchase.status !== 'cancelled' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAddPayment(purchase)}
                              title="إضافة دفعة"
                              disabled={processingPayment === purchase.id}
                            >
                              <CreditCard className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleStatusChange(purchase.id, 'paid')}
                              title="دفع كامل"
                              className="bg-green-600 hover:bg-green-700"
                              disabled={processingPayment === purchase.id}
                            >
                              {processingPayment === purchase.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <DollarSign className="h-3 w-3" />
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">فتح القائمة</span>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>العرض والتعديل</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => navigate(`/dashboard/suppliers/purchases/${purchase.id}`)}>
                            <Eye className="ml-2 h-4 w-4" />
                            <span>عرض التفاصيل</span>
                          </DropdownMenuItem>
                          {purchase.status !== 'cancelled' && (
                            <DropdownMenuItem onClick={() => navigate(`/dashboard/suppliers/purchases/${purchase.id}/edit`)}>
                              <FileEdit className="ml-2 h-4 w-4" />
                              <span>تعديل</span>
                            </DropdownMenuItem>
                          )}
                          
                          {/* خيارات الدفع */}
                          {purchase.balance_due > 0 && purchase.status !== 'cancelled' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel>إدارة المدفوعات</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleAddPayment(purchase)}>
                                <CreditCard className="ml-2 h-4 w-4 text-blue-600" />
                                <span>إضافة دفعة</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(purchase.id, 'paid')}>
                                <CheckCircle2 className="ml-2 h-4 w-4 text-green-600" />
                                <span>تسديد كامل ({purchase.balance_due.toFixed(2)} دج)</span>
                              </DropdownMenuItem>
                            </>
                          )}
                          
                          <DropdownMenuSeparator />
                          
                          {/* خيارات تغيير الحالة */}
                          <DropdownMenuLabel>تغيير الحالة</DropdownMenuLabel>
                          {purchase.status !== 'confirmed' && purchase.status !== 'cancelled' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(purchase.id, 'confirmed')}>
                              <ClipboardCheck className="ml-2 h-4 w-4 text-green-600" />
                              <span>تأكيد الطلب</span>
                            </DropdownMenuItem>
                          )}
                          {purchase.status !== 'overdue' && purchase.balance_due > 0 && purchase.status !== 'cancelled' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(purchase.id, 'overdue')}>
                              <AlertCircle className="ml-2 h-4 w-4 text-amber-600" />
                              <span>تأخير الدفع</span>
                            </DropdownMenuItem>
                          )}
                          {purchase.status !== 'cancelled' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(purchase.id, 'cancelled')}>
                              <BanIcon className="ml-2 h-4 w-4 text-red-600" />
                              <span>إلغاء الطلب</span>
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* حوار تأكيد العمليات */}
      <AlertDialog open={confirmationDialog.open} onOpenChange={(open) => 
        setConfirmationDialog(prev => ({ ...prev, open }))
      }>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmationDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmationDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => setConfirmationDialog(prev => ({ ...prev, open: false }))}
            >
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                confirmationDialog.onConfirm();
                setConfirmationDialog(prev => ({ ...prev, open: false }));
              }}
            >
              تأكيد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* حوار إضافة دفعة */}
      <SupplierPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        suppliers={suppliers}
        supplierPurchases={purchases}
        selectedSupplierId={selectedPurchaseForPayment?.supplier_id}
        selectedPurchaseId={selectedPurchaseForPayment?.id}
        onSave={handleSavePayment}
        onClose={() => {
          setPaymentDialogOpen(false);
          setSelectedPurchaseForPayment(null);
        }}
      />
    </Card>
  );
}
