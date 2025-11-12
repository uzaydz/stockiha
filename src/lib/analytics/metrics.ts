/**
 * نظام Metrics متقدم للتحليلات
 * يحسب جميع المقاييس المالية والتشغيلية بدقة
 * مع دعم RLS - كل مسؤول يرى بياناته فقط
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface Order {
  id: string;
  organization_id: string;
  customer_id?: string;
  employee_id?: string;
  created_by_staff_id?: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  amount_paid?: number;
  remaining_amount?: number;
  consider_remaining_as_partial?: boolean;
  payment_status: 'paid' | 'pending' | 'partial' | 'cancelled';
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'other';
  status: 'completed' | 'pending' | 'cancelled';
  is_online: boolean;
  created_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  purchase_price?: number; // سعر الشراء للحساب الدقيق للربح
  total_price: number;
  discount?: number;
}

export interface Product {
  id: string;
  organization_id: string;
  name: string;
  sku?: string;
  barcode?: string;
  price: number;
  purchase_price?: number;
  stock_quantity: number;
  min_stock_level?: number;
  is_active: boolean;
  category_id?: string;
}

export interface Expense {
  id: string;
  organization_id: string;
  title: string;
  amount: number;
  category: string;
  expense_date: string;
  payment_method: string;
  created_at: string;
}

export interface Customer {
  id: string;
  organization_id: string;
  name: string;
  email?: string;
  phone?: string;
  created_at: string;
}

export interface FinancialMetrics {
  // إيرادات
  grossRevenue: number;           // الإيرادات الإجمالية
  netRevenue: number;             // الإيرادات الصافية (بعد الخصومات)
  actualRevenue: number;          // الإيرادات الفعلية (المدفوعة)
  pendingRevenue: number;         // الإيرادات المعلقة (ديون)

  // تكاليف
  cogs: number;                   // تكلفة البضاعة المباعة
  operatingExpenses: number;      // المصروفات التشغيلية
  totalCosts: number;             // إجمالي التكاليف

  // أرباح
  grossProfit: number;            // الربح الإجمالي
  operatingProfit: number;        // الربح التشغيلي
  netProfit: number;              // صافي الربح

  // هوامش الربح (%)
  grossMargin: number;            // هامش الربح الإجمالي
  operatingMargin: number;        // هامش الربح التشغيلي
  netMargin: number;              // هامش الربح الصافي

  // مقاييس أخرى
  roi: number;                    // العائد على الاستثمار
  totalOrders: number;
  averageOrderValue: number;
  totalDiscounts: number;
  discountRate: number;           // نسبة الخصم من الإيرادات

  // تدفق نقدي
  cashFlow: number;               // التدفق النقدي (الإيرادات الفعلية - التكاليف)

  // ديون
  totalDebts: number;             // إجمالي الديون
  debtCount: number;              // عدد الطلبات المدينة

  // نمو
  revenueGrowth?: number;         // نمو الإيرادات %
  profitGrowth?: number;          // نمو الأرباح %
}

export interface ProductMetrics {
  productId: string;
  productName: string;
  quantitySold: number;
  revenue: number;
  cost: number;
  profit: number;
  profitMargin: number;
  averagePrice: number;
  orderCount: number;
}

export interface CategoryMetrics {
  categoryId: string;
  categoryName: string;
  revenue: number;
  profit: number;
  productCount: number;
  orderCount: number;
}

export interface CustomerMetrics {
  customerId: string;
  customerName: string;
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  lastOrderDate: string;
  lifetimeValue: number;
}

export interface EmployeeMetrics {
  employeeId: string;
  employeeName: string;
  totalOrders: number;
  totalSales: number;
  averageOrderValue: number;
  performance: number; // نسبة الأداء
}

export interface TimeSeriesData {
  date: string;
  revenue: number;
  profit: number;
  orders: number;
  customers: number;
}

export interface ChannelMetrics {
  channel: 'pos' | 'online';
  revenue: number;
  orders: number;
  averageOrderValue: number;
  percentage: number;
}

export interface PaymentMethodMetrics {
  method: string;
  count: number;
  amount: number;
  percentage: number;
}

// ============================================================================
// دالة الحساب الرئيسية للـ Metrics المالية
// ============================================================================

/**
 * حساب جميع المقاييس المالية بدقة
 * مع دعم RLS - فقط الطلبات الخاصة بالمؤسسة
 */
