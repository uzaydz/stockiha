// TODO: يجب التأكد من تثبيت مكتبة @tanstack/react-table
// npm install @tanstack/react-table
import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  ChevronDown,
  ChevronUpIcon,
  ChevronDownIcon,
  MoreHorizontal,
  ExternalLink,
  RefreshCw,
  Send,
  Trash2,
  Filter
} from "lucide-react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  FilterFn,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  RowData
} from "@tanstack/react-table";
import { format } from "date-fns";
import { formatDate, formatCurrency } from "@/lib/utils";

import {
  Button
} from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogHeader
} from "@/components/ui/dialog";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// تعريف نوع الطلب المتروك
export interface AbandonedOrder {
  id: string;
  organization_id: string;
  product_id?: string;
  customer_name?: string;
  customer_phone?: string | null;
  customer_email?: string | null;
  province?: string | number | null;
  municipality?: string | number | null;
  province_name?: string | null;  
  municipality_name?: string | null;
  address?: string | null;
  delivery_option?: string | null;
  payment_method?: string | null;
  notes?: string | null;
  custom_fields_data?: Record<string, any> | null;
  calculated_delivery_fee?: number | null;
  subtotal?: number | null;
  discount_amount?: number | null;
  total_amount?: number | null;
  status: 'pending' | 'recovered' | 'cancelled';
  cart_items?: any[] | null;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
  abandoned_hours?: number;
  item_count?: number;
  // إضافة حقول مخصصة للعرض
  formatted_total?: string;
  abandoned_since?: string;
}

// تعريف واجهة خصائص الجدول
export interface AbandonedOrdersTableProps {
  data: AbandonedOrder[];
  loading: boolean;
  onRowClick?: (order: AbandonedOrder) => void;
  onRecoverOrder?: (order: AbandonedOrder) => void;
  onSendReminder?: (order: AbandonedOrder) => void;
  onDeleteOrder?: (order: AbandonedOrder) => void;
}

