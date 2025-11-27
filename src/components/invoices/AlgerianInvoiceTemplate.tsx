import { forwardRef } from 'react';
import { format } from 'date-fns';
import { ar, fr, enUS } from 'date-fns/locale';
import type { Invoice } from '@/lib/api/invoices';

interface AlgerianInvoiceTemplateProps {
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
    taxInvoice: 'فاتورة ضريبية',
    invoiceNumber: 'رقم الفاتورة',
    invoiceDate: 'تاريخ الإصدار',
    dueDate: 'تاريخ الاستحقاق',
    from: 'المورد',
    to: 'الزبون',
    description: 'البيان',
    designation: 'التسمية',
    reference: 'المرجع',
    quantity: 'الكمية',
    unitPriceHT: 'س.و HT',
    unitPriceTTC: 'س.و TTC',
    tvaRate: 'TVA %',
    totalHT: 'المجموع HT',
    totalTVA: 'مبلغ TVA',
    totalTTC: 'المجموع TTC',
    subtotal: 'المجموع الجزئي',
    discount: 'الخصم',
    shipping: 'الشحن',
    grandTotal: 'المبلغ الإجمالي',
    amountInWords: 'المبلغ بالحروف',
    phone: 'الهاتف',
    email: 'البريد',
    website: 'الموقع',
    address: 'العنوان',
    activity: 'النشاط التجاري',
    rc: 'السجل التجاري',
    nif: 'الرقم الجبائي',
    nis: 'رقم التعريف الإحصائي',
    ai: 'رقم المادة',
    rib: 'الحساب البنكي',
    bankName: 'البنك',
    notes: 'ملاحظات',
    status: 'الحالة',
    paid: 'مدفوعة',
    pending: 'معلقة',
    overdue: 'متأخرة',
    canceled: 'ملغاة',
    paymentMethod: 'طريقة الدفع',
    cash: 'نقداً',
    card: 'بطاقة',
    bankTransfer: 'تحويل بنكي',
    check: 'شيك',
    other: 'أخرى',
    legalMention: 'مستند رسمي خاضع للتشريعات الجزائرية',
    thankYou: 'شكراً لثقتكم',
    signature: 'التوقيع والختم',
    clientSignature: 'توقيع الزبون',
    sellerSignature: 'توقيع البائع',
    page: 'صفحة',
    of: 'من',
  },
  fr: {
    invoice: 'Facture',
    taxInvoice: 'Facture Fiscale',
    invoiceNumber: 'N° Facture',
    invoiceDate: 'Date d\'émission',
    dueDate: 'Date d\'échéance',
    from: 'Fournisseur',
    to: 'Client',
    description: 'Description',
    designation: 'Désignation',
    reference: 'Référence',
    quantity: 'Qté',
    unitPriceHT: 'P.U HT',
    unitPriceTTC: 'P.U TTC',
    tvaRate: 'TVA %',
    totalHT: 'Total HT',
    totalTVA: 'Montant TVA',
    totalTTC: 'Total TTC',
    subtotal: 'Sous-total',
    discount: 'Remise',
    shipping: 'Livraison',
    grandTotal: 'Montant Total',
    amountInWords: 'Montant en lettres',
    phone: 'Téléphone',
    email: 'Email',
    website: 'Site web',
    address: 'Adresse',
    activity: 'Activité commerciale',
    rc: 'Registre de Commerce',
    nif: 'Numéro d\'Identification Fiscale',
    nis: 'Numéro d\'Identification Statistique',
    ai: 'Article d\'Imposition',
    rib: 'RIB',
    bankName: 'Banque',
    notes: 'Remarques',
    status: 'Statut',
    paid: 'Payée',
    pending: 'En attente',
    overdue: 'En retard',
    canceled: 'Annulée',
    paymentMethod: 'Mode de paiement',
    cash: 'Espèces',
    card: 'Carte',
    bankTransfer: 'Virement',
    check: 'Chèque',
    other: 'Autre',
    legalMention: 'Document officiel soumis à la législation algérienne',
    thankYou: 'Merci de votre confiance',
    signature: 'Signature et cachet',
    clientSignature: 'Signature Client',
    sellerSignature: 'Signature Vendeur',
    page: 'Page',
    of: 'sur',
  },
  en: {
    invoice: 'Invoice',
    taxInvoice: 'Tax Invoice',
    invoiceNumber: 'Invoice No.',
    invoiceDate: 'Issue Date',
    dueDate: 'Due Date',
    from: 'Supplier',
    to: 'Customer',
    description: 'Description',
    designation: 'Designation',
    reference: 'Reference',
    quantity: 'Qty',
    unitPriceHT: 'U.P excl.',
    unitPriceTTC: 'U.P incl.',
    tvaRate: 'VAT %',
    totalHT: 'Total excl.',
    totalTVA: 'VAT Amount',
    totalTTC: 'Total incl.',
    subtotal: 'Subtotal',
    discount: 'Discount',
    shipping: 'Shipping',
    grandTotal: 'Grand Total',
    amountInWords: 'Amount in words',
    phone: 'Phone',
    email: 'Email',
    website: 'Website',
    address: 'Address',
    activity: 'Business Activity',
    rc: 'Commercial Register',
    nif: 'Tax ID Number',
    nis: 'Statistical ID Number',
    ai: 'Tax Article',
    rib: 'Bank Account',
    bankName: 'Bank',
    notes: 'Notes',
    status: 'Status',
    paid: 'Paid',
    pending: 'Pending',
    overdue: 'Overdue',
    canceled: 'Canceled',
    paymentMethod: 'Payment Method',
    cash: 'Cash',
    card: 'Card',
    bankTransfer: 'Bank Transfer',
    check: 'Check',
    other: 'Other',
    legalMention: 'Official document subject to Algerian legislation',
    thankYou: 'Thank you for your business',
    signature: 'Signature & Stamp',
    clientSignature: 'Client Signature',
    sellerSignature: 'Seller Signature',
    page: 'Page',
    of: 'of',
  },
};

