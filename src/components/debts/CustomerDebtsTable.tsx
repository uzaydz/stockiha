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
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  MoreVertical,
  Eye,
  Wallet,
  ChevronDown,
  ChevronUp,
  User,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { CustomerDebt, DebtOrder } from '@/lib/api/debts';
import { formatPrice } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface CustomerDebtsTableProps {
  customers: CustomerDebt[];
  onPaymentClick: (debt: DebtOrder) => void;
  canRecordPayment?: boolean;
}

const CustomerDebtsTable: React.FC<CustomerDebtsTableProps> = ({
  customers,
  onPaymentClick,
  canRecordPayment = false,
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // تصفية العملاء حسب البحث
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    
    const query = searchQuery.toLowerCase();
    return customers.filter(customer =>
      customer.customerName.toLowerCase().includes(query) ||
      customer.customerId.toLowerCase().includes(query)
    );
  }, [customers, searchQuery]);

  // تبديل توسيع الصف
  const toggleRow = (customerId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) {
        newSet.delete(customerId);
      } else {
        newSet.add(customerId);
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
      {/* شريط البحث والإحصائيات */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="ابحث عن عميل..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>
        
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">العملاء:</span>
            <span className="font-semibold">{filteredCustomers.length}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">الإجمالي:</span>
            <span className="font-semibold text-red-600 dark:text-red-400">
              {formatPrice(totals.totalDebt)}
            </span>
          </div>
        </div>
      </div>

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
                  {searchQuery ? 'لا توجد نتائج للبحث' : 'لا توجد ديون مسجلة'}
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
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{customer.customerName}</p>
                          <p className="text-xs text-muted-foreground">#{customer.customerId}</p>
                        </div>
                      </div>
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
                            عرض التفاصيل
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => toggleRow(customer.customerId)}
                            className="cursor-pointer"
                          >
                            {expandedRows.has(customer.customerId) ? (
                              <>
                                <ChevronUp className="ml-2 h-4 w-4" />
                                إخفاء الطلبات
                              </>
                            ) : (
                              <>
                                <ChevronDown className="ml-2 h-4 w-4" />
                                عرض الطلبات
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
                          </h4>
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
                                      {order.orderNumber}
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
                                      {canRecordPayment ? (
                                        <Button
                                          size="sm"
                                          onClick={() => onPaymentClick(order)}
                                          className="h-8 gap-1.5"
                                        >
                                          <Wallet className="h-3.5 w-3.5" />
                                          تسجيل دفع
                                        </Button>
                                      ) : (
                                        <span className="text-xs text-muted-foreground">غير مصرح</span>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
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
    </div>
  );
};

export default CustomerDebtsTable;
