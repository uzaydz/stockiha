import { forwardRef } from 'react';
import { format } from 'date-fns';
import { ar, fr, enUS } from 'date-fns/locale';
import type { Invoice } from '@/lib/api/invoices';

interface ProfessionalInvoiceTemplateProps {
  invoice: Invoice;
  language: 'ar' | 'fr' | 'en';
  organizationLogo?: string;
  organizationSettings?: {
    name: string;
    logo?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    taxNumber?: string;
    registrationNumber?: string;
    activity?: string;
    nis?: string;
    rib?: string;
  };
}

const translations = {
  ar: {
    invoice: 'فاتورة',
    invoiceNumber: 'رقم الفاتورة',
    invoiceDate: 'تاريخ الإصدار',
    dueDate: 'تاريخ الاستحقاق',
    billTo: 'فاتورة إلى',
    item: 'المنتج',
    quantity: 'الكمية',
    unitPrice: 'سعر الوحدة',
    amount: 'المبلغ',
    subtotal: 'المجموع الفرعي',
    tax: 'الضريبة',
    discount: 'الخصم',
    shipping: 'الشحن',
    grandTotal: 'الإجمالي',
    status: 'الحالة',
    paymentMethod: 'طريقة الدفع',
    notes: 'ملاحظات',
    paid: 'مدفوعة',
    pending: 'معلقة',
    overdue: 'متأخرة',
    canceled: 'ملغاة',
    cash: 'نقداً',
    card: 'بطاقة',
    bankTransfer: 'تحويل بنكي',
    other: 'أخرى',
    phone: 'الهاتف',
    email: 'البريد',
    sku: 'الرمز',
    thankYou: 'شكراً لتعاملكم معنا',
    rc: 'RC',
    nif: 'NIF',
    nis: 'NIS',
    rib: 'RIB',
  },
  fr: {
    invoice: 'Facture',
    invoiceNumber: 'N° Facture',
    invoiceDate: 'Date d\'émission',
    dueDate: 'Date d\'échéance',
    billTo: 'Facturer à',
    item: 'Article',
    quantity: 'Qté',
    unitPrice: 'Prix unitaire',
    amount: 'Montant',
    subtotal: 'Sous-total',
    tax: 'Taxe',
    discount: 'Remise',
    shipping: 'Livraison',
    grandTotal: 'Total',
    status: 'Statut',
    paymentMethod: 'Mode de paiement',
    notes: 'Remarques',
    paid: 'Payée',
    pending: 'En attente',
    overdue: 'En retard',
    canceled: 'Annulée',
    cash: 'Espèces',
    card: 'Carte',
    bankTransfer: 'Virement',
    other: 'Autre',
    phone: 'Téléphone',
    email: 'Email',
    sku: 'Réf',
    thankYou: 'Merci de votre confiance',
    rc: 'RC',
    nif: 'NIF',
    nis: 'NIS',
    rib: 'RIB',
  },
  en: {
    invoice: 'Invoice',
    invoiceNumber: 'Invoice No.',
    invoiceDate: 'Issue Date',
    dueDate: 'Due Date',
    billTo: 'Bill To',
    item: 'Item',
    quantity: 'Qty',
    unitPrice: 'Unit Price',
    amount: 'Amount',
    subtotal: 'Subtotal',
    tax: 'Tax',
    discount: 'Discount',
    shipping: 'Shipping',
    grandTotal: 'Total',
    status: 'Status',
    paymentMethod: 'Payment Method',
    notes: 'Notes',
    paid: 'Paid',
    pending: 'Pending',
    overdue: 'Overdue',
    canceled: 'Canceled',
    cash: 'Cash',
    card: 'Card',
    bankTransfer: 'Bank Transfer',
    other: 'Other',
    phone: 'Phone',
    email: 'Email',
    sku: 'SKU',
    thankYou: 'Thank you for your business',
    rc: 'RC',
    nif: 'NIF',
    nis: 'NIS',
    rib: 'RIB',
  },
};

const getLocale = (language: 'ar' | 'fr' | 'en') => {
  switch (language) {
    case 'ar': return ar;
    case 'fr': return fr;
    case 'en': return enUS;
    default: return ar;
  }
};