export function calculateFinancialMetrics(
  orders: Order[],
  expenses: Expense[],
  previousPeriodData?: { revenue: number; profit: number }
): FinancialMetrics {

  // تصفية الطلبات المكتملة فقط
  const completedOrders = orders.filter(o => o.status === 'completed');

  // حساب الإيرادات
  const grossRevenue = completedOrders.reduce((sum, order) => sum + order.total, 0);
  const totalDiscounts = completedOrders.reduce((sum, order) => sum + (order.discount || 0), 0);
  const netRevenue = grossRevenue; // الإيرادات بعد الخصومات مضمّنة في total

  // حساب الإيرادات الفعلية والمعلقة
  let actualRevenue = 0;
  let pendingRevenue = 0;
  let debtCount = 0;

  completedOrders.forEach(order => {
    if (order.payment_status === 'paid') {
      actualRevenue += order.total;
    } else if (order.payment_status === 'partial') {
      actualRevenue += (order.amount_paid || 0);
      pendingRevenue += (order.remaining_amount || 0);
      if (order.consider_remaining_as_partial) {
        debtCount++;
      }
    } else if (order.payment_status === 'pending') {
      pendingRevenue += order.total;
      debtCount++;
    }
  });

  // حساب تكلفة البضاعة المباعة (COGS) من purchase_price
  let cogs = 0;
  let cogsCalculated = 0;
  let cogsEstimated = 0;

  completedOrders.forEach(order => {
    if (order.items && order.items.length > 0) {
      order.items.forEach(item => {
        const purchasePrice = item.purchase_price || 0;
        if (purchasePrice > 0) {
          cogs += purchasePrice * item.quantity;
          cogsCalculated += purchasePrice * item.quantity;
        } else {
          // تقدير بناءً على 65% من سعر البيع إذا لم يتوفر سعر الشراء
          const estimatedCost = item.unit_price * 0.65 * item.quantity;
          cogs += estimatedCost;
          cogsEstimated += estimatedCost;
        }
      });
    }
  });

  // حساب المصروفات التشغيلية
  const operatingExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  // إجمالي التكاليف
  const totalCosts = cogs + operatingExpenses;

  // حساب الأرباح
  const grossProfit = netRevenue - cogs;
  const operatingProfit = grossProfit - operatingExpenses;
  const netProfit = operatingProfit;

  // حساب هوامش الربح
  const grossMargin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;
  const operatingMargin = netRevenue > 0 ? (operatingProfit / netRevenue) * 100 : 0;
  const netMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

  // حساب ROI
  const roi = totalCosts > 0 ? (netProfit / totalCosts) * 100 : 0;

  // مقاييس الطلبات
  const totalOrders = completedOrders.length;
  const averageOrderValue = totalOrders > 0 ? grossRevenue / totalOrders : 0;
  const discountRate = grossRevenue > 0 ? (totalDiscounts / (grossRevenue + totalDiscounts)) * 100 : 0;

  // التدفق النقدي
  const cashFlow = actualRevenue - totalCosts;

  // حساب النمو
  let revenueGrowth: number | undefined;
  let profitGrowth: number | undefined;

  if (previousPeriodData) {
    revenueGrowth = previousPeriodData.revenue > 0
      ? ((netRevenue - previousPeriodData.revenue) / previousPeriodData.revenue) * 100
      : 0;
    profitGrowth = previousPeriodData.profit > 0
      ? ((netProfit - previousPeriodData.profit) / previousPeriodData.profit) * 100
      : 0;
  }

  return {
    grossRevenue,
    netRevenue,
    actualRevenue,
    pendingRevenue,
    cogs,
    operatingExpenses,
    totalCosts,
    grossProfit,
    operatingProfit,
    netProfit,
    grossMargin,
    operatingMargin,
    netMargin,
    roi,
    totalOrders,
    averageOrderValue,
    totalDiscounts,
    discountRate,
    cashFlow,
    totalDebts: pendingRevenue,
    debtCount,
    revenueGrowth,
    profitGrowth
  };
}

