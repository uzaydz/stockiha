/**
 * ============================================
 * STOCKIHA ANALYTICS DASHBOARD - TYPES
 * نظام التقارير والتحليلات الشامل
 * ============================================
 */

// ==================== Date & Filter Types ====================

export interface DateRange {
  start: Date;
  end: Date;
}

export type DatePreset =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'last_quarter'
  | 'this_year'
  | 'last_year'
  | 'custom';

export type ComparisonMode = 'previous_period' | 'same_period_last_year' | 'custom' | 'none';

export interface FilterState {
  dateRange: DateRange;
  datePreset: DatePreset;
  comparisonMode: ComparisonMode;
  comparisonDateRange?: DateRange;
  categories: string[];
  products: string[];
  customers: string[];
  suppliers: string[];
  staff: string[];
  paymentMethods: string[];
  saleTypes: ('retail' | 'wholesale' | 'partial_wholesale')[];
  orderStatuses: string[];
  productTypes: ('piece' | 'weight' | 'meter' | 'box')[];
  hasVariants?: boolean;
}

// ==================== KPI Types ====================

export interface KPIValue {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

export interface MainKPIs {
  totalRevenue: KPIValue;
  totalCosts: KPIValue;
  grossProfit: KPIValue;
  netProfit: KPIValue;
  profitMargin: KPIValue;
  ordersCount: KPIValue;
  averageOrderValue: KPIValue;
  customersCount: KPIValue;
  inventoryValue: KPIValue;
  receivables: KPIValue;
  payables: KPIValue;
}

// ==================== Sales Types ====================

export interface SalesData {
  totalSales: number;
  totalOrders: number; // Was ordersCount
  averageOrderValue: number;
  totalItemsSold: number; // Was itemsSold
  totalDiscount: number;
  totalTax: number;

  salesByDay: { date: string; value: number; count: number; label?: string }[];

  salesByCategory: {
    id: string;
    name: string;
    value: number;
    count: number;
    percentage: number;
  }[];

  salesByPaymentMethod: { name: string; value: number }[];
  salesBySaleType: { name: string; value: number }[];

  // Legacy/Other props if needed
  ordersCount: number;
  itemsSold: number;

  // By Sale Type
  retailSales: number;
  wholesaleSales: number;
  partialWholesaleSales: number;

  // By Payment Method
  cashSales: number;
  cardSales: number;
  creditSales: number;
  otherPaymentSales: number;

  // By Product Type
  pieceSales: number;
  weightSales: number;
  meterSales: number;
  boxSales: number;
}

export interface DailySales {
  date: string;
  revenue: number;
  orders: number;
  items: number;
  avgOrder: number;
}

export interface HourlySales {
  hour: number;
  revenue: number;
  orders: number;
}

export interface SalesByCategory {
  categoryId: string;
  categoryName: string;
  revenue: number;
  quantity: number;
  percentage: number;
  profit: number;
  profitMargin: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  sku?: string;
  categoryName?: string;
  quantitySold: number;
  revenue: number;
  cost: number;
  profit: number;
  profitMargin: number;
  // Variant Info
  hasColors: boolean;
  hasSizes: boolean;
  topColor?: string;
  topSize?: string;
}

// ==================== Profit Types ====================

export interface ProfitData {
  grossRevenue: number;
  cogs: number; // Cost of Goods Sold
  grossProfit: number;
  grossMargin: number;

  operatingExpenses: number;
  losses: number;
  returns: number;

  operatingProfit: number;
  operatingMargin: number;

  otherIncome: number; // Repairs, Subscriptions

  netProfit: number;
  netMargin: number;

  // Optional breakdown data
  profitByDay?: Array<{ date: string; value: number; count?: number }>;
  profitByCategory?: Array<{ id: string; name: string; value: number; percentage: number; count?: number }>;
  profitBySaleType?: Array<{ name: string; value: number; percentage: number }>;
}

export interface ProfitBySource {
  source: 'pos' | 'online' | 'repairs' | 'subscriptions';
  sourceName: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  percentage: number;
}

export interface ProfitTrend {
  date: string;
  revenue: number;
  cogs: number;
  expenses: number;
  grossProfit: number;
  netProfit: number;
  grossMargin: number;
  netMargin: number;
}

// ==================== Inventory & Capital Types ====================

export interface InventoryData {
  totalProducts: number;
  totalItems: number;
  totalCostValue: number;
  totalSellingValue: number;
  potentialProfit: number;

  lowStockCount: number;
  outOfStockCount: number;
  expiringCount: number;

