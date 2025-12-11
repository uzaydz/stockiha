/**
 * UnifiedPrintButton - زر طباعة موحد لجميع أنواع الطباعة
 * ================================================
 *
 * يدعم:
 * - طباعة صامتة مباشرة (Electron)
 * - طباعة عادية مع معاينة
 * - طباعة سريعة بضغطة واحدة
 * - تصدير PDF
 * - فتح درج النقود
 */

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Printer,
  Zap,
  Download,
  ChevronDown,
  Loader2,
  FileText,
  DollarSign,
  Settings,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { unifiedPrintService, PrintSettings } from '@/services/UnifiedPrintService';
import { usePrinterSettings } from '@/hooks/usePrinterSettings';

// أنواع الطباعة المدعومة
export type PrintType = 'receipt' | 'invoice' | 'repair' | 'barcode' | 'report' | 'custom';

export interface UnifiedPrintButtonProps {
  // المحتوى للطباعة
  htmlContent?: string;
  getHtmlContent?: () => string | Promise<string>;
  printRef?: React.RefObject<HTMLElement>;

  // نوع الطباعة
  printType?: PrintType;

  // إعدادات
  settings?: Partial<PrintSettings>;
  documentTitle?: string;

  // خيارات
  showQuickPrint?: boolean;
  showPdfExport?: boolean;
  showCashDrawer?: boolean;
  showPreview?: boolean;

  // أحداث
  onPrintStart?: () => void;
  onPrintSuccess?: (method: string) => void;
  onPrintError?: (error: string) => void;
  onPdfExport?: () => void;
  onCashDrawerOpen?: () => void;

  // تخصيص الزر
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  buttonText?: string;
  disabled?: boolean;

  // وضع الزر
  mode?: 'single' | 'dropdown' | 'split';
}

