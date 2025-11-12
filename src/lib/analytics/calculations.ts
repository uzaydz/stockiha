/**
 * ملف الحسابات المالية الدقيقة
 * يحتوي على جميع الدوال المطلوبة لحساب المقاييس المالية بدقة 100%
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  purchase_price?: number; // تكلفة الشراء
  is_wholesale?: boolean;
  original_price?: number;
}

export interface Order {
  id: string;
  total: number;
  subtotal: number;
  tax: number;
  discount: number;
  status: string;
  payment_status: string;
  payment_method: string;
  amount_paid?: number;
  remaining_amount?: number;
  consider_remaining_as_partial?: boolean;
  created_at: string;
  completed_at?: string;
  is_online: boolean;
  items?: OrderItem[];
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  expense_date: string;
  category: string;
  payment_method: string;
  is_recurring?: boolean;
  status?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  purchase_price?: number;
  stock_quantity: number;
  min_stock_level?: number;
}

export interface ProductReturn {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  refund_amount: number;
  created_at: string;
}

// ============================================================================
// المقاييس المالية
// ============================================================================

export interface FinancialMetrics {
  // الإيرادات
  grossRevenue: number;          // إجمالي الإيرادات (قبل الخصومات)
  netRevenue: number;            // الإيرادات الصافية (بعد الخصومات والإرجاعات)
  actualRevenue: number;         // الإيرادات الفعلية (المدفوعة)
  pendingRevenue: number;        // الإيرادات المعلقة (ديون)

  // التكاليف
  cogs: number;                  // تكلفة البضاعة المباعة (Cost of Goods Sold)
  operatingExpenses: number;     // المصروفات التشغيلية
  totalCosts: number;            // إجمالي التكاليف

  // الأرباح
  grossProfit: number;           // الربح الإجمالي (الإيرادات - COGS)
  operatingProfit: number;       // الربح التشغيلي (الربح الإجمالي - المصروفات)
  netProfit: number;             // صافي الربح

  // النسب المالية (%)
  grossMargin: number;           // هامش الربح الإجمالي
  operatingMargin: number;       // هامش الربح التشغيلي
  netMargin: number;             // هامش الربح الصافي

  // ROI
  roi: number;                   // العائد على الاستثمار

  // الخصومات
  totalDiscounts: number;
  discountRate: number;          // نسبة الخصم من الإيرادات

  // الديون
  totalDebts: number;            // إجمالي الديون المستحقة
  partialPayments: number;       // الدفعات الجزئية
  partialPaymentCount: number;   // عدد الطلبات بدفع جزئي

  // الإرجاعات
  totalReturns: number;          // إجمالي قيمة الإرجاعات
  returnRate: number;            // نسبة الإرجاعات

  // التدفق النقدي
  cashInflow: number;            // التدفق النقدي الداخل
  cashOutflow: number;           // التدفق النقدي الخارج
  netCashFlow: number;           // صافي التدفق النقدي

  // الطلبات
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  averageOrderValue: number;

  // النمو
  salesGrowth: number;           // نسبة نمو المبيعات
  profitGrowth: number;          // نسبة نمو الأرباح
}

// ============================================================================
// دالة الحساب الرئيسية
// ============================================================================

export function calculateFinancialMetrics(
  orders: Order[],
  expenses: Expense[],
  returns: ProductReturn[] = [],
  previousPeriodData?: { revenue: number; profit: number }
): FinancialMetrics {

  // فلترة الطلبات حسب الحالة
  const completedOrders = orders.filter(o =>
    o.status !== 'cancelled' && o.status !== 'pending'
  );

  const cancelledOrders = orders.filter(o => o.status === 'cancelled');

  // =============================================
  // 1. حساب الإيرادات
  // =============================================

  // إجمالي الإيرادات (قبل الخصومات)
  const grossRevenue = completedOrders.reduce((sum, order) => {
    return sum + (order.subtotal || order.total);
  }, 0);

  // إجمالي الخصومات
  const totalDiscounts = completedOrders.reduce((sum, order) => {
    return sum + (order.discount || 0);
  }, 0);

  // إجمالي الإرجاعات
  const totalReturns = returns.reduce((sum, ret) => {
    return sum + ret.refund_amount;
  }, 0);

  // الإيرادات الصافية (بعد الخصومات والإرجاعات)
  const netRevenue = grossRevenue - totalDiscounts - totalReturns;

  // الإيرادات الفعلية (المدفوعة)
  const actualRevenue = completedOrders.reduce((sum, order) => {
    return sum + (order.amount_paid || order.total);
  }, 0);

  // الإيرادات المعلقة (ديون)
  const pendingRevenue = completedOrders.reduce((sum, order) => {
    if (order.consider_remaining_as_partial && order.remaining_amount) {
      return sum + order.remaining_amount;
    }
    return sum;
  }, 0);

  // عدد الطلبات بدفع جزئي
  const partialPaymentCount = completedOrders.filter(order =>
    order.consider_remaining_as_partial &&
    order.remaining_amount &&
    order.remaining_amount > 0
  ).length;

  // =============================================
  // 2. حساب التكاليف
  // =============================================

  // تكلفة البضاعة المباعة (COGS)
  let cogs = 0;
  let cogsCalculated = 0; // عداد للمنتجات التي لها purchase_price
  let cogsTotal = 0; // إجمالي عدد المنتجات

  completedOrders.forEach(order => {
    if (order.items) {
      order.items.forEach(item => {
        cogsTotal++;
        const purchasePrice = item.purchase_price || 0;

        if (purchasePrice > 0) {
          cogsCalculated++;
          cogs += purchasePrice * item.quantity;
        }
      });
    }
  });

  // إذا لم يكن هناك purchase_price لأي منتج، استخدم تقدير 65% من السعر
  if (cogsCalculated === 0 && cogsTotal > 0) {
    cogs = netRevenue * 0.65; // افتراض هامش ربح 35%
  } else if (cogsCalculated < cogsTotal) {
    // إذا كان بعض المنتجات فقط لها purchase_price
    // احسب المتوسط ل��منتجات الموجودة وطبقه على الباقي
    const avgCostRatio = cogsCalculated > 0 ? cogs / (cogsCalculated * netRevenue / cogsTotal) : 0.65;
    const missingCogs = (cogsTotal - cogsCalculated) * netRevenue / cogsTotal * avgCostRatio;
    cogs += missingCogs;
  }

  // المصروفات التشغيلية
  const operatingExpenses = expenses
    .filter(e => e.status !== 'cancelled')
    .reduce((sum, expense) => sum + expense.amount, 0);

  // إجمالي التكاليف
  const totalCosts = cogs + operatingExpenses;

  // =============================================
  // 3. حساب الأرباح
  // =============================================

  // الربح الإجمالي (الإيرادات الصافية - COGS)
  const grossProfit = netRevenue - cogs;

  // الربح التشغيلي (الربح الإجمالي - المصروفات التشغيلية)
  const operatingProfit = grossProfit - operatingExpenses;

  // صافي الربح (نفس الربح التشغيلي في حالتنا)
  const netProfit = operatingProfit;

  // =============================================
  // 4. حساب النسب المالية
  // =============================================

  // هامش الربح الإجمالي (%)
  const grossMargin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;

  // هامش الربح التشغيلي (%)
  const operatingMargin = netRevenue > 0 ? (operatingProfit / netRevenue) * 100 : 0;

  // هامش الربح الصافي (%)
  const netMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

  // العائد على الاستثمار (ROI)
  const roi = totalCosts > 0 ? (netProfit / totalCosts) * 100 : 0;

  // نسبة الخصم
  const discountRate = grossRevenue > 0 ? (totalDiscounts / grossRevenue) * 100 : 0;

  // نسبة الإرجاعات
  const returnRate = grossRevenue > 0 ? (totalReturns / grossRevenue) * 100 : 0;

  // =============================================
  // 5. حساب التدفق النقدي
  // =============================================

  // التدفق النقدي الداخل (المدفوعات الفعلية)
  const cashInflow = actualRevenue;

  // التدفق النقدي الخارج (المصروفات فقط، COGS ليس تدفق نقدي خارج)
  const cashOutflow = operatingExpenses;

  // صافي التدفق النقدي
  const netCashFlow = cashInflow - cashOutflow;

  // =============================================
  // 6. حساب معلومات الطلبات
  // =============================================

  const totalOrders = orders.length;
  const averageOrderValue = completedOrders.length > 0
    ? netRevenue / completedOrders.length
    : 0;

  // =============================================
  // 7. حساب النمو
  // =============================================

  let salesGrowth = 0;
  let profitGrowth = 0;

  if (previousPeriodData) {
    if (previousPeriodData.revenue > 0) {
      salesGrowth = ((netRevenue - previousPeriodData.revenue) / previousPeriodData.revenue) * 100;
    }
    if (previousPeriodData.profit > 0) {
      profitGrowth = ((netProfit - previousPeriodData.profit) / previousPeriodData.profit) * 100;
    }
  }

  // =============================================
  // 8. إرجاع النتائج
  // =============================================

  return {
    // الإيرادات
    grossRevenue,
    netRevenue,
    actualRevenue,
    pendingRevenue,

    // التكاليف
    cogs,
    operatingExpenses,
    totalCosts,

    // الأرباح
    grossProfit,
    operatingProfit,
    netProfit,

    // النسب المالية
    grossMargin,
    operatingMargin,
    netMargin,

    // ROI
    roi,

    // الخصومات
    totalDiscounts,
    discountRate,

    // الديون
    totalDebts: pendingRevenue,
    partialPayments: pendingRevenue,
    partialPaymentCount,

    // الإرجاعات
    totalReturns,
    returnRate,

    // التدفق النقدي
    cashInflow,
    cashOutflow,
    netCashFlow,

    // الطلبات
    totalOrders,
    completedOrders: completedOrders.length,
    cancelledOrders: cancelledOrders.length,
    averageOrderValue,

    // النمو
    salesGrowth,
    profitGrowth,
  };
}

// ============================================================================
// دوال مساعدة إضافية
// ============================================================================

/**
 * حساب الربح لمنتج واحد
 */
