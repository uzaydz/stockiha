import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { toast } from "sonner";
import type { Product, Order } from '@/types/index';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';
import { useAppInitialization } from '@/context/AppInitializationContext';
import { useApps } from '@/context/AppsContext';
// ✨ استخدام الـ context الجديد المحسن - فقط OrdersContext بدلاً من ShopContext الكامل
import { useOrders } from '@/context/shop/ShopContext.new';
// ⚡ استيراد CustomersContext للحصول على العملاء من SQLite مباشرة
import { useCustomers } from '@/context/shop/customers/CustomersContext';
import { useWorkSession } from '@/context/WorkSessionContext';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

// استيراد Hooks
import useUnifiedPOSData from '@/hooks/useUnifiedPOSData';
import usePOSProducts from '@/hooks/usePOSProducts'; // ⚡ v3.0: تحديثات فورية!
import useBarcodeScanner from '@/hooks/useBarcodeScanner';
import { useCategoryData } from '@/hooks/useCategoryData';
import { useGlobalBarcodeScanner } from '@/hooks/useGlobalBarcodeScanner';
import { usePOSBarcode } from '@/components/pos/hooks/usePOSBarcode';
import { usePOSCart } from '@/components/pos/hooks/usePOSCart';
import { usePOSReturn } from '@/components/pos/hooks/usePOSReturn';
import { usePOSOrder } from '@/components/pos/hooks/usePOSOrder';
import { localProductSearchService } from '@/services/LocalProductSearchService';

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
  // === حقول أنواع البيع المتقدمة ===
  sellingUnit?: 'piece' | 'weight' | 'box' | 'meter';
  weight?: number;
  pricePerWeightUnit?: number;
  boxCount?: number;
  boxPrice?: number;
  length?: number;
  pricePerMeter?: number;
}

// دالة مساعدة لحساب إجمالي عنصر في السلة بناءً على نوع البيع
const calculateCartItemTotal = (item: CartItem): number => {
  const sellingUnit = item.sellingUnit || 'piece';
  const product = item.product;
  const customPrice = (item as any).customPrice;

  switch (sellingUnit) {
    case 'weight':
      if (item.weight && (item.pricePerWeightUnit || (product as any).price_per_weight_unit)) {
        return item.weight * (item.pricePerWeightUnit || (product as any).price_per_weight_unit || 0);
      }
      break;
    case 'box':
      if (item.boxCount && (item.boxPrice || (product as any).box_price)) {
        return item.boxCount * (item.boxPrice || (product as any).box_price || 0);
      }
      break;
    case 'meter':
      if (item.length && (item.pricePerMeter || (product as any).price_per_meter)) {
        return item.length * (item.pricePerMeter || (product as any).price_per_meter || 0);
      }
      break;
    default:
      // piece - السعر العادي
      const price = customPrice || item.variantPrice || product.price || 0;
      return price * item.quantity;
  }

  // الافتراضي
  const price = customPrice || item.variantPrice || product.price || 0;
  return price * item.quantity;
};

// ⚡ Cache محسّن للبيانات الأساسية - مع تنظيف تلقائي لمنع تسرب الذاكرة
const POS_DATA_CACHE = new Map<string, {
  data: any;
  timestamp: number;
  ttl: number;
}>();

const CACHE_TTL = 2 * 60 * 1000; // ⚡ 2 دقائق بدلاً من 5
const MAX_POS_CACHE_ENTRIES = 5; // ⚡ حد أقصى للمدخلات
const FORCE_LOCAL_ONLY = true; // تشغيل POS ببيانات PowerSync فقط

