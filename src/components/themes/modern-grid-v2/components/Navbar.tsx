import React, { useState, useEffect } from 'react';
import ThemeToggle from './ThemeToggle';
import { useLanguage } from '../context/LanguageContext';

// Inline SVG Icons matching lucide-react exactly
const ShoppingBagIcon: React.FC<{ size?: number; strokeWidth?: number; className?: string }> = ({
  size = 20,
  strokeWidth = 1.5,
  className = ''
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);

const SearchIcon: React.FC<{ size?: number; strokeWidth?: number; className?: string }> = ({
  size = 20,
  strokeWidth = 1.5,
  className = ''
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const MenuIcon: React.FC<{ size?: number; strokeWidth?: number; className?: string }> = ({
  size = 24,
  strokeWidth = 1.5,
  className = ''
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="4" x2="20" y1="12" y2="12" />
    <line x1="4" x2="20" y1="6" y2="6" />
    <line x1="4" x2="20" y1="18" y2="18" />
  </svg>
);

const XIcon: React.FC<{ size?: number; strokeWidth?: number; className?: string }> = ({
  size = 24,
  strokeWidth = 1.5,
  className = ''
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

interface NavbarProps {
  cartCount: number;
  onCartClick: () => void;
  onNavigate: (view: 'home' | 'shop' | 'collection' | 'vision') => void;
}

const Navbar: React.FC<NavbarProps> = ({ cartCount, onCartClick, onNavigate }) => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { language, toggleLanguage, t, direction } = useLanguage();

  // Handle Scroll Effect - Optimized with Throttling/RAF
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Prevent scrolling when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [menuOpen]);

  // Dynamic Classes for Glassmorphism & Theme
  const navClasses = `fixed top-0 left-0 w-full z-[100] transition-all duration-500 ease-out border-b ${scrolled || menuOpen
    ? 'bg-white/80 dark:bg-[#050505]/80 backdrop-blur-xl border-gray-200/50 dark:border-white/5 py-3 md:py-4 shadow-[0_4px_30px_rgba(0,0,0,0.03)]'
    : 'bg-transparent border-transparent py-5 md:py-8'
    }`;

  const handleNavClick = (view: 'home' | 'shop' | 'collection' | 'vision') => {
    setMenuOpen(false);
    onNavigate(view);
  };

  // Icons that flip based on RTL
  const isRTL = direction === 'rtl';

  return (
    <>
      <nav className={navClasses}>
        <div className="max-w-[1800px] mx-auto px-6 md:px-12 flex items-center justify-between relative">

          {/* LEFT SECTION */}
          <div className="flex items-center justify-start gap-6 w-1/3">
            {/* Mobile Burger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={`md:hidden relative z-[120] p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-all duration-300 ${menuOpen ? 'text-aura-black dark:text-white' : 'text-aura-black dark:text-white'}`}
              aria-label="Toggle Menu"
            >
              <div className={`transition-transform duration-300 ${menuOpen ? 'rotate-90' : 'rotate-0'}`}>
                {menuOpen ? <XIcon size={24} strokeWidth={1.5} /> : <MenuIcon size={24} strokeWidth={1.5} />}
              </div>
            </button>

            {/* Desktop Links */}
            <div className="hidden md:flex gap-8 text-xs uppercase tracking-widest font-bold text-aura-black dark:text-gray-300">
              <button onClick={() => onNavigate('shop')} className="hover:text-gray-500 dark:hover:text-white transition-colors cursor-hover relative group">
                {t('nav.shop')}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-current transition-all duration-300 group-hover:w-full"></span>
              </button>
              <button onClick={() => onNavigate('collection')} className="hover:text-gray-500 dark:hover:text-white transition-colors cursor-hover relative group">
                {t('nav.editorial')}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-current transition-all duration-300 group-hover:w-full"></span>
              </button>
            </div>
          </div>

          {/* CENTER: LOGO */}
          <div className="w-1/3 flex justify-center absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-[110]">
            <button
              onClick={() => handleNavClick('home')}
              className={`font-serif font-bold tracking-[0.2em] cursor-hover transition-all duration-500 ${scrolled ? 'text-2xl md:text-3xl' : 'text-3xl md:text-4xl'
                } ${menuOpen ? 'text-aura-black dark:text-white' : 'text-aura-black dark:text-white'}`}
            >
              ASRAY
            </button>
          </div>

          {/* RIGHT SECTION */}
          <div className="flex items-center justify-end gap-4 md:gap-8 w-1/3">
            <div className="hidden md:flex gap-8 text-xs uppercase tracking-widest font-bold text-aura-black dark:text-gray-300">
              <button onClick={() => onNavigate('vision')} className="hover:text-red-600 dark:hover:text-red-500 transition-colors cursor-hover">{t('nav.vision')}</button>
              <button onClick={() => onNavigate('home')} className="hover:text-gray-500 dark:hover:text-white transition-colors cursor-hover">{t('nav.studio')}</button>
            </div>

            <div className={`flex items-center gap-3 md:gap-4 transition-colors duration-300 ${menuOpen ? 'text-aura-black dark:text-white' : 'text-aura-black dark:text-white'}`}>
              <button
                onClick={toggleLanguage}
                className="hidden md:flex items-center justify-center text-[10px] font-bold uppercase w-8 h-8 border border-gray-200 dark:border-white/20 rounded-full hover:border-black dark:hover:border-white transition-colors"
              >
                {language.toUpperCase()}
              </button>

              <div className="hidden md:block scale-90">
                <ThemeToggle />
              </div>

              {/* Search - Hidden on mobile to save space or add if needed */}
              <button className="hidden md:block hover:scale-110 transition-transform p-2">
                <SearchIcon size={20} strokeWidth={1.5} />
              </button>

              {/* Cart Icon */}
              <button
                onClick={onCartClick}
                className="relative hover:scale-110 transition-transform cursor-hover p-2 z-[110]"
              >
                <ShoppingBagIcon size={20} strokeWidth={1.5} />
                {cartCount > 0 && (
                  <span className="absolute top-0 right-0 bg-aura-black dark:bg-white text-white dark:text-black text-[9px] font-bold flex items-center justify-center w-4 h-4 rounded-full animate-fade-in-up">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* FULL SCREEN MOBILE MENU (Adaptive Theme) */}
      <div
        className={`fixed inset-0 z-[105] flex flex-col justify-center transition-all duration-700 cubic-bezier(0.7, 0, 0.3, 1) ${menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        style={{
          clipPath: menuOpen
            ? `circle(150% at ${isRTL ? '100%' : '0%'} 0%)`
            : `circle(0% at ${isRTL ? '100%' : '0%'} 0%)`
        }}
      >
        {/* Adaptive Background */}
        <div className="absolute inset-0 bg-aura-stone dark:bg-[#050505] transition-colors duration-700"></div>

        {/* Background Texture */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

        <div className="px-8 md:px-16 relative z-10 h-full flex flex-col justify-center pt-20 pb-12">

          <div className="absolute top-24 right-8 md:hidden flex flex-col gap-4 items-end">
            <ThemeToggle />
            <button onClick={toggleLanguage} className="text-xs font-bold border border-black/10 dark:border-white/20 px-3 py-2 rounded-full text-aura-black dark:text-white mt-2 uppercase">
              {language === 'en' ? 'English' : language === 'ar' ? 'العربية' : 'Français'}
            </button>
          </div>

          {/* Menu Links */}
          <div className="flex flex-col space-y-6 md:space-y-8">
            {[
              { label: t('nav.shop'), id: 'shop', num: '01' },
              { label: t('nav.editorial'), id: 'collection', num: '02' },
              { label: t('nav.vision'), id: 'vision', num: '03', highlight: true },
              { label: t('nav.studio'), id: 'home', num: '04' },
            ].map((item, idx) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id as any)}
                className={`group text-start flex items-baseline gap-4 md:gap-6 transition-all duration-700 transform ${menuOpen ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
                style={{ transitionDelay: `${200 + idx * 100}ms` }}
              >
                <span className="text-[10px] md:text-xs font-mono text-gray-400 dark:text-gray-600 font-bold">{item.num}</span>
                <span className={`text-4xl md:text-6xl font-serif italic ${item.highlight
                  ? 'text-aura-black dark:text-white hover:text-red-600 dark:hover:text-red-500'
                  : 'text-gray-400 dark:text-gray-500 hover:text-aura-black dark:hover:text-white'
                  } transition-colors duration-300`}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>

          {/* Footer Info */}
          <div className={`mt-auto border-t border-black/5 dark:border-white/10 pt-8 flex justify-between items-end text-gray-500 transition-all duration-1000 delay-500 ${menuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="flex flex-col gap-3 text-[10px] uppercase tracking-[0.2em]">
              <a href="#" className="hover:text-aura-black dark:hover:text-white transition-colors">{t('nav.account')}</a>
              <a href="#" className="hover:text-aura-black dark:hover:text-white transition-colors">{t('nav.wishlist')}</a>
            </div>
            <div className="text-end">
              <p className="text-[10px] uppercase tracking-[0.2em] mb-3">{t('nav.follow')}</p>
              <div className="flex gap-6 text-aura-black dark:text-white justify-end">
                <span className="cursor-pointer hover:text-gray-500">Instagram</span>
                <span className="cursor-pointer hover:text-gray-500">Twitter</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;
