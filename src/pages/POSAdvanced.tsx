import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState, lazy } from 'react';
import { createPortal } from 'react-dom';
import { toast } from "sonner";
import { Order } from '@/types/index';

// استيراد المكونات المحسنة
import POSPureLayout from '@/components/pos-layout/POSPureLayout';
import POSAdvancedContent from '@/components/pos-advanced/POSAdvancedContent';
import POSAdvancedCart from '@/components/pos-advanced/POSAdvancedCart';
import { POSAdvancedHeader } from '@/components/pos-advanced/POSAdvancedHeader';

// استيراد المكونات الجديدة
import {
  POSAdvancedSearchStats,
  POSAdvancedPerformanceBar,
  POSAdvancedDialogs,
  POSAdvancedGlobalScanner,
  POSAdvancedLoadingSkeleton,
  POSAdvancedInitialLoading
} from '@/components/pos-advanced';

// استيراد Hooks الجديدة
import {
  usePOSAdvancedState,
  usePOSAdvancedDialogs,
  usePOSAdvancedProductHandlers
} from '@/hooks';

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

// استيراد مكونات UI
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatCurrency } from "@/lib/utils";
import { Camera, ChevronUp, RotateCcw, ShoppingCart, Archive, Sparkles, Store, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import MobileBarcodeScanner from "@/components/pos-advanced/components/MobileBarcodeScanner";

// =================================================================
// 🚀 صفحة POS المتقدمة - مقسمة إلى مكونات منفصلة
// =================================================================

const POSAdvanced = () => {
  // التحقق من جلسة العمل
  const { hasActiveSession, activeSession, refreshActiveSession, isAdminMode } = useWorkSession();
  const [showSessionDialog, setShowSessionDialog] = useState(!hasActiveSession && !isAdminMode);
  
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

  // استخدام Hook معالجة المنتجات
  const { handleProductWithVariants, handleAddVariantToCart } = usePOSAdvancedProductHandlers(
    isReturnMode,
    addItemToCart,
    addItemToReturnCart,
    addVariantToCart,
    addVariantToReturnCart,
    setSelectedProductForVariant,
    setIsVariantDialogOpen
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
      onPrint: () => {
        if (isPrintDialogOpen) {
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
  }, []);

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
    } catch (error) {
      throw error;
    }
  }, [handleSubmitOrder, cartItems, selectedServices, selectedSubscriptions, customers, savePrintData, setIsPrintDialogOpen]);

  const cartSummary = useMemo(() => {
    const productItemsCount = cartItems.reduce((total, item) => total + (item.quantity || 0), 0);
    const extraItemsCount = selectedServices.length + selectedSubscriptions.length;
    const itemsTotal = productItemsCount + extraItemsCount;

    const productsTotal = cartItems.reduce((total, item) => {
      const price = (item as any).customPrice ?? item.variantPrice ?? item.product?.price ?? 0;
      return total + price * (item.quantity || 0);
    }, 0);

    const servicesTotal = selectedServices.reduce((total, service) => total + (service?.price || 0), 0);
    const subscriptionsTotal = selectedSubscriptions.reduce((total, subscription) => {
      return total + (subscription?.price || subscription?.selling_price || subscription?.purchase_price || 0);
    }, 0);

    return {
      itemCount: itemsTotal,
      total: productsTotal + servicesTotal + subscriptionsTotal
    };
  }, [cartItems, selectedServices, selectedSubscriptions]);

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

        if (isReturnMode) {
          addItemToReturnCart(fullProduct);
          toast.success(`✅ تم إضافة "${fullProduct.name || 'منتج'}" إلى سلة الإرجاع`, { id: toastId, duration: 2000 });
        } else if (fullProduct.has_variants && fullProduct.colors && fullProduct.colors.length > 0) {
          handleProductWithVariants(fullProduct);
          toast.dismiss(toastId);
        } else {
          addItemToCart(fullProduct);
          toast.success(`✅ تم إضافة "${fullProduct.name || 'منتج'}" إلى السلة`, { id: toastId, duration: 2000 });
        }

        if (source === 'camera') {
          setIsCameraScannerOpen(false);
        }
      } else {
        const message = response?.message || 'لم يتم العثور على المنتج لهذا الباركود';
        toast.error(`❌ ${message}`, { id: toastId, duration: 3000 });
      }
    } catch (error) {
      toast.error(`💥 تعذر معالجة الباركود: ${formattedBarcode}`, { id: toastId, duration: 3000 });
    } finally {
      if (source === 'camera') {
        cameraProcessingRef.current = false;
        setIsCameraBusy(false);
      }
    }
  }, [scanBarcode, getProductById, isReturnMode, addItemToReturnCart, handleProductWithVariants, addItemToCart]);

  const activeCartSummary = isReturnMode ? returnSummary : cartSummary;
  const cartSummaryLabel = isReturnMode ? 'سلة الإرجاع' : 'السلة';
  const cartSummarySubLabel = activeCartSummary.itemCount > 0
    ? `${activeCartSummary.itemCount} عنصر${activeCartSummary.itemCount === 1 ? '' : ''} • ${formatCurrency(activeCartSummary.total || 0)}`
    : 'لا توجد عناصر بعد';

  // تشخيص للتطوير
  if (process.env.NODE_ENV === 'development') {
  }

  // معالجة حالة التحميل الأولي
  if (isLoading && !allProducts?.length) {
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
      
      {/* تخطيط POS محسن - متناسق */}
      <div className="relative flex flex-col min-h-screen gap-3 bg-transparent">

        {/* الهيدر */}
        <div className="lg:ml-80 xl:ml-[340px] 2xl:ml-[360px]">
          <POSAdvancedHeader
            isReturnMode={isReturnMode}
            returnItemsCount={returnItems.length}
            toggleReturnMode={toggleReturnMode}
            onCalculatorOpen={() => setIsCalculatorOpen(true)}
            onSettingsOpen={() => setIsPOSSettingsOpen(true)}
            onRepairOpen={() => setIsRepairDialogOpen(true)}
            onQuickExpenseOpen={() => setIsQuickExpenseOpen(true)}
            isRepairEnabled={true}
          />
        </div>

        {/* المحتوى الأساسي */}
        <div className="flex flex-col lg:flex-row gap-0 w-full pb-4">
          {/* منطقة المنتجات والاشتراكات */}
          <div className="flex-1 flex flex-col min-w-0 lg:ml-80 xl:ml-[340px] 2xl:ml-[360px]">
            <Suspense fallback={<Skeleton className="h-full w-full" />}>
              <div className="w-full bg-background">
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
                  isPOSDataLoading={isRefetching}
                  onAddToCart={handleProductWithVariants}
                  onAddSubscription={handleAddSubscription}
                  onRefreshData={refreshData}
                  isAppEnabled={isAppEnabled}
                  // دوال pagination والبحث
                  onPageChange={handlePageChange}
                  onSearchChange={handleSearchChange}
                  onCategoryFilter={handleCategoryFilter}
                  onPageSizeChange={handlePageSizeChange}
                  searchQuery={searchQuery}
                  categoryFilter={categoryFilter}
                  // دالة السكانر
                  onBarcodeSearch={(value) => handleBarcodeLookup(value, 'manual')}
                  isScannerLoading={isScannerLoading}
                  onOpenMobileScanner={() => setIsCameraScannerOpen(true)}
                  isCameraScannerSupported={isCameraScannerSupported}
                  hasNativeBarcodeDetector={hasNativeBarcodeDetector}
                  isMobile={isCompactLayout}
                />
                
                {/* إحصائيات البحث المحلي المحسنة */}
                <POSAdvancedSearchStats
                  allProductsCount={pagination?.total_count || allProducts?.length || 0}
                  filteredProductsCount={pagination?.total_count || filteredProducts.length}
                  currentPage={pagination?.current_page || currentPage}
                  totalPages={pagination?.total_pages || Math.ceil((pagination?.total_count || filteredProducts.length) / (pagination?.per_page || pageSize))}
                  searchQuery={searchQuery}
                  categoryFilter={categoryFilter}
                  categoryName={productCategories.find(c => c.id === categoryFilter)?.name}
                />
              </div>
            </Suspense>
          </div>
        </div>

        {/* السلة الذكية - كاملة مثل القائمة الجانبية - مخفية على الهاتف */}
        <div className="hidden lg:block fixed left-2 w-80 xl:w-[340px] 2xl:w-[360px] z-20" style={{ top: 'calc(var(--titlebar-height, 48px) + 0.25rem)', bottom: '1rem' }}>
          <Suspense fallback={<Skeleton className="h-full w-full" />}>
            <div className="h-full w-full bg-background overflow-hidden rounded-lg border border-border/40 shadow-2xl">
              <POSAdvancedCart
                isReturnMode={isReturnMode}
                // بيانات السلة العادية
                tabs={tabs}
                activeTab={activeTab}
                activeTabId={activeTabId}
                cartItems={cartItems}
                selectedServices={selectedServices}
                selectedSubscriptions={selectedSubscriptions}
                // بيانات سلة الإرجاع
                returnItems={returnItems}
                returnReason={returnReason}
                returnNotes={returnNotes}
                // العملاء والمستخدمين
                customers={customers}
                currentUser={currentUser}
                // دوال إدارة التبويبات
                setActiveTabId={setActiveTabId}
                addTab={addTab}
                removeTab={removeTab}
                updateTab={updateTab}
                // دوال إدارة السلة
                updateItemQuantity={updateItemQuantity}
                updateItemPrice={updateItemPrice}
                removeItemFromCart={removeItemFromCart}
                clearCart={clearCart}
                submitOrder={handleSubmitOrderWithPrint}
                // دوال إدارة الإرجاع
                updateReturnItemQuantity={updateReturnItemQuantity}
                updateReturnItemPrice={updateReturnItemPrice}
                removeReturnItem={removeReturnItem}
                clearReturnCart={clearReturnCart}
                processReturn={async (customerId?: string, reason?: string, notes?: string) => {
                  // تحويل المعاملات إلى تنسيق Order
                  const orderDetails: Partial<Order> = {
                    customerId,
                    notes: notes || reason || ''
                  };
                  await handleProcessReturn(orderDetails);
                }}
                setReturnReason={setReturnReason}
                setReturnNotes={setReturnNotes}
                // دوال الخدمات والاشتراكات - مع wrapper لتحويل التوقيعات
                removeService={(index: number) => removeService(activeTabId, selectedServices[index]?.id)}
                updateServicePrice={(index: number, price: number) => updateServicePrice(activeTabId, selectedServices[index]?.id, price)}
                removeSubscription={(index: number) => removeSubscription(activeTabId, selectedSubscriptions[index]?.id)}
                updateSubscriptionPrice={(index: number, price: number) => updateSubscriptionPrice(activeTabId, selectedSubscriptions[index]?.id, price)}
                // callback لتحديث قائمة العملاء
                onCustomerAdded={(newCustomer) => {
                  // تحديث البيانات من cache إذا أمكن
                  if (refreshData) {
                    refreshData();
                  }
                }}
                // حالة التحميل
                isSubmittingOrder={isSubmittingOrder}
              />
            </div>
          </Suspense>
        </div>
      </div>

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
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        {isReturnMode ? (
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
                  <div className="h-[calc(100%-64px)] overflow-hidden px-2 pb-6 pt-4">
                    <Suspense fallback={<Skeleton className="h-full w-full rounded-lg" />}>
                      <div className="rounded-xl border border-border/40 bg-card shadow-sm">
                        <POSAdvancedCart
                          isReturnMode={isReturnMode}
                          tabs={tabs}
                          activeTab={activeTab}
                          activeTabId={activeTabId}
                          cartItems={cartItems}
                          selectedServices={selectedServices}
                          selectedSubscriptions={selectedSubscriptions}
                          returnItems={returnItems}
                          returnReason={returnReason}
                          returnNotes={returnNotes}
                          customers={customers}
                          currentUser={currentUser}
                          setActiveTabId={setActiveTabId}
                          addTab={addTab}
                          removeTab={removeTab}
                          updateTab={updateTab}
                          updateItemQuantity={updateItemQuantity}
                          updateItemPrice={updateItemPrice}
                          removeItemFromCart={removeItemFromCart}
                          clearCart={clearCart}
                          submitOrder={handleSubmitOrderWithPrint}
                          updateReturnItemQuantity={updateReturnItemQuantity}
                          updateReturnItemPrice={updateReturnItemPrice}
                          removeReturnItem={removeReturnItem}
                          clearReturnCart={clearReturnCart}
                          processReturn={async (customerId?: string, reason?: string, notes?: string) => {
                            const orderDetails: Partial<Order> = {
                              customerId,
                              notes: notes || reason || ''
                            };
                            await handleProcessReturn(orderDetails);
                          }}
                          setReturnReason={setReturnReason}
                          setReturnNotes={setReturnNotes}
                          removeService={(index: number) => removeService(activeTabId, selectedServices[index]?.id)}
                          updateServicePrice={(index: number, price: number) => updateServicePrice(activeTabId, selectedServices[index]?.id, price)}
                          removeSubscription={(index: number) => removeSubscription(activeTabId, selectedSubscriptions[index]?.id)}
                          updateSubscriptionPrice={(index: number, price: number) => updateSubscriptionPrice(activeTabId, selectedSubscriptions[index]?.id, price)}
                          onCustomerAdded={() => {
                            if (refreshData) {
                              refreshData();
                            }
                          }}
                          isSubmittingOrder={isSubmittingOrder}
                        />
                      </div>
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
        onOpenChange={(open) => {
          // لا يمكن إغلاق النافذة إلا بعد بدء الجلسة
          if (!open && hasActiveSession) {
            setShowSessionDialog(false);
          }
        }}
      />

      {/* نافذة اختصارات لوحة المفاتيح */}
      <KeyboardShortcutsDialog
        open={keyboardShortcuts.isHelpOpen}
        onOpenChange={keyboardShortcuts.setIsHelpOpen}
        shortcuts={keyboardShortcuts.shortcuts}
      />

    </POSPureLayout>
  );
};

export default POSAdvanced;
