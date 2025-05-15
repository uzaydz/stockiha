import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  Supplier, 
  getSuppliers, 
  createSupplier, 
  updateSupplier, 
  deleteSupplier 
} from '@/api/supplierService';
import { SupplierDialog } from './SupplierDialog';
import { SupplierActionsMenu } from './SupplierActionsMenu';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, Search, Star, StarOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function SuppliersList() {
  const { user } = useAuth();
  // محاولة الحصول على organization_id بطرق متعددة
  const [organizationId, setOrganizationId] = useState<string | undefined>(undefined);
  
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
  
  const { toast } = useToast();
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  
  // جلب قائمة الموردين
  const loadSuppliers = async () => {
    if (!organizationId) return;
    
    setIsLoading(true);
    try {
      const data = await getSuppliers(organizationId);
      setSuppliers(data);
      setFilteredSuppliers(data);
    } catch (error) {
      console.error('Error loading suppliers:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحميل قائمة الموردين',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // تحميل البيانات عند التهيئة
  useEffect(() => {
    loadSuppliers();
  }, [organizationId]);
  
  // تطبيق البحث والفلترة
  useEffect(() => {
    if (!suppliers) return;
    
    let result = [...suppliers];
    
    // تطبيق البحث
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (supplier) =>
          supplier.name.toLowerCase().includes(query) ||
          (supplier.company_name && supplier.company_name.toLowerCase().includes(query)) ||
          (supplier.email && supplier.email.toLowerCase().includes(query)) ||
          (supplier.phone && supplier.phone.includes(query))
      );
    }
    
    // تطبيق فلتر النوع
    if (filterType !== 'all') {
      result = result.filter((supplier) => supplier.supplier_type === filterType);
    }
    
    // تطبيق فلتر الفئة
    if (filterCategory !== 'all') {
      result = result.filter((supplier) => supplier.supplier_category === filterCategory);
    }
    
    setFilteredSuppliers(result);
  }, [suppliers, searchQuery, filterType, filterCategory]);
  
  // إضافة أو تعديل مورد
  const handleSaveSupplier = async (data: Omit<Supplier, 'id' | 'created_at' | 'updated_at' | 'rating'>) => {
    if (!organizationId) {
      console.error('No organization ID available');
      toast({
        title: 'خطأ',
        description: 'معرف المؤسسة غير متوفر، يرجى تسجيل الدخول مرة أخرى',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      
      
      
      if (selectedSupplier) {
        // تحديث مورد موجود
        const updatedSupplier = await updateSupplier(organizationId, selectedSupplier.id, data);
        
        
        if (!updatedSupplier) {
          throw new Error('فشل تحديث المورد');
        }
        
        toast({
          title: 'تم التحديث',
          description: 'تم تحديث بيانات المورد بنجاح',
        });
      } else {
        // إضافة مورد جديد
        const newSupplier = await createSupplier(organizationId, { ...data, rating: 0 });
        
        
        if (!newSupplier) {
          throw new Error('فشل إضافة المورد');
        }
        
        toast({
          title: 'تمت الإضافة',
          description: 'تم إضافة المورد الجديد بنجاح',
        });
      }
      
      await loadSuppliers();
      setDialogOpen(false);
      setSelectedSupplier(null);
    } catch (error) {
      console.error('Error saving supplier:', error);
      let errorMessage = 'حدث خطأ أثناء حفظ بيانات المورد';
      
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        errorMessage = `${errorMessage}: ${error.message}`;
      }
      
      toast({
        title: 'خطأ',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };
  
  // فتح نافذة التعديل
  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setDialogOpen(true);
  };
  
  // فتح نافذة تأكيد الحذف
  const handleConfirmDelete = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setConfirmDialogOpen(true);
  };
  
  // حذف مورد
  const handleDelete = async () => {
    if (!selectedSupplier || !organizationId) return;
    
    try {
      await deleteSupplier(organizationId, selectedSupplier.id);
      toast({
        title: 'تم الحذف',
        description: 'تم حذف المورد بنجاح',
      });
      
      loadSuppliers();
      setConfirmDialogOpen(false);
      setSelectedSupplier(null);
    } catch (error) {
      console.error('Error deleting supplier:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء حذف المورد',
        variant: 'destructive',
      });
    }
  };
  
  // عرض تصنيف المورد بالنجوم
  const renderRating = (rating: number) => {
    if (rating <= 0) {
      return <StarOff className="h-4 w-4 text-muted-foreground" />;
    }
    
    return Array.from({ length: 5 }).map((_, index) => (
      <Star
        key={index}
        className={`h-4 w-4 ${
          index < rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'
        }`}
      />
    ));
  };
  
  // تحويل نوع المورد إلى نص مناسب
  const getSupplierTypeText = (type: string) => {
    switch (type) {
      case 'local':
        return 'محلي';
      case 'international':
        return 'دولي';
      default:
        return type;
    }
  };
  
  // تحويل فئة المورد إلى نص مناسب
  const getSupplierCategoryText = (category: string) => {
    switch (category) {
      case 'wholesale':
        return 'جملة';
      case 'retail':
        return 'تجزئة';
      case 'both':
        return 'جملة وتجزئة';
      default:
        return category;
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>قائمة الموردين</CardTitle>
            <CardDescription>إدارة الموردين والمشتريات</CardDescription>
          </div>
          <Button onClick={() => { setSelectedSupplier(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 ml-2" />
            إضافة مورد
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* أدوات البحث والفلترة */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث عن مورد..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="نوع المورد" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                <SelectItem value="local">محلي</SelectItem>
                <SelectItem value="international">دولي</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="فئة المورد" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الفئات</SelectItem>
                <SelectItem value="wholesale">جملة</SelectItem>
                <SelectItem value="retail">تجزئة</SelectItem>
                <SelectItem value="both">جملة وتجزئة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* جدول الموردين */}
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            لا يوجد موردين مطابقين لمعايير البحث
          </div>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المورد</TableHead>
                  <TableHead>الاتصال</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>الفئة</TableHead>
                  <TableHead>التقييم</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell>
                      <div className="font-medium">{supplier.name}</div>
                      {supplier.company_name && (
                        <div className="text-sm text-muted-foreground">{supplier.company_name}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{supplier.phone || '-'}</div>
                      <div className="text-sm text-muted-foreground">{supplier.email || '-'}</div>
                    </TableCell>
                    <TableCell>
                      {getSupplierTypeText(supplier.supplier_type)}
                    </TableCell>
                    <TableCell>
                      {getSupplierCategoryText(supplier.supplier_category)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {renderRating(supplier.rating)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={supplier.is_active ? 'default' : 'secondary'}>
                        {supplier.is_active ? 'نشط' : 'غير نشط'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <SupplierActionsMenu
                        supplier={supplier}
                        onEdit={() => handleEdit(supplier)}
                        onDelete={() => handleConfirmDelete(supplier)}
                        onViewPurchases={() => {/* سيتم تنفيذها لاحقًا */}}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      
      {/* نافذة إضافة/تعديل المورد */}
      <SupplierDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        supplier={selectedSupplier}
        onSave={handleSaveSupplier}
        isLoading={false}
      />
      
      {/* نافذة تأكيد الحذف */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من رغبتك في حذف المورد{' '}
              <span className="font-semibold">{selectedSupplier?.name}</span>؟
              <br />
              سيتم حذف جميع البيانات المرتبطة بهذا المورد بما في ذلك المشتريات والمدفوعات.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              إلغاء
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
} 