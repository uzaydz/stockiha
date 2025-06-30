import React from 'react';

interface FallbackQRCodeProps {
  value: string;
  size?: number;
  style?: React.CSSProperties;
  className?: string;
  'data-testid'?: string;
}

const FallbackQRCode: React.FC<FallbackQRCodeProps> = ({
  value,
  size = 100,
  style,
  className,
  'data-testid': testId
}) => {
  // استخدام خدمة QR Code عبر الإنترنت كبديل
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&format=png&margin=10&color=000000&bgcolor=ffffff`;

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
        width: size,
        height: size,
        ...style
      }}
      data-testid={testId}
    >
      <img
        src={qrUrl}
        alt="QR Code"
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          objectFit: 'contain'
        }}
        onError={(e) => {
          console.error('فشل في تحميل QR Code من الخدمة البديلة');
          // إظهار نص بديل في حالة فشل تحميل الصورة
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent) {
            parent.innerHTML = `
              <div style="
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                text-align: center;
                color: #666;
                flex-direction: column;
              ">
                <div>QR Code</div>
                <div style="margin-top: 4px; font-size: 8px;">للتتبع</div>
                <div style="margin-top: 8px; font-size: 6px; word-break: break-all;">
                  ${value.length > 30 ? value.substring(0, 30) + '...' : value}
                </div>
              </div>
            `;
          }
        }}
        onLoad={() => {
          console.log('✅ تم تحميل QR Code من الخدمة البديلة بنجاح');
        }}
      />
    </div>
  );
};

export default FallbackQRCode; 