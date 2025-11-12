/**
 * نظام تصدير CSV
 * تصدير البيانات بصيغة CSV مع دعم كامل للعربية
 */

import Papa from 'papaparse';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface CSVExportOptions {
  filename: string;
  data: any[];
  headers: string[];
  delimiter?: string;
  includeTimestamp?: boolean;
}

export interface CSVExportResult {
  success: boolean;
  filename?: string;
  error?: string;
}

// ============================================================================
// دالة التصدير الرئيسية
// ============================================================================

/**
 * تصدير البيانات إلى ملف CSV
 */
export function exportToCSV(options: CSVExportOptions): CSVExportResult {
  try {
    const {
      filename,
      data,
      headers,
      delimiter = ',',
      includeTimestamp = true
    } = options;

    // التحقق من البيانات
    if (!data || data.length === 0) {
      throw new Error('لا توجد بيانات للتصدير');
    }

    if (!headers || headers.length === 0) {
      throw new Error('يجب تحديد عناوين الأعمدة');
    }

    // تحويل البيانات إلى CSV
    const csv = Papa.unparse({
      fields: headers,
      data: data
    }, {
      delimiter: delimiter,
      header: true,
      encoding: 'utf-8',
      skipEmptyLines: true
    });

    // إضافة BOM للدعم الكامل للعربية في Excel
    const BOM = '\uFEFF';
    const csvContent = BOM + csv;

    // إنشاء Blob
    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;'
    });

    // إنشاء اسم الملف مع Timestamp إذا طُلب
    let finalFilename = filename;
    if (includeTimestamp) {
      const timestamp = new Date().toISOString().split('T')[0];
      finalFilename = `${filename}_${timestamp}`;
    }
    if (!finalFilename.endsWith('.csv')) {
      finalFilename += '.csv';
    }

    // تحميل الملف
    downloadFile(blob, finalFilename);

    return {
      success: true,
      filename: finalFilename
    };

  } catch (error) {
    console.error('Error exporting to CSV:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'حدث خطأ أثناء التصدير'
    };
  }
}

/**
 * دالة مساعدة لتحميل الملف
 */
