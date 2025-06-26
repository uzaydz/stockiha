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

  // اختصار النصوص الطويلة
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // حساب المبلغ المتبقي (فقط إذا لم يكن السعر مؤجل التحديد)
  const remainingAmount = order.price_to_be_determined_later ? 0 : ((order.total_price || 0) - (order.paid_amount || 0));

  return (
    <>
      {/* تحميل خط Tajawal من Google Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Tajawal:wght@200;300;400;500;600;700;800;900&display=swap"
        rel="stylesheet"
      />
      
      <div 
        className="repair-receipt" 
        dir="rtl"
        style={{
          fontFamily: "'Tajawal', Arial, sans-serif",
          lineHeight: '1.5',
          fontSize: '13px',
          width: '76mm',
          maxWidth: '76mm',
          margin: '0 auto',
          backgroundColor: 'white',
          color: 'black',
          padding: '4mm',
          boxSizing: 'border-box',
          position: 'relative',
          overflow: 'visible',
          textAlign: 'center'
        }}
      >
        {/* تطبيق خط Tajawal بقوة */}
        <style dangerouslySetInnerHTML={{
          __html: `
            @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@200;300;400;500;600;700;800;900&display=swap');
            
            *, *::before, *::after {
              font-family: 'Tajawal', Arial, sans-serif !important;
              text-align: center !important;
              box-sizing: border-box !important;
            }
            
            .repair-receipt {
              font-family: 'Tajawal', Arial, sans-serif !important;
              text-align: center !important;
              direction: rtl !important;
            }
            
            .repair-receipt * {
              font-family: 'Tajawal', Arial, sans-serif !important;
              text-align: center !important;
              margin-left: auto !important;
              margin-right: auto !important;
            }
            
            .center-item {
              text-align: center !important;
              display: block !important;
              margin: 0 auto !important;
              width: 100% !important;
            }
            
            .center-flex {
              display: flex !important;
              flex-direction: column !important;
              align-items: center !important;
              justify-content: center !important;
              text-align: center !important;
              width: 100% !important;
            }
            
            .info-row {
              display: flex !important;
              flex-direction: column !important;
              align-items: center !important;
              justify-content: center !important;
              text-align: center !important;
              margin: 3mm 0 !important;
              width: 100% !important;
            }
            
            .info-label {
              font-size: 11px !important;
              font-weight: 500 !important;
              color: #666 !important;
              margin-bottom: 1mm !important;
              text-align: center !important;
            }
            
            .info-value {
              font-size: 14px !important;
              font-weight: 700 !important;
              color: black !important;
              text-align: center !important;
            }
            
            .section-title {
              font-size: 16px !important;
              font-weight: 800 !important;
              text-align: center !important;
              margin: 4mm 0 !important;
              padding: 2mm !important;
              border: 2px solid black !important;
              border-radius: 3mm !important;
              background: #f8f9fa !important;
            }
            
            .line-separator {
              border-top: 2px dashed black !important;
              margin: 4mm 0 !important;
              width: 100% !important;
              height: 0 !important;
            }
            
            @media print {
              *, *::before, *::after {
                font-family: 'Tajawal', Arial, sans-serif !important;
                text-align: center !important;
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              
              .repair-receipt {
                font-family: 'Tajawal', Arial, sans-serif !important;
                width: 76mm !important;
                max-width: 76mm !important;
                font-size: 13px !important;
                background: white !important;
                color: black !important;
                padding: 4mm !important;
                text-align: center !important;
                overflow: visible !important;
              }
              
              .no-print {
                display: none !important;
              }
            }
          `
        }} />

        {/* ====================== الجزء الأول: إيصال العميل ====================== */}
        <div className="center-item">
          
          {/* رأس الوصل */}
          <div className="center-flex" style={{ 
            borderBottom: '3px solid black', 
            paddingBottom: '4mm', 
            marginBottom: '5mm' 
          }}>
            {storeLogo && (
              <div className="center-item" style={{ marginBottom: '3mm' }}>
                <img 
                  src={storeLogo} 
                  alt={storeName} 
                  className="center-item"
                  style={{ 
                    height: '25mm', 
                    width: '25mm', 
                    objectFit: 'contain',
                    display: 'block',
                    margin: '0 auto'
                  }} 
                />
              </div>
            )}
            
            <div className="center-item">
              <h1 className="center-item" style={{ 
                fontSize: '18px', 
                fontWeight: '900', 
                margin: '0 0 2mm 0',
                textAlign: 'center',
                fontFamily: "'Tajawal', Arial, sans-serif"
              }}>
                {truncateText(storeName, 25)}
              </h1>
            </div>
            
            {storePhone && (
              <div className="center-item" style={{ marginTop: '2mm' }}>
                <p className="center-item" style={{ 
                  fontSize: '12px', 
                  fontWeight: '600',
                  margin: '0',
                  textAlign: 'center'
                }}>
                  📞 {convertToEnglishNumbers(storePhone)}
                </p>
              </div>
            )}
            
            {storeAddress && (
              <div className="center-item" style={{ marginTop: '1mm' }}>
                <p className="center-item" style={{ 
                  fontSize: '11px', 
                  margin: '0',
                  opacity: '0.8',
                  textAlign: 'center'
                }}>
                  📍 {truncateText(storeAddress, 50)}
                </p>
              </div>
            )}
          </div>

          {/* عنوان الوصل */}
          <div className="center-item" style={{ marginBottom: '5mm' }}>
            <div className="section-title center-item">
              🔧 إيصال استلام جهاز للتصليح
            </div>
          </div>

          {/* رقم الطلبية المميز */}
          <div className="center-item" style={{ marginBottom: '5mm' }}>
            <div className="center-flex" style={{
              background: 'black',
              color: 'white',
              padding: '4mm',
              borderRadius: '4mm',
              border: '3px solid black'
            }}>
              <div className="center-item" style={{ 
                fontSize: '12px', 
                fontWeight: '500',
                marginBottom: '1mm',
                color: 'white'
              }}>
                رقم الطلبية
              </div>
              <div className="center-item" style={{ 
                fontSize: '20px', 
                fontWeight: '900',
                color: 'white',
                fontFamily: "'Tajawal', Arial, sans-serif",
                letterSpacing: '1px'
              }}>
                #{convertToEnglishNumbers(order.order_number || order.id.slice(0, 8))}
              </div>
            </div>
          </div>

          {/* التاريخ */}
          <div className="info-row center-item">
            <div className="info-label center-item">📅 التاريخ والوقت</div>
            <div className="info-value center-item" style={{ 
              fontSize: '12px',
              fontFamily: "'Tajawal', Arial, sans-serif",
              direction: 'ltr',
              display: 'inline-block'
            }}>
              {formatDate(order.created_at)}
            </div>
          </div>

          {/* رقم الترتيب */}
          {queuePosition && queuePosition > 0 && (
            <div className="center-item" style={{ marginBottom: '5mm' }}>
              <div className="center-flex" style={{
                background: '#fef2f2',
                border: '3px solid #dc2626',
                padding: '4mm',
                borderRadius: '4mm'
              }}>
                <div className="center-item" style={{ 
                  fontSize: '12px', 
                  fontWeight: '500',
                  marginBottom: '1mm',
                  color: '#7f1d1d'
                }}>
                  رقم الترتيب في الطابور
                </div>
                <div className="center-item" style={{ 
                  fontSize: '24px', 
                  fontWeight: '900',
                  color: '#dc2626',
                  fontFamily: "'Tajawal', Arial, sans-serif"
                }}>
                  {convertToEnglishNumbers(queuePosition)}
                </div>
              </div>
            </div>
          )}

          <div className="line-separator"></div>

          {/* بيانات العميل */}
          <div className="center-item" style={{ marginBottom: '5mm' }}>
            <div className="section-title center-item" style={{ 
              background: '#ecfdf5',
              borderColor: '#059669',
              color: '#059669'
            }}>
              👤 بيانات العميل
            </div>
            
            <div className="info-row center-item">
              <div className="info-label center-item">الاسم الكامل</div>
              <div className="info-value center-item">
                {truncateText(order.customer_name, 20)}
              </div>
            </div>
            
            <div className="info-row center-item">
              <div className="info-label center-item">رقم الهاتف</div>
              <div className="info-value center-item" style={{ 
                fontFamily: "'Tajawal', Arial, sans-serif",
                direction: 'ltr',
                display: 'inline-block'
              }}>
                {convertToEnglishNumbers(order.customer_phone)}
              </div>
            </div>
          </div>

          {/* وصف العطل */}
          {order.issue_description && (
            <>
              <div className="line-separator"></div>
              <div className="center-item" style={{ marginBottom: '5mm' }}>
                <div className="section-title center-item" style={{ 
                  background: '#fef2f2',
                  borderColor: '#dc2626',
                  color: '#dc2626'
                }}>
                  🔍 وصف العطل المطلوب إصلاحه
                </div>
                
                <div className="center-item" style={{
                  border: '2px dashed #999',
                  padding: '4mm',
                  borderRadius: '3mm',
                  background: '#f9fafb',
                  marginTop: '3mm'
                }}>
                  <p className="center-item" style={{ 
                    fontSize: '13px', 
                    lineHeight: '1.4',
                    margin: '0',
                    fontWeight: '500',
                    textAlign: 'center',
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {order.issue_description}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* تفاصيل الدفع */}
          <div className="line-separator"></div>
          <div className="center-item" style={{ marginBottom: '5mm' }}>
            <div className="section-title center-item" style={{ 
              background: '#f0f9ff',
              borderColor: '#2563eb',
              color: '#2563eb'
            }}>
              💰 تفاصيل الدفع والتكلفة
            </div>
            
            {order.price_to_be_determined_later ? (
              <div className="center-item" style={{ marginTop: '3mm' }}>
                <div className="center-flex" style={{
                  background: '#fef3c7',
                  border: '3px dashed #f59e0b',
                  padding: '4mm',
                  borderRadius: '4mm'
                }}>
                  <div className="center-item" style={{ 
                    fontSize: '14px', 
                    fontWeight: '800',
                    color: '#92400e'
                  }}>
                    💡 السعر سيتم تحديده بعد الكشف والفحص
                  </div>
                </div>
              </div>
            ) : (
              <div className="center-item" style={{ marginTop: '3mm' }}>
                <div className="center-flex" style={{
                  border: '2px solid #e5e7eb',
                  borderRadius: '3mm',
                  padding: '4mm',
                  background: '#f9fafb'
                }}>
                  <div className="info-row center-item">
                    <div className="info-label center-item">السعر الإجمالي</div>
                    <div className="info-value center-item" style={{ 
                      color: '#059669',
                      fontSize: '16px',
                      fontFamily: "'Tajawal', Arial, sans-serif",
                      direction: 'ltr',
                      display: 'inline-block'
                    }}>
                      {convertToEnglishNumbers((order.total_price || 0).toLocaleString())} دج
                    </div>
                  </div>
                  
                  <div className="info-row center-item">
                    <div className="info-label center-item">المبلغ المدفوع</div>
                    <div className="info-value center-item" style={{ 
                      color: '#2563eb',
                      fontSize: '16px',
                      fontFamily: "'Tajawal', Arial, sans-serif",
                      direction: 'ltr',
                      display: 'inline-block'
                    }}>
                      {convertToEnglishNumbers((order.paid_amount || 0).toLocaleString())} دج
                    </div>
                  </div>
                  
                  {remainingAmount > 0 && (
                    <div className="center-item" style={{ marginTop: '3mm' }}>
                      <div className="center-flex" style={{
                        background: '#fef2f2',
                        border: '3px solid #dc2626',
                        padding: '3mm',
                        borderRadius: '3mm'
                      }}>
                        <div className="info-label center-item" style={{ color: '#7f1d1d' }}>
                          المبلغ المتبقي المطلوب دفعه
                        </div>
                        <div className="info-value center-item" style={{ 
                          color: '#dc2626',
                          fontSize: '18px',
                          fontWeight: '900',
                          fontFamily: "'Tajawal', Arial, sans-serif",
                          direction: 'ltr',
                          display: 'inline-block'
                        }}>
                          {convertToEnglishNumbers(remainingAmount.toLocaleString())} دج
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* QR Code للتتبع */}
          <div className="line-separator"></div>
          <div className="center-item" style={{ marginBottom: '5mm' }}>
            <div className="section-title center-item" style={{ 
              background: '#ecfdf5',
              borderColor: '#059669',
              color: '#059669'
            }}>
              🔗 تتبع حالة التصليح
            </div>
            
            <div className="center-item" style={{ marginTop: '3mm' }}>
              <div className="center-flex" style={{
                border: '3px solid #059669',
                borderRadius: '4mm',
                padding: '4mm',
                background: '#ecfdf5'
              }}>
                <div className="center-item" style={{ marginBottom: '3mm' }}>
                  <QRCodeSVG 
                    value={`${storeUrl}/repair-tracking/${trackingCode}`} 
                    size={100}
                    level="M"
                    style={{ 
                      display: 'block',
                      margin: '0 auto',
                      border: '2px solid black',
                      borderRadius: '2mm',
                      padding: '2mm'
                    }}
                  />
                </div>
                
                <div className="center-item" style={{ marginTop: '3mm' }}>
                  <div className="info-label center-item">كود التتبع</div>
                  <div className="info-value center-item" style={{ 
                    color: '#059669',
                    fontSize: '16px',
                    fontWeight: '900',
                    fontFamily: "'Tajawal', Arial, sans-serif",
                    direction: 'ltr',
                    display: 'inline-block'
                  }}>
                    {convertToEnglishNumbers(trackingCode)}
                  </div>
                </div>
                
                <div className="center-item" style={{ marginTop: '2mm' }}>
                  <p className="center-item" style={{ 
                    fontSize: '10px', 
                    margin: '0',
                    opacity: '0.8',
                    textAlign: 'center'
                  }}>
                    امسح الكود أو اكتب الرقم لمتابعة حالة التصليح
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* شروط الخدمة */}
          <div className="line-separator"></div>
          <div className="center-item" style={{ marginBottom: '5mm' }}>
            <div className="center-flex" style={{
              border: '2px solid #e5e7eb',
              padding: '4mm',
              borderRadius: '3mm',
              background: '#f9fafb'
            }}>
              <div className="center-item" style={{ 
                fontSize: '12px', 
                fontWeight: '800',
                marginBottom: '2mm',
                color: '#dc2626'
              }}>
                ⚠️ شروط مهمة - يرجى القراءة بعناية
              </div>
              
              <div className="center-item" style={{ fontSize: '10px', lineHeight: '1.4' }}>
                <p className="center-item" style={{ margin: '1mm 0' }}>
                  • يجب تقديم هذا الإيصال عند الاستلام
                </p>
                <p className="center-item" style={{ margin: '1mm 0' }}>
                  • غير مسؤولين عن فقدان البيانات المخزنة
                </p>
                <p className="center-item" style={{ margin: '1mm 0' }}>
                  • الاستلام خلال 30 يوماً من الإشعار
                </p>
                <p className="center-item" style={{ margin: '1mm 0' }}>
                  • فحص الجهاز جيداً قبل المغادرة
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ====================== خط الفصل للقطع ====================== */}
        <div className="center-item" style={{ 
          margin: '6mm 0',
          padding: '4mm 0'
        }}>
          <div className="center-flex">
            <div style={{ 
              width: '100%', 
              height: '0', 
              borderTop: '3px dashed black',
              position: 'relative'
            }}>
              <div style={{ 
                position: 'absolute',
                top: '-8px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'white',
                padding: '0 4mm',
                fontSize: '12px'
              }}>
                ✂️ اقطع هنا
              </div>
            </div>
          </div>
        </div>

        {/* ====================== الجزء الثاني: لصقة الجهاز ====================== */}
        <div className="center-item" style={{ 
          border: '4px solid black',
          borderRadius: '4mm',
          padding: '4mm',
          background: '#fafafa'
        }}>
          
          {/* رأس اللصقة */}
          <div className="center-item" style={{ marginBottom: '4mm' }}>
            <div className="section-title center-item" style={{ 
              background: '#1f2937',
              color: 'white',
              borderColor: '#1f2937'
            }}>
              🏷️ لصقة الجهاز - للفني المختص
            </div>
          </div>

          {/* رقم الطلبية بارز */}
          <div className="center-item" style={{ marginBottom: '4mm' }}>
            <div className="center-flex" style={{
              background: 'black',
              color: 'white',
              padding: '4mm',
              borderRadius: '4mm',
              border: '3px solid black'
            }}>
              <div className="center-item" style={{ 
                fontSize: '12px', 
                fontWeight: '500',
                marginBottom: '1mm',
                color: 'white'
              }}>
                رقم الطلبية
              </div>
              <div className="center-item" style={{ 
                fontSize: '22px', 
                fontWeight: '900',
                color: 'white',
                fontFamily: "'Tajawal', Arial, sans-serif",
                letterSpacing: '2px'
              }}>
                #{convertToEnglishNumbers(order.order_number || order.id.slice(0, 8))}
              </div>
            </div>
          </div>

          {/* ترتيب الطلبية */}
          {queuePosition && queuePosition > 0 && (
            <div className="center-item" style={{ marginBottom: '4mm' }}>
              <div className="center-flex" style={{
                background: '#fef2f2',
                border: '3px solid #dc2626',
                padding: '3mm',
                borderRadius: '3mm'
              }}>
                <div className="center-item" style={{ 
                  fontSize: '11px', 
                  fontWeight: '500',
                  marginBottom: '1mm',
                  color: '#7f1d1d'
                }}>
                  رقم الترتيب
                </div>
                <div className="center-item" style={{ 
                  fontSize: '18px', 
                  fontWeight: '900',
                  color: '#dc2626',
                  fontFamily: "'Tajawal', Arial, sans-serif"
                }}>
                  {convertToEnglishNumbers(queuePosition)}
                </div>
              </div>
            </div>
          )}

          {/* المعلومات الأساسية */}
          <div className="center-item" style={{ marginBottom: '4mm' }}>
            <div className="center-flex" style={{
              border: '2px solid #e5e7eb',
              padding: '4mm',
              borderRadius: '3mm',
              background: '#f9fafb'
            }}>
              <div className="info-row center-item">
                <div className="info-label center-item">👤 اسم العميل</div>
                <div className="info-value center-item" style={{ fontSize: '12px' }}>
                  {truncateText(order.customer_name, 15)}
                </div>
              </div>
              
              <div className="info-row center-item">
                <div className="info-label center-item">📱 رقم الهاتف</div>
                <div className="info-value center-item" style={{ 
                  fontSize: '12px',
                  fontFamily: "'Tajawal', Arial, sans-serif",
                  direction: 'ltr',
                  display: 'inline-block'
                }}>
                  {convertToEnglishNumbers(order.customer_phone)}
                </div>
              </div>
              
              <div className="info-row center-item">
                <div className="info-label center-item">📅 تاريخ الاستلام</div>
                <div className="info-value center-item" style={{ 
                  fontSize: '10px',
                  fontFamily: "'Tajawal', Arial, sans-serif",
                  direction: 'ltr',
                  display: 'inline-block'
                }}>
                  {formatDate(order.created_at)}
                </div>
              </div>
              
              <div className="info-row center-item">
                <div className="info-label center-item">⚡ حالة التصليح</div>
                <div className="center-item" style={{ 
                  fontSize: '11px',
                  fontWeight: '800', 
                  padding: '2mm', 
                  border: '2px solid black', 
                  borderRadius: '2mm',
                  background: '#fbbf24',
                  color: 'black'
                }}>
                  {order.status}
                </div>
              </div>
              
              {order.issue_description && (
                <div className="info-row center-item">
                  <div className="info-label center-item">🔧 وصف العطل</div>
                  <div className="info-value center-item" style={{ 
                    fontSize: '10px',
                    fontWeight: '500',
                    lineHeight: '1.3',
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word',
                    whiteSpace: 'pre-wrap',
                    textAlign: 'center'
                  }}>
                    {order.issue_description}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* معلومات الدفع */}
          <div className="center-item" style={{ marginBottom: '4mm' }}>
            <div className="center-flex" style={{
              border: '2px solid #2563eb',
              padding: '3mm',
              borderRadius: '3mm',
              background: '#f0f9ff'
            }}>
              {order.price_to_be_determined_later ? (
                <div className="center-item">
                  <div className="center-flex" style={{
                    background: '#fef3c7',
                    border: '2px dashed #f59e0b',
                    padding: '3mm',
                    borderRadius: '3mm'
                  }}>
                    <div className="center-item" style={{ 
                      fontSize: '11px', 
                      fontWeight: '800',
                      color: '#92400e'
                    }}>
                      💡 السعر يحدد لاحقاً
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="info-row center-item">
                    <div className="info-label center-item">💰 المبلغ المدفوع</div>
                    <div className="info-value center-item" style={{ 
                      color: '#059669',
                      fontSize: '12px',
                      fontFamily: "'Tajawal', Arial, sans-serif",
                      direction: 'ltr',
                      display: 'inline-block'
                    }}>
                      {convertToEnglishNumbers((order.paid_amount || 0).toLocaleString())} دج
                    </div>
                  </div>
                  
                  {remainingAmount > 0 && (
                    <div className="info-row center-item">
                      <div className="info-label center-item">⏳ المبلغ المتبقي</div>
                      <div className="info-value center-item" style={{ 
                        color: '#dc2626',
                        fontSize: '12px',
                        fontFamily: "'Tajawal', Arial, sans-serif",
                        direction: 'ltr',
                        display: 'inline-block'
                      }}>
                        {convertToEnglishNumbers(remainingAmount.toLocaleString())} دج
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* QR codes للفني */}
          <div className="center-item" style={{ marginBottom: '4mm' }}>
            <div className="center-item" style={{ 
              fontSize: '12px', 
              fontWeight: '700',
              marginBottom: '3mm'
            }}>
              أكواد سريعة للفني
            </div>
            
            <div className="center-flex" style={{ gap: '3mm' }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '3mm', width: '100%' }}>
                {/* QR لإنهاء التصليح فقط */}
                <div className="center-item" style={{ 
                  border: '2px solid #dc2626', 
                  padding: '3mm', 
                  borderRadius: '3mm',
                  background: '#fef2f2',
                  width: '100%'
                }}>
                  <QRCodeSVG 
                    value={`${storeUrl}/repair-complete/${order.id}`} 
                    size={60}
                    level="M"
                    style={{ display: 'block', margin: '0 auto' }}
                  />
                  <div className="center-item" style={{ 
                    fontSize: '10px', 
                    marginTop: '2mm',
                    fontWeight: '700',
                    color: '#dc2626'
                  }}>
                    ✅ إنهاء التصليح
                  </div>
                </div>
              </div>
            </div>
          </div>



          {/* مساحة لملاحظات الفني */}
          <div className="center-item">
            <div className="center-flex" style={{
              border: '2px dashed #6b7280',
              padding: '3mm',
              borderRadius: '3mm',
              background: '#f9fafb'
            }}>
              <div className="center-item" style={{ 
                fontSize: '11px', 
                fontWeight: '800',
                marginBottom: '2mm',
                color: '#374151'
              }}>
                📝 ملاحظات الفني
              </div>
              
              <div className="center-item" style={{ width: '100%' }}>
                <div style={{ borderBottom: '1px solid black', height: '5mm', margin: '1mm 0' }}></div>
                <div style={{ borderBottom: '1px solid black', height: '5mm', margin: '1mm 0' }}></div>
                <div style={{ borderBottom: '1px solid black', height: '5mm', margin: '1mm 0' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RepairReceiptPrint;
