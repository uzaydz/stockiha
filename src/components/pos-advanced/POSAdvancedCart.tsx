import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Product, User as AppUser } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  ShoppingCart,
  RotateCcw,
  Plus,
  Minus,
  Trash2,
  User,
  CreditCard,
  Package,
  X,
  Check,
  AlertCircle,
  Receipt,
  Calculator,
  DollarSign
} from 'lucide-react';

interface CartItem {
  product: Product;
  quantity: number;
  colorId?: string;
  colorName?: string;
  colorCode?: string;
  sizeId?: string;
  sizeName?: string;
  variantPrice?: number;
  variantImage?: string;
}

interface CartTab {
  id: string;
  name: string;
  cartItems: CartItem[];
  selectedServices: any[];
  selectedSubscriptions: any[];
  customerId?: string;
  customerName?: string;
}

interface POSAdvancedCartProps {
  isReturnMode: boolean;
  
  // بيانات السلة العادية
  tabs: CartTab[];
  activeTab: CartTab | null;
  activeTabId: string;
  cartItems: CartItem[];
  selectedServices: any[];
  selectedSubscriptions: any[];
  
  // بيانات سلة الإرجاع
  returnItems: CartItem[];
  returnReason: string;
  returnNotes: string;
  
  // العملاء والمستخدمين
  customers: AppUser[];
  currentUser: AppUser | null;
  
  // دوال إدارة التبويبات
  setActiveTabId: (tabId: string) => void;
  addTab: () => void;
  removeTab: (tabId: string) => void;
  updateTab: (tabId: string, updates: any) => void;
  
  // دوال إدارة السلة
  updateItemQuantity: (index: number, quantity: number) => void;
  removeItemFromCart: (index: number) => void;
  clearCart: () => void;
  submitOrder: (customerId?: string, notes?: string) => Promise<void>;
  
  // دوال إدارة الإرجاع
  updateReturnItemQuantity: (index: number, quantity: number) => void;
  removeReturnItem: (index: number) => void;
  clearReturnCart: () => void;
  processReturn: (customerId?: string, reason?: string, notes?: string) => Promise<void>;
  setReturnReason: (reason: string) => void;
  setReturnNotes: (notes: string) => void;
  
  // دوال الخدمات والاشتراكات
  removeService: (index: number) => void;
  updateServicePrice: (index: number, price: number) => void;
  removeSubscription: (index: number) => void;
  updateSubscriptionPrice: (index: number, price: number) => void;
  
  // حالة التحميل
  isSubmittingOrder: boolean;
}

