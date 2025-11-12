/**
 * نظام تصدير Excel
 * تصدير البيانات بصيغة Excel مع تنسيق احترافي ودعم كامل للعربية
 */

import ExcelJS from 'exceljs';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ExcelExportOptions {
  filename: string;
  sheets: ExcelSheet[];
  organizationName?: string;
  includeTimestamp?: boolean;
}

export interface ExcelSheet {
  name: string;
  data: any[][];
  headers: string[];
  formatting?: {
    headerStyle?: Partial<ExcelJS.Style>;
    dataStyle?: Partial<ExcelJS.Style>;
    columnWidths?: number[];
    freezeHeader?: boolean;
    autoFilter?: boolean;
  };
}

export interface ExcelExportResult {
  success: boolean;
  filename?: string;
  error?: string;
}

// ============================================================================
// الأنماط الافتراضية
// ============================================================================

const DEFAULT_HEADER_STYLE: Partial<ExcelJS.Style> = {
  font: {
    name: 'Arial',
    size: 12,
    bold: true,
    color: { argb: 'FFFFFFFF' }
  },
  fill: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFC5D41' } // اللون البرتقالي الأساسي #fc5d41
  },
  alignment: {
    horizontal: 'center',
    vertical: 'middle',
    wrapText: true
  },
  border: {
    top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
    left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
    bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
    right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
  }
};

const DEFAULT_DATA_STYLE: Partial<ExcelJS.Style> = {
  font: {
    name: 'Arial',
    size: 11
  },
  alignment: {
    horizontal: 'right', // RTL
    vertical: 'middle'
  },
  border: {
    top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
    left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
    bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
    right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
  }
};

// ============================================================================
// دالة التصدير الرئيسية
// ============================================================================

/**
 * تصدير البيانات إلى ملف Excel
 */
export async function exportToExcel(options: ExcelExportOptions): Promise<ExcelExportResult> {
  try {
    const {
      filename,
      sheets,
      organizationName,
      includeTimestamp = true
    } = options;

    // التحقق من البيانات
    if (!sheets || sheets.length === 0) {
      throw new Error('يجب تحديد ورقة واحدة على الأقل');
    }

    // إنشاء Workbook
    const workbook = new ExcelJS.Workbook();

    // معلومات الملف
    workbook.creator = organizationName || 'Stockiha';
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.lastPrinted = new Date();

    // إنشاء الأوراق
    for (const sheet of sheets) {
      await createWorksheet(workbook, sheet);
    }

    // إنشاء اسم الملف
    let finalFilename = filename;
    if (includeTimestamp) {
      const timestamp = new Date().toISOString().split('T')[0];
      finalFilename = `${filename}_${timestamp}`;
    }
    if (!finalFilename.endsWith('.xlsx')) {
      finalFilename += '.xlsx';
    }

    // حفظ الملف
    const buffer = await workbook.xlsx.writeBuffer();
    downloadFile(buffer, finalFilename);

    return {
      success: true,
      filename: finalFilename
    };

  } catch (error) {
    console.error('Error exporting to Excel:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'حدث خطأ أثناء التصدير'
    };
  }
}

/**
 * إنشاء ورقة عمل
 */
async function createWorksheet(
  workbook: ExcelJS.Workbook,
  sheet: ExcelSheet
): Promise<void> {
  const { name, data, headers, formatting } = sheet;

  // إنشاء الورقة
  const worksheet = workbook.addWorksheet(name, {
    properties: {
      defaultRowHeight: 20,
      defaultColWidth: 15
    },
    views: [
      {
        rightToLeft: true, // RTL للعربية
        showGridLines: true
      }
    ]
  });

  // إضافة العناوين
  const headerRow = worksheet.addRow(headers);

  // تطبيق تنسيق العناوين
  const headerStyle = {
    ...DEFAULT_HEADER_STYLE,
    ...formatting?.headerStyle
  };

  headerRow.eachCell((cell) => {
    Object.assign(cell, headerStyle);
    cell.style = headerStyle;
  });

  headerRow.height = 30; // ارتفاع صف العناوين

  // إضافة البيانات
  data.forEach(row => {
    const dataRow = worksheet.addRow(row);

    // تطبيق تنسيق البيانات
    const dataStyle = {
      ...DEFAULT_DATA_STYLE,
      ...formatting?.dataStyle
    };

    dataRow.eachCell((cell) => {
      cell.style = dataStyle;
    });
  });

  // تطبيق عرض الأعمدة
  if (formatting?.columnWidths) {
    worksheet.columns.forEach((column, index) => {
      if (column && formatting.columnWidths && formatting.columnWidths[index]) {
        column.width = formatting.columnWidths[index];
      }
    });
  } else {
    // عرض تلقائي مناسب
    worksheet.columns.forEach((column) => {
      if (column) {
        column.width = 20;
      }
    });
  }

  // تجميد صف العناوين
  if (formatting?.freezeHeader !== false) {
    worksheet.views = [
      {
        rightToLeft: true,
        state: 'frozen',
        xSplit: 0,
        ySplit: 1
      }
    ];
  }

  // إضافة Auto Filter
  if (formatting?.autoFilter !== false) {
    worksheet.autoFilter = {
      from: {
        row: 1,
        column: 1
      },
      to: {
        row: 1,
        column: headers.length
      }
    };
  }
}

