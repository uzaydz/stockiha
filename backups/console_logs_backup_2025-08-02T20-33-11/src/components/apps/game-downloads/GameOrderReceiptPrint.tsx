import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useUser } from '@/context/UserContext';
import { useTenant } from '@/context/TenantContext';
import { buildStoreUrl } from '@/lib/utils/store-url';
import '@/styles/game-receipt-print.css';

interface GameOrder {
  id: string;
  tracking_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  game_id?: string;
  game_name?: string;
  game_platform?: string;
  device_type?: string;
  device_specs?: string;
  notes?: string;
  status: string;
  price: number;
  payment_status: string;
  payment_method?: string;
  amount_paid: number;
  created_at: string;
  game?: {
    name: string;
    platform: string;
    price: number;
  };
}

interface GameOrderReceiptPrintProps {
  order: GameOrder;
  storeName: string;
  storePhone?: string;
  storeAddress?: string;
  storeLogo?: string;
  queuePosition?: number;
}

const GameOrderReceiptPrint: React.FC<GameOrderReceiptPrintProps> = ({
  order,
  storeName,
  storePhone,
  storeAddress,
  storeLogo,
  queuePosition
}) => {
  const { currentOrganization } = useTenant();
  
  // بناء رابط المتجر الصحيح
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
          
          .game-receipt, .game-receipt * {
            visibility: visible !important;
          }
          
          .game-receipt {
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
            .game-receipt {
              width: 76mm !important;
              max-width: 76mm !important;
              font-size: 12px !important;
              line-height: 1.3 !important;
            }
          }
          
          /* تحسين للطابعات العادية */
          @media print and (min-width: 80mm) {
            .game-receipt {
              width: 210mm !important;
              max-width: 210mm !important;
              font-size: 14px !important;
              line-height: 1.4 !important;
            }
          }
        
        .game-receipt * {
          max-width: 68mm !important;
          overflow: visible !important;
          word-wrap: break-word !important;
        }
        
        .game-receipt svg, .game-receipt canvas, .game-receipt img {
          visibility: visible !important;
          display: block !important;
          opacity: 1 !important;
          print-color-adjust: exact !important;
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        .game-receipt [data-testid*="qr-code"] {
          visibility: visible !important;
          display: block !important;
          opacity: 1 !important;
        }
        .game-receipt .qr-section > div {
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
  }, [storeUrl, order.tracking_number, order.id]);
  
  // تنسيق التاريخ
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

  // حساب المبلغ المتبقي
  const remainingAmount = (order.price || 0) - (order.amount_paid || 0);

  // استخراج تفاصيل الألعاب من الملاحظات
  const extractGamesFromNotes = () => {
    if (!order.notes || !order.notes.includes('📋 تفاصيل الطلب:')) {
      return [{
        name: order.game?.name || order.game_name || 'لعبة غير محددة',
        platform: order.game?.platform || order.game_platform || 'منصة غير محددة',
        quantity: 1,
        price: order.price || 0
      }];
    }

    const gamesSection = order.notes.split('📋 تفاصيل الطلب:')[1]?.split('📊 الملخص:')[0];
    if (!gamesSection) return [];

    const gameLines = gamesSection.split('\n').filter(line => line.trim().startsWith('•'));
    return gameLines.map(line => {
      const gameName = line.replace('•', '').split('(')[0].trim();
      const platform = line.match(/\(([^)]+)\)/)?.[1] || 'غير محدد';
      const quantity = parseInt(line.match(/الكمية: (\d+)/)?.[1] || '1');
      const price = parseInt(line.match(/السعر: ([\d,]+)/)?.[1]?.replace(/,/g, '') || '0');
      
      return { name: gameName, platform, quantity, price };
    });
  };

  const gamesList = extractGamesFromNotes();
  const totalItems = gamesList.reduce((sum, game) => sum + game.quantity, 0);

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
        className="game-receipt" 
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
            
            .game-receipt {
              font-family: 'Tajawal', Arial, sans-serif !important;
              text-align: center !important;
              direction: rtl !important;
            }
            
            .game-receipt * {
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
              
              .game-receipt {
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
              🎮 إيصال طلب تحميل ألعاب
            </div>
          </div>

          {/* رقم التتبع المميز */}
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
                رقم التتبع
              </div>
              <div className="center-item" style={{ 
                fontSize: '20px', 
                fontWeight: '900',
                color: 'white',
                fontFamily: "'Tajawal', Arial, sans-serif",
                letterSpacing: '1px'
              }}>
                {convertToEnglishNumbers(order.tracking_number)}
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

            {order.customer_email && (
              <div className="info-row center-item">
                <div className="info-label center-item">البريد الإلكتروني</div>
                <div className="info-value center-item" style={{ 
                  fontFamily: "'Tajawal', Arial, sans-serif",
                  direction: 'ltr',
                  display: 'inline-block',
                  fontSize: '11px'
                }}>
                  {order.customer_email}
                </div>
              </div>
            )}
          </div>

          {/* معلومات الجهاز */}
          {(order.device_type || order.device_specs) && (
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
                
                {order.device_type && (
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
                )}

                {order.device_specs && (
                  <div className="center-item" style={{
                    border: '2px dashed #999',
                    padding: '3mm',
                    borderRadius: '3mm',
                    background: '#f9fafb',
                    marginTop: '3mm'
                  }}>
                    <div className="info-label center-item">المواصفات</div>
                    <p className="center-item" style={{ 
                      fontSize: '11px', 
                      lineHeight: '1.4',
                      margin: '0',
                      fontWeight: '500',
                      textAlign: 'center',
                      wordWrap: 'break-word'
                    }}>
                      {order.device_specs}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* قائمة الألعاب */}
          <div className="line-separator"></div>
          <div className="center-item" style={{ marginBottom: '5mm' }}>
            <div className="section-title center-item" style={{ 
              background: '#fef3c7',
              borderColor: '#f59e0b',
              color: '#92400e'
            }}>
              🎮 الألعاب المطلوبة ({totalItems} لعبة)
            </div>
            
            <div className="center-item" style={{ marginTop: '3mm' }}>
              {gamesList.map((game, index) => (
                <div key={index} className="center-item" style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '3mm',
                  padding: '3mm',
                  marginBottom: '2mm',
                  background: '#f9fafb'
                }}>
                  <div className="info-value center-item" style={{ 
                    fontSize: '13px',
                    fontWeight: '700',
                    marginBottom: '1mm'
                  }}>
                    {game.name}
                  </div>
                  <div className="center-item" style={{ 
                    fontSize: '10px',
                    color: '#666',
                    marginBottom: '1mm'
                  }}>
                    المنصة: {game.platform} | الكمية: {game.quantity}
                  </div>
                  <div className="center-item" style={{ 
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#059669'
                  }}>
                    {convertToEnglishNumbers(game.price.toLocaleString())} دج
                  </div>
                </div>
              ))}
            </div>
          </div>

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
                    {convertToEnglishNumbers((order.price || 0).toLocaleString())} دج
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
                    {convertToEnglishNumbers((order.amount_paid || 0).toLocaleString())} دج
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
          </div>

          {/* QR Code للتتبع - العميل */}
          <div className="line-separator"></div>
          <div className="center-item" style={{ marginBottom: '5mm' }}>
            <div className="section-title center-item" style={{ 
              background: '#ecfdf5',
              borderColor: '#059669',
              color: '#059669'
            }}>
              🔗 تتبع حالة الطلب
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
                    value={`${storeUrl}/game-tracking/${order.tracking_number}`} 
                    size={100}
                    data-testid="customer-qr-code"
                  />
                </div>
                
                <div className="center-item" style={{ marginTop: '3mm' }}>
                  <div className="info-label center-item">رقم التتبع</div>
                  <div className="info-value center-item" style={{ 
                    color: '#059669',
                    fontSize: '16px',
                    fontWeight: '900',
                    fontFamily: "'Tajawal', Arial, sans-serif",
                    direction: 'ltr',
                    display: 'inline-block'
                  }}>
                    {convertToEnglishNumbers(order.tracking_number)}
                  </div>
                </div>
                
                <div className="center-item" style={{ marginTop: '2mm' }}>
                  <p className="center-item" style={{ 
                    fontSize: '10px', 
                    margin: '0',
                    opacity: '0.8',
                    textAlign: 'center'
                  }}>
                    امسح الكود أو اكتب الرقم لمتابعة حالة الطلب
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
                fontWeight: '700',
                marginBottom: '3mm'
              }}>
                📋 شروط الخدمة
              </div>
              
              <div className="center-item" style={{ fontSize: '9px', lineHeight: '1.4' }}>
                <p className="center-item" style={{ margin: '1mm 0' }}>
                  • يجب تقديم هذا الإيصال عند استلام الألعاب
                </p>
                <p className="center-item" style={{ margin: '1mm 0' }}>
                  • مدة التحميل تتراوح من 24-72 ساعة حسب حجم الألعاب
                </p>
                <p className="center-item" style={{ margin: '1mm 0' }}>
                  • نحن غير مسؤولين عن أي مشاكل تقنية في الجهاز
                </p>
                <p className="center-item" style={{ margin: '1mm 0' }}>
                  • يرجى التأكد من توافق الألعاب مع مواصفات الجهاز
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
              🔧 إيصال المسؤول - معالجة الطلب
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
                <div className="info-label center-item">رقم التتبع</div>
                <div className="info-value center-item" style={{ 
                  fontSize: '16px',
                  fontWeight: '900',
                  color: '#dc2626'
                }}>
                  {convertToEnglishNumbers(order.tracking_number)}
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

          {/* QR Code للمسؤول - تحميل الألعاب */}
          <div className="center-item" style={{ marginBottom: '5mm' }}>
            <div className="center-item" style={{ 
              fontSize: '14px', 
              fontWeight: '800',
              marginBottom: '4mm',
              color: '#dc2626'
            }}>
              🔧 أكواد سريعة للمسؤول
            </div>
            
            {/* QR لبدء التحميل */}
            <div className="center-item" style={{ marginBottom: '4mm' }}>
              <div className="center-item start-qr qr-section" style={{ 
                border: '3px solid #059669', 
                padding: '4mm', 
                borderRadius: '4mm',
                background: '#ecfdf5',
                width: '100%'
              }}>
                <div className="center-item" style={{ 
                  fontSize: '12px', 
                  marginBottom: '3mm',
                  fontWeight: '800',
                  color: '#059669'
                }}>
                  🚀 بدء التحميل
                </div>
                <QRCodeSVG 
                  value={`${storeUrl}/game-download-start/${order.id}`} 
                  size={80}
                  data-testid="start-qr-code"
                />
                <div className="center-item" style={{ 
                  fontSize: '10px', 
                  marginTop: '2mm',
                  fontWeight: '600',
                  color: '#059669',
                  opacity: '0.8'
                }}>
                  امسح لبدء تحميل الألعاب
                </div>
              </div>
            </div>

            {/* QR لإنهاء الطلب */}
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
                  ✅ إنهاء الطلب
                </div>
                <QRCodeSVG 
                  value={`${storeUrl}/game-complete/${order.id}`} 
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
                  امسح عند إنهاء الطلب
                </div>
              </div>
            </div>
          </div>

          {/* قائمة الألعاب للمسؤول */}
          <div className="center-item" style={{ marginBottom: '4mm' }}>
            <div className="center-item" style={{ 
              fontSize: '12px', 
              fontWeight: '700',
              marginBottom: '3mm'
            }}>
              📝 قائمة الألعاب للتحميل
            </div>
            
            <div className="center-item" style={{
              border: '2px solid #e5e7eb',
              borderRadius: '3mm',
              padding: '3mm',
              background: '#f9fafb'
            }}>
              {gamesList.map((game, index) => (
                <div key={index} className="center-item" style={{
                  borderBottom: index < gamesList.length - 1 ? '1px dashed #ccc' : 'none',
                  paddingBottom: '2mm',
                  marginBottom: index < gamesList.length - 1 ? '2mm' : '0'
                }}>
                  <div className="center-item" style={{ 
                    fontSize: '11px',
                    fontWeight: '700'
                  }}>
                    {index + 1}. {game.name}
                  </div>
                  <div className="center-item" style={{ 
                    fontSize: '9px',
                    color: '#666'
                  }}>
                    {game.platform} | الكمية: {game.quantity}
                  </div>
                </div>
              ))}
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
                  • تاريخ الطلب: {formatDate(order.created_at)}
                </p>
                <p style={{ margin: '1mm 0' }}>
                  • حالة الدفع: {order.payment_status === 'paid' ? 'مدفوع' : order.payment_status === 'partial' ? 'جزئي' : 'غير مدفوع'}
                </p>
                {order.device_type && (
                  <p style={{ margin: '1mm 0' }}>
                    • نوع الجهاز: {order.device_type}
                  </p>
                )}
                <p style={{ margin: '1mm 0' }}>
                  • إجمالي العناصر: {totalItems} لعبة
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default GameOrderReceiptPrint;
