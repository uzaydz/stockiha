import { forwardRef, useImperativeHandle } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Product } from '@/types';
import { isTauriApp } from '@/lib/platform';
import { toast } from 'sonner';

interface CartItem {
  product: Product;
  quantity: number;
  wholesalePrice?: number | null;
  isWholesale?: boolean;
  colorId?: string;
  colorName?: string;
  colorCode?: string;
  sizeId?: string;
  sizeName?: string;
  variantPrice?: number;
  variantImage?: string;
}

interface OrganizationInfo {
  name?: string;
  logo?: string;
  phone?: string;
  email?: string;
  address?: string;
}

interface PrintInvoiceFromPOSProps {
  orderId: string;
  items: CartItem[];
  subtotal: number;
  total: number;
  customerName?: string;
  discount?: number;
  discountAmount?: number;
  amountPaid?: number;
  remainingAmount?: number;
  isPartialPayment?: boolean;
  language?: 'ar' | 'fr' | 'en';
  organization?: OrganizationInfo | null;
}

export interface PrintInvoiceFromPOSRef {
  print: () => void;
}

// Minimal color palette
const colors = {
  primary: '#111827',
  secondary: '#4b5563',
  muted: '#9ca3af',
  light: '#f3f4f6',
  border: '#e5e7eb',
  white: '#ffffff',
};

const translations = {
  ar: {
    invoice: 'فاتورة',
    invoiceNumber: 'رقم الفاتورة',
    invoiceDate: 'تاريخ الإصدار',
    from: 'من',
    to: 'إلى',
    customer: 'العميل',
    designation: 'التسمية',
    quantity: 'الكمية',
    unitPrice: 'سعر الوحدة',
    amount: 'المبلغ',
    subtotal: 'المجموع الفرعي',
    discount: 'الخصم',
    grandTotal: 'المبلغ الإجمالي',
    amountPaid: 'المبلغ المدفوع',
    remaining: 'المتبقي',
    phone: 'الهاتف',
    email: 'البريد',
    address: 'العنوان',
    thankYou: 'شكراً لتعاملكم معنا',
    signature: 'التوقيع',
    walkInCustomer: 'عميل زائر',
    partialPayment: 'دفع جزئي',
    fullPayment: 'مدفوع بالكامل',
    status: 'الحالة',
  },
  fr: {
    invoice: 'Facture',
    invoiceNumber: 'N° Facture',
    invoiceDate: 'Date d\'émission',
    from: 'De',
    to: 'À',
    customer: 'Client',
    designation: 'Désignation',
    quantity: 'Qté',
    unitPrice: 'Prix unitaire',
    amount: 'Montant',
    subtotal: 'Sous-total',
    discount: 'Remise',
    grandTotal: 'Montant Total',
    amountPaid: 'Montant payé',
    remaining: 'Reste',
    phone: 'Téléphone',
    email: 'Email',
    address: 'Adresse',
    thankYou: 'Merci de votre confiance',
    signature: 'Signature',
    walkInCustomer: 'Client de passage',
    partialPayment: 'Paiement partiel',
    fullPayment: 'Payé intégralement',
    status: 'Statut',
  },
  en: {
    invoice: 'Invoice',
    invoiceNumber: 'Invoice No.',
    invoiceDate: 'Issue Date',
    from: 'From',
    to: 'To',
    customer: 'Customer',
    designation: 'Designation',
    quantity: 'Qty',
    unitPrice: 'Unit Price',
    amount: 'Amount',
    subtotal: 'Subtotal',
    discount: 'Discount',
    grandTotal: 'Grand Total',
    amountPaid: 'Amount Paid',
    remaining: 'Remaining',
    phone: 'Phone',
    email: 'Email',
    address: 'Address',
    thankYou: 'Thank you for your business',
    signature: 'Signature',
    walkInCustomer: 'Walk-in Customer',
    partialPayment: 'Partial Payment',
    fullPayment: 'Paid in Full',
    status: 'Status',
  },
};

