import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useUser } from '@/context/UserContext';
import { useTenant } from '@/context/TenantContext';
import { RepairOrder } from '@/types/repair';
import { buildStoreUrl } from '@/lib/utils/store-url';
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

  // بناء رابط المتجر الصحيح باستخدام الدالة المشتركة
  const storeUrl = buildStoreUrl(currentOrganization);

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
      className="repair-receipt" 
      dir="rtl"
      style={{
        fontFamily: "'Amiri', 'Noto Sans Arabic', 'Cairo', 'Tahoma', sans-serif",
        lineHeight: '1.6',
        fontSize: '14px',
        width: '80mm',
        maxWidth: '300px',
        margin: '0 auto',
        backgroundColor: 'white',
        color: 'black'
      }}
    >
      {/* إضافة الخطوط العربية المحسنة */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Noto+Sans+Arabic:wght@300;400;500;600;700&display=swap');
          
          .repair-receipt {
            font-family: 'Amiri', 'Noto Sans Arabic', 'Cairo', 'Tahoma', sans-serif !important;
            line-height: 1.6;
            font-size: 14px;
            color: black !important;
          }
          
          .receipt-title {
            font-family: 'Amiri', 'Noto Sans Arabic', sans-serif !important;
            font-weight: 700;
          }
          
          .receipt-content {
            font-family: 'Noto Sans Arabic', 'Amiri', sans-serif !important;
            font-weight: 400;
          }
          
          .receipt-numbers {
            font-family: 'Noto Sans Arabic', sans-serif !important;
            direction: ltr;
            display: inline-block;
            font-weight: 500;
          }

          .receipt-header {
            text-align: center;
            border-bottom: 2px solid black;
            padding-bottom: 8px;
            margin-bottom: 12px;
          }

          .receipt-section {
            margin-bottom: 10px;
            padding: 6px 0;
          }

          .receipt-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 4px 0;
          }

          .dashed-line {
            border-top: 1px dashed black;
            margin: 8px 0;
          }

          .solid-line {
            border-top: 1px solid black;
            margin: 6px 0;
          }

          .qr-section {
            text-align: center;
            margin: 12px 0;
          }
          
          @media print {
            .repair-receipt {
              font-family: 'Amiri', 'Noto Sans Arabic', 'Tahoma', sans-serif !important;
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
              width: 80mm;
              font-size: 13px;
              background: white !important;
              color: black !important;
            }
            
            .no-print {
              display: none !important;
            }

            * {
              background: white !important;
              color: black !important;
              border-color: black !important;
            }
          }
        `
      }} />

      {/* ====================== الجزء الأول: إيصال العميل ====================== */}
      <div className="customer-receipt receipt-content">
        
        {/* رأس الوصل */}
        <div className="receipt-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '6px' }}>
            {storeLogo && (
              <img src={storeLogo} alt={storeName} style={{ height: '32px', width: '32px', objectFit: 'contain' }} />
            )}
            <h1 className="receipt-title" style={{ fontSize: '18px', margin: '0', fontWeight: '700' }}>
              {storeName}
            </h1>
          </div>
          {storePhone && (
            <p style={{ margin: '2px 0', fontSize: '12px' }}>
              📞 <span className="receipt-numbers">{convertToEnglishNumbers(storePhone)}</span>
            </p>
          )}
          {storeAddress && (
            <p style={{ margin: '2px 0', fontSize: '11px', opacity: '0.8' }}>
              📍 {storeAddress}
            </p>
          )}
        </div>

        {/* عنوان الوصل */}
        <div style={{ textAlign: 'center', margin: '10px 0', padding: '6px', border: '1px solid black' }}>
          <h2 className="receipt-title" style={{ fontSize: '16px', margin: '0', fontWeight: '700' }}>
            🔧 إيصال استلام جهاز للتصليح
          </h2>
        </div>

        {/* معلومات الطلبية */}
        <div className="receipt-section">
          <div className="receipt-row">
            <span className="receipt-title">رقم الطلبية:</span>
            <span className="receipt-numbers" style={{ fontWeight: '700' }}>
              #{convertToEnglishNumbers(order.order_number || order.id.slice(0, 8))}
            </span>
          </div>
          <div className="receipt-row">
            <span className="receipt-title">التاريخ:</span>
            <span className="receipt-numbers" style={{ fontSize: '12px' }}>
              {formatDate(order.created_at)}
            </span>
          </div>
          {queuePosition && queuePosition > 0 && (
            <div className="receipt-row">
              <span className="receipt-title">رقم الترتيب:</span>
              <span className="receipt-numbers" style={{ fontWeight: '700', fontSize: '16px' }}>
                {convertToEnglishNumbers(queuePosition)}
              </span>
            </div>
          )}
        </div>

        <div className="dashed-line"></div>

        {/* بيانات العميل */}
        <div className="receipt-section">
          <h3 className="receipt-title" style={{ fontSize: '14px', margin: '0 0 6px 0', fontWeight: '700' }}>
            👤 بيانات العميل
          </h3>
          <div className="receipt-row">
            <span>الاسم:</span>
            <span style={{ fontWeight: '600' }}>{order.customer_name}</span>
          </div>
          <div className="receipt-row">
            <span>الهاتف:</span>
            <span className="receipt-numbers" style={{ fontWeight: '600' }}>
              {convertToEnglishNumbers(order.customer_phone)}
            </span>
          </div>
        </div>

        {/* وصف العطل */}
        {order.issue_description && (
          <>
            <div className="dashed-line"></div>
            <div className="receipt-section">
              <h3 className="receipt-title" style={{ fontSize: '14px', margin: '0 0 6px 0', fontWeight: '700' }}>
                🔍 وصف العطل
              </h3>
              <p style={{ margin: '0', fontSize: '13px', lineHeight: '1.4' }}>
                {order.issue_description}
              </p>
            </div>
          </>
        )}

        {/* تفاصيل الدفع */}
        <div className="dashed-line"></div>
        <div className="receipt-section">
          <h3 className="receipt-title" style={{ fontSize: '14px', margin: '0 0 6px 0', fontWeight: '700' }}>
            💰 تفاصيل الدفع
          </h3>
          
          {order.price_to_be_determined_later ? (
            <div style={{ textAlign: 'center', padding: '8px', border: '1px dashed black' }}>
              <p style={{ margin: '0', fontWeight: '700', fontSize: '14px' }}>
                💡 السعر يحدد لاحقاً
              </p>
            </div>
          ) : (
            <>
              <div className="receipt-row">
                <span>السعر الكلي:</span>
                <span className="receipt-numbers" style={{ fontWeight: '700' }}>
                  {convertToEnglishNumbers((order.total_price || 0).toLocaleString())} دج
                </span>
              </div>
              <div className="receipt-row">
                <span>المدفوع:</span>
                <span className="receipt-numbers" style={{ fontWeight: '700' }}>
                  {convertToEnglishNumbers((order.paid_amount || 0).toLocaleString())} دج
                </span>
              </div>
              {remainingAmount > 0 && (
                <>
                  <div className="solid-line"></div>
                  <div className="receipt-row">
                    <span style={{ fontWeight: '700' }}>المتبقي:</span>
                    <span className="receipt-numbers" style={{ fontWeight: '700', fontSize: '16px' }}>
                      {convertToEnglishNumbers(remainingAmount.toLocaleString())} دج
                    </span>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* QR Code */}
        <div className="dashed-line"></div>
        <div className="qr-section">
          <QRCodeSVG 
            value={`${storeUrl}/repair-tracking/${trackingCode}`} 
            size={80}
            level="M"
            style={{ border: '1px solid black', padding: '4px' }}
          />
          <p style={{ margin: '6px 0 2px 0', fontSize: '12px', fontWeight: '600' }}>
            🔗 كود التتبع: <span className="receipt-numbers">{convertToEnglishNumbers(trackingCode)}</span>
          </p>
          <p style={{ margin: '0', fontSize: '11px', opacity: '0.8' }}>
            امسح الكود أو ادخل على الموقع لمتابعة حالة التصليح
          </p>
        </div>

        {/* شروط الخدمة */}
        <div className="dashed-line"></div>
        <div style={{ fontSize: '11px', lineHeight: '1.4', textAlign: 'center' }}>
          <p style={{ margin: '2px 0', fontWeight: '600' }}>
            ⚠️ شروط مهمة
          </p>
          <p style={{ margin: '1px 0' }}>• يجب تقديم هذا الإيصال عند الاستلام</p>
          <p style={{ margin: '1px 0' }}>• عدم المسؤولية عن فقدان البيانات</p>
          <p style={{ margin: '1px 0' }}>• الاستلام خلال 30 يوماً من الإشعار</p>
        </div>
      </div>

      {/* ====================== خط الفصل للقطع ====================== */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '8px 0',
        margin: '12px 0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <div style={{ flex: 1, borderTop: '1px dashed black' }}></div>
          <div style={{ padding: '0 8px', textAlign: 'center' }}>
            <span style={{ fontSize: '16px' }}>✂️</span>
            <p style={{ fontSize: '10px', margin: '0', opacity: '0.7' }}>قص هنا</p>
          </div>
          <div style={{ flex: 1, borderTop: '1px dashed black' }}></div>
        </div>
      </div>

      {/* ====================== الجزء الثاني: لصقة الجهاز ====================== */}
      <div className="device-label receipt-content" style={{ 
        padding: '12px', 
        border: '2px solid black',
        marginTop: '8px'
      }}>
        
        {/* رأس اللصقة */}
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <h2 className="receipt-title" style={{ fontSize: '16px', margin: '0', fontWeight: '700' }}>
            🏷️ لصقة الجهاز
          </h2>
        </div>

        {/* رقم الطلبية بارز */}
        <div style={{ 
          border: '2px solid black', 
          padding: '8px', 
          marginBottom: '8px', 
          textAlign: 'center',
          backgroundColor: 'black',
          color: 'white'
        }}>
          <p style={{ margin: '0 0 2px 0', fontSize: '11px' }}>رقم الطلبية</p>
          <p className="receipt-numbers" style={{ 
            fontSize: '20px', 
            fontWeight: '900', 
            margin: '0',
            letterSpacing: '2px',
            color: 'white'
          }}>
            #{convertToEnglishNumbers(order.order_number || order.id.slice(0, 8))}
          </p>
        </div>

        {/* ترتيب الطلبية */}
        {queuePosition && queuePosition > 0 && (
          <div style={{ 
            border: '1px solid black', 
            padding: '6px', 
            marginBottom: '8px', 
            textAlign: 'center' 
          }}>
            <p style={{ margin: '0 0 2px 0', fontSize: '11px' }}>رقم الترتيب</p>
            <p className="receipt-numbers" style={{ 
              fontSize: '18px', 
              fontWeight: '700', 
              margin: '0'
            }}>
              {convertToEnglishNumbers(queuePosition)}
            </p>
          </div>
        )}

        {/* المعلومات الأساسية */}
        <div style={{ fontSize: '12px' }}>
          <div className="receipt-row">
            <span>👤 العميل:</span>
            <span style={{ fontWeight: '600' }}>{order.customer_name}</span>
          </div>
          
          <div className="receipt-row">
            <span>📱 الهاتف:</span>
            <span className="receipt-numbers" style={{ fontWeight: '600' }}>
              {convertToEnglishNumbers(order.customer_phone)}
            </span>
          </div>
          
          <div className="receipt-row">
            <span>📅 التاريخ:</span>
            <span className="receipt-numbers" style={{ fontSize: '11px' }}>
              {formatDate(order.created_at)}
            </span>
          </div>
          
          <div className="receipt-row">
            <span>⚡ الحالة:</span>
            <span style={{ fontWeight: '700', padding: '2px 6px', border: '1px solid black' }}>
              {order.status}
            </span>
          </div>
          
          {order.issue_description && (
            <>
              <div className="dashed-line"></div>
              <p style={{ margin: '4px 0', fontSize: '11px' }}>
                <span style={{ fontWeight: '700' }}>🔧 العطل:</span> {order.issue_description.slice(0, 50)}...
              </p>
            </>
          )}
        </div>

        {/* معلومات الدفع */}
        <div className="dashed-line"></div>
        <div style={{ fontSize: '12px' }}>
          {order.price_to_be_determined_later ? (
            <div style={{ textAlign: 'center', padding: '4px', border: '1px dashed black' }}>
              <p style={{ margin: '0', fontWeight: '700' }}>💡 السعر يحدد لاحقاً</p>
            </div>
          ) : (
            <>
              <div className="receipt-row">
                <span>💰 مدفوع:</span>
                <span className="receipt-numbers" style={{ fontWeight: '700' }}>
                  {convertToEnglishNumbers((order.paid_amount || 0).toLocaleString())} دج
                </span>
              </div>
              {remainingAmount > 0 && (
                <div className="receipt-row">
                  <span>⏳ متبقي:</span>
                  <span className="receipt-numbers" style={{ fontWeight: '700' }}>
                    {convertToEnglishNumbers(remainingAmount.toLocaleString())} دج
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* QR codes */}
        <div className="dashed-line"></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          {/* QR للتتبع */}
          <div style={{ textAlign: 'center', border: '1px solid black', padding: '6px' }}>
            <QRCodeSVG 
              value={`${storeUrl}/repair-tracking/${trackingCode}`} 
              size={65}
              level="M"
            />
            <p style={{ fontSize: '10px', margin: '3px 0', fontWeight: '600' }}>📱 تتبع</p>
          </div>
          
          {/* QR لإنهاء التصليح */}
          <div style={{ textAlign: 'center', border: '1px solid black', padding: '6px' }}>
            <QRCodeSVG 
              value={`${storeUrl}/repair-complete/${order.id}`} 
              size={65}
              level="M"
            />
            <p style={{ fontSize: '10px', margin: '3px 0', fontWeight: '600' }}>✅ إنهاء</p>
          </div>
        </div>

        {/* كود التتبع */}
        <div style={{ 
          textAlign: 'center', 
          border: '1px solid black', 
          padding: '4px',
          marginBottom: '8px'
        }}>
          <p style={{ fontSize: '11px', margin: '0' }}>
            <span style={{ fontWeight: '700' }}>🔑 كود:</span> 
            <span className="receipt-numbers" style={{ fontWeight: '700' }}>
              {convertToEnglishNumbers(trackingCode)}
            </span>
          </p>
        </div>

        {/* مساحة لملاحظات الفني */}
        <div style={{ border: '1px dashed black', padding: '6px' }}>
          <p style={{ fontSize: '11px', fontWeight: '700', margin: '0 0 4px 0' }}>
            📝 ملاحظات الفني:
          </p>
          <div style={{ borderBottom: '1px solid black', height: '8px', margin: '2px 0' }}></div>
          <div style={{ borderBottom: '1px solid black', height: '8px', margin: '2px 0' }}></div>
          <div style={{ borderBottom: '1px solid black', height: '8px', margin: '2px 0' }}></div>
        </div>
      </div>
    </div>
  );
};

export default RepairReceiptPrint;
