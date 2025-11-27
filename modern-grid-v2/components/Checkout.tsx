import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle, Lock } from './Icons';
import { CartItem } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface CheckoutProps {
  cartItems: CartItem[];
  onBack: () => void;
  onPlaceOrder: () => void;
}

const Checkout: React.FC<CheckoutProps> = ({ cartItems, onBack, onPlaceOrder }) => {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const { t, direction, language } = useLanguage();
  const isRTL = direction === 'rtl';
  const isArabic = language === 'ar';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate processing
    setTimeout(() => {
      setStep('success');
      onPlaceOrder(); // This could clear cart in parent
    }, 1500);
  };

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-white dark:bg-dark-bg pt-32 pb-12 flex items-center justify-center animate-fade-in-up transition-colors duration-700" dir={direction}>
        <div className="text-center max-w-md px-6">
          <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 dark:text-green-400">
            <CheckCircle size={40} />
          </div>
          <h2 className="text-4xl font-serif mb-4 text-aura-black dark:text-white">{t('checkout.order_confirmed')}</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            {t('checkout.thank_you')}
          </p>
          <button 
            onClick={onBack}
            className="px-8 py-3 bg-aura-black dark:bg-white text-white dark:text-black uppercase tracking-widest text-sm hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          >
            {t('checkout.return')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black pt-24 pb-12 transition-colors duration-700" dir={direction}>
      <div className="max-w-7xl mx-auto px-6">
        <button 
          onClick={onBack} 
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-black dark:hover:text-white mb-8 transition-colors"
        >
          <BackIcon size={16} /> {t('checkout.continue')}
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left Column: Form */}
          <div className="lg:col-span-7">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-dark-card p-8 rounded-sm shadow-sm space-y-8 transition-colors duration-500">
              
              {/* Contact */}
              <div>
                <h3 className="text-lg font-serif font-bold mb-4 border-b border-gray-100 dark:border-white/10 pb-2 text-aura-black dark:text-white">{t('checkout.contact')}</h3>
                <input 
                  type="email" 
                  required 
                  placeholder={t('checkout.email')} 
                  className="w-full p-3 border border-gray-200 dark:border-gray-700 focus:border-black dark:focus:border-white outline-none transition-colors bg-gray-50 dark:bg-dark-bg focus:bg-white dark:focus:bg-black text-aura-black dark:text-white"
                />
              </div>

              {/* Shipping */}
              <div>
                <h3 className="text-lg font-serif font-bold mb-4 border-b border-gray-100 dark:border-white/10 pb-2 text-aura-black dark:text-white">{t('checkout.shipping')}</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <input type="text" required placeholder={t('checkout.fname')} className="p-3 border border-gray-200 dark:border-gray-700 focus:border-black dark:focus:border-white outline-none bg-gray-50 dark:bg-dark-bg focus:bg-white dark:focus:bg-black text-aura-black dark:text-white" />
                  <input type="text" required placeholder={t('checkout.lname')} className="p-3 border border-gray-200 dark:border-gray-700 focus:border-black dark:focus:border-white outline-none bg-gray-50 dark:bg-dark-bg focus:bg-white dark:focus:bg-black text-aura-black dark:text-white" />
                </div>
                <input type="text" required placeholder={t('checkout.address')} className="w-full p-3 border border-gray-200 dark:border-gray-700 focus:border-black dark:focus:border-white outline-none mb-4 bg-gray-50 dark:bg-dark-bg focus:bg-white dark:focus:bg-black text-aura-black dark:text-white" />
                <div className="grid grid-cols-3 gap-4">
                  <input type="text" required placeholder={t('checkout.city')} className="p-3 border border-gray-200 dark:border-gray-700 focus:border-black dark:focus:border-white outline-none bg-gray-50 dark:bg-dark-bg focus:bg-white dark:focus:bg-black text-aura-black dark:text-white" />
                  <input type="text" required placeholder={t('checkout.state')} className="p-3 border border-gray-200 dark:border-gray-700 focus:border-black dark:focus:border-white outline-none bg-gray-50 dark:bg-dark-bg focus:bg-white dark:focus:bg-black text-aura-black dark:text-white" />
                  <input type="text" required placeholder={t('checkout.zip')} className="p-3 border border-gray-200 dark:border-gray-700 focus:border-black dark:focus:border-white outline-none bg-gray-50 dark:bg-dark-bg focus:bg-white dark:focus:bg-black text-aura-black dark:text-white" />
                </div>
              </div>

              {/* Payment (Mock) */}
              <div>
                <h3 className="text-lg font-serif font-bold mb-4 border-b border-gray-100 dark:border-white/10 pb-2 text-aura-black dark:text-white">{t('checkout.payment')}</h3>
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-dark-bg mb-4 flex items-center gap-3">
                  <Lock size={16} className="text-green-600 dark:text-green-400" />
                  <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest">{t('checkout.secure_ssl')}</span>
                </div>
                <div className="relative mb-4">
                  <input type="text" required placeholder={t('checkout.card_number')} className={`w-full p-3 border border-gray-200 dark:border-gray-700 focus:border-black dark:focus:border-white outline-none bg-gray-50 dark:bg-dark-bg focus:bg-white dark:focus:bg-black text-aura-black dark:text-white font-mono ${isRTL ? 'pl-3' : 'pr-3'}`} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" required placeholder="MM / YY" className="p-3 border border-gray-200 dark:border-gray-700 focus:border-black dark:focus:border-white outline-none bg-gray-50 dark:bg-dark-bg focus:bg-white dark:focus:bg-black text-aura-black dark:text-white text-center" />
                  <input type="text" required placeholder="CVC" className="p-3 border border-gray-200 dark:border-gray-700 focus:border-black dark:focus:border-white outline-none bg-gray-50 dark:bg-dark-bg focus:bg-white dark:focus:bg-black text-aura-black dark:text-white text-center" />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-aura-black dark:bg-white text-white dark:text-black py-4 uppercase tracking-widest font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-all shadow-lg"
              >
                {t('checkout.pay')} {total.toLocaleString()} {isArabic ? 'دج' : 'DA'}
              </button>
            </form>
          </div>

          {/* Right Column: Summary */}
          <div className="lg:col-span-5">
             <div className="bg-white dark:bg-dark-card p-8 rounded-sm shadow-sm sticky top-24 transition-colors duration-500">
                <h3 className="text-lg font-serif font-bold mb-6 text-aura-black dark:text-white">{t('product.order_summary')}</h3>
                
                <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2">
                  {cartItems.map((item, idx) => (
                    <div key={`${item.id}-${idx}`} className="flex gap-4 items-center">
                      <div className="w-16 h-20 bg-gray-100 dark:bg-dark-bg flex-shrink-0 overflow-hidden">
                        <img src={item.images[0]} alt={t(`data_prod.${item.id}.name`)} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-aura-black dark:text-white">{t(`data_prod.${item.id}.name`)}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{item.selectedColor} / {item.selectedSize}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-medium text-aura-black dark:text-white">{(item.price * item.quantity).toLocaleString()} {isArabic ? 'دج' : 'DA'}</p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-100 dark:border-white/10 pt-4 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>{t('cart.subtotal')}</span>
                    <span>{total.toLocaleString()} {isArabic ? 'دج' : 'DA'}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>{t('checkout.shipping')}</span>
                    <span>{t('product.free_shipping')}</span>
                  </div>
                </div>
                <div className="border-t border-gray-100 dark:border-white/10 pt-4 mt-4 flex justify-between text-lg font-bold text-aura-black dark:text-white">
                  <span>{t('product.total')}</span>
                  <span>{total.toLocaleString()} {isArabic ? 'دج' : 'DA'}</span>
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default React.memo(Checkout);