import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { ProductSize } from '@/lib/api/productComplete';
import { cn } from '@/lib/utils';

interface SizeButtonProps {
  size: ProductSize;
  isSelected: boolean;
  disableMotion: boolean;
  onClick: (size: ProductSize) => void;
}

const sizeVariants = {
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

export const SizeButton = memo<SizeButtonProps>(({
  size,
  isSelected,
  disableMotion,
  onClick
}) => {
  const isOutOfStock = (size.quantity || 0) <= 0;
  const isLowStock = (size.quantity || 0) > 0 && (size.quantity || 0) <= 5;

  return (
    <motion.button
      onClick={() => onClick(size)}
      disabled={isOutOfStock}
      className={cn(
        "relative px-4 py-3 min-w-[3rem] rounded-xl border-2 font-medium text-sm",
        "transition-all duration-300 ease-out",
        !isOutOfStock && "hover:shadow-md hover:-translate-y-0.5",
        isSelected
          ? "border-primary bg-primary text-primary-foreground shadow-lg scale-105"
          : !isOutOfStock
          ? "border-border/50 bg-background hover:border-primary/50 hover:bg-primary/5 text-foreground"
          : "border-red-200 bg-red-50 text-red-400 cursor-not-allowed opacity-50 dark:border-red-800 dark:bg-red-900/20 dark:text-red-500"
      )}
      variants={disableMotion ? undefined : sizeVariants}
      whileHover={disableMotion || isOutOfStock ? {} : { scale: 1.05 }}
      whileTap={disableMotion || isOutOfStock ? {} : { scale: 0.95 }}
      title={isOutOfStock ? `${size.size_name} - نفد المخزون` : size.size_name}
    >
      {size.size_name}

      {/* مؤشر نفاد المخزون للمقاسات */}
      {isOutOfStock && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-0.5 bg-red-500 rotate-45 rounded-full"></div>
          <div className="w-6 h-0.5 bg-red-500 -rotate-45 rounded-full absolute"></div>
        </div>
      )}

      {/* مؤشر المخزون المنخفض للمقاسات */}
      {isLowStock && !isOutOfStock && !isSelected && (
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
      )}

      {/* تأثير التحديد */}
      {isSelected && !isOutOfStock && (
        <motion.div
          className="absolute inset-0 rounded-xl bg-primary/10 border-2 border-primary"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
        />
      )}
    </motion.button>
  );
});

SizeButton.displayName = 'SizeButton';
