import React from 'react';
import { ResponsiveOrdersTable } from './index';
import { Order } from './table/OrderTableTypes';

/**
 * مثال لكيفية استخدام جدول الطلبات المتجاوب الجديد
 * 
 * هذا المكون يعرض تلقائياً:
 * - جدول تقليدي على الكمبيوتر المكتبي
 * - بطاقات متجاوبة على الهاتف والتابلت
 * - إمكانية التبديل اليدوي بين الأوضاع
 */

interface OrdersPageProps {
  orders: Order[];
  loading: boolean;
  // ... باقي الخصائص
}

const OrdersExample: React.FC<OrdersPageProps> = ({
  orders,
  loading,
  ...otherProps
}) => {
  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-right">إدارة الطلبات</h1>
        <p className="text-muted-foreground text-right mt-2">
          عرض متجاوب تلقائياً - جدول للكمبيوتر وبطاقات للهاتف
        </p>
      </div>

      {/* استخدام المكون المتجاوب الجديد */}
      <ResponsiveOrdersTable
        orders={orders}
        loading={loading}
        {...otherProps}
        
        // إعدادات إضافية للعرض المتجاوب
        forceViewMode="auto" // 'auto' | 'table' | 'cards'
        defaultMobileViewMode="grid" // 'grid' | 'list'
        
        // تفعيل التحميل التلقائي للهاتف
        autoLoadMoreOnScroll={true}
        
        // الأعمدة المرئية (ستظهر كلها في البطاقات بتصميم محسن)
        visibleColumns={[
          "checkbox", 
          "expand", 
          "id", 
          "customer_name", 
          "customer_contact", 
          "total", 
          "status", 
          "call_confirmation", 
          "shipping_provider", 
          "actions"
        ]}
      />
    </div>
  );
};

export default OrdersExample;

/**
 * مثال للاستخدام المتقدم - فرض وضع معين
 */
export const OrdersTableForced: React.FC<OrdersPageProps> = (props) => {
  return (
    <ResponsiveOrdersTable
      {...props}
      forceViewMode="cards" // فرض عرض البطاقات حتى على الكمبيوتر
      defaultMobileViewMode="list" // عرض قائمة بدلاً من شبكة
    />
  );
};

/**
 * مثال للاستخدام البسيط - جدول تقليدي فقط
 */
export const OrdersTableOnly: React.FC<OrdersPageProps> = (props) => {
  return (
    <ResponsiveOrdersTable
      {...props}
      forceViewMode="table" // فرض عرض الجدول حتى على الهاتف
    />
  );
};
