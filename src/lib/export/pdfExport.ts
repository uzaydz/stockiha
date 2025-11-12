/**
 * نظام تصدير PDF
 * تصدير التقارير بصيغة PDF مع تصميم احترافي ودعم كامل للعربية
 */

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';

// تعريف الأنواع المفقودة من jspdf-autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: {
      finalY: number;
    };
  }
}

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface PDFExportOptions {
  title: string;
  subtitle?: string;
  organizationName: string;
  organizationLogo?: string;
  dateRange?: { start: Date; end: Date };
  sections: PDFSection[];
  includeCharts?: boolean;
  footer?: string;
  pageNumbers?: boolean;
}

export interface PDFSection {
  type: 'header' | 'summary' | 'table' | 'chart' | 'text' | 'spacer';
  title?: string;
  data?: any;
  chartElement?: HTMLElement;
  text?: string;
  columns?: string[];
  rows?: any[][];
}

export interface PDFExportResult {
  success: boolean;
  filename?: string;
  error?: string;
}

// ============================================================================
// الألوان والأنماط
// ============================================================================

const COLORS = {
  primary: '#FC5D41',      // البرتقالي الأساسي
  secondary: '#10B981',    // الأخضر
  text: '#1F2937',         // رمادي داكن
  textLight: '#6B7280',    // رمادي فاتح
  border: '#E5E7EB',       // رمادي فاتح جداً
  background: '#F9FAFB',   // خلفية فاتحة
  white: '#FFFFFF'
};

const FONTS = {
  primary: 'helvetica',
  size: {
    title: 24,
    heading: 18,
    subheading: 14,
    normal: 11,
    small: 9
  }
};

// ============================================================================
// دالة التصدير الرئيسية
// ============================================================================

/**
 * تصدير تقرير إلى PDF
 */
export async function exportToPDF(options: PDFExportOptions): Promise<PDFExportResult> {
  try {
    const {
      title,
      subtitle,
      organizationName,
      organizationLogo,
      dateRange,
      sections,
      includeCharts = true,
      footer,
      pageNumbers = true
    } = options;

    // إنشاء مستند PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // إضافة دعم RTL (محدود في jsPDF)
    doc.setR2L(true);

    let yPosition = 20;

    // 1. Header (الشعار والعنوان)
    yPosition = await addHeader(doc, {
      organizationName,
      organizationLogo,
      title,
      subtitle,
      dateRange
    }, yPosition);

    // 2. المحتوى
    for (const section of sections) {
      // التحقق من الحاجة لصفحة جديدة
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      yPosition = await addSection(doc, section, yPosition, includeCharts);
    }

    // 3. Footer
    if (footer || pageNumbers) {
      addFooter(doc, footer, pageNumbers);
    }

    // 4. حفظ الملف
    const filename = `${title.replace(/\s+/g, '_')}_${formatDate(new Date())}.pdf`;
    doc.save(filename);

    return {
      success: true,
      filename
    };

  } catch (error) {
    console.error('Error exporting to PDF:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'حدث خطأ أثناء التصدير'
    };
  }
}

// ============================================================================
// دوال مساعدة للتصدير
// ============================================================================

/**
 * إضافة Header للتقرير
 */
async function addHeader(
  doc: jsPDF,
  options: {
    organizationName: string;
    organizationLogo?: string;
    title: string;
    subtitle?: string;
    dateRange?: { start: Date; end: Date };
  },
  yPosition: number
): Promise<number> {
  const { organizationName, title, subtitle, dateRange } = options;
  const pageWidth = doc.internal.pageSize.getWidth();

  // خلفية Header
  doc.setFillColor(COLORS.primary);
  doc.rect(0, 0, pageWidth, 50, 'F');

  // اسم المؤسسة (أبيض)
  doc.setTextColor(COLORS.white);
  doc.setFontSize(FONTS.size.subheading);
  doc.setFont(FONTS.primary, 'bold');
  doc.text(organizationName, pageWidth - 15, 15, { align: 'right' });

  // عنوان التقرير (أبيض)
  doc.setFontSize(FONTS.size.title);
  doc.text(title, pageWidth - 15, 28, { align: 'right' });

  // Subtitle إذا وجد
  if (subtitle) {
    doc.setFontSize(FONTS.size.normal);
    doc.setFont(FONTS.primary, 'normal');
    doc.text(subtitle, pageWidth - 15, 37, { align: 'right' });
  }

  // الفترة الزمنية
  if (dateRange) {
    doc.setFontSize(FONTS.size.small);
    const dateText = `من ${formatDate(dateRange.start)} إلى ${formatDate(dateRange.end)}`;
    doc.text(dateText, pageWidth - 15, 45, { align: 'right' });
  }

  // خط فاصل
  doc.setDrawColor(COLORS.border);
  doc.setLineWidth(0.5);
  doc.line(15, 52, pageWidth - 15, 52);

  return 60;
}