function downloadFile(blob: Blob, filename: string): void {
  // إنشاء رابط تحميل مؤقت
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';

  // إضافة للـ DOM وتنفيذ التحميل
  document.body.appendChild(link);
  link.click();

  // تنظيف
  setTimeout(() => {
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, 100);
}

// ============================================================================
// دوال تصدير محددة
// ============================================================================

/**
 * تصدير بيانات المبيعات
 */
export function exportSalesToCSV(orders: any[]): CSVExportResult {
  const headers = [
    'رقم الطلب',
    'التاريخ',
    'العميل',
    'الإجمالي',
    'الخصم',
    'الصافي',
    'حالة الدفع',
    'طريقة الدفع',
    'الحالة'
  ];

  const data = orders.map(order => [
    order.id || order.customer_order_number || '-',
    new Date(order.created_at).toLocaleDateString('ar-DZ'),
    order.customer?.name || 'زبون عابر',
    order.subtotal?.toFixed(2) || '0.00',
    order.discount?.toFixed(2) || '0.00',
    order.total?.toFixed(2) || '0.00',
    getPaymentStatusText(order.payment_status),
    getPaymentMethodText(order.payment_method),
    getOrderStatusText(order.status)
  ]);

  return exportToCSV({
    filename: 'تقرير_المبيعات',
    data,
    headers
  });
}

/**
 * تصدير بيانات المنتجات
 */
export function exportProductsToCSV(products: any[]): CSVExportResult {
  const headers = [
    'الاسم',
    'رمز المنتج (SKU)',
    'الباركود',
    'الفئة',
    'السعر',
    'سعر الشراء',
    'الكمية المتاحة',
    'الحد الأدنى',
    'الحالة'
  ];

  const data = products.map(product => [
    product.name || '-',
    product.sku || '-',
    product.barcode || '-',
    product.category || '-',
    product.price?.toFixed(2) || '0.00',
    product.purchase_price?.toFixed(2) || '-',
    product.stock_quantity || 0,
    product.min_stock_level || 5,
    product.is_active ? 'نشط' : 'غير نشط'
  ]);

  return exportToCSV({
    filename: 'تقرير_المنتجات',
    data,
    headers
  });
}

/**
 * تصدير بيانات العملاء
 */
export function exportCustomersToCSV(customers: any[]): CSVExportResult {
  const headers = [
    'الاسم',
    'الهاتف',
    'البريد الإلكتروني',
    'العنوان',
    'عدد الطلبات',
    'إجمالي المشتريات',
    'تاريخ التسجيل'
  ];

  const data = customers.map(customer => [
    customer.name || '-',
    customer.phone || '-',
    customer.email || '-',
    customer.address || '-',
    customer.order_count || 0,
    customer.total_purchases?.toFixed(2) || '0.00',
    new Date(customer.created_at).toLocaleDateString('ar-DZ')
  ]);

  return exportToCSV({
    filename: 'تقرير_العملاء',
    data,
    headers
  });
}

/**
 * تصدير بيانات المصروفات
 */
export function exportExpensesToCSV(expenses: any[]): CSVExportResult {
  const headers = [
    'العنوان',
    'التاريخ',
    'الفئة',
    'المبلغ',
    'طريقة الدفع',
    'الوصف',
    'الحالة'
  ];

  const data = expenses.map(expense => [
    expense.title || '-',
    new Date(expense.expense_date).toLocaleDateString('ar-DZ'),
    expense.category || '-',
    expense.amount?.toFixed(2) || '0.00',
    getPaymentMethodText(expense.payment_method),
    expense.description || '-',
    expense.status || 'مكتمل'
  ]);

  return exportToCSV({
    filename: 'تقرير_المصروفات',
    data,
    headers
  });
}

/**
 * تصدير ملخص مالي
 */
export function exportFinancialSummaryToCSV(data: {
  period: string;
  metrics: any;
}): CSVExportResult {
  const headers = [
    'المقياس',
    'القيمة'
  ];

  const metricsData = [
    ['الفترة', data.period],
    ['', ''],
    ['--- الإيرادات ---', ''],
    ['إجمالي الإيرادات', `${data.metrics.grossRevenue?.toFixed(2) || '0.00'} دج`],
    ['الإيرادات الصافية', `${data.metrics.netRevenue?.toFixed(2) || '0.00'} دج`],
    ['الإيرادات الفعلية (المدفوعة)', `${data.metrics.actualRevenue?.toFixed(2) || '0.00'} دج`],
    ['الإيرادات المعلقة (ديون)', `${data.metrics.pendingRevenue?.toFixed(2) || '0.00'} دج`],
    ['', ''],
    ['--- التكاليف ---', ''],
    ['تكلفة البضاعة المباعة', `${data.metrics.cogs?.toFixed(2) || '0.00'} دج`],
    ['المصروفات التشغيلية', `${data.metrics.operatingExpenses?.toFixed(2) || '0.00'} دج`],
    ['إجمالي التكاليف', `${data.metrics.totalCosts?.toFixed(2) || '0.00'} دج`],
    ['', ''],
    ['--- الأرباح ---', ''],
    ['الربح الإجمالي', `${data.metrics.grossProfit?.toFixed(2) || '0.00'} دج`],
    ['الربح التشغيلي', `${data.metrics.operatingProfit?.toFixed(2) || '0.00'} دج`],
    ['صافي الربح', `${data.metrics.netProfit?.toFixed(2) || '0.00'} دج`],
    ['', ''],
    ['--- النسب المالية ---', ''],
    ['هامش الربح الإجمالي', `${data.metrics.grossMargin?.toFixed(1) || '0.0'}%`],
    ['هامش الربح التشغيلي', `${data.metrics.operatingMargin?.toFixed(1) || '0.0'}%`],
    ['هامش الربح الصافي', `${data.metrics.netMargin?.toFixed(1) || '0.0'}%`],
    ['العائد على الاستثمار (ROI)', `${data.metrics.roi?.toFixed(1) || '0.0'}%`],
    ['', ''],
    ['--- معلومات إضافية ---', ''],
    ['عدد الطلبات', data.metrics.totalOrders || 0],
    ['متوسط قيمة الطلب', `${data.metrics.averageOrderValue?.toFixed(2) || '0.00'} دج`],
    ['إجمالي الخصومات', `${data.metrics.totalDiscounts?.toFixed(2) || '0.00'} دج`],
    ['نسبة الخصم', `${data.metrics.discountRate?.toFixed(1) || '0.0'}%`]
  ];

  return exportToCSV({
    filename: 'الملخص_المالي',
    data: metricsData,
    headers
  });
}

// ============================================================================
// دوال مساعدة
// ============================================================================

function getPaymentStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    'paid': 'مدفوع',
    'pending': 'معلق',
    'partial': 'دفع جزئي',
    'refunded': 'مسترد',
    'cancelled': 'ملغي'
  };
  return statusMap[status] || status;
}

function getPaymentMethodText(method: string): string {
  const methodMap: Record<string, string> = {
    'cash': 'نقداً',
    'card': 'بطاقة',
    'bank_transfer': 'تحويل بنكي',
    'check': 'شيك',
    'other': 'أخرى'
  };
  return methodMap[method] || method;
}

function getOrderStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    'completed': 'مكتمل',
    'pending': 'قيد الانتظار',
    'processing': 'قيد المعالجة',
    'cancelled': 'ملغي',
    'refunded': 'مسترد'
  };
  return statusMap[status] || status;
}
