import { forwardRef } from 'react';
import { format } from 'date-fns';
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
    bonCommande: 'أمر شراء',
    orderNumber: 'رقم الأمر',
    orderDate: 'التاريخ',
    deliveryDate: 'تاريخ التسليم المتوقع',
    supplier: 'المورد',
    buyer: 'المشتري',
    description: 'البيان',
    reference: 'المرجع',
    quantity: 'الكمية',
    unitPrice: 'السعر الوحدة',
    amount: 'المبلغ',
    subtotal: 'المجموع الفرعي',
    tax: 'الضريبة',
    total: 'الإجمالي',
    phone: 'الهاتف',
    email: 'البريد',
    website: 'الموقع',
    address: 'العنوان',
    activity: 'النشاط',
    rc: 'السجل التجاري',
    nif: 'الرقم الضريبي',
    nis: 'الرقم الإحصائي',
    rib: 'الحساب البنكي',
    notes: 'ملاحظات',
    terms: 'الشروط والأحكام',
    signature: 'التوقيع',
    buyerSignature: 'توقيع المشتري',
    supplierSignature: 'توقيع المورد',
    orderNote: 'هذا أمر شراء رسمي يلزم الطرفين بالشروط المذكورة',
    deliveryNote: 'يجب التسليم في الموعد المحدد مع مراعاة الجودة المطلوبة',
  },
  fr: {
    bonCommande: 'Bon de Commande',
    orderNumber: 'N° Commande',
    orderDate: 'Date',
    deliveryDate: 'Date de Livraison Prévue',
    supplier: 'Fournisseur',
    buyer: 'Acheteur',
    description: 'Désignation',
    reference: 'Référence',
    quantity: 'Quantité',
    unitPrice: 'Prix Unitaire',
    amount: 'Montant',
    subtotal: 'Sous-total',
    tax: 'Taxe',
    total: 'Total',
    phone: 'Téléphone',
    email: 'Email',
    website: 'Site Web',
    address: 'Adresse',
    activity: 'Activité',
    rc: 'Registre Commercial',
    nif: 'N° Fiscal',
    nis: 'N° Statistique',
    rib: 'RIB',
    notes: 'Remarques',
    terms: 'Termes et Conditions',
    signature: 'Signature',
    buyerSignature: 'Signature Acheteur',
    supplierSignature: 'Signature Fournisseur',
    orderNote: 'Ceci est un bon de commande officiel qui engage les deux parties aux conditions mentionnées',
    deliveryNote: 'La livraison doit être effectuée à la date prévue en respectant la qualité requise',
  },
  en: {
    bonCommande: 'Purchase Order',
    orderNumber: 'Order No.',
    orderDate: 'Date',
    deliveryDate: 'Expected Delivery Date',
    supplier: 'Supplier',
    buyer: 'Buyer',
    description: 'Description',
    reference: 'Reference',
    quantity: 'Qty',
    unitPrice: 'Unit Price',
    amount: 'Amount',
    subtotal: 'Subtotal',
    tax: 'Tax',
    total: 'Total',
    phone: 'Phone',
    email: 'Email',
    website: 'Website',
    address: 'Address',
    activity: 'Activity',
    rc: 'Commercial Registration',
    nif: 'Tax Number',
    nis: 'Statistical Number',
    rib: 'Bank Account',
    notes: 'Notes',
    terms: 'Terms and Conditions',
    signature: 'Signature',
    buyerSignature: 'Buyer Signature',
    supplierSignature: 'Supplier Signature',
    orderNote: 'This is an official purchase order that binds both parties to the mentioned conditions',
    deliveryNote: 'Delivery must be made on the scheduled date while respecting the required quality',
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

const BonCommandeTemplate = forwardRef<
  HTMLDivElement,
  BonCommandeTemplateProps
>(({ invoice, language, organizationLogo, organizationSettings }, ref) => {
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

  // حساب تاريخ التسليم المتوقع (7 أيام من تاريخ الأمر)
  const getDeliveryDate = () => {
    if (!invoice.invoiceDate) return '-';
    try {
      const date = new Date(invoice.invoiceDate);
      date.setDate(date.getDate() + 7);
      return format(date, 'dd/MM/yyyy', { locale });
    } catch {
      return '-';
    }
  };

  return (
    <div
      ref={ref}
      className="bg-white min-h-screen"
      style={{ direction: isRTL ? 'rtl' : 'ltr' }}
    >
      {/* رأس أمر الشراء */}
      <div className="bg-gradient-to-r from-green-700 to-green-600 text-white p-8">
        <div className="flex justify-between items-start gap-8 max-w-7xl mx-auto">
          <div className="flex items-start gap-6">
            {organizationLogo ? (
              <img
                src={organizationLogo}
                alt="Logo"
                className="h-20 w-20 object-contain bg-white rounded p-1"
              />
            ) : (
              <div className="h-20 w-20 bg-white rounded flex items-center justify-center text-green-700 font-bold text-sm">
                LOGO
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold mb-1">
                {organizationSettings?.name || 'اسم المحل'}
              </h1>
              {organizationSettings?.activity && (
                <p className="text-green-100 text-sm mb-2">
                  {organizationSettings.activity}
                </p>
              )}
              <div className="text-xs text-green-100 space-y-1">
                {organizationSettings?.address && (
                  <p>{organizationSettings.address}</p>
                )}
                {organizationSettings?.phone && (
                  <p>{organizationSettings.phone}</p>
                )}
                {organizationSettings?.email && (
                  <p>{organizationSettings.email}</p>
                )}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-5xl font-bold mb-2">{t.bonCommande}</div>
            <div className="bg-white text-green-700 px-4 py-2 rounded font-bold text-lg">
              #{invoice.invoiceNumber}
            </div>
          </div>
        </div>
      </div>

      {/* تنبيه أمر الشراء */}
      <div className="bg-green-50 border-l-4 border-green-600 px-8 py-4">
        <div className="max-w-7xl mx-auto">
          <p className="text-green-800 font-semibold text-sm">
            📋 {t.orderNote}
          </p>
        </div>
      </div>

      {/* البيانات الرسمية */}
      <div className="bg-gray-50 px-8 py-4 border-b-2 border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {organizationSettings?.registrationNumber && (
              <div className="flex justify-between">
                <span className="font-bold text-gray-900">{t.rc}:</span>
                <span className="text-gray-700">{organizationSettings.registrationNumber}</span>
              </div>
            )}
            {organizationSettings?.taxNumber && (
              <div className="flex justify-between">
                <span className="font-bold text-gray-900">{t.nif}:</span>
                <span className="text-gray-700">{organizationSettings.taxNumber}</span>
              </div>
            )}
            {organizationSettings?.nis && (
              <div className="flex justify-between">
                <span className="font-bold text-gray-900">{t.nis}:</span>
                <span className="text-gray-700">{organizationSettings.nis}</span>
              </div>
            )}
            {organizationSettings?.rib && (
              <div className="flex justify-between">
                <span className="font-bold text-gray-900">{t.rib}:</span>
                <span className="text-gray-700">{organizationSettings.rib}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* محتوى أمر الشراء */}
      <div className="p-8 max-w-7xl mx-auto">
        {/* معلومات المشتري والمورد */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-bold text-green-700 mb-3 pb-2 border-b-2 border-green-200">
              {t.buyer}
            </h3>
            <div className="text-sm space-y-1 text-gray-700">
              <p className="font-semibold">{organizationSettings?.name}</p>
              {organizationSettings?.address && <p>{organizationSettings.address}</p>}
              {organizationSettings?.phone && <p>{organizationSettings.phone}</p>}
              {organizationSettings?.email && <p>{organizationSettings.email}</p>}
            </div>
          </div>

          <div>
            <h3 className="font-bold text-green-700 mb-3 pb-2 border-b-2 border-green-200">
              {t.supplier}
            </h3>
            <div className="text-sm space-y-1 text-gray-700">
              <p className="font-semibold">{invoice.customerName}</p>
              {invoice.customerInfo && typeof invoice.customerInfo === 'object' && (
                <>
                  {(invoice.customerInfo as any).address && (
                    <p>{(invoice.customerInfo as any).address}</p>
                  )}
                  {(invoice.customerInfo as any).phone && (
                    <p>{(invoice.customerInfo as any).phone}</p>
                  )}
                  {(invoice.customerInfo as any).email && (
                    <p>{(invoice.customerInfo as any).email}</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* معلومات التواريخ */}
        <div className="grid grid-cols-2 gap-4 mb-8 bg-green-50 p-4 rounded border border-green-200">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-1">{t.orderDate}</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatDate(invoice.invoiceDate)}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-1">{t.deliveryDate}</p>
            <p className="text-lg font-semibold text-green-700">
              {getDeliveryDate()}
            </p>
          </div>
        </div>

        {/* جدول المنتجات */}
        <div className="mb-8">
          <table className="w-full">
            <thead>
              <tr className="bg-green-700 text-white">
                <th className={`py-3 px-4 font-bold ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.description}
                </th>
                <th className="py-3 px-4 font-bold text-center">{t.quantity}</th>
                <th className="py-3 px-4 font-bold text-center">{t.unitPrice}</th>
                <th className={`py-3 px-4 font-bold ${isRTL ? 'text-left' : 'text-right'}`}>
                  {t.amount}
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className={`py-3 px-4 text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <p className="font-medium">{item.name}</p>
                    {item.description && (
                      <p className="text-xs text-gray-500">{item.description}</p>
                    )}
                  </td>
                  <td className="py-3 px-4 text-gray-900 text-center">{item.quantity}</td>
                  <td className="py-3 px-4 text-gray-900 text-center">
                    {item.unitPrice?.toFixed(2) || '-'} دج
                  </td>
                  <td className={`py-3 px-4 font-semibold text-gray-900 ${isRTL ? 'text-left' : 'text-right'}`}>
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
            <div className="space-y-2 border-t-2 border-green-200 pt-4">
              <div className="flex justify-between text-gray-700">
                <span>{t.subtotal}:</span>
                <span className="font-semibold">{invoice.subtotalAmount?.toFixed(2) || '-'} دج</span>
              </div>
              {invoice.discountAmount && invoice.discountAmount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>الخصم:</span>
                  <span className="font-semibold">- {invoice.discountAmount.toFixed(2)} دج</span>
                </div>
              )}
              <div className="flex justify-between text-gray-700">
                <span>{t.tax}:</span>
                <span className="font-semibold">{invoice.taxAmount?.toFixed(2) || '-'} دج</span>
              </div>
              {invoice.shippingAmount && invoice.shippingAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>الشحن:</span>
                  <span className="font-semibold">+ {invoice.shippingAmount.toFixed(2)} دج</span>
                </div>
              )}
              <div className="flex justify-between bg-green-700 text-white px-4 py-3 rounded mt-4">
                <span className="font-bold text-lg">{t.total}:</span>
                <span className="font-bold text-lg">{invoice.totalAmount?.toFixed(2) || '-'} دج</span>
              </div>
            </div>
          </div>
        </div>

        {/* ملاحظة التسليم */}
        <div className="mb-8 bg-blue-50 border-l-4 border-blue-400 p-4">
          <p className="text-sm text-blue-800">
            🚚 {t.deliveryNote}
          </p>
        </div>

        {/* الملاحظات */}
        {invoice.notes && (
          <div className="mb-8 bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <h3 className="font-bold text-gray-900 mb-2">{t.notes}</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}

        {/* التوقيعات */}
        <div className="grid grid-cols-2 gap-8 mb-8 pt-8 border-t-2 border-gray-200">
          <div>
            <h3 className="font-bold text-gray-900 mb-4">{t.buyerSignature}</h3>
            <div className="border-2 border-dashed border-gray-300 h-32 rounded flex items-center justify-center text-gray-400">
              {t.signature}
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              {organizationSettings?.name}
            </p>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 mb-4">{t.supplierSignature}</h3>
            <div className="border-2 border-dashed border-gray-300 h-32 rounded flex items-center justify-center text-gray-400">
              {t.signature}
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              {invoice.customerName}
            </p>
          </div>
        </div>

        {/* التذييل */}
        <div className="border-t-2 border-green-200 pt-8 text-center text-xs text-gray-600 space-y-2">
          <p className="font-semibold text-green-700">
            أمر شراء رسمي ملزم للطرفين
          </p>
          <p>Bon de commande officiel engageant les deux parties</p>
          <p>Official purchase order binding both parties</p>
          {organizationSettings?.website && (
            <p className="text-green-700 mt-4">{organizationSettings.website}</p>
          )}
        </div>
      </div>
    </div>
  );
});

BonCommandeTemplate.displayName = 'BonCommandeTemplate';

export default BonCommandeTemplate;