/**
 * إضافة قسم للتقرير
 */
async function addSection(
  doc: jsPDF,
  section: PDFSection,
  yPosition: number,
  includeCharts: boolean
): Promise<number> {
  const pageWidth = doc.internal.pageSize.getWidth();

  switch (section.type) {
    case 'header':
      // عنوان قسم
      doc.setTextColor(COLORS.primary);
      doc.setFontSize(FONTS.size.heading);
      doc.setFont(FONTS.primary, 'bold');
      doc.text(section.title || '', pageWidth - 15, yPosition, { align: 'right' });
      return yPosition + 10;

    case 'summary':
      // ملخص KPIs
      return addSummarySection(doc, section.data, yPosition);

    case 'table':
      // جدول
      return addTableSection(doc, section, yPosition);

    case 'chart':
      // رسم بياني
      if (includeCharts && section.chartElement) {
        return await addChartSection(doc, section.chartElement, section.title, yPosition);
      }
      return yPosition;

    case 'text':
      // نص عادي
      doc.setTextColor(COLORS.text);
      doc.setFontSize(FONTS.size.normal);
      doc.setFont(FONTS.primary, 'normal');
      const lines = doc.splitTextToSize(section.text || '', pageWidth - 30);
      doc.text(lines, pageWidth - 15, yPosition, { align: 'right' });
      return yPosition + (lines.length * 5) + 5;

    case 'spacer':
      // مسافة فارغة
      return yPosition + 10;

    default:
      return yPosition;
  }
}

/**
 * إضافة قسم ملخص (KPIs)
 */
function addSummarySection(doc: jsPDF, data: any, yPosition: number): number {
  if (!data) return yPosition;

  const pageWidth = doc.internal.pageSize.getWidth();
  const boxWidth = (pageWidth - 40) / 2;
  const boxHeight = 20;
  let xPosition = pageWidth - 15 - boxWidth;
  let currentY = yPosition;

  // تحويل البيانات إلى مصفوفة
  const metrics = Object.entries(data).slice(0, 6); // أول 6 مقاييس

  metrics.forEach(([ key, value], index) => {
    // صندوق الـ KPI
    doc.setFillColor(COLORS.background);
    doc.setDrawColor(COLORS.border);
    doc.rect(xPosition, currentY, boxWidth, boxHeight, 'FD');

    // العنوان
    doc.setTextColor(COLORS.textLight);
    doc.setFontSize(FONTS.size.small);
    doc.setFont(FONTS.primary, 'normal');
    doc.text(formatMetricLabel(key), xPosition + boxWidth - 5, currentY + 6, { align: 'right' });

    // القيمة
    doc.setTextColor(COLORS.primary);
    doc.setFontSize(FONTS.size.subheading);
    doc.setFont(FONTS.primary, 'bold');
    doc.text(formatMetricValue(value, key), xPosition + boxWidth - 5, currentY + 15, { align: 'right' });

    // الانتقال للصندوق التالي
    if (index % 2 === 0) {
      xPosition = 15;
    } else {
      xPosition = pageWidth - 15 - boxWidth;
      currentY += boxHeight + 5;
    }
  });

  return currentY + (metrics.length % 2 === 0 ? 0 : boxHeight + 5) + 10;
}

/**
 * إضافة جدول
 */
