import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState, lazy } from 'react';
import { createPortal } from 'react-dom';
import { toast } from "sonner";
import type { Order } from '@/types/index';

// استيراد المكونات المحسنة
import POSPureLayout from '@/components/pos-layout/POSPureLayout';
import POSAdvancedContent from '@/components/pos-advanced/POSAdvancedContent';
import POSAdvancedCart from '@/components/pos-advanced/POSAdvancedCart';
import { POSAdvancedHeader } from '@/components/pos-advanced/POSAdvancedHeader';

// استيراد المكونات الجديدة - استيراد مباشر لتجنب مشاكل star export
import { POSAdvancedPerformanceBar } from '@/components/pos-advanced/POSAdvancedPerformanceBar';
import { POSAdvancedDialogs } from '@/components/pos-advanced/POSAdvancedDialogs';
import { POSAdvancedGlobalScanner } from '@/components/pos-advanced/POSAdvancedGlobalScanner';
import { POSAdvancedLoadingSkeleton, POSAdvancedInitialLoading } from '@/components/pos-advanced/POSAdvancedLoadingSkeleton';

// استيراد Hooks الجديدة - استيراد مباشر لتجنب مشاكل barrel export
import { usePOSAdvancedState } from '@/hooks/usePOSAdvancedState';
import { usePOSAdvancedDialogs } from '@/hooks/usePOSAdvancedDialogs';
import { usePOSAdvancedProductHandlers } from '@/hooks/usePOSAdvancedProductHandlers';

