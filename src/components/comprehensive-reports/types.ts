/**
 * أنواع TypeScript للتقارير المالية الشاملة
 * Comprehensive Financial Reports Types
 */

// ==================== Date Types ====================

export interface DateRange {
  from: Date;
  to: Date;
}

export type DatePreset =
  | 'today'
  | 'yesterday'
  | 'week'
  | 'month'
  | 'quarter'
  | 'year'
  | 'custom';

// ==================== Revenue Types ====================

export interface RevenueData {
  posSales: number;
  onlineSales: number;
  repairServices: number;
  subscriptionSales: number;
  totalRevenue: number;
}

export interface RevenueBreakdown {
  source: 'pos' | 'online' | 'repair' | 'subscription';
  sourceName: string;
  amount: number;
  percentage: number;
  ordersCount: number;
}

// ==================== Costs Types ====================

export interface COGSData {
  posItemsCost: number;
  onlineItemsCost: number;
  subscriptionCost: number;
  totalCOGS: number;
}

export interface ExpenseData {
  id: string;
  title: string;
  amount: number;
  category: string;
  categoryName: string;
  categoryColor?: string;
  expenseDate: string;
  paymentMethod: string;
}

export interface ExpensesByCategory {
  category: string;
  categoryName: string;
  categoryColor: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface CostsData {
  cogs: COGSData;
  operatingExpenses: number;
  expensesByCategory: ExpensesByCategory[];
  totalCosts: number;
}

// ==================== Purchases Types ====================

export interface PurchaseData {
  id: string;
  purchaseNumber: string;
  supplierName: string;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  status: string;
  paymentStatus: string;
  purchaseDate: string;
}

export interface PurchasesSummary {
  totalPurchases: number;
  totalPaid: number;
  totalBalance: number;
  purchasesCount: number;
  bySupplier: {
    supplierId: string;
    supplierName: string;
    totalAmount: number;
    purchasesCount: number;
  }[];
}

// ==================== Services Types ====================

export interface RepairServiceData {
  totalRevenue: number;
  paidAmount: number;
  pendingAmount: number;
  completedCount: number;
  pendingCount: number;
  byDeviceType: {
    deviceType: string;
    count: number;
    revenue: number;
  }[];
}

export interface SubscriptionServiceData {
  serviceName: string;
  provider: string;
  purchasePrice: number;
  sellingPrice: number;
  profitAmount: number;
  profitMargin: number;
  totalQuantity: number;
  soldQuantity: number;
  availableQuantity: number;
  totalRevenue: number;
  totalProfit: number;
}

export interface ServicesData {
  repairs: RepairServiceData;
  subscriptions: {
    services: SubscriptionServiceData[];
    totalRevenue: number;
    totalProfit: number;
    totalSold: number;
  };
}

// ==================== Inventory Types ====================

export interface InventoryItem {
  productId: string;
  productName: string;
  sku?: string;
  barcode?: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  totalCostValue: number;
  totalSellingValue: number;
  colorId?: string;
  colorName?: string;
  sizeId?: string;
  sizeName?: string;
}

export interface InventoryValuation {
  simpleProductsValue: number;
  colorVariantsValue: number;
  sizeVariantsValue: number;
  totalCostValue: number;
  totalSellingValue: number;
  potentialProfit: number;
  itemsCount: number;
}

export interface InventoryByVariant {
  byColor: {
    colorName: string;
    colorCode: string;
    quantity: number;
    value: number;
  }[];
  bySize: {
    sizeName: string;
    quantity: number;
    value: number;
  }[];
}

// ==================== Losses Types ====================

export interface LossData {
  id: string;
  lossNumber: string;
  lossType: string;
  lossCategory: string;
  totalCostValue: number;
  totalSellingValue: number;
  itemsCount: number;
  incidentDate: string;
  status: string;
}

export interface LossesSummary {
  totalCostValue: number;
  totalSellingValue: number;
  totalItemsLost: number;
  incidentsCount: number;
  byType: {
    lossType: string;
    count: number;
    costValue: number;
  }[];
  byCategory: {
    category: string;
    count: number;
    costValue: number;
  }[];
}

// ==================== Returns Types ====================

export interface ReturnData {
  id: string;
  returnNumber: string;
  returnType: string;
  returnReason: string;
  originalTotal: number;
  returnAmount: number;
  refundAmount: number;
  restockingFee: number;
  status: string;
  createdAt: string;
}

export interface ReturnsSummary {
  totalReturnValue: number;
  totalRefunded: number;
  totalRestockingFees: number;
  returnsCount: number;
  byReason: {
    reason: string;
    count: number;
    amount: number;
  }[];
  byType: {
    type: string;
    count: number;
    amount: number;
  }[];
}

// ==================== Profit Types ====================

export interface ProfitData {
  grossRevenue: number;
  cogs: number;
  grossProfit: number;
  grossProfitMargin: number;
  operatingExpenses: number;
  losses: number;
  returns: number;
  netProfit: number;
  netProfitMargin: number;
}

export interface ProfitBreakdown {
  source: string;
  sourceName: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

export interface ProfitTrend {
  date: string;
  revenue: number;
  costs: number;
  profit: number;
  margin: number;
}

// ==================== Zakat Types ====================

export interface ZakatAssets {
  cashInHand: number;
  bankBalance: number;
  inventoryValue: number;
  receivables: number;
  subscriptionStock: number;
  otherAssets: number;
  totalAssets: number;
}

export interface ZakatLiabilities {
  supplierDebts: number;
  pendingExpenses: number;
  otherLiabilities: number;
  totalLiabilities: number;
}

export interface ZakatData {
  assets: ZakatAssets;
  liabilities: ZakatLiabilities;
  zakatableBase: number;
  nisab: number;
  goldPricePerGram: number;
  isNisabReached: boolean;
  zakatRate: number;
  zakatAmount: number;
  hijriYear: string;
  calculationDate: string;
}

// ==================== Sales Analysis Types ====================

export interface DailySalesData {
  date: string;
  posSales: number;
  onlineSales: number;
  totalSales: number;
  ordersCount: number;
  avgOrderValue: number;
}

export interface MonthlySalesData {
  month: string;
  posSales: number;
  onlineSales: number;
  totalSales: number;
  expenses: number;
  profit: number;
  ordersCount: number;
}

export interface SalesByVariant {
  byColor: {
    colorName: string;
    colorCode: string;
    quantity: number;
    revenue: number;
    percentage: number;
  }[];
  bySize: {
    sizeName: string;
    quantity: number;
    revenue: number;
    percentage: number;
  }[];
}

export interface TopSellingProduct {
  productId: string;
  productName: string;
  sku?: string;
  quantitySold: number;
  revenue: number;
  profit: number;
  profitMargin: number;
}

// ==================== KPI Types ====================

export interface KPIData {
  revenue: {
    value: number;
    change: number;
    changeType: 'increase' | 'decrease' | 'neutral';
  };
  costs: {
    value: number;
    change: number;
    changeType: 'increase' | 'decrease' | 'neutral';
  };
  profit: {
    value: number;
    change: number;
    changeType: 'increase' | 'decrease' | 'neutral';
    margin: number;
  };
  zakat: {
    value: number;
    isEligible: boolean;
    rate: number;
  };
}

// ==================== Comprehensive Report Types ====================

export interface ComprehensiveReportData {
  dateRange: DateRange;
  kpi: KPIData;
  revenue: RevenueData;
  revenueBreakdown: RevenueBreakdown[];
  costs: CostsData;
  purchases: PurchasesSummary;
  services: ServicesData;
  inventory: InventoryValuation;
  losses: LossesSummary;
  returns: ReturnsSummary;
  profit: ProfitData;
  profitBreakdown: ProfitBreakdown[];
  profitTrend: ProfitTrend[];
  zakat: ZakatData;
  dailySales: DailySalesData[];
  monthlySales: MonthlySalesData[];
  salesByVariant: SalesByVariant;
  topProducts: TopSellingProduct[];
  lastUpdated: Date;
  isOffline: boolean;
}

// ==================== Component Props Types ====================

export interface ReportSectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  actions?: React.ReactNode;
}

export interface ChartProps {
  data: any[];
  isLoading?: boolean;
  height?: number;
}

export interface DataTableColumn<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

// ==================== Export Types ====================

export type ExportFormat = 'pdf' | 'excel' | 'csv';

export interface ExportOptions {
  format: ExportFormat;
  sections: string[];
  dateRange: DateRange;
  includeCharts: boolean;
}