// ⚡ دالة تنظيف الكاش لمنع تسرب الذاكرة
const prunePOSCache = () => {
  const now = Date.now();

  // حذف المدخلات المنتهية الصلاحية
  for (const [key, value] of POS_DATA_CACHE.entries()) {
    if (now - value.timestamp > value.ttl) {
      POS_DATA_CACHE.delete(key);
    }
  }

  // إذا تجاوز الحد الأقصى، احذف الأقدم
  if (POS_DATA_CACHE.size > MAX_POS_CACHE_ENTRIES) {
    const entries = [...POS_DATA_CACHE.entries()];
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toDelete = entries.slice(0, entries.length - MAX_POS_CACHE_ENTRIES);
    toDelete.forEach(([key]) => POS_DATA_CACHE.delete(key));
  }
};

// ⚡ تنظيف دوري كل دقيقة - مع حفظ المرجع للتنظيف
let posCacheCleanupInterval: ReturnType<typeof setInterval> | null = null;

if (typeof window !== 'undefined') {
  // تأكد من عدم إنشاء interval مكرر
  if (!posCacheCleanupInterval) {
    posCacheCleanupInterval = setInterval(prunePOSCache, 60 * 1000);
  }

  // ⚡ تنظيف عند إغلاق الصفحة
  window.addEventListener('beforeunload', () => {
    if (posCacheCleanupInterval) {
      clearInterval(posCacheCleanupInterval);
      posCacheCleanupInterval = null;
    }
    POS_DATA_CACHE.clear();
  });
}

