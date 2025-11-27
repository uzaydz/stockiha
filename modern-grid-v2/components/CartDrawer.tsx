import React from 'react';
import { X, Minus, Plus, ShoppingBag } from './Icons';
import { CartItem } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (id: number, size: string, color: string, delta: number) => void;
  onCheckout: () => void;
}

const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose, items, onUpdateQuantity, onCheckout }) => {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const { t, direction, language } = useLanguage();
  const isRTL = direction === 'rtl';
  const isArabic = language === 'ar';

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] transition-opacity duration-300"
          onClick={onClose}
        ></div>
      )}

      {/* Drawer */}
      <div className={`fixed top-0 ${isRTL ? 'left-0' : 'right-0'} h-full w-full md:w-[450px] bg-white dark:bg-dark-card z-[80] transform transition-all duration-500 ease-in-out shadow-2xl flex flex-col ${isOpen ? 'translate-x-0 visible' : isRTL ? '-translate-x-full invisible' : 'translate-x-full invisible'} ${!isOpen ? 'pointer-events-none' : ''}`} dir={direction}>
        <div className="p-6 flex justify-between items-center border-b border-gray-100 dark:border-white/10">
          <h2 className="text-2xl font-serif italic text-aura-black dark:text-white">{t('cart.title')}</h2>
          <button onClick={onClose} className="hover:rotate-90 transition-transform duration-300 text-aura-black dark:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
              <ShoppingBag size={48} strokeWidth={1} />
              <p className="uppercase tracking-widest text-sm">{t('cart.empty')}</p>
              <button onClick={onClose} className="text-aura-black dark:text-white underline underline-offset-4 text-sm">{t('cart.start_shopping')}</button>
            </div>
          ) : (
            <div className="space-y-6">
              {items.map((item, idx) => {
                // Translations
                const itemName = t(`data_prod.${item.id}.name`);
                const itemCat = t(`data_cat.${item.category}.name`);

                return (
                  <div key={`${item.id}-${item.selectedSize}-${item.selectedColor}-${idx}`} className="flex gap-4 animate-fade-in-up">
                    <div className="w-24 h-32 bg-gray-100 dark:bg-dark-bg overflow-hidden shrink-0">
                      <img src={item.images[0]} alt={itemName} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <h3 className="font-medium text-aura-black dark:text-white">{itemName}</h3>
                          <p className="text-aura-black dark:text-white">{item.price.toLocaleString()} {isArabic ? 'دج' : 'DA'}</p>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{itemCat}</p>
                        <div className="flex gap-3 mt-2 text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                          <span>{t('product.size')}: {item.selectedSize}</span>
                          <span className="w-px h-3 bg-gray-300 dark:bg-gray-600"></span>
                          <span>{item.selectedColor}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center border border-gray-200 dark:border-white/20 rounded-sm">
                          <button
                            onClick={() => onUpdateQuantity(item.id, item.selectedSize, item.selectedColor, -1)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-aura-black dark:text-white"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-8 text-center text-sm text-aura-black dark:text-white">{item.quantity}</span>
                          <button
                            onClick={() => onUpdateQuantity(item.id, item.selectedSize, item.selectedColor, 1)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-aura-black dark:text-white"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.selectedSize, item.selectedColor, -item.quantity)}
                          className="text-xs uppercase underline text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white"
                        >
                          {t('cart.remove')}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-black">
          <div className="flex justify-between items-center mb-4 text-lg font-medium text-aura-black dark:text-white">
            <span>{t('cart.subtotal')}</span>
            <span>{total.toLocaleString()} {isArabic ? 'دج' : 'DA'}</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 text-center">{t('cart.shipping_calc')}</p>
          <button
            onClick={() => { onClose(); onCheckout(); }}
            className="w-full bg-aura-black dark:bg-white text-white dark:text-black py-4 uppercase tracking-widest hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            disabled={items.length === 0}
          >
            {t('cart.checkout')}
          </button>
        </div>
      </div>
    </>
  );
};

export default CartDrawer;