import React, { createContext, useContext, useCallback, useMemo, useState, useEffect } from 'react';
import { unifiedCache } from '@/lib/unified-cache-system';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTenant } from '@/context/TenantContext';
import { supabase } from '@/lib/supabase';
import { getAllAnalytics, AnalyticsPeriod } from '@/lib/api/analytics';
import { getProducts, Product as APIProduct } from '@/lib/api/products';
import { getOrders } from '@/lib/api/orders';
import { DashboardStats, Order } from '@/types';

// أنواع البيانات المطلوبة للوحة التحكم
interface OnlineOrder {
  id: string;
  customer_order_number: string | number;
  customer_name?: string;
  customer_phone?: string;
  status: string;
  payment_status: string;
  total: number;
  created_at: string;
  items?: OnlineOrderItem[];
}

interface OnlineOrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface ProvinceData {
  province_name: string;
  province_id: string;
  order_count: number;
  total_revenue: number;
  avg_order_value: number;
}

interface OrderHeatmapData {
  hour: number;
  count: number;
}

// Context للبيانات الشاملة
interface DashboardData {
  // البيانات الأساسية
  stats: DashboardStats | null;
  products: APIProduct[];
  orders: Order[];
  
  // بيانات الطلبات الأونلاين
  onlineOrders: OnlineOrder[];
  
  // بيانات التحليلات
  provinceData: ProvinceData[];
  orderHeatmapData: OrderHeatmapData[];
  
  // حالات التحميل والأخطاء
  isLoading: boolean;
  isStatsLoading: boolean;
  isProductsLoading: boolean;
  isOrdersLoading: boolean;
  isOnlineOrdersLoading: boolean;
  isProvinceDataLoading: boolean;
  isHeatmapLoading: boolean;
  
  errors: {
    stats?: string;
    products?: string;
    orders?: string;
    onlineOrders?: string;
    provinceData?: string;
    heatmap?: string;
  };
  
  // وظائف التحديث
  refreshData: () => void;
  refreshStats: () => void;
}

const DashboardDataContext = createContext<DashboardData | undefined>(undefined);

// خريطة للطلبات المعلقة لمنع التكرار
const pendingRequests = new Map<string, Promise<any>>();

// دالة مساعدة لمنع طلبات مكررة (Promise Deduplication)
function deduplicateRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key) as Promise<T>;
  }
  
  const promise = requestFn().finally(() => {
    pendingRequests.delete(key);
  });
  
  pendingRequests.set(key, promise);
  return promise;
}

// دوال جلب البيانات المحسنة
const fetchDashboardStats = async (orgId: string, period: AnalyticsPeriod): Promise<DashboardStats> => {
  return deduplicateRequest(`dashboard-stats-${orgId}-${period}`, async () => {
    try {
      // استخدام getAllAnalytics بدلاً من getDashboardStats
      const analyticsData = await getAllAnalytics(orgId, period);
      
      // تحويل بيانات التحليلات إلى تنسيق DashboardStats
      const dashboardStats: DashboardStats = {
        sales: {
          daily: period === 'day' ? analyticsData.totalSales : analyticsData.totalSales / 30,
          weekly: period === 'week' ? analyticsData.totalSales : analyticsData.totalSales / 4,
          monthly: period === 'month' ? analyticsData.totalSales : analyticsData.totalSales,
          annual: period === 'year' ? analyticsData.totalSales : analyticsData.totalSales * 12
        },
        revenue: {
          daily: period === 'day' ? analyticsData.totalSales : analyticsData.totalSales / 30,
          weekly: period === 'week' ? analyticsData.totalSales : analyticsData.totalSales / 4,
          monthly: period === 'month' ? analyticsData.totalSales : analyticsData.totalSales,
          annual: period === 'year' ? analyticsData.totalSales : analyticsData.totalSales * 12
        },
        profits: {
          daily: period === 'day' ? analyticsData.totalProfit : analyticsData.totalProfit / 30,
          weekly: period === 'week' ? analyticsData.totalProfit : analyticsData.totalProfit / 4,
          monthly: period === 'month' ? analyticsData.totalProfit : analyticsData.totalProfit,
          annual: period === 'year' ? analyticsData.totalProfit : analyticsData.totalProfit * 12
        },
        orders: {
          total: analyticsData.totalOrders,
          pending: Math.round(analyticsData.totalOrders * 0.1),
          processing: Math.round(analyticsData.totalOrders * 0.2),
          completed: Math.round(analyticsData.totalOrders * 0.7)
        },
        inventory: {
          totalProducts: analyticsData.inventory.totalItems,
          lowStock: analyticsData.inventory.lowStock,
          outOfStock: analyticsData.inventory.outOfStock
        },
        customers: {
          total: 0, // سيتم تحديثه لاحقاً
          new: 0    // سيتم تحديثه لاحقاً
        }
      };
      
      return dashboardStats;
    } catch (error) {
      // إرجاع بيانات فارغة في حالة الخطأ
      return {
        sales: { daily: 0, weekly: 0, monthly: 0, annual: 0 },
        revenue: { daily: 0, weekly: 0, monthly: 0, annual: 0 },
        profits: { daily: 0, weekly: 0, monthly: 0, annual: 0 },
        orders: { total: 0, pending: 0, processing: 0, completed: 0 },
        inventory: { totalProducts: 0, lowStock: 0, outOfStock: 0 },
        customers: { total: 0, new: 0 }
      };
    }
  });
};

