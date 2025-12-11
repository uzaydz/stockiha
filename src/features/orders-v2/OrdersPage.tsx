/**
 * OrdersPage - صفحة الطلبيات المحسنة
 *
 * الصفحة الرئيسية للطلبيات بعد إعادة الهيكلة.
 * الآن أصبحت الصفحة بسيطة وسهلة القراءة (< 100 سطر)
 * بدلاً من 773 سطر في النسخة القديمة.
 *
 * جميع المنطق تم نقله إلى:
 * - OrdersContext: إدارة الحالة والعمليات
 * - Custom Hooks: منطق الصلاحيات
 * - Components: المكونات الفرعية المنفصلة
 */

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import {
  OrdersProvider,
  useOrders,
  OrdersHeader,
  OrdersStatsCards,
  OrdersFilters,
  OrdersToolbar,
  OrdersTable,
  OrdersDialogs,
} from './index';

/**
 * المكون الداخلي الذي يستخدم الـ Context
 */
const OrdersContent: React.FC = () => {
  const { confirmationAssignmentsMissing, loading, error } = useOrders();

  // Error state
  if (error && !loading) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>خطأ في تحميل الطلبيات</AlertTitle>
          <AlertDescription>
            {error.message || 'حدث خطأ غير متوقع. يرجى تحديث الصفحة والمحاولة مرة أخرى.'}
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
 * المكون الرئيسي الذي يوفر الـ Provider
 */
const OrdersPage: React.FC = () => {
  return (
    <OrdersProvider pageSize={20}>
      <OrdersContent />
    </OrdersProvider>
  );
};

export default OrdersPage;
