import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, Package, BarChart3 } from 'lucide-react';
import OrdersOverview from './OrdersOverview';
import TopSellingProducts from './TopSellingProducts';

const OrdersAndProductsAnalytics: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-right">تحليل الطلبات والمنتجات</h1>
        <div className="flex items-center gap-2 text-muted-foreground">
          <BarChart3 className="w-5 h-5" />
          <span className="text-sm">تحليلات شاملة</span>
        </div>
      </div>

      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            إحصائيات الطلبات
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            أفضل المنتجات مبيعاً
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-6">
          <OrdersOverview />
        </TabsContent>

        <TabsContent value="products" className="mt-6">
          <TopSellingProducts />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OrdersAndProductsAnalytics;