const fetchProducts = async (orgId: string): Promise<APIProduct[]> => {
  return deduplicateRequest(`products-${orgId}`, async () => {
    try {
      return await getProducts(orgId) || [];
    } catch (error) {
      return [];
    }
  });
};

const fetchOrders = async (orgId: string): Promise<Order[]> => {
  return deduplicateRequest(`orders-${orgId}`, async () => {
    try {
      const supabaseOrders = await getOrders(orgId) || [];
      return supabaseOrders.map(order => ({
        id: order.id,
        customerId: order.customer_id,
        items: [],
        subtotal: order.subtotal,
        tax: order.tax,
        discount: order.discount || 0,
        total: order.total,
        status: order.status as any,
        paymentMethod: order.payment_method,
        paymentStatus: order.payment_status as any,
        notes: order.notes || '',
        isOnline: order.is_online,
        createdAt: new Date(order.created_at),
        updatedAt: new Date(order.updated_at)
      })) as Order[];
    } catch (error) {
      return [];
    }
  });
};

const fetchOnlineOrders = async (orgId: string, limit: number = 5): Promise<OnlineOrder[]> => {
  return deduplicateRequest(`online-orders-${orgId}-${limit}`, async () => {
    try {
      const { data: ordersData, error } = await supabase
        .from('online_orders')
        .select(`
          *,
          items:online_order_items(*)
        `)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return ordersData || [];
    } catch (error) {
      return [];
    }
  });
};

const fetchProvinceData = async (orgId: string, limit: number = 5): Promise<ProvinceData[]> => {
  return deduplicateRequest(`province-data-${orgId}-${limit}`, async () => {
    try {
      // جلب بيانات الولايات باللغة العربية
      const { data: provinceData, error: provinceError } = await supabase
        .from('yalidine_provinces_global')
        .select('id, name_ar');
        
      if (provinceError) throw provinceError;
      
      // إنشاء خريطة الولايات
      const provinceNames: Record<string, string> = {};
      provinceData?.forEach(province => {
        if (province && province.id !== null && province.name_ar) {
          provinceNames[province.id.toString()] = province.name_ar;
        }
      });
      
      // جلب بيانات الطلبات
      const { data: ordersData, error: ordersError } = await supabase
        .from('online_orders_view')
        .select('province, total')
        .eq('organization_id', orgId)
        .not('province', 'is', null);
      
      if (ordersError) throw ordersError;
      
      // معالجة البيانات وتجميعها
      const provinceMap = new Map<string, { count: number, revenue: number }>();
      
      ordersData?.forEach(order => {
        if (!order.province) return;
        
        const key = order.province;
        const existing = provinceMap.get(key) || { count: 0, revenue: 0 };
        
        provinceMap.set(key, {
          count: existing.count + 1,
          revenue: existing.revenue + (parseFloat(order.total?.toString() || '0') || 0)
        });
      });
      
      // تحويل البيانات إلى مصفوفة وترتيبها
      const processedData: ProvinceData[] = Array.from(provinceMap.entries())
        .map(([province, stats]) => {
          let provinceName = province;
          
          if (/^\d+$/.test(province) && provinceNames[province]) {
            provinceName = provinceNames[province];
          }
          
          return {
            province_name: provinceName,
            province_id: province,
            order_count: stats.count,
            total_revenue: stats.revenue,
            avg_order_value: stats.revenue / stats.count
          };
        })
        .sort((a, b) => b.order_count - a.order_count)
        .slice(0, limit);
      
      return processedData;
    } catch (error) {
      return [];
    }
  });
};

