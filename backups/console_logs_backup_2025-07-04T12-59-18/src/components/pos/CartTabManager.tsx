import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart, 
  Users, 
  Plus, 
  X, 
  Clock, 
  AlertCircle 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import Cart from './Cart';
import { Product, User, Service, Order } from '@/types';

// نوع بيانات التبويب
export interface CartTab {
  id: string;
  name: string;
  customerId?: string;
  customerName?: string;
  cartItems: CartItem[];
  selectedServices: (Service & {
    scheduledDate?: Date;
    notes?: string;
    customerId?: string;
    public_tracking_code?: string;
  })[];
  selectedSubscriptions: any[];
  notes?: string;
  createdAt: Date;
  lastModified: Date;
  isActive: boolean;
}

// نوع بيانات عنصر السلة
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

interface CartTabManagerProps {
  // بيانات التبويبات من الهوك
  tabs: CartTab[];
  activeTab: CartTab | undefined;
  activeTabId: string;
  setActiveTabId: (id: string) => void;
  addTab: (name?: string) => string;
  removeTab: (id: string) => void;
  updateTab: (id: string, updates: Partial<CartTab>) => void;
  
  // بيانات أخرى
  customers: User[];
  updateItemQuantity: (tabId: string, index: number, quantity: number) => void;
  updateItemPrice?: (tabId: string, index: number, price: number) => void;
  removeItemFromCart: (tabId: string, index: number) => void;
  clearCart: (tabId: string) => void;
  submitOrder: (order: Partial<Order>) => Promise<{orderId: string, customerOrderNumber: number}>;
  currentUser: User | null;
  removeService?: (tabId: string, serviceId: string) => void;
  updateServicePrice?: (tabId: string, serviceId: string, price: number) => void;
  removeSubscription?: (tabId: string, subscriptionId: string) => void;
  updateSubscriptionPrice?: (tabId: string, subscriptionId: string, price: number) => void;
  isReturnMode?: boolean;
  returnReason?: string;
  setReturnReason?: (reason: string) => void;
  returnNotes?: string;
  setReturnNotes?: (notes: string) => void;
}

