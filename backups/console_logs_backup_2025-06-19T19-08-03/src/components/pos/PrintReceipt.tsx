import React, { useRef, useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Printer, ShoppingBag, Receipt, Wrench, QrCode, Clock, User, Hash, X, Download, Eye, Copy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Product, Service } from '@/types';
import { formatPrice } from '@/lib/utils';
import { usePOSData } from '@/context/POSDataContext';
import { useTenant } from '@/context/TenantContext';
import { POSSettings } from '@/types/posSettings';
import { QRCodeSVG } from 'qrcode.react';

interface CartItem {
  product: Product;
  quantity: number;
  wholesalePrice?: number | null;
  isWholesale?: boolean;
  colorId?: string;
  colorName?: string;
  colorCode?: string;
  sizeId?: string;
  sizeName?: string;
  variantPrice?: number;
  variantImage?: string;
}

interface SelectedService extends Service {
  scheduledDate?: Date;
  notes?: string;
  customerId?: string;
  public_tracking_code?: string;
}

interface PrintReceiptProps {
  orderId: string;
  items: CartItem[];
  services: SelectedService[];
  subtotal: number;
  tax: number;
  total: number;
  customerName?: string;
  employeeName?: string;
  paymentMethod?: string;
  discount?: number;
  discountAmount?: number;
  amountPaid?: number;
  remainingAmount?: number;
  isPartialPayment?: boolean;
  considerRemainingAsPartial?: boolean;
  isOpen: boolean;
  onClose: () => void;
}

