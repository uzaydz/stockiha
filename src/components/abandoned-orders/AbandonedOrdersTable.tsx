// TODO: يجب التأكد من تثبيت مكتبة @tanstack/react-table
// npm install @tanstack/react-table
import { useState, useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronDown, Filter, Search, MapPin, CreditCard, Calendar, Clock, Package, Info } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// تعريف نوع الطلب المتروك
export type AbandonedOrder = {
  id: string;
  organization_id: string;
  product_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  province: string | null;
  municipality: string | null;
  address: string | null;
  delivery_option: string | null;
  payment_method: string | null;
  notes: string | null;
  calculated_delivery_fee: number;
  subtotal: number;
  discount_amount: number | null;
  total_amount: number;
  status: string;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
  custom_fields_data?: any;
  cart_items: Array<{
    quantity: number;
    product_id: string;
    variant_id?: string | null;
    product_size_id?: string | null;
    product_color_id?: string | null;
    product_name?: string;
    price?: number;
  }>;
  productDetails?: {
    name: string;
    image_url: string;
  };
  abandoned_hours?: number; // سيتم حسابه في الكومبوننت
  province_name?: string; // اسم الولاية باللغة العربية
  municipality_name?: string; // اسم البلدية باللغة العربية
};

// Props لمكون الجدول
interface AbandonedOrdersTableProps {
  data: AbandonedOrder[];
  loading: boolean;
  onRowClick?: (order: AbandonedOrder) => void;
  onRecoverOrder?: (order: AbandonedOrder) => void;
  onSendReminder?: (order: AbandonedOrder) => void;
  onDeleteOrder?: (order: AbandonedOrder) => void;
}

