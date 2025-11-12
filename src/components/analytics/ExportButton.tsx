/**
 * مكون زر التصدير
 * زر منسدل يسمح بتصدير التقارير بصيغ مختلفة (PDF, Excel, CSV)
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Download, FileText, FileSpreadsheet, FileType } from 'lucide-react';
import { toast } from 'sonner';
import {
  exportReport,
  type ExportFormat,
  type ExportOptions
} from '@/lib/export';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ExportButtonProps {
  data: any;
  organizationName?: string;
  period?: string;
  dateRange?: { start: Date; end: Date };
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  disabled?: boolean;
}

// ============================================================================
// المكون الرئيسي
// ============================================================================

const ExportButton: React.FC<ExportButtonProps> = ({
  data,
  organizationName,
  period,
  dateRange,
  variant = 'outline',
  size = 'default',
  className,
  disabled = false
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);

  /**
   * معالج التصدير
   */
  const handleExport = async (format: ExportFormat) => {
    if (isExporting) return;

    try {
      setIsExporting(true);
      setExportingFormat(format);

      // عرض toast للتحميل
      const loadingToast = toast.loading(getLoadingMessage(format));

      // تنفيذ التصدير
      const options: ExportOptions = {
        format,
        data,
        organizationName,
        period,
        dateRange
      };

      const result = await exportReport(options);

      // إخفاء toast التحميل
      toast.dismiss(loadingToast);

      // عرض النتيجة
      if (result.success) {
        toast.success(result.message || 'تم التصدير بنجاح', {
          description: `تم حفظ الملف بصيغة ${getFormatLabel(format)}`,
          duration: 3000
        });
      } else {
        toast.error('فشل التصدير', {
          description: result.error || 'حدث خطأ غير متوقع',
          duration: 5000
        });
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('فشل التصدير', {
        description: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
        duration: 5000
      });
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
    }
  };

  /**
   * التحقق من إمكانية التصدير
   */
  const canExport = !isExporting && !disabled && data;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={className}
          disabled={!canExport}
        >
          <Download className="w-4 h-4 ml-2" />
          {isExporting ? 'جاري التصدير...' : 'تصدير'}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56" dir="rtl">
        <DropdownMenuLabel className="text-right">
          اختر صيغة التصدير
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* تصدير PDF */}
        <DropdownMenuItem
          onClick={() => handleExport('pdf')}
          disabled={isExporting}
          className="cursor-pointer text-right"
        >
          <FileText className="w-4 h-4 ml-2 text-red-500" />
          <div className="flex-1">
            <div className="font-medium">PDF</div>
            <div className="text-xs text-muted-foreground">
              تقرير احترافي مع رسوم بيانية
            </div>
          </div>
          {exportingFormat === 'pdf' && (
            <span className="text-xs text-primary">جاري...</span>
          )}
        </DropdownMenuItem>

        {/* تصدير Excel */}
        <DropdownMenuItem
          onClick={() => handleExport('excel')}
          disabled={isExporting}
          className="cursor-pointer text-right"
        >
          <FileSpreadsheet className="w-4 h-4 ml-2 text-green-500" />
          <div className="flex-1">
            <div className="font-medium">Excel</div>
            <div className="text-xs text-muted-foreground">
              ملف قابل للتحرير مع عدة أوراق
            </div>
          </div>
          {exportingFormat === 'excel' && (
            <span className="text-xs text-primary">جاري...</span>
          )}
        </DropdownMenuItem>

        {/* تصدير CSV */}
        <DropdownMenuItem
          onClick={() => handleExport('csv')}
          disabled={isExporting}
          className="cursor-pointer text-right"
        >
          <FileType className="w-4 h-4 ml-2 text-blue-500" />
          <div className="flex-1">
            <div className="font-medium">CSV</div>
            <div className="text-xs text-muted-foreground">
              ملف بسيط للبيانات فقط
            </div>
          </div>
          {exportingFormat === 'csv' && (
            <span className="text-xs text-primary">جاري...</span>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// ============================================================================
// دوال مساعدة
// ============================================================================

function getLoadingMessage(format: ExportFormat): string {
  const messages: Record<ExportFormat, string> = {
    pdf: 'جاري إنشاء ملف PDF...',
    excel: 'جاري إنشاء ملف Excel...',
    csv: 'جاري إنشاء ملف CSV...'
  };
  return messages[format];
}

function getFormatLabel(format: ExportFormat): string {
  const labels: Record<ExportFormat, string> = {
    pdf: 'PDF',
    excel: 'Excel',
    csv: 'CSV'
  };
  return labels[format];
}

export default ExportButton;
