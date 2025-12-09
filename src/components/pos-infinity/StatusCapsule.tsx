/**
 * 💊 StatusCapsule - كبسولة الحالة
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * زر يتغير شكله ولونه حسب وضع POS:
 * - أخضر/تيل للبيع
 * - أزرق للإرجاع
 * - برتقالي للخسائر
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart,
  RotateCcw,
  AlertTriangle,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { POSMode } from './CommandIsland';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface StatusCapsuleProps {
  mode: POSMode;
  onModeChange: (mode: POSMode) => void;
  cartItemsCount?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Config
// ═══════════════════════════════════════════════════════════════════════════

// 🎨 تصميم "بروفيشنال" - نظيف، متناسق، وموحد
const MODE_CONFIG = {
  sale: {
    label: 'بيع',
    icon: ShoppingCart,
    colors: {
      icon: 'text-orange-500 dark:text-orange-400',
      dot: 'bg-orange-500',
      badge: 'bg-orange-500 text-white'
    }
  },
  return: {
    label: 'إرجاع',
    icon: RotateCcw,
    colors: {
      icon: 'text-blue-500 dark:text-blue-400',
      dot: 'bg-blue-500',
      badge: 'bg-blue-500 text-white'
    }
  },
  loss: {
    label: 'خسائر',
    icon: AlertTriangle,
    colors: {
      icon: 'text-red-500 dark:text-red-400',
      dot: 'bg-red-500',
      badge: 'bg-red-500 text-white'
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════

const StatusCapsule = memo<StatusCapsuleProps>(({
  mode,
  onModeChange,
  cartItemsCount = 0
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // ⚡ تحسين الأداء: تخزين التكوين مؤقتاً
  const { config, Icon } = useMemo(() => {
    const cfg = MODE_CONFIG[mode];
    return { config: cfg, Icon: cfg.icon };
  }, [mode]);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            // Base
            "relative flex items-center gap-3 px-4 py-2 rounded-xl h-11",
            // Unified Surface (Matches OmniSearch)
            "bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/50",
            isOpen
              ? "bg-white dark:bg-zinc-700 shadow-lg ring-2 ring-primary/20 dark:ring-primary/30 border-primary/30 dark:border-primary/40"
              : "hover:bg-zinc-50 dark:hover:bg-zinc-700 hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-600",
            // Transition
            "transition-all duration-300 ease-out",
            // Cursor
            "cursor-pointer select-none group"
          )}
        >
          {/* أيقونة الوضع - Source of Color */}
          <motion.div
            key={mode}
            initial={{ rotate: -90, scale: 0.5, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className={cn("relative z-10", config.colors.icon)}
          >
            <Icon className="h-5 w-5 drop-shadow-sm" />
          </motion.div>

          {/* اسم الوضع - Neutral Text */}
          <motion.span
            key={`label-${mode}`}
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="font-bold text-sm text-zinc-800 dark:text-zinc-100 tracking-wide"
          >
            {config.label}
          </motion.span>

          {/* سهم القائمة */}
          <ChevronDown className={cn(
            "h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400 transition-transform duration-300",
            isOpen && "rotate-180 text-zinc-700 dark:text-zinc-200"
          )} />

          {/* تم حذف عداد السلة (النقطة) بطلب المستخدم */}
          {/* 
          <AnimatePresence>
            {cartItemsCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className={cn(
                  "absolute -top-1.5 -left-1.5 min-w-[20px] h-5 flex items-center justify-center text-[10px] font-bold rounded-full px-1.5 shadow-sm ring-2 ring-white dark:ring-black",
                  config.colors.badge
                )}
              >
                {cartItemsCount}
              </motion.span>
            )}
          </AnimatePresence> 
          */}
        </motion.button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className={cn(
          "w-52 p-2 rounded-2xl",
          "bg-white dark:bg-zinc-800/95",
          "backdrop-blur-xl",
          "border border-zinc-200 dark:border-zinc-700/60",
          "shadow-xl shadow-black/10 dark:shadow-black/30 ring-1 ring-black/5 dark:ring-white/5"
        )}
      >
        {(Object.keys(MODE_CONFIG) as POSMode[]).map((modeKey) => {
          const item = MODE_CONFIG[modeKey];
          const ItemIcon = item.icon;
          const isActive = mode === modeKey;

          return (
            <DropdownMenuItem
              key={modeKey}
              onClick={() => onModeChange(modeKey)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer mb-1 last:mb-0",
                "transition-all duration-200 outline-none font-semibold",
                isActive
                  ? "bg-zinc-100 dark:bg-zinc-700/80 text-zinc-900 dark:text-white shadow-sm"
                  : "text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
              )}
            >
              <ItemIcon className={cn(
                "h-4.5 w-4.5 transition-colors",
                modeKey === 'sale' && (isActive ? "text-orange-500 dark:text-orange-400" : "text-zinc-400 dark:text-zinc-500"),
                modeKey === 'return' && (isActive ? "text-blue-500 dark:text-blue-400" : "text-zinc-400 dark:text-zinc-500"),
                modeKey === 'loss' && (isActive ? "text-red-500 dark:text-red-400" : "text-zinc-400 dark:text-zinc-500")
              )} />
              <span className="flex-1">{item.label}</span>

              {/* مؤشر الاختيار */}
              {isActive && (
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  modeKey === 'sale' && "bg-orange-500",
                  modeKey === 'return' && "bg-blue-500",
                  modeKey === 'loss' && "bg-red-500"
                )} />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

StatusCapsule.displayName = 'StatusCapsule';

export default StatusCapsule;
