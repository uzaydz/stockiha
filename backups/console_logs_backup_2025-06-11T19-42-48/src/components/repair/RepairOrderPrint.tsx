import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Check, Loader2 } from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { useTenant } from '@/context/TenantContext';
import { RepairOrder } from '@/types/repair';
import RepairReceiptPrint from './RepairReceiptPrint';

interface RepairOrderPrintProps {
  order: RepairOrder;
}

const RepairOrderPrint: React.FC<RepairOrderPrintProps> = ({ order }) => {
  const { organizationId } = useUser();
  const { currentOrganization } = useTenant();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPrintSuccess, setIsPrintSuccess] = useState(false);

  // إنشاء رابط التتبع
  const trackingCode = order.repair_tracking_code || order.order_number || order.id;
  
  // بناء رابط المتجر
  const storeUrl = (() => {
    // إذا كان هناك نطاق مخصص معرف في المنظمة
    if (currentOrganization?.domain) {
      return `https://${currentOrganization.domain}`;
    } 
    // إذا كان هناك نطاق فرعي معرف في المنظمة
    else if (currentOrganization?.subdomain) {
      const hostname = window.location.hostname;
      
      // إذا كنا في بيئة تطوير محلية
      if (hostname === 'localhost' || hostname.includes('127.0.0.1')) {
        // استخدم النطاق المحلي فقط
        return window.location.origin;
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
    // استخدم النطاق الحالي كحل افتراضي
    else {
      return window.location.origin;
    }
  })();
  
  // بناء رابط التتبع الكامل
  const trackingUrl = `${storeUrl}/repair-tracking/${trackingCode}`;

  // وظيفة الطباعة المباشرة
  const handlePrintClick = () => {
    if (isPrinting) return;
    
    try {
      setIsPrinting(true);
      
      // جلب المحتوى المراد طباعته
      const contentToPrint = receiptRef.current;
      if (!contentToPrint) {
        console.error('محتوى الطباعة غير متوفر');
        setIsPrinting(false);
        return;
      }
      
      // إنشاء نافذة طباعة جديدة
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        console.error('فشل فتح نافذة الطباعة');
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
      console.error('خطأ في الطباعة:', error);
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
            storeName={currentOrganization?.name || 'متجرك للإلكترونيات'}
            storePhone={currentOrganization?.settings?.phone as string}
            storeAddress={currentOrganization?.settings?.address as string}
            storeLogo={currentOrganization?.logo_url || ''}
            trackingUrl={trackingUrl}
          />
        </div>
      </div>
    </div>
  );
};

export default RepairOrderPrint; 