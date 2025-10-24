import React, { Suspense } from 'react';
import { Route, Routes, Outlet, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import RequireTenant from '../components/auth/RequireTenant';
import SubscriptionCheck from '../components/subscription/SubscriptionCheck';
import PermissionGuard from '../components/auth/PermissionGuard';
import ConditionalRoute from '../components/ConditionalRoute';
import StaffLoginRedirect from '../components/auth/StaffLoginRedirect';
import * as LazyRoutes from './LazyRoutes.optimized';
import { PageLoader } from './RouteComponents';
import { ConfirmationProvider } from '@/context/ConfirmationContext';

// مكون wrapper لـ SubscriptionCheck مع Outlet
const SubscriptionWrapper = () => (
  <SubscriptionCheck>
    <StaffLoginRedirect>
      <Outlet />
    </StaffLoginRedirect>
  </SubscriptionCheck>
);

// ============ مسارات لوحة التحكم المكتملة ============
export const DashboardRoutes = () => (
  <ConfirmationProvider>
  <Routes>
    <Route element={<ProtectedRoute />}>
      <Route element={<RequireTenant />}>
        {/* 🔥 SubscriptionCheck واحد فقط يغطي جميع المسارات */}
        <Route element={<SubscriptionWrapper />}>
          {/* لوحة التحكم الكلاسيكية - الصفحة الرئيسية */}
          <Route index element={
            <Suspense fallback={<PageLoader message="جاري تحميل لوحة التحكم..." />}>
              <LazyRoutes.Dashboard />
            </Suspense>
          } />
          
          {/* لوحة تحكم نقطة البيع - اللوحة الكلاسيكية مع POSPureLayout */}
          <Route path="pos-dashboard" element={
            <ConditionalRoute appId="pos-system">
              <PermissionGuard requiredPermissions={['accessPOS']}>
                <Suspense fallback={<PageLoader message="جاري تحميل لوحة تحكم نقطة البيع..." />}>
                  <LazyRoutes.Dashboard />
                </Suspense>
              </PermissionGuard>
            </ConditionalRoute>
          } />
          
          {/* المنتجات والمخزون */}
          <Route path="products" element={
            <Suspense fallback={<PageLoader message="جاري تحميل المنتجات..." />}>
              <LazyRoutes.Products />
            </Suspense>
          } />

          {/* مركز المبيعات والطلبات */}
          <Route path="sales-operations/:tab?" element={
            <Suspense fallback={<PageLoader message="جاري تحميل مركز المبيعات والطلبات..." />}>
              <LazyRoutes.SalesOperationsPage />
            </Suspense>
          } />

          {/* مركز الخدمات */}
          <Route path="services-operations/:tab?" element={
            <Suspense fallback={<PageLoader message="جاري تحميل مركز الخدمات..." />}>
              <LazyRoutes.ServicesOperationsPage />
            </Suspense>
          } />

          {/* مركز التقارير والتحليلات */}
          <Route path="reports-operations/:tab?" element={
            <Suspense fallback={<PageLoader message="جاري تحميل مركز التقارير..." />}>
              <LazyRoutes.ReportsOperationsPage />
            </Suspense>
          } />

          {/* توجيه المسارات القديمة إلى المركز الجديد لضمان POS layout */}
          <Route path="orders-v2" element={<Navigate to="/dashboard/sales-operations/onlineOrders" replace />} />
          <Route path="blocked-customers" element={<Navigate to="/dashboard/sales-operations/blocked" replace />} />
          <Route path="abandoned-orders" element={<Navigate to="/dashboard/sales-operations/abandoned" replace />} />
          <Route path="invoices" element={<Navigate to="/dashboard/pos-operations/invoices" replace />} />
          
          {/* إضافة منتج جديد */}
          <Route path="products/new" element={
            <PermissionGuard requiredPermissions={['addProducts']}>
              <Suspense fallback={<PageLoader message="جاري تحميل نموذج المنتج..." />}>
                <LazyRoutes.ProductForm useStandaloneLayout={false} />
              </Suspense>
            </PermissionGuard>
          } />

          <Route path="product-operations/:tab?" element={
            <PermissionGuard requiredPermissions={['viewProducts']}>
              <Suspense fallback={<PageLoader message="جاري تحميل مركز إدارة المنتجات..." />}>
                <LazyRoutes.ProductOperationsPage />
              </Suspense>
            </PermissionGuard>
          } />

          {/* تعديل منتج موجود */}
          <Route path="product/:id" element={
            <PermissionGuard requiredPermissions={['editProducts']}>
              <Suspense fallback={<PageLoader message="جاري تحميل تعديل المنتج..." />}>
                <LazyRoutes.ProductForm useStandaloneLayout={false} />
              </Suspense>
            </PermissionGuard>
          } />
          
          {/* تخصيص صفحة شراء المنتج */}
          <Route path="products/:productId/customize-purchase-page" element={
            <PermissionGuard requiredPermissions={['editProducts']}>
              <Suspense fallback={<PageLoader message="جاري تحميل تخصيص صفحة الشراء..." />}>
                <LazyRoutes.CustomizeProductPurchasePage />
              </Suspense>
            </PermissionGuard>
          } />
          
          <Route path="inventory" element={
            <PermissionGuard requiredPermissions={['viewInventory']}>
              <Suspense fallback={<PageLoader message="جاري تحميل المخزون..." />}>
                <LazyRoutes.Inventory />
              </Suspense>
            </PermissionGuard>
          } />
          
          {/* تتبع المخزون المتقدم */}
          <Route path="inventory-tracking" element={
            <PermissionGuard requiredPermissions={['viewInventory']}>
              <Suspense fallback={<PageLoader message="جاري تحميل تتبع المخزون المتقدم..." />}>
                <LazyRoutes.AdvancedInventoryTracking />
              </Suspense>
            </PermissionGuard>
          } />
          
          {/* الطباعة السريعة للباركود */}
          <Route path="quick-barcode-print" element={
            <Suspense fallback={<PageLoader message="جاري تحميل الطباعة السريعة..." />}>
              <LazyRoutes.QuickBarcodePrintPage />
            </Suspense>
          } />
          
          <Route path="categories" element={
            <PermissionGuard requiredPermissions={['manageProductCategories']}>
              <Suspense fallback={<PageLoader message="جاري تحميل الفئات..." />}>
                <LazyRoutes.Categories />
              </Suspense>
            </PermissionGuard>
          } />
          
          {/* خدمات الإصلاح → توجيه لمركز الخدمات */}
          <Route path="repair-services" element={<Navigate to="/dashboard/services-operations/repair" replace />} />
          
          
          <Route path="orders" element={
            <Suspense fallback={<PageLoader message="جاري تحميل الطلبات..." />}>
              <LazyRoutes.Orders />
            </Suspense>
          } />
          
          {/* النسخة المحسنة V2 باستدعاء واحد */}
          <Route path="orders-v2" element={
            <Suspense fallback={<PageLoader message="جاري تحميل الطلبات (V2)..." />}>
              <LazyRoutes.OrdersV2 />
            </Suspense>
          } />
          {/* تفاصيل الطلب (V2) برقم الطلبية */}
          <Route path="orders-v2/:orderNumber" element={
            <Suspense fallback={<PageLoader message="جاري تحميل تفاصيل الطلب..." />}>
              <LazyRoutes.OrderDetailsV2 />
            </Suspense>
          } />
          
          {/* الطلبيات المتقدمة */}
          <Route path="advanced-orders" element={
            <PermissionGuard requiredPermissions={['viewOrders']}>
              <Suspense fallback={<PageLoader message="جاري تحميل الطلبيات المتقدمة..." />}>
                <LazyRoutes.AdvancedOrders />
              </Suspense>
            </PermissionGuard>
          } />
          
          <Route path="abandoned-orders" element={
            <PermissionGuard requiredPermissions={['viewOrders']}>
              <Suspense fallback={<PageLoader message="جاري تحميل الطلبات المهجورة..." />}>
                <LazyRoutes.AbandonedOrders />
              </Suspense>
            </PermissionGuard>
          } />

          {/* قائمة المحظورين */}
          <Route path="blocked-customers" element={
            <PermissionGuard requiredPermissions={['viewOrders']}>
              <Suspense fallback={<PageLoader message="جاري تحميل قائمة المحظورين..." />}>
                <LazyRoutes.BlockedCustomers />
              </Suspense>
            </PermissionGuard>
          } />
          
          {/* العملاء والديون */}
          <Route path="customers" element={
            <Suspense fallback={<PageLoader message="جاري تحميل العملاء..." />}>
              <LazyRoutes.Customers />
            </Suspense>
          } />
          
          <Route path="customer-debts" element={<Navigate to="/dashboard/pos-operations/debts" replace />} />
          
          <Route path="customer-debt-details/:customerId" element={
            <ConditionalRoute appId="pos-system">
              <PermissionGuard requiredPermissions={['viewDebts']}>
                <Suspense fallback={<PageLoader message="جاري تحميل تفاصيل الديون..." />}>
                  <LazyRoutes.CustomerDebtDetails />
                </Suspense>
              </PermissionGuard>
            </ConditionalRoute>
          } />
          
          <Route path="payment-history" element={
            <PermissionGuard requiredPermissions={['viewFinancialReports']}>
              <Suspense fallback={<PageLoader message="جاري تحميل تاريخ المدفوعات..." />}>
                <LazyRoutes.PaymentHistory />
              </Suspense>
            </PermissionGuard>
          } />
          
          {/* الموظفين */}
          <Route path="employees" element={
            <PermissionGuard requiredPermissions={['viewEmployees']}>
              <Suspense fallback={<PageLoader message="جاري تحميل الموظفين..." />}>
                <LazyRoutes.Employees />
              </Suspense>
            </PermissionGuard>
          } />
          
          <Route path="order-distribution" element={
            <PermissionGuard requiredPermissions={['manageEmployees']}>
              <Suspense fallback={<PageLoader message="جاري تحميل توزيع الطلبات..." />}>
                <LazyRoutes.OrderDistributionSettings />
              </Suspense>
            </PermissionGuard>
          } />

          <Route path="confirmation-center" element={
            <PermissionGuard requiredPermissions={['manageEmployees']}>
              <Suspense fallback={<PageLoader message="جاري تحميل مركز التأكيد..." />}>
                <LazyRoutes.ConfirmationCenter />
              </Suspense>
            </PermissionGuard>
          } />
          
          {/* المالية والتقارير */}
          <Route path="expenses" element={
            <PermissionGuard requiredPermissions={['viewFinancialReports']}>
              <Navigate to="/dashboard/reports-operations/expenses" replace />
            </PermissionGuard>
          } />
          
          <Route path="analytics" element={
            <PermissionGuard requiredPermissions={['viewSalesReports']}>
              <Suspense fallback={<PageLoader message="جاري تحميل التحليلات..." />}>
                <LazyRoutes.Analytics />
              </Suspense>
            </PermissionGuard>
          } />

          {/* التحليلات المالية الشاملة → المركز */}
          <Route path="financial-analytics" element={<Navigate to="/dashboard/reports-operations/financial" replace />} />

          {/* نظام الزكاة → المركز */}
          <Route path="zakat" element={<Navigate to="/dashboard/reports-operations/zakat" replace />} />
          
          {/* نقطة البيع */}
          <Route path="pos" element={
            <ConditionalRoute appId="pos-system">
              <PermissionGuard requiredPermissions={['accessPOS']}>
                <Suspense fallback={<PageLoader message="جاري تحميل نقطة البيع..." />}>
                  <LazyRoutes.POSOptimized />
                </Suspense>
              </PermissionGuard>
            </ConditionalRoute>
          } />
          
          {/* لوحة تحكم نقطة البيع - تم نقلها إلى /dashboard في RouteComponents */}
          
          {/* نقطة البيع المتقدمة */}
          <Route path="pos-advanced" element={
            <ConditionalRoute appId="pos-system">
              <PermissionGuard requiredPermissions={['accessPOS']}>
                <Suspense fallback={<PageLoader message="جاري تحميل نقطة البيع المتقدمة..." />}>
                  <LazyRoutes.POSAdvanced />
                </Suspense>
              </PermissionGuard>
            </ConditionalRoute>
          } />

          <Route path="pos-operations/:tab?" element={
            <ConditionalRoute appId="pos-system">
              <PermissionGuard requiredPermissions={['accessPOS']}>
                <Suspense fallback={<PageLoader message="جاري تحميل مركز عمليات نقطة البيع..." />}>
                  <LazyRoutes.POSOperationsPage />
                </Suspense>
              </PermissionGuard>
            </ConditionalRoute>
          } />
          
          <Route path="pos-orders" element={<Navigate to="/dashboard/pos-operations/orders" replace />} />
          
          {/* كشف حساب 104 */}
          <Route path="etat104" element={
            <ConditionalRoute appId="pos-system">
              <PermissionGuard requiredPermissions={['accessPOS']}>
                <Suspense fallback={<PageLoader message="جاري تحميل كشف حساب 104..." />}>
                  <LazyRoutes.Etat104 />
                </Suspense>
              </PermissionGuard>
            </ConditionalRoute>
          } />
          
          {/* إعدادات نقطة البيع */}
          <Route path="pos-settings" element={
            <ConditionalRoute appId="pos-system">
              <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
                <Suspense fallback={<PageLoader message="جاري تحميل إعدادات نقطة البيع..." />}>
                  <LazyRoutes.POSSettingsPage />
                </Suspense>
              </PermissionGuard>
            </ConditionalRoute>
          } />
          
          {/* إعدادات المحل */}
          <Route path="store-business-settings" element={
            <ConditionalRoute appId="pos-system">
              <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
                <Suspense fallback={<PageLoader message="جاري تحميل إعدادات المحل..." />}>
                  <LazyRoutes.StoreBusinessSettings />
                </Suspense>
              </PermissionGuard>
            </ConditionalRoute>
          } />
          
          {/* إدارة الموظفين والجلسات */}
          <Route path="staff-management" element={
            <ConditionalRoute appId="pos-system">
              <PermissionGuard requiredPermissions={['manageEmployees']}>
                <Suspense fallback={<PageLoader message="جاري تحميل إدارة الموظفين..." />}>
                  <LazyRoutes.StaffManagement />
                </Suspense>
              </PermissionGuard>
            </ConditionalRoute>
          } />
          
          <Route path="returns" element={<Navigate to="/dashboard/pos-operations/returns" replace />} />
          
          <Route path="losses" element={<Navigate to="/dashboard/pos-operations/losses" replace />} />
          
          {/* مركز إدارة الموظفين */}
          <Route path="staff-operations/:tab?" element={
            <ConditionalRoute appId="pos-system">
              <PermissionGuard requiredPermissions={['manageEmployees']}>
                <Suspense fallback={<PageLoader message="جاري تحميل مركز إدارة الموظفين..." />}>
                  <LazyRoutes.StaffOperationsPage />
                </Suspense>
              </PermissionGuard>
            </ConditionalRoute>
          } />
          
          {/* مركز إدارة الموردين والمشتريات */}
          <Route path="supplier-operations/:tab?" element={
            <PermissionGuard requiredPermissions={['viewSuppliers']}>
              <Suspense fallback={<PageLoader message="جاري تحميل مركز إدارة الموردين..." />}>
                <LazyRoutes.SupplierOperationsPage />
              </Suspense>
            </PermissionGuard>
          } />

          {/* توجيه المسارات القديمة إلى المركز الجديد */}
          <Route path="suppliers" element={<Navigate to="/dashboard/supplier-operations/suppliers" replace />} />
          <Route path="suppliers/new" element={<Navigate to="/dashboard/supplier-operations/suppliers" replace />} />
          <Route path="suppliers/purchases" element={<Navigate to="/dashboard/supplier-operations/purchases" replace />} />
          <Route path="suppliers/purchases/new" element={<Navigate to="/dashboard/supplier-operations/purchases" replace />} />
          <Route path="suppliers/purchases/:purchaseId" element={<Navigate to="/dashboard/supplier-operations/purchases" replace />} />
          <Route path="suppliers/purchases/:purchaseId/edit" element={<Navigate to="/dashboard/supplier-operations/purchases" replace />} />
          <Route path="suppliers/payments" element={<Navigate to="/dashboard/supplier-operations/payments" replace />} />
          <Route path="suppliers/payments/new" element={<Navigate to="/dashboard/supplier-operations/payments" replace />} />
          <Route path="suppliers/payments/:paymentId" element={<Navigate to="/dashboard/supplier-operations/payments" replace />} />
          <Route path="suppliers/reports" element={<Navigate to="/dashboard/supplier-operations/reports" replace />} />
          
          {/* تحميل الألعاب */}
          <Route path="game-downloads" element={
            <ConditionalRoute appId="game-downloads">
              <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
                <Suspense fallback={<PageLoader message="جاري تحميل إدارة الألعاب..." />}>
                  <LazyRoutes.GameDownloadsPage />
                </Suspense>
              </PermissionGuard>
            </ConditionalRoute>
          } />
          
          {/* مركز الإعدادات العامة */}
          <Route path="settings-operations/:tab?" element={
            <Suspense fallback={<PageLoader message="جاري تحميل مركز الإعدادات..." />}>
              <LazyRoutes.SettingsOperationsPage />
            </Suspense>
          } />

          {/* توجيه المسارات القديمة إلى المركز الجديد */}
          <Route path="settings" element={<Navigate to="/dashboard/settings-operations/settings" replace />} />
          <Route path="settings/:section" element={<Navigate to="/dashboard/settings-operations/settings" replace />} />
          <Route path="subscription" element={<Navigate to="/dashboard/settings-operations/subscription" replace />} />
          <Route path="custom-domains" element={<Navigate to="/dashboard/settings-operations/custom-domains" replace />} />
          <Route path="/docs/custom-domains" element={<Navigate to="/dashboard/settings-operations/domains-docs" replace />} />
          
          {/* مركز إدارة المتجر الإلكتروني */}
          <Route path="store-operations/:tab?" element={
            <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
              <Suspense fallback={<PageLoader message="جاري تحميل مركز إدارة المتجر..." />}>
                <LazyRoutes.StoreOperationsPage />
              </Suspense>
            </PermissionGuard>
          } />

          {/* توجيه المسارات القديمة إلى المركز الجديد */}
          <Route path="store-settings" element={<Navigate to="/dashboard/store-operations/store-settings" replace />} />
          <Route path="store-editor" element={<Navigate to="/dashboard/store-operations/store-editor" replace />} />
          <Route path="organization-components-editor" element={<Navigate to="/dashboard/store-operations/components" replace />} />
          <Route path="store-themes" element={<Navigate to="/dashboard/store-operations/themes" replace />} />
          <Route path="landing-pages" element={<Navigate to="/dashboard/store-operations/landing-pages" replace />} />
          <Route path="thank-you-editor" element={<Navigate to="/dashboard/store-operations/thank-you" replace />} />
          <Route path="delivery" element={<Navigate to="/dashboard/store-operations/delivery" replace />} />
          
          {/* محرر المتجر V2 - keep as standalone */}
          <Route path="store-editor-v2" element={
            <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
              <Suspense fallback={<PageLoader message="جاري تحميل محرر المتجر V2..." />}>
                <LazyRoutes.StoreEditorV2 />
              </Suspense>
            </PermissionGuard>
          } />

          {/* إعادة توجيه لواجهة المتجر */}
          <Route path="open-store" element={
            <Suspense fallback={<PageLoader message="جاري فتح واجهة المتجر..." />}>
              <LazyRoutes.OpenStoreRedirect />
            </Suspense>
          } />
          
          
          {/* خدمات الاشتراك → توجيه لمركز الخدمات */}
          <Route path="subscription-services" element={<Navigate to="/dashboard/services-operations/subscription" replace />} />
          
          <Route path="apps" element={
            <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
              <Suspense fallback={<PageLoader message="جاري تحميل التطبيقات..." />}>
                <LazyRoutes.AppsManagement />
              </Suspense>
            </PermissionGuard>
          } />
          
          {/* منشئ صفحة الهبوط - keep as standalone */}
          <Route path="/landing-page-builder/:id" element={
            <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
              <Suspense fallback={<PageLoader message="جاري تحميل منشئ صفحة الهبوط..." />}>
                <LazyRoutes.LandingPageBuilder />
              </Suspense>
            </PermissionGuard>
          } />
          
          <Route path="form-settings" element={
            <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
              <Suspense fallback={<PageLoader message="جاري تحميل إعدادات النماذج..." />}>
                <LazyRoutes.FormSettings />
              </Suspense>
            </PermissionGuard>
          } />
          
          <Route path="/form-builder/:formId" element={
            <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
              <Suspense fallback={<PageLoader message="جاري تحميل منشئ النماذج..." />}>
                <LazyRoutes.FormBuilder />
              </Suspense>
            </PermissionGuard>
          } />
          
          <Route path="custom-pages" element={
            <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
              <Suspense fallback={<PageLoader message="جاري تحميل الصفحات المخصصة..." />}>
                <LazyRoutes.CustomPagesManager />
              </Suspense>
            </PermissionGuard>
          } />

          {/* مسارات مركز الاتصالات */}
          <Route path="call-center" element={
            <ConditionalRoute appId="call-center">
              <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
                <Suspense fallback={<PageLoader message="جاري تحميل مركز الاتصالات..." />}>
                  <LazyRoutes.CallCenterComingSoon />
                </Suspense>
              </PermissionGuard>
            </ConditionalRoute>
          } />
          
          <Route path="call-center/agents" element={
            <ConditionalRoute appId="call-center">
              <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
                <Suspense fallback={<PageLoader message="جاري تحميل إدارة الوكلاء..." />}>
                  <LazyRoutes.CallCenterComingSoon />
                </Suspense>
              </PermissionGuard>
            </ConditionalRoute>
          } />
          
          <Route path="call-center/distribution" element={
            <ConditionalRoute appId="call-center">
              <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
                <Suspense fallback={<PageLoader message="جاري تحميل إعدادات التوزيع..." />}>
                  <LazyRoutes.CallCenterComingSoon />
                </Suspense>
              </PermissionGuard>
            </ConditionalRoute>
          } />
          
          <Route path="call-center/reports" element={
            <ConditionalRoute appId="call-center">
              <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
                <Suspense fallback={<PageLoader message="جاري تحميل التقارير..." />}>
                  <LazyRoutes.CallCenterComingSoon />
                </Suspense>
              </PermissionGuard>
            </ConditionalRoute>
          } />
          
          <Route path="call-center/monitoring" element={
            <ConditionalRoute appId="call-center">
              <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
                <Suspense fallback={<PageLoader message="جاري تحميل المراقبة المباشرة..." />}>
                  <LazyRoutes.CallCenterComingSoon />
                </Suspense>
              </PermissionGuard>
            </ConditionalRoute>
          } />

          {/* مركز دورات ستوكيها */}
          <Route path="courses-operations/:tab?" element={
            <Suspense fallback={<PageLoader message="جاري تحميل مركز الدورات..." />}>
              <LazyRoutes.CoursesOperationsPage />
            </Suspense>
          } />

          {/* توجيه المسارات القديمة إلى المركز الجديد */}
          <Route path="courses" element={<Navigate to="/dashboard/courses-operations/all" replace />} />
          <Route path="courses/digital-marketing" element={<Navigate to="/dashboard/courses-operations/digital-marketing" replace />} />
          <Route path="courses/e-commerce" element={<Navigate to="/dashboard/courses-operations/e-commerce" replace />} />

          {/* المحور الأول - أساسيات التجارة الإلكترونية */}
          <Route path="courses/e-commerce/module/1" element={
            <Suspense fallback={<PageLoader message="جاري تحميل أساسيات التجارة الإلكترونية..." />}>
              <LazyRoutes.ECommerceModule1 />
            </Suspense>
          } />

          {/* المحور الثاني - استراتيجيات وأدوات التجارة الإلكترونية */}
          <Route path="courses/e-commerce/module/2" element={
            <Suspense fallback={<PageLoader message="جاري تحميل استراتيجيات التجارة الإلكترونية..." />}>
              <LazyRoutes.ECommerceModule2 />
            </Suspense>
          } />

          <Route path="courses/e-commerce-store" element={<Navigate to="/dashboard/courses-operations/e-commerce-store" replace />} />
          <Route path="courses/tiktok-marketing" element={<Navigate to="/dashboard/courses-operations/tiktok-marketing" replace />} />
          <Route path="courses/traditional-business" element={<Navigate to="/dashboard/courses-operations/traditional-business" replace />} />
          <Route path="courses/service-providers" element={<Navigate to="/dashboard/courses-operations/service-providers" replace />} />

          {/* جميع محاور دورة التسويق الإلكتروني */}
          <Route path="courses/digital-marketing/module/1" element={
            <Suspense fallback={<PageLoader message="جاري تحميل المحور الأول..." />}>
              <LazyRoutes.DigitalMarketingModule1 />
            </Suspense>
          } />

          <Route path="courses/digital-marketing/module/2" element={
            <Suspense fallback={<PageLoader message="جاري تحميل المحور الثاني..." />}>
              <LazyRoutes.DigitalMarketingModule2 />
            </Suspense>
          } />

          <Route path="courses/digital-marketing/module/3" element={
            <Suspense fallback={<PageLoader message="جاري تحميل المحور الثالث..." />}>
              <LazyRoutes.DigitalMarketingModule3 />
            </Suspense>
          } />

          <Route path="courses/digital-marketing/module/4" element={
            <Suspense fallback={<PageLoader message="جاري تحميل المحور الرابع..." />}>
              <LazyRoutes.DigitalMarketingModule4 />
            </Suspense>
          } />

          <Route path="courses/digital-marketing/module/5" element={
            <Suspense fallback={<PageLoader message="جاري تحميل المحور الخامس..." />}>
              <LazyRoutes.DigitalMarketingModule5 />
            </Suspense>
          } />

          <Route path="courses/digital-marketing/module/6" element={
            <Suspense fallback={<PageLoader message="جاري تحميل المحور السادس..." />}>
              <LazyRoutes.DigitalMarketingModule6 />
            </Suspense>
          } />

          <Route path="courses/digital-marketing/module/7" element={
            <Suspense fallback={<PageLoader message="جاري تحميل المحور السابع..." />}>
              <LazyRoutes.DigitalMarketingModule7 />
            </Suspense>
          } />

          <Route path="courses/digital-marketing/module/8" element={
            <Suspense fallback={<PageLoader message="جاري تحميل المحور الثامن..." />}>
              <LazyRoutes.DigitalMarketingModule8 />
            </Suspense>
          } />

          <Route path="courses/digital-marketing/module/9" element={
            <Suspense fallback={<PageLoader message="جاري تحميل المحور التاسع..." />}>
              <LazyRoutes.DigitalMarketingModule9 />
            </Suspense>
          } />

          <Route path="courses/digital-marketing/module/10" element={
            <Suspense fallback={<PageLoader message="جاري تحميل المحور العاشر..." />}>
              <LazyRoutes.DigitalMarketingModule10 />
            </Suspense>
          } />

          <Route path="courses/digital-marketing/module/11" element={
            <Suspense fallback={<PageLoader message="جاري تحميل المحور الحادي عشر..." />}>
              <LazyRoutes.DigitalMarketingModule11 />
            </Suspense>
          } />

          <Route path="courses/digital-marketing/module/12" element={
            <Suspense fallback={<PageLoader message="جاري تحميل المحور الثاني عشر..." />}>
              <LazyRoutes.DigitalMarketingModule12 />
            </Suspense>
          } />

          {/* جميع محاور دورة تيك توك أدس */}
          <Route path="courses/tiktok-marketing/module/0" element={
            <Suspense fallback={<PageLoader message="جاري تحميل سياسة تيك توك..." />}>
              <LazyRoutes.TikTokAdsModule0 />
            </Suspense>
          } />

          <Route path="courses/tiktok-marketing/module/1" element={
            <Suspense fallback={<PageLoader message="جاري تحميل المقدمة..." />}>
              <LazyRoutes.TikTokAdsModule1 />
            </Suspense>
          } />

          <Route path="courses/tiktok-marketing/module/2" element={
            <Suspense fallback={<PageLoader message="جاري تحميل الحسابات الإعلانية..." />}>
              <LazyRoutes.TikTokAdsModule2 />
            </Suspense>
          } />

          <Route path="courses/tiktok-marketing/module/3" element={
            <Suspense fallback={<PageLoader message="جاري تحميل أساسيات مدير الإعلانات..." />}>
              <LazyRoutes.TikTokAdsModule3 />
            </Suspense>
          } />

          <Route path="courses/tiktok-marketing/module/4" element={
            <Suspense fallback={<PageLoader message="جاري تحميل أهداف الحملة..." />}>
              <LazyRoutes.TikTokAdsModule4 />
            </Suspense>
          } />

          <Route path="courses/tiktok-marketing/module/5" element={
            <Suspense fallback={<PageLoader message="جاري تحميل إعداد المجموعة الإعلانية..." />}>
              <LazyRoutes.TikTokAdsModule5 />
            </Suspense>
          } />

          <Route path="courses/tiktok-marketing/module/6" element={
            <Suspense fallback={<PageLoader message="جاري تحميل تصميم الإعلان..." />}>
              <LazyRoutes.TikTokAdsModule6 />
            </Suspense>
          } />

          <Route path="courses/tiktok-marketing/module/7" element={
            <Suspense fallback={<PageLoader message="جاري تحميل الإضافات المهمة..." />}>
              <LazyRoutes.TikTokAdsModule7 />
            </Suspense>
          } />

          <Route path="courses/tiktok-marketing/module/8" element={
            <Suspense fallback={<PageLoader message="جاري تحميل البكسل والجماهير المخصصة..." />}>
              <LazyRoutes.TikTokAdsModule8 />
            </Suspense>
          } />

        </Route>
        
        {/* صفحة الاشتراك - خارج SubscriptionCheck لتجنب اللوب */}
        <Route path="subscription" element={
          <Suspense fallback={<PageLoader message="جاري تحميل الاشتراك..." />}>
            <LazyRoutes.SubscriptionPage />
          </Suspense>
        } />

        {/* صفحة إعادة شحن الطلبيات الإلكترونية */}
        <Route path="online-orders-recharge" element={
          <Suspense fallback={<PageLoader message="جاري تحميل إعادة شحن الطلبيات..." />}>
            <LazyRoutes.OnlineOrdersRechargePage />
          </Suspense>
        } />

      </Route>
    </Route>
  </Routes>
  </ConfirmationProvider>
);

export default DashboardRoutes;