// ============================================================================
// دوال حساب مقاييس المنتجات
// ============================================================================

/**
 * حساب أداء المنتجات
 */
export function calculateProductMetrics(orders: Order[]): ProductMetrics[] {
  const productMap = new Map<string, {
    name: string;
    quantity: number;
    revenue: number;
    cost: number;
    orderCount: number;
    totalPrice: number;
  }>();

  const completedOrders = orders.filter(o => o.status === 'completed');

  completedOrders.forEach(order => {
    if (order.items && order.items.length > 0) {
      order.items.forEach(item => {
        const existing = productMap.get(item.product_id);
        const cost = (item.purchase_price || item.unit_price * 0.65) * item.quantity;

        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += item.total_price;
          existing.cost += cost;
          existing.orderCount += 1;
          existing.totalPrice += item.total_price;
        } else {
          productMap.set(item.product_id, {
            name: item.product_name,
            quantity: item.quantity,
            revenue: item.total_price,
            cost: cost,
            orderCount: 1,
            totalPrice: item.total_price
          });
        }
      });
    }
  });

  return Array.from(productMap.entries()).map(([productId, data]) => ({
    productId,
    productName: data.name,
    quantitySold: data.quantity,
    revenue: data.revenue,
    cost: data.cost,
    profit: data.revenue - data.cost,
    profitMargin: data.revenue > 0 ? ((data.revenue - data.cost) / data.revenue) * 100 : 0,
    averagePrice: data.quantity > 0 ? data.totalPrice / data.quantity : 0,
    orderCount: data.orderCount
  })).sort((a, b) => b.revenue - a.revenue);
}

/**
 * حساب أداء الفئات
 */
export function calculateCategoryMetrics(
  orders: Order[],
  products: Product[]
): CategoryMetrics[] {
  const productCategoryMap = new Map<string, string>();
  products.forEach(p => {
    if (p.category_id) {
      productCategoryMap.set(p.id, p.category_id);
    }
  });

  const categoryMap = new Map<string, {
    revenue: number;
    cost: number;
    productSet: Set<string>;
    orderCount: number;
  }>();

  const completedOrders = orders.filter(o => o.status === 'completed');

  completedOrders.forEach(order => {
    if (order.items && order.items.length > 0) {
      order.items.forEach(item => {
        const categoryId = productCategoryMap.get(item.product_id) || 'uncategorized';
        const cost = (item.purchase_price || item.unit_price * 0.65) * item.quantity;

        const existing = categoryMap.get(categoryId);
        if (existing) {
          existing.revenue += item.total_price;
          existing.cost += cost;
          existing.productSet.add(item.product_id);
          existing.orderCount += 1;
        } else {
          categoryMap.set(categoryId, {
            revenue: item.total_price,
            cost: cost,
            productSet: new Set([item.product_id]),
            orderCount: 1
          });
        }
      });
    }
  });

  return Array.from(categoryMap.entries()).map(([categoryId, data]) => ({
    categoryId,
    categoryName: categoryId === 'uncategorized' ? 'غير مصنف' : categoryId,
    revenue: data.revenue,
    profit: data.revenue - data.cost,
    productCount: data.productSet.size,
    orderCount: data.orderCount
  })).sort((a, b) => b.revenue - a.revenue);
}

// ============================================================================
// دوال حساب مقاييس العملاء
// ============================================================================

/**
 * حساب أداء العملاء
 */
