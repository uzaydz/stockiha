/**
 * محرك الخصم التلقائي
 * يطبق قواعد الخصم المختلفة بناءً على شروط محددة
 */

export type DiscountRuleType = 
  | 'quantity' // خصم حسب الكمية
  | 'category' // خصم حسب الفئة
  | 'customer' // خصم حسب العميل
  | 'time' // خصم حسب الوقت (Happy Hour)
  | 'bundle' // خصم مشترك (Buy X Get Y)
  | 'total' // خصم حسب إجمالي الطلب
  | 'product'; // خصم على منتج معين

export type DiscountType = 'percentage' | 'fixed' | 'free_item';

export interface DiscountRule {
  id: string;
  name: string;
  type: DiscountRuleType;
  discountType: DiscountType;
  value: number; // النسبة المئوية أو المبلغ الثابت
  conditions: {
    // شروط الكمية
    minQuantity?: number;
    maxQuantity?: number;

    // شروط الفئة
    categoryIds?: string[];

    // شروط العميل
    customerIds?: string[];
    customerLoyaltyTier?: string; // Bronze, Silver, Gold, Platinum

    // شروط الوقت
    startTime?: string; // HH:MM
    endTime?: string; // HH:MM
    daysOfWeek?: number[]; // 0=Sunday, 1=Monday, etc.
    startDate?: string; // YYYY-MM-DD
    endDate?: string; // YYYY-MM-DD

    // شروط Bundle
    buyProductIds?: string[];
    buyQuantity?: number;
    getProductIds?: string[];
    getQuantity?: number;

    // شروط الإجمالي
    minTotal?: number;
    maxTotal?: number;

    // شروط المنتج
    productIds?: string[];
  };
  priority: number; // أولوية التطبيق (الأعلى أولاً)
  enabled: boolean;
  stackable: boolean; // هل يمكن تطبيقه مع خصومات أخرى
  maxUsagePerCustomer?: number; // الحد الأقصى للاستخدام لكل عميل
  maxUsageTotal?: number; // الحد الأقصى للاستخدام الكلي
  usageCount?: number; // عدد مرات الاستخدام الحالي
}

export interface CartItem {
  productId: string;
  product: any;
  quantity: number;
  price: number;
  categoryId?: string;
}

export interface DiscountResult {
  rule: DiscountRule;
  amount: number;
  freeItems?: Array<{ productId: string; quantity: number }>;
  appliedTo: 'cart' | 'item';
  itemIndex?: number;
}

/**
 * حساب الخصم بناءً على القواعد
 */
export const calculateDiscount = (
  items: CartItem[],
  rules: DiscountRule[],
  customerId?: string,
  customerLoyaltyTier?: string
): DiscountResult[] => {
  const appliedDiscounts: DiscountResult[] = [];
  const now = new Date();

  // ترتيب القواعد حسب الأولوية
  const sortedRules = [...rules]
    .filter(r => r.enabled)
    .sort((a, b) => b.priority - a.priority);

  for (const rule of sortedRules) {
    // التحقق من إمكانية التطبيق
    if (!canApplyRule(rule, items, customerId, customerLoyaltyTier, now)) {
      continue;
    }

    // حساب الخصم بناءً على نوع القاعدة
    const discount = applyRule(rule, items, appliedDiscounts);
    
    if (discount) {
      appliedDiscounts.push(discount);
      
      // إذا كانت القاعدة غير قابلة للتراكم، توقف هنا
      if (!rule.stackable) {
        break;
      }
    }
  }

  return appliedDiscounts;
};

/**
 * التحقق من إمكانية تطبيق القاعدة
 */
