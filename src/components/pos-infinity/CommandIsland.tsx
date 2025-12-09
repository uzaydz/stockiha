/**
 * 🏝️ CommandIsland - الجزيرة العائمة
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * شريط تحكم عائم بتصميم Glassmorphism يحتوي على:
 * - كبسولة الحالة (StatusCapsule)
 * - مركز البحث الموحد (OmniSearch)
 * - بوابة التطبيقات (AppPortal)
 * - المساعد الذكي (Sira AI)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import StatusCapsule from './StatusCapsule';
import OmniSearch from './OmniSearch';
import AppPortal from './AppPortal';
import { SmartAssistantChat } from '@/components/pos/SmartAssistantChat';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export type POSMode = 'sale' | 'return' | 'loss';

interface CommandIslandProps {
  // الحالة
  mode: POSMode;
  onModeChange: (mode: POSMode) => void;

  // البحث
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onBarcodeSearch: (barcode: string) => void;
  isScannerLoading?: boolean;

  // الفلاتر
  selectedCategory?: string;
  categories?: { id: string; name: string }[];
  onCategoryChange?: (categoryId: string) => void;

  // الإحصائيات
  cartItemsCount?: number;
  cartTotal?: number;

  // التطبيقات
  onOpenCalculator?: () => void;
  onOpenExpense?: () => void;
  onOpenSettings?: () => void;
  onRefreshData?: () => void;

  // أخرى
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════

const CommandIsland = memo<CommandIslandProps>(({
  mode,
  onModeChange,
  searchQuery,
  onSearchChange,
  onBarcodeSearch,
  isScannerLoading,
  selectedCategory,
  categories = [],
  onCategoryChange,
  cartItemsCount = 0,
  cartTotal = 0,
  onOpenCalculator,
  onOpenExpense,
  onOpenSettings,
  onRefreshData,
  className
}) => {
  const [isSiraOpen, setIsSiraOpen] = useState(false);

  // ⚡ تحسين الأداء: تخزين الألوان مؤقتاً
  // 🎨 تصميم "كريستال" نظيف جداً - يعتمد على الحيادية لترك المحتوى يبرز
  const colors = useMemo(() => {
    const modeColors = {
      sale: {
        glow: 'shadow-orange-500/5',
        border: 'group-hover:border-orange-500/20'
      },
      return: {
        glow: 'shadow-blue-500/5',
        border: 'group-hover:border-blue-500/20'
      },
      loss: {
        glow: 'shadow-red-500/5',
        border: 'group-hover:border-red-500/20'
      }
    };
    return modeColors[mode];
  }, [mode]);

  return (
    <motion.div
      initial={{ y: -20, opacity: 0, scale: 0.98 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(
        // Base Layout
        "relative mx-auto w-full max-w-4xl group",
        // Shape & Spacing
        "rounded-[24px] p-2.5",
        // Crystal Glass Aesthetic - Twitter/X Dark Theme
        "bg-white/90 dark:bg-[#161b22]/95",
        "backdrop-blur-xl",
        // Borders & Depth
        "border border-zinc-200/80 dark:border-[#30363d]",
        "ring-1 ring-black/5 dark:ring-white/5",
        // Shadows
        "shadow-xl shadow-black/5 dark:shadow-black/30",
        colors.glow,
        // Extra interactions
        "transition-all duration-500 ease-out",
        className
      )}
      dir="rtl"
    >
      {/* ═══ المحتوى الرئيسي ═══ */}
      <div className="flex items-center gap-2 md:gap-3">

        {/* 1. كبسولة الحالة */}
        <StatusCapsule
          mode={mode}
          onModeChange={onModeChange}
          cartItemsCount={cartItemsCount}
        />

        {/* 2. مركز البحث - يأخذ المساحة المتبقة */}
        <div className="flex-1 min-w-0">
          <OmniSearch
            value={searchQuery}
            onChange={onSearchChange}
            onBarcodeSearch={onBarcodeSearch}
            isLoading={isScannerLoading}
            mode={mode}
            selectedCategory={selectedCategory}
            categories={categories}
            onCategoryChange={onCategoryChange}
          />
        </div>

        {/* 3. 🤖 SIRA AI - The Intelligence Core (Premium Redesign) */}
        <div className="relative group mx-1">
          <motion.button
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsSiraOpen(true)}
            className={cn(
              "relative flex items-center justify-center w-[46px] h-[46px]",
              "rounded-2xl",
              // Premium Material
              "bg-white dark:bg-[#21262d]",
              "border border-zinc-200 dark:border-[#30363d]",
              // Sophisticated Shadowing
              "shadow-md dark:shadow-lg dark:shadow-black/20",
              "hover:shadow-lg hover:shadow-emerald-500/10 dark:hover:shadow-emerald-500/20",
              // Transitions
              "transition-all duration-500 ease-out"
            )}
          >
            {/* Logo */}
            <div className="relative w-6 h-6 z-10">
              <img
                src="./images/selkia-logo.webp"
                alt="Sira AI"
                className="w-full h-full object-contain drop-shadow-sm"
              />
            </div>

            {/* Subtle Gradient Overlay on Hover */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-emerald-100/0 via-transparent to-blue-100/0 group-hover:from-emerald-100/40 group-hover:to-blue-100/20 dark:group-hover:from-emerald-500/15 dark:group-hover:to-blue-500/10 transition-all duration-500" />
          </motion.button>

          {/* Elegant Tooltip */}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0 pointer-events-none">
            <div className="bg-zinc-900 dark:bg-[#21262d] backdrop-blur-md text-white dark:text-[#e6edf3] text-[10px] font-bold px-3 py-1.5 rounded-full shadow-xl whitespace-nowrap border border-transparent dark:border-[#30363d]">
              SIRA AI
            </div>
          </div>
        </div>

        {/* Chat Component */}
        <SmartAssistantChat open={isSiraOpen} onOpenChange={setIsSiraOpen} />

        {/* 4. بوابة التطبيقات */}
        <AppPortal
          onOpenCalculator={onOpenCalculator}
          onOpenExpense={onOpenExpense}
          onOpenSettings={onOpenSettings}
          onRefreshData={onRefreshData}
          mode={mode}
        />
      </div>

      {/* ═══ شريط السياق (يظهر عند الحاجة) ═══ */}
      <AnimatePresence>
        {cartItemsCount > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2.5 pt-2.5 border-t border-zinc-200 dark:border-zinc-700/50 flex items-center justify-between text-xs font-medium px-2">
              <span className="text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-sm" />
                <span className="font-semibold">{cartItemsCount}</span> عنصر في السلة
              </span>
              <span className="font-bold text-zinc-800 dark:text-zinc-100 font-mono tracking-wide bg-zinc-100 dark:bg-zinc-700/60 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-600/50 shadow-sm">
                {cartTotal.toLocaleString('ar-DZ')} د.ج
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

CommandIsland.displayName = 'CommandIsland';

export default CommandIsland;
