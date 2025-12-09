/**
 * 🎀 CategoryRibbon - شريط الفئات القابل للإخفاء
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * شريط فئات أنيق يظهر أسفل الجزيرة العائمة
 * يختفي تلقائياً عند التمرير لأسفل
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { POSMode } from './CommandIsland';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface Category {
  id: string;
  name: string;
  productsCount?: number;
}

interface CategoryRibbonProps {
  categories: Category[];
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
  mode: POSMode;
  isVisible?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════

const CategoryRibbon = memo<CategoryRibbonProps>(({
  categories,
  selectedCategory,
  onCategoryChange,
  mode,
  isVisible = true
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // ⚡ ألوان حسب الوضع - تخزين مؤقت
  // 🎨 تصميم "كبسولة" نظيف - High Contrast
  // ⚡ ألوان حسب الوضع - تخزين مؤقت
  // 🎨 تصميم "كبسولة" ملونة (Tinted) تتفاعل مع وضع النظام
  const colors = useMemo(() => {
    // تعريف الألوان لكل وضع
    const modeColors = {
      sale: "bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 ring-2 ring-orange-500 dark:ring-orange-400",
      return: "bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20 ring-2 ring-blue-500 dark:ring-blue-400",
      loss: "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 ring-2 ring-red-500 dark:ring-red-400"
    };

    const activeStyle = cn(
      "scale-105 font-bold tracking-wide",
      modeColors[mode] // اختيار اللون حسب الوضع
    );

    const inactiveStyle = "bg-white/80 dark:bg-[#21262d] hover:bg-white dark:hover:bg-[#30363d] text-zinc-600 dark:text-[#8b949e] hover:text-zinc-800 dark:hover:text-[#e6edf3] border border-zinc-200/50 dark:border-[#30363d] hover:border-zinc-300 dark:hover:border-[#484f58]";

    return { active: activeStyle, inactive: inactiveStyle };
  }, [mode]);

  // ⚡ فحص إمكانية التمرير - تخزين مؤقت
  const checkScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;

      // RTL Support: Handle varying browser implementations of scrollLeft
      // Standard (Chrome/Edge/Firefox): scrollLeft is 0 at start (right) and negative as you scroll left.
      const scrollAmt = Math.abs(scrollLeft);
      const maxScroll = scrollWidth - clientWidth;

      // "canScrollLeft" var controls RIGHT button -> Only show if we have scrolled left (scrollAmt > 0)
      setCanScrollLeft(scrollAmt > 10);

      // "canScrollRight" var controls LEFT button -> Show if we haven't reached the end
      setCanScrollRight(scrollAmt < maxScroll - 10);
    }
  }, []);

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [categories, checkScroll]);

  // ⚡ التمرير - تخزين مؤقت
  const scroll = useCallback((direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  }, []);

  // ⚡ جميع الفئات مع "الكل" في البداية - تخزين مؤقت
  const allCategories: Category[] = useMemo(() => [
    { id: 'all', name: 'الكل' },
    ...categories
  ], [categories]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
          className="overflow-hidden"
        >
          <div className="relative py-4 px-1">
            {/* زر التمرير لليسار */}
            <AnimatePresence>
              {canScrollLeft && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, x: 10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: 10 }}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-20 pl-4 bg-gradient-to-l from-white/80 dark:from-[#0f1419]/90 to-transparent pointer-events-none"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="pointer-events-auto h-8 w-8 rounded-full bg-white dark:bg-[#21262d] shadow-md border border-zinc-200 dark:border-[#30363d] text-zinc-700 dark:text-[#e6edf3] hover:scale-110 hover:bg-zinc-50 dark:hover:bg-[#30363d] transition-all"
                    onClick={() => scroll('right')}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* شريط الفئات */}
            <div
              ref={scrollRef}
              onScroll={checkScroll}
              onWheel={(e) => {
                const container = scrollRef.current;
                if (container) {
                  container.scrollLeft += e.deltaY; // Horizontal scroll with vertical wheel
                }
              }}
              className="flex items-center gap-2 overflow-x-auto scrollbar-hide px-1 py-1 cursor-grab active:cursor-grabbing select-none"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {allCategories.map((category, index) => {
                const isActive = selectedCategory === category.id ||
                  (selectedCategory === '' && category.id === 'all');

                return (
                  <motion.button
                    key={category.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: index * 0.03,
                      type: "spring",
                      stiffness: 400,
                      damping: 25
                    }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onCategoryChange(category.id)}
                    className={cn(
                      "relative flex items-center gap-2 px-4 py-2 rounded-full",
                      "text-sm font-medium whitespace-nowrap",
                      "transition-all duration-300",
                      isActive ? colors.active : colors.inactive
                    )}
                  >
                    {/* أيقونة خاصة لـ "الكل" */}
                    {category.id === 'all' && (
                      <Sparkles className={cn(
                        "h-3.5 w-3.5",
                        isActive ? "text-amber-300" : "text-zinc-400 dark:text-[#6e7681]"
                      )} />
                    )}

                    <span>{category.name}</span>

                    {/* عداد المنتجات */}
                    {category.productsCount !== undefined && category.productsCount > 0 && (
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full font-mono",
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-zinc-200/50 dark:bg-[#30363d] text-zinc-500 dark:text-[#8b949e]"
                      )}>
                        {category.productsCount}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* زر التمرير لليمين */}
            <AnimatePresence>
              {canScrollRight && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, x: -10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: -10 }}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-20 pr-4 bg-gradient-to-r from-white/80 dark:from-[#0f1419]/90 to-transparent pointer-events-none"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="pointer-events-auto h-8 w-8 rounded-full bg-white dark:bg-[#21262d] shadow-md border border-zinc-200 dark:border-[#30363d] text-zinc-700 dark:text-[#e6edf3] hover:scale-110 hover:bg-zinc-50 dark:hover:bg-[#30363d] transition-all"
                    onClick={() => scroll('left')}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

CategoryRibbon.displayName = 'CategoryRibbon';

export default CategoryRibbon;
