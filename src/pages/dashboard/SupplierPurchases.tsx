import { useEffect, useState, useCallback } from 'react';
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
  updatePurchase,
  createSupplier,
  Supplier,
  SupplierPurchase,
  SupplierPurchaseItem,
  updatePurchaseStatus
} from '@/api/supplierService';
import { getProducts, Product } from '@/api/productService';
import { useToast } from '@/components/ui/use-toast';
import Layout from '@/components/Layout';
import { POSSharedLayoutControls } from '@/components/pos-layout/types';
import { calculatePurchaseTotal, UserWithOrganization, PurchaseFormData } from '@/types/purchase';

interface SupplierPurchasesProps extends POSSharedLayoutControls {}

export default function SupplierPurchases({
  useStandaloneLayout = true,
  onRegisterRefresh,
  onLayoutStateChange
}: SupplierPurchasesProps = {}) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { purchaseId } = useParams<{ purchaseId: string }>();
  const [searchParams] = useSearchParams();

  // محاولة الحصول على organization_id بطرق متعددة
  const [organizationId, setOrganizationId] = useState<string | undefined>(undefined);

  // تحديد organization_id عند تهيئة المكون
  useEffect(() => {
    // محاولة الحصول على organization_id من كائن المستخدم
    const userWithOrg = user as UserWithOrganization | null;
    if (userWithOrg?.organization_id) {
      setOrganizationId(userWithOrg.organization_id);
      return;
    }

    // محاولة الحصول من التخزين المحلي (جرب كلا المفتاحين)
    const storedOrgId = localStorage.getItem('currentOrganizationId') ||
                        localStorage.getItem('bazaar_organization_id');
    if (storedOrgId) {
      setOrganizationId(storedOrgId);
      return;
    }

    // إذا لم يتم العثور على organization_id، لا نعيد التوجيه فوراً
    // قد يكون المستخدم في حالة تحميل
  }, [user]);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<SupplierPurchase | null>(null);
  const [selectedPurchaseItems, setSelectedPurchaseItems] = useState<SupplierPurchaseItem[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // trigger لإعادة تحميل قائمة المشتريات
  const [hasChanges, setHasChanges] = useState(false); // متابعة وجود تغييرات فعلية
  const [isRefreshingData, setIsRefreshingData] = useState(false);
  
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
        const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
        toast({
          title: 'خطأ في تحميل البيانات',
          description: `فشل في تحميل الموردين والمنتجات: ${errorMessage}`,
          variant: 'destructive',
        });
        console.error('[SupplierPurchases] خطأ في تحميل البيانات:', error);
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
        const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
        toast({
          title: 'خطأ في تحميل المشتريات',
          description: `فشل في تحميل بيانات المشتريات رقم ${purchaseId}: ${errorMessage}`,
          variant: 'destructive',
        });
        console.error('[SupplierPurchases] خطأ في تحميل المشتريات:', error);
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
  const handleCloseDialog = useCallback(() => {
    
    setDialogOpen(false);
    setSelectedPurchase(null);
    setSelectedPurchaseItems([]);
    
    // تحديث قائمة المشتريات فقط إذا كان هناك تغييرات فعلية
    if (hasChanges) {
      setRefreshTrigger(prev => prev + 1);
      setHasChanges(false);
    }
    
    // إعادة توجيه المستخدم إلى صفحة قائمة المشتريات
    navigate('/dashboard/suppliers/purchases');
  }, [navigate, hasChanges]);
  
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
        // تحديث مشتريات موجودة
        const purchaseData = {
          purchase_number: data.purchase_number,
          supplier_id: data.supplier_id,
          purchase_date: data.purchase_date.toISOString(),
          due_date: data.due_date ? data.due_date.toISOString() : undefined,
          payment_terms: data.payment_terms,
          notes: data.notes,
          status: data.status,
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
          const result = await updatePurchase(organizationId, purchaseId, purchaseData, items);
          
          if (result) {
            toast({
              title: 'تم التحديث بنجاح',
              description: `تم تحديث المشتريات رقم ${result.purchase_number} بنجاح`,
            });
            
            // تحديث الحالة المحلية
            setSelectedPurchase(result);
            setHasChanges(true);
            
            // إغلاق النافذة المنبثقة
            handleCloseDialog();
          }
        } catch (error: any) {
          let errorMessage = 'فشل في تحديث المشتريات';
          if (error?.message) {
            errorMessage = `خطأ: ${error.message}`;
          }
          
          toast({
            title: 'خطأ في تحديث المشتريات',
            description: errorMessage,
            variant: 'destructive',
          });
        }
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
          status: 'draft' as const, // تعيين الحالة الأولية دائمًا إلى "مسودة"
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
              }
            }
            
            // تحقق من حالة المشتريات المنشأة
            if (requestedStatus === 'confirmed') {
              
              // يمكن إضافة تأخير قصير للسماح للمشغلات بالتنفيذ
              setTimeout(async () => {
                try {
                  // محاولة التحقق من تحديث المخزون (اختياري)
                  
                } catch (checkError) {
                }
              }, 1000);
            }
            
            toast({
              title: 'تم الإضافة',
              description: 'تمت إضافة المشتريات بنجاح',
            });
            
            // تسجيل أن هناك تغييرات وتحديث قائمة المشتريات
            setHasChanges(true);
            setTimeout(() => {
              setRefreshTrigger(prev => prev + 1);
            }, 500);
            
            navigate('/dashboard/suppliers/purchases');
          }
        } catch (purchaseError: any) {
          
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
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
      toast({
        title: 'خطأ في حفظ المشتريات',
        description: `فشل في حفظ المشتريات: ${errorMessage}`,
        variant: 'destructive',
      });
      console.error('[SupplierPurchases] خطأ في حفظ المشتريات:', error);
    }
  };

  // حساب المبلغ الإجمالي للمشتريات - استخدام الدالة الموحدة
  const calculateTotalAmount = calculatePurchaseTotal;

  // إنشاء مورد جديد
  const handleCreateSupplier = async (supplierData: any) => {
    if (!organizationId) {
      toast({
        title: 'خطأ',
        description: 'معرف المؤسسة غير متوفر',
        variant: 'destructive',
      });
      return;
    }

    try {
      const newSupplier = await createSupplier(organizationId, supplierData);
      
      // تحديث قائمة الموردين
      setSuppliers(prev => [...prev, newSupplier]);
      setHasChanges(true); // تسجيل وجود تغييرات
      
      toast({
        title: 'تم الإنشاء',
        description: 'تم إنشاء المورد بنجاح',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
      toast({
        title: 'خطأ في إنشاء المورد',
        description: `فشل في إنشاء المورد: ${errorMessage}`,
        variant: 'destructive',
      });
      console.error('[SupplierPurchases] خطأ في إنشاء المورد:', error);
      throw error;
    }
  };

  // تحديث قائمة الموردين
  const refreshSuppliers = async () => {
    if (!organizationId) return;
    
    try {
      const suppliersData = await getSuppliers(organizationId);
      setSuppliers(suppliersData);
    } catch (error) {
    }
  };
  
  // إعداد بيانات المشتريات للحوار
  const purchaseForDialog = selectedPurchase ? {
    purchase: selectedPurchase,
    items: selectedPurchaseItems
  } : null;
  
  // callback عند إنشاء مشتريات جديدة (فقط عند الحاجة الفعلية)
  const handlePurchaseCreate = useCallback(() => {
    if (hasChanges) { // تحديث فقط إذا كان هناك تغييرات
      setRefreshTrigger(prev => prev + 1);
    }
  }, [hasChanges]);

  // تسجيل دالة التحديث
  useEffect(() => {
    if (onRegisterRefresh) {
      onRegisterRefresh(async () => {
        setIsRefreshingData(true);
        if (onLayoutStateChange) {
          onLayoutStateChange({ isRefreshing: true });
        }
        
        setRefreshTrigger(prev => prev + 1);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setIsRefreshingData(false);
        if (onLayoutStateChange) {
          onLayoutStateChange({ isRefreshing: false });
        }
      });
    }
  }, [onRegisterRefresh, onLayoutStateChange]);

  // إرسال حالة الاتصال
  useEffect(() => {
    if (onLayoutStateChange) {
      onLayoutStateChange({ 
        connectionStatus: 'connected',
        isRefreshing: isRefreshingData || isLoading
      });
    }
  }, [isRefreshingData, isLoading, onLayoutStateChange]);

  // فتح نافذة إضافة مشتريات جديدة
  const handleAddNewPurchase = useCallback(() => {
    setSelectedPurchase(null);
    setSelectedPurchaseItems([]);
    setDialogOpen(true);
  }, []);

  const content = (
    <>
      {/* إظهار القائمة فقط عندما لا يكون الحوار مفتوحاً أو عند إغلاقه */}
      <SupplierPurchasesList
        refreshTrigger={refreshTrigger}
        onPurchaseCreate={handlePurchaseCreate}
        onAddNewPurchase={handleAddNewPurchase}
      />
      
      {/* حوار إنشاء/تعديل المشتريات */}
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
        onCreateSupplier={handleCreateSupplier}
        onSuppliersUpdate={refreshSuppliers}
      />
    </>
  );

  return useStandaloneLayout ? <Layout>{content}</Layout> : content;
}
