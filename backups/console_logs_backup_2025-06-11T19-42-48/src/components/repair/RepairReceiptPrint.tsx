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

  // تنسيق التاريخ
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(date);
  };

  // حساب المبلغ المتبقي
  const remainingAmount = order.total_price - order.paid_amount;

  return (
    <div className="repair-receipt p-4 bg-white" dir="rtl">
      {/* رأس الوصل */}
      <div className="text-center mb-4">
        {storeLogo && (
          <div className="flex justify-center mb-2">
            <img src={storeLogo} alt={storeName} className="h-16" />
          </div>
        )}
        <h1 className="text-xl font-bold">{storeName}</h1>
        {storeAddress && <p className="text-sm">{storeAddress}</p>}
        {storePhone && <p className="text-sm">هاتف: {storePhone}</p>}
      </div>

      {/* عنوان الوصل */}
      <div className="text-center border-t border-b py-2 mb-4">
        <h2 className="text-lg font-bold">إيصال استلام جهاز للتصليح</h2>
        <p className="text-sm">رقم الطلبية: {order.order_number || order.id.slice(0, 8)}</p>
        <p className="text-sm">تاريخ الاستلام: {formatDate(order.created_at)}</p>
      </div>

      {/* بيانات العميل */}
      <div className="mb-4">
        <h3 className="font-bold border-b pb-1 mb-2">بيانات العميل:</h3>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-sm">الاسم: {order.customer_name}</p>
            <p className="text-sm">الهاتف: {order.customer_phone}</p>
          </div>
          <div className="text-left ltr">
            <QRCodeSVG value={trackingUrl} size={80} />
          </div>
        </div>
      </div>

      {/* تفاصيل الجهاز والعطل */}
      <div className="mb-4">
        <h3 className="font-bold border-b pb-1 mb-2">تفاصيل الجهاز:</h3>
        {order.issue_description && (
          <p className="text-sm mb-2">وصف العطل: {order.issue_description}</p>
        )}
        {order.repair_notes && (
          <p className="text-sm">ملاحظات: {order.repair_notes}</p>
        )}
      </div>

      {/* تفاصيل الدفع */}
      <div className="mb-4">
        <h3 className="font-bold border-b pb-1 mb-2">تفاصيل الدفع:</h3>
        <div className="flex justify-between">
          <span className="text-sm">السعر الكلي:</span>
          <span className="text-sm">{order.total_price.toLocaleString()} دج</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm">المبلغ المدفوع:</span>
          <span className="text-sm">{order.paid_amount.toLocaleString()} دج</span>
        </div>
        {remainingAmount > 0 && (
          <div className="flex justify-between font-bold">
            <span className="text-sm">المبلغ المتبقي:</span>
            <span className="text-sm">{remainingAmount.toLocaleString()} دج</span>
          </div>
        )}
      </div>

      {/* تعليمات التتبع */}
      <div className="border-t pt-3 mb-4">
        <h3 className="font-bold text-center mb-2">تتبع حالة التصليح</h3>
        <p className="text-sm text-center mb-2">
          يمكنك متابعة حالة التصليح عبر مسح رمز QR أو زيارة الرابط:
        </p>
        <p className="text-sm text-center mb-2 font-bold" dir="ltr">
          {trackingUrl}
        </p>
        <p className="text-sm text-center">رمز التتبع: <span className="font-bold">{trackingCode}</span></p>
      </div>

      {/* شروط الخدمة */}
      <div className="text-xs border-t pt-3">
        <p className="mb-1">1. يجب تقديم هذا الإيصال عند استلام الجهاز.</p>
        <p className="mb-1">2. نحن غير مسؤولين عن الأجهزة التي لم يتم استلامها خلال 30 يوماً من إشعار الانتهاء.</p>
        <p className="mb-1">3. لا نتحمل مسؤولية فقدان البيانات. يرجى عمل نسخة احتياطية قبل التصليح.</p>
      </div>
    </div>
  );
};

export default RepairReceiptPrint; 