// مكون جدول الطلبات المتروكة
export function AbandonedOrdersTable({
  data,
  loading,
  onRowClick,
  onRecoverOrder,
  onSendReminder,
  onDeleteOrder,
}: AbandonedOrdersTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [selectedOrder, setSelectedOrder] = useState<AbandonedOrder | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    customer_email: false,
    id: false,
  });

  // تحسين الأداء - حساب مدة الترك مرة واحدة لكل طلب وتخزين النتيجة
  const processedData = useMemo(() => {
    // استخدام تقنية windowing لعرض كميات كبيرة من البيانات
    return data.map(order => {
      // عدم إعادة حساب القيم المحسوبة مسبقًا
      return {
        ...order,
        // يستخدم abandoned_hours بدلًا من إعادة الحساب هنا لتقليل الحمل
        abandoned_since: order.abandoned_hours 
          ? `${Math.floor(order.abandoned_hours)} ساعة` 
          : formatDate(order.last_activity_at),
        // استخدم item_count من قاعدة البيانات بدلاً من مرور البيانات
        item_count: order.item_count || (order.cart_items?.length || 0),
        // تنسيق المبلغ الإجمالي مرة واحدة
        formatted_total: formatCurrency(order.total_amount || 0)
      };
    });
  }, [data]);

  // تعريف الأعمدة باستخدام useMemo لتجنب إعادة الإنشاء عند التصيير
  const columns = useMemo<ColumnDef<AbandonedOrder>[]>(() => [
    {
      accessorKey: "created_at",
      header: "تاريخ الإنشاء",
      cell: ({ row }) => formatDate(row.getValue("created_at")),
    },
    {
      accessorKey: "customer_name",
      header: "العميل",
      cell: ({ row }) => row.getValue("customer_name") || "غير محدد",
    },
    {
      accessorKey: "customer_phone",
      header: "رقم الهاتف",
      cell: ({ row }) => (
        <span dir="ltr">{row.original.customer_phone || "غير محدد"}</span>
      ),
    },
    {
      accessorKey: "customer_email",
      header: "البريد الإلكتروني",
      cell: ({ row }) => row.getValue("customer_email") || "غير متوفر",
    },
    {
      accessorKey: "location",
      header: "الموقع",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span>{row.original.province_name || row.original.province || "غير محدد"}</span>
          {row.original.municipality_name || row.original.municipality ? (
            <span className="text-xs text-muted-foreground">
              {row.original.municipality_name || row.original.municipality}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: "item_count",
      header: "عدد المنتجات",
      cell: ({ row }) => row.original.item_count || 0,
    },
    {
      accessorKey: "total_amount",
      header: "المبلغ الإجمالي",
      cell: ({ row }) => row.original.formatted_total,
      sortingFn: "basic",
    },
    {
      accessorKey: "abandoned_hours",
      header: "مدة الترك",
      cell: ({ row }) => row.original.abandoned_since,
      sortingFn: "basic",
    },
    {
      id: "actions",
      header: "الإجراءات",
      cell: ({ row }) => {
        const order = row.original;
        return (
          <div className="flex items-center justify-end gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => handleDetailsClick(order)}
              className="text-primary hover:text-primary-dark hover:bg-primary-light"
            >
              <ExternalLink className="h-5 w-5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>إجراءات</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {onRecoverOrder && (
                  <DropdownMenuItem onClick={() => onRecoverOrder(order)}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    استرجاع الطلب
                  </DropdownMenuItem>
                )}
                {onSendReminder && (
                  <DropdownMenuItem onClick={() => onSendReminder(order)}>
                    <Send className="mr-2 h-4 w-4" />
                    إرسال تذكير
                  </DropdownMenuItem>
                )}
                {onDeleteOrder && (
                  <DropdownMenuItem onClick={() => onDeleteOrder(order)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    حذف
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ], [onRecoverOrder, onSendReminder, onDeleteOrder]);

  // المرجع لتتبع ما إذا كان قد تم تحميل البيانات
  const dataLoadedRef = useRef(false);

  // استخدم useEffect لإعادة تعيين التشكيل عند تحميل البيانات الجديدة
  useEffect(() => {
    if (data.length > 0 && !dataLoadedRef.current) {
      dataLoadedRef.current = true;
      // قم بالفرز بناءً على abandoned_hours (من الأحدث إلى الأقدم)
      setSorting([
        {
          id: 'abandoned_hours',
          desc: true,
        },
      ]);
    }
  }, [data]);

  // معالج التحميل المتقطع - يمنع إعادة التصيير غير الضرورية
  const handlePaginationChange = useCallback((newPagination) => {
    setPagination(newPagination);
  }, []);

  // تكوين الجدول باستخدام useMemo لمنع إعادة التصيير
  const table = useReactTable({
    data: processedData,
    columns,
    state: {
      sorting,
      columnFilters,
      rowSelection,
      pagination,
      columnVisibility,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: handlePaginationChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // معالج النقر على التفاصيل
  const handleDetailsClick = (order: AbandonedOrder) => {
    setSelectedOrder(order);
    setDetailsOpen(true);
  };

  // تصيير صفوف مخصصة للجدول
  const renderTableRows = () => {
    // أثناء التحميل، أظهر صفوف التحميل
    if (loading) {
      return Array(5).fill(0).map((_, index) => (
        <TableRow key={`loading-${index}`}>
          {columns.map((_, colIndex) => (
            <TableCell key={`loading-cell-${colIndex}`}>
              <div className="h-5 w-full bg-gray-200 rounded animate-pulse" />
            </TableCell>
          ))}
        </TableRow>
      ));
    }

    // إذا لم تكن هناك بيانات بعد انتهاء التحميل
    if (table.getRowModel().rows.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={columns.length} className="h-24 text-center">
            لا توجد طلبات متروكة
          </TableCell>
        </TableRow>
      );
    }

    // عرض البيانات الفعلية
    return table.getRowModel().rows.map((row) => (
      <TableRow
        key={row.original.id}
        className={`${rowSelection[row.id] ? 'bg-muted/50' : ''} cursor-pointer hover:bg-muted/30`}
        onClick={() => onRowClick && onRowClick(row.original)}
      >
        {row.getVisibleCells().map((cell) => (
          <TableCell key={cell.id}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        ))}
      </TableRow>
    ));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground text-sm">
          {table.getFilteredRowModel().rows.length} طلب متروك
        </div>
        
        <div className="flex items-center space-x-4 space-x-reverse">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="ml-auto">
                <Filter className="mr-2 h-4 w-4" />
                الأعمدة
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table.getAllColumns().filter(column => column.id !== 'actions').map(column => (
                <DropdownMenuItem key={column.id} className="capitalize" onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  column.toggleVisibility(!column.getIsVisible());
                }}>
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={column.getIsVisible()}
                    onChange={() => column.toggleVisibility(!column.getIsVisible())}
                  />
                  {column.columnDef.header as string}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={header.column.getCanSort() ? 'cursor-pointer select-none' : ''}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <div className="mr-2">
                          {{
                            asc: <ChevronUpIcon className="h-4 w-4" />,
                            desc: <ChevronDownIcon className="h-4 w-4" />,
                          }[header.column.getIsSorted() as string] ?? <ChevronDown className="h-4 w-4 opacity-30" />}
                        </div>
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {renderTableRows()}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 space-x-reverse">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            السابق
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            التالي
          </Button>
        </div>

        <div className="flex items-center space-x-2 space-x-reverse">
          <select
            className="p-1 border rounded-md"
            value={table.getState().pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
          >
            {[10, 20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size} صف
              </option>
            ))}
          </select>
          <span>
            صفحة{" "}
            <strong>
              {table.getState().pagination.pageIndex + 1} من{" "}
              {table.getPageCount()}
            </strong>
          </span>
        </div>
      </div>

      {/* تفاصيل الطلب المتروك */}
      {selectedOrder && (
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>تفاصيل الطلب المتروك</DialogTitle>
              <DialogDescription>
                تاريخ الإنشاء: {formatDate(selectedOrder.created_at)}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">معلومات العميل</h3>
                <div className="space-y-2">
                  <p>
                    <span className="font-medium">الاسم:</span>{" "}
                    {selectedOrder.customer_name || "غير محدد"}
                  </p>
                  <p>
                    <span className="font-medium">الهاتف:</span>{" "}
                    <span dir="ltr">{selectedOrder.customer_phone || "غير محدد"}</span>
                  </p>
                  <p>
                    <span className="font-medium">البريد الإلكتروني:</span>{" "}
                    {selectedOrder.customer_email || "غير محدد"}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">معلومات التوصيل</h3>
                <div className="space-y-2">
                  <p>
                    <span className="font-medium">الولاية:</span>{" "}
                    {selectedOrder.province_name || selectedOrder.province || "غير محدد"}
                  </p>
                  <p>
                    <span className="font-medium">البلدية:</span>{" "}
                    {selectedOrder.municipality_name || selectedOrder.municipality || "غير محدد"}
                  </p>
                  <p>
                    <span className="font-medium">العنوان:</span>{" "}
                    {selectedOrder.address || "غير محدد"}
                  </p>
                  <p>
                    <span className="font-medium">طريقة التوصيل:</span>{" "}
                    {selectedOrder.delivery_option === "home"
                      ? "توصيل للمنزل"
                      : selectedOrder.delivery_option === "desk"
                      ? "استلام من المكتب"
                      : "غير محدد"}
                  </p>
                  <p>
                    <span className="font-medium">طريقة الدفع:</span>{" "}
                    {selectedOrder.payment_method === "cash_on_delivery"
                      ? "الدفع عند الاستلام"
                      : selectedOrder.payment_method || "غير محدد"}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">منتجات السلة</h3>
              <div className="overflow-auto max-h-48 border rounded-md p-2">
                {selectedOrder.cart_items && selectedOrder.cart_items.length > 0 ? (
                  <div className="space-y-2">
                    {selectedOrder.cart_items.map((item, index) => (
                      <div key={index} className="border-b last:border-0 pb-2">
                        <p className="font-medium">
                          {item.product_name || `منتج ${index + 1}`}
                        </p>
                        <div className="text-sm text-muted-foreground">
                          <p>الكمية: {item.quantity || 1}</p>
                          {item.color && <p>اللون: {item.color}</p>}
                          {item.size && <p>الحجم: {item.size}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-2 text-muted-foreground">
                    لا توجد منتجات في السلة
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">ملاحظات</h3>
                <p className="border rounded-md p-2 min-h-[60px]">
                  {selectedOrder.notes || "لا توجد ملاحظات"}
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">المبالغ</h3>
                <div className="space-y-1">
                  <p>
                    <span className="font-medium">المجموع الفرعي:</span>{" "}
                    {formatCurrency(selectedOrder.subtotal || 0)}
                  </p>
                  <p>
                    <span className="font-medium">الخصم:</span>{" "}
                    {formatCurrency(selectedOrder.discount_amount || 0)}
                  </p>
                  <p>
                    <span className="font-medium">رسوم التوصيل:</span>{" "}
                    {formatCurrency(
                      selectedOrder.calculated_delivery_fee || 0
                    )}
                  </p>
                  <p className="font-bold border-t pt-1">
                    <span className="font-medium">المجموع:</span>{" "}
                    {formatCurrency(selectedOrder.total_amount || 0)}
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="space-x-4 space-x-reverse">
              {onRecoverOrder && (
                <Button
                  variant="default"
                  onClick={() => {
                    onRecoverOrder(selectedOrder);
                    setDetailsOpen(false);
                  }}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  استرجاع الطلب
                </Button>
              )}
              {onSendReminder && (
                <Button
                  variant="outline"
                  onClick={() => {
                    onSendReminder(selectedOrder);
                    setDetailsOpen(false);
                  }}
                >
                  <Send className="mr-2 h-4 w-4" />
                  إرسال تذكير
                </Button>
              )}
              {onDeleteOrder && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    onDeleteOrder(selectedOrder);
                    setDetailsOpen(false);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  حذف
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
} 