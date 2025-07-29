import React, { createContext, useContext, useCallback, useMemo, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { useTenant } from './TenantContext';
import { supabase } from '@/lib/supabase';
import { deduplicateRequest } from '../lib/cache/deduplication';
// processDataInChunks removed for performance optimization

// =================================================================
// 🎯 UnifiedDataContext - التوافق مع النظام القديم
// =================================================================

// إعادة استخدام الواجهات من POSOrdersDataContext
interface POSOrderWithDetails {
  id: string;
  organization_id: string;
  customer_id?: string;
  employee_id?: string;
  slug?: string;
  customer_order_number?: number;
  status: string;
  payment_status: string;
  payment_method: string;
  total: number;
  subtotal: number;
  tax: number;
  discount?: number;
  amount_paid?: number;
  remaining_amount?: number;
  consider_remaining_as_partial?: boolean;
  is_online: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  customer?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  employee?: {
    id: string;
    name: string;
    email: string;
  };
  order_items: {
    id: string;
    product_id: string;
    product_name?: string;
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    is_wholesale: boolean;
    variant_info?: any;
    color_id?: string;
    size_id?: string;
    color_name?: string;
    size_name?: string;
  }[];
  
  // حقول محسوبة
  items_count: number;
  effective_status?: string;
  effective_total?: number;
  original_total?: number;
  has_returns?: boolean;
  is_fully_returned?: boolean;
  total_returned_amount?: number;
  sale_type?: 'product' | 'subscription';
  product_items_count?: number;
  subscription_items_count?: number;
  metadata?: any;
}

interface POSOrderStats {
  total_orders: number;
  total_revenue: number;
  completed_orders: number;
  pending_orders: number;
  pending_payment_orders: number;
  cancelled_orders: number;
  cash_orders: number;
  card_orders: number;
  avg_order_value: number;
  today_orders: number;
  today_revenue: number;
  fully_returned_orders?: number;
  partially_returned_orders?: number;
  total_returned_amount?: number;
  effective_revenue?: number;
  return_rate?: number;
}

interface Employee {
  id: string;
  name: string;
  email: string;
}

// واجهات البيانات الموحدة - متوافقة مع النظام القديم
interface AppInitializationData {
  user: any;
  organization: any;
  organization_settings: any;
  pos_settings: any;
  active_subscription: any;
  organization_apps: any[];
}

interface POSCompleteData {
  settings: any;
  products: any[];
  categories: any[];
  customers: any[];
  employees: Employee[];
  subscription_services: any[];
  stats: {
    total_products: number;
    active_products: number;
    low_stock_products: number;
    out_of_stock_products: number;
    products_with_variants: number;
    total_categories: number;
  };
  subscription_categories: any[];
}

interface POSOrdersDashboard {
  stats: POSOrderStats;
  orders: POSOrderWithDetails[];
  total_count: number;
  employees: Employee[];
  pagination: {
    current_page: number;
    limit: number;
    total_pages: number;
  };
}

interface OrderFilters {
  status?: string;
  payment_status?: string;
  employee_id?: string;
  page?: number;
  limit?: number;
}

interface UnifiedDataContextType {
  // البيانات الأساسية
  appData: AppInitializationData | null;
  posData: POSCompleteData | null;
  ordersData: POSOrdersDashboard | null;
  
  // حالات التحميل
  isAppDataLoading: boolean;
  isPOSDataLoading: boolean;
  isOrdersDataLoading: boolean;
  isAnyLoading: boolean;
  
  // الأخطاء
  appDataError: string | null;
  posDataError: string | null;
  ordersDataError: string | null;
  
  // دوال التحديث
  refreshAppData: () => Promise<void>;
  refreshPOSData: () => Promise<void>;
  refreshOrdersData: (filters?: OrderFilters) => Promise<void>;
  refreshAll: () => Promise<void>;
  
  // دوال التفاعل
  invalidateAppData: () => void;
  invalidatePOSData: () => void;
  invalidateOrdersData: () => void;
  
  // دوال للحصول على تفاصيل الطلبية
  getOrderDetails: (orderId: string) => Promise<any>;
  
  // بيانات مشتقة للسهولة
  currentOrganization: any;
  currentUser: any;
  posSettings: any;
  organizationSettings: any;
}

const UnifiedDataContext = createContext<UnifiedDataContextType | undefined>(undefined);

// =================================================================
// 🔧 دوال جلب البيانات المحسنة - متوافقة مع النظام القديم
// =================================================================

const fetchAppInitializationData = async (userId: string, orgId: string): Promise<AppInitializationData> => {
  return deduplicateRequest(`app-init-${userId}-${orgId}`, async () => {
    try {
      // جلب بيانات المستخدم والمؤسسة
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', userId)
        .eq('organization_id', orgId)
        .single();

      if (userError) throw userError;

      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();

      if (orgError) throw orgError;

      // جلب إعدادات المؤسسة
      const orgSettingsResult = await supabase
        .from('organization_settings')
        .select('*')
        .eq('organization_id', orgId)
        .limit(1);
      const orgSettings = orgSettingsResult.data?.[0] || null;

      // جلب إعدادات POS
      const posSettingsResult = await supabase
        .from('pos_settings')
        .select('*')
        .eq('organization_id', orgId)
        .limit(1);
      const posSettings = posSettingsResult.data?.[0] || null;

      return {
        user: userData,
        organization: orgData,
        organization_settings: orgSettings,
        pos_settings: posSettings,
        active_subscription: null,
        organization_apps: []
      } as AppInitializationData;
    } catch (error) {
      throw error;
    }
  });
};

const fetchPOSCompleteData = async (orgId: string): Promise<POSCompleteData> => {
  return deduplicateRequest(`pos-complete-${orgId}`, async () => {
    try {
      // 🚀 تحسين الأداء: تحميل البيانات بشكل متدرج لتجنب المهام الطويلة
      
      // الخطوة 1: تحميل البيانات الأساسية والسريعة أولاً
      const [categories, employees, posSettings] = await Promise.all([
        // الفئات - استخدام product_categories بدلاً من categories
        supabase
          .from('product_categories')
          .select('*')
          .eq('organization_id', orgId)
          .eq('is_active', true)
          .order('name')
          .limit(50) // تحديد العدد
          .then(({ data }) => data || []),
        
        // الموظفين
        supabase
          .from('users')
          .select('id, name, email, role')
          .eq('organization_id', orgId)
          .eq('is_active', true)
          .order('name')
          .limit(50)
          .then(({ data }) => data || []),

        // إعدادات POS
        supabase
          .from('pos_settings')
          .select('*')
          .eq('organization_id', orgId)
          .limit(1)
          .then((result) => result.data?.[0] || null)
      ]);

      // تأخير قصير لتجنب حجب الواجهة
      await new Promise(resolve => setTimeout(resolve, 10));

             // الخطوة 2: تحميل المنتجات مع تحسين الأداء
       const productsPromise = supabase
         .from('products')
         .select('id, name, price, stock_quantity, is_active, category_id, has_variants')
         .eq('organization_id', orgId)
         .eq('is_active', true)
         .order('name')
                   .limit(20) // تقليل أكثر لتجنب المهام الطويلة
         .then(({ data }) => data || []);
      
      // الخطوة 3: تحميل البيانات الثقيلة بشكل متدرج
      const [products, subscriptions, customers] = await Promise.all([
        productsPromise,
        // الاشتراكات
        supabase
          .from('subscription_services')
          .select('*')
          .eq('organization_id', orgId)
          .eq('is_active', true)
          .limit(30) // تحديد العدد
          .then(({ data }) => data || []),
        
        // العملاء
        supabase
          .from('customers')
          .select('*')
          .eq('organization_id', orgId)
          .limit(50) // تحديد العدد
          .then(({ data }) => data || [])
      ]);

      // تأخير قصير لتجنب حجب الواجهة
      await new Promise(resolve => setTimeout(resolve, 10));

      // الخطوة 4: معالجة البيانات مباشرة (تم إزالة processDataInChunks للأداء)
      const processedProducts = products || [];

      // إحصائيات سريعة مع حماية من الأخطاء
      const safeProducts = Array.isArray(processedProducts) ? processedProducts : [];
      const safeCategories = Array.isArray(categories) ? categories : [];
      
      const stats = {
        total_products: safeProducts.length,
        active_products: safeProducts.filter(p => p && p.is_active).length,
        low_stock_products: safeProducts.filter(p => p && p.stock_quantity < 10).length,
        out_of_stock_products: safeProducts.filter(p => p && p.stock_quantity === 0).length,
        products_with_variants: safeProducts.filter(p => p && p.has_variants).length,
        total_categories: safeCategories.length
      };

      return {
        products,
        categories,
        customers,
        employees: (employees || []) as Employee[],
        settings: posSettings,
        subscription_services: subscriptions,
        subscription_categories: [],
        stats: stats
      } as POSCompleteData;
    } catch (error) {
      throw error;
    }
  });
};

const fetchPOSOrdersDashboard = async (
  orgId: string, 
  filters: OrderFilters = {}
): Promise<POSOrdersDashboard> => {
  const cacheKey = `pos-orders-dashboard-${orgId}-${JSON.stringify(filters)}`;
  
  return deduplicateRequest(cacheKey, async () => {
    try {
      // جلب الإحصائيات - مع fallback في حالة عدم وجود الدالة
      let stats: POSOrderStats;
      
      try {
        const { data: statsData, error: statsError } = await supabase.rpc('get_pos_order_stats', {
          p_organization_id: orgId
        });

        if (statsError) throw statsError;
        stats = Array.isArray(statsData) ? statsData[0] : statsData;
      } catch (rpcError) {
        // fallback: حساب الإحصائيات يدوياً
        const { data: ordersForStats } = await supabase
          .from('orders')
          .select('status, payment_status, payment_method, total, created_at')
          .eq('organization_id', orgId)
          .eq('is_online', false);

        const orders = ordersForStats || [];
        const today = new Date().toISOString().split('T')[0];
        const todayOrders = orders.filter(o => o.created_at?.startsWith(today));

        stats = {
          total_orders: orders.length,
          total_revenue: orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0),
          completed_orders: orders.filter(o => o.status === 'completed').length,
          pending_orders: orders.filter(o => o.status === 'pending').length,
          pending_payment_orders: orders.filter(o => o.payment_status === 'pending').length,
          cancelled_orders: orders.filter(o => o.status === 'cancelled').length,
          cash_orders: orders.filter(o => o.payment_method === 'cash').length,
          card_orders: orders.filter(o => o.payment_method === 'card').length,
          avg_order_value: orders.length > 0 ? orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0) / orders.length : 0,
          today_orders: todayOrders.length,
          today_revenue: todayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0)
        };
      }

      // جلب الطلبيات الحديثة
      let ordersQuery = supabase
        .from('orders')
        .select(`
          id,
          slug,
          customer_order_number,
          status,
          payment_status,
          payment_method,
          total,
          subtotal,
          tax,
          discount,
          amount_paid,
          remaining_amount,
          consider_remaining_as_partial,
          notes,
          created_at,
          updated_at,
          customer_id,
          employee_id,
          metadata,
          customer:customers!orders_customer_id_fkey(
            id,
            name,
            phone,
            email
          ),
          employee:users!orders_employee_id_fkey(
            id,
            name,
            email
          )
        `)
        .eq('organization_id', orgId)
        .eq('is_online', false)
        .order('created_at', { ascending: false });

      // تطبيق الفلاتر
      if (filters.status) {
        ordersQuery = ordersQuery.eq('status', filters.status);
      }
      if (filters.payment_status) {
        ordersQuery = ordersQuery.eq('payment_status', filters.payment_status);
      }
      if (filters.employee_id) {
        ordersQuery = ordersQuery.eq('employee_id', filters.employee_id);
      }

      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const offset = (page - 1) * limit;
      ordersQuery = ordersQuery.range(offset, offset + limit - 1);

      const { data: orders, error: ordersError } = await ordersQuery;

      if (ordersError) throw ordersError;

      // معالجة الطلبيات
      const processedOrders = (orders || []).map(order => ({
        ...order,
        items_count: 0, // سيتم حسابه لاحقاً
        effective_status: order.status,
        effective_total: order.total,
        original_total: order.total,
        has_returns: false,
        is_fully_returned: false,
        total_returned_amount: 0,
        sale_type: 'product' as const,
        product_items_count: 0,
        subscription_items_count: 0
      })) as POSOrderWithDetails[];

      // جلب الموظفين
      const { data: employees } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('organization_id', orgId)
        .eq('is_active', true);

      const totalPages = Math.ceil((stats?.total_orders || 0) / limit);

      return {
        stats,
        orders: processedOrders,
        total_count: stats?.total_orders || 0,
        employees: (employees || []) as Employee[],
        pagination: {
          current_page: page,
          limit,
          total_pages: totalPages
        }
      } as POSOrdersDashboard;
    } catch (error) {
      throw error;
    }
  });
};

