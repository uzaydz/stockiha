import { forwardRef } from 'react';
import { format, addDays } from 'date-fns';
import { ar, fr, enUS } from 'date-fns/locale';
import type { Invoice } from '@/lib/api/invoices';

interface BonCommandeTemplateProps {
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
    purchaseOrder: 'أمر شراء',
    orderNumber: 'رقم الأمر',
    orderDate: 'تاريخ الأمر',
    expectedDelivery: 'تاريخ التسليم المتوقع',
    deliveryAddress: 'عنوان التسليم',
    buyer: 'المشتري',
    supplier: 'المورد',
    description: 'الوصف',
    designation: 'التسمية',
    reference: 'المرجع',
    quantity: 'الكمية',
    unit: 'الوحدة',
    unitPrice: 'سعر الوحدة',
    amount: 'المبلغ',
    subtotal: 'المجموع الفرعي',
    tax: 'الضريبة',
    discount: 'الخصم',
    shipping: 'الشحن',
    total: 'الإجمالي',
    grandTotal: 'المبلغ الإجمالي',
    phone: 'الهاتف',
    email: 'البريد',
    website: 'الموقع',
    address: 'العنوان',
    activity: 'النشاط',
    rc: 'السجل التجاري',
    nif: 'الرقم الجبائي',
    nis: 'NIS',
    rib: 'RIB',
    notes: 'ملاحظات',
    specialInstructions: 'تعليمات خاصة',
    terms: 'الشروط والأحكام',
    paymentTerms: 'شروط الدفع',
    deliveryTerms: 'شروط التسليم',
    orderConfirmation: 'تأكيد الطلب',
    orderNotice: 'هذا أمر شراء رسمي يُلزم الطرفين',
    bindingDocument: 'مستند ملزم قانونياً بعد التوقيع',
    qualityNote: 'يجب أن تتوافق البضائع مع المواصفات المطلوبة',
    buyerSignature: 'توقيع المشتري',
    supplierSignature: 'توقيع المورد',
    signature: 'التوقيع والختم',
    date: 'التاريخ',
    approved: 'تمت الموافقة',
    pending: 'قيد الانتظار',
    thankYou: 'شكراً لتعاونكم',
    contactUs: 'للاستفسارات، يرجى التواصل معنا',
  },
  fr: {
    purchaseOrder: 'Bon de Commande',
    orderNumber: 'N° Commande',
    orderDate: 'Date de Commande',
    expectedDelivery: 'Date de Livraison Prévue',
    deliveryAddress: 'Adresse de Livraison',
    buyer: 'Acheteur',
    supplier: 'Fournisseur',
    description: 'Description',
    designation: 'Désignation',
    reference: 'Référence',
    quantity: 'Qté',
    unit: 'Unité',
    unitPrice: 'Prix unitaire',
    amount: 'Montant',
    subtotal: 'Sous-total',
    tax: 'Taxe',
    discount: 'Remise',
    shipping: 'Livraison',
    total: 'Total',
    grandTotal: 'Montant Total',
    phone: 'Téléphone',
    email: 'Email',
    website: 'Site web',
    address: 'Adresse',
    activity: 'Activité',
    rc: 'RC',
    nif: 'NIF',
    nis: 'NIS',
    rib: 'RIB',
    notes: 'Remarques',
    specialInstructions: 'Instructions Spéciales',
    terms: 'Conditions Générales',
    paymentTerms: 'Conditions de Paiement',
    deliveryTerms: 'Conditions de Livraison',
    orderConfirmation: 'Confirmation de Commande',
    orderNotice: 'Ceci est un bon de commande officiel engageant les deux parties',
    bindingDocument: 'Document juridiquement contraignant après signature',
    qualityNote: 'Les marchandises doivent être conformes aux spécifications requises',
    buyerSignature: 'Signature Acheteur',
    supplierSignature: 'Signature Fournisseur',
    signature: 'Signature et Cachet',
    date: 'Date',
    approved: 'Approuvé',
    pending: 'En attente',
    thankYou: 'Merci de votre coopération',
    contactUs: 'Pour toute question, contactez-nous',
  },
  en: {
    purchaseOrder: 'Purchase Order',
    orderNumber: 'Order No.',
    orderDate: 'Order Date',
    expectedDelivery: 'Expected Delivery',
    deliveryAddress: 'Delivery Address',
    buyer: 'Buyer',
    supplier: 'Supplier',
    description: 'Description',
    designation: 'Designation',
    reference: 'Reference',
    quantity: 'Qty',
    unit: 'Unit',
    unitPrice: 'Unit Price',
    amount: 'Amount',
    subtotal: 'Subtotal',
    tax: 'Tax',
    discount: 'Discount',
    shipping: 'Shipping',
    total: 'Total',
    grandTotal: 'Grand Total',
    phone: 'Phone',
    email: 'Email',
    website: 'Website',
    address: 'Address',
    activity: 'Activity',
    rc: 'RC',
    nif: 'Tax ID',
    nis: 'NIS',
    rib: 'Bank Account',
    notes: 'Notes',
    specialInstructions: 'Special Instructions',
    terms: 'Terms & Conditions',
    paymentTerms: 'Payment Terms',
    deliveryTerms: 'Delivery Terms',
    orderConfirmation: 'Order Confirmation',
    orderNotice: 'This is an official purchase order binding both parties',
    bindingDocument: 'Legally binding document after signature',
    qualityNote: 'Goods must conform to the required specifications',
    buyerSignature: 'Buyer Signature',
    supplierSignature: 'Supplier Signature',
    signature: 'Signature & Stamp',
    date: 'Date',
    approved: 'Approved',
    pending: 'Pending',
    thankYou: 'Thank you for your cooperation',
    contactUs: 'For any questions, please contact us',
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

const BonCommandeTemplate = forwardRef<HTMLDivElement, BonCommandeTemplateProps>(
  ({ invoice, language, organizationLogo, organizationSettings }, ref) => {
    const t = translations[language];
    const locale = getLocale(language);
    const isRTL = language === 'ar';

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

    const getExpectedDeliveryDate = () => {
      if (!invoice.invoiceDate) return '-';
      try {
        const date = addDays(new Date(invoice.invoiceDate), 7);
        return format(date, 'dd/MM/yyyy', { locale });
      } catch {
        return '-';
      }
    };

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

            {/* Order Title & Number */}
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
                {t.purchaseOrder}
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
            </div>
          </div>
        </div>

        {/* Order Notice Banner */}
        <div
          style={{
            backgroundColor: colors.light,
            padding: '14px 40px',
            borderBottom: `1px solid ${colors.border}`,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              backgroundColor: colors.secondary,
              color: colors.white,
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: '700',
              flexShrink: '0',
            }}
          >
            ✓
          </div>
          <div>
            <p style={{ margin: '0', fontWeight: '700', color: colors.primary, fontSize: '13px' }}>
              {t.orderNotice}
            </p>
            <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: colors.secondary }}>
              {t.bindingDocument}
            </p>
          </div>
        </div>

        {/* Legal Info Bar */}
        <div
          style={{
            backgroundColor: colors.light,
            padding: '14px 40px',
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', fontSize: '12px' }}>
            {organizationSettings?.registrationNumber && (
              <div style={{ display: 'flex', gap: '6px' }}>
                <span style={{ fontWeight: '600', color: colors.secondary }}>{t.rc}:</span>
                <span style={{ color: colors.primary }}>{organizationSettings.registrationNumber}</span>
              </div>
            )}
            {organizationSettings?.taxNumber && (
              <div style={{ display: 'flex', gap: '6px' }}>
                <span style={{ fontWeight: '600', color: colors.secondary }}>{t.nif}:</span>
                <span style={{ color: colors.primary }}>{organizationSettings.taxNumber}</span>
              </div>
            )}
            {organizationSettings?.nis && (
              <div style={{ display: 'flex', gap: '6px' }}>
                <span style={{ fontWeight: '600', color: colors.secondary }}>{t.nis}:</span>
                <span style={{ color: colors.primary }}>{organizationSettings.nis}</span>
              </div>
            )}
            {organizationSettings?.rib && (
              <div style={{ display: 'flex', gap: '6px' }}>
                <span style={{ fontWeight: '600', color: colors.secondary }}>{t.rib}:</span>
                <span style={{ color: colors.primary }}>{organizationSettings.rib}</span>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div style={{ padding: '32px 40px' }}>
          {/* Buyer & Supplier Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '28px' }}>
            {/* Buyer */}
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
                  marginBottom: '14px',
                  letterSpacing: '0.5px',
                }}
              >
                {t.buyer}
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
                  marginBottom: '14px',
                  letterSpacing: '0.5px',
                }}
              >
                {t.supplier}
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

          {/* Order Details */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '16px',
              marginBottom: '28px',
              backgroundColor: colors.light,
              padding: '16px 20px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
            }}
          >
            <div>
              <span style={{ fontSize: '11px', color: colors.muted, textTransform: 'uppercase', fontWeight: '600' }}>{t.orderNumber}</span>
              <div style={{ fontSize: '15px', fontWeight: '700', color: colors.primary, marginTop: '4px' }}>{invoice.invoiceNumber}</div>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: colors.muted, textTransform: 'uppercase', fontWeight: '600' }}>{t.orderDate}</span>
              <div style={{ fontSize: '14px', fontWeight: '700', color: colors.primary, marginTop: '4px' }}>{formatDate(invoice.invoiceDate)}</div>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: colors.muted, textTransform: 'uppercase', fontWeight: '600' }}>{t.expectedDelivery}</span>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: '700',
                  color: colors.primary,
                  marginTop: '4px',
                  backgroundColor: colors.border,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  display: 'inline-block',
                }}
              >
                {getExpectedDeliveryDate()}
              </div>
            </div>
          </div>

          {/* Items Table */}
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
                  <th style={{ padding: '14px 16px', textAlign: 'center', color: colors.white, fontWeight: '600', fontSize: '12px', width: '50px' }}>
                    #
                  </th>
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
                    {t.reference}
                  </th>
                  <th style={{ padding: '14px 12px', textAlign: 'center', color: colors.white, fontWeight: '600', fontSize: '12px' }}>
                    {t.quantity}
                  </th>
                  <th style={{ padding: '14px 12px', textAlign: 'center', color: colors.white, fontWeight: '600', fontSize: '12px' }}>
                    {t.unitPrice}
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
                    {t.amount}
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.items?.map((item, index) => (
                  <tr
                    key={index}
                    style={{
                      backgroundColor: index % 2 === 0 ? colors.white : colors.light,
                      borderBottom: `1px solid ${colors.border}`,
                    }}
                  >
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: colors.muted, fontWeight: '600', fontSize: '12px' }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: isRTL ? 'right' : 'left' }}>
                      <div style={{ fontWeight: '600', color: colors.primary, marginBottom: '2px' }}>{item.name}</div>
                      {item.description && (
                        <div style={{ fontSize: '11px', color: colors.secondary }}>{item.description}</div>
                      )}
                    </td>
                    <td style={{ padding: '14px 12px', textAlign: 'center', color: colors.muted, fontSize: '12px' }}>
                      {(item as any).sku || '-'}
                    </td>
                    <td style={{ padding: '14px 12px', textAlign: 'center', fontWeight: '700', color: colors.primary, fontSize: '14px' }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: '14px 12px', textAlign: 'center', color: colors.secondary, fontSize: '12px' }}>
                      {formatCurrency(item.unitPrice)}
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
                      {formatCurrency(item.totalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13px' }}>
                  <span style={{ color: colors.secondary }}>{t.subtotal}</span>
                  <span style={{ fontWeight: '600', color: colors.primary }}>{formatCurrency(invoice.subtotalAmount)}</span>
                </div>
                {invoice.discountAmount && invoice.discountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13px', color: colors.secondary }}>
                    <span>{t.discount}</span>
                    <span style={{ fontWeight: '600' }}>- {formatCurrency(invoice.discountAmount)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13px' }}>
                  <span style={{ color: colors.secondary }}>{t.tax}</span>
                  <span style={{ fontWeight: '600', color: colors.primary }}>{formatCurrency(invoice.taxAmount)}</span>
                </div>
                {invoice.shippingAmount && invoice.shippingAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13px' }}>
                    <span style={{ color: colors.secondary }}>{t.shipping}</span>
                    <span style={{ fontWeight: '600', color: colors.primary }}>+ {formatCurrency(invoice.shippingAmount)}</span>
                  </div>
                )}
                <div
                  style={{
                    borderTop: `2px solid ${colors.primary}`,
                    paddingTop: '14px',
                    marginTop: '14px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: colors.primary }}>{t.grandTotal}</span>
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

          {/* Quality Note */}
          <div
            style={{
              backgroundColor: colors.light,
              borderRadius: '8px',
              padding: '16px 20px',
              marginBottom: '28px',
              borderLeft: `4px solid ${colors.secondary}`,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                backgroundColor: colors.secondary,
                color: colors.white,
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '700',
                flexShrink: '0',
              }}
            >
              !
            </div>
            <p style={{ color: colors.primary, fontSize: '13px', margin: '0', lineHeight: '1.5' }}>
              {t.qualityNote}
            </p>
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
                {t.specialInstructions}
              </h4>
              <p style={{ color: colors.primary, fontSize: '13px', margin: '0', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                {invoice.notes}
              </p>
            </div>
          )}

          {/* Signatures Section */}
          <div
            style={{
              backgroundColor: colors.light,
              borderRadius: '8px',
              padding: '24px',
              marginBottom: '32px',
              border: `1px solid ${colors.border}`,
            }}
          >
            <h4 style={{ fontSize: '14px', fontWeight: '700', color: colors.primary, marginBottom: '20px', textAlign: 'center', textTransform: 'uppercase' }}>
              {t.orderConfirmation}
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px' }}>
              {/* Buyer Signature */}
              <div>
                <h5 style={{ fontSize: '12px', fontWeight: '700', color: colors.secondary, marginBottom: '12px', textTransform: 'uppercase' }}>
                  {t.buyerSignature}
                </h5>
                <div
                  style={{
                    height: '80px',
                    border: `2px dashed ${colors.border}`,
                    borderRadius: '8px',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: colors.muted,
                    fontSize: '12px',
                    backgroundColor: colors.white,
                  }}
                >
                  {t.signature}
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: '1' }}>
                    <p style={{ fontSize: '10px', color: colors.muted, marginBottom: '4px', textTransform: 'uppercase' }}>{t.date}:</p>
                    <div style={{ borderBottom: `1px solid ${colors.border}`, height: '20px' }} />
                  </div>
                </div>
              </div>

              {/* Supplier Signature */}
              <div>
                <h5 style={{ fontSize: '12px', fontWeight: '700', color: colors.secondary, marginBottom: '12px', textTransform: 'uppercase' }}>
                  {t.supplierSignature}
                </h5>
                <div
                  style={{
                    height: '80px',
                    border: `2px dashed ${colors.border}`,
                    borderRadius: '8px',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: colors.muted,
                    fontSize: '12px',
                    backgroundColor: colors.white,
                  }}
                >
                  {t.signature}
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: '1' }}>
                    <p style={{ fontSize: '10px', color: colors.muted, marginBottom: '4px', textTransform: 'uppercase' }}>{t.date}:</p>
                    <div style={{ borderBottom: `1px solid ${colors.border}`, height: '20px' }} />
                  </div>
                </div>
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
            <p style={{ fontSize: '16px', fontWeight: '600', marginBottom: '6px' }}>
              {t.thankYou}
            </p>
            <p style={{ fontSize: '12px', opacity: '0.8', marginBottom: '12px' }}>
              {t.contactUs}
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

BonCommandeTemplate.displayName = 'BonCommandeTemplate';

export default BonCommandeTemplate;