const CartTabManager: React.FC<CartTabManagerProps> = ({
  tabs,
  activeTab,
  activeTabId,
  setActiveTabId,
  addTab,
  removeTab,
  updateTab,
  customers,
  updateItemQuantity,
  updateItemPrice = () => {},
  removeItemFromCart,
  clearCart,
  submitOrder,
  currentUser,
  removeService = () => {},
  updateServicePrice = () => {},
  removeSubscription = () => {},
  updateSubscriptionPrice = () => {},
  isReturnMode = false,
  returnReason = '',
  setReturnReason = () => {},
  returnNotes = '',
  setReturnNotes = () => {}
}) => {
  console.log('🔍 [CartTabManager] العملاء المُمررة:', { 
    customersLength: customers.length, 
    customers: customers,
    activeTabId: activeTabId
  });
  
  const [editingTabId, setEditingTabId] = useState<string>('');
  const [editingName, setEditingName] = useState<string>('');

  // حساب عدد العناصر في التبويب
  const getTabItemCount = (tab: CartTab) => {
    return tab.cartItems.reduce((sum, item) => sum + item.quantity, 0) + 
           tab.selectedServices.length + 
           tab.selectedSubscriptions.length;
  };

  // إضافة تبويب جديد
  const addNewTab = () => {
    try {
      addTab();
      toast.success('تم إضافة تبويب جديد');
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  // إغلاق تبويب
  const closeTab = (tabId: string) => {
    if (tabs.length === 1) {
      toast.error('لا يمكن إغلاق التبويب الأخير');
      return;
    }

    const tabToClose = tabs.find(tab => tab.id === tabId);
    const hasItems = tabToClose && getTabItemCount(tabToClose) > 0;

    if (hasItems) {
      if (!confirm('هذا التبويب يحتوي على منتجات. هل أنت متأكد من إغلاقه؟')) {
        return;
      }
    }

    try {
      removeTab(tabId);
      toast.success('تم إغلاق التبويب');
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  // بدء تحرير اسم التبويب
  const startEditingTab = (tabId: string, currentName: string) => {
    setEditingTabId(tabId);
    setEditingName(currentName);
  };

  // حفظ اسم التبويب
  const saveTabName = () => {
    if (!editingName.trim()) {
      toast.error('اسم التبويب لا يمكن أن يكون فارغاً');
      return;
    }

    updateTab(editingTabId, { name: editingName.trim() });
    
    setEditingTabId('');
    setEditingName('');
    toast.success('تم تحديث اسم التبويب');
  };

  // إلغاء تحرير اسم التبويب
  const cancelEditingTab = () => {
    setEditingTabId('');
    setEditingName('');
  };

  // ربط عميل بالتبويب
  const assignCustomerToTab = (tabId: string, customer: User) => {
    updateTab(tabId, {
      customerId: customer.id,
      customerName: customer.name,
      name: customer.name
    });
    toast.success(`تم ربط العميل ${customer.name} بالتبويب`);
  };

  // حاويات الأحداث للسلة
  const handleUpdateItemQuantity = (index: number, quantity: number) => {
    if (!activeTab) return;
    updateItemQuantity(activeTab.id, index, quantity);
  };

  const handleUpdateItemPrice = (index: number, price: number) => {
    if (!activeTab) return;
    updateItemPrice(activeTab.id, index, price);
  };

  const handleRemoveItemFromCart = (index: number) => {
    if (!activeTab) return;
    removeItemFromCart(activeTab.id, index);
  };

  const handleClearCart = () => {
    if (!activeTab) return;
    clearCart(activeTab.id);
  };

  const handleRemoveService = (serviceId: string) => {
    if (!activeTab) return;
    removeService(activeTab.id, serviceId);
  };

  const handleUpdateServicePrice = (serviceId: string, price: number) => {
    if (!activeTab) return;
    updateServicePrice(activeTab.id, serviceId, price);
  };

  const handleRemoveSubscription = (subscriptionId: string) => {
    if (!activeTab) return;
    removeSubscription(activeTab.id, subscriptionId);
  };

  const handleUpdateSubscriptionPrice = (subscriptionId: string, price: number) => {
    if (!activeTab) return;
    updateSubscriptionPrice(activeTab.id, subscriptionId, price);
  };

  if (!activeTab) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">لا توجد تبويبات متاحة</p>
          <Button onClick={addNewTab} className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            إضافة تبويب جديد
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* شريط التبويبات */}
      <div className="bg-background border-b border-border px-2 py-2 flex-shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
          <AnimatePresence mode="popLayout">
            {tabs.map((tab) => (
              <motion.div
                key={tab.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={cn(
                  "relative flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 min-w-[120px] max-w-[200px]",
                  activeTabId === tab.id
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card hover:bg-accent border-border"
                )}
                onClick={() => setActiveTabId(tab.id)}
              >
                {/* أيقونة التبويب */}
                <div className="flex-shrink-0">
                  {tab.customerId ? (
                    <Users className="h-4 w-4" />
                  ) : (
                    <ShoppingCart className="h-4 w-4" />
                  )}
                </div>

                {/* اسم التبويب */}
                <div className="flex-1 min-w-0">
                  {editingTabId === tab.id ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveTabName();
                          if (e.key === 'Escape') cancelEditingTab();
                        }}
                        className="h-6 text-xs bg-background"
                        autoFocus
                        onBlur={saveTabName}
                      />
                    </div>
                  ) : (
                    <div
                      className="text-xs font-medium truncate cursor-pointer"
                      onDoubleClick={() => startEditingTab(tab.id, tab.name)}
                    >
                      {tab.name}
                    </div>
                  )}
                </div>

                {/* عدد العناصر */}
                {getTabItemCount(tab) > 0 && (
                  <Badge 
                    variant={activeTabId === tab.id ? "secondary" : "default"}
                    className="text-xs h-5 min-w-5 flex items-center justify-center"
                  >
                    {getTabItemCount(tab)}
                  </Badge>
                )}

                {/* وقت التحديث الأخير */}
                {getTabItemCount(tab) > 0 && (
                  <div className="text-xs opacity-70 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {tab.lastModified.toLocaleTimeString('ar-SA', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                )}

                {/* زر الإغلاق */}
                {tabs.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 hover:bg-destructive hover:text-destructive-foreground flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.id);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* زر إضافة تبويب جديد */}
          <Button
            variant="outline"
            size="sm"
            onClick={addNewTab}
            className="flex-shrink-0 h-8 w-8 p-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* محتوى التبويب النشط */}
      <div className="flex-1 overflow-hidden">
        <Cart
          cartItems={activeTab.cartItems}
          customers={customers}
          updateItemQuantity={handleUpdateItemQuantity}
          updateItemPrice={handleUpdateItemPrice}
          removeItemFromCart={handleRemoveItemFromCart}
          clearCart={handleClearCart}
          submitOrder={submitOrder}
          currentUser={currentUser}
          selectedServices={activeTab.selectedServices}
          removeService={handleRemoveService}
          updateServicePrice={handleUpdateServicePrice}
          selectedSubscriptions={activeTab.selectedSubscriptions}
          removeSubscription={handleRemoveSubscription}
          updateSubscriptionPrice={handleUpdateSubscriptionPrice}
          isReturnMode={isReturnMode}
          returnReason={returnReason}
          setReturnReason={setReturnReason}
          returnNotes={returnNotes}
          setReturnNotes={setReturnNotes}
        />
      </div>
    </div>
  );
};

export default CartTabManager;
