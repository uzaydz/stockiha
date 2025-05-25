import React, { useEffect, useState } from 'react';
import Barcode from 'react-barcode';
import { Card, CardContent } from './card';
import { Button } from './button';
import { Download, Printer, QrCode, ZoomIn, ZoomOut } from 'lucide-react';
import { getBarcodeImageUrl, getQRCodeUrl } from '@/lib/barcode-utils';
import { createCleanPrintWindow } from '@/utils/printUtils';

export interface BarcodeDisplayProps {
  value: string;
  width?: number;
  height?: number;
  bcid?: 'code128' | 'code39' | 'ean13' | 'qrcode';
  displayValue?: boolean;
  showControls?: boolean;
  title?: string;
  fontSize?: number;
  textAlign?: 'center' | 'left' | 'right';
  textPosition?: 'bottom' | 'top';
  background?: string;
  lineColor?: string;
  margin?: number;
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  includeText?: boolean;
  useExternalApi?: boolean;
  printSize?: 'small' | 'medium' | 'large';
}

const DEFAULT_PROPS: Partial<BarcodeDisplayProps> = {
  width: 2,
  height: 80,
  bcid: 'code128',
  displayValue: true,
  fontSize: 12,
  textAlign: 'center',
  textPosition: 'bottom',
  background: '#ffffff',
  lineColor: '#000000',
  margin: 10,
  showControls: true,
  includeText: true,
  useExternalApi: false,
  printSize: 'medium',
};

