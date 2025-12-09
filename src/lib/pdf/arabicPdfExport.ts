/**
 * Arabic PDF Export Utility
 *
 * يدعم تصدير PDF بالعربية باستخدام HTML للطباعة
 * يتجاوز مشاكل jsPDF مع اللغات RTL
 */

import { format } from 'date-fns';

export interface POSOrderForExport {
  id: string;
  customer_order_number?: number;
  slug?: string;
  customer?: { name: string };
  employee?: { name: string };
  items_count: number;
  status: string;
  payment_status: string;
  total: number;
  amount_paid?: number;
  created_at: string;
}

export interface ExportFilters {
  status?: string;
  payment_status?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

// ترجمات الحالات
const STATUS_MAP: Record<string, string> = {
  completed: 'مكتمل',
  pending: 'معلق',
  cancelled: 'ملغي',
  processing: 'قيد المعالجة'
};

const PAYMENT_MAP: Record<string, string> = {
  paid: 'مدفوع',
  unpaid: 'غير مدفوع',
  partial: 'مدفوع جزئياً'
};

/**
 * إنشاء HTML للتقرير بالعربية
 */
function generateReportHTML(
  orders: POSOrderForExport[],
  filters: ExportFilters = {}
): string {
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalPaid = orders.reduce((sum, o) => sum + (o.amount_paid || 0), 0);
  const totalRemaining = totalRevenue - totalPaid;
  const reportDate = format(new Date(), 'yyyy-MM-dd HH:mm');

  // معلومات الفلترة
  const getFilterInfo = () => {
    const parts: string[] = [];
    if (filters.status) {
      parts.push(`الحالة: ${STATUS_MAP[filters.status] || filters.status}`);
    }
    if (filters.payment_status) {
      parts.push(`الدفع: ${PAYMENT_MAP[filters.payment_status] || filters.payment_status}`);
    }
    if (filters.date_from && filters.date_to) {
      parts.push(`الفترة: ${filters.date_from} إلى ${filters.date_to}`);
    }
    return parts.length > 0 ? parts.join(' | ') : 'جميع الطلبيات';
  };

  // تنسيق العملة
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-DZ', { maximumFractionDigits: 0 }).format(amount);
  };

