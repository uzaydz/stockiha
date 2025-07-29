import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { useTenant } from '@/context/TenantContext';
import { toast } from 'sonner';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { checkUserPermissions } from '@/lib/api/permissions';
import { 
  ArrowLeftIcon, 
  MagnifyingGlassIcon, 
  BanknotesIcon, 
  CalendarIcon, 
  UserIcon,
  ChevronDownIcon, 
  ChevronUpIcon
} from '@heroicons/react/24/outline';

// واجهات برمجة التطبيقات
import { DebtOrder, CustomerDebt, recordDebtPayment, getDebtsData } from '@/lib/api/debts';

// واجهة بيانات السجل التاريخي
interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  paymentMethod: string;
  isFullPayment: boolean;
}

const CustomerDebtDetails: React.FC = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { currentOrganization } = useTenant();
  const { user } = useAuth();
  
  // حالات البيانات
  const [isLoading, setIsLoading] = useState(true);
  const [customerData, setCustomerData] = useState<CustomerDebt | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  
  // حالة نافذة الدفع الشامل
  const [isBulkPaymentModalOpen, setIsBulkPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  // حالة الصلاحيات
  const [hasRecordPaymentPermission, setHasRecordPaymentPermission] = useState(false);
  const [permissionsChecked, setPermissionsChecked] = useState(false);
  
  // حالة توسيع الأقسام
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    orders: true,
    history: false
  });
  
  // بيانات السجل التاريخي (تجريبية)
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([
    {
      id: "1",
      date: "2023-07-15",
      amount: 1500,
      paymentMethod: "نقدي",
      isFullPayment: false
    },
    {
      id: "2",
      date: "2023-08-20",
      amount: 2000,
      paymentMethod: "تحويل بنكي",
      isFullPayment: true
    }
  ]);
  
  // التحقق من صلاحيات المستخدم
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        if (!user) {
          setHasRecordPaymentPermission(false);
          return;
        }

        // التحقق من صلاحية تسجيل دفعات الديون
        const canRecordPayments = await checkUserPermissions(user, 'recordDebtPayments');
        setHasRecordPaymentPermission(canRecordPayments);
        setPermissionsChecked(true);
      } catch (err) {
        setHasRecordPaymentPermission(false);
      }
    };

    checkPermissions();
  }, [user]);
  
  // تحميل بيانات العميل
  useEffect(() => {
    if (!customerId || !currentOrganization?.id) return;
    
    const loadCustomerData = async () => {
      try {
        setIsLoading(true);
        // استدعاء واجهة برمجة التطبيقات للحصول على بيانات الديون
        const debtsData = await getDebtsData(currentOrganization.id);
        
        // البحث عن العميل المحدد
        const customer = debtsData.customerDebts.find(c => c.customerId === customerId);
        
        if (customer) {
          setCustomerData(customer);
        } else {
          toast.error('لم يتم العثور على بيانات العميل');
          navigate('/dashboard/customer-debts');
        }
      } catch (error) {
        toast.error('حدث خطأ أثناء تحميل بيانات العميل');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadCustomerData();
  }, [customerId, currentOrganization?.id, navigate]);
  
  // تبديل عرض/إخفاء الأقسام
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  // معالج البحث
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  // تصفية الطلبات حسب البحث
  const filteredOrders = customerData?.orders.filter(order => {
    const searchLower = searchTerm.toLowerCase();
    return (
      order.orderNumber.toLowerCase().includes(searchLower) ||
      order.date.includes(searchTerm) ||
      order.employee.toLowerCase().includes(searchLower) ||
      order.total.toString().includes(searchTerm) ||
      order.remainingAmount.toString().includes(searchTerm)
    );
  }) || [];
  
  // فتح نافذة الدفع الشامل
  const openBulkPaymentModal = () => {
    // التحقق من الصلاحية
    if (!hasRecordPaymentPermission) {
      toast.error('ليس لديك صلاحية لتسجيل دفعات الديون');
      return;
    }
    
    setPaymentAmount(customerData?.totalDebt.toString() || '');
    setPaymentError(null);
    setIsBulkPaymentModalOpen(true);
  };
  
  // التحقق من صحة مبلغ الدفع الشامل
  const validateBulkPayment = (value: string) => {
    const amount = parseFloat(value);
    if (isNaN(amount) || amount <= 0) {
      return 'يجب إدخال قيمة موجبة';
    }
    
    if (customerData && amount > customerData.totalDebt) {
      return 'المبلغ المدخل أكبر من إجمالي الديون المستحقة';
    }
    
    return null;
  };
  
  // معالج تغيير مبلغ الدفع الشامل
  const handleBulkPaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPaymentAmount(value);
    setPaymentError(validateBulkPayment(value));
  };
  
  // معالج تنفيذ الدفع الشامل
  const handleBulkPayment = async () => {
    // التحقق من الصلاحية قبل تنفيذ الدفع
    if (!hasRecordPaymentPermission) {
      toast.error('ليس لديك صلاحية لتسجيل دفعات الديون');
      setIsBulkPaymentModalOpen(false);
      return;
    }
    
    const error = validateBulkPayment(paymentAmount);
    if (error) {
      setPaymentError(error);
      return;
    }
    
    if (!customerData || !customerData.orders.length) {
      setPaymentError('لا توجد ديون مستحقة لتسديدها');
      return;
    }
    
    setIsProcessingPayment(true);
    
    try {
      const amount = parseFloat(paymentAmount);
      const isFullPayment = Math.abs(amount - customerData.totalDebt) < 0.01;
      
      // استراتيجية الدفع: نبدأ بالطلبات ذات المبالغ الأصغر أولاً
      const ordersToPaySorted = [...customerData.orders].sort((a, b) => a.remainingAmount - b.remainingAmount);
      
      let remainingPayment = amount;
      let successCount = 0;
      
      // سداد كل طلب بقدر المبلغ المتبقي
      for (const order of ordersToPaySorted) {
        if (remainingPayment <= 0) break;
        
        const paymentForThisOrder = Math.min(remainingPayment, order.remainingAmount);
        
        // تسجيل الدفع للطلب الحالي
        await recordDebtPayment(
          order.orderId,
          paymentForThisOrder,
          paymentForThisOrder >= order.remainingAmount
        );
        
        remainingPayment -= paymentForThisOrder;
        successCount++;
      }
      
      // إضافة سجل في التاريخ
      const newRecord: PaymentRecord = {
        id: Date.now().toString(),
        date: new Date().toISOString().split('T')[0],
        amount,
        paymentMethod: 'نقدي',
        isFullPayment
      };
      
      setPaymentHistory(prev => [newRecord, ...prev]);
      
      // إغلاق النافذة وتحديث البيانات
      setIsBulkPaymentModalOpen(false);
      toast.success(`تم تسجيل دفع بقيمة ${amount.toFixed(2)} دج بنجاح على ${successCount} طلب`);
      
      // تحديث بيانات العميل
      if (currentOrganization?.id) {
        const debtsData = await getDebtsData(currentOrganization.id);
        const updatedCustomer = debtsData.customerDebts.find(c => c.customerId === customerId);
        if (updatedCustomer) {
          setCustomerData(updatedCustomer);
        }
      }
      
    } catch (error) {
      setPaymentError('حدث خطأ أثناء تسجيل الدفع');
    } finally {
      setIsProcessingPayment(false);
    }
  };
  
  // معالج دفع لطلب محدد
  const handleSinglePayment = async (order: DebtOrder) => {
    // التحقق من الصلاحية
    if (!hasRecordPaymentPermission) {
      toast.error('ليس لديك صلاحية لتسجيل دفعات الديون');
      return;
    }
    
    setSelectedOrderId(order.orderId);
    
    try {
      await recordDebtPayment(
        order.orderId,
        order.remainingAmount,
        true
      );
      
      toast.success(`تم تسديد المبلغ ${order.remainingAmount.toFixed(2)} دج بنجاح للطلب ${order.orderNumber}`);
      
      // تحديث بيانات العميل
      if (currentOrganization?.id) {
        const debtsData = await getDebtsData(currentOrganization.id);
        const updatedCustomer = debtsData.customerDebts.find(c => c.customerId === customerId);
        if (updatedCustomer) {
          setCustomerData(updatedCustomer);
        }
      }
      
      // إضافة سجل في التاريخ
      const newRecord: PaymentRecord = {
        id: Date.now().toString(),
        date: new Date().toISOString().split('T')[0],
        amount: order.remainingAmount,
        paymentMethod: 'نقدي',
        isFullPayment: true
      };
      
      setPaymentHistory(prev => [newRecord, ...prev]);
    } catch (error) {
      toast.error('حدث خطأ أثناء تسجيل الدفع');
    } finally {
      setSelectedOrderId(null);
    }
  };
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* زر العودة وعنوان الصفحة */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/dashboard/customer-debts')}
              className="p-2 rounded-lg hover:bg-muted"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-primary-900">سجل ديون العميل</h1>
          </div>
          
          {customerData && (
            <button
              onClick={openBulkPaymentModal}
              className="bg-primary hover:bg-primary-600 text-white px-4 py-2 rounded-lg shadow-sm text-sm flex items-center"
              disabled={!customerData.totalDebt}
            >
              <BanknotesIcon className="w-4 h-4 ml-1 rtl:mr-1 rtl:ml-0" />
              دفع جميع الديون
            </button>
          )}
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center min-h-[50vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : customerData ? (
          <div className="space-y-6">
            {/* بطاقة معلومات العميل */}
            <div className="bg-card rounded-xl shadow-sm p-6 border border-border">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <UserIcon className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-bold text-foreground">{customerData.customerName}</h2>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    {customerData.ordersCount} طلب • {customerData.orders.length} طلب بدين مستحق
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">إجمالي الديون المستحقة</div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {customerData.totalDebt.toFixed(2)} دج
                  </div>
                </div>
              </div>
            </div>
            
            {/* قسم الطلبات ذات الديون */}
            <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
              {/* رأس القسم */}
              <div 
                className="p-4 flex justify-between items-center cursor-pointer border-b border-border"
                onClick={() => toggleSection('orders')}
              >
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <BanknotesIcon className="w-5 h-5 text-primary" />
                  طلبات بديون مستحقة
                </h2>
                <div className="flex items-center">
                  <span className="ml-2 text-sm text-muted-foreground">{customerData.orders.length} طلب</span>
                  {expandedSections.orders ? (
                    <ChevronUpIcon className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDownIcon className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </div>
              
              {/* محتوى قسم الطلبات */}
              {expandedSections.orders && (
                <div className="p-4">
                  {/* شريط البحث */}
                  <div className="relative mb-4">
                    <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                      <MagnifyingGlassIcon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <input
                      type="text"
                      className="w-full p-2 ps-10 border border-border rounded-lg bg-background"
                      placeholder="بحث في الطلبات..."
                      value={searchTerm}
                      onChange={handleSearch}
                    />
                  </div>
                  
                  {/* جدول الطلبات */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className={`text-xs uppercase ${theme === 'dark' ? 'bg-muted/50' : 'bg-gray-50'}`}>
                        <tr>
                          <th className="px-3 py-3 text-right">رقم الطلب</th>
                          <th className="px-3 py-3 text-right">التاريخ</th>
                          <th className="px-3 py-3 text-right">الموظف</th>
                          <th className="px-3 py-3 text-right">المبلغ الكلي</th>
                          <th className="px-3 py-3 text-right">المدفوع</th>
                          <th className="px-3 py-3 text-right">المتبقي</th>
                          <th className="px-3 py-3 text-center">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredOrders.length > 0 ? (
                          filteredOrders.map((order) => (
                            <tr key={order.orderId} className={`hover:bg-muted/20`}>
                              <td className="px-3 py-4 font-medium">{order.orderNumber}</td>
                              <td className="px-3 py-4">{order.date}</td>
                              <td className="px-3 py-4">{order.employee}</td>
                              <td className="px-3 py-4">{order.total.toFixed(2)} دج</td>
                              <td className="px-3 py-4">{order.amountPaid.toFixed(2)} دج</td>
                              <td className="px-3 py-4 font-semibold text-red-600 dark:text-red-400">
                                {order.remainingAmount.toFixed(2)} دج
                              </td>
                              <td className="px-3 py-4 text-center">
                                <button
                                  onClick={() => handleSinglePayment(order)}
                                  disabled={selectedOrderId === order.orderId}
                                  className="px-3 py-1 bg-primary hover:bg-primary-600 text-white rounded-md text-xs inline-flex items-center"
                                >
                                  {selectedOrderId === order.orderId ? (
                                    <span className="inline-block h-3 w-3 mr-1 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                                  ) : (
                                    <BanknotesIcon className="w-3 h-3 ml-1 rtl:mr-1 rtl:ml-0" />
                                  )}
                                  تسديد الدين
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                              لا توجد طلبات مطابقة لمعايير البحث
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            
            {/* قسم سجل المدفوعات */}
            <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
              {/* رأس القسم */}
              <div 
                className="p-4 flex justify-between items-center cursor-pointer border-b border-border"
                onClick={() => toggleSection('history')}
              >
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-primary" />
                  سجل المدفوعات
                </h2>
                <div className="flex items-center">
                  <span className="ml-2 text-sm text-muted-foreground">{paymentHistory.length} سجل</span>
                  {expandedSections.history ? (
                    <ChevronUpIcon className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDownIcon className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </div>
              
              {/* محتوى قسم سجل المدفوعات */}
              {expandedSections.history && (
                <div className="p-4">
                  {paymentHistory.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className={`text-xs uppercase ${theme === 'dark' ? 'bg-muted/50' : 'bg-gray-50'}`}>
                          <tr>
                            <th className="px-3 py-3 text-right">التاريخ</th>
                            <th className="px-3 py-3 text-right">المبلغ</th>
                            <th className="px-3 py-3 text-right">طريقة الدفع</th>
                            <th className="px-3 py-3 text-right">نوع الدفع</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {paymentHistory.map((record) => (
                            <tr key={record.id} className={`hover:bg-muted/20`}>
                              <td className="px-3 py-4">{record.date}</td>
                              <td className="px-3 py-4 font-medium">{record.amount.toFixed(2)} دج</td>
                              <td className="px-3 py-4">{record.paymentMethod}</td>
                              <td className="px-3 py-4">
                                <span className={`inline-flex rounded-full px-2 text-xs ${
                                  record.isFullPayment 
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                                }`}>
                                  {record.isFullPayment ? 'دفع كامل' : 'دفع جزئي'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      لا يوجد سجل مدفوعات للعميل حتى الآن
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-900 p-4 rounded-lg text-yellow-800 dark:text-yellow-400">
            لم يتم العثور على بيانات العميل
          </div>
        )}
      </div>
      
      {/* نافذة الدفع الشامل */}
      {isBulkPaymentModalOpen && customerData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className={`w-full max-w-md rounded-lg shadow-lg ${theme === 'dark' ? 'bg-card' : 'bg-white'}`}>
            <div className="flex justify-between items-center p-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">تسديد جميع الديون</h3>
              <button
                onClick={() => setIsBulkPaymentModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
                disabled={isProcessingPayment}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-6 p-4 rounded-lg bg-muted/30">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <p className="text-muted-foreground">العميل:</p>
                    <p className="font-medium text-foreground">{customerData.customerName}</p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-muted-foreground">عدد الطلبات:</p>
                    <p className="font-medium text-foreground">{customerData.orders.length}</p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-muted-foreground">إجمالي الديون:</p>
                    <p className="font-medium text-xl text-red-600 dark:text-red-400">{customerData.totalDebt.toFixed(2)} دج</p>
                  </div>
                </div>
              </div>
              
              <form onSubmit={(e) => { e.preventDefault(); handleBulkPayment(); }}>
                <div className="mb-4">
                  <label htmlFor="amount" className="block text-sm font-medium text-foreground mb-1">
                    مبلغ الدفع
                  </label>
                  <input
                    type="number"
                    id="amount"
                    value={paymentAmount}
                    onChange={handleBulkPaymentChange}
                    step="0.01"
                    min="0.01"
                    max={customerData.totalDebt}
                    className="w-full p-2 border border-border rounded-md bg-background focus:ring-primary focus:border-primary"
                    required
                    disabled={isProcessingPayment}
                  />
                  {paymentError && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{paymentError}</p>
                  )}
                </div>
                
                <div className="flex justify-end gap-2 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsBulkPaymentModalOpen(false)}
                    disabled={isProcessingPayment}
                    className="px-4 py-2 border border-border rounded-md text-foreground hover:bg-muted"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessingPayment || Boolean(paymentError)}
                    className="px-4 py-2 bg-primary hover:bg-primary-600 disabled:bg-primary-300 text-white rounded-md flex items-center"
                  >
                    {isProcessingPayment && (
                      <span className="inline-block h-4 w-4 mr-2 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                    )}
                    {isProcessingPayment ? 'جاري التنفيذ...' : 'تسجيل الدفع'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default CustomerDebtDetails;
