import React from 'react';
import { useStoreData } from '../context/StoreDataContext';
import { ArrowUpRight } from './Icons';
import { useLanguage } from '../context/LanguageContext';

interface CategorySectionProps {
  onCategoryClick: (categoryName: string) => void;
}

const CategorySection: React.FC<CategorySectionProps> = ({ onCategoryClick }) => {
  const { categories: CATEGORIES } = useStoreData();
  const { t, direction } = useLanguage();

  return (
    <section id="categories" className="py-16 md:py-32 bg-white dark:bg-dark-bg relative z-10 border-t border-gray-50 dark:border-white/5 transition-colors duration-700" dir={direction}>
      <div className="max-w-[1600px] mx-auto px-4 md:px-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 md:mb-20 border-b border-gray-100 dark:border-white/10 pb-8">
          <div>
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] text-gray-400 mb-4 block">Curated</span>
            <h2 className="text-4xl md:text-5xl lg:text-7xl font-serif italic text-aura-black dark:text-white">
              {t('shop.title')}
            </h2>
          </div>
          <p className="text-gray-500 dark:text-gray-400 max-w-xs text-xs md:text-sm mt-6 md:mt-0 leading-relaxed hidden md:block">
            {t('shop.subtitle')}
          </p>
        </div>

        {/* Grid - Asymmetrical Staggered Layout */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8 lg:gap-12">
          {CATEGORIES.map((category, index) => {
            // Translate Data or use raw name
            const catName = category.name; // For now, use the name directly as translation keys might not match dynamic data
            const catDesc = category.description || t(`data_cat.${category.name}.desc`);

            return (
              <div
                key={category.id}
                onClick={() => onCategoryClick(category.name)} // Pass original English name for filter logic
                // Uses modulo math to repeat the staggering pattern every 3 items
                className={`group cursor-pointer flex flex-col gap-3 md:gap-6 ${index % 3 === 1 ? 'md:pt-24' : ''} ${index % 3 === 2 ? 'col-span-2 md:col-span-1' : ''}`}
              >
                <div className={`relative overflow-hidden w-full bg-gray-100 dark:bg-dark-card rounded-sm ${index % 3 === 2 ? 'aspect-[16/9] md:aspect-[3/4]' : 'aspect-[3/4]'}`}>
                  <img
                    src={category.image}
                    alt={catName}
                    className="w-full h-full object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-110 grayscale-[20%] group-hover:grayscale-0 dark:grayscale-[30%] dark:brightness-90"
                    loading="lazy"
                    decoding="async"
                    width="800"
                    height="1000"
                  />
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/10 dark:bg-black/20 group-hover:bg-black/0 transition-colors duration-500"></div>

                  {/* Hover Badge */}
                  <div className="absolute top-2 right-2 md:top-6 md:right-6 bg-white/90 dark:bg-black/90 backdrop-blur text-black dark:text-white w-8 h-8 md:w-12 md:h-12 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transform scale-50 group-hover:scale-100 transition-all duration-500 z-10 shadow-lg">
                    <ArrowUpRight size={14} className="md:w-[18px] md:h-[18px]" strokeWidth={1.5} />
                  </div>
                </div>

                <div className="space-y-1 md:space-y-2 px-1">
                  <div className="flex justify-between items-baseline border-b border-gray-200 dark:border-white/10 pb-2 md:pb-4 group-hover:border-black dark:group-hover:border-white transition-colors duration-700 relative">
                    <h3 className="text-lg md:text-3xl font-serif italic text-aura-black dark:text-white">{catName}</h3>
                    <span className="hidden md:inline text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-500 -translate-x-4 group-hover:translate-x-0 dark:text-gray-300">
                      Explore
                    </span>
                    {/* Animated Line */}
                    <div className="absolute bottom-[-1px] left-0 w-full h-px bg-black dark:bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-left"></div>
                  </div>
                  <p className="text-[10px] md:text-sm text-gray-500 dark:text-gray-400 leading-relaxed pt-1 md:pt-2 opacity-70 group-hover:opacity-100 transition-opacity duration-500 line-clamp-2 md:line-clamp-none">
                    {catDesc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CategorySection;