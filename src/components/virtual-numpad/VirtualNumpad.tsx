import React, { useRef } from 'react';
import { X, Delete } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VirtualNumpadProps {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  position?: { x: number; y: number };
  allowDecimal?: boolean;
  allowNegative?: boolean;
  maxLength?: number;
}

export const VirtualNumpad: React.FC<VirtualNumpadProps> = ({
  value,
  onChange,
  onClose,
  position,
  allowDecimal = true,
  allowNegative = false,
  maxLength,
}) => {
  const numpadRef = useRef<HTMLDivElement>(null);

  const handleNumberClick = (num: string) => {
    if (maxLength && value.length >= maxLength) return;
    onChange(value + num);
  };

  const handleDecimalClick = () => {
    if (!allowDecimal) return;
    if (value.includes('.')) return;
    if (value === '') {
      onChange('0.');
    } else {
      onChange(value + '.');
    }
  };

  const handleNegativeClick = () => {
    if (!allowNegative) return;
    if (value.startsWith('-')) {
      onChange(value.substring(1));
    } else {
      onChange('-' + value);
    }
  };

  const handleBackspace = () => {
    onChange(value.slice(0, -1));
  };

  const handleClear = () => {
    onChange('');
  };

  const handleEnter = () => {
    onClose();
  };

  // حساب الموقع
  const style: React.CSSProperties = position
    ? {
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 999999, // أعلى من كل شيء
        pointerEvents: 'auto', // التأكد من قبول النقرات
      }
    : {
        position: 'fixed',
        right: '20px',
        bottom: '20px',
        zIndex: 999999, // أعلى من كل شيء
        pointerEvents: 'auto', // التأكد من قبول النقرات
      };

  return (
    <div
      ref={numpadRef}
      style={style}
      className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl border border-slate-700/50 p-4 backdrop-blur-xl w-[280px]"
      data-virtual-numpad="true"
      onMouseDown={(e) => {
        // منع blur على الحقل النشط ومنع تمرير الحدث
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={(e) => {
        // منع إغلاق الـ Dialog عند النقر على اللوحة
        e.preventDefault();
        e.stopPropagation();
      }}
      onPointerDown={(e) => {
        // منع جميع أنواع النقرات من التمرير
        e.stopPropagation();
      }}
      onTouchStart={(e) => {
        // دعم اللمس
        e.stopPropagation();
      }}
    >
      {/* رأس اللوحة */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-700/50">
        <div className="text-sm font-medium text-slate-300">لوحة الأرقام</div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-7 w-7 p-0 hover:bg-slate-700/50 text-slate-400 hover:text-white"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* شاشة العرض */}
      <div className="bg-slate-950/50 rounded-lg px-4 py-3 mb-3 border border-slate-700/30">
        <div className="text-right text-2xl font-mono text-white min-h-[36px] flex items-center justify-end">
          {value || '0'}
        </div>
      </div>

      {/* الأزرار */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        {/* الأرقام 7-9 */}
        {['7', '8', '9'].map((num) => (
          <NumpadButton key={num} onClick={() => handleNumberClick(num)}>
            {num}
          </NumpadButton>
        ))}

        {/* الأرقام 4-6 */}
        {['4', '5', '6'].map((num) => (
          <NumpadButton key={num} onClick={() => handleNumberClick(num)}>
            {num}
          </NumpadButton>
        ))}

        {/* الأرقام 1-3 */}
        {['1', '2', '3'].map((num) => (
          <NumpadButton key={num} onClick={() => handleNumberClick(num)}>
            {num}
          </NumpadButton>
        ))}

        {/* الصف الأخير */}
        {allowNegative ? (
          <NumpadButton onClick={handleNegativeClick} variant="secondary">
            +/-
          </NumpadButton>
        ) : (
          <NumpadButton onClick={handleClear} variant="danger">
            C
          </NumpadButton>
        )}

        <NumpadButton onClick={() => handleNumberClick('0')}>0</NumpadButton>

        {allowDecimal ? (
          <NumpadButton onClick={handleDecimalClick} variant="secondary">
            .
          </NumpadButton>
        ) : (
          <NumpadButton onClick={handleBackspace} variant="warning">
            <Delete className="h-5 w-5" />
          </NumpadButton>
        )}

        {/* أزرار إضافية */}
        <NumpadButton onClick={handleBackspace} variant="warning" className="col-span-1">
          <Delete className="h-5 w-5" />
        </NumpadButton>

        <NumpadButton onClick={handleClear} variant="danger" className="col-span-1">
          C
        </NumpadButton>

        <NumpadButton onClick={handleEnter} variant="success" className="col-span-1">
          ✓
        </NumpadButton>
      </div>
    </div>
  );
};

// مكون زر اللوحة
interface NumpadButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'secondary' | 'success' | 'danger' | 'warning';
  className?: string;
}

const NumpadButton: React.FC<NumpadButtonProps> = ({
  children,
  onClick,
  variant = 'default',
  className,
}) => {
  const variants = {
    default:
      'bg-slate-800 hover:bg-slate-700 text-white border-slate-600/50 active:bg-slate-600',
    secondary:
      'bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-500/50 active:bg-slate-500',
    success:
      'bg-green-600 hover:bg-green-500 text-white border-green-500/50 active:bg-green-700',
    danger: 'bg-red-600 hover:bg-red-500 text-white border-red-500/50 active:bg-red-700',
    warning:
      'bg-orange-600 hover:bg-orange-500 text-white border-orange-500/50 active:bg-orange-700',
  };

  return (
    <button
      onMouseDown={(e) => {
        // منع blur على الحقل النشط
        e.preventDefault();
        // تنفيذ الإجراء
        onClick();
      }}
      className={cn(
        'h-14 rounded-lg font-semibold text-lg border transition-all duration-150',
        'shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95',
        'flex items-center justify-center',
        variants[variant],
        className
      )}
    >
      {children}
    </button>
  );
};
