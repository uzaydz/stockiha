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
        console.log('🔍 [useCartTabs] تحميل البيانات من localStorage:', {
          storageKey,
          hasSavedData: !!saved,
          savedDataLength: saved?.length || 0
        });
        
        if (saved) {
          const parsedTabs = JSON.parse(saved);
          console.log('📊 [useCartTabs] البيانات المُحملة:', {
            tabsCount: parsedTabs.length,
            firstTabItems: parsedTabs[0]?.cartItems?.length || 0,
            allTabsData: parsedTabs.map((tab: any) => ({
              id: tab.id,
              name: tab.name,
              itemsCount: tab.cartItems?.length || 0
            }))
          });
          
          // تحويل التواريخ من نصوص إلى كائنات Date
          return parsedTabs.map((tab: any) => ({
            ...tab,
            createdAt: new Date(tab.createdAt),
            lastModified: new Date(tab.lastModified)
          }));
        }
      } catch (error) {
        console.error('❌ [useCartTabs] خطأ في تحميل البيانات من localStorage:', error);
      }
    }

    console.log('🆕 [useCartTabs] إنشاء تبويب افتراضي جديد');
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
        console.log('💾 [useCartTabs] حفظ البيانات في localStorage:', {
          storageKey,
          tabsCount: tabs.length,
          firstTabItems: tabs[0]?.cartItems?.length || 0,
          allTabsData: tabs.map(tab => ({
            id: tab.id,
            name: tab.name,
            itemsCount: tab.cartItems?.length || 0
          }))
        });
        
        localStorage.setItem(storageKey, JSON.stringify(tabs));
        console.log('✅ [useCartTabs] تم حفظ البيانات بنجاح');
      } catch (error) {
        console.error('❌ [useCartTabs] خطأ في حفظ البيانات:', error);
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
    console.log('🔄 [useCartTabs.updateTab] بدء تحديث التبويب:', {
      tabId,
      updates: {
        cartItemsLength: updates.cartItems?.length,
        servicesLength: updates.selectedServices?.length,
        subscriptionsLength: updates.selectedSubscriptions?.length,
        hasOtherUpdates: Object.keys(updates).some(key => !['cartItems', 'selectedServices', 'selectedSubscriptions'].includes(key))
      }
    });

    setTabs(prev => {
      const newTabs = prev.map(tab => 
        tab.id === tabId 
          ? { ...tab, ...updates, lastModified: new Date() }
          : tab
      );

      console.log('📊 [useCartTabs.updateTab] التبويبات بعد التحديث:', {
        tabId,
        updatedTabItems: newTabs.find(t => t.id === tabId)?.cartItems?.length || 0,
        totalTabs: newTabs.length
      });

      return newTabs;
    });
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
    console.log('🔍 [useCartTabs.addItemToCart] بدء إضافة منتج للتبويب:', {
      productId: product.id,
      productName: product.name,
      quantity,
      options,
      activeTabId
    });

    // 🔧 استخدام functional update مع setTabs للحصول على أحدث state
    setTabs(currentTabs => {
      console.log('📊 [useCartTabs.addItemToCart] قراءة الـ state الحالي:', {
        currentTabsCount: currentTabs.length,
        activeTabId,
        targetTabExists: currentTabs.some(tab => tab.id === activeTabId)
      });

      const currentActiveTab = currentTabs.find(tab => tab.id === activeTabId);
      
      if (!currentActiveTab) {
        console.error('❌ [useCartTabs.addItemToCart] لا يوجد تبويب نشط');
        return currentTabs; // لا تغيير في الـ state
      }

      console.log('📋 [useCartTabs.addItemToCart] التبويب النشط الحالي:', {
        tabId: currentActiveTab.id,
        currentItemsCount: currentActiveTab.cartItems?.length || 0
      });

      // إنشاء العنصر الجديد
      const newItem: CartItem = {
        id: uuidv4(),
        product,
        quantity,
        colorId: options?.colorId,
        colorName: options?.colorName,
        colorCode: options?.colorCode,
        sizeId: options?.sizeId,
        sizeName: options?.sizeName,
        variantPrice: options?.variantPrice,
        variantImage: options?.variantImage,
        addedAt: new Date().toISOString()
      };

      console.log('📝 [useCartTabs.addItemToCart] إنشاء العنصر الجديد:', {
        product: {
          id: newItem.product.id,
          name: newItem.product.name,
          price: newItem.product.price
        },
        quantity: newItem.quantity
      });

      // البحث عن منتج مشابه في السلة
      const existingIndex = currentActiveTab.cartItems.findIndex(item => {
        const sameProduct = item.product.id === product.id;
        const sameColor = (item.colorId || null) === (options?.colorId || null);
        const sameSize = (item.sizeId || null) === (options?.sizeId || null);
        
        console.log('🔍 [useCartTabs.addItemToCart] فحص تطابق المنتج:', {
          productId: product.id,
          existingProductId: item.product.id,
          sameProduct,
          itemColorId: item.colorId,
          optionsColorId: options?.colorId,
          sameColor,
          itemSizeId: item.sizeId,
          optionsSizeId: options?.sizeId,
          sameSize,
          isMatch: sameProduct && sameColor && sameSize
        });
        
        return sameProduct && sameColor && sameSize;
      });

      console.log('🔍 [useCartTabs.addItemToCart] فحص المنتجات الموجودة:', {
        existingIndex,
        foundExisting: existingIndex !== -1,
        totalItemsInCart: currentActiveTab.cartItems.length
      });

      let updatedCartItems;
      
      if (existingIndex !== -1) {
        // تحديث الكمية للمنتج الموجود
        console.log('🔄 [useCartTabs.addItemToCart] تحديث المنتج الموجود');
        updatedCartItems = currentActiveTab.cartItems.map((item, index) => 
          index === existingIndex 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
        console.log('📊 [useCartTabs.addItemToCart] الكمية الجديدة:', {
          oldQuantity: currentActiveTab.cartItems[existingIndex].quantity,
          newQuantity: currentActiveTab.cartItems[existingIndex].quantity + quantity
        });
      } else {
        // إضافة منتج جديد
        console.log('🆕 [useCartTabs.addItemToCart] إضافة منتج جديد للسلة');
        updatedCartItems = [...currentActiveTab.cartItems, newItem];
        console.log('📊 [useCartTabs.addItemToCart] عدد المنتجات:', {
          before: currentActiveTab.cartItems.length,
          after: updatedCartItems.length
        });
      }

      // تحديث التبويب مع العناصر الجديدة
      const updatedTabs = currentTabs.map(tab => 
        tab.id === activeTabId 
          ? { ...tab, cartItems: updatedCartItems, lastModified: new Date() }
          : tab
      );

      console.log('📊 [useCartTabs.addItemToCart] النتيجة النهائية:', {
        tabId: activeTabId,
        finalItemsCount: updatedTabs.find(t => t.id === activeTabId)?.cartItems?.length || 0,
        totalTabs: updatedTabs.length
      });

      console.log('✅ [useCartTabs.addItemToCart] تم الانتهاء من إضافة المنتج');
      return updatedTabs;
    });
  }, [activeTabId]);

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
    console.log('🗑️ [useCartTabs.clearCart] بدء تفريغ السلة:', {
      tabId,
      itemsBeforeClear: tabs.find(t => t.id === tabId)?.cartItems?.length || 0,
      servicesBeforeClear: tabs.find(t => t.id === tabId)?.selectedServices?.length || 0,
      subscriptionsBeforeClear: tabs.find(t => t.id === tabId)?.selectedSubscriptions?.length || 0
    });

    updateTab(tabId, { 
      cartItems: [],
      selectedServices: [],
      selectedSubscriptions: []
    });

    console.log('✅ [useCartTabs.clearCart] تم استدعاء updateTab لتفريغ السلة');
  }, [updateTab, tabs]);

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
