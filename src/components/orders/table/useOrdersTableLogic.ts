import { useState, useMemo, useRef, useCallback } from "react";
import { Order } from "./OrderTableTypes";
import { useDebouncedExpansion } from "./useDebouncedExpansion";

interface UseOrdersTableLogicProps {
  orders: Order[];
}

export const useOrdersTableLogic = ({ orders }: UseOrdersTableLogicProps) => {
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [searchFilter, setSearchFilter] = useState("");
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  
  const tableContainerRef = useRef<HTMLDivElement>(null);
  
  // استخدام debounced expansion للتحسين
  const {
    expandedOrders,
    toggleExpansion,
    isExpanded,
    collapseAll,
    expandedCount,
  } = useDebouncedExpansion();

  // تنقية وترتيب الطلبات
  const filteredOrders = useMemo(() => {
    let result = orders;
    
    // تطبيق فلتر البحث المحلي
    if (searchFilter.trim()) {
      const searchTerm = searchFilter.toLowerCase();
      result = orders.filter(order => 
        order.id.toLowerCase().includes(searchTerm) ||
        (order.customer_order_number?.toString() || "").includes(searchTerm) ||
        order.customer?.name?.toLowerCase().includes(searchTerm) ||
        order.customer?.phone?.toLowerCase().includes(searchTerm) ||
        order.customer?.email?.toLowerCase().includes(searchTerm) ||
        order.status.toLowerCase().includes(searchTerm)
      );
    }

    // ترتيب الطلبيات حسب رقم الطلبية إذا كانت متوفرة، وإلا حسب التاريخ
    const sortedOrders = [...result].sort((a, b) => {
      // أولاً: حسب customer_order_number (الأعلى أولاً)
      if (a.customer_order_number && b.customer_order_number) {
        return b.customer_order_number - a.customer_order_number;
      }
      
      // ثانياً: حسب التاريخ إذا لم تكن الأرقام متوفرة
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // Debug logs (في وضع التطوير فقط)
    if (process.env.NODE_ENV === 'development' && orders.length > 0 && !searchFilter) {
    }
    
    return sortedOrders;
  }, [orders, searchFilter]);

  // التحقق من وجود انتقاء كلي
  const allSelected = useMemo(() => {
    return filteredOrders.length > 0 && selectedOrders.length === filteredOrders.length;
  }, [filteredOrders, selectedOrders]);

  // التعامل مع تحديد/إلغاء تحديد كل الطلبات
  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedOrders(filteredOrders.map(order => order.id));
    } else {
      setSelectedOrders([]);
    }
  }, [filteredOrders]);

  // التعامل مع تحديد/إلغاء تحديد طلب واحد
  const handleSelectOrder = useCallback((orderId: string, selected: boolean) => {
    if (selected) {
      setSelectedOrders(prev => [...prev, orderId]);
    } else {
      setSelectedOrders(prev => prev.filter(id => id !== orderId));
    }
  }, []);

  // التعامل مع توسيع/طي تفاصيل الطلب - محسن مع debounce
  const handleToggleExpand = useCallback((orderId: string) => {
    toggleExpansion(orderId);
  }, [toggleExpansion]);

  // إعادة ضبط التحديدات
  const resetSelections = useCallback(() => {
    setSelectedOrders([]);
  }, []);

  // فحص إمكانية التمرير
  const checkScrollability = useCallback(() => {
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
  }, []);

  // دوال التمرير
  const scrollTable = useCallback((direction: 'left' | 'right') => {
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
  }, []);

  const scrollToStart = useCallback(() => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollLeft = 0;
    }
  }, []);

  const scrollToEnd = useCallback(() => {
    if (tableContainerRef.current) {
      const maxScroll = tableContainerRef.current.scrollWidth - tableContainerRef.current.clientWidth;
      tableContainerRef.current.scrollLeft = maxScroll;
    }
  }, []);

  const scrollToProgress = useCallback((percentage: number) => {
    if (tableContainerRef.current) {
      const maxScroll = tableContainerRef.current.scrollWidth - tableContainerRef.current.clientWidth;
      tableContainerRef.current.scrollLeft = (percentage / 100) * maxScroll;
    }
  }, []);

  return {
    // State
    selectedOrders,
    searchFilter,
    expandedOrders,
    showLeftScroll,
    showRightScroll,
    scrollProgress,
    tableContainerRef,
    
    // Computed
    filteredOrders,
    allSelected,
    
    // Handlers
    setSearchFilter,
    handleSelectAll,
    handleSelectOrder,
    handleToggleExpand,
    resetSelections,
    checkScrollability,
    scrollTable,
    scrollToStart,
    scrollToEnd,
    scrollToProgress,
    
    // Debounced expansion
    isExpanded,
    collapseAll,
    expandedCount,
  };
};
