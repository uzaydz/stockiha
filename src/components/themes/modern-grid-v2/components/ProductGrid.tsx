import React, { useState, useMemo, useEffect } from 'react';
import { useStoreData } from '../context/StoreDataContext';
import ProductCard from './ProductCard';
import { Product } from '../types';
import { SlidersHorizontal, ChevronDown, ChevronUp, X, Check } from './Icons';
import { useLanguage } from '../context/LanguageContext';

interface ProductGridProps {
  onOpenModal: (product: Product) => void;
  onNavigateToPage: (product: Product) => void;
  initialCategory?: string | null;
}

type SortOption = 'newest' | 'price-asc' | 'price-desc';
type PriceRange = 'all' | 'under-150' | '150-300' | 'over-300';

const ProductGrid: React.FC<ProductGridProps> = ({ onOpenModal, onNavigateToPage, initialCategory }) => {
  const { products: PRODUCTS } = useStoreData();

  // Filter States
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [activeColor, setActiveColor] = useState<string | null>(null);
  const [activeSize, setActiveSize] = useState<string | null>(null);
  const [activePriceRange, setActivePriceRange] = useState<PriceRange>('all');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const { t, direction } = useLanguage();
  const isRTL = direction === 'rtl';

  useEffect(() => {
    if (initialCategory) {
      setActiveCategory(initialCategory);
    }
  }, [initialCategory]);

  // Expanded Options
  const [expandedSections, setExpandedSections] = useState({
    category: true,
    price: true,
    color: true,
    size: true
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Derived Data for Filters
  const categories = ['All', ...Array.from(new Set(PRODUCTS.map(p => p.category)))];
  const colors = Array.from(new Set(PRODUCTS.flatMap(p => p.colors)));
  const sizes = Array.from(new Set(PRODUCTS.flatMap(p => p.sizes)));

  // Helper to map color names to CSS
  const getColorStyle = (colorName: string) => {
    const lower = colorName.toLowerCase();
    if (lower.includes('strip')) return 'repeating-linear-gradient(45deg, #e5e7eb, #e5e7eb 5px, #fff 5px, #fff 10px)';
    if (lower.includes('midnight')) return '#191970';
    if (lower.includes('cream')) return '#fdfbf7';
    if (lower.includes('sage')) return '#9caf88';
    if (lower.includes('tan')) return '#d2b48c';
    return lower.replace(' ', '');
  };

  // Filtering Logic
  const filteredProducts = useMemo(() => {
    let result = [...PRODUCTS];

    // Category
    if (activeCategory !== 'All') {
      result = result.filter(p => p.category === activeCategory);
    }

    // Color
    if (activeColor) {
      result = result.filter(p => p.colors.includes(activeColor));
    }

    // Size
    if (activeSize) {
      result = result.filter(p => p.sizes.includes(activeSize));
    }

    // Price (Adjusted for DZD magnitudes)
    if (activePriceRange === 'under-150') {
      // Under 25,000 DA
      result = result.filter(p => p.price < 25000);
    } else if (activePriceRange === '150-300') {
      // 25,000 DA - 50,000 DA
      result = result.filter(p => p.price >= 25000 && p.price <= 50000);
    } else if (activePriceRange === 'over-300') {
      // Over 50,000 DA
      result = result.filter(p => p.price > 50000);
    }

    // Sort
    if (sortOption === 'price-asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortOption === 'price-desc') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortOption === 'newest') {
      result.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
    }

    return result;
  }, [activeCategory, activeColor, activeSize, activePriceRange, sortOption]);

  const clearFilters = () => {
    setActiveCategory('All');
    setActiveColor(null);
    setActiveSize(null);
    setActivePriceRange('all');
  };

  const FilterSidebarContent = () => (
    <div className="space-y-10">
      {/* Categories */}
      <div className="border-b border-gray-100 dark:border-white/10 pb-8">
        <button
          onClick={() => toggleSection('category')}
          className="flex justify-between items-center w-full text-sm font-bold uppercase tracking-widest mb-4 text-aura-black dark:text-white"
        >
          <span>{t('shop.category')}</span>
          {expandedSections.category ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {expandedSections.category && (
          <div className="space-y-3 animate-fade-in-up">
            {categories.map(cat => (
              <label key={cat} className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-4 h-4 border flex items-center justify-center transition-colors ${activeCategory === cat ? 'border-aura-black bg-aura-black text-white dark:bg-white dark:text-black' : 'border-gray-300 dark:border-gray-600 group-hover:border-aura-black dark:group-hover:border-white'}`}>
                  {activeCategory === cat && <Check size={10} strokeWidth={3} />}
                </div>
                <input
                  type="radio"
                  name="category"
                  className="hidden"
                  checked={activeCategory === cat}
                  onChange={() => setActiveCategory(cat)}
                />
                <span className={`text-sm ${activeCategory === cat ? 'font-bold text-aura-black dark:text-white' : 'text-gray-600 dark:text-gray-400 group-hover:text-aura-black dark:group-hover:text-white'}`}>
                  {cat === 'All' ? t('data_cat.All.name') : t(`data_cat.${cat}.name`)}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Price Range */}
      <div className="border-b border-gray-100 dark:border-white/10 pb-8">
        <button
          onClick={() => toggleSection('price')}
          className="flex justify-between items-center w-full text-sm font-bold uppercase tracking-widest mb-4 text-aura-black dark:text-white"
        >
          <span>{t('shop.price')}</span>
          {expandedSections.price ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {expandedSections.price && (
          <div className="space-y-3 animate-fade-in-up">
            {[
              { id: 'all', label: t('shop.all_prices') },
              { id: 'under-150', label: t('shop.under_150') },
              { id: '150-300', label: t('shop.range_150_300') },
              { id: 'over-300', label: t('shop.over_300') }
            ].map(option => (
              <label key={option.id} className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${activePriceRange === option.id ? 'border-aura-black border-4 dark:border-white' : 'border-gray-300 dark:border-gray-600 group-hover:border-gray-400'}`}></div>
                <input
                  type="radio"
                  name="price"
                  className="hidden"
                  checked={activePriceRange === option.id}
                  onChange={() => setActivePriceRange(option.id as PriceRange)}
                />
                <span className={`text-sm ${activePriceRange === option.id ? 'font-bold text-aura-black dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Colors */}
      <div className="border-b border-gray-100 dark:border-white/10 pb-8">
        <button
          onClick={() => toggleSection('color')}
          className="flex justify-between items-center w-full text-sm font-bold uppercase tracking-widest mb-4 text-aura-black dark:text-white"
        >
          <span>{t('shop.color')}</span>
          {expandedSections.color ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {expandedSections.color && (
          <div className="flex flex-wrap gap-3 animate-fade-in-up">
            {colors.map(color => (
              <button
                key={color}
                onClick={() => setActiveColor(activeColor === color ? null : color)}
                className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all relative ${activeColor === color ? 'ring-2 ring-aura-black dark:ring-white ring-offset-2 dark:ring-offset-black' : 'border-gray-200 dark:border-white/20 hover:scale-110'}`}
              >
                <div className="w-full h-full rounded-full border border-gray-50 dark:border-white/10" style={{ background: getColorStyle(color) }} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sizes */}
      <div>
        <button
          onClick={() => toggleSection('size')}
          className="flex justify-between items-center w-full text-sm font-bold uppercase tracking-widest mb-4 text-aura-black dark:text-white"
        >
          <span>{t('shop.size')}</span>
          {expandedSections.size ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {expandedSections.size && (
          <div className="grid grid-cols-4 gap-2 animate-fade-in-up">
            {sizes.map(size => (
              <button
                key={size}
                onClick={() => setActiveSize(activeSize === size ? null : size)}
                className={`py-2 text-xs font-medium border rounded-sm transition-colors ${activeSize === size ? 'bg-aura-black dark:bg-white text-white dark:text-black border-aura-black dark:border-white' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-white'}`}
              >
                {size}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <section className="bg-white dark:bg-dark-bg min-h-screen transition-colors duration-700 pt-24 md:pt-32 pb-24" dir={direction}>
      <div className="max-w-[1800px] mx-auto px-6">
        {/* Header Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-baseline gap-4">
            <h2 className="text-3xl md:text-5xl font-serif italic text-aura-black dark:text-white">{t('shop.title')}</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">({filteredProducts.length} {t('shop.items')})</span>
          </div>

          <div className="flex gap-4 w-full md:w-auto">
            <button
              onClick={() => setIsMobileFilterOpen(true)}
              className="md:hidden flex-1 flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-700 px-4 py-3 text-xs font-bold uppercase tracking-widest text-aura-black dark:text-white"
            >
              <SlidersHorizontal size={16} /> {t('shop.filter')}
            </button>

            <div className="relative group flex-1 md:flex-none">
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="w-full md:w-auto appearance-none bg-transparent border-b border-gray-300 dark:border-gray-700 py-2 pr-8 pl-2 text-sm font-medium outline-none cursor-pointer text-aura-black dark:text-white"
              >
                <option value="newest">{t('shop.newest')}</option>
                <option value="price-asc">{t('shop.price_low')}</option>
                <option value="price-desc">{t('shop.price_high')}</option>
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" />
            </div>
          </div>
        </div>

        <div className="flex gap-12">
          {/* Desktop Sidebar */}
          <aside className="hidden md:block w-64 shrink-0 sticky top-32 h-[calc(100vh-120px)] overflow-y-auto no-scrollbar pr-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold uppercase tracking-widest text-sm text-aura-black dark:text-white">{t('shop.filter')}</h3>
              {(activeCategory !== 'All' || activeColor || activeSize || activePriceRange !== 'all') && (
                <button onClick={clearFilters} className="text-[10px] underline text-gray-500 hover:text-black dark:hover:text-white">{t('shop.clear')}</button>
              )}
            </div>
            <FilterSidebarContent />
          </aside>

          {/* Product Grid */}
          <div className="flex-1">
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-x-6 gap-y-12">
                {filteredProducts.map(product => (
                  <div key={product.id} className="animate-fade-in-up">
                    <ProductCard
                      product={product}
                      onOpenModal={onOpenModal}
                      onNavigateToPage={onNavigateToPage}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <span className="text-6xl mb-4 text-gray-300 dark:text-gray-600">∅</span>
                <h3 className="text-xl font-serif italic mb-2 text-aura-black dark:text-white">{t('shop.no_results')}</h3>
                <p className="text-gray-500 dark:text-gray-400">{t('shop.adjust_filters')}</p>
                <button onClick={clearFilters} className="mt-6 border-b border-black dark:border-white pb-1 uppercase tracking-widest text-xs font-bold text-aura-black dark:text-white">
                  {t('shop.clear')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      <div className={`fixed inset-0 z-[100] transition-all duration-500 ${isMobileFilterOpen ? 'visible' : 'invisible pointer-events-none'}`}>
        <div className={`absolute inset-0 bg-black/50 transition-opacity duration-500 ${isMobileFilterOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setIsMobileFilterOpen(false)}></div>
        <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} top-0 h-full w-[85%] max-w-[400px] bg-white dark:bg-dark-card shadow-2xl transform transition-transform duration-500 ease-out ${isMobileFilterOpen ? 'translate-x-0' : (isRTL ? '-translate-x-full' : 'translate-x-full')} flex flex-col`}>
          <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-white/10">
            <h2 className="font-serif italic text-xl text-aura-black dark:text-white">{t('shop.filter')}</h2>
            <button onClick={() => setIsMobileFilterOpen(false)}><X size={24} className="text-aura-black dark:text-white" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <FilterSidebarContent />
          </div>
          <div className="p-6 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-black">
            <button
              onClick={() => setIsMobileFilterOpen(false)}
              className="w-full bg-aura-black dark:bg-white text-white dark:text-black py-4 uppercase tracking-widest font-bold"
            >
              {t('shop.items')} ({filteredProducts.length})
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductGrid;