
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Product, CartItem } from '../types';
import { ArrowLeft, Star, ChevronDown, ShoppingBag, Zap, Check, Ruler, X, Maximize2, CreditCard, Lock, ArrowRight } from './Icons';
import { useLanguage } from '../context/LanguageContext';
import { useStoreData } from '../context/StoreDataContext';
import ProductCard from './ProductCard';
import SalesTicker from './SalesTicker';
import BundleSelector from './BundleSelector';

interface ProductPageProps {
  product: Product;
  onBack: () => void;
  onAddToCart: (item: CartItem | CartItem[]) => void;
  onNavigateToPage: (product: Product) => void;
  onOpenModal: (product: Product) => void;
}

// --- 1. PERFORMANCE: MEMOIZED GALLERY COMPONENT ---
const ProductGallery = React.memo(({ product, selectedImageIndex, setSelectedImageIndex, productName, isRTL }: any) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleMobileScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const scrollLeft = scrollContainerRef.current.scrollLeft;
      const width = scrollContainerRef.current.offsetWidth;
      const index = Math.round(Math.abs(scrollLeft) / width);
      if (index !== selectedImageIndex) {
        setSelectedImageIndex(index);
      }
    }
  }, [selectedImageIndex, setSelectedImageIndex]);

  return (
    <div className="lg:w-[65%] relative h-auto contain-paint">
      {/* MOBILE: Hardware Accelerated Snap Carousel */}
      <div className="md:hidden relative w-full aspect-[3/4] bg-gray-50 dark:bg-dark-card overflow-hidden" dir="ltr">
        <div
          ref={scrollContainerRef}
          onScroll={handleMobileScroll}
          className="flex w-full h-full overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth will-change-transform"
        >
          {product.images.map((img: string, idx: number) => (
            <img
              key={idx}
              src={img}
              alt={`${productName} ${idx} `}
              className="min-w-full h-full object-cover object-top snap-center"
              loading={idx === 0 ? "eager" : "lazy"}
              decoding={idx === 0 ? "sync" : "async"}
            />
          ))}
        </div>

        <div className={`absolute bottom-6 ${isRTL ? 'left-6' : 'right-6'} bg-white/20 backdrop-blur-md border border-white/30 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg`}>
          {selectedImageIndex + 1} / {product.images.length}
        </div>
      </div>

      {/* DESKTOP: Sticky Atelier Layout */}
      <div className="hidden md:flex flex-row gap-8 h-[85vh] sticky top-32">
        <div className="w-24 flex flex-col gap-6 overflow-y-auto no-scrollbar h-full pb-24">
          {product.images.map((img: string, idx: number) => (
            <button
              key={idx}
              onClick={() => setSelectedImageIndex(idx)}
              className={`relative w-full aspect-[3/4] flex-shrink-0 overflow-hidden transition-all duration-500 ease-out rounded-sm ${selectedImageIndex === idx ? 'ring-1 ring-black dark:ring-white opacity-100 scale-95 shadow-sm' : 'opacity-50 hover:opacity-100 grayscale hover:grayscale-0'}`}
            >
              <img src={img} className="w-full h-full object-cover object-top" alt="Thumbnail" loading="lazy" />
            </button>
          ))}
        </div>

        <div className="flex-1 h-full bg-gray-50 dark:bg-dark-card relative rounded-sm overflow-hidden shadow-sm group">
          <img
            src={product.images[selectedImageIndex]}
            alt={productName}
            className="w-full h-full object-cover object-top transition-transform duration-700"
            // @ts-ignore
            fetchPriority="high"
            loading="eager"
            decoding="sync"
          />

          <div className={`absolute top-6 ${isRTL ? 'left-6' : 'right-6'} bg-white/90 dark:bg-black/80 backdrop-blur p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0 cursor-pointer shadow-xl hover:scale-110`}>
            <Maximize2 size={18} className="text-black dark:text-white" />
          </div>
        </div>
      </div>
    </div>
  );
});

