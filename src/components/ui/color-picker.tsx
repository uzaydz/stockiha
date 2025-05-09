import React, { useState, useEffect, useRef } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// الألوان الافتراضية للاختيار السريع
const PRESET_COLORS = [
  '#FFFFFF', '#F2F2F2', '#F9F9F9', '#EEEEEE', '#E0E0E0',
  '#FFEBEE', '#FCE4EC', '#F3E5F5', '#EDE7F6', '#E8EAF6',
  '#E3F2FD', '#E1F5FE', '#E0F7FA', '#E0F2F1', '#E8F5E9',
  '#F1F8E9', '#F9FBE7', '#FFFDE7', '#FFF8E1', '#FFF3E0',
  '#FBE9E7', '#EFEBE9', '#ECEFF1', '#FAFAFA', '#000000',
  '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
  '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50',
  '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800',
  '#FF5722', '#795548', '#9E9E9E', '#607D8B', '#212121'
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  presetColors?: string[];
}

const ColorPicker: React.FC<ColorPickerProps> = ({ 
  value, 
  onChange, 
  presetColors = PRESET_COLORS 
}) => {
  const [open, setOpen] = useState(false);
  const [inputColor, setInputColor] = useState(value || '#000000');
  
  // تحديث قيمة الإدخال عند تغيير اللون من الخارج
  useEffect(() => {
    setInputColor(value || '#000000');
  }, [value]);
  
  // تحديث اللون عند تغيير قيمة الإدخال
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setInputColor(newColor);
    
    // تحقق من تنسيق اللون الصحيح
    if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(newColor)) {
      onChange(newColor);
    }
  };
  
  // اختيار لون من القائمة
  const handleColorSelect = (color: string) => {
    setInputColor(color);
    onChange(color);
    setOpen(false);
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-start h-9 px-3 flex items-center gap-2 border border-input"
          style={{
            backgroundColor: 'transparent',
            justifyContent: 'space-between'
          }}
        >
          <div 
            className="h-5 w-5 rounded" 
            style={{ backgroundColor: inputColor }}
          ></div>
          <span className="flex-1 text-start">{inputColor}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3">
        <div className="space-y-3">
          <div className="w-full h-10 rounded" style={{ backgroundColor: inputColor }}></div>
          
          <div className="grid grid-cols-5 gap-2">
            {presetColors.map((color, index) => (
              <button
                key={index}
                className="h-5 w-5 rounded-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                style={{ backgroundColor: color }}
                onClick={() => handleColorSelect(color)}
              ></button>
            ))}
          </div>
          
          <div className="flex items-center">
            <Input
              type="text"
              value={inputColor}
              onChange={handleInputChange}
              className="flex-1 h-8"
              placeholder="#RRGGBB"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export { ColorPicker }; 