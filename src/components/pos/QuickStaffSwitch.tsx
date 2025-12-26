/**
 * QuickStaffSwitch - تبديل الموظف السريع
 * 
 * يسمح بتبديل الموظف بسرعة عن طريق إدخال PIN
 * بدون الحاجة للذهاب لصفحة تسجيل الموظفين
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Users, Loader2, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useStaffSession } from '@/context/StaffSessionContext';
import { useAuth } from '@/context/AuthContext';
import { staffService } from '@/services/staffService';
import { saveStaffPinOffline, verifyStaffPinOffline } from '@/lib/offline/staffCredentials';

interface QuickStaffSwitchProps {
  /** إظهار الزر كأيقونة فقط */
  iconOnly?: boolean;
  /** CSS classes إضافية */
  className?: string;
  /** تفعيل/إلغاء الزر */
  disabled?: boolean;
  /** callback بعد تبديل الموظف بنجاح */
  onSwitch?: () => void;
}

const QuickStaffSwitch: React.FC<QuickStaffSwitchProps> = ({
  iconOnly = false,
  className,
  disabled = false,
  onSwitch,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { setStaffSession, setAdminMode, currentStaff } = useStaffSession();
  const { organization } = useAuth();

  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // التركيز على أول حقل عند فتح الـ Dialog
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRefs[0].current?.focus();
      }, 100);
    } else {
      // إعادة تعيين الحالة عند الإغلاق
      setPin(['', '', '', '', '', '']);
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  // معالجة إدخال PIN
  const handlePinChange = useCallback(
    (index: number, value: string) => {
      if (value && !/^\d$/.test(value)) return;

      const newPin = [...pin];
      newPin[index] = value;
      setPin(newPin);
      setError(null);

      // الانتقال للحقل التالي
      if (value && index < 5) {
        inputRefs[index + 1].current?.focus();
      }

      // التحقق التلقائي عند إدخال 6 أرقام
      if (index === 5 && value) {
        const fullPin = newPin.join('');
        if (fullPin.length === 6) {
          handleVerifyPin(fullPin);
        }
      }
    },
    [pin]
  );

  // معالجة حذف الرقم
  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && !pin[index] && index > 0) {
        inputRefs[index - 1].current?.focus();
      }
    },
    [pin]
  );

  // التحقق من PIN
  const handleVerifyPin = useCallback(
    async (pinCode: string) => {
      setIsLoading(true);
      setError(null);

      try {
        // ✅ Offline-first دائماً
        const result = await staffService.verifyPin(pinCode, organization?.id);

        if (result.success && result.staff) {
          // حفظ للأوفلاين (اختياري) عند توفر إنترنت
          if (organization?.id && navigator.onLine) {
            try {
              await saveStaffPinOffline({
                staffId: result.staff.id,
                organizationId: organization.id,
                staffName: result.staff.staff_name,
                pin: pinCode,
                permissions: result.staff.permissions,
                isActive: result.staff.is_active,
              });
            } catch (err) {
              console.warn('[QuickStaffSwitch] Failed to save offline PIN:', err);
            }
          }

          handleSuccess(result.staff, !navigator.onLine);
        } else {
          setError(result.error || 'كود PIN غير صحيح');
          setPin(['', '', '', '', '', '']);
          inputRefs[0].current?.focus();
        }
      } catch (err: any) {
        // محاولة احتياطية: staff_pins مباشرة
        if (organization?.id) {
          const offlineResult = await verifyStaffPinOffline({
            organizationId: organization.id,
            pin: pinCode,
          });

          if (offlineResult.success && offlineResult.staff) {
            handleSuccess(offlineResult.staff as any, true);
            return;
          }
        }

        setError(err.message || 'حدث خطأ أثناء التحقق');
        setPin(['', '', '', '', '', '']);
        inputRefs[0].current?.focus();
      } finally {
        setIsLoading(false);
      }
    },
    [organization?.id]
  );

  // معالجة النجاح
  const handleSuccess = (staff: any, isOffline: boolean) => {
    setSuccess(true);
    setStaffSession({
      id: staff.id,
      organization_id: staff.organization_id,
      staff_name: staff.staff_name,
      permissions: staff.permissions || {},
      is_active: staff.is_active ?? true,
      created_at: staff.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_login: new Date().toISOString(),
    });
    setAdminMode(false);

    toast.success(`مرحباً ${staff.staff_name}!${isOffline ? ' (أوفلاين)' : ''}`);

    setTimeout(() => {
      setIsOpen(false);
      onSwitch?.();
    }, 1000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size={iconOnly ? 'icon' : 'default'}
          className={cn(
            'gap-2',
            iconOnly && 'h-9 w-9',
            className
          )}
          disabled={disabled}
        >
          <Users className="h-4 w-4" />
          {!iconOnly && <span>تبديل الموظف</span>}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader className="text-center">
          <DialogTitle className="text-xl">تبديل الموظف</DialogTitle>
          <DialogDescription>
            {currentStaff ? (
              <>الموظف الحالي: <span className="font-semibold">{currentStaff.staff_name}</span></>
            ) : (
              'أدخل كود PIN للموظف الجديد'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* حقول PIN */}
          <div className="flex justify-center gap-2">
            {pin.map((digit, index) => (
              <Input
                key={index}
                ref={inputRefs[index]}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handlePinChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={isLoading || success}
                className={cn(
                  'h-14 w-12 text-center text-2xl font-bold',
                  error && 'border-red-500 focus:ring-red-500',
                  success && 'border-green-500 bg-green-50'
                )}
              />
            ))}
          </div>

          {/* حالة التحميل */}
          {isLoading && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>جاري التحقق...</span>
            </div>
          )}

          {/* رسالة الخطأ */}
          {error && (
            <div className="flex items-center justify-center gap-2 text-red-500 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {/* رسالة النجاح */}
          {success && (
            <div className="flex items-center justify-center gap-2 text-green-500">
              <CheckCircle2 className="h-5 w-5" />
              <span>تم تبديل الموظف بنجاح!</span>
            </div>
          )}

          {/* زر الإلغاء */}
          <div className="flex justify-center">
            <Button
              variant="ghost"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              إلغاء
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickStaffSwitch;
