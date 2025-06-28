import React, { useState } from 'react';
import { Product } from '@/types';
import { cn } from '@/lib/utils';
import { useApps } from '@/context/AppsContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ShoppingCart, CreditCard, RotateCcw, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

// استيراد المكونات الموجودة
import ProductCatalogOptimized from '@/components/pos/ProductCatalogOptimized';
import SubscriptionCatalog from '@/components/pos/SubscriptionCatalog';
import QuickActions from '@/components/pos/QuickActions';

interface POSContentProps {
  // بيانات المنتجات والاشتراكات
  products: Product[];
  subscriptions: any[];
  subscriptionCategories: any[];
  recentOrders: any[];
  favoriteProducts: Product[];
  
  // حالة التطبيق
  isReturnMode: boolean;
  isLoading: boolean;
  isPOSDataLoading: boolean;
  
  // دوال المعالجة
  onAddToCart: (product: Product) => void;
  onAddSubscription: (subscription: any, pricing?: any) => void;
  onBarcodeScanned: (barcode: string) => void;
  onOpenOrder: (order: any) => void;
  onQuickAddProduct: (product: Product) => void;
  onStockUpdate: (productId: string, updateFunction: any) => void;
  onRefreshData: () => Promise<void>;
}

const POSContent: React.FC<POSContentProps> = ({
  products,
  subscriptions,
  subscriptionCategories,
  recentOrders,
  favoriteProducts,
  isReturnMode,
  isLoading,
  isPOSDataLoading,
  onAddToCart,
  onAddSubscription,
  onBarcodeScanned,
  onOpenOrder,
  onQuickAddProduct,
  onStockUpdate,
  onRefreshData
}) => {
  const { isAppEnabled } = useApps();
  const [activeView, setActiveView] = useState<'products' | 'subscriptions'>('products');
  const [isQuickActionsExpanded, setIsQuickActionsExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg">جاري تحميل بيانات نقطة البيع...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* الإجراءات السريعة - قابلة للطي */}
      <Card className="overflow-hidden transition-all duration-300 flex-shrink-0 mb-4">
        <CardHeader 
          className="p-3 cursor-pointer border-b" 
          onClick={() => setIsQuickActionsExpanded(!isQuickActionsExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">الإجراءات السريعة</CardTitle>
              {/* زر التحديث السريع */}
              <Button
                variant="outline"
                size="sm"
                onClick={async (e) => {
                  e.stopPropagation();
                  await onRefreshData();
                }}
                disabled={isPOSDataLoading}
                className="h-7 px-2 flex items-center gap-1"
                title="تحديث المخزون والمنتجات (Ctrl+F5)"
              >
                <RefreshCw className={`h-3 w-3 ${isPOSDataLoading ? 'animate-spin' : ''}`} />
                <span className="text-xs">تحديث المخزون</span>
              </Button>
            </div>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => {
              e.stopPropagation();
              setIsQuickActionsExpanded(!isQuickActionsExpanded);
            }}>
              <svg 
                width="15" 
                height="15" 
                viewBox="0 0 15 15" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                style={{ 
                  transform: isQuickActionsExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s ease'
                }}
              >
                <path d="M3.13523 6.15803C3.3241 5.95657 3.64052 5.94637 3.84197 6.13523L7.5 9.56464L11.158 6.13523C11.3595 5.94637 11.6759 5.95657 11.8648 6.15803C12.0536 6.35949 12.0434 6.67591 11.842 6.86477L7.84197 10.6148C7.64964 10.7951 7.35036 10.7951 7.15803 10.6148L3.15803 6.86477C2.95657 6.67591 2.94637 6.35949 3.13523 6.15803Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
              </svg>
            </Button>
          </div>
        </CardHeader>
        <div 
          className="overflow-hidden transition-all duration-300"
          style={{ 
            maxHeight: isQuickActionsExpanded ? '400px' : '0',
            opacity: isQuickActionsExpanded ? 1 : 0 
          }}
        >
          <CardContent className="p-0">
            <QuickActions
              onBarcodeScanned={onBarcodeScanned}
              recentOrders={recentOrders}
              onOpenOrder={onOpenOrder}
              onQuickAddProduct={onQuickAddProduct}
              favoriteProducts={favoriteProducts}
            />
          </CardContent>
        </div>
      </Card>

      {/* المحتوى الرئيسي - المنتجات والاشتراكات */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Tabs 
          defaultValue="products" 
          value={activeView} 
          onValueChange={(value) => setActiveView(value as 'products' | 'subscriptions')}
          className="flex-1 flex flex-col"
          dir="rtl"
        >
          <TabsList className={cn(
            "mb-4 w-full p-1 rounded-lg border transition-all duration-300",
            isReturnMode 
              ? "bg-orange-500/5 dark:bg-orange-500/10 border-orange-200 dark:border-orange-800" 
              : "bg-muted/50",
            isAppEnabled('subscription-services') ? "grid grid-cols-2" : "grid grid-cols-1"
          )}>
            <TabsTrigger 
              value="products" 
              className={cn(
                "flex items-center gap-2 py-3 px-4 transition-all duration-200",
                "data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border/50",
                isReturnMode 
                  ? "data-[state=active]:bg-orange-50 dark:data-[state=active]:bg-orange-900/20 data-[state=active]:border-orange-200 dark:data-[state=active]:border-orange-700" 
                  : "data-[state=active]:bg-background"
              )}
            >
              {isReturnMode ? (
                <RotateCcw className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              ) : (
                <ShoppingCart className="h-4 w-4" />
              )}
              <span className={cn(
                "font-medium",
                isReturnMode && "text-orange-800 dark:text-orange-200"
              )}>
                {isReturnMode ? 'منتجات الإرجاع' : 'المنتجات'}
              </span>
              {products.length > 0 && (
                <span className={cn(
                  "ml-auto text-xs px-2 py-0.5 rounded-full",
                  isReturnMode 
                    ? "bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400" 
                    : "bg-primary/10 text-primary"
                )}>
                  {products.length}
                </span>
              )}
            </TabsTrigger>
            
            {/* تبويب خدمات الاشتراك - يظهر فقط إذا كان التطبيق مفعّل */}
            {isAppEnabled('subscription-services') && (
              <TabsTrigger 
                value="subscriptions" 
                className="flex items-center gap-2 py-3 px-4 transition-all duration-200 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border/50"
              >
                <CreditCard className="h-4 w-4" />
                <span className="font-medium">خدمات الاشتراك</span>
                {subscriptions.length > 0 && (
                  <span className="ml-auto bg-green-500/10 text-green-600 text-xs px-2 py-0.5 rounded-full">
                    {subscriptions.length}
                  </span>
                )}
              </TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="products" className="flex-1 flex mt-0 data-[state=active]:block data-[state=inactive]:hidden">
            {products.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className={cn(
                  "text-center p-6 rounded-lg",
                  isReturnMode 
                    ? "bg-orange-50/30 dark:bg-orange-900/10 border border-orange-200/50 dark:border-orange-800/50" 
                    : "bg-muted/30"
                )}>
                  {isReturnMode ? (
                    <RotateCcw className="h-12 w-12 mb-3 mx-auto opacity-20 text-orange-500 dark:text-orange-400" />
                  ) : (
                    <ShoppingCart className="h-12 w-12 mb-3 mx-auto opacity-20" />
                  )}
                  <h3 className={cn(
                    "text-xl font-medium mb-2",
                    isReturnMode && "text-orange-800 dark:text-orange-200"
                  )}>
                    {isReturnMode ? 'لا توجد منتجات للإرجاع' : 'لا توجد منتجات'}
                  </h3>
                  <p className={cn(
                    "text-sm",
                    isReturnMode 
                      ? "text-orange-700 dark:text-orange-300" 
                      : "text-muted-foreground"
                  )}>
                    {isReturnMode 
                      ? 'يمكنك مسح باركود المنتجات لإضافتها إلى سلة الإرجاع'
                      : 'لم يتم العثور على أي منتجات في قاعدة البيانات.'
                    }
                  </p>
                </div>
              </div>
            ) : (
              <ProductCatalogOptimized 
                onAddToCart={onAddToCart}
                onStockUpdate={onStockUpdate}
                isReturnMode={isReturnMode}
              />
            )}
          </TabsContent>
          
          {/* محتوى خدمات الاشتراك - يظهر فقط إذا كان التطبيق مفعّل */}
          {isAppEnabled('subscription-services') && (
            <TabsContent value="subscriptions" className="flex-1 flex mt-0 data-[state=active]:block data-[state=inactive]:hidden">
              <SubscriptionCatalog 
                subscriptions={subscriptions}
                categories={subscriptionCategories.map(cat => ({
                  id: cat.id,
                  name: cat.name,
                  description: '',
                  icon: 'package'
                }))}
                onAddToCart={onAddSubscription}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default POSContent;
