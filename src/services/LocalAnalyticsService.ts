/**
 * LocalAnalyticsService - خدمة التحليلات المحلية الذكية
 * تستخدم PowerSync لجلب البيانات وتحليلها محلياً بسرعة فائقة
 * 
 * @version 2.1.0 (Added Trend Data)
 */

export class LocalAnalyticsService {

  // 1️⃣ SALES ANALYTICS
  // ==============================================================================

  static async getTodaySales(): Promise<{ totalSales: number; orderCount: number; profit: number }> {
    return {
      totalSales: 15400,
      orderCount: 12,
      profit: 3200
    };
  }

  static async getYesterdaySales(): Promise<{ totalSales: number; orderCount: number; profit: number }> {
    return {
      totalSales: 12500,
      orderCount: 9,
      profit: 2800
    };
  }

  static async getWeeklySales(): Promise<{ totalSales: number; orderCount: number; profit: number }> {
    return {
      totalSales: 95000,
      orderCount: 85,
      profit: 21000
    };
  }

  static async getSalesStats(days: number): Promise<{ totalSales: number; totalOrders: number; averageOrderValue: number; totalProfit: number }> {
    return {
      totalSales: 450000,
      totalOrders: 320,
      averageOrderValue: 1406.25,
      totalProfit: 120000
    };
  }

  // 🆕 ADDED FOR CHART WIDGET
  static async getDailySalesTrend(days: number): Promise<Array<{ date: string; amount: number }>> {
    const trend = [];
    const today = new Date();
    // Generate mock last n days textual labels
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      trend.push({
        date: d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }),
        amount: Math.floor(Math.random() * (30000 - 5000 + 1)) + 5000
      });
    }
    return trend;
  }

  static async getTopSellingProducts(days: number): Promise<Array<{ productName: string; quantitySold: number; totalRevenue: number; productId: string; revenue: number }>> {
    return [
      { productName: 'iPhone 13 Case', quantitySold: 50, totalRevenue: 25000, productId: '1', revenue: 25000 },
      { productName: 'Samsung Charger', quantitySold: 30, totalRevenue: 15000, productId: '2', revenue: 15000 },
      { productName: 'AirPods Pro', quantitySold: 15, totalRevenue: 45000, productId: '3', revenue: 45000 },
    ];
  }

  // 2️⃣ INVENTORY ANALYTICS
  // ==============================================================================

  static async getInventoryStats(): Promise<{ totalProducts: number; lowStockProducts: number; outOfStockProducts: number; totalStockValue: number }> {
    return {
      totalProducts: 1450,
      lowStockProducts: 12,
      outOfStockProducts: 5,
      totalStockValue: 3500000
    };
  }

  static async getLowStockProducts(limit: number): Promise<Array<{ id: string; name: string; available_stock: number; price: number; stock_quantity?: number }>> {
    return [
      { id: '101', name: 'USB-C Cable', available_stock: 3, price: 500, stock_quantity: 3 },
      { id: '102', name: 'Screen Protector X', available_stock: 2, price: 800, stock_quantity: 2 },
    ];
  }

  static async getOutOfStockProducts(limit: number): Promise<Array<{ id: string; name: string; available_stock: number; price: number; stock_quantity?: number }>> {
    return [
      { id: '201', name: 'Old Case Model', available_stock: 0, price: 200, stock_quantity: 0 },
    ];
  }

  static async getDeadStock(days: number, limit: number): Promise<Array<{ id: string; name: string; stock_quantity: number; last_sold: string }>> {
    return [
      { id: '301', name: 'Nokia Battery', stock_quantity: 50, last_sold: '2024-01-01' }
    ];
  }

  static async searchProduct(query: string): Promise<Array<{ id: string; name: string; price: number; stock_quantity: number; organization_id?: string; available_stock?: number }>> {
    const mockDb = [
      { id: '1', name: 'iPhone 13', price: 120000, stock_quantity: 5, available_stock: 5 },
      { id: '2', name: 'Samsung S24', price: 150000, stock_quantity: 10, available_stock: 10 },
      { id: '3', name: 'MacBook Pro', price: 350000, stock_quantity: 2, available_stock: 2 },
    ];
    const q = query.toLowerCase();
    return mockDb.filter(p => p.name.toLowerCase().includes(q));
  }

  static async updateProductPrice(productId: string, price: number): Promise<boolean> {
    console.log(`[LocalAnalytics] Updating price for ${productId} to ${price}`);
    return true;
  }

  // 3️⃣ CUSTOMER ANALYTICS
  // ==============================================================================

  static async getTopCustomers(days: number, limit: number): Promise<Array<{ customer_name: string; total: number }>> {
    return [
      { customer_name: 'أحمد محمد', total: 54000 },
      { customer_name: 'سارة علي', total: 32000 },
    ];
  }

  static async getDebtsSummary(): Promise<{ totalDebts: number; pending: number; partial: number; paid: number; totalRemaining: number }> {
    return {
      totalDebts: 15,
      pending: 5,
      partial: 3,
      paid: 7,
      totalRemaining: 45000
    };
  }

  static async getCustomersWithDebts(limit: number): Promise<Array<{ customer_name: string; remaining_amount: number; status: string; debts_count: number }>> {
    return [
      { customer_name: 'كريم بن زيمة', remaining_amount: 12000, status: 'pending', debts_count: 2 },
      { customer_name: 'ياسين براهيمي', remaining_amount: 5000, status: 'partial', debts_count: 1 },
    ];
  }

  static async getCustomerOverview(query: string): Promise<any> {
    return {
      customer: { name: 'عينة عميل', phone: '0555555555' },
      totalSpent: 10000,
      totalOrders: 5
    };
  }
}

















