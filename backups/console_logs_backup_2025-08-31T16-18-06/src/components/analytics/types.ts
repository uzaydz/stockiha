// 🔍 فلاتر التحليلات المتقدمة
export interface AnalyticsFilters {
  employeeId?: string;
  branchId?: string;
  transactionType?: string;
  paymentMethod?: string;
  minAmount?: number;
  maxAmount?: number;
  includePartialPayments?: boolean;
  includeRefunds?: boolean;
  startDate?: string;
  endDate?: string;
}

// 📊 أنواع البيانات المالية المحسنة
export interface FinancialData {
  // الإيرادات والأرباح الأساسية
  total_revenue: number;
  total_cost: number;
  total_gross_profit: number;
  total_expenses: number;
  total_net_profit: number;
  profit_margin_percentage: number;
  
  // مبيعات نقطة البيع
  pos_sales_revenue: number;
  pos_sales_cost: number;
  pos_sales_profit: number;
  pos_orders_count: number;
  
  // المبيعات الإلكترونية
  online_sales_revenue: number;
  online_sales_cost: number;
  online_sales_profit: number;
  online_orders_count: number;
  
  // خدمات التصليح
  repair_services_revenue: number;
  repair_services_profit: number;
  repair_orders_count: number;
  
  // تحميل الألعاب
  game_downloads_revenue: number;
  game_downloads_profit: number;
  game_downloads_count: number;
  
  // الاشتراكات
  subscription_services_revenue: number;
  subscription_services_profit: number;
  subscription_transactions_count: number;
  
  // الديون والمديونية
  total_debt_amount: number;
  debt_impact_on_capital: number;
  paid_debt_amount: number;
  
  // الخسائر والإرجاعات
  total_losses_cost: number;
  total_losses_selling_value: number;
  total_returns_amount: number;
  
  // المصروفات
  one_time_expenses: number;
  recurring_expenses_annual: number;
  
  // إحصائيات عامة
  avg_order_value: number;
  total_transactions_count: number;
  
  // الحقول الجديدة - خدمات إضافية
  service_bookings_revenue?: number;
  service_bookings_profit?: number;
  service_bookings_count?: number;
  
  currency_sales_revenue?: number;
  currency_sales_profit?: number;
  currency_sales_count?: number;
  
  flexi_sales_revenue?: number;
  flexi_sales_profit?: number;
  flexi_sales_count?: number;
  
  // البيانات المفصلة الجديدة
  detailed_breakdown?: any;
  top_pos_products?: TopProduct[];
  top_online_products?: TopProduct[];
  pos_orders_stats?: OrdersStats;
  online_orders_stats?: OrdersStats;
}

// 🏆 أنواع البيانات للمنتجات الأكثر مبيعاً
export interface TopProduct {
  name: string;
  sku: string;
  total_quantity_sold: number;
  order_count: number;
  total_revenue: number;
  avg_selling_price: number;
  purchase_price: number;
  total_profit: number;
  profit_margin: number;
}

// 📊 أنواع البيانات لإحصائيات الطلبات
export interface OrdersStats {
  total_orders: number;
  active_orders: number;
  total_revenue: number;
  avg_order_value: number;
  earliest_order?: string;
  latest_order?: string;
  status_breakdown?: StatusBreakdown[];
}

// 📈 تفصيل الحالات
export interface StatusBreakdown {
  status: string;
  status_count: number;
  status_total: number;
  avg_amount: number;
}

// 📅 نطاق التاريخ
export interface DateRange {
  from: Date;
  to: Date;
}

// 📊 بيانات الرسوم البيانية
export interface ChartDataItem {
  name: string;
  value: number;
  profit?: number;
  amount?: number;
}

// 🎨 ألوان التحليلات
export const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', 
  '#8884d8', '#82ca9d', '#ffc658', '#ff7300'
];

// 📱 نقاط التقسيم المرئية للاستجابة
export const BREAKPOINTS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
} as const;
