// =================================================================
// 🚀 Orders Optimized - صفحة الطلبيات المحسنة باستخدام النظام الموحد
// =================================================================

import React, { useState, useMemo } from 'react';
import { useOrdersData, useUnifiedData } from '@/context/UnifiedDataContext';
import { useIsDataRequired } from '@/hooks/useSmartDataLoading';
import { 
  AlertCircle, 
  Loader2, 
  Search, 
  Filter, 
  RefreshCw, 
  Eye, 
  Edit, 
  Trash2,
  ChevronLeft,
  ChevronRight,
  Package,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Calendar
} from 'lucide-react';

// =================================================================
// 🎯 المكونات الفرعية
// =================================================================

interface OrderStatusBadgeProps {
  status: string;
  paymentStatus?: string;
}

const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({ status, paymentStatus }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'مكتمل';
      case 'pending':
        return 'قيد الانتظار';
      case 'cancelled':
        return 'ملغي';
      case 'processing':
        return 'قيد المعالجة';
      default:
        return status;
    }
  };

  const getPaymentStatusColor = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'partial':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusText = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'paid':
        return 'مدفوع';
      case 'pending':
        return 'في انتظار الدفع';
      case 'failed':
        return 'فشل الدفع';
      case 'partial':
        return 'دفع جزئي';
      default:
        return paymentStatus;
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
        {getStatusText(status)}
      </span>
      {paymentStatus && (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(paymentStatus)}`}>
          {getPaymentStatusText(paymentStatus)}
        </span>
      )}
    </div>
  );
};

interface OrderCardProps {
  orderItem: any;
  onViewDetails: (orderId: string) => void;
  onEdit?: (orderId: string) => void;
  onDelete?: (orderId: string) => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ orderItem, onViewDetails, onEdit, onDelete }) => {
  const order = orderItem.order;
  const customer = orderItem.customer;
  const employee = orderItem.employee;
  const effectiveTotal = orderItem.effective_total || order.total;
  const itemsCount = orderItem.items_count || 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            طلبية #{order.customer_order_number}
          </h3>
          <div className="flex items-center text-sm text-gray-600 mb-2">
            <Calendar className="w-4 h-4 ml-1" />
            {new Date(order.created_at).toLocaleDateString('ar-SA')}
          </div>
        </div>
        <OrderStatusBadge status={order.status} paymentStatus={order.payment_status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <div className="flex items-center text-sm text-gray-600 mb-1">
            <User className="w-4 h-4 ml-1" />
            العميل
          </div>
          <p className="font-medium text-gray-900">
            {customer?.name || 'زائر'}
          </p>
          {customer?.phone && (
            <p className="text-sm text-gray-600">{customer.phone}</p>
          )}
        </div>

        <div>
          <div className="flex items-center text-sm text-gray-600 mb-1">
            <User className="w-4 h-4 ml-1" />
            الموظف
          </div>
          <p className="font-medium text-gray-900">
            {employee?.name || 'غير محدد'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <Package className="w-5 h-5 text-blue-600 mx-auto mb-1" />
          <p className="text-sm text-gray-600">العناصر</p>
          <p className="font-semibold text-gray-900">{itemsCount}</p>
        </div>

        <div className="text-center p-3 bg-green-50 rounded-lg">
          <DollarSign className="w-5 h-5 text-green-600 mx-auto mb-1" />
          <p className="text-sm text-gray-600">الإجمالي</p>
          <p className="font-semibold text-gray-900">{effectiveTotal?.toLocaleString()} دج</p>
        </div>

        {order.payment_method && (
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="w-5 h-5 bg-purple-600 rounded mx-auto mb-1"></div>
            <p className="text-sm text-gray-600">طريقة الدفع</p>
            <p className="font-semibold text-gray-900">
              {order.payment_method === 'cash' ? 'نقدي' : 
               order.payment_method === 'card' ? 'بطاقة' : 
               order.payment_method}
            </p>
          </div>
        )}

        {orderItem.returns_amount > 0 && (
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <XCircle className="w-5 h-5 text-red-600 mx-auto mb-1" />
            <p className="text-sm text-gray-600">مرتجع</p>
            <p className="font-semibold text-gray-900">{orderItem.returns_amount?.toLocaleString()} دج</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-2 space-x-reverse">
          <button
            onClick={() => onViewDetails(order.id)}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Eye className="w-4 h-4 ml-1" />
            عرض التفاصيل
          </button>
          {onEdit && (
            <button
              onClick={() => onEdit(order.id)}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Edit className="w-4 h-4 ml-1" />
              تعديل
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(order.id)}
              className="inline-flex items-center px-3 py-1.5 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <Trash2 className="w-4 h-4 ml-1" />
              حذف
            </button>
          )}
        </div>

        {order.notes && (
          <div className="text-xs text-gray-500 max-w-xs truncate">
            ملاحظات: {order.notes}
          </div>
        )}
      </div>
    </div>
  );
};

// =================================================================
// 🎯 المكون الرئيسي
// =================================================================

const OrdersOptimized: React.FC = () => {
  // استخدام النظام الموحد الجديد
  const { ordersData, isLoading, error, refresh } = useOrdersData();
  const { getOrderDetails, refreshAll } = useUnifiedData();
  const { isOrdersDataRequired } = useIsDataRequired();

  // حالات محلية للفلترة والبحث
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // استخراج البيانات
  const orders = ordersData?.orders || [];
  const stats = ordersData?.stats;
  const employees = ordersData?.employees || [];
  const totalCount = ordersData?.total_count || 0;
  const pagination = ordersData?.pagination;

  // فلترة الطلبيات
  const filteredOrders = useMemo(() => {
    return orders.filter(orderItem => {
      const order = orderItem.order;
      const customer = orderItem.customer;
      
      // فلترة البحث
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          order.customer_order_number?.toString().includes(searchLower) ||
          customer?.name?.toLowerCase().includes(searchLower) ||
          customer?.phone?.includes(searchTerm) ||
          order.id?.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      // فلترة الحالة
      if (statusFilter !== 'all' && order.status !== statusFilter) {
        return false;
      }

      // فلترة حالة الدفع
      if (paymentStatusFilter !== 'all' && order.payment_status !== paymentStatusFilter) {
        return false;
      }

      // فلترة الموظف
      if (employeeFilter !== 'all' && order.employee_id !== employeeFilter) {
        return false;
      }

      return true;
    });
  }, [orders, searchTerm, statusFilter, paymentStatusFilter, employeeFilter]);

  // دوال التفاعل
  const handleViewDetails = async (orderId: string) => {
    try {
      const details = await getOrderDetails(orderId);
      // يمكن فتح modal أو navigate لصفحة التفاصيل
      alert('تم عرض تفاصيل الطلبية في الكونسول');
    } catch (error) {
      alert('حدث خطأ في جلب تفاصيل الطلبية');
    }
  };

  const handleEditOrder = (orderId: string) => {
    alert(`تعديل الطلبية: ${orderId}`);
  };

  const handleDeleteOrder = (orderId: string) => {
    if (confirm('هل أنت متأكد من حذف هذه الطلبية؟')) {
      alert(`حذف الطلبية: ${orderId}`);
    }
  };

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    try {
      await refreshAll();
    } catch (error) {
    } finally {
      setIsRefreshing(false);
    }
  };

  // عرض حالة التحميل
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">جاري تحميل الطلبيات</h2>
          <p className="text-gray-600">يتم تحميل بيانات الطلبيات والإحصائيات...</p>
        </div>
      </div>
    );
  }

  // عرض حالة الخطأ
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">خطأ في تحميل البيانات</h2>
          <p className="text-gray-600 text-center mb-6">{error}</p>
          <button
            onClick={handleRefreshAll}
            disabled={isRefreshing}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            {isRefreshing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
                جاري إعادة المحاولة...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 ml-2" />
                إعادة المحاولة
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* رأس الصفحة */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">إدارة الطلبيات</h1>
              <p className="text-sm text-gray-600">
                {totalCount} طلبية • {filteredOrders.length} معروضة
              </p>
            </div>
            <button
              onClick={handleRefreshAll}
              disabled={isRefreshing}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
            >
              {isRefreshing ? (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              ) : (
                <RefreshCw className="w-4 h-4 ml-2" />
              )}
              {isRefreshing ? 'جاري التحديث...' : 'تحديث البيانات'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* بطاقات الإحصائيات */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-gray-600">إجمالي الطلبيات</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_orders}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-gray-600">إجمالي المبيعات</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_revenue?.toLocaleString()} دج</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-gray-600">قيد الانتظار</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pending_orders}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-purple-600" />
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-gray-600">مبيعات اليوم</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.today_revenue?.toLocaleString()} دج</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* شريط البحث والفلترة */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">البحث</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="رقم الطلبية، اسم العميل، رقم الهاتف..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">حالة الطلبية</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">جميع الحالات</option>
                <option value="completed">مكتمل</option>
                <option value="pending">قيد الانتظار</option>
                <option value="processing">قيد المعالجة</option>
                <option value="cancelled">ملغي</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">حالة الدفع</label>
              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">جميع حالات الدفع</option>
                <option value="paid">مدفوع</option>
                <option value="pending">في انتظار الدفع</option>
                <option value="partial">دفع جزئي</option>
                <option value="failed">فشل الدفع</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الموظف</label>
              <select
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">جميع الموظفين</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* قائمة الطلبيات */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد طلبيات</h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all' || paymentStatusFilter !== 'all' || employeeFilter !== 'all'
                  ? 'لا توجد طلبيات تطابق الفلاتر المحددة'
                  : 'لم يتم العثور على أي طلبيات'
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredOrders.map((orderItem) => (
              <OrderCard
                key={orderItem.order.id}
                orderItem={orderItem}
                onViewDetails={handleViewDetails}
                onEdit={handleEditOrder}
                onDelete={handleDeleteOrder}
              />
            ))}
          </div>
        )}

        {/* معلومات Pagination */}
        {pagination && pagination.total_pages > 1 && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mt-8">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                صفحة {pagination.current_page} من {pagination.total_pages}
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <button
                  disabled={pagination.current_page === 1}
                  className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  disabled={pagination.current_page === pagination.total_pages}
                  className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersOptimized;