const canApplyRule = (
  rule: DiscountRule,
  items: CartItem[],
  customerId?: string,
  customerLoyaltyTier?: string,
  now: Date = new Date()
): boolean => {
  const conditions = rule.conditions;

  // التحقق من شروط العميل
  if (conditions.customerIds && customerId) {
    if (!conditions.customerIds.includes(customerId)) {
      return false;
    }
  }

  if (conditions.customerLoyaltyTier && customerLoyaltyTier) {
    if (conditions.customerLoyaltyTier !== customerLoyaltyTier) {
      return false;
    }
  }

  // التحقق من شروط الوقت
  if (conditions.startTime && conditions.endTime) {
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    if (currentTime < conditions.startTime || currentTime > conditions.endTime) {
      return false;
    }
  }

  if (conditions.daysOfWeek) {
    if (!conditions.daysOfWeek.includes(now.getDay())) {
      return false;
    }
  }

  if (conditions.startDate) {
    const startDate = new Date(conditions.startDate);
    if (now < startDate) {
      return false;
    }
  }

  if (conditions.endDate) {
    const endDate = new Date(conditions.endDate);
    if (now > endDate) {
      return false;
    }
  }

  // التحقق من شروط الإجمالي
  if (conditions.minTotal || conditions.maxTotal) {
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (conditions.minTotal && total < conditions.minTotal) {
      return false;
    }
    if (conditions.maxTotal && total > conditions.maxTotal) {
      return false;
    }
  }

  // التحقق من عدد مرات الاستخدام
  if (rule.maxUsageTotal && rule.usageCount) {
    if (rule.usageCount >= rule.maxUsageTotal) {
      return false;
    }
  }

  return true;
};

/**
 * تطبيق القاعدة
 */
const applyRule = (
  rule: DiscountRule,
  items: CartItem[],
  existingDiscounts: DiscountResult[]
): DiscountResult | null => {
  switch (rule.type) {
    case 'quantity':
      return applyQuantityDiscount(rule, items);
    case 'category':
      return applyCategoryDiscount(rule, items);
    case 'product':
      return applyProductDiscount(rule, items);
    case 'total':
      return applyTotalDiscount(rule, items);
    case 'bundle':
      return applyBundleDiscount(rule, items);
    default:
      return null;
  }
};

/**
 * خصم حسب الكمية
 */
const applyQuantityDiscount = (rule: DiscountRule, items: CartItem[]): DiscountResult | null => {
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  
  if (rule.conditions.minQuantity && totalQuantity < rule.conditions.minQuantity) {
    return null;
  }

  if (rule.conditions.maxQuantity && totalQuantity > rule.conditions.maxQuantity) {
    return null;
  }

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const amount = rule.discountType === 'percentage'
    ? (total * rule.value) / 100
    : rule.value;

  return {
    rule,
    amount,
    appliedTo: 'cart',
  };
};

/**
 * خصم حسب الفئة
 */
const applyCategoryDiscount = (rule: DiscountRule, items: CartItem[]): DiscountResult | null => {
  if (!rule.conditions.categoryIds) return null;

  const matchingItems = items.filter(item =>
    item.categoryId && rule.conditions.categoryIds!.includes(item.categoryId)
  );

  if (matchingItems.length === 0) return null;

  const total = matchingItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const amount = rule.discountType === 'percentage'
    ? (total * rule.value) / 100
    : rule.value;

  return {
    rule,
    amount,
    appliedTo: 'cart',
  };
};

/**
 * خصم على منتج معين
 */
const applyProductDiscount = (rule: DiscountRule, items: CartItem[]): DiscountResult | null => {
  if (!rule.conditions.productIds) return null;

  const matchingItems = items.filter(item =>
    rule.conditions.productIds!.includes(item.productId)
  );

  if (matchingItems.length === 0) return null;

  const total = matchingItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const amount = rule.discountType === 'percentage'
    ? (total * rule.value) / 100
    : rule.value;

  return {
    rule,
    amount,
    appliedTo: 'cart',
  };
};

/**
 * خصم حسب الإجمالي
 */
