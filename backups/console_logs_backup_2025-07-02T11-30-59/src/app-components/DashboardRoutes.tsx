import React, { Suspense } from 'react';
import { Route } from 'react-router-dom';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import RequireTenant from '../components/auth/RequireTenant';
import SubscriptionCheck from '../components/subscription/SubscriptionCheck';
import PermissionGuard from '../components/auth/PermissionGuard';
import ConditionalRoute from '../components/ConditionalRoute';
import POSOrdersWrapper from '../components/pos/POSOrdersWrapper';
import * as LazyRoutes from './LazyRoutes';
import { PageLoader } from './RouteComponents';

// ============ مسارات لوحة التحكم المكتملة ============
export const DashboardRoutes = () => (
  <>
    <Route element={<ProtectedRoute />}>
      <Route element={<RequireTenant />}>
        {/* لوحة التحكم الرئيسية */}
        <Route path="/dashboard" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل لوحة التحكم..." />}>
              <LazyRoutes.Dashboard />
            </Suspense>
          </SubscriptionCheck>
        } />
        
        {/* المنتجات والمخزون */}
        <Route path="/dashboard/products" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل المنتجات..." />}>
              <LazyRoutes.Products />
            </Suspense>
          </SubscriptionCheck>
        } />
        
        <Route path="/dashboard/inventory" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل المخزون..." />}>
              <LazyRoutes.Inventory />
            </Suspense>
          </SubscriptionCheck>
        } />
        
        <Route path="/dashboard/categories" element={
          <SubscriptionCheck>
            <PermissionGuard requiredPermissions={['manageProductCategories']}>
              <Suspense fallback={<PageLoader message="جاري تحميل الفئات..." />}>
                <LazyRoutes.Categories />
              </Suspense>
            </PermissionGuard>
          </SubscriptionCheck>
        } />
        
        {/* المبيعات والطلبات */}
        <Route path="/dashboard/sales" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل المبيعات..." />}>
              <LazyRoutes.OptimizedSales />
            </Suspense>
          </SubscriptionCheck>
        } />
        
        <Route path="/dashboard/orders" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل الطلبات..." />}>
              <LazyRoutes.Orders />
            </Suspense>
          </SubscriptionCheck>
        } />
        
        <Route path="/dashboard/abandoned-orders" element={
          <SubscriptionCheck>
            <PermissionGuard requiredPermissions={['viewOrders']}>
              <Suspense fallback={<PageLoader message="جاري تحميل الطلبات المهجورة..." />}>
                <LazyRoutes.AbandonedOrders />
              </Suspense>
            </PermissionGuard>
          </SubscriptionCheck>
        } />
        
        {/* العملاء والديون */}
        <Route path="/dashboard/customers" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل العملاء..." />}>
              <LazyRoutes.Customers />
            </Suspense>
          </SubscriptionCheck>
        } />
        
        <Route path="/dashboard/customer-debts" element={
          <ConditionalRoute appId="pos-system">
            <SubscriptionCheck>
              <Suspense fallback={<PageLoader message="جاري تحميل ديون العملاء..." />}>
                <LazyRoutes.CustomerDebts />
              </Suspense>
            </SubscriptionCheck>
          </ConditionalRoute>
        } />
        
        <Route path="/dashboard/customer-debt-details/:customerId" element={
          <ConditionalRoute appId="pos-system">
            <PermissionGuard requiredPermissions={['viewDebts']}>
              <Suspense fallback={<PageLoader message="جاري تحميل تفاصيل الديون..." />}>
                <LazyRoutes.CustomerDebtDetails />
              </Suspense>
            </PermissionGuard>
          </ConditionalRoute>
        } />
        
        <Route path="/dashboard/payment-history" element={
          <PermissionGuard requiredPermissions={['viewFinancialReports']}>
            <Suspense fallback={<PageLoader message="جاري تحميل تاريخ المدفوعات..." />}>
              <LazyRoutes.PaymentHistory />
            </Suspense>
          </PermissionGuard>
        } />
        
        {/* الموظفين */}
        <Route path="/dashboard/employees" element={
          <SubscriptionCheck>
            <PermissionGuard requiredPermissions={['viewEmployees']}>
              <Suspense fallback={<PageLoader message="جاري تحميل الموظفين..." />}>
                <LazyRoutes.Employees />
              </Suspense>
            </PermissionGuard>
          </SubscriptionCheck>
        } />
        
        <Route path="/dashboard/order-distribution" element={
          <SubscriptionCheck>
            <PermissionGuard requiredPermissions={['manageEmployees']}>
              <Suspense fallback={<PageLoader message="جاري تحميل توزيع الطلبات..." />}>
                <LazyRoutes.OrderDistributionSettings />
              </Suspense>
            </PermissionGuard>
          </SubscriptionCheck>
        } />
        
        {/* المالية والتقارير */}
        <Route path="/dashboard/expenses" element={
          <SubscriptionCheck>
            <PermissionGuard requiredPermissions={['viewFinancialReports']}>
              <Suspense fallback={<PageLoader message="جاري تحميل المصروفات..." />}>
                <LazyRoutes.Expenses />
              </Suspense>
            </PermissionGuard>
          </SubscriptionCheck>
        } />
        
        <Route path="/dashboard/analytics" element={
          <SubscriptionCheck>
            <PermissionGuard requiredPermissions={['viewSalesReports']}>
              <Suspense fallback={<PageLoader message="جاري تحميل التحليلات..." />}>
                <LazyRoutes.Analytics />
              </Suspense>
            </PermissionGuard>
          </SubscriptionCheck>
        } />
        
        <Route path="/dashboard/invoices" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل الفواتير..." />}>
              <LazyRoutes.Invoices />
            </Suspense>
          </SubscriptionCheck>
        } />
        
        <Route path="/dashboard/reports" element={
          <SubscriptionCheck>
            <PermissionGuard requiredPermissions={['viewFinancialReports']}>
              <Suspense fallback={<PageLoader message="جاري تحميل التقارير..." />}>
                <LazyRoutes.FinancialReports />
              </Suspense>
            </PermissionGuard>
          </SubscriptionCheck>
        } />
        
        {/* نقطة البيع */}
        <Route path="/dashboard/pos" element={
          <ConditionalRoute appId="pos-system">
            <SubscriptionCheck>
              <PermissionGuard requiredPermissions={['accessPOS']}>
                <Suspense fallback={<PageLoader message="جاري تحميل نقطة البيع..." />}>
                  <LazyRoutes.POSOptimized />
                </Suspense>
              </PermissionGuard>
            </SubscriptionCheck>
          </ConditionalRoute>
        } />
        
        <Route path="/dashboard/pos-orders" element={
          <ConditionalRoute appId="pos-system">
            <SubscriptionCheck>
              <PermissionGuard requiredPermissions={['accessPOS']}>
                <POSOrdersWrapper>
                  <Suspense fallback={<PageLoader message="جاري تحميل طلبات نقطة البيع..." />}>
                    <LazyRoutes.POSOrdersOptimized />
                  </Suspense>
                </POSOrdersWrapper>
              </PermissionGuard>
            </SubscriptionCheck>
          </ConditionalRoute>
        } />
        
        <Route path="/dashboard/returns" element={
          <ConditionalRoute appId="pos-system">
            <SubscriptionCheck>
              <PermissionGuard requiredPermissions={['accessPOS']}>
                <Suspense fallback={<PageLoader message="جاري تحميل المرتجعات..." />}>
                  <LazyRoutes.ProductReturns />
                </Suspense>
              </PermissionGuard>
            </SubscriptionCheck>
          </ConditionalRoute>
        } />
        
        <Route path="/dashboard/losses" element={
          <ConditionalRoute appId="pos-system">
            <SubscriptionCheck>
              <PermissionGuard requiredPermissions={['accessPOS']}>
                <Suspense fallback={<PageLoader message="جاري تحميل الخسائر..." />}>
                  <LazyRoutes.LossDeclarations />
                </Suspense>
              </PermissionGuard>
            </SubscriptionCheck>
          </ConditionalRoute>
        } />
        
        {/* الموردين */}
        <Route path="/dashboard/suppliers" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل الموردين..." />}>
              <LazyRoutes.SuppliersManagement />
            </Suspense>
          </SubscriptionCheck>
        } />
        
        <Route path="/dashboard/suppliers/purchases" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل مشتريات الموردين..." />}>
              <LazyRoutes.SupplierPurchases />
            </Suspense>
          </SubscriptionCheck>
        } />
        
        <Route path="/dashboard/suppliers/payments" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل مدفوعات الموردين..." />}>
              <LazyRoutes.SupplierPayments />
            </Suspense>
          </SubscriptionCheck>
        } />
        
        <Route path="/dashboard/suppliers/reports" element={
          <SubscriptionCheck>
            <PermissionGuard requiredPermissions={['viewReports']}>
              <Suspense fallback={<PageLoader message="جاري تحميل تقارير الموردين..." />}>
                <LazyRoutes.SupplierReports />
              </Suspense>
            </PermissionGuard>
          </SubscriptionCheck>
        } />
        
        {/* الإعدادات */}
        <Route path="/dashboard/settings" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل الإعدادات..." />}>
              <LazyRoutes.SettingsPage />
            </Suspense>
          </SubscriptionCheck>
        } />
        
        <Route path="/dashboard/settings/:section" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل الإعدادات..." />}>
              <LazyRoutes.SettingsPage />
            </Suspense>
          </SubscriptionCheck>
        } />
        
        {/* إدارة النطاقات */}
        <Route path="/dashboard/custom-domains" element={
          <SubscriptionCheck>
            <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
              <Suspense fallback={<PageLoader message="جاري تحميل النطاقات..." />}>
                <LazyRoutes.DomainSettings />
              </Suspense>
            </PermissionGuard>
          </SubscriptionCheck>
        } />
        
        {/* التطبيقات والاشتراكات */}
        <Route path="/dashboard/subscription" element={
          <Suspense fallback={<PageLoader message="جاري تحميل الاشتراك..." />}>
            <LazyRoutes.SubscriptionPage />
          </Suspense>
        } />
        
        <Route path="/dashboard/subscription-services" element={
          <ConditionalRoute appId="subscription-services">
            <SubscriptionCheck>
              <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
                <Suspense fallback={<PageLoader message="جاري تحميل خدمات الاشتراك..." />}>
                  <LazyRoutes.SubscriptionServices />
                </Suspense>
              </PermissionGuard>
            </SubscriptionCheck>
          </ConditionalRoute>
        } />
        
        <Route path="/dashboard/delivery" element={
          <SubscriptionCheck>
            <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
              <Suspense fallback={<PageLoader message="جاري تحميل إدارة التوصيل..." />}>
                <LazyRoutes.DeliveryManagement />
              </Suspense>
            </PermissionGuard>
          </SubscriptionCheck>
        } />
        
        <Route path="/dashboard/apps" element={
          <SubscriptionCheck>
            <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
              <Suspense fallback={<PageLoader message="جاري تحميل التطبيقات..." />}>
                <LazyRoutes.AppsManagement />
              </Suspense>
            </PermissionGuard>
          </SubscriptionCheck>
        } />
      </Route>
    </Route>
  </>
);

export default DashboardRoutes; 