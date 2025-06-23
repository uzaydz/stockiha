import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Check, Loader2 } from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { useTenant } from '@/context/TenantContext';
import { RepairOrder } from '@/types/repair';
import RepairReceiptPrint from './RepairReceiptPrint';
import { supabase } from '@/lib/supabase';

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
    console.warn('[RepairOrderPrint] POSDataProvider غير متاح، استخدام القيم الافتراضية');
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
        console.log('[RepairOrderPrint] جلب إعدادات نقطة البيع من قاعدة البيانات...');
        
        const { data, error } = await supabase
          .from('pos_settings')
          .select('*')
          .eq('organization_id', organizationId)
          .single();

        if (error) {
          console.log('[RepairOrderPrint] لم يتم العثور على إعدادات نقطة البيع:', error.message);
        } else {
          console.log('[RepairOrderPrint] تم جلب إعدادات نقطة البيع:', data);
          setFallbackPOSSettings(data);
        }
      } catch (error) {
        console.error('[RepairOrderPrint] خطأ في جلب إعدادات نقطة البيع:', error);
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
      console.log('[RepairOrderPrint] إعدادات نقطة البيع غير موجودة، جاري إنشاؤها...');
      refreshPOSSettings();
    }
  }, [posSettings, organizationId, refreshPOSSettings]);

  // حساب ترتيب الطلبية في الطابور (نفس الطريقة المستخدمة في التتبع العام)
  useEffect(() => {
    const calculateQueuePosition = async () => {
      if (!organizationId || !order) return;

      try {
        // التحقق من أن الطلبية مؤهلة لتكون في الطابور
        const activeStatuses = ['قيد الانتظار', 'جاري التصليح'];
        if (!activeStatuses.includes(order.status)) {
          setCalculatedQueuePosition(0);
          return;
        }

        // حساب عدد الطلبات التي تم إنشاؤها قبل هذه الطلبية في نفس المكان
        const { count, error } = await supabase
          .from('repair_orders')
          .select('*', { count: 'exact', head: true })
          .eq('repair_location_id', order.repair_location_id)
          .in('status', activeStatuses)
          .lt('created_at', order.created_at);

        if (error) {
          console.error('خطأ في حساب ترتيب الطابور:', error);
          setCalculatedQueuePosition(queuePosition || 0);
          return;
        }

        const position = (count || 0) + 1;
        console.log('ترتيب الطلبية المحسوب:', position, 'للطلبية:', order.id, 'في المكان:', order.repair_location_id);
        setCalculatedQueuePosition(position);
      } catch (error) {
        console.error('خطأ في حساب ترتيب الطابور:', error);
        setCalculatedQueuePosition(queuePosition || 0);
      }
    };

    calculateQueuePosition();
  }, [order, organizationId, queuePosition]);

  // إنشاء رابط التتبع
  const trackingCode = order.repair_tracking_code || order.order_number || order.id;
  
  // بناء رابط المتجر
  const storeUrl = (() => {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname.includes('127.0.0.1');
    
    // إذا كان هناك نطاق مخصص معرف في المنظمة
    if (currentOrganization?.domain) {
      return `https://${currentOrganization.domain}`;
    } 
    // إذا كان هناك نطاق فرعي معرف في المنظمة
    else if (currentOrganization?.subdomain) {
      // إذا كنا في بيئة تطوير محلية
      if (isLocalhost) {
        // استخدم النطاق الفرعي مع stockiha.com في بيئة التطوير
        return `https://${currentOrganization.subdomain}.stockiha.com`;
      } 
      // إذا كنا في بيئة إنتاج
      else {
        // تحقق ما إذا كان اسم المضيف يحتوي بالفعل على النطاق الفرعي
        if (hostname.startsWith(`${currentOrganization.subdomain}.`)) {
          // استخدم النطاق الحالي كما هو
          return window.location.origin;
        } else {
          // استخراج النطاق الرئيسي (مثل example.com)
          const domainParts = hostname.split('.');
          const mainDomain = domainParts.length >= 2 
            ? domainParts.slice(-2).join('.') 
            : hostname;
          
          return `https://${currentOrganization.subdomain}.${mainDomain}`;
        }
      }
    } 
    // إذا لم يكن هناك نطاق فرعي أو مخصص
    else {
      // في بيئة التطوير، استخدم stockiha.com
      if (isLocalhost) {
        return 'https://stockiha.com';
      }
      // في الإنتاج، استخدم النطاق الحالي
      else {
        return window.location.origin;
      }
    }
  })();
  
  // بناء رابط التتبع الكامل
  const trackingUrl = `${storeUrl}/repair-tracking/${trackingCode}`;

  // الحصول على معلومات المتجر من إعدادات نقطة البيع أولاً، ثم المنظمة كبديل
  const getStoreInfo = () => {
    // استخدام إعدادات نقطة البيع من Context أولاً، ثم من قاعدة البيانات، ثم المنظمة
    const activePOSSettings = posSettings || fallbackPOSSettings;
    
    // تسجيل تفصيلي للبيانات الأولية
    console.log('[RepairOrderPrint] البيانات الأولية:', {
      'posSettings': posSettings,
      'fallbackPOSSettings': fallbackPOSSettings,
      'activePOSSettings': activePOSSettings,
      'currentOrganization?.name': currentOrganization?.name,
      'currentOrganization?.settings': currentOrganization?.settings,
      'currentOrganization?.logo_url': currentOrganization?.logo_url
    });

    const storeInfo = {
      storeName: activePOSSettings?.store_name || currentOrganization?.name || 'متجرك للإلكترونيات',
      storePhone: activePOSSettings?.store_phone || (currentOrganization?.settings?.phone as string) || '',
      storeAddress: activePOSSettings?.store_address || (currentOrganization?.settings?.address as string) || '',
      storeLogo: activePOSSettings?.store_logo_url || currentOrganization?.logo_url || ''
    };

    console.log('[RepairOrderPrint] معلومات المتجر النهائية:', storeInfo);
    
    return storeInfo;
  };

  const { storeName, storePhone, storeAddress, storeLogo } = getStoreInfo();

  console.log('[RepairOrderPrint] ملخص معلومات المتجر:', {
    posSettings: posSettings ? 'موجود' : 'غير موجود',
    storeName,
    storePhone,
    storeAddress,
    storeLogo: storeLogo ? 'موجود' : 'غير موجود'
  });

  // وظيفة الطباعة المباشرة
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
      
      // استنساخ تنسيقات CSS للنافذة الجديدة
      const styles = Array.from(document.styleSheets)
        .map(styleSheet => {
          try {
            return Array.from(styleSheet.cssRules)
              .map(rule => rule.cssText)
              .join('\n');
          } catch (e) {
            // تخطي أوراق الأنماط المقيدة CORS
            return '';
          }
        })
        .filter(Boolean)
        .join('\n');
      
      // إنشاء محتوى HTML للنافذة الجديدة
      printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl">
          <head>
            <title>وصل تصليح - ${order.customer_name}</title>
            <style>${styles}</style>
          </head>
          <body>
            ${contentToPrint.innerHTML}
          </body>
        </html>
      `);
      
      // الانتظار لتحميل الصور
      printWindow.document.close();
      
      // طباعة النافذة بعد تحميل المحتوى
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.onafterprint = () => {
            printWindow.close();
            setIsPrinting(false);
            setIsPrintSuccess(true);
            setTimeout(() => setIsPrintSuccess(false), 2000);
          };
        }, 500);
      };
    } catch (error) {
      console.error('[RepairOrderPrint] خطأ في الطباعة:', error);
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
