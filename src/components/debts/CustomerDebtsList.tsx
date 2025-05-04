import React, { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { checkUserPermissions } from '@/lib/api/permissions';
import { ChevronDownIcon, ChevronUpIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import { CustomerDebt, DebtOrder } from '@/lib/api/debts';
import { useNavigate } from 'react-router-dom';

interface CustomerDebtsListProps {
  customers: CustomerDebt[];
  onPaymentClick: (debt: DebtOrder) => void;
  canRecordPayment?: boolean;
}

const CustomerDebtsList: React.FC<CustomerDebtsListProps> = ({ 
  customers, 
  onPaymentClick, 
  canRecordPayment = false  // تغيير القيمة الافتراضية إلى false
}) => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [expandedCustomers, setExpandedCustomers] = useState<{[key: string]: boolean}>({});
  const [hasPaymentPermission, setHasPaymentPermission] = useState(false);
  
  // التحقق من صلاحيات المستخدم
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        if (!user) {
          setHasPaymentPermission(false);
          return;
        }

        // إذا تم تمرير قيمة canRecordPayment، استخدمها، وإلا تحقق من الصلاحيات
        if (canRecordPayment !== undefined) {
          setHasPaymentPermission(canRecordPayment);
        } else {
          // التحقق من صلاحية تسجيل دفعات الديون
          const canRecordPayments = await checkUserPermissions(user, 'recordDebtPayments');
          setHasPaymentPermission(canRecordPayments);
        }
      } catch (err) {
        console.error('خطأ في التحقق من الصلاحيات:', err);
        setHasPaymentPermission(false);
      }
    };

    checkPermissions();
  }, [user, canRecordPayment]);
  
  // تبديل عرض/إخفاء تفاصيل ديون العميل
  const toggleCustomerDetails = (customerId: string) => {
    setExpandedCustomers(prev => ({
      ...prev,
      [customerId]: !prev[customerId]
    }));
  };
  
  // معالج الدفع مع التحقق من الصلاحيات
  const handlePaymentClick = (order: DebtOrder) => {
    if (!hasPaymentPermission) {
      return; // لا تفعل شيئًا إذا لم تكن هناك صلاحيات
    }
    
    onPaymentClick(order);
  };
  
  return (
    <div className="bg-card rounded-xl shadow-sm p-6 border border-border">
      <h2 className="text-xl font-bold mb-4 text-foreground">قائمة ديون العملاء</h2>
      
      {customers.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          لا توجد ديون مسجلة للعملاء
        </div>
      ) : (
        <div className="space-y-4">
          {customers.map((customer) => (
            <div key={customer.customerId} className="border border-border rounded-lg overflow-hidden">
              {/* رأس قسم العميل */}
              <div 
                className="p-4 flex justify-between items-center cursor-pointer border-b border-border"
              >
                <div className="flex-grow" onClick={() => toggleCustomerDetails(customer.customerId)}>
                  <h3 className="font-medium text-foreground">{customer.customerName}</h3>
                  <p className="text-sm text-muted-foreground">{customer.ordersCount} طلب</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-left rtl:text-right">
                    <p className="font-semibold text-foreground">{customer.totalDebt.toFixed(2)} دج</p>
                    <p className="text-xs text-muted-foreground">إجمالي الديون المستحقة</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/dashboard/customer-debt-details/${customer.customerId}`);
                      }}
                      className="p-1.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary"
                      title="عرض التفاصيل الكاملة"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    {expandedCustomers[customer.customerId] ? (
                      <button
                        onClick={() => toggleCustomerDetails(customer.customerId)}
                        className="p-1.5 rounded-md hover:bg-muted"
                      >
                        <ChevronUpIcon className="w-4 h-4 text-muted-foreground" />
                      </button>
                    ) : (
                      <button
                        onClick={() => toggleCustomerDetails(customer.customerId)}
                        className="p-1.5 rounded-md hover:bg-muted"
                      >
                        <ChevronDownIcon className="w-4 h-4 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              {/* تفاصيل ديون العميل */}
              {expandedCustomers[customer.customerId] && (
                <div className="border-t border-border">
                  {/* عنوان الجدول */}
                  <div className={`grid grid-cols-7 gap-4 p-3 text-sm font-medium ${theme === 'dark' ? 'bg-muted/50' : 'bg-gray-50'}`}>
                    <div className="col-span-1">رقم الطلب</div>
                    <div className="col-span-1">التاريخ</div>
                    <div className="col-span-1">الموظف</div>
                    <div className="col-span-1">المبلغ الكلي</div>
                    <div className="col-span-1">المدفوع</div>
                    <div className="col-span-1">المتبقي</div>
                    <div className="col-span-1 text-center">الإجراءات</div>
                  </div>
                  
                  {/* قائمة الطلبات */}
                  {customer.orders.map((order) => (
                    <div key={order.orderId} className="grid grid-cols-7 gap-4 p-3 text-sm border-t border-border">
                      <div className="col-span-1">{order.orderNumber}</div>
                      <div className="col-span-1">{order.date}</div>
                      <div className="col-span-1">{order.employee}</div>
                      <div className="col-span-1">{order.total.toFixed(2)} دج</div>
                      <div className="col-span-1">{order.amountPaid.toFixed(2)} دج</div>
                      <div className="col-span-1 font-semibold text-red-600 dark:text-red-400">
                        {order.remainingAmount.toFixed(2)} دج
                      </div>
                      <div className="col-span-1 flex justify-center">
                        {hasPaymentPermission ? (
                          <button
                            onClick={() => handlePaymentClick(order)}
                            className="px-3 py-1 bg-primary hover:bg-primary-600 text-white rounded-md text-xs flex items-center"
                          >
                            <BanknotesIcon className="w-3 h-3 ml-1 rtl:mr-1 rtl:ml-0" />
                            تسجيل دفع
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">غير مصرح</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerDebtsList; 