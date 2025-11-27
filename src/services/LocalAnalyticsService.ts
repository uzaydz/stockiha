import type { LocalPOSOrder, LocalProduct, LocalCustomer, LocalCustomerDebt, LocalProductReturn, LocalLossDeclaration, LocalOrganizationSubscription, LocalWorkSession, LocalStaffPin, LocalPOSOrderItem } from '@/database/localDb';
import { computeAvailableStock } from '@/lib/stock';
import { sqliteDB, isSQLiteAvailable } from '@/lib/db/sqliteAPI';
import { deltaWriteService } from '@/services/DeltaWriteService';

/**
 * خدمة تحليل البيانات المحلية من SQLite عبر Delta Sync
 * تستخرج البيانات والإحصائيات دون الحاجة للاتصال بالإنترنت
 */

// Helper to get organization ID
const getOrgId = (): string => {
  return localStorage.getItem('currentOrganizationId') ||
         localStorage.getItem('bazaar_organization_id') ||
         '';
};
export class LocalAnalyticsService {
  
  /**
   * الحصول على مبيعات يوم معين
   */
  static async getSalesByDate(date: Date): Promise<{
    totalSales: number;
    orderCount: number;
    profit: number;
    orders: LocalPOSOrder[];
  }> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      // ⚡ استخدام Delta Sync للقراءة
      const orgId = getOrgId();
      const startTs = startOfDay.getTime();
      const endTs = endOfDay.getTime();

      // جلب كل الطلبات عبر Delta Sync
      const allOrders = await deltaWriteService.getAll<LocalPOSOrder>('pos_orders', orgId);

      // تصفية حسب التاريخ
      const dayOrders = allOrders.filter(order => {
        // جرب created_at_ts أولاً
        if (order.created_at_ts) {
          return order.created_at_ts >= startTs && order.created_at_ts <= endTs;
        }
        // وإلا جرب تحويل created_at
        if (order.created_at) {
          const orderTs = Date.parse(order.created_at);
          if (!isNaN(orderTs)) {
            return orderTs >= startTs && orderTs <= endTs;
          }
        }
        return false;
      });

      const totalSales = dayOrders.reduce((sum, order) => sum + (order.total || 0), 0);
      // حساب تقريبي للأرباح (30% من المبيعات كمثال)
      const profit = totalSales * 0.3;
      