const fetchOrderCompleteDetails = async (orderId: string): Promise<any> => {
  return deduplicateRequest(`order-details-${orderId}`, async () => {
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw error;
    }
  });
};

// =================================================================
// 🎯 UnifiedDataProvider Component
// =================================================================

interface UnifiedDataProviderProps {
  children: ReactNode;
}

export const UnifiedDataProvider: React.FC<UnifiedDataProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const { currentOrganization } = useTenant();
  const queryClient = useQueryClient();
  
  // معرفات المؤسسة والمستخدم
  const userId = user?.id;
  const orgId = currentOrganization?.id;
  const [currentFilters, setCurrentFilters] = React.useState<OrderFilters>({});

  // Query للبيانات الأساسية للتطبيق
  const {
    data: appData,
    isLoading: isAppDataLoading,
    error: appDataError,
    refetch: refetchAppData
  } = useQuery({
    queryKey: ['app-initialization', userId, orgId],
    queryFn: () => fetchAppInitializationData(userId!, orgId!),
    enabled: !!userId && !!orgId,
    staleTime: 2 * 60 * 1000, // دقيقتان
    gcTime: 10 * 60 * 1000, // 10 دقائق
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  // Query لبيانات POS الكاملة
  const {
    data: posData,
    isLoading: isPOSDataLoading,
    error: posDataError,
    refetch: refetchPOSData
  } = useQuery({
    queryKey: ['pos-complete-data', orgId],
    queryFn: () => fetchPOSCompleteData(orgId!),
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000, // 5 دقائق
    gcTime: 15 * 60 * 1000, // 15 دقيقة
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: 1500,
  });

  // Query لبيانات الطلبيات
  const {
    data: ordersData,
    isLoading: isOrdersDataLoading,
    error: ordersDataError,
    refetch: refetchOrdersData
  } = useQuery({
    queryKey: ['pos-orders-dashboard', orgId, currentFilters],
    queryFn: () => fetchPOSOrdersDashboard(orgId!, currentFilters),
    enabled: !!orgId,
    staleTime: 1 * 60 * 1000, // دقيقة واحدة
    gcTime: 5 * 60 * 1000, // 5 دقائق
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: 1000,
  });

  // دوال التحديث
  const refreshAppData = useCallback(async () => {
    await refetchAppData();
  }, [refetchAppData]);

  const refreshPOSData = useCallback(async () => {
    await refetchPOSData();
  }, [refetchPOSData]);

  const refreshOrdersData = useCallback(async (filters?: OrderFilters) => {
    if (filters) {
      setCurrentFilters(filters);
    }
    await refetchOrdersData();
  }, [refetchOrdersData]);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refetchAppData(),
      refetchPOSData(),
      refetchOrdersData()
    ]);
  }, [refetchAppData, refetchPOSData, refetchOrdersData]);

  // دوال إلغاء الصحة (invalidation)
  const invalidateAppData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['app-initialization'] });
  }, [queryClient]);

  const invalidatePOSData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['pos-complete-data'] });
  }, [queryClient]);

  const invalidateOrdersData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['pos-orders-dashboard'] });
  }, [queryClient]);

  // دالة للحصول على تفاصيل الطلبية
  const getOrderDetails = useCallback(async (orderId: string) => {
    const cachedData = queryClient.getQueryData(['order-details', orderId]);
    
    if (cachedData) {
      return cachedData;
    }

    const data = await fetchOrderCompleteDetails(orderId);
    
    // تخزين البيانات في الكاش
    queryClient.setQueryData(['order-details', orderId], data);

    return data;
  }, [queryClient]);

  // حساب حالات التحميل والأخطاء
  const isAnyLoading = isAppDataLoading || isPOSDataLoading || isOrdersDataLoading;
  
  const formattedAppDataError = appDataError?.message || null;
  const formattedPosDataError = posDataError?.message || null;
  const formattedOrdersDataError = ordersDataError?.message || null;

  // البيانات المشتقة للسهولة
  const currentUser = appData?.user;
  const posSettings = appData?.pos_settings || posData?.settings;
  const organizationSettings = appData?.organization_settings;

  // قيمة Context
  const contextValue = useMemo<UnifiedDataContextType>(() => ({
    // البيانات الأساسية
    appData,
    posData,
    ordersData,
    
    // حالات التحميل
    isAppDataLoading,
    isPOSDataLoading,
    isOrdersDataLoading,
    isAnyLoading,
    
    // الأخطاء
    appDataError: formattedAppDataError,
    posDataError: formattedPosDataError,
    ordersDataError: formattedOrdersDataError,
    
    // دوال التحديث
    refreshAppData,
    refreshPOSData,
    refreshOrdersData,
    refreshAll,
    
    // دوال التفاعل
    invalidateAppData,
    invalidatePOSData,
    invalidateOrdersData,
    
    // دوال للحصول على تفاصيل الطلبية
    getOrderDetails,
    
    // بيانات مشتقة للسهولة
    currentOrganization,
    currentUser,
    posSettings,
    organizationSettings,
  }), [
    appData, posData, ordersData,
    isAppDataLoading, isPOSDataLoading, isOrdersDataLoading, isAnyLoading,
    formattedAppDataError, formattedPosDataError, formattedOrdersDataError,
    refreshAppData, refreshPOSData, refreshOrdersData, refreshAll,
    invalidateAppData, invalidatePOSData, invalidateOrdersData,
    getOrderDetails,
    currentOrganization, currentUser, posSettings, organizationSettings
  ]);

  return (
    <UnifiedDataContext.Provider value={contextValue}>
      {children}
    </UnifiedDataContext.Provider>
  );
};

