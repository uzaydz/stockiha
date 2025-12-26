/**
 * ⚡ صفحة POS المتقدمة - محسنة ومقسمة
 * تم تقسيم المنطق إلى hooks ومكونات منفصلة لتحسين الأداء
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from "sonner";

// ═══════════════════════════════════════════════════════════════════
// 🎯 استيراد المكونات الأساسية
// ═══════════════════════════════════════════════════════════════════
import POSPureLayout from '@/components/pos-layout/POSPureLayout';
import { POSAdvancedPerformanceBar } from '@/components/pos-advanced/POSAdvancedPerformanceBar';
import { POSAdvancedGlobalScanner } from '@/components/pos-advanced/POSAdvancedGlobalScanner';
import { POSAdvancedLoadingSkeleton, POSAdvancedInitialLoading } from '@/components/pos-advanced/POSAdvancedLoadingSkeleton';

// ⚡ المكونات المنفصلة الجديدة
import POSMainContentWrapper from '@/components/pos-advanced/POSMainContentWrapper';
import POSDesktopCart from '@/components/pos-advanced/POSDesktopCart';
import POSMobileCartSheet from '@/components/pos-advanced/POSMobileCartSheet';
import POSAllDialogs from '@/components/pos-advanced/POSAllDialogs';
import ConflictAlert, { useConflicts } from '@/components/pos-advanced/ConflictAlert';
import ExpiringBatchesAlert from '@/components/pos-advanced/ExpiringBatchesAlert';

// ═══════════════════════════════════════════════════════════════════
// 🎯 استيراد Hooks الأساسية
// ═══════════════════════════════════════════════════════════════════
import { usePOSAdvancedState } from '@/hooks/usePOSAdvancedState';
import { usePOSAdvancedDialogs } from '@/hooks/usePOSAdvancedDialogs';
import { usePOSAdvancedProductHandlers } from '@/hooks/usePOSAdvancedProductHandlers';

// ⚡ Hooks المنفصلة الجديدة
import { usePOSCartCalculations } from '@/hooks/usePOSCartCalculations';
import { usePOSTitaniumCart } from '@/hooks/usePOSTitaniumCart';
import { usePOSBarcodeScanner } from '@/hooks/usePOSBarcodeScanner';

// ⚡ Hooks أخرى
import { useKeyboardShortcuts, createPOSShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { useWorkSession } from '@/context/WorkSessionContext';
import { useTenant } from '@/context/TenantContext';
import { usePOSAudio } from '@/hooks/usePOSAudio';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { usePendingOperations } from '@/hooks/usePendingOperations';
import { useOldSessionAlert } from '@/hooks/useOldSessionAlert';
import { usePrinter } from '@/hooks/usePrinter';
import { usePOSLoss } from '@/components/pos/hooks/usePOSLoss';
import { usePOSActions } from '@/context/POSActionsContext';
import { useIsMobile } from "@/hooks/use-mobile";

// ═══════════════════════════════════════════════════════════════════
// 🎯 استيراد المساعدات والأنواع
// ═══════════════════════════════════════════════════════════════════
import { saveHeldOrder, HeldOrder } from '@/lib/hold-orders';
import { formatCurrency } from "@/lib/utils";
import type { POSMode } from '@/components/pos-infinity/CommandIsland';
import type { SaleMode } from '@/components/pos-infinity/CustomerSaleDialog';

// ═══════════════════════════════════════════════════════════════════
// 🚀 المكون الرئيسي
// ═══════════════════════════════════════════════════════════════════

const POSAdvanced = () => {
  // ═══════════════════════════════════════════════════════════════════
  // 📌 جلسة العمل والمنظمة
  // ═══════════════════════════════════════════════════════════════════
  const { hasActiveSession, activeSession, refreshActiveSession, isAdminMode, isLoading: isSessionLoading } = useWorkSession();
  const { currentOrganization } = useTenant();
  const organizationId = currentOrganization?.id || '';
  const [showSessionDialog, setShowSessionDialog] = useState(false);

  useEffect(() => {
    if (!isSessionLoading && !hasActiveSession && !isAdminMode) {
      setShowSessionDialog(true);
    } else if (hasActiveSession || isAdminMode) {
      setShowSessionDialog(false);
    }
  }, [hasActiveSession, isAdminMode, isSessionLoading]);

  // ⚡ تنبيه الجلسة القديمة
  useOldSessionAlert({ enabled: true, maxHours: 12 });

  // ⚡ نظام التعارضات (Conflicts) - Offline
  const {
    conflicts,
    addConflict,
    dismissConflict,
    dismissAll: dismissAllConflicts,
    hasConflicts
  } = useConflicts();

  // ═══════════════════════════════════════════════════════════════════
  // 📌 وضع الخسائر
  // ═══════════════════════════════════════════════════════════════════
  const {
    isLossMode, toggleLossMode, exitLossMode,
    lossItems, lossDescription, setLossDescription,
    addItemToLossCart, addVariantToLossCart,
    updateLossItem, removeLossItem, clearLossCart,
    submitLoss, isSubmittingLoss, lossTotals
  } = usePOSLoss();

  // ═══════════════════════════════════════════════════════════════════
  // 📌 نظام الطباعة
  // ═══════════════════════════════════════════════════════════════════
  const { printHtml, isElectron: isElectronPrint } = usePrinter();

  // ═══════════════════════════════════════════════════════════════════
  // 📌 الحالة الرئيسية
  // ═══════════════════════════════════════════════════════════════════
  const posState = usePOSAdvancedState();
  const {
    allProducts, products, filteredProducts, pagination,
    subscriptions, subscriptionCategories, productCategories,
    customers, currentUser, favoriteProducts,
    isLoading, isRefetching, error, errorMessage, executionTime,
    isAppEnabled, isStaff,
    currentPage, pageSize, searchQuery, categoryFilter,
    tabs, activeTab, activeTabId,
    cartItems, selectedServices, selectedSubscriptions,
    isReturnMode, returnItems, returnReason, returnNotes,
    isSubmittingOrder,
    handlePageChange, handleSearchChange, handleCategoryFilter, handlePageSizeChange,
    setActiveTabId, addTab, removeTab, updateTab,
    addItemToCart, addVariantToCart, removeItemFromCart,
    updateItemQuantity, updateItemPrice, updateItemSaleType, clearCart,
    addService, removeService, updateServicePrice,
    handleAddSubscription, removeSubscription, updateSubscriptionPrice,
    assignCustomerToTab,
    setReturnReason, setReturnNotes,
    addItemToReturnCart, addVariantToReturnCart,
    updateReturnItemQuantity, updateReturnItemPrice,
    removeReturnItem, clearReturnCart, toggleReturnMode,
    updateReturnItemWeight, updateReturnItemBoxCount,
    updateReturnItemLength, updateReturnItemSellingUnit,
    updateReturnItemSaleType, updateReturnItemFullConfig,
    calculateReturnItemTotal,
    updateItemSellingUnit, updateItemWeight, updateItemBoxCount,
    updateItemLength, updateItemFullConfig, calculateItemTotal,
    updateItemBatch, updateItemSerialNumbers,
    handleSubmitOrder, processReturn: handleProcessReturn, refreshData: handleRefreshData,
    scanBarcode, isScannerLoading, barcodeBuffer,
    refreshData, updateProductStockInCache, getProductStock
  } = posState;

  // ⚡ معرف مسودة الطلب للحجز Offline
  const orderDraftId = useMemo(() => `draft-${activeTabId || Date.now()}`, [activeTabId]);

  // ═══════════════════════════════════════════════════════════════════
  // 📌 النوافذ الحوارية
  // ═══════════════════════════════════════════════════════════════════
  const dialogsState = usePOSAdvancedDialogs();
  const {
    isVariantDialogOpen, isPOSSettingsOpen, isRepairDialogOpen,
    isRepairPrintDialogOpen, isPrintDialogOpen, isCalculatorOpen, isQuickExpenseOpen,
    setIsVariantDialogOpen, setIsPOSSettingsOpen, setIsRepairDialogOpen,
    setIsRepairPrintDialogOpen, setIsPrintDialogOpen, setIsCalculatorOpen, setIsQuickExpenseOpen,
    selectedProductForVariant, setSelectedProductForVariant,
    selectedRepairOrder, setSelectedRepairOrder,
    repairQueuePosition, setRepairQueuePosition,
    completedItems, completedServices, completedSubscriptions,
    completedTotal, completedSubtotal, completedDiscount, completedDiscountAmount,
    completedCustomerName, completedOrderNumber, completedOrderDate,
    completedPaidAmount, completedRemainingAmount,
    isPartialPayment, considerRemainingAsPartial, subscriptionAccountInfo,
    handleRepairServiceSuccess, clearPrintData, savePrintData
  } = dialogsState;

  // ═══════════════════════════════════════════════════════════════════
  // 📌 الصوت
  // ═══════════════════════════════════════════════════════════════════
  const { playAddToCart, playSuccess, playError, playClick } = usePOSAudio();

  // ═══════════════════════════════════════════════════════════════════
  // 📌 التايتل بار
  // ═══════════════════════════════════════════════════════════════════
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

  // مزامنة حالة النوافذ من التايتل بار
  useEffect(() => {
    if (isTitlebarCalculatorOpen) { setIsCalculatorOpen(true); closeTitlebarCalculator(); }
  }, [isTitlebarCalculatorOpen]);

  useEffect(() => {
    if (isTitlebarExpenseOpen) { setIsQuickExpenseOpen(true); closeTitlebarExpense(); }
  }, [isTitlebarExpenseOpen]);

  useEffect(() => {
    if (isTitlebarSettingsOpen) { setIsPOSSettingsOpen(true); closeTitlebarSettings(); }
  }, [isTitlebarSettingsOpen]);

  useEffect(() => {
    if (isTitlebarCustomersOpen) { setIsCustomerDialogOpen(true); closeTitlebarCustomers(); }
  }, [isTitlebarCustomersOpen]);

  useEffect(() => {
    setRefreshHandler(() => {
      refreshData();
      toast.success('جاري تحديث البيانات...');
    });
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // 📌 البحث مع Debounce
  // ═══════════════════════════════════════════════════════════════════
  const {
    inputValue: searchInputValue,
    debouncedValue: debouncedSearchValue,
    setInputValue: setSearchInputValue,
    clearSearch,
    isSearching
  } = useDebouncedSearch({
    delay: 200,
    minLength: 2,
    onDebouncedChange: (value) => handleSearchChange(value)
  });

  // ═══════════════════════════════════════════════════════════════════
  // 📌 العمليات المعلقة
  // ═══════════════════════════════════════════════════════════════════
  const {
    stats: pendingStats,
    hasPending: hasPendingOperations,
    status: pendingStatus,
    refresh: refreshPendingStats
  } = usePendingOperations({
    enabled: false,
    checkInterval: 15000,
    warningThreshold: 5,
    criticalThreshold: 20,
    showNotifications: true
  });

  // ═══════════════════════════════════════════════════════════════════
  // 📌 معالجة المنتجات
  // ═══════════════════════════════════════════════════════════════════
  const { handleProductWithVariants, handleAddVariantToCart } = usePOSAdvancedProductHandlers(
    isReturnMode,
    (product) => { addItemToCart(product); playAddToCart(); },
    (product) => { addItemToReturnCart(product); playClick(); },
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
    isLossMode,
    (product) => { addItemToLossCart(product); playClick(); },
    (product, colorId, sizeId, price, colorName, colorCode, sizeName, image) => {
      addVariantToLossCart(product, colorId, sizeId, price, colorName, colorCode, sizeName, image);
      playClick();
    }
  );

  // ═══════════════════════════════════════════════════════════════════
  // 📌 حالات واجهة المستخدم
  // ═══════════════════════════════════════════════════════════════════
  const isMobile = useIsMobile();
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [isCameraScannerSupported, setIsCameraScannerSupported] = useState(false);
  const [hasNativeBarcodeDetector, setHasNativeBarcodeDetector] = useState(false);
  const [isCompactLayout, setIsCompactLayout] = useState<boolean>(() => {
    if (typeof window === 'undefined') return isMobile;
    return window.innerWidth < 1024;
  });
  const [useInfinityDesign] = useState(true);

  // ⚡ نافذة تعديل العنصر المتقدمة
  const [isAdvancedEditOpen, setIsAdvancedEditOpen] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number>(-1);

  // ⚡ نافذة الدفع
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  // ⚡ نافذة العميل
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [saleMode, setSaleMode] = useState<SaleMode>('normal');
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');

  // نوافذ أخرى
  const [isHoldOrdersOpen, setIsHoldOrdersOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [heldOrdersCount, setHeldOrdersCount] = useState(0);
  const confirmDialog = useConfirmDialog();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [hasInitialPOSLoaded, setHasInitialPOSLoaded] = useState(false);

  useEffect(() => {
    // ✅ لا نعرض شاشة "جاري تحميل نقطة البيع" بعد التحميل الأول حتى لو كانت نتائج البحث/الفلترة فارغة
    if (!isLoading) {
      setHasInitialPOSLoaded(true);
    }
  }, [isLoading]);

  // ═══════════════════════════════════════════════════════════════════
  // 📌 خريطة المنتجات للسكانر
  // ═══════════════════════════════════════════════════════════════════
  const getProductById = useMemo(() => {
    const map = new Map<string, any>();
    (allProducts || products || []).forEach((p: any) => map.set(p.id, p));
    return (id: string) => map.get(id);
  }, [allProducts, products]);

  // ═══════════════════════════════════════════════════════════════════
  // 📌 تأثيرات الشاشة والكاميرا
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hasCameraAccess = Boolean(navigator?.mediaDevices?.getUserMedia);
    const hasDetector = typeof (window as any).BarcodeDetector !== 'undefined';
    setIsCameraScannerSupported(hasCameraAccess);
    setHasNativeBarcodeDetector(hasDetector);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setIsCompactLayout(window.innerWidth < 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isMobile) setIsMobileCartOpen(false);
  }, [isMobile]);

  // ═══════════════════════════════════════════════════════════════════
  // 📌 حسابات السلة (Hook منفصل)
  // ═══════════════════════════════════════════════════════════════════
  const { cartSummary, returnSummary, lossSummary, getActiveCartSummary } = usePOSCartCalculations({
    cartItems,
    selectedServices,
    selectedSubscriptions,
    returnItems,
    lossItems,
    lossTotals
  });

  // ═══════════════════════════════════════════════════════════════════
  // 📌 عمليات TitaniumCart (Hook منفصل)
  // ═══════════════════════════════════════════════════════════════════
  const {
    currentCartItems,
    handleUpdateQuantity: handleTitaniumUpdateQuantity,
    handleUpdatePrice: handleTitaniumUpdatePrice,
    handleRemoveItem: handleTitaniumRemoveItem,
    handleClearCart: handleTitaniumClearCart,
    handleAdvancedEditSave
  } = usePOSTitaniumCart({
    isLossMode, isReturnMode,
    lossItems, returnItems, cartItems,
    updateLossItem, removeLossItem, clearLossCart,
    updateReturnItemQuantity, updateReturnItemPrice,
    updateReturnItemWeight, updateReturnItemBoxCount,
    updateReturnItemLength, updateReturnItemSellingUnit,
    removeReturnItem, clearReturnCart,
    updateItemQuantity, updateItemPrice,
    updateItemWeight, updateItemBoxCount,
    updateItemLength, updateItemSellingUnit, updateItemSaleType,
    removeItemFromCart, clearCart
  });

  // ═══════════════════════════════════════════════════════════════════
  // 📌 سكانر الباركود (Hook منفصل)
  // ═══════════════════════════════════════════════════════════════════
  const {
    isCameraScannerOpen, setIsCameraScannerOpen, isCameraBusy, handleBarcodeLookup
  } = usePOSBarcodeScanner({
    scanBarcode,
    getProductById,
    isReturnMode,
    isLossMode,
    addItemToCart,
    addItemToReturnCart,
    addItemToLossCart,
    handleProductWithVariants,
    playAddToCart,
    playClick,
    playError
  });

  // ═══════════════════════════════════════════════════════════════════
  // 📌 دوال الطلبات المعلقة
  // ═══════════════════════════════════════════════════════════════════
  const handleSaveHeldOrder = useCallback(async () => {
    if (cartItems.length === 0 && selectedServices.length === 0 && selectedSubscriptions.length === 0) {
      toast.error('السلة فارغة! لا يمكن حفظ طلب فارغ.');
      return;
    }

    const orderName = prompt('أدخل اسم الطلب:', `طلب ${new Date().toLocaleTimeString('ar-DZ')}`);
    if (!orderName) return;

    try {
      saveHeldOrder({
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
      toast.success(`✅ تم حفظ الطلب "${orderName}" بنجاح`);
    } catch (error) {
      toast.error('❌ فشل حفظ الطلب');
    }
  }, [cartItems, selectedServices, selectedSubscriptions, activeTab, customers, currentUser, clearCart]);

  const handleRestoreHeldOrder = useCallback((order: HeldOrder) => {
    clearCart();

    order.items.forEach(item => {
      if (item.colorId || item.sizeId) {
        addVariantToCart(
          item.product, item.colorId || '', item.sizeId || '',
          item.variantPrice || 0, item.colorName || '', item.colorCode || '',
          item.sizeName || '', item.variantImage || ''
        );
      } else {
        for (let i = 0; i < (item.quantity || 1); i++) {
          addItemToCart(item.product);
        }
      }
    });

    order.services.forEach(service => addService(service));
    order.subscriptions.forEach(subscription => handleAddSubscription(subscription));

    if (order.customerId) {
      const customer = customers.find(c => c.id === order.customerId);
      if (customer) assignCustomerToTab(activeTabId, customer);
    }

    if (order.discount || order.discountAmount) {
      updateTab(activeTabId, {
        discount: order.discount,
        discountAmount: order.discountAmount,
        discountType: order.discountType,
      } as any);
    }
  }, [clearCart, addVariantToCart, addItemToCart, addService, handleAddSubscription, assignCustomerToTab, updateTab, activeTabId, customers]);

  // ═══════════════════════════════════════════════════════════════════
  // 📌 دوال الدفع
  // ═══════════════════════════════════════════════════════════════════
  const handleSubmitOrderWithPrint = useCallback(async (
    customerId?: string, notes?: string,
    discount?: number, discountType?: 'percentage' | 'fixed',
    amountPaid?: number, paymentMethod?: string,
    isPartialPayment?: boolean, considerRemainingAsPartial?: boolean
  ): Promise<void> => {
    try {
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
            subscriptionDetails: { duration: subscription.duration, selectedPricing: subscription.selectedPricing }
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
        customerId, notes, discount || 0, discountType || 'fixed',
        amountPaid, paymentMethod || 'cash',
        isPartialPayment || false, considerRemainingAsPartial || false
      );

      setIsPrintDialogOpen(true);
      playSuccess();
    } catch (error) {
      playError();
      throw error;
    }
  }, [handleSubmitOrder, cartItems, selectedServices, selectedSubscriptions, customers, savePrintData, setIsPrintDialogOpen, playSuccess, playError]);

  const handlePaymentComplete = useCallback((data: any) => {
    setIsPaymentDialogOpen(false);
    handleSubmitOrderWithPrint(
      data.customerId, data.notes, data.discount, data.discountType,
      data.amountPaid, data.paymentMethod, data.isPartialPayment, data.considerRemainingAsPartial
    );
  }, [handleSubmitOrderWithPrint]);

  // ═══════════════════════════════════════════════════════════════════
  // 📌 دوال TitaniumCart
  // ═══════════════════════════════════════════════════════════════════
  const handleTitaniumEditItem = useCallback((index: number) => {
    setEditingItemIndex(index);
    setIsAdvancedEditOpen(true);
  }, []);

  const handleHoldCart = useCallback(() => {
    if (cartItems.length === 0) {
      toast.error('السلة فارغة');
      return;
    }
    addTab();
    toast.success('✅ تم تعليق الطلب بنجاح');
  }, [cartItems.length, addTab]);

  // 📲 معالج استقبال السلة من جهاز آخر
  const handleReceiveCart = useCallback((items: any[], mode: 'add' | 'replace') => {
    if (mode === 'replace') {
      clearCart();
    }

    const startIndex = mode === 'replace' ? 0 : cartItems.length;
    let addedCount = 0;

    // إضافة كل منتج للسلة
    items.forEach((item, itemIndex) => {
      // البحث عن المنتج في قائمة المنتجات
      const product = products?.find((p: any) => p.id === item.productId);

      if (product) {
        // حفظ الـ index الحالي قبل الإضافة
        const targetIndex = startIndex + addedCount;

        // إضافة المنتج مرة واحدة فقط
        if (item.colorId || item.sizeId) {
          addVariantToCart(product, item.colorId, item.sizeId, item.variantPrice);
        } else {
          addItemToCart(product);
        }

        // تحديث الإعدادات الكاملة للمنتج المضاف (الكمية، الوزن، الكرتون، الطول، إلخ)
        // استخدام delay متزايد لضمان ترتيب التحديثات
        setTimeout(() => {
          const sellingUnit = item.sellingUnit || 'piece';

          if (updateItemFullConfig) {
            updateItemFullConfig(targetIndex, {
              sellingUnit,
              quantity: item.quantity || 1,
              weight: item.weight,
              weightUnit: item.weightUnit,
              boxCount: item.boxCount,
              length: item.length,
              customPrice: item.customPrice || item.price,
              saleType: item.saleType || 'retail'
            });
          } else {
            // fallback: تحديث الكمية فقط
            if (item.quantity > 1) {
              updateItemQuantity(targetIndex, item.quantity);
            }
          }

          // تحديث الدفعة إذا وجدت
          if (item.batchId && updateItemBatch) {
            updateItemBatch(targetIndex, item.batchId, item.batchNumber, item.expiryDate);
          }

          // تحديث الأرقام التسلسلية إذا وجدت
          if (item.serialNumbers?.length > 0 && updateItemSerialNumbers) {
            updateItemSerialNumbers(targetIndex, item.serialNumbers);
          }

          // تحديث السعر المخصص
          if (item.customPrice && updateItemPrice) {
            updateItemPrice(targetIndex, item.customPrice);
          }
        }, 100 + (itemIndex * 50)); // delay متزايد لكل منتج

        addedCount++;
      } else {
        // إذا لم يتم العثور على المنتج
        toast.warning(`المنتج "${item.productName}" غير موجود في القائمة`);
      }
    });

    toast.success(`تم استلام ${addedCount} منتج من جهاز آخر`);
  }, [clearCart, cartItems.length, products, addItemToCart, addVariantToCart, updateItemFullConfig, updateItemQuantity, updateItemBatch, updateItemSerialNumbers, updateItemPrice]);

  const handleTitaniumCheckout = useCallback(() => {
    if (isLossMode) { submitLoss(); }
    else if (isReturnMode) { handleProcessReturn({}); }
    else { setIsPaymentDialogOpen(true); }
  }, [isLossMode, isReturnMode, submitLoss, handleProcessReturn]);

  const handleTitaniumQuickCheckout = useCallback(() => {
    if (isLossMode) { submitLoss(); }
    else if (isReturnMode) { handleProcessReturn({}); }
    else { handleSubmitOrderWithPrint(); }
  }, [isLossMode, isReturnMode, handleSubmitOrderWithPrint, submitLoss, handleProcessReturn]);

  // ═══════════════════════════════════════════════════════════════════
  // 📌 دوال العميل
  // ═══════════════════════════════════════════════════════════════════
  const handleOpenCustomerDialog = useCallback(() => setIsCustomerDialogOpen(true), []);

  const handleSelectCustomer = useCallback((customerId?: string, customerName?: string) => {
    if (activeTabId) assignCustomerToTab(activeTabId, customerId, customerName);
  }, [activeTabId, assignCustomerToTab]);

  const handleChangeSaleMode = useCallback((mode: SaleMode) => setSaleMode(mode), []);

  const handleChangeDiscount = useCallback((value: number, type: 'percentage' | 'fixed') => {
    setDiscountValue(value);
    setDiscountType(type);
    if (activeTabId) updateTab(activeTabId, { discount: value, discountType: type });
  }, [activeTabId, updateTab]);

  // ═══════════════════════════════════════════════════════════════════
  // 📌 اختصارات لوحة المفاتيح
  // ═══════════════════════════════════════════════════════════════════
  const keyboardShortcuts = useKeyboardShortcuts({ enabled: true, preventDefault: true });

  useEffect(() => {
    const posShortcuts = createPOSShortcuts({
      onHelp: () => keyboardShortcuts.showShortcutsHelp(),
      onSearch: () => searchInputRef.current?.focus(),
      onClearSearch: () => clearSearch(),
      onFocusBarcode: () => barcodeInputRef.current?.focus(),
      onRefresh: refreshData,
      onToggleCart: () => setIsMobileCartOpen(prev => !prev),
      onToggleReturnMode: toggleReturnMode,
      onOpenSettings: () => setIsPOSSettingsOpen(true),
      onOpenCalculator: () => setIsCalculatorOpen(true),
      onCheckout: () => {
        if (cartItems.length > 0 || selectedServices.length > 0 || selectedSubscriptions.length > 0) {
          setIsPaymentDialogOpen(true);
        } else {
          toast.warning('السلة فارغة!');
        }
      },
      onQuickCheckout: handleTitaniumQuickCheckout,
      onClearCart: handleTitaniumClearCart,
      onAddDiscount: () => toast.info('استخدم واجهة السلة لإضافة خصم'),
      onAddCustomer: () => toast.info('استخدم واجهة السلة لاختيار عميل'),
      onNewTab: addTab,
      onCloseTab: () => tabs.length > 1 ? removeTab(activeTabId) : toast.info('لا يمكن إغلاق التبويب الوحيد'),
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
      onPrint: async () => isPrintDialogOpen ? window.print() : toast.info('لا توجد فاتورة للطباعة'),
      onCancel: () => {
        setIsVariantDialogOpen(false);
        setIsPOSSettingsOpen(false);
        setIsCalculatorOpen(false);
        setIsQuickExpenseOpen(false);
        setIsHoldOrdersOpen(false);
        setIsCameraScannerOpen(false);
      },
      onToggleFullscreen: () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().then(() => {
            setIsFullscreen(true);
            toast.success('🖥️ وضع الشاشة الكاملة مُفعّل');
          }).catch(() => toast.error('❌ فشل تفعيل وضع الشاشة الكاملة'));
        } else {
          document.exitFullscreen().then(() => {
            setIsFullscreen(false);
            toast.info('🖥️ تم الخروج من وضع الشاشة الكاملة');
          });
        }
      },
      onModeSale: () => {
        if (isLossMode) { exitLossMode(); toast.success('تم التبديل إلى وضع البيع'); }
        else if (isReturnMode) { toggleReturnMode(); toast.success('تم التبديل إلى وضع البيع'); }
        else { toast.info('أنت بالفعل في وضع البيع'); }
      },
      onModeReturn: () => {
        if (isLossMode) exitLossMode();
        if (!isReturnMode) { toggleReturnMode(); toast.success('تم التبديل إلى وضع الإرجاع'); }
        else { toast.info('أنت بالفعل في وضع الإرجاع'); }
      },
      onModeLoss: () => {
        if (isReturnMode) toggleReturnMode();
        if (!isLossMode) { toggleLossMode(); toast.success('تم التبديل إلى وضع الخسارة'); }
        else { toast.info('أنت بالفعل في وضع الخسارة'); }
      },
    });

    keyboardShortcuts.setShortcuts(posShortcuts);
  }, [
    handleTitaniumQuickCheckout, handleTitaniumClearCart,
    isLossMode, isReturnMode, cartItems, lossItems, returnItems,
    lossDescription, submitLoss, handleProcessReturn,
    selectedServices, selectedSubscriptions, refreshData,
    toggleReturnMode, toggleLossMode, exitLossMode,
    addTab, removeTab, activeTabId, tabs, handleSaveHeldOrder,
    isPrintDialogOpen, keyboardShortcuts, clearSearch
  ]);

  // ═══════════════════════════════════════════════════════════════════
  // 📌 حسابات العرض
  // ═══════════════════════════════════════════════════════════════════
  const currentPOSMode: POSMode = isLossMode ? 'loss' : (isReturnMode ? 'return' : 'sale');
  const activeCartSummary = getActiveCartSummary(isLossMode, isReturnMode);
  const cartSummaryLabel = isLossMode ? 'سلة الخسائر' : (isReturnMode ? 'سلة الإرجاع' : 'السلة');
  const cartSummarySubLabel = activeCartSummary.itemCount > 0
    ? `${activeCartSummary.itemCount} عنصر • ${formatCurrency(activeCartSummary.total || 0)}`
    : 'لا توجد عناصر بعد';

  // حساب عدد الطلبات المعلقة
  const heldOrdersCountMemo = useMemo(() => {
    return tabs.filter(tab =>
      tab.id !== activeTabId &&
      (tab.cartItems?.length > 0 || tab.selectedServices?.length > 0 || tab.selectedSubscriptions?.length > 0)
    ).length;
  }, [tabs, activeTabId]);

  useEffect(() => setHeldOrdersCount(heldOrdersCountMemo), [heldOrdersCountMemo]);

  // ═══════════════════════════════════════════════════════════════════
  // 📌 حالات التحميل
  // ═══════════════════════════════════════════════════════════════════
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  useEffect(() => {
    if (isLoading && !allProducts?.length) {
      const timeout = setTimeout(() => {
        console.warn('[POSAdvanced] ⚠️ Loading timeout - showing content anyway');
        setLoadingTimeout(true);
      }, 10000);
      return () => clearTimeout(timeout);
    } else {
      setLoadingTimeout(false);
    }
  }, [isLoading, allProducts?.length]);

  const hasExistingProducts = products?.length > 0 || allProducts?.length > 0;

  if (!hasInitialPOSLoaded && isLoading && !loadingTimeout) {
    return (
      <POSPureLayout onRefresh={refreshData} isRefreshing={true} connectionStatus="reconnecting">
        <POSAdvancedInitialLoading />
      </POSPureLayout>
    );
  }

  if (error && !isLoading && !allProducts?.length) {
    return (
      <POSPureLayout onRefresh={refreshData} isRefreshing={isRefetching} executionTime={executionTime} connectionStatus="reconnecting">
        <POSAdvancedLoadingSkeleton />
      </POSPureLayout>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🎨 العرض
  // ═══════════════════════════════════════════════════════════════════
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
          return { success: response.success, data: (response.data?.fullProduct ?? response.data) as any };
        }}
        addItemToCart={addItemToCart}
        addItemToReturnCart={addItemToReturnCart}
        handleProductWithVariants={handleProductWithVariants}
        getProductById={getProductById}
      />

      {/* التخطيط الرئيسي */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-2 h-full w-full p-2 overflow-hidden">
        {/* المحتوى الرئيسي */}
        <POSMainContentWrapper
          useInfinityDesign={useInfinityDesign}
          isReturnMode={isReturnMode}
          isLossMode={isLossMode}
          toggleReturnMode={toggleReturnMode}
          toggleLossMode={toggleLossMode}
          searchQuery={searchInputValue}
          onSearchChange={setSearchInputValue}
          onBarcodeSearch={(value) => handleBarcodeLookup(value, 'manual')}
          isScannerLoading={isScannerLoading}
          categoryFilter={categoryFilter}
          productCategories={productCategories}
          products={products}
          onCategoryFilter={handleCategoryFilter}
          cartItemsCount={cartSummary.itemCount}
          cartTotal={cartSummary.total}
          returnItemsCount={returnItems.length}
          lossItemsCount={lossItems.length}
          onOpenCalculator={() => setIsCalculatorOpen(true)}
          onOpenExpense={() => setIsQuickExpenseOpen(true)}
          onOpenSettings={() => setIsPOSSettingsOpen(true)}
          onOpenRepair={() => setIsRepairDialogOpen(true)}
          onRefreshData={refreshData}
          isCompactLayout={isCompactLayout}
          hasPendingOperations={hasPendingOperations}
          pendingStatus={pendingStatus}
          pendingStats={pendingStats}
          onRefreshPendingStats={refreshPendingStats}
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
          favoriteProducts={favoriteProducts}
          isPOSDataLoading={isRefetching}
          onAddToCart={handleProductWithVariants}
          onAddSubscription={handleAddSubscription}
          isAppEnabled={isAppEnabled}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          onOpenMobileScanner={() => setIsCameraScannerOpen(true)}
          isCameraScannerSupported={isCameraScannerSupported}
          hasNativeBarcodeDetector={hasNativeBarcodeDetector}
        />

        {/* السلة - Desktop */}
        <POSDesktopCart
          currentPOSMode={currentPOSMode}
          currentCartItems={currentCartItems}
          onUpdateQuantity={handleTitaniumUpdateQuantity}
          onRemoveItem={handleTitaniumRemoveItem}
          onClearCart={handleTitaniumClearCart}
          onCheckout={handleTitaniumCheckout}
          onQuickCheckout={handleTitaniumQuickCheckout}
          onUpdatePrice={handleTitaniumUpdatePrice}
          onEditItem={handleTitaniumEditItem}
          onSelectCustomer={handleOpenCustomerDialog}
          onHoldCart={handleHoldCart}
          customerName={activeTab?.customerName}
          isSubmitting={isSubmittingOrder || isSubmittingLoss}
          subtotal={activeCartSummary.total}
          discount={discountValue}
          total={activeCartSummary.total}
          saleMode={saleMode}
          lossDescription={lossDescription}
          onLossDescriptionChange={setLossDescription}
          tabs={tabs}
          activeTabId={activeTabId}
          onSwitchTab={setActiveTabId}
          onRemoveTab={removeTab}
          // ⚡ Offline Props
          organizationId={organizationId}
          orderDraftId={orderDraftId}
          onSerialConflict={(serial, type) => {
            addConflict(type === 'sold' ? 'already_sold' : 'already_reserved', {
              serialNumber: serial
            });
          }}
          onReceiveCart={handleReceiveCart}
        />
      </div>

      {/* سلة الموبايل */}
      {isCompactLayout && (
        <POSMobileCartSheet
          isOpen={isMobileCartOpen}
          onOpenChange={setIsMobileCartOpen}
          isLossMode={isLossMode}
          isReturnMode={isReturnMode}
          currentPOSMode={currentPOSMode}
          currentCartItems={currentCartItems}
          cartSummaryLabel={cartSummaryLabel}
          cartSummarySubLabel={cartSummarySubLabel}
          onUpdateQuantity={handleTitaniumUpdateQuantity}
          onRemoveItem={handleTitaniumRemoveItem}
          onClearCart={handleTitaniumClearCart}
          onCheckout={handleTitaniumCheckout}
          onQuickCheckout={handleTitaniumQuickCheckout}
          onUpdatePrice={handleTitaniumUpdatePrice}
          onEditItem={handleTitaniumEditItem}
          onSelectCustomer={handleOpenCustomerDialog}
          customerName={activeTab?.customerName}
          isSubmitting={isSubmittingOrder || isSubmittingLoss}
          subtotal={activeCartSummary.total}
          discount={discountValue}
          total={activeCartSummary.total}
          saleMode={saleMode}
          lossDescription={lossDescription}
          onLossDescriptionChange={setLossDescription}
          onOpenCameraScanner={() => setIsCameraScannerOpen(true)}
          isCameraScannerSupported={isCameraScannerSupported}
          hasNativeBarcodeDetector={hasNativeBarcodeDetector}
          // ⚡ Offline Props
          organizationId={organizationId}
          orderDraftId={orderDraftId}
          onSerialConflict={(serial, type) => {
            addConflict(type === 'sold' ? 'already_sold' : 'already_reserved', {
              serialNumber: serial
            });
          }}
          onReceiveCart={handleReceiveCart}
        />
      )}

      {/* النوافذ الحوارية */}
      <POSAllDialogs
        // POSAdvancedDialogs
        isVariantDialogOpen={isVariantDialogOpen}
        isPOSSettingsOpen={isPOSSettingsOpen}
        isRepairDialogOpen={isRepairDialogOpen}
        isRepairPrintDialogOpen={isRepairPrintDialogOpen}
        isPrintDialogOpen={isPrintDialogOpen}
        isCalculatorOpen={isCalculatorOpen}
        isQuickExpenseOpen={isQuickExpenseOpen}
        setIsVariantDialogOpen={setIsVariantDialogOpen}
        setIsPOSSettingsOpen={setIsPOSSettingsOpen}
        setIsRepairDialogOpen={setIsRepairDialogOpen}
        setIsRepairPrintDialogOpen={setIsRepairPrintDialogOpen}
        setIsPrintDialogOpen={setIsPrintDialogOpen}
        setIsCalculatorOpen={setIsCalculatorOpen}
        setIsQuickExpenseOpen={setIsQuickExpenseOpen}
        selectedProductForVariant={selectedProductForVariant}
        setSelectedProductForVariant={setSelectedProductForVariant}
        selectedRepairOrder={selectedRepairOrder}
        setSelectedRepairOrder={setSelectedRepairOrder}
        repairQueuePosition={repairQueuePosition}
        setRepairQueuePosition={setRepairQueuePosition}
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
        handleAddVariantToCart={handleAddVariantToCart}
        handleRepairServiceSuccess={handleRepairServiceSuccess}
        clearPrintData={clearPrintData}
        // Hold Orders
        isHoldOrdersOpen={isHoldOrdersOpen}
        setIsHoldOrdersOpen={setIsHoldOrdersOpen}
        onRestoreHeldOrder={handleRestoreHeldOrder}
        // Confirm Dialog
        confirmDialogOpen={confirmDialog.isOpen}
        setConfirmDialogOpen={confirmDialog.setIsOpen}
        confirmDialogConfig={confirmDialog.config}
        onConfirmDialogConfirm={confirmDialog.handleConfirm}
        onConfirmDialogCancel={confirmDialog.handleCancel}
        confirmDialogLoading={confirmDialog.loading}
        // Session Dialog
        showSessionDialog={showSessionDialog}
        setShowSessionDialog={setShowSessionDialog}
        isAdminMode={isAdminMode}
        // Keyboard Shortcuts
        isKeyboardHelpOpen={keyboardShortcuts.isHelpOpen}
        setIsKeyboardHelpOpen={keyboardShortcuts.setIsHelpOpen}
        keyboardShortcuts={keyboardShortcuts.shortcuts}
        // Advanced Edit
        isAdvancedEditOpen={isAdvancedEditOpen}
        setIsAdvancedEditOpen={setIsAdvancedEditOpen}
        editingItemIndex={editingItemIndex}
        currentCartItems={currentCartItems}
        onAdvancedEditSave={(index, updates) => {
          handleAdvancedEditSave(index, updates);
          toast.success('✅ تم حفظ التعديلات بنجاح');
        }}
        currentPOSMode={currentPOSMode}
        // ⚡ Offline Props للـ Serial Numbers
        organizationId={organizationId}
        orderDraftId={activeTabId}
        onSerialConflict={(serialNumber, conflictType) => {
          toast.error(`تعارض في الرقم التسلسلي ${serialNumber}: ${conflictType === 'sold' ? 'مباع مسبقاً' : 'محجوز'}`);
        }}
        // Payment Dialog
        isPaymentDialogOpen={isPaymentDialogOpen}
        setIsPaymentDialogOpen={setIsPaymentDialogOpen}
        cartTotal={cartSummary.total}
        cartOriginalTotal={cartSummary.originalTotal}
        discountValue={discountValue}
        discountType={discountType}
        customers={customers}
        selectedCustomerId={activeTab?.customerId}
        onPaymentComplete={handlePaymentComplete}
        isSubmittingOrder={isSubmittingOrder}
        // ⚡ عناصر السلة للأرقام التسلسلية
        paymentCartItems={currentCartItems}
        // Customer Dialog
        isCustomerDialogOpen={isCustomerDialogOpen}
        setIsCustomerDialogOpen={setIsCustomerDialogOpen}
        selectedCustomerName={activeTab?.customerName}
        saleMode={saleMode}
        onSelectCustomer={handleSelectCustomer}
        onChangeSaleMode={handleChangeSaleMode}
        // Camera Scanner
        isCameraScannerOpen={isCameraScannerOpen}
        setIsCameraScannerOpen={setIsCameraScannerOpen}
        onBarcodeDetected={(code) => handleBarcodeLookup(code, 'camera')}
        isCameraScannerSupported={isCameraScannerSupported}
        hasNativeBarcodeDetector={hasNativeBarcodeDetector}
        isCameraBusy={isCameraBusy}
        isScannerLoading={isScannerLoading}
      />

      {/* شريط حالة الأداء */}
      <POSAdvancedPerformanceBar executionTime={executionTime} />

      {/* ⚡ تنبيهات التعارضات (Offline) */}
      <ConflictAlert
        conflicts={conflicts}
        onDismiss={dismissConflict}
        onDismissAll={dismissAllConflicts}
        onRetry={(conflict) => {
          // إعادة محاولة - يمكن تخصيصها حسب الحاجة
          console.log('إعادة محاولة للتعارض:', conflict);
          dismissConflict(conflict.id);
        }}
      />

      {/* ⚡ تنبيهات الدفعات القريبة من الانتهاء (Offline) */}
      {organizationId && (
        <ExpiringBatchesAlert
          organizationId={organizationId}
          daysAhead={30}
          enabled={!isLossMode && !isReturnMode} // تعطيل في وضع الخسائر والإرجاع
          onBatchClick={(batch) => {
            console.log('الدفعة المحددة:', batch);
            toast.info(`دفعة "${batch.batch_number}" - ${batch.product_name}`);
          }}
        />
      )}
    </POSPureLayout>
  );
};

export default POSAdvanced;
