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
import { useCompletePOSData } from '@/hooks/useCompletePOSData';
import '@/styles/pos-print.css';

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

interface SelectedService extends Omit<Service, 'description'> {
  scheduledDate?: Date;
  notes?: string;
  customerId?: string;
  public_tracking_code?: string;
  // إضافة خصائص الاشتراكات
  isSubscription?: boolean;
  duration?: string;
  description?: string;
  subscriptionDetails?: {
    duration?: string;
    selectedPricing?: any;
  };
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
  subscriptionAccountInfo?: {
    username?: string;
    email?: string;
    password?: string;
    notes?: string;
  };
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
  subscriptionAccountInfo,
  isOpen,
  onClose
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const { currentOrganization } = useTenant();
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  
  // استخدام useCompletePOSData للحصول على إعدادات POS (تجنب الاستدعاءات المكررة)
  const { posData, isLoading, error } = useCompletePOSData();
  
  // استخراج إعدادات POS من البيانات المحسنة
  const settings = posData?.pos_settings;
  
  // إعدادات افتراضية إذا لم تكن موجودة
  const defaultPOSSettings = {
    receipt_header: currentOrganization?.name || 'مؤسستك',
    receipt_footer: 'شكراً لزيارتكم',
    show_employee_name: true,
    show_order_id: true,
    auto_print: false,
    print_copies: 1
  };
  
  const finalSettings = settings || defaultPOSSettings;
  
  // استخدام الإعدادات المدمجة

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
        
