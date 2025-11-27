import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ShoppingBag, ArrowRight, ArrowLeft } from './Icons';
import { Product, CartItem } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: CartItem) => void;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, isOpen, onClose, onAddToCart }) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [error, setError] = useState<string>('');
  const { t, direction, language } = useLanguage();
  const isRTL = direction === 'rtl';
  const isArabic = language === 'ar';

  // Reset state when product changes
  useEffect(() => {
    if (isOpen && product) {
      setSelectedImageIndex(0);
      setSelectedSize('');
      setSelectedColor('');
      setError('');
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const handleAddToCart = () => {
    if (!selectedSize) {
      setError(t('product.size_error'));
      return;
    }
    if (!selectedColor) {
      setError(t('product.color_error'));
      return;
    }

    setError('');
    const cartItem: CartItem = {
      ...product,
      quantity: 1,
      selectedSize,
      selectedColor
    };
    onAddToCart(cartItem);
    onClose();
  };

  const ChevronIcon = isRTL ? ArrowLeft : ChevronRight;

  // Translations or direct values
  const productName = product.name;
  const productDesc = product.description;
  const productCategory = product.category;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4" dir={direction}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="bg-white dark:bg-dark-card w-full max-w-6xl h-[90vh] md:h-auto md:aspect-[16/9] max-h-[800px] rounded-sm shadow-2xl relative flex flex-col md:flex-row overflow-hidden animate-fade-in-up transition-colors duration-300">
        <button
          onClick={onClose}
          className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} z-20 p-2 bg-white/80 dark:bg-black/80 backdrop-blur hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-full transition-colors`}
        >
          <X size={24} className="text-black dark:text-white" />
        </button>

        {/* Image Gallery */}
        <div className="w-full md:w-3/5 bg-gray-100 dark:bg-dark-bg relative flex flex-col md:flex-row h-1/2 md:h-full">
          {/* Thumbnails */}
          <div className={`hidden md:flex flex-col w-24 h-full overflow-y-auto ${isRTL ? 'border-l' : 'border-r'} border-gray-200 dark:border-white/10 no-scrollbar`}>
            {product.images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImageIndex(idx)}
                className={`w-full aspect-[3/4] border-b border-gray-200 dark:border-white/10 relative overflow-hidden group ${selectedImageIndex === idx ? 'opacity-100 ring-2 ring-inset ring-black dark:ring-white' : 'opacity-60'}`}
              >
                <img
                  src={img}
                  alt={`View ${idx}`}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                />
              </button>
            ))}
          </div>

          {/* Main Image */}
          <div className="flex-1 relative h-full bg-gray-50 dark:bg-dark-card">
            <img
              src={product.images[selectedImageIndex]}
              alt={productName}
              className="w-full h-full object-contain md:object-cover"
              loading="eager" // Eager load the active modal image
              decoding="sync"
            />

            {/* Mobile Dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 md:hidden">
              {product.images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`w-2 h-2 rounded-full shadow-sm ${selectedImageIndex === idx ? 'bg-black dark:bg-white' : 'bg-white dark:bg-gray-600'}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Product Details */}
        <div className="w-full md:w-2/5 p-8 md:p-12 overflow-y-auto flex flex-col">
          <div className="mb-1">
            <span className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-widest">{productCategory}</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-serif mb-4 text-aura-black dark:text-white">{productName}</h2>
          <p className="text-xl mb-6 font-light text-aura-black dark:text-white">{product.price.toLocaleString()} {isArabic ? 'دج' : 'DA'}</p>

          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-8 text-sm md:text-base">
            {productDesc}
          </p>

          {/* Color Selection */}
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-widest mb-3 text-aura-black dark:text-white">{t('product.color')}: <span className="font-normal text-gray-600 dark:text-gray-400">{selectedColor}</span></p>
            <div className="flex gap-3">
              {product.colors.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center transition-all ${selectedColor === color ? 'ring-2 ring-black dark:ring-white ring-offset-2 dark:ring-offset-black scale-110' : 'hover:scale-110'}`}
                  title={color}
                >
                  <div
                    className="w-full h-full rounded-full border border-gray-100 dark:border-white/10"
                    style={{ backgroundColor: color.toLowerCase().includes('strip') ? 'transparent' : color.replace(' ', '').toLowerCase(), backgroundImage: color.toLowerCase().includes('strip') ? 'repeating-linear-gradient(45deg, #ccc, #ccc 5px, #fff 5px, #fff 10px)' : 'none' }}
                  ></div>
                </button>
              ))}
            </div>
          </div>

          {/* Size Selection */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-3">
              <p className="text-xs font-bold uppercase tracking-widest text-aura-black dark:text-white">{t('product.size')}: <span className="font-normal text-gray-600 dark:text-gray-400">{selectedSize}</span></p>
              <button className="text-xs underline text-gray-400 hover:text-black dark:hover:text-white">{t('product.fit_guide')}</button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {product.sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`py-3 border transition-all text-sm ${selectedSize === size
                      ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-white text-gray-700 dark:text-gray-300'
                    }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 text-red-500 text-sm text-center animate-pulse">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="mt-auto space-y-3">
            <button
              onClick={handleAddToCart}
              className="w-full bg-aura-black dark:bg-white text-white dark:text-black py-4 uppercase tracking-widest font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-all flex items-center justify-center gap-3 group"
            >
              <ShoppingBag size={18} />
              {t('product.add_to_bag')}
              <ChevronIcon size={16} className={`transition-transform ${isRTL ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} />
            </button>
            <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">{t('product.free_shipping')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ProductDetailModal);