// 📊 مكونات التحليلات المالية المحسنة
export { default as AnalyticsHeader } from './AnalyticsHeader';
export { default as MetricCard } from './MetricCard';
export { default as AnalyticsCharts } from './AnalyticsCharts';
export { default as SalesSection } from './SalesSection';
export { default as FinancialSection } from './FinancialSection';

// 🔧 الأدوات والأنواع - تصدير صريح بدلاً من star export
export type { DateRange, AnalyticsFilters, FinancialData, ChartDataItem } from './types';
export {
  getDateRangePreset,
  formatCurrency,
  formatPercentage,
  formatLargeNumber,
  calculateGrowthRate,
  formatDate,
  formatDateTime,
  prepareSalesChartData,
  prepareProfitAnalysisData,
  calculateProfitMargin,
  getColorByType,
  useCurrentBreakpoint
} from './utils';
export { useFinancialData, useChartData } from './useFinancialData';
