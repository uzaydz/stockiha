import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Filter, 
  SlidersHorizontal, 
  Download, 
  Printer,
  ChevronRight,
  ChevronDown
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Order, OrdersTableProps } from "./OrderTableTypes";
import OrderTableRow from "./OrderTableRow";
import OrderBulkActions from "./OrderBulkActions";

// إضافة الخصائص المفقودة إلى OrdersTableProps
type ExtendedOrdersTableProps = OrdersTableProps & {
  currentPage?: number;
  totalItems?: number;
  pageSize?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  onPageChange?: (page: number) => void;
  onLoadMore?: () => void;
  hasMoreOrders?: boolean;
  shippingProviders?: Array<{
    provider_id: number | null;
    provider_code: string;
    provider_name: string;
    is_enabled: boolean;
  }>;
};

const OrdersTable = ({
  orders,
  loading,
  onUpdateStatus,
  onUpdateCallConfirmation,
  onSendToProvider,
  onBulkUpdateStatus,
  hasUpdatePermission,
  hasCancelPermission,
  visibleColumns = ["checkbox", "expand", "id", "customer_name", "customer_contact", "total", "items", "status", "call_confirmation", "shipping_provider", "source", "actions"],
  currentUserId,
  currentPage = 1,
  totalItems = 0,
  pageSize = 15,
  hasNextPage = false,
  hasPreviousPage = false,
  onPageChange,
  onLoadMore,
  hasMoreOrders = false,
  shippingProviders = [],
}: ExtendedOrdersTableProps) => {
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [searchFilter, setSearchFilter] = useState("");
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  
  // تنقية الطلبات بناءً على البحث
  const filteredOrders = useMemo(() => {
    if (!searchFilter.trim()) return orders;
    
    const searchTerm = searchFilter.toLowerCase();
    return orders.filter(order => 
      order.id.toLowerCase().includes(searchTerm) ||
      (order.customer_order_number?.toString() || "").includes(searchTerm) ||
      order.customer?.name?.toLowerCase().includes(searchTerm) ||
      order.customer?.phone?.toLowerCase().includes(searchTerm) ||
      order.customer?.email?.toLowerCase().includes(searchTerm) ||
      order.status.toLowerCase().includes(searchTerm)
    );
  }, [orders, searchFilter]);

  // التحقق من وجود انتقاء كلي
  const allSelected = useMemo(() => {
    return filteredOrders.length > 0 && selectedOrders.length === filteredOrders.length;
  }, [filteredOrders, selectedOrders]);

  // التعامل مع تحديد/إلغاء تحديد كل الطلبات
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedOrders(filteredOrders.map(order => order.id));
    } else {
      setSelectedOrders([]);
    }
  };

  // التعامل مع تحديد/إلغاء تحديد طلب واحد
  const handleSelectOrder = (orderId: string, selected: boolean) => {
    if (selected) {
      setSelectedOrders(prev => [...prev, orderId]);
    } else {
      setSelectedOrders(prev => prev.filter(id => id !== orderId));
    }
  };

  // التعامل مع توسيع/طي تفاصيل الطلب
  const handleToggleExpand = (orderId: string) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  // إعادة ضبط التحديدات
  const resetSelections = () => {
    setSelectedOrders([]);
  };

  return (
    <div className="overflow-hidden">
      <div className="p-5">
        {/* شريط البحث والإجراءات العلوي - تصميم محسن */}
        <div className="mb-6 flex flex-col space-y-4 lg:flex-row lg:space-y-0 lg:space-x-4 lg:items-center lg:justify-between">
          <div className="relative flex items-center w-full lg:w-80">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="البحث في الطلبات..."
              className="pl-10 pr-4 py-2.5 w-full rounded-lg border border-border/40 bg-background/50 backdrop-blur-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-foreground placeholder:text-muted-foreground"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            {selectedOrders.length > 0 && (
              <div className="bg-primary/10 border border-primary/30 px-4 py-2 rounded-lg text-sm flex items-center gap-2 backdrop-blur-sm">
                <span className="font-semibold text-primary">{selectedOrders.length}</span>
                <span className="text-primary/80">طلب محدد</span>
              </div>
            )}
            
            {selectedOrders.length > 0 && (
              <OrderBulkActions
                selectedOrders={selectedOrders}
                onUpdateStatus={onBulkUpdateStatus}
                onReset={resetSelections}
                hasUpdatePermission={hasUpdatePermission}
                hasCancelPermission={hasCancelPermission}
              />
            )}
            
            <Button variant="outline" size="sm" className="gap-2 px-4 py-2 rounded-lg border-border/40 bg-background/50 backdrop-blur-sm hover:bg-accent/50 hover:border-primary/30 transition-all duration-200">
              <Filter className="h-4 w-4" />
              <span>تصفية</span>
            </Button>
            
            <Button variant="outline" size="sm" className="gap-2 px-4 py-2 rounded-lg border-border/40 bg-background/50 backdrop-blur-sm hover:bg-accent/50 hover:border-primary/30 transition-all duration-200">
              <SlidersHorizontal className="h-4 w-4" />
              <span>الأعمدة</span>
            </Button>
            
            <Button variant="outline" size="sm" className="gap-2 px-4 py-2 rounded-lg border-border/40 bg-background/50 backdrop-blur-sm hover:bg-accent/50 hover:border-primary/30 transition-all duration-200">
              <Download className="h-4 w-4" />
              <span>تصدير</span>
            </Button>
            
            <Button variant="outline" size="sm" className="gap-2 px-4 py-2 rounded-lg border-border/40 bg-background/50 backdrop-blur-sm hover:bg-accent/50 hover:border-primary/30 transition-all duration-200">
              <Printer className="h-4 w-4" />
              <span>طباعة</span>
            </Button>
          </div>
        </div>
        
        {/* الجدول المحسن مع تصميم حديث */}
        <div className="rounded-lg border border-border/30 bg-background/50 backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader className="bg-gradient-to-r from-muted/40 to-muted/20 backdrop-blur-sm">
                <TableRow className="border-b border-border/50 hover:bg-transparent">
                  {visibleColumns.includes("checkbox") && (
                    <TableHead className="w-12 py-4 px-4">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={handleSelectAll}
                        disabled={filteredOrders.length === 0}
                        aria-label="تحديد كل الطلبات"
                        className="border-border/50"
                      />
                    </TableHead>
                  )}
                  
                  {visibleColumns.includes("expand") && (
                    <TableHead className="w-10 py-4"></TableHead>
                  )}
                  
                  {visibleColumns.includes("id") && (
                    <TableHead className="font-semibold text-foreground py-4 px-4 text-sm">رقم الطلب</TableHead>
                  )}
                  
                  {visibleColumns.includes("customer_name") && (
                    <TableHead className="font-semibold text-foreground py-4 px-4 text-sm">اسم العميل</TableHead>
                  )}
                  
                  {visibleColumns.includes("customer_contact") && (
                    <TableHead className="font-semibold text-foreground py-4 px-4 text-sm">بيانات الاتصال</TableHead>
                  )}
                  
                  {visibleColumns.includes("total") && (
                    <TableHead className="font-semibold text-foreground py-4 px-4 text-sm">إجمالي الطلب</TableHead>
                  )}
                  
                  {visibleColumns.includes("items") && (
                    <TableHead className="font-semibold text-foreground py-4 px-4 text-sm">المنتجات</TableHead>
                  )}
                  
                  {visibleColumns.includes("status") && (
                    <TableHead className="font-semibold text-foreground py-4 px-4 text-sm">حالة الطلب</TableHead>
                  )}
                  
                  {visibleColumns.includes("call_confirmation") && (
                    <TableHead className="font-semibold text-foreground py-4 px-4 text-sm">تأكيد المكالمة</TableHead>
                  )}
                  
                  {visibleColumns.includes("shipping_provider") && (
                    <TableHead className="font-semibold text-foreground py-4 px-4 text-sm">مزود الشحن</TableHead>
                  )}
                  
                  {visibleColumns.includes("source") && (
                    <TableHead className="font-semibold text-foreground py-4 px-4 text-sm">معلومات الطلب</TableHead>
                  )}
                  
                  {visibleColumns.includes("actions") && (
                    <TableHead className="text-right font-semibold w-16 py-4 px-4 text-foreground text-sm">الإجراءات</TableHead>
                  )}
                </TableRow>
              </TableHeader>
            
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={`skeleton-${index}`} className="hover:bg-accent/20 border-b border-border/30 transition-colors duration-150">
                      {visibleColumns.includes("checkbox") && (
                        <TableCell className="py-4 px-4">
                          <Skeleton className="h-4 w-4 bg-muted/60 rounded" />
                        </TableCell>
                      )}
                      
                      {visibleColumns.includes("expand") && (
                        <TableCell className="py-4">
                          <Skeleton className="h-4 w-4 bg-muted/60 rounded" />
                        </TableCell>
                      )}
                      
                      <TableCell className="py-4 px-4">
                        <Skeleton className="h-5 w-24 bg-muted/60 rounded-md" />
                      </TableCell>
                      
                      <TableCell className="py-4 px-4">
                        <div className="flex flex-col gap-2">
                          <Skeleton className="h-5 w-32 bg-muted/60 rounded-md" />
                          <Skeleton className="h-4 w-24 bg-muted/40 rounded-md" />
                        </div>
                      </TableCell>
                      
                      <TableCell className="py-4 px-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-5 w-16 bg-muted/60 rounded-md" />
                            <Skeleton className="h-5 w-16 bg-muted/60 rounded-md" />
                          </div>
                          <Skeleton className="h-4 w-32 bg-muted/40 rounded-md" />
                        </div>
                      </TableCell>
                      
                      <TableCell className="py-4 px-4">
                        <Skeleton className="h-6 w-20 bg-muted/60 rounded-lg" />
                      </TableCell>
                      
                      {visibleColumns.includes("items") && (
                        <TableCell className="py-4 px-4">
                          <Skeleton className="h-5 w-10 bg-muted/60 rounded-md" />
                        </TableCell>
                      )}
                      
                      <TableCell className="py-4 px-4">
                        <Skeleton className="h-6 w-24 bg-muted/60 rounded-full" />
                      </TableCell>
                      
                      <TableCell className="py-4 px-4">
                        <Skeleton className="h-5 w-32 bg-muted/60 rounded-md" />
                      </TableCell>
                      
                      {visibleColumns.includes("call_confirmation") && (
                        <TableCell className="py-4 px-4">
                          <Skeleton className="h-6 w-20 bg-muted/60 rounded-lg" />
                        </TableCell>
                      )}
                      
                      <TableCell className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-3 w-3 rounded-full bg-muted/60" />
                          <Skeleton className="h-5 w-32 bg-muted/60 rounded-md" />
                        </div>
                      </TableCell>
                      
                      <TableCell className="py-4 px-4">
                        <div className="flex flex-col gap-1">
                          <Skeleton className="h-5 w-20 bg-muted/60 rounded-md" />
                          <Skeleton className="h-4 w-16 bg-muted/40 rounded-md" />
                        </div>
                      </TableCell>
                      
                      <TableCell className="py-4 px-4">
                        <div className="flex justify-end">
                          <Skeleton className="h-8 w-8 bg-muted/60 rounded-lg" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredOrders.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={visibleColumns.length + 1} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground py-12">
                        <div className="p-4 rounded-full bg-muted/20 mb-4">
                          <Search className="h-8 w-8 opacity-40" />
                        </div>
                        <p className="text-lg font-semibold mb-2 text-foreground">لا توجد طلبات</p>
                        <p className="text-sm text-muted-foreground max-w-sm">لم يتم العثور على طلبات تطابق معايير البحث المحددة.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <OrderTableRow
                      key={order.id}
                      order={order}
                      selected={selectedOrders.includes(order.id)}
                      onSelect={handleSelectOrder}
                      onUpdateStatus={onUpdateStatus}
                      onUpdateCallConfirmation={onUpdateCallConfirmation}
                      onSendToProvider={onSendToProvider}
                      hasUpdatePermission={hasUpdatePermission}
                      hasCancelPermission={hasCancelPermission}
                      visibleColumns={visibleColumns}
                      expanded={!!expandedOrders[order.id]}
                      onToggleExpand={() => handleToggleExpand(order.id)}
                      currentUserId={currentUserId}
                      shippingProviders={shippingProviders}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* شريط التنقل السفلي المحسن */}
          {filteredOrders.length > 0 && (
            <div className="py-4 px-6 bg-gradient-to-r from-muted/20 to-muted/10 border-t border-border/30 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                عرض <span className="font-semibold text-foreground bg-accent/50 px-2 py-1 rounded-md">{(currentPage - 1) * pageSize + 1}</span> 
                إلى <span className="font-semibold text-foreground bg-accent/50 px-2 py-1 rounded-md">{Math.min(currentPage * pageSize, totalItems || orders.length)}</span> 
                من إجمالي <span className="font-semibold text-primary bg-primary/10 px-2 py-1 rounded-md">{totalItems || orders.length}</span> طلب
              </div>
              
              <div className="flex items-center gap-3">
                {onPageChange ? (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={!hasPreviousPage || currentPage <= 1}
                      onClick={() => onPageChange(currentPage - 1)}
                      className="px-4 py-2 rounded-lg border-border/40 bg-background/50 backdrop-blur-sm hover:bg-accent/50 hover:border-primary/30 transition-all duration-200 disabled:opacity-50"
                    >
                      السابق
                    </Button>
                    <div className="text-sm text-muted-foreground bg-muted/20 px-3 py-2 rounded-lg border border-border/30">
                      صفحة <span className="font-semibold text-foreground">{currentPage}</span> من <span className="font-semibold text-foreground">{Math.ceil((totalItems || orders.length) / pageSize)}</span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={!hasNextPage}
                      onClick={() => onPageChange(currentPage + 1)}
                      className="px-4 py-2 rounded-lg border-border/40 bg-background/50 backdrop-blur-sm hover:bg-accent/50 hover:border-primary/30 transition-all duration-200 disabled:opacity-50"
                    >
                      التالي
                    </Button>
                  </>
                ) : onLoadMore ? (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={!hasMoreOrders || loading}
                    onClick={onLoadMore}
                    className="px-6 py-2 rounded-lg border-border/40 bg-background/50 backdrop-blur-sm hover:bg-accent/50 hover:border-primary/30 transition-all duration-200 disabled:opacity-50"
                  >
                    {loading ? 'جاري التحميل...' : 'تحميل المزيد'}
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" size="sm" disabled className="px-4 py-2 rounded-lg border-border/40 bg-muted/20 text-muted-foreground">السابق</Button>
                    <Button variant="outline" size="sm" disabled className="px-4 py-2 rounded-lg border-border/40 bg-muted/20 text-muted-foreground">التالي</Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrdersTable;
