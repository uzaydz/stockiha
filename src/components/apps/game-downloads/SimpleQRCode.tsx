import React from 'react';

interface SimpleQRCodeProps {
  value: string;
  size?: number;
  style?: React.CSSProperties;
  className?: string;
  'data-testid'?: string;
}

const SimpleQRCode: React.FC<SimpleQRCodeProps> = ({
  value,
  size = 100,
  style,
  className,
  'data-testid': testId
}) => {
  // استخدام خدمة QR Server API مع إعدادات محسنة للطباعة
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&format=png&margin=5&color=000000&bgcolor=ffffff&ecc=M`;

  return (
    <div
      className={className}
      style={{
        display: 'block',
        margin: '0 auto',
        border: '2px solid black',
        borderRadius: '2mm',
        padding: '2mm',
        backgroundColor: 'white',
        printColorAdjust: 'exact',
        WebkitPrintColorAdjust: 'exact',
        colorAdjust: 'exact',
        width: 'fit-content',
        ...style
      }}
      data-testid={testId}
    >
      <img
        src={qrUrl}
        alt={`QR Code: ${value}`}
        style={{
          display: 'block',
          width: size,
          height: size,
          margin: '0 auto',
          printColorAdjust: 'exact',
          WebkitPrintColorAdjust: 'exact',
          colorAdjust: 'exact'
        }}
        onError={(e) => {
          console.error('خطأ في تحميل QR Code:', e);
          // في حالة فشل تحميل الصورة، عرض رسالة بديلة
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent) {
            parent.innerHTML = `
              <div style="
                width: ${size}px; 
                height: ${size}px; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                font-size: 10px; 
                text-align: center; 
                background: #f9f9f9; 
                border: 1px dashed #ccc;
                color: #666;
              ">
                QR Code<br/>
                ${value.length > 20 ? value.substring(0, 20) + '...' : value}
              </div>
            `;
          }
        }}
        onLoad={() => {
          console.log('✅ تم تحميل QR Code بنجاح للرابط:', value);
        }}
      />
    </div>
  );
};

export default SimpleQRCode; 