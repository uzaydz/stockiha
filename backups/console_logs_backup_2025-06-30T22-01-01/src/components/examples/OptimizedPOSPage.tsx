import React, { useState, useMemo } from 'react';
import { usePOSData, useOrdersData, useUnifiedData } from '@/context/UnifiedDataContext';
import { useIsDataRequired } from '@/hooks/useSmartDataLoading';

// =================================================================
// 🎯 مثال تطبيقي لصفحة POS محسنة باستخدام النظام الجديد
// =================================================================

interface OptimizedPOSPageProps {
  className?: string;
}

const OptimizedPOSPage: React.FC<OptimizedPOSPageProps> = ({ className }) => {
  // استخدام النظام الجديد للبيانات
  const { posData, isLoading: isPOSLoading, error: posError, refresh: refreshPOS } = usePOSData();
  const { ordersData, isLoading: isOrdersLoading, refresh: refreshOrders } = useOrdersData();
  const { getOrderDetails, currentOrganization } = useUnifiedData();
  
  // التحقق من البيانات المطلوبة للصفحة الحالية
  const { isPOSDataRequired, isOrdersDataRequired } = useIsDataRequired();
  
  // حالات محلية للصفحة
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);

  // استخراج البيانات من النظام الموحد
  const products = posData?.products || [];
  const categories = posData?.categories || [];
  const stats = posData?.stats;
  const settings = posData?.settings;
  const subscriptionServices = posData?.subscription_services || [];
  
  const recentOrders = ordersData?.orders?.slice(0, 5) || [];
  const todayStats = ordersData?.stats;

  // معالجة البيانات المفلترة
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // فلترة حسب الفئة
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => 
        product.product?.category_id === selectedCategory
      );
    }

    // فلترة حسب البحث
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.product?.sku?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [products, selectedCategory, searchTerm]);

  // دوال التفاعل
  const handleAddToCart = (product: any) => {
    setSelectedProducts(prev => {
      const existing = prev.find(p => p.id === product.product.id);
      if (existing) {
        return prev.map(p => 
          p.id === product.product.id 
            ? { ...p, quantity: p.quantity + 1 }
            : p
        );
      } else {
        return [...prev, { ...product.product, quantity: 1 }];
      }
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== productId));
  };

  const handleViewOrderDetails = async (orderId: string) => {
    try {
      const details = await getOrderDetails(orderId);
      console.log('Order details:', details);
      // يمكن فتح modal أو navigate لصفحة التفاصيل
    } catch (error) {
      console.error('Error fetching order details:', error);
    }
  };

  const handleRefreshAll = async () => {
    await Promise.all([
      refreshPOS(),
      isOrdersDataRequired ? refreshOrders() : Promise.resolve()
    ]);
  };

  // حالات التحميل والأخطاء
  if (isPOSLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل بيانات نقطة البيع...</p>
        </div>
      </div>
    );
  }

  if (posError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div className="text-red-600 mb-4">
          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-red-800 mb-2">خطأ في تحميل البيانات</h3>
        <p className="text-red-600 mb-4">{posError}</p>
        <button
          onClick={handleRefreshAll}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className={`optimized-pos-page ${className || ''}`}>
      {/* رأس الصفحة مع الإحصائيات */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">نقطة البيع</h1>
            <p className="text-gray-600">{currentOrganization?.name}</p>
          </div>
          <button
            onClick={handleRefreshAll}
            disabled={isPOSLoading || isOrdersLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isPOSLoading || isOrdersLoading ? 'جاري التحديث...' : 'تحديث البيانات'}
          </button>
        </div>

        {/* إحصائيات سريعة */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-gray-600">إجمالي المنتجات</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_products}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-gray-600">المنتجات النشطة</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.active_products}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-gray-600">مخزون منخفض</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.low_stock_products}</p>
                </div>
              </div>
            </div>

            {todayStats && (
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div className="mr-4">
                    <p className="text-sm font-medium text-gray-600">مبيعات اليوم</p>
                    <p className="text-2xl font-bold text-gray-900">{todayStats.today_revenue} دج</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* قائمة المنتجات */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* البحث */}
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="البحث في المنتجات..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* فلتر الفئات */}
                <div className="sm:w-48">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">جميع الفئات</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map((item) => {
                  const product = item.product;
                  const actualStock = item.actual_stock || product.stock_quantity;
                  
                  return (
                    <div key={product.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="aspect-w-1 aspect-h-1 mb-3">
                        <img
                          src={product.thumbnail_image || '/placeholder-product.jpg'}
                          alt={product.name}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      </div>
                      
                      <h3 className="font-medium text-gray-900 mb-1">{product.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">الرمز: {product.sku}</p>
                      
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-lg font-bold text-blue-600">{product.price} دج</span>
                        <span className={`text-sm px-2 py-1 rounded ${
                          actualStock > 10 ? 'bg-green-100 text-green-800' :
                          actualStock > 0 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          المخزون: {actualStock}
                        </span>
                      </div>

                      <button
                        onClick={() => handleAddToCart(item)}
                        disabled={actualStock === 0}
                        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        {actualStock === 0 ? 'نفد المخزون' : 'إضافة للسلة'}
                      </button>
                    </div>
                  );
                })}
              </div>

              {filteredProducts.length === 0 && (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8l-7 7-7-7" />
                  </svg>
                  <p className="text-gray-600">لا توجد منتجات تطابق البحث</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* السلة والطلبيات الأخيرة */}
        <div className="space-y-6">
          {/* السلة */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">سلة المشتريات</h3>
            </div>
            <div className="p-6">
              {selectedProducts.length === 0 ? (
                <p className="text-gray-600 text-center py-4">السلة فارغة</p>
              ) : (
                <div className="space-y-3">
                  {selectedProducts.map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-600">الكمية: {product.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{product.price * product.quantity} دج</p>
                        <button
                          onClick={() => handleRemoveFromCart(product.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          إزالة
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-medium text-gray-900">المجموع:</span>
                      <span className="text-lg font-bold text-blue-600">
                        {selectedProducts.reduce((total, product) => total + (product.price * product.quantity), 0)} دج
                      </span>
                    </div>
                    <button className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors">
                      إتمام البيع
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* الطلبيات الأخيرة */}
          {isOrdersDataRequired && recentOrders.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">الطلبيات الأخيرة</h3>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {recentOrders.map((orderItem) => {
                    const order = orderItem.order;
                    return (
                      <div key={order.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">#{order.customer_order_number}</p>
                          <p className="text-sm text-gray-600">
                            {order.customer ? `العميل: ${order.customer.name}` : 'زائر'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">{order.total} دج</p>
                          <button
                            onClick={() => handleViewOrderDetails(order.id)}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            عرض التفاصيل
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OptimizedPOSPage;