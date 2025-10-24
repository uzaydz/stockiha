import { useRef, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Printer, Download, Share2, ArrowLeft } from "lucide-react";
import { useReactToPrint } from 'react-to-print';
import { toast } from 'sonner';
import { useTenant } from '@/context/TenantContext';
import { supabase } from '@/lib/supabase';
import type { Invoice } from '@/lib/api/invoices';
import AlgerianInvoiceTemplate from './AlgerianInvoiceTemplate';
import ProformaInvoiceTemplate from './ProformaInvoiceTemplate';
import BonCommandeTemplate from './BonCommandeTemplate';
import InvoicePrintLanguageDialog from './InvoicePrintLanguageDialog';

interface InvoicePrintViewProps {
  invoice: Invoice;
  onBack: () => void;
}

const InvoicePrintViewUpdated = ({ invoice, onBack }: InvoicePrintViewProps) => {
  const printRef = useRef<HTMLDivElement>(null);
  const { currentOrganization } = useTenant();
  const [language, setLanguage] = useState<'ar' | 'fr' | 'en'>('ar');
  const [languageDialogOpen, setLanguageDialogOpen] = useState(false);
  const [organizationSettings, setOrganizationSettings] = useState<any>(null);
  const [organizationLogo, setOrganizationLogo] = useState<string | undefined>();

  // جلب إعدادات المحل من جدول pos_settings
  useEffect(() => {
    const fetchOrganizationSettings = async () => {
      if (!currentOrganization) return;

      try {
        const { data, error } = await supabase
          .from('pos_settings')
          .select('*')
          .eq('organization_id', currentOrganization.id)
          .single();

        if (error) throw error;

        if (data) {
          setOrganizationSettings({
            name: data.store_name || currentOrganization.name,
            address: data.store_address || '',
            phone: data.store_phone || '',
            email: data.store_email || '',
            website: data.store_website || '',
            taxNumber: (data as any).nif || '',
            registrationNumber: (data as any).rc || '',
            activity: (data as any).activity || '',
            nis: (data as any).nis || '',
            rib: (data as any).rib || '',
          });

          if (data.store_logo_url) {
            setOrganizationLogo(data.store_logo_url);
          }
        }
      } catch (error) {
        console.error('Error fetching organization settings:', error);
      }
    };

    fetchOrganizationSettings();
  }, [currentOrganization]);

  // استخدام react-to-print للطباعة
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `فاتورة-${invoice.invoiceNumber}`,
    onAfterPrint: () => toast.success('تمت الطباعة بنجاح'),
  });

  // تنزيل الفاتورة كملف PDF
  const handleDownloadPDF = async () => {
    if (!printRef.current) return;

    try {
      toast.loading('جاري إنشاء ملف PDF...');
      const [jspdfMod, html2canvasMod] = await Promise.all([
        import('jspdf'),
        import('html2canvas')
      ]);
      const html2canvas = (html2canvasMod as any).default || html2canvasMod;

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      
      const { jsPDF } = jspdfMod as any;
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`فاتورة-${invoice.invoiceNumber}.pdf`);
      
      toast.dismiss();
      toast.success('تم تنزيل الفاتورة بنجاح');
    } catch (error) {
      toast.dismiss();
      toast.error('حدث خطأ أثناء إنشاء ملف PDF');
    }
  };

  // مشاركة الفاتورة
  const handleShareInvoice = async () => {
    try {
      if (!printRef.current) return;
      
      toast.loading('جاري تحضير الفاتورة للمشاركة...');
      const html2canvas = (await import('html2canvas') as any).default || (await import('html2canvas'));
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
      });
      
      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.dismiss();
          toast.error('حدث خطأ أثناء تحضير الفاتورة للمشاركة');
          return;
        }
        
        const file = new File([blob], `فاتورة-${invoice.invoiceNumber}.png`, { type: 'image/png' });
        
        if (navigator.share) {
          try {
            await navigator.share({
              files: [file],
              title: `فاتورة ${invoice.invoiceNumber}`,
              text: `فاتورة رقم ${invoice.invoiceNumber}`,
            });
            toast.dismiss();
            toast.success('تمت المشاركة بنجاح');
          } catch (error: any) {
            if (error.name !== 'AbortError') {
              toast.dismiss();
              toast.error('حدث خطأ أثناء المشاركة');
            }
          }
        } else {
          toast.dismiss();
          toast.error('المشاركة غير مدعومة في متصفحك');
        }
      });
    } catch (error) {
      toast.dismiss();
      toast.error('حدث خطأ أثناء تحضير الفاتورة للمشاركة');
    }
  };

  return (
    <>
      <div className="flex flex-col h-full gap-4 p-4">
        {/* أزرار التحكم */}
        <div className="flex justify-between items-center gap-2">
          <Button
            variant="outline"
            onClick={onBack}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            رجوع
          </Button>

          <div className="flex gap-2">
            <Button
              onClick={() => setLanguageDialogOpen(true)}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              طباعة
            </Button>
            <Button
              onClick={() => setLanguageDialogOpen(true)}
              variant="secondary"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              تنزيل
            </Button>
            <Button
              onClick={() => setLanguageDialogOpen(true)}
              variant="outline"
              className="gap-2"
            >
              <Share2 className="h-4 w-4" />
              مشاركة
            </Button>
          </div>
        </div>

        {/* معاينة الفاتورة */}
        <div className="flex-1 overflow-auto border rounded-lg bg-gray-50 p-4">
          <div className="bg-white rounded-lg shadow-lg">
            {invoice.invoiceNumber?.startsWith('PRO-') ? (
              <ProformaInvoiceTemplate
                ref={printRef}
                invoice={invoice}
                language={language}
                organizationLogo={organizationLogo}
                organizationSettings={organizationSettings}
              />
            ) : invoice.invoiceNumber?.startsWith('BC-') ? (
              <BonCommandeTemplate
                ref={printRef}
                invoice={invoice}
                language={language}
                organizationLogo={organizationLogo}
                organizationSettings={organizationSettings}
              />
            ) : (
              <AlgerianInvoiceTemplate
                ref={printRef}
                invoice={invoice}
                language={language}
                organizationLogo={organizationLogo}
                organizationSettings={organizationSettings}
              />
            )}
          </div>
        </div>
      </div>

      {/* نافذة اختيار اللغة */}
      <InvoicePrintLanguageDialog
        open={languageDialogOpen}
        onOpenChange={setLanguageDialogOpen}
        onSelectLanguage={setLanguage}
        onPrint={handlePrint}
        onDownload={handleDownloadPDF}
        onShare={handleShareInvoice}
      />
    </>
  );
};

export default InvoicePrintViewUpdated;