/**
 * دالة مساعدة لتحميل الملف
 */
function downloadFile(buffer: ExcelJS.Buffer, filename: string): void {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, 100);
}

// ============================================================================
// دوال تصدير محددة
// ============================================================================

/**
 * تصدير تقرير مالي شامل
 */
export async function exportFinancialReportToExcel(data: {
  organizationName: string;
  period: string;
  summary: any;
  sales: any[];
  products: any[];
  expenses: any[];
}): Promise<ExcelExportResult> {
  const sheets: ExcelSheet[] = [];

  // 1. ورقة الملخص
  sheets.push({
    name: 'الملخص',
    headers: ['المقياس', 'القيمة'],
    data: [
      ['الفترة', data.period],
      ['', ''],
      ['--- الإيرادات ---', ''],
      ['إجمالي الإيرادات', `${data.summary.grossRevenue?.toFixed(2) || '0.00'} دج`],
      ['الإيرادات الصافية', `${data.summary.netRevenue?.toFixed(2) || '0.00'} دج`],
      ['الإيرادات الفعلية', `${data.summary.actualRevenue?.toFixed(2) || '0.00'} دج`],
      ['الإيرادات المعلقة', `${data.summary.pendingRevenue?.toFixed(2) || '0.00'} دج`],
      ['', ''],
      ['--- التكاليف ---', ''],
      ['تكلفة البضاعة المباعة', `${data.summary.cogs?.toFixed(2) || '0.00'} دج`],
      ['المصروفات التشغيلية', `${data.summary.operatingExpenses?.toFixed(2) || '0.00'} دج`],
      ['إجمالي التكاليف', `${data.summary.totalCosts?.toFixed(2) || '0.00'} دج`],
      ['', ''],
      ['--- الأرباح ---', ''],
      ['الربح الإجمالي', `${data.summary.grossProfit?.toFixed(2) || '0.00'} دج`],
      ['الربح التشغيلي', `${data.summary.operatingProfit?.toFixed(2) || '0.00'} دج`],
      ['صافي الربح', `${data.summary.netProfit?.toFixed(2) || '0.00'} دج`],
      ['', ''],
      ['--- النسب المالية ---', ''],
      ['هامش الربح الإجمالي', `${data.summary.grossMargin?.toFixed(1) || '0.0'}%`],
      ['هامش الربح التشغيلي', `${data.summary.operatingMargin?.toFixed(1) || '0.0'}%`],
      ['هامش الربح الصافي', `${data.summary.netMargin?.toFixed(1) || '0.0'}%`],
      ['العائد على الاستثمار', `${data.summary.roi?.toFixed(1) || '0.0'}%`]
    ],
    formatting: {
      columnWidths: [30, 25],
      headerStyle: {
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF10B981' } // أخضر للملخص
        }
      }
    }
  });

  // 2. ورقة المبيعات
  if (data.sales && data.sales.length > 0) {
    sheets.push({
      name: 'المبيعات',
      headers: [
        'رقم الطلب',
        'التاريخ',
        'العميل',
        'الإجمالي',
        'الخصم',
        'الصافي',
        'حالة الدفع',
        'طريقة الدفع'
      ],
      data: data.sales.map(order => [
        order.id || order.customer_order_number || '-',
        new Date(order.created_at).toLocaleDateString('ar-DZ'),
        order.customer?.name || 'زبون عابر',
        order.subtotal?.toFixed(2) || '0.00',
        order.discount?.toFixed(2) || '0.00',
        order.total?.toFixed(2) || '0.00',
        getPaymentStatusText(order.payment_status),
        getPaymentMethodText(order.payment_method)
      ]),
      formatting: {
        columnWidths: [15, 15, 20, 12, 12, 12, 15, 15]
      }
    });
  }

  // 3. ورقة المنتجات
  if (data.products && data.products.length > 0) {
    sheets.push({
      name: 'أداء المنتجات',
      headers: [
        'المنتج',
        'الكمية المباعة',
        'الإيرادات',
        'التكلفة',
        'الربح',
        'هامش الربح %'
      ],
      data: data.products.map(product => [
        product.name || '-',
        product.quantity_sold || 0,
        product.revenue?.toFixed(2) || '0.00',
        product.cost?.toFixed(2) || '0.00',
        product.profit?.toFixed(2) || '0.00',
        product.margin?.toFixed(1) || '0.0'
      ]),
      formatting: {
        columnWidths: [25, 12, 12, 12, 12, 12],
        headerStyle: {
          fill: {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF3B82F6' } // أزرق للمنتجات
          }
        }
      }
    });
  }

  // 4. ورقة المصروفات
  if (data.expenses && data.expenses.length > 0) {
    sheets.push({
      name: 'المصروفات',
      headers: [
        'العنوان',
        'التاريخ',
        'الفئة',
        'المبلغ',
        'طريقة الدفع',
        'الوصف'
      ],
      data: data.expenses.map(expense => [
        expense.title || '-',
        new Date(expense.expense_date).toLocaleDateString('ar-DZ'),
        expense.category || '-',
        expense.amount?.toFixed(2) || '0.00',
        getPaymentMethodText(expense.payment_method),
        expense.description || '-'
      ]),
      formatting: {
        columnWidths: [20, 12, 15, 12, 15, 30],
        headerStyle: {
          fill: {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFEF4444' } // أحمر للمصروفات
          }
        }
      }
    });
  }

  return exportToExcel({
    filename: 'التقرير_المالي_الشامل',
    sheets,
    organizationName: data.organizationName
  });
}