const UnifiedPrintButton: React.FC<UnifiedPrintButtonProps> = ({
  htmlContent,
  getHtmlContent,
  printRef,
  printType = 'custom',
  settings: customSettings,
  documentTitle = 'مستند',
  showQuickPrint = true,
  showPdfExport = true,
  showCashDrawer = false,
  showPreview = true,
  onPrintStart,
  onPrintSuccess,
  onPrintError,
  onPdfExport,
  onCashDrawerOpen,
  variant = 'outline',
  size = 'default',
  className = '',
  buttonText = 'طباعة',
  disabled = false,
  mode = 'dropdown',
}) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { settings: printerSettings } = usePrinterSettings();

  // دمج الإعدادات
  const mergedSettings: Partial<PrintSettings> = {
    ...printerSettings,
    ...customSettings,
  };

  // الحصول على محتوى HTML للطباعة
  const getContent = async (): Promise<string> => {
    if (htmlContent) {
      return htmlContent;
    }

    if (getHtmlContent) {
      return await getHtmlContent();
    }

    if (printRef?.current) {
      return printRef.current.innerHTML;
    }

    throw new Error('لم يتم تحديد محتوى للطباعة');
  };

  // تغليف HTML بالأنماط المناسبة
  const wrapContent = (content: string): string => {
    const paperWidth = mergedSettings.paper_width || 58;

    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>${documentTitle}</title>
          <style>
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            @page {
              size: ${paperWidth}mm auto;
              margin: 0;
            }

            body {
              font-family: 'Tajawal', -apple-system, BlinkMacSystemFont, 'SF Pro Text', Arial, sans-serif;
              direction: rtl;
              background: white;
              color: black;
              width: ${paperWidth}mm;
              padding: 3mm;
              line-height: 1.4;
            }

            @media print {
              body {
                background: white !important;
                width: ${paperWidth}mm !important;
              }
              * {
                color: black !important;
              }
            }
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `;
  };

  // الطباعة العادية
  const handlePrint = async () => {
    if (isPrinting || disabled) return;

    setIsPrinting(true);
    onPrintStart?.();

    try {
      const content = await getContent();
      const wrappedContent = wrapContent(content);

      const result = await unifiedPrintService.print({
        html: wrappedContent,
        settings: mergedSettings,
        silent: false,
        openDrawer: showCashDrawer && mergedSettings.open_cash_drawer,
      });

      if (result.success) {
        toast.success('تمت الطباعة بنجاح', {
          description: `الطريقة: ${result.method}`,
        });
        onPrintSuccess?.(result.method);
      } else {
        toast.error('فشل في الطباعة', {
          description: result.error,
        });
        onPrintError?.(result.error || 'خطأ غير معروف');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
      toast.error('حدث خطأ أثناء الطباعة', {
        description: errorMessage,
      });
      onPrintError?.(errorMessage);
    } finally {
      setIsPrinting(false);
    }
  };

  // الطباعة السريعة (صامتة)
  const handleQuickPrint = async () => {
    if (isPrinting || disabled) return;

    setIsPrinting(true);
    onPrintStart?.();

    const toastId = toast.loading('جاري الطباعة السريعة...');

    try {
      const content = await getContent();
      const wrappedContent = wrapContent(content);

      const result = await unifiedPrintService.print({
        html: wrappedContent,
        settings: mergedSettings,
        silent: true,
        openDrawer: showCashDrawer && mergedSettings.open_cash_drawer,
      });

      toast.dismiss(toastId);

      if (result.success) {
        toast.success('تمت الطباعة السريعة', {
          description: `الطريقة: ${result.method}${result.drawerOpened ? ' • تم فتح الدرج' : ''}`,
        });
        onPrintSuccess?.(result.method);
      } else {
        toast.error('فشل في الطباعة السريعة', {
          description: result.error,
        });
        onPrintError?.(result.error || 'خطأ غير معروف');
      }
    } catch (error) {
      toast.dismiss(toastId);
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
      toast.error('حدث خطأ أثناء الطباعة', {
        description: errorMessage,
      });
      onPrintError?.(errorMessage);
    } finally {
      setIsPrinting(false);
    }
  };

  // تصدير PDF
  const handleExportPdf = async () => {
    if (isExporting || disabled) return;

    setIsExporting(true);
    const toastId = toast.loading('جاري إنشاء ملف PDF...');

    try {
      // استيراد ديناميكي للمكتبات الثقيلة
      const [jspdfMod, html2canvasMod] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);

      const html2canvas = (html2canvasMod as any).default || html2canvasMod;
      const { jsPDF } = jspdfMod as any;

      // إنشاء عنصر مؤقت للطباعة
      const content = await getContent();
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      tempDiv.style.cssText = `
        position: fixed;
        left: -9999px;
        top: 0;
        width: 210mm;
        background: white;
        padding: 10mm;
        direction: rtl;
      `;
      document.body.appendChild(tempDiv);

      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      document.body.removeChild(tempDiv);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`${documentTitle}.pdf`);

      toast.dismiss(toastId);
      toast.success('تم تنزيل ملف PDF بنجاح');
      onPdfExport?.();
    } catch (error) {
      toast.dismiss(toastId);
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
      toast.error('فشل في إنشاء ملف PDF', {
        description: errorMessage,
      });
    } finally {
      setIsExporting(false);
    }
  };

  // فتح درج النقود
  const handleOpenCashDrawer = async () => {
    try {
      const success = await unifiedPrintService.openCashDrawer(mergedSettings.printer_name);

      if (success) {
        toast.success('تم فتح درج النقود');
        onCashDrawerOpen?.();
      } else {
        toast.error('فشل في فتح درج النقود');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء فتح درج النقود');
    }
  };

  // المعاينة
  const handlePreview = async () => {
    try {
      const content = await getContent();
      const wrappedContent = wrapContent(content);

      const previewWindow = window.open('', '_blank', 'width=400,height=600');
      if (previewWindow) {
        previewWindow.document.write(wrappedContent);
        previewWindow.document.close();
      } else {
        toast.error('فشل في فتح نافذة المعاينة');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء المعاينة');
    }
  };

  // زر بسيط
  if (mode === 'single') {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={handlePrint}
        disabled={disabled || isPrinting}
        className={className}
      >
        {isPrinting ? (
          <Loader2 className="h-4 w-4 animate-spin ml-2" />
        ) : (
          <Printer className="h-4 w-4 ml-2" />
        )}
        {isPrinting ? 'جاري الطباعة...' : buttonText}
      </Button>
    );
  }

  // زر منقسم (طباعة سريعة + قائمة)
  if (mode === 'split') {
    return (
      <div className={`flex ${className}`}>
        <Button
          variant={variant}
          size={size}
          onClick={handleQuickPrint}
          disabled={disabled || isPrinting}
          className="rounded-l-none border-l-0"
        >
          {isPrinting ? (
            <Loader2 className="h-4 w-4 animate-spin ml-2" />
          ) : (
            <Zap className="h-4 w-4 ml-2" />
          )}
          {isPrinting ? 'جاري...' : 'طباعة سريعة'}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={variant}
              size={size}
              disabled={disabled || isPrinting}
              className="rounded-r-none px-2"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handlePrint}>
              <Printer className="h-4 w-4 ml-2" />
              طباعة عادية
            </DropdownMenuItem>

            {showPreview && (
              <DropdownMenuItem onClick={handlePreview}>
                <Eye className="h-4 w-4 ml-2" />
                معاينة
              </DropdownMenuItem>
            )}

            {showPdfExport && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExportPdf} disabled={isExporting}>
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 ml-2" />
                  )}
                  تصدير PDF
                </DropdownMenuItem>
              </>
            )}

            {showCashDrawer && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleOpenCashDrawer}>
                  <DollarSign className="h-4 w-4 ml-2" />
                  فتح درج النقود
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // قائمة منسدلة (الافتراضي)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled || isPrinting || isExporting}
          className={className}
        >
          {isPrinting ? (
            <Loader2 className="h-4 w-4 animate-spin ml-2" />
          ) : (
            <Printer className="h-4 w-4 ml-2" />
          )}
          {isPrinting ? 'جاري الطباعة...' : buttonText}
          <ChevronDown className="h-4 w-4 mr-2" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-52">
        {showQuickPrint && (
          <DropdownMenuItem onClick={handleQuickPrint}>
            <Zap className="h-4 w-4 ml-2 text-yellow-500" />
            طباعة سريعة (صامتة)
          </DropdownMenuItem>
        )}

        <DropdownMenuItem onClick={handlePrint}>
          <Printer className="h-4 w-4 ml-2" />
          طباعة عادية
        </DropdownMenuItem>

        {showPreview && (
          <DropdownMenuItem onClick={handlePreview}>
            <Eye className="h-4 w-4 ml-2" />
            معاينة قبل الطباعة
          </DropdownMenuItem>
        )}

        {showPdfExport && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleExportPdf} disabled={isExporting}>
              {isExporting ? (
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 ml-2" />
              )}
              تصدير كملف PDF
            </DropdownMenuItem>
          </>
        )}

        {showCashDrawer && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleOpenCashDrawer}>
              <DollarSign className="h-4 w-4 ml-2 text-green-500" />
              فتح درج النقود
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UnifiedPrintButton;
export { UnifiedPrintButton };
