import React from 'react';
import { createLazyComponent } from '../optimization/LazyComponentLoader';

// 🚀 مكونات ثقيلة محملة بطريقة كسولة محسنة

// POS Advanced - أثقل مكون في النظام
export const LazyPOSAdvanced = createLazyComponent(
  () => import('../../pages/POSAdvanced')
);

// Store Editor - محرر المتجر الثقيل
export const LazyStoreEditor = createLazyComponent(
  () => import('../../pages/admin/StoreEditor')
);

// Landing Page Builder - مكون ثقيل جداً
export const LazyLandingPageBuilder = createLazyComponent(
  () => import('../../pages/LandingPageBuilder')
);

// Analytics - تحليلات ثقيلة
export const LazyAnalytics = createLazyComponent(
  () => import('../../pages/dashboard/Analytics')
);

// Financial Analytics - تحليلات مالية ثقيلة
export const LazyFinancialAnalytics = createLazyComponent(
  () => import('../../pages/FinancialAnalytics')
);

// Quick Barcode Print - طباعة الباركود
export const LazyQuickBarcodePrint = createLazyComponent(
  () => import('../../pages/dashboard/QuickBarcodePrintPage')
);

// Product Form - نموذج المنتج
export const LazyProductForm = createLazyComponent(
  () => import('../../pages/ProductForm')
);

// Advanced Description Builder - Skip for now due to export issues
// export const LazyAdvancedDescriptionBuilder = createLazyComponent(
//   () => import('../advanced-description/AdvancedDescriptionBuilder').then(module => ({ default: module.AdvancedDescriptionBuilder }))
// );

// Inventory Management
export const LazyInventory = createLazyComponent(
  () => import('../../pages/dashboard/Inventory')
);

// المكونات الأساسية
export const LazyComponents = {
  POSAdvanced: LazyPOSAdvanced,
  StoreEditor: LazyStoreEditor,
  LandingPageBuilder: LazyLandingPageBuilder,
  Analytics: LazyAnalytics,
  FinancialAnalytics: LazyFinancialAnalytics,
  QuickBarcodePrint: LazyQuickBarcodePrint,
  ProductForm: LazyProductForm,
  // AdvancedDescriptionBuilder: LazyAdvancedDescriptionBuilder,
  Inventory: LazyInventory
};