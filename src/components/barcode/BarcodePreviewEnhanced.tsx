/**
 * BarcodePreviewEnhanced - معاينة حية ومتقدمة للباركود قبل الطباعة
 *
 * ⚡ المميزات الجديدة:
 * - معاينة فورية ودقيقة 100% لجميع القوالب
 * - دعم كامل لـ QR Code في القالب الخاص
 * - استخدام نفس CSS المستخدم في الطباعة الفعلية
 * - تحديث فوري عند تغيير أي إعداد
 * - zoom in/out للمعاينة
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, ZoomIn, ZoomOut, QrCode as QrCodeIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { barcodeTemplates } from '@/config/barcode-templates';

interface BarcodePreviewEnhancedProps {
  // بيانات المنتج
  productName: string;
  productPrice: number | string;
  productSku: string;
  productBarcode: string;
  productSlug?: string;
  storeName: string;
  storeDomain?: string;

  // إعدادات الباركود
  barcodeType: string;
  templateId: string;

  // إعدادات العرض
  showStoreName: boolean;
  showProductName: boolean;
  showPrice: boolean;
  showSku: boolean;
  showBarcodeValue: boolean;

  // إعدادات الملصق
  labelWidth: number;
  labelHeight: number;
  fontFamily?: string;
}

const BarcodePreviewEnhanced: React.FC<BarcodePreviewEnhancedProps> = ({
  productName,
  productPrice,
  productSku,
  productBarcode,
  productSlug = '',
  storeName,
  storeDomain = '',
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
  const barcodeCanvasRef = useRef<HTMLCanvasElement>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1.5);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // الحصول على القالب المختار
  const selectedTemplate = useMemo(() => {
    return barcodeTemplates.find(t => t.id === templateId) || barcodeTemplates[0];
  }, [templateId]);

  // توليد الباركود العادي
  useEffect(() => {
    if (!barcodeCanvasRef.current) return;

    const value = productBarcode || productSku || 'SAMPLE123';
    const templateOptions = selectedTemplate.jsBarcodeOptions || {};

    try {
      JsBarcode(barcodeCanvasRef.current, value, {
        format: barcodeType || 'CODE128',
        lineColor: '#000',
        background: '#fff',
        width: templateOptions.width || 2,
        height: templateOptions.height || 40,
        displayValue: templateOptions.displayValue ?? showBarcodeValue,
        fontSize: templateOptions.fontSize || 12,
        margin: templateOptions.margin ?? 5,
        fontOptions: templateOptions.fontOptions || '',
        textMargin: templateOptions.textMargin || 2,
        flat: templateOptions.flat || false,
        valid: (valid) => {
          if (!valid) {
            setBarcodeError('قيمة غير صالحة لهذا النوع');
          }
        }
      });
      setBarcodeError(null);
    } catch (error) {
      console.error('[BarcodePreview] Error generating barcode:', error);
      setBarcodeError('فشل توليد الباركود');
    }
  }, [productBarcode, productSku, barcodeType, showBarcodeValue, selectedTemplate]);

  // توليد QR Code (للقالب qr-plus-barcode)
  useEffect(() => {
    if (templateId !== 'qr-plus-barcode') return;

    const productUrl = productSlug
      ? `https://${storeDomain}/product-purchase-max-v3/${productSlug}`
      : `https://${storeDomain}`;

    QRCode.toDataURL(productUrl, {
      errorCorrectionLevel: 'L',
      margin: 1,
      width: 200,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })
      .then(url => setQrCodeDataUrl(url))
      .catch(err => console.error('[BarcodePreview] QR Code generation error:', err));
  }, [templateId, productSlug, storeDomain]);

  // حساب الأبعاد بالبكسل (1mm ≈ 3.78px for 96 DPI)
  const pxWidth = labelWidth * 3.78 * scale;
  const pxHeight = labelHeight * 3.78 * scale;

  // رندر محتوى الملصق حسب القالب
  const renderLabelContent = () => {
    // القالب الخاص بـ QR Code
    if (templateId === 'qr-plus-barcode') {
      return (
        <div className="barcode-label template-qr-plus-barcode h-full w-full" style={{ fontFamily }}>
          {showStoreName && storeName && (
            <div className="store-name-header-new">{storeName}</div>
          )}

          <div className="main-content-wrapper-new">
            {/* QR Code */}
            <div className="qr-code-container-new">
              {qrCodeDataUrl && (
                <img src={qrCodeDataUrl} alt="QR Code" />
              )}
            </div>

            {/* تفاصيل المنتج */}
            <div className="product-details-area-new">
              <div className="info-table-new">
                {showProductName && productName && (
                  <div className="info-table-row-new product-name-row-new">
                    <div className="info-value-new">{productName}</div>
                  </div>
                )}

                {/* الباركود */}
                <div className="info-table-row-new barcode-row-new">
                  <div className="barcode-svg-container-new">
                    {barcodeError ? (
                      <div className="text-[6px] text-red-500 text-center">{barcodeError}</div>
                    ) : (
                      <canvas ref={barcodeCanvasRef} className="max-w-full" />
                    )}
                  </div>
                </div>

                {showPrice && (
                  <div className="info-table-row-new price-row-new">
                    <div className="info-value-new">{productPrice} DA</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {storeDomain && (
            <div className="site-url-footer-new">{storeDomain}</div>
          )}
        </div>
      );
    }

    // القوالب العادية (default, classic, compact, ideal)
    return (
      <div className={cn("barcode-label", `template-${templateId}`, "h-full w-full flex flex-col items-center justify-between p-2")} style={{ fontFamily }}>
        {/* اسم المتجر */}
        {showStoreName && storeName && (
          <div className="org-name">{storeName}</div>
        )}

        {/* اسم المنتج */}
        {showProductName && productName && (
          <div className="product-name">{productName}</div>
        )}

        {/* فاصل (للقالب ideal فقط) */}
        {templateId === 'ideal' && (
          <div className="divider"></div>
        )}

        {/* الباركود */}
        <div className="flex-1 flex items-center justify-center w-full">
          {barcodeError ? (
            <div className="text-[8px] text-red-500 text-center p-1">{barcodeError}</div>
          ) : (
            <canvas ref={barcodeCanvasRef} className="max-w-full max-h-full" />
          )}
        </div>

        {/* السعر والـ SKU */}
        {templateId === 'ideal' ? (
          <div className="price-sku-container">
            {showPrice && (
              <div className="price">{productPrice} DA</div>
            )}
            {showSku && (
              <div className="sku">{productSku}</div>
            )}
          </div>
        ) : (
          <>
            {showPrice && (
              <div className="price">{productPrice} DA</div>
            )}
            {showSku && (
              <div className="sku">{productSku}</div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-4 w-4" />
            معاينة حية للملصق
          </CardTitle>

          {/* أدوات التكبير/التصغير */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
              title="تصغير"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <Badge variant="secondary" className="text-xs px-2 min-w-[50px] justify-center">
              {Math.round(scale * 100)}%
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setScale(s => Math.min(3, s + 0.25))}
              title="تكبير"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* حاوية المعاينة */}
        <div className="flex justify-center items-center p-6 bg-gradient-to-br from-muted/30 to-muted/10 rounded-lg min-h-[200px] border-2 border-dashed border-muted-foreground/20">
          <div
            className={cn(
              "bg-white shadow-lg rounded-sm overflow-hidden transition-all duration-200",
              "border border-gray-200"
            )}
            style={{
              width: pxWidth,
              height: pxHeight,
              minWidth: 100,
              minHeight: 80
            }}
          >
            <style>
              {selectedTemplate.css}
            </style>
            {renderLabelContent()}
          </div>
        </div>

        {/* معلومات الملصق */}
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Badge variant="outline" className="text-[10px]">
            📏 {labelWidth}×{labelHeight} مم
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            🎨 {selectedTemplate.name}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {templateId === 'qr-plus-barcode' ? (
              <><QrCodeIcon className="h-3 w-3 inline ml-1" /> QR + {barcodeType}</>
            ) : (
              <>{barcodeType}</>
            )}
          </Badge>
          {fontFamily && fontFamily !== 'system-ui' && (
            <Badge variant="outline" className="text-[10px]">
              ✏️ {fontFamily}
            </Badge>
          )}
        </div>

        {/* تنبيه إذا كان القالب يتطلب بيانات معينة */}
        {templateId === 'qr-plus-barcode' && (!storeDomain || !productSlug) && (
          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
            💡 للحصول على أفضل نتيجة مع هذا القالب، تأكد من تعيين نطاق المتجر ورابط المنتج
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BarcodePreviewEnhanced;
