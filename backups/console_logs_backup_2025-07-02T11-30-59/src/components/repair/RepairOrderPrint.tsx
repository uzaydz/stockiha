import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Check, Loader2 } from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { useTenant } from '@/context/TenantContext';
import { RepairOrder } from '@/types/repair';
import RepairReceiptPrint from './RepairReceiptPrint';
import { supabase } from '@/lib/supabase';
import { buildStoreUrl, buildTrackingUrl } from '@/lib/utils/store-url';

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
      
      // استنساخ تنسيقات CSS للنافذة الجديدة مع التركيز على تنسيقات الطباعة
      const printCSS = `
        @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Noto+Sans+Arabic:wght@300;400;500;600;700&display=swap');
        
        @page {
          size: 80mm auto;
          margin: 0;
        }
        
        body {
          margin: 0;
          padding: 0;
          font-family: 'Amiri', 'Noto Sans Arabic', 'Cairo', 'Tahoma', sans-serif;
          background: white;
          color: black;
        }
        
        .repair-receipt {
          font-family: 'Amiri', 'Noto Sans Arabic', 'Cairo', 'Tahoma', sans-serif !important;
          font-size: 12px !important;
          line-height: 1.3 !important;
          width: 78mm !important;
          max-width: 78mm !important;
          min-width: 78mm !important;
          margin: 0 !important;
          padding: 4mm !important;
          background: white !important;
          color: black !important;
          box-sizing: border-box !important;
          overflow: visible !important;
        }
        
        .repair-receipt * {
          background: white !important;
          color: black !important;
          border-color: black !important;
          max-width: 70mm !important;
          box-sizing: border-box !important;
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
        }
        
        .receipt-row {
          display: flex !important;
          justify-content: space-between !important;
          align-items: flex-start !important;
          margin: 2px 0 !important;
          width: 100% !important;
          max-width: 70mm !important;
          flex-wrap: wrap !important;
        }
        
        .receipt-section {
          margin-bottom: 6px !important;
          padding: 2px 0 !important;
          width: 100% !important;
          max-width: 70mm !important;
        }
        
        .dashed-line {
          border-top: 1px dashed black !important;
          margin: 4px 0 !important;
          width: 100% !important;
          max-width: 70mm !important;
        }
        
        .solid-line {
          border-top: 1px solid black !important;
          margin: 3px 0 !important;
          width: 100% !important;
          max-width: 70mm !important;
        }
        
        svg {
          border: 1px solid black !important;
        }
        
        img {
          max-width: 25mm !important;
          max-height: 25mm !important;
          object-fit: contain !important;
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
