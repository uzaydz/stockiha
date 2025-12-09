/**
 * ThermalReceipt - Apple-Style Minimalist Thermal Receipt
 *
 * تصميم مينيماليست بأسلوب Apple للطابعات الحرارية
 * يدعم مقاسات: 58mm, 80mm
 * متوافق مع Tauri للطباعة الصامتة
 */

import { forwardRef, useImperativeHandle } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import type { POSSettings } from '@/types/posSettings';
import { thermalPrintService } from '@/services/ThermalPrintService';
// ⚡ نظام الطباعة الموحد
import { usePrinter } from '@/hooks/usePrinter';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
  variant?: string;
}

interface ReceiptData {
  orderId: string;
  orderNumber?: number;
  items: ReceiptItem[];
  subtotal: number;
  discount?: number;
  discountAmount?: number;
  tax?: number;
  taxAmount?: number;
  total: number;
  amountPaid?: number;
  change?: number;
  remaining?: number;
  customerName?: string;
  employeeName?: string;
  paymentMethod?: string;
  notes?: string;
}

interface OrganizationInfo {
  name?: string;
  logo?: string;
  phone?: string;
  email?: string;
  address?: string;
  activity?: string;
  rc?: string;
  nif?: string;
}

interface ThermalReceiptProps {
  data: ReceiptData;
  organization?: OrganizationInfo | null;
  settings?: Partial<POSSettings> | null;
  language?: 'ar' | 'fr' | 'en';
}