const ProfessionalInvoiceTemplate = forwardRef<HTMLDivElement, ProfessionalInvoiceTemplateProps>(
  ({ invoice, language, organizationLogo, organizationSettings }, ref) => {
    const t = translations[language];
    const locale = getLocale(language);
    const isRTL = language === 'ar';

    const formatDate = (date: string | undefined) => {
      if (!date) return '-';
      try {
        return format(new Date(date), 'dd MMM yyyy', { locale });
      } catch {
        return '-';
      }
    };

    const formatCurrency = (amount: number | undefined) => {
      if (amount === undefined || amount === null) return '-';
      return new Intl.NumberFormat('fr-DZ', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount) + ' DA';
    };

    const getStatusLabel = (status: string) => {
      const statusMap: Record<string, keyof typeof t> = {
        paid: 'paid',
        pending: 'pending',
        overdue: 'overdue',
        canceled: 'canceled',
      };
      return t[statusMap[status] || 'pending'];
    };

    const getPaymentMethodLabel = (method: string) => {
      const methodMap: Record<string, keyof typeof t> = {
        cash: 'cash',
        card: 'card',
        bank_transfer: 'bankTransfer',
        other: 'other',
      };
      return t[methodMap[method] || 'other'];
    };

    // Minimal color palette - only shades of gray with one accent
    const colors = {
      primary: '#111827',      // Near black
      secondary: '#4b5563',    // Dark gray
      muted: '#9ca3af',        // Medium gray
      light: '#f3f4f6',        // Light gray
      border: '#e5e7eb',       // Border gray
      white: '#ffffff',
      accent: '#374151',       // Accent (dark gray)
    };

    return (
      <div
        ref={ref}
        style={{
          direction: isRTL ? 'rtl' : 'ltr',
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
          backgroundColor: colors.white,
          minHeight: '100vh',
          color: colors.primary,
          fontSize: '13px',
          lineHeight: '1.6',
        }}
      >
        {/* Header */}
        <div style={{ padding: '40px 48px', borderBottom: `1px solid ${colors.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            {/* Company Info */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
              {organizationLogo ? (
                <img
                  src={organizationLogo}
                  alt="Logo"
                  style={{ height: '64px', width: '64px', objectFit: 'contain' }}
                />
              ) : (
                <div
                  style={{
                    height: '64px',
                    width: '64px',
                    backgroundColor: colors.light,
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    color: colors.muted,
                    fontWeight: '600',
                  }}
                >
                  LOGO
                </div>
              )}
              <div>
                <h1 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 4px 0', color: colors.primary }}>
                  {organizationSettings?.name || 'Company Name'}
                </h1>
                {organizationSettings?.activity && (
                  <p style={{ fontSize: '13px', margin: '0 0 8px 0', color: colors.secondary }}>
                    {organizationSettings.activity}
                  </p>
                )}
                <div style={{ fontSize: '12px', color: colors.secondary, lineHeight: '1.7' }}>
                  {organizationSettings?.address && <div>{organizationSettings.address}</div>}
                  {organizationSettings?.phone && <div>{organizationSettings.phone}</div>}
                  {organizationSettings?.email && <div>{organizationSettings.email}</div>}
                </div>
              </div>
            </div>

            {/* Invoice Title */}
            <div style={{ textAlign: isRTL ? 'left' : 'right' }}>
              <h2 style={{ fontSize: '32px', fontWeight: '700', margin: '0 0 8px 0', color: colors.primary, letterSpacing: '-0.5px' }}>
                {t.invoice}
              </h2>
              <div style={{ fontSize: '16px', fontWeight: '600', color: colors.secondary }}>
                {invoice.invoiceNumber}
              </div>
            </div>
          </div>
        </div>

        {/* Legal Info */}
        {(organizationSettings?.registrationNumber || organizationSettings?.taxNumber || organizationSettings?.nis || organizationSettings?.rib) && (
          <div style={{ padding: '12px 48px', backgroundColor: colors.light, borderBottom: `1px solid ${colors.border}` }}>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '11px', color: colors.secondary }}>
              {organizationSettings?.registrationNumber && (
                <span><strong>{t.rc}:</strong> {organizationSettings.registrationNumber}</span>
              )}
              {organizationSettings?.taxNumber && (
                <span><strong>{t.nif}:</strong> {organizationSettings.taxNumber}</span>
              )}
              {organizationSettings?.nis && (
                <span><strong>{t.nis}:</strong> {organizationSettings.nis}</span>
              )}
              {organizationSettings?.rib && (
                <span><strong>{t.rib}:</strong> {organizationSettings.rib}</span>
              )}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div style={{ padding: '32px 48px' }}>
          {/* Invoice Details & Customer */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', marginBottom: '32px' }}>
            {/* Invoice Details */}
            <div>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', color: colors.muted, textTransform: 'uppercase', marginBottom: '4px' }}>{t.invoiceDate}</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: colors.primary }}>{formatDate(invoice.invoiceDate)}</div>
              </div>
              {invoice.dueDate && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', color: colors.muted, textTransform: 'uppercase', marginBottom: '4px' }}>{t.dueDate}</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: colors.primary }}>{formatDate(invoice.dueDate)}</div>
                </div>
              )}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', color: colors.muted, textTransform: 'uppercase', marginBottom: '4px' }}>{t.status}</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: colors.primary }}>{getStatusLabel(invoice.status)}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: colors.muted, textTransform: 'uppercase', marginBottom: '4px' }}>{t.paymentMethod}</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: colors.primary }}>{getPaymentMethodLabel(invoice.paymentMethod)}</div>
              </div>
            </div>

            {/* Customer Info */}
            <div>
              <div style={{ fontSize: '11px', color: colors.muted, textTransform: 'uppercase', marginBottom: '8px' }}>{t.billTo}</div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: colors.primary, marginBottom: '8px' }}>
                {invoice.customerName || '-'}
              </div>
              {invoice.customerInfo && typeof invoice.customerInfo === 'object' && (
                <div style={{ fontSize: '13px', color: colors.secondary, lineHeight: '1.7' }}>
                  {(invoice.customerInfo as any).address && <div>{(invoice.customerInfo as any).address}</div>}
                  {(invoice.customerInfo as any).phone && <div>{(invoice.customerInfo as any).phone}</div>}
                  {(invoice.customerInfo as any).email && <div>{(invoice.customerInfo as any).email}</div>}
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div style={{ marginBottom: '32px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${colors.primary}` }}>
                  <th style={{ padding: '12px 0', textAlign: isRTL ? 'right' : 'left', fontSize: '11px', fontWeight: '600', color: colors.muted, textTransform: 'uppercase' }}>
                    {t.item}
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: colors.muted, textTransform: 'uppercase' }}>
                    {t.sku}
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: colors.muted, textTransform: 'uppercase' }}>
                    {t.quantity}
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: colors.muted, textTransform: 'uppercase' }}>
                    {t.unitPrice}
                  </th>
                  <th style={{ padding: '12px 0', textAlign: isRTL ? 'left' : 'right', fontSize: '11px', fontWeight: '600', color: colors.muted, textTransform: 'uppercase' }}>
                    {t.amount}
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.items?.map((item, index) => (
                  <tr key={index} style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={{ padding: '16px 0', textAlign: isRTL ? 'right' : 'left' }}>
                      <div style={{ fontWeight: '500', color: colors.primary }}>{item.name}</div>
                      {item.description && (
                        <div style={{ fontSize: '12px', color: colors.muted, marginTop: '2px' }}>{item.description}</div>
                      )}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center', color: colors.muted, fontSize: '12px' }}>
                      {(item as any).sku || '-'}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center', fontWeight: '500', color: colors.primary }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center', color: colors.secondary }}>
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td style={{ padding: '16px 0', textAlign: isRTL ? 'left' : 'right', fontWeight: '600', color: colors.primary }}>
                      {formatCurrency(item.totalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '32px' }}>
            <div style={{ width: '300px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '13px' }}>
                <span style={{ color: colors.secondary }}>{t.subtotal}</span>
                <span style={{ fontWeight: '500', color: colors.primary }}>{formatCurrency(invoice.subtotalAmount)}</span>
              </div>
              {invoice.discountAmount && invoice.discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '13px' }}>
                  <span style={{ color: colors.secondary }}>{t.discount}</span>
                  <span style={{ fontWeight: '500', color: colors.primary }}>- {formatCurrency(invoice.discountAmount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '13px' }}>
                <span style={{ color: colors.secondary }}>{t.tax}</span>
                <span style={{ fontWeight: '500', color: colors.primary }}>{formatCurrency(invoice.taxAmount)}</span>
              </div>
              {invoice.shippingAmount && invoice.shippingAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '13px' }}>
                  <span style={{ color: colors.secondary }}>{t.shipping}</span>
                  <span style={{ fontWeight: '500', color: colors.primary }}>{formatCurrency(invoice.shippingAmount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', marginTop: '8px', borderTop: `2px solid ${colors.primary}` }}>
                <span style={{ fontSize: '14px', fontWeight: '700', color: colors.primary }}>{t.grandTotal}</span>
                <span style={{ fontSize: '20px', fontWeight: '700', color: colors.primary }}>{formatCurrency(invoice.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div style={{ padding: '20px', backgroundColor: colors.light, borderRadius: '8px', marginBottom: '32px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: colors.muted, textTransform: 'uppercase', marginBottom: '8px' }}>{t.notes}</div>
              <p style={{ color: colors.secondary, fontSize: '13px', margin: '0', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                {invoice.notes}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '24px 48px', borderTop: `1px solid ${colors.border}`, textAlign: 'center' }}>
          <p style={{ fontSize: '14px', fontWeight: '500', color: colors.primary, margin: '0 0 8px 0' }}>
            {t.thankYou}
          </p>
          <div style={{ fontSize: '12px', color: colors.muted }}>
            {organizationSettings?.website && <span>{organizationSettings.website}</span>}
            {organizationSettings?.website && organizationSettings?.email && <span> • </span>}
            {organizationSettings?.email && <span>{organizationSettings.email}</span>}
          </div>
        </div>
      </div>
    );
  }
);

ProfessionalInvoiceTemplate.displayName = 'ProfessionalInvoiceTemplate';

export default ProfessionalInvoiceTemplate;
