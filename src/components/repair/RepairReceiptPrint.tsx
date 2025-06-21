import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useUser } from '@/context/UserContext';
import { useTenant } from '@/context/TenantContext';
import { RepairOrder } from '@/types/repair';

interface RepairReceiptPrintProps {
  order: RepairOrder;
  storeName: string;
  storePhone?: string;
  storeAddress?: string;
  storeLogo?: string;
  trackingUrl: string;
}

const RepairReceiptPrint: React.FC<RepairReceiptPrintProps> = ({
  order,
  storeName,
  storePhone,
  storeAddress,
  storeLogo,
  trackingUrl
}) => {
  // الحصول على رمز التتبع
  const trackingCode = order.repair_tracking_code || order.order_number || order.id;

  // تنسيق التاريخ - ميلادي عربي مع الأرقام الإنجليزية
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar-EG', {
      calendar: 'gregory', // استخدام التقويم الميلادي
      numberingSystem: 'latn', // استخدام الأرقام الإنجليزية
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  // تحويل الأرقام العربية إلى إنجليزية
  const convertToEnglishNumbers = (num: number | string) => {
    return num.toString().replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
  };

  // حساب المبلغ المتبقي (فقط إذا لم يكن السعر مؤجل التحديد)
  const remainingAmount = order.price_to_be_determined_later ? 0 : (order.total_price - order.paid_amount);

  return (
    <div 
      className="repair-receipt bg-white" 
      dir="rtl"
      style={{
        fontFamily: "'Cairo', 'Amiri', 'Tahoma', sans-serif",
        lineHeight: '1.6'
      }}
    >
      {/* إضافة الخطوط العربية الجميلة */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @import url('https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Cairo:wght@200;300;400;500;600;700&display=swap');
          
          .repair-receipt {
            font-family: 'Cairo', 'Amiri', 'Tahoma', sans-serif !important;
            line-height: 1.6;
          }
          
          .receipt-title {
            font-family: 'Amiri', serif !important;
            font-weight: 700;
          }
          
          .receipt-content {
            font-family: 'Cairo', sans-serif !important;
          }
          
          .receipt-numbers {
            font-family: 'Cairo', sans-serif !important;
            direction: ltr;
          }
          
          @media print {
            .repair-receipt {
              font-family: 'Cairo', 'Amiri', 'Tahoma', sans-serif !important;
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
          }
        `
      }} />

      {/* ====================== الجزء الأول: إيصال العميل ====================== */}
      <div className="customer-receipt p-4 border-b-2 border-gray-200 receipt-content">
        {/* رأس الوصل */}
        <div className="text-center mb-4">
          {storeLogo && (
            <div className="flex justify-center mb-2">
              <img src={storeLogo} alt={storeName} className="h-16" />
            </div>
          )}
          <h1 className="text-xl font-bold receipt-title">{storeName}</h1>
          {storeAddress && <p className="text-sm">{storeAddress}</p>}
          {storePhone && <p className="text-sm">هاتف: <span className="receipt-numbers">{convertToEnglishNumbers(storePhone)}</span></p>}
        </div>

        {/* عنوان الوصل */}
        <div className="text-center border-t border-b py-2 mb-4">
          <h2 className="text-lg font-bold receipt-title">إيصال استلام جهاز للتصليح</h2>
          <p className="text-sm font-bold text-blue-600">نسخة العميل</p>
          <p className="text-sm">رقم الطلبية: <span className="receipt-numbers font-bold">{convertToEnglishNumbers(order.order_number || order.id.slice(0, 8))}</span></p>
          <p className="text-sm">تاريخ الاستلام: {formatDate(order.created_at)}</p>
        </div>

        {/* بيانات العميل */}
        <div className="mb-4">
          <h3 className="font-bold border-b pb-1 mb-2 receipt-title">بيانات العميل:</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-sm"><span className="font-bold">الاسم:</span> {order.customer_name}</p>
              <p className="text-sm"><span className="font-bold">الهاتف:</span> <span className="receipt-numbers">{convertToEnglishNumbers(order.customer_phone)}</span></p>
            </div>
            <div className="text-left ltr">
              <QRCodeSVG value={trackingUrl} size={60} />
            </div>
          </div>
        </div>

        {/* تفاصيل العطل والدفع */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <h3 className="font-bold border-b pb-1 mb-2 receipt-title">تفاصيل العطل:</h3>
            {order.issue_description && (
              <p className="text-sm"><span className="font-bold">وصف العطل:</span> {order.issue_description}</p>
            )}
            {order.repair_notes && (
              <p className="text-sm"><span className="font-bold">ملاحظات:</span> {order.repair_notes}</p>
            )}
          </div>
          
          <div>
            <h3 className="font-bold border-b pb-1 mb-2 receipt-title">تفاصيل الدفع:</h3>
            {order.price_to_be_determined_later ? (
              <div className="bg-amber-50 border border-amber-200 rounded p-2 text-center">
                <p className="text-sm font-bold text-amber-800">💡 السعر يحدد لاحقاً</p>
                <p className="text-xs text-amber-600">سيتم تحديد السعر بعد فحص الجهاز</p>
              </div>
            ) : (
              <>
                <p className="text-sm"><span className="font-bold">السعر الكلي:</span> <span className="receipt-numbers">{convertToEnglishNumbers(order.total_price.toLocaleString())}</span> دج</p>
                <p className="text-sm"><span className="font-bold">المبلغ المدفوع:</span> <span className="receipt-numbers text-green-600">{convertToEnglishNumbers(order.paid_amount.toLocaleString())}</span> دج</p>
                {remainingAmount > 0 && (
                  <p className="text-sm font-bold text-red-600"><span>المبلغ المتبقي:</span> <span className="receipt-numbers">{convertToEnglishNumbers(remainingAmount.toLocaleString())}</span> دج</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* تعليمات التتبع */}
        <div className="border-t pt-3 mb-4">
          <h3 className="font-bold text-center mb-2 receipt-title">تتبع حالة التصليح</h3>
          <p className="text-sm text-center mb-2">
            يمكنك متابعة حالة التصليح عبر مسح رمز QR أو زيارة الرابط:
          </p>
          <p className="text-sm text-center mb-2 font-bold receipt-numbers" dir="ltr">
            {trackingUrl}
          </p>
          <p className="text-sm text-center">رمز التتبع: <span className="font-bold receipt-numbers">{convertToEnglishNumbers(trackingCode)}</span></p>
        </div>

        {/* شروط الخدمة */}
        <div className="text-xs border-t pt-3">
          <p className="mb-1">1. يجب تقديم هذا الإيصال عند استلام الجهاز.</p>
          <p className="mb-1">2. نحن غير مسؤولين عن الأجهزة التي لم يتم استلامها خلال 30 يوماً من إشعار الانتهاء.</p>
          <p className="mb-1">3. لا نتحمل مسؤولية فقدان البيانات. يرجى عمل نسخة احتياطية قبل التصليح.</p>
        </div>
      </div>

      {/* ====================== خط الفصل للقطع ====================== */}
      <div className="cut-line flex items-center justify-center py-2 bg-gray-50">
        <div className="flex items-center w-full">
          <div className="flex-1 border-t-2 border-dashed border-gray-400"></div>
          <div className="px-4 text-center">
            <span className="text-lg">✂️</span>
            <p className="text-xs text-gray-600 receipt-content">قص هنا</p>
          </div>
          <div className="flex-1 border-t-2 border-dashed border-gray-400"></div>
        </div>
      </div>

      {/* ====================== الجزء الثاني: لصقة الجهاز ====================== */}
      <div className="device-label p-3 bg-yellow-50 border border-yellow-200 receipt-content">
        {/* رأس اللصقة */}
        <div className="text-center mb-3">
          <h2 className="text-base font-bold text-yellow-800 receipt-title">لصقة الجهاز</h2>
          <p className="text-xs text-yellow-700">يُلصق على الجهاز المستلم</p>
        </div>

        {/* المعلومات الأساسية */}
        <div className="space-y-2">
          <div className="flex justify-between items-center border-b border-yellow-300 pb-1">
            <span className="text-sm font-bold">رقم الطلبية:</span>
            <span className="text-sm font-bold text-red-600 receipt-numbers">{convertToEnglishNumbers(order.order_number || order.id.slice(0, 8))}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-xs">العميل:</span>
            <span className="text-xs font-bold">{order.customer_name}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-xs">الهاتف:</span>
            <span className="text-xs font-bold receipt-numbers">{convertToEnglishNumbers(order.customer_phone)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-xs">تاريخ الاستلام:</span>
            <span className="text-xs">{formatDate(order.created_at)}</span>
          </div>
          
          {order.issue_description && (
            <div className="border-t border-yellow-300 pt-2">
              <p className="text-xs"><span className="font-bold">العطل:</span> {order.issue_description}</p>
            </div>
          )}
          
          {order.price_to_be_determined_later ? (
            <div className="border-t border-yellow-300 pt-2 text-center">
              <div className="bg-amber-100 border border-amber-300 rounded px-2 py-1">
                <p className="text-xs font-bold text-amber-800">السعر يحدد لاحقاً</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center border-t border-yellow-300 pt-2">
                <span className="text-xs">المبلغ المدفوع:</span>
                <span className="text-xs font-bold text-green-600 receipt-numbers">{convertToEnglishNumbers(order.paid_amount.toLocaleString())}</span> دج
              </div>
              
              {remainingAmount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-xs">المتبقي:</span>
                  <span className="text-xs font-bold text-red-600 receipt-numbers">{convertToEnglishNumbers(remainingAmount.toLocaleString())}</span> دج
                </div>
              )}
            </>
          )}
        </div>

        {/* كود التتبع */}
        <div className="mt-3 p-2 bg-yellow-100 rounded text-center">
          <p className="text-xs font-bold">كود التتبع: <span className="receipt-numbers">{convertToEnglishNumbers(trackingCode)}</span></p>
        </div>
      </div>
    </div>
  );
};

export default RepairReceiptPrint;
