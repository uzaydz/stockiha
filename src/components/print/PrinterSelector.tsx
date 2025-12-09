/**
 * 🖨️ PrinterSelector - مكون اختيار الطابعة
 * ==========================================
 *
 * يعرض قائمة منسدلة لاختيار الطابعة المتاحة
 * مع زر لإعادة تحميل القائمة
 */

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RefreshCw, Printer, AlertCircle } from 'lucide-react';
import { usePrinter } from '@/hooks/usePrinter';
import { cn } from '@/lib/utils';

interface PrinterSelectorProps {
  className?: string;
  showLabel?: boolean;
  showRefresh?: boolean;
  size?: 'sm' | 'default' | 'lg';
  onPrinterChange?: (printerName: string) => void;
}

export function PrinterSelector({
  className,
  showLabel = true,
  showRefresh = true,
  size = 'default',
  onPrinterChange,
}: PrinterSelectorProps) {
  const {
    printers,
    selectedPrinter,
    setSelectedPrinter,
    fetchPrinters,
    isLoading,
    isElectron,
  } = usePrinter();

  const handlePrinterChange = (value: string) => {
    setSelectedPrinter(value);
    onPrinterChange?.(value);
  };

  // إذا لم نكن في Electron، نعرض رسالة
  if (!isElectron) {
    return (
      <div className={cn('flex items-center gap-2 text-muted-foreground', className)}>
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm">الطباعة المباشرة متاحة في تطبيق سطح المكتب فقط</span>
      </div>
    );
  }

  const sizeClasses = {
    sm: 'h-8 text-xs',
    default: 'h-10',
    lg: 'h-12 text-base',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {showLabel && (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Printer className="h-4 w-4" />
          <span className="text-sm font-medium">الطابعة:</span>
        </div>
      )}

      <Select
        value={selectedPrinter || ''}
        onValueChange={handlePrinterChange}
        disabled={isLoading}
      >
        <SelectTrigger
          className={cn(
            'min-w-[200px]',
            sizeClasses[size],
            isLoading && 'opacity-50'
          )}
        >
          <SelectValue placeholder="اختر الطابعة..." />
        </SelectTrigger>
        <SelectContent>
          {printers.length === 0 ? (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              {isLoading ? 'جاري البحث عن الطابعات...' : 'لا توجد طابعات متاحة'}
            </div>
          ) : (
            printers.map((printer) => (
              <SelectItem
                key={printer.name}
                value={printer.name}
                className="flex items-center justify-between"
              >
                <span>{printer.displayName}</span>
                {printer.isDefault && (
                  <span className="mr-2 text-xs text-muted-foreground">(افتراضية)</span>
                )}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      {showRefresh && (
        <Button
          variant="ghost"
          size="icon"
          onClick={fetchPrinters}
          disabled={isLoading}
          className={cn(
            'shrink-0',
            size === 'sm' && 'h-8 w-8',
            size === 'lg' && 'h-12 w-12'
          )}
          title="إعادة تحميل قائمة الطابعات"
        >
          <RefreshCw
            className={cn(
              'h-4 w-4',
              isLoading && 'animate-spin'
            )}
          />
        </Button>
      )}
    </div>
  );
}

export default PrinterSelector;
