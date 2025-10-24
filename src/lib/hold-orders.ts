/**
 * نظام حجز/تعليق الطلبات
 * يسمح بحفظ الطلبات المعلقة واسترجاعها لاحقاً
 */

export interface HeldOrderItem {
  product: any;
  quantity: number;
  colorId?: string;
  colorName?: string;
  colorCode?: string;
  sizeId?: string;
  sizeName?: string;
  variantPrice?: number;
  variantImage?: string;
  customPrice?: number;
}

export interface HeldOrder {
  id: string;
  name: string;
  items: HeldOrderItem[];
  services: any[];
  subscriptions: any[];
  customerId?: string;
  customerName?: string;
  discount?: number;
  discountAmount?: number;
  discountType?: 'percentage' | 'fixed';
  notes?: string;
  createdAt: number;
  updatedAt: number;
  employeeId?: string;
  employeeName?: string;
}

const STORAGE_KEY = 'pos_held_orders';
const MAX_HELD_ORDERS = 50; // الحد الأقصى للطلبات المعلقة

/**
 * جلب جميع الطلبات المعلقة
 */
export const getHeldOrders = (): HeldOrder[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const orders = JSON.parse(stored) as HeldOrder[];
    // ترتيب حسب آخر تحديث
    return orders.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (error) {
    console.error('Error loading held orders:', error);
    return [];
  }
};

/**
 * حفظ طلب معلق
 */
export const saveHeldOrder = (order: Omit<HeldOrder, 'id' | 'createdAt' | 'updatedAt'>): HeldOrder => {
  const orders = getHeldOrders();
  
  const newOrder: HeldOrder = {
    ...order,
    id: `held_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  // إضافة الطلب الجديد
  orders.unshift(newOrder);
  
  // الاحتفاظ بآخر MAX_HELD_ORDERS طلب فقط
  const limitedOrders = orders.slice(0, MAX_HELD_ORDERS);
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedOrders));
  
  return newOrder;
};

/**
 * تحديث طلب معلق
 */
export const updateHeldOrder = (id: string, updates: Partial<Omit<HeldOrder, 'id' | 'createdAt'>>): HeldOrder | null => {
  const orders = getHeldOrders();
  const index = orders.findIndex(o => o.id === id);
  
  if (index === -1) return null;
  
  orders[index] = {
    ...orders[index],
    ...updates,
    updatedAt: Date.now(),
  };
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  
  return orders[index];
};

/**
 * حذف طلب معلق
 */
export const deleteHeldOrder = (id: string): boolean => {
  const orders = getHeldOrders();
  const filtered = orders.filter(o => o.id !== id);
  
  if (filtered.length === orders.length) return false;
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  
  return true;
};

/**
 * جلب طلب معلق بالمعرف
 */
export const getHeldOrder = (id: string): HeldOrder | null => {
  const orders = getHeldOrders();
  return orders.find(o => o.id === id) || null;
};

/**
 * مسح جميع الطلبات المعلقة
 */
export const clearAllHeldOrders = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

/**
 * عدد الطلبات المعلقة
 */
export const getHeldOrdersCount = (): number => {
  return getHeldOrders().length;
};

/**
 * البحث في الطلبات المعلقة
 */
export const searchHeldOrders = (query: string): HeldOrder[] => {
  const orders = getHeldOrders();
  const lowerQuery = query.toLowerCase();
  
  return orders.filter(order => {
    return (
      order.name.toLowerCase().includes(lowerQuery) ||
      order.customerName?.toLowerCase().includes(lowerQuery) ||
      order.notes?.toLowerCase().includes(lowerQuery) ||
      order.items.some(item => 
        item.product.name?.toLowerCase().includes(lowerQuery)
      )
    );
  });
};

/**
 * تصدير الطلبات المعلقة (للنسخ الاحتياطي)
 */
export const exportHeldOrders = (): string => {
  const orders = getHeldOrders();
  return JSON.stringify(orders, null, 2);
};

/**
 * استيراد الطلبات المعلقة (من النسخ الاحتياطي)
 */
export const importHeldOrders = (data: string): boolean => {
  try {
    const orders = JSON.parse(data) as HeldOrder[];
    
    // التحقق من صحة البيانات
    if (!Array.isArray(orders)) return false;
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    return true;
  } catch (error) {
    console.error('Error importing held orders:', error);
    return false;
  }
};