// استيراد الميزات الجديدة
import { useKeyboardShortcuts, createPOSShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import POSAdvancedHoldOrders from '@/components/pos-advanced/POSAdvancedHoldOrders';
import KeyboardShortcutsDialog from '@/components/pos-advanced/KeyboardShortcutsDialog';
import { saveHeldOrder, HeldOrder, getHeldOrdersCount } from '@/lib/hold-orders';
import { calculateDiscount, getDiscountRules, calculateTotalDiscount, formatDiscountText } from '@/lib/discount-engine';
import { useWorkSession } from '@/context/WorkSessionContext';
import StartSessionDialog from '@/components/pos/StartSessionDialog';
import { usePOSAudio } from '@/hooks/usePOSAudio';

// ⚡ Hooks الجديدة للتحسينات
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { usePendingOperations } from '@/hooks/usePendingOperations';
import { PendingOperationsIndicator } from '@/components/pos-advanced/PendingOperationsIndicator';
import { useOldSessionAlert } from '@/hooks/useOldSessionAlert';

// ⚡ نظام الطباعة الموحد
import { usePrinter } from '@/hooks/usePrinter';

// استيراد مكونات UI
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatCurrency } from "@/lib/utils";
import { Camera, ChevronUp, RotateCcw, ShoppingCart, Archive, Sparkles, Store, X, AlertTriangle, Clock, ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// ⚡ مكونات Infinity Space الجديدة
import { InfinityHeader, TitaniumCart, AdvancedItemEditDialog, CustomerSaleDialog } from '@/components/pos-infinity';
import type { POSMode } from '@/components/pos-infinity/CommandIsland';
import type { SaleMode } from '@/components/pos-infinity/CustomerSaleDialog';

// ⚡ وضع الخسائر
import { usePOSLoss } from '@/components/pos/hooks/usePOSLoss';
import { LossModeCart } from '@/components/pos-advanced/cart/LossModeCart';

// ⚡ Context للتواصل مع التايتل بار
import { usePOSActions } from '@/context/POSActionsContext';

// ⚡ نافذة الدفع
const POSAdvancedPaymentDialog = React.lazy(() => import('@/components/pos-advanced/POSAdvancedPaymentDialog'));

import MobileBarcodeScanner from "@/components/pos-advanced/components/MobileBarcodeScanner";

// =================================================================
// 🚀 صفحة POS المتقدمة - مقسمة إلى مكونات منفصلة
// =================================================================

const POSAdvanced = () => {
  // التحقق من جلسة العمل
  const { hasActiveSession, activeSession, refreshActiveSession, isAdminMode, isLoading: isSessionLoading } = useWorkSession();

  // ⚡ إظهار dialog بدء الجلسة فقط للموظفين (ليس للمدير)
  const [showSessionDialog, setShowSessionDialog] = useState(false);

  // ⚡ تحديث حالة dialog عند تغيير الجلسة
  useEffect(() => {
    // إذا لم يكن هناك جلسة ولم يكن المدير، اعرض dialog
    if (!isSessionLoading && !hasActiveSession && !isAdminMode) {
      setShowSessionDialog(true);
    } else if (hasActiveSession || isAdminMode) {
      setShowSessionDialog(false);
    }
  }, [hasActiveSession, isAdminMode, isSessionLoading]);

  // ⚡ تنبيه الجلسة القديمة
  useOldSessionAlert({
    enabled: true,
    maxHours: 12 // تنبيه إذا مرت 12 ساعة
  });

  // ⚡ وضع الخسائر
  const {
    isLossMode,
    toggleLossMode,
    exitLossMode,
    lossItems,
    lossDescription,
    setLossDescription,
    addItemToLossCart,
    addVariantToLossCart,
    updateLossItem,
    removeLossItem,
    clearLossCart,
    submitLoss,
    isSubmittingLoss,
    lossTotals
  } = usePOSLoss();

  // ⚡ نظام الطباعة الموحد
  const { printHtml, isElectron: isElectronPrint } = usePrinter();

  // استخدام Hook إدارة الحالة الرئيسية
  const {
    // البيانات الأساسية
    allProducts,
    products,
    filteredProducts,
    pagination,
    subscriptions,
    subscriptionCategories,
    productCategories,
    customers,
    currentUser,
    favoriteProducts,

    // حالة التحميل والأخطاء
    isLoading,
    isRefetching,
    error,
    errorMessage,
    executionTime,

    // حالة التطبيقات
    isAppEnabled,
    isStaff,

    // حالة pagination والبحث
    currentPage,
    pageSize,
    searchQuery,
    categoryFilter,

    // حالة السلة والطلبات
    tabs,
    activeTab,
    activeTabId,
    cartItems,
    selectedServices,
    selectedSubscriptions,
    isReturnMode,
    returnItems,
    returnReason,
    returnNotes,
    isSubmittingOrder,

    // دوال pagination والبحث
    handlePageChange,
    handleSearchChange,
    handleCategoryFilter,
    handlePageSizeChange,

    // دوال إدارة السلة
    setActiveTabId,
    addTab,
    removeTab,
    updateTab,
    addItemToCart,
    addVariantToCart,
    removeItemFromCart,
    updateItemQuantity,
    updateItemPrice,
    updateItemSaleType,
    clearCart,
    addService,
    removeService,
    updateServicePrice,
    handleAddSubscription,
    removeSubscription,
    updateSubscriptionPrice,
    assignCustomerToTab,

    // دوال إدارة الإرجاع
    setReturnReason,
    setReturnNotes,
    addItemToReturnCart,
    addVariantToReturnCart,
    updateReturnItemQuantity,
    updateReturnItemPrice,
    removeReturnItem,
    clearReturnCart,
    toggleReturnMode,
    // ⚡ دوال أنواع البيع المتقدمة للإرجاع
    updateReturnItemWeight,
    updateReturnItemBoxCount,
    updateReturnItemLength,
    updateReturnItemSellingUnit,
    updateReturnItemSaleType,
    updateReturnItemFullConfig,
    calculateReturnItemTotal,

    // ⚡ دوال أنواع البيع المتقدمة (وزن/كرتون/متر)
    updateItemSellingUnit,
    updateItemWeight,
    updateItemBoxCount,
    updateItemLength,
    updateItemFullConfig,
    calculateItemTotal,

    // ⚡ دوال الدفعات والأرقام التسلسلية
    updateItemBatch,
    updateItemSerialNumbers,

    // دوال الطلبات
    handleSubmitOrder,
    processReturn: handleProcessReturn,
    refreshData: handleRefreshData,

    // دوال السكانر
    scanBarcode,
    isScannerLoading,
    barcodeBuffer,

    // دوال التحديث
    refreshData,
    updateProductStockInCache,
    getProductStock
  } = usePOSAdvancedState();

  // استخدام Hook إدارة النوافذ الحوارية
  const {
    // حالة النوافذ الحوارية
    isVariantDialogOpen,
    isPOSSettingsOpen,
    isRepairDialogOpen,
    isRepairPrintDialogOpen,
    isPrintDialogOpen,
    isCalculatorOpen,
    isQuickExpenseOpen,

    // دوال إدارة النوافذ الحوارية
    setIsVariantDialogOpen,
    setIsPOSSettingsOpen,
    setIsRepairDialogOpen,
    setIsRepairPrintDialogOpen,
    setIsPrintDialogOpen,
    setIsCalculatorOpen,
    setIsQuickExpenseOpen,

    // بيانات النوافذ الحوارية
    selectedProductForVariant,
    setSelectedProductForVariant,
    selectedRepairOrder,
    setSelectedRepairOrder,
    repairQueuePosition,
    setRepairQueuePosition,

    // بيانات الطباعة
    completedItems,
    completedServices,
    completedSubscriptions,
    completedTotal,
    completedSubtotal,
    completedDiscount,
    completedDiscountAmount,
    completedCustomerName,
    completedOrderNumber,
    completedOrderDate,
    completedPaidAmount,
    completedRemainingAmount,
    isPartialPayment,
    considerRemainingAsPartial,
    subscriptionAccountInfo,

    // دوال معالجة الأحداث
    handleRepairServiceSuccess,
    clearPrintData,
    savePrintData
  } = usePOSAdvancedDialogs();

  // الصوت
  const { playAddToCart, playSuccess, playError, playClick } = usePOSAudio();

  // ⚡ ربط أزرار التايتل بار مع النوافذ المحلية
  const {
    isCalculatorOpen: isTitlebarCalculatorOpen,
    isQuickExpenseOpen: isTitlebarExpenseOpen,
    isSettingsOpen: isTitlebarSettingsOpen,
    isCustomersOpen: isTitlebarCustomersOpen,
    closeCalculator: closeTitlebarCalculator,
    closeQuickExpense: closeTitlebarExpense,
    closeSettings: closeTitlebarSettings,
    closeCustomers: closeTitlebarCustomers,
    setRefreshHandler
  } = usePOSActions();

  // ⚡ البحث مع Debounce (300ms تأخير)
  const {
    inputValue: searchInputValue,
    debouncedValue: debouncedSearchValue,
    setInputValue: setSearchInputValue,
    clearSearch,
    isSearching
  } = useDebouncedSearch({
    delay: 300,
    onDebouncedChange: (value) => {
      handleSearchChange(value);
    }
  });

  // ⚡ مراقبة العمليات المعلقة
  const {
    stats: pendingStats,
    hasPending: hasPendingOperations,
    status: pendingStatus,
    refresh: refreshPendingStats
  } = usePendingOperations({
    checkInterval: 15000, // تحقق كل 15 ثانية
    warningThreshold: 5,
    criticalThreshold: 20,
    showNotifications: true
  });

  // استخدام Hook معالجة المنتجات
  const { handleProductWithVariants, handleAddVariantToCart } = usePOSAdvancedProductHandlers(
    isReturnMode,
    (product) => {
      addItemToCart(product);
      playAddToCart();
    },
    (product) => {
      addItemToReturnCart(product);
      playClick();
    },
    (product, colorId, sizeId, price, colorName, colorCode, sizeName, image) => {
      addVariantToCart(product, colorId, sizeId, price, colorName, colorCode, sizeName, image);
      playAddToCart();
    },
    (product, colorId, sizeId, price, colorName, colorCode, sizeName, image) => {
      addVariantToReturnCart(product, colorId, sizeId, price, colorName, colorCode, sizeName, image);
      playClick();
    },
    setSelectedProductForVariant,
    setIsVariantDialogOpen,
    // ⚡ وضع الخسائر
    isLossMode,
    (product) => {
      addItemToLossCart(product);
      playClick();
    },
    (product, colorId, sizeId, price, colorName, colorCode, sizeName, image) => {
      addVariantToLossCart(product, colorId, sizeId, price, colorName, colorCode, sizeName, image);
      playClick();
    }
  );

  const isMobile = useIsMobile();
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [isCameraScannerSupported, setIsCameraScannerSupported] = useState(false);
  const [hasNativeBarcodeDetector, setHasNativeBarcodeDetector] = useState(false);
  const [isCameraBusy, setIsCameraBusy] = useState(false);
  const cameraProcessingRef = useRef(false);
  const previousMobileCartCountRef = useRef(0);
  const [isCompactLayout, setIsCompactLayout] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return isMobile;
    }
    return window.innerWidth < 1024;
  });

  // ⚡ استخدام التصميم الجديد Infinity Space
  const [useInfinityDesign] = useState(true);

  // ⚡ نافذة تعديل العنصر المتقدمة
  const [isAdvancedEditOpen, setIsAdvancedEditOpen] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number>(-1);

  // ⚡ نافذة الدفع
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  // ⚡ نافذة العميل ونوع البيع
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [saleMode, setSaleMode] = useState<SaleMode>('normal');
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');

  // ⚡ مزامنة حالة النوافذ من التايتل بار
  useEffect(() => {
    if (isTitlebarCalculatorOpen) {
      setIsCalculatorOpen(true);
      closeTitlebarCalculator();
    }
  }, [isTitlebarCalculatorOpen]);

  useEffect(() => {
    if (isTitlebarExpenseOpen) {
      setIsQuickExpenseOpen(true);
      closeTitlebarExpense();
    }
  }, [isTitlebarExpenseOpen]);

  useEffect(() => {
    if (isTitlebarSettingsOpen) {
      setIsPOSSettingsOpen(true);
      closeTitlebarSettings();
    }
  }, [isTitlebarSettingsOpen]);

  useEffect(() => {
    if (isTitlebarCustomersOpen) {
      setIsCustomerDialogOpen(true);
      closeTitlebarCustomers();
    }
  }, [isTitlebarCustomersOpen]);

  // ⚡ تسجيل دالة التحديث للتايتل بار - مرة واحدة فقط
  useEffect(() => {
    setRefreshHandler(() => {
      refreshData();
      toast.success('جاري تحديث البيانات...');
    });
  }, []);

  // الميزات الجديدة
  const [isHoldOrdersOpen, setIsHoldOrdersOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [heldOrdersCount, setHeldOrdersCount] = useState(0);
  const confirmDialog = useConfirmDialog();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // خرائط سريعة للعثور على المنتج بالمعرف للسكانر حتى لو لم يكن في الصفحة الحالية
  const getProductById = useMemo(() => {
    const map = new Map<string, any>();
    (allProducts || products || []).forEach((p: any) => map.set(p.id, p));
    return (id: string) => map.get(id);
  }, [allProducts, products]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const hasCameraAccess = Boolean(navigator?.mediaDevices?.getUserMedia);
    const hasDetector = typeof (window as any).BarcodeDetector !== 'undefined';

    setIsCameraScannerSupported(hasCameraAccess);
    setHasNativeBarcodeDetector(hasDetector);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleResize = () => {
      setIsCompactLayout(window.innerWidth < 1024);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setIsMobileCartOpen(false);
      previousMobileCartCountRef.current = 0;
    }
  }, [isMobile]);

  // تحديث عدد الطلبات المعلقة
  useEffect(() => {
    const updateHeldOrdersCount = () => {
      setHeldOrdersCount(getHeldOrdersCount());
    };
    updateHeldOrdersCount();

    // تحديث كل 5 ثواني
    const interval = setInterval(updateHeldOrdersCount, 5000);
    return () => clearInterval(interval);
  }, []);

  // دالة حفظ الطلب المعلق
  const handleSaveHeldOrder = useCallback(async () => {
    if (cartItems.length === 0 && selectedServices.length === 0 && selectedSubscriptions.length === 0) {
      toast.error('السلة فارغة! لا يمكن حفظ طلب فارغ.');
      return;
    }

    const orderName = prompt('أدخل اسم الطلب:', `طلب ${new Date().toLocaleTimeString('ar-DZ')}`);
    if (!orderName) return;

    try {
      const heldOrder = saveHeldOrder({
        name: orderName,
        items: cartItems,
        services: selectedServices,
        subscriptions: selectedSubscriptions,
        customerId: activeTab?.customerId,
        customerName: activeTab?.customerName || customers.find(c => c.id === activeTab?.customerId)?.name,
        discount: (activeTab as any)?.discount,
        discountAmount: (activeTab as any)?.discountAmount,
        discountType: (activeTab as any)?.discountType,
        notes: '',
        employeeId: currentUser?.id,
        employeeName: currentUser?.name,
      });

      clearCart();
      setHeldOrdersCount(getHeldOrdersCount());
      toast.success(`✅ تم حفظ الطلب "${orderName}" بنجاح`);
    } catch (error) {
      toast.error('❌ فشل حفظ الطلب');
    }
  }, [cartItems, selectedServices, selectedSubscriptions, activeTab, customers, currentUser, clearCart]);

  // دالة استرجاع الطلب المعلق
  const handleRestoreHeldOrder = useCallback((order: HeldOrder) => {
    // مسح السلة الحالية
    clearCart();

    // استرجاع العناصر
    order.items.forEach(item => {
      if (item.colorId || item.sizeId) {
        addVariantToCart(
          item.product,
          item.colorId || '',
          item.sizeId || '',
          item.variantPrice || 0,
          item.colorName || '',
          item.colorCode || '',
          item.sizeName || '',
          item.variantImage || ''
        );
      } else {
        for (let i = 0; i < (item.quantity || 1); i++) {
          addItemToCart(item.product);
        }
      }
    });

    // استرجاع الخدمات
    order.services.forEach(service => {
      addService(service);
    });

    // استرجاع الاشتراكات
    order.subscriptions.forEach(subscription => {
      handleAddSubscription(subscription);
    });

    // استرجاع معلومات العميل والخصم
    if (order.customerId) {
      const customer = customers.find(c => c.id === order.customerId);
      if (customer) {
        assignCustomerToTab(activeTabId, customer);
      }
    }

    if (order.discount || order.discountAmount) {
      updateTab(activeTabId, {
        discount: order.discount,
        discountAmount: order.discountAmount,
        discountType: order.discountType,
      } as any);
    }

    setHeldOrdersCount(getHeldOrdersCount());
  }, [clearCart, addVariantToCart, addItemToCart, addService, handleAddSubscription, assignCustomerToTab, updateTab, activeTabId]);

  // دالة تبديل الشاشة الكاملة
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
        toast.success('🖥️ وضع الشاشة الكاملة مُفعّل');
      }).catch(() => {
        toast.error('❌ فشل تفعيل وضع الشاشة الكاملة');
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
        toast.info('🖥️ تم الخروج من وضع الشاشة الكاملة');
      });
    }
  }, []);

  // دالة مسح السلة مع التأكيد
  const handleClearCartWithConfirm = useCallback(async () => {
    if (cartItems.length === 0 && selectedServices.length === 0 && selectedSubscriptions.length === 0) {
      toast.info('السلة فارغة بالفعل');
      return;
    }

    const confirmed = await confirmDialog.confirm({
      title: 'مسح السلة',
      description: `هل أنت متأكد من مسح ${cartItems.length + selectedServices.length + selectedSubscriptions.length} عنصر من السلة؟`,
      confirmText: 'مسح',
      cancelText: 'إلغاء',
      type: 'warning',
    });

    if (confirmed) {
      clearCart();
      toast.success('✅ تم مسح السلة بنجاح');
    }
  }, [cartItems.length, selectedServices.length, selectedSubscriptions.length, clearCart, confirmDialog]);

  // دالة مسح سلة الإرجاع مع التأكيد
  const handleClearReturnCartWithConfirm = useCallback(async () => {
    if (returnItems.length === 0) {
      toast.info('سلة الإرجاع فارغة بالفعل');
      return;
    }

    const confirmed = await confirmDialog.confirm({
      title: 'مسح سلة الإرجاع',
      description: `هل أنت متأكد من مسح ${returnItems.length} عنصر من سلة الإرجاع؟`,
      confirmText: 'مسح',
      cancelText: 'إلغاء',
      type: 'warning',
    });

    if (confirmed) {
      clearReturnCart();
      toast.success('✅ تم مسح سلة الإرجاع بنجاح');
    }
  }, [returnItems.length, clearReturnCart, confirmDialog]);

  // إعداد اختصارات لوحة المفاتيح
  const keyboardShortcuts = useKeyboardShortcuts({
    enabled: true,
    preventDefault: true,
  });



  // دالة submitOrder مخصصة مع حفظ بيانات الطباعة
  const handleSubmitOrderWithPrint = useCallback(async (
    customerId?: string,
    notes?: string,
    discount?: number,
    discountType?: 'percentage' | 'fixed',
    amountPaid?: number,
    paymentMethod?: string,
    isPartialPayment?: boolean,
    considerRemainingAsPartial?: boolean
  ): Promise<void> => {
    try {
      // حساب المبالغ
      const cartSubtotal = cartItems.reduce((total, item) => {
        const price = (item as any).customPrice || item.variantPrice || item.product.price || 0;
        return total + (price * item.quantity);
      }, 0);

      const servicesTotal = selectedServices.reduce((total, service) => total + (service.price || 0), 0);
      const subscriptionsTotal = selectedSubscriptions.reduce((total, subscription) => {
        const price = subscription.price || subscription.selling_price || subscription.purchase_price || 0;
        return total + price;
      }, 0);

      const subtotal = cartSubtotal + servicesTotal + subscriptionsTotal;
      const finalTotal = subtotal;
      const paidAmount = amountPaid !== undefined ? amountPaid : finalTotal;
      const remainingAmount = Math.max(0, finalTotal - paidAmount);
      const isActualPartialPayment = paidAmount < finalTotal;

      // حفظ البيانات للطباعة
      savePrintData({
        items: [...cartItems],
        services: [
          ...selectedServices,
          ...selectedSubscriptions.map(subscription => ({
            id: subscription.id,
            name: subscription.name || 'اشتراك',
            description: subscription.description || '',
            price: subscription.price || subscription.selling_price || subscription.purchase_price || 0,
            duration: subscription.duration || '',
            public_tracking_code: subscription.tracking_code || subscription.public_tracking_code,
            isSubscription: true,
            subscriptionDetails: {
              duration: subscription.duration,
              selectedPricing: subscription.selectedPricing
            }
          }))
        ],
        subscriptions: [...selectedSubscriptions],
        subtotal,
        total: isActualPartialPayment && !considerRemainingAsPartial ? paidAmount : finalTotal,
        discount: isActualPartialPayment && !considerRemainingAsPartial ? remainingAmount : 0,
        discountAmount: 0,
        customerName: customers.find(c => c.id === customerId)?.name,
        orderNumber: `POS-${Date.now()}`,
        paidAmount,
        remainingAmount: isActualPartialPayment && considerRemainingAsPartial ? remainingAmount : 0,
        isPartial: isActualPartialPayment && considerRemainingAsPartial,
        considerRemaining: considerRemainingAsPartial || false
      });

      await handleSubmitOrder(
        customerId,
        notes,
        discount || 0,
        discountType || 'fixed',
        amountPaid,
        paymentMethod || 'cash',
        isPartialPayment || false,
        considerRemainingAsPartial || false
      );

      // فتح نافذة الطباعة
      setIsPrintDialogOpen(true);
      playSuccess();
    } catch (error) {
      playError();
      throw error;
    }
  }, [handleSubmitOrder, cartItems, selectedServices, selectedSubscriptions, customers, savePrintData, setIsPrintDialogOpen]);

  // دوال الدفع السريع للاختصارات
  const handleQuickCash = useCallback(() => {
    if (cartItems.length === 0 && selectedServices.length === 0 && selectedSubscriptions.length === 0) {
      toast.warning('السلة فارغة!');
      return;
    }
    handleSubmitOrderWithPrint(
      activeTab?.customerId,
      '', // notes
      (activeTab as any)?.discount,
      (activeTab as any)?.discountType,
      undefined, // amountPaid (full)
      'cash'
    );
  }, [cartItems, selectedServices, selectedSubscriptions, activeTab, handleSubmitOrderWithPrint]);

  const handleQuickCard = useCallback(() => {
    if (cartItems.length === 0 && selectedServices.length === 0 && selectedSubscriptions.length === 0) {
      toast.warning('السلة فارغة!');
      return;
    }
    handleSubmitOrderWithPrint(
      activeTab?.customerId,
      '', // notes
      (activeTab as any)?.discount,
      (activeTab as any)?.discountType,
      undefined, // amountPaid (full)
      'card'
    );
  }, [cartItems, selectedServices, selectedSubscriptions, activeTab, handleSubmitOrderWithPrint]);

  // إعداد الاختصارات بعد تهيئة keyboardShortcuts
  React.useEffect(() => {
    const posShortcuts = createPOSShortcuts({
      onHelp: () => keyboardShortcuts.showShortcutsHelp(),
      onSearch: () => searchInputRef.current?.focus(),
      onClearSearch: () => handleSearchChange(''),
      onFocusBarcode: () => barcodeInputRef.current?.focus(),
      onRefresh: refreshData,
      onToggleCart: () => setIsMobileCartOpen(prev => !prev),
      onToggleReturnMode: toggleReturnMode,
      onOpenSettings: () => setIsPOSSettingsOpen(true),
      onOpenCalculator: () => setIsCalculatorOpen(true),
      onCheckout: () => {
        if (cartItems.length > 0 || selectedServices.length > 0 || selectedSubscriptions.length > 0) {
          toast.info('اضغط على زر "إتمام الطلب" في السلة');
        } else {
          toast.warning('السلة فارغة!');
        }
      },
      onQuickCash: handleQuickCash,
      onQuickCard: handleQuickCard,
      onAddDiscount: () => toast.info('استخدم واجهة السلة لإضافة خصم'),
      onAddCustomer: () => toast.info('استخدم واجهة السلة لاختيار عميل'),
      onNewTab: addTab,
      onCloseTab: () => {
        if (tabs.length > 1) {
          removeTab(activeTabId);
        } else {
          toast.info('لا يمكن إغلاق التبويب الوحيد');
        }
      },
      onNextTab: () => {
        const currentIndex = tabs.findIndex(t => t.id === activeTabId);
        const nextIndex = (currentIndex + 1) % tabs.length;
        setActiveTabId(tabs[nextIndex].id);
      },
      onPrevTab: () => {
        const currentIndex = tabs.findIndex(t => t.id === activeTabId);
        const prevIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
        setActiveTabId(tabs[prevIndex].id);
      },
      onSaveOrder: handleSaveHeldOrder,
      onPrint: async () => {
        if (isPrintDialogOpen) {
          // ⚡ استخدام نظام الطباعة الموحد
          if (isElectronPrint) {
            try {
              const printContent = document.querySelector('[data-print-receipt]');
              if (printContent) {
                await printHtml(`
                  <!DOCTYPE html>
                  <html dir="rtl" lang="ar">
                    <head>
                      <meta charset="UTF-8">
                      <title>إيصال</title>
                      <style>* { box-sizing: border-box; } body { font-family: 'Tajawal', sans-serif; direction: rtl; }</style>
                    </head>
                    <body>${printContent.innerHTML}</body>
                  </html>
                `, { silent: true });
                return;
              }
            } catch (err) {
              console.warn('[POSAdvanced] فشلت الطباعة المباشرة:', err);
            }
          }
          // Fallback
          window.print();
        } else {
          toast.info('لا توجد فاتورة للطباعة');
        }
      },
      onCancel: () => {
        setIsVariantDialogOpen(false);
        setIsPOSSettingsOpen(false);
        setIsCalculatorOpen(false);
        setIsQuickExpenseOpen(false);
        setIsHoldOrdersOpen(false);
        setIsCameraScannerOpen(false);
      },
      onToggleFullscreen: toggleFullscreen,
    });

    keyboardShortcuts.setShortcuts(posShortcuts);
  }, [
    handleQuickCash,
    handleQuickCard,
    refreshData,
    toggleReturnMode,
    addTab,
    removeTab,
    activeTabId,
    tabs,
    handleSaveHeldOrder,
    isPrintDialogOpen,
    toggleFullscreen,
    keyboardShortcuts,
    handleSearchChange
  ]);

  // Force update shortcuts on mount to ensure they are registered
  React.useEffect(() => {
    // console.log('Shortcuts initialized');
  }, []);

  const cartSummary = useMemo(() => {
    const productItemsCount = cartItems.reduce((total, item) => total + (item.quantity || 0), 0);
    const extraItemsCount = selectedServices.length + selectedSubscriptions.length;
    const itemsTotal = productItemsCount + extraItemsCount;

    // ⚡ حساب إجمالي المنتجات الحالي (مع التعديلات + دعم الجملة)
    const productsTotal = cartItems.reduce((total, item) => {
      const sellingUnit = (item as any).sellingUnit;
      // نتحقق هل يوجد سعر مخصص (تم تعديله)
      const hasCustomPrice = (item as any).customPrice !== undefined || item.variantPrice !== undefined;
      const customPrice = (item as any).customPrice ?? item.variantPrice ?? 0;

      switch (sellingUnit) {
        case 'weight': {
          const unitPrice = hasCustomPrice ? customPrice : (item.product?.price_per_weight_unit || item.product?.price || 0);
          return total + ((item as any).weight || 0) * unitPrice;
        }
        case 'box': {
          const unitPrice = hasCustomPrice ? customPrice : (item.product?.box_price || item.product?.price || 0);
          return total + ((item as any).boxCount || 0) * unitPrice;
        }
        case 'meter': {
          const unitPrice = hasCustomPrice ? customPrice : (item.product?.price_per_meter || item.product?.price || 0);
          return total + ((item as any).length || 0) * unitPrice;
        }
        default: {
          // ✅ استخدام نظام الجملة (wholesale_tiers) للقطع
          if (hasCustomPrice) {
            return total + customPrice * (item.quantity || 0);
          }

          const quantity = item.quantity || 0;
          const itemSaleType = (item as any).saleType;

          // ⚠️ إذا اختار المستخدم "تجزئة" صراحةً، نستخدم سعر التجزئة
          if (itemSaleType === 'retail') {
            const unitPrice = item.product?.price || 0;
            return total + unitPrice * quantity;
          }

          // التحقق من وجود مستويات أسعار الجملة
          const wholesaleTiers = item.product?.wholesale_tiers;

          if (wholesaleTiers && Array.isArray(wholesaleTiers) && wholesaleTiers.length > 0) {
            // البحث عن أدنى مستوى
            const lowestTier = wholesaleTiers.reduce((min: any, t: any) =>
              (!min || t.min_quantity < min.min_quantity) ? t : min, null);

            // تطبيق الجملة فقط إذا: saleType = wholesale أو (لم يُحدد saleType والكمية كافية)
            if (itemSaleType === 'wholesale' || (!itemSaleType && lowestTier && quantity >= lowestTier.min_quantity)) {
              // البحث عن المستوى المناسب للكمية
              const sortedTiers = [...wholesaleTiers].sort((a: any, b: any) => b.min_quantity - a.min_quantity);
              const applicableTier = sortedTiers.find((t: any) => quantity >= t.min_quantity);
              if (applicableTier) {
                const wholesalePrice = applicableTier.price_per_unit || applicableTier.price;
                return total + wholesalePrice * quantity;
              }
            }
          }

          // السعر العادي (تجزئة)
          const unitPrice = item.product?.price || 0;
          return total + unitPrice * quantity;
        }
      }
    }, 0);

    // ⚡ حساب السعر الأصلي (بدون تعديلات يدوية - لكن مع الجملة)
    // ملاحظة: أسعار الجملة تُعتبر أسعار أصلية وليست تخفيضات يدوية
    const originalProductsTotal = cartItems.reduce((total, item) => {
      const sellingUnit = (item as any).sellingUnit;
      const quantity = item.quantity || 1;

      // نستخدم السعر الأصلي من المنتج حسب نوع البيع
      switch (sellingUnit) {
        case 'weight':
          return total + ((item as any).weight || 0) * (item.product?.price_per_weight_unit || item.product?.price || 0);
        case 'box':
          return total + ((item as any).boxCount || 0) * (item.product?.box_price || item.product?.price || 0);
        case 'meter':
          return total + ((item as any).length || 0) * (item.product?.price_per_meter || item.product?.price || 0);
        default: {
          // ✅ استخدام نفس منطق الجملة - أسعار الجملة هي أسعار أصلية
          const itemSaleType = (item as any).saleType;

          // ⚠️ إذا اختار المستخدم "تجزئة" صراحةً، نستخدم سعر التجزئة
          if (itemSaleType === 'retail') {
            return total + (item.product?.price || 0) * quantity;
          }

          const wholesaleTiers = item.product?.wholesale_tiers;

          if (wholesaleTiers && Array.isArray(wholesaleTiers) && wholesaleTiers.length > 0) {
            const lowestTier = wholesaleTiers.reduce((min: any, t: any) =>
              (!min || t.min_quantity < min.min_quantity) ? t : min, null);

            // تطبيق الجملة فقط إذا: saleType = wholesale أو (لم يُحدد saleType والكمية كافية)
            if (itemSaleType === 'wholesale' || (!itemSaleType && lowestTier && quantity >= lowestTier.min_quantity)) {
              const sortedTiers = [...wholesaleTiers].sort((a: any, b: any) => b.min_quantity - a.min_quantity);
              const applicableTier = sortedTiers.find((t: any) => quantity >= t.min_quantity);
              if (applicableTier) {
                const wholesalePrice = applicableTier.price_per_unit || applicableTier.price;
                return total + wholesalePrice * quantity;
              }
            }
          }

          return total + (item.product?.price || 0) * quantity;
        }
      }
    }, 0);

    const servicesTotal = selectedServices.reduce((total, service) => total + (service?.price || 0), 0);
    const subscriptionsTotal = selectedSubscriptions.reduce((total, subscription) => {
      return total + (subscription?.price || subscription?.selling_price || subscription?.purchase_price || 0);
    }, 0);

    return {
      itemCount: itemsTotal,
      total: productsTotal + servicesTotal + subscriptionsTotal,
      originalTotal: originalProductsTotal + servicesTotal + subscriptionsTotal
    };
  }, [cartItems, selectedServices, selectedSubscriptions, calculateItemTotal]);

  const returnSummary = useMemo(() => {
    const itemCount = returnItems.reduce((total, item) => total + (item.quantity || 0), 0);
    const total = returnItems.reduce((sum, item) => {
      const price = (item as any).customPrice ?? item.variantPrice ?? item.product?.price ?? 0;
      return sum + price * (item.quantity || 0);
    }, 0);

    return { itemCount, total };
  }, [returnItems]);

  useEffect(() => {
    if (!isCompactLayout) {
      previousMobileCartCountRef.current = 0;
      return;
    }

    previousMobileCartCountRef.current = cartSummary.itemCount;
  }, [cartSummary.itemCount, isCompactLayout]);

  const handleBarcodeLookup = useCallback(async (barcode: string, source: 'manual' | 'camera' = 'manual') => {
    const formattedBarcode = (barcode || '').trim();

    if (!formattedBarcode) {
      toast.error('⚠️ الرجاء إدخال باركود صالح');
      return;
    }

    if (source === 'camera') {
      if (cameraProcessingRef.current) {
        return;
      }
      cameraProcessingRef.current = true;
      setIsCameraBusy(true);
    }

    const toastId = `${source}-scan-${formattedBarcode}`;
    toast.loading(source === 'camera' ? `📷 جاري قراءة ${formattedBarcode}` : `🔍 جاري البحث عن ${formattedBarcode}`, {
      id: toastId,
      duration: 4000
    });

    try {
      const response = await scanBarcode(formattedBarcode);

      if (response?.success && response.data) {
        const scannedProduct: any = response.data;
        const cachedProduct = getProductById(scannedProduct.id);
        const fullProduct = cachedProduct || scannedProduct;

        if (!fullProduct) {
          toast.error('❌ لم يتم العثور على بيانات هذا المنتج', { id: toastId, duration: 3000 });
          return;
        }

        // ⚡ وضع الخسائر
        if (isLossMode) {
          if (fullProduct.has_variants && fullProduct.colors && fullProduct.colors.length > 0) {
            handleProductWithVariants(fullProduct);
            toast.dismiss(toastId);
          } else {
            addItemToLossCart(fullProduct);
            playClick();
            toast.success(`✅ تم إضافة "${fullProduct.name || 'منتج'}" إلى سلة الخسائر`, { id: toastId, duration: 2000 });
          }
        } else if (isReturnMode) {
          addItemToReturnCart(fullProduct);
          toast.success(`✅ تم إضافة "${fullProduct.name || 'منتج'}" إلى سلة الإرجاع`, { id: toastId, duration: 2000 });
        } else if (fullProduct.has_variants && fullProduct.colors && fullProduct.colors.length > 0) {
          handleProductWithVariants(fullProduct);
          toast.dismiss(toastId);
        } else {
          addItemToCart(fullProduct);
          playAddToCart();
          toast.success(`✅ تم إضافة "${fullProduct.name || 'منتج'}" إلى السلة`, { id: toastId, duration: 2000 });
        }

        if (source === 'camera') {
          setIsCameraScannerOpen(false);
        }
      } else {
        const message = response?.message || 'لم يتم العثور على المنتج لهذا الباركود';
        toast.error(`❌ ${message}`, { id: toastId, duration: 3000 });
        playError();
      }
    } catch (error) {
      toast.error(`💥 تعذر معالجة الباركود: ${formattedBarcode}`, { id: toastId, duration: 3000 });
      playError();
    } finally {
      if (source === 'camera') {
        cameraProcessingRef.current = false;
        setIsCameraBusy(false);
      }
    }
  }, [scanBarcode, getProductById, isReturnMode, isLossMode, addItemToReturnCart, addItemToLossCart, handleProductWithVariants, addItemToCart, playClick, playAddToCart, playError]);

  // ⚡ ملخص سلة الخسائر
  const lossSummary = useMemo(() => ({
    itemCount: lossItems.length,
    total: lossTotals.totalCostValue
  }), [lossItems.length, lossTotals.totalCostValue]);

  // ملخص السلة النشطة
  const activeCartSummary = isLossMode ? lossSummary : (isReturnMode ? returnSummary : cartSummary);
  const cartSummaryLabel = isLossMode ? 'سلة الخسائر' : (isReturnMode ? 'سلة الإرجاع' : 'السلة');
  const cartSummarySubLabel = activeCartSummary.itemCount > 0
    ? `${activeCartSummary.itemCount} عنصر • ${formatCurrency(activeCartSummary.total || 0)}`
    : 'لا توجد عناصر بعد';

  // ⚡ متغيرات TitaniumCart
  const currentPOSMode: POSMode = isLossMode ? 'loss' : (isReturnMode ? 'return' : 'sale');
  const currentCartItems = isLossMode ? lossItems : (isReturnMode ? returnItems : cartItems);

  // ⚡ دوال TitaniumCart
  const handleTitaniumUpdateQuantity = useCallback((index: number, value: number) => {
    // الحصول على العنصر الحالي لمعرفة نوع الوحدة
    const items = isLossMode ? lossItems : (isReturnMode ? returnItems : cartItems);
    const item = items[index];
    const sellingUnit = item?.sellingUnit;

    if (isLossMode) {
      // تحديث حسب نوع الوحدة
      if (sellingUnit === 'weight') {
        updateLossItem(index, { weight: value });
      } else if (sellingUnit === 'box') {
        updateLossItem(index, { boxCount: value });
      } else if (sellingUnit === 'meter') {
        updateLossItem(index, { length: value });
      } else {
        updateLossItem(index, { quantity: value });
      }
    } else if (isReturnMode) {
      if (sellingUnit === 'weight') {
        updateReturnItemWeight?.(index, value, item?.weightUnit || 'kg');
      } else if (sellingUnit === 'box') {
        updateReturnItemBoxCount?.(index, value);
      } else if (sellingUnit === 'meter') {
        updateReturnItemLength?.(index, value);
      } else {
        updateReturnItemQuantity(index, value);
      }
    } else {
      if (sellingUnit === 'weight') {
        updateItemWeight?.(index, value, item?.weightUnit || 'kg');
      } else if (sellingUnit === 'box') {
        updateItemBoxCount?.(index, value);
      } else if (sellingUnit === 'meter') {
        updateItemLength?.(index, value);
      } else {
        updateItemQuantity(index, value);
      }
    }
  }, [isLossMode, isReturnMode, lossItems, returnItems, cartItems, updateLossItem, updateReturnItemQuantity, updateItemQuantity, updateReturnItemWeight, updateReturnItemBoxCount, updateReturnItemLength, updateItemWeight, updateItemBoxCount, updateItemLength]);

  const handleTitaniumUpdatePrice = useCallback((index: number, price: number) => {
    if (isLossMode) {
      // الخسائر لا تدعم تعديل السعر مباشرة
      return;
    } else if (isReturnMode) {
      updateReturnItemPrice(index, price);
    } else {
      updateItemPrice(index, price);
    }
  }, [isLossMode, isReturnMode, updateReturnItemPrice, updateItemPrice]);

  const handleTitaniumEditItem = useCallback((index: number) => {
    // فتح نافذة تعديل البيانات المتقدمة
    setEditingItemIndex(index);
    setIsAdvancedEditOpen(true);
  }, []);

  // دالة حفظ التعديلات المتقدمة
  const handleAdvancedEditSave = useCallback((index: number, updates: any) => {
    if (isLossMode) {
      updateLossItem(index, updates);
    } else if (isReturnMode) {
      // تحديث عنصر الإرجاع
      if (updates.quantity !== undefined) updateReturnItemQuantity(index, updates.quantity);
      if (updates.customPrice !== undefined) updateReturnItemPrice(index, updates.customPrice);
      if (updates.weight !== undefined) updateReturnItemWeight?.(index, updates.weight, updates.weightUnit);
      if (updates.boxCount !== undefined) updateReturnItemBoxCount?.(index, updates.boxCount);
      if (updates.length !== undefined) updateReturnItemLength?.(index, updates.length);
      if (updates.sellingUnit !== undefined) updateReturnItemSellingUnit?.(index, updates.sellingUnit);
    } else {
      // تحديث عنصر السلة العادية
      if (updates.quantity !== undefined) updateItemQuantity(index, updates.quantity);
      if (updates.customPrice !== undefined) updateItemPrice(index, updates.customPrice);
      if (updates.weight !== undefined) updateItemWeight?.(index, updates.weight, updates.weightUnit);
      if (updates.boxCount !== undefined) updateItemBoxCount?.(index, updates.boxCount);
      if (updates.length !== undefined) updateItemLength?.(index, updates.length);
      if (updates.sellingUnit !== undefined) updateItemSellingUnit?.(index, updates.sellingUnit);
      // ✅ تحديث نوع البيع (جملة/تجزئة)
      if (updates.saleType !== undefined) updateItemSaleType?.(index, updates.saleType);
    }
    toast.success('✅ تم حفظ التعديلات بنجاح');
  }, [
    isLossMode, isReturnMode, updateLossItem,
    updateReturnItemQuantity, updateReturnItemPrice, updateReturnItemWeight,
    updateReturnItemBoxCount, updateReturnItemLength, updateReturnItemSellingUnit,
    updateItemQuantity, updateItemPrice, updateItemWeight,
    updateItemBoxCount, updateItemLength, updateItemSellingUnit, updateItemSaleType
  ]);

  const handleTitaniumRemoveItem = useCallback((index: number) => {
    if (isLossMode) {
      removeLossItem(index);
    } else if (isReturnMode) {
      removeReturnItem(index);
    } else {
      removeItemFromCart(index);
    }
  }, [isLossMode, isReturnMode, removeLossItem, removeReturnItem, removeItemFromCart]);

  // ⚡ تعليق الطلب الحالي - إنشاء تبويب جديد والانتقال إليه
  const handleHoldCart = useCallback(() => {
    if (cartItems.length === 0) {
      toast.error('السلة فارغة');
      return;
    }
    // إضافة تبويب جديد فارغ والانتقال إليه
    addTab();
    toast.success('✅ تم تعليق الطلب بنجاح');
  }, [cartItems.length, addTab]);

  // ⚡ عرض الطلبات المعلقة
  const handleViewHeldOrders = useCallback(() => {
    setIsHoldOrdersOpen(true);
  }, []);

  // ⚡ حساب عدد الطلبات المعلقة (التبويبات التي فيها منتجات ما عدا التبويب الحالي)
  const heldOrdersCountMemo = useMemo(() => {
    return tabs.filter(tab =>
      tab.id !== activeTabId &&
      (tab.cartItems?.length > 0 || tab.selectedServices?.length > 0 || tab.selectedSubscriptions?.length > 0)
    ).length;
  }, [tabs, activeTabId]);

  // تحديث العداد
  useEffect(() => {
    setHeldOrdersCount(heldOrdersCountMemo);
  }, [heldOrdersCountMemo]);

  const handleTitaniumClearCart = useCallback(() => {
    if (isLossMode) {
      clearLossCart();
    } else if (isReturnMode) {
      clearReturnCart();
    } else {
      clearCart();
    }
  }, [isLossMode, isReturnMode, clearLossCart, clearReturnCart, clearCart]);

  // البيع العادي - يفتح نافذة التفاصيل
  const handleTitaniumCheckout = useCallback(() => {
    if (isLossMode) {
      submitLoss();
    } else if (isReturnMode) {
      handleProcessReturn({});
    } else {
      // فتح نافذة الدفع مباشرة
      setIsPaymentDialogOpen(true);
    }
  }, [isLossMode, isReturnMode, submitLoss, handleProcessReturn]);

  // البيع السريع - تسجيل مباشر بدون نافذة
  const handleTitaniumQuickCheckout = useCallback(() => {
    if (!isLossMode && !isReturnMode) {
      handleSubmitOrderWithPrint();
    }
  }, [isLossMode, isReturnMode, handleSubmitOrderWithPrint]);

  // فتح نافذة العميل
  const handleOpenCustomerDialog = useCallback(() => {
    setIsCustomerDialogOpen(true);
  }, []);

  // اختيار العميل
  const handleSelectCustomer = useCallback((customerId: string | undefined, customerName: string | undefined) => {
    if (activeTabId) {
      assignCustomerToTab(activeTabId, customerId, customerName);
    }
  }, [activeTabId, assignCustomerToTab]);

  // تغيير نوع البيع
  const handleChangeSaleMode = useCallback((mode: SaleMode) => {
    setSaleMode(mode);
  }, []);

  // تغيير الخصم
  const handleChangeDiscount = useCallback((value: number, type: 'percentage' | 'fixed') => {
    setDiscountValue(value);
    setDiscountType(type);
    // تحديث التبويب بالخصم
    if (activeTabId) {
      updateTab(activeTabId, { discount: value, discountType: type });
    }
  }, [activeTabId, updateTab]);

  // معالجة الدفع من نافذة الدفع
  const handlePaymentComplete = useCallback((data: {
    customerId?: string;
    notes?: string;
    discount: number;
    discountType: 'percentage' | 'fixed';
    amountPaid: number;
    paymentMethod: string;
    isPartialPayment: boolean;
    considerRemainingAsPartial: boolean;
  }) => {
    setIsPaymentDialogOpen(false);
    handleSubmitOrderWithPrint(
      data.customerId,
      data.notes,
      data.discount,
      data.discountType,
      data.amountPaid,
      data.paymentMethod,
      data.isPartialPayment,
      data.considerRemainingAsPartial
    );
  }, [handleSubmitOrderWithPrint]);

  // تشخيص للتطوير
  if (process.env.NODE_ENV === 'development') {
  }

  // معالجة حالة التحميل الأولي - مع timeout لمنع الانتظار للأبد
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  useEffect(() => {
    if (isLoading && !allProducts?.length) {
      // ⚡ بعد 10 ثواني، اعرض المحتوى حتى لو كان فارغاً
      const timeout = setTimeout(() => {
        console.warn('[POSAdvanced] ⚠️ Loading timeout - showing content anyway');
        setLoadingTimeout(true);
      }, 10000);
      
      return () => clearTimeout(timeout);
    } else {
      setLoadingTimeout(false);
    }
  }, [isLoading, allProducts?.length]);

  // ⚡ إذا انتهى timeout التحميل، اعرض المحتوى حتى لو كان فارغاً
  // ⚠️ مهم: لا نعرض شاشة التحميل إذا كان لدينا منتجات بالفعل (لتجنب re-mount)
  const hasExistingProducts = products?.length > 0 || allProducts?.length > 0;
  if (isLoading && !hasExistingProducts && !loadingTimeout) {
    return (
      <POSPureLayout
        onRefresh={refreshData}
        isRefreshing={true}
        connectionStatus="reconnecting"
      >
        <POSAdvancedInitialLoading />
      </POSPureLayout>
    );
  }

  // معالجة حالة الخطأ (فقط إذا كان هناك خطأ حقيقي وليس مجرد تحميل)
  if (error && !isLoading && !allProducts?.length) {
    return (
      <POSPureLayout
        onRefresh={refreshData}
        isRefreshing={isRefetching}
        executionTime={executionTime}
        connectionStatus="reconnecting"
      >
        <POSAdvancedLoadingSkeleton />
      </POSPureLayout>
    );
  }

  return (
    <POSPureLayout
      onRefresh={refreshData}
      isRefreshing={isRefetching}
      executionTime={executionTime}
      connectionStatus="connected"
      disableScroll={false}
    >
      {/* مؤشر السكانر العالمي */}
      <POSAdvancedGlobalScanner
        products={allProducts || products}
        isReturnMode={isReturnMode}
        isScannerLoading={isScannerLoading}
        scanBarcode={async (barcode: string) => {
          const response = await scanBarcode(barcode);
          return {
            success: response.success,
            data: response.data as any
          };
        }}
        addItemToCart={addItemToCart}
        addItemToReturnCart={addItemToReturnCart}
        handleProductWithVariants={handleProductWithVariants}
        getProductById={getProductById}
      />

      {/* تخطيط POS محسن - السلة يسار والمحتوى يمين */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-2 h-full w-full p-2 overflow-hidden">

        {/* ═══ المحتوى الرئيسي - العمود الأول ═══ */}
        <div className="flex flex-col h-full overflow-hidden min-w-0 order-1" dir="rtl">

          {/* الهيدر - ثابت في الأعلى */}
          <div className="flex-shrink-0 bg-background pb-2 pt-2 px-2">
          {useInfinityDesign ? (
            // ⚡ التصميم الجديد - Infinity Space
            <div className="relative">
              <InfinityHeader
                isReturnMode={isReturnMode}
                isLossMode={isLossMode}
                toggleReturnMode={toggleReturnMode}
                toggleLossMode={toggleLossMode}
                searchQuery={searchQuery}
                onSearchChange={handleSearchChange}
                onBarcodeSearch={(value) => handleBarcodeLookup(value, 'manual')}
                isScannerLoading={isScannerLoading}
                selectedCategory={categoryFilter}
                categories={productCategories.map(cat => ({
                  id: cat.id,
                  name: cat.name,
                  productsCount: products?.filter(p => p.category_id === cat.id).length || 0
                }))}
                onCategoryChange={handleCategoryFilter}
                cartItemsCount={cartSummary.itemCount}
                cartTotal={cartSummary.total}
                returnItemsCount={returnItems.length}
                lossItemsCount={lossItems.length}
                onOpenCalculator={() => setIsCalculatorOpen(true)}
                onOpenExpense={() => setIsQuickExpenseOpen(true)}
                onOpenSettings={() => setIsPOSSettingsOpen(true)}
                onRefreshData={refreshData}
                isMobile={isCompactLayout}
              />

              {/* ⚡ مؤشر العمليات المعلقة */}
              {hasPendingOperations && (
                <div
                  className={`absolute top-2 left-2 flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-sm cursor-pointer transition-all ${
                    pendingStatus === 'critical' ? 'bg-red-500 animate-pulse' :
                    pendingStatus === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}
                  onClick={() => refreshPendingStats()}
                  title={`${pendingStats.pending} معلق، ${pendingStats.failed} فاشل - انقر للتحديث`}
                >
                  <span>{pendingStatus === 'critical' ? '🚨' : pendingStatus === 'warning' ? '⚠️' : '📡'}</span>
                  <span>{pendingStats.total}</span>
                </div>
              )}
            </div>
          ) : (
            // التصميم القديم
            <div className="flex items-center justify-between gap-2">
              <POSAdvancedHeader
                isReturnMode={isReturnMode}
                returnItemsCount={returnItems.length}
                toggleReturnMode={toggleReturnMode}
                onCalculatorOpen={() => setIsCalculatorOpen(true)}
                onSettingsOpen={() => setIsPOSSettingsOpen(true)}
                onRepairOpen={() => setIsRepairDialogOpen(true)}
                onQuickExpenseOpen={() => setIsQuickExpenseOpen(true)}
                isRepairEnabled={true}
                isLossMode={isLossMode}
                lossItemsCount={lossItems.length}
                toggleLossMode={toggleLossMode}
              />

              {/* ⚡ مؤشر العمليات المعلقة */}
              {hasPendingOperations && (
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-sm cursor-pointer transition-all ${
                    pendingStatus === 'critical' ? 'bg-red-500 animate-pulse' :
                    pendingStatus === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}
                  onClick={() => refreshPendingStats()}
                  title={`${pendingStats.pending} معلق، ${pendingStats.failed} فاشل - انقر للتحديث`}
                >
                  <span>{pendingStatus === 'critical' ? '🚨' : pendingStatus === 'warning' ? '⚠️' : '📡'}</span>
                  <span>{pendingStats.total}</span>
                </div>
              )}
            </div>
          )}
          </div>

          {/* المحتوى الأساسي - يأخذ المساحة المتبقية */}
          <div className="flex-1 overflow-hidden">
            <Suspense fallback={<Skeleton className="h-full w-full" />}>
              <POSAdvancedContent
                products={products}
                pagination={{
                  current_page: pagination?.current_page || currentPage,
                  total_pages: pagination?.total_pages || Math.ceil((pagination?.total_count || filteredProducts.length) / (pagination?.per_page || pageSize)),
                  per_page: pagination?.per_page || pageSize,
                  total_count: pagination?.total_count || filteredProducts.length,
                  has_next_page: Boolean(pagination?.has_next_page ?? (currentPage < Math.ceil((pagination?.total_count || filteredProducts.length) / (pagination?.per_page || pageSize)))),
                  has_prev_page: Boolean(pagination?.has_prev_page ?? (currentPage > 1))
                }}
                subscriptionServices={subscriptions}
                subscriptionCategories={subscriptionCategories}
                productCategories={productCategories}
                favoriteProducts={favoriteProducts}
                isReturnMode={isReturnMode}
                isLossMode={isLossMode}
                isPOSDataLoading={isRefetching}
                onAddToCart={handleProductWithVariants}
                onAddSubscription={handleAddSubscription}
                onRefreshData={refreshData}
                isAppEnabled={isAppEnabled}
                onPageChange={handlePageChange}
                onSearchChange={handleSearchChange}
                onCategoryFilter={handleCategoryFilter}
                onPageSizeChange={handlePageSizeChange}
                searchQuery={searchQuery}
                categoryFilter={categoryFilter}
                onBarcodeSearch={(value) => handleBarcodeLookup(value, 'manual')}
                isScannerLoading={isScannerLoading}
                onOpenMobileScanner={() => setIsCameraScannerOpen(true)}
                isCameraScannerSupported={isCameraScannerSupported}
                hasNativeBarcodeDetector={hasNativeBarcodeDetector}
                isMobile={isCompactLayout}
                hideInternalHeader={useInfinityDesign}
              />
            </Suspense>
          </div>

        </div>
        {/* ═══ نهاية المحتوى الرئيسي ═══ */}

        {/* ═══ السلة الجديدة - Desktop فقط ═══ */}
        <aside className="hidden lg:flex flex-col h-full order-2">
          <div className="h-full w-full overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-lg">
            <TitaniumCart
              mode={currentPOSMode}
              items={currentCartItems}
              onUpdateQuantity={handleTitaniumUpdateQuantity}
              onRemoveItem={handleTitaniumRemoveItem}
              onClearCart={handleTitaniumClearCart}
              onCheckout={handleTitaniumCheckout}
              onQuickCheckout={handleTitaniumQuickCheckout}
              onUpdatePrice={handleTitaniumUpdatePrice}
              onEditItem={handleTitaniumEditItem}
              customerName={activeTab?.customerName}
              onSelectCustomer={handleOpenCustomerDialog}
              isSubmitting={isSubmittingOrder || isSubmittingLoss}
              subtotal={activeCartSummary.total}
              discount={discountValue}
              total={activeCartSummary.total}
              saleMode={saleMode}
              onHoldCart={handleHoldCart}
              tabs={tabs}
              activeTabId={activeTabId}
              onSwitchTab={setActiveTabId}
              onRemoveTab={removeTab}
              lossDescription={lossDescription}
              onLossDescriptionChange={setLossDescription}
            />
          </div>
        </aside>

      </div>

      {/* سلة الموبايل - تظهر فقط على الشاشات الصغيرة */}
      {isCompactLayout && typeof document !== 'undefined' && createPortal(
        (
          <div
            className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
          >
            <div className="flex items-end gap-2">
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="h-14 w-14 rounded-2xl border-border/50 text-primary"
                onClick={() => setIsCameraScannerOpen(true)}
                disabled={!isCameraScannerSupported && !hasNativeBarcodeDetector}
              >
                <Camera className="h-6 w-6" />
              </Button>
              <Sheet open={isMobileCartOpen} onOpenChange={setIsMobileCartOpen}>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    className="flex-1 flex items-center justify-between gap-3 rounded-2xl border border-border/40 bg-card px-4 py-3 shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        isLossMode ? 'bg-amber-500/10 text-amber-600' :
                        isReturnMode ? 'bg-primary/10 text-primary' :
                        'bg-primary/10 text-primary'
                      }`}>
                        {isLossMode ? (
                          <AlertTriangle className="h-5 w-5" />
                        ) : isReturnMode ? (
                          <RotateCcw className="h-5 w-5" />
                        ) : (
                          <ShoppingCart className="h-5 w-5" />
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">{cartSummaryLabel}</p>
                        <p className="text-xs text-muted-foreground">{cartSummarySubLabel}</p>
                      </div>
                    </div>
                    <ChevronUp
                      className={`h-5 w-5 text-muted-foreground transition-transform ${isMobileCartOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                </SheetTrigger>
                <SheetContent
                  side="bottom"
                  className="h-[82vh] max-h-[90vh] w-full overflow-hidden border-t border-border/40 bg-card p-0"
                  dir="rtl"
                >
                  <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 bg-card/80 backdrop-blur-sm">
                    <div>
                      <p className="text-base font-semibold text-foreground">{cartSummaryLabel}</p>
                      <p className="text-xs text-muted-foreground">{cartSummarySubLabel}</p>
                    </div>
                    <SheetClose asChild>
                      <button
                        type="button"
                        className="rounded-lg border border-border/60 px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-muted"
                      >
                        إغلاق
                      </button>
                    </SheetClose>
                  </div>
                  <div className="h-[calc(100%-64px)] overflow-hidden">
                    <Suspense fallback={<Skeleton className="h-full w-full rounded-lg" />}>
                      {/* ⚡ السلة الجديدة للموبايل - TitaniumCart */}
                      <TitaniumCart
                        mode={currentPOSMode}
                        items={currentCartItems}
                        onUpdateQuantity={handleTitaniumUpdateQuantity}
                        onRemoveItem={handleTitaniumRemoveItem}
                        onClearCart={handleTitaniumClearCart}
                        onCheckout={handleTitaniumCheckout}
                        onQuickCheckout={handleTitaniumQuickCheckout}
                        onUpdatePrice={handleTitaniumUpdatePrice}
                        onEditItem={handleTitaniumEditItem}
                        customerName={activeTab?.customerName}
                        onSelectCustomer={handleOpenCustomerDialog}
                        isSubmitting={isSubmittingOrder || isSubmittingLoss}
                        subtotal={activeCartSummary.total}
                        discount={discountValue}
                        total={activeCartSummary.total}
                        saleMode={saleMode}
                        lossDescription={lossDescription}
                        onLossDescriptionChange={setLossDescription}
                      />
                    </Suspense>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        ),
        document.body
      )}


      {/* النوافذ الحوارية */}
      <POSAdvancedDialogs
        // حالة النوافذ الحوارية
        isVariantDialogOpen={isVariantDialogOpen}
        isPOSSettingsOpen={isPOSSettingsOpen}
        isRepairDialogOpen={isRepairDialogOpen}
        isRepairPrintDialogOpen={isRepairPrintDialogOpen}
        isPrintDialogOpen={isPrintDialogOpen}
        isCalculatorOpen={isCalculatorOpen}
        isQuickExpenseOpen={isQuickExpenseOpen}

        // دوال إدارة النوافذ الحوارية
        setIsVariantDialogOpen={setIsVariantDialogOpen}
        setIsPOSSettingsOpen={setIsPOSSettingsOpen}
        setIsRepairDialogOpen={setIsRepairDialogOpen}
        setIsRepairPrintDialogOpen={setIsRepairPrintDialogOpen}
        setIsPrintDialogOpen={setIsPrintDialogOpen}
        setIsCalculatorOpen={setIsCalculatorOpen}
        setIsQuickExpenseOpen={setIsQuickExpenseOpen}

        // بيانات النوافذ الحوارية
        selectedProductForVariant={selectedProductForVariant}
        setSelectedProductForVariant={setSelectedProductForVariant}
        selectedRepairOrder={selectedRepairOrder}
        setSelectedRepairOrder={setSelectedRepairOrder}
        repairQueuePosition={repairQueuePosition}
        setRepairQueuePosition={setRepairQueuePosition}

        // بيانات الطباعة
        completedItems={completedItems}
        completedServices={completedServices}
        completedSubscriptions={completedSubscriptions}
        completedTotal={completedTotal}
        completedSubtotal={completedSubtotal}
        completedDiscount={completedDiscount}
        completedDiscountAmount={completedDiscountAmount}
        completedCustomerName={completedCustomerName}
        completedOrderNumber={completedOrderNumber}
        completedOrderDate={completedOrderDate}
        completedPaidAmount={completedPaidAmount}
        completedRemainingAmount={completedRemainingAmount}
        isPartialPayment={isPartialPayment}
        considerRemainingAsPartial={considerRemainingAsPartial}
        subscriptionAccountInfo={subscriptionAccountInfo}

        // دوال معالجة الأحداث
        handleAddVariantToCart={handleAddVariantToCart}
        handleRepairServiceSuccess={handleRepairServiceSuccess}

        // دوال مسح البيانات
        clearPrintData={clearPrintData}
      />

      {/* شريط حالة الأداء */}
      <POSAdvancedPerformanceBar executionTime={executionTime} />

      <MobileBarcodeScanner
        open={isCameraScannerOpen}
        onOpenChange={setIsCameraScannerOpen}
        onBarcodeDetected={(code) => handleBarcodeLookup(code, 'camera')}
        hasCameraAccess={isCameraScannerSupported}
        hasNativeDetector={hasNativeBarcodeDetector}
        isProcessing={isCameraBusy || isScannerLoading}
      />

      {/* نافذة الطلبات المعلقة */}
      <POSAdvancedHoldOrders
        open={isHoldOrdersOpen}
        onOpenChange={setIsHoldOrdersOpen}
        onRestoreOrder={handleRestoreHeldOrder}
      />

      {/* نافذة التأكيد */}
      <ConfirmDialog
        open={confirmDialog.isOpen}
        onOpenChange={confirmDialog.setIsOpen}
        title={confirmDialog.config.title}
        description={confirmDialog.config.description}
        confirmText={confirmDialog.config.confirmText}
        cancelText={confirmDialog.config.cancelText}
        type={confirmDialog.config.type}
        onConfirm={confirmDialog.handleConfirm}
        onCancel={confirmDialog.handleCancel}
        loading={confirmDialog.loading}
        requireDoubleConfirm={confirmDialog.config.requireDoubleConfirm}
      />

      {/* نافذة بدء جلسة العمل */}
      <StartSessionDialog
        open={showSessionDialog}
        onOpenChange={setShowSessionDialog}
        allowClose={isAdminMode}
      />

      {/* نافذة اختصارات لوحة المفاتيح */}
      <KeyboardShortcutsDialog
        open={keyboardShortcuts.isHelpOpen}
        onOpenChange={keyboardShortcuts.setIsHelpOpen}
        shortcuts={keyboardShortcuts.shortcuts}
      />

      {/* ⚡ نافذة تعديل العنصر المتقدمة */}
      <AdvancedItemEditDialog
        open={isAdvancedEditOpen}
        onOpenChange={setIsAdvancedEditOpen}
        item={editingItemIndex >= 0 ? currentCartItems[editingItemIndex] : null}
        index={editingItemIndex}
        onSave={handleAdvancedEditSave}
        mode={currentPOSMode}
      />

      {/* ⚡ نافذة الدفع */}
      <Suspense fallback={null}>
        <POSAdvancedPaymentDialog
          isOpen={isPaymentDialogOpen}
          onOpenChange={setIsPaymentDialogOpen}
          subtotal={cartSummary.total}
          currentDiscount={discountValue}
          currentDiscountType={discountType}
          total={cartSummary.total}
          originalTotal={cartSummary.originalTotal}
          customers={customers}
          selectedCustomerId={activeTab?.customerId}
          onPaymentComplete={handlePaymentComplete}
          isProcessing={isSubmittingOrder}
        />
      </Suspense>

      {/* ⚡ نافذة العميل ونوع البيع */}
      <CustomerSaleDialog
        open={isCustomerDialogOpen}
        onOpenChange={setIsCustomerDialogOpen}
        customers={customers}
        selectedCustomerId={activeTab?.customerId}
        selectedCustomerName={activeTab?.customerName}
        originalTotal={cartSummary.originalTotal}
        currentTotal={cartSummary.total}
        saleMode={saleMode}
        onSelectCustomer={handleSelectCustomer}
        onChangeSaleMode={handleChangeSaleMode}
        onConfirmAndProceed={() => setIsPaymentDialogOpen(true)}
      />

    </POSPureLayout>
  );
};

export default POSAdvanced;