const fetchOrderHeatmapData = async (orgId: string): Promise<OrderHeatmapData[]> => {
  return deduplicateRequest(`order-heatmap-${orgId}`, async () => {
    try {
      const { data, error } = await supabase
        .from('online_orders_view')
        .select('created_at')
        .eq('organization_id', orgId)
        .not('created_at', 'is', null);
      
      if (error) throw error;
      
      // تجميع البيانات حسب الساعة
      const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        count: 0
      }));
      
      data?.forEach(order => {
        if (order.created_at) {
          const hour = new Date(order.created_at).getHours();
          hourlyData[hour].count++;
        }
      });
      
      return hourlyData;
    } catch (error) {
      return Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
    }
  });
};

interface DashboardDataProviderProps {
  children: React.ReactNode;
  period?: AnalyticsPeriod;
}

export const DashboardDataProvider: React.FC<DashboardDataProviderProps> = ({ 
  children, 
  period = 'month' 
}) => {
  const { currentOrganization } = useTenant();
  const queryClient = useQueryClient();
  const orgId = currentOrganization?.id;

  // تأخير بسيط لتجنب التحميل المتزامن مع مكونات أخرى
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    if (orgId) {
      // تأخير أطول لإعطاء الأولوية لطلبات أخرى مهمة
      const timeoutId = setTimeout(() => {
        setIsInitialized(true);
      }, 500); // زيادة التأخير إلى 500ms
      
      return () => clearTimeout(timeoutId);
    }
  }, [orgId]);

  // React Query لجلب الإحصائيات - أولوية عالية
  const {
    data: stats,
    isLoading: isStatsLoading,
    error: statsError
  } = useQuery({
    queryKey: ['dashboard-stats', orgId, period],
    queryFn: () => fetchDashboardStats(orgId!, period),
    enabled: !!orgId && isInitialized,
    staleTime: 30 * 60 * 1000, // زيادة إلى 30 دقيقة
    gcTime: 2 * 60 * 60 * 1000, // زيادة إلى ساعتين
    refetchOnWindowFocus: false, // منع إعادة التحميل عند التركيز
    refetchOnMount: false, // منع إعادة التحميل عند mount إذا كانت البيانات موجودة
    refetchInterval: false, // إيقاف التحديث التلقائي
  });

  // React Query لجلب المنتجات - تأخير أكبر وأولوية أقل
  const {
    data: products,
    isLoading: isProductsLoading,
    error: productsError
  } = useQuery({
    queryKey: ['dashboard-products', orgId],
    queryFn: () => fetchProducts(orgId!),
    enabled: !!orgId && isInitialized,
    staleTime: 60 * 60 * 1000, // ساعة واحدة
    gcTime: 4 * 60 * 60 * 1000, // 4 ساعات
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
  });

  // React Query لجلب الطلبات - تأخير أكبر
  const {
    data: orders,
    isLoading: isOrdersLoading,
    error: ordersError
  } = useQuery({
    queryKey: ['dashboard-orders', orgId],
    queryFn: () => fetchOrders(orgId!),
    enabled: !!orgId && isInitialized,
    staleTime: 30 * 60 * 1000, // 30 دقيقة
    gcTime: 2 * 60 * 60 * 1000, // ساعتان
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
  });

  // React Query لجلب الطلبات الأونلاين - تأخير إضافي
  const {
    data: onlineOrders,
    isLoading: isOnlineOrdersLoading,
    error: onlineOrdersError
  } = useQuery({
    queryKey: ['dashboard-online-orders', orgId],
    queryFn: () => fetchOnlineOrders(orgId!),
    enabled: !!orgId && isInitialized,
    staleTime: 15 * 60 * 1000, // 15 دقيقة
    gcTime: 60 * 60 * 1000, // ساعة واحدة
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
  });

  // React Query لجلب بيانات الولايات - أولوية منخفضة
  const {
    data: provinceData,
    isLoading: isProvinceDataLoading,
    error: provinceDataError
  } = useQuery({
    queryKey: ['dashboard-province-data', orgId],
    queryFn: () => fetchProvinceData(orgId!),
    enabled: !!orgId && isInitialized,
    staleTime: 2 * 60 * 60 * 1000, // ساعتان
    gcTime: 8 * 60 * 60 * 1000, // 8 ساعات
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
  });

  // React Query لجلب بيانات الخريطة الحرارية - أولوية منخفضة
  const {
    data: orderHeatmapData,
    isLoading: isHeatmapLoading,
    error: heatmapError
  } = useQuery({
    queryKey: ['dashboard-heatmap', orgId],
    queryFn: () => fetchOrderHeatmapData(orgId!),
    enabled: !!orgId && isInitialized,
    staleTime: 4 * 60 * 60 * 1000, // 4 ساعات
    gcTime: 12 * 60 * 60 * 1000, // 12 ساعة
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
  });

  // دوال التحديث
  const refreshData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  }, [queryClient]);

  const refreshStats = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
  }, [queryClient]);

  // حساب حالة التحميل الإجمالية
  const isLoading = isStatsLoading || isProductsLoading || isOrdersLoading;

  // جمع الأخطاء
  const errors = useMemo(() => ({
    stats: statsError?.message,
    products: productsError?.message,
    orders: ordersError?.message,
    onlineOrders: onlineOrdersError?.message,
    provinceData: provinceDataError?.message,
    heatmap: heatmapError?.message,
  }), [statsError, productsError, ordersError, onlineOrdersError, provinceDataError, heatmapError]);

  // قيمة Context
  const contextValue = useMemo<DashboardData>(() => ({
    // البيانات
    stats: stats || null,
    products,
    orders,
    onlineOrders,
    provinceData,
    orderHeatmapData,
    
    // حالات التحميل
    isLoading,
    isStatsLoading,
    isProductsLoading,
    isOrdersLoading,
    isOnlineOrdersLoading,
    isProvinceDataLoading,
    isHeatmapLoading,
    
    // الأخطاء
    errors,
    
    // الوظائف
    refreshData,
    refreshStats,
  }), [
    stats, products, orders, onlineOrders, provinceData, orderHeatmapData,
    isLoading, isStatsLoading, isProductsLoading, isOrdersLoading, 
    isOnlineOrdersLoading, isProvinceDataLoading, isHeatmapLoading,
    errors, refreshData, refreshStats
  ]);

  return (
    <DashboardDataContext.Provider value={contextValue}>
      {children}
    </DashboardDataContext.Provider>
  );
};

