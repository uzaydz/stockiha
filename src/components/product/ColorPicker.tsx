import { useState } from 'react';
import { Input } from '@/components/ui/input';

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
}

const ColorPicker = ({ value, onChange }: ColorPickerProps) => {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="flex gap-2 items-center relative">
      <div
        className="h-10 w-10 rounded-md border cursor-pointer"
        style={{ backgroundColor: value }}
        onClick={() => setShowPicker(!showPicker)}
      />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1"
        placeholder="#000000"
      />
      {showPicker && (
        <div className="absolute top-full mt-2 z-10">
          <Input
            type="color"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setShowPicker(false);
            }}
            className="w-56 h-32 p-0"
          />
        </div>
      )}
    </div>
  );
};

export default ColorPicker; 