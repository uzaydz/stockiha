/**
 * QuickStaffSwitchModern - تبديل الموظف السريع
 * تصميم عصري متناسق مع Dark Mode و Light Mode
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { 
  Users, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  RefreshCcw,
  KeyRound,
  UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useStaffSession } from '@/context/StaffSessionContext';
import { useAuth } from '@/context/AuthContext';
import { staffService } from '@/services/staffService';
import { saveStaffPinOffline, verifyStaffPinOffline } from '@/lib/offline/staffCredentials';

interface QuickStaffSwitchModernProps {
  iconOnly?: boolean;
  className?: string;
  disabled?: boolean;
  onSwitch?: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
}

type SwitchState = 'idle' | 'loading' | 'success' | 'error';

const QuickStaffSwitchModern: React.FC<QuickStaffSwitchModernProps> = ({
  iconOnly = false,
  className,
  disabled = false,
  onSwitch,
  variant = 'outline',
  size = 'default',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<SwitchState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [shake, setShake] = useState(false);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { setStaffSession, setAdminMode, currentStaff } = useStaffSession();
  const { organization } = useAuth();

  // إعادة تعيين عند الإغلاق
  useEffect(() => {
    if (!isOpen) {
      setState('idle');
      setError(null);
      setPin(['', '', '', '', '', '']);
      setShake(false);
    }
  }, [isOpen]);

  // التركيز على أول حقل عند الفتح
  useEffect(() => {
    if (isOpen && state === 'idle') {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [isOpen, state]);

  // معالجة إدخال PIN
  const handlePinChange = useCallback((index: number, value: string) => {
    if (state === 'loading') return;
    const digit = value.replace(/\D/g, '').slice(-1);
    
    const newPin = [...pin];
    newPin[index] = digit;
    setPin(newPin);
    setError(null);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // التحقق التلقائي عند الاكتمال
    if (index === 5 && digit) {
      const fullPin = newPin.join('');
      if (fullPin.length === 6) {
        handleVerifyPin(fullPin);
      }
    }
  }, [pin, state]);

  // معالجة الحذف
  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }, [pin]);

  // التحقق من PIN
  const handleVerifyPin = useCallback(async (pinCode: string) => {
    setState('loading');
    setError(null);

    try {
      // ✅ Offline-first دائماً
      const result = await staffService.verifyPin(pinCode, organization?.id);

      if (result.success && result.staff) {
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
        handleError(result.error || 'كود PIN غير صحيح');
      }
    } catch (err: any) {
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
      handleError(err.message || 'حدث خطأ أثناء التحقق');
    }
  }, [organization?.id]);

  const handleError = (message: string) => {
    setState('error');
    setError(message);
    setShake(true);
    setTimeout(() => {
      setShake(false);
      setPin(['', '', '', '', '', '']);
      setState('idle');
      inputRefs.current[0]?.focus();
    }, 600);
  };

  const handleSuccess = (staff: any, isOffline: boolean) => {
    setState('success');
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
    }, 800);
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return iconOnly ? 'h-8 w-8' : 'h-8 px-3 text-sm';
      case 'lg': return iconOnly ? 'h-11 w-11' : 'h-11 px-5';
      default: return iconOnly ? 'h-9 w-9' : 'h-9 px-4';
    }
  };

  const filledCount = pin.filter(d => d !== '').length;

  return (
    <>
      <Button
        variant={variant}
        onClick={() => setIsOpen(true)}
        className={cn(
          'gap-2 transition-all duration-200',
          getSizeClasses(),
          iconOnly && 'p-0',
          className
        )}
        disabled={disabled}
      >
        <RefreshCcw className={cn('h-4 w-4', size === 'sm' && 'h-3.5 w-3.5')} />
        {!iconOnly && <span>تبديل</span>}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent 
          className={cn(
            "sm:max-w-sm p-0 gap-0 overflow-hidden",
            "bg-background border-border"
          )}
        >
          {/* Header */}
          <DialogHeader className="p-6 pb-4 text-center border-b border-border bg-muted/30">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              {state === 'success' ? (
                <UserCheck className="h-7 w-7 text-green-500" />
              ) : (
                <KeyRound className="h-7 w-7 text-primary" />
              )}
            </div>
            <DialogTitle className="text-lg font-semibold">
              {state === 'success' ? 'تم بنجاح!' : 'تبديل الموظف'}
            </DialogTitle>
            {currentStaff && state !== 'success' && (
              <p className="text-sm text-muted-foreground mt-1">
                الموظف الحالي: <span className="font-medium text-foreground">{currentStaff.staff_name}</span>
              </p>
            )}
          </DialogHeader>

          {/* Content */}
          <div className="p-6">
            {state === 'success' ? (
              <div className="flex flex-col items-center py-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 mb-3">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
                <p className="text-green-600 dark:text-green-400 font-medium">تم التبديل بنجاح</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* رسالة الخطأ */}
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* حقول PIN */}
                <div>
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    أدخل رمز PIN المكون من 6 أرقام
                  </p>
                  
                  <div 
                    className={cn(
                      "flex justify-center gap-2 transition-transform",
                      shake && "animate-shake"
                    )}
                    style={{
                      animation: shake ? 'shake 0.5s ease-in-out' : undefined
                    }}
                  >
                    {pin.map((digit, index) => (
                      <div key={index} className="relative">
                        <Input
                          ref={(el) => { inputRefs.current[index] = el; }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handlePinChange(index, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(index, e)}
                          disabled={state === 'loading'}
                          className={cn(
                            "h-12 w-10 text-center text-lg font-semibold p-0",
                            "border-2 rounded-lg transition-all duration-200",
                            "focus:ring-2 focus:ring-primary/20 focus:border-primary",
                            digit 
                              ? "border-primary bg-primary/5" 
                              : "border-input bg-background",
                            state === 'error' && "border-destructive"
                          )}
                        />
                        {/* Dot indicator */}
                        {digit && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                          </div>
                        )}
                        {/* Hide actual text with dot */}
                        <style>{`
                          input[type="text"]:not(:placeholder-shown) {
                            color: transparent;
                            caret-color: hsl(var(--primary));
                          }
                        `}</style>
                      </div>
                    ))}
                  </div>

                  {/* Progress indicator */}
                  <div className="flex justify-center gap-1.5 mt-4">
                    {pin.map((digit, i) => (
                      <div 
                        key={i} 
                        className={cn(
                          "h-1 w-6 rounded-full transition-all duration-300",
                          digit ? "bg-primary" : "bg-muted"
                        )}
                      />
                    ))}
                  </div>
                </div>

                {/* Loading state */}
                {state === 'loading' && (
                  <div className="flex items-center justify-center gap-2 py-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">جاري التحقق...</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {state !== 'success' && (
            <div className="p-4 pt-0">
              <Button
                variant="ghost"
                onClick={() => setIsOpen(false)}
                className="w-full"
                disabled={state === 'loading'}
              >
                إلغاء
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </>
  );
};

export default QuickStaffSwitchModern;
