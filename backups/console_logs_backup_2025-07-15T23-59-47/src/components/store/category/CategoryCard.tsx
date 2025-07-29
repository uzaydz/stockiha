import { memo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { OptimizedImage } from './OptimizedImage';
import { categoryIcons } from './constants';
import type { ExtendedCategory } from './types';

interface CategoryCardProps {
  category: ExtendedCategory;
  activeCategoryId?: string | null;
  useRealCategories?: boolean;
  showImages?: boolean;
  showDescription?: boolean;
  priority?: boolean;
}

const CategoryCard = memo(({ 
  category, 
  activeCategoryId,
  useRealCategories = true,
  showImages = true,
  showDescription = true,
  priority = false
}: CategoryCardProps) => {
  const { t } = useTranslation();
  const isActive = category.id === activeCategoryId;
  const IconComponent = categoryIcons[category.icon || 'layers'] || Layers;
  
  const linkTo = useRealCategories 
    ? `/products?category=${category.id}` 
    : `/products?demo_category=${category.slug}`;

  return (
    <Link 
      to={linkTo}
      className="block group rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl border border-border/20 hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all duration-500 ease-out bg-gradient-to-b from-card/80 to-card/60 backdrop-blur-md hover:from-card/95 hover:to-card/80 hover:-translate-y-2 hover:scale-[1.02] relative before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/5 before:to-transparent before:pointer-events-none"
      aria-current={isActive ? 'page' : undefined}
    >
      <motion.div 
        className={cn(
          "h-full flex flex-col relative overflow-hidden",
          isActive && "ring-2 ring-primary/60 ring-inset shadow-primary/20"
        )}
        whileHover={{ 
          y: -2, // تقليل المسافة
          transition: { duration: 0.15, ease: "easeOut" } // تسريع الحركة
        }}
        whileTap={{ scale: 0.98 }} // تقليل التأثير
        initial={{ opacity: 0, y: 10 }} // تقليل المسافة الابتدائية
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }} // تسريع الانتقال
      >
        {/* قسم الصورة المحسن */}
        {showImages && (
          <div 
            className={cn(
              "relative aspect-[5/4] overflow-hidden bg-gradient-to-br from-background/50 to-muted/20", // إضافة خلفية متدرجة
              !category.imageUrl && "flex items-center justify-center",
              !category.imageUrl && category.color
            )}
          >
            {category.imageUrl ? (
              <>
                <OptimizedImage 
                  src={category.imageUrl} 
                  alt={category.name}
                  className="group-hover:scale-102 transition-transform duration-300" // تقليل التكبير
                  fallbackColor={category.color}
                  priority={priority}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </>
            ) : (
              <>
                <div className="w-24 h-24 bg-white/25 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20 group-hover:bg-white/35 group-hover:border-white/30 transition-all duration-300 shadow-lg">
                  <IconComponent className="h-12 w-12 text-white drop-shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </>
            )}
          </div>
        )}
        
        {/* قسم النص المحسن */}
        <div className="p-5 flex-1 flex flex-col justify-between bg-gradient-to-t from-background/50 to-transparent">
          <div>
            <h3 className="font-bold text-lg mb-2 text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-1 tracking-wide">
              {category.name}
            </h3>
            
            {showDescription && (
              <p className="text-muted-foreground text-sm line-clamp-2 mb-4 leading-relaxed opacity-90 group-hover:opacity-100 transition-opacity duration-300">
                {category.description}
              </p>
            )}
          </div>
          
          <div className="relative overflow-hidden rounded-xl group/button">
            <Button 
              variant="ghost" 
              size="lg" 
              className="w-full justify-between text-muted-foreground group-hover:text-white group-hover:bg-gradient-to-r group-hover:from-primary group-hover:via-primary group-hover:to-primary/90 transition-all duration-500 h-12 text-sm font-semibold shadow-lg border border-border/30 group-hover:border-primary/60 group-hover:shadow-xl backdrop-blur-md bg-gradient-to-r from-background/90 to-background/70 relative overflow-hidden group-hover:scale-105"
              tabIndex={-1}
            >
              {/* خلفية متدرجة أنيقة */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* تأثير shimmer راقي */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-120%] group-hover:translate-x-[120%] transition-transform duration-1000 ease-out" />
              
              {/* تأثيرات ضوئية */}
              <div className="absolute top-0 left-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-white/40 to-transparent transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <span className="relative z-10 transition-all duration-300 tracking-wide">
                {t('productCategories.browse')}
              </span>
              <ArrowRight className="relative z-10 h-4 w-4 transform group-hover:translate-x-2 transition-all duration-300 group-hover:drop-shadow-lg group-hover:scale-110" />
            </Button>
          </div>
        </div>
      </motion.div>
    </Link>
  );
});

CategoryCard.displayName = 'CategoryCard';

export { CategoryCard };
