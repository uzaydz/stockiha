import { useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Printer,
  Download,
  Share2,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Loader2
} from "lucide-react";
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useReactToPrint } from 'react-to-print';
// Heavy libs are dynamically imported when needed to reduce initial JS size
import { toast } from 'sonner';
import type { Invoice } from '@/lib/api/invoices';
// ⚡ نظام الطباعة الموحد
import { usePrinter } from '@/hooks/usePrinter';

interface InvoicePrintViewProps {
  invoice: Invoice;
  onBack: () => void;
}

const InvoicePrintView = ({ invoice, onBack }: InvoicePrintViewProps) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  // ⚡ نظام الطباعة الموحد
  const { printHtml, isElectron: isElectronPrint } = usePrinter();

  // استخدام react-to-print للطباعة (fallback)
  const handleReactToPrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `فاتورة-${invoice.invoiceNumber}`,
    onAfterPrint: () => toast.success('تمت الطباعة بنجاح'),
  });

  // ⚡ دالة الطباعة الموحدة مع دعم Electron
  const handlePrint = async () => {
    if (isPrinting) return;

    // ⚡ محاولة الطباعة المباشرة عبر Electron أولاً
    if (isElectronPrint && printRef.current) {
      try {
        setIsPrinting(true);

        // إنشاء HTML للطباعة
        const printHtmlContent = `
          <!DOCTYPE html>
          <html dir="rtl" lang="ar">
            <head>
              <meta charset="UTF-8">
              <title>فاتورة-${invoice.invoiceNumber}</title>
              <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { font-family: 'Tajawal', 'Arial', sans-serif; direction: rtl; background: white; color: black; }
                @page { size: A4; margin: 10mm; }
                @media print {
                  body { background: white !important; }
                  * { color: black !important; background: transparent !important; }
                }
              </style>
            </head>
            <body>
              ${printRef.current.innerHTML}
            </body>
          </html>
        `;

        const result = await printHtml(printHtmlContent, {
          silent: false, // عرض نافذة الطباعة للفواتير
          pageSize: 'A4',
          landscape: false,
        });

        if (result.success) {
          toast.success('تمت الطباعة بنجاح');
          setIsPrinting(false);
          return;
        } else {
          console.warn('[InvoicePrint] فشلت الطباعة المباشرة:', result.error);
        }
      } catch (err) {
        console.warn('[InvoicePrint] خطأ في الطباعة المباشرة:', err);
      }
      setIsPrinting(false);
    }

    // ⚡ التراجع إلى react-to-print
    handleReactToPrint();
  };

  // تنزيل الفاتورة كملف PDF
  const handleDownloadPDF = async () => {
    if (!printRef.current) return;

    try {
      toast.loading('جاري إنشاء ملف PDF...');
      // Dynamic imports for heavy libraries
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
      
      const imgWidth = 210; // A4 width
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
              title: `فاتورة ${invoice.invoiceNumber}`,
              text: `فاتورة ${invoice.invoiceNumber} - ${invoice.customerName || 'عميل'}`,
              files: [file],
            });
            toast.dismiss();
            toast.success('تمت مشاركة الفاتورة بنجاح');
          } catch (error) {
            toast.dismiss();
            toast.error('حدث خطأ أثناء مشاركة الفاتورة');
          }
        } else {
          toast.dismiss();
          toast.error('مشاركة الملفات غير مدعومة في هذا المتصفح');
        }
      });
    } catch (error) {
      toast.dismiss();
      toast.error('حدث خطأ أثناء تحضير الفاتورة للمشاركة');
    }
  };

  // الحصول على أيقونة حالة الفاتورة
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'overdue':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'canceled':
        return <XCircle className="h-5 w-5 text-gray-500" />;
      default:
        return <Clock className="h-5 w-5 text-blue-500" />;
    }
  };

  // الحصول على لون حالة الفاتورة
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'overdue':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'canceled':
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
      default:
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    }
  };

  // الحصول على نص حالة الفاتورة
  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'مدفوعة';
      case 'pending':
        return 'معلقة';
      case 'overdue':
        return 'متأخرة';
      case 'canceled':
        return 'ملغاة';
      default:
        return 'غير معروفة';
    }
  };

  // الحصول على نص نوع الفاتورة
  const getSourceTypeText = (type: string) => {
    switch (type) {
      case 'pos':
        return 'نقاط البيع';
      case 'online':
        return 'متجر إلكتروني';
      case 'service':
        return 'خدمات';
      case 'combined':
        return 'مدمجة';
      default:
        return 'غير معروف';
    }
  };

  return (
    <div className="space-y-6">
      {/* شريط الإجراءات */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-card rounded-lg p-4 border">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          العودة إلى قائمة الفواتير
        </Button>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handlePrint()} className="gap-2" disabled={isPrinting}>
            {isPrinting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Printer className="h-4 w-4" />
            )}
            {isPrinting ? 'جاري الطباعة...' : 'طباعة'}
          </Button>
          <Button variant="outline" onClick={handleDownloadPDF} className="gap-2">
            <Download className="h-4 w-4" />
            تنزيل PDF
          </Button>
          <Button variant="outline" onClick={handleShareInvoice} className="gap-2">
            <Share2 className="h-4 w-4" />
            مشاركة
          </Button>
        </div>
      </div>
      
      {/* مستند الفاتورة للطباعة */}
      <Card className="border shadow-sm">
        <CardContent className="p-0">
          <div ref={printRef} className="p-8 max-w-4xl mx-auto bg-white">
            {/* رأس الفاتورة مع شعار وبيانات المؤسسة */}
            <div className="flex justify-between items-start mb-8 flex-wrap gap-4">
              {/* شعار ومعلومات المؤسسة */}
              <div className="flex items-center gap-4">
                {invoice.organizationInfo.logo ? (
                  <img 
                    src={invoice.organizationInfo.logo} 
                    alt="شعار المؤسسة" 
                    className="w-20 h-20 object-contain"
                  />
                ) : (
                  <div className="w-20 h-20 bg-primary/10 flex items-center justify-center rounded-lg">
                    <span className="text-lg font-bold text-primary">
                      {invoice.organizationInfo.name?.substring(0, 2) || 'LG'}
                    </span>
                  </div>
                )}
                
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {invoice.organizationInfo.name}
                  </h1>
                  <div className="text-sm text-gray-600 mt-1 space-y-0.5">
                    {invoice.organizationInfo.address && (
                      <p>{invoice.organizationInfo.address}</p>
                    )}
                    <div className="flex flex-wrap gap-x-4">
                      {invoice.organizationInfo.phone && (
                        <span>هاتف: {invoice.organizationInfo.phone}</span>
                      )}
                      {invoice.organizationInfo.email && (
                        <span>البريد: {invoice.organizationInfo.email}</span>
                      )}
                    </div>
                    {invoice.organizationInfo.website && (
                      <p>الموقع: {invoice.organizationInfo.website}</p>
                    )}
                    {invoice.organizationInfo.taxNumber && (
                      <p>الرقم الضريبي: {invoice.organizationInfo.taxNumber}</p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* معلومات الفاتورة */}
              <div className="bg-gray-50 rounded-lg p-4 min-w-[250px] border border-gray-100">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-lg font-bold text-gray-900">فاتورة</h2>
                  <div className="flex items-center gap-1.5">
                    {getStatusIcon(invoice.status)}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                      {getStatusText(invoice.status)}
                    </span>
                  </div>
                </div>
                <div className="space-y-1 text-sm border-t border-gray-200 pt-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">رقم الفاتورة:</span>
                    <span className="font-medium text-gray-900 font-mono">{invoice.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">تاريخ الإصدار:</span>
                    <span className="text-gray-900">
                      {format(new Date(invoice.invoiceDate), 'dd MMM yyyy', { locale: ar })}
                    </span>
                  </div>
                  {invoice.dueDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">تاريخ الاستحقاق:</span>
                      <span className="text-gray-900">
                        {format(new Date(invoice.dueDate), 'dd MMM yyyy', { locale: ar })}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">طريقة الدفع:</span>
                    <span className="text-gray-900">{invoice.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">النوع:</span>
                    <span className="text-gray-900">{getSourceTypeText(invoice.sourceType)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* معلومات العميل */}
            <div className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-2 border-b pb-2">معلومات العميل</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="font-medium text-gray-900">
                    {invoice.customerInfo.name || 'عميل نقدي'}
                  </p>
                  {invoice.customerInfo.address && (
                    <p className="text-gray-600 text-sm mt-1">{invoice.customerInfo.address}</p>
                  )}
                </div>
                <div className="text-sm space-y-1">
                  {invoice.customerInfo.phone && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">رقم الهاتف:</span>
                      <span className="text-gray-900">{invoice.customerInfo.phone}</span>
                    </div>
                  )}
                  {invoice.customerInfo.email && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">البريد الإلكتروني:</span>
                      <span className="text-gray-900">{invoice.customerInfo.email}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* جدول المنتجات/الخدمات */}
            <div className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-2 border-b pb-2">تفاصيل الفاتورة</h2>
              <div className="overflow-hidden border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المنتج/الخدمة</th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الكمية</th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">السعر</th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invoice.items.map((item, index) => (
                      <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div>
                            <div className="font-medium">{item.name}</div>
                            {item.description && (
                              <div className="text-gray-500 text-xs mt-0.5">{item.description}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{item.quantity}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{(item.unitPrice || 0).toFixed(2)} دج</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{(item.totalPrice || 0).toFixed(2)} دج</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* ملخص الفاتورة */}
            <div className="flex justify-end mb-8">
              <div className="w-full md:w-72 bg-gray-50 rounded-lg border border-gray-200 p-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">المجموع الفرعي:</span>
                    <span className="text-gray-900">{(invoice.subtotalAmount || 0).toFixed(2)} دج</span>
                  </div>
                  
                  {invoice.taxAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">الضريبة:</span>
                      <span className="text-gray-900">{(invoice.taxAmount || 0).toFixed(2)} دج</span>
                    </div>
                  )}
                  
                  {invoice.discountAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">الخصم:</span>
                      <span className="text-gray-900">- {(invoice.discountAmount || 0).toFixed(2)} دج</span>
                    </div>
                  )}
                  
                  {invoice.shippingAmount && invoice.shippingAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">الشحن:</span>
                      <span className="text-gray-900">{(invoice.shippingAmount || 0).toFixed(2)} دج</span>
                    </div>
                  )}
                  
                  <div className="border-t border-gray-200 my-2 pt-2"></div>
                  
                  <div className="flex justify-between font-bold">
                    <span>الإجمالي:</span>
                    <span>{(invoice.totalAmount || 0).toFixed(2)} دج</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* ملاحظات وشروط */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {invoice.notes && (
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2">ملاحظات</h3>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200">
                    {invoice.notes}
                  </p>
                </div>
              )}
              
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-2">شروط وأحكام</h3>
                <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-1">
                  <p>• جميع الأسعار تشمل ضريبة القيمة المضافة حيثما ينطبق.</p>
                  <p>• يجب سداد المبلغ بالكامل وفقاً لشروط الدفع المتفق عليها.</p>
                  <p>• تطبق سياسة الإرجاع والاستبدال خلال 14 يوماً من تاريخ الشراء.</p>
                  <p>• هذه الفاتورة صالحة لمدة 30 يوماً من تاريخ الإصدار.</p>
                </div>
              </div>
            </div>
            
            {/* التذييل */}
            <div className="text-center border-t border-gray-200 pt-6 text-sm text-gray-500">
              <p>شكراً لثقتكم وتعاملكم معنا</p>
              <p className="mt-1">تم إنشاء هذه الفاتورة إلكترونياً ولا تحتاج إلى توقيع أو ختم</p>
              {invoice.organizationInfo.website && (
                <p className="mt-2">{invoice.organizationInfo.website}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoicePrintView;