const PrintReceipt: React.FC<PrintReceiptProps> = ({
  orderId,
  items,
  services,
  subtotal,
  tax,
  total,
  customerName,
  employeeName,
  paymentMethod,
  discount = 0,
  discountAmount = 0,
  amountPaid,
  remainingAmount = 0,
  isPartialPayment = false,
  considerRemainingAsPartial = false,
  isOpen,
  onClose
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const { currentOrganization } = useTenant();
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  
  // استخدام POSDataContext المحسن بدلاً من usePOSSettings المكرر
  const { posSettings: settings, isPOSSettingsLoading: isLoading, errors } = usePOSData();
  const error = errors.posSettings;

  // CSS للمكون لضمان تطابق الأحجام
  const componentStyles = useMemo(() => {
    const bgColor = settings?.background_color || '#ffffff';
    const textColor = settings?.text_color || '#000000';
    const fontSize = settings?.font_size || 10;
    
    return `
      <style>
        /* أنماط عامة للمعاينة لتطابق الطباعة - نظيفة بدون إطارات */
        .receipt-preview {
          font-family: 'Tajawal', 'Arial', sans-serif !important;
          background: ${bgColor} !important;
          color: ${textColor} !important;
          direction: rtl !important;
          text-align: right !important;
          border: none !important;
          box-shadow: none !important;
          outline: none !important;
        }
        
        /* إزالة جميع الإطارات من العناصر الفرعية */
        .receipt-preview * {
          border: none !important;
          outline: none !important;
        }
        
        /* أنماط الشعار */
        .receipt-preview .store-logo {
          width: 48px !important;
          height: 48px !important;
          max-width: 48px !important;
          max-height: 48px !important;
          object-fit: contain !important;
          display: block !important;
          margin: 0 auto 12px auto !important;
          border: none !important;
        }
        
        /* أنماط النصوص */
        .receipt-preview .text-xs { font-size: ${fontSize * 0.75}px !important; }
        .receipt-preview .text-sm { font-size: ${fontSize * 0.875}px !important; }
        .receipt-preview .text-lg { font-size: ${fontSize * 1.125}px !important; }
        
        /* أنماط الجدول - نظيفة */
        .receipt-preview table {
          width: 100% !important;
          border-collapse: collapse !important;
          margin: 8px 0 !important;
          border: none !important;
          background: transparent !important;
        }
        
        .receipt-preview th,
        .receipt-preview td {
          padding: 4px 2px !important;
          text-align: inherit !important;
          font-size: inherit !important;
          border: none !important;
          background: transparent !important;
        }
        
        /* خطوط منقطة للفصل فقط */
        .receipt-preview .border-dashed {
          border-style: dashed !important;
          border-color: #ccc !important;
        }
        
        .receipt-preview .border-t { 
          border-top: 1px dashed #ccc !important; 
          border-left: none !important;
          border-right: none !important;
          border-bottom: none !important;
        }
        .receipt-preview .border-b { 
          border-bottom: 1px dashed #ccc !important; 
          border-left: none !important;
          border-right: none !important;
          border-top: none !important;
        }
        .receipt-preview .border-t-2 { 
          border-top: 2px dashed #ccc !important; 
          border-left: none !important;
          border-right: none !important;
          border-bottom: none !important;
        }
        
        /* المسافات */
        .receipt-preview .mb-1 { margin-bottom: 4px !important; }
        .receipt-preview .mb-2 { margin-bottom: 8px !important; }
        .receipt-preview .mb-3 { margin-bottom: 12px !important; }
        .receipt-preview .mb-4 { margin-bottom: 16px !important; }
        .receipt-preview .mt-1 { margin-top: 4px !important; }
        .receipt-preview .mt-2 { margin-top: 8px !important; }
        .receipt-preview .mt-4 { margin-top: 16px !important; }
        .receipt-preview .pt-1 { padding-top: 4px !important; }
        .receipt-preview .pt-2 { padding-top: 8px !important; }
        .receipt-preview .pb-1 { padding-bottom: 4px !important; }
        .receipt-preview .py-1 { padding-top: 4px !important; padding-bottom: 4px !important; }
        .receipt-preview .py-2 { padding-top: 8px !important; padding-bottom: 8px !important; }
        
        /* الألوان */
        .receipt-preview .text-gray-500 { color: #6b7280 !important; }
        .receipt-preview .text-gray-400 { color: #9ca3af !important; }
        .receipt-preview .text-red-600 { color: #dc2626 !important; }
        .receipt-preview .text-green-600 { color: #16a34a !important; }
        .receipt-preview .text-blue-600 { color: #2563eb !important; }
        .receipt-preview .text-amber-600 { color: #d97706 !important; }
        .receipt-preview .bg-gray-100 { 
          background-color: #f3f4f6 !important; 
          border: none !important;
          padding: 4px !important;
        }
        .receipt-preview .bg-gray-700 { 
          background-color: #374151 !important; 
          border: none !important;
          padding: 4px !important;
        }
        .receipt-preview .text-gray-800 { color: #1f2937 !important; }
        .receipt-preview .text-gray-200 { color: #e5e7eb !important; }
        
        /* فليكس */
        .receipt-preview .flex { display: flex !important; }
        .receipt-preview .justify-center { justify-content: center !important; }
        .receipt-preview .justify-between { justify-content: space-between !important; }
        .receipt-preview .items-center { align-items: center !important; }
        .receipt-preview .flex-col { flex-direction: column !important; }
        .receipt-preview .flex-1 { flex: 1 !important; }
        .receipt-preview .gap-1 { gap: 4px !important; }
        .receipt-preview .gap-2 { gap: 8px !important; }
        
        /* خط عريض */
        .receipt-preview .font-bold { font-weight: bold !important; }
        .receipt-preview .font-mono { font-family: 'Tajawal', 'Arial', sans-serif !important; }
        
        /* المسافات بين العناصر */
        .receipt-preview .space-y-1 > * + * { margin-top: 4px !important; }
        .receipt-preview .space-y-2 > * + * { margin-top: 8px !important; }
        
        /* حدود مدورة - منع الإطارات */
        .receipt-preview .rounded { 
          border-radius: 4px !important; 
          border: none !important;
        }
        
        /* كائن احتواء */
        .receipt-preview .object-contain { object-fit: contain !important; }
        
        /* إزالة أنماط القوالب التي تضيف إطارات في المعاينة */
        .receipt-preview.receipt-preview {
          border: none !important;
          box-shadow: none !important;
          background: ${bgColor} !important;
        }
        
        /* أيقونات */
        .receipt-preview .lucide {
          display: inline-block !important;
          vertical-align: middle !important;
          border: none !important;
        }
        
        /* أنماط QR Code في المعاينة */
        .receipt-preview .qr-code-container {
          width: 64px !important;
          height: 64px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          margin: 0 auto 8px auto !important;
          border: none !important;
        }
        
        .receipt-preview .qr-code-container svg {
          width: 60px !important;
          height: 60px !important;
          border: none !important;
        }

      </style>
    `;
  }, [settings?.background_color, settings?.text_color, settings?.font_size]);

  // تسجيل معلومات الإعدادات للتشخيص
  useEffect(() => {
  }, [currentOrganization?.id, settings, isLoading, error]);

  // مراقبة تغييرات الإعدادات وإعادة تطبيقها فوراً
  useEffect(() => {
    if (settings && printRef.current) {
      
      // تحديث الأنماط المباشرة للعنصر
      const receiptElement = printRef.current;
      if (receiptElement) {
        receiptElement.style.width = `${settings.paper_width * 3.5}px`;
        receiptElement.style.fontSize = `${settings.font_size}px`;
        receiptElement.style.lineHeight = settings.line_spacing.toString();
        receiptElement.style.color = settings.text_color;
        receiptElement.style.backgroundColor = settings.background_color;
      }
    }
  }, [settings]);

  // إغلاق المودال عند الضغط على Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // منع التمرير في الخلفية
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // طباعة الوصل مع تحسينات
  const handlePrint = () => {
    if (printRef.current) {
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        // استخراج CSS من الصفحة الحالية
        const existingStyles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
          .map(element => element.outerHTML)
          .join('\n');
        
        // إضافة CSS مخصص للطباعة مع الحفاظ على التصميم الأصلي
        const printStyles = `
          <style>
            /* إعادة تعيين جميع الأنماط لإزالة الإطارات البشعة */
            * {
              margin: 0 !important;
              padding: 0 !important;
              box-sizing: border-box !important;
              border: none !important;
              outline: none !important;
              box-shadow: none !important;
              font-family: 'Tajawal', 'Arial', sans-serif !important;
            }
            
            /* أنماط الجسم */
            body { 
              margin: 0 !important; 
              padding: 10px !important; 
              font-family: 'Tajawal', 'Arial', sans-serif !important;
              font-size: ${settings?.font_size || 10}px !important;
              line-height: ${settings?.line_spacing || 1.2} !important;
              color: ${settings?.text_color || '#000000'} !important;
              background-color: ${settings?.background_color || '#ffffff'} !important;
              direction: rtl !important;
              text-align: right !important;
              overflow-x: hidden !important;
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            
            /* حاوي الوصل - نظيف بدون إطارات */
            .receipt-container {
              width: ${settings ? `${settings.paper_width * 3.5}px` : '300px'} !important;
              margin: 0 auto !important;
              background: ${settings?.background_color || '#ffffff'} !important;
              color: ${settings?.text_color || '#000000'} !important;
              font-family: 'Tajawal', 'Arial', sans-serif !important;
              position: relative !important;
              border: none !important;
              box-shadow: none !important;
              outline: none !important;
            }
            
            /* إخفاء العناصر غير المطلوبة للطباعة */
            .no-print { 
              display: none !important; 
            }
            
            /* أنماط الشعار */
            .store-logo {
              width: 48px !important;
              height: 48px !important;
              max-width: 48px !important;
              max-height: 48px !important;
              object-fit: contain !important;
              margin: 0 auto 12px auto !important;
              display: block !important;
              border: none !important;
            }
            
            /* أنماط النصوص */
            .text-xs { font-size: ${(settings?.font_size || 10) * 0.75}px !important; }
            .text-sm { font-size: ${(settings?.font_size || 10) * 0.875}px !important; }
            .text-lg { font-size: ${(settings?.font_size || 10) * 1.125}px !important; }
            
            /* أنماط المحاذاة */
            .text-center { text-align: center !important; }
            .text-right { text-align: right !important; }
            .text-left { text-align: left !important; }
            
            /* أنماط الجدول - نظيفة بدون إطارات */
            table {
              width: 100% !important;
              border-collapse: collapse !important;
              margin: 8px 0 !important;
              border: none !important;
              background: transparent !important;
            }
            
            th, td {
              padding: 4px 2px !important;
              text-align: inherit !important;
              font-size: inherit !important;
              border: none !important;
              background: transparent !important;
            }
            
            /* خطوط منقطة للفصل فقط - ليس إطارات */
            .border-dashed {
              border-style: dashed !important;
              border-color: #ccc !important;
            }
            
            .border-t { 
              border-top: 1px dashed #ccc !important; 
              border-left: none !important;
              border-right: none !important;
              border-bottom: none !important;
            }
            .border-b { 
              border-bottom: 1px dashed #ccc !important; 
              border-left: none !important;
              border-right: none !important;
              border-top: none !important;
            }
            .border-t-2 { 
              border-top: 2px dashed #ccc !important; 
              border-left: none !important;
              border-right: none !important;
              border-bottom: none !important;
            }
            
            /* المسافات */
            .mb-1 { margin-bottom: 4px !important; }
            .mb-2 { margin-bottom: 8px !important; }
            .mb-3 { margin-bottom: 12px !important; }
            .mb-4 { margin-bottom: 16px !important; }
            .mt-1 { margin-top: 4px !important; }
            .mt-2 { margin-top: 8px !important; }
            .mt-4 { margin-top: 16px !important; }
            .pt-1 { padding-top: 4px !important; }
            .pt-2 { padding-top: 8px !important; }
            .pb-1 { padding-bottom: 4px !important; }
            .py-1 { padding-top: 4px !important; padding-bottom: 4px !important; }
            .py-2 { padding-top: 8px !important; padding-bottom: 8px !important; }
            
            /* العرض والارتفاع */
            .w-12 { width: 48px !important; }
            .h-12 { height: 48px !important; }
            .w-3 { width: 12px !important; }
            .h-3 { height: 12px !important; }
            .w-4 { width: 16px !important; }
            .h-4 { height: 16px !important; }
            .w-6 { width: 24px !important; }
            .h-6 { height: 24px !important; }
            .w-8 { width: 32px !important; }
            .h-8 { height: 32px !important; }
            .w-10 { width: 40px !important; }
            .h-10 { height: 40px !important; }
            
            /* الألوان */
            .text-gray-500 { color: #6b7280 !important; }
            .text-gray-400 { color: #9ca3af !important; }
            .text-red-600 { color: #dc2626 !important; }
            .text-green-600 { color: #16a34a !important; }
            .text-blue-600 { color: #2563eb !important; }
            .text-amber-600 { color: #d97706 !important; }
            .bg-gray-100 { 
              background-color: #f3f4f6 !important; 
              border: none !important;
              padding: 4px !important;
            }
            .bg-gray-700 { 
              background-color: #374151 !important; 
              border: none !important;
              padding: 4px !important;
            }
            .text-gray-800 { color: #1f2937 !important; }
            .text-gray-200 { color: #e5e7eb !important; }
            
            /* فليكس */
            .flex { display: flex !important; }
            .justify-center { justify-content: center !important; }
            .justify-between { justify-content: space-between !important; }
            .items-center { align-items: center !important; }
            .flex-col { flex-direction: column !important; }
            .flex-1 { flex: 1 !important; }
            .gap-1 { gap: 4px !important; }
            .gap-2 { gap: 8px !important; }
            
            /* خط عريض */
            .font-bold { font-weight: bold !important; }
            .font-mono { font-family: 'Tajawal', 'Arial', sans-serif !important; }
            
            /* المسافات بين العناصر */
            .space-y-1 > * + * { margin-top: 4px !important; }
            .space-y-2 > * + * { margin-top: 8px !important; }
            
            /* حدود مدورة - فقط إذا كان القالب يتطلبها */
            .rounded { 
              border-radius: 4px !important; 
              border: none !important;
            }
            
            /* كائن احتواء */
            .object-contain { object-fit: contain !important; }
            
            /* أنماط QR Code */
            .qr-code-container {
              width: 64px !important;
              height: 64px !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              margin: 0 auto 8px auto !important;
              border: none !important;
            }
            
            .qr-code-container svg {
              width: 60px !important;
              height: 60px !important;
              border: none !important;
            }

            /* نص QR Code */
            .qr-text {
              font-family: 'Tajawal', 'Cairo', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
              font-size: 10px !important;
              margin-top: 4px !important;
              margin-bottom: 8px !important;
              text-align: center !important;
              line-height: 1.2 !important;
            }
            
            /* إزالة جميع أنماط القوالب التي تضيف إطارات */
            ${settings?.receipt_template === 'modern' ? `
              .receipt-container {
                border-radius: 0 !important;
                box-shadow: none !important;
                border: none !important;
                background: ${settings?.background_color || '#ffffff'} !important;
              }
            ` : ''}
            
            ${settings?.receipt_template === 'minimal' ? `
              .receipt-container {
                border: none !important;
                background: ${settings?.background_color || '#ffffff'} !important;
              }
            ` : ''}
            
            /* أنماط الطباعة */
            @media print {
              * {
                border: none !important;
                box-shadow: none !important;
                outline: none !important;
              }
              
              body { 
                margin: 0 !important; 
                padding: 5px !important;
                font-size: ${settings?.font_size || 10}px !important;
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                background: white !important;
              }
              
              .receipt-container {
                width: 100% !important;
                max-width: ${settings ? `${settings.paper_width}mm` : '58mm'} !important;
                margin: 0 auto !important;
                box-shadow: none !important;
                border: none !important;
                background: white !important;
              }
              
              .store-logo {
                width: 32px !important;
                height: 32px !important;
                max-width: 32px !important;
                max-height: 32px !important;
                border: none !important;
              }
              
              /* QR Code في الطباعة */
              .qr-code-container {
                width: 48px !important;
                height: 48px !important;
                margin: 4px auto 6px auto !important;
                border: none !important;
              }
              
              .qr-code-container svg {
                width: 45px !important;
                height: 45px !important;
                border: none !important;
              }

              /* نص QR Code في الطباعة */
              .qr-text {
                font-family: 'Tajawal', 'Cairo', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
                font-size: 8px !important;
                margin-top: 3px !important;
                margin-bottom: 6px !important;
                text-align: center !important;
                line-height: 1.1 !important;
                page-break-inside: avoid !important;
              }
              
              /* إزالة جميع الخلفيات الملونة في الطباعة إلا إذا كانت مطلوبة */
              .bg-gray-100, .bg-gray-700 {
                background: transparent !important;
                border: none !important;
                padding: 4px !important;
              }
              
              @page {
                size: ${settings ? `${settings.paper_width}mm` : '58mm'} auto;
                margin: 2mm;
              }
            }
            
            /* تطبيق CSS مخصص إذا كان موجوداً - مع منع الإطارات */
            ${settings?.custom_css ? settings.custom_css.replace(/border[^;]*;/g, 'border: none !important;') : ''}
          </style>
        `;
        
        // إنشاء نسخة كاملة من محتوى الوصل
        const receiptContent = printRef.current.innerHTML;
        
        printWindow.document.write(`
          <!DOCTYPE html>
          <html lang="ar" dir="rtl">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>وصل رقم ${formatNumberNormal(orderId)}</title>
              ${printStyles}
            </head>
            <body>
              <div class="receipt-container">
                ${receiptContent}
              </div>
            </body>
          </html>
        `);
        
        printWindow.document.close();
        printWindow.focus();
        
        // انتظار قصير للتأكد من تحميل الأنماط والمحتوى
        setTimeout(() => {
          printWindow.print();
          
          // إغلاق النافذة بعد الطباعة إذا كان مفعلاً في الإعدادات
          if (settings?.auto_cut) {
            setTimeout(() => {
              printWindow.close();
            }, 100);
          }
        }, 1000); // زيادة الوقت لضمان تحميل كامل
      }
    }
  };

  // نسخ معلومات الوصل كنص
  const handleCopyAsText = async () => {
    if (!printRef.current) return;

    const receiptText = `
وصل رقم: ${formatNumberNormal(orderId)}
التاريخ: ${formatDateArabic(new Date())} ${formatTimeNormal(new Date())}
${employeeName ? `الموظف: ${employeeName}` : ''}
${customerName ? `العميل: ${customerName}` : ''}

المنتجات:
${items.map(item => `- ${item.product.name} × ${formatNumberNormal(item.quantity.toString())} = ${formatPriceWithSettings((item.variantPrice || item.wholesalePrice || item.product.price) * item.quantity)}`).join('\n')}

${services.length > 0 ? `الخدمات:\n${services.map(service => `- ${service.name} = ${formatPriceWithSettings(service.price)}`).join('\n')}\n` : ''}

المجموع الفرعي: ${formatPriceWithSettings(subtotal)}
${discountAmount > 0 ? `الخصم (${formatNumberNormal(discount.toString())}%): -${formatPriceWithSettings(discountAmount)}` : ''}
${tax > 0 ? `الضريبة: ${formatPriceWithSettings(tax)}` : ''}
المجموع الكلي: ${formatPriceWithSettings(total)}

${paymentMethod ? `طريقة الدفع: ${paymentMethod}` : ''}
    `.trim();

    try {
      await navigator.clipboard.writeText(receiptText);
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 2000);
    } catch (err) {
    }
  };

  // تحديد موضع رمز العملة - مع استخدام الأرقام العادية
  const formatPriceWithSettings = (price: number) => {
    if (!settings) return formatPrice(price);
    
    // استخدام الأرقام العادية دائماً (1,2,3 بدلاً من ١,٢,٣)
    const formattedPrice = price.toFixed(2);
    return settings.currency_position === 'before' 
      ? `${settings.currency_symbol} ${formattedPrice}`
      : `${formattedPrice} ${settings.currency_symbol}`;
  };

  // دالة لتنسيق التاريخ بالميلادي العربي مع الأرقام العادية
  const formatDateArabic = (date: Date) => {
    const arabicMonths = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    
    const day = date.getDate();
    const month = arabicMonths[date.getMonth()];
    const year = date.getFullYear();
    
    return `${day} ${month} ${year}`;
  };

  // دالة لتنسيق الوقت بالأرقام العادية
  const formatTimeNormal = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // دالة لتنسيق الأرقام العادية (تحويل الأرقام العربية إلى إنجليزية)
  const formatNumberNormal = (text: string) => {
    return text.replace(/[٠-٩]/g, (match) => {
      const arabicNumbers = '٠١٢٣٤٥٦٧٨٩';
      const englishNumbers = '0123456789';
      return englishNumbers[arabicNumbers.indexOf(match)];
    });
  };

  // تحديد محاذاة النص
  const getTextAlignment = (style: string) => {
    switch (style) {
      case 'left': return 'text-left';
      case 'right': return 'text-right';
      case 'centered': 
      default: return 'text-center';
    }
  };

  // أنماط القالب
  const getTemplateStyles = () => {
    if (!settings) return {};
    
    const baseStyles = {
      fontSize: `${settings.font_size}px`,
      lineHeight: settings.line_spacing,
      color: settings.text_color,
      backgroundColor: settings.background_color,
    };

    switch (settings.receipt_template) {
      case 'modern':
        return {
          ...baseStyles,
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        };
      case 'minimal':
        return {
          ...baseStyles,
          border: '1px solid #e5e7eb',
        };
      case 'custom':
        return {
          ...baseStyles,
          // يمكن إضافة CSS مخصص هنا من settings.custom_css
        };
      case 'classic':
      default:
        return baseStyles;
    }
  };

  if (!isOpen) return null;

  // معالج النقر خارج النافذة
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // التأكد من أن النقر كان على الخلفية وليس داخل النافذة
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // استخدام portal لضمان ظهور المودال في أعلى مستوى من DOM
  return createPortal(
    <>
      {/* CSS للمكون */}
      <div dangerouslySetInnerHTML={{ __html: componentStyles }} />
      
      <div 
        className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer hover:bg-black/65 dark:hover:bg-black/85 transition-colors duration-200" 
        style={{ 
          zIndex: 99999,
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        }}
        onClick={handleOverlayClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="receipt-title"
        aria-describedby="receipt-help"
        title="انقر هنا للإغلاق"
      >
        <div 
          className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-2xl rounded-xl max-w-md w-full mx-4 max-h-[95vh] overflow-hidden border border-white/20 dark:border-gray-700/50 cursor-default" 
          onClick={(e) => e.stopPropagation()}
        >
          {/* رأسية محسنة */}
          <div className="flex justify-between items-center p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800/80">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                <Receipt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 id="receipt-title" className="text-lg font-bold text-gray-900 dark:text-gray-100">طباعة الوصل</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">رقم الطلب: {formatNumberNormal(orderId)}</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="rounded-full w-8 h-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
            >
              <X className="h-4 w-4" />
          </Button>
        </div>

          {/* أزرار التحكم المحسنة */}
          <div className="p-4 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200/50 dark:border-gray-700/50">
            <div className="flex gap-2">
              <Button 
                onClick={handlePrint} 
                className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white"
                disabled={isLoading}
              >
                <Printer className="h-4 w-4 ml-2" />
                طباعة
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                className="border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
              >
                <Eye className="h-4 w-4 ml-2" />
                {isPreviewMode ? 'إخفاء' : 'معاينة'}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleCopyAsText}
                className="border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 relative"
              >
                <Copy className="h-4 w-4 ml-2" />
                نسخ
                {showCopySuccess && (
                  <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-600 dark:bg-green-500 text-white text-xs px-2 py-1 rounded shadow-lg">
                    تم النسخ!
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* محتوى الوصل */}
          <div className="overflow-auto max-h-[calc(95vh-180px)] p-6 bg-white dark:bg-gray-900">
        {/* محتوى الوصل للطباعة */}
        <div 
          ref={printRef}
            className={`receipt-content receipt-preview print-content transition-all duration-300 text-gray-900 dark:text-gray-100 ${
              isPreviewMode ? 'scale-90 opacity-75' : 'scale-100 opacity-100'
            }`}
          style={{
            width: settings ? `${settings.paper_width * 3.5}px` : '300px',
            margin: '0 auto',
            fontFamily: 'monospace',
            ...getTemplateStyles()
          }}
        >
          {/* رأسية الوصل */}
          <div className={`mb-4 ${settings ? getTextAlignment(settings.header_style) : 'text-center'}`}>
            {/* شعار المتجر */}
            {settings?.show_store_logo && settings.store_logo_url && (
              <div className="mb-3 flex justify-center">
                <img 
                  src={settings.store_logo_url} 
                  alt="شعار المتجر" 
                      className="store-logo"
                      style={{
                        width: '48px',
                        height: '48px',
                        objectFit: 'contain',
                        display: 'block',
                        margin: '0 auto'
                      }}
                />
              </div>
            )}

            {/* معلومات المتجر */}
            {settings?.show_store_info && (
              <div className="mb-3">
                <h2 
                  className="font-bold text-lg mb-1"
                  style={{ color: settings.primary_color }}
                >
                  {settings.store_name}
                </h2>
                {settings.store_phone && (
                  <p className="text-xs">{settings.store_phone}</p>
                )}
                {settings.store_email && (
                  <p className="text-xs">{settings.store_email}</p>
                )}
                {settings.store_address && (
                  <p className="text-xs">{settings.store_address}</p>
                )}
              </div>
            )}

            {/* رسالة الترحيب */}
            {settings?.welcome_message && (
              <p className="mb-2" style={{ color: settings.primary_color }}>
                {settings.welcome_message}
              </p>
            )}

            {/* نص الرأسية */}
            {settings?.receipt_header_text && (
              <p className="text-xs mb-2">
                {settings.receipt_header_text}
              </p>
            )}
          </div>

          {/* معلومات الطلب */}
          <div className="mb-4 border-t border-b border-dashed py-2">
            {/* التاريخ والوقت */}
            {settings?.show_date_time && (
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  التاريخ:
                </span>
                <span>
                      {formatDateArabic(new Date())} {formatTimeNormal(new Date())}
                </span>
              </div>
            )}

            {/* رقم الطلب */}
            <div className="flex justify-between text-xs mb-1">
              <span>رقم الطلب:</span>
                  <span className="font-mono">{formatNumberNormal(orderId)}</span>
            </div>

            {/* اسم الموظف */}
            {settings?.show_employee_name && employeeName && (
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  الموظف:
                </span>
                <span>{employeeName}</span>
              </div>
            )}

            {/* معلومات العميل */}
            {settings?.show_customer_info && customerName && (
              <div className="flex justify-between text-xs">
                <span>العميل:</span>
                <span>{customerName}</span>
              </div>
            )}
          </div>

          {/* عناصر الطلب */}
          {items.length > 0 && (
            <div className="mb-4">
              <h3 className="font-bold text-xs mb-2 border-b border-dashed pb-1">
                المنتجات
              </h3>
              
              {settings?.item_display_style === 'table' ? (
                // عرض في شكل جدول
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-dashed">
                      <th className="text-right py-1">المنتج</th>
                      <th className="text-center py-1">الكمية</th>
                      <th className={`py-1 ${settings.price_position === 'right' ? 'text-right' : 'text-left'}`}>
                        السعر
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index}>
                        <td className="text-right py-1">
                          {item.product.name}
                              {item.colorName && <span className="text-xs text-gray-500 dark:text-gray-400"> - {item.colorName}</span>}
                              {item.sizeName && <span className="text-xs text-gray-500 dark:text-gray-400"> - {item.sizeName}</span>}
                        </td>
                            <td className="text-center py-1">{formatNumberNormal(item.quantity.toString())}</td>
                        <td className={`py-1 ${settings.price_position === 'right' ? 'text-right' : 'text-left'}`}>
                          {formatPriceWithSettings((item.variantPrice || item.wholesalePrice || item.product.price) * item.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                // عرض في شكل قائمة
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <div className="flex-1">
                        <span className="text-xs">{item.product.name}</span>
                            {item.colorName && <span className="text-xs text-gray-500 dark:text-gray-400"> - {item.colorName}</span>}
                            {item.sizeName && <span className="text-xs text-gray-500 dark:text-gray-400"> - {item.sizeName}</span>}
                            <span className="text-xs text-muted-foreground mx-1">×{formatNumberNormal(item.quantity.toString())}</span>
                      </div>
                      <span className="text-xs font-mono">
                        {formatPriceWithSettings((item.variantPrice || item.wholesalePrice || item.product.price) * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* الخدمات */}
          {services.length > 0 && (
            <div className="mb-4">
              <h3 className="font-bold text-xs mb-2 border-b border-dashed pb-1">
                الخدمات
              </h3>
              <div className="space-y-2">
                {services.map((service, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div className="flex-1">
                      <span className="text-xs">{service.name}</span>
                      {service.public_tracking_code && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">كود: {service.public_tracking_code}</div>
                      )}
                    </div>
                    <span className="text-xs font-mono">
                      {formatPriceWithSettings(service.price)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* المجموع */}
          <div className="mb-4 border-t border-dashed pt-2">
            <div className="flex justify-between text-xs mb-1">
              <span>المجموع الفرعي:</span>
              <span className="font-mono">{formatPriceWithSettings(subtotal)}</span>
            </div>
            
            {/* عرض التخفيض إذا كان موجوداً */}
            {discountAmount > 0 && (
              <div className="flex justify-between text-xs mb-1">
                    <span>الخصم ({formatNumberNormal(discount.toString())}%):</span>
                <span className="font-mono text-red-600">- {formatPriceWithSettings(discountAmount)}</span>
              </div>
            )}
            
            {tax > 0 && (
              <div className="flex justify-between text-xs mb-1">
                <span>{settings?.tax_label || 'الضريبة'}:</span>
                <span className="font-mono">{formatPriceWithSettings(tax)}</span>
              </div>
            )}
            
            <div 
              className="flex justify-between text-sm font-bold border-t border-dashed pt-1"
              style={{ color: settings?.primary_color }}
            >
              <span>المجموع الكلي:</span>
              <span className="font-mono">{formatPriceWithSettings(total)}</span>
            </div>
            
            {/* معلومات الدفع الجزئي */}
            {isPartialPayment && (
              <div className="mt-2 border-t border-dashed pt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span>المبلغ المدفوع:</span>
                  <span className="font-mono text-green-600">{formatPriceWithSettings(amountPaid || 0)}</span>
                </div>
                
                {considerRemainingAsPartial ? (
                  <div className="flex justify-between text-xs mb-1">
                    <span>المبلغ المتبقي:</span>
                    <span className="font-mono text-amber-600">{formatPriceWithSettings(remainingAmount)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-xs mb-1">
                    <span>تخفيض إضافي:</span>
                    <span className="font-mono text-blue-600">{formatPriceWithSettings(remainingAmount)}</span>
                  </div>
                )}
                
                    <div className="text-xs text-center mt-1 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded">
                  {considerRemainingAsPartial ? (
                    <span>⚠️ دفعة جزئية - المبلغ المتبقي للعميل: {customerName || 'غير محدد'}</span>
                  ) : (
                    <span>✅ تخفيض على العميل - الطلب مكتمل</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* طريقة الدفع */}
          {paymentMethod && (
            <div className="mb-4 text-xs">
              <span>طريقة الدفع: {paymentMethod}</span>
            </div>
          )}

          {/* تذييل الوصل */}
          <div className={`${settings ? getTextAlignment(settings.footer_style) : 'text-center'}`}>
            {/* نص التذييل */}
            {settings?.receipt_footer_text && (
              <p className="text-xs mb-3">
                {settings.receipt_footer_text}
              </p>
            )}

            {/* رمز QR */}
                {settings?.show_qr_code && settings?.store_website && (
                  <div className="flex justify-center mb-4">
                    <div className="qr-code-container">
                      <QRCodeSVG 
                        value={settings.store_website}
                        size={60}
                        level="M"
                        includeMargin={false}
                        fgColor={settings?.text_color || '#000000'}
                        bgColor={settings?.background_color || '#ffffff'}
                      />
                    </div>
                  </div>
                )}
                {/* عرض رمز QR فارغ إذا لم يكن هناك موقع */}
                {settings?.show_qr_code && !settings?.store_website && (
                  <div className="flex justify-center mb-3">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-12 h-12 border-2 border-dashed border-gray-400 dark:border-gray-500 flex items-center justify-center">
                        <QrCode className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">QR Code</span>
                </div>
              </div>
            )}

            {/* معلومات إضافية */}
            {(settings?.business_license || settings?.tax_number) && (
              <div className="text-xs space-y-1 pt-2 border-t border-dashed">
                {settings.business_license && (
                  <p>س.ت: {settings.business_license}</p>
                )}
                {settings.tax_number && (
                  <p>ر.ض: {settings.tax_number}</p>
                )}
              </div>
            )}
          </div>

          {/* خط النهاية */}
              <div className="mt-4 pt-2 border-t-2 border-dashed border-gray-300 dark:border-gray-600 text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">
              ═══════════════════
            </div>
          </div>
        </div>
        </div>
        
          {/* حالة التحميل */}
        {isLoading && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-t border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs text-blue-600 dark:text-blue-400">
            جاري تحميل إعدادات الطباعة...
          </p>
              </div>
            </div>
          )}

          {/* شريط المساعدة */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200/50 dark:border-gray-700/50 text-center">
            <p id="receipt-help" className="text-xs text-gray-500 dark:text-gray-400">
              اضغط <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs font-mono">Esc</kbd> أو انقر خارج النافذة للإغلاق
            </p>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default PrintReceipt;