  // By Product Type
  pieceProducts: { count: number; value: number };
  weightProducts: { count: number; value: number; totalWeight: number };
  meterProducts: { count: number; value: number; totalLength: number };
  boxProducts: { count: number; value: number; totalBoxes: number };

  stockTurnover: number;
}

export interface CapitalData {
  totalCapital: number;

  // Distribution by Product Type
  capitalInPieces: number;
  capitalInWeight: number;
  capitalInMeters: number;
  capitalInBoxes: number;
  capitalInVariants: number;

  // ROI
  returnOnInvestment: number;
  capitalTurnover: number;

  // Trend
  capitalGrowth: number;
}

export interface InventoryItem {
  productId: string;
  productName: string;
  sku?: string;
  categoryName?: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  totalCost: number;
  totalSelling: number;
  productType: 'piece' | 'weight' | 'meter' | 'box';
  hasVariants: boolean;
  variantDetails?: VariantStock[];
  expiryDate?: string;
  isLowStock: boolean;
  reorderPoint?: number;
}

export interface VariantStock {
  colorId?: string;
  colorName?: string;
  colorCode?: string;
  sizeId?: string;
  sizeName?: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
}

// ==================== Expense Types ====================

export interface ExpenseData {
  totalExpenses: number;
  expenseCount: number;
  averageExpense: number;

  byCategory: ExpenseByCategory[];
  trend: ExpenseTrend[];

  recurringExpenses: number;
  oneTimeExpenses: number;

  expenseToRevenueRatio: number;

  // New properties for enhanced ExpenseSection
  dailyAverage: number;
  monthlyAverage: number;

  expensesByDay: Array<{ date: string; value: number; count?: number }>;
  expensesByPaymentMethod: Array<{ name: string; value: number; percentage: number }>;
  expensesByCategory: Array<{ name: string; value: number; count: number; percentage: number }>; // Updated strictly for the chart usage

  topExpenses: Array<{ id: string; description: string; amount: number; category: string; date: string }>;
}

export interface ExpenseByCategory {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  amount: number;
  count: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

export interface ExpenseTrend {
  date: string;
  amount: number;
  cumulative: number;
}

// ==================== Debt Types ====================

export interface DebtData {
  // Receivables (What customers owe us)
  totalReceivables?: number;
  receivablesCount?: number;
  overdueReceivables?: number;
  collectionRate: number;
  averageCollectionDays?: number;

  // Payables (What we owe suppliers)
  totalPayables?: number;
  payablesCount?: number;
  overduePayables?: number;

  // Net Position
  netDebtPosition?: number;

  // Legacy/Alternative property names (for backward compatibility)
  totalDebt?: number;
  paidDebt?: number;
  remainingDebt?: number;
  overdueDebt?: number;
  pendingDebt?: number;
  debtsByCustomer?: Array<{ id: string; name: string; value: number; count: number; percentage: number }>;
  debtsByAge?: any[];
  topDebtors?: Array<{ id: string; name: string; totalDebt: number; paidAmount: number; remainingDebt: number }>;
  averageDebtAge?: number;
}

export interface CustomerDebt {
  customerId: string;
  customerName: string;
  phone?: string;
  totalDebt: number;
  paidAmount: number;
  remainingAmount: number;
  ordersCount: number;
  oldestDebtDate: string;
  isOverdue: boolean;
  daysOverdue: number;
}

export interface SupplierDebt {
  supplierId: string;
  supplierName: string;
  totalDebt: number;
  paidAmount: number;
  remainingAmount: number;
  purchasesCount: number;
  oldestDebtDate: string;
  isOverdue: boolean;
}

export interface DebtAging {
  period: '0-30' | '31-60' | '61-90' | '90+';
  amount: number;
  count: number;
  percentage: number;
}

// ==================== Customer Types ====================

export interface CustomerData {
  totalCustomers: number;
  newCustomers: number;
  activeCustomers: number;
  inactiveCustomers: number;

  customerGrowth: number;
  retentionRate: number;
  churnRate: number;

  averageCustomerValue: number;
  customerLifetimeValue: number;

