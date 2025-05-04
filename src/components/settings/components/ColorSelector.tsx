import React, { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { PaintBucket, Check } from 'lucide-react';

// مجموعة ألوان مقترحة للاختيار منها
const PRESET_COLORS = [
  '#0099ff', // أزرق
  '#10b981', // أخضر
  '#f59e0b', // برتقالي
  '#ef4444', // أحمر
  '#8b5cf6', // بنفسجي
  '#3b82f6', // أزرق فاتح
  '#ec4899', // وردي
  '#6366f1', // أزرق داكن
  '#0f172a', // أسود داكن
  '#64748b', // رمادي
];

interface ColorSelectorProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  description?: string;
  presetColors?: string[];
}

const ColorSelector: React.FC<ColorSelectorProps> = ({
  value,
  onChange,
  label,
  description,
  presetColors = PRESET_COLORS,
}) => {
  const [selectedColor, setSelectedColor] = useState(value || presetColors[0]);
  const [customColor, setCustomColor] = useState(value || '');
  
  useEffect(() => {
    setSelectedColor(value || presetColors[0]);
    setCustomColor(value || '');
  }, [value, presetColors]);
  
  const handleSelectColor = (color: string) => {
    setSelectedColor(color);
    setCustomColor(color);
    onChange(color);
  };
  
  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setCustomColor(newColor);
  };
  
  const handleCustomColorBlur = () => {
    if (customColor) {
      setSelectedColor(customColor);
      onChange(customColor);
    }
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn("w-[50px] p-1 h-[38px]")}
              style={{ backgroundColor: selectedColor }}
            >
              <PaintBucket className={cn(
                "h-5 w-5",
                selectedColor === '#0f172a' || selectedColor === '#64748b' || selectedColor.startsWith('#00') ? 'text-white' : 'text-black'
              )} />
              <span className="sr-only">اختر لون</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[240px] p-3">
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-5 gap-2">
                {presetColors.map((color) => (
                  <button
                    key={color}
                    className={cn(
                      "w-10 h-10 rounded-md flex items-center justify-center",
                      selectedColor === color ? "ring-2 ring-offset-2 ring-primary" : "hover:scale-110 transition-transform"
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => handleSelectColor(color)}
                  >
                    {selectedColor === color && (
                      <Check className={cn(
                        "h-4 w-4",
                        color === '#0f172a' || color === '#64748b' || color.startsWith('#00') ? 'text-white' : 'text-black'
                      )} />
                    )}
                  </button>
                ))}
              </div>
              
              <div className="flex flex-col gap-2">
                <Label>لون مخصص</Label>
                <div className="flex gap-2">
                  <Input
                    value={customColor}
                    onChange={handleCustomColorChange}
                    onBlur={handleCustomColorBlur}
                    placeholder="#RRGGBB"
                    className="w-full"
                  />
                  <div 
                    className="w-10 h-10 rounded-md border"
                    style={{ backgroundColor: customColor || '#ffffff' }}
                  />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        
        <Input
          value={selectedColor}
          onChange={(e) => {
            setCustomColor(e.target.value);
            setSelectedColor(e.target.value);
          }}
          onBlur={handleCustomColorBlur}
          className="max-w-[120px]"
        />
      </div>
      
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
};

export default ColorSelector; 