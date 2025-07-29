import { memo } from 'react';
import { motion } from 'framer-motion';
import { Tag } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CategoryHeaderProps {
  title?: string;
  description?: string;
  showDemoMessage?: boolean;
  animated?: boolean;
  centered?: boolean;
}

const CategoryHeader = memo(({ 
  title, 
  description, 
  showDemoMessage = false,
  animated = true,
  centered = true
}: CategoryHeaderProps) => {
  const { t } = useTranslation();

  return (
    <div className="text-center mb-12 md:mb-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-foreground">
          {title || t('productCategories.title')}
        </h2>
        <div className="w-16 h-1 bg-gradient-to-r from-primary to-secondary mx-auto mb-6 rounded-full" />
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          {description || t('productCategories.description')}
        </p>
      </motion.div>
      
      {showDemoMessage && (
        <motion.div 
          className="mt-8 mx-auto max-w-xl"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200/50 dark:border-amber-800/50 rounded-xl backdrop-blur-sm">
            <div className="flex items-center justify-center mb-2">
              <div className="w-6 h-6 bg-amber-500/20 rounded-full flex items-center justify-center mr-2">
                <Tag className="h-3 w-3 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="font-medium text-amber-800 dark:text-amber-200 text-sm">
                {t('productCategories.demoMessage')}
              </span>
            </div>
            <p className="text-amber-700 dark:text-amber-300 text-xs leading-relaxed text-center">
              {t('productCategories.demoDescription')}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
});

CategoryHeader.displayName = 'CategoryHeader';

export { CategoryHeader };
