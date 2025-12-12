/**
 * 🔢 Serial Number Input Component - محدث للعمل Offline
 *
 * مكون إدخال الرقم التسلسلي للمنتجات التي تتطلب تتبع الأرقام التسلسلية
 * يدعم المسح بالباركود والإدخال اليدوي والتحقق من الأرقام
 *
 * ⚡ v5.0: يعمل 100% offline مع نظام الحجز (Reservation)
 * - حجز تلقائي عند اختيار serial
 * - تحرير تلقائي عند الإزالة
 * - معالجة التعارضات (جهاز آخر حجز نفس الـ serial)
 *
 * @version 5.0.0
 * @date 2025-12-12
 */

import { memo, useState, useCallback, useEffect, useRef } from 'react';
import { usePowerSync } from '@powersync/react';
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
  Lock,
  WifiOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { LocalSerialService, LocalSerial } from '@/services/local';

export interface SerialInfo {
  id: string;
  serial_number: string;
  status: 'available' | 'sold' | 'reserved' | 'returned' | 'defective';
  imei?: string;
  mac_address?: string;
  warranty_end_date?: string;
  reserved_by_device?: string;
  is_reservation_expired?: boolean;
}

interface SerialNumberInputProps {
  productId: string;
  productName: string;
  organizationId: string;
  quantity: number;
  selectedSerials: string[];
  colorId?: string;
  sizeId?: string;
  orderDraftId: string; // معرف مسودة الطلب للحجز
  onSerialsChange: (serials: string[]) => void;
  onSerialReserved?: (serialId: string, serialNumber: string) => void;
  onSerialReleased?: (serialId: string, serialNumber: string) => void;
  onConflict?: (serialNumber: string, conflictType: 'reserved' | 'sold') => void;
  requireSerial?: boolean;
  supportsIMEI?: boolean;
  disabled?: boolean;
  className?: string;
  reservationMinutes?: number;
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
  organizationId,
  quantity,
  selectedSerials,
  colorId,
  sizeId,
  orderDraftId,
  onSerialsChange,
  onSerialReserved,
  onSerialReleased,
  onConflict,
  requireSerial = true,
  supportsIMEI = false,
  disabled = false,
  className,
  reservationMinutes = 30,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [scanMode, setScanMode] = useState(false);
  const [availableSerials, setAvailableSerials] = useState<LocalSerial[]>([]);
  const [isLoadingSerials, setIsLoadingSerials] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ⚡ خدمة الأرقام التسلسلية المحلية
  const powerSync = usePowerSync();
  const localSerialService = new LocalSerialService(powerSync);
  const deviceId = localSerialService.getDeviceId();

  // جلب الأرقام التسلسلية المتاحة محلياً
  const loadAvailableSerials = useCallback(async () => {
    setIsLoadingSerials(true);
    try {
      const serials = await localSerialService.getAvailableSerials(
        productId,
        organizationId,
        { colorId, sizeId }
      );
      setAvailableSerials(serials);
    } catch (error) {
      console.error('❌ خطأ في جلب الأرقام التسلسلية:', error);
    } finally {
      setIsLoadingSerials(false);
    }
  }, [productId, organizationId, colorId, sizeId]);

  // جلب الأرقام عند تحميل المكون
  useEffect(() => {
    loadAvailableSerials();
  }, [loadAvailableSerials]);

  // التركيز على حقل الإدخال في وضع المسح
  useEffect(() => {
    if (scanMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [scanMode]);

  // التحقق من الرقم التسلسلي وحجزه
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

    setIsValidating(true);
    setValidationError(null);

    try {
      // ⚡ البحث عن الرقم التسلسلي محلياً
      const serialInfo = await localSerialService.findBySerialNumber(trimmedSerial, organizationId);

      if (!serialInfo) {
        setValidationError('الرقم التسلسلي غير موجود في النظام');
        return false;
      }

      // التحقق من الحالة
      if (serialInfo.status === 'sold') {
        setValidationError('هذا الرقم التسلسلي مُباع مسبقاً');
        onConflict?.(trimmedSerial, 'sold');
        return false;
      }

      if (serialInfo.status === 'reserved') {
        // التحقق: هل انتهى الحجز؟
        if (!serialInfo.is_reservation_expired) {
          // هل هذا الجهاز هو من حجزه؟
          if (serialInfo.reserved_by_device !== deviceId) {
            setValidationError('هذا الرقم التسلسلي محجوز من جهاز آخر');
            onConflict?.(trimmedSerial, 'reserved');
            return false;
          }
        }
      }

      if (serialInfo.status === 'defective') {
        setValidationError('هذا الرقم التسلسلي معيب');
        return false;
      }

      // ⚡ حجز الرقم التسلسلي محلياً
      console.log(`🔒 [SerialNumberInput] حجز الرقم: ${trimmedSerial}`);

      const reserveResult = await localSerialService.reserveSerial({
        serial_id: serialInfo.id,
        organization_id: organizationId,
        order_draft_id: orderDraftId,
        reservation_minutes: reservationMinutes
      });

      if (!reserveResult.success) {
        if (reserveResult.conflict) {
          if (reserveResult.conflict.conflict_type === 'already_reserved') {
            setValidationError('هذا الرقم محجوز من جهاز آخر');
            onConflict?.(trimmedSerial, 'reserved');
          } else if (reserveResult.conflict.conflict_type === 'already_sold') {
            setValidationError('هذا الرقم مُباع مسبقاً');
            onConflict?.(trimmedSerial, 'sold');
          }
        } else {
          setValidationError(reserveResult.error || 'فشل في حجز الرقم التسلسلي');
        }
        return false;
      }

      // إضافة الرقم للقائمة
      onSerialsChange([...selectedSerials, trimmedSerial]);
      onSerialReserved?.(serialInfo.id, trimmedSerial);

      setInputValue('');
      setValidationError(null);

      toast.success(`تم حجز الرقم التسلسلي: ${trimmedSerial}`, {
        description: `صالح لمدة ${reservationMinutes} دقيقة`
      });

      // تحديث قائمة المتاح
      loadAvailableSerials();

      return true;

    } catch (error: any) {
      console.error('❌ خطأ في التحقق من الرقم التسلسلي:', error);
      setValidationError('حدث خطأ أثناء التحقق');
      return false;
    } finally {
      setIsValidating(false);
    }
  }, [
    selectedSerials, quantity, supportsIMEI, organizationId,
    orderDraftId, reservationMinutes, deviceId, onSerialsChange,
    onSerialReserved, onConflict, loadAvailableSerials
  ]);