  topCustomers: TopCustomer[];
  rfmSegments?: Record<RFMSegmentType, number>;
}

export interface TopCustomer {
  customerId: string;
  customerName: string;
  phone?: string;
  totalPurchases: number;
  ordersCount: number;
  averageOrderValue: number;
  lastOrderDate: string;
  segment: 'vip' | 'regular' | 'new' | 'at_risk' | 'lost';
}

export interface CustomerSegment {
  segment: 'vip' | 'regular' | 'new' | 'at_risk' | 'lost';
  label: string;
  count: number;
  percentage: number;
  totalValue: number;
  color: string;
}

// RFM Analysis
export type RFMSegmentType = 'champions' | 'loyal' | 'potential' | 'new' | 'at_risk' | 'lost';

export interface RFMSegment {
  customerId: string;
  customerName: string;
  recency: number; // Days since last purchase
  frequency: number; // Number of purchases
  monetary: number; // Total spent
  recencyScore: 1 | 2 | 3 | 4 | 5;
  frequencyScore: 1 | 2 | 3 | 4 | 5;
  monetaryScore: 1 | 2 | 3 | 4 | 5;
  segment: RFMSegmentType;
}

// ==================== Return Types ====================

export interface ReturnData {
  totalReturns: number;
  totalReturnValue: number;
  totalRefunded: number;
  restockingFees: number;

  returnRate: number;
  itemsReturned: number;

  byReason: ReturnByReason[];
  byProduct: ReturnByProduct[];
  trend: ReturnTrend[];
}

export interface ReturnByReason {
  reason: string;
  reasonLabel: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface ReturnByProduct {
  productId: string;
  productName: string;
  returnCount: number;
  returnAmount: number;
  returnRate: number;
}

export interface ReturnTrend {
  date: string;
  count: number;
  amount: number;
  rate: number;
}

// ==================== Loss Types ====================

export interface LossData {
  totalCostValue: number;
  totalSellingValue: number;
  lostProfit: number;

  incidentsCount: number;
  itemsLost: number;

  lossRate: number;

  byType: LossByType[];
  byCategory: LossByCategory[];
  trend: LossTrend[];
}

export interface LossByType {
  type: string;
  typeLabel: string;
  count: number;
  costValue: number;
  sellingValue: number;
  percentage: number;
}

export interface LossByCategory {
  categoryId: string;
  categoryName: string;
  count: number;
  costValue: number;
  percentage: number;
}

export interface LossTrend {
  date: string;
  count: number;
  costValue: number;
  sellingValue: number;
}

// ==================== Repair Types ====================

export interface RepairData {
  totalOrders: number;
  totalRevenue: number;
  totalPaid: number;
  pendingPayment: number;

  completedCount: number;
  pendingCount: number;
  inProgressCount: number;

  completionRate: number;
  averageRepairValue: number;
  averageCompletionDays: number;

  byDeviceType: RepairByDevice[];
  byLocation: RepairByLocation[];
  trend: RepairTrend[];
}

export interface RepairByDevice {
  deviceType: string;
  count: number;
  revenue: number;
  percentage: number;
}

export interface RepairByLocation {
  locationId: string;
  locationName: string;
  count: number;
  revenue: number;
}

export interface RepairTrend {
  date: string;
  orders: number;
  revenue: number;
  completed: number;
}

// ==================== Subscription Types ====================

export interface SubscriptionData {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;

  transactionsCount: number;
  averageProfit: number;

  byProvider: SubscriptionByProvider[];
  byService: SubscriptionByService[];
  trend: SubscriptionTrend[];
}

export interface SubscriptionByProvider {
  provider: string;
  transactionsCount: number;
  revenue: number;
  cost: number;
  profit: number;
  percentage: number;
}

export interface SubscriptionByService {
  serviceId: string;
  serviceName: string;
  provider: string;
  purchasePrice: number;
  sellingPrice: number;
  profitPerUnit: number;
  totalQuantity: number;
  soldQuantity: number;
  availableQuantity: number;
  totalRevenue: number;
  totalProfit: number;
}

export interface SubscriptionTrend {
  date: string;
  transactions: number;
  revenue: number;
  profit: number;
}

// ==================== Zakat Types ====================

export interface ZakatData {
  // Assets
  inventoryValue: number;
  cashBalance: number;
  bankBalance: number;
  receivables: number;
  subscriptionStock: number;
  otherAssets: number;
  totalAssets: number;

  // Liabilities
  supplierDebts: number;
  pendingExpenses: number;
  otherLiabilities: number;
  totalLiabilities: number;

  // Calculation
  netZakatableAssets: number;
  nisab: number;
  goldPricePerGram: number;
  isNisabReached: boolean;
  zakatRate: number;
  zakatAmount: number;

  // Info
  hijriYear: string;
  calculationDate: string;
}

// ==================== Staff Types ====================

export interface StaffData {
  totalStaff: number;
  activeStaff: number;

  totalSales: number;
  totalOrders: number;
  totalCommissions: number;

  topPerformer: string;
  averageSalesPerStaff: number;

