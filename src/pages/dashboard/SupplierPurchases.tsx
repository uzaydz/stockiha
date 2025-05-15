import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { 
  SupplierPurchaseDialog 
} from '@/components/suppliers/SupplierPurchaseDialog';
import { 
  SupplierPurchasesList 
} from '@/components/suppliers/SupplierPurchasesList';
import { 
  getSuppliers, 
  getSupplierById, 
  getPurchaseById, 
  createPurchase, 
  Supplier, 
  SupplierPurchase, 
  SupplierPurchaseItem,
  updatePurchaseStatus
} from '@/api/supplierService';
import { getProducts, Product } from '@/api/productService';
import { useToast } from '@/components/ui/use-toast';
import Layout from '@/components/Layout';

export default function SupplierPurchases() {
  const { user } = useAuth();
  const location = useLocation();
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
  
  const navigate = useNavigate();
  const { purchaseId } = useParams<{ purchaseId: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<SupplierPurchase | null>(null);
  const [selectedPurchaseItems, setSelectedPurchaseItems] = useState<SupplierPurchaseItem[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  
  // تحميل البيانات الأولية
  useEffect(() => {
    const loadInitialData = async () => {
      if (!organizationId) return;
      
      setIsLoading(true);
      try {
        // تحميل الموردين
        const suppliersData = await getSuppliers(organizationId);
        setSuppliers(suppliersData);
        
        // تحميل المنتجات
        const productsData = await getProducts(organizationId);
        setProducts(productsData);
        
        // التحقق من وجود مورد محدد في الاستعلام
        const supplierIdParam = searchParams.get('supplier');
        if (supplierIdParam) {
          setSelectedSupplier(supplierIdParam);
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
  
  // تحميل بيانات الشراء إذا كان هناك معرف
  useEffect(() => {
    const loadPurchase = async () => {
      if (!organizationId || !purchaseId || purchaseId === 'new') return;
      
      try {
        
        const purchaseData = await getPurchaseById(organizationId, purchaseId);
        if (purchaseData) {
          setSelectedPurchase(purchaseData.purchase);
          setSelectedPurchaseItems(purchaseData.items);
        } else {
          toast({
            title: 'خطأ',
            description: 'لم يتم العثور على المشتريات المطلوبة',
            variant: 'destructive',
          });
          navigate('/dashboard/suppliers/purchases');
        }
      } catch (error) {
        console.error('Error loading purchase:', error);
        toast({
          title: 'خطأ',
          description: 'حدث خطأ أثناء تحميل بيانات المشتريات',
          variant: 'destructive',
        });
        navigate('/dashboard/suppliers/purchases');
      }
    };
    
    loadPurchase();
  }, [organizationId, purchaseId, navigate, toast]);
  
  // فتح النافذة المنبثقة تلقائيًا إذا كان المسار يتضمن new أو معرف شراء
  useEffect(() => {
    
    const isNewPurchase = location.pathname.endsWith('/new');
    const hasPurchaseId = purchaseId && purchaseId !== 'new';
    
    
    
    
    if (isNewPurchase) {
      
      setSelectedPurchase(null);
      setSelectedPurchaseItems([]);
      setDialogOpen(true);
    } else if (hasPurchaseId) {
      
      setDialogOpen(true);
    } else {
      
      setDialogOpen(false);
    }
  }, [location.pathname, purchaseId]);
  
  // إغلاق النافذة المنبثقة والعودة إلى قائمة المشتريات
  const handleCloseDialog = () => {
    
    setDialogOpen(false);
    setSelectedPurchase(null);
    setSelectedPurchaseItems([]);
    // إعادة توجيه المستخدم إلى صفحة قائمة المشتريات
    navigate('/dashboard/suppliers/purchases');
  };
  
  // حفظ المشتريات
  const handleSavePurchase = async (data: any) => {
    if (!organizationId) {
      toast({
        title: 'خطأ',
        description: 'معرف المؤسسة غير متوفر',
        variant: 'destructive',
      });
      return;
    }
    
    // إظهار إشعار بجاري المعالجة
    toast({
      title: 'جاري المعالجة',
      description: 'يتم حفظ بيانات المشتريات...',
    });
    
    try {
      if (purchaseId && purchaseId !== 'new' && selectedPurchase) {
        // تحديث مشتريات موجودة - سيتم تنفيذه لاحقًا
        toast({
          title: 'غير مدعوم',
          description: 'تحديث المشتريات غير مدعوم حاليًا',
          variant: 'destructive',
        });
      } else {
        // إضافة مشتريات جديدة
        
        
        // حفظ حالة المشتريات المطلوبة
        const requestedStatus = data.status;
        
        const purchaseData = {
          purchase_number: data.purchase_number,
          supplier_id: data.supplier_id,
          purchase_date: data.purchase_date.toISOString(),
          due_date: data.due_date ? data.due_date.toISOString() : undefined,
          payment_terms: data.payment_terms,
          notes: data.notes,
          status: 'draft', // تعيين الحالة الأولية دائمًا إلى "مسودة"
          total_amount: calculateTotalAmount(data.items),
          paid_amount: data.paid_amount || 0,
        };
        
        // تحقق من وجود عناصر في المشتريات
        if (!data.items || data.items.length === 0) {
          toast({
            title: 'خطأ في البيانات',
            description: 'يجب إضافة عنصر واحد على الأقل للمشتريات',
            variant: 'destructive',
          });
          return;
        }
        
        const items = data.items.map((item: any) => {
          
          // إذا كان product_id هو "none" أو قيمة فارغة، نضع null
          const productId = item.product_id === 'none' || !item.product_id ? null : item.product_id;
          
          
          return {
            product_id: productId,
            description: item.description,
            quantity: Number(item.quantity) || 0,
            unit_price: Number(item.unit_price) || 0,
            tax_rate: Number(item.tax_rate) || 0,
          };
        });
        
        
        
        
        try {
          const newPurchase = await createPurchase(organizationId, purchaseData, items);
          if (newPurchase) {
            
            
            // إذا كان المستخدم قد طلب حالة "مؤكدة"، قم بتحديث الحالة
            if (requestedStatus === 'confirmed') {
              
              try {
                const updated = await updatePurchaseStatus(organizationId, newPurchase.id, 'confirmed');
                
              } catch (updateError) {
                console.error("خطأ أثناء تحديث حالة المشتريات:", updateError);
              }
            }
            
            // تحقق من حالة المشتريات المنشأة
            if (requestedStatus === 'confirmed') {
              
              // يمكن إضافة تأخير قصير للسماح للمشغلات بالتنفيذ
              setTimeout(async () => {
                try {
                  // محاولة التحقق من تحديث المخزون (اختياري)
                  
                } catch (checkError) {
                  console.error("خطأ أثناء التحقق من تحديث المخزون:", checkError);
                }
              }, 1000);
            }
            
            toast({
              title: 'تم الإضافة',
              description: 'تمت إضافة المشتريات بنجاح',
            });
            navigate('/dashboard/suppliers/purchases');
          }
        } catch (purchaseError: any) {
          console.error('Error during purchase creation:', purchaseError);
          
          // التحقق من نوع الخطأ وإظهار رسالة أكثر تفصيلاً
          let errorMessage = 'فشل إنشاء المشتريات';
          if (purchaseError?.code === '54001') {
            errorMessage = 'خطأ في قاعدة البيانات: تجاوز حد عمق المكدس. حاول تقليل عدد العناصر أو تبسيط البيانات.';
          } else if (purchaseError?.message) {
            errorMessage = `خطأ: ${purchaseError.message}`;
          }
          
          toast({
            title: 'خطأ في إنشاء المشتريات',
            description: errorMessage,
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error('Error saving purchase:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء حفظ المشتريات',
        variant: 'destructive',
      });
    }
  };

  // حساب المبلغ الإجمالي للمشتريات
  const calculateTotalAmount = (items: any[]) => {
    return items.reduce((total, item) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unit_price) || 0;
      const taxRate = Number(item.tax_rate) || 0;
      
      const subtotal = quantity * unitPrice;
      const taxAmount = subtotal * (taxRate / 100);
      
      return total + subtotal + taxAmount;
    }, 0);
  };
  
  // إعداد بيانات المشتريات للحوار
  const purchaseForDialog = selectedPurchase ? {
    purchase: selectedPurchase,
    items: selectedPurchaseItems
  } : null;
  
  return (
    <Layout>
      <SupplierPurchasesList />
      
      <SupplierPurchaseDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          
          setDialogOpen(open);
          if (!open) {
            handleCloseDialog();
          }
        }}
        purchase={purchaseForDialog}
        suppliers={suppliers}
        products={products}
        selectedSupplierId={selectedSupplier}
        onSave={handleSavePurchase}
        onClose={handleCloseDialog}
        calculateTotalAmount={calculateTotalAmount}
      />
    </Layout>
  );
} 