  // إنشاء صفوف الجدول
  const tableRows = orders.map(order => {
    const total = order.total || 0;
    const paid = order.amount_paid || 0;
    const remaining = total - paid;

    return `
      <tr>
        <td class="order-num">${order.customer_order_number || order.slug?.slice(-6) || order.id.slice(-6)}</td>
        <td class="customer">${order.customer?.name || 'زبون عابر'}</td>
        <td class="employee">${order.employee?.name || '—'}</td>
        <td class="items">${order.items_count || 0}</td>
        <td class="status"><span class="badge badge-${order.status}">${STATUS_MAP[order.status] || order.status}</span></td>
        <td class="payment"><span class="badge badge-${order.payment_status}">${PAYMENT_MAP[order.payment_status] || order.payment_status}</span></td>
        <td class="amount">${formatCurrency(total)}</td>
        <td class="amount paid">${formatCurrency(paid)}</td>
        <td class="amount ${remaining > 0 ? 'remaining' : ''}">${remaining > 0 ? formatCurrency(remaining) : '—'}</td>
        <td class="date">${format(new Date(order.created_at), 'yyyy-MM-dd HH:mm')}</td>
      </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تقرير طلبيات نقطة البيع</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    @page {
      size: A4 landscape;
      margin: 10mm;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      background: #fff;
      color: #111;
      font-size: 12px;
      line-height: 1.5;
      direction: rtl;
    }

    .container {
      max-width: 100%;
      margin: 0 auto;
      padding: 20px;
    }

    /* Header */
    .header {
      background: linear-gradient(135deg, #18181b 0%, #27272a 100%);
      color: #fff;
      padding: 24px 32px;
      border-radius: 12px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-title {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .header-subtitle {
      font-size: 13px;
      opacity: 0.85;
    }

    .header-stats {
      text-align: left;
      background: rgba(255,255,255,0.1);
      padding: 12px 20px;
      border-radius: 8px;
    }

    .header-stats div {
      font-size: 13px;
      margin-bottom: 4px;
    }

    .header-stats strong {
      font-size: 16px;
      color: #4ade80;
    }

    /* Info Bar */
    .info-bar {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 20px;
    }

    .info-card {
      background: #f4f4f5;
      padding: 14px 18px;
      border-radius: 10px;
      border: 1px solid #e4e4e7;
    }

    .info-card-label {
      font-size: 11px;
      color: #71717a;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .info-card-value {
      font-size: 15px;
      font-weight: 700;
      color: #18181b;
    }

    .info-card-value.green { color: #16a34a; }
    .info-card-value.amber { color: #d97706; }
    .info-card-value.red { color: #dc2626; }

    /* Table */
    .table-container {
      background: #fff;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #e4e4e7;
      margin-bottom: 20px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    thead {
      background: #18181b;
      color: #fff;
    }

    th {
      padding: 14px 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      text-align: center;
      letter-spacing: 0.3px;
    }

    td {
      padding: 12px;
      text-align: center;
      border-bottom: 1px solid #f4f4f5;
      font-size: 12px;
    }

    tr:nth-child(even) {
      background: #fafafa;
    }

    tr:hover {
      background: #f4f4f5;
    }

    .order-num {
      font-weight: 700;
      color: #18181b;
    }

    .customer {
      font-weight: 500;
      text-align: right;
      padding-right: 16px;
    }

    .employee {
      color: #71717a;
      font-size: 11px;
    }

    .items {
      font-weight: 600;
    }

    .amount {
      font-weight: 600;
      font-family: 'Courier New', monospace;
    }

    .amount.paid {
      color: #16a34a;
    }

    .amount.remaining {
      color: #dc2626;
    }

    .date {
      font-size: 11px;
      color: #52525b;
      direction: ltr;
    }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 600;
    }

    .badge-completed { background: #dcfce7; color: #166534; }
    .badge-pending { background: #fef3c7; color: #92400e; }
    .badge-cancelled { background: #f4f4f5; color: #52525b; }
    .badge-processing { background: #dbeafe; color: #1e40af; }

    .badge-paid { background: #dcfce7; color: #166534; }
    .badge-unpaid { background: #fee2e2; color: #991b1b; }
    .badge-partial { background: #fef3c7; color: #92400e; }

    /* Summary */
    .summary {
      background: linear-gradient(135deg, #18181b 0%, #27272a 100%);
      color: #fff;
      padding: 20px 32px;
      border-radius: 12px;
      display: flex;
      justify-content: space-around;
      align-items: center;
    }

    .summary-item {
      text-align: center;
    }

    .summary-label {
      font-size: 12px;
      opacity: 0.85;
      margin-bottom: 4px;
    }

    .summary-value {
      font-size: 20px;
      font-weight: 700;
    }

    .summary-value.green { color: #4ade80; }
    .summary-value.amber { color: #fbbf24; }
    .summary-value.red { color: #f87171; }

    /* Footer */
    .footer {
      text-align: center;
      padding: 16px;
      color: #71717a;
      font-size: 11px;
      border-top: 1px solid #e4e4e7;
      margin-top: 20px;
    }

    @media print {
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      .container {
        padding: 0;
      }

      .header, .summary {
        -webkit-print-color-adjust: exact !important;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div>
        <div class="header-title">تقرير طلبيات نقطة البيع</div>
        <div class="header-subtitle">تاريخ التقرير: ${reportDate} | ${getFilterInfo()}</div>
      </div>
      <div class="header-stats">
        <div>عدد الطلبيات: <strong>${orders.length}</strong></div>
        <div>إجمالي الإيرادات: <strong>${formatCurrency(totalRevenue)} د.ج</strong></div>
      </div>
    </div>

    <!-- Info Cards -->
    <div class="info-bar">
      <div class="info-card">
        <div class="info-card-label">إجمالي الإيرادات</div>
        <div class="info-card-value">${formatCurrency(totalRevenue)} د.ج</div>
      </div>
      <div class="info-card">
        <div class="info-card-label">المبالغ المدفوعة</div>
        <div class="info-card-value green">${formatCurrency(totalPaid)} د.ج</div>
      </div>
      <div class="info-card">
        <div class="info-card-label">المبالغ المتبقية</div>
        <div class="info-card-value ${totalRemaining > 0 ? 'red' : ''}">${formatCurrency(totalRemaining)} د.ج</div>
      </div>
      <div class="info-card">
        <div class="info-card-label">عدد الطلبيات</div>
        <div class="info-card-value">${orders.length}</div>
      </div>
    </div>

    <!-- Table -->
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>رقم</th>
            <th>العميل</th>
            <th>الموظف</th>
            <th>المنتجات</th>
            <th>الحالة</th>
            <th>الدفع</th>
            <th>الإجمالي</th>
            <th>المدفوع</th>
            <th>المتبقي</th>
            <th>التاريخ</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>

    <!-- Summary -->
    <div class="summary">
      <div class="summary-item">
        <div class="summary-label">إجمالي الإيرادات</div>
        <div class="summary-value">${formatCurrency(totalRevenue)} د.ج</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">المدفوع</div>
        <div class="summary-value green">${formatCurrency(totalPaid)} د.ج</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">المتبقي</div>
        <div class="summary-value ${totalRemaining > 0 ? 'red' : ''}">${formatCurrency(totalRemaining)} د.ج</div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      تم إنشاء هذا التقرير تلقائياً بواسطة نظام نقطة البيع | ${reportDate}
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * تصدير طلبيات POS إلى PDF بالعربية عبر الطباعة
 */
export async function exportOrdersToPdfArabic(
  orders: POSOrderForExport[],
  filters: ExportFilters = {},
  onProgress?: (message: string) => void
): Promise<void> {
  onProgress?.('جاري إنشاء التقرير...');

  const html = generateReportHTML(orders, filters);

  // فتح نافذة جديدة للطباعة
  const printWindow = window.open('', '_blank', 'width=1200,height=800');

  if (!printWindow) {
    throw new Error('فشل في فتح نافذة الطباعة. تأكد من السماح بالنوافذ المنبثقة.');
  }

  printWindow.document.write(html);
  printWindow.document.close();

  // انتظار تحميل المحتوى
  await new Promise(resolve => setTimeout(resolve, 500));

  // طباعة
  printWindow.print();
}

/**
 * تصدير مع دعم Tauri (طباعة مباشرة)
 */
export async function exportAndSavePdf(
  orders: POSOrderForExport[],
  filters: ExportFilters = {},
  onProgress?: (message: string) => void
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    await exportOrdersToPdfArabic(orders, filters, onProgress);
    return { success: true };
  } catch (error) {
    console.error('PDF export error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطأ في تصدير PDF'
    };
  }
}
