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
    /* تحسين التمرير */
    scrollbar-width: thin;
    scrollbar-color: hsl(var(--border)) transparent;
  }
  
  .orders-table-container::-webkit-scrollbar {
    height: 8px;
    width: 8px;
  }
  
  .orders-table-container::-webkit-scrollbar-track {
    background: transparent;
    border-radius: 4px;
  }
  
  .orders-table-container::-webkit-scrollbar-thumb {
    background: hsl(var(--border));
    border-radius: 4px;
    border: 1px solid transparent;
    background-clip: content-box;
  }
  
  .orders-table-container::-webkit-scrollbar-thumb:hover {
    background: hsl(var(--border) / 0.8);
    background-clip: content-box;
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
  
  /* تحسين الأنيميشن */
  .table-row-hover {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .table-row-hover:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }
  
  /* تحسين الزر العائم */
  .floating-scroll-button {
    backdrop-filter: blur(12px);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .floating-scroll-button:hover {
    transform: scale(1.05);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }
  
  /* تحسين الشريط الطائف */
  .sticky-scrollbar {
    backdrop-filter: blur(16px);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  }
  
  .sticky-scrollbar:hover {
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
  }
  
  /* تحسين شريط التمرير الطائف */
  .sticky-scrollbar-inner {
    scrollbar-width: thin;
    scrollbar-color: hsl(var(--primary) / 0.6) transparent;
  }
  
  .sticky-scrollbar-inner::-webkit-scrollbar {
    height: 8px;
  }
  
  .sticky-scrollbar-inner::-webkit-scrollbar-track {
    background: hsl(var(--muted) / 0.3);
    border-radius: 4px;
  }
  
  .sticky-scrollbar-inner::-webkit-scrollbar-thumb {
    background: hsl(var(--primary) / 0.6);
    border-radius: 4px;
    transition: background 0.2s ease;
  }
  
  .sticky-scrollbar-inner::-webkit-scrollbar-thumb:hover {
    background: hsl(var(--primary) / 0.8);
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
  const [showStickyScrollbar, setShowStickyScrollbar] = useState(false);
  const [scrollbarPosition, setScrollbarPosition] = useState<'top' | 'bottom' | 'floating'>('top');
  const [isDraggingSticky, setIsDraggingSticky] = useState(false);
  
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const stickyScrollbarRef = useRef<HTMLDivElement>(null);
  
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
      
      // تحديد ما إذا كان هناك حاجة لشريط التمرير الأفقي
      const needsHorizontalScroll = scrollWidth > clientWidth;
      setShowStickyScrollbar(needsHorizontalScroll);
      
      // إذا كان هناك تمرير أفقي، تحقق من موضع شريط التمرير الأصلي
      if (needsHorizontalScroll) {
        checkStickyScrollbarPosition();
      }
    }
  };

  // مراقبة موضع شريط التمرير الأصلي لتحديد موضع الشريط الطائف
  const checkStickyScrollbarPosition = () => {
    if (!tableContainerRef.current) return;
    
    const container = tableContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    
    // حساب موضع شريط التمرير الأفقي الأصلي (في أسفل الجدول)
    const scrollbarBottom = containerRect.bottom;
    const scrollbarTop = containerRect.top;
    
    // إذا كان شريط التمرير الأصلي مخفياً أسفل الشاشة
    if (scrollbarBottom > windowHeight - 30) {
      // إذا كان الجدول كله مخفياً في الأعلى أيضاً
      if (scrollbarTop < -100) {
        setScrollbarPosition('floating');
      } else {
        // الجدول جزئياً مرئي، ضع الشريط في الأعلى
        setScrollbarPosition('top');
      }
    } 
    // إذا كان الجدول كله مخفياً في الأعلى لكن شريط التمرير مرئي
    else if (scrollbarTop < -50 && scrollbarBottom > 50) {
      setScrollbarPosition('floating');
    }
    // شريط التمرير الأصلي مرئي بوضوح
    else {
      setScrollbarPosition('top');
    }
  };

  // دالة مزامنة التمرير بين الشريط الأصلي والطائف
  const syncScrollbars = (source: 'table' | 'sticky') => {
    if (!tableContainerRef.current || !stickyScrollbarRef.current) return;
    
    if (source === 'table') {
      stickyScrollbarRef.current.scrollLeft = tableContainerRef.current.scrollLeft;
    } else {
      tableContainerRef.current.scrollLeft = stickyScrollbarRef.current.scrollLeft;
    }
  };

  // تحديث عرض الشريط الطائف عند تغيير الجدول
  useEffect(() => {
    if (stickyScrollbarRef.current && tableContainerRef.current) {
      const stickyChild = stickyScrollbarRef.current.firstElementChild as HTMLElement;
      if (stickyChild) {
        stickyChild.style.width = `${Math.max(tableContainerRef.current.scrollWidth, 1200)}px`;
      }
    }
  }, [orders, filteredOrders, showStickyScrollbar]);

  // مراقبة التمرير
  useEffect(() => {
    const container = tableContainerRef.current;
    if (container) {
      // مراقبة التمرير الأفقي
      const handleTableScroll = () => {
        checkScrollability();
        syncScrollbars('table');
      };
      
      container.addEventListener('scroll', handleTableScroll);
      checkScrollability(); // فحص أولي
      
      // إضافة تمرير أفقي باستخدام عجلة الفأرة مع Shift
      const handleWheel = (e: WheelEvent) => {
        // إذا كان المستخدم يضغط Shift أو كان التمرير أفقياً
        if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
          e.preventDefault();
          const scrollAmount = e.deltaY || e.deltaX;
          container.scrollLeft += scrollAmount;
        }
      };
      
      container.addEventListener('wheel', handleWheel, { passive: false });
      
      // مراقبة التمرير العمودي للنافذة
      const handleWindowScroll = () => {
        if (showStickyScrollbar) {
          checkStickyScrollbarPosition();
        }
      };
      
      window.addEventListener('scroll', handleWindowScroll);
      
      // فحص عند تغيير حجم النافذة
      const handleResize = () => {
        setTimeout(() => {
          checkScrollability();
        }, 100);
      };
      window.addEventListener('resize', handleResize);
      
      // فحص أولي للتمرير
      checkScrollability();
      
      return () => {
        container.removeEventListener('scroll', handleTableScroll);
        container.removeEventListener('wheel', handleWheel);
        window.removeEventListener('scroll', handleWindowScroll);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [orders, filteredOrders]);

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
      {/* شريط التمرير الأفقي الطائف - يظهر فقط عندما يكون شريط التمرير الأصلي مخفياً */}
      {showStickyScrollbar && scrollbarPosition !== 'top' && (
        <div 
          className={`
            sticky-scrollbar fixed z-30 left-4 right-4 h-14 bg-background/95 border border-border/50 rounded-xl
            ${scrollbarPosition === 'floating' ? 'top-20 animate-in slide-in-from-top-4' : 'bottom-4 animate-in slide-in-from-bottom-4'}
            ${isDraggingSticky ? 'scale-105 shadow-2xl' : ''}
          `}
        >
          <div className="p-3 flex items-center justify-between h-full">
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <div className="w-1 h-1 bg-primary/60 rounded-full"></div>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-foreground font-semibold">شريط التمرير الطائف</span>
                <span className="text-[10px] text-muted-foreground">شريط التمرير الأصلي مخفي</span>
              </div>
            </div>
            
            {/* شريط التمرير الفعلي */}
            <div className="flex-1 mx-4">
              <div 
                ref={stickyScrollbarRef}
                className={`
                  sticky-scrollbar-inner overflow-x-auto overflow-y-hidden rounded-md bg-muted/20
                  ${isDraggingSticky ? 'ring-2 ring-primary/50 bg-muted/40' : 'hover:bg-muted/30'}
                  transition-all duration-200
                `}
                style={{ height: '24px' }}
                onScroll={() => syncScrollbars('sticky')}
                onMouseDown={() => setIsDraggingSticky(true)}
                onMouseUp={() => setIsDraggingSticky(false)}
                onMouseLeave={() => setIsDraggingSticky(false)}
              >
                {/* عنصر وهمي بنفس عرض الجدول */}
                <div 
                  style={{ width: '1200px', height: '100%' }} 
                  className={`
                    ${isDraggingSticky ? 'bg-gradient-to-r from-primary/20 to-primary/10' : 'bg-gradient-to-r from-primary/10 to-primary/5'}
                    transition-all duration-200
                  `}
                ></div>
              </div>
            </div>
            
            {/* مؤشر التقدم */}
            <div className="flex flex-col items-center gap-1">
              <div className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-md min-w-[40px] text-center">
                {Math.round(((tableContainerRef.current?.scrollLeft || 0) / 
                  Math.max((tableContainerRef.current?.scrollWidth || 1200) - (tableContainerRef.current?.clientWidth || 800), 1)) * 100)}%
              </div>
              <span className="text-[10px] text-muted-foreground">تقدم</span>
            </div>
          </div>
        </div>
      )}

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
        {/* مؤشرات التمرير الأفقي */}
                 {showLeftScroll && (
           <div className="absolute right-0 top-0 bottom-0 z-10 flex items-center">
             <Button
               variant="ghost"
               size="icon"
               onClick={() => scrollTable('left')}
               className="floating-scroll-button h-12 w-8 rounded-l-none rounded-r-xl bg-gradient-to-l from-background/95 to-background/80 shadow-lg border-l-0 border-2 border-border/30 hover:border-primary/40 hover:shadow-xl"
             >
               <ChevronRight className="h-5 w-5" />
             </Button>
           </div>
         )}
         
         {showRightScroll && (
           <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center">
             <Button
               variant="ghost"
               size="icon"
               onClick={() => scrollTable('right')}
               className="floating-scroll-button h-12 w-8 rounded-r-none rounded-l-xl bg-gradient-to-r from-background/95 to-background/80 shadow-lg border-r-0 border-2 border-border/30 hover:border-primary/40 hover:shadow-xl"
             >
               <ChevronLeft className="h-5 w-5" />
             </Button>
           </div>
         )}
        
        <div className="rounded-lg border border-border/30 bg-background/50 backdrop-blur-sm overflow-hidden">
          {/* رسالة إرشادية للتمرير */}
          {(showLeftScroll || showRightScroll) && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-700/30 px-4 py-2 text-xs text-blue-800 dark:text-blue-300 text-center">
              💡 <strong>نصيحة:</strong> استخدم Shift + عجلة الفأرة للتمرير الأفقي، أو انقر على الأسهم الجانبية
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