const BarcodeDisplay: React.FC<BarcodeDisplayProps> = (props) => {
  const {
    value,
    width,
    height,
    bcid,
    displayValue,
    fontSize,
    textAlign,
    textPosition,
    background,
    lineColor,
    margin,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    showControls,
    title,
    includeText,
    useExternalApi,
    printSize
  } = { ...DEFAULT_PROPS, ...props };

  const [zoomLevel, setZoomLevel] = useState(1);
  const [barcodeImageUrl, setBarcodeImageUrl] = useState<string | null>(null);

  // إنشاء URL للباركود عند التحميل
  useEffect(() => {
    if (useExternalApi && value) {
      if (bcid === 'qrcode') {
        setBarcodeImageUrl(getQRCodeUrl(value, height || 150));
      } else {
        setBarcodeImageUrl(
          getBarcodeImageUrl(
            value,
            bcid || 'code128',
            width || 2,
            height || 80,
            includeText || true,
            fontSize || 12
          )
        );
      }
    } else {
      setBarcodeImageUrl(null);
    }
  }, [value, bcid, width, height, includeText, fontSize, useExternalApi]);

  // التأكد من وجود قيمة صالحة للباركود
  if (!value || value.trim() === '') {
    return (
      <Card className="w-full p-4 text-center bg-gray-50">
        <div className="text-gray-400 my-4">لا يوجد باركود</div>
      </Card>
    );
  }

  // تنزيل الباركود كصورة
  const handleDownload = () => {
    if (useExternalApi && barcodeImageUrl) {
      // إذا كنا نستخدم API خارجي، قم بتنزيل الصورة مباشرة
      const link = document.createElement('a');
      link.download = `barcode-${value}.png`;
      link.href = barcodeImageUrl;
      link.click();
    } else {
      // إذا كنا نستخدم مكتبة react-barcode
      const canvas = document.querySelector(
        `[data-barcode-value="${value}"] canvas`
      ) as HTMLCanvasElement;

      if (canvas) {
        const link = document.createElement('a');
        link.download = `barcode-${value}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    }
  };

  // طباعة الباركود
  const handlePrint = () => {
    // توليد قيمة وصورة الباركود للطباعة
    const barcodeImg = useExternalApi && barcodeImageUrl 
      ? barcodeImageUrl 
      : (document.querySelector(`[data-barcode-value="${value}"] canvas`) as HTMLCanvasElement)?.toDataURL('image/png');
    
    if (barcodeImg) {
      let printWidth, printHeight;
      
      // تحديد أبعاد الطباعة بناءً على الحجم المحدد
      switch (printSize) {
        case 'small':
          printWidth = '40mm';
          printHeight = '25mm';
          break;
        case 'large':
          printWidth = '90mm';
          printHeight = '50mm';
          break;
        default: // medium
          printWidth = '60mm';
          printHeight = '35mm';
          break;
      }
      
      const printContent = `
        <div style="
          margin: 5px auto;
          max-width: 100%;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        ">
          ${title ? `<div style="margin-bottom: 3px; font-weight: bold; font-size: 8px;">${title}</div>` : ''}
          <div style="
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 0 auto;
          ">
            <img src="${barcodeImg}" alt="باركود ${value}" style="
              max-width: 100%;
              height: auto;
              object-fit: contain;
              width: auto !important;
              max-height: ${printSize === 'small' ? '15mm' : printSize === 'large' ? '35mm' : '25mm'};
              display: inline-block !important;
            " />
          </div>
          ${includeText ? `<div style="margin-top: 3px; font-size: 10px; font-family: monospace;">${value}</div>` : ''}
        </div>
        
        <style>
          @media print {
            @page {
              size: ${printWidth} ${printHeight};
              margin: 0;
            }
            body {
              margin: 0;
              padding: 1mm;
              text-align: center;
              font-family: Arial, sans-serif;
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
          }
        </style>
      `;
      
      // استخدام الطباعة المحسّنة
      const printWindow = createCleanPrintWindow(printContent, `طباعة باركود: ${value}`);
      
      if (!printWindow) {
        alert('تم منع فتح نافذة الطباعة من قبل المتصفح');
      }
    }
  };
  
  // تكبير/تصغير الباركود
  const handleZoom = (direction: 'in' | 'out') => {
    if (direction === 'in') {
      setZoomLevel((prev) => Math.min(prev + 0.2, 2.0));
    } else {
      setZoomLevel((prev) => Math.max(prev - 0.2, 0.6));
    }
  };

  return (
    <Card className="overflow-hidden">
      {title && (
        <div className="bg-gray-50 p-2 border-b text-center font-medium">
          {title}
        </div>
      )}
      <CardContent className="p-4 flex flex-col items-center">
        <div 
          data-barcode-value={value} 
          className="my-2 mx-auto"
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center', transition: 'transform 0.2s' }}
        >
          {useExternalApi && barcodeImageUrl ? (
            // عرض الباركود باستخدام API خارجي
            bcid === 'qrcode' ? (
              <img src={barcodeImageUrl} alt={`QR Code: ${value}`} />
            ) : (
              <img 
                src={barcodeImageUrl} 
                alt={`Barcode: ${value}`} 
                style={{ maxWidth: '100%', width: 'auto', height: 'auto' }}
                onError={(e) => {
                  console.error('فشل تحميل صورة الباركود:', value);
                  e.currentTarget.style.display = 'none';
                }}
              />
            )
          ) : (
            // عرض الباركود باستخدام مكتبة react-barcode
            <Barcode
              value={value}
              width={width}
              height={height}
              format={bcid === 'code39' ? 'CODE39' : bcid === 'ean13' ? 'EAN13' : 'CODE128'}
              displayValue={displayValue}
              fontSize={fontSize}
              textAlign={textAlign}
              textPosition={textPosition}
              background={background}
              lineColor={lineColor}
              margin={margin}
              marginTop={marginTop}
              marginBottom={marginBottom}
              marginLeft={marginLeft}
              marginRight={marginRight}
            />
          )}
        </div>

        {showControls && (
          <div className="flex space-x-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="flex items-center"
            >
              <Download className="h-4 w-4 ml-2" />
              تنزيل
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="flex items-center"
            >
              <Printer className="h-4 w-4 ml-2" />
              طباعة
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleZoom('in')}
              className="flex items-center"
              disabled={zoomLevel >= 2.0}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleZoom('out')}
              className="flex items-center"
              disabled={zoomLevel <= 0.6}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BarcodeDisplay; 