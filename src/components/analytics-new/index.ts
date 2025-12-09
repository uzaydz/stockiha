/**
 * ============================================
 * STOCKIHA ANALYTICS - MAIN INDEX
 * التصدير الرئيسي لنظام التقارير
 * ============================================
 *
 * نظام تقارير شامل واحترافي
 * 100% Offline مع PowerSync
 * ============================================
 */

// ==================== Main Dashboard ====================
export { default as AnalyticsDashboard } from './AnalyticsDashboard';

// ==================== Core Components ====================
export { KPICard, ChartCard, ChartGrid, ChartRow, SectionHeader, SectionDivider, SectionContainer, QuickStatsRow, DataTable } from './core';
export type { KPICardProps, ChartCardProps, SectionHeaderProps, QuickStat, DataTableProps, Column } from './core';

// ==================== Charts ====================
export { LineChart, BarChart, PieChart, AreaChart } from './charts';
export type { LineChartData, LineChartProps, BarChartProps, PieChartDatum, PieChartProps, AreaChartData, AreaChartProps } from './charts';

// ==================== Filters ====================
export { DateFilter, getDateRangeFromPreset, formatDateRange, FilterBar } from './filters';
export type { DateFilterProps, FilterBarProps } from './filters';

// ==================== Sections ====================
export { OverviewSection, SalesSection, ProfitSection, InventorySection, ExpenseSection, CustomerSection, ZakatSection } from './sections';

// ==================== Hooks ====================
export {
  useAnalyticsFilters,
  getDefaultFilters,
  useSalesAnalytics,
  useProfitAnalytics,
  useInventoryAnalytics,
  useExpenseAnalytics,
  useCustomerAnalytics,
  useReturnsAnalytics,
  useLossAnalytics,
  useStaffAnalytics,
  useZakatAnalytics,
} from './hooks';

export type {
  UseAnalyticsFiltersReturn,
  UseSalesAnalyticsReturn,
  UseProfitAnalyticsReturn,
  UseInventoryAnalyticsReturn,
  UseExpenseAnalyticsReturn,
  UseCustomerAnalyticsReturn,
  UseReturnsAnalyticsReturn,
  UseLossAnalyticsReturn,
  UseStaffAnalyticsReturn,
  UseZakatAnalyticsReturn,
} from './hooks';

// ==================== Types (from types/index.ts) ====================
export type {
  // Date & Filter Types
  DateRange,
  DatePreset,
  ComparisonMode,
  FilterState,
  // KPI Types
  KPIValue,
  MainKPIs,
  // Sales Types
  SalesData,
  DailySales,
  HourlySales,
  SalesByCategory,
  TopProduct,
  // Profit Types
  ProfitData,
  ProfitBySource,
  ProfitTrend,
  // Inventory Types
  InventoryData,
  CapitalData,
  InventoryItem,
  VariantStock,
  // Expense Types
  ExpenseData,
  ExpenseByCategory,
  ExpenseTrend,
  // Debt Types
  DebtData,
  CustomerDebt,
  SupplierDebt,
  DebtAging,
  // Customer Types
  CustomerData,
  TopCustomer,
  CustomerSegment,
  RFMSegment,
  // Return Types
  ReturnData,
  ReturnByReason,
  ReturnByProduct,
  ReturnTrend,
  // Loss Types
  LossData,
  LossByType,
  LossByCategory,
  LossTrend,
  // Repair Types
  RepairData,
  RepairByDevice,
  RepairByLocation,
  RepairTrend,
  // Subscription Types
  SubscriptionData,
  SubscriptionByProvider,
  SubscriptionByService,
  SubscriptionTrend,
  // Zakat Types
  ZakatData,
  // Staff Types
  StaffData,
  StaffPerformance,
  WorkSessionData,
  // Comparison Types
  ComparisonData,
  PeriodData,
  PeriodChanges,
  // Dashboard Types
  DashboardSection,
  SectionConfig,
  ChartTheme,
  ChartDimensions,
  ExportFormat,
  ExportOptions,
  SectionProps,
  // Legacy Types (للتوافق)
  LegacyDateRange,
  KPIData,
  DailySalesData,
  MonthlySalesData,
  InventoryStatus,
  CustomerStats,
  ExpensesByCategory,
  PaymentMethodStats,
  AnalyticsData,
  AnalyticsFilters,
} from './types/index';

// ==================== Utils ====================
export { formatCurrency, formatNumber, formatPercent, formatDate, formatCompactNumber } from './utils/formatters';

// Theme exports
import { chartColors as _chartColors, nivoThemeDark as _nivoThemeDark, nivoThemeLight as _nivoThemeLight } from './utils/theme';
export { colors, semanticColors, darkTheme, lightTheme, nivoThemeDark, nivoThemeLight } from './utils/theme';
export const chartColors = _chartColors;
export const getChartTheme = (isDark: boolean) => isDark ? _nivoThemeDark : _nivoThemeLight;
export const gradients = _chartColors.gradients;

// ==================== Legacy Exports (للتوافق) ====================
// إعادة تصدير المكونات القديمة إذا كانت موجودة
export { default as KPICards } from './KPICards';
export { default as SalesChart } from './SalesChart';
export { default as TopProductsTable } from './TopProductsTable';
export { default as InventoryStatusCard } from './InventoryStatusCard';
export { default as CustomerAnalytics } from './CustomerAnalytics';
export { default as DateRangePicker } from './DateRangePicker';
export { default as ExpensesChart } from './ExpensesChart';

// تصدير الـ hook القديم
export { useAnalyticsData, getDateRangeFromPreset as getLegacyDateRange } from './useAnalyticsData';
