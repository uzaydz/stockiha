import { useState, useMemo, useRef, useEffect } from "react";
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
  ChevronDown,
  ChevronLeft
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Order, OrdersTableProps } from "./OrderTableTypes";
import OrderTableRow from "./OrderTableRow";
import OrderBulkActions from "./OrderBulkActions";

// إضافة أنماط CSS مخصصة للتحسينات البصرية
const customStyles = `
  .orders-table-container {
    /* إخفاء شريط التمرير الافتراضي */
    scrollbar-width: none;
    -ms-overflow-style: none;
    cursor: grab;
    user-select: none;
  }
  
  .orders-table-container::-webkit-scrollbar {
    display: none;
  }
  
  .orders-table-container:active {
    cursor: grabbing;
  }
  
  /* تأثيرات الشفافية للتمرير */
  .scroll-fade-left {
    mask-image: linear-gradient(to right, transparent 0px, black 40px, black 100%);
  }
  
  .scroll-fade-right {
    mask-image: linear-gradient(to right, black 0px, black calc(100% - 40px), transparent 100%);
  }
  
  .scroll-fade-both {
    mask-image: linear-gradient(to right, transparent 0px, black 40px, black calc(100% - 40px), transparent 100%);
  }
  
  /* تحسين الانتقالات */
  .smooth-scroll {
    scroll-behavior: smooth;
  }
  
  /* تأثير التمرير التلقائي */
  .auto-scroll-zone {
    position: relative;
  }
  
  .auto-scroll-zone::before,
  .auto-scroll-zone::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    width: 50px;
    pointer-events: none;
    z-index: 10;
  }
  
  .auto-scroll-zone::before {
    left: 0;
    background: linear-gradient(to right, rgba(59, 130, 246, 0.1), transparent);
  }
  
  .auto-scroll-zone::after {
    right: 0;
    background: linear-gradient(to left, rgba(59, 130, 246, 0.1), transparent);
  }
`;

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
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  
  const tableContainerRef = useRef<HTMLDivElement>(null);
  
  // إضافة الأنماط المخصصة إلى الصفحة
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = customStyles;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

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

  // فحص إمكانية التمرير
  const checkScrollability = () => {
    if (tableContainerRef.current) {
      const container = tableContainerRef.current;
      const { scrollLeft, scrollWidth, clientWidth } = container;
      
      setShowLeftScroll(scrollLeft > 10);
      setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 10);
      
      // حساب نسبة التمرير
      const maxScroll = scrollWidth - clientWidth;
      const progress = maxScroll > 0 ? (scrollLeft / maxScroll) * 100 : 0;
      setScrollProgress(progress);
    }
  };

  // مراقبة التمرير
  useEffect(() => {
    const container = tableContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollability);
      checkScrollability(); // فحص أولي
      
      // إضافة تمرير بالسحب (drag to scroll)
      let isDown = false;
      let startX: number;
      let scrollLeft: number;

      const handleMouseDown = (e: MouseEvent) => {
        isDown = true;
        container.style.cursor = 'grabbing';
        startX = e.pageX - container.offsetLeft;
        scrollLeft = container.scrollLeft;
      };

      const handleMouseLeave = () => {
        isDown = false;
        container.style.cursor = 'grab';
      };

      const handleMouseUp = () => {
        isDown = false;
        container.style.cursor = 'grab';
      };

      const handleMouseMove = (e: MouseEvent) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - container.offsetLeft;
        const walk = (x - startX) * 2; // تسريع التمرير
        container.scrollLeft = scrollLeft - walk;
      };

      // إضافة تمرير تلقائي عند وضع الماوس على الحواف
      const handleMouseMoveForAutoScroll = (e: MouseEvent) => {
        const rect = container.getBoundingClientRect();
        const margin = 50; // منطقة التمرير التلقائي
        
        if (e.clientX < rect.left + margin && showRightScroll) {
          // تمرير لليمين
          container.scrollLeft -= 5;
        } else if (e.clientX > rect.right - margin && showLeftScroll) {
          // تمرير لليسار
          container.scrollLeft += 5;
        }
      };

      container.addEventListener('mousedown', handleMouseDown);
      container.addEventListener('mouseleave', handleMouseLeave);
      container.addEventListener('mouseup', handleMouseUp);
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mousemove', handleMouseMoveForAutoScroll);
      
      // إضافة cursor للإشارة إلى إمكانية السحب
      container.style.cursor = 'grab';
      
      // إضافة تمرير أفقي باستخدام عجلة الفأرة
      const handleWheel = (e: WheelEvent) => {
        // تمرير أفقي تلقائي بدون Shift
        if (Math.abs(e.deltaX) > 0 || (showLeftScroll || showRightScroll)) {
          e.preventDefault();
          const scrollAmount = e.deltaY || e.deltaX;
          container.scrollLeft += scrollAmount;
        }
      };
      
      container.addEventListener('wheel', handleWheel, { passive: false });
      
      // فحص عند تغيير حجم النافذة
      const handleResize = () => {
        setTimeout(checkScrollability, 100);
      };
      window.addEventListener('resize', handleResize);
      
      return () => {
        container.removeEventListener('scroll', checkScrollability);
        container.removeEventListener('mousedown', handleMouseDown);
        container.removeEventListener('mouseleave', handleMouseLeave);
        container.removeEventListener('mouseup', handleMouseUp);
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mousemove', handleMouseMoveForAutoScroll);
        container.removeEventListener('wheel', handleWheel);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [orders, filteredOrders, showLeftScroll, showRightScroll]);

  // دالة للتمرير الأفقي
  const scrollTable = (direction: 'left' | 'right') => {
    if (tableContainerRef.current) {
      const scrollAmount = 300;
      const currentScroll = tableContainerRef.current.scrollLeft;
      const targetScroll = direction === 'left' 
        ? currentScroll - scrollAmount 
        : currentScroll + scrollAmount;
      
      tableContainerRef.current.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="relative min-h-0">
      {/* شريط البحث والإجراءات العلوي - تصميم محسن */}
      <div className="p-5">
        <div className="mb-6 space-y-4">
          <div className="flex flex-col space-y-4 lg:flex-row lg:space-y-0 lg:space-x-4 lg:items-center lg:justify-between">
            <div className="relative flex items-center w-full lg:w-96">
              <Search className="absolute left-3 h-4 w-4 text-muted-foreground z-10" />
              <Input
                type="search"
                placeholder="البحث في الطلبات..."
                className="pl-10 pr-4 py-2.5 w-full rounded-lg border border-border/40 bg-background/50 backdrop-blur-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-foreground placeholder:text-muted-foreground"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
              {searchFilter && (
                <div className="absolute right-3 text-xs text-muted-foreground bg-primary/10 px-2 py-1 rounded-md">
                  {filteredOrders.length}
                </div>
              )}
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
        </div>
      </div>
      
      {/* الجدول المحسن مع تصميم حديث */}
      <div className="relative">
                {/* أزرار التمرير المحسنة */}
        {showLeftScroll && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 z-20">
            <Button
              variant="default"
              size="sm"
              onClick={() => scrollTable('left')}
              className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 shadow-xl border-2 border-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-110"
              title="تمرير لليسار"
            >
              <ChevronRight className="h-5 w-5 text-white" />
            </Button>
          </div>
        )}
        
        {showRightScroll && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 z-20">
            <Button
              variant="default"
              size="sm"
              onClick={() => scrollTable('right')}
              className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 shadow-xl border-2 border-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-110"
              title="تمرير لليمين"
            >
              <ChevronLeft className="h-5 w-5 text-white" />
            </Button>
          </div>
        )}
        
        <div className="rounded-lg border border-border/30 bg-background/50 backdrop-blur-sm overflow-hidden">
          {/* شريط تمرير مرئي */}
          {(showLeftScroll || showRightScroll) && (
            <div className="bg-muted/20 border-b border-border/30 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">تمرير الجدول</span>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>🖱️ اسحب</span>
                  <span>•</span>
                  <span>🖲️ عجلة الفأرة</span>
                  <span>•</span>
                  <span>👆 الأزرار</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => tableContainerRef.current && (tableContainerRef.current.scrollLeft = 0)}
                  className="h-6 px-2 text-xs"
                  disabled={!showRightScroll}
                >
                  البداية
                </Button>
                
                <div 
                  className="flex-1 h-2 bg-border/30 rounded-full overflow-hidden cursor-pointer"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    if (rect && tableContainerRef.current) {
                      const clickX = e.clientX - rect.left;
                      const percentage = clickX / rect.width;
                      const maxScroll = tableContainerRef.current.scrollWidth - tableContainerRef.current.clientWidth;
                      tableContainerRef.current.scrollLeft = percentage * maxScroll;
                    }
                  }}
                >
                  <div 
                    className="absolute top-0 h-full bg-primary/60 rounded-full transition-all duration-200 hover:bg-primary/80"
                    style={{
                      width: `${Math.max(10, 100 - scrollProgress)}%`,
                      transform: `translateX(${scrollProgress}%)`
                    }}
                  />
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (tableContainerRef.current) {
                      const maxScroll = tableContainerRef.current.scrollWidth - tableContainerRef.current.clientWidth;
                      tableContainerRef.current.scrollLeft = maxScroll;
                    }
                  }}
                  className="h-6 px-2 text-xs"
                  disabled={!showLeftScroll}
                >
                  النهاية
                </Button>
              </div>
            </div>
          )}
          
          <div 
            ref={tableContainerRef}
            className={`orders-table-container overflow-x-auto overflow-y-visible ${
              showLeftScroll && showRightScroll ? 'scroll-fade-both' :
              showLeftScroll ? 'scroll-fade-left' :
              showRightScroll ? 'scroll-fade-right' : ''
            }`}
          >
            <Table className="w-full min-w-[1200px]">
              <TableHeader className="sticky top-0 z-15 bg-gradient-to-r from-muted/40 to-muted/20 backdrop-blur-sm border-b border-border/50">
                <TableRow className="hover:bg-transparent">
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
                    <TableRow key={`skeleton-${index}`} className="hover:bg-accent/10 border-b border-border/20 transition-all duration-300">
                      {visibleColumns.includes("checkbox") && (
                        <TableCell className="py-5 px-6">
                          <Skeleton className="h-5 w-5 bg-muted/60 rounded-md animate-pulse" />
                        </TableCell>
                      )}
                      
                      {visibleColumns.includes("expand") && (
                        <TableCell className="py-5">
                          <Skeleton className="h-5 w-5 bg-muted/60 rounded-md animate-pulse" />
                        </TableCell>
                      )}
                      
                      <TableCell className="py-5 px-6">
                        <Skeleton className="h-6 w-28 bg-muted/60 rounded-lg animate-pulse" />
                      </TableCell>
                      
                      <TableCell className="py-5 px-6">
                        <div className="flex flex-col gap-2">
                          <Skeleton className="h-6 w-36 bg-muted/60 rounded-lg animate-pulse" />
                          <Skeleton className="h-4 w-24 bg-muted/40 rounded-md animate-pulse" />
                        </div>
                      </TableCell>
                      
                      <TableCell className="py-5 px-6">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-6 w-6 bg-muted/60 rounded-full animate-pulse" />
                            <Skeleton className="h-5 w-20 bg-muted/60 rounded-lg animate-pulse" />
                          </div>
                          <Skeleton className="h-4 w-32 bg-muted/40 rounded-md animate-pulse" />
                        </div>
                      </TableCell>
                      
                      <TableCell className="py-5 px-6">
                        <Skeleton className="h-7 w-24 bg-muted/60 rounded-xl animate-pulse" />
                      </TableCell>
                      
                      {visibleColumns.includes("items") && (
                        <TableCell className="py-5 px-6">
                          <Skeleton className="h-6 w-12 bg-muted/60 rounded-lg animate-pulse" />
                        </TableCell>
                      )}
                      
                      <TableCell className="py-5 px-6">
                        <Skeleton className="h-7 w-28 bg-muted/60 rounded-full animate-pulse" />
                      </TableCell>
                      
                      <TableCell className="py-5 px-6">
                        <Skeleton className="h-6 w-36 bg-muted/60 rounded-lg animate-pulse" />
                      </TableCell>
                      
                      {visibleColumns.includes("call_confirmation") && (
                        <TableCell className="py-5 px-6">
                          <Skeleton className="h-7 w-24 bg-muted/60 rounded-xl animate-pulse" />
                        </TableCell>
                      )}
                      
                      <TableCell className="py-5 px-6">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-4 rounded-full bg-muted/60 animate-pulse" />
                          <Skeleton className="h-6 w-36 bg-muted/60 rounded-lg animate-pulse" />
                        </div>
                      </TableCell>
                      
                      <TableCell className="py-5 px-6">
                        <div className="flex flex-col gap-2">
                          <Skeleton className="h-6 w-24 bg-muted/60 rounded-lg animate-pulse" />
                          <Skeleton className="h-4 w-20 bg-muted/40 rounded-md animate-pulse" />
                        </div>
                      </TableCell>
                      
                      <TableCell className="py-5 px-6">
                        <div className="flex justify-end">
                          <Skeleton className="h-9 w-9 bg-muted/60 rounded-xl animate-pulse" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredOrders.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={visibleColumns.length + 1} className="h-40 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground py-16">
                        <div className="p-6 rounded-full bg-gradient-to-br from-muted/30 to-muted/10 mb-6 shadow-lg">
                          <Search className="h-12 w-12 opacity-50" />
                        </div>
                        <p className="text-xl font-bold mb-3 text-foreground">لا توجد طلبات</p>
                        <p className="text-sm text-muted-foreground max-w-md text-center leading-relaxed">
                          {searchFilter ? 
                            `لم يتم العثور على طلبات تطابق "${searchFilter}". جرب البحث بمصطلح آخر أو امسح الفلتر.` :
                            "لم يتم العثور على أي طلبات حالياً. ستظهر الطلبات الجديدة هنا عند وصولها."
                          }
                        </p>
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
