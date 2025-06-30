import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calculator as CalculatorIcon, Delete, Divide, X, Minus, Plus, Equal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalculatorProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const CalculatorComponent: React.FC<CalculatorProps> = ({ isOpen, onOpenChange }) => {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const reset = useCallback(() => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  }, []);

  const calculate = useCallback((firstValue: number, secondValue: number, operation: string): number => {
    switch (operation) {
      case '+':
        return firstValue + secondValue;
      case '-':
        return firstValue - secondValue;
      case '*':
        return firstValue * secondValue;
      case '/':
        return firstValue / secondValue;
      case '=':
        return secondValue;
      default:
        return secondValue;
    }
  }, []);

  const inputNumber = useCallback((num: string) => {
    if (waitingForOperand) {
      setDisplay(num);
      setWaitingForOperand(false);
    } else {
      setDisplay(prev => prev === '0' ? num : prev + num);
    }
  }, [waitingForOperand]);

  const inputDecimal = useCallback(() => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
    } else {
      setDisplay(prev => prev.indexOf('.') === -1 ? prev + '.' : prev);
    }
  }, [waitingForOperand]);

  const performOperation = useCallback((nextOperation: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue || 0;
      const newValue = calculate(currentValue, inputValue, operation);

      setDisplay(String(newValue));
      setPreviousValue(newValue);
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  }, [display, previousValue, operation, calculate]);

  const handleEqual = useCallback(() => {
    const inputValue = parseFloat(display);

    if (previousValue !== null && operation) {
      const newValue = calculate(previousValue, inputValue, operation);
      setDisplay(String(newValue));
      setPreviousValue(null);
      setOperation(null);
      setWaitingForOperand(true);
    }
  }, [display, previousValue, operation, calculate]);

  const backspace = useCallback(() => {
    setDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
  }, []);

  // إعادة تعيين الآلة الحاسبة عند فتحها
  useEffect(() => {
    if (isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  // معالجة أحداث لوحة المفاتيح
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // منع التداخل مع اختصارات المتصفح
      if (event.ctrlKey || event.altKey || event.metaKey) return;

      const key = event.key;

      // الأرقام
      if (/^[0-9]$/.test(key)) {
        event.preventDefault();
        inputNumber(key);
        return;
      }

      // العمليات الحسابية
      switch (key) {
        case '+':
          event.preventDefault();
          performOperation('+');
          break;
        case '-':
          event.preventDefault();
          performOperation('-');
          break;
        case '*':
          event.preventDefault();
          performOperation('*');
          break;
        case '/':
          event.preventDefault();
          performOperation('/');
          break;
        case '=':
        case 'Enter':
          event.preventDefault();
          handleEqual();
          break;
        case '.':
          event.preventDefault();
          inputDecimal();
          break;
        case 'c':
        case 'C':
          event.preventDefault();
          reset();
          break;
        case 'Backspace':
          event.preventDefault();
          backspace();
          break;
        case 'Escape':
          event.preventDefault();
          onOpenChange(false);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, inputNumber, performOperation, handleEqual, inputDecimal, reset, backspace, onOpenChange]);

  // تنسيق العرض لإظهار الأرقام بطريقة جميلة
  const formatDisplay = useCallback((value: string) => {
    if (value.includes('.')) {
      const parts = value.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return parts.join('.');
    }
    return value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }, []);

  const ButtonCalculator = React.memo(({ 
    children, 
    onClick, 
    variant = 'default',
    className = ''
  }: { 
    children: React.ReactNode; 
    onClick: () => void; 
    variant?: 'default' | 'operator' | 'equals' | 'clear';
    className?: string;
  }) => {
    const baseClasses = "h-12 text-lg font-semibold border transition-all duration-200 hover:scale-105 active:scale-95";
    
    const variantClasses = {
      default: "bg-white hover:bg-gray-50 border-gray-300 text-gray-900",
      operator: "bg-blue-500 hover:bg-blue-600 border-blue-600 text-white",
      equals: "bg-green-500 hover:bg-green-600 border-green-600 text-white",
      clear: "bg-red-500 hover:bg-red-600 border-red-600 text-white"
    };

    return (
      <Button
        onClick={onClick}
        className={cn(baseClasses, variantClasses[variant], className)}
        variant="outline"
      >
        {children}
      </Button>
    );
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-md" 
        dir="ltr"
        tabIndex={-1}
        onOpenAutoFocus={(e) => {
          // التأكد من أن الـ dialog يحصل على focus
          e.preventDefault();
          const content = e.currentTarget as HTMLElement;
          setTimeout(() => content.focus(), 0);
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" dir="rtl">
            <CalculatorIcon className="h-5 w-5" />
            آلة حاسبة
          </DialogTitle>
          <DialogDescription className="text-center" dir="rtl">
            استخدم الأزرار أو لوحة المفاتيح للحساب
          </DialogDescription>
        </DialogHeader>

        <Card className="p-4">
          {/* شاشة العرض */}
          <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border">
            <div className="text-right text-2xl font-mono font-bold text-gray-900 dark:text-gray-100 min-h-[2rem] overflow-hidden">
              {formatDisplay(display)}
            </div>
            {operation && previousValue !== null && (
              <div className="text-right text-sm text-gray-500 mt-1">
                {formatDisplay(String(previousValue))} {operation}
              </div>
            )}
          </div>

          {/* أزرار الآلة الحاسبة */}
          <div className="grid grid-cols-4 gap-2">
            {/* الصف الأول */}
            <ButtonCalculator onClick={reset} variant="clear">
              C
            </ButtonCalculator>
            <ButtonCalculator onClick={backspace}>
              <Delete className="h-4 w-4" />
            </ButtonCalculator>
            <ButtonCalculator onClick={() => performOperation('/')} variant="operator">
              <Divide className="h-4 w-4" />
            </ButtonCalculator>
            <ButtonCalculator onClick={() => performOperation('*')} variant="operator">
              <X className="h-4 w-4" />
            </ButtonCalculator>

            {/* الصف الثاني */}
            <ButtonCalculator onClick={() => inputNumber('7')}>7</ButtonCalculator>
            <ButtonCalculator onClick={() => inputNumber('8')}>8</ButtonCalculator>
            <ButtonCalculator onClick={() => inputNumber('9')}>9</ButtonCalculator>
            <ButtonCalculator onClick={() => performOperation('-')} variant="operator">
              <Minus className="h-4 w-4" />
            </ButtonCalculator>

            {/* الصف الثالث */}
            <ButtonCalculator onClick={() => inputNumber('4')}>4</ButtonCalculator>
            <ButtonCalculator onClick={() => inputNumber('5')}>5</ButtonCalculator>
            <ButtonCalculator onClick={() => inputNumber('6')}>6</ButtonCalculator>
            <ButtonCalculator onClick={() => performOperation('+')} variant="operator">
              <Plus className="h-4 w-4" />
            </ButtonCalculator>

            {/* الصف الرابع */}
            <ButtonCalculator onClick={() => inputNumber('1')}>1</ButtonCalculator>
            <ButtonCalculator onClick={() => inputNumber('2')}>2</ButtonCalculator>
            <ButtonCalculator onClick={() => inputNumber('3')}>3</ButtonCalculator>
            <ButtonCalculator onClick={handleEqual} variant="equals" className="row-span-2">
              <Equal className="h-4 w-4" />
            </ButtonCalculator>

            {/* الصف الخامس */}
            <ButtonCalculator onClick={() => inputNumber('0')} className="col-span-2">0</ButtonCalculator>
            <ButtonCalculator onClick={inputDecimal}>.</ButtonCalculator>
          </div>

          {/* معلومات إضافية */}
          <div className="mt-4 text-center text-xs text-gray-500" dir="rtl">
            <p>لوحة المفاتيح: الأرقام • + - * / • Enter للنتيجة • C للمسح • Esc للإغلاق</p>
          </div>
        </Card>
      </DialogContent>
    </Dialog>
  );
};

export default CalculatorComponent;
