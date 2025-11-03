import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import POSPureLayout from '@/components/pos-layout/POSPureLayout';
import { useTenant } from '@/context/TenantContext';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { hasPermissions } from '@/lib/api/userPermissionsUnified';
import { AlertTriangle, Plus } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { POSSharedLayoutControls } from '@/components/pos-layout/types';

// مكونات صفحة الديون
import DebtsSummary from '@/components/debts/DebtsSummary';
import CustomerDebtsTable from '@/components/debts/CustomerDebtsTable';
import DebtPaymentModal from '@/components/debts/DebtPaymentModal';
import AddDebtModal from '@/components/debts/AddDebtModal';

// استيراد واجهة الـ API
import { DebtsData, getDebtsData } from '@/lib/api/debts';
import { getAllLocalCustomerDebts, recordDebtPayment, type LocalCustomerDebt } from '@/api/localCustomerDebtService';
import { syncPendingCustomerDebts, fetchCustomerDebtsFromServer } from '@/api/syncCustomerDebts';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

interface CustomerDebtsProps extends POSSharedLayoutControls {}

const CustomerDebts: React.FC<CustomerDebtsProps> = ({
  useStandaloneLayout = true,
  onRegisterRefresh,
  onLayoutStateChange
}) => {
  const navigate = useNavigate();
  const { currentOrganization } = useTenant();
  const { user, userProfile } = useAuth();
  const { isOnline } = useNetworkStatus();
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [debtsData, setDebtsData] = useState<DebtsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [permissionsChecked, setPermissionsChecked] = useState(false);
  const [hasViewPermission, setHasViewPermission] = useState(false);
  const [hasPaymentPermission, setHasPaymentPermission] = useState(false);
  const [hasAddDebtPermission, setHasAddDebtPermission] = useState(false);
  const perms = usePermissions();
  
  // حالة نافذة تسجيل الدفع
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<any>(null);
  
  // حالة نافذة إضافة الدين
  const [addDebtModalOpen, setAddDebtModalOpen] = useState(false);

  const handleRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // منع الوصول عند عدم وجود صلاحية العرض بعد التحقق
  if (permissionsChecked && !hasViewPermission) {
    return renderWithLayout(
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>غير مصرح</AlertTitle>
          <AlertDescription>لا تملك صلاحية عرض مديونيات العملاء.</AlertDescription>
        </Alert>
      </div>
    );
  }

  useEffect(() => {
    if (!onRegisterRefresh) return;
    onRegisterRefresh(handleRefresh);
    return () => onRegisterRefresh(null);
  }, [handleRefresh, onRegisterRefresh]);

  useEffect(() => {
    if (!onLayoutStateChange) return;
    onLayoutStateChange({
      isRefreshing: isLoading || isSyncing,
      connectionStatus: !isOnline ? 'disconnected' : error ? 'reconnecting' : 'connected'
    });
  }, [onLayoutStateChange, isLoading, isSyncing, error, isOnline]);

  const renderWithLayout = (
    children: React.ReactNode,
    overrides?: {
      isRefreshing?: boolean;
      connectionStatus?: 'connected' | 'disconnected' | 'reconnecting';
    }
  ) => {
    if (!useStandaloneLayout) {
      return children;
    }

    return (
      <POSPureLayout
        onRefresh={handleRefresh}
        isRefreshing={overrides?.isRefreshing ?? isLoading}
        connectionStatus={overrides?.connectionStatus ?? (error ? 'disconnected' : 'connected')}
      >
        {children}
      </POSPureLayout>
    );
  };

  // التحقق من صلاحيات المستخدم
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        if (!user) {
          setHasViewPermission(false);
          setHasPaymentPermission(false);
          setHasAddDebtPermission(false);
          setPermissionsChecked(true);
          return;
        }

        // استخدام PermissionsContext أولاً
        const view = perms.ready ? perms.anyOf(['viewDebts','viewFinancialReports']) : false;
        const record = perms.ready ? perms.has('recordDebtPayments') : false;

        if (perms.ready) {
          setHasViewPermission(view);
          setHasPaymentPermission(record);
          setHasAddDebtPermission(record);
          setPermissionsChecked(true);
          return;
        }

        // فالباك عبر RPC الموحد عند عدم توفر المزود
        const permissionsResult = await hasPermissions(['viewDebts', 'recordDebtPayments'], user.id);
        setHasViewPermission(!!permissionsResult.viewDebts);
        setHasPaymentPermission(!!permissionsResult.recordDebtPayments);
        setHasAddDebtPermission(!!permissionsResult.recordDebtPayments);
        setPermissionsChecked(true);
      } catch (err) {
        setHasViewPermission(false);
        setHasPaymentPermission(false);
        setHasAddDebtPermission(false);
        setPermissionsChecked(true);
      }
    };

    checkPermissions();
  }, [user, userProfile, perms.ready, perms.role, perms.isOrgAdmin, perms.isSuperAdmin]);

  // تحميل بيانات الديون
  useEffect(() => {
    // إذا لم يكن لدى المستخدم صلاحية العرض، لا داعي لتحميل البيانات
    if (!hasViewPermission || !permissionsChecked) {
      return;
    }

    if (!currentOrganization?.id) {
      
      return;
    }

    const fetchDebtsData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // جلب الديون من المخزن المحلي
        const localDebts = await getAllLocalCustomerDebts(currentOrganization.id);
        
        // تحويل LocalCustomerDebt إلى DebtsData
        const convertedData = convertLocalDebtsToDebtsData(localDebts);
        setDebtsData(convertedData);

        // مزامنة مع السيرفر في الخلفية إذا كان متصل
        if (isOnline) {
          syncInBackground();
        }
      } catch (err) {
        console.error('خطأ في جلب الديون:', err);
        setError('حدث خطأ أثناء تحميل بيانات الديون');
        
        // محاولة جلب من API كخطة احتياطية
        try {
          const data = await getDebtsData(currentOrganization.id);
          setDebtsData(data);
        } catch (apiError) {
          toast.error('فشل في تحميل بيانات الديون');
          // استخدام بيانات تجريبية في حالة الفشل للعرض
          const mockData = getMockDebtsData();
          setDebtsData(mockData);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDebtsData();
  }, [currentOrganization?.id, refreshTrigger, hasViewPermission, permissionsChecked]);

  // معالج فتح نافذة تسجيل الدفع
  const handlePaymentClick = (debt: any) => {
    // التحقق من صلاحية تسجيل الدفع
    if (!hasPaymentPermission) {
      toast.error('ليس لديك صلاحية لتسجيل دفعات الديون');
      return;
    }

    setSelectedDebt(debt);
    setPaymentModalOpen(true);
  };

  // معالج تسجيل الدفع
  const handleRecordPayment = async (paymentData: {
    orderId: string;
    amountPaid: number;
    isFullPayment: boolean;
  }) => {
    try {
      // التحقق مرة أخرى من صلاحية تسجيل الدفع
      if (!hasPaymentPermission) {
        toast.error('ليس لديك صلاحية لتسجيل دفعات الديون');
        return;
      }

      setIsLoading(true);
      
      // تسجيل الدفع في المخزن المحلي
      await recordDebtPayment(
        paymentData.orderId,
        paymentData.amountPaid
      );
      
      toast.success('تم تسجيل الدفع بنجاح' + (!isOnline ? ' (سيتم المزامنة عند الاتصال)' : ''));
      setPaymentModalOpen(false);
      setRefreshTrigger(prev => prev + 1);
      
      // مزامنة فورية إذا كان متصل
      if (isOnline) {
        setTimeout(() => syncInBackground(), 1000);
      }
    } catch (err) {
      console.error('خطأ في تسجيل الدفع:', err);
      toast.error('فشل في تسجيل الدفع');
    } finally {
      setIsLoading(false);
    }
  };

  // مزامنة في الخلفية
  const syncInBackground = async () => {
    if (!isOnline || !currentOrganization) return;
    
    try {
      setIsSyncing(true);
      
      // مزامنة الديون المعلقة
      const syncResult = await syncPendingCustomerDebts();
      
      if (syncResult.success > 0) {
        console.log(`✅ تمت مزامنة ${syncResult.success} دين`);
      }
      
      if (syncResult.failed > 0) {
        console.warn(`⚠️ فشلت مزامنة ${syncResult.failed} دين`);
      }
      
      // جلب الديون الجديدة من السيرفر وتحديث الحالة مباشرة
      await fetchCustomerDebtsFromServer(currentOrganization.id);
      
      // تحديث البيانات محلياً بدون إعادة تشغيل useEffect
      const localDebts = await getAllLocalCustomerDebts(currentOrganization.id);
      const convertedData = convertLocalDebtsToDebtsData(localDebts);
      setDebtsData(convertedData);
    } catch (error) {
      console.error('خطأ في المزامنة:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // تحويل LocalCustomerDebt إلى DebtsData
  const convertLocalDebtsToDebtsData = (localDebts: LocalCustomerDebt[]): DebtsData => {
    // حساب الإحصائيات
    const totalDebts = localDebts.reduce((sum, debt) => sum + debt.remaining_amount, 0);
    const totalPartialPayments = localDebts.filter(debt => debt.paid_amount > 0 && debt.remaining_amount > 0).length;
    
    // تجميع حسب العميل
    const debtsByCustomerMap = new Map<string, { customerId: string; customerName: string; totalDebts: number; ordersCount: number }>();
    
    localDebts.forEach(debt => {
      const key = debt.customer_id || debt.customer_name;
      const existing = debtsByCustomerMap.get(key);
      
      if (existing) {
        existing.totalDebts += debt.remaining_amount;
        existing.ordersCount += 1;
      } else {
        debtsByCustomerMap.set(key, {
          customerId: debt.customer_id || key,
          customerName: debt.customer_name,
          totalDebts: debt.remaining_amount,
          ordersCount: 1
        });
      }
    });
    
    const debtsByCustomer = Array.from(debtsByCustomerMap.values());
    
    // تحويل إلى تنسيق customerDebts
    const customerDebtsMap = new Map<string, any>();
    
    localDebts.forEach(debt => {
      const key = debt.customer_id || debt.customer_name;
      
      if (!customerDebtsMap.has(key)) {
        customerDebtsMap.set(key, {
          customerId: debt.customer_id || key,
          customerName: debt.customer_name,
          totalDebt: 0,
          ordersCount: 0,
          orders: []
        });
      }
      
      const customerData = customerDebtsMap.get(key);
      customerData.totalDebt += debt.remaining_amount;
      customerData.ordersCount += 1;
      customerData.orders.push({
        orderId: debt.order_id,
        orderNumber: debt.order_number || debt.order_id,
        date: debt.created_at, // استخدام created_at بدلاً من order_date
        total: debt.total_amount,
        amountPaid: debt.paid_amount, // تصحيح الاسم
        remainingAmount: debt.remaining_amount,
        employee: 'غير محدد', // employee_name غير موجودة في LocalCustomerDebt
        _synced: debt.synced,
        _syncStatus: debt.syncStatus
      });
    });
    
    const customerDebts = Array.from(customerDebtsMap.values());
    
    return {
      totalDebts,
      totalPartialPayments,
      debtsByCustomer,
      customerDebts
    };
  };

  // توليد بيانات تجريبية - تستخدم فقط في حالة فشل تحميل البيانات الحقيقية
  const getMockDebtsData = (): DebtsData => {
    return {
      totalDebts: 45000.00,
      totalPartialPayments: 28,
      debtsByCustomer: [
        { customerId: '1', customerName: 'أحمد محمد', totalDebts: 15000.00, ordersCount: 10 },
        { customerId: '2', customerName: 'فاطمة علي', totalDebts: 12000.00, ordersCount: 8 },
        { customerId: '3', customerName: 'محمد خالد', totalDebts: 10000.00, ordersCount: 6 },
        { customerId: '4', customerName: 'نورا سعيد', totalDebts: 8000.00, ordersCount: 4 }
      ],
      customerDebts: [
        { 
          customerId: '1', 
          customerName: 'عبدالله حسن', 
          totalDebt: 5000.00, 
          ordersCount: 3,
          orders: [
            { 
              orderId: '101', 
              orderNumber: 'ORD-101', 
              date: '2023-05-15', 
              total: 2000.00, 
              amountPaid: 1000.00, 
              remainingAmount: 1000.00,
              employee: 'أحمد محمد'
            },
            { 
              orderId: '102', 
              orderNumber: 'ORD-102', 
              date: '2023-06-20', 
              total: 3000.00, 
              amountPaid: 1500.00, 
              remainingAmount: 1500.00,
              employee: 'فاطمة علي'
            },
            { 
              orderId: '103', 
              orderNumber: 'ORD-103', 
              date: '2023-07-10', 
              total: 5000.00, 
              amountPaid: 2500.00, 
              remainingAmount: 2500.00,
              employee: 'أحمد محمد'
            }
          ]
        },
        { 
          customerId: '2', 
          customerName: 'سارة محمود', 
          totalDebt: 8000.00, 
          ordersCount: 4,
          orders: [
            { 
              orderId: '201', 
              orderNumber: 'ORD-201', 
              date: '2023-05-18', 
              total: 3000.00, 
              amountPaid: 1500.00, 
              remainingAmount: 1500.00,
              employee: 'محمد خالد'
            },
            { 
              orderId: '202', 
              orderNumber: 'ORD-202', 
              date: '2023-06-25', 
              total: 4000.00, 
              amountPaid: 2000.00, 
              remainingAmount: 2000.00,
              employee: 'نورا سعيد'
            }
          ]
        },
        { 
          customerId: '3', 
          customerName: 'محمد علي', 
          totalDebt: 10000.00, 
          ordersCount: 5,
          orders: [
            { 
              orderId: '301', 
              orderNumber: 'ORD-301', 
              date: '2023-06-10', 
              total: 6000.00, 
              amountPaid: 3000.00, 
              remainingAmount: 3000.00,
              employee: 'أحمد محمد'
            }
          ]
        }
      ]
    };
  };

  // معالج تحديث البيانات بعد إضافة دين جديد
  const handleDebtAdded = () => {
    setRefreshTrigger(prev => prev + 1);
    toast.success('تم إضافة الدين بنجاح وسيتم تحديث البيانات');
  };

  // إذا لم يتم التحقق من الصلاحيات بعد
  if (!permissionsChecked) {
    return renderWithLayout(
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>,
      { isRefreshing: true, connectionStatus: 'reconnecting' }
    );
  }

  // إذا لم يكن للمستخدم صلاحية الوصول إلى صفحة الديون
  if (!hasViewPermission) {
    return renderWithLayout(
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>غير مصرح</AlertTitle>
          <AlertDescription>
            ليس لديك الصلاحيات اللازمة للوصول إلى صفحة الديون.
            يرجى التواصل مع المدير للحصول على الصلاحيات المطلوبة.
          </AlertDescription>
        </Alert>
      </div>,
      { connectionStatus: 'disconnected', isRefreshing: false }
    );
  }

  const pageContent = (
    <>
      <div className="container mx-auto py-6 space-y-6">
        {/* العنوان والإجراءات */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">إدارة ديون العملاء</h1>
            <p className="text-muted-foreground mt-1">تتبع ومتابعة مديونيات العملاء والمدفوعات</p>
          </div>
          {hasAddDebtPermission && (
            <Button 
              onClick={() => setAddDebtModalOpen(true)}
              className="flex items-center gap-2 shadow-sm"
              size="lg"
            >
              <Plus className="h-4 w-4" />
              إضافة دين جديد
            </Button>
          )}
        </div>
        
        {/* عرض رسالة تحذير إذا لم يكن لدى المستخدم صلاحية عرض الديون */}
        {!hasViewPermission && permissionsChecked && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>صلاحيات غير كافية</AlertTitle>
            <AlertDescription>
              ليس لديك صلاحية للوصول إلى صفحة إدارة ديون العملاء.
            </AlertDescription>
          </Alert>
        )}
        
        {/* عرض محتوى الصفحة فقط إذا كان لدى المستخدم الصلاحية المناسبة */}
        {hasViewPermission && (
          <>
            {isLoading ? (
              <div className="py-8 text-center">
                <p className="text-muted-foreground">جاري تحميل البيانات...</p>
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>خطأ في تحميل البيانات</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : debtsData ? (
              <>
                {/* ملخص الديون */}
                <DebtsSummary 
                  data={debtsData}
                />
                
                {/* جدول ديون العملاء */}
                <CustomerDebtsTable 
                  customers={debtsData.customerDebts}
                  onPaymentClick={handlePaymentClick}
                  canRecordPayment={hasPaymentPermission}  
                />
              </>
            ) : (
              <div className="py-8 text-center">
                <p className="text-muted-foreground">لا توجد بيانات متاحة</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* نافذة تسجيل الدفع */}
      {selectedDebt && (
        <DebtPaymentModal
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          debt={selectedDebt}
          onSubmit={handleRecordPayment}
        />
      )}

      {/* نافذة إضافة دين جديد */}
      <AddDebtModal
        isOpen={addDebtModalOpen}
        onOpenChange={setAddDebtModalOpen}
        onDebtAdded={handleDebtAdded}
      />
    </>
  );

  return renderWithLayout(pageContent, { isRefreshing: isLoading });
};

export default CustomerDebts;
