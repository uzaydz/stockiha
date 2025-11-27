import React, { useState } from 'react';
import { Product } from '../types';
import { Plus, ArrowRight, ArrowLeft } from './Icons';
import { useLanguage } from '../context/LanguageContext';

interface ProductCardProps {
  product: Product;
  onOpenModal: (product: Product) => void;
  onNavigateToPage: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onOpenModal, onNavigateToPage }) => {
  const [isHovered, setIsHovered] = useState(false);
  const { t, direction, language } = useLanguage();
  const isRTL = direction === 'rtl';
  const isArabic = language === 'ar';

  // Translate Product Data or use direct values
  const productName = product.name;
  const productCategory = product.category;

  // Helper to render accurate CSS colors with texture simulation
  const getColorStyle = (colorName: string | any) => {
    // Safety check: ensure colorName is a string
    if (!colorName || typeof colorName !== 'string') {
      return '#cccccc'; // Default gray color
    }
    const lower = colorName.toLowerCase();
    if (lower.includes('strip')) return 'repeating-linear-gradient(45deg, #e5e7eb, #e5e7eb 2px, #fff 2px, #fff 4px)';
    if (lower.includes('midnight')) return '#191970';
    if (lower.includes('cream')) return '#fdfbf7';
    if (lower.includes('sage')) return '#9caf88';
    if (lower.includes('tan')) return '#d2b48c';
    if (lower.includes('charcoal')) return '#36454f';
    if (lower.includes('stone')) return '#8f8b88';
    if (lower.includes('navy')) return '#000080';
    if (lower.includes('beige')) return '#f5f5dc';
    if (lower.includes('off-white')) return '#f8f9fa';
    return lower.replace(' ', '');
  };

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <div
      className="group relative cursor-pointer flex flex-col gap-4 content-auto contain-paint"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      dir={direction}
    >
      {/* IMAGE CONTAINER */}
      <div className="relative aspect-[3/4] overflow-hidden w-full bg-gray-100 dark:bg-dark-card">

        {/* Badge - Minimalist Dot */}
        {product.isNew && (
          <div className={`absolute top-4 ${isRTL ? 'right-4' : 'left-4'} z-20 flex items-center gap-2 bg-white/90 dark:bg-black/80 backdrop-blur px-3 py-1 rounded-full`}>
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-[9px] uppercase font-bold tracking-widest text-black dark:text-white">{t('hero.new')}</span>
          </div>
        )}

        {/* Images with Cross-fade */}
        <img
          src={product.images[0]}
          alt={productName}
          className={`absolute inset-0 w-full h-full object-cover transition-transform duration-1000 ease-out will-change-transform dark:brightness-90 ${isHovered ? 'scale-110' : 'scale-100'}`}
          onClick={() => onNavigateToPage(product)}
          loading="lazy"
          decoding="async"
          width="600"
          height="800"
        />
        {product.images[1] && (
          <img
            src={product.images[1]}
            alt={productName}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-out pointer-events-none dark:brightness-90 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
            loading="lazy"
            decoding="async"
            width="600"
            height="800"
          />
        )}

        {/* INTERACTION LAYER (Glassmorphism) */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-30 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
          <div className="bg-white/80 dark:bg-black/80 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-white/40 dark:border-white/10 flex justify-between items-center">

            {/* Colors (Mini Preview) */}
            <div className="flex items-center gap-1 pl-2">
              {Array.isArray(product.colors) && product.colors.slice(0, 3).map((color, idx) => (
                <div
                  key={idx}
                  className="w-3 h-3 rounded-full border border-white/50 dark:border-white/20 shadow-sm"
                  style={{ background: getColorStyle(color) }}
                />
              ))}
              {Array.isArray(product.colors) && product.colors.length > 3 && <span className="text-[9px] text-gray-500 dark:text-gray-400">+</span>}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {/* Quick Add (Modal) */}
              <button
                onClick={(e) => { e.stopPropagation(); onOpenModal(product); }}
                className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/10 text-black dark:text-white flex items-center justify-center hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                title={t('product.add_to_bag')}
              >
                <Plus size={18} />
              </button>

              {/* Full Experience (Page) */}
              <button
                onClick={(e) => { e.stopPropagation(); onNavigateToPage(product); }}
                className="w-10 h-10 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center hover:scale-110 transition-transform"
                title="View Full Experience"
              >
                <ArrowIcon size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Dark Gradient Overlay on Hover for text readability */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 dark:group-hover:bg-black/20 transition-colors duration-500 pointer-events-none"></div>
      </div>

      {/* INFO CONTAINER */}
      <div className="flex flex-col gap-1 px-1" onClick={() => onNavigateToPage(product)}>
        <div className="flex justify-between items-start">
          {/* Name */}
          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-gray-900 dark:text-white leading-relaxed max-w-[70%] group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
            {productName}
          </h3>

          {/* PRICE - HUGE & BOLD */}
          <span className={`font-serif text-2xl leading-none text-aura-black dark:text-white ${isArabic ? '' : 'italic'}`}>
            {product.price.toLocaleString()} {isArabic ? 'دج' : 'DA'}
          </span>
        </div>

        <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest">
          {productCategory}
        </p>
      </div>
    </div>
  );
};

export default React.memo(ProductCard);