import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useUser } from '@/context/UserContext';
import { useTenant } from '@/context/TenantContext';
import { RepairOrder } from '@/types/repair';
import '@/styles/repair-print.css';

interface RepairReceiptPrintProps {
  order: RepairOrder;
  storeName: string;
  storePhone?: string;
  storeAddress?: string;
  storeLogo?: string;
  trackingUrl: string;
  queuePosition?: number;
}

const RepairReceiptPrint: React.FC<RepairReceiptPrintProps> = ({
  order,
  storeName,
  storePhone,
  storeAddress,
  storeLogo,
  trackingUrl,
  queuePosition
}) => {
  const { currentOrganization } = useTenant();
  
  // الحصول على رمز التتبع
  const trackingCode = order.repair_tracking_code || order.order_number || order.id;

  // بناء رابط المتجر الصحيح للـ QR code
  const buildStoreUrl = () => {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname.includes('127.0.0.1');
    
    // إذا كان هناك نطاق مخصص معرف في المنظمة
    if (currentOrganization?.domain) {
      return `https://${currentOrganization.domain}`;
    } 
    // إذا كان هناك نطاق فرعي معرف في المنظمة
    else if (currentOrganization?.subdomain) {
      // إذا كنا في بيئة تطوير محلية
      if (isLocalhost) {
        // استخدم النطاق الفرعي مع stockiha.com في بيئة التطوير
        return `https://${currentOrganization.subdomain}.stockiha.com`;
      } 
      // إذا كنا في بيئة إنتاج
      else {
        // تحقق ما إذا كان اسم المضيف يحتوي بالفعل على النطاق الفرعي
        if (hostname.startsWith(`${currentOrganization.subdomain}.`)) {
          // استخدم النطاق الحالي كما هو
          return window.location.origin;
        } else {
          // استخراج النطاق الرئيسي (مثل example.com)
          const domainParts = hostname.split('.');
          const mainDomain = domainParts.length >= 2 
            ? domainParts.slice(-2).join('.') 
            : hostname;
          
          return `https://${currentOrganization.subdomain}.${mainDomain}`;
        }
      }
    } 
    // إذا لم يكن هناك نطاق فرعي أو مخصص
    else {
      // في بيئة التطوير، استخدم stockiha.com
      if (isLocalhost) {
        return 'https://stockiha.com';
      }
      // في الإنتاج، استخدم النطاق الحالي
      else {
        return window.location.origin;
      }
    }
  };

  const storeUrl = buildStoreUrl();

  // تنسيق التاريخ - ميلادي عربي مع الأرقام الإنجليزية
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar-EG', {
      calendar: 'gregory',
      numberingSystem: 'latn',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
  };

  // تحويل الأرقام العربية إلى إنجليزية
  const convertToEnglishNumbers = (num: number | string) => {
    return num.toString().replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
  };

  // حساب المبلغ المتبقي (فقط إذا لم يكن السعر مؤجل التحديد)
  const remainingAmount = order.price_to_be_determined_later ? 0 : ((order.total_price || 0) - (order.paid_amount || 0));

  return (
    <div 
      className="repair-receipt bg-white" 
      dir="rtl"
      style={{
        fontFamily: "'Cairo', 'Tahoma', sans-serif",
        lineHeight: '1.4',
        fontSize: '12px',
        width: '80mm',
        maxWidth: '300px',
        margin: '0 auto'
      }}
    >
      {/* إضافة الخطوط العربية والتنسيقات */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700&display=swap');
          
          .repair-receipt {
            font-family: 'Cairo', 'Tahoma', sans-serif !important;
            line-height: 1.4;
            font-size: 12px;
          }
          
          .receipt-title {
            font-family: 'Cairo', sans-serif !important;
            font-weight: 600;
          }
          
          .receipt-content {
            font-family: 'Cairo', sans-serif !important;
          }
          
          .receipt-numbers {
            font-family: 'Cairo', sans-serif !important;
            direction: ltr;
            display: inline-block;
          }
          
          @media print {
            .repair-receipt {
              font-family: 'Cairo', 'Tahoma', sans-serif !important;
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
              width: 80mm;
              font-size: 11px;
            }
            
            .no-print {
              display: none !important;
            }
          }
        `
      }} />

      {/* ====================== الجزء الأول: إيصال العميل ====================== */}
      <div className="customer-receipt p-3 border-b border-gray-300 receipt-content">
        {/* رأس الوصل المحسن */}
        <div className="text-center mb-3">
          <div className="flex items-center justify-center gap-2 mb-2">
            {storeLogo && (
              <img src={storeLogo} alt={storeName} className="h-8 w-8 object-contain" />
            )}
            <h1 className="text-base font-bold receipt-title">{storeName}</h1>
          </div>
          {storePhone && <p className="text-xs mb-1">📞 <span className="receipt-numbers">{convertToEnglishNumbers(storePhone)}</span></p>}
          {storeAddress && <p className="text-xs text-gray-600">{storeAddress}</p>}
        </div>

        {/* عنوان الوصل المحسن */}
        <div className="text-center bg-blue-50 border border-blue-200 rounded p-2 mb-3">
          <h2 className="text-sm font-bold receipt-title text-blue-800">🔧 إيصال استلام جهاز للتصليح</h2>
          <div className="flex justify-between items-center mt-1 text-xs">
            <span>رقم: <span className="receipt-numbers font-bold">{convertToEnglishNumbers(order.order_number || order.id.slice(0, 8))}</span></span>
            <span className="receipt-numbers">{formatDate(order.created_at)}</span>
          </div>
        </div>

        {/* بيانات العميل مع QR */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-bold text-xs border-b pb-1 mb-1 receipt-title">بيانات العميل:</h3>
            <p className="text-xs mb-1"><span className="font-bold">👤</span> {order.customer_name}</p>
            <p className="text-xs"><span className="font-bold">📱</span> <span className="receipt-numbers">{convertToEnglishNumbers(order.customer_phone)}</span></p>
          </div>
          <div className="text-center">
            <QRCodeSVG 
              value={`${storeUrl}/repair-tracking/${trackingCode}`} 
              size={45}
              level="M"
              className="border border-gray-200 rounded"
            />
            <p className="text-xs mt-1 text-gray-600">تتبع الطلبية</p>
          </div>
        </div>

        {/* تفاصيل العطل والدفع المحسنة */}
        <div className="space-y-2 mb-3">
          {/* وصف العطل */}
          {order.issue_description && (
            <div className="bg-gray-50 border border-gray-200 rounded p-2">
              <h3 className="font-bold text-xs mb-1 receipt-title">🔍 وصف العطل:</h3>
              <p className="text-xs">{order.issue_description}</p>
            </div>
          )}
          
          {/* تفاصيل الدفع */}
          <div className="bg-green-50 border border-green-200 rounded p-2">
            <h3 className="font-bold text-xs mb-1 receipt-title text-green-800">💰 تفاصيل الدفع:</h3>
            {order.price_to_be_determined_later ? (
              <div className="text-center">
                <p className="text-xs font-bold text-amber-600">💡 السعر يحدد لاحقاً</p>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>السعر الكلي:</span>
                  <span className="receipt-numbers font-bold">{convertToEnglishNumbers((order.total_price || 0).toLocaleString())} دج</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>المدفوع:</span>
                  <span className="receipt-numbers text-green-600 font-bold">{convertToEnglishNumbers((order.paid_amount || 0).toLocaleString())} دج</span>
                </div>
                {remainingAmount > 0 && (
                  <div className="flex justify-between text-xs border-t border-green-300 pt-1">
                    <span className="font-bold">المتبقي:</span>
                    <span className="receipt-numbers text-red-600 font-bold">{convertToEnglishNumbers(remainingAmount.toLocaleString())} دج</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* تعليمات التتبع المحسنة */}
        <div className="border-t border-gray-300 pt-2 text-center">
          <p className="text-xs mb-1">🔗 <span className="font-bold">رمز التتبع:</span> <span className="receipt-numbers font-bold">{convertToEnglishNumbers(trackingCode)}</span></p>
          <p className="text-xs text-gray-600">امسح رمز QR أو ادخل على الموقع لمتابعة حالة التصليح</p>
        </div>

        {/* شروط الخدمة المختصرة */}
        <div className="text-xs border-t border-gray-300 pt-2 mt-2 text-gray-600">
          <p className="mb-1">• يجب تقديم هذا الإيصال عند الاستلام</p>
          <p className="mb-1">• عدم المسؤولية عن فقدان البيانات</p>
          <p>• الاستلام خلال 30 يوماً من الإشعار</p>
        </div>
      </div>

      {/* ====================== خط الفصل للقطع ====================== */}
      <div className="cut-line flex items-center justify-center py-1 bg-gray-100">
        <div className="flex items-center w-full">
          <div className="flex-1 border-t border-dashed border-gray-400"></div>
          <div className="px-2 text-center">
            <span className="text-sm">✂️</span>
            <p className="text-xs text-gray-500">قص هنا</p>
          </div>
          <div className="flex-1 border-t border-dashed border-gray-400"></div>
        </div>
      </div>

      {/* ====================== الجزء الثاني: لصقة الجهاز المحسنة ====================== */}
      <div className="device-label p-3 bg-yellow-50 border-2 border-yellow-400 receipt-content">
        {/* رأس اللصقة */}
        <div className="text-center mb-2">
          <h2 className="text-sm font-bold text-yellow-800 receipt-title">🏷️ لصقة الجهاز</h2>
        </div>

        {/* رقم الطلبية بارز */}
        <div className="bg-red-500 text-white rounded-lg p-2 mb-2 text-center">
          <p className="text-xs mb-1">رقم الطلبية</p>
          <p className="text-xl font-black receipt-numbers tracking-wider">
            #{convertToEnglishNumbers(order.order_number || order.id.slice(0, 8))}
          </p>
        </div>

        {/* ترتيب الطلبية في الجدول */}
        {queuePosition !== undefined && queuePosition > 0 && (
          <div className="bg-blue-500 text-white rounded-lg p-2 mb-2 text-center">
            <p className="text-xs mb-1">رقم الترتيب</p>
            <p className="text-lg font-black receipt-numbers">
              {convertToEnglishNumbers(queuePosition)}
            </p>
          </div>
        )}

        {/* المعلومات الأساسية المحسنة */}
        <div className="space-y-1 mb-2">
          <div className="flex justify-between items-center text-xs">
            <span>👤 العميل:</span>
            <span className="font-bold">{order.customer_name}</span>
          </div>
          
          <div className="flex justify-between items-center text-xs">
            <span>📱 الهاتف:</span>
            <span className="font-bold receipt-numbers">{convertToEnglishNumbers(order.customer_phone)}</span>
          </div>
          
          <div className="flex justify-between items-center text-xs">
            <span>📅 التاريخ:</span>
            <span className="receipt-numbers">{formatDate(order.created_at)}</span>
          </div>
          
          <div className="flex justify-between items-center text-xs">
            <span>⚡ الحالة:</span>
            <span className="font-bold px-2 py-1 rounded text-xs" style={{
              backgroundColor: order.status === 'قيد الانتظار' ? '#fef3c7' : 
                             order.status === 'جاري التصليح' ? '#dbeafe' :
                             order.status === 'مكتمل' ? '#d1fae5' : '#fee2e2',
              color: order.status === 'قيد الانتظار' ? '#d97706' : 
                     order.status === 'جاري التصليح' ? '#2563eb' :
                     order.status === 'مكتمل' ? '#059669' : '#dc2626'
            }}>
              {order.status}
            </span>
          </div>
          
          {order.issue_description && (
            <div className="border-t border-yellow-400 pt-1">
              <p className="text-xs"><span className="font-bold">🔧 العطل:</span> {order.issue_description}</p>
            </div>
          )}
        </div>

        {/* معلومات الدفع */}
        {order.price_to_be_determined_later ? (
          <div className="bg-amber-200 border border-amber-400 rounded p-1 mb-2 text-center">
            <p className="text-xs font-bold text-amber-800">💡 السعر يحدد لاحقاً</p>
          </div>
        ) : (
          <div className="bg-green-100 border border-green-300 rounded p-1 mb-2">
            <div className="flex justify-between items-center text-xs">
              <span>💰 مدفوع:</span>
              <span className="font-bold text-green-600 receipt-numbers">{convertToEnglishNumbers((order.paid_amount || 0).toLocaleString())} دج</span>
            </div>
            {remainingAmount > 0 && (
              <div className="flex justify-between items-center text-xs">
                <span>⏳ متبقي:</span>
                <span className="font-bold text-red-600 receipt-numbers">{convertToEnglishNumbers(remainingAmount.toLocaleString())} دج</span>
              </div>
            )}
          </div>
        )}

        {/* QR codes محسنة */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          {/* QR للتتبع */}
          <div className="bg-blue-100 border border-blue-300 rounded p-1 text-center">
            <QRCodeSVG 
              value={`${storeUrl}/repair-tracking/${trackingCode}`} 
              size={35}
              level="M"
            />
            <p className="text-xs text-blue-700 mt-1">📱 تتبع</p>
          </div>
          
          {/* QR لإنهاء التصليح */}
          <div className="bg-green-100 border border-green-300 rounded p-1 text-center">
            <QRCodeSVG 
              value={`${storeUrl}/repair-complete/${order.id}`} 
              size={35}
              level="M"
            />
            <p className="text-xs text-green-700 mt-1">✅ إنهاء</p>
          </div>
        </div>

        {/* كود التتبع */}
        <div className="bg-gray-100 border border-gray-300 rounded p-1 text-center mb-2">
          <p className="text-xs"><span className="font-bold">🔑 كود:</span> <span className="receipt-numbers font-bold">{convertToEnglishNumbers(trackingCode)}</span></p>
        </div>

        {/* مساحة لملاحظات الفني */}
        <div className="border-2 border-dashed border-gray-400 rounded p-1">
          <p className="text-xs font-bold text-gray-700 mb-1">📝 ملاحظات الفني:</p>
          <div className="space-y-1">
            <div className="border-b border-gray-300 h-2"></div>
            <div className="border-b border-gray-300 h-2"></div>
          </div>
        </div>
        
        {/* تعليمات للفني */}
        <div className="mt-2 p-1 bg-red-100 border border-red-300 rounded text-center">
          <p className="text-xs text-red-700">
            ⚠️ <span className="font-bold">احتفظ بهذه اللصقة مع الجهاز</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RepairReceiptPrint;
