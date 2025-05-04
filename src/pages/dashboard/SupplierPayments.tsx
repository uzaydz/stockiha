import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { 
  SupplierPaymentsList 
} from '@/components/suppliers/SupplierPaymentsList';
import { 
  SupplierPaymentDialog 
} from '@/components/suppliers/SupplierPaymentDialog';
import { 
  getSuppliers, 
  getSupplierById, 
  getSupplierPurchases,
  recordPayment,
  Supplier, 
  SupplierPurchase, 
  SupplierPayment
} from '@/api/supplierService';
import { useToast } from '@/components/ui/use-toast';
import Layout from '@/components/Layout';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from '@/components/ui/breadcrumb';
import { CreditCard, MoreVertical, ShoppingBag } from 'lucide-react';

export default function SupplierPayments() {
  const { user } = useAuth();
  const location = useLocation();
  // محاولة الحصول على organization_id بطرق متعددة
  const [organizationId, setOrganizationId] = useState<string | undefined>(undefined);
  
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
  
  const navigate = useNavigate();
  const { paymentId } = useParams<{ paymentId: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<SupplierPurchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<SupplierPayment | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [refreshPaymentsKey, setRefreshPaymentsKey] = useState(0);
  
  // تحميل البيانات الأولية
  useEffect(() => {
    const loadInitialData = async () => {
      if (!organizationId) return;
      
      setIsLoading(true);
      try {
        // تحميل الموردين
        const suppliersData = await getSuppliers(organizationId);
        setSuppliers(suppliersData);
        
        // التحقق من وجود مورد محدد في الاستعلام
        const supplierIdParam = searchParams.get('supplier');
        if (supplierIdParam) {
          setSelectedSupplierId(supplierIdParam);
          
          // تحميل المشتريات للمورد المحدد
          const purchasesData = await getSupplierPurchases(organizationId, supplierIdParam);
          setPurchases(purchasesData);
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
        toast({
          title: 'خطأ',
          description: 'حدث خطأ أثناء تحميل البيانات',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadInitialData();
  }, [organizationId, searchParams, toast]);
  
  // فتح النافذة المنبثقة تلقائيًا إذا كان المسار يتضمن new
  useEffect(() => {
    console.log("Current path:", location.pathname);
    const isNewPayment = location.pathname.endsWith('/new');
    
    console.log("Is new payment:", isNewPayment);
    
    if (isNewPayment) {
      console.log("Opening dialog for new payment");
      setSelectedPayment(null);
      setDialogOpen(true);
    } else {
      console.log("Closing dialog - no new path");
      setDialogOpen(false);
    }
  }, [location.pathname]);
  
  // إغلاق النافذة المنبثقة
  const handleCloseDialog = () => {
    console.log("Closing dialog, navigating to main payments list");
    navigate('/dashboard/suppliers/payments');
  };
  
  // وظيفة إعادة تحميل البيانات
  const refreshData = async () => {
    if (!organizationId) return;
    
    setRefreshPaymentsKey(oldKey => oldKey + 1);
    
    // إعادة تحميل المشتريات إذا كان هناك مورد محدد
    if (selectedSupplierId) {
      try {
        const purchasesData = await getSupplierPurchases(organizationId, selectedSupplierId);
        setPurchases(purchasesData);
      } catch (error) {
        console.error('Error refreshing purchases:', error);
      }
    }
  };
  
  // حفظ المدفوعات
  const handleSavePayment = async (data: any) => {
    if (!organizationId) {
      toast({
        title: 'خطأ',
        description: 'رقم المؤسسة غير متوفر',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      // تحضير بيانات المدفوعات
      const { is_full_payment, ...restData } = data;
      const paymentData = {
        supplier_id: restData.supplier_id,
        purchase_id: restData.purchase_id && restData.purchase_id !== 'none' ? restData.purchase_id : undefined,
        payment_date: restData.payment_date.toISOString(),
        amount: restData.amount,
        payment_method: restData.payment_method,
        reference_number: restData.reference_number || undefined,
        notes: restData.notes || undefined,
        is_full_payment: is_full_payment || false
      };
      
      console.log("Recording payment with data:", paymentData, "Is full payment:", is_full_payment);
      
      // تنفيذ تسجيل المدفوعات
      let result;
      
      if (is_full_payment && paymentData.purchase_id) {
        // إذا كان دفعًا كاملًا، نستخدم وظيفة مخصصة للتأكد من ضبط المبلغ المدفوع = المبلغ الإجمالي بالضبط
        // للقيام بذلك بشكل آمن، سنحتاج إلى الحصول على المشتريات أولاً
        const purchase = purchases.find(p => p.id === paymentData.purchase_id);
        
        if (purchase) {
          // تعديل المبلغ المدفوع ليكون المبلغ المتبقي بالضبط
          const remainingAmount = purchase.total_amount - purchase.paid_amount;
          paymentData.amount = remainingAmount;
          
          result = await recordPayment(organizationId, paymentData);
          
          // تحديث حالة المشتريات يدويًا إلى "مدفوعة بالكامل"
          // يمكن إضافة استدعاء API إضافي هنا لتحديث حالة المشتريات إذا لزم الأمر
        } else {
          result = await recordPayment(organizationId, paymentData);
        }
      } else {
        // دفع عادي
        result = await recordPayment(organizationId, paymentData);
      }
      
      if (result) {
        toast({
          title: 'تم بنجاح',
          description: 'تم تسجيل المدفوعات بنجاح',
          variant: 'default',
        });
        
        // تحديث البيانات
        await refreshData();
        
        // إغلاق النافذة والعودة إلى صفحة المدفوعات
        handleCloseDialog();
        
        // الانتقال إلى صفحة المدفوعات بعد الدفع الكامل
        if (is_full_payment) {
          navigate('/dashboard/suppliers/payments');
        }
      } else {
        toast({
          title: 'خطأ',
          description: 'حدث خطأ أثناء تسجيل المدفوعات',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error saving payment:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تسجيل المدفوعات',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">مدفوعات الموردين</h1>
            <Breadcrumb className="mt-2">
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">لوحة التحكم</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard/suppliers">الموردين</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard/suppliers/payments">المدفوعات</BreadcrumbLink>
              </BreadcrumbItem>
            </Breadcrumb>
          </div>
          
          {/* أزرار إضافة سريعة */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard/suppliers/purchases/new')}
            >
              <ShoppingBag className="ml-2 h-4 w-4" />
              مشتريات جديدة
            </Button>
            <Button onClick={() => navigate('/dashboard/suppliers/payments/new')}>
              <CreditCard className="ml-2 h-4 w-4" />
              تسجيل مدفوعات
            </Button>
          </div>
        </div>
      
        <SupplierPaymentsList onRefresh={refreshData} />
        
        <SupplierPaymentDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            console.log("Dialog open state changed to:", open);
            setDialogOpen(open);
            if (!open) {
              handleCloseDialog();
            }
          }}
          payment={selectedPayment}
          suppliers={suppliers}
          supplierPurchases={purchases}
          selectedSupplierId={selectedSupplierId}
          onSave={handleSavePayment}
          onClose={handleCloseDialog}
        />
      </div>
    </Layout>
  );
} 