export function calculateCustomerMetrics(orders: Order[]): CustomerMetrics[] {
  const customerMap = new Map<string, {
    name: string;
    orders: number;
    spent: number;
    lastOrder: string;
  }>();

  const completedOrders = orders.filter(o => o.status === 'completed');

  completedOrders.forEach(order => {
    const customerId = order.customer_id || 'walk-in';
    const existing = customerMap.get(customerId);

    if (existing) {
      existing.orders += 1;
      existing.spent += order.total;
      if (new Date(order.created_at) > new Date(existing.lastOrder)) {
        existing.lastOrder = order.created_at;
      }
    } else {
      customerMap.set(customerId, {
        name: customerId === 'walk-in' ? 'زبون عابر' : customerId,
        orders: 1,
        spent: order.total,
        lastOrder: order.created_at
      });
    }
  });

  return Array.from(customerMap.entries()).map(([customerId, data]) => ({
    customerId,
    customerName: data.name,
    totalOrders: data.orders,
    totalSpent: data.spent,
    averageOrderValue: data.spent / data.orders,
    lastOrderDate: data.lastOrder,
    lifetimeValue: data.spent
  })).sort((a, b) => b.totalSpent - a.totalSpent);
}

// ============================================================================
// دوال حساب مقاييس الموظفين
// ============================================================================

/**
 * حساب أداء الموظفين
 * مع دعم RLS - فقط موظفي المؤسسة
 */
export function calculateEmployeeMetrics(orders: Order[]): EmployeeMetrics[] {
  const employeeMap = new Map<string, {
    name: string;
    orders: number;
    sales: number;
  }>();

  const completedOrders = orders.filter(o => o.status === 'completed');

  completedOrders.forEach(order => {
    const employeeId = order.employee_id || order.created_by_staff_id || 'unknown';
    const employeeName = (order as any).created_by_staff_name || 'موظف';

    const existing = employeeMap.get(employeeId);
    if (existing) {
      existing.orders += 1;
      existing.sales += order.total;
    } else {
      employeeMap.set(employeeId, {
        name: employeeName,
        orders: 1,
        sales: order.total
      });
    }
  });

  const totalSales = completedOrders.reduce((sum, o) => sum + o.total, 0);

  return Array.from(employeeMap.entries()).map(([employeeId, data]) => ({
    employeeId,
    employeeName: data.name,
    totalOrders: data.orders,
    totalSales: data.sales,
    averageOrderValue: data.sales / data.orders,
    performance: totalSales > 0 ? (data.sales / totalSales) * 100 : 0
  })).sort((a, b) => b.totalSales - a.totalSales);
}

// ============================================================================
// دوال حساب Time Series
// ============================================================================

/**
 * حساب البيانات عبر الزمن
 */
