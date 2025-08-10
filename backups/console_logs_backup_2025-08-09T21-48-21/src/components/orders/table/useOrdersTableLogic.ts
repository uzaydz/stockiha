import { useState, useMemo, useRef, useCallback } from "react";
import { Order } from "./OrderTableTypes";
import { useDebouncedExpansion } from "./useDebouncedExpansion";

interface UseOrdersTableLogicProps {
  orders: Order[];
  // عند false سيتم تعطيل الفلترة/الفرز المحليين والاعتماد على البيانات القادمة من الخادم
  processLocally?: boolean;
}

export const useOrdersTableLogic = ({ orders, processLocally = true }: UseOrdersTableLogicProps) => {
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

  // تنقية وترتيب الطلبات محلياً فقط عند الحاجة
  const filteredOrders = useMemo(() => {
    if (!processLocally) {
      // عندما تكون الفلترة خادمياً، لا نعيد معالجة البيانات محلياً لتقليل عمليات الحساب وإعادة التصيير
      return orders;
    }

    let result = orders;

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

    const sortedOrders = [...result].sort((a, b) => {
      const dateDiff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (dateDiff !== 0) return dateDiff;
      const aNum = a.customer_order_number ?? 0;
      const bNum = b.customer_order_number ?? 0;
      return bNum - aNum;
    });

    return sortedOrders;
  }, [orders, searchFilter, processLocally]);

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
    if (!tableContainerRef.current) return;
    const container = tableContainerRef.current;
    const scrollLeft = container.scrollLeft;
    const scrollWidth = container.scrollWidth;
    const clientWidth = container.clientWidth;

    const hasLeft = scrollLeft > 10;
    const hasRight = scrollLeft < scrollWidth - clientWidth - 10;

    // تحديث حالة المؤشرات فقط دون حساب progress ثقيل
    setShowLeftScroll(hasLeft);
    setShowRightScroll(hasRight);
  }, []);

  // دوال التمرير
  // أزلنا دوال التمرير لأن عناصر التحكم الخاصة بها حُذفت

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

  // أزلنا scrollToProgress لعدم الحاجة

  return {
    // State
    selectedOrders,
    searchFilter,
    expandedOrders,
    showLeftScroll,
    showRightScroll,
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
    scrollToStart,
    scrollToEnd,
    
    // Debounced expansion
    isExpanded,
    collapseAll,
    expandedCount,
  };
};
