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
