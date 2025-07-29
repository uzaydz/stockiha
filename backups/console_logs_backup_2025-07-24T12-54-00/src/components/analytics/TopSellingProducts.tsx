import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Package, 
  TrendingUp, 
  Star,
  ShoppingCart,
  Globe,
  DollarSign,
  Activity
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';

interface TopProduct {
  name: string;
  sku: string;
  total_quantity_sold: number;
  order_count: number;
  total_revenue: number;
  avg_selling_price: number;
  purchase_price: number;
  total_profit: number;
  profit_margin?: number;
}

const TopSellingProducts: React.FC = () => {
  const [posProducts, setPosProducts] = useState<TopProduct[]>([]);
  const [onlineProducts, setOnlineProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pos');

  useEffect(() => {
    fetchTopProducts();
  }, []);

  const fetchTopProducts = async () => {
    try {
      setLoading(true);
      
      // جلب البيانات من دالة التحليلات المالية الشاملة
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1); // آخر شهر
      
      // الحصول على معرف المؤسسة من جدول المستخدمين
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('المستخدم غير مسجل الدخول');
      }

      // الحصول على معرف المؤسسة من جدول users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.organization_id) {
        throw new Error('معرف المؤسسة غير موجود');
      }

      const { data: analyticsData, error: analyticsError } = await supabase.rpc(
        'get_complete_financial_analytics' as any, 
        {
          p_organization_id: userData.organization_id,
          p_start_date: startDate.toISOString(),
          p_end_date: endDate.toISOString(),
          p_employee_id: null,
          p_branch_id: null,
          p_transaction_type: null,
          p_payment_method: null,
          p_min_amount: null,
          p_max_amount: null,
          p_include_partial_payments: true,
          p_include_refunds: true
        }
      );

      if (!analyticsError && analyticsData && Array.isArray(analyticsData) && analyticsData.length > 0) {
        const data = analyticsData[0] as any;
        
        // استخراج بيانات المنتجات من النتيجة
        if (data.top_pos_products) {
          setPosProducts(data.top_pos_products || []);
        }
        
        if (data.top_online_products) {
          setOnlineProducts(data.top_online_products || []);
        }
      } else {
        console.error('خطأ في جلب بيانات التحليلات:', analyticsError);
        // تجربة الطريقة البديلة
        await fetchProductsDirectly();
      }

    } catch (error) {
      console.error('خطأ في جلب بيانات المنتجات:', error);
      // تجربة الطريقة البديلة في حالة الخطأ
      await fetchProductsDirectly();
    } finally {
      setLoading(false);
    }
  };

  // طريقة بديلة لجلب منتجات POS
  const fetchPosProductsDirectly = async () => {
    try {
      const { data: posItems, error } = await supabase
        .from('order_items')
        .select('*, orders!inner(*), products!inner(*)');
      
      if (!error && posItems) {
        const filteredItems = posItems.filter(item => 
          item.orders.status === 'completed' && 
          (item.orders.is_online === false || item.orders.is_online === null)
        );
        const processedData = processProductData(filteredItems);
        setPosProducts(processedData);
      }
    } catch (error) {
      console.error('خطأ في الطريقة البديلة لـ POS:', error);
    }
  };

  // طريقة بديلة لجلب منتجات المتجر الإلكتروني
  const fetchOnlineProductsDirectly = async () => {
    try {
      const { data: onlineItems, error } = await supabase
        .from('online_order_items')
        .select('*, online_orders!inner(*), products!inner(*)');
      
      if (!error && onlineItems) {
        const filteredItems = onlineItems.filter(item => {
          const order = item.online_orders;
          return order.status !== 'cancelled' && (
            order.status === 'shipped' || 
            order.status === 'delivered' ||
            [12, 91].includes(order.call_confirmation_status_id)
          );
        });
        const processedData = processProductData(filteredItems);
        setOnlineProducts(processedData);
      }
    } catch (error) {
      console.error('خطأ في الطريقة البديلة للمتجر الإلكتروني:', error);
    }
  };

  // طريقة بديلة عامة
  const fetchProductsDirectly = async () => {
    await Promise.all([
      fetchPosProductsDirectly(),
      fetchOnlineProductsDirectly()
    ]);
  };

  const processProductData = (data: any[]): TopProduct[] => {
    const productMap = new Map<string, TopProduct>();

    data.forEach(item => {
      const product = item.products;
      const key = product.id;
      
      if (!productMap.has(key)) {
        productMap.set(key, {
          name: product.name,
          sku: product.sku,
          total_quantity_sold: 0,
          order_count: 0,
          total_revenue: 0,
          avg_selling_price: 0,
          purchase_price: product.purchase_price || 0,
          total_profit: 0
        });
      }

      const productStats = productMap.get(key)!;
      productStats.total_quantity_sold += item.quantity;
      productStats.order_count += 1;
      productStats.total_revenue += item.quantity * item.unit_price;
      productStats.total_profit += item.quantity * (item.unit_price - (product.purchase_price || 0));
    });

    // حساب المتوسطات وهامش الربح
    const products = Array.from(productMap.values()).map(product => ({
      ...product,
      avg_selling_price: product.total_revenue / product.total_quantity_sold,
      profit_margin: product.total_revenue > 0 ? (product.total_profit / product.total_revenue) * 100 : 0
    }));

    // ترتيب حسب الكمية المباعة
    return products
      .sort((a, b) => b.total_quantity_sold - a.total_quantity_sold)
      .slice(0, 10);
  };

  const getProfitColor = (profit: number): string => {
    if (profit > 0) return 'text-green-600';
    if (profit < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getProfitMarginColor = (margin: number): string => {
    if (margin >= 50) return 'bg-green-500';
    if (margin >= 30) return 'bg-blue-500';
    if (margin >= 10) return 'bg-yellow-500';
    if (margin >= 0) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري تحميل بيانات المنتجات...</p>
        </div>
      </div>
    );
  }

  const renderProductCard = (product: TopProduct, index: number) => (
    <Card key={product.sku} className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg text-right line-clamp-2">
              {product.name}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              SKU: {product.sku}
            </p>
          </div>
          <Badge className="ml-2" variant={index < 3 ? 'default' : 'secondary'}>
            #{index + 1}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* الإحصائيات الرئيسية */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {product.total_quantity_sold.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">قطعة مباعة</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {product.order_count.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">طلب</p>
            </div>
          </div>

          {/* الإيرادات والأرباح */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">إجمالي الإيرادات</span>
              <span className="font-semibold text-green-600">
                {formatCurrency(product.total_revenue)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">إجمالي الربح</span>
              <span className={`font-semibold ${getProfitColor(product.total_profit)}`}>
                {formatCurrency(product.total_profit)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">متوسط سعر البيع</span>
              <span className="font-medium">
                {formatCurrency(product.avg_selling_price)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">سعر الشراء</span>
              <span className="font-medium">
                {formatCurrency(product.purchase_price)}
              </span>
            </div>
          </div>

          {/* هامش الربح */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">هامش الربح</span>
              <span className="font-semibold">
                {product.profit_margin?.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={Math.min(Math.max(product.profit_margin || 0, 0), 100)} 
              className="h-2"
            />
          </div>

          {/* مؤشرات الأداء */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {(product.total_quantity_sold / product.order_count).toFixed(1)} قطعة/طلب
              </span>
            </div>
            <div className={`w-3 h-3 rounded-full ${getProfitMarginColor(product.profit_margin || 0)}`}></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-right">أفضل المنتجات مبيعاً</h2>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            <Star className="w-3 h-3 mr-1" />
            أعلى 10 منتجات
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pos" className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            نقطة البيع
          </TabsTrigger>
          <TabsTrigger value="online" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            المتجر الإلكتروني  
          </TabsTrigger>
          <TabsTrigger value="comparison" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            مقارنة
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pos" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posProducts.map((product, index) => renderProductCard(product, index))}
          </div>
          {posProducts.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">لا توجد بيانات منتجات متاحة</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="online" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {onlineProducts.map((product, index) => renderProductCard(product, index))}
          </div>
          {onlineProducts.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">لا توجد بيانات منتجات متاحة</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="comparison" className="mt-6">
          <div className="space-y-6">
            {/* ملخص المقارنة */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-center">إجمالي المنتجات</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="space-y-4">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {posProducts.length}
                      </div>
                      <p className="text-sm text-muted-foreground">نقطة البيع</p>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">
                        {onlineProducts.length}
                      </div>
                      <p className="text-sm text-muted-foreground">المتجر الإلكتروني</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-center">أعلى إيرادات</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="space-y-4">
                    <div>
                      <div className="text-lg font-bold text-green-600">
                        {formatCurrency(posProducts[0]?.total_revenue || 0)}
                      </div>
                      <p className="text-sm text-muted-foreground">نقطة البيع</p>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-green-600">
                        {formatCurrency(onlineProducts[0]?.total_revenue || 0)}
                      </div>
                      <p className="text-sm text-muted-foreground">المتجر الإلكتروني</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-center">أعلى ربح</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="space-y-4">
                    <div>
                      <div className={`text-lg font-bold ${getProfitColor(posProducts[0]?.total_profit || 0)}`}>
                        {formatCurrency(posProducts[0]?.total_profit || 0)}
                      </div>
                      <p className="text-sm text-muted-foreground">نقطة البيع</p>
                    </div>
                    <div>
                      <div className={`text-lg font-bold ${getProfitColor(onlineProducts[0]?.total_profit || 0)}`}>
                        {formatCurrency(onlineProducts[0]?.total_profit || 0)}
                      </div>
                      <p className="text-sm text-muted-foreground">المتجر الإلكتروني</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* أفضل 3 منتجات من كل مصدر */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    أفضل 3 منتجات - نقطة البيع
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {posProducts.slice(0, 3).map((product, index) => (
                      <div key={product.sku} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <Badge variant={index === 0 ? 'default' : 'secondary'}>
                            #{index + 1}
                          </Badge>
                          <div>
                            <div className="font-medium line-clamp-1">{product.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {product.total_quantity_sold} قطعة مباعة
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            {formatCurrency(product.total_revenue)}
                          </div>
                          <div className={`text-sm ${getProfitColor(product.total_profit)}`}>
                            {formatCurrency(product.total_profit)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    أفضل 3 منتجات - المتجر الإلكتروني
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {onlineProducts.slice(0, 3).map((product, index) => (
                      <div key={product.sku} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <Badge variant={index === 0 ? 'default' : 'secondary'}>
                            #{index + 1}
                          </Badge>
                          <div>
                            <div className="font-medium line-clamp-1">{product.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {product.total_quantity_sold} قطعة مباعة
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            {formatCurrency(product.total_revenue)}
                          </div>
                          <div className={`text-sm ${getProfitColor(product.total_profit)}`}>
                            {formatCurrency(product.total_profit)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TopSellingProducts; 