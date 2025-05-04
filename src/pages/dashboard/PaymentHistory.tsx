import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { useTenant } from '@/context/TenantContext';
import { toast } from 'sonner';
import { useTheme } from '@/context/ThemeContext';
import { 
  MagnifyingGlassIcon, 
  CalendarIcon, 
  ArrowPathIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UserIcon
} from '@heroicons/react/24/outline';

// واجهات برمجة التطبيقات
import { getDebtsData } from '@/lib/api/debts';
import { supabase } from '@/lib/supabase';

// واجهة بيانات السجل
interface PaymentRecord {
  id: string;
  date: string;
  customerName: string;
  customerId: string;
  orderNumber: string;
  amount: number;
  paymentMethod: string;
  type: 'payment' | 'debt';
  employee: string;
  remainingAmount?: number;
}

const PaymentHistory: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { currentOrganization } = useTenant();
  
  // حالات البيانات
  const [isLoading, setIsLoading] = useState(true);
  const [records, setRecords] = useState<PaymentRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: keyof PaymentRecord;
    direction: 'ascending' | 'descending';
  }>({ key: 'date', direction: 'descending' });
  
  // حالة الترشيح
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    paymentType: 'all', // 'all', 'payment', 'debt'
    customer: '',
  });
  
  // حالة الصفحات
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 15;
  
  // تحميل بيانات السجلات
  useEffect(() => {
    if (!currentOrganization?.id) {
      console.warn('معرف المؤسسة غير متوفر!', { currentOrganization });
      return;
    }
    
    const loadPaymentHistory = async () => {
      try {
        setIsLoading(true);
        
        // استعلام مباشر لجميع الطلبات والمدفوعات للمؤسسة (بما في ذلك المدفوعة بالكامل)
        console.log('جاري الاستعلام عن سجل المدفوعات التاريخي للمؤسسة:', currentOrganization.id);
        
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select(`
            id, 
            created_at,
            status,
            total,
            amount_paid,
            remaining_amount,
            payment_status,
            payment_method,
            customer_id,
            employees:employee_id(id, name),
            customers(id, name)
          `)
          .eq('organization_id', currentOrganization.id)
          .order('created_at', { ascending: false })
          .limit(100);
          
        if (ordersError) {
          console.error('خطأ في استعلام الطلبات:', ordersError);
          throw ordersError;
        }
        
        console.log('تم استلام بيانات الطلبات:', ordersData ? ordersData.length : 0);
        
        // تحويل بيانات الطلبات إلى سجلات تاريخية
        const allRecords: PaymentRecord[] = [];
        
        if (ordersData && ordersData.length > 0) {
          // معالجة الطلبات وإنشاء سجلات منها
          ordersData.forEach(order => {
            const customerName = order.customers ? order.customers.name : 'عميل غير معروف';
            const customerId = order.customers ? order.customers.id : 'unknown';
            const employeeName = order.employees ? order.employees.name : 'غير معروف';
            const orderNumber = `ORD-${order.id.substring(0, 8)}`;
            const orderDate = new Date(order.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            }).replace(/\//g, '-');
            
            // إضافة سجل للطلب (الدين)
            allRecords.push({
              id: `debt-${order.id}`,
              date: orderDate,
              customerName,
              customerId,
              orderNumber,
              amount: parseFloat(order.total),
              paymentMethod: '-',
              type: 'debt',
              employee: employeeName,
              remainingAmount: parseFloat(order.remaining_amount || '0')
            });
            
            // إضافة سجل للمبلغ المدفوع (إذا وجد)
            if (parseFloat(order.amount_paid) > 0) {
              allRecords.push({
                id: `payment-${order.id}`,
                date: orderDate, // نفس تاريخ الطلب
                customerName,
                customerId,
                orderNumber,
                amount: parseFloat(order.amount_paid),
                paymentMethod: order.payment_method || 'نقدي',
                type: 'payment',
                employee: employeeName,
                remainingAmount: parseFloat(order.remaining_amount || '0')
              });
            }
          });
        }
        
        console.log('إجمالي السجلات المستخرجة من الاستعلام المباشر:', allRecords.length);
        
        if (allRecords.length === 0) {
          console.warn('لم يتم استخراج أي سجلات من الاستعلام المباشر');
          toast.info('لا توجد سجلات دفع أو ديون متاحة حالياً');
        }
        
        // ترتيب السجلات حسب التاريخ من الأحدث للأقدم
        allRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        setRecords(allRecords);
        
        if (allRecords.length > 0) {
          console.log('تم تعيين السجلات بنجاح! عدد السجلات:', allRecords.length);
        }
      } catch (error) {
        console.error('خطأ في تحميل سجلات المدفوعات:', error);
        toast.error('حدث خطأ أثناء تحميل سجلات المدفوعات');
        setRecords([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPaymentHistory();
  }, [currentOrganization?.id, supabase]);
  
  // معالج البحث
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // إعادة تعيين رقم الصفحة عند البحث
  };
  
  // معالج تغيير الفلتر
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1); // إعادة تعيين رقم الصفحة عند تغيير الفلتر
  };
  
  // معالج الترتيب
  const handleSort = (key: keyof PaymentRecord) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'ascending' 
        ? 'descending' 
        : 'ascending'
    }));
  };
  
  // تحديد الاتجاه والعمود المُرتب حالياً
  const getSortDirection = (key: keyof PaymentRecord) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'ascending' 
        ? <ArrowUpIcon className="h-4 w-4 text-primary" /> 
        : <ArrowDownIcon className="h-4 w-4 text-primary" />;
    }
    return null;
  };
  
  // تطبيق الفلاتر على السجلات
  const filteredRecords = records.filter(record => {
    // البحث العام
    const matchesSearch = 
      record.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.amount.toString().includes(searchTerm) ||
      record.employee.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase());
    
    // فلتر التاريخ
    const recordDate = new Date(record.date);
    const matchesStartDate = !filters.startDate || recordDate >= new Date(filters.startDate);
    const matchesEndDate = !filters.endDate || recordDate <= new Date(filters.endDate);
    
    // فلتر نوع السجل
    const matchesType = filters.paymentType === 'all' || record.type === filters.paymentType;
    
    // فلتر العميل
    const matchesCustomer = !filters.customer || record.customerId === filters.customer;
    
    return matchesSearch && matchesStartDate && matchesEndDate && matchesType && matchesCustomer;
  });
  
  // ترتيب السجلات المفلترة
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    const { key, direction } = sortConfig;
    
    if (key === 'date') {
      // ترتيب التاريخ
      return direction === 'ascending'
        ? new Date(a.date).getTime() - new Date(b.date).getTime()
        : new Date(b.date).getTime() - new Date(a.date).getTime();
    } else if (key === 'amount') {
      // ترتيب المبلغ
      return direction === 'ascending'
        ? a.amount - b.amount
        : b.amount - a.amount;
    } else {
      // ترتيب النصوص
      const aValue = a[key] as string;
      const bValue = b[key] as string;
      
      return direction === 'ascending'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
  });
  
  // حساب المجموع
  const totalAmount = filteredRecords.reduce((sum, record) => {
    if (record.type === 'payment') {
      return sum + record.amount;
    } else {
      return sum;
    }
  }, 0);
  
  // عدد السجلات
  const totalRecords = filteredRecords.length;
  const totalPayments = filteredRecords.filter(r => r.type === 'payment').length;
  const totalDebts = filteredRecords.filter(r => r.type === 'debt').length;
  
  // تقسيم الصفحات
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = sortedRecords.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(sortedRecords.length / recordsPerPage);
  
  // تغيير الصفحة
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  
  // الحصول على قائمة العملاء الفريدة للفلتر
  const uniqueCustomers = Array.from(
    new Set(records.map(record => JSON.stringify({ id: record.customerId, name: record.customerName })))
  ).map(str => JSON.parse(str) as { id: string, name: string });
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* عنوان الصفحة وأزرار الإجراءات */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/dashboard/customer-debts')}
              className="p-2 rounded-lg hover:bg-muted"
              title="العودة إلى إدارة الديون"
            >
              <ChevronRightIcon className="w-5 h-5 rtl:rotate-180" />
            </button>
            <h1 className="text-2xl font-bold text-primary-900">سجلات الدفع والديون</h1>
          </div>
          
          <button
            onClick={() => window.location.reload()}
            className="bg-primary hover:bg-primary-600 text-white px-4 py-2 rounded-lg shadow-sm text-sm flex items-center"
          >
            <ArrowPathIcon className="w-4 h-4 ml-1 rtl:mr-1 rtl:ml-0" />
            تحديث السجلات
          </button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center min-h-[50vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* بطاقة ملخص السجلات */}
            <div className="bg-card rounded-xl shadow-sm p-6 border border-border">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-primary/10">
                    <CalendarIcon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">إجمالي السجلات</p>
                    <p className="text-2xl font-bold">{totalRecords}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/20">
                    <ArrowUpIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">المدفوعات</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold">{totalPayments}</p>
                      <p className="text-sm text-muted-foreground">({totalAmount.toFixed(2)} دج)</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/20">
                    <ArrowDownIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">الديون</p>
                    <p className="text-2xl font-bold">{totalDebts}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* فلاتر البحث والتصفية */}
            <div className="bg-card rounded-xl shadow-sm p-6 border border-border">
              <h2 className="text-lg font-bold mb-4 text-foreground">تصفية وبحث</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* البحث العام */}
                <div className="relative">
                  <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                    <MagnifyingGlassIcon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <input
                    type="text"
                    className="w-full p-2 ps-10 border border-border rounded-lg bg-background"
                    placeholder="بحث في السجلات..."
                    value={searchTerm}
                    onChange={handleSearch}
                  />
                </div>
                
                {/* فلتر العميل */}
                <div className="relative">
                  <label htmlFor="customer" className="block text-sm font-medium text-muted-foreground mb-1">
                    العميل
                  </label>
                  <select
                    id="customer"
                    name="customer"
                    value={filters.customer}
                    onChange={handleFilterChange}
                    className="w-full p-2 border border-border rounded-lg bg-background"
                  >
                    <option value="">جميع العملاء</option>
                    {uniqueCustomers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* فلتر نوع السجل */}
                <div>
                  <label htmlFor="paymentType" className="block text-sm font-medium text-muted-foreground mb-1">
                    نوع السجل
                  </label>
                  <select
                    id="paymentType"
                    name="paymentType"
                    value={filters.paymentType}
                    onChange={handleFilterChange}
                    className="w-full p-2 border border-border rounded-lg bg-background"
                  >
                    <option value="all">الكل</option>
                    <option value="payment">المدفوعات</option>
                    <option value="debt">الديون</option>
                  </select>
                </div>
                
                {/* فلتر التاريخ */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-muted-foreground mb-1">
                      من تاريخ
                    </label>
                    <input
                      type="date"
                      id="startDate"
                      name="startDate"
                      value={filters.startDate}
                      onChange={handleFilterChange}
                      className="w-full p-2 border border-border rounded-lg bg-background"
                    />
                  </div>
                  <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-muted-foreground mb-1">
                      إلى تاريخ
                    </label>
                    <input
                      type="date"
                      id="endDate"
                      name="endDate"
                      value={filters.endDate}
                      onChange={handleFilterChange}
                      className="w-full p-2 border border-border rounded-lg bg-background"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* جدول السجلات */}
            <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className={`text-xs uppercase ${theme === 'dark' ? 'bg-muted/50' : 'bg-gray-50'}`}>
                    <tr>
                      <th className="px-3 py-3 text-right cursor-pointer" onClick={() => handleSort('date')}>
                        <div className="flex items-center justify-end">
                          التاريخ
                          {getSortDirection('date')}
                        </div>
                      </th>
                      <th className="px-3 py-3 text-right cursor-pointer" onClick={() => handleSort('customerName')}>
                        <div className="flex items-center justify-end">
                          العميل
                          {getSortDirection('customerName')}
                        </div>
                      </th>
                      <th className="px-3 py-3 text-right cursor-pointer" onClick={() => handleSort('orderNumber')}>
                        <div className="flex items-center justify-end">
                          رقم الطلب
                          {getSortDirection('orderNumber')}
                        </div>
                      </th>
                      <th className="px-3 py-3 text-right cursor-pointer" onClick={() => handleSort('amount')}>
                        <div className="flex items-center justify-end">
                          المبلغ
                          {getSortDirection('amount')}
                        </div>
                      </th>
                      <th className="px-3 py-3 text-right">طريقة الدفع</th>
                      <th className="px-3 py-3 text-right">المتبقي</th>
                      <th className="px-3 py-3 text-right">النوع</th>
                      <th className="px-3 py-3 text-right cursor-pointer" onClick={() => handleSort('employee')}>
                        <div className="flex items-center justify-end">
                          الموظف
                          {getSortDirection('employee')}
                        </div>
                      </th>
                      <th className="px-3 py-3 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {currentRecords.length > 0 ? (
                      currentRecords.map((record) => (
                        <tr key={record.id} className={`hover:bg-muted/20`}>
                          <td className="px-3 py-4">{record.date}</td>
                          <td className="px-3 py-4 font-medium flex items-center gap-1">
                            <UserIcon className="h-4 w-4 text-muted-foreground" />
                            {record.customerName}
                          </td>
                          <td className="px-3 py-4">{record.orderNumber}</td>
                          <td className="px-3 py-4 font-medium">
                            {record.amount.toFixed(2)} دج
                          </td>
                          <td className="px-3 py-4">{record.paymentMethod}</td>
                          <td className="px-3 py-4 font-medium">
                            {record.type === 'debt' && record.remainingAmount !== undefined ? 
                              <span className={record.remainingAmount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                                {record.remainingAmount.toFixed(2)} دج
                              </span> 
                              : '-'}
                          </td>
                          <td className="px-3 py-4">
                            <span className={`inline-flex rounded-full px-2 text-xs ${
                              record.type === 'payment' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {record.type === 'payment' ? 'دفع' : 'دين'}
                            </span>
                          </td>
                          <td className="px-3 py-4">{record.employee}</td>
                          <td className="px-3 py-4 text-center">
                            <button
                              onClick={() => navigate(`/dashboard/customer-debt-details/${record.customerId}`)}
                              className="text-primary hover:text-primary-600"
                              title="عرض تفاصيل العميل"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                          لا توجد سجلات مطابقة لمعايير البحث
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* ترقيم الصفحات */}
              {sortedRecords.length > recordsPerPage && (
                <div className="p-4 border-t border-border flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    عرض {indexOfFirstRecord + 1}-{Math.min(indexOfLastRecord, sortedRecords.length)} من {sortedRecords.length} سجل
                  </div>
                  
                  <div className="flex gap-1">
                    <button
                      onClick={prevPage}
                      disabled={currentPage === 1}
                      className="p-2 rounded-md border border-border disabled:opacity-50"
                    >
                      <ChevronLeftIcon className="h-4 w-4 rtl:rotate-180" />
                    </button>
                    
                    {Array.from({ length: Math.min(5, totalPages) }).map((_, index) => {
                      let pageNumber;
                      if (totalPages <= 5) {
                        pageNumber = index + 1;
                      } else if (currentPage <= 3) {
                        pageNumber = index + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNumber = totalPages - 4 + index;
                      } else {
                        pageNumber = currentPage - 2 + index;
                      }
                      
                      return (
                        <button
                          key={pageNumber}
                          onClick={() => paginate(pageNumber)}
                          className={`w-8 h-8 text-sm rounded-md ${
                            currentPage === pageNumber
                              ? 'bg-primary text-white'
                              : 'border border-border hover:bg-muted'
                          }`}
                        >
                          {pageNumber}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={nextPage}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-md border border-border disabled:opacity-50"
                    >
                      <ChevronRightIcon className="h-4 w-4 rtl:rotate-180" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PaymentHistory; 