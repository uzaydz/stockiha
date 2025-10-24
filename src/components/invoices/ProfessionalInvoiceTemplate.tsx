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
    invoiceDate: 'تاريخ الفاتورة',
    dueDate: 'تاريخ الاستحقاق',
    activity: 'النشاط التجاري',
    from: 'من',
    to: 'إلى',
    billTo: 'الفاتورة إلى',
    shipTo: 'الشحن إلى',
    description: 'الوصف',
    quantity: 'الكمية',
    unitPrice: 'السعر',
    amount: 'المبلغ',
    subtotal: 'الإجمالي الفرعي',
    tax: 'الضريبة',
    total: 'الإجمالي',
    status: 'الحالة',
    paymentMethod: 'طريقة الدفع',
    notes: 'ملاحظات',
    paid: 'مدفوع',
    pending: 'معلق',
    overdue: 'متأخر',
    canceled: 'ملغى',
    cash: 'نقدي',
    card: 'بطاقة ائتمان',
    bankTransfer: 'تحويل بنكي',
    other: 'أخرى',
    taxNumber: 'الرقم الضريبي',
    registrationNumber: 'رقم التسجيل',
    phone: 'الهاتف',
    email: 'البريد الإلكتروني',
    website: 'الموقع الإلكتروني',
    address: 'العنوان',
    sku: 'SKU',
    barcode: 'الباركود',
    priceHT: 'السعر (HT)',
    priceTTC: 'السعر (TTC)',
    totalHT: 'الإجمالي (HT)',
    totalTVA: 'الضريبة (TVA)',
    totalTTC: 'الإجمالي (TTC)',
    discount: 'الخصم',
    shipping: 'الشحن',
    finalTotal: 'الإجمالي النهائي',
  },
  fr: {
    invoice: 'Facture',
    invoiceNumber: 'Numéro de facture',
    invoiceDate: 'Date de facture',
    dueDate: 'Date d\'échéance',
    activity: 'Activité commerciale',
    from: 'De',
    to: 'À',
    billTo: 'Facturer à',
    shipTo: 'Livrer à',
    description: 'Description',
    quantity: 'Quantité',
    unitPrice: 'Prix unitaire',
    amount: 'Montant',
    subtotal: 'Sous-total',
    tax: 'Taxe',
    total: 'Total',
    status: 'Statut',
    paymentMethod: 'Méthode de paiement',
    notes: 'Remarques',
    paid: 'Payé',
    pending: 'En attente',
    overdue: 'En retard',
    canceled: 'Annulé',
    cash: 'Espèces',
    card: 'Carte de crédit',
    bankTransfer: 'Virement bancaire',
    other: 'Autre',
    taxNumber: 'Numéro fiscal',
    registrationNumber: 'Numéro d\'enregistrement',
    phone: 'Téléphone',
    email: 'Email',
    website: 'Site Web',
    address: 'Adresse',
    sku: 'SKU',
    barcode: 'Code-barres',
    priceHT: 'Prix (HT)',
    priceTTC: 'Prix (TTC)',
    totalHT: 'Total (HT)',
    totalTVA: 'TVA',
    totalTTC: 'Total (TTC)',
    discount: 'Remise',
    shipping: 'Livraison',
    finalTotal: 'Total final',
  },
  en: {
    invoice: 'Invoice',
    invoiceNumber: 'Invoice Number',
    invoiceDate: 'Invoice Date',
    dueDate: 'Due Date',
    activity: 'Business Activity',
    from: 'From',
    to: 'To',
    billTo: 'Bill To',
    shipTo: 'Ship To',
    description: 'Description',
    quantity: 'Quantity',
    unitPrice: 'Unit Price',
    amount: 'Amount',
    subtotal: 'Subtotal',
    tax: 'Tax',
    total: 'Total',
    status: 'Status',
    paymentMethod: 'Payment Method',
    notes: 'Notes',
    paid: 'Paid',
    pending: 'Pending',
    overdue: 'Overdue',
    canceled: 'Canceled',
    cash: 'Cash',
    card: 'Credit Card',
    bankTransfer: 'Bank Transfer',
    other: 'Other',
    taxNumber: 'Tax Number',
    registrationNumber: 'Registration Number',
    phone: 'Phone',
    email: 'Email',
    website: 'Website',
    address: 'Address',
    sku: 'SKU',
    barcode: 'Barcode',
    priceHT: 'Price (HT)',
    priceTTC: 'Price (TTC)',
    totalHT: 'Total (HT)',
    totalTVA: 'VAT',
    totalTTC: 'Total (TTC)',
    discount: 'Discount',
    shipping: 'Shipping',
    finalTotal: 'Final Total',
  },
};

