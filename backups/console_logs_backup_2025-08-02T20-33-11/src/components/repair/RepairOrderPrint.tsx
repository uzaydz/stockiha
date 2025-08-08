import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Check, Loader2 } from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { useTenant } from '@/context/TenantContext';
import { RepairOrder } from '@/types/repair';
import RepairReceiptPrint from './RepairReceiptPrint';
import { supabase } from '@/lib/supabase';
import { buildStoreUrl, buildTrackingUrl } from '@/lib/utils/store-url';
import '@/styles/repair-print.css';

interface RepairOrderPrintProps {
  order: RepairOrder;
  queuePosition?: number;
}

// هوك آمن للوصول إلى POSData مع fallback
const useSafePOSData = () => {
  try {
    const { usePOSData } = require('@/context/POSDataContext');
    return usePOSData();
  } catch (error) {
    // إذا لم يكن POSDataProvider متاحاً، أرجع قيم افتراضية
    return {
      posSettings: null,
      refreshPOSSettings: () => {}
    };
  }
};

const RepairOrderPrint: React.FC<RepairOrderPrintProps> = ({ order, queuePosition }) => {
  const { organizationId } = useUser();
  const { currentOrganization } = useTenant();
  const { posSettings, refreshPOSSettings } = useSafePOSData();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPrintSuccess, setIsPrintSuccess] = useState(false);
  const [fallbackPOSSettings, setFallbackPOSSettings] = useState<any>(null);
  const [calculatedQueuePosition, setCalculatedQueuePosition] = useState<number>(queuePosition || 0);

  // جلب إعدادات نقطة البيع من قاعدة البيانات كبديل
  useEffect(() => {
    const fetchPOSSettings = async () => {
      if (!organizationId) return;
      
      try {
        
        const { data, error } = await supabase
          .from('pos_settings')
          .select('*')
          .eq('organization_id', organizationId)
          .single();

        if (error) {
        } else {
          setFallbackPOSSettings(data);
        }
      } catch (error) {
      }
    };

    // جلب الإعدادات إذا لم تكن متاحة من Context
    if (!posSettings && organizationId) {
      fetchPOSSettings();
    }
  }, [organizationId, posSettings]);

  // تحديث إعدادات نقطة البيع إذا لم تكن موجودة (فقط إذا كان POSDataProvider متاحاً)
  useEffect(() => {
    if (!posSettings && organizationId && refreshPOSSettings && typeof refreshPOSSettings === 'function') {
      refreshPOSSettings();
    }
  }, [posSettings, organizationId, refreshPOSSettings]);

  // حساب ترتيب الطلبية في الطابور
  useEffect(() => {
    const calculateQueuePosition = async () => {
      
      if (!organizationId || !order) {
        return;
      }

      try {
        // التحقق من أن الطلبية مؤهلة لتكون في الطابور
        const activeStatuses = ['قيد الانتظار', 'جاري التصليح'];
        
        if (!activeStatuses.includes(order.status)) {
          setCalculatedQueuePosition(0);
          return;
        }

        // جلب جميع الطلبات في المؤسسة (بغض النظر عن الحالة) مع تواريخها للفحص
        const { data: allOrders, error: allError } = await supabase
          .from('repair_orders')
          .select('id, created_at, order_number, status')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: true });

        if (allError) {
          setCalculatedQueuePosition(queuePosition || 1);
          return;
        }

        // العثور على ترتيب الطلبية الحالية في القائمة الإجمالية
        const currentOrderIndex = allOrders?.findIndex(o => o.id === order.id);
        const position = currentOrderIndex !== undefined && currentOrderIndex >= 0 ? currentOrderIndex + 1 : 1;

        setCalculatedQueuePosition(position);
      } catch (error) {
        setCalculatedQueuePosition(queuePosition || 1);
      }
    };

    calculateQueuePosition();
  }, [order, organizationId, queuePosition]);

  // إنشاء رابط التتبع باستخدام الدالة المشتركة
  const trackingCode = order.repair_tracking_code || order.order_number || order.id;
  const trackingUrl = buildTrackingUrl(trackingCode, currentOrganization);

  // الحصول على معلومات المتجر من إعدادات نقطة البيع أولاً، ثم المنظمة كبديل
  const getStoreInfo = () => {
    // استخدام إعدادات نقطة البيع من Context أولاً، ثم من قاعدة البيانات، ثم المنظمة
    const activePOSSettings = posSettings || fallbackPOSSettings;
    
    // تسجيل تفصيلي للبيانات الأولية

    const storeInfo = {
      storeName: activePOSSettings?.store_name || currentOrganization?.name || 'متجرك للإلكترونيات',
      storePhone: activePOSSettings?.store_phone || (currentOrganization?.settings?.phone as string) || '',
      storeAddress: activePOSSettings?.store_address || (currentOrganization?.settings?.address as string) || '',
      storeLogo: activePOSSettings?.store_logo_url || currentOrganization?.logo_url || ''
    };

    return storeInfo;
  };

  const { storeName, storePhone, storeAddress, storeLogo } = getStoreInfo();

  // وظيفة الطباعة المباشرة المحسنة
  const handlePrintClick = () => {
    if (isPrinting) return;
    
    try {
      setIsPrinting(true);
      
      // جلب المحتوى المراد طباعته
      const contentToPrint = receiptRef.current;
      if (!contentToPrint) {
        setIsPrinting(false);
        return;
      }
      
      // إنشاء نافذة طباعة جديدة
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        setIsPrinting(false);
        return;
      }
      
      // CSS محسن للطباعة مع إصلاح مشكلة الوصل الأبيض والهوامش
      const printCSS = `
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@200;300;400;500;600;700;800;900&display=swap');
        
        /* إعدادات الصفحة المحسنة للهوامش */
        @page {
          size: auto;
          margin: 5mm 3mm;
          padding: 0;
        }
        
        /* إعدادات الجسم مع إصلاح مشكلة الوصل الأبيض */
        body {
          margin: 0 !important;
          padding: 0 !important;
          font-family: 'Tajawal', 'Arial', sans-serif !important;
          background: white !important;
          color: black !important;
          direction: rtl !important;
          overflow: visible !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        
        /* إعدادات الوصل المحسنة */
        .repair-receipt {
          font-family: 'Tajawal', 'Arial', sans-serif !important;
          font-size: 13px !important;
          line-height: 1.4 !important;
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 5mm !important;
          background: white !important;
          color: black !important;
          box-sizing: border-box !important;
          overflow: visible !important;
          border: none !important;
          box-shadow: none !important;
          direction: rtl !important;
          text-align: center !important;
        }
        
        /* ضمان ظهور جميع العناصر */
        .repair-receipt * {
          background: transparent !important;
          color: black !important;
          border-color: black !important;
          box-sizing: border-box !important;
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        
        /* تحسين الصفوف والأقسام */
        .receipt-row {
          display: flex !important;
          justify-content: space-between !important;
          align-items: flex-start !important;
          margin: 2px 0 !important;
          width: 100% !important;
          flex-wrap: wrap !important;
        }
        
        .receipt-section {
          margin-bottom: 6px !important;
          padding: 2px 0 !important;
          width: 100% !important;
        }
        
        /* تحسين الخطوط الفاصلة */
        .dashed-line {
          border-top: 1px dashed black !important;
          margin: 4px 0 !important;
          width: 100% !important;
        }
        
        .solid-line {
          border-top: 1px solid black !important;
          margin: 3px 0 !important;
          width: 100% !important;
        }
        
        /* تحسين QR codes والصور */
        svg {
          display: block !important;
          margin: 0 auto !important;
          background: white !important;
          border: 1px solid black !important;
        }
        
        img {
          max-width: 100% !important;
          height: auto !important;
          object-fit: contain !important;
          display: block !important;
          margin: 0 auto !important;
        }
        
        /* إعدادات الطباعة المتقدمة */
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
          }
          
          .repair-receipt {
            position: static !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 5mm !important;
            background: white !important;
            color: black !important;
            border: none !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
          }
          
          .repair-receipt * {
            background: transparent !important;
            color: black !important;
            visibility: visible !important;
            opacity: 1 !important;
          }
          
          /* إخفاء العناصر غير المطلوبة */
          .no-print, .print-hidden {
            display: none !important;
            visibility: hidden !important;
          }
        }
        
        /* تحسينات للطابعات الحرارية الصغيرة */
        @media print and (max-width: 80mm) {
          .repair-receipt {
            width: 76mm !important;
            max-width: 76mm !important;
            font-size: 12px !important;
            line-height: 1.3 !important;
            padding: 3mm !important;
          }
        }
        
        /* تحسينات للطابعات المتوسطة */
        @media print and (min-width: 80mm) and (max-width: 150mm) {
          .repair-receipt {
            width: 100% !important;
            max-width: 140mm !important;
            font-size: 13px !important;
            line-height: 1.4 !important;
            padding: 5mm !important;
          }
        }
        
        /* تحسينات للطابعات الكبيرة */
        @media print and (min-width: 150mm) {
          .repair-receipt {
            width: 100% !important;
            max-width: 210mm !important;
            font-size: 14px !important;
            line-height: 1.4 !important;
            padding: 8mm !important;
          }
        }
        
        /* تحسينات للطباعة الملونة */
        @media print and (color) {
          .repair-receipt {
            background: white !important;
            color: black !important;
          }
        }
        
        /* تحسينات للطباعة أحادية اللون */
        @media print and (monochrome) {
          .repair-receipt {
            background: white !important;
            color: black !important;
          }
          
          .repair-receipt * {
            background: transparent !important;
            color: black !important;
            border-color: black !important;
          }
        }
        
        /* تحسينات للطباعة عالية الدقة */
        @media print and (min-resolution: 300dpi) {
          .repair-receipt {
            font-size: 12px !important;
            line-height: 1.3 !important;
          }
        }
        
        /* تحسينات للطباعة منخفضة الدقة */
        @media print and (max-resolution: 150dpi) {
          .repair-receipt {
            font-size: 15px !important;
            line-height: 1.5 !important;
            font-weight: 500 !important;
          }
        }
        
        /* إزالة أي تأثيرات بصرية قد تتداخل */
        * {
          text-shadow: none !important;
          filter: none !important;
          transform: none !important;
          transition: none !important;
          animation: none !important;
        }
        
        /* تحسين العناوين والنصوص المهمة */
        h1, h2, h3, h4, h5, h6 {
          font-weight: bold !important;
          color: black !important;
          margin: 0.5rem 0 !important;
        }
        
        /* تحسين المحاذاة */
        .text-center {
          text-align: center !important;
        }
        
        .text-right {
          text-align: right !important;
        }
        
        .text-left {
          text-align: left !important;
        }
        
        /* تحسين الأسعار والأرقام */
        .price, .amount, .total {
          font-weight: bold !important;
          color: black !important;
        }
        
        /* إعدادات خاصة للنصوص العربية */
        [dir="rtl"], .rtl {
          direction: rtl !important;
          text-align: right !important;
        }
        
        /* تحسين المسافات */
        .repair-receipt > div,
        .repair-receipt > section {
          margin-bottom: 0.5rem !important;
        }
        
        /* إعدادات نهائية للتأكد من الوضوح */
        @media print {
          html {
            background: white !important;
            color: black !important;
          }
          
          body {
            background: white !important;
            color: black !important;
          }
          
          .repair-receipt {
            background: white !important;
            color: black !important;
          }
          
          .repair-receipt * {
            color: black !important;
            background: transparent !important;
          }
        }
      `;
      
      // إنشاء محتوى HTML للنافذة الجديدة مع تحسينات أفضل
      printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>وصل تصليح - ${order.customer_name}</title>
            <style>${printCSS}</style>
          </head>
          <body>
            ${contentToPrint.innerHTML}
          </body>
        </html>
      `);
      
      // إغلاق الكتابة وانتظار التحميل
      printWindow.document.close();
      
      // طباعة النافذة بعد تحميل المحتوى مع وقت انتظار أطول للخطوط
      printWindow.onload = () => {
        // انتظار إضافي لتحميل الخطوط والصور
        setTimeout(() => {
          printWindow.print();
          
          // التعامل مع أحداث ما بعد الطباعة
          const handleAfterPrint = () => {
            printWindow.close();
            setIsPrinting(false);
            setIsPrintSuccess(true);
            setTimeout(() => setIsPrintSuccess(false), 2000);
          };
          
          // استخدام onafterprint إذا كان متاحاً، وإلا استخدام timeout
          if (printWindow.onafterprint !== undefined) {
            printWindow.onafterprint = handleAfterPrint;
          } else {
            setTimeout(handleAfterPrint, 2000);
          }
        }, 1000); // زيادة وقت الانتظار لضمان تحميل الخطوط
      };
      
      // التعامل مع خطأ التحميل
      printWindow.onerror = () => {
        printWindow.close();
        setIsPrinting(false);
      };
      
    } catch (error) {
      setIsPrinting(false);
    }
  };

  return (
    <div>
      {/* زر الطباعة */}
      <Button
        variant="outline"
        className="gap-1"
        onClick={handlePrintClick}
        disabled={isPrinting}
      >
        {isPrinting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isPrintSuccess ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <Printer className="h-4 w-4" />
        )}
        {isPrinting ? 'جارٍ الطباعة...' : isPrintSuccess ? 'تمت الطباعة' : 'طباعة وصل'}
      </Button>

      {/* مكون الوصل المخفي للطباعة */}
      <div className="hidden">
        <div ref={receiptRef}>
          <RepairReceiptPrint
            order={order}
            storeName={storeName}
            storePhone={storePhone}
            storeAddress={storeAddress}
            storeLogo={storeLogo}
            trackingUrl={trackingUrl}
            queuePosition={calculatedQueuePosition}
          />
        </div>
      </div>
    </div>
  );
};

export default RepairOrderPrint;
