import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ProductColor } from '@/lib/api/productComplete';
import { cn } from '@/lib/utils';
import { ColorButton } from './ColorButton';

interface ColorSelectorProps {
  colors: ProductColor[];
  selectedColor?: ProductColor;
  disableMotion: boolean;
  translation: (key: string) => string;
  onColorSelect: (color: ProductColor) => void;
}

const sectionVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3
    }
  }
};

export const ColorSelector = memo<ColorSelectorProps>(({
  colors,
  selectedColor,
  disableMotion,
  translation,
  onColorSelect
}) => {
  return (
    <motion.div
      className="space-y-4"
      variants={disableMotion ? undefined : sectionVariants}
    >
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold text-foreground dark:text-white">
          {translation('color')}
        </Label>
        {selectedColor?.name && (
          <Badge
            variant="secondary"
            className={cn(
              "px-3 py-1 text-xs font-medium",
              "bg-primary/10 text-primary border-primary/20",
              "dark:bg-primary/20 dark:text-primary-foreground"
            )}
          >
            {selectedColor.name}
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {colors.map((color) => (
          <ColorButton
            key={color.id}
            color={color}
            isSelected={selectedColor?.id === color.id}
            disableMotion={disableMotion}
            onClick={onColorSelect}
          />
        ))}
      </div>
    </motion.div>
  );
});

ColorSelector.displayName = 'ColorSelector';
