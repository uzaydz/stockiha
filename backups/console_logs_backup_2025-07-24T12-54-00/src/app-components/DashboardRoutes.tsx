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
        
        {/* إضافة منتج جديد */}
        <Route path="/dashboard/products/new" element={
          <SubscriptionCheck>
            <PermissionGuard requiredPermissions={['manageProducts']}>
              <Suspense fallback={<PageLoader message="جاري تحميل نموذج المنتج..." />}>
                <LazyRoutes.ProductForm />
              </Suspense>
            </PermissionGuard>
          </SubscriptionCheck>
        } />
        
        {/* تعديل منتج موجود */}
        <Route path="/dashboard/product/:id" element={
          <SubscriptionCheck>
            <PermissionGuard requiredPermissions={['editProducts']}>
              <Suspense fallback={<PageLoader message="جاري تحميل تعديل المنتج..." />}>
                <LazyRoutes.ProductForm />
              </Suspense>
            </PermissionGuard>
          </SubscriptionCheck>
        } />
        
        {/* تخصيص صفحة شراء المنتج */}
        <Route path="/dashboard/products/:productId/customize-purchase-page" element={
          <SubscriptionCheck>
            <PermissionGuard requiredPermissions={['editProducts']}>
              <Suspense fallback={<PageLoader message="جاري تحميل تخصيص صفحة الشراء..." />}>
                <LazyRoutes.CustomizeProductPurchasePage />
              </Suspense>
            </PermissionGuard>
          </SubscriptionCheck>
        } />
        
        <Route path="/dashboard/inventory" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل المخزون..." />}>
              <LazyRoutes.Inventory />
            </Suspense>
          </SubscriptionCheck>
        } />
        
        {/* تتبع المخزون المتقدم */}
        <Route path="/dashboard/inventory-tracking" element={
          <SubscriptionCheck>
            <PermissionGuard requiredPermissions={['viewInventory']}>
              <Suspense fallback={<PageLoader message="جاري تحميل تتبع المخزون المتقدم..." />}>
                <LazyRoutes.AdvancedInventoryTracking />
              </Suspense>
            </PermissionGuard>
          </SubscriptionCheck>
        } />
        
        {/* الطباعة السريعة للباركود */}
        <Route path="/dashboard/quick-barcode-print" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل الطباعة السريعة..." />}>
              <LazyRoutes.QuickBarcodePrintPage />
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
        
        {/* خدمات الإصلاح */}
        <Route path="/dashboard/repair-services" element={
          <ConditionalRoute appId="repair-services">
            <SubscriptionCheck>
              <PermissionGuard requiredPermissions={['viewServices']}>
                <Suspense fallback={<PageLoader message="جاري تحميل خدمات الإصلاح..." />}>
                  <LazyRoutes.RepairServices />
                </Suspense>
              </PermissionGuard>
            </SubscriptionCheck>
          </ConditionalRoute>
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
        
        {/* الطلبيات المتقدمة */}
        <Route path="/dashboard/advanced-orders" element={
          <SubscriptionCheck>
            <PermissionGuard requiredPermissions={['viewOrders']}>
              <Suspense fallback={<PageLoader message="جاري تحميل الطلبيات المتقدمة..." />}>
                <LazyRoutes.AdvancedOrders />
              </Suspense>
            </PermissionGuard>
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
        
        {/* التحليلات المالية الشاملة */}
        <Route path="/dashboard/financial-analytics" element={
          <SubscriptionCheck>
            <PermissionGuard requiredPermissions={['viewFinancialReports']}>
              <Suspense fallback={<PageLoader message="جاري تحميل التحليلات المالية..." />}>
                <LazyRoutes.FinancialAnalytics />
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
        
        {/* نقطة البيع المتقدمة */}
        <Route path="/dashboard/pos-advanced" element={
          <ConditionalRoute appId="pos-system">
            <SubscriptionCheck>
              <PermissionGuard requiredPermissions={['accessPOS']}>
                <Suspense fallback={<PageLoader message="جاري تحميل نقطة البيع المتقدمة..." />}>
                  <LazyRoutes.POSAdvanced />
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
        
        {/* إضافة مورد جديد */}
        <Route path="/dashboard/suppliers/new" element={
          <SubscriptionCheck>
            <PermissionGuard requiredPermissions={['manageSuppliers']}>
              <Suspense fallback={<PageLoader message="جاري تحميل نموذج مورد جديد..." />}>
                <LazyRoutes.SuppliersManagement />
              </Suspense>
            </PermissionGuard>
          </SubscriptionCheck>
        } />
        
        <Route path="/dashboard/suppliers/purchases" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل مشتريات الموردين..." />}>
              <LazyRoutes.SupplierPurchases />
            </Suspense>
          </SubscriptionCheck>
        } />
        
        {/* إضافة مشتريات جديدة من الموردين */}
        <Route path="/dashboard/suppliers/purchases/new" element={
          <SubscriptionCheck>
            <PermissionGuard requiredPermissions={['manageSuppliers']}>
              <Suspense fallback={<PageLoader message="جاري تحميل نموذج مشتريات جديدة..." />}>
                <LazyRoutes.SupplierPurchases />
              </Suspense>
            </PermissionGuard>
          </SubscriptionCheck>
        } />
        
        {/* عرض تفاصيل مشتريات من المورد */}
        <Route path="/dashboard/suppliers/purchases/:purchaseId" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل تفاصيل المشتريات..." />}>
              <LazyRoutes.SupplierPurchases />
            </Suspense>
          </SubscriptionCheck>
        } />
        
        {/* تعديل مشتريات من المورد */}
        <Route path="/dashboard/suppliers/purchases/:purchaseId/edit" element={
          <SubscriptionCheck>
            <PermissionGuard requiredPermissions={['manageSuppliers']}>
              <Suspense fallback={<PageLoader message="جاري تحميل تعديل المشتريات..." />}>
                <LazyRoutes.SupplierPurchases />
              </Suspense>
            </PermissionGuard>
          </SubscriptionCheck>
        } />
        
        <Route path="/dashboard/suppliers/payments" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل مدفوعات الموردين..." />}>
              <LazyRoutes.SupplierPayments />
            </Suspense>
          </SubscriptionCheck>
        } />
        
        {/* إضافة دفعة جديدة للمورد */}
        <Route path="/dashboard/suppliers/payments/new" element={
          <SubscriptionCheck>
            <PermissionGuard requiredPermissions={['manageSuppliers']}>
              <Suspense fallback={<PageLoader message="جاري تحميل نموذج دفعة جديدة..." />}>
                <LazyRoutes.SupplierPayments />
              </Suspense>
            </PermissionGuard>
          </SubscriptionCheck>
        } />
        
        {/* عرض تفاصيل دفعة للمورد */}
        <Route path="/dashboard/suppliers/payments/:paymentId" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل تفاصيل الدفعة..." />}>
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
        
        {/* تحميل الألعاب */}
        <Route path="/dashboard/game-downloads" element={
          <ConditionalRoute appId="game-downloads">
            <SubscriptionCheck>
              <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
                <Suspense fallback={<PageLoader message="جاري تحميل إدارة الألعاب..." />}>
                  <LazyRoutes.GameDownloadsPage />
                </Suspense>
              </PermissionGuard>
            </SubscriptionCheck>
          </ConditionalRoute>
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
        
        {/* محرر المتجر */}
        <Route path="/dashboard/store-editor" element={
          <SubscriptionCheck>
            <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
              <Suspense fallback={<PageLoader message="جاري تحميل محرر المتجر..." />}>
                <LazyRoutes.StoreEditor />
              </Suspense>
            </PermissionGuard>
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
        
        {/* صفحات الهبوط والنماذج */}
        <Route path="/dashboard/landing-pages" element={
          <SubscriptionCheck>
            <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
              <Suspense fallback={<PageLoader message="جاري تحميل صفحات الهبوط..." />}>
                <LazyRoutes.LandingPagesManager />
              </Suspense>
            </PermissionGuard>
          </SubscriptionCheck>
        } />
        
        <Route path="/landing-page-builder/:id" element={
          <SubscriptionCheck>
            <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
              <Suspense fallback={<PageLoader message="جاري تحميل منشئ صفحة الهبوط..." />}>
                <LazyRoutes.LandingPageBuilder />
              </Suspense>
            </PermissionGuard>
          </SubscriptionCheck>
        } />
        
        <Route path="/dashboard/thank-you-editor" element={
          <SubscriptionCheck>
            <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
              <Suspense fallback={<PageLoader message="جاري تحميل محرر صفحة الشكر..." />}>
                <LazyRoutes.ThankYouPageEditor />
              </Suspense>
            </PermissionGuard>
          </SubscriptionCheck>
        } />
        
        <Route path="/dashboard/form-settings" element={
          <SubscriptionCheck>
            <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
              <Suspense fallback={<PageLoader message="جاري تحميل إعدادات النماذج..." />}>
                <LazyRoutes.FormSettings />
              </Suspense>
            </PermissionGuard>
          </SubscriptionCheck>
        } />
        
        <Route path="/form-builder/:formId" element={
          <SubscriptionCheck>
            <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
              <Suspense fallback={<PageLoader message="جاري تحميل منشئ النماذج..." />}>
                <LazyRoutes.FormBuilder />
              </Suspense>
            </PermissionGuard>
          </SubscriptionCheck>
        } />
        
        <Route path="/dashboard/custom-pages" element={
          <SubscriptionCheck>
            <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
              <Suspense fallback={<PageLoader message="جاري تحميل الصفحات المخصصة..." />}>
                <LazyRoutes.CustomPagesManager />
              </Suspense>
            </PermissionGuard>
          </SubscriptionCheck>
        } />

        {/* مسارات مركز الاتصالات */}
        <Route path="/dashboard/call-center" element={
          <ConditionalRoute appId="call-center">
            <SubscriptionCheck>
              <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
                <Suspense fallback={<PageLoader message="جاري تحميل مركز الاتصالات..." />}>
                  <LazyRoutes.CallCenterComingSoon />
                </Suspense>
              </PermissionGuard>
            </SubscriptionCheck>
          </ConditionalRoute>
        } />
        
        <Route path="/dashboard/call-center/agents" element={
          <ConditionalRoute appId="call-center">
            <SubscriptionCheck>
              <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
                <Suspense fallback={<PageLoader message="جاري تحميل إدارة الوكلاء..." />}>
                  <LazyRoutes.CallCenterComingSoon />
                </Suspense>
              </PermissionGuard>
            </SubscriptionCheck>
          </ConditionalRoute>
        } />
        
        <Route path="/dashboard/call-center/distribution" element={
          <ConditionalRoute appId="call-center">
            <SubscriptionCheck>
              <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
                <Suspense fallback={<PageLoader message="جاري تحميل إعدادات التوزيع..." />}>
                  <LazyRoutes.CallCenterComingSoon />
                </Suspense>
              </PermissionGuard>
            </SubscriptionCheck>
          </ConditionalRoute>
        } />
        
        <Route path="/dashboard/call-center/reports" element={
          <ConditionalRoute appId="call-center">
            <SubscriptionCheck>
              <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
                <Suspense fallback={<PageLoader message="جاري تحميل التقارير..." />}>
                  <LazyRoutes.CallCenterComingSoon />
                </Suspense>
              </PermissionGuard>
            </SubscriptionCheck>
          </ConditionalRoute>
        } />
        
        <Route path="/dashboard/call-center/monitoring" element={
          <ConditionalRoute appId="call-center">
            <SubscriptionCheck>
              <PermissionGuard requiredPermissions={['manageOrganizationSettings']}>
                <Suspense fallback={<PageLoader message="جاري تحميل المراقبة المباشرة..." />}>
                  <LazyRoutes.CallCenterComingSoon />
                </Suspense>
              </PermissionGuard>
            </SubscriptionCheck>
          </ConditionalRoute>
        } />

        {/* فهرس الدورات التعليمية */}
        <Route path="/dashboard/courses" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل الدورات التعليمية..." />}>
              <LazyRoutes.CoursesIndex />
            </Suspense>
          </SubscriptionCheck>
        } />

        {/* دورة التسويق الإلكتروني */}
        <Route path="/dashboard/courses/digital-marketing" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل دورة التسويق الإلكتروني..." />}>
              <LazyRoutes.DigitalMarketingCourse />
            </Suspense>
          </SubscriptionCheck>
        } />

        {/* دورة التجارة الإلكترونية والدفع عند الاستلام */}
        <Route path="/dashboard/courses/e-commerce" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل دورة التجارة الإلكترونية..." />}>
              <LazyRoutes.ECommerceCourse />
            </Suspense>
          </SubscriptionCheck>
        } />

        {/* المحور الأول - أساسيات التجارة الإلكترونية */}
        <Route path="/dashboard/courses/e-commerce/module/1" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل أساسيات التجارة الإلكترونية..." />}>
              <LazyRoutes.ECommerceModule1 />
            </Suspense>
          </SubscriptionCheck>
        } />

        {/* المحور الثاني - استراتيجيات وأدوات التجارة الإلكترونية */}
        <Route path="/dashboard/courses/e-commerce/module/2" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل استراتيجيات التجارة الإلكترونية..." />}>
              <LazyRoutes.ECommerceModule2 />
            </Suspense>
          </SubscriptionCheck>
        } />

        {/* دورة إنشاء متجر إلكتروني عبر سطوكيها */}
        <Route path="/dashboard/courses/e-commerce-store" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل دورة إنشاء المتجر..." />}>
              <LazyRoutes.ECommerceStoreCourse />
            </Suspense>
          </SubscriptionCheck>
        } />

        {/* دورة تيك توك أدس الشاملة */}
        <Route path="/dashboard/courses/tiktok-marketing" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل دورة تيك توك أدس..." />}>
              <LazyRoutes.TikTokAdsCourse />
            </Suspense>
          </SubscriptionCheck>
        } />

        {/* دورة التجار التقليديين */}
        <Route path="/dashboard/courses/traditional-business" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل دورة التجار التقليديين..." />}>
              <LazyRoutes.TraditionalBusinessCourse />
            </Suspense>
          </SubscriptionCheck>
        } />

        {/* دورة مقدمي الخدمات والتصليحات */}
        <Route path="/dashboard/courses/service-providers" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل دورة مقدمي الخدمات..." />}>
              <LazyRoutes.ServiceProvidersCourse />
            </Suspense>
          </SubscriptionCheck>
        } />

        {/* المحور الأول - البداية في التسويق الإلكتروني */}
        <Route path="/dashboard/courses/digital-marketing/module/1" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل المحور الأول..." />}>
              <LazyRoutes.DigitalMarketingModule1 />
            </Suspense>
          </SubscriptionCheck>
        } />

        {/* المحور الثاني - التصميم هو الحل */}
        <Route path="/dashboard/courses/digital-marketing/module/2" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل المحور الثاني..." />}>
              <LazyRoutes.DigitalMarketingModule2 />
            </Suspense>
          </SubscriptionCheck>
        } />

        {/* المحور الثالث - الإعلانات البسيطة */}
        <Route path="/dashboard/courses/digital-marketing/module/3" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل المحور الثالث..." />}>
              <LazyRoutes.DigitalMarketingModule3 />
            </Suspense>
          </SubscriptionCheck>
        } />

        {/* المحور الرابع - مدير الأعمال ومدير الإعلانات */}
        <Route path="/dashboard/courses/digital-marketing/module/4" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل المحور الرابع..." />}>
              <LazyRoutes.DigitalMarketingModule4 />
            </Suspense>
          </SubscriptionCheck>
        } />

        {/* المحور الخامس - أهداف الحملات الإعلانية */}
        <Route path="/dashboard/courses/digital-marketing/module/5" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل المحور الخامس..." />}>
              <LazyRoutes.DigitalMarketingModule5 />
            </Suspense>
          </SubscriptionCheck>
        } />

        {/* المحور السادس - تحسين وإعداد الحملات الإعلانية */}
        <Route path="/dashboard/courses/digital-marketing/module/6" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل المحور السادس..." />}>
              <LazyRoutes.DigitalMarketingModule6 />
            </Suspense>
          </SubscriptionCheck>
        } />

        {/* المحور السابع - تقنيات الإعلان المتقدمة */}
        <Route path="/dashboard/courses/digital-marketing/module/7" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل المحور السابع..." />}>
              <LazyRoutes.DigitalMarketingModule7 />
            </Suspense>
          </SubscriptionCheck>
        } />

        {/* المحور الثامن - إتقان استهداف الجماهير */}
        <Route path="/dashboard/courses/digital-marketing/module/8" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل المحور الثامن..." />}>
              <LazyRoutes.DigitalMarketingModule8 />
            </Suspense>
          </SubscriptionCheck>
        } />

        {/* المحور التاسع - إطلاق وتحسين الحملات الإعلانية */}
        <Route path="/dashboard/courses/digital-marketing/module/9" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل المحور التاسع..." />}>
              <LazyRoutes.DigitalMarketingModule9 />
            </Suspense>
          </SubscriptionCheck>
        } />

        {/* المحور العاشر - بوت الصفحة والتفاعل التلقائي */}
        <Route path="/dashboard/courses/digital-marketing/module/10" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل المحور العاشر..." />}>
              <LazyRoutes.DigitalMarketingModule10 />
            </Suspense>
          </SubscriptionCheck>
        } />

        {/* المحور الحادي عشر - فن التعامل مع العملاء */}
        <Route path="/dashboard/courses/digital-marketing/module/11" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل المحور الحادي عشر..." />}>
              <LazyRoutes.DigitalMarketingModule11 />
            </Suspense>
          </SubscriptionCheck>
        } />

        {/* المحور الثاني عشر - بكسل فيسبوك */}
        <Route path="/dashboard/courses/digital-marketing/module/12" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل المحور الثاني عشر..." />}>
              <LazyRoutes.DigitalMarketingModule12 />
            </Suspense>
          </SubscriptionCheck>
        } />

        {/* المحور الصفر - سياسة تيك توك */}
        <Route path="/dashboard/courses/tiktok-marketing/module/0" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل سياسة تيك توك..." />}>
              <LazyRoutes.TikTokAdsModule0 />
            </Suspense>
          </SubscriptionCheck>
        } />

        {/* المحور الأول - مقدمة لتيك توك أدس */}
        <Route path="/dashboard/courses/tiktok-marketing/module/1" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل المقدمة..." />}>
              <LazyRoutes.TikTokAdsModule1 />
            </Suspense>
          </SubscriptionCheck>
        } />

        {/* المحور الثاني - الحسابات الإعلانية على تيك توك */}
        <Route path="/dashboard/courses/tiktok-marketing/module/2" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل الحسابات الإعلانية..." />}>
              <LazyRoutes.TikTokAdsModule2 />
            </Suspense>
          </SubscriptionCheck>
        } />

        {/* المحور الثالث - أساسيات مدير إعلانات تيك توك */}
        <Route path="/dashboard/courses/tiktok-marketing/module/3" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل أساسيات مدير الإعلانات..." />}>
              <LazyRoutes.TikTokAdsModule3 />
            </Suspense>
          </SubscriptionCheck>
        } />

        {/* المحور الرابع - أهداف الحملة الإعلانية */}
        <Route path="/dashboard/courses/tiktok-marketing/module/4" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل أهداف الحملة..." />}>
              <LazyRoutes.TikTokAdsModule4 />
            </Suspense>
          </SubscriptionCheck>
        } />

        {/* المحور الخامس - إعداد المجموعة الإعلانية */}
        <Route path="/dashboard/courses/tiktok-marketing/module/5" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل إعداد المجموعة الإعلانية..." />}>
              <LazyRoutes.TikTokAdsModule5 />
            </Suspense>
          </SubscriptionCheck>
        } />

        {/* المحور السادس - البدء في تصميم الإعلان */}
        <Route path="/dashboard/courses/tiktok-marketing/module/6" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل تصميم الإعلان..." />}>
              <LazyRoutes.TikTokAdsModule6 />
            </Suspense>
          </SubscriptionCheck>
        } />

        {/* المحور السابع - إضافات مهمة في حملتك */}
        <Route path="/dashboard/courses/tiktok-marketing/module/7" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل الإضافات المهمة..." />}>
              <LazyRoutes.TikTokAdsModule7 />
            </Suspense>
          </SubscriptionCheck>
        } />

        {/* المحور الثامن - البكسل والجماهير المخصصة */}
        <Route path="/dashboard/courses/tiktok-marketing/module/8" element={
          <SubscriptionCheck>
            <Suspense fallback={<PageLoader message="جاري تحميل البكسل والجماهير المخصصة..." />}>
              <LazyRoutes.TikTokAdsModule8 />
            </Suspense>
          </SubscriptionCheck>
        } />

      </Route>
    </Route>
  </>
);

export default DashboardRoutes;
