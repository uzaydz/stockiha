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

  // دالة لضمان ظهور QR codes عند الطباعة وإصلاح مشكلة العرض
  const ensureQRCodesVisible = () => {
    // إضافة أنماط إضافية لضمان ظهور QR codes وإصلاح العرض
    const style = document.createElement('style');
    style.textContent = `
      @media print {
        @page {
          size: auto;
          margin: 0;
          padding: 0;
        }
        
        /* إصلاح مشكلة العرض */
        body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          height: 100% !important;
          overflow: visible !important;
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        
        /* إخفاء كل شيء ما عدا الوصل */
        body * {
          visibility: hidden !important;
        }
        
        .repair-receipt, .repair-receipt * {
          visibility: visible !important;
        }
        
        .repair-receipt {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          max-width: none !important;
          min-width: auto !important;
          margin: 0 !important;
          padding: 4mm !important;
          font-size: 13px !important;
          line-height: 1.4 !important;
          overflow: visible !important;
          page-break-inside: avoid !important;
          background: white !important;
          color: black !important;
        }
        
        /* تحسين للطابعات الحرارية */
        @media print and (max-width: 80mm) {
          .repair-receipt {
            width: 76mm !important;
            max-width: 76mm !important;
            font-size: 12px !important;
            line-height: 1.3 !important;
          }
        }
        
        /* تحسين للطابعات العادية */
        @media print and (min-width: 80mm) {
          .repair-receipt {
            width: 210mm !important;
            max-width: 210mm !important;
            font-size: 14px !important;
            line-height: 1.4 !important;
          }
        }
      
        .repair-receipt * {
          max-width: 68mm !important;
          overflow: visible !important;
          word-wrap: break-word !important;
        }
        
        .repair-receipt svg, .repair-receipt canvas, .repair-receipt img {
          visibility: visible !important;
          display: block !important;
          opacity: 1 !important;
          print-color-adjust: exact !important;
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        .repair-receipt [data-testid*="qr-code"] {
          visibility: visible !important;
          display: block !important;
          opacity: 1 !important;
        }
        .repair-receipt .qr-section > div {
          border: 2px solid black !important;
          border-radius: 2mm !important;
          padding: 2mm !important;
          background: white !important;
        }
      }
    `;
    document.head.appendChild(style);
    
    // إزالة الأنماط بعد الطباعة
    setTimeout(() => {
      document.head.removeChild(style);
    }, 1000);
  };
  
  // تطبيق الدالة عند تحميل المكون
  React.useEffect(() => {
    // تحقق من صحة الروابط
    
    ensureQRCodesVisible();
    
    // إضافة مستمع لحدث الطباعة
    const handleBeforePrint = () => {
      ensureQRCodesVisible();
    };
    
    window.addEventListener('beforeprint', handleBeforePrint);
    
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
    };
  }, [storeUrl, trackingCode, order.id]);

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
      
      {/* زر اختبار QR codes - يظهر فقط في المعاينة */}
      <div 
        className="qr-test-button"
        style={{ 
          display: 'block', 
          textAlign: 'center', 
          marginBottom: '10px'
        }}
      >
        <button 
          onClick={() => {
            
            // اختبار روابط QR Server API
            
            alert('تم طباعة روابط QR codes في وحدة التحكم (F12)');
          }}
          style={{
            padding: '8px 16px',
            backgroundColor: '#059669',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontFamily: 'Tajawal, Arial, sans-serif'
          }}
        >
          🔍 اختبار QR Codes
        </button>
      </div>
      
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
        {/* تطبيق خط Tajawal بقوة مع نفس الطريقة المتقدمة الموجودة في وصل الألعاب */}
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

          {/* معلومات الجهاز */}
          {order.device_type && (
            <>
              <div className="line-separator"></div>
              <div className="center-item" style={{ marginBottom: '5mm' }}>
                <div className="section-title center-item" style={{ 
                  background: '#f3e8ff',
                  borderColor: '#7c3aed',
                  color: '#7c3aed'
                }}>
                  📱 معلومات الجهاز
                </div>
                
                <div className="info-row center-item">
                  <div className="info-label center-item">نوع الجهاز</div>
                  <div className="info-value center-item" style={{ 
                    color: '#7c3aed',
                    fontSize: '16px',
                    fontWeight: '700'
                  }}>
                    {order.device_type}
                  </div>
                </div>
              </div>
            </>
          )}

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

          {/* QR Code للتتبع - العميل */}
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
                <div className="center-item qr-section" style={{ marginBottom: '3mm' }}>
                  <QRCodeSVG 
                    value={`${storeUrl}/repair-tracking/${trackingCode}`} 
                    size={100}
                    data-testid="customer-qr-code"
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

          {/* ضمان التصليحات */}
          <div className="line-separator"></div>
          <div className="center-item" style={{ marginBottom: '5mm' }}>
            <div className="section-title center-item" style={{ 
              background: '#fef3c7',
              borderColor: '#f59e0b',
              color: '#92400e'
            }}>
              🔧 ضمان التصليحات
            </div>
            
            <div className="center-item" style={{ marginTop: '3mm' }}>
              <div className="center-flex" style={{
                border: '2px solid #f59e0b',
                borderRadius: '3mm',
                padding: '4mm',
                background: '#fffbeb'
              }}>
                <p className="center-item" style={{ 
                  fontSize: '11px', 
                  lineHeight: '1.5',
                  margin: '0',
                  fontWeight: '500',
                  textAlign: 'center',
                  color: '#92400e',
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word'
                }}>
                  يضمن المتجر الخدمة لمدة 24 ساعة بعد استلام الجهاز. في حال استمرار نفس المشكلة، يمكن إعادة الجهاز خلال هذه المدة لإعادة التصليح مجانًا. لا يشمل الضمان ظهور أعطال جديدة غير متعلقة بالإصلاح الأصلي.
                </p>
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
                fontWeight: '700',
                marginBottom: '3mm'
              }}>
                📋 شروط الخدمة
              </div>
              
              <div className="center-item" style={{ fontSize: '9px', lineHeight: '1.4' }}>
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

        {/* ====================== خط القطع ====================== */}
        <div className="center-item" style={{ 
          margin: '8mm 0',
          borderTop: '3px dashed black',
          position: 'relative'
        }}>
          <div className="center-item" style={{
            position: 'absolute',
            top: '-10px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'white',
            padding: '0 5mm',
            fontSize: '12px',
            fontWeight: '700',
            border: '2px solid black',
            borderRadius: '10px'
          }}>
            ✂️ اقطع هنا
          </div>
        </div>

        {/* ====================== الجزء الثاني: إيصال المسؤول ====================== */}
        <div className="center-item" style={{ marginTop: '8mm' }}>
          
          {/* عنوان الجزء الإداري */}
          <div className="center-item" style={{ marginBottom: '5mm' }}>
            <div className="section-title center-item" style={{ 
              background: '#fef2f2',
              borderColor: '#dc2626',
              color: '#dc2626'
            }}>
              🔧 إيصال المسؤول - معالجة التصليح
            </div>
          </div>

          {/* معلومات أساسية */}
          <div className="center-item" style={{ marginBottom: '4mm' }}>
            <div className="center-flex" style={{
              border: '2px solid #dc2626',
              borderRadius: '3mm',
              padding: '3mm',
              background: '#fef2f2'
            }}>
              <div className="info-row center-item">
                <div className="info-label center-item">رقم الطلبية</div>
                <div className="info-value center-item" style={{ 
                  fontSize: '16px',
                  fontWeight: '900',
                  color: '#dc2626'
                }}>
                  #{convertToEnglishNumbers(order.order_number || order.id.slice(0, 8))}
                </div>
              </div>
              
              <div className="info-row center-item">
                <div className="info-label center-item">العميل</div>
                <div className="info-value center-item">
                  {order.customer_name} - {convertToEnglishNumbers(order.customer_phone)}
                </div>
              </div>
            </div>
          </div>

          {/* QR Code للمسؤول - إدارة التصليح */}
          <div className="center-item" style={{ marginBottom: '5mm' }}>
            <div className="center-item" style={{ 
              fontSize: '14px', 
              fontWeight: '800',
              marginBottom: '4mm',
              color: '#dc2626'
            }}>
              🔧 أكواد سريعة للمسؤول
            </div>
            
            {/* QR لإنهاء التصليح */}
            <div className="center-item" style={{ marginBottom: '4mm' }}>
              <div className="center-item complete-qr qr-section" style={{ 
                border: '3px solid #dc2626', 
                padding: '4mm', 
                borderRadius: '4mm',
                background: '#fef2f2',
                width: '100%'
              }}>
                <div className="center-item" style={{ 
                  fontSize: '12px', 
                  marginBottom: '3mm',
                  fontWeight: '800',
                  color: '#dc2626'
                }}>
                  ✅ إنهاء التصليح
                </div>
                <QRCodeSVG 
                  value={`${storeUrl}/repair-complete/${order.id}`} 
                  size={80}
                  data-testid="complete-qr-code"
                />
                <div className="center-item" style={{ 
                  fontSize: '10px', 
                  marginTop: '2mm',
                  fontWeight: '600',
                  color: '#dc2626',
                  opacity: '0.8'
                }}>
                  امسح عند إنهاء التصليح
                </div>
              </div>
            </div>
          </div>

          {/* تفاصيل التصليح للمسؤول */}
          <div className="center-item" style={{ marginBottom: '4mm' }}>
            <div className="center-item" style={{ 
              fontSize: '12px', 
              fontWeight: '700',
              marginBottom: '3mm'
            }}>
              📝 تفاصيل التصليح
            </div>
            
            <div className="center-item" style={{
              border: '2px solid #e5e7eb',
              borderRadius: '3mm',
              padding: '3mm',
              background: '#f9fafb'
            }}>
              <div className="center-item" style={{ 
                fontSize: '11px',
                fontWeight: '700',
                marginBottom: '2mm'
              }}>
                📱 {order.device_type || 'جهاز غير محدد'}
              </div>
              
              {order.issue_description && (
                <div className="center-item" style={{ 
                  fontSize: '10px',
                  color: '#666',
                  lineHeight: '1.4',
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word',
                  whiteSpace: 'pre-wrap'
                }}>
                  {order.issue_description}
                </div>
              )}
            </div>
          </div>

          {/* مساحة للملاحظات */}
          <div className="center-item" style={{ marginBottom: '4mm' }}>
            <div className="center-item" style={{ 
              fontSize: '12px', 
              fontWeight: '700',
              marginBottom: '3mm'
            }}>
              📝 ملاحظات المسؤول
            </div>
            
            <div className="center-item" style={{
              border: '2px dashed #ccc',
              borderRadius: '3mm',
              padding: '6mm',
              background: 'white',
              minHeight: '15mm'
            }}>
              <div className="center-item" style={{ 
                fontSize: '9px',
                color: '#999',
                fontStyle: 'italic'
              }}>
                مساحة للملاحظات والتوقيع...
              </div>
            </div>
          </div>

          {/* معلومات إضافية للمسؤول */}
          <div className="center-item" style={{ marginBottom: '4mm' }}>
            <div className="center-flex" style={{
              border: '1px solid #e5e7eb',
              borderRadius: '3mm',
              padding: '3mm',
              background: '#f9fafb'
            }}>
              <div className="center-item" style={{ 
                fontSize: '9px',
                color: '#666',
                lineHeight: '1.4'
              }}>
                <p style={{ margin: '1mm 0' }}>
                  • تاريخ الاستلام: {formatDate(order.created_at)}
                </p>
                <p style={{ margin: '1mm 0' }}>
                  • حالة الدفع: {order.price_to_be_determined_later ? 'سيحدد لاحقاً' : remainingAmount > 0 ? 'جزئي' : 'مكتمل'}
                </p>
                <p style={{ margin: '1mm 0' }}>
                  • حالة التصليح: {order.status}
                </p>
                <p style={{ margin: '1mm 0' }}>
                  • كود التتبع: {convertToEnglishNumbers(trackingCode)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RepairReceiptPrint;