// مكون تفاصيل الطلب المتروك
const AbandonedOrderDetails = ({ order }: { order: AbandonedOrder }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">معلومات العميل</h3>
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center space-x-2 space-x-reverse">
              <span className="font-semibold ml-2">الاسم:</span>
              <span>{order.customer_name || 'غير محدد'}</span>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <span className="font-semibold ml-2">رقم الهاتف:</span>
              <span dir="ltr">{order.customer_phone || 'غير محدد'}</span>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <span className="font-semibold ml-2">البريد الإلكتروني:</span>
              <span>{order.customer_email || 'غير محدد'}</span>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <span className="font-semibold ml-2">العنوان:</span>
              <span>
                {order.province_name || order.municipality_name || order.address
                  ? `${order.province_name || ''} ${order.municipality_name || ''} ${order.address || ''}`
                  : 'غير محدد'}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">تفاصيل الطلب</h3>
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center space-x-2 space-x-reverse">
              <span className="font-semibold ml-2">تاريخ الإنشاء:</span>
              <span>{format(new Date(order.created_at), 'PPP p', { locale: ar })}</span>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <span className="font-semibold ml-2">آخر نشاط:</span>
              <span>{format(new Date(order.last_activity_at), 'PPP p', { locale: ar })}</span>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <span className="font-semibold ml-2">طريقة الدفع:</span>
              <span>{order.payment_method || 'غير محدد'}</span>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <span className="font-semibold ml-2">طريقة التوصيل:</span>
              <span>{order.delivery_option || 'غير محدد'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">محتويات السلة</h3>
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المنتج</TableHead>
                <TableHead>الكمية</TableHead>
                <TableHead>السعر</TableHead>
                <TableHead>الإجمالي</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.cart_items && order.cart_items.length > 0 ? (
                order.cart_items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {order.productDetails?.image_url && (
                          <Avatar className="h-10 w-10 rounded-sm">
                            <AvatarImage src={order.productDetails.image_url} alt="صورة المنتج" />
                            <AvatarFallback className="rounded-sm bg-muted">
                              {(item.product_name || order.productDetails?.name || `منتج`).charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <span>
                          {item.product_name || order.productDetails?.name || `منتج ${index + 1}`}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>
                      {item.price 
                        ? new Intl.NumberFormat('ar-DZ', { style: 'currency', currency: 'DZD' }).format(item.price)
                        : 'غير محدد'}
                    </TableCell>
                    <TableCell>
                      {item.price 
                        ? new Intl.NumberFormat('ar-DZ', { style: 'currency', currency: 'DZD' }).format(item.price * item.quantity)
                        : 'غير محدد'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">لا توجد منتجات</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border p-4">
          <div className="flex justify-between py-2 border-b">
            <span className="font-semibold">المجموع الفرعي:</span>
            <span>
              {new Intl.NumberFormat('ar-DZ', { style: 'currency', currency: 'DZD' }).format(order.subtotal)}
            </span>
          </div>
          
          <div className="flex justify-between py-2 border-b">
            <span className="font-semibold">رسوم التوصيل:</span>
            <span>
              {new Intl.NumberFormat('ar-DZ', { style: 'currency', currency: 'DZD' }).format(order.calculated_delivery_fee)}
            </span>
          </div>
          
          {order.discount_amount && (
            <div className="flex justify-between py-2 border-b">
              <span className="font-semibold">الخصم:</span>
              <span className="text-green-600">
                {new Intl.NumberFormat('ar-DZ', { style: 'currency', currency: 'DZD' }).format(order.discount_amount)}
              </span>
            </div>
          )}
          
          <div className="flex justify-between py-2 pt-4">
            <span className="font-bold text-lg">المجموع الكلي:</span>
            <span className="font-bold text-lg">
              {new Intl.NumberFormat('ar-DZ', { style: 'currency', currency: 'DZD' }).format(order.total_amount)}
            </span>
          </div>
        </div>
      </div>

      {order.notes && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">ملاحظات</h3>
          <div className="rounded-lg border p-4">
            {order.notes}
          </div>
        </div>
      )}
    </div>
  );
};

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

  // حساب مدة الترك بالساعات لكل طلب
  const processedData = useMemo(() => {
    return data.map(order => {
      const lastActivity = new Date(order.last_activity_at);
      const now = new Date();
      const diffHours = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);
      
      return {
        ...order,
        abandoned_hours: diffHours
      };
    });
  }, [data]);

  // تعريف أعمدة الجدول
  const columns = useMemo<ColumnDef<AbandonedOrder>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate") ||
              false
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="تحديد الكل"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="تحديد الصف"
            onClick={(e) => e.stopPropagation()}
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "id",
        header: "رقم الطلب",
        cell: ({ row }) => (
          <span className="font-medium text-xs truncate" dir="ltr">
            {row.original.id.substring(0, 8)}...
          </span>
        ),
      },
      {
        accessorKey: "customer_name",
        header: "العميل",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.customer_name || "زائر غير معروف"}</span>
          </div>
        ),
      },
      {
        accessorKey: "customer_phone",
        header: "رقم الهاتف",
        cell: ({ row }) => (
          <div className="flex items-center">
            <i className="i-lucide-phone h-4 w-4 ml-1 text-muted-foreground" />
            <span dir="ltr">{row.original.customer_phone || "غير متوفر"}</span>
          </div>
        ),
      },
      {
        accessorKey: "total_amount",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            المبلغ
            <ArrowUpDown className="mr-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-right font-medium" dir="ltr">
            {new Intl.NumberFormat("ar-DZ", {
              style: "currency",
              currency: "DZD",
            }).format(row.original.total_amount)}
          </div>
        ),
      },
      {
        accessorKey: "productDetails",
        header: "المنتج",
        cell: ({ row }) => {
          const order = row.original;
          return (
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8 rounded-sm">
                <AvatarImage 
                  src={order.productDetails?.image_url} 
                  alt="صورة المنتج" 
                />
                <AvatarFallback className="rounded-sm bg-muted">
                  {(order.productDetails?.name || "م").charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="text-sm truncate max-w-[120px]">
                {order.productDetails?.name || "منتج غير معروف"}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "cart_items",
        header: "العناصر",
        cell: ({ row }) => {
          const itemCount = row.original.cart_items ? row.original.cart_items.length : 0;
          return (
            <div className="text-center">
              <Badge variant="outline">{itemCount}</Badge>
            </div>
          );
        },
      },
      {
        accessorKey: "province",
        header: "المنطقة",
        cell: ({ row }) => (
          <div className="flex items-center">
            <MapPin className="h-4 w-4 ml-1 text-muted-foreground" />
            <span>
              {row.original.province_name || row.original.province || "غير محدد"}
              {row.original.municipality_name && ` - ${row.original.municipality_name}`}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "abandoned_hours",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            مدة التروك
            <ArrowUpDown className="mr-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const hours = row.original.abandoned_hours || 0;
          // تصحيح: نستخدم فقط القيم المتوقعة للـ badge variant
          let badgeVariant: "outline" | "default" | "destructive" | "secondary" | "success" = "default";
          
          if (hours < 1) badgeVariant = "outline";
          else if (hours < 12) badgeVariant = "secondary";
          else if (hours < 24) badgeVariant = "destructive";
          else badgeVariant = "destructive";
          
          return (
            <div className="text-center">
              <Badge variant={badgeVariant}>
                {hours < 1 
                  ? `${Math.round(hours * 60)} دقيقة` 
                  : `${Math.round(hours)} ساعة`}
              </Badge>
            </div>
          );
        },
        sortingFn: "basic",
      },
      {
        accessorKey: "created_at",
        header: "التاريخ",
        cell: ({ row }) => {
          const date = new Date(row.original.created_at);
          return (
            <div className="text-right text-xs" dir="rtl">
              {format(date, "PPP p", { locale: ar })}
            </div>
          );
        },
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const order = row.original;
          
          return (
            <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setSelectedOrder(order);
                        setDetailsOpen(true);
                      }}
                    >
                      <Info className="h-4 w-4" />
                      <span className="sr-only">عرض التفاصيل</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>عرض التفاصيل</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onSendReminder?.(order)}
                    >
                      <i className="i-lucide-mail h-4 w-4" />
                      <span className="sr-only">إرسال تذكير</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>إرسال تذكير للعميل</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onRecoverOrder?.(order)}
                    >
                      <i className="i-lucide-rotate-ccw h-4 w-4" />
                      <span className="sr-only">استرجاع الطلب</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>استرجاع الطلب</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => onDeleteOrder?.(order)}
                    >
                      <i className="i-lucide-trash h-4 w-4" />
                      <span className="sr-only">حذف الطلب</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>حذف الطلب</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          );
        },
      },
    ],
    [onRowClick, onRecoverOrder, onSendReminder, onDeleteOrder]
  );

  // إعداد الجدول باستخدام tanstack/react-table
  const table = useReactTable({
    data: processedData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
  });

  // عرض حالة التحميل
  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-center items-center h-60">
            <div className="animate-pulse flex flex-col items-center">
              <div className="h-12 w-12 rounded-full bg-primary/20"></div>
              <div className="mt-4 h-4 w-40 bg-muted"></div>
              <div className="mt-2 h-4 w-60 bg-muted"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // عرض حالة عدم وجود بيانات
  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col justify-center items-center h-40 text-center">
            <i className="i-lucide-shopping-bag h-12 w-12 text-muted-foreground mb-4"></i>
            <h3 className="text-lg font-semibold">لا توجد طلبات متروكة</h3>
            <p className="text-muted-foreground mt-1">
              ستظهر الطلبات التي لم يتم إكمالها من قبل العملاء هنا
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border shadow-sm">
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center">
              <div className="relative max-w-sm ml-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث..."
                  className="pl-8"
                  onChange={(event) => table.setGlobalFilter(event.target.value)}
                />
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="mr-2">
                    <Filter className="h-4 w-4 ml-2" />
                    فلترة
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => {
                      return (
                        <DropdownMenuCheckboxItem
                          key={column.id}
                          className="capitalize"
                          checked={column.getIsVisible()}
                          onCheckedChange={(value) =>
                            column.toggleVisibility(!!value)
                          }
                        >
                          {column.id}
                        </DropdownMenuCheckboxItem>
                      );
                    })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <div>
              <Button
                variant="outline"
                size="sm"
                className="mr-2"
                disabled={!table.getFilteredSelectedRowModel().rows.length}
              >
                تذكير العملاء ({table.getFilteredSelectedRowModel().rows.length})
              </Button>
            </div>
          </div>
          
          <ScrollArea className="h-[calc(100vh-290px)]">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id} className="text-right">
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      onClick={() => {
                        if (onRowClick) {
                          onRowClick(row.original);
                        } else {
                          setSelectedOrder(row.original);
                          setDetailsOpen(true);
                        }
                      }}
                      className="cursor-pointer hover:bg-muted"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      لا توجد نتائج.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
          
          <div className="flex items-center justify-between p-4 border-t">
            <div className="flex-1 text-sm text-muted-foreground">
              {table.getFilteredSelectedRowModel().rows.length} من{" "}
              {table.getFilteredRowModel().rows.length} صف (صفوف) محددة.
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <PaginationPrevious className="h-4 w-4" />
                  </Button>
                </PaginationItem>
                {Array.from({ length: table.getPageCount() }, (_, i) => i + 1)
                  .filter(page => {
                    const currentPage = table.getState().pagination.pageIndex + 1;
                    return page === 1 || 
                           page === table.getPageCount() || 
                           Math.abs(page - currentPage) <= 1;
                  })
                  .map((page, i, arr) => {
                    const currentPage = table.getState().pagination.pageIndex + 1;
                    
                    // إضافة نقاط الحذف للصفحات البعيدة
                    if (i > 0 && arr[i - 1] !== page - 1) {
                      return (
                        <PaginationItem key={`ellipsis-${page}`}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }
                    
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => table.setPageIndex(page - 1)}
                          isActive={currentPage === page}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                <PaginationItem>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    <PaginationNext className="h-4 w-4" />
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardContent>
      </Card>

      {/* نافذة تفاصيل الطلب */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل الطلب المتروك</DialogTitle>
            <DialogDescription>
              معلومات تفصيلية عن الطلب المتروك وحالته.
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <AbandonedOrderDetails order={selectedOrder} />
          )}

          <DialogFooter>
            <div className="flex gap-2 justify-between w-full">
              <div>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (selectedOrder && onDeleteOrder) {
                      onDeleteOrder(selectedOrder);
                      setDetailsOpen(false);
                    }
                  }}
                >
                  <i className="i-lucide-trash h-4 w-4 ml-2" />
                  حذف الطلب
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (selectedOrder && onSendReminder) {
                      onSendReminder(selectedOrder);
                    }
                  }}
                >
                  <i className="i-lucide-mail h-4 w-4 ml-2" />
                  إرسال تذكير
                </Button>
                <Button
                  variant="default"
                  onClick={() => {
                    if (selectedOrder && onRecoverOrder) {
                      onRecoverOrder(selectedOrder);
                      setDetailsOpen(false);
                    }
                  }}
                >
                  <i className="i-lucide-rotate-ccw h-4 w-4 ml-2" />
                  استرجاع الطلب
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 