/**
 * تصدير تقرير المبيعات فقط
 */
export async function exportSalesReportToExcel(
  sales: any[],
  organizationName?: string
): Promise<ExcelExportResult> {
  return exportToExcel({
    filename: 'تقرير_المبيعات',
    organizationName,
    sheets: [
      {
        name: 'المبيعات',
        headers: [
          'رقم الطلب',
          'التاريخ',
          'العميل',
          'الإجمالي',
          'الخصم',
          'الضريبة',
          'الصافي',
          'حالة الدفع',
          'طريقة الدفع',
          'الحالة'
        ],
        data: sales.map(order => [
          order.id || order.customer_order_number || '-',
          new Date(order.created_at).toLocaleDateString('ar-DZ'),
          order.customer?.name || 'زبون عابر',
          order.subtotal?.toFixed(2) || '0.00',
          order.discount?.toFixed(2) || '0.00',
          order.tax?.toFixed(2) || '0.00',
          order.total?.toFixed(2) || '0.00',
          getPaymentStatusText(order.payment_status),
          getPaymentMethodText(order.payment_method),
          getOrderStatusText(order.status)
        ]),
        formatting: {
          columnWidths: [15, 12, 20, 12, 10, 10, 12, 15, 15, 12]
        }
      }
    ]
  });
}

/**
 * تصدير تقرير المنتجات
 */
export async function exportProductsReportToExcel(
  products: any[],
  organizationName?: string
): Promise<ExcelExportResult> {
  return exportToExcel({
    filename: 'تقرير_المنتجات',
    organizationName,
    sheets: [
      {
        name: 'المنتجات',
        headers: [
          'الاسم',
          'رمز المنتج',
          'الباركود',
          'الفئة',
          'السعر',
          'سعر الشراء',
          'الكمية',
          'الحد الأدنى',
          'القيمة',
          'الحالة'
        ],
        data: products.map(product => [
          product.name || '-',
          product.sku || '-',
          product.barcode || '-',
          product.category || '-',
          product.price?.toFixed(2) || '0.00',
          product.purchase_price?.toFixed(2) || '-',
          product.stock_quantity || 0,
          product.min_stock_level || 5,
          ((product.stock_quantity || 0) * (product.price || 0)).toFixed(2),
          product.is_active ? 'نشط' : 'غير نشط'
        ]),
        formatting: {
          columnWidths: [25, 15, 15, 15, 10, 12, 10, 10, 12, 10]
        }
      }
    ]
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
