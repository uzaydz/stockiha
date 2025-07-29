import React, { useMemo, useState, useCallback } from 'react';
import POSAdvancedPaymentDialog from './POSAdvancedPaymentDialog';
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
  DollarSign,
  Sparkles,
  Zap,
  TrendingUp,
  Clock,
  Edit3,
  Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { RETURN_REASONS_WITH_ICONS_ARRAY } from '@/constants/returnReasons';

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
  customPrice?: number; // السعر المخصص المعدل
}

interface CartTab {
  id: string;
  name: string;
  cartItems: CartItem[];
  selectedServices: any[];
  selectedSubscriptions: any[];
  customerId?: string;
  customerName?: string;
  discount?: number; // نسبة التخفيض
  discountAmount?: number; // مبلغ التخفيض الثابت
  discountType?: 'percentage' | 'fixed'; // نوع التخفيض
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
  updateItemPrice: (index: number, price: number) => void; // دالة تعديل السعر
  removeItemFromCart: (index: number) => void;
  clearCart: () => void;
  submitOrder: (customerId?: string, notes?: string, discount?: number, discountType?: 'percentage' | 'fixed', amountPaid?: number, paymentMethod?: string, isPartialPayment?: boolean, considerRemainingAsPartial?: boolean) => Promise<void>;
  
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
  updateItemPrice, // Add updateItemPrice to props
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
  // حالة dialog الدفع المتقدم
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  
  // حساب إجمالي السلة العادية - محسن
  const cartSubtotal = useMemo(() => {
    const itemsTotal = cartItems.reduce((total, item) => {
      const price = item.customPrice || item.variantPrice || item.product.price || 0;
      return total + (price * item.quantity);
    }, 0);
    
    const servicesTotal = selectedServices.reduce((total, service) => {
      return total + (service.price || 0);
    }, 0);
    
    const subscriptionsTotal = selectedSubscriptions.reduce((total, subscription) => {
      // دعم حقول مختلفة للسعر
      const price = subscription.price || subscription.selling_price || subscription.purchase_price || 0;
      return total + price;
    }, 0);
    
    return itemsTotal + servicesTotal + subscriptionsTotal;
  }, [cartItems, selectedServices, selectedSubscriptions]);

  // حساب التخفيض والإجمالي النهائي - محسن
  const cartTotal = useMemo(() => {
    const discount = activeTab?.discount || 0;
    const discountAmount = activeTab?.discountAmount || 0;
    const discountType = activeTab?.discountType || 'percentage';
    
    let finalDiscount = 0;
    if (discountType === 'percentage') {
      finalDiscount = (cartSubtotal * discount) / 100;
    } else {
      finalDiscount = discountAmount;
    }
    
    return Math.max(0, cartSubtotal - finalDiscount);
  }, [cartSubtotal, activeTab?.discount, activeTab?.discountAmount, activeTab?.discountType]);

  // حساب إجمالي سلة الإرجاع - محسن
  const returnTotal = useMemo(() => {
    return returnItems.reduce((total, item) => {
      const price = item.variantPrice || item.product.price || 0;
      return total + (price * item.quantity);
    }, 0);
  }, [returnItems]);