export const usePOSAdvancedState = () => {
  // مراجع لمنع الاستدعاءات المتكررة
  const dataFetchedRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const cacheKeyRef = useRef<string>('');

  // بيانات المصادقة والتطبيقات
  const { user, userProfile } = useAuth();
  const { currentOrganization } = useTenant();
  const { isAppEnabled } = useApps();
  // ✨ استخدام addOrder من OrdersContext الجديد فقط - تحسين الأداء بنسبة 85%
  const { addOrder } = useOrders();
  // ⚡ استخدام CustomersContext للحصول على العملاء من SQLite مباشرة (يعمل offline)
  const { state: customersState } = useCustomers();
  const { activeSession, updateSessionLocally } = useWorkSession();

  const isStaff = userProfile?.role === 'admin' || userProfile?.role === 'employee';

  // حالة pagination والبحث
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [useLocalData, setUseLocalData] = useState(true); // ⚡ استخدام البيانات المحلية افتراضياً (ومُجبراً إذا كان FORCE_LOCAL_ONLY)

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

  // ⚡ v3.0: جلب المنتجات بتحديثات فورية (PowerSync Reactive)
  const reactivePOSProductsResult = usePOSProducts({
    page: currentPage,
    limit: pageSize,
    search: searchQuery?.trim() || '',
    categoryId: categoryFilter && categoryFilter !== 'all' ? categoryFilter : '',
    enabled: useLocalData && !!currentOrganization?.id // ⚡ PowerSync متاح دائماً
  });

  const {
    products: localProducts,
    pagination: localPagination,
    isLoading: isLocalLoading,
    isRefetching: isLocalRefetching,
    error: localError,
    refreshData: refreshLocalData,
    invalidateCache: invalidateLocalCache,
    updateProductStockInCache: updateLocalProductStock,
    getProductStock: getLocalProductStock
  } = reactivePOSProductsResult;


  // ⚡ جلب الفئات بشكل مستقل (تعمل دائماً - offline أو online)
  const {
    categories: localCategories,
    isLoadingCategories
  } = useCategoryData({
    organizationId: currentOrganization?.id || ''
  });

  // ⚡ تحديد ما إذا كانت البيانات المحلية فارغة (للتبديل للسيرفر كـ fallback)
  const localDataEmpty = !isLocalLoading && localProducts.length === 0;
  // تعطيل جلب السيرفر عندما يكون العمل Local-Only
  const shouldFetchFromServer = !FORCE_LOCAL_ONLY && !!currentOrganization?.id && (
    !useLocalData ||
    localDataEmpty
  );

  // جلب البيانات الأساسية من السيرفر (للفئات والاشتراكات والعملاء)
  const {
    products: serverProducts,
    pagination: serverPagination,
    subscriptions,
    subscriptionCategories,
    productCategories,
    users,
    customers,
    recentOrders,
    inventoryStats,
    orderStats,
    isLoading: isServerLoading,
    isRefetching: isServerRefetching,
    error: serverError,
    errorMessage,
    refreshData: refreshServerData,
    updateProductStockInCache: updateServerProductStock,
    getProductStock: getServerProductStock,
    executionTime,
    dataTimestamp
  } = useUnifiedPOSData({
    page: currentPage,
    limit: pageSize,
    search: searchQuery?.trim() || '',
    categoryId: categoryFilter && categoryFilter !== 'all' ? categoryFilter : '',
    staleTime: 20 * 60 * 1000, // 20 دقيقة
    gcTime: 40 * 60 * 1000, // 40 دقيقة
    // ⚡ تعطيل جلب السيرفر في وضع Local-Only
    enabled: shouldFetchFromServer
  });

  // في وضع Local-Only، تجاهل أي بيانات قادمة من السيرفر بالكامل
  const effectiveServerProducts = FORCE_LOCAL_ONLY ? [] : (serverProducts || []);
  const effectiveServerPagination = FORCE_LOCAL_ONLY ? null : serverPagination;


  // ⚡ اختيار مصدر البيانات: محلي أولاً، ثم السيرفر
  // ⚠️ ملاحظة: تمت إزالة التحسين القديم (hash) لأنه كان يمنع تحديث UI عند تغيير المخزون
  // الآن نُرجع المنتجات مباشرة - React سيُحسّن بنفسه
  const pagedProducts = useMemo(() => {
    if (useLocalData && localProducts.length > 0) {
      return localProducts;
    }
    if (!FORCE_LOCAL_ONLY && effectiveServerProducts && effectiveServerProducts.length > 0) {
      return effectiveServerProducts;
    }
    return [];
  }, [useLocalData, localProducts, effectiveServerProducts]);

  const pagination = useMemo(() => {
    if (useLocalData && localPagination) {
      return localPagination;
    }
    return FORCE_LOCAL_ONLY ? localPagination : effectiveServerPagination;
  }, [useLocalData, localPagination, serverPagination]);

  // ⚡ دمج الفئات: المحلية أولاً، ثم السيرفر كـ fallback
  const mergedProductCategories = useMemo(() => {
    if (localCategories && localCategories.length > 0) {
      return localCategories.map(cat => ({
        id: cat.id,
        name: cat.name,
        description: cat.description || '',
        type: cat.type || 'product',
        is_active: cat.is_active !== false,
        organization_id: cat.organization_id
      }));
    }

    if (!FORCE_LOCAL_ONLY) {
      return productCategories || [];
    }
    return [];
  }, [localCategories, productCategories]);

  const isLoading = useLocalData ? isLocalLoading : isServerLoading;
  const isRefetching = useLocalData ? isLocalRefetching : isServerRefetching;
  const error = useLocalData ? localError : serverError;

  // ⚡ v3.0: دوال موحدة لتحديث المخزون - تستخدم المصدر المحلي (تحديثات فورية)
  // ⚡ v3.1: إضافة دعم sellingUnit لتحديث الحقل الصحيح (available_length, available_weight, etc)
  const updateProductStockInCache = useCallback((
    productId: string,
    colorId: string | null,
    sizeId: string | null,
    quantityChange: number,
    sellingUnit?: 'piece' | 'weight' | 'meter' | 'box'
  ) => {
    // تحديث في المصدر المحلي (تحديث فوري)
    if (updateLocalProductStock) {
      updateLocalProductStock(productId, colorId, sizeId, quantityChange, sellingUnit);
    }
    // تحديث في السيرفر أيضاً إذا كان متاحاً
    if (!FORCE_LOCAL_ONLY && updateServerProductStock) {
      updateServerProductStock(productId, colorId, sizeId, quantityChange, sellingUnit);
    }
  }, [updateLocalProductStock, updateServerProductStock]);

  const getProductStock = useCallback((
    productId: string,
    colorId?: string,
    sizeId?: string
  ): number => {
    // استخدام المصدر المحلي أولاً
    if (useLocalData && getLocalProductStock) {
      return getLocalProductStock(productId, colorId, sizeId);
    }
    if (!FORCE_LOCAL_ONLY && getServerProductStock) {
      return getServerProductStock(productId, colorId, sizeId);
    }
    return 0;
  }, [useLocalData, getLocalProductStock, getServerProductStock]);

  // دالة تحديث البيانات الموحدة
  const refreshData = useCallback(async () => {
    if (useLocalData) {
      await refreshLocalData();
    }
    if (!FORCE_LOCAL_ONLY) {
      await refreshServerData();
    }
  }, [useLocalData, refreshLocalData, refreshServerData]);

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
  const currentUser: any | null = useMemo(() => {
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

  // ⚡ استخدام العملاء من CustomersContext مباشرة (يعمل offline)
  const filteredUsers: any[] = useMemo(() => {
    // CustomersContext يُرجع العملاء بالفعل بصيغة User، لا حاجة للتحويل
    return customersState.users || [];
  }, [customersState.users]);

  // دوال pagination والبحث محسنة
  const handlePageChange = useCallback((page: number) => {
    if (page !== currentPage) {
      setCurrentPage(page);
    }
  }, [currentPage]);

  // ⚡ Ref لتتبع آخر قيمة بحث - لمنع إعادة الصفحة إلى 1 عند استدعاءات متكررة بنفس القيمة
  const lastSearchQueryRef = useRef(searchQuery);

  const handleSearchChange = useCallback((query: string) => {
    // ⚡ تجاهل إذا كانت نفس القيمة (يمنع الاستدعاءات المتكررة من useDebouncedSearch)
    if (query === lastSearchQueryRef.current) {
      return;
    }

    lastSearchQueryRef.current = query;
    setSearchQuery(query);

    // ⚡ إعادة الصفحة إلى 1 فقط عند تغيير البحث فعلياً (ليس عند التهيئة)
    if (currentPage !== 1 && query !== '') {
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
    assignCustomerToTab,
    updateItemSaleType,
    getItemPricingOptions,
    calculateItemPrice,
    // ⚡ دوال أنواع البيع المتقدمة
    updateItemSellingUnit,
    updateItemWeight,
    updateItemBoxCount,
    updateItemLength,
    updateItemFullConfig,
    getItemSellingUnits,
    calculateItemTotal,
    // ⚡ دوال الدفعات والأرقام التسلسلية
    updateItemBatch,
    updateItemSerialNumbers,
    validateItemRequirements,
    validateCartRequirements
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
    processReturn,
    // ⚡ دوال أنواع البيع المتقدمة للإرجاع
    updateReturnItemWeight,
    updateReturnItemBoxCount,
    updateReturnItemLength,
    updateReturnItemSellingUnit,
    updateReturnItemSaleType,
    updateReturnItemFullConfig,
    calculateReturnItemTotal
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
      // حساب المبالغ الأساسية - مع دعم أنواع البيع المتقدمة (متر، وزن، علبة)
      const cartSubtotal = cartItems.reduce((total, item) => {
        return total + calculateCartItemTotal(item);
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
        
        // تحديث جلسة العمل إذا كانت نشطة
        if (activeSession) {
          const isCashPayment = (paymentMethod || 'cash') === 'cash';
          const cashAmount = isCashPayment ? (amountPaid !== undefined ? amountPaid : validatedTotal) : 0;
          const cardAmount = !isCashPayment ? (amountPaid !== undefined ? amountPaid : validatedTotal) : 0;
          
          updateSessionLocally({
            total_sales: activeSession.total_sales + validatedTotal,
            total_orders: activeSession.total_orders + 1,
            cash_sales: activeSession.cash_sales + cashAmount,
            card_sales: activeSession.card_sales + cardAmount,
          });
        }
        
        return result;
      } else {
        toast.error('فشل في إنشاء الطلب');
        throw new Error('فشل في إنشاء الطلب');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء إنشاء الطلب');
      throw error;
    }
  }, [cartItems, selectedServices, selectedSubscriptions, submitOrder, activeSession, updateSessionLocally]);

  // دالة تحديث البيانات مع cache
  // ⚡ توحيد مسار القراءة: المزامنة تحدث في الخلفية، ثم إعادة تحميل من SQLite
  const handleRefreshData = useCallback(async () => {
    try {
      // مسح cache عند التحديث
      if (cacheKeyRef.current) {
        POS_DATA_CACHE.delete(cacheKeyRef.current);
      }
      
      // ⚡ الخطوة 1: مزامنة البيانات من السيرفر إلى SQLite
      if (currentOrganization?.id) {
        const { syncPOSDataFromServer } = await import('@/services/posDataSyncService');
        const syncResult = await syncPOSDataFromServer({
          organizationId: currentOrganization.id,
          page: currentPage,
          limit: pageSize,
          search: searchQuery?.trim() || undefined,
          categoryId: categoryFilter && categoryFilter !== 'all' ? categoryFilter : undefined
        });
        
        if (!syncResult.success) {
          console.warn('[usePOSAdvancedState] ⚠️ فشلت مزامنة بيانات POS:', syncResult.error);
          // نكمل رغم الفشل - قد تكون البيانات المحلية كافية
        }
      }
      
      // ⚡ الخطوة 2: إعادة تحميل البيانات من SQLite
      if (useLocalData) {
        invalidateLocalCache();
      }
      await refreshData();
      lastFetchTimeRef.current = Date.now();
      
      toast.success('تم تحديث البيانات بنجاح');
    } catch (error) {
      console.error('[usePOSAdvancedState] ❌ خطأ في تحديث البيانات:', error);
      toast.error('فشل في تحديث البيانات');
    }
  }, [refreshData, useLocalData, invalidateLocalCache, currentOrganization?.id, currentPage, pageSize, searchQuery, categoryFilter]);

  // ⚡ دالة للتبديل بين المصدر المحلي والسيرفر
  const toggleDataSource = useCallback(() => {
    if (FORCE_LOCAL_ONLY) {
      toast.info('الوضع المحلي فقط مفعل (PowerSync)');
      return;
    }
    setUseLocalData(prev => !prev);
    toast.info(useLocalData ? 'تم التبديل للسيرفر' : 'تم التبديل للبيانات المحلية');
  }, [useLocalData]);

  return {
    // البيانات الأساسية
    allProducts,
    products,
    filteredProducts,
    pagination,
    subscriptions,
    subscriptionCategories,
    productCategories: mergedProductCategories, // ⚡ استخدام الفئات المدمجة (محلية أولاً)
    customers: filteredUsers, // ⚡ استخدام filteredUsers بدلاً من customers الخام
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

    // دوال الجملة والتسعير
    updateItemSaleType,
    getItemPricingOptions,
    calculateItemPrice,

    // ⚡ دوال أنواع البيع المتقدمة (وزن/كرتون/متر)
    updateItemSellingUnit,
    updateItemWeight,
    updateItemBoxCount,
    updateItemLength,
    updateItemFullConfig,
    getItemSellingUnits,
    calculateItemTotal,

    // ⚡ دوال الدفعات والأرقام التسلسلية
    updateItemBatch,
    updateItemSerialNumbers,
    validateItemRequirements,
    validateCartRequirements,

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
    // ⚡ دوال أنواع البيع المتقدمة للإرجاع
    updateReturnItemWeight,
    updateReturnItemBoxCount,
    updateReturnItemLength,
    updateReturnItemSellingUnit,
    updateReturnItemSaleType,
    updateReturnItemFullConfig,
    calculateReturnItemTotal,
    
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
    getProductStock,

    // ⚡ معلومات مصدر البيانات
    useLocalData,
    toggleDataSource,
    dataSource: useLocalData ? 'local' : 'server'
  };
};
