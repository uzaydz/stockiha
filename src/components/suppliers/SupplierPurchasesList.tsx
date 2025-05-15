import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { 
  SupplierPurchase, 
  Supplier, 
  getSupplierPurchases, 
  getSuppliers,
  updatePurchaseStatus
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
  BanIcon, 
  CheckCircle2, 
  ClipboardCheck, 
  AlertCircle 
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export function SupplierPurchasesList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [organizationId, setOrganizationId] = useState<string | undefined>(undefined);
  
  const [purchases, setPurchases] = useState<SupplierPurchase[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<SupplierPurchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedSupplierId, setSelectedSupplierId] = useState('all');
  
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
  
  // جلب البيانات عند التهيئة
  useEffect(() => {
    const loadData = async () => {
      if (!organizationId) return;
      
      setIsLoading(true);
      try {
        // جلب الموردين
        const suppliersData = await getSuppliers(organizationId);
        setSuppliers(suppliersData);
        
        // جلب المشتريات
        const purchasesData = await getSupplierPurchases(organizationId);
        setPurchases(purchasesData);
        setFilteredPurchases(purchasesData);
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: 'خطأ',
          description: 'حدث خطأ أثناء تحميل البيانات',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [organizationId]);
  
  // تطبيق الفلترة
  useEffect(() => {
    if (!purchases.length) return;
    
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
    
    setFilteredPurchases(filtered);
  }, [purchases, searchQuery, statusFilter, dateFilter, selectedSupplierId]);
  
  // تغيير حالة المشتريات
  const handleStatusChange = async (purchaseId: string, newStatus: SupplierPurchase['status']) => {
    if (!organizationId) return;
    
    try {
      await updatePurchaseStatus(organizationId, purchaseId, newStatus);
      
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
      console.error('Error updating purchase status:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحديث حالة المشتريات',
        variant: 'destructive',
      });
    }
  };
  
  // الحصول على اسم المورد من معرفه
  const getSupplierName = (supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier ? supplier.name : 'غير معروف';
  };
  
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

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>قائمة المشتريات</CardTitle>
            <CardDescription>إدارة مشتريات الموردين وتتبع حالتها</CardDescription>
          </div>
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
              console.error("Error navigating:", error);
              // النقطة النهائية - تغيير المسار مباشرة
              window.location.href = '/dashboard/suppliers/purchases/new';
            }
          }}>
            <Plus className="h-4 w-4 ml-2" />
            إضافة مشتريات
          </Button>
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
                  <TableHead>المبلغ الإجمالي</TableHead>
                  <TableHead>المدفوع</TableHead>
                  <TableHead>المتبقي</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPurchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell className="font-medium">{purchase.purchase_number}</TableCell>
                    <TableCell>{getSupplierName(purchase.supplier_id)}</TableCell>
                    <TableCell>
                      {format(new Date(purchase.purchase_date), 'dd/MM/yyyy', { locale: ar })}
                    </TableCell>
                    <TableCell>{purchase.total_amount.toFixed(2)}</TableCell>
                    <TableCell>{purchase.paid_amount.toFixed(2)}</TableCell>
                    <TableCell>{purchase.balance_due.toFixed(2)}</TableCell>
                    <TableCell>{renderStatusBadge(purchase.status)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">فتح القائمة</span>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>خيارات</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => navigate(`/dashboard/suppliers/purchases/${purchase.id}`)}>
                            <Eye className="ml-2 h-4 w-4" />
                            <span>عرض التفاصيل</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/dashboard/suppliers/purchases/${purchase.id}/edit`)}>
                            <FileEdit className="ml-2 h-4 w-4" />
                            <span>تعديل</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          
                          {/* خيارات تغيير الحالة */}
                          <DropdownMenuLabel>تغيير الحالة</DropdownMenuLabel>
                          {purchase.status !== 'confirmed' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(purchase.id, 'confirmed')}>
                              <ClipboardCheck className="ml-2 h-4 w-4 text-green-600" />
                              <span>تأكيد</span>
                            </DropdownMenuItem>
                          )}
                          {['draft', 'confirmed'].includes(purchase.status) && (
                            <DropdownMenuItem onClick={() => handleStatusChange(purchase.id, 'paid')}>
                              <CheckCircle2 className="ml-2 h-4 w-4 text-green-600" />
                              <span>تسديد كامل</span>
                            </DropdownMenuItem>
                          )}
                          {purchase.status !== 'overdue' && purchase.balance_due > 0 && (
                            <DropdownMenuItem onClick={() => handleStatusChange(purchase.id, 'overdue')}>
                              <AlertCircle className="ml-2 h-4 w-4 text-amber-600" />
                              <span>تأخير الدفع</span>
                            </DropdownMenuItem>
                          )}
                          {purchase.status !== 'cancelled' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(purchase.id, 'cancelled')}>
                              <BanIcon className="ml-2 h-4 w-4 text-red-600" />
                              <span>إلغاء</span>
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
    </Card>
  );
} 