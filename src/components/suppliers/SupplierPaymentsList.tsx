import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { 
  SupplierPayment, 
  Supplier, 
  getSupplierPayments, 
  getAllSupplierPayments,
  getSuppliers,
  recordPayment
} from '@/api/supplierService';
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
  Trash, 
  CreditCard,
  RefreshCw
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export function SupplierPaymentsList({ onRefresh }: { onRefresh?: () => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [organizationId, setOrganizationId] = useState<string | undefined>(undefined);
  
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<SupplierPayment[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedSupplierId, setSelectedSupplierId] = useState('all');
  const [refreshKey, setRefreshKey] = useState(0);
  
  // تحديد organization_id عند تهيئة المكون
  useEffect(() => {
    // محاولة الحصول على organization_id من كائن المستخدم
    if (user && 'organization_id' in user) {
      console.log("Found organization_id in user object:", (user as any).organization_id);
      setOrganizationId((user as any).organization_id);
      return;
    }
    
    // محاولة الحصول من التخزين المحلي
    const storedOrgId = localStorage.getItem('bazaar_organization_id');
    if (storedOrgId) {
      console.log("Found organization_id in localStorage:", storedOrgId);
      setOrganizationId(storedOrgId);
      return;
    }
    
    // القيمة الاحتياطية النهائية (يمكن تغييرها حسب احتياجك)
    console.log("Using fallback organization ID");
    setOrganizationId("10c02497-45d4-417a-857b-ad383816d7a0");
  }, [user]);

  // تحميل الموردين
  useEffect(() => {
    const loadSuppliers = async () => {
      if (!organizationId) return;
      
      try {
        const suppliers = await getSuppliers(organizationId);
        setSuppliers(suppliers);
      } catch (error) {
        console.error('Error loading suppliers:', error);
        toast({
          title: 'خطأ',
          description: 'حدث خطأ أثناء تحميل بيانات الموردين',
          variant: 'destructive',
        });
      }
    };
    
    loadSuppliers();
  }, [organizationId, toast]);

  // تحميل المدفوعات
  const loadPayments = async () => {
    if (!organizationId) return;
    
    setIsLoading(true);
    try {
      let allPayments: SupplierPayment[] = [];
      
      if (selectedSupplierId !== 'all') {
        // إذا كان مورّد محدد، جلب مدفوعاته فقط
        const payments = await getSupplierPayments(organizationId, selectedSupplierId);
        allPayments = payments;
      } else {
        // جلب مدفوعات كل المورّدين باستخدام الوظيفة الجديدة
        allPayments = await getAllSupplierPayments(organizationId);
      }
      
      setPayments(allPayments);
      setFilteredPayments(allPayments);
    } catch (error) {
      console.error('Error loading payments:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحميل بيانات المدفوعات',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // تحميل البيانات عند تهيئة المكون
  useEffect(() => {
    if (suppliers.length > 0) {
      loadPayments();
    }
  }, [suppliers, selectedSupplierId, organizationId, refreshKey]);

  // تطبيق الفلاتر
  useEffect(() => {
    if (!payments.length) return;
    
    let result = [...payments];
    
    // تطبيق بحث نصي
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const supplierMap = Object.fromEntries(suppliers.map(s => [s.id, s.name]));
      
      result = result.filter(payment => {
        const supplierName = supplierMap[payment.supplier_id]?.toLowerCase() || '';
        const referenceNumber = payment.reference_number?.toLowerCase() || '';
        const notes = payment.notes?.toLowerCase() || '';
        
        return (
          supplierName.includes(query) ||
          referenceNumber.includes(query) ||
          notes.includes(query) ||
          payment.payment_method.toLowerCase().includes(query)
        );
      });
    }
    
    // تطبيق فلتر المورّد
    if (selectedSupplierId !== 'all') {
      result = result.filter(payment => payment.supplier_id === selectedSupplierId);
    }
    
    // تطبيق فلتر طريقة الدفع
    if (paymentMethodFilter !== 'all') {
      result = result.filter(payment => payment.payment_method === paymentMethodFilter);
    }
    
    // تطبيق فلتر التاريخ
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeekStart = new Date(today);
      thisWeekStart.setDate(today.getDate() - today.getDay());
      const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      
      result = result.filter(payment => {
        const paymentDate = new Date(payment.payment_date);
        
        switch (dateFilter) {
          case 'today':
            return paymentDate >= today;
          case 'this_week':
            return paymentDate >= thisWeekStart;
          case 'this_month':
            return paymentDate >= thisMonthStart;
          default:
            return true;
        }
      });
    }
    
    setFilteredPayments(result);
  }, [payments, searchQuery, selectedSupplierId, paymentMethodFilter, dateFilter, suppliers]);

  // تحويل طريقة الدفع إلى نص عربي
  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'cash':
        return 'نقدي';
      case 'bank_transfer':
        return 'تحويل بنكي';
      case 'credit_card':
        return 'بطاقة ائتمان';
      case 'check':
        return 'شيك';
      case 'other':
        return 'أخرى';
      default:
        return method;
    }
  };

  // إضافة وظيفة لإعادة تحميل البيانات
  const refreshPayments = async () => {
    setRefreshKey(oldKey => oldKey + 1);
    
    // إعادة تحميل المدفوعات
    await loadPayments();
    
    // استدعاء وظيفة onRefresh إذا كانت موجودة
    if (onRefresh) {
      onRefresh();
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>مدفوعات الموردين</CardTitle>
            <CardDescription>إدارة وتتبع المدفوعات للموردين</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={refreshPayments} disabled={isLoading}>
              <RefreshCw className="h-4 w-4 ml-2" />
              تحديث
            </Button>
            <Button onClick={() => navigate('/dashboard/suppliers/payments/new')}>
              <Plus className="h-4 w-4 ml-2" />
              تسجيل مدفوعات
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
              placeholder="بحث عن مدفوعات..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="اختر المورّد" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الموردين</SelectItem>
                {suppliers.map(supplier => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="طريقة الدفع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الطرق</SelectItem>
                <SelectItem value="cash">نقدي</SelectItem>
                <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                <SelectItem value="credit_card">بطاقة ائتمان</SelectItem>
                <SelectItem value="check">شيك</SelectItem>
                <SelectItem value="other">أخرى</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="فترة الدفع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الفترات</SelectItem>
                <SelectItem value="today">اليوم</SelectItem>
                <SelectItem value="this_week">هذا الأسبوع</SelectItem>
                <SelectItem value="this_month">هذا الشهر</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* جدول المدفوعات */}
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            لا توجد مدفوعات مطابقة لمعايير البحث
          </div>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المورّد</TableHead>
                  <TableHead>تاريخ الدفع</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>طريقة الدفع</TableHead>
                  <TableHead>رقم المرجع</TableHead>
                  <TableHead>الملاحظات</TableHead>
                  <TableHead className="text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map(payment => {
                  const supplierName = suppliers.find(s => s.id === payment.supplier_id)?.name || 'غير معروف';
                  
                  return (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{supplierName}</TableCell>
                      <TableCell>
                        {format(new Date(payment.payment_date), 'PPP', { locale: ar })}
                      </TableCell>
                      <TableCell>{payment.amount.toLocaleString('ar-EG')} ج.م</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getPaymentMethodText(payment.payment_method)}
                        </Badge>
                      </TableCell>
                      <TableCell>{payment.reference_number || '-'}</TableCell>
                      <TableCell>{payment.notes || '-'}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">فتح القائمة</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => navigate(`/dashboard/suppliers/payments/${payment.id}`)}
                            >
                              <Eye className="ml-2 h-4 w-4" />
                              عرض التفاصيل
                            </DropdownMenuItem>
                            {payment.purchase_id && (
                              <DropdownMenuItem 
                                onClick={() => navigate(`/dashboard/suppliers/purchases/${payment.purchase_id}`)}
                              >
                                <Eye className="ml-2 h-4 w-4" />
                                عرض المشتريات المرتبطة
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
          </div>
        )}
      </CardContent>
    </Card>
  );
} 