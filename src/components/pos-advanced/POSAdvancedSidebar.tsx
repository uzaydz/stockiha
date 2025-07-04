import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Product, Order } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ChevronLeft,
  ChevronRight,
  Star,
  Clock,
  Package2,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  ShoppingCart,
  Zap,
  Eye
} from 'lucide-react';

interface POSAdvancedSidebarProps {
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  favoriteProducts: Product[];
  recentOrders: any[];
  onQuickAddProduct: (product: Product) => void;
  onOpenOrder: (order: any) => void;
  inventoryStats?: any;
  orderStats?: any;
}

const POSAdvancedSidebar: React.FC<POSAdvancedSidebarProps> = ({
  isCollapsed,
  onToggleCollapsed,
  favoriteProducts,
  recentOrders,
  onQuickAddProduct,
  onOpenOrder,
  inventoryStats,
  orderStats
}) => {
  const [activeSection, setActiveSection] = useState<'stats' | 'favorites' | 'recent'>('stats');

  // حساب الإحصائيات السريعة
  const quickStats = useMemo(() => [
    {
      key: 'products',
      label: 'المنتجات',
      value: inventoryStats?.totalProducts || 0,
      icon: Package2,
      color: 'blue'
    },
    {
      key: 'sales',
      label: 'مبيعات اليوم',
      value: `${(orderStats?.todaySales || 0).toLocaleString()} دج`,
      icon: DollarSign,
      color: 'green'
    },
    {
      key: 'orders',
      label: 'طلبات اليوم',
      value: orderStats?.todayOrders || 0,
      icon: ShoppingCart,
      color: 'purple'
    },
    {
      key: 'alerts',
      label: 'تنبيهات',
      value: inventoryStats?.outOfStockProducts || 0,
      icon: AlertTriangle,
      color: 'red'
    }
  ], [inventoryStats, orderStats]);

  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50 border-blue-200',
    green: 'text-green-600 bg-green-50 border-green-200',
    purple: 'text-purple-600 bg-purple-50 border-purple-200',
    red: 'text-red-600 bg-red-50 border-red-200'
  };

  if (isCollapsed) {
    return (
      <div className="w-16 bg-card border-l flex flex-col">
        {/* زر التوسيع */}
        <div className="p-3 border-b">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleCollapsed}
                  className="w-full h-10 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                توسيع الشريط الجانبي
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* إحصائيات مصغرة */}
        <div className="flex-1 p-2 space-y-2">
          {quickStats.map((stat) => {
            const IconComponent = stat.icon;
            return (
              <TooltipProvider key={stat.key}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={cn(
                      "p-2 rounded-lg border cursor-pointer transition-all hover:scale-105",
                      colorClasses[stat.color as keyof typeof colorClasses]
                    )}>
                      <IconComponent className="h-4 w-4 mx-auto" />
                      <div className="text-xs font-bold text-center mt-1">
                        {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {stat.label}: {stat.value}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-card border-l flex flex-col">
      {/* ترويسة الشريط الجانبي */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            لوحة التحكم السريع
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapsed}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* أزرار التبديل بين الأقسام */}
        <div className="flex mt-3 bg-muted rounded-lg p-1">
          <Button
            variant={activeSection === 'stats' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveSection('stats')}
            className="flex-1 h-7 text-xs"
          >
            <TrendingUp className="h-3 w-3 mr-1" />
            إحصائيات
          </Button>
          <Button
            variant={activeSection === 'favorites' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveSection('favorites')}
            className="flex-1 h-7 text-xs"
          >
            <Star className="h-3 w-3 mr-1" />
            مفضلة
          </Button>
          <Button
            variant={activeSection === 'recent' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveSection('recent')}
            className="flex-1 h-7 text-xs"
          >
            <Clock className="h-3 w-3 mr-1" />
            حديثة
          </Button>
        </div>
      </div>

      {/* المحتوى الرئيسي */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* قسم الإحصائيات */}
          {activeSection === 'stats' && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                إحصائيات سريعة
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {quickStats.map((stat) => {
                  const IconComponent = stat.icon;
                  return (
                    <Card key={stat.key} className={cn(
                      "p-3 border-l-4 transition-all hover:shadow-md cursor-pointer",
                      colorClasses[stat.color as keyof typeof colorClasses]
                    )}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {stat.label}
                          </p>
                          <p className="text-sm font-bold">
                            {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                          </p>
                        </div>
                        <IconComponent className="h-4 w-4" />
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* تفاصيل المخزون */}
              {inventoryStats && (
                <Card className="p-3">
                  <CardHeader className="p-0 pb-2">
                    <CardTitle className="text-sm">حالة المخزون</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>متوفر</span>
                      <span className="font-medium text-green-600">
                        {inventoryStats.inStockProducts || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>مخزون منخفض</span>
                      <span className="font-medium text-yellow-600">
                        {inventoryStats.lowStockProducts || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>نفد المخزون</span>
                      <span className="font-medium text-red-600">
                        {inventoryStats.outOfStockProducts || 0}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* قسم المنتجات المفضلة */}
          {activeSection === 'favorites' && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Star className="h-4 w-4" />
                المنتجات المفضلة ({favoriteProducts.length})
              </h3>
              
              {favoriteProducts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Star className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">لا توجد منتجات مفضلة</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {favoriteProducts.slice(0, 8).map((product) => (
                    <Card 
                      key={product.id}
                      className="p-3 cursor-pointer transition-all hover:shadow-md border-l-4 border-l-yellow-400"
                      onClick={() => onQuickAddProduct(product)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                          {product.image_url ? (
                            <img 
                              src={product.image_url} 
                              alt={product.name}
                              className="w-8 h-8 rounded object-cover"
                            />
                          ) : (
                            <Package2 className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {product.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {product.price?.toLocaleString()} دج
                          </p>
                        </div>
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* قسم الطلبات الحديثة */}
          {activeSection === 'recent' && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                الطلبات الحديثة ({recentOrders.length})
              </h3>

              {recentOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">لا توجد طلبات حديثة</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentOrders.map((order) => (
                    <Card 
                      key={order.id}
                      className="p-3 cursor-pointer transition-all hover:shadow-md border-l-4 border-l-blue-400"
                      onClick={() => onOpenOrder(order)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">
                              #{order.order_number || order.id.slice(0, 8)}
                            </p>
                            <Badge 
                              variant={
                                order.status === 'completed' ? 'default' :
                                order.status === 'pending' ? 'secondary' :
                                'outline'
                              }
                              className="text-xs"
                            >
                              {order.status === 'completed' ? 'مكتمل' :
                               order.status === 'pending' ? 'معلق' :
                               order.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {order.customer_name || 'عميل غير محدد'}
                          </p>
                          <p className="text-xs font-medium text-green-600">
                            {order.total_amount?.toLocaleString()} دج
                          </p>
                        </div>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* تذييل الشريط الجانبي */}
      <div className="p-4 border-t">
        <div className="text-center">
          <Badge variant="outline" className="text-xs">
            آخر تحديث: الآن
          </Badge>
        </div>
      </div>
    </div>
  );
};

export default POSAdvancedSidebar; 