  // إزالة رقم تسلسلي وتحرير الحجز
  const removeSerial = useCallback(async (serial: string) => {
    console.log(`🔓 [SerialNumberInput] تحرير الرقم: ${serial}`);

    try {
      // تحرير الحجز محلياً
      const releaseResult = await localSerialService.releaseSerial(serial, organizationId);

      if (releaseResult.success) {
        // البحث عن معرف الـ serial
        const serialInfo = await localSerialService.findBySerialNumber(serial, organizationId);
        if (serialInfo) {
          onSerialReleased?.(serialInfo.id, serial);
        }
      }
    } catch (error) {
      console.error('❌ خطأ في تحرير الحجز:', error);
    }

    // إزالة من القائمة
    onSerialsChange(selectedSerials.filter(s => s !== serial));

    // تحديث قائمة المتاح
    loadAvailableSerials();
  }, [selectedSerials, organizationId, onSerialsChange, onSerialReleased, loadAvailableSerials]);

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

  // اختيار رقم من القائمة المتاحة
  const selectSerialFromList = useCallback(async (serial: LocalSerial) => {
    if (selectedSerials.length >= quantity) return;

    const success = await validateAndAddSerial(serial.serial_number);
    if (success) {
      // إغلاق الحوار إذا اكتملت الأرقام
      if (selectedSerials.length + 1 >= quantity) {
        setIsDialogOpen(false);
      }
    }
  }, [selectedSerials.length, quantity, validateAndAddSerial]);

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
          {/* مؤشر الوضع المحلي */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <WifiOff className="w-3 h-3 text-green-500" />
              </TooltipTrigger>
              <TooltipContent>يعمل offline</TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
          disabled={disabled || isComplete || !inputValue.trim() || isValidating}
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

      {/* الأرقام المضافة (المحجوزة) */}
      {selectedSerials.length > 0 && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <Lock className="w-3 h-3" />
            الأرقام المحجوزة:
          </Label>
          <div className="flex flex-wrap gap-2">
            {selectedSerials.map((serial) => {
              const serialInfo = availableSerials.find(
                s => s.serial_number === serial || s.imei === serial
              );
              const hasWarranty = serialInfo?.warranty_end_date;

              return (
                <Badge
                  key={serial}
                  variant="secondary"
                  className="flex items-center gap-1 px-2 py-1 bg-blue-50 border-blue-200"
                >
                  <Lock className="w-3 h-3 text-blue-500" />
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

      {/* زر اختيار من القائمة */}
      {!isComplete && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={() => {
            loadAvailableSerials();
            setIsDialogOpen(true);
          }}
          disabled={disabled || isLoadingSerials}
        >
          {isLoadingSerials ? (
            <Loader2 className="w-3 h-3 animate-spin ml-2" />
          ) : null}
          اختر من الأرقام المتاحة ({availableSerials.length})
        </Button>
      )}

      {/* مربع حوار اختيار الأرقام */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              اختر الأرقام التسلسلية
              <Badge variant="outline" className="text-xs">
                {availableSerials.length} متاح
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {isLoadingSerials ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : availableSerials.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد أرقام تسلسلية متاحة
              </div>
            ) : (
              availableSerials
                .filter(s => !selectedSerials.includes(s.serial_number))
                .map((serial) => (
                  <div
                    key={serial.id}
                    className={cn(
                      "flex items-center justify-between p-3 border rounded cursor-pointer hover:bg-slate-50 transition-colors",
                      selectedSerials.length >= quantity && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => selectSerialFromList(serial)}
                  >
                    <div className="flex flex-col">
                      <span className="font-mono text-sm font-medium">{serial.serial_number}</span>
                      {serial.imei && serial.imei !== serial.serial_number && (
                        <span className="text-xs text-muted-foreground">IMEI: {serial.imei}</span>
                      )}
                      {serial.mac_address && (
                        <span className="text-xs text-muted-foreground">MAC: {serial.mac_address}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {serial.warranty_end_date && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Shield className="w-4 h-4 text-green-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              ضمان حتى: {new Date(serial.warranty_end_date).toLocaleDateString('ar-DZ')}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    </div>
                  </div>
                ))
            )}
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
