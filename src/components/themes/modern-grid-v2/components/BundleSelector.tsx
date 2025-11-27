
import React, { useState } from 'react';
import { Product, CartItem } from '../types';
import { Check, Gift, Plus, Tag, Zap, ChevronDown } from './Icons';
import { useLanguage } from '../context/LanguageContext';

interface BundleSelectorProps {
  product: Product;
  onAddBundle: (items: CartItem[]) => void;
  onDirectOrder: (items: CartItem[]) => void;
}

type OfferType = 'buy2get1' | 'buy3get1';

interface SelectionState {
  [key: number]: { size: string; color: string };
}

const BundleSelector: React.FC<BundleSelectorProps> = ({ product, onAddBundle, onDirectOrder }) => {
  const { t, direction, language } = useLanguage();
  const [activeOffer, setActiveOffer] = useState<OfferType | null>(null);
  const [selections, setSelections] = useState<SelectionState>({});
  const isArabic = language === 'ar';

  const hasVariants = product.sizes.length > 0 || product.colors.length > 0;

  const offers = [
    { id: 'buy2get1', label: t('offers.buy_2_get_1'), totalItems: 3, paidItems: 2 },
    { id: 'buy3get1', label: t('offers.buy_3_get_1'), totalItems: 4, paidItems: 3 },
  ];

  const handleSelect = (index: number, field: 'size' | 'color', value: string) => {
    setSelections(prev => ({
      ...prev,
      [index]: { ...prev[index], [field]: value }
    }));
  };

  const createBundleItems = (): CartItem[] | null => {
    if (!activeOffer) return null;
    
    const offer = offers.find(o => o.id === activeOffer)!;
    const itemsToAdd: CartItem[] = [];

    for (let i = 0; i < offer.totalItems; i++) {
      const isFree = i >= offer.paidItems;
      
      // Use selected variants or defaults if no variants exist
      const size = hasVariants ? selections[i]?.size : 'One Size';
      const color = hasVariants ? selections[i]?.color : 'Default';

      itemsToAdd.push({
        ...product,
        quantity: 1,
        selectedSize: size,
        selectedColor: color,
        // PRICE LOGIC: Set price to 0 for free items
        price: isFree ? 0 : product.price, 
      });
    }
    return itemsToAdd;
  };

  const handleAddToCart = () => {
    const items = createBundleItems();
    if (items) {
      onAddBundle(items);
      setActiveOffer(null);
      setSelections({});
    }
  };

  const handleDirectOrder = () => {
    const items = createBundleItems();
    if (items) {
      onDirectOrder(items);
    }
  };

  const isSelectionComplete = (totalItems: number) => {
    if (!hasVariants) return true;
    for (let i = 0; i < totalItems; i++) {
      if (!selections[i]?.size || !selections[i]?.color) return false;
    }
    return true;
  };

  return (
    <div className="mt-12 border-t border-gray-100 dark:border-white/10 pt-10" dir={direction}>
      <div className="flex items-center gap-4 mb-8">
        <div className="w-10 h-10 bg-gray-900 dark:bg-white rounded-full flex items-center justify-center text-white dark:text-black shadow-md">
           <Gift size={18} />
        </div>
        <div>
          <h3 className="font-serif italic text-xl text-gray-900 dark:text-white leading-none">{t('offers.bundle_title')}</h3>
          <p className="text-[10px] uppercase tracking-widest text-gray-400 mt-1">Exclusive Online Offers</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 mb-8">
        {offers.map((offer) => (
          <button
            key={offer.id}
            onClick={() => setActiveOffer(activeOffer === offer.id as OfferType ? null : offer.id as OfferType)}
            className={`relative group p-6 border text-start transition-all duration-300 rounded-sm overflow-hidden ${
              activeOffer === offer.id 
                ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-white/5 shadow-md' 
                : 'border-gray-100 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/50 bg-white dark:bg-transparent'
            }`}
          >
            <div className="flex justify-between items-center relative z-10">
              <div>
                 <div className="flex items-center gap-3">
                    <Tag size={14} className={activeOffer === offer.id ? "text-black dark:text-white" : "text-gray-400"} />
                    <p className="font-bold uppercase tracking-wider text-xs text-gray-900 dark:text-white">{offer.label}</p>
                 </div>
                 <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2 pl-7">
                   {t('offers.save')} <span className="font-bold text-black dark:text-white">{(product.price * (offer.totalItems - offer.paidItems)).toLocaleString()} {isArabic ? 'دج' : 'DA'}</span>
                 </p>
              </div>
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${activeOffer === offer.id ? 'bg-black dark:bg-white border-black dark:border-white text-white dark:text-black' : 'border-gray-300 dark:border-gray-600'}`}>
                 {activeOffer === offer.id && <Check size={12} strokeWidth={3} />}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Configuration Panel (Slide Down) */}
      <div className={`overflow-hidden transition-all duration-500 ease-in-out ${activeOffer ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        {activeOffer && (() => {
           const offer = offers.find(o => o.id === activeOffer)!;
           
           return (
             <div className="bg-white dark:bg-black border border-gray-100 dark:border-white/20 p-6 rounded-sm shadow-2xl relative">
               {/* Decorative arrow pointing up */}
               <div className="absolute -top-2 left-10 w-4 h-4 bg-white dark:bg-black border-t border-l border-gray-100 dark:border-white/20 transform rotate-45"></div>

               <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-6 border-b border-gray-100 dark:border-white/10 pb-3">{t('offers.configure')}</p>
               
               <div className="space-y-5 mb-8">
                 {[...Array(offer.totalItems)].map((_, idx) => {
                   const isFree = idx >= offer.paidItems;
                   return (
                     <div key={idx} className="flex flex-col md:flex-row gap-4 items-start md:items-center pb-5 border-b border-dashed border-gray-100 dark:border-white/10 last:border-0 last:pb-0">
                        <div className="flex items-center gap-3 w-24 shrink-0">
                          <span className={`text-sm font-bold ${isFree ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                             {t('offers.item')} 0{idx + 1}
                          </span>
                          {isFree && <span className="text-[9px] bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full font-bold tracking-wide">{t('offers.free')}</span>}
                        </div>

                        {hasVariants ? (
                          <div className="flex gap-3 flex-1 w-full">
                             <div className="relative flex-1">
                               <select 
                                 value={selections[idx]?.color || ''}
                                 onChange={(e) => handleSelect(idx, 'color', e.target.value)}
                                 className="w-full bg-gray-50 dark:bg-white/5 border border-transparent text-xs p-3 pr-8 rounded-sm outline-none focus:bg-gray-100 dark:focus:bg-white/10 text-gray-900 dark:text-white appearance-none cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors font-medium"
                               >
                                 <option value="" disabled>{t('product.color')}</option>
                                 {product.colors.map(c => <option key={c} value={c}>{c}</option>)}
                               </select>
                               <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                             </div>
                             
                             <div className="relative w-28">
                               <select 
                                 value={selections[idx]?.size || ''}
                                 onChange={(e) => handleSelect(idx, 'size', e.target.value)}
                                 className="w-full bg-gray-50 dark:bg-white/5 border border-transparent text-xs p-3 pr-8 rounded-sm outline-none focus:bg-gray-100 dark:focus:bg-white/10 text-gray-900 dark:text-white appearance-none cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors font-medium"
                               >
                                 <option value="" disabled>{t('product.size')}</option>
                                 {product.sizes.map(s => <option key={s} value={s}>{s}</option>)}
                               </select>
                               <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                             </div>
                          </div>
                        ) : (
                           <span className="text-xs text-gray-400 italic w-full text-end border-b border-transparent p-3">Standard Edition</span>
                        )}
                     </div>
                   );
                 })}
               </div>

               <div className="flex flex-col md:flex-row gap-3">
                 <button 
                   onClick={handleAddToCart}
                   disabled={!isSelectionComplete(offer.totalItems)}
                   className="flex-1 bg-black dark:bg-white text-white dark:text-black py-4 uppercase tracking-widest text-[10px] font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-3 group"
                 >
                   <div className="w-5 h-5 rounded-full border border-current flex items-center justify-center group-hover:scale-110 transition-transform">
                     <Plus size={10} />
                   </div>
                   {t('offers.add_bundle')}
                 </button>

                 <button 
                   onClick={handleDirectOrder}
                   disabled={!isSelectionComplete(offer.totalItems)}
                   className="flex-1 border border-gray-200 dark:border-white/20 bg-white dark:bg-transparent text-black dark:text-white py-4 uppercase tracking-widest text-[10px] font-bold hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
                 >
                   <Zap size={14} className="fill-current text-yellow-500" />
                   {t('offers.order_bundle_direct')}
                 </button>
               </div>
             </div>
           );
        })()}
      </div>
    </div>
  );
};

export default BundleSelector;
