import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { toast } from "sonner";
import { Product, Order, User as AppUser } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useApps } from '@/context/AppsContext';
import { useTenant } from '@/context/TenantContext';
import { useShop } from '@/context/ShopContext';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

// استيراد Hooks
import useUnifiedPOSData from '@/hooks/useUnifiedPOSData';
import useBarcodeScanner from '@/hooks/useBarcodeScanner';
import { useGlobalBarcodeScanner } from '@/hooks/useGlobalBarcodeScanner';
import { usePOSBarcode } from '@/components/pos/hooks/usePOSBarcode';
import { usePOSCart } from '@/components/pos/hooks/usePOSCart';
import { usePOSReturn } from '@/components/pos/hooks/usePOSReturn';
import { usePOSOrder } from '@/components/pos/hooks/usePOSOrder';

interface CartItem {
  product: Product;
  quantity: number;
  colorId?: string;
  colorName?: string;
  colorCode?: string;
  sizeId?: string;
  sizeName?: string;
  variantPrice?: number;
  variantImage?: string;
  customPrice?: number;
}

// Cache للبيانات الأساسية
const POS_DATA_CACHE = new Map<string, {
  data: any;
  timestamp: number;
  ttl: number;
}>();

const CACHE_TTL = 5 * 60 * 1000; // 5 دقائق

export const usePOSAdvancedState = () => {
  // مراجع لمنع الاستدعاءات المتكررة
  const dataFetchedRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const cacheKeyRef = useRef<string>('');

  // بيانات المصادقة والتطبيقات
  const { user, userProfile } = useAuth();
  const { currentOrganization } = useTenant();
  const { isAppEnabled } = useApps();
  const { addOrder } = useShop();
  
  const isStaff = userProfile?.role === 'admin' || userProfile?.role === 'employee';

  // حالة pagination والبحث
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  // دالة محسنة لجلب البيانات مع cache
  const getCachedData = useCallback((key: string) => {
    const cached = POS_DATA_CACHE.get(key);
    if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
      return cached.data;
    }
    return null;
  }, []);

  const setCachedData = useCallback((key: string, data: any, ttl: number = CACHE_TTL) => {
    POS_DATA_CACHE.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }, []);

  // جلب البيانات الأساسية مع cache محسن
  const {
    products: pagedProducts,
    pagination,
    subscriptions,
    subscriptionCategories,
    productCategories,
    users,
    customers,
    recentOrders,
    inventoryStats,
    orderStats,
    isLoading,
    isRefetching,
    error,
    errorMessage,
    refreshData,
    updateProductStockInCache,
    getProductStock,
    executionTime,
    dataTimestamp
  } = useUnifiedPOSData({
    page: currentPage,
    // استخدم حجم الصفحة الحالي بدل 10000 لتحسين سرعة التحميل
    limit: pageSize,
    search: searchQuery?.trim() || '',
    categoryId: categoryFilter && categoryFilter !== 'all' ? categoryFilter : '',
    staleTime: 20 * 60 * 1000, // 20 دقيقة
    gcTime: 40 * 60 * 1000, // 40 دقيقة
    enabled: !!currentOrganization?.id
  });

  // منع الاستدعاءات المتكررة
  useEffect(() => {
    if (currentOrganization?.id && !dataFetchedRef.current) {
      dataFetchedRef.current = true;
      lastFetchTimeRef.current = Date.now();
      cacheKeyRef.current = `pos_data_${currentOrganization.id}`;
    }
  }, [currentOrganization?.id]);

  // البحث والتقسيم يتمان على مستوى قاعدة البيانات الآن
  const allProducts = useMemo(() => pagedProducts || [], [pagedProducts]);
  const filteredProducts = allProducts;
  const products = allProducts;

  // Hook السكانر
  const {
    searchByBarcode: scanBarcode,
    isLoading: isScannerLoading,
    foundProduct: scannedProduct,
    lastScannedBarcode,
    resetScanner
  } = useBarcodeScanner({
    showNotifications: false
  });

  // تحويل المستخدم الحالي مع cache
  const currentUser: AppUser | null = useMemo(() => {
    if (!user) return null;
    
    const userCacheKey = `user_${user.id}`;
    const cachedUser = getCachedData(userCacheKey);
    
    if (cachedUser) {
      return cachedUser;
    }
    
    const userData = {
      id: userProfile?.id || user.id, // استخدام userProfile.id إذا كان متاحاً
      name: user.user_metadata?.name || 'User',
      email: user.email || '',
      role: 'employee',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      organization_id: user.user_metadata?.organization_id || currentOrganization?.id || ''
    };
    
    setCachedData(userCacheKey, userData, 10 * 60 * 1000); // 10 دقائق
    return userData;
  }, [user, userProfile, currentOrganization, getCachedData, setCachedData]);

  // تحويل العملاء مع cache
  const filteredUsers: AppUser[] = useMemo(() => {
    const customersCacheKey = `customers_${currentOrganization?.id}`;
    const cachedCustomers = getCachedData(customersCacheKey);
    
    if (cachedCustomers) {
      return cachedCustomers;
    }
    
    const usersData = customers.map(customer => ({
      id: customer.id,
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      role: 'customer' as const,
      isActive: true,
      createdAt: new Date(customer.created_at),
      updatedAt: new Date(customer.updated_at || customer.created_at),
      organization_id: customer.organization_id
    }));
    
    setCachedData(customersCacheKey, usersData, 5 * 60 * 1000); // 5 دقائق
    return usersData;
  }, [customers, currentOrganization?.id, getCachedData, setCachedData]);

  // دوال pagination والبحث محسنة
  const handlePageChange = useCallback((page: number) => {
    if (page !== currentPage) {
      setCurrentPage(page);
    }
  }, [currentPage]);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [currentPage]);

  const handleCategoryFilter = useCallback((categoryId: string) => {
    if (categoryId !== categoryFilter) {
      setCategoryFilter(categoryId);
      if (currentPage !== 1) {
        setCurrentPage(1);
      }
    }
  }, [categoryFilter, currentPage]);

  const handlePageSizeChange = useCallback((size: number) => {
    if (size !== pageSize) {
      setPageSize(size);
      if (currentPage !== 1) {
        setCurrentPage(1);
      }
    }
  }, [pageSize, currentPage]);

  // إدارة السلة والطلبات
  const {
    tabs,
    activeTab,
    activeTabId,
    cartItems,
    selectedServices,
    selectedSubscriptions,
    setActiveTabId,
    addTab,
    removeTab,
    updateTab,
    duplicateTab,
    clearEmptyTabs,
    getTabSummary,
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
    assignCustomerToTab
  } = usePOSCart({
    updateProductStockInCache,
    getProductStock,
    products
  });

  const {
    isReturnMode,
    returnItems,
    returnReason,
    returnNotes,
    setReturnReason,
    setReturnNotes,
    addItemToReturnCart,
    addVariantToReturnCart,
    updateReturnItemQuantity,
    updateReturnItemPrice,
    removeReturnItem,
    clearReturnCart,
    toggleReturnMode,
    processReturn
  } = usePOSReturn({
    currentUser,
    currentOrganizationId: currentOrganization?.id,
    updateProductStockInCache,
    refreshPOSData: refreshData
  });

  const {
    currentOrder,
    favoriteProducts,
    isSubmittingOrder,
    setCurrentOrder,
    handleOpenOrder,
    submitOrder
  } = usePOSOrder({
    cartItems,
    selectedServices,
    selectedSubscriptions,
    currentUser,
    addOrder,
    users: filteredUsers,
    orders: recentOrders,
    products,
    updateProductStockInCache,
    refreshProducts: refreshData,
    refreshPOSData: refreshData,
    clearCart
  });

  // دالة submitOrder مخصصة
  const handleSubmitOrder = useCallback(async (
    customerId?: string, 
    notes?: string, 
    discount?: number, 
    discountType?: 'percentage' | 'fixed', 
    amountPaid?: number,
    paymentMethod?: string,
    isPartialPayment?: boolean,
    considerRemainingAsPartial?: boolean
  ) => {
    try {
      // حساب المبالغ الأساسية
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
      
      // حساب التخفيض الأولي
      let initialDiscount = discount || 0;
      if (discountType === 'percentage' && discount > 0) {
        initialDiscount = (subtotal * discount) / 100;
      }
      
      // حساب المجموع النهائي بالتخفيض الأولي
      const initialTotal = Math.max(0, subtotal - initialDiscount);
      
      // حساب المبلغ المدفوع
      const paidAmount = amountPaid !== undefined ? amountPaid : initialTotal;
      
      // ✅ حساب التخفيض والمبالغ المتبقية بشكل صحيح
      let actualDiscount = initialDiscount;
      let finalTotalAfterDiscount = initialTotal;
      let finalRemainingAmount = 0;
      
      if (isPartialPayment && paidAmount < initialTotal) {
        if (considerRemainingAsPartial) {
          // دفع جزئي - المبلغ المتبقي يعتبر دين (يحتاج متابعة)
          finalRemainingAmount = initialTotal - paidAmount;
          finalTotalAfterDiscount = initialTotal;
          // لا يتم إضافة المبلغ المتبقي للتخفيض
        } else {
          // تخفيض إضافي - المبلغ المتبقي يعتبر تخفيض (لا يحتاج متابعة)
          actualDiscount = initialDiscount + (initialTotal - paidAmount);
          finalTotalAfterDiscount = paidAmount;
          finalRemainingAmount = 0;
          
        }
      } else {
        // دفع كامل أو بدون دفع جزئي
        finalTotalAfterDiscount = initialTotal;
        finalRemainingAmount = Math.max(0, initialTotal - paidAmount);
      }
      
      // تحديد حالة الدفع
      let paymentStatus: 'paid' | 'pending' = 'paid';
      if (paidAmount < finalTotalAfterDiscount && considerRemainingAsPartial) {
        paymentStatus = 'pending';
      }

      // التحقق من صحة القيم قبل إنشاء الطلب
      const validatedDiscount = Math.max(0, actualDiscount || 0);
      const validatedSubtotal = Math.max(0, subtotal || 0);
      const validatedTotal = Math.max(0, finalTotalAfterDiscount || 0);

      const orderDetails: Partial<Order> = {
        customerId: customerId,
        notes: notes || '',
        discount: validatedDiscount,
        paymentMethod: paymentMethod || 'cash',
        paymentStatus: paymentStatus,
        subtotal: validatedSubtotal,
        total: validatedTotal,
        // إضافة معلومات الدفع الجزئي
        partialPayment: isPartialPayment && considerRemainingAsPartial ? {
          amountPaid: paidAmount,
          remainingAmount: finalRemainingAmount
        } : undefined,
        considerRemainingAsPartial: isPartialPayment ? considerRemainingAsPartial : undefined
      };

      // إضافة logging للتشخيص

      // حماية البيانات من التعديل
      const frozenOrderDetails = Object.freeze({...orderDetails});

      const result = await submitOrder(frozenOrderDetails);
      
      if (result.orderId) {
        toast.success('تم إنشاء الطلب بنجاح');
        return result;
      } else {
        toast.error('فشل في إنشاء الطلب');
        throw new Error('فشل في إنشاء الطلب');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء إنشاء الطلب');
      throw error;
    }
  }, [cartItems, selectedServices, selectedSubscriptions, submitOrder]);

  // دالة تحديث البيانات مع cache
  const handleRefreshData = useCallback(async () => {
    try {
      // مسح cache عند التحديث
      if (cacheKeyRef.current) {
        POS_DATA_CACHE.delete(cacheKeyRef.current);
      }
      
      await refreshData();
      lastFetchTimeRef.current = Date.now();
      
      toast.success('تم تحديث البيانات بنجاح');
    } catch (error) {
      toast.error('فشل في تحديث البيانات');
    }
  }, [refreshData]);

  return {
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
    
    // دوال السلة
    setActiveTabId,
    addTab,
    removeTab,
    updateTab,
    duplicateTab,
    clearEmptyTabs,
    getTabSummary,
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
    
    // دوال المرتجعات
    setReturnReason,
    setReturnNotes,
    addItemToReturnCart,
    addVariantToReturnCart,
    updateReturnItemQuantity,
    updateReturnItemPrice,
    removeReturnItem,
    clearReturnCart,
    toggleReturnMode,
    processReturn,
    
    // دوال الطلبات
    currentOrder,
    setCurrentOrder,
    handleOpenOrder,
    handleSubmitOrder,
    
    // دوال السكانر
    scanBarcode,
    isScannerLoading,
    barcodeBuffer: lastScannedBarcode,
    
    // دوال التحديث
    refreshData: handleRefreshData,
    updateProductStockInCache,
    getProductStock
  };
};
