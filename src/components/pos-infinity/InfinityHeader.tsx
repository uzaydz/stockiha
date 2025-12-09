/**
 * 🌌 InfinityHeader - الهيدر الفضائي المتكامل
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * يجمع بين:
 * - CommandIsland (الجزيرة العائمة)
 * - CategoryRibbon (شريط الفئات)
 * - WorkSessionIndicator (مؤشر الجلسة)
 * - SmartAssistantButton (زر المساعد الذكي)
 *
 * مع تحسينات الأداء:
 * - React.memo لتجنب إعادة الرسم غير الضرورية
 * - useMemo للحسابات المكلفة
 * - useCallback للدوال
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { memo, useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { cn } from '@/lib/utils';
import CommandIsland, { type POSMode } from './CommandIsland';
import CategoryRibbon from './CategoryRibbon';
import { SmartAssistantButton } from '@/components/pos/SmartAssistantButton';
import WorkSessionIndicator from '@/components/pos/WorkSessionIndicator';
import { formatCurrency } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface Category {
  id: string;
  name: string;
  productsCount?: number;
}

interface InfinityHeaderProps {
  // الحالة الأساسية
  isReturnMode: boolean;
  isLossMode: boolean;
  toggleReturnMode: () => void;
  toggleLossMode: () => void;

  // البحث والفلاتر
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onBarcodeSearch: (barcode: string) => void;
  isScannerLoading?: boolean;
  selectedCategory: string;
  categories: Category[];
  onCategoryChange: (categoryId: string) => void;

  // السلة
  cartItemsCount: number;
  cartTotal: number;
  returnItemsCount?: number;
  lossItemsCount?: number;

  // التطبيقات والإجراءات
  onOpenCalculator: () => void;
  onOpenExpense: () => void;
  onOpenSettings: () => void;
  onRefreshData: () => void;

  // أخرى
  isMobile?: boolean;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Memoized Sub-Components
// ═══════════════════════════════════════════════════════════════════════════

const HeaderActions = memo<{
  isMobile?: boolean;
}>(({ isMobile }) => (
  <div className="flex items-center gap-2">
    <WorkSessionIndicator compact={isMobile} />
    <SmartAssistantButton variant="header" />
  </div>
));
HeaderActions.displayName = 'HeaderActions';

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

const InfinityHeader = memo<InfinityHeaderProps>(({
  isReturnMode,
  isLossMode,
  toggleReturnMode,
  toggleLossMode,
  searchQuery,
  onSearchChange,
  onBarcodeSearch,
  isScannerLoading,
  selectedCategory,
  categories,
  onCategoryChange,
  cartItemsCount,
  cartTotal,
  returnItemsCount = 0,
  lossItemsCount = 0,
  onOpenCalculator,
  onOpenExpense,
  onOpenSettings,
  onRefreshData,
  isMobile = false,
  className
}) => {
  // ⚡ تتبع التمرير لإخفاء شريط الفئات
  const [isCategoryRibbonVisible, setIsCategoryRibbonVisible] = useState(true);
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<HTMLElement | null>(null);

  // تحديد الوضع الحالي
  const currentMode: POSMode = useMemo(() => {
    if (isLossMode) return 'loss';
    if (isReturnMode) return 'return';
    return 'sale';
  }, [isLossMode, isReturnMode]);

  // معالجة تغيير الوضع
  const handleModeChange = useCallback((newMode: POSMode) => {
    if (newMode === currentMode) return;

    // الخروج من الوضع الحالي أولاً
    if (currentMode === 'loss' && newMode !== 'loss') {
      toggleLossMode();
    }
    if (currentMode === 'return' && newMode !== 'return') {
      toggleReturnMode();
    }

    // الدخول للوضع الجديد
    if (newMode === 'loss' && currentMode !== 'loss') {
      toggleLossMode();
    }
    if (newMode === 'return' && currentMode !== 'return') {
      toggleReturnMode();
    }
  }, [currentMode, toggleLossMode, toggleReturnMode]);

  // عدد العناصر حسب الوضع
  const activeCartCount = useMemo(() => {
    if (isLossMode) return lossItemsCount;
    if (isReturnMode) return returnItemsCount;
    return cartItemsCount;
  }, [isLossMode, isReturnMode, lossItemsCount, returnItemsCount, cartItemsCount]);

  // تتبع التمرير
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const isScrollingDown = currentScrollY > lastScrollY.current;
      const isNearTop = currentScrollY < 50;

      // إظهار شريط الفئات إذا كنا قريبين من الأعلى أو نتمرر لأعلى
      setIsCategoryRibbonVisible(isNearTop || !isScrollingDown);
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // تحويل الفئات للتنسيق المطلوب مع عدد المنتجات
  const formattedCategories = useMemo(() => {
    return categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      productsCount: cat.productsCount
    }));
  }, [categories]);

  return (
    <div className={cn("relative", className)}>
      {/* ═══ الطبقة العلوية: الإجراءات (تم الحذف بطلب المستخدم) ═══ */}
      {/* <div className="flex items-center justify-between mb-3 px-2">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <HeaderActions isMobile={isMobile} />
        </motion.div>
      </div> */}

      {/* ═══ الجزيرة العائمة ═══ */}
      <CommandIsland
        mode={currentMode}
        onModeChange={handleModeChange}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        onBarcodeSearch={onBarcodeSearch}
        isScannerLoading={isScannerLoading}
        selectedCategory={selectedCategory}
        categories={formattedCategories}
        onCategoryChange={onCategoryChange}
        cartItemsCount={activeCartCount}
        cartTotal={cartTotal}
        onOpenCalculator={onOpenCalculator}
        onOpenExpense={onOpenExpense}
        onOpenSettings={onOpenSettings}
        onRefreshData={onRefreshData}
      />

      {/* ═══ شريط الفئات القابل للإخفاء ═══ */}
      <div className="mt-3">
        <CategoryRibbon
          categories={formattedCategories}
          selectedCategory={selectedCategory}
          onCategoryChange={onCategoryChange}
          mode={currentMode}
          isVisible={isCategoryRibbonVisible}
        />
      </div>
    </div>
  );
});

InfinityHeader.displayName = 'InfinityHeader';

export default InfinityHeader;