      return {
        totalSales,
        orderCount: dayOrders.length,
        profit,
        orders: dayOrders
      };
    } catch (error) {
      console.error('Error getting sales by date:', error);
      return { totalSales: 0, orderCount: 0, profit: 0, orders: [] };
    }
  }
  
  /**
   * الحصول على مبيعات اليوم
   */
  static async getTodaySales() {
    return this.getSalesByDate(new Date());
  }
  
  /**
   * الحصول على مبيعات الأمس
   */
  static async getYesterdaySales() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return this.getSalesByDate(yesterday);
  }
  
  /**
   * الحصول على أكثر المنتجات مبيعاً في فترة معينة
   */
  static async getTopSellingProducts(days: number = 7): Promise<Array<{
    productId: string;
    productName: string;
    quantitySold: number;
    totalRevenue: number;
  }>> {
    try {
      // ⚡ استخدام Delta Sync للقراءة
      const orgId = getOrgId();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);
      const startTs = startDate.getTime();

      // جلب كل الطلبات عبر Delta Sync
      const allOrders = await deltaWriteService.getAll<LocalPOSOrder>('pos_orders', orgId);
      const relevantOrders = allOrders.filter(order => {
        const orderTs = order.created_at_ts || Date.parse(order.created_at);
        return orderTs >= startTs;
      });

      // جلب عناصر الطلبات
      const relevantOrderIds = new Set(relevantOrders.map(o => o.id));
      const allOrderItems = await deltaWriteService.getAll<LocalPOSOrderItem>('pos_order_items', orgId);
      const relevantItems = allOrderItems.filter(item =>
        relevantOrderIds.has(item.order_id)
      );
      
      // تجميع المنتجات
      const productMap = new Map<string, {
        productId: string;
        productName: string;
        quantitySold: number;
        totalRevenue: number;
      }>();
      
      for (const item of relevantItems) {
        const existing = productMap.get(item.product_id);
        if (existing) {
          existing.quantitySold += item.quantity;
          existing.totalRevenue += item.total_price || (item.quantity * item.unit_price);
        } else {
          productMap.set(item.product_id, {
            productId: item.product_id,
            productName: item.product_name || 'منتج غير معروف',
            quantitySold: item.quantity,
            totalRevenue: item.total_price || (item.quantity * item.unit_price)
          });
        }
      }
      
      // ترتيب حسب الكمية المباعة
      return Array.from(productMap.values())
        .sort((a, b) => b.quantitySold - a.quantitySold);
      
    } catch (error) {
      console.error('Error getting top selling products:', error);
      return [];
    }
  }
  
  /**
   * الحصول على إحصائيات المبيعات لفترة معينة
   */
  static async getSalesStats(days: number = 30): Promise<{
    totalSales: number;
    totalOrders: number;
    averageOrderValue: number;
    totalProfit: number;
    bestDay: { date: string; sales: number } | null;
  }> {
    try {
      const orgId = getOrgId();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      const startTimestamp = startDate.getTime();

      // ⚡ استخدام Delta Sync
      const allOrders = await deltaWriteService.getAll<LocalPOSOrder>('pos_orders', orgId);
      const relevantOrders = allOrders.filter(order => {
        const orderTimestamp = order.created_at_ts || Date.parse(order.created_at);
        return orderTimestamp >= startTimestamp;
      });
      
      const totalSales = relevantOrders.reduce((sum, order) => sum + (order.total || 0), 0);
      // حساب تقريبي للأرباح (30% من المبيعات)
      const totalProfit = totalSales * 0.3;
      const totalOrders = relevantOrders.length;
      const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
      
      // إيجاد أفضل يوم
      const salesByDay = new Map<string, number>();
      for (const order of relevantOrders) {
        const orderDate = new Date(order.created_at);
        const dayKey = orderDate.toISOString().split('T')[0];
        salesByDay.set(dayKey, (salesByDay.get(dayKey) || 0) + (order.total || 0));
      }
      
      let bestDay: { date: string; sales: number } | null = null;
      for (const [date, sales] of salesByDay.entries()) {
        if (!bestDay || sales > bestDay.sales) {
          bestDay = { date, sales };
        }
      }
      
      return {
        totalSales,
        totalOrders,
        averageOrderValue,
        totalProfit,
        bestDay
      };
      
    } catch (error) {
      console.error('Error getting sales stats:', error);
      return {
        totalSales: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        totalProfit: 0,
        bestDay: null
      };
    }
  }
  
  /**
   * الحصول على معلومات المخزون
   */
  static async getInventoryStats(): Promise<{
    totalProducts: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    totalStockValue: number;
  }> {
    try {
      const orgId = getOrgId();
      // ⚡ استخدام Delta Sync
      const allProducts = await deltaWriteService.getAll<LocalProduct>('products', orgId);
      
      const totalProducts = allProducts.length;
      
      // حساب المنتجات التي كادت تنفد (اقل من أو يساوي الحد الأدنى للمخزون)
      const lowStockProducts = allProducts.filter(p => {
        const quantity = computeAvailableStock(p as any);
        const minStock = Number((p as any).min_stock_level ?? (p as any).min_stock ?? 5) || 5;
        return quantity > 0 && quantity <= minStock;
      }).length;
      
      // حساب المنتجات النافدة (الكمية أقل من أو تساوي صفر)
      const outOfStockProducts = allProducts.filter(p => 
        computeAvailableStock(p as any) <= 0
      ).length;
      
      // حساب القيمة الإجمالية للمخزون
      const totalStockValue = allProducts.reduce((sum, p) => {
        const quantity = computeAvailableStock(p as any);
        const price = Number((p as any).price) || 0;
        return sum + (quantity * price);
      }, 0);
      
      return {
        totalProducts,
        lowStockProducts,
        outOfStockProducts,
        totalStockValue
      };
      
    } catch (error) {
      console.error('Error getting inventory stats:', error);
      return {
        totalProducts: 0,
        lowStockProducts: 0,
        outOfStockProducts: 0,
        totalStockValue: 0
      };
    }
  }
  
  /**
   * قائمة المنتجات منخفضة المخزون (محلية)
   */
  static async getLowStockProducts(limit: number = 20): Promise<Array<LocalProduct & { available_stock: number }>> {
    try {
      const orgId = getOrgId();
      // ⚡ استخدام Delta Sync
      const all = await deltaWriteService.getAll<LocalProduct>('products', orgId);
      const enriched = all.map((p) => ({
        ...(p as any),
        available_stock: computeAvailableStock(p as any),
      }));
      const result = enriched
        .filter((p) => p.available_stock > 0 && p.available_stock <= Number((p as any).min_stock_level ?? (p as any).min_stock ?? 5))
        .sort((a, b) => a.available_stock - b.available_stock)
        .slice(0, limit);
      return result as any;
    } catch (error) {
      console.error('Error getting low stock products:', error);
      return [];
    }
  }

  /**
   * قائمة المنتجات النافدة (محلية)
   */
  static async getOutOfStockProducts(limit: number = 50): Promise<Array<LocalProduct & { available_stock: number }>> {
    try {
      const orgId = getOrgId();
      // ⚡ استخدام Delta Sync
      const all = await deltaWriteService.getAll<LocalProduct>('products', orgId);
      const enriched = all.map((p) => ({
        ...(p as any),
        available_stock: computeAvailableStock(p as any),
      }));
      const result = enriched
        .filter((p) => p.available_stock <= 0)
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        .slice(0, limit);
      return result as any;
    } catch (error) {
      console.error('Error getting out of stock products:', error);
      return [];
    }
  }

  /**
   * البحث عن منتج معين
   */
  static async searchProduct(query: string): Promise<LocalProduct[]> {
    try {
      const orgId = getOrgId();
      // ⚡ استخدام Delta Sync
      const allProducts = await deltaWriteService.getAll<LocalProduct>('products', orgId);

      // استيراد نظام البحث المحسّن
      const { multiFieldSearch } = await import('@/lib/fuzzyMatch');

      // البحث متعدد الحقول مع أوزان مخصصة
      const results = multiFieldSearch(
        query,
        allProducts,
        [
          { accessor: (p) => p.name || '', weight: 3.0 },           // الاسم (أعلى وزن)
          { accessor: (p) => p.sku || '', weight: 2.0 },            // SKU
          { accessor: (p) => p.barcode || '', weight: 2.0 },        // Barcode
          // البحث في الألوان
          {
            accessor: (p) => {
              const colors = (p.colors || p.product_colors || []) as any[];
              return colors.map((c: any) => c?.name || c?.color_name || '').join(' ');
            },
            weight: 1.5
          },
          // البحث في المقاسات
          {
            accessor: (p) => {
              const colors = (p.colors || p.product_colors || []) as any[];
              const sizes = colors.flatMap((c: any) =>
                (c?.sizes || c?.product_sizes || []).map((s: any) => s?.size_name || s?.name || '')
              );
              return sizes.join(' ');
            },
            weight: 1.0
          }
        ],
        {
          threshold: 0.3,  // عتبة منخفضة لضمان إيجاد المنتجات
          limit: 10
        }
      );

      return results as LocalProduct[];

    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  }
  
  /**
   * الحصول على إحصائيات طرق الدفع
   */
  static async getPaymentMethodStats(days: number = 7): Promise<Array<{
    method: string;
    count: number;
    totalAmount: number;
  }>> {
    try {
      const orgId = getOrgId();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      const startTimestamp = startDate.getTime();

      // ⚡ استخدام Delta Sync
      const allOrders = await deltaWriteService.getAll<LocalPOSOrder>('pos_orders', orgId);
      const relevantOrders = allOrders.filter(order => {
        const orderTimestamp = order.created_at_ts || Date.parse(order.created_at);
        return orderTimestamp >= startTimestamp;
      });
      
      const paymentMap = new Map<string, { count: number; totalAmount: number }>();
      
      for (const order of relevantOrders) {
        const method = order.payment_method || 'نقدي';
        const existing = paymentMap.get(method);
        if (existing) {
          existing.count++;
          existing.totalAmount += order.total || 0;
        } else {
          paymentMap.set(method, {
            count: 1,
            totalAmount: order.total || 0
          });
        }
      }
      
      return Array.from(paymentMap.entries()).map(([method, data]) => ({
        method,
        ...data
      })).sort((a, b) => b.totalAmount - a.totalAmount);
      
    } catch (error) {
      console.error('Error getting payment method stats:', error);
      return [];
    }
  }
  
  /**
   * الحصول على مبيعات الأسبوع الحالي
   */
  static async getWeeklySales(): Promise<{
    totalSales: number;
    orderCount: number;
    profit: number;
    dailyBreakdown: Array<{ date: string; sales: number; orders: number }>;
  }> {
    try {
      const orgId = getOrgId();
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 = Sunday
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - dayOfWeek);
      startOfWeek.setHours(0, 0, 0, 0);

      const startTimestamp = startOfWeek.getTime();

      // ⚡ استخدام Delta Sync
      const allOrders = await deltaWriteService.getAll<LocalPOSOrder>('pos_orders', orgId);
      const weekOrders = allOrders.filter(order => {
        const orderTimestamp = order.created_at_ts || Date.parse(order.created_at);
        return orderTimestamp >= startTimestamp;
      });
      
      const totalSales = weekOrders.reduce((sum, order) => sum + (order.total || 0), 0);
      // حساب تقريبي للأرباح (30% من المبيعات)
      const profit = totalSales * 0.3;
      
      // تجميع حسب اليوم
      const salesByDay = new Map<string, { sales: number; orders: number }>();
      for (const order of weekOrders) {
        const orderDate = new Date(order.created_at);
        const dayKey = orderDate.toISOString().split('T')[0];
        const existing = salesByDay.get(dayKey) || { sales: 0, orders: 0 };
        existing.sales += order.total || 0;
        existing.orders++;
        salesByDay.set(dayKey, existing);
      }
      
      const dailyBreakdown = Array.from(salesByDay.entries()).map(([date, data]) => ({
        date,
        ...data
      })).sort((a, b) => a.date.localeCompare(b.date));
      
      return {
        totalSales,
        orderCount: weekOrders.length,
        profit,
        dailyBreakdown
      };
      
    } catch (error) {
      console.error('Error getting weekly sales:', error);
      return {
        totalSales: 0,
        orderCount: 0,
        profit: 0,
        dailyBreakdown: []
      };
    }
  }

  // ==========================
  // 🔎 استعلامات عامة موسّعة
  // ==========================

  /**
   * ملخص الطلبات لفترة معينة
   */
  static async getOrdersSummary(days: number = 7): Promise<{
    totalOrders: number;
    totalSales: number;
    avgOrderValue: number;
    byStatus: Record<string, number>;
    byPaymentStatus: Record<string, number>;
    byPaymentMethod: Record<string, number>;
  }> {
    try {
      const orgId = getOrgId();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);
      const startTs = startDate.getTime();

      // ⚡ استخدام Delta Sync
      const orders = await deltaWriteService.getAll<LocalPOSOrder>('pos_orders', orgId);
      const filtered = orders.filter(o => (o.created_at_ts || Date.parse(o.created_at)) >= startTs);

      const byStatus: Record<string, number> = {};
      const byPaymentStatus: Record<string, number> = {};
      const byPaymentMethod: Record<string, number> = {};
      let totalSales = 0;

      for (const o of filtered) {
        const status = (o.status || 'unknown').toLowerCase();
        const ps = (o.payment_status || 'unknown').toLowerCase();
        const pm = (o.payment_method || 'other').toLowerCase();
        byStatus[status] = (byStatus[status] || 0) + 1;
        byPaymentStatus[ps] = (byPaymentStatus[ps] || 0) + 1;
        byPaymentMethod[pm] = (byPaymentMethod[pm] || 0) + 1;
        totalSales += o.total || 0;
      }

      const totalOrders = filtered.length;
      const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
      return { totalOrders, totalSales, avgOrderValue, byStatus, byPaymentStatus, byPaymentMethod };
    } catch (error) {
      console.error('Error getting orders summary:', error);
      return { totalOrders: 0, totalSales: 0, avgOrderValue: 0, byStatus: {}, byPaymentStatus: {}, byPaymentMethod: {} };
    }
  }

  /**
   * أفضل العملاء حسب إجمالي الإنفاق
   */
  static async getTopCustomers(days: number = 30, limit: number = 10): Promise<Array<{
    customer_id: string | null;
    customer_name: string;
    orders: number;
    total: number;
  }>> {
    try {
      const orgId = getOrgId();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);
      const startTs = startDate.getTime();

      // ⚡ استخدام Delta Sync
      const orders = await deltaWriteService.getAll<LocalPOSOrder>('pos_orders', orgId);
      const filtered = orders.filter(o => (o.created_at_ts || Date.parse(o.created_at)) >= startTs);

      const map = new Map<string, { customer_id: string | null; customer_name: string; orders: number; total: number }>();
      for (const o of filtered) {
        const id = o.customer_id || 'unknown';
        const name = o.customer_name || 'عميل';
        const key = `${id}|${name}`;
        const existing = map.get(key) || { customer_id: o.customer_id || null, customer_name: name, orders: 0, total: 0 };
        existing.orders += 1;
        existing.total += o.total || 0;
        map.set(key, existing);
      }

      return Array.from(map.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting top customers:', error);
      return [];
    }
  }

  /**
   * نظرة عامة عن عميل (بحث باسم/بريد/هاتف)
   */
  static async getCustomerOverview(query: string): Promise<{
    customer: any | null;
    totalOrders: number;
    totalSpent: number;
    lastOrderAt: string | null;
  }> {
    try {
      const orgId = getOrgId();
      const q = (query || '').toLowerCase().trim();
      // ⚡ استخدام Delta Sync
      const customers = await deltaWriteService.getAll<LocalCustomer>('customers', orgId);
      const found = customers.find(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q)
      ) || null;

      if (!found) {
        return { customer: null, totalOrders: 0, totalSpent: 0, lastOrderAt: null };
      }

      // ⚡ استخدام Delta Sync
      const allOrders = await deltaWriteService.getAll<LocalPOSOrder>('pos_orders', orgId);
      const orders = allOrders.filter(o => o.customer_id === found.id);
      const totalOrders = orders.length;
      const totalSpent = orders.reduce((s, o) => s + (o.total || 0), 0);
      const lastOrderAt = orders.length ? (orders.sort((a,b) => (Date.parse(b.created_at) - Date.parse(a.created_at)))[0].created_at) : null;
      return { customer: found, totalOrders, totalSpent, lastOrderAt };
    } catch (error) {
      console.error('Error getting customer overview:', error);
      return { customer: null, totalOrders: 0, totalSpent: 0, lastOrderAt: null };
    }
  }

  /**
   * أداء الموظفين (حسب عدد الطلبات وإجمالي المبيعات)
   */
  static async getEmployeePerformance(days: number = 30, limit: number = 10): Promise<Array<{
    employee_id: string | null;
    employee_name: string;
    orders: number;
    total: number;
  }>> {
    try {
      const orgId = getOrgId();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);
      const startTs = startDate.getTime();

      // ⚡ استخدام Delta Sync
      const orders = await deltaWriteService.getAll<LocalPOSOrder>('pos_orders', orgId);
      const filtered = orders.filter(o => (o.created_at_ts || Date.parse(o.created_at)) >= startTs);

      const map = new Map<string, { employee_id: string | null; employee_name: string; orders: number; total: number }>();
      for (const o of filtered) {
        const id = o.employee_id || 'unknown';
        const name = (o as any).employee_name || 'موظف';
        const key = `${id}|${name}`;
        const existing = map.get(key) || { employee_id: o.employee_id || null, employee_name: name, orders: 0, total: 0 };
        existing.orders += 1;
        existing.total += o.total || 0;
        map.set(key, existing);
      }

      return Array.from(map.values()).sort((a,b) => b.total - a.total).slice(0, limit);
    } catch (error) {
      console.error('Error getting employee performance:', error);
      return [];
    }
  }

  /**
   * مبيعات حسب الساعات ليومي/أسبوعي
   */
  static async getHourlySales(days: number = 7): Promise<Array<{ hour: number; orders: number; total: number }>> {
    try {
      const orgId = getOrgId();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);
      const startTs = startDate.getTime();

      // ⚡ استخدام Delta Sync
      const orders = await deltaWriteService.getAll<LocalPOSOrder>('pos_orders', orgId);
      const filtered = orders.filter(o => (o.created_at_ts || Date.parse(o.created_at)) >= startTs);
      const buckets = Array.from({ length: 24 }, (_, hour) => ({ hour, orders: 0, total: 0 }));
      for (const o of filtered) {
        const d = new Date(o.created_at);
        const h = d.getHours();
        buckets[h].orders += 1;
        buckets[h].total += o.total || 0;
      }
      return buckets;
    } catch (error) {
      console.error('Error getting hourly sales:', error);
      return Array.from({ length: 24 }, (_, hour) => ({ hour, orders: 0, total: 0 }));
    }
  }

  /** ديون العملاء */
  static async getDebtsSummary(): Promise<{
    totalDebts: number;
    pending: number;
    partial: number;
    paid: number;
    totalRemaining: number;
  }> {
    try {
      const orgId = getOrgId();
      // ⚡ استخدام Delta Sync
      const debts = await deltaWriteService.getAll<LocalCustomerDebt>('customer_debts' as any, orgId);
      let pending = 0, partial = 0, paid = 0, totalRemaining = 0;
      for (const d of debts) {
        if (d.status === 'pending') pending++;
        else if (d.status === 'partial') partial++;
        else if (d.status === 'paid') paid++;
        totalRemaining += Number(d.remaining_amount || 0);
      }
      return { totalDebts: debts.length, pending, partial, paid, totalRemaining };
    } catch (error) {
      console.error('Error getting debts summary:', error);
      return { totalDebts: 0, pending: 0, partial: 0, paid: 0, totalRemaining: 0 };
    }
  }

  /**
   * قائمة العملاء الذين لديهم ديون (غير مدفوعة بالكامل)
   */
  static async getCustomersWithDebts(limit: number = 20): Promise<Array<{
    customer_id: string;
    customer_name: string;
    total_debt: number;
    remaining_amount: number;
    debts_count: number;
    status: string;
  }>> {
    try {
      const orgId = getOrgId();
      // ⚡ استخدام Delta Sync
      let debts = await deltaWriteService.getAll<LocalCustomerDebt>('customer_debts' as any, orgId);

      // إذا لم نجد ديون محلياً، جرب المزامنة من السيرفر
      if (debts.length === 0) {
        try {
          const { fetchCustomerDebtsFromServer } = await import('@/api/syncCustomerDebts');

          if (orgId) {
            const syncedCount = await fetchCustomerDebtsFromServer(orgId);

            // إعادة جلب البيانات بعد المزامنة
            if (syncedCount > 0) {
              debts = await deltaWriteService.getAll<LocalCustomerDebt>('customer_debts' as any, orgId);
            }
          }
        } catch (syncError) {
          console.error('[getCustomersWithDebts] خطأ في المزامنة:', syncError);
        }
      }

      // فلترة الديون غير المدفوعة بالكامل
      // نقبل أي دين له مبلغ متبقي > 0، بغض النظر عن status
      const unpaidDebts = debts.filter(d => {
        const remaining = Number(d.remaining_amount || 0);
        return remaining > 0;
      });

      // تجميع حسب العميل
      const customerMap = new Map<string, {
        customer_id: string;
        customer_name: string;
        total_debt: number;
        remaining_amount: number;
        debts_count: number;
        status: string;
      }>();

      for (const debt of unpaidDebts) {
        const customerId = debt.customer_id || 'unknown';
        const customerName = debt.customer_name || 'عميل غير معروف';

        const existing = customerMap.get(customerId);
        if (existing) {
          existing.total_debt += Number(debt.total_amount || 0);
          existing.remaining_amount += Number(debt.remaining_amount || 0);
          existing.debts_count++;
          // إذا كان أي دين pending، العميل pending
          if (debt.status === 'pending') {
            existing.status = 'pending';
          }
        } else {
          customerMap.set(customerId, {
            customer_id: customerId,
            customer_name: customerName,
            total_debt: Number(debt.total_amount || 0),
            remaining_amount: Number(debt.remaining_amount || 0),
            debts_count: 1,
            status: debt.status || 'unknown'
          });
        }
      }

      // تحويل إلى مصفوفة وترتيب حسب المبلغ المتبقي
      const result = Array.from(customerMap.values())
        .sort((a, b) => b.remaining_amount - a.remaining_amount)
        .slice(0, limit);

      return result;
    } catch (error) {
      console.error('Error getting customers with debts:', error);
      return [];
    }
  }

  /** الإرجاعات */
  static async getReturnsSummary(days: number = 30): Promise<{
    totalReturns: number;
    totalReturnAmount: number;
    totalRefundAmount: number;
  }> {
    try {
      const orgId = getOrgId();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);
      const startTs = startDate.getTime();
      // ⚡ استخدام Delta Sync
      const returns = await deltaWriteService.getAll<LocalProductReturn>('product_returns' as any, orgId);
      const filtered = returns.filter(r => Date.parse(r.created_at) >= startTs);
      const totalReturnAmount = filtered.reduce((s, r) => s + Number(r.return_amount || 0), 0);
      const totalRefundAmount = filtered.reduce((s, r) => s + Number(r.refund_amount || 0), 0);
      return { totalReturns: filtered.length, totalReturnAmount, totalRefundAmount };
    } catch (error) {
      console.error('Error getting returns summary:', error);
      return { totalReturns: 0, totalReturnAmount: 0, totalRefundAmount: 0 };
    }
  }

  /** الخسائر */
  static async getLossesSummary(days: number = 90): Promise<{
    totalLossDeclarations: number;
    totalCostValue: number;
  }> {
    try {
      const orgId = getOrgId();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);
      const startTs = startDate.getTime();
      // ⚡ استخدام Delta Sync
      const losses = await deltaWriteService.getAll<LocalLossDeclaration>('loss_declarations' as any, orgId);
      const filtered = losses.filter(l => Date.parse(l.created_at) >= startTs);
      const totalCostValue = filtered.reduce((s, l) => s + Number(l.total_cost_value || 0), 0);
      return { totalLossDeclarations: filtered.length, totalCostValue };
    } catch (error) {
      console.error('Error getting losses summary:', error);
      return { totalLossDeclarations: 0, totalCostValue: 0 };
    }
  }

  /** الاشتراكات */
  static async getSubscriptionsStats(): Promise<{
    total: number;
    active: number;
    expiringSoon: number;
  }> {
    try {
      const orgId = getOrgId();
      // ⚡ استخدام Delta Sync
      const subs = await deltaWriteService.getAll<LocalOrganizationSubscription>('organization_subscriptions' as any, orgId);
      const now = Date.now();
      let total = subs.length, active = 0, expiringSoon = 0;
      for (const s of subs) {
        const status = (s.status || '').toLowerCase();
        if (status !== 'cancelled' && status !== 'expired') active++;
        const endTs = s.end_date ? Date.parse(s.end_date) : 0;
        if (endTs && endTs > now && endTs - now < 14 * 24 * 60 * 60 * 1000) expiringSoon++;
      }
      return { total, active, expiringSoon };
    } catch (error) {
      console.error('Error getting subscriptions stats:', error);
      return { total: 0, active: 0, expiringSoon: 0 };
    }
  }

  /**
   * الموظفون المعروفون محلياً (تجميع من الجلسات والـ PINs والأوامر)
   */
  static async getKnownStaff(): Promise<Array<{ staff_id: string | null; staff_name: string; sources: string[] }>> {
    try {
      const orgId = getOrgId();
      const byKey = new Map<string, { staff_id: string | null; staff_name: string; sources: Set<string> }>();

      // من جلسات العمل - ⚡ استخدام Delta Sync
      try {
        const sessions = await deltaWriteService.getAll<LocalWorkSession>('work_sessions', orgId);
        for (const s of sessions) {
          const id = s.staff_id || null;
          const name = s.staff_name || 'موظف';
          const key = `${id ?? 'null'}|${name}`;
          const entry = byKey.get(key) || { staff_id: id, staff_name: name, sources: new Set() };
          entry.sources.add('work_session');
          byKey.set(key, entry);
        }
      } catch {}

      // من PINs المخزنة محلياً - ⚡ استخدام Delta Sync
      try {
        const pins = await deltaWriteService.getAll<LocalStaffPin>('staff_pins' as any, orgId);
        for (const p of pins) {
          const id = p.id || null;
          const name = p.staff_name || 'موظف';
          const key = `${id ?? 'null'}|${name}`;
          const entry = byKey.get(key) || { staff_id: id, staff_name: name, sources: new Set() };
          entry.sources.add('staff_pin');
          byKey.set(key, entry);
        }
      } catch {}

      // من الطلبات (employee_id واسم المنشئ إذا توفّر) - ⚡ استخدام Delta Sync
      try {
        const orders = await deltaWriteService.getAll<LocalPOSOrder>('pos_orders', orgId);
        for (const o of orders) {
          const id = o.employee_id || (o as any).created_by_staff_id || null;
          const name = (o as any).created_by_staff_name || 'موظف';
          if (!id && name === 'موظف') continue;
          const key = `${id ?? 'null'}|${name}`;
          const entry = byKey.get(key) || { staff_id: id, staff_name: name, sources: new Set() };
          entry.sources.add('pos_order');
          byKey.set(key, entry);
        }
      } catch {}

      // من Cache تهيئة التطبيق (SQLite app_init_cache): employees
      try {
        if (isSQLiteAvailable()) {
          const orgId = localStorage.getItem('currentOrganizationId') || localStorage.getItem('bazaar_organization_id') || undefined;
          if (orgId) {
            try { await sqliteDB.initialize(orgId); } catch {}
          }
          const res = await sqliteDB.query('SELECT data FROM app_init_cache', {});
          if (res.success && Array.isArray(res.data)) {
            for (const row of res.data as any[]) {
              const raw = row?.data;
              let appData: any = raw;
              try { appData = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch {}
              const emps = appData?.employees;
              if (Array.isArray(emps)) {
                for (const e of emps) {
                  const id = e?.id || e?.auth_user_id || null;
                  const name = e?.name || e?.email || 'موظف';
                  const key = `${id ?? 'null'}|${name}`;
                  const entry = byKey.get(key) || { staff_id: id, staff_name: name, sources: new Set() };
                  entry.sources.add('app_init_cache');
                  byKey.set(key, entry);
                }
              }
            }
          }
        }
      } catch {}

      return Array.from(byKey.values()).map(e => ({ staff_id: e.staff_id, staff_name: e.staff_name, sources: Array.from(e.sources) }));
    } catch (error) {
      console.error('Error getting known staff:', error);
      return [];
    }
  }
}
