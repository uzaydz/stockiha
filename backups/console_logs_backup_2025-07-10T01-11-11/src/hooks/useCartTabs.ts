import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { CartTab } from '@/components/pos/CartTabManager';
import { Product, Service, User } from '@/types';

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

interface UseCartTabsOptions {
  autoSave?: boolean;
  storageKey?: string;
  maxTabs?: number;
}

export const useCartTabs = (options: UseCartTabsOptions = {}) => {
  const {
    autoSave = true,
    storageKey = 'bazaar_cart_tabs',
    maxTabs = 10
  } = options;

  const [tabs, setTabs] = useState<CartTab[]>(() => {
    if (autoSave && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsedTabs = JSON.parse(saved);
          // تحويل التواريخ من نصوص إلى كائنات Date
          return parsedTabs.map((tab: any) => ({
            ...tab,
            createdAt: new Date(tab.createdAt),
            lastModified: new Date(tab.lastModified)
          }));
        }
      } catch (error) {
      }
    }

    // إنشاء تبويب افتراضي
    return [{
      id: uuidv4(),
      name: 'عميل جديد',
      cartItems: [],
      selectedServices: [],
      selectedSubscriptions: [],
      createdAt: new Date(),
      lastModified: new Date(),
      isActive: true
    }];
  });

  const [activeTabId, setActiveTabId] = useState<string>(tabs[0]?.id || '');

  // حفظ التبويبات في التخزين المحلي
  useEffect(() => {
    if (autoSave && tabs.length > 0) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(tabs));
      } catch (error) {
      }
    }
  }, [tabs, autoSave, storageKey]);

  // العثور على التبويب النشط
  const activeTab = tabs.find(tab => tab.id === activeTabId);

  // إضافة تبويب جديد
  const addTab = useCallback((name?: string, customerId?: string, customerName?: string) => {
    if (tabs.length >= maxTabs) {
      throw new Error(`لا يمكن إضافة أكثر من ${maxTabs} تبويبات`);
    }

    const newTab: CartTab = {
      id: uuidv4(),
      name: name || `عميل ${tabs.length + 1}`,
      customerId,
      customerName,
      cartItems: [],
      selectedServices: [],
      selectedSubscriptions: [],
      createdAt: new Date(),
      lastModified: new Date(),
      isActive: true
    };

    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
    return newTab.id;
  }, [tabs.length, maxTabs]);

  // حذف تبويب
  const removeTab = useCallback((tabId: string) => {
    if (tabs.length === 1) {
      throw new Error('لا يمكن حذف التبويب الأخير');
    }

    setTabs(prev => {
      const newTabs = prev.filter(tab => tab.id !== tabId);
      
      // إذا كان التبويب المحذوف هو النشط، انتقل للأول
      if (activeTabId === tabId) {
        setActiveTabId(newTabs[0]?.id || '');
      }
      
      return newTabs;
    });
  }, [tabs.length, activeTabId]);

  // تحديث تبويب
  const updateTab = useCallback((tabId: string, updates: Partial<CartTab>) => {
    setTabs(prev => prev.map(tab => 
      tab.id === tabId 
        ? { ...tab, ...updates, lastModified: new Date() }
        : tab
    ));
  }, []);

  // إضافة منتج للتبويب النشط
  const addItemToCart = useCallback((product: Product, quantity: number = 1, options?: {
    colorId?: string;
    colorName?: string;
    colorCode?: string;
    sizeId?: string;
    sizeName?: string;
    variantPrice?: number;
    variantImage?: string;
  }) => {
    if (!activeTab) return;

    const newItem: CartItem = {
      product,
      quantity,
      ...options
    };

    // البحث عن منتج مشابه في السلة
    const existingIndex = activeTab.cartItems.findIndex(item =>
      item.product.id === product.id &&
      item.colorId === options?.colorId &&
      item.sizeId === options?.sizeId
    );

    if (existingIndex >= 0) {
      // تحديث الكمية
      const updatedCartItems = [...activeTab.cartItems];
      updatedCartItems[existingIndex].quantity += quantity;
      updateTab(activeTab.id, { cartItems: updatedCartItems });
    } else {
      // إضافة منتج جديد
      updateTab(activeTab.id, { 
        cartItems: [...activeTab.cartItems, newItem] 
      });
    }
  }, [activeTab, updateTab]);

  // تحديث كمية منتج
  const updateItemQuantity = useCallback((tabId: string, index: number, quantity: number) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    if (quantity <= 0) {
      // حذف المنتج
      const updatedCartItems = tab.cartItems.filter((_, i) => i !== index);
      updateTab(tabId, { cartItems: updatedCartItems });
    } else {
      // تحديث الكمية
      const updatedCartItems = [...tab.cartItems];
      updatedCartItems[index].quantity = quantity;
      updateTab(tabId, { cartItems: updatedCartItems });
    }
  }, [tabs, updateTab]);

  // حذف منتج من السلة
  const removeItemFromCart = useCallback((tabId: string, index: number) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    const updatedCartItems = tab.cartItems.filter((_, i) => i !== index);
    updateTab(tabId, { cartItems: updatedCartItems });
  }, [tabs, updateTab]);

  // مسح السلة
  const clearCart = useCallback((tabId: string) => {
    updateTab(tabId, { 
      cartItems: [],
      selectedServices: [],
      selectedSubscriptions: []
    });
  }, [updateTab]);

  // إضافة خدمة
  const addService = useCallback((service: Service & {
    scheduledDate?: Date;
    notes?: string;
    customerId?: string;
    public_tracking_code?: string;
  }) => {
    if (!activeTab) return;

    updateTab(activeTab.id, {
      selectedServices: [...activeTab.selectedServices, service]
    });
  }, [activeTab, updateTab]);

  // حذف خدمة
  const removeService = useCallback((tabId: string, serviceId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    const updatedServices = tab.selectedServices.filter(s => s.id !== serviceId);
    updateTab(tabId, { selectedServices: updatedServices });
  }, [tabs, updateTab]);

  // تحديث سعر خدمة
  const updateServicePrice = useCallback((tabId: string, serviceId: string, price: number) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    const updatedServices = tab.selectedServices.map(s =>
      s.id === serviceId ? { ...s, price } : s
    );
    updateTab(tabId, { selectedServices: updatedServices });
  }, [tabs, updateTab]);

  // إضافة اشتراك
  const addSubscription = useCallback((subscription: any) => {
    if (!activeTab) return;

    updateTab(activeTab.id, {
      selectedSubscriptions: [...activeTab.selectedSubscriptions, subscription]
    });
  }, [activeTab, updateTab]);

  // حذف اشتراك
  const removeSubscription = useCallback((tabId: string, subscriptionId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    const updatedSubscriptions = tab.selectedSubscriptions.filter(s => s.id !== subscriptionId);
    updateTab(tabId, { selectedSubscriptions: updatedSubscriptions });
  }, [tabs, updateTab]);

  // تحديث سعر اشتراك
  const updateSubscriptionPrice = useCallback((tabId: string, subscriptionId: string, price: number) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    const updatedSubscriptions = tab.selectedSubscriptions.map(s =>
      s.id === subscriptionId ? { ...s, final_price: price } : s
    );
    updateTab(tabId, { selectedSubscriptions: updatedSubscriptions });
  }, [tabs, updateTab]);

  // ربط عميل بالتبويب
  const assignCustomerToTab = useCallback((tabId: string, customer: User) => {
    updateTab(tabId, {
      customerId: customer.id,
      customerName: customer.name,
      name: customer.name
    });
  }, [updateTab]);

  // تكرار تبويب (نسخ محتويات تبويب لتبويب جديد)
  const duplicateTab = useCallback((tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    const newTabId = addTab(`نسخة من ${tab.name}`);
    
    // نسخ المحتويات
    updateTab(newTabId, {
      cartItems: [...tab.cartItems],
      selectedServices: [...tab.selectedServices],
      selectedSubscriptions: [...tab.selectedSubscriptions],
      notes: tab.notes
    });

    return newTabId;
  }, [tabs, addTab, updateTab]);

  // مسح جميع التبويبات الفارغة
  const clearEmptyTabs = useCallback(() => {
    const nonEmptyTabs = tabs.filter(tab => 
      tab.cartItems.length > 0 || 
      tab.selectedServices.length > 0 || 
      tab.selectedSubscriptions.length > 0
    );

    // الاحتفاظ بتبويب واحد على الأقل
    if (nonEmptyTabs.length === 0) {
      setTabs([{
        id: uuidv4(),
        name: 'عميل جديد',
        cartItems: [],
        selectedServices: [],
        selectedSubscriptions: [],
        createdAt: new Date(),
        lastModified: new Date(),
        isActive: true
      }]);
      setActiveTabId(tabs[0]?.id || '');
    } else {
      setTabs(nonEmptyTabs);
      if (!nonEmptyTabs.find(t => t.id === activeTabId)) {
        setActiveTabId(nonEmptyTabs[0].id);
      }
    }
  }, [tabs, activeTabId]);

  // حساب إجماليات التبويب
  const getTabSummary = useCallback((tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return { itemCount: 0, total: 0 };

    const itemCount = tab.cartItems.reduce((sum, item) => sum + item.quantity, 0) +
                     tab.selectedServices.length +
                     tab.selectedSubscriptions.length;

    const productsTotal = tab.cartItems.reduce((sum, item) => {
      const price = item.variantPrice !== undefined ? item.variantPrice : item.product.price;
      return sum + (price * item.quantity);
    }, 0);

    const servicesTotal = tab.selectedServices.reduce((sum, service) => sum + service.price, 0);
    const subscriptionsTotal = tab.selectedSubscriptions.reduce((sum, sub) => 
      sum + (sub.final_price || sub.selling_price || 0), 0
    );

    return {
      itemCount,
      total: productsTotal + servicesTotal + subscriptionsTotal
    };
  }, [tabs]);

  return {
    tabs,
    activeTab,
    activeTabId,
    setActiveTabId,
    addTab,
    removeTab,
    updateTab,
    addItemToCart,
    updateItemQuantity,
    removeItemFromCart,
    clearCart,
    addService,
    removeService,
    updateServicePrice,
    addSubscription,
    removeSubscription,
    updateSubscriptionPrice,
    assignCustomerToTab,
    duplicateTab,
    clearEmptyTabs,
    getTabSummary
  };
};
