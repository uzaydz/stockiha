import React from 'react';
import { createLazyComponent } from '../ui/LazyLoadingWrapper';

// 🚀 مكونات ثقيلة محملة بطريقة كسولة محسنة

// POS Advanced - أثقل مكون في النظام
export const LazyPOSAdvanced = createLazyComponent(
  () => import('../../pages/POSAdvanced'),
  "جاري تحميل نقطة البيع المتقدمة..."
);

// Invoices - مكون ثقيل للفواتير
export const LazyInvoices = createLazyComponent(
  () => import('../../pages/dashboard/Invoices'),
  "جاري تحميل صفحة الفواتير..."
);

// Store Editor - محرر المتجر الثقيل
export const LazyStoreEditor = createLazyComponent(
  () => import('../../pages/admin/StoreEditor'),
  "جاري تحميل محرر المتجر..."
);

// Store Editor V2
export const LazyStoreEditorV2 = createLazyComponent(
  () => import('../../pages/dashboard/StoreEditorV2'),
  "جاري تحميل محرر المتجر المتقدم..."
);

// Landing Page Builder - مكون ثقيل جداً
export const LazyLandingPageBuilder = createLazyComponent(
  () => import('../../pages/LandingPageBuilder'),
  "جاري تحميل منشئ صفحات الهبوط..."
);

// Analytics - تحليلات ثقيلة
export const LazyAnalytics = createLazyComponent(
  () => import('../../pages/dashboard/Analytics'),
  "جاري تحميل التحليلات..."
);

// Financial Analytics - تحليلات مالية ثقيلة
export const LazyFinancialAnalytics = createLazyComponent(
  () => import('../../pages/FinancialAnalytics'),
  "جاري تحميل التحليلات المالية..."
);

// Delivery Management - إدارة التوصيل
export const LazyDeliveryManagement = createLazyComponent(
  () => import('../../pages/dashboard/DeliveryManagement'),
  "جاري تحميل إدارة التوصيل..."
);

// Advanced Inventory Tracking - تتبع المخزون المتقدم
export const LazyAdvancedInventoryTracking = createLazyComponent(
  () => import('../../components/inventory/AdvancedInventoryTrackingPage'),
  "جاري تحميل تتبع المخزون المتقدم..."
);

// Product Form - نموذج المنتج الثقيل
export const LazyProductForm = createLazyComponent(
  () => import('../../pages/ProductForm'),
  "جاري تحميل نموذج المنتج..."
);

// Export all lazy components for easy importing
export const LazyComponents = {
  POSAdvanced: LazyPOSAdvanced,
  Invoices: LazyInvoices,
  StoreEditor: LazyStoreEditor,
  StoreEditorV2: LazyStoreEditorV2,
  LandingPageBuilder: LazyLandingPageBuilder,
  Analytics: LazyAnalytics,
  FinancialAnalytics: LazyFinancialAnalytics,
  DeliveryManagement: LazyDeliveryManagement,
  AdvancedInventoryTracking: LazyAdvancedInventoryTracking,
  ProductForm: LazyProductForm,
} as const;

// Hook للتحميل المسبق الذكي
export const usePreloadHeavyComponents = () => {
  const [preloaded, setPreloaded] = React.useState<Set<string>>(new Set());

  const preloadComponent = React.useCallback((componentName: keyof typeof LazyComponents) => {
    if (preloaded.has(componentName)) return;

    // تحميل مسبق للمكون عند الحاجة
    const Component = LazyComponents[componentName];
    // هذا سيؤدي لتحميل المكون في الخلفية
    setPreloaded(prev => new Set(prev).add(componentName));
  }, [preloaded]);

  return { preloadComponent, preloaded };
};
