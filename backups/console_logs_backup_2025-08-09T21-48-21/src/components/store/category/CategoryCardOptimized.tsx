import { memo, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Layers, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { OptimizedImageEnhanced } from './OptimizedImageEnhanced';
import { categoryIcons } from './constants';
import type { CategoryCardProps } from './types';

/**
 * مكون كارت الفئة المحسّن
 * محسّن للأداء مع تقليل re-renders وتحسين التفاعل
 */
const CategoryCardOptimized = memo<CategoryCardProps>(({ 
  category, 
  activeCategoryId,
  useRealCategories = true,
  showImages = true,
  showDescription = false,
  priority = false,
  lazy = false,
  onLoad,
  onError
}) => {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  
  // تحسين الحسابات باستخدام useMemo
  const computedValues = useMemo(() => {
    const isActive = category.id === activeCategoryId;
    const IconComponent = categoryIcons[category.icon || 'layers'] || Layers;
    const linkTo = useRealCategories 
      ? `/products?category=${category.id}` 
      : `/products?demo_category=${category.slug}`;
    
    return { isActive, IconComponent, linkTo };
  }, [category.id, category.icon, category.slug, activeCategoryId, useRealCategories]);

  // تحسين callbacks
  const handleImageLoad = useCallback(() => {
    onLoad?.();
  }, [onLoad]);

  const handleImageError = useCallback((error: Error) => {
    onError?.(error);
  }, [onError]);

  // انيميشنز محسّنة
  const cardVariants = useMemo(() => ({
    initial: { opacity: 0, y: 8, scale: 0.98 },
    animate: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { duration: 0.2 }
    },
    hover: { 
      y: -3,
      scale: 1.01,
      transition: { duration: 0.15 }
    },
    tap: { scale: 0.98 }
  }), []);

  return (
    <Link 
      to={computedValues.linkTo}
      className="block h-full group rounded-3xl overflow-hidden shadow-lg hover:shadow-xl border border-border/20 hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors duration-200 ease-out bg-gradient-to-b from-card/90 to-card/70 hover:from-card/95 hover:to-card/85 relative before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/5 before:to-transparent before:pointer-events-none"
      aria-current={computedValues.isActive ? 'page' : undefined}
    >
      <motion.div 
        className={cn(
          "h-full flex flex-col relative overflow-hidden will-change-transform",
          computedValues.isActive && "ring-2 ring-primary/60 ring-inset shadow-primary/20"
        )}
        variants={cardVariants}
        initial="initial"
        animate="animate"
        whileHover={prefersReducedMotion ? undefined : "hover"}
        whileTap={prefersReducedMotion ? undefined : "tap"}
      >
        {/* شارة "جديد" */}
        {category.isNew && (
          <div className="absolute top-3 right-3 z-10">
            <div className="bg-gradient-to-r from-primary to-secondary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
              <Sparkles className="h-3 w-3" />
              {t('common.new')}
            </div>
          </div>
        )}

        {/* قسم الصورة المحسن */}
        {showImages && (
          <div 
            className={cn(
              "relative aspect-[5/4] overflow-hidden bg-gradient-to-br from-background/50 to-muted/20",
              !category.imageUrl && "flex items-center justify-center",
              !category.imageUrl && category.color
            )}
          >
            {category.imageUrl ? (
              <>
                 <OptimizedImageEnhanced 
                   src={category.imageUrl} 
                   alt={category.name}
                   className="motion-safe:group-hover:scale-105 motion-reduce:transition-none transition-transform duration-500 will-change-transform"
                   fallbackColor={category.color}
                   priority={priority}
                   lazy={lazy}
                   onLoad={handleImageLoad}
                   onError={handleImageError}
                 />
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-white/25 rounded-full flex items-center justify-center border border-white/20 group-hover:bg-white/35 group-hover:border-white/30 transition-colors duration-300 shadow-lg">
                  <computedValues.IconComponent className="h-10 w-10 text-white drop-shadow-lg motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-110 motion-safe:group-hover:rotate-3" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </>
            )}
          </div>
        )}
        
        {/* قسم النص المحسن */}
        <div className="p-4 flex-1 flex flex-col justify-between bg-gradient-to-t from-background/50 to-transparent">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-1 tracking-wide flex-1">
                {category.name}
              </h3>
              {category.productCount !== undefined && (
                <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full ml-2 shrink-0">
                  {category.productCount}
                </span>
              )}
            </div>
            
            {showDescription && category.description && (
              <p className="text-muted-foreground text-sm line-clamp-2 mb-3 leading-relaxed opacity-90 group-hover:opacity-100 transition-opacity duration-300">
                {category.description}
              </p>
            )}
          </div>
          
          {/* زر التصفح المحسن */}
          <div className="relative overflow-hidden rounded-xl">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-between h-10 text-sm font-medium rounded-xl border border-border/40 bg-transparent text-foreground hover:!bg-primary hover:!text-primary-foreground transition-colors duration-200"
              tabIndex={-1}
            >
              <span className="relative z-10">
                {t('productCategories.browse')}
              </span>
              <ArrowRight className="relative z-10 h-4 w-4 transform motion-safe:hover:translate-x-1 motion-reduce:transition-none transition-transform duration-200" />
            </Button>
          </div>
        </div>
      </motion.div>
    </Link>
  );
});

CategoryCardOptimized.displayName = 'CategoryCardOptimized';

export { CategoryCardOptimized };
