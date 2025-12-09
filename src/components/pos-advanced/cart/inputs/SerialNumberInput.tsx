/**
 * 🔢 Serial Number Input Component
 *
 * مكون إدخال الرقم التسلسلي للمنتجات التي تتطلب تتبع الأرقام التسلسلية
 * يدعم المسح بالباركود والإدخال اليدوي والتحقق من الأرقام
 */

import { memo, useState, useCallback, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Hash,
  ScanBarcode,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Shield,
  Smartphone,
  Loader2,
  Plus,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SerialInfo {
  id: string;
  serial_number: string;
  status: 'available' | 'sold' | 'reserved' | 'returned' | 'defective';
  imei?: string;
  mac_address?: string;
  warranty_end_date?: string;
}

interface SerialNumberInputProps {
  productId: string;
  productName: string;
  quantity: number;
  selectedSerials: string[];
  availableSerials?: SerialInfo[];
  onSerialsChange: (serials: string[]) => void;
  onValidateSerial?: (serial: string) => Promise<{ valid: boolean; message?: string; info?: SerialInfo }>;
  requireSerial?: boolean;
  supportsIMEI?: boolean;
  disabled?: boolean;
  className?: string;
}

// التحقق من صيغة IMEI (15 رقم)
const isValidIMEI = (imei: string): boolean => {
  const cleaned = imei.replace(/[^0-9]/g, '');
  if (cleaned.length !== 15) return false;

  // Luhn algorithm check
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let digit = parseInt(cleaned[i], 10);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(cleaned[14], 10);
};

// التحقق من صيغة MAC Address
const isValidMAC = (mac: string): boolean => {
  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
  return macRegex.test(mac);
};

const SerialNumberInput = memo<SerialNumberInputProps>(({
  productId,
  productName,
  quantity,
  selectedSerials,
  availableSerials = [],
  onSerialsChange,
  onValidateSerial,
  requireSerial = true,
  supportsIMEI = false,
  disabled = false,
  className,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [scanMode, setScanMode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // التركيز على حقل الإدخال في وضع المسح
  useEffect(() => {
    if (scanMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [scanMode]);

  // التحقق من الرقم التسلسلي
  const validateAndAddSerial = useCallback(async (serial: string) => {
    const trimmedSerial = serial.trim().toUpperCase();

    if (!trimmedSerial) {
      setValidationError('الرجاء إدخال الرقم التسلسلي');
      return false;
    }

    // التحقق من عدم التكرار
    if (selectedSerials.includes(trimmedSerial)) {
      setValidationError('هذا الرقم التسلسلي مضاف بالفعل');
      return false;
    }

    // التحقق من العدد المطلوب
    if (selectedSerials.length >= quantity) {
      setValidationError(`تم إضافة الحد الأقصى (${quantity}) من الأرقام التسلسلية`);
      return false;
    }

    // التحقق من IMEI إذا كان مدعوماً
    if (supportsIMEI && trimmedSerial.length === 15) {
      if (!isValidIMEI(trimmedSerial)) {
        setValidationError('رقم IMEI غير صحيح');
        return false;
      }
    }

    // التحقق من القائمة المتاحة إذا وجدت
    if (availableSerials.length > 0) {
      const found = availableSerials.find(
        s => s.serial_number === trimmedSerial ||
          s.imei === trimmedSerial ||
          s.mac_address === trimmedSerial
      );

      if (!found) {
        setValidationError('الرقم التسلسلي غير موجود في النظام');
        return false;
      }

      if (found.status !== 'available') {
        const statusLabels: Record<string, string> = {
          sold: 'مباع',
          reserved: 'محجوز',
          returned: 'مرتجع',
          defective: 'معيب'
        };
        setValidationError(`هذا الرقم ${statusLabels[found.status] || 'غير متاح'}`);
        return false;
      }
    }

    // التحقق من الخادم إذا كانت الدالة متوفرة
    if (onValidateSerial) {
      setIsValidating(true);
      try {
        const result = await onValidateSerial(trimmedSerial);
        if (!result.valid) {
          setValidationError(result.message || 'الرقم التسلسلي غير صالح');
          return false;
        }
      } catch (error) {
        setValidationError('خطأ في التحقق من الرقم التسلسلي');
        return false;
      } finally {
        setIsValidating(false);
      }
    }

    // إضافة الرقم
    onSerialsChange([...selectedSerials, trimmedSerial]);
    setInputValue('');
    setValidationError(null);
    return true;
  }, [selectedSerials, quantity, supportsIMEI, availableSerials, onValidateSerial, onSerialsChange]);

  // إزالة رقم تسلسلي
  const removeSerial = useCallback((serial: string) => {
    onSerialsChange(selectedSerials.filter(s => s !== serial));
  }, [selectedSerials, onSerialsChange]);

  // معالجة ضغط Enter
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      validateAndAddSerial(inputValue);
    }
  }, [inputValue, validateAndAddSerial]);

  // معالجة المسح بالباركود (إدخال سريع)
  const handleScanInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setValidationError(null);

    // إذا كان الإدخال سريعاً (من الماسح)، حاول التحقق تلقائياً
    if (scanMode && value.length >= 10) {
      setTimeout(() => {
        if (inputRef.current?.value === value) {
          validateAndAddSerial(value);
        }
      }, 100);
    }
  }, [scanMode, validateAndAddSerial]);

  // عدد الأرقام المتبقية
  const remainingCount = quantity - selectedSerials.length;
  const isComplete = remainingCount === 0;

  return (
    <div className={cn('space-y-3', className)}>
      {/* العنوان مع الحالة */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          {supportsIMEI ? (
            <Smartphone className="w-4 h-4" />
          ) : (
            <Hash className="w-4 h-4" />
          )}
          {supportsIMEI ? 'أرقام IMEI' : 'الأرقام التسلسلية'}
          {requireSerial && <span className="text-red-500">*</span>}
        </Label>

        <Badge variant={isComplete ? 'default' : 'secondary'} className={cn(
          isComplete && 'bg-green-500'
        )}>
          {selectedSerials.length} / {quantity}
        </Badge>
      </div>

      {/* حقل الإدخال */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={handleScanInput}
            onKeyDown={handleKeyDown}
            placeholder={supportsIMEI ? "أدخل الرقم التسلسلي أو IMEI..." : "أدخل الرقم التسلسلي..."}
            disabled={disabled || isComplete}
            className={cn(
              validationError && 'border-red-300 focus:border-red-500',
              scanMode && 'bg-blue-50 border-blue-300'
            )}
          />
          {isValidating && (
            <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={scanMode ? 'default' : 'outline'}
                size="icon"
                onClick={() => setScanMode(!scanMode)}
                disabled={disabled || isComplete}
              >
                <ScanBarcode className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {scanMode ? 'إيقاف وضع المسح' : 'تفعيل وضع المسح'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => validateAndAddSerial(inputValue)}
          disabled={disabled || isComplete || !inputValue.trim()}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* رسالة الخطأ */}
      {validationError && (
        <div className="flex items-center gap-2 text-xs text-red-600">
          <XCircle className="w-3 h-3" />
          <span>{validationError}</span>
        </div>
      )}

      {/* الأرقام المضافة */}
      {selectedSerials.length > 0 && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">الأرقام المضافة:</Label>
          <div className="flex flex-wrap gap-2">
            {selectedSerials.map((serial, idx) => {
              const serialInfo = availableSerials.find(
                s => s.serial_number === serial || s.imei === serial
              );
              const hasWarranty = serialInfo?.warranty_end_date;

              return (
                <Badge
                  key={serial}
                  variant="secondary"
                  className="flex items-center gap-1 px-2 py-1"
                >
                  <span className="text-xs font-mono">{serial}</span>
                  {hasWarranty && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Shield className="w-3 h-3 text-green-500" />
                        </TooltipTrigger>
                        <TooltipContent>
                          ضمان حتى: {new Date(hasWarranty).toLocaleDateString('ar-DZ')}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  <button
                    type="button"
                    onClick={() => removeSerial(serial)}
                    className="hover:text-red-500 transition-colors"
                    disabled={disabled}
                  >
                    <XCircle className="w-3 h-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {/* تحذير إذا لم تكتمل الأرقام المطلوبة */}
      {requireSerial && !isComplete && (
        <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
          <AlertTriangle className="w-3 h-3" />
          <span>
            يجب إدخال {remainingCount} {remainingCount === 1 ? 'رقم تسلسلي' : 'أرقام تسلسلية'} إضافية
          </span>
        </div>
      )}

      {/* زر اختيار من القائمة إذا كانت متوفرة */}
      {availableSerials.length > 0 && !isComplete && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={() => setIsDialogOpen(true)}
          disabled={disabled}
        >
          اختر من الأرقام المتاحة ({availableSerials.filter(s => s.status === 'available').length})
        </Button>
      )}

      {/* مربع حوار اختيار الأرقام */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>اختر الأرقام التسلسلية</DialogTitle>
          </DialogHeader>

          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {availableSerials
              .filter(s => s.status === 'available' && !selectedSerials.includes(s.serial_number))
              .map((serial) => (
                <div
                  key={serial.id}
                  className={cn(
                    "flex items-center justify-between p-2 border rounded cursor-pointer hover:bg-slate-50 transition-colors",
                    selectedSerials.length >= quantity && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={() => {
                    if (selectedSerials.length < quantity) {
                      onSerialsChange([...selectedSerials, serial.serial_number]);
                    }
                  }}
                >
                  <div className="flex flex-col">
                    <span className="font-mono text-sm">{serial.serial_number}</span>
                    {serial.imei && (
                      <span className="text-xs text-muted-foreground">IMEI: {serial.imei}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {serial.warranty_end_date && (
                      <Shield className="w-4 h-4 text-green-500" />
                    )}
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  </div>
                </div>
              ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

SerialNumberInput.displayName = 'SerialNumberInput';

export default SerialNumberInput;
