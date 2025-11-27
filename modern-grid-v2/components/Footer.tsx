import React, { useState } from 'react';
import { Instagram, Twitter, Facebook, ArrowRight, ArrowLeft } from './Icons';
import { useLanguage } from '../context/LanguageContext';

const Footer: React.FC = () => {
  const { t, direction } = useLanguage();
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  return (
    <footer className="bg-aura-stone dark:bg-[#111] text-aura-black dark:text-gray-300 pt-24 pb-12 transition-colors duration-700">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          
          {/* Brand */}
          <div className="space-y-6">
            <h3 className="text-2xl font-serif font-bold tracking-widest text-aura-black dark:text-white">ASRAY</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed max-w-xs">
              {t('footer.brand_desc')}
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full border border-gray-300 dark:border-gray-700 flex items-center justify-center hover:bg-aura-black hover:text-white dark:hover:bg-white dark:hover:text-black hover:border-aura-black dark:hover:border-white transition-all">
                <Instagram size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full border border-gray-300 dark:border-gray-700 flex items-center justify-center hover:bg-aura-black hover:text-white dark:hover:bg-white dark:hover:text-black hover:border-aura-black dark:hover:border-white transition-all">
                <Twitter size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full border border-gray-300 dark:border-gray-700 flex items-center justify-center hover:bg-aura-black hover:text-white dark:hover:bg-white dark:hover:text-black hover:border-aura-black dark:hover:border-white transition-all">
                <Facebook size={18} />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-widest mb-6 text-aura-black dark:text-white">{t('footer.shop_title')}</h4>
            <ul className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
              <li><a href="#" className="hover:text-aura-black dark:hover:text-white hover:underline underline-offset-4 transition-colors">New Arrivals</a></li>
              <li><a href="#" className="hover:text-aura-black dark:hover:text-white hover:underline underline-offset-4 transition-colors">Best Sellers</a></li>
              <li><a href="#" className="hover:text-aura-black dark:hover:text-white hover:underline underline-offset-4 transition-colors">Accessories</a></li>
              <li><a href="#" className="hover:text-aura-black dark:hover:text-white hover:underline underline-offset-4 transition-colors">Gift Cards</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-widest mb-6 text-aura-black dark:text-white">{t('footer.support_title')}</h4>
            <ul className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
              <li><a href="#" className="hover:text-aura-black dark:hover:text-white hover:underline underline-offset-4 transition-colors">FAQ</a></li>
              <li><a href="#" className="hover:text-aura-black dark:hover:text-white hover:underline underline-offset-4 transition-colors">Shipping & Returns</a></li>
              <li><a href="#" className="hover:text-aura-black dark:hover:text-white hover:underline underline-offset-4 transition-colors">Size Guide</a></li>
              <li><a href="#" className="hover:text-aura-black dark:hover:text-white hover:underline underline-offset-4 transition-colors">Contact Us</a></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-widest mb-6 text-aura-black dark:text-white">{t('footer.newsletter_title')}</h4>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{t('footer.subscribe_desc')}</p>
            <form className="flex border-b border-aura-black dark:border-white pb-2">
              <input 
                type="email" 
                placeholder={t('footer.email_placeholder')}
                className="bg-transparent flex-1 outline-none text-sm placeholder-gray-500 dark:placeholder-gray-500 text-aura-black dark:text-white"
              />
              <button type="button" className="hover:translate-x-1 rtl:hover:-translate-x-1 transition-transform text-aura-black dark:text-white">
                <ArrowIcon size={18} />
              </button>
            </form>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wider">
          <p>{t('footer.rights')}</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <a href="#" className="hover:text-aura-black dark:hover:text-white transition-colors">{t('footer.privacy')}</a>
            <a href="#" className="hover:text-aura-black dark:hover:text-white transition-colors">{t('footer.terms')}</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;