const getLocale = (language: 'ar' | 'fr' | 'en') => {
  switch (language) {
    case 'ar':
      return ar;
    case 'fr':
      return fr;
    case 'en':
      return enUS;
    default:
      return ar;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'paid':
      return '#10b981';
    case 'pending':
      return '#f59e0b';
    case 'overdue':
      return '#ef4444';
    case 'canceled':
      return '#6b7280';
    default:
      return '#000';
  }
};

const ProfessionalInvoiceTemplate = forwardRef<
  HTMLDivElement,
  ProfessionalInvoiceTemplateProps
>(({ invoice, language, organizationLogo, organizationSettings }, ref) => {
  const t = translations[language];
  const locale = getLocale(language);
  const isRTL = language === 'ar';

  const formatDate = (date: string | undefined) => {
    if (!date) return '-';
    try {
      return format(new Date(date), 'PPP', { locale });
    } catch {
      return '-';
    }
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

  return (
    <div
      ref={ref}
      className="bg-white p-8 min-h-screen"
      style={{ direction: isRTL ? 'rtl' : 'ltr' }}
    >
      {/* رأس الفاتورة - متوافق مع المتطلبات الجزائرية */}
      <div className="mb-8 pb-8 border-b-3 border-gray-900">
        <div className="flex justify-between items-start gap-8 mb-6">
          {/* شعار المحل */}
          <div className="flex-shrink-0">
            {organizationLogo ? (
              <img
                src={organizationLogo}
                alt="Logo"
                className="h-24 w-24 object-contain"
              />
            ) : (
              <div className="h-24 w-24 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs font-bold">
                LOGO
              </div>
            )}
          </div>

          {/* معلومات المحل - البيانات الإلزامية الجزائرية */}
          <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              {organizationSettings?.name || 'اسم المحل'}
            </h1>
            {organizationSettings?.activity && (
              <p className="text-sm font-semibold text-gray-800 mb-3 border-b pb-2">
                {t.activity}: {organizationSettings.activity}
              </p>
            )}
            <div className="text-xs text-gray-700 space-y-1 font-medium">
              {organizationSettings?.address && (
                <p>{organizationSettings.address}</p>
              )}
              {organizationSettings?.phone && (
                <p>{t.phone}: {organizationSettings.phone}</p>
              )}
              {organizationSettings?.email && (
                <p>{t.email}: {organizationSettings.email}</p>
              )}
              {organizationSettings?.website && (
                <p>{t.website}: {organizationSettings.website}</p>
              )}
            </div>
          </div>

          {/* عنوان الفاتورة */}
          <div className={`flex-shrink-0 ${isRTL ? 'text-right' : 'text-left'}`}>
            <div className="border-2 border-gray-900 p-4 rounded">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                {t.invoice}
              </h2>
              <div className="text-sm space-y-2 text-gray-900 font-semibold">
                <p>
                  <span className="font-bold">{t.invoiceNumber}:</span> {invoice.invoiceNumber}
                </p>
                <p>
                  <span className="font-bold">{t.invoiceDate}:</span> {formatDate(invoice.invoiceDate)}
                </p>
                {invoice.dueDate && (
                  <p>
                    <span className="font-bold">{t.dueDate}:</span> {formatDate(invoice.dueDate)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* البيانات الرسمية الجزائرية - قسم منفصل */}
        <div className="bg-gray-50 p-4 rounded border border-gray-300 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            {organizationSettings?.registrationNumber && (
              <div>
                <p className="font-bold text-gray-900">RC</p>
                <p className="text-gray-700">{organizationSettings.registrationNumber}</p>
              </div>
            )}
            {organizationSettings?.taxNumber && (
              <div>
                <p className="font-bold text-gray-900">NIF</p>
                <p className="text-gray-700">{organizationSettings.taxNumber}</p>
              </div>
            )}
            {organizationSettings?.nis && (
              <div>
                <p className="font-bold text-gray-900">NIS</p>
                <p className="text-gray-700">{organizationSettings.nis}</p>
              </div>
            )}
            {organizationSettings?.rib && (
              <div>
                <p className="font-bold text-gray-900">RIB</p>
                <p className="text-gray-700">{organizationSettings.rib}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* معلومات الفاتورة والعميل */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* من */}
        <div>
          <h3 className="font-bold text-gray-900 mb-3">{t.from}</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p className="font-semibold">
              {organizationSettings?.name || 'اسم المحل'}
            </p>
            {organizationSettings?.activity && (
              <p className="text-xs font-semibold border-b pb-1">{organizationSettings.activity}</p>
            )}
            {organizationSettings?.address && (
              <p className="text-xs">{organizationSettings.address}</p>
            )}
            {organizationSettings?.registrationNumber && (
              <p className="text-xs font-semibold">
                RC: {organizationSettings.registrationNumber}
              </p>
            )}
            {organizationSettings?.taxNumber && (
              <p className="text-xs font-semibold">
                NIF: {organizationSettings.taxNumber}
              </p>
            )}
            {organizationSettings?.nis && (
              <p className="text-xs font-semibold">
                NIS: {organizationSettings.nis}
              </p>
            )}
          </div>
        </div>

        {/* إلى */}
        <div>
          <h3 className="font-bold text-gray-900 mb-3">{t.billTo}</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p className="font-semibold">{invoice.customerName}</p>
            {invoice.customerInfo && typeof invoice.customerInfo === 'object' && (
              <>
                {(invoice.customerInfo as any).phone && (
                  <p>
                    {t.phone}: {(invoice.customerInfo as any).phone}
                  </p>
                )}
                {(invoice.customerInfo as any).email && (
                  <p>
                    {t.email}: {(invoice.customerInfo as any).email}
                  </p>
                )}
                {(invoice.customerInfo as any).address && (
                  <p>{(invoice.customerInfo as any).address}</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* جدول العناصر */}
      <div className="mb-8">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-300 bg-gray-50">
              <th className={`py-3 px-4 font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.description}
              </th>
              <th className={`py-3 px-4 font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-center'}`}>
                {t.sku}
              </th>
              <th className={`py-3 px-4 font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-center'}`}>
                {t.quantity}
              </th>
              <th className={`py-3 px-4 font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-center'}`}>
                {t.unitPrice}
              </th>
              <th className={`py-3 px-4 font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-right'}`}>
                {t.amount}
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.items?.map((item, index) => (
              <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                <td className={`py-3 px-4 text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <p className="font-medium">{item.name}</p>
                  {item.description && (
                    <p className="text-xs text-gray-500">{item.description}</p>
                  )}
                </td>
                <td className={`py-3 px-4 text-gray-600 text-sm ${isRTL ? 'text-right' : 'text-center'}`}>
                  {(item as any).sku || '-'}
                </td>
                <td className={`py-3 px-4 text-gray-600 text-center`}>
                  {item.quantity}
                </td>
                <td className={`py-3 px-4 text-gray-600 text-center`}>
                  {item.unitPrice?.toFixed(2) || '-'} دج
                </td>
                <td className={`py-3 px-4 font-semibold text-gray-900 ${isRTL ? 'text-right' : 'text-right'}`}>
                  {item.totalPrice?.toFixed(2) || '-'} دج
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* الإجماليات */}
      <div className="flex justify-end mb-8">
        <div className="w-full max-w-sm">
          <div className="space-y-2 border-t-2 border-gray-300 pt-4">
            <div className="flex justify-between text-gray-600">
              <span>{t.subtotal}:</span>
              <span>{invoice.subtotalAmount?.toFixed(2) || '-'} دج</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>{t.tax}:</span>
              <span>{invoice.taxAmount?.toFixed(2) || '-'} دج</span>
            </div>
            {invoice.discountAmount && invoice.discountAmount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>{t.discount}:</span>
                <span>- {invoice.discountAmount.toFixed(2)} دج</span>
              </div>
            )}
            {invoice.shippingAmount && invoice.shippingAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>{t.shipping}:</span>
                <span>+ {invoice.shippingAmount.toFixed(2)} دج</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold text-gray-900 border-t pt-2">
              <span>{t.finalTotal}:</span>
              <span>{invoice.totalAmount?.toFixed(2) || '-'} دج</span>
            </div>
          </div>
        </div>
      </div>

      {/* معلومات إضافية */}
      <div className="grid grid-cols-3 gap-8 mb-8 pb-8 border-b border-gray-200">
        {/* حالة الفاتورة */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
            {t.status}
          </p>
          <p
            className="text-lg font-bold"
            style={{ color: getStatusColor(invoice.status) }}
          >
            {getStatusLabel(invoice.status)}
          </p>
        </div>

        {/* طريقة الدفع */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
            {t.paymentMethod}
          </p>
          <p className="text-lg font-semibold text-gray-900">
            {getPaymentMethodLabel(invoice.paymentMethod)}
          </p>
        </div>

        {/* معلومات ضريبية */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
            {t.taxNumber}
          </p>
          <p className="text-lg font-semibold text-gray-900">
            {organizationSettings?.taxNumber || '-'}
          </p>
        </div>
      </div>

      {/* ملاحظات */}
      {invoice.notes && (
        <div className="mb-8">
          <h3 className="font-bold text-gray-900 mb-2">{t.notes}</h3>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">
            {invoice.notes}
          </p>
        </div>
      )}

      {/* تذييل الفاتورة */}
      <div className="text-center text-xs text-gray-500 pt-8 border-t border-gray-200 space-y-1">
        <p>شكراً لتعاملكم معنا</p>
        <p>Thank you for your business</p>
        <p>Merci de votre confiance</p>
        {organizationSettings?.rib && (
          <p className="text-xs text-gray-400 mt-2">
            RIB: {organizationSettings.rib}
          </p>
        )}
      </div>
    </div>
  );
});

ProfessionalInvoiceTemplate.displayName = 'ProfessionalInvoiceTemplate';

export default ProfessionalInvoiceTemplate;
