/**
 * OrdersV2 - صفحة الطلبيات المحسنة
 *
 * تم إعادة هيكلة هذه الصفحة بالكامل.
 * الآن تستخدم البنية الجديدة في src/features/orders-v2
 *
 * التحسينات:
 * - تقليل من 773 سطر إلى ~50 سطر
 * - فصل المسؤوليات (Context, Hooks, Components)
 * - Type Safety محسن
 * - أداء أفضل مع تقليل re-renders
 * - سهولة الصيانة والتطوير
 */

import React, { useEffect } from 'react';
import Layout from '@/components/Layout';
import { POSSharedLayoutControls } from '@/components/pos-layout/types';
import {
  OrdersProvider,
  useOrders,
  OrdersHeader,
  OrdersStatsCards,
  OrdersFilters,
  OrdersToolbar,
  OrdersTable,
  OrdersDialogs,
} from '@/features/orders-v2';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

// استيراد ملف CSS المخصص لتحسين الأداء
import '@/components/orders/orders-performance.css';

interface OrdersV2Props extends POSSharedLayoutControls {}

/**
 * المكون الداخلي - يستخدم الـ Context
 */
const OrdersContent: React.FC<{
  onRegisterRefresh?: (fn: () => void) => void;
  onLayoutStateChange?: (state: any) => void;
}> = ({ onRegisterRefresh, onLayoutStateChange }) => {
  const {
    confirmationAssignmentsMissing,
    loading,
    error,
    refresh,
    refreshStats,
    displayOrders,
    pagination,
    filters,
    orderCounts,
    orderStats,
  } = useOrders();

  // Register refresh function for parent components (POS integration)
  useEffect(() => {
    if (onRegisterRefresh) {
      onRegisterRefresh(() => {
        refresh();
        refreshStats();
      });
    }
  }, [onRegisterRefresh, refresh, refreshStats]);

  // Update layout state for parent (POS integration)
  useEffect(() => {
    if (onLayoutStateChange) {
      onLayoutStateChange({
        title: 'الطلبيات الإلكترونية',
        itemsCount: displayOrders.length,
        currentPage: pagination.currentPage,
        totalPages: pagination.totalPages,
        activeFilter: filters.status,
        loading,
        stats: {
          pending: orderCounts.pending,
          processing: orderCounts.processing,
          delivered: orderCounts.delivered,
          cancelled: orderCounts.cancelled,
          totalSales: orderStats.totalSales,
        },
      });
    }
  }, [
    onLayoutStateChange,
    displayOrders.length,
    pagination,
    filters.status,
    loading,
    orderCounts,
    orderStats,
  ]);

  // Listen for global refresh events
  useEffect(() => {
    const handler = () => {
      refresh();
      refreshStats();
    };
    window.addEventListener('orders:refresh', handler);
    return () => window.removeEventListener('orders:refresh', handler);
  }, [refresh, refreshStats]);

  // Error state
  if (error && !loading) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>خطأ في تحميل الطلبيات</AlertTitle>
          <AlertDescription>
            {(error as Error).message || 'حدث خطأ غير متوقع. يرجى تحديث الصفحة والمحاولة مرة أخرى.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <OrdersHeader />

      {/* Stats Cards */}
      <OrdersStatsCards />

      {/* Toolbar (Inventory settings, Bulk actions) */}
      <OrdersToolbar />

      {/* Filters */}
      <OrdersFilters />

      {/* Missing Assignments Warning */}
      {confirmationAssignmentsMissing && (
        <Alert variant="destructive" className="border-orange-500/50 bg-orange-500/10">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <AlertTitle className="text-orange-600">تنبيه: جدول التعيينات غير موجود</AlertTitle>
          <AlertDescription className="text-orange-600/80">
            جدول online_order_confirmation_assignments غير موجود في قاعدة البيانات.
            قد تظهر بعض الميزات بشكل غير صحيح.
          </AlertDescription>
        </Alert>
      )}

      {/* Orders Table */}
      <OrdersTable />

      {/* Dialogs (Stop Desk, Bulk Assign) */}
      <OrdersDialogs />
    </div>
  );
};

/**
 * المكون الرئيسي - يوفر الـ Layout والـ Provider
 */
const OrdersV2: React.FC<OrdersV2Props> = ({
  useStandaloneLayout = true,
  onRegisterRefresh,
  onLayoutStateChange,
}) => {
  const content = (
    <OrdersProvider pageSize={20}>
      <OrdersContent
        onRegisterRefresh={onRegisterRefresh}
        onLayoutStateChange={onLayoutStateChange}
      />
    </OrdersProvider>
  );

  // Wrap with Layout if standalone
  if (useStandaloneLayout) {
    return <Layout>{content}</Layout>;
  }

  return content;
};

export default OrdersV2;
