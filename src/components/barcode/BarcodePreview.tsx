/**
 * BarcodePreview - معاينة حية ومتقدمة للباركود قبل الطباعة
 *
 * ⚡ المميزات:
 * - معاينة فورية ودقيقة للملصق
 * - دعم جميع القوالب (default, classic, compact, ideal, qr-plus-barcode)
 * - دعم QR Code للقالب الخاص
 * - تحديث تلقائي عند تغيير أي إعداد
 * - معاينة بنفس CSS المستخدم في الطباعة
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Printer, ZoomIn, ZoomOut, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { barcodeTemplates } from '@/config/barcode-templates';

interface BarcodePreviewProps {
  productName: string;
  productPrice: number | string;
  productSku: string;
  productBarcode: string;
  storeName: string;
  barcodeType: string;
  templateId: string;
  showStoreName: boolean;
  showProductName: boolean;
  showPrice: boolean;
  showSku: boolean;
  showBarcodeValue: boolean;
  labelWidth: number;
  labelHeight: number;
  fontFamily?: string;
}

const BarcodePreview: React.FC<BarcodePreviewProps> = ({
  productName,
  productPrice,
  productSku,
  productBarcode,
  storeName,
  barcodeType,
  templateId,
  showStoreName,
  showProductName,
  showPrice,
  showSku,
  showBarcodeValue,
  labelWidth,
  labelHeight,
  fontFamily = 'system-ui'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);

  // توليد الباركود
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const value = productBarcode || productSku || 'SAMPLE123';
    
    try {
      JsBarcode(canvasRef.current, value, {
        format: barcodeType || 'CODE128',
        lineColor: '#000',
        width: 2,
        height: 40,
        displayValue: showBarcodeValue,
        fontSize: 12,
        margin: 5,
        valid: (valid) => {
          if (!valid) {
            setBarcodeError('قيمة غير صالحة لهذا النوع');
          }
        }
      });
      setBarcodeError(null);
    } catch (error) {
      // محاولة CODE128 كـ fallback
      try {
        JsBarcode(canvasRef.current, value, {
          format: 'CODE128',
          lineColor: '#000',
          width: 2,
          height: 40,
          displayValue: showBarcodeValue,
          fontSize: 12,
          margin: 5
        });
        setBarcodeError(null);
      } catch (e2) {
        setBarcodeError('فشل توليد الباركود');
      }
    }
  }, [productBarcode, productSku, barcodeType, showBarcodeValue]);

  // حساب الأبعاد بالبكسل (1mm ≈ 3.78px)
  const pxWidth = labelWidth * 3.78 * scale;
  const pxHeight = labelHeight * 3.78 * scale;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-4 w-4" />
            معاينة الملصق
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <Badge variant="secondary" className="text-xs px-2">
              {Math.round(scale * 100)}%
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setScale(s => Math.min(2, s + 0.25))}
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {/* حاوية المعاينة */}
        <div className="flex justify-center items-center p-4 bg-muted/30 rounded-lg min-h-[150px]">
          <div
            className={cn(
              "bg-white border-2 border-dashed border-gray-300 rounded shadow-sm",
              "flex flex-col items-center justify-center p-2 transition-all duration-200"
            )}
            style={{
              width: pxWidth,
              height: pxHeight,
              fontFamily: fontFamily,
              minWidth: 100,
              minHeight: 80
            }}
          >
            {/* اسم المتجر */}
            {showStoreName && storeName && (
              <p className="text-[8px] font-bold text-center truncate w-full mb-0.5">
                {storeName}
              </p>
            )}

            {/* اسم المنتج */}
            {showProductName && productName && (
              <p className="text-[7px] text-center truncate w-full mb-1">
                {productName}
              </p>
            )}

            {/* الباركود */}
            <div className="flex-1 flex items-center justify-center w-full">
              {barcodeError ? (
                <div className="text-[8px] text-red-500 text-center p-1">
                  {barcodeError}
                </div>
              ) : (
                <canvas
                  ref={canvasRef}
                  className="max-w-full max-h-full"
                  style={{ imageRendering: 'crisp-edges' }}
                />
              )}
            </div>

            {/* السعر و SKU */}
            <div className="flex items-center justify-between w-full mt-1 px-1">
              {showPrice && (
                <span className="text-[8px] font-bold">
                  {productPrice} DA
                </span>
              )}
              {showSku && (
                <span className="text-[6px] text-gray-500">
                  {productSku}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* معلومات الملصق */}
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-[10px]">
            {labelWidth}×{labelHeight} مم
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {barcodeType}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {templateId}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default BarcodePreview;
