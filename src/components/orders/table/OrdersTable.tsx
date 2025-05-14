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
import { Order } from "./OrderTableTypes";
import OrderTableRow from "./OrderTableRow";
import OrderBulkActions from "./OrderBulkActions";

type OrdersTableProps = {
  orders: Order[];
  loading: boolean;
  onUpdateStatus: (orderId: string, newStatus: string, userId?: string) => Promise<void>;
  onUpdateCallConfirmation?: (orderId: string, statusId: number, notes?: string, userId?: string) => Promise<void>;
  onBulkUpdateStatus?: (orderIds: string[], newStatus: string, userId?: string) => Promise<void>;
  hasUpdatePermission: boolean;
  hasCancelPermission: boolean;
  visibleColumns?: string[];
  currentUserId?: string;
};

const OrdersTable = ({
  orders,
  loading,
  onUpdateStatus,
  onUpdateCallConfirmation,
  onBulkUpdateStatus,
  hasUpdatePermission,
  hasCancelPermission,
  visibleColumns = ["checkbox", "expand", "id", "customer_name", "customer_contact", "total", "items", "status", "call_confirmation", "source", "actions"],
  currentUserId,
}: OrdersTableProps) => {
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
    <Card className="border rounded-lg overflow-hidden shadow-sm">
      <CardContent className="p-0">
        <div className="p-4 flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4 sm:items-center sm:justify-between border-b">
          <div className="relative flex items-center w-full sm:w-72">
            <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="البحث في الطلبات..."
              className="pl-8 w-full focus:ring-2 focus:ring-primary/20 transition-all"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2 flex-wrap rtl:space-x-reverse">
            {selectedOrders.length > 0 && (
              <div className="mr-2 bg-muted/50 px-3 py-1 rounded-md text-sm flex items-center">
                <span className="font-medium">{selectedOrders.length}</span>
                <span className="mr-1 text-muted-foreground">طلب محدد</span>
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
            
            <Button variant="outline" size="sm" className="gap-1">
              <Filter className="h-4 w-4" />
              <span>تصفية</span>
            </Button>
            
            <Button variant="outline" size="sm" className="gap-1">
              <SlidersHorizontal className="h-4 w-4" />
              <span>الأعمدة</span>
            </Button>
            
            <Button variant="outline" size="sm" className="gap-1">
              <Download className="h-4 w-4" />
              <span>تصدير</span>
            </Button>
            
            <Button variant="outline" size="sm" className="gap-1">
              <Printer className="h-4 w-4" />
              <span>طباعة</span>
            </Button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader className="bg-muted/30">
              <TableRow>
                {visibleColumns.includes("checkbox") && (
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={handleSelectAll}
                      disabled={filteredOrders.length === 0}
                      aria-label="تحديد كل الطلبات"
                    />
                  </TableHead>
                )}
                
                {visibleColumns.includes("expand") && (
                  <TableHead className="w-10"></TableHead>
                )}
                
                {visibleColumns.includes("id") && (
                  <TableHead className="font-medium">رقم الطلب</TableHead>
                )}
                
                {visibleColumns.includes("customer_name") && (
                  <TableHead className="font-medium">اسم العميل</TableHead>
                )}
                
                {visibleColumns.includes("customer_contact") && (
                  <TableHead className="font-medium">بيانات الاتصال</TableHead>
                )}
                
                {visibleColumns.includes("total") && (
                  <TableHead className="font-medium">إجمالي الطلب</TableHead>
                )}
                
                {visibleColumns.includes("items") && (
                  <TableHead className="font-medium">المنتجات</TableHead>
                )}
                
                {visibleColumns.includes("status") && (
                  <TableHead className="font-medium">حالة الطلب</TableHead>
                )}
                
                {visibleColumns.includes("call_confirmation") && (
                  <TableHead className="font-medium">تأكيد المكالمة</TableHead>
                )}
                
                {visibleColumns.includes("source") && (
                  <TableHead className="font-medium">معلومات الطلب</TableHead>
                )}
                
                {visibleColumns.includes("actions") && (
                  <TableHead className="text-right font-medium w-14">الإجراءات</TableHead>
                )}
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={`skeleton-${index}`} className="hover:bg-muted/20">
                    {visibleColumns.includes("checkbox") && (
                      <TableCell>
                        <Skeleton className="h-4 w-4" />
                      </TableCell>
                    )}
                    
                    {visibleColumns.includes("expand") && (
                      <TableCell>
                        <Skeleton className="h-4 w-4" />
                      </TableCell>
                    )}
                    
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1">
                          <Skeleton className="h-5 w-16" />
                          <Skeleton className="h-5 w-16" />
                        </div>
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    
                    {visibleColumns.includes("items") && (
                      <TableCell>
                        <Skeleton className="h-5 w-10" />
                      </TableCell>
                    )}
                    
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    
                    <TableCell>
                      <Skeleton className="h-5 w-32" />
                    </TableCell>
                    
                    {visibleColumns.includes("call_confirmation") && (
                      <TableCell>
                        <Skeleton className="h-6 w-20" />
                      </TableCell>
                    )}
                    
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Skeleton className="h-3.5 w-3.5 rounded-full" />
                        <Skeleton className="h-5 w-32" />
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex justify-end space-x-2">
                        <Skeleton className="h-8 w-8" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length + 1} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground py-8">
                      <Search className="h-8 w-8 mb-2 opacity-20" />
                      <p className="text-lg font-medium mb-1">لا توجد طلبات</p>
                      <p className="text-sm">لم يتم العثور على طلبات تطابق معايير البحث.</p>
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
                    hasUpdatePermission={hasUpdatePermission}
                    hasCancelPermission={hasCancelPermission}
                    visibleColumns={visibleColumns}
                    expanded={!!expandedOrders[order.id]}
                    onToggleExpand={() => handleToggleExpand(order.id)}
                    currentUserId={currentUserId}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {filteredOrders.length > 0 && (
          <div className="py-3 px-4 flex items-center justify-between border-t">
            <p className="text-sm text-muted-foreground">
              عرض <span className="font-medium">{filteredOrders.length}</span> من إجمالي <span className="font-medium">{orders.length}</span> طلب
            </p>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Button variant="outline" size="sm" disabled>السابق</Button>
              <Button variant="outline" size="sm" disabled>التالي</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OrdersTable; 