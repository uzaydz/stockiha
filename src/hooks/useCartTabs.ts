import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { CartTab } from '@/components/pos/CartTabManager';
import { Product, Service, User } from '@/types';

import type { SaleType } from '@/lib/pricing/wholesalePricing';

type SellingUnit = 'piece' | 'weight' | 'box' | 'meter';

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
  /** نوع البيع (تجزئة/جملة/نصف جملة) */
  saleType?: SaleType;
  /** هل هذا سعر جملة؟ */
  isWholesale?: boolean;
  /** السعر الأصلي قبل خصم الجملة */
  originalPrice?: number;
  // === ⚡ حقول أنواع البيع المتقدمة ===
  /** وحدة البيع (قطعة/وزن/علبة/متر) */
  sellingUnit?: SellingUnit;
  /** الوزن (للبيع بالوزن) */
  weight?: number;
  /** وحدة الوزن */
  weightUnit?: 'kg' | 'g' | 'lb' | 'oz';
  /** السعر لكل وحدة وزن */
  pricePerWeightUnit?: number;
  /** عدد الصناديق (للبيع بالعلبة) */
  boxCount?: number;
  /** عدد الوحدات في الصندوق */
  unitsPerBox?: number;
  /** سعر الصندوق */
  boxPrice?: number;
  /** الطول (للبيع بالمتر) */
  length?: number;
  /** السعر لكل متر */
  pricePerMeter?: number;
  // === ⚡ حقول الدفعات والأرقام التسلسلية ===
  /** معرف الدفعة */
  batchId?: string;
  /** رقم الدفعة */
  batchNumber?: string;
  /** تاريخ انتهاء الصلاحية */
  expiryDate?: string;
  /** الأرقام التسلسلية المحددة */
  serialNumbers?: string[];
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
          // ⚡ ترحيل البيانات القديمة: إضافة القيم الافتراضية للحقول المتقدمة المفقودة
          const restoredTabs = parsedTabs.map((tab: any) => ({
            ...tab,
            createdAt: new Date(tab.createdAt),
            lastModified: new Date(tab.lastModified),
            // ⚡ ترحيل cartItems لإضافة القيم الافتراضية للحقول المتقدمة
            cartItems: (tab.cartItems || []).map((item: any) => {
              const sellingUnit = item.sellingUnit || 'piece';

              // إذا كان هناك sellingUnit ولكن القيمة المقابلة غير موجودة، نضيف قيمة افتراضية
              if (sellingUnit === 'meter' && !item.length) {
                console.log('[useCartTabs] ⚡ Migration: Adding default length for meter item:', item.product?.id);
                return {
                  ...item,
                  length: item.product?.min_meters_per_sale || item.product?.min_meters || 1,
                  pricePerMeter: item.pricePerMeter || item.product?.price_per_meter || item.product?.price || 0
                };
              }
              if (sellingUnit === 'weight' && !item.weight) {
                console.log('[useCartTabs] ⚡ Migration: Adding default weight for weight item:', item.product?.id);
                return {
                  ...item,
                  weight: item.product?.min_weight_per_sale || 1,
                  weightUnit: item.weightUnit || item.product?.weight_unit || 'kg',
                  pricePerWeightUnit: item.pricePerWeightUnit || item.product?.price_per_weight_unit || item.product?.price || 0
                };
              }
              if (sellingUnit === 'box' && !item.boxCount) {
                console.log('[useCartTabs] ⚡ Migration: Adding default boxCount for box item:', item.product?.id);
                return {
                  ...item,
                  boxCount: 1,
                  unitsPerBox: item.unitsPerBox || item.product?.units_per_box || 1,
                  boxPrice: item.boxPrice || item.product?.box_price || item.product?.price || 0
                };
              }

              return item;
            })
          }));

          return restoredTabs;
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

  const [activeTabId, setActiveTabIdState] = useState<string>(tabs[0]?.id || '');

  // ⚡ Ref للـ activeTabId للاستخدام في callbacks بدون مشاكل closure
  const activeTabIdRef = useRef(activeTabId);

  // تحديث الـ state والـ ref معاً
  const setActiveTabId = useCallback((id: string) => {
    activeTabIdRef.current = id;
    setActiveTabIdState(id);
  }, []);

  // حفظ التبويبات في التخزين المحلي - محسن لتجنب التداخل
  useEffect(() => {
    if (autoSave && tabs.length > 0) {
      // تأخير صغير لتجنب الحفظ المتكرر أثناء التحديثات السريعة
      const timeoutId = setTimeout(() => {
        try {
          localStorage.setItem(storageKey, JSON.stringify(tabs));
        } catch (error) {
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [tabs, autoSave, storageKey]);

  // العثور على التبويب النشط - محسن للتحديث التلقائي
  const activeTab = useMemo(() => {
    const foundTab = tabs.find(tab => tab.id === activeTabId);
    return foundTab;
  }, [tabs, activeTabId]);

  // إضافة تبويب جديد
  const addTab = useCallback((name?: string, customerId?: string, customerName?: string) => {
    const newTabId = uuidv4();

    // ⚡ تحديث الـ ref أولاً قبل أي شيء
    activeTabIdRef.current = newTabId;

    setTabs(prev => {
      if (prev.length >= maxTabs) {
        return prev;
      }

      const newTab: CartTab = {
        id: newTabId,
        name: name || `عميل ${prev.length + 1}`,
        customerId,
        customerName,
        cartItems: [],
        selectedServices: [],
        selectedSubscriptions: [],
        createdAt: new Date(),
        lastModified: new Date(),
        isActive: true
      };

      return [...prev, newTab];
    });

    // تحديث الـ state أيضاً
    setActiveTabIdState(newTabId);

    return newTabId;
  }, [maxTabs]);

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

  // تحديث تبويب - للاستخدام مع الدوال القديمة فقط
  const updateTab = useCallback((tabId: string, updates: Partial<CartTab>) => {
    setTabs(prev => prev.map(tab => 
      tab.id === tabId 
        ? { ...tab, ...updates, lastModified: new Date() }
        : tab
    ));
  }, []);

  // إضافة منتج للتبويب النشط - محسن للعمل مع الحالة الحالية
  const addItemToCart = useCallback((product: Product, quantity: number = 1, options?: {
    colorId?: string;
    colorName?: string;
    colorCode?: string;
    sizeId?: string;
    sizeName?: string;
    variantPrice?: number;
    variantImage?: string;
    saleType?: SaleType;
    isWholesale?: boolean;
    originalPrice?: number;
    // ⚡ حقول أنواع البيع المتقدمة
    sellingUnit?: SellingUnit;
    weight?: number;
    weightUnit?: 'kg' | 'g' | 'lb' | 'oz';
    pricePerWeightUnit?: number;
    boxCount?: number;
    unitsPerBox?: number;
    boxPrice?: number;
    length?: number;
    pricePerMeter?: number;
    // ⚡ حقول الدفعات والأرقام التسلسلية
    batchId?: string;
    batchNumber?: string;
    expiryDate?: string;
    serialNumbers?: string[];
  }) => {

    // 🔍 DEBUG: طباعة القيم المستلمة
    console.log('[useCartTabs] 🔍 DEBUG addItemToCart - received options:', {
      productId: product.id,
      productName: product.name,
      quantity,
      options
    });

    // استخدام setTabs للحصول على أحدث حالة
    // ⚡ نستخدم activeTabIdRef.current للحصول على أحدث قيمة (يتجاوز مشكلة closure)
    setTabs(currentTabs => {
      const targetTabId = activeTabIdRef.current;
      let workingTabs = [...currentTabs]; // نسخة للعمل عليها
      let currentActiveTab = workingTabs.find(tab => tab.id === targetTabId);

      console.log('[useCartTabs] 🎯 addItemToCart - targetTabId:', targetTabId, 'found:', !!currentActiveTab, 'tabs count:', workingTabs.length);

      // ⚡ إذا لم نجد التبويب (قد يكون جديداً لم يُضاف بعد بسبب batching)
      // ننشئه ونضيفه للقائمة
      if (!currentActiveTab) {
        console.log('[useCartTabs] ⚠️ Tab not found, creating new one');
        const newTab: CartTab = {
          id: targetTabId,
          name: `عميل ${workingTabs.length + 1}`,
          cartItems: [],
          selectedServices: [],
          selectedSubscriptions: [],
          createdAt: new Date(),
          lastModified: new Date(),
          isActive: true
        };
        workingTabs = [...workingTabs, newTab];
        currentActiveTab = newTab;
      }

      const newItem: CartItem = {
        product,
        quantity,
        ...options
      };

      // 🔍 DEBUG: طباعة العنصر الجديد بعد الإنشاء
      console.log('[useCartTabs] 🔍 DEBUG newItem created:', {
        productId: newItem.product.id,
        sellingUnit: newItem.sellingUnit,
        length: newItem.length,
        weight: newItem.weight,
        boxCount: newItem.boxCount
      });

      // البحث عن منتج مشابه في السلة
      // ⚡ إضافة sellingUnit للمقارنة - منتج بوحدات بيع مختلفة يجب أن يكون عنصراً منفصلاً
      const existingIndex = currentActiveTab.cartItems.findIndex(item =>
        item.product.id === product.id &&
        item.colorId === options?.colorId &&
        item.sizeId === options?.sizeId &&
        item.sellingUnit === options?.sellingUnit
      );

      if (existingIndex >= 0) {
        // تحديث الكمية والحقول المتقدمة
        const updatedCartItems = [...currentActiveTab.cartItems];
        const existingItem = updatedCartItems[existingIndex];

        // ⚡ تحديث الكمية أو الحقول المتقدمة حسب نوع البيع
        const sellingUnit = options?.sellingUnit || existingItem.sellingUnit || 'piece';

        switch (sellingUnit) {
          case 'weight':
            // للوزن: نجمع الأوزان
            updatedCartItems[existingIndex] = {
              ...existingItem,
              weight: (existingItem.weight || 0) + (options?.weight || 0),
              weightUnit: options?.weightUnit || existingItem.weightUnit,
              pricePerWeightUnit: options?.pricePerWeightUnit || existingItem.pricePerWeightUnit
            };
            break;
          case 'meter':
            // للمتر: نجمع الأطوال
            updatedCartItems[existingIndex] = {
              ...existingItem,
              length: (existingItem.length || 0) + (options?.length || 0),
              pricePerMeter: options?.pricePerMeter || existingItem.pricePerMeter
            };
            break;
          case 'box':
            // للصندوق: نجمع عدد الصناديق
            updatedCartItems[existingIndex] = {
              ...existingItem,
              boxCount: (existingItem.boxCount || 0) + (options?.boxCount || 0),
              unitsPerBox: options?.unitsPerBox || existingItem.unitsPerBox,
              boxPrice: options?.boxPrice || existingItem.boxPrice
            };
            break;
          case 'piece':
          default:
            // للقطعة: نجمع الكميات
            updatedCartItems[existingIndex].quantity += quantity;
            break;
        }

        console.log('[useCartTabs] 🔍 DEBUG existing item updated:', {
          productId: product.id,
          sellingUnit,
          updatedItem: updatedCartItems[existingIndex]
        });

        return workingTabs.map(tab =>
          tab.id === targetTabId
            ? { ...tab, cartItems: updatedCartItems, lastModified: new Date() }
            : tab
        );
      } else {
        // إضافة منتج جديد
        const newCartItems = [...currentActiveTab.cartItems, newItem];

        console.log('[useCartTabs] ✅ Adding new item to tab:', targetTabId, 'new cart length:', newCartItems.length);

        return workingTabs.map(tab =>
          tab.id === targetTabId
            ? { ...tab, cartItems: newCartItems, lastModified: new Date() }
            : tab
        );
      }
    });
  }, []); // ⚡ إزالة activeTabId من dependencies لأننا نستخدم ref

  // تحديث كمية منتج - محسن للعمل مع الحالة الحالية
  const updateItemQuantity = useCallback((tabId: string, index: number, quantity: number) => {
    
    setTabs(currentTabs => {
      const tab = currentTabs.find(t => t.id === tabId);
      if (!tab) {
        return currentTabs;
      }

      if (quantity <= 0) {
        // حذف المنتج
        const updatedCartItems = tab.cartItems.filter((_, i) => i !== index);
        
        return currentTabs.map(t => 
          t.id === tabId 
            ? { ...t, cartItems: updatedCartItems, lastModified: new Date() }
            : t
        );
      } else {
        // تحديث الكمية
        const updatedCartItems = [...tab.cartItems];
        updatedCartItems[index].quantity = quantity;
        
        return currentTabs.map(t => 
          t.id === tabId 
            ? { ...t, cartItems: updatedCartItems, lastModified: new Date() }
            : t
        );
      }
    });
  }, []);

  // حذف منتج من السلة - محسن للعمل مع الحالة الحالية
  const removeItemFromCart = useCallback((tabId: string, index: number) => {
    
    setTabs(currentTabs => {
      const tab = currentTabs.find(t => t.id === tabId);
      if (!tab) {
        return currentTabs;
      }

      const updatedCartItems = tab.cartItems.filter((_, i) => i !== index);
      
      return currentTabs.map(t => 
        t.id === tabId 
          ? { ...t, cartItems: updatedCartItems, lastModified: new Date() }
          : t
      );
    });
  }, []);

  // مسح السلة - محسن للحفظ الفوري والعمل مع الحالة الحالية
  const clearCart = useCallback((tabId: string) => {
    
    setTabs(currentTabs => {
      const tab = currentTabs.find(t => t.id === tabId);
      if (!tab) {
        return currentTabs;
      }

      const updatedTabs = currentTabs.map(t => 
        t.id === tabId 
          ? { 
              ...t, 
              cartItems: [],
              selectedServices: [],
              selectedSubscriptions: [],
              lastModified: new Date() 
            }
          : t
      );

      // حفظ فوري في localStorage لضمان عدم عودة البيانات
      if (autoSave) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(updatedTabs));
        } catch (error) {
        }
      }
      
      return updatedTabs;
    });
  }, [autoSave, storageKey]);

  // إضافة خدمة - محسن للعمل مع الحالة الحالية
  const addService = useCallback((service: Service & {
    scheduledDate?: Date;
    notes?: string;
    customerId?: string;
    public_tracking_code?: string;
  }) => {
    
    setTabs(currentTabs => {
      const currentActiveTab = currentTabs.find(tab => tab.id === activeTabId);
      
      if (!currentActiveTab) {
        return currentTabs;
      }

      const newServices = [...currentActiveTab.selectedServices, service];

      return currentTabs.map(tab => 
        tab.id === activeTabId 
          ? { ...tab, selectedServices: newServices, lastModified: new Date() }
          : tab
      );
    });
  }, [activeTabId]);

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

  // تحديث نوع البيع لعنصر في السلة (جملة/تجزئة)
  const updateItemSaleType = useCallback((tabId: string, index: number, saleType: SaleType, newPrice: number, originalPrice: number) => {
    setTabs(currentTabs => {
      const tab = currentTabs.find(t => t.id === tabId);
      if (!tab || index < 0 || index >= tab.cartItems.length) {
        return currentTabs;
      }

      const updatedCartItems = [...tab.cartItems];
      updatedCartItems[index] = {
        ...updatedCartItems[index],
        saleType,
        isWholesale: saleType !== 'retail',
        variantPrice: newPrice,
        originalPrice
      };

      return currentTabs.map(t =>
        t.id === tabId
          ? { ...t, cartItems: updatedCartItems, lastModified: new Date() }
          : t
      );
    });
  }, []);

  // مسح جميع البيانات المحفوظة (للطوارئ)
  const clearAllSavedData = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      // إعادة تعيين التبويبات للحالة الافتراضية
      const defaultTab = {
        id: uuidv4(),
        name: 'عميل جديد',
        cartItems: [],
        selectedServices: [],
        selectedSubscriptions: [],
        createdAt: new Date(),
        lastModified: new Date(),
        isActive: true
      };
      setTabs([defaultTab]);
      setActiveTabId(defaultTab.id);
    } catch (error) {
    }
  }, [storageKey]);

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
    getTabSummary,
    clearAllSavedData,
    updateItemSaleType
  };
};
