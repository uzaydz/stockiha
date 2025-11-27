/**
 * ModernPinInput - مكون إدخال PIN حديث
 * متناسق مع Dark Mode و Light Mode
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface ModernPinInputProps {
  length?: number;
  onComplete: (pin: string) => void;
  disabled?: boolean;
  error?: boolean;
  onClear?: () => void;
  className?: string;
  autoFocus?: boolean;
}

export const ModernPinInput: React.FC<ModernPinInputProps> = ({
  length = 6,
  onComplete,
  disabled = false,
  error = false,
  onClear,
  className,
  autoFocus = true,
}) => {
  const [values, setValues] = useState<string[]>(Array(length).fill(''));
  const [focusIndex, setFocusIndex] = useState(0);
  const [shake, setShake] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus على أول حقل عند التحميل
  useEffect(() => {
    if (autoFocus) {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [autoFocus]);

  // Shake effect عند الخطأ
  useEffect(() => {
    if (error) {
      setShake(true);
      setTimeout(() => {
        setShake(false);
        clearAll();
      }, 500);
    }
  }, [error]);

  const clearAll = useCallback(() => {
    setValues(Array(length).fill(''));
    setFocusIndex(0);
    inputRefs.current[0]?.focus();
    onClear?.();
  }, [length, onClear]);

  const handleChange = useCallback((index: number, value: string) => {
    if (disabled) return;
    
    const digit = value.replace(/\D/g, '').slice(-1);
    
    const newValues = [...values];
    newValues[index] = digit;
    setValues(newValues);

    if (digit) {
      if (index < length - 1) {
        setFocusIndex(index + 1);
        inputRefs.current[index + 1]?.focus();
      }

      if (index === length - 1) {
        const pin = newValues.join('');
        if (pin.length === length) {
          onComplete(pin);
        }
      }
    }
  }, [values, disabled, length, onComplete]);

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === 'Backspace') {
      e.preventDefault();
      const newValues = [...values];
      
      if (values[index]) {
        newValues[index] = '';
        setValues(newValues);
      } else if (index > 0) {
        newValues[index - 1] = '';
        setValues(newValues);
        setFocusIndex(index - 1);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      setFocusIndex(index - 1);
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      setFocusIndex(index + 1);
      inputRefs.current[index + 1]?.focus();
    }
  }, [values, disabled, length]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    if (disabled) return;

    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (pastedData) {
      const newValues = Array(length).fill('');
      pastedData.split('').forEach((digit, i) => {
        newValues[i] = digit;
      });
      setValues(newValues);
      
      if (pastedData.length === length) {
        onComplete(pastedData);
      } else {
        const nextIndex = Math.min(pastedData.length, length - 1);
        setFocusIndex(nextIndex);
        inputRefs.current[nextIndex]?.focus();
      }
    }
  }, [disabled, length, onComplete]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* حقول الإدخال */}
      <div 
        className={cn(
          'flex justify-center gap-2 sm:gap-3 transition-transform',
          shake && 'animate-shake'
        )}
        style={{
          animation: shake ? 'shake 0.5s ease-in-out' : undefined
        }}
      >
        {Array.from({ length }).map((_, index) => (
          <div key={index} className="relative">
            <Input
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={values[index]}
              onChange={e => handleChange(index, e.target.value)}
              onKeyDown={e => handleKeyDown(index, e)}
              onFocus={() => setFocusIndex(index)}
              onPaste={handlePaste}
              disabled={disabled}
              className={cn(
                'h-12 w-10 sm:h-14 sm:w-12 text-center text-lg sm:text-xl font-bold p-0',
                'border-2 rounded-xl transition-all duration-200',
                'focus:ring-2 focus:ring-primary/20',
                values[index] 
                  ? 'border-primary bg-primary/5 dark:bg-primary/10' 
                  : 'border-input bg-background',
                focusIndex === index && !disabled && 'border-primary ring-2 ring-primary/20',
                error && 'border-destructive',
                disabled && 'opacity-50 cursor-not-allowed',
              )}
              autoComplete="off"
            />
            
            {/* نقطة بدلاً من الرقم */}
            {values[index] && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={cn(
                  "w-3 h-3 rounded-full transition-all",
                  error ? "bg-destructive" : "bg-primary"
                )} />
              </div>
            )}
            
            {/* إخفاء النص الفعلي */}
            <style>{`
              input[type="text"]:not(:placeholder-shown) {
                color: transparent;
                caret-color: hsl(var(--primary));
              }
            `}</style>
          </div>
        ))}
      </div>

      {/* مؤشر التقدم */}
      <div className="flex justify-center gap-1.5">
        {values.map((digit, index) => (
          <div
            key={index}
            className={cn(
              'h-1 w-6 sm:w-8 rounded-full transition-all duration-300',
              digit ? 'bg-primary' : 'bg-muted'
            )}
          />
        ))}
      </div>

      {/* Shake animation style */}
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
    </div>
  );
};

export default ModernPinInput;