// =================================================================
// 🎯 Custom Hook لاستخدام UnifiedData
// =================================================================

export const useUnifiedData = (): UnifiedDataContextType => {
  const context = useContext(UnifiedDataContext);
  if (!context) {
    throw new Error('useUnifiedData must be used within a UnifiedDataProvider');
  }
  return context;
};

// Hooks مخصصة للبيانات المحددة - متوافقة مع النظام القديم
export const useAppData = () => {
  const { appData, isAppDataLoading, appDataError, refreshAppData } = useUnifiedData();
  return { appData, isLoading: isAppDataLoading, error: appDataError, refresh: refreshAppData };
};

export const usePOSData = () => {
  const { posData, isPOSDataLoading, posDataError, refreshPOSData } = useUnifiedData();
  return { 
    posData, 
    isLoading: isPOSDataLoading, 
    error: posDataError, 
    refresh: refreshPOSData,
    // إضافة خصائص للتوافق مع النظام القديم
    products: posData?.products || [],
    categories: posData?.categories || [],
    customers: posData?.customers || [],
    employees: posData?.employees || [],
    settings: posData?.settings,
    stats: posData?.stats
  };
};

export const useOrdersData = () => {
  const { ordersData, isOrdersDataLoading, ordersDataError, refreshOrdersData } = useUnifiedData();
  return { 
    ordersData, 
    isLoading: isOrdersDataLoading, 
    error: ordersDataError, 
    refresh: refreshOrdersData,
    // إضافة خصائص للتوافق مع النظام القديم
    orders: ordersData?.orders || [],
    stats: ordersData?.stats,
    employees: ordersData?.employees || [],
    totalOrders: ordersData?.total_count || 0,
    pagination: ordersData?.pagination
  };
};

export const useCurrentOrganization = () => {
  const { currentOrganization } = useUnifiedData();
  return currentOrganization;
};

export const useCurrentUser = () => {
  const { currentUser } = useUnifiedData();
  return currentUser;
};

export const usePOSSettings = () => {
  const { posSettings } = useUnifiedData();
  return posSettings;
};

export const useOrganizationSettings = () => {
  const { organizationSettings } = useUnifiedData();
  return organizationSettings;
};

export default UnifiedDataProvider;
