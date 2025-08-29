import React, { Suspense, useCallback, useMemo } from 'react';
import { toast } from "sonner";
import { v4 as uuidv4 } from 'uuid';
import { Order } from '@/types/index';

// استيراد المكونات المحسنة
import POSPureLayout from '@/components/pos-layout/POSPureLayout';
import POSAdvancedContent from '@/components/pos-advanced/POSAdvancedContent';
import POSAdvancedCart from '@/components/pos-advanced/POSAdvancedCart';

// استيراد المكونات الجديدة
import {
  POSAdvancedHeader,
  POSAdvancedSearchStats,
  POSAdvancedPerformanceBar,
  POSAdvancedDialogs,
  POSAdvancedGlobalScanner,
  POSAdvancedLoadingSkeleton,
  POSAdvancedInitialLoading
} from '@/components/pos-advanced';

// استيراد Hooks الجديدة
import {
  usePOSAdvancedState,
  usePOSAdvancedDialogs,
  usePOSAdvancedProductHandlers
} from '@/hooks';

// استيراد مكونات UI
import { Skeleton } from "@/components/ui/skeleton";

// =================================================================
// 🚀 صفحة POS المتقدمة - مقسمة إلى مكونات منفصلة
// =================================================================

const POSAdvanced = () => {
  // استخدام Hook إدارة الحالة الرئيسية
  const {
    // البيانات الأساسية
    allProducts,
    products,
    filteredProducts,
    subscriptions,
    subscriptionCategories,
    productCategories,
    customers,
    currentUser,
    favoriteProducts,
    
    // حالة التحميل والأخطاء
    isLoading,
    isRefetching,
    error,
    errorMessage,
    executionTime,
    
    // حالة التطبيقات
    isAppEnabled,
    isStaff,
    
    // حالة pagination والبحث
    currentPage,
    pageSize,
    searchQuery,
    categoryFilter,
    
    // حالة السلة والطلبات
    tabs,
    activeTab,
    activeTabId,
    cartItems,
    selectedServices,
    selectedSubscriptions,
    isReturnMode,
    returnItems,
    returnReason,
    returnNotes,
    isSubmittingOrder,
    
    // دوال pagination والبحث
    handlePageChange,
    handleSearchChange,
    handleCategoryFilter,
    handlePageSizeChange,
    
    // دوال إدارة السلة
    setActiveTabId,
    addTab,
    removeTab,
    updateTab,
    addItemToCart,
    addVariantToCart,
    removeItemFromCart,
    updateItemQuantity,
    updateItemPrice,
    clearCart,
    addService,
    removeService,
    updateServicePrice,
    handleAddSubscription,
    removeSubscription,
    updateSubscriptionPrice,
    assignCustomerToTab,
    
    // دوال إدارة الإرجاع
    setReturnReason,
    setReturnNotes,
    addItemToReturnCart,
    addVariantToReturnCart,
    updateReturnItemQuantity,
    updateReturnItemPrice,
    removeReturnItem,
    clearReturnCart,
    toggleReturnMode,
    
    // دوال الطلبات
    handleSubmitOrder,
    processReturn: handleProcessReturn,
    refreshData: handleRefreshData,
    
    // دوال السكانر
    scanBarcode,
    isScannerLoading,
    barcodeBuffer,
    
    // دوال التحديث
    refreshData,
    updateProductStockInCache,
    getProductStock
  } = usePOSAdvancedState();

  // استخدام Hook إدارة النوافذ الحوارية
  const {
    // حالة النوافذ الحوارية
    isVariantDialogOpen,
    isPOSSettingsOpen,
    isRepairDialogOpen,
    isRepairPrintDialogOpen,
    isPrintDialogOpen,
    isCalculatorOpen,
    isQuickExpenseOpen,
    
    // دوال إدارة النوافذ الحوارية
    setIsVariantDialogOpen,
    setIsPOSSettingsOpen,
    setIsRepairDialogOpen,
    setIsRepairPrintDialogOpen,
    setIsPrintDialogOpen,
    setIsCalculatorOpen,
    setIsQuickExpenseOpen,
    
    // بيانات النوافذ الحوارية
    selectedProductForVariant,
    setSelectedProductForVariant,
    selectedRepairOrder,
    setSelectedRepairOrder,
    repairQueuePosition,
    setRepairQueuePosition,
    
    // بيانات الطباعة
    completedItems,
    completedServices,
    completedSubscriptions,
    completedTotal,
    completedSubtotal,
    completedDiscount,
    completedDiscountAmount,
    completedCustomerName,
    completedOrderNumber,
    completedOrderDate,
    completedPaidAmount,
    completedRemainingAmount,
    isPartialPayment,
    considerRemainingAsPartial,
    subscriptionAccountInfo,
    
    // دوال معالجة الأحداث
    handleRepairServiceSuccess,
    clearPrintData,
    savePrintData
  } = usePOSAdvancedDialogs();

  // استخدام Hook معالجة المنتجات
  const { handleProductWithVariants, handleAddVariantToCart } = usePOSAdvancedProductHandlers(
    isReturnMode,
    addItemToCart,
    addItemToReturnCart,
    addVariantToCart,
    addVariantToReturnCart,
    setSelectedProductForVariant,
    setIsVariantDialogOpen
  );

  // دالة submitOrder مخصصة مع حفظ بيانات الطباعة
  const handleSubmitOrderWithPrint = useCallback(async (
    customerId?: string, 
    notes?: string, 
    discount?: number, 
    discountType?: 'percentage' | 'fixed', 
    amountPaid?: number,
    paymentMethod?: string,
    isPartialPayment?: boolean,
    considerRemainingAsPartial?: boolean
  ): Promise<void> => {
    try {
      // حساب المبالغ
      const cartSubtotal = cartItems.reduce((total, item) => {
        const price = (item as any).customPrice || item.variantPrice || item.product.price || 0;
        return total + (price * item.quantity);
      }, 0);
      
      const servicesTotal = selectedServices.reduce((total, service) => total + (service.price || 0), 0);
      const subscriptionsTotal = selectedSubscriptions.reduce((total, subscription) => {
        const price = subscription.price || subscription.selling_price || subscription.purchase_price || 0;
        return total + price;
      }, 0);
      
      const subtotal = cartSubtotal + servicesTotal + subscriptionsTotal;
      const finalTotal = subtotal;
      const paidAmount = amountPaid !== undefined ? amountPaid : finalTotal;
      const remainingAmount = Math.max(0, finalTotal - paidAmount);
      const isActualPartialPayment = paidAmount < finalTotal;
      
      console.log('🔍 [POSAdvanced] handleSubmitOrderWithPrint - قبل استدعاء handleSubmitOrder:', {
        cartSubtotal,
        servicesTotal,
        subscriptionsTotal,
        subtotal,
        finalTotal,
        paidAmount,
        remainingAmount,
        discount,
        discountType,
        amountPaid,
        isActualPartialPayment
      });
      
      // حفظ البيانات للطباعة
      savePrintData({
        items: [...cartItems],
        services: [
          ...selectedServices,
          ...selectedSubscriptions.map(subscription => ({
            id: subscription.id,
            name: subscription.name || 'اشتراك',
            description: subscription.description || '',
            price: subscription.price || subscription.selling_price || subscription.purchase_price || 0,
            duration: subscription.duration || '',
            public_tracking_code: subscription.tracking_code || subscription.public_tracking_code,
            isSubscription: true,
            subscriptionDetails: {
              duration: subscription.duration,
              selectedPricing: subscription.selectedPricing
            }
          }))
        ],
        subscriptions: [...selectedSubscriptions],
        subtotal,
        total: isActualPartialPayment && !considerRemainingAsPartial ? paidAmount : finalTotal,
        discount: isActualPartialPayment && !considerRemainingAsPartial ? remainingAmount : 0,
        discountAmount: 0,
        customerName: customers.find(c => c.id === customerId)?.name,
        orderNumber: `POS-${Date.now()}`,
        paidAmount,
        remainingAmount: isActualPartialPayment && considerRemainingAsPartial ? remainingAmount : 0,
        isPartial: isActualPartialPayment && considerRemainingAsPartial,
        considerRemaining: considerRemainingAsPartial || false
      });

      await handleSubmitOrder(
        customerId, 
        notes, 
        discount || 0, 
        discountType || 'fixed', 
        amountPaid,
        paymentMethod || 'cash',
        isPartialPayment || false,
        considerRemainingAsPartial || false
      );
      
      // فتح نافذة الطباعة
      setIsPrintDialogOpen(true);
    } catch (error) {
      throw error;
    }
  }, [handleSubmitOrder, cartItems, selectedServices, selectedSubscriptions, customers, savePrintData, setIsPrintDialogOpen]);

  // تشخيص للتطوير
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [POSAdvanced] حالة التحميل:', {
      isLoading,
      isRefetching,
      error,
      errorMessage,
      hasProducts: allProducts?.length > 0,
      executionTime
    });
  }

  // معالجة حالة التحميل الأولي
  if (isLoading && !allProducts?.length) {
    return (
      <POSPureLayout
        onRefresh={refreshData}
        isRefreshing={true}
        connectionStatus="reconnecting"
      >
        <POSAdvancedInitialLoading />
      </POSPureLayout>
    );
  }

  // معالجة حالة الخطأ (فقط إذا كان هناك خطأ حقيقي وليس مجرد تحميل)
  if (error && !isLoading && !allProducts?.length) {
    return (
      <POSPureLayout
        onRefresh={refreshData}
        isRefreshing={isRefetching}
        executionTime={executionTime}
        connectionStatus="reconnecting"
      >
        <POSAdvancedLoadingSkeleton />
      </POSPureLayout>
    );
  }

  return (
    <POSPureLayout
      onRefresh={refreshData}
      isRefreshing={isRefetching}
      executionTime={executionTime}
      connectionStatus="connected"
      style={{
        willChange: 'transform',
        containment: 'layout style paint',
        transform: 'translateZ(0)'
      }}
    >
      {/* مؤشر السكانر العالمي */}
             <POSAdvancedGlobalScanner
         products={products}
         isReturnMode={isReturnMode}
         isScannerLoading={isScannerLoading}
         scanBarcode={async (barcode: string) => {
           const response = await scanBarcode(barcode);
           return {
             success: response.success,
             data: response.data as any
           };
         }}
         addItemToCart={addItemToCart}
         addItemToReturnCart={addItemToReturnCart}
         handleProductWithVariants={handleProductWithVariants}
       />
      
      {/* تخطيط POS محسن - متناسق - بدون header إضافي */}
      <div className="h-screen flex flex-col space-y-2 p-2 lg:p-3 bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 overflow-hidden">
        {/* الترويسة المحسنة */}
        <POSAdvancedHeader
          isReturnMode={isReturnMode}
          returnItemsCount={returnItems.length}
          toggleReturnMode={toggleReturnMode}
          onCalculatorOpen={() => setIsCalculatorOpen(true)}
          onSettingsOpen={() => setIsPOSSettingsOpen(true)}
          onRepairOpen={() => setIsRepairDialogOpen(true)}
          onQuickExpenseOpen={() => setIsQuickExpenseOpen(true)}
          isRepairEnabled={isAppEnabled('repair-services')}
        />

        {/* المحتوى الأساسي */}
        <div className="flex flex-col lg:flex-row gap-2 lg:gap-3 w-full flex-1 min-h-0">
          {/* منطقة المنتجات والاشتراكات */}
          <div className="flex-1 flex flex-col min-w-0">
            <Suspense fallback={<Skeleton className="h-full w-full rounded-lg" />}>
              <div className="flex-1 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-xl border border-border/50 shadow-lg transition-all duration-300 hover:shadow-xl overflow-hidden">
                <POSAdvancedContent
                  products={products}
                  pagination={{ 
                    current_page: currentPage, 
                    total_pages: Math.ceil(filteredProducts.length / pageSize), 
                    per_page: pageSize, 
                    total_count: filteredProducts.length,
                    has_next_page: currentPage < Math.ceil(filteredProducts.length / pageSize),
                    has_prev_page: currentPage > 1
                  }}
                  subscriptionServices={subscriptions}
                  subscriptionCategories={subscriptionCategories}
                  productCategories={productCategories}
                  favoriteProducts={favoriteProducts}
                  isReturnMode={isReturnMode}
                  isPOSDataLoading={isRefetching}
                  onAddToCart={handleProductWithVariants}
                  onAddSubscription={handleAddSubscription}
                  onRefreshData={refreshData}
                  isAppEnabled={isAppEnabled}
                  // دوال pagination والبحث
                  onPageChange={handlePageChange}
                  onSearchChange={handleSearchChange}
                  onCategoryFilter={handleCategoryFilter}
                  onPageSizeChange={handlePageSizeChange}
                  searchQuery={searchQuery}
                  categoryFilter={categoryFilter}
                  // دالة السكانر
                  onBarcodeSearch={scanBarcode}
                  isScannerLoading={isScannerLoading}
                />
                
                {/* إحصائيات البحث المحلي المحسنة */}
                <POSAdvancedSearchStats
                  allProductsCount={allProducts?.length || 0}
                  filteredProductsCount={filteredProducts.length}
                  currentPage={currentPage}
                  totalPages={Math.ceil(filteredProducts.length / pageSize)}
                  searchQuery={searchQuery}
                  categoryFilter={categoryFilter}
                  categoryName={productCategories.find(c => c.id === categoryFilter)?.name}
                />
              </div>
            </Suspense>
          </div>

          {/* منطقة السلة الذكية */}
          <div className="w-full lg:w-80 xl:w-[340px] 2xl:w-[360px] flex-shrink-0 max-w-none">
            <Suspense fallback={<Skeleton className="h-full w-full rounded-lg" />}>
              <div className="h-full w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-xl border border-border/50 shadow-lg transition-all duration-300 hover:shadow-xl overflow-hidden">
                <POSAdvancedCart
                  isReturnMode={isReturnMode}
                  // بيانات السلة العادية
                  tabs={tabs}
                  activeTab={activeTab}
                  activeTabId={activeTabId}
                  cartItems={cartItems}
                  selectedServices={selectedServices}
                  selectedSubscriptions={selectedSubscriptions}
                  // بيانات سلة الإرجاع
                  returnItems={returnItems}
                  returnReason={returnReason}
                  returnNotes={returnNotes}
                  // العملاء والمستخدمين
                  customers={customers}
                  currentUser={currentUser}
                  // دوال إدارة التبويبات
                  setActiveTabId={setActiveTabId}
                  addTab={addTab}
                  removeTab={removeTab}
                  updateTab={updateTab}
                  // دوال إدارة السلة
                  updateItemQuantity={updateItemQuantity}
                  updateItemPrice={updateItemPrice}
                  removeItemFromCart={removeItemFromCart}
                  clearCart={clearCart}
                  submitOrder={handleSubmitOrderWithPrint}
                  // دوال إدارة الإرجاع
                  updateReturnItemQuantity={updateReturnItemQuantity}
                  updateReturnItemPrice={updateReturnItemPrice}
                  removeReturnItem={removeReturnItem}
                  clearReturnCart={clearReturnCart}
                  processReturn={async (customerId?: string, reason?: string, notes?: string) => {
                    // تحويل المعاملات إلى تنسيق Order
                    const orderDetails: Partial<Order> = {
                      customerId,
                      notes: notes || reason || ''
                    };
                    await handleProcessReturn(orderDetails);
                  }}
                  setReturnReason={setReturnReason}
                  setReturnNotes={setReturnNotes}
                  // دوال الخدمات والاشتراكات - مع wrapper لتحويل التوقيعات
                  removeService={(index: number) => removeService(activeTabId, selectedServices[index]?.id)}
                  updateServicePrice={(index: number, price: number) => updateServicePrice(activeTabId, selectedServices[index]?.id, price)}
                  removeSubscription={(index: number) => removeSubscription(activeTabId, selectedSubscriptions[index]?.id)}
                  updateSubscriptionPrice={(index: number, price: number) => updateSubscriptionPrice(activeTabId, selectedSubscriptions[index]?.id, price)}
                  // callback لتحديث قائمة العملاء
                  onCustomerAdded={(newCustomer) => {
                    // تحديث البيانات من cache إذا أمكن
                    if (refreshData) {
                      refreshData();
                    }
                  }}
                  // حالة التحميل
                  isSubmittingOrder={isSubmittingOrder}
                />
              </div>
            </Suspense>
          </div>
        </div>
      </div>

      {/* النوافذ الحوارية */}
      <POSAdvancedDialogs
        // حالة النوافذ الحوارية
        isVariantDialogOpen={isVariantDialogOpen}
        isPOSSettingsOpen={isPOSSettingsOpen}
        isRepairDialogOpen={isRepairDialogOpen}
        isRepairPrintDialogOpen={isRepairPrintDialogOpen}
        isPrintDialogOpen={isPrintDialogOpen}
        isCalculatorOpen={isCalculatorOpen}
        isQuickExpenseOpen={isQuickExpenseOpen}
        
        // دوال إدارة النوافذ الحوارية
        setIsVariantDialogOpen={setIsVariantDialogOpen}
        setIsPOSSettingsOpen={setIsPOSSettingsOpen}
        setIsRepairDialogOpen={setIsRepairDialogOpen}
        setIsRepairPrintDialogOpen={setIsRepairPrintDialogOpen}
        setIsPrintDialogOpen={setIsPrintDialogOpen}
        setIsCalculatorOpen={setIsCalculatorOpen}
        setIsQuickExpenseOpen={setIsQuickExpenseOpen}
        
        // بيانات النوافذ الحوارية
        selectedProductForVariant={selectedProductForVariant}
        setSelectedProductForVariant={setSelectedProductForVariant}
        selectedRepairOrder={selectedRepairOrder}
        setSelectedRepairOrder={setSelectedRepairOrder}
        repairQueuePosition={repairQueuePosition}
        setRepairQueuePosition={setRepairQueuePosition}
        
        // بيانات الطباعة
        completedItems={completedItems}
        completedServices={completedServices}
        completedSubscriptions={completedSubscriptions}
        completedTotal={completedTotal}
        completedSubtotal={completedSubtotal}
        completedDiscount={completedDiscount}
        completedDiscountAmount={completedDiscountAmount}
        completedCustomerName={completedCustomerName}
        completedOrderNumber={completedOrderNumber}
        completedOrderDate={completedOrderDate}
        completedPaidAmount={completedPaidAmount}
        completedRemainingAmount={completedRemainingAmount}
        isPartialPayment={isPartialPayment}
        considerRemainingAsPartial={considerRemainingAsPartial}
        subscriptionAccountInfo={subscriptionAccountInfo}
        
        // دوال معالجة الأحداث
        handleAddVariantToCart={handleAddVariantToCart}
        handleRepairServiceSuccess={handleRepairServiceSuccess}
        
        // دوال مسح البيانات
        clearPrintData={clearPrintData}
      />

      {/* شريط حالة الأداء */}
      <POSAdvancedPerformanceBar executionTime={executionTime} />
    </POSPureLayout>
  );
};

export default POSAdvanced;