const PrintInvoiceFromPOS = forwardRef<PrintInvoiceFromPOSRef, PrintInvoiceFromPOSProps>(
  (
    {
      orderId,
      items,
      subtotal,
      total,
      customerName,
      discount = 0,
      discountAmount = 0,
      amountPaid = 0,
      remainingAmount = 0,
      isPartialPayment = false,
      language = 'ar',
      organization,
    },
    ref
  ) => {
    const t = translations[language];
    const isRTL = language === 'ar';

    const formatDate = (date: Date) => {
      return format(date, 'dd/MM/yyyy', { locale: ar });
    };

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('fr-DZ', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount) + ' DA';
    };

    // إنشاء محتوى الفاتورة HTML
    const generateInvoiceHTML = () => {
      const itemsHTML = items.map((item, index) => {
        const unitPrice = item.variantPrice || item.wholesalePrice || item.product.price;
        const itemTotal = unitPrice * item.quantity;
        const bgColor = index % 2 === 0 ? colors.white : colors.light;

        return `
          <tr style="background-color: ${bgColor}; border-bottom: 1px solid ${colors.border};">
            <td style="padding: 12px 14px; text-align: ${isRTL ? 'right' : 'left'};">
              <div style="font-weight: 600; color: ${colors.primary}; margin-bottom: 2px;">
                ${item.product.name}
              </div>
              ${(item.colorName || item.sizeName) ? `
                <div style="font-size: 10px; color: ${colors.secondary};">
                  ${item.colorName ? item.colorName : ''}${item.colorName && item.sizeName ? ' - ' : ''}${item.sizeName ? item.sizeName : ''}
                </div>
              ` : ''}
            </td>
            <td style="padding: 12px 10px; text-align: center; font-weight: 600; color: ${colors.primary};">
              ${item.quantity}
            </td>
            <td style="padding: 12px 10px; text-align: center; color: ${colors.secondary}; font-size: 11px;">
              ${formatCurrency(unitPrice)}
            </td>
            <td style="padding: 12px 14px; text-align: ${isRTL ? 'left' : 'right'}; font-weight: 700; color: ${colors.primary}; font-size: 12px;">
              ${formatCurrency(itemTotal)}
            </td>
          </tr>
        `;
      }).join('');

      return `
        <div style="font-family: 'Segoe UI', 'Arial', sans-serif; background: ${colors.white}; color: ${colors.primary}; font-size: 13px; line-height: 1.5; direction: ${isRTL ? 'rtl' : 'ltr'}; max-width: 800px; margin: 0 auto;">
          <!-- Header -->
          <div style="background-color: ${colors.primary}; padding: 24px 32px; color: ${colors.white};">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 20px;">
              <!-- Logo & Company Info -->
              <div style="display: flex; align-items: flex-start; gap: 16px;">
                ${organization?.logo ? `
                  <img
                    src="${organization.logo}"
                    alt="Logo"
                    style="height: 60px; width: 60px; object-fit: contain; background-color: ${colors.white}; border-radius: 6px; padding: 6px;"
                  />
                ` : `
                  <div style="height: 60px; width: 60px; background-color: rgba(255,255,255,0.1); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; border: 2px dashed rgba(255,255,255,0.3);">
                    LOGO
                  </div>
                `}
                <div>
                  <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 4px 0;">
                    ${organization?.name || 'Company Name'}
                  </h1>
                  <div style="font-size: 11px; opacity: 0.85; line-height: 1.5;">
                    ${organization?.phone ? `<div>${organization.phone}</div>` : ''}
                    ${organization?.email ? `<div>${organization.email}</div>` : ''}
                  </div>
                </div>
              </div>

              <!-- Invoice Title & Number -->
              <div style="text-align: ${isRTL ? 'left' : 'right'};">
                <div style="font-size: 28px; font-weight: 700; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px;">
                  ${t.invoice}
                </div>
                <div style="background-color: ${colors.white}; color: ${colors.primary}; padding: 8px 16px; border-radius: 4px; font-size: 14px; font-weight: 700; display: inline-block;">
                  ${orderId}
                </div>
              </div>
            </div>
          </div>

          <!-- Main Content -->
          <div style="padding: 24px 32px;">
            <!-- Info Section -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
              <!-- Company Info -->
              <div style="background-color: ${colors.light}; border-radius: 6px; padding: 16px; border: 1px solid ${colors.border};">
                <h3 style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: ${colors.secondary}; margin-bottom: 10px; letter-spacing: 0.5px;">
                  ${t.from}
                </h3>
                <div style="color: ${colors.primary};">
                  <div style="font-size: 14px; font-weight: 700; margin-bottom: 6px;">
                    ${organization?.name || '-'}
                  </div>
                  <div style="font-size: 12px; line-height: 1.6; color: ${colors.secondary};">
                    ${organization?.phone ? `<div>${t.phone}: ${organization.phone}</div>` : ''}
                    ${organization?.email ? `<div>${t.email}: ${organization.email}</div>` : ''}
                  </div>
                </div>
              </div>

              <!-- Customer Info -->
              <div style="background-color: ${colors.light}; border-radius: 6px; padding: 16px; border: 1px solid ${colors.border};">
                <h3 style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: ${colors.secondary}; margin-bottom: 10px; letter-spacing: 0.5px;">
                  ${t.to}
                </h3>
                <div style="color: ${colors.primary};">
                  <div style="font-size: 14px; font-weight: 700; margin-bottom: 6px;">
                    ${customerName || t.walkInCustomer}
                  </div>
                </div>
              </div>
            </div>

            <!-- Invoice Meta Info -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; background-color: ${colors.light}; padding: 14px 18px; border-radius: 6px; border: 1px solid ${colors.border};">
              <div>
                <span style="font-size: 10px; color: ${colors.muted}; text-transform: uppercase; font-weight: 600;">${t.invoiceNumber}</span>
                <div style="font-size: 13px; font-weight: 700; color: ${colors.primary}; margin-top: 2px;">${orderId}</div>
              </div>
              <div>
                <span style="font-size: 10px; color: ${colors.muted}; text-transform: uppercase; font-weight: 600;">${t.invoiceDate}</span>
                <div style="font-size: 13px; font-weight: 600; color: ${colors.primary}; margin-top: 2px;">${formatDate(new Date())}</div>
              </div>
              <div>
                <span style="font-size: 10px; color: ${colors.muted}; text-transform: uppercase; font-weight: 600;">${t.status}</span>
                <div style="margin-top: 2px;">
                  <span style="background-color: ${isPartialPayment ? colors.secondary : colors.primary}; color: ${colors.white}; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; display: inline-block;">
                    ${isPartialPayment ? t.partialPayment : t.fullPayment}
                  </span>
                </div>
              </div>
            </div>

            <!-- Items Table -->
            <div style="margin-bottom: 24px; border-radius: 6px; overflow: hidden; border: 1px solid ${colors.border};">
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background-color: ${colors.primary};">
                    <th style="padding: 12px 14px; text-align: ${isRTL ? 'right' : 'left'}; color: ${colors.white}; font-weight: 600; font-size: 11px; text-transform: uppercase;">
                      ${t.designation}
                    </th>
                    <th style="padding: 12px 10px; text-align: center; color: ${colors.white}; font-weight: 600; font-size: 11px;">
                      ${t.quantity}
                    </th>
                    <th style="padding: 12px 10px; text-align: center; color: ${colors.white}; font-weight: 600; font-size: 11px;">
                      ${t.unitPrice}
                    </th>
                    <th style="padding: 12px 14px; text-align: ${isRTL ? 'left' : 'right'}; color: ${colors.white}; font-weight: 600; font-size: 11px;">
                      ${t.amount}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHTML}
                </tbody>
              </table>
            </div>

            <!-- Totals Section -->
            <div style="display: flex; justify-content: flex-end; margin-bottom: 24px;">
              <div style="width: 320px;">
                <div style="background-color: ${colors.light}; border-radius: 6px; padding: 16px; border: 1px solid ${colors.border};">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px;">
                    <span style="color: ${colors.secondary};">${t.subtotal}</span>
                    <span style="font-weight: 600; color: ${colors.primary};">${formatCurrency(subtotal)}</span>
                  </div>
                  ${discountAmount > 0 ? `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px; color: ${colors.secondary};">
                      <span>${t.discount} (${discount}%)</span>
                      <span style="font-weight: 600;">- ${formatCurrency(discountAmount)}</span>
                    </div>
                  ` : ''}
                  <div style="border-top: 2px solid ${colors.primary}; padding-top: 12px; margin-top: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <span style="font-size: 13px; font-weight: 700; color: ${colors.primary};">${t.grandTotal}</span>
                      <span style="font-size: 18px; font-weight: 800; color: ${colors.primary};">
                        ${formatCurrency(total)}
                      </span>
                    </div>
                  </div>

                  ${isPartialPayment ? `
                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid ${colors.border};">
                      <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 12px;">
                        <span style="color: ${colors.secondary};">${t.amountPaid}</span>
                        <span style="font-weight: 600; color: #16a34a;">${formatCurrency(amountPaid)}</span>
                      </div>
                      <div style="display: flex; justify-content: space-between; font-size: 12px;">
                        <span style="color: ${colors.secondary};">${t.remaining}</span>
                        <span style="font-weight: 600; color: #d97706;">${formatCurrency(remainingAmount)}</span>
                      </div>
                    </div>
                  ` : ''}
                </div>
              </div>
            </div>

            <!-- Signature Section -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 24px;">
              <div style="text-align: center;">
                <h4 style="font-size: 11px; font-weight: 700; color: ${colors.secondary}; margin-bottom: 10px; text-transform: uppercase;">
                  ${t.signature}
                </h4>
                <div style="height: 60px; border: 2px dashed ${colors.border}; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: ${colors.muted}; font-size: 11px;"></div>
              </div>
              <div style="text-align: center;">
                <h4 style="font-size: 11px; font-weight: 700; color: ${colors.secondary}; margin-bottom: 10px; text-transform: uppercase;">
                  ${t.customer}
                </h4>
                <div style="height: 60px; border: 2px dashed ${colors.border}; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: ${colors.muted}; font-size: 11px;"></div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: ${colors.primary}; padding: 18px 32px; color: ${colors.white};">
            <div style="text-align: center;">
              <p style="font-size: 14px; font-weight: 600; margin-bottom: 4px;">
                ${t.thankYou}
              </p>
              <div style="font-size: 11px; opacity: 0.85; display: flex; justify-content: center; gap: 16px; flex-wrap: wrap;">
                ${organization?.phone ? `<span>${organization.phone}</span>` : ''}
                ${organization?.email ? `<span>${organization.email}</span>` : ''}
              </div>
            </div>
          </div>
        </div>
      `;
    };

    // ⚡ الطباعة باستخدام نفس آلية طباعة الباركود (Tauri compatible)
    const handlePrint = async () => {
      const printContainerId = 'invoice-print-container';
      console.log('[Invoice Print] بدء عملية الطباعة...');

      // إزالة container قديم إذا وجد
      const existingContainer = document.getElementById(printContainerId);
      if (existingContainer) {
        existingContainer.remove();
      }
      const existingStyles = document.getElementById('invoice-print-styles-temp');
      if (existingStyles) {
        existingStyles.remove();
      }

      // إنشاء container للطباعة
      const printContainer = document.createElement('div');
      printContainer.id = printContainerId;
      printContainer.innerHTML = generateInvoiceHTML();
      printContainer.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 99999; background: white; overflow: auto;';

      // إضافة styles للطباعة
      const printStyles = document.createElement('style');
      printStyles.id = 'invoice-print-styles-temp';
      printStyles.textContent = `
        @page {
          size: A4;
          margin: 10mm;
        }
        @media print {
          body > *:not(#${printContainerId}) { display: none !important; }
          #${printContainerId} {
            position: static !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }
          #${printContainerId} * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `;
      document.head.appendChild(printStyles);
      document.body.appendChild(printContainer);
      console.log('[Invoice Print] تم إنشاء container للطباعة');

      // انتظار تحميل المحتوى
      await new Promise(r => setTimeout(r, 500));

      // ⚡ محاولة استخدام Tauri API للطباعة
      if (isTauriApp()) {
        console.log('[Invoice Print] محاولة استخدام Tauri API...');
        try {
          const { getCurrentWebview } = await import('@tauri-apps/api/webview');
          const webview = getCurrentWebview();
          await webview.print();
          console.log('[Invoice Print] تم استدعاء Tauri print()');
          toast.success('تم فتح نافذة الطباعة');

          // إزالة العناصر بعد الطباعة
          setTimeout(() => {
            printContainer.remove();
            printStyles.remove();
          }, 2000);

          return;
        } catch (tauriError: any) {
          console.warn('[Invoice Print] Tauri API فشل:', tauriError.message, '- محاولة window.print');
        }
      }

      // ⚡ الطريقة البديلة: window.print
      console.log('[Invoice Print] استخدام window.print...');
      try {
        window.focus();
        window.print();
        console.log('[Invoice Print] تم استدعاء window.print()');
        toast.success('تم فتح نافذة الطباعة');

        // إزالة العناصر بعد الطباعة
        setTimeout(() => {
          printContainer.remove();
          printStyles.remove();
        }, 2000);
      } catch (error: any) {
        console.error('[Invoice Print Error]', error);
        printContainer.remove();
        printStyles.remove();
        toast.error(`خطأ في الطباعة: ${error.message}`);
      }
    };

    useImperativeHandle(ref, () => ({
      print: handlePrint,
    }));

    // لا نعرض أي شيء في الـ DOM - المكون للطباعة فقط
    return null;
  }
);

PrintInvoiceFromPOS.displayName = 'PrintInvoiceFromPOS';

export default PrintInvoiceFromPOS;
