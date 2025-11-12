/**
 * ملف index لنظام التصدير
 * تصدير جميع الدوال والأنواع من أنظمة التصدير المختلفة
 */

// تصدير CSV
export {
  exportToCSV,
  exportSalesToCSV,
  exportProductsToCSV,
  exportCustomersToCSV,
  exportExpensesToCSV,
  exportFinancialSummaryToCSV,
  type CSVExportOptions,
  type CSVExportResult
} from './csvExport';

// تصدير Excel
export {
  exportToExcel,
  exportFinancialReportToExcel,
  exportSalesReportToExcel,
  exportProductsReportToExcel,
  type ExcelExportOptions,
  type ExcelSheet,
  type ExcelExportResult
} from './excelExport';

// تصدير PDF
export {
  exportToPDF,
  exportFinancialReportToPDF,
  exportSalesReportToPDF,
  type PDFExportOptions,
  type PDFSection,
  type PDFExportResult
} from './pdfExport';

// دالة مساعدة لتحديد نوع التصدير
export type ExportFormat = 'pdf' | 'excel' | 'csv';

export interface ExportOptions {
  format: ExportFormat;
  data: any;
  organizationName?: string;
  period?: string;
  dateRange?: { start: Date; end: Date };
}

/**
 * دالة موحدة للتصدير بجميع الأنواع
 */
export async function exportReport(options: ExportOptions): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const { format, data, organizationName, period, dateRange } = options;

    switch (format) {
      case 'csv':
        const csvResult = exportFinancialSummaryToCSV({
          period: period || '',
          metrics: data
        });
        return {
          success: csvResult.success,
          message: csvResult.success ? `تم التصدير بنجاح: ${csvResult.filename}` : undefined,
          error: csvResult.error
        };

      case 'excel':
        const excelResult = await exportFinancialReportToExcel({
          organizationName: organizationName || 'Stockiha',
          period: period || '',
          summary: data.summary || data,
          sales: data.sales || [],
          products: data.products || [],
          expenses: data.expenses || []
        });
        return {
          success: excelResult.success,
          message: excelResult.success ? `تم التصدير بنجاح: ${excelResult.filename}` : undefined,
          error: excelResult.error
        };

      case 'pdf':
        if (!dateRange) {
          throw new Error('يجب تحديد الفترة الزمنية لتصدير PDF');
        }
        const pdfResult = await exportFinancialReportToPDF({
          organizationName: organizationName || 'Stockiha',
          period: period || '',
          dateRange,
          summary: data.summary || data,
          salesData: data.salesData,
          productsData: data.productsData,
          expensesData: data.expensesData,
          includeCharts: data.includeCharts
        });
        return {
          success: pdfResult.success,
          message: pdfResult.success ? `تم التصدير بنجاح: ${pdfResult.filename}` : undefined,
          error: pdfResult.error
        };

      default:
        throw new Error('نوع التصدير غير مدعوم');
    }
  } catch (error) {
    console.error('Error in exportReport:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'حدث خطأ أثناء التصدير'
    };
  }
}
