import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ChevronRight, 
  TrendingUp, 
  Sparkles, 
  GripHorizontal, 
  Layers 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';

interface FeaturedProductsHeaderProps {
  title?: string;
  description?: string;
  viewType: 'grid' | 'list';
  onViewTypeChange: (type: 'grid' | 'list') => void;
}

const FeaturedProductsHeader = memo(({ 
  title, 
  description, 
  viewType, 
  onViewTypeChange 
}: FeaturedProductsHeaderProps) => {
  const { t } = useTranslation();

  return (
    <>
      {/* العنوان الرئيسي المحسن */}
      <motion.div 
        className="text-center mb-12 md:mb-16"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <motion.div 
          className="inline-flex items-center gap-2 px-4 py-2 mb-6 bg-gradient-to-r from-primary/10 to-secondary/10 backdrop-blur-sm rounded-full text-primary font-medium text-sm border border-primary/20"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.2 }}
        >
          <Sparkles className="w-4 h-4" />
          {t('featuredProducts.featuredLabel')}
        </motion.div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent bg-300% animate-gradient-x">
          {title || t('featuredProducts.title')}
        </h2>
        <div className="w-20 h-1 bg-gradient-to-r from-primary to-secondary mx-auto mb-6 rounded-full"></div>
        <p className="max-w-2xl mx-auto text-muted-foreground text-lg leading-relaxed">
          {description || t('featuredProducts.description')}
        </p>
      </motion.div>
      
      {/* شريط التحكم المحسن */}
      <motion.div 
        className="flex flex-col sm:flex-row items-center justify-between mb-12 bg-card/60 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-border/50 shadow-lg"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="flex items-center mb-4 sm:mb-0">
          <div className="flex items-center gap-3 px-4 py-2 bg-primary/10 rounded-full">
            <TrendingUp className="h-5 w-5 text-primary" />
            <Link 
              to="/products" 
              className="text-primary font-medium text-sm hover:text-primary/80 transition-colors flex items-center group"
            >
              {t('featuredProducts.allProducts')}
              <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:block">
            {t('featuredProducts.viewMode')}:
          </span>
          <TooltipProvider>
            <div className="flex items-center gap-2 bg-muted/50 rounded-xl p-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant={viewType === 'grid' ? 'default' : 'ghost'} 
                    size="sm"
                    className="h-9 px-3 rounded-lg transition-all duration-200" 
                    onClick={() => onViewTypeChange('grid')}
                  >
                    <GripHorizontal className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">{t('featuredProducts.grid')}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('featuredProducts.gridView')}</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant={viewType === 'list' ? 'default' : 'ghost'} 
                    size="sm"
                    className="h-9 px-3 rounded-lg transition-all duration-200" 
                    onClick={() => onViewTypeChange('list')}
                  >
                    <Layers className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">{t('featuredProducts.list')}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('featuredProducts.listView')}</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      </motion.div>
    </>
  );
});

FeaturedProductsHeader.displayName = 'FeaturedProductsHeader';

export default FeaturedProductsHeader; 