function addTableSection(doc: jsPDF, section: PDFSection, yPosition: number): number {
  if (!section.columns || !section.rows) return yPosition;

  // عنوان الجدول
  if (section.title) {
    doc.setTextColor(COLORS.text);
    doc.setFontSize(FONTS.size.subheading);
    doc.setFont(FONTS.primary, 'bold');
    doc.text(section.title, doc.internal.pageSize.getWidth() - 15, yPosition, { align: 'right' });
    yPosition += 8;
  }

  // إنشاء الجدول
  doc.autoTable({
    startY: yPosition,
    head: [section.columns],
    body: section.rows,
    theme: 'grid',
    styles: {
      font: FONTS.primary,
      fontSize: FONTS.size.small,
      cellPadding: 3,
      halign: 'right',
      valign: 'middle'
    },
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: 'bold',
      halign: 'center'
    },
    alternateRowStyles: {
      fillColor: COLORS.background
    },
    margin: { right: 15, left: 15 }
  });

  return doc.lastAutoTable.finalY + 10;
}

/**
 * إضافة رسم بياني
 */
async function addChartSection(
  doc: jsPDF,
  chartElement: HTMLElement,
  title: string | undefined,
  yPosition: number
): Promise<number> {
  try {
    // عنوان الرسم
    if (title) {
      doc.setTextColor(COLORS.text);
      doc.setFontSize(FONTS.size.subheading);
      doc.setFont(FONTS.primary, 'bold');
      doc.text(title, doc.internal.pageSize.getWidth() - 15, yPosition, { align: 'right' });
      yPosition += 8;
    }

    // التقاط الرسم كصورة
    const canvas = await html2canvas(chartElement, {
      scale: 2,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 180;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // إضافة الصورة
    doc.addImage(
      imgData,
      'PNG',
      15,
      yPosition,
      imgWidth,
      imgHeight
    );

    return yPosition + imgHeight + 10;

  } catch (error) {
    console.error('Error adding chart to PDF:', error);
    return yPosition;
  }
}

/**
 * إضافة Footer
 */
function addFooter(doc: jsPDF, footerText?: string, includePageNumbers: boolean = true): void {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // خط فاصل
    doc.setDrawColor(COLORS.border);
    doc.setLineWidth(0.5);
    doc.line(15, pageHeight - 20, pageWidth - 15, pageHeight - 20);

    // النص
    doc.setTextColor(COLORS.textLight);
    doc.setFontSize(FONTS.size.small);
    doc.setFont(FONTS.primary, 'normal');

    if (footerText) {
      doc.text(footerText, pageWidth / 2, pageHeight - 12, { align: 'center' });
    } else {
      doc.text(
        'تم الإنشاء بواسطة Stockiha',
        pageWidth / 2,
        pageHeight - 12,
        { align: 'center' }
      );
    }

    // رقم الصفحة
    if (includePageNumbers) {
      doc.text(
        `صفحة ${i} من ${pageCount}`,
        pageWidth - 15,
        pageHeight - 12,
        { align: 'right' }
      );
    }

    // التاريخ
    doc.text(
      formatDate(new Date()),
      15,
      pageHeight - 12,
      { align: 'left' }
    );
  }
}

// ============================================================================
// دوال تصدير محددة
// ============================================================================

/**
 * تصدير تقرير مالي شامل
 */
export async function exportFinancialReportToPDF(data: {
  organizationName: string;
  period: string;
  dateRange: { start: Date; end: Date };
  summary: any;
  salesData?: any[][];
  productsData?: any[][];
  expensesData?: any[][];
  includeCharts?: boolean;
  chartElements?: {
    salesChart?: HTMLElement;
    profitChart?: HTMLElement;
  };
}): Promise<PDFExportResult> {
  const sections: PDFSection[] = [];

  // 1. ملخص تنفيذي
  sections.push({
    type: 'header',
    title: 'الملخص التنفيذي'
  });

  sections.push({
    type: 'summary',
    data: {
      'إجمالي الإيرادات': data.summary.grossRevenue,
      'صافي الربح': data.summary.netProfit,
      'هامش الربح': `${data.summary.netMargin?.toFixed(1)}%`,
      'عدد الطلبات': data.summary.totalOrders,
      'متوسط قيمة الطلب': data.summary.averageOrderValue,
      'العائد على الاستثمار': `${data.summary.roi?.toFixed(1)}%`
    }
  });

  sections.push({ type: 'spacer' });

  // 2. الرسوم البيانية
  if (data.includeCharts && data.chartElements) {
    if (data.chartElements.salesChart) {
      sections.push({
        type: 'chart',
        title: 'اتجاه المبيعات',
        chartElement: data.chartElements.salesChart
      });
    }

    if (data.chartElements.profitChart) {
      sections.push({
        type: 'chart',
        title: 'تحليل الأرباح',
        chartElement: data.chartElements.profitChart
      });
    }
  }

  // 3. جدول المبيعات
  if (data.salesData && data.salesData.length > 0) {
    sections.push({
      type: 'header',
      title: 'تفاصيل المبيعات'
    });

    sections.push({
      type: 'table',
      columns: ['رقم الطلب', 'التاريخ', 'العميل', 'المبلغ', 'الحالة'],
      rows: data.salesData.slice(0, 20) // أول 20 طلب
    });
  }

  // 4. جدول المنتجات
  if (data.productsData && data.productsData.length > 0) {
    sections.push({
      type: 'header',
      title: 'أداء المنتجات'
    });

    sections.push({
      type: 'table',
      columns: ['المنتج', 'الكمية', 'الإيرادات', 'الربح', 'الهامش %'],
      rows: data.productsData.slice(0, 15) // أول 15 منتج
    });
  }

  // 5. جدول المصروفات
  if (data.expensesData && data.expensesData.length > 0) {
    sections.push({
      type: 'header',
      title: 'المصروفات'
    });

    sections.push({
      type: 'table',
      columns: ['العنوان', 'التاريخ', 'الفئة', 'المبلغ'],
      rows: data.expensesData.slice(0, 15)
    });
  }

  return exportToPDF({
    title: 'التقرير المالي الشامل',
    subtitle: data.period,
    organizationName: data.organizationName,
    dateRange: data.dateRange,
    sections,
    includeCharts: data.includeCharts,
    pageNumbers: true
  });
}

/**
 * تصدير تقرير مبيعات مبسط
 */
export async function exportSalesReportToPDF(data: {
  organizationName: string;
  period: string;
  dateRange: { start: Date; end: Date };
  summary: {
    totalSales: number;
    totalOrders: number;
    averageOrderValue: number;
  };
  salesData: any[][];
}): Promise<PDFExportResult> {
  return exportToPDF({
    title: 'تقرير المبيعات',
    subtitle: data.period,
    organizationName: data.organizationName,
    dateRange: data.dateRange,
    sections: [
      {
        type: 'summary',
        data: {
          'إجمالي المبيعات': data.summary.totalSales,
          'عدد الطلبات': data.summary.totalOrders,
          'متوسط قيمة الطلب': data.summary.averageOrderValue
        }
      },
      { type: 'spacer' },
      {
        type: 'header',
        title: 'تفاصيل الطلبات'
      },
      {
        type: 'table',
        columns: ['رقم الطلب', 'التاريخ', 'العميل', 'المبلغ', 'طريقة الدفع', 'الحالة'],
        rows: data.salesData
      }
    ],
    pageNumbers: true
  });
}

// ============================================================================
// دوال مساعدة
// ============================================================================

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ar-DZ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
}

function formatMetricLabel(key: string): string {
  const labels: Record<string, string> = {
    'grossRevenue': 'إجمالي الإيرادات',
    'netRevenue': 'الإيرادات الصافية',
    'netProfit': 'صافي الربح',
    'grossProfit': 'الربح الإجمالي',
    'totalOrders': 'عدد الطلبات',
    'averageOrderValue': 'متوسط قيمة الطلب',
    'netMargin': 'هامش الربح الصافي',
    'grossMargin': 'هامش الربح الإجمالي',
    'roi': 'العائد على الاستثمار',
    'totalCosts': 'إجمالي التكاليف'
  };
  return labels[key] || key;
}

function formatMetricValue(value: any, key: string): string {
  if (typeof value === 'number') {
    if (key.includes('Margin') || key === 'roi') {
      return `${value.toFixed(1)}%`;
    }
    return `${value.toFixed(2)} دج`;
  }
  return String(value);
}