const applyTotalDiscount = (rule: DiscountRule, items: CartItem[]): DiscountResult | null => {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (rule.conditions.minTotal && total < rule.conditions.minTotal) {
    return null;
  }

  const amount = rule.discountType === 'percentage'
    ? (total * rule.value) / 100
    : rule.value;

  return {
    rule,
    amount,
    appliedTo: 'cart',
  };
};

/**
 * خصم مشترك (Buy X Get Y)
 */
const applyBundleDiscount = (rule: DiscountRule, items: CartItem[]): DiscountResult | null => {
  const { buyProductIds, buyQuantity, getProductIds, getQuantity } = rule.conditions;

  if (!buyProductIds || !buyQuantity || !getProductIds || !getQuantity) {
    return null;
  }

  // التحقق من وجود المنتجات المطلوبة للشراء
  const buyItems = items.filter(item => buyProductIds.includes(item.productId));
  const totalBuyQuantity = buyItems.reduce((sum, item) => sum + item.quantity, 0);

  if (totalBuyQuantity < buyQuantity) {
    return null;
  }

  // عدد مرات تطبيق العرض
  const applicableTimes = Math.floor(totalBuyQuantity / buyQuantity);

  if (rule.discountType === 'free_item') {
    return {
      rule,
      amount: 0,
      freeItems: getProductIds.map(productId => ({
        productId,
        quantity: getQuantity * applicableTimes,
      })),
      appliedTo: 'cart',
    };
  }

  // إذا كان خصم على المنتجات المجانية
  const getItems = items.filter(item => getProductIds.includes(item.productId));
  const total = getItems.reduce((sum, item) => sum + item.price * Math.min(item.quantity, getQuantity * applicableTimes), 0);
  
  const amount = rule.discountType === 'percentage'
    ? (total * rule.value) / 100
    : rule.value * applicableTimes;

  return {
    rule,
    amount,
    appliedTo: 'cart',
  };
};

/**
 * حساب إجمالي الخصم
 */
export const calculateTotalDiscount = (discounts: DiscountResult[]): number => {
  return discounts.reduce((sum, discount) => sum + discount.amount, 0);
};

/**
 * تنسيق نص الخصم للعرض
 */
export const formatDiscountText = (discount: DiscountResult): string => {
  const rule = discount.rule;
  
  if (discount.freeItems && discount.freeItems.length > 0) {
    return `${rule.name}: ${discount.freeItems.length} منتج مجاني`;
  }

  if (rule.discountType === 'percentage') {
    return `${rule.name}: ${rule.value}%`;
  }

  return `${rule.name}: ${discount.amount.toLocaleString()} دج`;
};

/**
 * حفظ قاعدة خصم جديدة
 */
export const saveDiscountRule = (rule: Omit<DiscountRule, 'id'>): DiscountRule => {
  const newRule: DiscountRule = {
    ...rule,
    id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };

  const rules = getDiscountRules();
  rules.push(newRule);
  localStorage.setItem('discount_rules', JSON.stringify(rules));

  return newRule;
};

/**
 * جلب قواعد الخصم المحفوظة
 */
export const getDiscountRules = (): DiscountRule[] => {
  try {
    const stored = localStorage.getItem('discount_rules');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

/**
 * تحديث قاعدة خصم
 */
export const updateDiscountRule = (id: string, updates: Partial<DiscountRule>): boolean => {
  const rules = getDiscountRules();
  const index = rules.findIndex(r => r.id === id);
  
  if (index === -1) return false;
  
  rules[index] = { ...rules[index], ...updates };
  localStorage.setItem('discount_rules', JSON.stringify(rules));
  
  return true;
};

/**
 * حذف قاعدة خصم
 */
export const deleteDiscountRule = (id: string): boolean => {
  const rules = getDiscountRules();
  const filtered = rules.filter(r => r.id !== id);
  
  if (filtered.length === rules.length) return false;
  
  localStorage.setItem('discount_rules', JSON.stringify(filtered));
  
  return true;
};