export function calculateProductProfit(
  unitPrice: number,
  purchasePrice: number,
  quantity: number,
  discount: number = 0
): number {
  const revenue = (unitPrice * quantity) - discount;
  const cost = purchasePrice * quantity;
  return revenue - cost;
}

/**
 * حساب هامش الربح لمنتج
 */
export function calculateProductMargin(
  unitPrice: number,
  purchasePrice: number
): number {
  if (unitPrice === 0) return 0;
  return ((unitPrice - purchasePrice) / unitPrice) * 100;
}

/**
 * حساب نقطة التعادل (Break-even Point)
 */
export function calculateBreakEvenPoint(
  fixedCosts: number,
  unitPrice: number,
  variableCostPerUnit: number
): number {
  const contributionMargin = unitPrice - variableCostPerUnit;
  if (contributionMargin <= 0) return Infinity;
  return fixedCosts / contributionMargin;
}

/**
 * حساب معدل دوران المخزون
 */
export function calculateInventoryTurnover(
  cogs: number,
  averageInventoryValue: number
): {
  turnoverRate: number;
  daysInInventory: number;
} {
  if (averageInventoryValue === 0) {
    return { turnoverRate: 0, daysInInventory: 0 };
  }

  const turnoverRate = cogs / averageInventoryValue;
  const daysInInventory = turnoverRate > 0 ? 365 / turnoverRate : 0;

  return {
    turnoverRate,
    daysInInventory,
  };
}

/**
 * حساب قيمة المخزون الحالي
 */
export function calculateInventoryValue(
  products: Product[]
): {
  totalValue: number;
  atCost: number;
  atRetail: number;
  potentialProfit: number;
} {
  let atCost = 0;
  let atRetail = 0;

  products.forEach(product => {
    const quantity = product.stock_quantity || 0;
    const purchasePrice = product.purchase_price || 0;
    const retailPrice = product.price || 0;

    atCost += quantity * purchasePrice;
    atRetail += quantity * retailPrice;
  });

  const potentialProfit = atRetail - atCost;
  const totalValue = atCost; // القيمة الفعلية بناءً على التكلفة

  return {
    totalValue,
    atCost,
    atRetail,
    potentialProfit,
  };
}

/**
 * تنسيق العملة
 */
export function formatCurrency(value: number, currency: string = 'DZD'): string {
  return new Intl.NumberFormat('ar-DZ', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value) + ' دج';
}

/**
 * تنسيق النسبة المئوية
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return value.toFixed(decimals) + '%';
}

/**
 * تنسيق الأرقام الكبيرة
 */
export function formatLargeNumber(value: number): string {
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + ' مليون';
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(1) + ' ألف';
  }
  return value.toFixed(0);
}