  // حساب عدد العناصر - محسن
  const totalItemsCount = useMemo(() => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  }, [cartItems]);

  const totalReturnItemsCount = useMemo(() => {
    return returnItems.reduce((total, item) => total + item.quantity, 0);
  }, [returnItems]);

  // ⚡ تحسين: دوال مُحسنة للحد من re-renders
  const handleUpdateQuantity = useCallback((index: number, quantity: number) => {
    updateItemQuantity(index, quantity);
  }, [updateItemQuantity]);

  const handleRemoveItem = useCallback((index: number) => {
    removeItemFromCart(index);
  }, [removeItemFromCart]);

  const handleUpdatePrice = useCallback((index: number, price: number) => {
    updateItemPrice(index, price);
  }, [updateItemPrice]);

  const handleReturnUpdateQuantity = useCallback((index: number, quantity: number) => {
    updateReturnItemQuantity(index, quantity);
  }, [updateReturnItemQuantity]);

  const handleReturnRemoveItem = useCallback((index: number) => {
    removeReturnItem(index);
  }, [removeReturnItem]);

  // مكون عرض عنصر السلة
  const CartItemComponent = useCallback(({ 
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
  }) => {
    const [isEditingPrice, setIsEditingPrice] = useState(false);
    const [tempPrice, setTempPrice] = useState('');
    
    const currentPrice = item.customPrice || item.variantPrice || item.product.price || 0;
    const originalPrice = item.variantPrice || item.product.price || 0;
    const isPriceModified = item.customPrice && item.customPrice !== originalPrice;

    const handlePriceEdit = () => {
      setTempPrice(currentPrice.toString());
      setIsEditingPrice(true);
    };

    const handlePriceSave = () => {
      const newPrice = parseFloat(tempPrice);
      if (!isNaN(newPrice) && newPrice >= 0) {
        handleUpdatePrice(index, newPrice);
      }
      setIsEditingPrice(false);
    };

    const handlePriceCancel = () => {
      setIsEditingPrice(false);
      setTempPrice('');
    };

    return (
      <Card className={cn(
        "mb-2 transition-all duration-300 hover:shadow-md group overflow-hidden border",
        isReturn 
          ? "border-l-4 border-l-amber-400 dark:border-l-amber-500 bg-gradient-to-r from-amber-50/30 dark:from-amber-950/20 to-background/90 hover:from-amber-50/50 dark:hover:from-amber-950/30 shadow-sm dark:shadow-amber-900/20" 
          : "border-l-4 border-l-primary bg-gradient-to-r from-primary/3 to-background/90 hover:from-primary/8"
      )}>
        <CardContent className="p-2">
          {/* العنصر الرئيسي - تصميم مضغوط */}
          <div className="flex items-start gap-2">
            {/* صورة مصغرة */}
            <div className="relative w-10 h-10 bg-gradient-to-br from-background to-muted rounded-lg flex-shrink-0 overflow-hidden shadow-sm ring-1 ring-border/50">
              {(item.variantImage || (item.product as any).thumbnail_image || item.product.thumbnailImage || (item.product.images && item.product.images[0])) ? (
                <img 
                  src={item.variantImage || (item.product as any).thumbnail_image || item.product.thumbnailImage || (item.product.images && item.product.images[0])} 
                  alt={item.product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={cn(
                "w-full h-full flex items-center justify-center",
                (item.variantImage || (item.product as any).thumbnail_image || item.product.thumbnailImage || (item.product.images && item.product.images[0])) ? "hidden" : ""
              )}>
                <Package className="h-4 w-4 text-muted-foreground/50" />
              </div>
            </div>

            {/* المعلومات الأساسية - سطر واحد مضغوط */}
            <div className="flex-1 min-w-0">
              {/* السطر الأول: الاسم والسعر */}
              <div className="flex items-center justify-between gap-1">
                <h4 className="font-medium text-sm leading-tight truncate flex-1">
                  {String(item.product.name || '')}
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(index)}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive flex-shrink-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              
              {/* السطر الثاني: التفاصيل والسعر */}
              <div className="flex items-center justify-between gap-2 mt-1">
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-1">
                  {/* عرض متغيرات مضغوط */}
                  <div className="flex items-center gap-2">
                    {item.colorName && (
                      <div className="flex items-center gap-1">
                        {item.colorCode && (
                          <div 
                            className="w-2 h-2 rounded-full border border-border/50"
                            style={{ backgroundColor: item.colorCode }}
                          />
                        )}
                        <span className="text-[10px] font-medium">{String(item.colorName || '')}</span>
                      </div>
                    )}
                    {item.sizeName && (
                      <span className="text-[10px] bg-muted px-1 py-0.5 rounded">
                        {String(item.sizeName || '')}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* السعر والتعديل */}
                <div className="flex items-center gap-1">
                  {isEditingPrice ? (
                    <div className="flex items-center gap-1 bg-background border rounded p-1 shadow-sm">
                      <Input
                        type="number"
                        value={tempPrice}
                        onChange={(e) => setTempPrice(e.target.value)}
                        className="h-7 w-24 text-sm text-center"
                        min="0"
                        autoFocus
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handlePriceSave}
                        className="h-6 w-6 p-0 text-green-600"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handlePriceCancel}
                        className="h-6 w-6 p-0 text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <div 
                        className={cn(
                          "text-xs font-medium cursor-pointer hover:bg-muted px-2 py-1 rounded transition-all",
                          isPriceModified 
                            ? "text-orange-600 bg-orange-50" 
                            : "text-primary"
                        )}
                        onClick={!isReturn ? handlePriceEdit : undefined}
                        title={!isReturn ? "انقر لتعديل السعر" : undefined}
                      >
                        {currentPrice.toLocaleString()} دج
                        {isPriceModified && <span className="text-orange-500 ml-1">*</span>}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* السطر الثالث: الكمية والإجمالي */}
              <div className="flex items-center justify-between mt-2">
                {/* أدوات الكمية مضغوطة */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onUpdateQuantity(index, Math.max(1, item.quantity - 1))}
                    className="h-6 w-6 p-0 text-xs"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <div className="w-8 text-center">
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => {
                        const newQuantity = parseInt(e.target.value) || 1;
                        if (newQuantity > 0) {
                          onUpdateQuantity(index, newQuantity);
                        }
                      }}
                      className="h-6 text-center text-xs px-1 border-0 bg-muted/50"
                      min="1"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                    className="h-6 w-6 p-0 text-xs"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>

                {/* إجمالي العنصر */}
                <div className="text-sm font-bold text-primary bg-primary/10 px-2 py-1 rounded">
                  {(currentPrice * item.quantity).toLocaleString()} دج
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }, [handleUpdatePrice]);

  // إضافة مكون ملخص سريع للسلة
  const CartSummaryHeader = () => (
    <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b p-2 z-10">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">المنتجات:</span>
          <Badge variant="secondary" className="text-xs">{totalItemsCount}</Badge>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">الإجمالي:</span>
          <span className="font-bold text-primary">{cartTotal.toLocaleString()}</span>
          <span className="text-xs text-muted-foreground">دج</span>
        </div>
      </div>
    </div>
  );

  if (isReturnMode) {
    // وضع الإرجاع البسيط والأنيق
    return (
      <div className="h-full">
        <Card className="h-full flex flex-col border-l-4 border-l-amber-500 dark:border-l-amber-400 overflow-hidden bg-card dark:bg-card shadow-lg dark:shadow-amber-900/20">
          {/* رأسية محسنة للوضع المظلم */}
          <CardHeader className="pb-3 bg-amber-50/50 dark:bg-amber-950/30 border-b border-amber-200/50 dark:border-amber-800/30 backdrop-blur-sm">
            <CardTitle className="text-lg flex items-center gap-3 text-amber-900 dark:text-amber-50">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/60 rounded-lg ring-1 ring-amber-200/50 dark:ring-amber-700/50">
                <RotateCcw className="h-5 w-5 text-amber-700 dark:text-amber-200" />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-amber-900 dark:text-amber-50">سلة الإرجاع</span>
                  {totalReturnItemsCount > 0 && (
                    <Badge className="bg-amber-600 dark:bg-amber-500 text-white shadow-sm">
                      {totalReturnItemsCount}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-amber-700/80 dark:text-amber-200/70 font-normal mt-1">
                  امسح المنتجات لإضافتها للإرجاع
                </p>
              </div>
              
              {/* مؤشر الحالة المحسن */}
              <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-100/50 dark:bg-amber-900/40 rounded-full">
                <div className="w-2 h-2 bg-amber-500 dark:bg-amber-400 rounded-full shadow-sm" />
                <span className="text-xs text-amber-700 dark:text-amber-200 font-medium">نشط</span>
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0 min-h-0">
            {/* قائمة عناصر الإرجاع */}
            <ScrollArea className="flex-1 px-4" style={{ height: 'calc(100vh - 400px)' }}>
              {returnItems.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-center">
                  <div className="space-y-4 max-w-xs mx-auto">
                    <div className="w-16 h-16 mx-auto bg-amber-100 dark:bg-amber-900/60 rounded-full flex items-center justify-center ring-1 ring-amber-200/50 dark:ring-amber-700/50 shadow-lg dark:shadow-amber-900/30">
                      <RotateCcw className="h-8 w-8 text-amber-600 dark:text-amber-300" />
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-100">
                        لا توجد عناصر للإرجاع
                      </p>
                      <p className="text-xs text-amber-700/70 dark:text-amber-200/60 leading-relaxed">
                        امسح باركود المنتجات أو ابحث عنها لإضافتها
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-center gap-2 text-xs text-amber-600 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-950/40 px-3 py-1.5 rounded-full">
                      <div className="w-1.5 h-1.5 bg-amber-500 dark:bg-amber-400 rounded-full" />
                      <span>جاهز للاستقبال</span>
                      <div className="w-1.5 h-1.5 bg-amber-500 dark:bg-amber-400 rounded-full" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-4 space-y-3">
                  {returnItems.map((item, index) => (
                    <div key={`return-${index}`}>
                      <CartItemComponent
                        item={item}
                        index={index}
                        onUpdateQuantity={handleReturnUpdateQuantity}
                        onRemove={handleReturnRemoveItem}
                        isReturn={true}
                      />
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* تفاصيل الإرجاع المحسنة للوضع المظلم */}
            {returnItems.length > 0 && (
              <div className="border-t border-amber-200/50 dark:border-amber-800/30 bg-amber-50/30 dark:bg-amber-950/20 backdrop-blur-sm">
                <div className="p-4 space-y-4">
                  {/* سبب الإرجاع */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold mb-2 block text-amber-900 dark:text-amber-50 flex items-center gap-2">
                      <div className="w-1 h-4 bg-amber-500 dark:bg-amber-400 rounded-full shadow-sm" />
                      سبب الإرجاع *
                    </label>
                    <Select value={returnReason} onValueChange={setReturnReason}>
                      <SelectTrigger className="border-amber-200 dark:border-amber-700 focus:border-amber-400 dark:focus:border-amber-500 bg-background dark:bg-card hover:bg-amber-50/30 dark:hover:bg-amber-950/30 transition-colors">
                        <SelectValue placeholder="اختر سبب الإرجاع" />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-card dark:border-amber-700">
                        {RETURN_REASONS_WITH_ICONS_ARRAY.map((reason) => (
                          <SelectItem key={reason.value} value={reason.value} className="dark:hover:bg-amber-950/30">
                            {reason.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* ملاحظات الإرجاع */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold mb-2 block text-amber-900 dark:text-amber-50 flex items-center gap-2">
                      <div className="w-1 h-4 bg-amber-400 dark:bg-amber-500 rounded-full shadow-sm" />
                      ملاحظات إضافية
                    </label>
                    <Textarea
                      value={returnNotes}
                      onChange={(e) => setReturnNotes(e.target.value)}
                      placeholder="أضف أي ملاحظات مهمة حول الإرجاع..."
                      rows={3}
                      className="border-amber-200 dark:border-amber-700 focus:border-amber-400 dark:focus:border-amber-500 bg-background dark:bg-card resize-none placeholder:text-amber-500/60 dark:placeholder:text-amber-400/50 transition-colors"
                    />
                  </div>

                  {/* الإجمالي المحسن */}
                  <div className="space-y-3 pt-3 border-t border-amber-200/50 dark:border-amber-800/30">
                    <div className="bg-amber-100/50 dark:bg-amber-900/30 rounded-lg p-3 border border-amber-200/50 dark:border-amber-800/30 shadow-sm dark:shadow-amber-900/20">
                      <div className="flex justify-between items-center text-sm mb-2">
                        <span className="text-amber-800 dark:text-amber-100 font-medium">عدد العناصر:</span>
                        <Badge className="bg-amber-600 dark:bg-amber-500 text-white shadow-sm">{totalReturnItemsCount}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-amber-900 dark:text-amber-50">إجمالي الاسترداد:</span>
                        <div className="text-right">
                          <span className="text-xl font-bold text-amber-700 dark:text-amber-200">{returnTotal.toLocaleString()}</span>
                          <span className="text-sm text-amber-600 dark:text-amber-300 ml-1">دج</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* أزرار الإجراءات المحسنة */}
                  <div className="space-y-2">
                    <Button
                      onClick={() => processReturn(undefined, returnReason, returnNotes)}
                      disabled={!returnReason || isSubmittingOrder}
                      className="w-full bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white font-semibold py-3 shadow-lg dark:shadow-amber-900/30 transition-all duration-200"
                    >
                      {isSubmittingOrder ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                          جاري المعالجة...
                        </>
                      ) : (
                        <>
                          <Check className="h-5 w-5 mr-2" />
                          تأكيد الإرجاع
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={clearReturnCart}
                      className="w-full border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:border-amber-300 dark:hover:border-amber-600 transition-all duration-200"
                      disabled={isSubmittingOrder}
                    >
                      <X className="h-4 w-4 mr-2" />
                      مسح السلة
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // الوضع العادي - إدارة التبويبات
  return (
    <Card className="h-full flex flex-col overflow-hidden">
      {/* رأسية محسنة مع تحريكات */}
      <motion.div 
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="border-b bg-gradient-to-r from-primary/5 via-background to-primary/5 backdrop-blur-sm sticky top-0 z-10 shadow-sm"
      >
        <CardHeader className="pb-3 pt-4">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="flex items-center gap-3"
            >
              <div className="p-2 rounded-xl shadow-sm transition-all duration-300 bg-gradient-to-br from-primary/10 to-primary/20 text-primary hover:from-primary/20 hover:to-primary/30">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  السلة الذكية
                  {totalItemsCount > 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <Badge className="bg-primary text-white shadow-sm">
                        {totalItemsCount}
                      </Badge>
                    </motion.div>
                  )}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  نظام دفع متقدم ومتعدد التبويبات
                </p>
              </div>
            </motion.div>
            
            {/* إدارة التبويبات محسنة */}
            <motion.div 
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="flex items-center gap-2"
            >
              {cartTotal > 0 && (
                <Badge 
                  variant="outline" 
                  className="text-xs font-bold bg-background/80 backdrop-blur-sm border-border/50 hover:bg-accent/50 transition-all duration-200"
                >
                  <DollarSign className="h-3 w-3 mr-1" />
                  {cartTotal.toLocaleString()} دج
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={addTab}
                className="h-8 w-8 p-0 hover:bg-primary/10 hover:border-primary/30 transition-all duration-200"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </motion.div>
          </div>
        </CardHeader>
      </motion.div>

        {/* تبويبات السلة محسنة */}
        {tabs.length > 1 && (
          <motion.div
            initial={{ y: -5, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.2 }}
            className="px-4 pb-3"
          >
            <Tabs value={activeTabId} onValueChange={setActiveTabId}>
              <TabsList className="w-full h-auto p-1 bg-muted/50">
                {tabs.map((tab) => (
                  <TabsTrigger 
                    key={tab.id} 
                    value={tab.id}
                    className="flex-1 text-xs relative h-8 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200"
                  >
                    <div className="flex items-center gap-1.5">
                      <ShoppingCart className="h-3 w-3" />
                      <span className="truncate max-w-[60px]">
                        {typeof tab.name === 'string' ? tab.name : `تبويب ${tabs.indexOf(tab) + 1}`}
                      </span>
                      {tab.cartItems.length > 0 && (
                        <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1.5">
                          {tab.cartItems.length}
                        </Badge>
                      )}
                    </div>
                    {tabs.length > 1 && (
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTab(tab.id);
                        }}
                        className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-white hover:bg-destructive/80 cursor-pointer flex items-center justify-center transition-colors shadow-sm"
                      >
                        <X className="h-2 w-2" />
                      </motion.div>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </motion.div>
        )}

      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        
        {/* محتوى السلة */}
        <ScrollArea className="flex-1 px-4" style={{ height: 'calc(100vh - 450px)' }}>
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
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemove={handleRemoveItem}
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
                            <h5 className="font-medium text-sm">{String(service.name || '')}</h5>
                            <p className="text-xs text-muted-foreground">
                              {String(service.description || '')}
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
                            <h5 className="font-medium text-sm">{String(subscription.name || '')}</h5>
                            <p className="text-xs text-muted-foreground">
                              {String(subscription.duration || '')} - {String(subscription.description || '')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-bold">
                              {(subscription.price || subscription.selling_price || subscription.purchase_price || 0).toLocaleString()} دج
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

            {/* ملخص الطلب المحسن */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-3 pt-3 border-t border-dashed border-border/60"
            >
              
              <Separator className="my-3" />
              
              {/* التفاصيل المالية */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Calculator className="h-3 w-3" />
                    المجموع الفرعي:
                  </span>
                  <span className="font-medium">{cartSubtotal.toLocaleString()} دج</span>
                </div>
                
                {/* التخفيض إن وجد */}
                {((activeTab?.discount && activeTab.discount > 0) || (activeTab?.discountAmount && activeTab.discountAmount > 0)) && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex justify-between items-center text-sm p-2 bg-green-50 rounded-lg border border-green-200"
                  >
                    <span className="text-green-700 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      التخفيض:
                    </span>
                    <span className="font-bold text-green-600">
                      {activeTab.discountType === 'percentage' 
                        ? `-${((cartSubtotal * (activeTab.discount || 0)) / 100).toLocaleString()} دج (${activeTab.discount}%)`
                        : `-${(activeTab.discountAmount || 0).toLocaleString()} دج`
                      }
                    </span>
                  </motion.div>
                )}
              </div>
              
              <Separator className="my-3" />
              
              {/* الإجمالي النهائي المحسن */}
              <motion.div 
                whileHover={{ scale: 1.01 }}
                className="flex justify-between items-center p-3 bg-gradient-to-r from-primary/10 dark:from-primary/20 to-primary/15 dark:to-primary/25 rounded-xl border border-primary/30 dark:border-primary/40 shadow-sm dark:shadow-primary/10"
              >
                <span className="text-lg font-bold text-primary dark:text-primary-foreground flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  الإجمالي:
                </span>
                <span className="text-xl font-bold text-primary dark:text-primary-foreground">{cartTotal.toLocaleString()} دج</span>
              </motion.div>
            </motion.div>

            {/* أزرار الإجراءات المحسنة */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-3"
            >
              {/* زر الدفع الرئيسي المحسن */}
              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <Button
                  onClick={() => setIsPaymentDialogOpen(true)}
                  disabled={isSubmittingOrder}
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300 dark:shadow-primary/20"
                >
                  {isSubmittingOrder ? (
                    <>
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"
                      />
                      جاري المعالجة...
                    </>
                  ) : (
                    <>
                      <Receipt className="h-5 w-5 mr-2" />
                      تأكيد الطلب
                      <Badge className="ml-2 bg-white/20 dark:bg-white/10 text-white border-white/30 dark:border-white/20">
                        {cartTotal.toLocaleString()} دج
                      </Badge>
                    </>
                  )}
                </Button>
              </motion.div>

              {/* أزرار الإجراءات الثانوية المحسنة */}
              <div className="grid grid-cols-3 gap-2">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="outline"
                    onClick={clearCart}
                    disabled={isSubmittingOrder}
                    className="w-full h-10 hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive transition-all duration-200 shadow-sm dark:shadow-destructive/10"
                  >
                    <X className="h-4 w-4 mr-1" />
                    مسح
                  </Button>
                </motion.div>
                
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="outline"
                    onClick={() => {
                      // فتح dialog التخفيض السريع
                      const discountInput = prompt('أدخل التخفيض:\n1. نسبة مئوية (مثال: 10)\n2. مبلغ ثابت (مثال: 500 دج)', (activeTab?.discount || 0).toString());
                      if (discountInput !== null && discountInput.trim() !== '') {
                        const input = discountInput.trim();
                        let discountValue: number;
                        let discountType: 'percentage' | 'fixed' = 'percentage';
                        
                        // التحقق من وجود "دج" في النص
                        if (input.includes('دج') || input.includes('DA')) {
                          discountValue = parseFloat(input.replace(/[^\d.]/g, ''));
                          discountType = 'fixed';
                        } else {
                          discountValue = parseFloat(input);
                          discountType = 'percentage';
                        }
                        
                        if (!isNaN(discountValue) && discountValue >= 0) {
                          // التحقق من صحة النسبة المئوية
                          if (discountType === 'percentage' && discountValue > 100) {
                            alert('نسبة التخفيض لا يمكن أن تكون أكثر من 100%');
                            return;
                          }
                          
                          // التحقق من صحة المبلغ الثابت
                          if (discountType === 'fixed' && discountValue > cartSubtotal) {
                            alert('مبلغ التخفيض لا يمكن أن يكون أكثر من المجموع الفرعي');
                            return;
                          }
                          
                          updateTab(activeTabId, { 
                            discount: discountValue, 
                            discountType,
                            discountAmount: discountType === 'fixed' ? discountValue : 0 
                          });
                        } else {
                          alert('يرجى إدخال قيمة تخفيض صحيحة');
                        }
                      }
                    }}
                    disabled={isSubmittingOrder}
                    className="w-full h-10 hover:bg-green-50 dark:hover:bg-green-950/20 hover:border-green-300 dark:hover:border-green-700 hover:text-green-700 dark:hover:text-green-400 transition-all duration-200 shadow-sm dark:shadow-green/10"
                  >
                    <TrendingUp className="h-4 w-4 mr-1" />
                    تخفيض
                  </Button>
                </motion.div>
                
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="outline"
                    onClick={() => setIsPaymentDialogOpen(true)}
                    disabled={isSubmittingOrder}
                    className="w-full h-10 hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-700 dark:hover:text-blue-400 transition-all duration-200 shadow-sm dark:shadow-blue/10"
                  >
                    <Calculator className="h-4 w-4 mr-1" />
                    حساب
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </div>
        )}
      </CardContent>
      
      {/* Dialog الدفع المتقدم */}
      <POSAdvancedPaymentDialog
        isOpen={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        subtotal={cartSubtotal}
        currentDiscount={activeTab?.discount || 0}
        currentDiscountType={activeTab?.discountType || 'percentage'}
        total={cartTotal}
        customers={customers}
        selectedCustomerId={activeTab?.customerId}
        onPaymentComplete={(data) => {
          // تحديث التخفيض في التبويب
          updateTab(activeTabId, {
            discount: data.discount,
            discountType: data.discountType,
            discountAmount: data.discountType === 'fixed' ? data.discount : 0
          });
          
          // إتمام الطلب مع جميع معاملات الدفع الجزئي
          submitOrder(
            data.customerId,
            data.notes,
            data.discount,
            data.discountType,
            data.amountPaid,
            data.paymentMethod,
            data.isPartialPayment,
            data.considerRemainingAsPartial
          );
          
          // إغلاق الـ dialog
          setIsPaymentDialogOpen(false);
        }}
        isProcessing={isSubmittingOrder}
      />
    </Card>
  );
};

export default POSAdvancedCart;
