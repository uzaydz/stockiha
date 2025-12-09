import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreVertical,
  Eye,
  Wallet,
  ChevronDown,
  ChevronUp,
  User,
  Calendar,
  DollarSign,
  Package,
  Info,
} from 'lucide-react';
import { CustomerDebt, DebtOrder } from '@/lib/api/debts';
import { formatPrice } from '@/lib/utils';
import { cn } from '@/lib/utils';
import CustomerInfoModal from './CustomerInfoModal';
import OrderDetailsModal from './OrderDetailsModal';

interface CustomerDebtsTableProps {
  customers: CustomerDebt[];
  onPaymentClick: (debt: DebtOrder) => void;
  canRecordPayment?: boolean;
  // ⚡ Props للـ Lazy Loading
  onExpandCustomer?: (customerId: string | null) => void;
  expandedCustomerId?: string | null;
  isLoadingOrders?: boolean;
}

const CustomerDebtsTable: React.FC<CustomerDebtsTableProps> = ({
  customers,
  onPaymentClick,
  canRecordPayment = false,
  onExpandCustomer,
  expandedCustomerId,
  isLoadingOrders = false,
}) => {
  const navigate = useNavigate();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // حالة نافذة معلومات العميل
  const [customerInfoModal, setCustomerInfoModal] = useState<{
    isOpen: boolean;
    customerId: string | null;
    customerName: string;
    totalDebt: number;
    ordersCount: number;
  }>({
    isOpen: false,
    customerId: null,
    customerName: '',
    totalDebt: 0,
    ordersCount: 0,
  });

  // حالة نافذة تفاصيل الطلب
  const [orderDetailsModal, setOrderDetailsModal] = useState<{
    isOpen: boolean;
    order: {
      orderId: string;
      orderNumber: string;
      date: string;
      total: number;
      amountPaid: number;
      remainingAmount: number;
      employee: string;
    } | null;
  }>({
    isOpen: false,
    order: null,
  });

  // فتح نافذة معلومات العميل
  const openCustomerInfo = (customer: CustomerDebt) => {
    setCustomerInfoModal({
      isOpen: true,
      customerId: customer.customerId,
      customerName: customer.customerName,
      totalDebt: customer.totalDebt,
      ordersCount: customer.ordersCount,
    });
  };

  // فتح نافذة تفاصيل الطلب
  const openOrderDetails = (order: DebtOrder) => {
    setOrderDetailsModal({
      isOpen: true,
      order: {
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        date: order.date,
        total: order.total,
        amountPaid: order.amountPaid,
        remainingAmount: order.remainingAmount,
        employee: order.employee,
      },
    });
  };

  // ⚡ استخدام العملاء مباشرة (البحث يتم في الصفحة الرئيسية)
  const filteredCustomers = customers;

  // تبديل توسيع الصف - مع دعم Lazy Loading
  const toggleRow = (customerId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) {
        newSet.delete(customerId);
        // ⚡ إلغاء تحديد العميل للـ Lazy Loading
        if (onExpandCustomer) {
          onExpandCustomer(null);
        }
      } else {
        // ⚡ إغلاق جميع الصفوف الأخرى وفتح الصف الجديد فقط
        newSet.clear();
        newSet.add(customerId);
        // ⚡ تحديد العميل لجلب طلباته (Lazy Loading)
        if (onExpandCustomer) {
          onExpandCustomer(customerId);
        }
      }
      return newSet;
    });
  };

  // حساب الإجماليات
  const totals = useMemo(() => {
    return filteredCustomers.reduce(
      (acc, customer) => ({
        totalDebt: acc.totalDebt + customer.totalDebt,
        ordersCount: acc.ordersCount + customer.ordersCount,
      }),
      { totalDebt: 0, ordersCount: 0 }
    );
  }, [filteredCustomers]);

  return (
    <div className="space-y-4">
      {/* الجدول */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-[50px]"></TableHead>
              <TableHead className="font-semibold">العميل</TableHead>
              <TableHead className="font-semibold text-center">عدد الطلبات</TableHead>
              <TableHead className="font-semibold text-center">إجمالي الدين</TableHead>
              <TableHead className="font-semibold text-center">الحالة</TableHead>
              <TableHead className="w-[100px] text-center font-semibold">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  لا توجد ديون مسجلة
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((customer) => (
                <React.Fragment key={customer.customerId}>
                  {/* صف العميل الرئيسي */}
                  <TableRow className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRow(customer.customerId)}
                        className="h-8 w-8 p-0"
                      >
                        {expandedRows.has(customer.customerId) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => openCustomerInfo(customer)}
                        className="flex items-center gap-3 hover:bg-muted/50 rounded-lg p-1 -m-1 transition-colors w-full text-right"
                      >
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium hover:text-primary transition-colors">
                            {customer.customerName}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Info className="h-3 w-3" />
                            انقر لعرض المعلومات
                          </p>
                        </div>
                      </button>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="font-normal">
                        {customer.ordersCount} طلب
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-semibold text-red-600 dark:text-red-400">
                        {formatPrice(customer.totalDebt)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="destructive"
                        className="bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 border-red-500/20"
                      >
                        مديون
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* زر عرض الطلبات مباشرة */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleRow(customer.customerId)}
                          className="h-8 gap-1.5 text-xs"
                        >
                          {expandedRows.has(customer.customerId) ? (
                            <>
                              <ChevronUp className="h-3.5 w-3.5" />
                              إخفاء
                            </>
                          ) : (
                            <>
                              <Eye className="h-3.5 w-3.5" />
                              الطلبات
                            </>
                          )}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => navigate(`/dashboard/customer-debt-details/${customer.customerId}`)}
                              className="cursor-pointer"
                            >
                              <Eye className="ml-2 h-4 w-4" />
                              عرض التفاصيل الكاملة
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* صفوف الطلبات المتوسعة */}
                  {expandedRows.has(customer.customerId) && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-muted/20 p-0">
                        <div className="p-4">
                          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            طلبات {customer.customerName}
                            {isLoadingOrders && (
                              <span className="text-xs text-muted-foreground mr-2">
                                (جاري التحميل...)
                              </span>
                            )}
                          </h4>
                          {/* ⚡ حالة التحميل */}
                          {isLoadingOrders ? (
                            <div className="flex items-center justify-center py-8">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary ml-3"></div>
                              <span className="text-sm text-muted-foreground">جاري تحميل الطلبات...</span>
                            </div>
                          ) : customer.orders.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              لا توجد طلبات مع ديون لهذا العميل
                            </div>
                          ) : (
                          <div className="rounded-md border border-border overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/30 hover:bg-muted/30">
                                  <TableHead className="text-xs">رقم الطلب</TableHead>
                                  <TableHead className="text-xs">التاريخ</TableHead>
                                  <TableHead className="text-xs">الموظف</TableHead>
                                  <TableHead className="text-xs text-center">المبلغ الكلي</TableHead>
                                  <TableHead className="text-xs text-center">المدفوع</TableHead>
                                  <TableHead className="text-xs text-center">المتبقي</TableHead>
                                  <TableHead className="text-xs text-center">الإجراءات</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {customer.orders.map((order) => (
                                  <TableRow key={order.orderId} className="hover:bg-muted/20">
                                    <TableCell className="text-sm font-medium">
                                      <div className="flex flex-col items-start gap-1">
                                        {order.orderNumber}
                                        {order._synced === false && (
                                          <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-600 border-orange-200">
                                            غير متزامن
                                          </Badge>
                                        )}
                                        {order._syncStatus === 'error' && (
                                          <Badge variant="destructive" className="text-[10px]">
                                            خطأ
                                          </Badge>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                      {new Date(order.date).toLocaleDateString('ar-DZ')}
                                    </TableCell>
                                    <TableCell className="text-sm">{order.employee}</TableCell>
                                    <TableCell className="text-sm text-center">
                                      {formatPrice(order.total)}
                                    </TableCell>
                                    <TableCell className="text-sm text-center text-green-600 dark:text-green-400">
                                      {formatPrice(order.amountPaid)}
                                    </TableCell>
                                    <TableCell className="text-sm text-center">
                                      <span className="font-semibold text-red-600 dark:text-red-400">
                                        {formatPrice(order.remainingAmount)}
                                      </span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        {/* زر عرض تفاصيل الطلب */}
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => openOrderDetails(order)}
                                          className="h-8 gap-1 text-xs"
                                          title="عرض المنتجات"
                                        >
                                          <Package className="h-3.5 w-3.5" />
                                          المنتجات
                                        </Button>
                                        {canRecordPayment && (
                                          <Button
                                            size="sm"
                                            onClick={() => onPaymentClick(order)}
                                            className="h-8 gap-1"
                                          >
                                            <Wallet className="h-3.5 w-3.5" />
                                            دفع
                                          </Button>
                                        )}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ملخص الإحصائيات */}
      {filteredCustomers.length > 0 && (
        <div className="flex justify-between items-center p-4 bg-muted/30 rounded-lg border border-border">
          <div className="text-sm text-muted-foreground">
            عرض {filteredCustomers.length} من {customers.length} عميل
          </div>
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">إجمالي الطلبات: </span>
              <span className="font-semibold">{totals.ordersCount}</span>
            </div>
            <div>
              <span className="text-muted-foreground">إجمالي الديون: </span>
              <span className="font-semibold text-red-600 dark:text-red-400">
                {formatPrice(totals.totalDebt)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* نافذة معلومات العميل */}
      <CustomerInfoModal
        isOpen={customerInfoModal.isOpen}
        onClose={() => setCustomerInfoModal(prev => ({ ...prev, isOpen: false }))}
        customerId={customerInfoModal.customerId}
        customerName={customerInfoModal.customerName}
        totalDebt={customerInfoModal.totalDebt}
        ordersCount={customerInfoModal.ordersCount}
      />

      {/* نافذة تفاصيل الطلب */}
      <OrderDetailsModal
        isOpen={orderDetailsModal.isOpen}
        onClose={() => setOrderDetailsModal(prev => ({ ...prev, isOpen: false }))}
        order={orderDetailsModal.order}
      />
    </div>
  );
};

export default CustomerDebtsTable;