export function calculateTimeSeriesData(
  orders: Order[],
  period: 'day' | 'week' | 'month' | 'quarter' | 'year'
): TimeSeriesData[] {
  const timeMap = new Map<string, {
    revenue: number;
    profit: number;
    orders: number;
    customerSet: Set<string>;
  }>();

  const completedOrders = orders.filter(o => o.status === 'completed');

  completedOrders.forEach(order => {
    const date = new Date(order.created_at);
    let key: string;

    switch (period) {
      case 'day':
        key = date.toISOString().split('T')[0];
        break;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'quarter':
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        key = `${date.getFullYear()}-Q${quarter}`;
        break;
      case 'year':
        key = String(date.getFullYear());
        break;
    }

    // حساب الربح لهذا الطلب
    let orderProfit = order.total;
    if (order.items && order.items.length > 0) {
      const orderCost = order.items.reduce((sum, item) => {
        const cost = item.purchase_price || item.unit_price * 0.65;
        return sum + (cost * item.quantity);
      }, 0);
      orderProfit = order.total - orderCost;
    } else {
      // تقدير 35% ربح إذا لم تتوفر البيانات
      orderProfit = order.total * 0.35;
    }

    const existing = timeMap.get(key);
    if (existing) {
      existing.revenue += order.total;
      existing.profit += orderProfit;
      existing.orders += 1;
      if (order.customer_id) {
        existing.customerSet.add(order.customer_id);
      }
    } else {
      const customerSet = new Set<string>();
      if (order.customer_id) {
        customerSet.add(order.customer_id);
      }
      timeMap.set(key, {
        revenue: order.total,
        profit: orderProfit,
        orders: 1,
        customerSet
      });
    }
  });

  return Array.from(timeMap.entries())
    .map(([date, data]) => ({
      date,
      revenue: data.revenue,
      profit: data.profit,
      orders: data.orders,
      customers: data.customerSet.size
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ============================================================================
// دوال حساب القنوات
// ============================================================================

/**
 * حساب أداء القنوات (POS vs Online)
 */
export function calculateChannelMetrics(orders: Order[]): ChannelMetrics[] {
  const completedOrders = orders.filter(o => o.status === 'completed');
  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);

  const posOrders = completedOrders.filter(o => !o.is_online);
  const onlineOrders = completedOrders.filter(o => o.is_online);

  const posRevenue = posOrders.reduce((sum, o) => sum + o.total, 0);
  const onlineRevenue = onlineOrders.reduce((sum, o) => sum + o.total, 0);

  return [
    {
      channel: 'pos',
      revenue: posRevenue,
      orders: posOrders.length,
      averageOrderValue: posOrders.length > 0 ? posRevenue / posOrders.length : 0,
      percentage: totalRevenue > 0 ? (posRevenue / totalRevenue) * 100 : 0
    },
    {
      channel: 'online',
      revenue: onlineRevenue,
      orders: onlineOrders.length,
      averageOrderValue: onlineOrders.length > 0 ? onlineRevenue / onlineOrders.length : 0,
      percentage: totalRevenue > 0 ? (onlineRevenue / totalRevenue) * 100 : 0
    }
  ];
}

// ============================================================================
// دوال حساب طرق الدفع
// ============================================================================

/**
 * حساب أداء طرق الدفع
 */
export function calculatePaymentMethodMetrics(orders: Order[]): PaymentMethodMetrics[] {
  const methodMap = new Map<string, { count: number; amount: number }>();
  const completedOrders = orders.filter(o => o.status === 'completed');
  const totalAmount = completedOrders.reduce((sum, o) => sum + o.total, 0);

  completedOrders.forEach(order => {
    const method = order.payment_method || 'other';
    const existing = methodMap.get(method);

    if (existing) {
      existing.count += 1;
      existing.amount += order.total;
    } else {
      methodMap.set(method, {
        count: 1,
        amount: order.total
      });
    }
  });

  return Array.from(methodMap.entries()).map(([method, data]) => ({
    method: translatePaymentMethod(method),
    count: data.count,
    amount: data.amount,
    percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0
  })).sort((a, b) => b.amount - a.amount);
}

// ============================================================================
// دوال مساعدة
// ============================================================================

function translatePaymentMethod(method: string): string {
  const translations: Record<string, string> = {
    'cash': 'نقداً',
    'card': 'بطاقة',
    'bank_transfer': 'تحويل بنكي',
    'other': 'أخرى'
  };
  return translations[method] || method;
}

/**
 * تصفية البيانات حسب المؤسسة (RLS)
 */
export function filterByOrganization<T extends { organization_id: string }>(
  items: T[],
  organizationId: string
): T[] {
  return items.filter(item => item.organization_id === organizationId);
}

/**
 * تصفية البيانات حسب نطاق زمني
 */
export function filterByDateRange<T extends { created_at: string }>(
  items: T[],
  startDate?: Date,
  endDate?: Date
): T[] {
  if (!startDate && !endDate) return items;

  return items.filter(item => {
    const itemDate = new Date(item.created_at);
    if (startDate && itemDate < startDate) return false;
    if (endDate && itemDate > endDate) return false;
    return true;
  });
}
