import React, { Suspense } from 'react';
import { Route, Outlet } from 'react-router-dom';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import RequireTenant from '../components/auth/RequireTenant';
import SubscriptionCheck from '../components/subscription/SubscriptionCheck';
import PermissionGuard from '../components/auth/PermissionGuard';
import ConditionalRoute from '../components/ConditionalRoute';
import POSOrdersWrapper from '../components/pos/POSOrdersWrapper';
import * as LazyRoutes from './LazyRoutes';
import { PageLoader } from './RouteComponents';

// مكون wrapper لـ SubscriptionCheck مع Outlet
const SubscriptionWrapper = () => (
  <SubscriptionCheck>
    <Outlet />
  </SubscriptionCheck>
);

// ============ مسارات لوحة التحكم المكتملة ============
export const DashboardRoutes = () => (
  <>
    <Route element={<ProtectedRoute />}>
      <Route element={<RequireTenant />}>
        {/* 🔥 SubscriptionCheck واحد فقط يغطي جميع المسارات */}
        <Route element={<SubscriptionWrapper />}>
          {/* لوحة التحكم الرئيسية */}
          <Route path="/dashboard" element={
            <Suspense fallback={<PageLoader message="جاري تحميل لوحة التحكم..." />}>
              <LazyRoutes.Dashboard />
            </Suspense>
          } />
          
          {/* المنتجات والمخزون */}
          <Route path="/dashboard/products" element={
            <Suspense fallback={<PageLoader message="جاري تحميل المنتجات..." />}>
              <LazyRoutes.Products />
            </Suspense>
          } />
          
          {/* إضافة منتج جديد */}
          <Route path="/dashboard/products/new" element={
            <PermissionGuard requiredPermissions={['addProducts']}>
              <Suspense fallback={<PageLoader message="جاري تحميل نموذج المنتج..." />}>
                <LazyRoutes.ProductForm />
              </Suspense>
            </PermissionGuard>
          } />
          
          {/* تعديل منتج موجود */}
          <Route path="/dashboard/product/:id" element={
            <PermissionGuard requiredPermissions={['editProducts']}>
              <Suspense fallback={<PageLoader message="جاري تحميل تعديل المنتج..." />}>
                <LazyRoutes.ProductForm />
              </Suspense>
            </PermissionGuard>
          } />
          
          {/* تخصيص صفحة شراء المنتج */}
          <Route path="/dashboard/products/:productId/customize-purchase-page" element={
            <PermissionGuard requiredPermissions={['editProducts']}>
              <Suspense fallback={<PageLoader message="جاري تحميل تخصيص صفحة الشراء..." />}>
                <LazyRoutes.CustomizeProductPurchasePage />
              </Suspense>
            </PermissionGuard>
          } />
          
          <Route path="/dashboard/inventory" element={
            <Suspense fallback={<PageLoader message="جاري تحميل المخزون..." />}>
              <LazyRoutes.Inventory />
            </Suspense>
          } />
          
          {/* تتبع المخزون المتقدم */}
          <Route path="/dashboard/inventory-tracking" element={
            <PermissionGuard requiredPermissions={['viewInventory']}>
              <Suspense fallback={<PageLoader message="جاري تحميل تتبع المخزون المتقدم..." />}>
                <LazyRoutes.AdvancedInventoryTracking />
              </Suspense>
            </PermissionGuard>
          } />
          
          {/* الطباعة السريعة للباركود */}
          <Route path="/dashboard/quick-barcode-print" element={
            <Suspense fallback={<PageLoader message="جاري تحميل الطباعة السريعة..." />}>
              <LazyRoutes.QuickBarcodePrintPage />
            </Suspense>
          } />
          
          <Route path="/dashboard/categories" element={
            <PermissionGuard requiredPermissions={['manageProductCategories']}>
              <Suspense fallback={<PageLoader message="جاري تحميل الفئات..." />}>
                <LazyRoutes.Categories />
              </Suspense>
            </PermissionGuard>
          } />
          
          {/* خدمات الإصلاح */}
          <Route path="/dashboard/repair-services" element={
            <ConditionalRoute appId="repair-services">
              <PermissionGuard requiredPermissions={['viewServices']}>
                <Suspense fallback={<PageLoader message="جاري تحميل خدمات الإصلاح..." />}>
                  <LazyRoutes.RepairServices />
                </Suspense>
              </PermissionGuard>
            </ConditionalRoute>
          } />
          
          {/* المبيعات والطلبات */}
          <Route path="/dashboard/sales" element={
            <Suspense fallback={<PageLoader message="جاري تحميل المبيعات..." />}>
              <LazyRoutes.OptimizedSales />
            </Suspense>
          } />
          
          <Route path="/dashboard/orders" element={
            <Suspense fallback={<PageLoader message="جاري تحميل الطلبات..." />}>
              <LazyRoutes.Orders />
            </Suspense>
          } />
          
          {/* النسخة المحسنة V2 باستدعاء واحد */}
          <Route path="/dashboard/orders-v2" element={
            <Suspense fallback={<PageLoader message="جاري تحميل الطلبات (V2)..." />}>
              <LazyRoutes.OrdersV2 />
            </Suspense>
          } />
          {/* تفاصيل الطلب (V2) برقم الطلبية */}
          <Route path="/dashboard/orders-v2/:orderNumber" element={
            <Suspense fallback={<PageLoader message="جاري تحميل تفاصيل الطلب..." />}>
              <LazyRoutes.OrderDetailsV2 />
            </Suspense>
          } />
          
          {/* الطلبيات المتقدمة */}
          <Route path="/dashboard/advanced-orders" element={
            <PermissionGuard requiredPermissions={['viewOrders']}>
              <Suspense fallback={<PageLoader message="جاري تحميل الطلبيات المتقدمة..." />}>
                <LazyRoutes.AdvancedOrders />
              </Suspense>
            </PermissionGuard>
          } />
          
          <Route path="/dashboard/abandoned-orders" element={
            <PermissionGuard requiredPermissions={['viewOrders']}>
              <Suspense fallback={<PageLoader message="جاري تحميل الطلبات المهجورة..." />}>
                <LazyRoutes.AbandonedOrders />
              </Suspense>
            </PermissionGuard>
          } />
          
          {/* العملاء والديون */}
          <Route path="/dashboard/customers" element={
            <Suspense fallback={<PageLoader message="جاري تحميل العملاء..." />}>
              <LazyRoutes.Customers />
            </Suspense>
          } />
          
          <Route path="/dashboard/customer-debts" element={
            <ConditionalRoute appId="pos-system">
              <Suspense fallback={<PageLoader message="جاري تحميل ديون العملاء..." />}>
                <LazyRoutes.CustomerDebts />
              </Suspense>
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
            <PermissionGuard requiredPermissions={['viewEmployees']}>
              <Suspense fallback={<PageLoader message="جاري تحميل الموظفين..." />}>
                <LazyRoutes.Employees />
              </Suspense>
            </PermissionGuard>
          } />
          
          <Route path="/dashboard/order-distribution" element={
            <PermissionGuard requiredPermissions={['manageEmployees']}>
              <Suspense fallback={<PageLoader message="جاري تحميل توزيع الطلبات..." />}>
                <LazyRoutes.OrderDistributionSettings />
              </Suspense>
            </PermissionGuard>
          } />
          
          {/* المالية والتقارير */}
          <Route path="/dashboard/expenses" element={
            <PermissionGuard requiredPermissions={['viewFinancialReports']}>
              <Suspense fallback={<PageLoader message="جاري تحميل المصروفات..." />}>
                <LazyRoutes.Expenses />
              </Suspense>
            </PermissionGuard>
          } />
          
          <Route path="/dashboard/analytics" element={
            <PermissionGuard requiredPermissions={['viewSalesReports']}>
              <Suspense fallback={<PageLoader message="جاري تحميل التحليلات..." />}>
                <LazyRoutes.Analytics />
              </Suspense>
            </PermissionGuard>
          } />
          
          <Route path="/dashboard/invoices" element={
            <Suspense fallback={<PageLoader message="جاري تحميل الفواتير..." />}>
              <LazyRoutes.Invoices />
            </Suspense>
          } />
          

          
          {/* التحليلات المالية الشاملة */}
          <Route path="/dashboard/financial-analytics" element={
            <PermissionGuard requiredPermissions={['viewFinancialReports']}>
              <Suspense fallback={<PageLoader message="جاري تحميل التحليلات المالية..." />}>
                <LazyRoutes.FinancialAnalytics />
              </Suspense>
            </PermissionGuard>
          } />
          
          {/* نقطة البيع */}
          <Route path="/dashboard/pos" element={
            <ConditionalRoute appId="pos-system">
              <PermissionGuard requiredPermissions={['accessPOS']}>
                <Suspense fallback={<PageLoader message="جاري تحميل نقطة البيع..." />}>
                  <LazyRoutes.POSOptimized />
                </Suspense>
              </PermissionGuard>
            </ConditionalRoute>
          } />
          
          {/* نقطة البيع المتقدمة */}
          <Route path="/dashboard/pos-advanced" element={
            <ConditionalRoute appId="pos-system">
              <PermissionGuard requiredPermissions={['accessPOS']}>
                <Suspense fallback={<PageLoader message="جاري تحميل نقطة البيع المتقدمة..." />}>
                  <LazyRoutes.POSAdvanced />
                </Suspense>
              </PermissionGuard>
            </ConditionalRoute>
          } />
          
          <Route path="/dashboard/pos-orders" element={
            <ConditionalRoute appId="pos-system">
              <PermissionGuard requiredPermissions={['accessPOS']}>
                <POSOrdersWrapper>
                  <Suspense fallback={<PageLoader message="جاري تحميل طلبات نقطة البيع..." />}>
                    <LazyRoutes.POSOrdersOptimized />
                  </Suspense>
                </POSOrdersWrapper>
              </PermissionGuard>
            </ConditionalRoute>
          } />
          
          <Route path="/dashboard/returns" element={
            <ConditionalRoute appId="pos-system">
              <PermissionGuard requiredPermissions={['accessPOS']}>
                <Suspense fallback={<PageLoader message="جاري تحميل المرتجعات..." />}>
                  <LazyRoutes.ProductReturns />
                </Suspense>
              </PermissionGuard>
            </ConditionalRoute>
          } />
          
          <Route path="/dashboard/losses" element={
            <ConditionalRoute appId="pos-system">
              <PermissionGuard requiredPermissions={['accessPOS']}>
                <Suspense fallback={<PageLoader message="جاري تحميل الخسائر..." />}>
                  <LazyRoutes.LossDeclarations />
                </Suspense>
              </PermissionGuard>
            </ConditionalRoute>
          } />
          
          {/* الموردين */}
          <Route path="/dashboard/suppliers" element={
            <Suspense fallback={<PageLoader message="جاري تحميل الموردين..." />}>
              <LazyRoutes.SuppliersManagement />
            </Suspense>
          } />
          
          {/* إضافة مورد جديد */}
          <Route path="/dashboard/suppliers/new" element={
            <PermissionGuard requiredPermissions={['manageSuppliers']}>
              <Suspense fallback={<PageLoader message="جاري تحميل نموذج مورد جديد..." />}>
                <LazyRoutes.SuppliersManagement />
              </Suspense>
            </PermissionGuard>
          } />
          
          <Route path="/dashboard/suppliers/purchases" element={
            <Suspense fallback={<PageLoader message="جاري تحميل مشتريات الموردين..." />}>
              <LazyRoutes.SupplierPurchases />
            </Suspense>
          } />
          
          {/* إضافة مشتريات جديدة من الموردين */}
          <Route path="/dashboard/suppliers/purchases/new" element={
            <PermissionGuard requiredPermissions={['manageSuppliers']}>
              <Suspense fallback={<PageLoader message="جاري تحميل نموذج مشتريات جديدة..." />}>
                <LazyRoutes.SupplierPurchases />
              </Suspense>
            </PermissionGuard>
          } />
          
          {/* عرض تفاصيل مشتريات من المورد */}
          <Route path="/dashboard/suppliers/purchases/:purchaseId" element={
            <Suspense fallback={<PageLoader message="جاري تحميل تفاصيل المشتريات..." />}>
              <LazyRoutes.SupplierPurchases />
            </Suspense>
          } />
          
          {/* تعديل مشتريات من المورد */}
          <Route path="/dashboard/suppliers/purchases/:purchaseId/edit" element={
            <PermissionGuard requiredPermissions={['manageSuppliers']}>
              <Suspense fallback={<PageLoader message="جاري تحميل تعديل المشتريات..." />}>
                <LazyRoutes.SupplierPurchases />
              </Suspense>
            </PermissionGuard>
          } />
          
          <Route path="/dashboard/suppliers/payments" element={
            <Suspense fallback={<PageLoader message="جاري تحميل مدفوعات الموردين..." />}>
              <LazyRoutes.SupplierPayments />
            </Suspense>
          } />
          
          {/* إضافة دفعة جديدة للمورد */}
          <Route path="/dashboard/suppliers/payments/new" element={
            <PermissionGuard requiredPermissions={['manageSuppliers']}>
              <Suspense fallback={<PageLoader message="جاري تحميل نموذج دفعة جديدة..." />}>
                <LazyRoutes.SupplierPayments />
              </Suspense>
            </PermissionGuard>
          } />
          
          {/* عرض تفاصيل دفعة للمورد */}
          <Route path="/dashboard/suppliers/payments/:paymentId" element={
            <Suspense fallback={<PageLoader message="جاري تحميل تفاصيل الدفعة..." />}>
              <LazyRoutes.SupplierPayments />
            </Suspense>
          } />
          
          <Route path="/dashboard/suppliers/reports" element={
            <PermissionGuard requiredPermissions={['viewReports']}>
              <Suspense fallback={<PageLoader message="جاري تحميل تقارير الموردين..." />}>
                <LazyRoutes.SupplierReports />
              </Suspense>
            </PermissionGuard>
          } />
          
          {/* تحميل الألعاب */}
          <Route path="/dashboard/game-downloads" element={
            <ConditionalRoute appId="game-downloads">
              <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
                <Suspense fallback={<PageLoader message="جاري تحميل إدارة الألعاب..." />}>
                  <LazyRoutes.GameDownloadsPage />
                </Suspense>
              </PermissionGuard>
            </ConditionalRoute>
          } />
          
          {/* الإعدادات */}
          <Route path="/dashboard/settings" element={
            <Suspense fallback={<PageLoader message="جاري تحميل الإعدادات..." />}>
              <LazyRoutes.SettingsPage />
            </Suspense>
          } />
          
          <Route path="/dashboard/settings/:section" element={
            <Suspense fallback={<PageLoader message="جاري تحميل الإعدادات..." />}>
              <LazyRoutes.SettingsPage />
            </Suspense>
          } />
          
          {/* محرر المتجر */}
          <Route path="/dashboard/store-editor" element={
            <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
              <Suspense fallback={<PageLoader message="جاري تحميل محرر المتجر..." />}>
                <LazyRoutes.StoreEditor />
              </Suspense>
            </PermissionGuard>
          } />
          
          {/* محرر المتجر V2 */}
          <Route path="/dashboard/store-editor-v2" element={
            <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
              <Suspense fallback={<PageLoader message="جاري تحميل محرر المتجر V2..." />}>
                <LazyRoutes.StoreEditorV2 />
              </Suspense>
            </PermissionGuard>
          } />
          
          {/* إعدادات المتجر */}
          <Route path="/dashboard/store-settings" element={
            <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
              <Suspense fallback={<PageLoader message="جاري تحميل إعدادات المتجر..." />}>
                <LazyRoutes.StoreSettingsPage />
              </Suspense>
            </PermissionGuard>
          } />
          
          {/* إدارة النطاقات */}
          <Route path="/dashboard/custom-domains" element={
            <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
              <Suspense fallback={<PageLoader message="جاري تحميل النطاقات..." />}>
                <LazyRoutes.DomainSettings />
              </Suspense>
            </PermissionGuard>
          } />
          
          {/* خدمات الاشتراك */}
          <Route path="/dashboard/subscription-services" element={
            <ConditionalRoute appId="subscription-services">
              <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
                <Suspense fallback={<PageLoader message="جاري تحميل خدمات الاشتراك..." />}>
                  <LazyRoutes.SubscriptionServices />
                </Suspense>
              </PermissionGuard>
            </ConditionalRoute>
          } />
          
          <Route path="/dashboard/delivery" element={
            <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
              <Suspense fallback={<PageLoader message="جاري تحميل إدارة التوصيل..." />}>
                <LazyRoutes.DeliveryManagement />
              </Suspense>
            </PermissionGuard>
          } />
          
          <Route path="/dashboard/apps" element={
            <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
              <Suspense fallback={<PageLoader message="جاري تحميل التطبيقات..." />}>
                <LazyRoutes.AppsManagement />
              </Suspense>
            </PermissionGuard>
          } />
          
          {/* صفحات الهبوط والنماذج */}
          <Route path="/dashboard/landing-pages" element={
            <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
              <Suspense fallback={<PageLoader message="جاري تحميل صفحات الهبوط..." />}>
                <LazyRoutes.LandingPagesManager />
              </Suspense>
            </PermissionGuard>
          } />
          
          <Route path="/landing-page-builder/:id" element={
            <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
              <Suspense fallback={<PageLoader message="جاري تحميل منشئ صفحة الهبوط..." />}>
                <LazyRoutes.LandingPageBuilder />
              </Suspense>
            </PermissionGuard>
          } />
          
          <Route path="/dashboard/thank-you-editor" element={
            <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
              <Suspense fallback={<PageLoader message="جاري تحميل محرر صفحة الشكر..." />}>
                <LazyRoutes.ThankYouPageEditor />
              </Suspense>
            </PermissionGuard>
          } />
          
          <Route path="/dashboard/form-settings" element={
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
          
          <Route path="/dashboard/custom-pages" element={
            <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
              <Suspense fallback={<PageLoader message="جاري تحميل الصفحات المخصصة..." />}>
                <LazyRoutes.CustomPagesManager />
              </Suspense>
            </PermissionGuard>
          } />

          {/* مسارات مركز الاتصالات */}
          <Route path="/dashboard/call-center" element={
            <ConditionalRoute appId="call-center">
              <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
                <Suspense fallback={<PageLoader message="جاري تحميل مركز الاتصالات..." />}>
                  <LazyRoutes.CallCenterComingSoon />
                </Suspense>
              </PermissionGuard>
            </ConditionalRoute>
          } />
          
          <Route path="/dashboard/call-center/agents" element={
            <ConditionalRoute appId="call-center">
              <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
                <Suspense fallback={<PageLoader message="جاري تحميل إدارة الوكلاء..." />}>
                  <LazyRoutes.CallCenterComingSoon />
                </Suspense>
              </PermissionGuard>
            </ConditionalRoute>
          } />
          
          <Route path="/dashboard/call-center/distribution" element={
            <ConditionalRoute appId="call-center">
              <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
                <Suspense fallback={<PageLoader message="جاري تحميل إعدادات التوزيع..." />}>
                  <LazyRoutes.CallCenterComingSoon />
                </Suspense>
              </PermissionGuard>
            </ConditionalRoute>
          } />
          
          <Route path="/dashboard/call-center/reports" element={
            <ConditionalRoute appId="call-center">
              <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
                <Suspense fallback={<PageLoader message="جاري تحميل التقارير..." />}>
                  <LazyRoutes.CallCenterComingSoon />
                </Suspense>
              </PermissionGuard>
            </ConditionalRoute>
          } />
          
          <Route path="/dashboard/call-center/monitoring" element={
            <ConditionalRoute appId="call-center">
              <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
                <Suspense fallback={<PageLoader message="جاري تحميل المراقبة المباشرة..." />}>
                  <LazyRoutes.CallCenterComingSoon />
                </Suspense>
              </PermissionGuard>
            </ConditionalRoute>
          } />

          {/* فهرس الدورات التعليمية */}
          <Route path="/dashboard/courses" element={
            <Suspense fallback={<PageLoader message="جاري تحميل الدورات التعليمية..." />}>
              <LazyRoutes.CoursesIndex />
            </Suspense>
          } />

          {/* دورة التسويق الإلكتروني */}
          <Route path="/dashboard/courses/digital-marketing" element={
            <Suspense fallback={<PageLoader message="جاري تحميل دورة التسويق الإلكتروني..." />}>
              <LazyRoutes.DigitalMarketingCourse />
            </Suspense>
          } />

          {/* دورة التجارة الإلكترونية والدفع عند الاستلام */}
          <Route path="/dashboard/courses/e-commerce" element={
            <Suspense fallback={<PageLoader message="جاري تحميل دورة التجارة الإلكترونية..." />}>
              <LazyRoutes.ECommerceCourse />
            </Suspense>
          } />

          {/* المحور الأول - أساسيات التجارة الإلكترونية */}
          <Route path="/dashboard/courses/e-commerce/module/1" element={
            <Suspense fallback={<PageLoader message="جاري تحميل أساسيات التجارة الإلكترونية..." />}>
              <LazyRoutes.ECommerceModule1 />
            </Suspense>
          } />

          {/* المحور الثاني - استراتيجيات وأدوات التجارة الإلكترونية */}
          <Route path="/dashboard/courses/e-commerce/module/2" element={
            <Suspense fallback={<PageLoader message="جاري تحميل استراتيجيات التجارة الإلكترونية..." />}>
              <LazyRoutes.ECommerceModule2 />
            </Suspense>
          } />

          {/* دورة إنشاء متجر إلكتروني عبر سطوكيها */}
          <Route path="/dashboard/courses/e-commerce-store" element={
            <Suspense fallback={<PageLoader message="جاري تحميل دورة إنشاء المتجر..." />}>
              <LazyRoutes.ECommerceStoreCourse />
            </Suspense>
          } />

          {/* دورة تيك توك أدس الشاملة */}
          <Route path="/dashboard/courses/tiktok-marketing" element={
            <Suspense fallback={<PageLoader message="جاري تحميل دورة تيك توك أدس..." />}>
              <LazyRoutes.TikTokAdsCourse />
            </Suspense>
          } />

          {/* دورة التجار التقليديين */}
          <Route path="/dashboard/courses/traditional-business" element={
            <Suspense fallback={<PageLoader message="جاري تحميل دورة التجار التقليديين..." />}>
              <LazyRoutes.TraditionalBusinessCourse />
            </Suspense>
          } />

          {/* دورة مقدمي الخدمات والتصليحات */}
          <Route path="/dashboard/courses/service-providers" element={
            <Suspense fallback={<PageLoader message="جاري تحميل دورة مقدمي الخدمات..." />}>
              <LazyRoutes.ServiceProvidersCourse />
            </Suspense>
          } />

          {/* جميع محاور دورة التسويق الإلكتروني */}
          <Route path="/dashboard/courses/digital-marketing/module/1" element={
            <Suspense fallback={<PageLoader message="جاري تحميل المحور الأول..." />}>
              <LazyRoutes.DigitalMarketingModule1 />
            </Suspense>
          } />

          <Route path="/dashboard/courses/digital-marketing/module/2" element={
            <Suspense fallback={<PageLoader message="جاري تحميل المحور الثاني..." />}>
              <LazyRoutes.DigitalMarketingModule2 />
            </Suspense>
          } />

          <Route path="/dashboard/courses/digital-marketing/module/3" element={
            <Suspense fallback={<PageLoader message="جاري تحميل المحور الثالث..." />}>
              <LazyRoutes.DigitalMarketingModule3 />
            </Suspense>
          } />

          <Route path="/dashboard/courses/digital-marketing/module/4" element={
            <Suspense fallback={<PageLoader message="جاري تحميل المحور الرابع..." />}>
              <LazyRoutes.DigitalMarketingModule4 />
            </Suspense>
          } />

          <Route path="/dashboard/courses/digital-marketing/module/5" element={
            <Suspense fallback={<PageLoader message="جاري تحميل المحور الخامس..." />}>
              <LazyRoutes.DigitalMarketingModule5 />
            </Suspense>
          } />

          <Route path="/dashboard/courses/digital-marketing/module/6" element={
            <Suspense fallback={<PageLoader message="جاري تحميل المحور السادس..." />}>
              <LazyRoutes.DigitalMarketingModule6 />
            </Suspense>
          } />

          <Route path="/dashboard/courses/digital-marketing/module/7" element={
            <Suspense fallback={<PageLoader message="جاري تحميل المحور السابع..." />}>
              <LazyRoutes.DigitalMarketingModule7 />
            </Suspense>
          } />

          <Route path="/dashboard/courses/digital-marketing/module/8" element={
            <Suspense fallback={<PageLoader message="جاري تحميل المحور الثامن..." />}>
              <LazyRoutes.DigitalMarketingModule8 />
            </Suspense>
          } />

          <Route path="/dashboard/courses/digital-marketing/module/9" element={
            <Suspense fallback={<PageLoader message="جاري تحميل المحور التاسع..." />}>
              <LazyRoutes.DigitalMarketingModule9 />
            </Suspense>
          } />

          <Route path="/dashboard/courses/digital-marketing/module/10" element={
            <Suspense fallback={<PageLoader message="جاري تحميل المحور العاشر..." />}>
              <LazyRoutes.DigitalMarketingModule10 />
            </Suspense>
          } />

          <Route path="/dashboard/courses/digital-marketing/module/11" element={
            <Suspense fallback={<PageLoader message="جاري تحميل المحور الحادي عشر..." />}>
              <LazyRoutes.DigitalMarketingModule11 />
            </Suspense>
          } />

          <Route path="/dashboard/courses/digital-marketing/module/12" element={
            <Suspense fallback={<PageLoader message="جاري تحميل المحور الثاني عشر..." />}>
              <LazyRoutes.DigitalMarketingModule12 />
            </Suspense>
          } />

          {/* جميع محاور دورة تيك توك أدس */}
          <Route path="/dashboard/courses/tiktok-marketing/module/0" element={
            <Suspense fallback={<PageLoader message="جاري تحميل سياسة تيك توك..." />}>
              <LazyRoutes.TikTokAdsModule0 />
            </Suspense>
          } />

          <Route path="/dashboard/courses/tiktok-marketing/module/1" element={
            <Suspense fallback={<PageLoader message="جاري تحميل المقدمة..." />}>
              <LazyRoutes.TikTokAdsModule1 />
            </Suspense>
          } />

          <Route path="/dashboard/courses/tiktok-marketing/module/2" element={
            <Suspense fallback={<PageLoader message="جاري تحميل الحسابات الإعلانية..." />}>
              <LazyRoutes.TikTokAdsModule2 />
            </Suspense>
          } />

          <Route path="/dashboard/courses/tiktok-marketing/module/3" element={
            <Suspense fallback={<PageLoader message="جاري تحميل أساسيات مدير الإعلانات..." />}>
              <LazyRoutes.TikTokAdsModule3 />
            </Suspense>
          } />

          <Route path="/dashboard/courses/tiktok-marketing/module/4" element={
            <Suspense fallback={<PageLoader message="جاري تحميل أهداف الحملة..." />}>
              <LazyRoutes.TikTokAdsModule4 />
            </Suspense>
          } />

          <Route path="/dashboard/courses/tiktok-marketing/module/5" element={
            <Suspense fallback={<PageLoader message="جاري تحميل إعداد المجموعة الإعلانية..." />}>
              <LazyRoutes.TikTokAdsModule5 />
            </Suspense>
          } />

          <Route path="/dashboard/courses/tiktok-marketing/module/6" element={
            <Suspense fallback={<PageLoader message="جاري تحميل تصميم الإعلان..." />}>
              <LazyRoutes.TikTokAdsModule6 />
            </Suspense>
          } />

          <Route path="/dashboard/courses/tiktok-marketing/module/7" element={
            <Suspense fallback={<PageLoader message="جاري تحميل الإضافات المهمة..." />}>
              <LazyRoutes.TikTokAdsModule7 />
            </Suspense>
          } />

          <Route path="/dashboard/courses/tiktok-marketing/module/8" element={
            <Suspense fallback={<PageLoader message="جاري تحميل البكسل والجماهير المخصصة..." />}>
              <LazyRoutes.TikTokAdsModule8 />
            </Suspense>
          } />

        </Route>
        
        {/* صفحة الاشتراك - خارج SubscriptionCheck لتجنب اللوب */}
        <Route path="/dashboard/subscription" element={
          <Suspense fallback={<PageLoader message="جاري تحميل الاشتراك..." />}>
            <LazyRoutes.SubscriptionPage />
          </Suspense>
        } />

      </Route>
    </Route>
  </>
);

export default DashboardRoutes;
