import { memo, useMemo, useCallback, useEffect, useState, useRef } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import { CategoryCardOptimized } from './CategoryCardOptimized';
import type { CategoryGridProps, ExtendedCategory } from './types';
import { motion } from 'framer-motion';

/**
 * مكون شبكة الفئات المحسّن مع Virtualization
 * يدعم القوائم الطويلة بكفاءة عالية
 */
const CategoryGridOptimized = memo<CategoryGridProps>(({ 
  categories, 
  activeCategoryId,
  useRealCategories = true,
  showImages = true,
  showDescription = false,
  enableVirtualization = false,
  itemsPerRow = 3,
  gap = 'medium'
}) => {
  // كشف الموبايل/تقليل الحركة (منع يومض الشفافية بتجنّب بدء الحالة مخفية)
  const [enableMotion, setEnableMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const isSmall = window.innerWidth < 768;
      return !prefersReduced && !isSmall;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    // تحديث آمن في حال تغيّر تفضيل النظام أو تغيّر حجم الشاشة
    try {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const isSmall = window.innerWidth < 768;
      setEnableMotion(!prefersReduced && !isSmall);
    } catch {
      /* ignore */
    }
  }, []);

  // قياس عرض الحاوية لجعل الـ virtualization متجاوباً
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(1200);
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') {
      // fallback لعرض الشاشة بحد أقصى 1200
      const vw = typeof window !== 'undefined' ? Math.min(window.innerWidth, 1200) : 1200;
      setContainerWidth(vw - 32);
      return;
    }
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width);
        setContainerWidth(Math.max(0, w));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // حساب أبعاد الشبكة
  const gridConfig = useMemo(() => {
    const gapSizes = { small: 16, medium: 24, large: 32 };
    const gapSize = gapSizes[gap];
    
    // استخدم عرض الحاوية المقاس (متجاوب/دقيق)
    const cw = Math.max(320, Math.min(containerWidth, 1200));
    const totalGaps = (itemsPerRow - 1) * gapSize;
    const itemWidth = (cw - totalGaps) / itemsPerRow;
    const itemHeight = itemWidth * 1.3; // نسبة الارتفاع إلى العرض
    
    return {
      itemWidth: Math.floor(itemWidth),
      itemHeight: Math.floor(itemHeight),
      gapSize,
      columnCount: itemsPerRow,
      rowCount: Math.ceil(categories.length / itemsPerRow)
    };
  }, [categories.length, itemsPerRow, gap, containerWidth]);

  // مكون العنصر المحسّن للـ virtualization
  const VirtualizedItem = useCallback(({ 
    columnIndex, 
    rowIndex, 
    style 
  }: {
    columnIndex: number;
    rowIndex: number;
    style: React.CSSProperties;
  }) => {
    const index = rowIndex * gridConfig.columnCount + columnIndex;
    const category = categories[index];
    
    if (!category) return null;

    return (
      <div 
        style={{
          ...style,
          padding: `${gridConfig.gapSize / 2}px`,
        }}
      >
        <CategoryCardOptimized
          category={category}
          activeCategoryId={activeCategoryId}
          useRealCategories={useRealCategories}
          showImages={showImages}
          showDescription={false}
          priority={index < 6} // أولوية للعناصر الأولى
          lazy={index >= 6} // تحميل تدريجي للباقي
        />
      </div>
    );
  }, [categories, activeCategoryId, useRealCategories, showImages, showDescription, gridConfig]);

  // انيميشنز محسّنة
  const containerVariants = useMemo(() => ({
    hidden: { opacity: 1 }, // ابدأ مرئياً لتجنّب مشكلة الشفافية القابلة للنقر
    visible: { 
      opacity: 1,
      transition: { duration: 0.2, staggerChildren: 0.04, delayChildren: 0.08 }
    }
  }), []);

  const itemVariants = useMemo(() => ({
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' as const } }
  }), []);

  // إذا كان التحسين الافتراضي مفعل والقائمة طويلة
  if (enableVirtualization && categories.length > 20) {
    return (
      <div ref={containerRef} className="w-full">
        <Grid
          columnCount={gridConfig.columnCount}
          columnWidth={gridConfig.itemWidth}
          // اجعل الارتفاع متجاوباً: صفوف فعلية حتى حد أقصى 800px
          height={Math.min(gridConfig.rowCount * gridConfig.itemHeight, 800)}
          rowCount={gridConfig.rowCount}
          rowHeight={gridConfig.itemHeight}
          width={containerWidth}
          style={{ direction: 'ltr' }} // لضمان عمل virtualization بشكل صحيح
        >
          {VirtualizedItem}
        </Grid>
      </div>
    );
  }

  // الشبكة العادية المحسّنة
  if (enableMotion) {
    // خرائط ثابتة لتجنب سلاسل Tailwind الديناميكية التي قد تُحذف أثناء البناء
    const gapClassMap: Record<'small'|'medium'|'large', string> = {
      small: 'gap-4',
      medium: 'gap-6',
      large: 'gap-8',
    };
    const colsClassMap: Record<number, string> = {
      1: 'lg:grid-cols-1',
      2: 'lg:grid-cols-2',
      3: 'lg:grid-cols-3',
      4: 'lg:grid-cols-4',
      5: 'lg:grid-cols-5',
      6: 'lg:grid-cols-6',
    };
    const lgCols = colsClassMap[itemsPerRow] || 'lg:grid-cols-3';
    const gapCls = gapClassMap[gap];
    return (
      <motion.div 
        className={`grid grid-cols-2 sm:grid-cols-2 ${lgCols} ${gapCls}`}
        initial={false}
        animate="visible"
        variants={containerVariants}
      >
        {categories.map((category, index) => (
          <motion.div key={category.id} variants={itemVariants}>
            <CategoryCardOptimized 
              category={category}
              activeCategoryId={activeCategoryId}
              useRealCategories={useRealCategories}
              showImages={showImages}
              showDescription={false}
              priority={index < 6}
              lazy={index >= 6}
            />
          </motion.div>
        ))}
      </motion.div>
    );
  }

  // نسخة خفيفة بدون حركات
  return (
    <div ref={containerRef} className={`grid grid-cols-2 sm:grid-cols-2 ${(() => {
      const cols: Record<number,string> = {1:'lg:grid-cols-1',2:'lg:grid-cols-2',3:'lg:grid-cols-3',4:'lg:grid-cols-4',5:'lg:grid-cols-5',6:'lg:grid-cols-6'};
      return cols[itemsPerRow] || 'lg:grid-cols-3';
    })()} ${(() => {
      const gaps: Record<'small'|'medium'|'large',string> = { small:'gap-4', medium:'gap-6', large:'gap-8' };
      return gaps[gap];
    })()}`}>
      {categories.map((category, index) => (
        <div key={category.id}>
          <CategoryCardOptimized 
            category={category}
            activeCategoryId={activeCategoryId}
            useRealCategories={useRealCategories}
            showImages={showImages}
            showDescription={false}
            priority={index < 6}
            lazy={index >= 6}
          />
        </div>
      ))}
    </div>
  );
});

CategoryGridOptimized.displayName = 'CategoryGridOptimized';

export { CategoryGridOptimized };
