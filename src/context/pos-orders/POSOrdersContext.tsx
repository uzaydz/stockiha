// =================================================================
// 🎯 POS Orders Context - Context محسن ومبسط
// =================================================================

import React, { createContext, useContext, useState, useCallback } from 'react';
import { POSOrdersData, POSOrderFilters, POSOrdersDataProviderProps } from './types';
import { 
  usePOSOrderStats,
  usePOSOrders,
  usePOSEmployees,
  useOrganizationSettings,
  useOrganizationSubscriptions,
  usePOSSettings,
  usePOSOrderOperations
} from './hooks';

// =================================================================
// 🔧 Context محسن
// =================================================================

const POSOrdersDataContext = createContext<POSOrdersData | undefined>(undefined);

export const POSOrdersDataProvider: React.FC<POSOrdersDataProviderProps> = ({ 
  children 
}) => {
  // State للفلاتر والصفحات
  const [filters, setFilters] = useState<POSOrderFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  // استخدام الـ hooks المحسنة
  const statsQuery = usePOSOrderStats();
  const ordersQuery = usePOSOrders(currentPage, pageSize, filters);
  const employeesQuery = usePOSEmployees();
  const settingsQuery = useOrganizationSettings();
  const subscriptionsQuery = useOrganizationSubscriptions();
  const posSettingsQuery = usePOSSettings();
  const operations = usePOSOrderOperations();

  // دوال التحديث
  const refreshAll = useCallback(async () => {
    await Promise.all([
      statsQuery.refetch(),
      ordersQuery.refetch(),
      employeesQuery.refetch(),
      settingsQuery.refetch(),
      subscriptionsQuery.refetch(),
      posSettingsQuery.refetch()
    ]);
  }, [statsQuery, ordersQuery, employeesQuery, settingsQuery, subscriptionsQuery, posSettingsQuery]);

  const refreshStats = useCallback(async () => {
    await statsQuery.refetch();
  }, [statsQuery]);

  const refreshOrders = useCallback(async (page?: number, newFilters?: POSOrderFilters) => {
    if (page !== undefined) {
      setCurrentPage(page);
    }
    if (newFilters !== undefined) {
      setFilters(newFilters);
    }
    await ordersQuery.refetch();
  }, [ordersQuery]);

  // دوال الفلترة والصفحات
  const setFiltersCallback = useCallback((newFilters: POSOrderFilters) => {
    setFilters(newFilters);
    setCurrentPage(1); // إعادة تعيين الصفحة عند تغيير الفلاتر
  }, []);

  const setPageCallback = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // حساب البيانات المحسوبة
  const ordersData = ordersQuery.data as { orders: any[]; total: number; hasMore: boolean } | undefined;
  const totalOrders = ordersData?.total || 0;
  const totalPages = Math.ceil(totalOrders / pageSize);
  const hasMore = ordersData?.hasMore || false;

  // تجميع الأخطاء
  const errors = {
    stats: statsQuery.error?.message,
    orders: ordersQuery.error?.message,
    employees: employeesQuery.error?.message
  };

  // تجميع حالات التحميل
  const isLoading = statsQuery.isLoading || ordersQuery.isLoading || employeesQuery.isLoading;

  // قيم Context
  const contextValue: POSOrdersData = {
    // البيانات الأساسية
    stats: statsQuery.data || null,
    orders: ordersData?.orders || [],
    employees: employeesQuery.data || [],
    
    // بيانات pagination
    totalOrders,
    currentPage,
    totalPages,
    hasMore,
    
    // بيانات إضافية
    organizationSettings: settingsQuery.data,
    organizationSubscriptions: subscriptionsQuery.data || [],
    posSettings: posSettingsQuery.data,
    
    // حالات التحميل
    isLoading,
    isStatsLoading: statsQuery.isLoading,
    isOrdersLoading: ordersQuery.isLoading,
    isEmployeesLoading: employeesQuery.isLoading,
    
    // الأخطاء
    errors,
    
    // دوال التحديث
    refreshAll,
    refreshStats,
    refreshOrders,
    
    // دوال الفلترة والصفحات
    setFilters: setFiltersCallback,
    setPage: setPageCallback,
    
    // دوال العمليات
    updateOrderStatus: operations.updateOrderStatus,
    updatePaymentStatus: operations.updatePaymentStatus,
    deleteOrder: operations.deleteOrder,
    updateOrderInCache: operations.updateOrderInCache,
    
    // دوال تحديث المخزون
    refreshProductsCache: operations.refreshProductsCache,
    
    // دوال lazy loading
    fetchOrderDetails: async (orderId: string) => {
      // يمكن تحسين هذا لاحقاً باستخدام hook منفصل
      return [];
    }
  };

  return (
    <POSOrdersDataContext.Provider value={contextValue}>
      {children}
    </POSOrdersDataContext.Provider>
  );
};

// =================================================================
// 🔧 Hook للوصول للـ Context
// =================================================================

export const usePOSOrdersData = (): POSOrdersData => {
  const context = useContext(POSOrdersDataContext);
  if (context === undefined) {
    throw new Error('usePOSOrdersData must be used within a POSOrdersDataProvider');
  }
  return context;
};
