/**
 * التصدير الرئيسي لمكونات التقارير الشاملة
 */

// المكون الرئيسي - استيراد وإعادة تصدير
import ComprehensiveReportsComponent from './ComprehensiveReports';
export const ComprehensiveReports = ComprehensiveReportsComponent;

// المكونات الفرعية - named exports
export {
  KPISection,
  RevenueSection,
  CostsSection,
  ProfitSection,
  ZakatSection,
  DateRangePicker,
} from './components';

// Types
export type {
  DateRange,
  DatePreset,
  RevenueData,
  RevenueBreakdown,
  COGSData,
  CostsData,
  ExpensesByCategory,
  PurchasesSummary,
  ServicesData,
  InventoryValuation,
  LossesSummary,
  ReturnsSummary,
  ProfitData,
  ProfitBreakdown,
  ProfitTrend,
  ZakatData,
  DailySalesData,
  MonthlySalesData,
  KPIData,
  ComprehensiveReportData,
} from './types';

// Constants
export {
  REPORT_COLORS,
  CHART_COLORS,
  CHART_STYLES,
  DATE_PRESETS,
  EXPENSE_CATEGORIES,
  ZAKAT_CONSTANTS,
  REVENUE_SOURCES,
  FORMAT_OPTIONS,
} from './constants';

// Utils
export {
  formatCurrency,
  formatPercentage,
  formatNumber,
  calculateZakat,
  calculateProfitMargin,
  getDateRangeFromPreset,
  getApproximateHijriYear,
} from './utils';

// Hooks
export { useReportData } from './hooks/useReportData';