const POSAdvancedCart: React.FC<POSAdvancedCartProps> = ({
  isReturnMode,
  tabs,
  activeTab,
  activeTabId,
  cartItems,
  selectedServices,
  selectedSubscriptions,
  returnItems,
  returnReason,
  returnNotes,
  customers,
  currentUser,
  setActiveTabId,
  addTab,
  removeTab,
  updateTab,
  updateItemQuantity,
  removeItemFromCart,
  clearCart,
  submitOrder,
  updateReturnItemQuantity,
  removeReturnItem,
  clearReturnCart,
  processReturn,
  setReturnReason,
  setReturnNotes,
  removeService,
  updateServicePrice,
  removeSubscription,
  updateSubscriptionPrice,
  isSubmittingOrder
}) => {
  // حساب إجمالي السلة العادية
  const cartTotal = useMemo(() => {
    const itemsTotal = cartItems.reduce((total, item) => {
      const price = item.variantPrice || item.product.price || 0;
      return total + (price * item.quantity);
    }, 0);
    
    const servicesTotal = selectedServices.reduce((total, service) => {
      return total + (service.price || 0);
    }, 0);
    
    const subscriptionsTotal = selectedSubscriptions.reduce((total, subscription) => {
      return total + (subscription.price || 0);
    }, 0);
    
    return itemsTotal + servicesTotal + subscriptionsTotal;
  }, [cartItems, selectedServices, selectedSubscriptions]);

  // حساب إجمالي سلة الإرجاع
  const returnTotal = useMemo(() => {
    return returnItems.reduce((total, item) => {
      const price = item.variantPrice || item.product.price || 0;
      return total + (price * item.quantity);
    }, 0);
  }, [returnItems]);

  // حساب عدد العناصر
  const totalItemsCount = useMemo(() => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  }, [cartItems]);

  const totalReturnItemsCount = useMemo(() => {
    return returnItems.reduce((total, item) => total + item.quantity, 0);
  }, [returnItems]);

  // مكون عرض عنصر السلة
  const CartItemComponent = ({ 
    item, 
    index, 
    onUpdateQuantity, 
    onRemove, 
    isReturn = false 
  }: {
    item: CartItem;
    index: number;
    onUpdateQuantity: (index: number, quantity: number) => void;
    onRemove: (index: number) => void;
    isReturn?: boolean;
  }) => (
    <Card className={cn(
      "mb-3 transition-all duration-200",
      isReturn ? "border-l-4 border-l-orange-400" : "border-l-4 border-l-primary"
    )}>
      <CardContent className="p-3">
        <div className="flex gap-3">
          {/* صورة المنتج */}
          <div className="w-12 h-12 bg-muted rounded-lg flex-shrink-0 overflow-hidden">
            {item.variantImage || item.product.image_url ? (
              <img 
                src={item.variantImage || item.product.image_url} 
                alt={item.product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* معلومات المنتج */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm leading-tight truncate">
                  {item.product.name}
                </h4>
                <div className="text-xs text-muted-foreground space-y-1">
                  {item.colorName && (
                    <div className="flex items-center gap-1">
                      <span>اللون:</span>
                      <span className="font-medium">{item.colorName}</span>
                      {item.colorCode && (
                        <div 
                          className="w-3 h-3 rounded-full border"
                          style={{ backgroundColor: item.colorCode }}
                        />
                      )}
                    </div>
                  )}
                  {item.sizeName && (
                    <div>المقاس: <span className="font-medium">{item.sizeName}</span></div>
                  )}
                  <div className="font-medium text-primary">
                    {(item.variantPrice || item.product.price || 0).toLocaleString()} دج
                  </div>
                </div>
              </div>

              {/* زر الحذف */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(index)}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* أدوات التحكم في الكمية */}
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUpdateQuantity(index, Math.max(1, item.quantity - 1))}
                  className="h-8 w-8 p-0"
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <div className="w-12 text-center">
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => {
                      const newQuantity = parseInt(e.target.value) || 1;
                      if (newQuantity > 0) {
                        onUpdateQuantity(index, newQuantity);
                      }
                    }}
                    className="h-8 text-center text-sm"
                    min="1"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                  className="h-8 w-8 p-0"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>

              {/* إجمالي العنصر */}
              <div className="text-sm font-bold">
                {((item.variantPrice || item.product.price || 0) * item.quantity).toLocaleString()} دج
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isReturnMode) {
    // وضع الإرجاع
    return (
      <Card className="h-full flex flex-col border-l-4 border-l-orange-400">
        <CardHeader className="pb-3 bg-orange-50/30">
          <CardTitle className="text-lg flex items-center gap-2 text-orange-800">
            <RotateCcw className="h-5 w-5" />
            سلة الإرجاع
            {totalReturnItemsCount > 0 && (
              <Badge className="bg-orange-500 text-white">
                {totalReturnItemsCount}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          {/* قائمة عناصر الإرجاع */}
          <ScrollArea className="flex-1 px-4">
            {returnItems.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-center">
                <div>
                  <RotateCcw className="h-8 w-8 mx-auto mb-2 text-orange-400 opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    لا توجد عناصر للإرجاع
                  </p>
                  <p className="text-xs text-muted-foreground">
                    امسح باركود المنتجات لإضافتها
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-4">
                {returnItems.map((item, index) => (
                  <CartItemComponent
                    key={`return-${index}`}
                    item={item}
                    index={index}
                    onUpdateQuantity={updateReturnItemQuantity}
                    onRemove={removeReturnItem}
                    isReturn={true}
                  />
                ))}
              </div>
            )}
          </ScrollArea>

          {/* تفاصيل الإرجاع */}
          {returnItems.length > 0 && (
            <div className="border-t p-4 space-y-4">
              {/* سبب الإرجاع */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  سبب الإرجاع *
                </label>
                <Select value={returnReason} onValueChange={setReturnReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر سبب الإرجاع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="defective">منتج معيب</SelectItem>
                    <SelectItem value="wrong_item">منتج خاطئ</SelectItem>
                    <SelectItem value="customer_change_mind">تغيير رأي العميل</SelectItem>
                    <SelectItem value="size_issue">مشكلة في المقاس</SelectItem>
                    <SelectItem value="other">أخرى</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* ملاحظات الإرجاع */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  ملاحظات إضافية
                </label>
                <Textarea
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="أضف أي ملاحظات حول الإرجاع..."
                  rows={3}
                />
              </div>

              {/* الإجمالي */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span>عدد العناصر:</span>
                  <span>{totalReturnItemsCount}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-orange-600">
                  <span>إجمالي الاسترداد:</span>
                  <span>{returnTotal.toLocaleString()} دج</span>
                </div>
              </div>

              {/* أزرار الإجراءات */}
              <div className="space-y-2">
                <Button
                  onClick={() => processReturn(undefined, returnReason, returnNotes)}
                  disabled={!returnReason || isSubmittingOrder}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {isSubmittingOrder ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      جاري المعالجة...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      تأكيد الإرجاع
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={clearReturnCart}
                  className="w-full"
                  disabled={isSubmittingOrder}
                >
                  <X className="h-4 w-4 mr-2" />
                  مسح السلة
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // الوضع العادي - إدارة التبويبات
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            السلة
            {totalItemsCount > 0 && (
              <Badge className="bg-primary text-white">
                {totalItemsCount}
              </Badge>
            )}
          </CardTitle>
          
          {/* إدارة التبويبات */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={addTab}
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* تبويبات السلة */}
        {tabs.length > 1 && (
          <Tabs value={activeTabId} onValueChange={setActiveTabId}>
            <TabsList className="w-full">
              {tabs.map((tab) => (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id}
                  className="flex-1 text-xs relative"
                >
                  {tab.name}
                  {tab.cartItems.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {tab.cartItems.length}
                    </Badge>
                  )}
                  {tabs.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTab(tab.id);
                      }}
                      className="absolute -top-1 -right-1 h-4 w-4 p-0 rounded-full bg-destructive text-white hover:bg-destructive/80"
                    >
                      <X className="h-2 w-2" />
                    </Button>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* محتوى السلة */}
        <ScrollArea className="flex-1 px-4">
          {cartItems.length === 0 && selectedServices.length === 0 && selectedSubscriptions.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-center">
              <div>
                <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">
                  السلة فارغة
                </p>
                <p className="text-xs text-muted-foreground">
                  أضف منتجات أو خدمات للبدء
                </p>
              </div>
            </div>
          ) : (
            <div className="py-4 space-y-4">
              {/* عناصر المنتجات */}
              {cartItems.map((item, index) => (
                <CartItemComponent
                  key={`product-${index}`}
                  item={item}
                  index={index}
                  onUpdateQuantity={updateItemQuantity}
                  onRemove={removeItemFromCart}
                />
              ))}

              {/* الخدمات */}
              {selectedServices.length > 0 && (
                <div className="space-y-2">
                  <Separator />
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    الخدمات ({selectedServices.length})
                  </h4>
                  {selectedServices.map((service, index) => (
                    <Card key={`service-${index}`} className="border-l-4 border-l-blue-400">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="font-medium text-sm">{service.name}</h5>
                            <p className="text-xs text-muted-foreground">
                              {service.description}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-bold">
                              {service.price?.toLocaleString()} دج
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeService(index)}
                              className="h-8 w-8 p-0 text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* الاشتراكات */}
              {selectedSubscriptions.length > 0 && (
                <div className="space-y-2">
                  <Separator />
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    الاشتراكات ({selectedSubscriptions.length})
                  </h4>
                  {selectedSubscriptions.map((subscription, index) => (
                    <Card key={`subscription-${index}`} className="border-l-4 border-l-green-400">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="font-medium text-sm">{subscription.name}</h5>
                            <p className="text-xs text-muted-foreground">
                              {subscription.duration} - {subscription.description}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-bold">
                              {subscription.price?.toLocaleString()} دج
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSubscription(index)}
                              className="h-8 w-8 p-0 text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* ملخص وإجراءات الطلب */}
        {(cartItems.length > 0 || selectedServices.length > 0 || selectedSubscriptions.length > 0) && (
          <div className="border-t p-4 space-y-4">
            {/* اختيار العميل */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                العميل
              </label>
              <Select 
                value={activeTab?.customerId || ''} 
                onValueChange={(customerId) => {
                  const customer = customers.find(c => c.id === customerId);
                  updateTab(activeTabId, { 
                    customerId, 
                    customerName: customer?.name 
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر العميل (اختياري)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">عميل مجهول</SelectItem>
                  {customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} {customer.phone && `(${customer.phone})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ملخص الطلب */}
            <div className="space-y-2 pt-2 border-t">
              <div className="flex justify-between text-sm">
                <span>عدد العناصر:</span>
                <span>{totalItemsCount}</span>
              </div>
              {selectedServices.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span>الخدمات:</span>
                  <span>{selectedServices.length}</span>
                </div>
              )}
              {selectedSubscriptions.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span>الاشتراكات:</span>
                  <span>{selectedSubscriptions.length}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-bold text-primary">
                <span>الإجمالي:</span>
                <span>{cartTotal.toLocaleString()} دج</span>
              </div>
            </div>

            {/* أزرار الإجراءات */}
            <div className="space-y-2">
              <Button
                onClick={() => submitOrder(activeTab?.customerId)}
                disabled={isSubmittingOrder}
                className="w-full"
              >
                {isSubmittingOrder ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    جاري المعالجة...
                  </>
                ) : (
                  <>
                    <Receipt className="h-4 w-4 mr-2" />
                    تأكيد الطلب ({cartTotal.toLocaleString()} دج)
                  </>
                )}
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={clearCart}
                  disabled={isSubmittingOrder}
                >
                  <X className="h-4 w-4 mr-2" />
                  مسح السلة
                </Button>
                <Button
                  variant="outline"
                  disabled={isSubmittingOrder}
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  حاسبة
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default POSAdvancedCart;