// --- 2. PERFORMANCE: MEMOIZED FORM COMPONENT ---
const ProductDetails = React.memo(({
  product, productName, productDesc, productCategory,
  t, isRTL, isArabic,
  onAddToCart, onAddBundle, onDirectOrder
}: any) => {

  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [openAccordion, setOpenAccordion] = useState<string | null>('desc');
  const [showDirectForm, setShowDirectForm] = useState(false);
  const [directCheckoutItems, setDirectCheckoutItems] = useState<CartItem[]>([]);
  const [orderPlaced, setOrderPlaced] = useState(false);

  const handleAddToCart = useCallback(() => {
    if (!selectedSize || !selectedColor) return;
    onAddToCart({ ...product, quantity: 1, selectedSize, selectedColor });
  }, [selectedSize, selectedColor, product, onAddToCart]);

  const handleBundleDirectOrder = useCallback((items: CartItem[]) => {
    setDirectCheckoutItems(items);
    setShowDirectForm(true);
  }, []);

  const toggleDirectForm = useCallback(() => {
    if (selectedSize && selectedColor) {
      if (showDirectForm) {
        setShowDirectForm(false);
      } else {
        setDirectCheckoutItems([{ ...product, quantity: 1, selectedSize, selectedColor }]);
        setShowDirectForm(true);
      }
    }
  }, [selectedSize, selectedColor, showDirectForm, product]);

  const handleDirectOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTimeout(() => {
      setOrderPlaced(true);
      setTimeout(() => {
        setOrderPlaced(false);
        setShowDirectForm(false);
        setDirectCheckoutItems([]);
      }, 3000);
    }, 1500);
  };

  const directOrderTotal = useMemo(() =>
    directCheckoutItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [directCheckoutItems]);

  return (
    <div className="lg:w-[35%] px-6 md:px-0 pt-4 lg:sticky lg:top-32 h-fit z-20">
      <div className="space-y-10">

        {/* Header Info */}
        <div className="space-y-6 border-b border-gray-100 dark:border-white/10 pb-10">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-400">{productCategory}</span>
            {product.isNew && (
              <span className="flex items-center gap-1 text-[9px] uppercase font-bold tracking-widest text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-full border border-red-100 dark:border-red-900/30">
                <Zap size={10} fill="currentColor" /> {t('hero.new')}
              </span>
            )}
          </div>

          <h1 className="text-5xl md:text-6xl xl:text-7xl font-serif leading-[0.9] text-gray-900 dark:text-white tracking-tight">
            {productName}
          </h1>

          <div className="flex flex-col items-start pt-2 gap-5">
            <div className="flex items-center gap-6 w-full justify-between">
              <span className="text-3xl font-light tracking-tight font-serif italic text-aura-black dark:text-white">{product.price.toLocaleString()} {isArabic ? 'دج' : 'DA'}</span>
              <div className="flex items-center gap-2 cursor-pointer group opacity-80 hover:opacity-100 transition-opacity">
                <div className="flex text-yellow-500">
                  {[...Array(5)].map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
                </div>
                <span className="text-[10px] font-bold underline underline-offset-4 decoration-gray-200 dark:decoration-gray-600 group-hover:decoration-black dark:group-hover:decoration-white transition-all">128 {t('product.reviews')}</span>
              </div>
            </div>
            <SalesTicker />
          </div>
        </div>

        {/* Controls */}
        <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          {/* Color */}
          <div className="mb-8">
            <div className="flex justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-gray-900 dark:text-white">{t('product.color')}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{selectedColor || t('product.select_options')}</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {product.colors.map((color: string) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 relative group ${selectedColor === color ? 'scale-110 ring-1 ring-black dark:ring-white ring-offset-4 dark:ring-offset-black' : 'hover:scale-105 hover:ring-1 hover:ring-gray-200 dark:hover:ring-gray-700 hover:ring-offset-2 dark:hover:ring-offset-black'}`}
                >
                  <div
                    className="w-full h-full rounded-full border border-gray-200 dark:border-white/10 shadow-sm"
                    style={{ backgroundColor: color.toLowerCase().includes('strip') ? 'transparent' : color.replace(' ', '').toLowerCase() }}
                  />
                  {selectedColor === color && (
                    <div className={`absolute -bottom-1 ${isRTL ? '-left-1' : '-right-1'} bg-black dark:bg-white text-white dark:text-black rounded-full p-0.5 shadow-lg scale-75`}>
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Size */}
          <div className="mb-10">
            <div className="flex justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-gray-900 dark:text-white">{t('product.size')}</span>
              <button className="flex items-center gap-1 text-[10px] underline text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                <Ruler size={10} /> {t('product.fit_guide')}
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {product.sizes.map((size: string) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`h-12 border rounded-sm flex items-center justify-center text-xs font-medium transition-all duration-300 ${selectedSize === size ? 'bg-aura-black text-white dark:bg-white dark:text-black border-aura-black dark:border-white shadow-md -translate-y-0.5' : 'bg-white dark:bg-dark-card border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-black dark:hover:border-white'}`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="space-y-4">
            <button
              onClick={handleAddToCart}
              disabled={!selectedSize || !selectedColor}
              className="w-full h-14 bg-aura-black dark:bg-white text-white dark:text-black text-xs uppercase tracking-[0.25em] font-bold hover:bg-gray-900 dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl hover:shadow-2xl flex items-center justify-center gap-4 group rounded-sm"
            >
              <span>{selectedSize && selectedColor ? t('product.add_to_bag') : t('product.select_options')}</span>
              <ShoppingBag size={16} className="group-hover:-translate-y-0.5 transition-transform duration-300" />
            </button>

            {!showDirectForm && (
              <button
                onClick={toggleDirectForm}
                disabled={!selectedSize || !selectedColor}
                className="w-full h-12 border border-gray-300 dark:border-white/30 bg-transparent text-black dark:text-white text-[10px] uppercase tracking-[0.25em] font-bold hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black hover:border-black dark:hover:border-white disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded-sm"
              >
                {t('product.order_directly')}
              </button>
            )}
          </div>
        </div>

        {/* Inline Direct Checkout Form */}
        <div className={`overflow-hidden transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1) ${showDirectForm ? 'max-h-[1200px] opacity-100 mt-8' : 'max-h-0 opacity-0 mt-0'}`}>
          <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 p-8 rounded-sm relative shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)]">
            <button onClick={() => setShowDirectForm(false)} className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} text-gray-400 hover:text-black dark:hover:text-white transition-colors`}>
              <X size={16} />
            </button>

            <div className="flex items-center gap-2 mb-8 text-aura-black dark:text-white">
              <Zap size={14} className="fill-current text-yellow-500" />
              <h3 className="text-xs font-bold uppercase tracking-widest">{t('product.fast_checkout')}</h3>
            </div>

            {orderPlaced ? (
              <div className="bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-500/20 p-8 text-center rounded-sm animate-fade-in-up">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check size={20} />
                </div>
                <p className="font-serif text-xl text-green-800 dark:text-green-100 mb-2">{t('checkout.order_confirmed')}</p>
              </div>
            ) : (
              <form onSubmit={handleDirectOrderSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <input required type="text" placeholder={t('checkout.fname')} className="w-full pb-3 bg-transparent border-b border-gray-200 dark:border-gray-700 focus:border-black dark:focus:border-white outline-none text-sm transition-colors text-black dark:text-white placeholder-gray-400" />
                  <input required type="text" placeholder={t('checkout.lname')} className="w-full pb-3 bg-transparent border-b border-gray-200 dark:border-gray-700 focus:border-black dark:focus:border-white outline-none text-sm transition-colors text-black dark:text-white placeholder-gray-400" />
                </div>
                <input required type="text" placeholder={t('checkout.address')} className="w-full pb-3 bg-transparent border-b border-gray-200 dark:border-gray-700 focus:border-black dark:focus:border-white outline-none text-sm transition-colors text-black dark:text-white placeholder-gray-400" />

                <div className="relative pt-2">
                  <input required type="text" placeholder={t('checkout.card_number')} className={`w-full pb-3 bg-transparent border-b border-gray-200 dark:border-gray-700 focus:border-black dark:focus:border-white outline-none text-sm transition-colors font-mono text-black dark:text-white placeholder-gray-400 ${isRTL ? 'pl-8' : 'pr-8'}`} />
                  <CreditCard size={14} className={`absolute ${isRTL ? 'left-0' : 'right-0'} top - 3 text - gray - 400`} />
                </div>

                <div className="bg-gray-50 dark:bg-black/30 border border-gray-100 dark:border-white/5 p-4 text-xs rounded-sm space-y-3">
                  <div className="flex justify-between font-bold text-gray-500 uppercase tracking-wider text-[9px]">
                    <span>{t('product.order_summary')}</span>
                  </div>
                  <div className="max-h-24 overflow-y-auto pr-2 space-y-2 no-scrollbar">
                    {directCheckoutItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start border-b border-dashed border-gray-200 dark:border-white/10 pb-2 last:border-0 last:pb-0">
                        <div className="flex flex-col">
                          <span className="font-serif italic text-sm text-gray-900 dark:text-white">{item.name}</span>
                          <span className="text-gray-500 text-[10px] mt-0.5">{item.selectedColor} / {item.selectedSize}</span>
                        </div>
                        <span className="font-mono text-black dark:text-white text-xs font-medium">
                          {item.price === 0 ? t('offers.free') : `${item.price.toLocaleString()} ${isArabic ? 'دج' : 'DA'} `}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-200 dark:border-white/10 pt-3 flex justify-between font-bold text-black dark:text-white text-sm">
                    <span>{t('product.total')}</span>
                    <span>{directOrderTotal.toLocaleString()} {isArabic ? 'دج' : 'DA'}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-black dark:bg-white text-white dark:text-black py-4 uppercase tracking-widest text-[10px] font-bold hover:opacity-90 transition-opacity shadow-md"
                >
                  {t('product.complete_order')}
                </button>

                <div className="flex items-center justify-center gap-2 text-[9px] text-gray-400 uppercase tracking-widest">
                  <Lock size={10} /> {t('product.secure')}
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Bundle Selector */}
        <BundleSelector product={product} onAddBundle={onAddBundle} onDirectOrder={handleBundleDirectOrder} />

        {/* Accordions */}
        <div className="space-y-0 border-t border-gray-100 dark:border-white/10 pt-6 mt-10">
          {[
            { id: 'desc', label: t('product.description'), content: productDesc },
            { id: 'details', label: t('product.material'), content: t('product.material_content') },
            { id: 'ship', label: t('product.shipping'), content: t('product.shipping_content') }
          ].map((item) => (
            <div key={item.id} className="border-b border-gray-100 dark:border-white/10">
              <button
                onClick={() => setOpenAccordion(openAccordion === item.id ? null : item.id)}
                className="w-full py-5 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest hover:text-gray-500 transition-colors text-start text-gray-900 dark:text-white"
              >
                {item.label}
                <span className={`transition-transform duration-300 ${openAccordion === item.id ? 'rotate-180' : 'rotate-0'}`}>
                  <ChevronDown size={14} />
                </span>
              </button>
              <div className={`overflow-hidden transition-all duration-500 ease-cubic ${openAccordion === item.id ? 'max-h-48 opacity-100 mb-6' : 'max-h-0 opacity-0'}`}>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-loose font-serif">{item.content}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

const ProductPage: React.FC<ProductPageProps> = ({ product, onBack, onAddToCart, onNavigateToPage, onOpenModal }) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const { t, direction, language } = useLanguage();
  const { products: PRODUCTS } = useStoreData();
  const isRTL = direction === 'rtl';
  const isArabic = language === 'ar';

  // Reset image on product change
  useEffect(() => {
    setSelectedImageIndex(0);
    window.scrollTo(0, 0);
  }, [product.id]);

  // Derived data
  const productName = product.name;
  const productDesc = product.description;
  const productCategory = product.category;

  // Related Products logic (Memoized for performance)
  const relatedProducts = useMemo(() => {
    let related = PRODUCTS.filter(p => p.category === product.category && p.id !== product.id);
    if (related.length < 3) {
      const fillers = PRODUCTS.filter(p => p.isNew && p.id !== product.id && !related.includes(p));
      related = [...related, ...fillers];
    }
    return related.slice(0, 3);
  }, [product.id, product.category, PRODUCTS]);

  const ArrowBackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="min-h-screen bg-white dark:bg-dark-bg text-aura-black dark:text-white animate-fade-in-up font-sans selection:bg-aura-black selection:text-white transition-colors duration-700" dir={direction}>

      {/* Breadcrumb */}
      <div className="pt-32 pb-8 px-6 max-w-[1600px] mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-3 text-[10px] uppercase tracking-widest font-bold hover:text-gray-500 transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center group-hover:bg-black dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-black transition-colors">
            <ArrowBackIcon size={14} />
          </div>
          <span className="text-gray-400">{t('nav.shop')}</span> / <span className="text-gray-900 dark:text-white">{productName}</span>
        </button>
      </div>

      <div className="max-w-[1600px] mx-auto px-0 md:px-6 pb-24">
        <div className="flex flex-col lg:flex-row gap-12 xl:gap-24 relative">

          {/* LEFT: GALLERY (Memoized) */}
          <ProductGallery
            product={product}
            selectedImageIndex={selectedImageIndex}
            setSelectedImageIndex={setSelectedImageIndex}
            productName={productName}
            isRTL={isRTL}
          />

          {/* RIGHT: DETAILS & FORM (Memoized) */}
          <ProductDetails
            product={product}
            productName={productName}
            productDesc={productDesc}
            productCategory={productCategory}
            t={t}
            isRTL={isRTL}
            isArabic={isArabic}
            onAddToCart={onAddToCart}
            onAddBundle={onAddToCart} // Bundle logic reuses handleAddToCart which supports arrays
            onDirectOrder={() => { }} // Logic handled inside
          />

        </div>
      </div>

      {/* RELATED SECTION (Content Visibility Auto for Performance) */}
      <section className="py-32 border-t border-gray-50 dark:border-white/5 bg-gray-50/50 dark:bg-[#050505] content-auto">
        <div className="max-w-[1600px] mx-auto px-6">
          <div className="mb-16 text-center md:text-start">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400 mb-3 block">
              {t('product.related_subtitle')}
            </span>
            <h2 className="text-4xl md:text-5xl font-serif italic text-gray-900 dark:text-white">
              {t('product.related_title')}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {relatedProducts.map(relatedProduct => (
              <div key={relatedProduct.id} className="animate-fade-in-up">
                <ProductCard
                  product={relatedProduct}
                  onNavigateToPage={onNavigateToPage}
                  onOpenModal={onOpenModal}
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default React.memo(ProductPage);