  byStaff: StaffPerformance[];
  sessions: WorkSessionData[];
}

export interface StaffPerformance {
  staffId: string;
  staffName: string;
  role: string;
  salesTotal: number;
  ordersCount: number;
  averageOrderValue: number;
  commission: number;
  workHours: number;
  salesPerHour: number;
  rank: number;
}

export interface WorkSessionData {
  sessionId: string;
  staffId: string;
  staffName: string;
  startedAt: string;
  endedAt?: string;
  totalSales: number;
  totalOrders: number;
  cashSales: number;
  cardSales: number;
  cashDifference: number;
  status: 'active' | 'closed';
}

// ==================== Comparative Types ====================

export interface ComparisonData {
  currentPeriod: PeriodData;
  previousPeriod: PeriodData;
  changes: PeriodChanges;
}

export interface PeriodData {
  startDate: string;
  endDate: string;
  revenue: number;
  costs: number;
  profit: number;
  orders: number;
  customers: number;
  avgOrderValue: number;
}

export interface PeriodChanges {
  revenueChange: number;
  revenueChangePercent: number;
  costsChange: number;
  costsChangePercent: number;
  profitChange: number;
  profitChangePercent: number;
  ordersChange: number;
  ordersChangePercent: number;
}

// ==================== Dashboard Section Types ====================

export type DashboardSection =
  | 'overview'
  | 'sales'
  | 'profits'
  | 'inventory'
  | 'capital'
  | 'expenses'
  | 'debts'
  | 'customers'
  | 'returns'
  | 'losses'
  | 'repairs'
  | 'subscriptions'
  | 'zakat'
  | 'staff'
  | 'comparative';

export interface SectionConfig {
  id: DashboardSection;
  title: string;
  titleAr: string;
  icon: string;
  color: string;
  description: string;
  descriptionAr: string;
}

// ==================== Chart Types ====================

export interface ChartTheme {
  background: string;
  text: string;
  grid: string;
  tooltip: {
    background: string;
    text: string;
    border: string;
  };
}

export interface ChartDimensions {
  width: number;
  height: number;
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

// ==================== Export Types ====================

export type ExportFormat = 'pdf' | 'excel' | 'csv' | 'print';

export interface ExportOptions {
  format: ExportFormat;
  sections: DashboardSection[];
  dateRange: DateRange;
  includeCharts: boolean;
  includeTables: boolean;
  language: 'ar' | 'en';
  paperSize: 'a4' | 'letter';
  orientation: 'portrait' | 'landscape';
}

// ==================== Component Props Types ====================

export interface SectionProps {
  isLoading?: boolean;
  error?: Error | null;
  dateRange: DateRange;
  filters: FilterState;
}

export interface KPICardProps {
  title: string;
  value: number;
  previousValue?: number;
  format: 'currency' | 'number' | 'percent';
  icon?: React.ReactNode;
  color?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  isLoading?: boolean;
}

export interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  actions?: React.ReactNode;
  className?: string;
}

// ==================== Legacy Types (للتوافق مع المكونات القديمة) ====================

// DateRange القديم يستخدم from/to بدلاً من start/end
export interface LegacyDateRange {
  from: Date;
  to: Date;
}

// إعادة تعريف الـ types القديمة هنا للتوافق
export interface KPIData {
  totalSales: number;
  totalOrders: number;
  avgOrderValue: number;
  netProfit: number;
  totalExpenses: number;
  totalCustomers: number;
  newCustomers: number;
  growthRate: number;
}

export interface DailySalesData {
  date: string;
  sales: number;
  orders: number;
  profit: number;
}

export interface MonthlySalesData {
  month: string;
  sales: number;
  orders: number;
  expenses: number;
  profit: number;
}

export interface InventoryStatus {
  totalProducts: number;
  inStock: number;
  outOfStock: number;
  lowStock: number;
}

export interface CustomerStats {
  totalCustomers: number;
  newCustomers30d: number;
  topCustomers: TopCustomer[];
}

export interface ExpensesByCategory {
  category: string;
  categoryName: string;
  amount: number;
  count: number;
}

export interface PaymentMethodStats {
  method: string;
  count: number;
  amount: number;
}

export interface AnalyticsData {
  kpi: KPIData;
  dailySales: DailySalesData[];
  monthlySales: MonthlySalesData[];
  topProducts: TopProduct[];
  inventoryStatus: InventoryStatus;
  customerStats: CustomerStats;
  expensesByCategory: ExpensesByCategory[];
  paymentMethods: PaymentMethodStats[];
  lastUpdated: Date;
}

export interface AnalyticsFilters {
  dateRange: DateRange;
  preset: DatePreset;
}
