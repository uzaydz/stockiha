import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { ProductColor } from '@/lib/api/productComplete';
import { cn } from '@/lib/utils';
import { getCdnImageUrl } from '@/lib/image-cdn';

interface ColorButtonProps {
  color: ProductColor;
  isSelected: boolean;
  disableMotion: boolean;
  onClick: (color: ProductColor) => void;
}

const colorVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 30
    }
  }
};

export const ColorButton = memo<ColorButtonProps>(({
  color,
  isSelected,
  disableMotion,
  onClick
}) => {
  const isOutOfStock = (color.quantity || 0) <= 0;
  const isLowStock = (color.quantity || 0) > 0 && (color.quantity || 0) <= 5;

  return (
    <motion.button
      onClick={() => onClick(color)}
      disabled={isOutOfStock}
      className={cn(
        "relative flex items-center justify-center p-3 rounded-xl border-2",
        "transition-all duration-300 ease-out min-w-[4rem]",
        !isOutOfStock && "hover:shadow-lg hover:-translate-y-1",
        isSelected
          ? "border-primary bg-primary/10 shadow-lg scale-105"
          : !isOutOfStock
          ? "border-border/50 bg-background hover:border-primary/50 hover:bg-primary/5"
          : "border-red-200 bg-red-50 cursor-not-allowed opacity-50 dark:border-red-800 dark:bg-red-900/20"
      )}
      variants={disableMotion ? undefined : colorVariants}
      whileHover={disableMotion || isOutOfStock ? {} : { scale: 1.05 }}
      whileTap={disableMotion || isOutOfStock ? {} : { scale: 0.95 }}
      title={isOutOfStock ? `${color.name} - نفد المخزون` : color.name}
    >
      {/* عرض الصورة إذا متوفرة */}
      {color.image_url ? (
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
            <img
              src={getCdnImageUrl(color.image_url, { width: 48, height: 48, quality: 80 })}
              alt={color.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <span className="text-xs font-medium text-center leading-tight">
            {color.name}
          </span>
        </div>
      ) : (
        /* عرض اللون إذا لم تكن هناك صورة */
        <div className="flex flex-col items-center gap-2">
          <div
            className="w-12 h-12 rounded-lg border-2 border-gray-200"
            style={{ backgroundColor: color.color_code || '#f3f4f6' }}
          />
          <span className="text-xs font-medium text-center leading-tight">
            {color.name}
          </span>
        </div>
      )}

      {/* مؤشر نفاد المخزون */}
      {isOutOfStock && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-0.5 bg-red-500 rotate-45 rounded-full"></div>
          <div className="w-8 h-0.5 bg-red-500 -rotate-45 rounded-full absolute"></div>
        </div>
      )}

      {/* مؤشر المخزون المنخفض */}
      {isLowStock && !isOutOfStock && !isSelected && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
      )}

      {/* تأثير التحديد */}
      {isSelected && !isOutOfStock && (
        <motion.div
          className="absolute inset-0 rounded-xl bg-primary/20 border-2 border-primary"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
        />
      )}
    </motion.button>
  );
});

ColorButton.displayName = 'ColorButton';
