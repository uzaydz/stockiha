import { memo, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FixedSizeGrid as Grid } from 'react-window';
import { CategoryCardOptimized } from './CategoryCardOptimized';
import type { CategoryGridProps, ExtendedCategory } from './types';

/**
 * مكون شبكة الفئات المحسّن مع Virtualization
 * يدعم القوائم الطويلة بكفاءة عالية
 */
const CategoryGridOptimized = memo<CategoryGridProps>(({ 
  categories, 
  activeCategoryId,
  useRealCategories = true,
  showImages = true,
  showDescription = true,
  enableVirtualization = false,
  itemsPerRow = 3,
  gap = 'medium'
}) => {
  // حساب أبعاد الشبكة
  const gridConfig = useMemo(() => {
    const gapSizes = { small: 16, medium: 24, large: 32 };
    const gapSize = gapSizes[gap];
    
    // حساب عرض العنصر (افتراض عرض الحاوية 1200px)
    const containerWidth = 1200;
    const totalGaps = (itemsPerRow - 1) * gapSize;
    const itemWidth = (containerWidth - totalGaps) / itemsPerRow;
    const itemHeight = itemWidth * 1.3; // نسبة الارتفاع إلى العرض
    
    return {
      itemWidth: Math.floor(itemWidth),
      itemHeight: Math.floor(itemHeight),
      gapSize,
      columnCount: itemsPerRow,
      rowCount: Math.ceil(categories.length / itemsPerRow)
    };
  }, [categories.length, itemsPerRow, gap]);

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
          showDescription={showDescription}
          priority={index < 6} // أولوية للعناصر الأولى
          lazy={index >= 6} // تحميل تدريجي للباقي
        />
      </div>
    );
  }, [categories, activeCategoryId, useRealCategories, showImages, showDescription, gridConfig]);

  // انيميشنز محسّنة
  const containerVariants = useMemo(() => ({
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 0.3,
        staggerChildren: 0.05,
        delayChildren: 0.1
      } 
    }
  }), []);

  const itemVariants = useMemo(() => ({
    hidden: { opacity: 0, y: 15, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    }
  }), []);

  // إذا كان التحسين الافتراضي مفعل والقائمة طويلة
  if (enableVirtualization && categories.length > 20) {
    return (
      <div className="w-full">
        <Grid
          columnCount={gridConfig.columnCount}
          columnWidth={gridConfig.itemWidth}
          height={600} // ارتفاع ثابت للـ viewport
          rowCount={gridConfig.rowCount}
          rowHeight={gridConfig.itemHeight}
          width={1200}
          style={{ direction: 'ltr' }} // لضمان عمل virtualization بشكل صحيح
        >
          {VirtualizedItem}
        </Grid>
      </div>
    );
  }

  // الشبكة العادية المحسّنة
  return (
    <motion.div 
      className={`grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-${itemsPerRow} gap-${gap === 'small' ? '4' : gap === 'large' ? '8' : '6'}`}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      variants={containerVariants}
    >
      {categories.map((category, index) => (
        <motion.div 
          key={category.id} 
          variants={itemVariants}
        >
          <CategoryCardOptimized 
            category={category}
            activeCategoryId={activeCategoryId}
            useRealCategories={useRealCategories}
            showImages={showImages}
            showDescription={showDescription}
            priority={index < 6} // أولوية للعناصر الأولى
            lazy={index >= 6} // تحميل تدريجي للباقي
          />
        </motion.div>
      ))}
    </motion.div>
  );
});

CategoryGridOptimized.displayName = 'CategoryGridOptimized';

export { CategoryGridOptimized }; 