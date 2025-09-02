import React, { useState, useRef, useEffect } from 'react';
import { Palette, Pipette, Hash, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [isValidColor, setIsValidColor] = useState(true);
  const pickerRef = useRef<HTMLDivElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  // التحقق من صحة كود اللون
  const validateColor = (color: string): boolean => {
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexRegex.test(color);
  };

  // تحديث قيمة الإدخال عند تغيير القيمة الخارجية
  useEffect(() => {
    setInputValue(value);
    setIsValidColor(validateColor(value));
  }, [value]);

  // إغلاق المنتقي عند النقر خارجه
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // التعامل مع تغيير قيمة الإدخال
  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    const isValid = validateColor(newValue);
    setIsValidColor(isValid);
    
    if (isValid) {
      onChange(newValue);
    }
  };

  // التعامل مع تغيير اللون من المنتقي
  const handleColorChange = (newColor: string) => {
    setInputValue(newColor);
    setIsValidColor(true);
    onChange(newColor);
  };

  // تطبيق اللون إذا كان صحيحاً
  const applyColor = () => {
    if (isValidColor && inputValue !== value) {
      onChange(inputValue);
    }
    setIsOpen(false);
  };

  // إلغاء التغييرات
  const cancelChanges = () => {
    setInputValue(value);
    setIsValidColor(true);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={pickerRef}>
      {/* منطقة الإدخال الرئيسية */}
      <div className="flex items-center gap-3">
        {/* معاينة اللون */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="relative group w-12 h-12 rounded-xl border-2 border-slate-300 dark:border-slate-600 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
          style={{ backgroundColor: isValidColor ? value : '#f1f5f9' }}
        >
          {/* تأثير الإضاءة */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          
          {/* أيقونة منتقي الألوان */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Palette className="h-4 w-4 text-white drop-shadow-sm" />
          </div>
          
          {/* حدود داخلية */}
          <div className="absolute inset-1 rounded-lg border border-white/20 dark:border-black/20" />
        </button>

        {/* حقل الإدخال */}
        <div className="flex-1 relative">
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 dark:text-slate-400" />
            <Input
              type="text"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  applyColor();
                } else if (e.key === 'Escape') {
                  cancelChanges();
                }
              }}
              placeholder="#6366f1"
              className={`h-12 text-base pl-10 pr-4 font-mono bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 focus:border-primary focus:ring-primary/20 transition-all duration-200 ${
                !isValidColor ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500/20' : ''
              }`}
            />
          </div>
          
          {/* رسالة خطأ */}
          {!isValidColor && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
              <X className="h-3 w-3" />
              كود لون غير صحيح (مثال: #6366f1)
            </p>
          )}
        </div>

        {/* زر فتح المنتقي */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="h-12 px-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-slate-300 dark:border-slate-600 hover:from-slate-100 hover:to-slate-200 dark:hover:from-slate-700 dark:hover:to-slate-600"
        >
          <Pipette className="h-4 w-4" />
        </Button>
      </div>

      {/* منتقي الألوان المتقدم */}
      {isOpen && (
        <Card className="absolute top-full left-0 right-0 mt-3 z-50 shadow-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <CardContent className="p-4 space-y-4">
            {/* العنوان */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Palette className="h-4 w-4" />
                اختر اللون
              </h3>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={cancelChanges}
                  className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* منتقي الألوان الأصلي */}
            <div className="space-y-3">
              <input
                ref={colorInputRef}
                type="color"
                value={isValidColor ? inputValue : '#6366f1'}
                onChange={(e) => handleColorChange(e.target.value)}
                className="w-full h-32 rounded-lg border-2 border-slate-200 dark:border-slate-700 cursor-pointer"
                style={{ background: 'none' }}
              />
              
              {/* معاينة مباشرة */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-lg border-2 border-white dark:border-slate-700 shadow-sm"
                    style={{ backgroundColor: isValidColor ? inputValue : '#f1f5f9' }}
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {isValidColor ? inputValue.toUpperCase() : 'لون غير صحيح'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      معاينة مباشرة
                    </p>
                  </div>
                </div>
                
                {isValidColor && inputValue !== value && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={applyColor}
                    className="gap-1 bg-primary hover:bg-primary/90"
                  >
                    <Check className="h-3 w-3" />
                    تطبيق
                  </Button>
                )}
              </div>
            </div>

            {/* نصائح */}
            <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 pt-2 border-t border-slate-200 dark:border-slate-700">
              <p>💡 <strong>نصائح:</strong></p>
              <ul className="space-y-1 mr-4">
                <li>• اضغط Enter لتطبيق اللون</li>
                <li>• اضغط Escape للإلغاء</li>
                <li>• استخدم تنسيق Hex (مثال: #6366f1)</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ColorPicker;