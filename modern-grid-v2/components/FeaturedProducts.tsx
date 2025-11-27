import React from 'react';
import { useStoreData } from '../context/StoreDataContext';
import ProductCard from './ProductCard';
import { Product } from '../types';
import { ArrowRight, ArrowLeft } from './Icons';
import { useLanguage } from '../context/LanguageContext';

interface FeaturedProductsProps {
  onOpenModal: (product: Product) => void;
  onNavigateToPage: (product: Product) => void;
  onViewAll: () => void;
}

const FeaturedProducts: React.FC<FeaturedProductsProps> = ({ onOpenModal, onNavigateToPage, onViewAll }) => {
  const { products } = useStoreData();
  // Curate the "Best" products - for now, we take the top 3 distinct items
  const featuredProducts = products.slice(0, 3);
  const { t, direction } = useLanguage();
  const isRTL = direction === 'rtl';
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <section className="py-24 bg-white dark:bg-dark-bg border-t border-gray-50 dark:border-white/5 transition-colors duration-700 content-visibility-auto" dir={direction}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2 block">{t('featured.label')}</span>
            <h2 className="text-4xl md:text-5xl font-serif italic text-aura-black dark:text-white">{t('featured.title')}</h2>
          </div>

          <button
            onClick={onViewAll}
            className="hidden md:flex items-center gap-3 text-sm uppercase tracking-widest font-medium hover:text-gray-600 dark:hover:text-gray-300 transition-colors group text-aura-black dark:text-white"
          >
            {t('featured.view_all')}
            <ArrowIcon size={16} className={`transition-transform ${isRTL ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
          {featuredProducts.map((product) => (
            <div key={product.id} className="animate-fade-in-up">
              <ProductCard
                product={product}
                onOpenModal={onOpenModal}
                onNavigateToPage={onNavigateToPage}
              />
            </div>
          ))}
        </div>

        {/* Mobile View All Button */}
        <div className="mt-16 flex justify-center md:hidden">
          <button
            onClick={onViewAll}
            className="bg-aura-black dark:bg-white text-white dark:text-black px-8 py-4 uppercase tracking-widest text-xs font-bold hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors w-full"
          >
            {t('featured.view_full')}
          </button>
        </div>
      </div>
    </section>
  );
};

export default React.memo(FeaturedProducts);