        // CSS محسن للطباعة مع إصلاح مشكلة الوصل الأبيض والهوامش
        const printStyles = `
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@200;300;400;500;600;700;800;900&display=swap');
            
            /* إعادة تعيين مع دعم أفضل للطباعة */
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
              border: none;
              outline: none;
              box-shadow: none;
            }
            
            /* إعدادات الصفحة للطباعة - تحسين للهوامش */
            @page {
              size: auto;
              margin: 5mm 3mm;
              padding: 0;
            }
            
            /* أنماط الجسم المحسنة - إصلاح مشكلة الوصل الأبيض */
            body { 
              margin: 0 !important;
              padding: 0 !important;
              font-family: 'Tajawal', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
              font-size: 14px !important;
              line-height: 1.4 !important;
              color: #000000 !important;
              background: #ffffff !important;
              direction: rtl !important;
              text-align: right !important;
              min-height: 100vh !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
              overflow: visible !important;
            }
            
            /* حاوي الوصل المحسن - إصلاح مشكلة العرض والهوامش */
            .receipt-container {
              width: 100% !important;
              max-width: none !important;
              margin: 0 !important;
              background: #ffffff !important;
              color: #000000 !important;
              font-family: 'Tajawal', sans-serif !important;
              position: relative !important;
              min-height: auto !important;
              padding: 5mm !important;
              border: none !important;
              border-radius: 0 !important;
              box-shadow: none !important;
              overflow: visible !important;
            }
            
            /* تحسينات الطباعة المتقدمة - ضمان ظهور المحتوى */
            @media print {
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              
              body {
                background: white !important;
                color: black !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                height: auto !important;
                overflow: visible !important;
              }
              
              .receipt-container {
                position: static !important;
                width: 100% !important;
                max-width: none !important;
                margin: 0 !important;
                padding: 3mm !important;
                background: white !important;
                color: black !important;
                border: none !important;
                box-shadow: none !important;
                overflow: visible !important;
                page-break-inside: avoid !important;
              }
              
              /* إخفاء العناصر غير المرغوب فيها */
              .no-print {
                display: none !important;
                visibility: hidden !important;
              }
              
              /* ضمان ظهور النصوص والعناصر */
              .receipt-container * {
                background: transparent !important;
                color: black !important;
                border-color: black !important;
                visibility: visible !important;
                opacity: 1 !important;
              }
              
              /* تحسين عرض الجداول والصفوف */
              .receipt-row, .receipt-item {
                display: flex !important;
                width: 100% !important;
                margin: 2px 0 !important;
                padding: 1px 0 !important;
              }
              
              /* تحسين الخطوط */
              h1, h2, h3, h4, h5, h6 {
                font-weight: bold !important;
                color: black !important;
              }
              
              /* تحسين الحدود والخطوط الفاصلة */
              .dashed-line, .solid-line, hr {
                border-top: 1px solid black !important;
                width: 100% !important;
                margin: 3px 0 !important;
              }
              
              /* تحسين الصور والشعارات */
              img {
                max-width: 100% !important;
                height: auto !important;
                object-fit: contain !important;
                display: block !important;
                margin: 0 auto !important;
              }
              
              /* تحسين QR codes */
              svg {
                display: block !important;
                margin: 0 auto !important;
                background: white !important;
                border: 1px solid black !important;
              }
            }
            
            /* تحسينات خاصة للطابعات الحرارية */
            @media print and (max-width: 80mm) {
              .receipt-container {
                width: 76mm !important;
                max-width: 76mm !important;
                font-size: 12px !important;
                line-height: 1.3 !important;
                padding: 2mm !important;
              }
            }
            
            /* تحسينات للطابعات العادية */
            @media print and (min-width: 80mm) {
              .receipt-container {
                width: 100% !important;
                max-width: 210mm !important;
                font-size: 14px !important;
                line-height: 1.4 !important;
                padding: 5mm !important;
              }
            }
            
            /* إزالة الهوامش الإضافية */
            .receipt-container > * {
              margin-left: 0 !important;
              margin-right: 0 !important;
            }
            
            /* تحسين محاذاة النص */
            .text-center {
              text-align: center !important;
            }
            
            .text-right {
              text-align: right !important;
            }
            
            .text-left {
              text-align: left !important;
            }
            
            /* إعدادات الألوان الثابتة */
            .receipt-container,
            .receipt-container * {
              background: white !important;
              color: black !important;
            }
            
            /* تجنب كسر الصفحات داخل العناصر المهمة */
            .receipt-header,
            .receipt-items,
            .receipt-footer {
              page-break-inside: avoid !important;
            }
            
            /* إعدادات خاصة لضمان عدم قطع المحتوى */
            .receipt-container {
              orphans: 2 !important;
              widows: 2 !important;
            }
            
            /* إزالة أي تأثيرات بصرية قد تتداخل مع الطباعة */
            * {
              text-shadow: none !important;
              filter: none !important;
              transform: none !important;
              transition: none !important;
              animation: none !important;
            }
            
            /* إعدادات الطباعة المحددة حسب نوع الطابعة */
            @media print and (color) {
              .receipt-container {
                background: white !important;
                color: black !important;
              }
            }
            
            @media print and (monochrome) {
              .receipt-container {
                background: white !important;
                color: black !important;
              }
              
              .receipt-container * {
                background: white !important;
                color: black !important;
                border-color: black !important;
              }
            }
            
            /* تحسينات للطباعة عالية الدقة */
            @media print and (min-resolution: 300dpi) {
              .receipt-container {
                font-size: 13px !important;
                line-height: 1.3 !important;
              }
            }
            
            /* تحسينات للطباعة منخفضة الدقة */
            @media print and (max-resolution: 150dpi) {
              .receipt-container {
                font-size: 15px !important;
                line-height: 1.5 !important;
                font-weight: 500 !important;
              }
            }
            
            /* إعدادات خاصة للطابعات المحمولة */
            @media print and (max-device-width: 480px) {
              .receipt-container {
                width: 100% !important;
                max-width: none !important;
                padding: 3mm !important;
                font-size: 13px !important;
              }
            }
            
            /* تحسين عرض العناصر المرنة */
            .flex, .d-flex {
              display: flex !important;
            }
            
            .justify-content-between {
              justify-content: space-between !important;
            }
            
            .align-items-center {
              align-items: center !important;
            }
            
            /* إعدادات خاصة للعناصر المخفية عند الطباعة */
            .print-hidden,
            .d-print-none {
              display: none !important;
              visibility: hidden !important;
            }
            
            /* إعدادات خاصة للعناصر المرئية فقط عند الطباعة */
            .print-only,
            .d-print-block {
              display: block !important;
              visibility: visible !important;
            }
            
            /* تأكيد أن المحتوى سيظهر بوضوح */
            .receipt-content,
            .receipt-preview,
            .print-content {
              background: white !important;
              color: black !important;
              visibility: visible !important;
              opacity: 1 !important;
              display: block !important;
            }
            
            /* إزالة أي تنسيقات قد تخفي المحتوى */
            .receipt-container .hidden,
            .receipt-container .invisible {
              display: block !important;
              visibility: visible !important;
              opacity: 1 !important;
            }
            
            /* تأكيد ظهور الخطوط العربية */
            * {
              font-family: 'Tajawal', 'Arial', 'Helvetica', sans-serif !important;
            }
            
            /* إعدادات خاصة للنصوص العربية */
            [dir="rtl"], .rtl {
              direction: rtl !important;
              text-align: right !important;
            }
            
            /* تحسين المسافات والهوامش */
            .mb-1, .mb-2, .mb-3, .mb-4, .mb-5 {
              margin-bottom: 0.5rem !important;
            }
            
            .mt-1, .mt-2, .mt-3, .mt-4, .mt-5 {
              margin-top: 0.5rem !important;
            }
            
            .p-1, .p-2, .p-3, .p-4, .p-5 {
              padding: 0.25rem !important;
            }
            
            /* إزالة الحدود الخارجية التي قد تؤثر على التخطيط */
            .border, .border-top, .border-bottom, .border-left, .border-right {
              border: 1px solid black !important;
            }
            
            /* تحسين عرض الأسعار والأرقام */
            .price, .amount, .total {
              font-weight: bold !important;
              color: black !important;
            }
            
            /* إعدادات خاصة لضمان الوضوح التام */
            @media print {
              html {
                background: white !important;
                color: black !important;
              }
              
              body {
                background: white !important;
                color: black !important;
                font-size: 14px !important;
              }
              
              .receipt-container {
                background: white !important;
                color: black !important;
                border: none !important;
                box-shadow: none !important;
                margin: 0 !important;
                padding: 5mm !important;
                width: 100% !important;
                max-width: none !important;
              }
              
              .receipt-container * {
                background: transparent !important;
                color: black !important;
                visibility: visible !important;
                opacity: 1 !important;
              }
            }
            
            /* إعدادات نهائية لضمان عدم وجود مشاكل في العرض */
            .receipt-container {
              overflow: visible !important;
              height: auto !important;
              min-height: auto !important;
              max-height: none !important;
            }
            
            /* تحسين التباعد بين العناصر */
            .receipt-container > div,
            .receipt-container > section,
            .receipt-container > article {
              margin-bottom: 0.5rem !important;
            }
            
            /* إعدادات خاصة للجداول إذا وجدت */
            table {
              width: 100% !important;
              border-collapse: collapse !important;
              margin-bottom: 1rem !important;
            }
            
            th, td {
              padding: 0.25rem !important;
              border: 1px solid black !important;
              text-align: right !important;
            }
            
            /* إعدادات خاصة للقوائم */
            ul, ol {
              margin: 0.5rem 0 !important;
              padding-right: 1rem !important;
            }
            
            li {
              margin-bottom: 0.25rem !important;
            }
            
            /* تحسين عرض التواريخ والأوقات */
            .date, .time, .datetime {
              font-weight: normal !important;
              color: black !important;
            }
            
            /* إعدادات خاصة للعناوين */
            .title, .header, .heading {
              font-weight: bold !important;
              text-align: center !important;
              margin-bottom: 1rem !important;
            }
            
            /* إعدادات خاصة للمعلومات المهمة */
            .important, .highlight, .emphasis {
              font-weight: bold !important;
              color: black !important;
            }
            
            /* إعدادات أخيرة للتأكد من الوضوح */
            @media print {
              * {
                color: black !important;
                background: transparent !important;
              }
              
              body {
                background: white !important;
              }
              
              .receipt-container {
                background: white !important;
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
        
        // انتظار تحميل الخطوط والأنماط قبل الطباعة
        setTimeout(() => {
          // التأكد من تحميل الخطوط
          printWindow.document.fonts?.ready?.then(() => {
            printWindow.print();
            
            // إغلاق النافذة بعد الطباعة
            if (settings?.auto_cut) {
              setTimeout(() => {
                printWindow.close();
              }, 200);
            }
          }).catch(() => {
            // في حالة عدم دعم fonts API، نطبع مباشرة
            printWindow.print();
            if (settings?.auto_cut) {
              setTimeout(() => printWindow.close(), 200);
            }
          });
        }, 1500); // وقت كافي لتحميل الخطوط والأنماط
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

${services.length > 0 ? `الخدمات:\n${services.map(service => `- ${service.name} = ${formatPriceWithSettings(service.price)}`).join('\n')}\n` : ''}${subscriptionAccountInfo && Object.values(subscriptionAccountInfo).some(val => val) ? `\n🔐 معلومات حساب الاشتراك:\n${subscriptionAccountInfo.username ? `اسم المستخدم: ${subscriptionAccountInfo.username}\n` : ''}${subscriptionAccountInfo.email ? `البريد الإلكتروني: ${subscriptionAccountInfo.email}\n` : ''}${subscriptionAccountInfo.password ? `كلمة المرور: ${subscriptionAccountInfo.password}\n` : ''}${subscriptionAccountInfo.notes ? `ملاحظات: ${subscriptionAccountInfo.notes}\n` : ''}\n` : ''}

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

          {/* الخدمات والاشتراكات */}
          {services.length > 0 && (
            <div className="mb-4">
              {/* فصل الخدمات العادية عن الاشتراكات */}
              {(() => {
                const regularServices = services.filter(service => !service.isSubscription);
                const subscriptions = services.filter(service => service.isSubscription);
                
                return (
                  <>
                    {/* الخدمات العادية */}
                    {regularServices.length > 0 && (
                      <div className="mb-3">
                        <h3 className="font-bold text-xs mb-2 border-b border-dashed pb-1">
                          الخدمات
                        </h3>
                        <div className="space-y-2">
                          {regularServices.map((service, index) => (
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
                    
                    {/* الاشتراكات */}
                    {subscriptions.length > 0 && (
                      <div className="mb-3">
                        <h3 className="font-bold text-xs mb-2 border-b border-dashed pb-1">
                          🔐 الاشتراكات
                        </h3>
                        <div className="space-y-2">
                          {subscriptions.map((subscription, index) => (
                            <div key={index} className="flex justify-between items-start">
                              <div className="flex-1">
                                <span className="text-xs font-medium">{subscription.name}</span>
                                {subscription.duration && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400">المدة: {subscription.duration}</div>
                                )}
                                {subscription.public_tracking_code && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400">كود: {subscription.public_tracking_code}</div>
                                )}
                                {subscription.description && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subscription.description}</div>
                                )}
                              </div>
                              <span className="text-xs font-mono">
                                {formatPriceWithSettings(subscription.price)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* معلومات حساب الاشتراك */}
          {subscriptionAccountInfo && Object.values(subscriptionAccountInfo).some(val => val) && (
            <div className="mb-4">
              <h3 className="font-bold text-xs mb-2 border-b border-dashed pb-1">
                🔐 معلومات حساب الاشتراك
              </h3>
              
              {settings?.item_display_style === 'table' ? (
                // عرض في شكل جدول متناسق مع المنتجات
                <table className="w-full text-xs">
                  <tbody>
                    {subscriptionAccountInfo.username && (
                      <tr>
                        <td className="text-right py-1">اسم المستخدم:</td>
                        <td className={`py-1 font-mono ${settings.price_position === 'right' ? 'text-right' : 'text-left'}`}>
                          {subscriptionAccountInfo.username}
                        </td>
                      </tr>
                    )}
                    {subscriptionAccountInfo.email && (
                      <tr>
                        <td className="text-right py-1">البريد الإلكتروني:</td>
                        <td className={`py-1 font-mono ${settings.price_position === 'right' ? 'text-right' : 'text-left'}`}>
                          {subscriptionAccountInfo.email}
                        </td>
                      </tr>
                    )}
                    {subscriptionAccountInfo.password && (
                      <tr>
                        <td className="text-right py-1">كلمة المرور:</td>
                        <td className={`py-1 font-mono ${settings.price_position === 'right' ? 'text-right' : 'text-left'}`}>
                          {subscriptionAccountInfo.password}
                        </td>
                      </tr>
                    )}
                    {subscriptionAccountInfo.notes && (
                      <tr>
                        <td className="text-right py-1">ملاحظات:</td>
                        <td className={`py-1 ${settings.price_position === 'right' ? 'text-right' : 'text-left'}`}>
                          {subscriptionAccountInfo.notes}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                // عرض في شكل قائمة متناسق مع المنتجات
                <div className="space-y-1">
                  {subscriptionAccountInfo.username && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs">اسم المستخدم:</span>
                      <span className="text-xs font-mono">{subscriptionAccountInfo.username}</span>
                    </div>
                  )}
                  {subscriptionAccountInfo.email && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs">البريد الإلكتروني:</span>
                      <span className="text-xs font-mono">{subscriptionAccountInfo.email}</span>
                    </div>
                  )}
                  {subscriptionAccountInfo.password && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs">كلمة المرور:</span>
                      <span className="text-xs font-mono">{subscriptionAccountInfo.password}</span>
                    </div>
                  )}
                  {subscriptionAccountInfo.notes && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs">ملاحظات:</span>
                      <span className="text-xs">{subscriptionAccountInfo.notes}</span>
                    </div>
                  )}
                </div>
              )}
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

          {/* نص الضمان والشروط */}
          <div className="mt-4 pt-3 border-t border-dashed border-gray-300 dark:border-gray-600">
            <div className="text-center mb-2">
              <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300">ضمان المبيعات</h4>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1.5 text-justify leading-relaxed">
              <p>
                يمنح المتجر ضمانًا لمدة شهر ضد مشاكل الحرارة أو التوقف المفاجئ، ولا يشمل الأضرار الناتجة عن سوء الاستخدام مثل: السقوط، تسرب السوائل، أو انقطاع الكهرباء.
              </p>
              <p>
                يحق للعميل إرجاع المنتج خلال 24 ساعة من تاريخ الشراء بشرط أن يكون في نفس الحالة الأصلية مع كامل الإكسسوارات والتغليف.
              </p>
            </div>
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

// Explicit named export to prevent minification issues
export { PrintReceipt };
export default PrintReceipt;