export interface ThermalReceiptRef {
  print: () => Promise<void>;
  getHTML: () => string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Translations
// ═══════════════════════════════════════════════════════════════════════════

const translations = {
  ar: {
    receipt: 'إيصال',
    order: 'طلب',
    date: 'التاريخ',
    time: 'الوقت',
    cashier: 'البائع',
    customer: 'العميل',
    walkIn: 'زبون',
    item: 'المنتج',
    qty: 'الكمية',
    price: 'السعر',
    subtotal: 'المجموع',
    discount: 'الخصم',
    tax: 'الضريبة',
    total: 'الإجمالي',
    paid: 'المدفوع',
    change: 'الباقي',
    remaining: 'المتبقي',
    cash: 'نقداً',
    card: 'بطاقة',
    thanks: 'شكراً لزيارتكم',
    comeback: 'في انتظار عودتكم',
  },
  fr: {
    receipt: 'Reçu',
    order: 'Commande',
    date: 'Date',
    time: 'Heure',
    cashier: 'Caissier',
    customer: 'Client',
    walkIn: 'Client',
    item: 'Article',
    qty: 'Qté',
    price: 'Prix',
    subtotal: 'Sous-total',
    discount: 'Remise',
    tax: 'TVA',
    total: 'Total',
    paid: 'Payé',
    change: 'Rendu',
    remaining: 'Reste',
    cash: 'Espèces',
    card: 'Carte',
    thanks: 'Merci de votre visite',
    comeback: 'À bientôt',
  },
  en: {
    receipt: 'Receipt',
    order: 'Order',
    date: 'Date',
    time: 'Time',
    cashier: 'Cashier',
    customer: 'Customer',
    walkIn: 'Guest',
    item: 'Item',
    qty: 'Qty',
    price: 'Price',
    subtotal: 'Subtotal',
    discount: 'Discount',
    tax: 'Tax',
    total: 'Total',
    paid: 'Paid',
    change: 'Change',
    remaining: 'Balance',
    cash: 'Cash',
    card: 'Card',
    thanks: 'Thank you for visiting',
    comeback: 'See you soon',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════

const ThermalReceipt = forwardRef<ThermalReceiptRef, ThermalReceiptProps>(
  ({ data, organization, settings, language = 'ar' }, ref) => {
    const t = translations[language];
    const isRTL = language === 'ar';

    // ⚡ نظام الطباعة الموحد
    const { printHtml, isElectron: isElectronPrint, settings: printerSettings } = usePrinter();

    // إعدادات الورق
    const paperWidth = settings?.paper_width || 58; // 58mm or 80mm
    const fontSize = settings?.font_size || 11;
    const lineSpacing = settings?.line_spacing || 1.3;
    const currencySymbol = settings?.currency_symbol || 'د.ج';
    const showLogo = settings?.show_store_logo ?? true;
    const showQR = settings?.show_qr_code ?? false;

    // حساب عرض الورق بالبكسل (1mm ≈ 2.83px at 72dpi, نستخدم 2px للبساطة)
    const paperWidthPx = paperWidth === 80 ? 302 : 218; // 80mm = 302px, 58mm = 218px

    // تنسيق العملة
    const formatCurrency = (amount: number) => {
      const formatted = new Intl.NumberFormat('ar-DZ', {
        maximumFractionDigits: 0,
      }).format(amount);
      return `${formatted} ${currencySymbol}`;
    };

    // تنسيق التاريخ
    const formatDate = () => format(new Date(), 'dd/MM/yyyy', { locale: ar });
    const formatTime = () => format(new Date(), 'HH:mm');

    // ⚡ إنشاء HTML للإيصال - تصميم Apple مينيماليست
    const generateReceiptHTML = (): string => {
      const itemsHTML = data.items.map(item => `
        <div class="item">
          <div class="item-name">
            ${item.name}
            ${item.variant ? `<span class="variant">${item.variant}</span>` : ''}
          </div>
          <div class="item-details">
            <span class="qty">${item.quantity}x</span>
            <span class="price">${formatCurrency(item.total)}</span>
          </div>
        </div>
      `).join('');

      return `
<!DOCTYPE html>
<html dir="${isRTL ? 'rtl' : 'ltr'}" lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt #${data.orderNumber || data.orderId}</title>
  <style>
    /* Reset & Base - Apple Design Philosophy */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    @page {
      size: ${paperWidth}mm auto;
      margin: 0;
    }

    @media print {
      html, body {
        width: ${paperWidth}mm;
        margin: 0;
        padding: 0;
      }
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif;
      font-size: ${fontSize}px;
      line-height: ${lineSpacing};
      color: #000;
      background: #fff;
      width: ${paperWidthPx}px;
      margin: 0 auto;
      padding: 12px 8px;
      direction: ${isRTL ? 'rtl' : 'ltr'};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Header - Minimalist Apple Style */
    .header {
      text-align: center;
      padding-bottom: 12px;
      border-bottom: 1px dashed #ccc;
      margin-bottom: 12px;
    }

    .logo {
      width: 48px;
      height: 48px;
      margin: 0 auto 8px;
      border-radius: 10px;
      object-fit: contain;
    }

    .store-name {
      font-size: ${fontSize + 4}px;
      font-weight: 600;
      letter-spacing: -0.3px;
      margin-bottom: 2px;
    }

    .store-info {
      font-size: ${fontSize - 2}px;
      color: #666;
      line-height: 1.4;
    }

    /* Meta Info - Clean Grid */
    .meta {
      display: flex;
      justify-content: space-between;
      font-size: ${fontSize - 1}px;
      color: #444;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
      margin-bottom: 10px;
    }

    .meta-item {
      text-align: center;
    }

    .meta-label {
      font-size: ${fontSize - 2}px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .meta-value {
      font-weight: 500;
      margin-top: 2px;
    }

    .order-number {
      font-size: ${fontSize + 2}px;
      font-weight: 700;
      text-align: center;
      padding: 8px 0;
      background: #f5f5f7;
      border-radius: 6px;
      margin-bottom: 12px;
    }

    /* Items - Elegant List */
    .items {
      margin-bottom: 12px;
    }

    .item {
      padding: 6px 0;
      border-bottom: 1px solid #f0f0f0;
    }

    .item:last-child {
      border-bottom: none;
    }

    .item-name {
      font-weight: 500;
      margin-bottom: 2px;
    }

    .variant {
      font-size: ${fontSize - 2}px;
      color: #666;
      font-weight: 400;
      margin-${isRTL ? 'right' : 'left'}: 4px;
    }

    .item-details {
      display: flex;
      justify-content: space-between;
      font-size: ${fontSize - 1}px;
      color: #666;
    }

    .qty {
      color: #888;
    }

    .price {
      font-weight: 500;
      color: #000;
    }

    /* Totals - Bold & Clear */
    .totals {
      border-top: 1px dashed #ccc;
      padding-top: 10px;
      margin-top: 4px;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
      font-size: ${fontSize}px;
    }

    .total-row.subtotal {
      color: #666;
    }

    .total-row.discount {
      color: #34c759;
    }

    .total-row.grand {
      font-size: ${fontSize + 3}px;
      font-weight: 700;
      padding: 10px 0 6px;
      border-top: 2px solid #000;
      margin-top: 6px;
    }

    .total-row.paid {
      color: #007aff;
    }

    .total-row.remaining {
      color: #ff3b30;
      font-weight: 600;
    }

    .total-row.change {
      color: #34c759;
      font-weight: 500;
    }

    /* Payment Info */
    .payment-info {
      text-align: center;
      padding: 8px 0;
      margin-top: 8px;
      background: #f5f5f7;
      border-radius: 6px;
      font-size: ${fontSize - 1}px;
    }

    /* Footer - Graceful */
    .footer {
      text-align: center;
      padding-top: 14px;
      margin-top: 12px;
      border-top: 1px dashed #ccc;
    }

    .thanks {
      font-size: ${fontSize + 1}px;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .comeback {
      font-size: ${fontSize - 1}px;
      color: #666;
    }

    .timestamp {
      font-size: ${fontSize - 2}px;
      color: #999;
      margin-top: 10px;
    }

    /* Divider */
    .divider {
      border: none;
      border-top: 1px dashed #ccc;
      margin: 10px 0;
    }

    /* QR Code placeholder */
    .qr-code {
      text-align: center;
      margin: 10px 0;
    }

    .qr-code img {
      width: 64px;
      height: 64px;
    }

    /* Cut line indicator */
    .cut-line {
      text-align: center;
      font-size: 8px;
      color: #ccc;
      margin-top: 16px;
      letter-spacing: 2px;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    ${showLogo && organization?.logo ? `<img src="${organization.logo}" alt="" class="logo">` : ''}
    <div class="store-name">${organization?.name || settings?.store_name || ''}</div>
    ${organization?.phone || organization?.address ? `
      <div class="store-info">
        ${organization?.phone ? `<div>${organization.phone}</div>` : ''}
        ${organization?.address ? `<div>${organization.address}</div>` : ''}
      </div>
    ` : ''}
  </div>

  <!-- Order Number -->
  <div class="order-number">
    #${data.orderNumber || data.orderId.slice(-6)}
  </div>

  <!-- Meta Info -->
  <div class="meta">
    <div class="meta-item">
      <div class="meta-label">${t.date}</div>
      <div class="meta-value">${formatDate()}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">${t.time}</div>
      <div class="meta-value">${formatTime()}</div>
    </div>
    ${data.employeeName ? `
      <div class="meta-item">
        <div class="meta-label">${t.cashier}</div>
        <div class="meta-value">${data.employeeName}</div>
      </div>
    ` : ''}
  </div>

  ${data.customerName ? `
    <div class="payment-info">
      ${t.customer}: <strong>${data.customerName}</strong>
    </div>
  ` : ''}

  <!-- Items -->
  <div class="items">
    ${itemsHTML}
  </div>

  <!-- Totals -->
  <div class="totals">
    <div class="total-row subtotal">
      <span>${t.subtotal}</span>
      <span>${formatCurrency(data.subtotal)}</span>
    </div>

    ${data.discountAmount && data.discountAmount > 0 ? `
      <div class="total-row discount">
        <span>${t.discount}${data.discount ? ` (${data.discount}%)` : ''}</span>
        <span>-${formatCurrency(data.discountAmount)}</span>
      </div>
    ` : ''}

    ${data.taxAmount && data.taxAmount > 0 ? `
      <div class="total-row">
        <span>${t.tax}${data.tax ? ` (${data.tax}%)` : ''}</span>
        <span>${formatCurrency(data.taxAmount)}</span>
      </div>
    ` : ''}

    <div class="total-row grand">
      <span>${t.total}</span>
      <span>${formatCurrency(data.total)}</span>
    </div>

    ${data.amountPaid !== undefined ? `
      <div class="total-row paid">
        <span>${t.paid}</span>
        <span>${formatCurrency(data.amountPaid)}</span>
      </div>
    ` : ''}

    ${data.change && data.change > 0 ? `
      <div class="total-row change">
        <span>${t.change}</span>
        <span>${formatCurrency(data.change)}</span>
      </div>
    ` : ''}

    ${data.remaining && data.remaining > 0 ? `
      <div class="total-row remaining">
        <span>${t.remaining}</span>
        <span>${formatCurrency(data.remaining)}</span>
      </div>
    ` : ''}
  </div>

  ${data.paymentMethod ? `
    <div class="payment-info">
      ${data.paymentMethod === 'cash' ? t.cash : data.paymentMethod === 'card' ? t.card : data.paymentMethod}
    </div>
  ` : ''}

  ${data.notes ? `
    <hr class="divider">
    <div style="font-size: ${fontSize - 1}px; color: #666; text-align: center;">
      ${data.notes}
    </div>
  ` : ''}

  <!-- Footer -->
  <div class="footer">
    <div class="thanks">${settings?.welcome_message || t.thanks}</div>
    <div class="comeback">${settings?.receipt_footer_text || t.comeback}</div>
    <div class="timestamp">${formatDate()} ${formatTime()}</div>
  </div>

  <!-- Cut line -->
  <div class="cut-line">- - - - - - - - - - - -</div>
</body>
</html>
      `;
    };

    // ⚡ طباعة الإيصال باستخدام نظام الطباعة الموحد
    const handlePrint = async (): Promise<void> => {
      console.log('[ThermalReceipt] بدء الطباعة...');

      const receiptHTML = generateReceiptHTML();

      // ⚡ محاولة الطباعة المباشرة عبر Electron أولاً
      if (isElectronPrint) {
        try {
          console.log('[ThermalReceipt] محاولة الطباعة المباشرة عبر Electron...');

          const result = await printHtml(receiptHTML, {
            silent: printerSettings?.silent_print ?? true,
            pageSize: `${paperWidth}mm`,
          });

          if (result.success) {
            console.log('[ThermalReceipt] تمت الطباعة المباشرة بنجاح');
            toast.success('تم إرسال الإيصال للطابعة');
            return;
          } else {
            console.warn('[ThermalReceipt] فشلت الطباعة المباشرة:', result.error);
          }
        } catch (err) {
          console.warn('[ThermalReceipt] خطأ في الطباعة المباشرة:', err);
        }
      }

      // ⚡ التراجع إلى thermalPrintService القديم
      try {
        const result = await thermalPrintService.print({
          html: receiptHTML,
          settings: settings || {},
          copies: settings?.print_copies || 1,
        });

        if (result.success) {
          console.log(`[ThermalReceipt] الطباعة نجحت عبر: ${result.method}`);
          toast.success(
            result.method === 'tauri-silent'
              ? 'تم إرسال الإيصال للطابعة'
              : 'تم فتح نافذة الطباعة'
          );
        } else {
          console.error('[ThermalReceipt] فشل الطباعة:', result.error);
          toast.error(result.error || 'حدث خطأ في الطباعة');
        }
      } catch (error) {
        console.error('[ThermalReceipt] خطأ غير متوقع:', error);
        toast.error('حدث خطأ في الطباعة');
      }
    };

    // Expose methods
    useImperativeHandle(ref, () => ({
      print: handlePrint,
      getHTML: generateReceiptHTML,
    }));

    // لا نعرض شيء - المكون للطباعة فقط
    return null;
  }
);

ThermalReceipt.displayName = 'ThermalReceipt';

export default ThermalReceipt;
