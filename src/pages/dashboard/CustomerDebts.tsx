import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { useTenant } from '@/context/TenantContext';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { checkUserPermissions } from '@/lib/api/permissions';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// مكونات صفحة الديون
import DebtsSummary from '@/components/debts/DebtsSummary';
import DebtsPerEmployee from '@/components/debts/DebtsPerEmployee';
import CustomerDebtsList from '@/components/debts/CustomerDebtsList';
import DebtPaymentModal from '@/components/debts/DebtPaymentModal';

// استيراد واجهة الـ API
import { DebtsData, getDebtsData, recordDebtPayment } from '@/lib/api/debts';

const CustomerDebts: React.FC = () => {
  const navigate = useNavigate();
  const { currentOrganization } = useTenant();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [debtsData, setDebtsData] = useState<DebtsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [permissionsChecked, setPermissionsChecked] = useState(false);
  const [hasViewPermission, setHasViewPermission] = useState(false);
  const [hasPaymentPermission, setHasPaymentPermission] = useState(false);
  
  // حالة نافذة تسجيل الدفع
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<any>(null);

  // التحقق من صلاحيات المستخدم
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        if (!user) {
          setHasViewPermission(false);
          setHasPaymentPermission(false);
          return;
        }

        // التحقق من صلاحية عرض الديون
        const canViewDebts = await checkUserPermissions(user, 'viewDebts');
        setHasViewPermission(canViewDebts);

        // التحقق من صلاحية تسجيل الدفعات
        const canRecordPayments = await checkUserPermissions(user, 'recordDebtPayments');
        setHasPaymentPermission(canRecordPayments);

        setPermissionsChecked(true);
      } catch (err) {
        console.error('خطأ في التحقق من الصلاحيات:', err);
        setHasViewPermission(false);
        setHasPaymentPermission(false);
      }
    };

    checkPermissions();
  }, [user]);

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
        
        
        
        // استخدام البيانات الحقيقية من الـ API
        const data = await getDebtsData(currentOrganization.id);
        
        
        setDebtsData(data);
      } catch (err) {
        console.error('خطأ في تحميل بيانات الديون:', err);
        setError('حدث خطأ أثناء تحميل بيانات الديون');
        toast.error('فشل في تحميل بيانات الديون');
        
        // استخدام بيانات تجريبية في حالة الفشل للعرض
        const mockData = getMockDebtsData();
        
        setDebtsData(mockData);
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
      
      await recordDebtPayment(
        paymentData.orderId,
        paymentData.amountPaid,
        paymentData.isFullPayment
      );
      
      toast.success('تم تسجيل الدفع بنجاح');
      setPaymentModalOpen(false);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('خطأ في تسجيل الدفع:', err);
      toast.error('فشل في تسجيل الدفع');
    } finally {
      setIsLoading(false);
    }
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

  // إذا لم يتم التحقق من الصلاحيات بعد
  if (!permissionsChecked) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center min-h-[50vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </Layout>
    );
  }

  // إذا لم يكن للمستخدم صلاحية الوصول إلى صفحة الديون
  if (!hasViewPermission) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>غير مصرح</AlertTitle>
            <AlertDescription>
              ليس لديك الصلاحيات اللازمة للوصول إلى صفحة الديون.
              يرجى التواصل مع المدير للحصول على الصلاحيات المطلوبة.
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">إدارة ديون العملاء</h1>
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
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  <div className="lg:col-span-2">
                    <DebtsSummary 
                      data={debtsData}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <DebtsPerEmployee 
                      data={debtsData.debtsByCustomer}
                    />
                  </div>
                </div>
                
                {/* قائمة ديون العملاء */}
                <CustomerDebtsList 
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
    </Layout>
  );
};

export default CustomerDebts; 