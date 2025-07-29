import { memo } from 'react';
import { motion } from 'framer-motion';
import { CategoryCard } from './CategoryCard';
import type { ExtendedCategory } from './types';

interface CategoryGridProps {
  categories: ExtendedCategory[];
  activeCategoryId?: string | null;
  useRealCategories?: boolean;
  showImages?: boolean;
  showDescription?: boolean;
}

const CategoryGrid = memo(({ 
  categories, 
  activeCategoryId,
  useRealCategories = true,
  showImages = true,
  showDescription = true
}: CategoryGridProps) => {
  return (
    <motion.div 
      className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      variants={{ 
        hidden: { opacity: 0 },
        visible: { 
          opacity: 1,
          transition: { 
            duration: 0.2, // تسريع ظهور الشبكة
            staggerChildren: 0.02 // تقليل التأخير بين العناصر
          } 
        } 
      }}
    >
      {categories.map((category, index) => (
        <motion.div 
          key={category.id} 
          variants={{ 
            hidden: { opacity: 0, y: 10, scale: 0.98 }, // تقليل المسافة والحركة
            visible: { 
              opacity: 1, 
              y: 0, 
              scale: 1,
              transition: {
                duration: 0.15, // تسريع كل عنصر
                ease: "easeOut",
                delay: 0 // إزالة التأخير التدريجي
              }
            }
          }}
        >
          <CategoryCard 
            category={category}
            activeCategoryId={activeCategoryId}
            useRealCategories={useRealCategories}
            showImages={showImages}
            showDescription={showDescription}
            priority={index < 6} // زيادة عدد الصور ذات الأولوية إلى 6
          />
        </motion.div>
      ))}
    </motion.div>
  );
});

CategoryGrid.displayName = 'CategoryGrid';

export { CategoryGrid };
