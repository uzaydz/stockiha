import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ProductSize } from '@/lib/api/productComplete';
import { cn } from '@/lib/utils';
import { SizeButton } from './SizeButton';

interface SizeSelectorProps {
  sizes: ProductSize[];
  selectedSize?: ProductSize;
  disableMotion: boolean;
  translation: (key: string) => string;
  onSizeSelect: (size: ProductSize) => void;
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

export const SizeSelector = memo<SizeSelectorProps>(({
  sizes,
  selectedSize,
  disableMotion,
  translation,
  onSizeSelect
}) => {
  return (
    <motion.div
      className="space-y-4"
      variants={sectionVariants}
    >
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold text-foreground dark:text-white">
          {translation('size')}
        </Label>
        {selectedSize?.size_name && (
          <Badge
            variant="secondary"
            className={cn(
              "px-3 py-1 text-xs font-medium",
              "bg-secondary/80 text-secondary-foreground border-secondary/30"
            )}
          >
            {selectedSize.size_name}
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {sizes.map((size) => (
          <SizeButton
            key={size.id}
            size={size}
            isSelected={selectedSize?.id === size.id}
            disableMotion={disableMotion}
            onClick={onSizeSelect}
          />
        ))}
      </div>
    </motion.div>
  );
});

SizeSelector.displayName = 'SizeSelector';