// Hook لاستخدام البيانات
export const useDashboardData = (): DashboardData => {
  const context = useContext(DashboardDataContext);
  if (context === undefined) {
    throw new Error('useDashboardData must be used within a DashboardDataProvider');
  }
  return context;
};

// Hooks محددة لأجزاء البيانات
export const useDashboardStats = () => {
  const { stats, isStatsLoading, errors, refreshStats } = useDashboardData();
  return { stats, isLoading: isStatsLoading, error: errors.stats, refresh: refreshStats };
};

export const useDashboardProducts = () => {
  const { products, isProductsLoading, errors } = useDashboardData();
  return { products, isLoading: isProductsLoading, error: errors.products };
};

export const useDashboardOrders = () => {
  const { orders, isOrdersLoading, errors } = useDashboardData();
  return { orders, isLoading: isOrdersLoading, error: errors.orders };
};

export const useDashboardOnlineOrders = () => {
  const { onlineOrders, isOnlineOrdersLoading, errors } = useDashboardData();
  return { onlineOrders, isLoading: isOnlineOrdersLoading, error: errors.onlineOrders };
};

export const useDashboardProvinceData = () => {
  const { provinceData, isProvinceDataLoading, errors } = useDashboardData();
  return { provinceData, isLoading: isProvinceDataLoading, error: errors.provinceData };
};

export const useDashboardHeatmap = () => {
  const { orderHeatmapData, isHeatmapLoading, errors } = useDashboardData();
  return { orderHeatmapData, isLoading: isHeatmapLoading, error: errors.heatmap };
};
