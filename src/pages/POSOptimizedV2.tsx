// =================================================================
// 🚀 POS Optimized V2 - نسخة محسنة تماماً باستخدام النظام الموحد الجديد
// =================================================================

import React, { useEffect, useState, useMemo } from 'react';
import { computeAvailableStock } from '@/lib/stock';
import { usePOSData, useAppData, useOrdersData, useUnifiedData } from '@/context/UnifiedDataContext';
import { useIsDataRequired } from '@/hooks/useSmartDataLoading';
import { AlertCircle, Loader2, Package, TrendingUp, AlertTriangle, CheckCircle, RefreshCw, ShoppingCart, Users, DollarSign } from 'lucide-react';

// =================================================================
// 🎯 المكونات الفرعية
// =================================================================

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, color, trend }) => (
  <div className="bg-white rounded-lg shadow-sm border p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {trend && (
          <div className={`flex items-center mt-1 text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isPositive ? '↗' : '↘'} {Math.abs(trend.value)}%
          </div>
        )}
      </div>
      <div className={`p-3 rounded-lg ${color}`}>
        {icon}
      </div>
    </div>
  </div>
);

interface ProductCardProps {
  product: any;
  onAddToCart: (product: any) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  const productData = product.product || product;
  const totalStock = computeAvailableStock(productData);

  return (
    <div className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow p-4">
      <div className="aspect-square mb-3 bg-gray-100 rounded-lg overflow-hidden">
        <img
          src={productData.thumbnail_image || productData.images?.[0] || '/placeholder-product.jpg'}
          alt={productData.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/placeholder-product.jpg';
          }}
        />
      </div>
      
      <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">{productData.name}</h3>
      <p className="text-sm text-gray-600 mb-2">الرمز: {productData.sku}</p>
      
      <div className="flex items-center justify-between mb-3">
        <span className="text-lg font-bold text-blue-600">{productData.price?.toLocaleString()} دج</span>
        <span className={`text-xs px-2 py-1 rounded-full ${
          totalStock > 10 ? 'bg-green-100 text-green-800' :
          totalStock > 0 ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {totalStock} قطعة
        </span>
      </div>

      <button
        onClick={() => onAddToCart(product)}
        disabled={totalStock === 0}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
      >
        {totalStock === 0 ? 'نفد المخزون' : 'إضافة للسلة'}
      </button>
    </div>
  );
};

// =================================================================
// 🎯 المكون الرئيسي
// =================================================================

const POSOptimizedV2: React.FC = () => {
  // استخدام النظام الموحد الجديد
  const { posData, isLoading: isPOSLoading, error: posError, refresh: refreshPOS } = usePOSData();
  const { appData, isLoading: isAppLoading } = useAppData();
  const { ordersData, isLoading: isOrdersLoading, refresh: refreshOrders } = useOrdersData();
  const { refreshAll, currentOrganization, posSettings } = useUnifiedData();
  
  // التحقق من متطلبات البيانات للصفحة الحالية
  const { isPOSDataRequired, isOrdersDataRequired } = useIsDataRequired();

  // حالات محلية للواجهة
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [cart, setCart] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // استخراج البيانات من النظام الموحد
  const products = posData?.products || [];
  const categories = posData?.categories || [];
  const subscriptionCategories = posData?.subscription_categories || [];
  const subscriptionServices = posData?.subscription_services || [];
  const stats = posData?.stats;
  
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
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(product =>
        product.product?.name?.toLowerCase().includes(searchLower) ||
        product.product?.sku?.toLowerCase().includes(searchLower) ||
        product.product?.barcode?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [products, selectedCategory, searchTerm]);

  // حساب إجمالي السلة
  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [cart]);

  // دوال التفاعل
  const handleAddToCart = (product: any) => {
    const productData = product.product || product;
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === productData.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === productData.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prevCart, { ...productData, quantity: 1 }];
      }
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const handleUpdateCartQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity === 0) {
      handleRemoveFromCart(productId);
      return;
    }
    
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === productId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    try {
      await refreshAll();
    } catch (error) {
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCheckout = () => {
    // هنا يمكن إضافة منطق إتمام البيع
    alert(`إجمالي البيع: ${cartTotal.toLocaleString()} دج`);
    setCart([]); // إفراغ السلة بعد البيع
  };

  // عرض حالة التحميل
  if (isPOSLoading || isAppLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">جاري تحميل نقطة البيع</h2>
          <p className="text-gray-600">يتم تحميل المنتجات والإعدادات...</p>
        </div>
      </div>
    );
  }

  // عرض حالة الخطأ
  if (posError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">خطأ في تحميل البيانات</h2>
          <p className="text-gray-600 text-center mb-6">{posError}</p>
          <button
            onClick={handleRefreshAll}
            disabled={isRefreshing}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            {isRefreshing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
                جاري إعادة المحاولة...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 ml-2" />
                إعادة المحاولة
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* رأس الصفحة */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">نقطة البيع المحسنة</h1>
              <p className="text-sm text-gray-600">{currentOrganization?.name}</p>
            </div>
            <button
              onClick={handleRefreshAll}
              disabled={isRefreshing}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
            >
              {isRefreshing ? (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              ) : (
                <RefreshCw className="w-4 h-4 ml-2" />
              )}
              {isRefreshing ? 'جاري التحديث...' : 'تحديث البيانات'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* بطاقات الإحصائيات */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats && (
            <>
              <StatsCard
                title="إجمالي المنتجات"
                value={stats.total_products}
                icon={<Package className="w-6 h-6 text-blue-600" />}
                color="bg-blue-100"
              />
              <StatsCard
                title="المنتجات النشطة"
                value={stats.active_products}
                icon={<CheckCircle className="w-6 h-6 text-green-600" />}
                color="bg-green-100"
              />
              <StatsCard
                title="مخزون منخفض"
                value={stats.low_stock_products}
                icon={<AlertTriangle className="w-6 h-6 text-yellow-600" />}
                color="bg-yellow-100"
              />
            </>
          )}
          
          {todayStats && (
            <StatsCard
              title="مبيعات اليوم"
              value={`${todayStats.today_revenue?.toLocaleString()} دج`}
              icon={<DollarSign className="w-6 h-6 text-purple-600" />}
              color="bg-purple-100"
            />
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* قائمة المنتجات */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border">
              {/* شريط البحث والفلترة */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="البحث في المنتجات (الاسم، الرمز، الباركود)..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
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

              {/* شبكة المنتجات */}
              <div className="p-6">
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد منتجات</h3>
                    <p className="text-gray-600">
                      {searchTerm || selectedCategory !== 'all' 
                        ? 'لا توجد منتجات تطابق البحث أو الفلتر المحدد'
                        : 'لم يتم العثور على منتجات في هذه الفئة'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredProducts.map((product) => (
                      <ProductCard
                        key={product.product?.id || product.id}
                        product={product}
                        onAddToCart={handleAddToCart}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* السلة والطلبيات الأخيرة */}
          <div className="space-y-6">
            {/* سلة التسوق */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center">
                  <ShoppingCart className="w-5 h-5 text-gray-600 ml-2" />
                  <h3 className="text-lg font-semibold text-gray-900">سلة المشتريات</h3>
                  {cart.length > 0 && (
                    <span className="mr-auto bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      {cart.length}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-6">
                {cart.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">السلة فارغة</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                          <div className="flex items-center mt-1">
                            <button
                              onClick={() => handleUpdateCartQuantity(item.id, item.quantity - 1)}
                              className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 flex items-center justify-center text-sm"
                            >
                              -
                            </button>
                            <span className="mx-2 text-sm font-medium">{item.quantity}</span>
                            <button
                              onClick={() => handleUpdateCartQuantity(item.id, item.quantity + 1)}
                              className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 flex items-center justify-center text-sm"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div className="text-left ml-4">
                          <p className="text-sm font-medium text-gray-900">
                            {(item.price * item.quantity).toLocaleString()} دج
                          </p>
                          <button
                            onClick={() => handleRemoveFromCart(item.id)}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            إزالة
                          </button>
                        </div>
                      </div>
                    ))}

                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-lg font-semibold text-gray-900">المجموع:</span>
                        <span className="text-xl font-bold text-blue-600">
                          {cartTotal.toLocaleString()} دج
                        </span>
                      </div>
                      <button
                        onClick={handleCheckout}
                        className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        إتمام البيع
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* الطلبيات الأخيرة */}
            {isOrdersDataRequired && recentOrders.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center">
                    <Users className="w-5 h-5 text-gray-600 ml-2" />
                    <h3 className="text-lg font-semibold text-gray-900">الطلبيات الأخيرة</h3>
                  </div>
                </div>

                <div className="p-6">
                  <div className="space-y-3">
                    {recentOrders.map((orderItem) => {
                      const order = orderItem.order;
                      return (
                        <div key={order.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              #{order.customer_order_number}
                            </p>
                            <p className="text-xs text-gray-600">
                              {orderItem.customer?.name || 'زائر'}
                            </p>
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium text-gray-900">
                              {order.total?.toLocaleString()} دج
                            </p>
                            <p className={`text-xs ${
                              order.status === 'completed' ? 'text-green-600' :
                              order.status === 'pending' ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {order.status === 'completed' ? 'مكتمل' :
                               order.status === 'pending' ? 'قيد الانتظار' :
                               'ملغي'}
                            </p>
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
    </div>
  );
};

export default POSOptimizedV2;