// Minimal color palette - only shades of gray
const colors = {
  primary: '#111827',      // Near black
  secondary: '#4b5563',    // Dark gray
  muted: '#9ca3af',        // Medium gray
  light: '#f3f4f6',        // Light gray
  border: '#e5e7eb',       // Border gray
  white: '#ffffff',
  accent: '#374151',       // Accent (dark gray)
};

const getLocale = (language: 'ar' | 'fr' | 'en') => {
  switch (language) {
    case 'ar': return ar;
    case 'fr': return fr;
    case 'en': return enUS;
    default: return ar;
  }
};

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'paid':
      return { bg: colors.primary, color: colors.white };
    case 'pending':
      return { bg: colors.secondary, color: colors.white };
    case 'overdue':
      return { bg: colors.accent, color: colors.white };
    case 'canceled':
      return { bg: colors.muted, color: colors.white };
    default:
      return { bg: colors.muted, color: colors.white };
  }
};

const AlgerianInvoiceTemplate = forwardRef<HTMLDivElement, AlgerianInvoiceTemplateProps>(
  ({ invoice, language, organizationLogo, organizationSettings }, ref) => {
    const t = translations[language];
    const locale = getLocale(language);
    const isRTL = language === 'ar';
    const statusStyle = getStatusStyle(invoice.status);

    const formatDate = (date: string | undefined) => {
      if (!date) return '-';
      try {
        return format(new Date(date), 'dd/MM/yyyy', { locale });
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
        check: 'check',
        other: 'other',
      };
      return t[methodMap[method] || 'other'];
    };

    // Calculate TVA totals
    const calculateTotals = () => {
      let totalHT = 0;
      let totalTVA = 0;
      let totalTTC = 0;

      invoice.items?.forEach((item: any) => {
        const itemTotalHT = item.total_ht || item.totalPrice / 1.19;
        const itemTVA = item.total_tva || itemTotalHT * 0.19;
        const itemTTC = item.total_ttc || item.totalPrice;

        totalHT += itemTotalHT;
        totalTVA += itemTVA;
        totalTTC += itemTTC;
      });

      return { totalHT, totalTVA, totalTTC };
    };

    const totals = calculateTotals();

    return (
      <div
        ref={ref}
        style={{
          direction: isRTL ? 'rtl' : 'ltr',
          fontFamily: "'Inter', 'Segoe UI', 'Arial', sans-serif",
          backgroundColor: colors.white,
          minHeight: '100vh',
          padding: '0',
          margin: '0',
          color: colors.primary,
          fontSize: '13px',
          lineHeight: '1.5',
        }}
      >
        {/* Header - Clean Minimal Design */}
        <div
          style={{
            backgroundColor: colors.primary,
            padding: '32px 40px',
            color: colors.white,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px' }}>
            {/* Logo & Company Info */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
              {organizationLogo ? (
                <img
                  src={organizationLogo}
                  alt="Logo"
                  style={{
                    height: '80px',
                    width: '80px',
                    objectFit: 'contain',
                    backgroundColor: colors.white,
                    borderRadius: '8px',
                    padding: '8px',
                  }}
                />
              ) : (
                <div
                  style={{
                    height: '80px',
                    width: '80px',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: '700',
                    border: '2px dashed rgba(255,255,255,0.3)',
                  }}
                >
                  LOGO
                </div>
              )}
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 4px 0' }}>
                  {organizationSettings?.name || 'Company Name'}
                </h1>
                {organizationSettings?.activity && (
                  <p style={{ fontSize: '13px', margin: '0 0 10px 0', opacity: '0.8' }}>
                    {organizationSettings.activity}
                  </p>
                )}
                <div style={{ fontSize: '12px', opacity: '0.85', lineHeight: '1.6' }}>
                  {organizationSettings?.address && <div>{organizationSettings.address}</div>}
                  <div style={{ display: 'flex', gap: '16px', marginTop: '4px', flexWrap: 'wrap' }}>
                    {organizationSettings?.phone && <span>{organizationSettings.phone}</span>}
                    {organizationSettings?.email && <span>{organizationSettings.email}</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Invoice Title & Number */}
            <div style={{ textAlign: isRTL ? 'left' : 'right' }}>
              <div
                style={{
                  fontSize: '32px',
                  fontWeight: '700',
                  marginBottom: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                {t.taxInvoice}
              </div>
              <div
                style={{
                  backgroundColor: colors.white,
                  color: colors.primary,
                  padding: '10px 20px',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: '700',
                  display: 'inline-block',
                }}
              >
                {invoice.invoiceNumber}
              </div>
              <div
                style={{
                  marginTop: '8px',
                  backgroundColor: statusStyle.bg,
                  color: statusStyle.color,
                  padding: '4px 12px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '600',
                  display: 'inline-block',
                  textTransform: 'uppercase',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              >
                {getStatusLabel(invoice.status)}
              </div>
            </div>
          </div>
        </div>

        {/* Legal Information Bar - Algerian Requirements */}
        <div
          style={{
            backgroundColor: colors.light,
            padding: '14px 40px',
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', fontSize: '12px' }}>
            {organizationSettings?.registrationNumber && (
              <div>
                <span style={{ fontWeight: '600', color: colors.secondary, display: 'block', marginBottom: '2px' }}>{t.rc}</span>
                <span style={{ color: colors.primary }}>{organizationSettings.registrationNumber}</span>
              </div>
            )}
            {organizationSettings?.taxNumber && (
              <div>
                <span style={{ fontWeight: '600', color: colors.secondary, display: 'block', marginBottom: '2px' }}>{t.nif}</span>
                <span style={{ color: colors.primary }}>{organizationSettings.taxNumber}</span>
              </div>
            )}
            {organizationSettings?.nis && (
              <div>
                <span style={{ fontWeight: '600', color: colors.secondary, display: 'block', marginBottom: '2px' }}>{t.nis}</span>
                <span style={{ color: colors.primary }}>{organizationSettings.nis}</span>
              </div>
            )}
            {organizationSettings?.rib && (
              <div>
                <span style={{ fontWeight: '600', color: colors.secondary, display: 'block', marginBottom: '2px' }}>{t.rib}</span>
                <span style={{ color: colors.primary }}>{organizationSettings.rib}</span>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div style={{ padding: '32px 40px' }}>
          {/* Supplier & Customer Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
            {/* Supplier */}
            <div
              style={{
                backgroundColor: colors.light,
                borderRadius: '8px',
                padding: '20px',
                border: `1px solid ${colors.border}`,
              }}
            >
              <h3
                style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  color: colors.secondary,
                  marginBottom: '12px',
                  letterSpacing: '0.5px',
                }}
              >
                {t.from}
              </h3>
              <div style={{ color: colors.primary }}>
                <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>
                  {organizationSettings?.name || '-'}
                </div>
                <div style={{ fontSize: '13px', lineHeight: '1.7', color: colors.secondary }}>
                  {organizationSettings?.address && <div>{organizationSettings.address}</div>}
                  {organizationSettings?.phone && <div>{t.phone}: {organizationSettings.phone}</div>}
                  {organizationSettings?.email && <div>{t.email}: {organizationSettings.email}</div>}
                </div>
              </div>
            </div>

            {/* Customer */}
            <div
              style={{
                backgroundColor: colors.light,
                borderRadius: '8px',
                padding: '20px',
                border: `1px solid ${colors.border}`,
              }}
            >
              <h3
                style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  color: colors.secondary,
                  marginBottom: '12px',
                  letterSpacing: '0.5px',
                }}
              >
                {t.to}
              </h3>
              <div style={{ color: colors.primary }}>
                <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>
                  {invoice.customerName || '-'}
                </div>
                {invoice.customerInfo && typeof invoice.customerInfo === 'object' && (
                  <div style={{ fontSize: '13px', lineHeight: '1.7', color: colors.secondary }}>
                    {(invoice.customerInfo as any).address && <div>{(invoice.customerInfo as any).address}</div>}
                    {(invoice.customerInfo as any).phone && <div>{t.phone}: {(invoice.customerInfo as any).phone}</div>}
                    {(invoice.customerInfo as any).email && <div>{t.email}: {(invoice.customerInfo as any).email}</div>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Invoice Meta Info */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '16px',
              marginBottom: '28px',
              backgroundColor: colors.light,
              padding: '16px 20px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
            }}
          >
            <div>
              <span style={{ fontSize: '11px', color: colors.muted, textTransform: 'uppercase', fontWeight: '600' }}>{t.invoiceDate}</span>
              <div style={{ fontSize: '14px', fontWeight: '600', color: colors.primary, marginTop: '4px' }}>{formatDate(invoice.invoiceDate)}</div>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: colors.muted, textTransform: 'uppercase', fontWeight: '600' }}>{t.dueDate}</span>
              <div style={{ fontSize: '14px', fontWeight: '600', color: colors.primary, marginTop: '4px' }}>{formatDate(invoice.dueDate)}</div>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: colors.muted, textTransform: 'uppercase', fontWeight: '600' }}>{t.paymentMethod}</span>
              <div style={{ fontSize: '14px', fontWeight: '600', color: colors.primary, marginTop: '4px' }}>{getPaymentMethodLabel(invoice.paymentMethod)}</div>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: colors.muted, textTransform: 'uppercase', fontWeight: '600' }}>{t.status}</span>
              <div style={{ marginTop: '4px' }}>
                <span
                  style={{
                    backgroundColor: statusStyle.bg,
                    color: statusStyle.color,
                    padding: '3px 10px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '600',
                  }}
                >
                  {getStatusLabel(invoice.status)}
                </span>
              </div>
            </div>
          </div>

          {/* Items Table - Algerian Format with TVA */}
          <div
            style={{
              marginBottom: '28px',
              borderRadius: '8px',
              overflow: 'hidden',
              border: `1px solid ${colors.border}`,
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: colors.primary }}>
                  <th
                    style={{
                      padding: '14px 16px',
                      textAlign: isRTL ? 'right' : 'left',
                      color: colors.white,
                      fontWeight: '600',
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px',
                    }}
                  >
                    {t.designation}
                  </th>
                  <th style={{ padding: '14px 12px', textAlign: 'center', color: colors.white, fontWeight: '600', fontSize: '12px' }}>
                    {t.quantity}
                  </th>
                  <th style={{ padding: '14px 12px', textAlign: 'center', color: colors.white, fontWeight: '600', fontSize: '12px' }}>
                    {t.unitPriceHT}
                  </th>
                  <th style={{ padding: '14px 12px', textAlign: 'center', color: colors.white, fontWeight: '600', fontSize: '12px' }}>
                    {t.tvaRate}
                  </th>
                  <th style={{ padding: '14px 12px', textAlign: 'center', color: colors.white, fontWeight: '600', fontSize: '12px' }}>
                    {t.totalHT}
                  </th>
                  <th style={{ padding: '14px 12px', textAlign: 'center', color: colors.white, fontWeight: '600', fontSize: '12px' }}>
                    {t.totalTVA}
                  </th>
                  <th
                    style={{
                      padding: '14px 16px',
                      textAlign: isRTL ? 'left' : 'right',
                      color: colors.white,
                      fontWeight: '600',
                      fontSize: '12px',
                    }}
                  >
                    {t.totalTTC}
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.items?.map((item: any, index) => {
                  const tvaRate = item.tva_rate || 19;
                  const unitPriceHT = item.unit_price_ht || item.unitPrice / 1.19;
                  const totalHT = item.total_ht || item.totalPrice / 1.19;
                  const totalTVA = item.total_tva || totalHT * 0.19;
                  const totalTTC = item.total_ttc || item.totalPrice;

                  return (
                    <tr
                      key={index}
                      style={{
                        backgroundColor: index % 2 === 0 ? colors.white : colors.light,
                        borderBottom: `1px solid ${colors.border}`,
                      }}
                    >
                      <td style={{ padding: '14px 16px', textAlign: isRTL ? 'right' : 'left' }}>
                        <div style={{ fontWeight: '600', color: colors.primary, marginBottom: '2px' }}>{item.name}</div>
                        {item.description && (
                          <div style={{ fontSize: '11px', color: colors.secondary }}>{item.description}</div>
                        )}
                        {(item as any).sku && (
                          <div style={{ fontSize: '10px', color: colors.muted, marginTop: '2px' }}>Réf: {(item as any).sku}</div>
                        )}
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'center', fontWeight: '600', color: colors.primary }}>
                        {item.quantity}
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'center', color: colors.secondary, fontSize: '12px' }}>
                        {formatCurrency(unitPriceHT)}
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'center', color: colors.secondary, fontSize: '12px' }}>
                        {tvaRate}%
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'center', color: colors.secondary, fontSize: '12px' }}>
                        {formatCurrency(totalHT)}
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'center', color: colors.secondary, fontSize: '12px', fontWeight: '500' }}>
                        {formatCurrency(totalTVA)}
                      </td>
                      <td
                        style={{
                          padding: '14px 16px',
                          textAlign: isRTL ? 'left' : 'right',
                          fontWeight: '700',
                          color: colors.primary,
                          fontSize: '13px',
                        }}
                      >
                        {formatCurrency(totalTTC)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals Section - Algerian Format */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '32px' }}>
            <div style={{ width: '380px' }}>
              <div
                style={{
                  backgroundColor: colors.light,
                  borderRadius: '8px',
                  padding: '20px',
                  border: `1px solid ${colors.border}`,
                }}
              >
                {/* Total HT */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13px' }}>
                  <span style={{ color: colors.secondary }}>{t.totalHT}</span>
                  <span style={{ fontWeight: '600', color: colors.primary }}>{formatCurrency(totals.totalHT)}</span>
                </div>

                {/* Discount */}
                {invoice.discountAmount && invoice.discountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13px', color: colors.secondary }}>
                    <span>{t.discount}</span>
                    <span style={{ fontWeight: '600' }}>- {formatCurrency(invoice.discountAmount)}</span>
                  </div>
                )}

                {/* TVA */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13px' }}>
                  <span style={{ color: colors.secondary }}>{t.totalTVA} (19%)</span>
                  <span style={{ fontWeight: '600', color: colors.secondary }}>{formatCurrency(totals.totalTVA)}</span>
                </div>

                {/* Shipping */}
                {invoice.shippingAmount && invoice.shippingAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13px' }}>
                    <span style={{ color: colors.secondary }}>{t.shipping}</span>
                    <span style={{ fontWeight: '600', color: colors.primary }}>+ {formatCurrency(invoice.shippingAmount)}</span>
                  </div>
                )}

                {/* Grand Total TTC */}
                <div
                  style={{
                    borderTop: `2px solid ${colors.primary}`,
                    paddingTop: '14px',
                    marginTop: '14px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: colors.primary }}>{t.grandTotal} TTC</span>
                    <span
                      style={{
                        fontSize: '22px',
                        fontWeight: '800',
                        color: colors.primary,
                      }}
                    >
                      {formatCurrency(invoice.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div
              style={{
                backgroundColor: colors.light,
                borderRadius: '8px',
                padding: '18px 22px',
                marginBottom: '28px',
                borderLeft: `4px solid ${colors.secondary}`,
              }}
            >
              <h4 style={{ fontSize: '13px', fontWeight: '700', color: colors.secondary, marginBottom: '8px' }}>
                {t.notes}
              </h4>
              <p style={{ color: colors.primary, fontSize: '13px', margin: '0', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                {invoice.notes}
              </p>
            </div>
          )}

          {/* Signatures Section */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '32px' }}>
            <div style={{ textAlign: 'center' }}>
              <h4 style={{ fontSize: '12px', fontWeight: '700', color: colors.secondary, marginBottom: '12px', textTransform: 'uppercase' }}>
                {t.sellerSignature}
              </h4>
              <div
                style={{
                  height: '80px',
                  border: `2px dashed ${colors.border}`,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.muted,
                  fontSize: '12px',
                }}
              >
                {t.signature}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <h4 style={{ fontSize: '12px', fontWeight: '700', color: colors.secondary, marginBottom: '12px', textTransform: 'uppercase' }}>
                {t.clientSignature}
              </h4>
              <div
                style={{
                  height: '80px',
                  border: `2px dashed ${colors.border}`,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.muted,
                  fontSize: '12px',
                }}
              >
                {t.signature}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            backgroundColor: colors.primary,
            padding: '24px 40px',
            color: colors.white,
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
              {t.thankYou}
            </p>
            <p style={{ fontSize: '11px', opacity: '0.8', marginBottom: '12px' }}>
              {t.legalMention}
            </p>
            <div style={{ fontSize: '12px', opacity: '0.85', display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
              {organizationSettings?.website && <span>{organizationSettings.website}</span>}
              {organizationSettings?.phone && <span>{organizationSettings.phone}</span>}
              {organizationSettings?.email && <span>{organizationSettings.email}</span>}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

AlgerianInvoiceTemplate.displayName = 'AlgerianInvoiceTemplate';

export default AlgerianInvoiceTemplate;
