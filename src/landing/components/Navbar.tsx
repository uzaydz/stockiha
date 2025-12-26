
import React, { useState, useEffect } from 'react';
import { Menu, X, Download, ShoppingBag, Scan, ChevronDown, Sparkles, LogIn, User, GraduationCap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getImagePath } from '@/lib/appImages';

interface NavbarProps {
  theme?: 'light' | 'dark';
  toggleTheme?: () => void;
  onNavigate: (page: 'home' | 'features' | 'pricing' | 'download' | 'pos' | 'ecommerce' | 'contact' | 'courses' | 'terms' | 'privacy') => void;
  currentPage: 'home' | 'features' | 'pricing' | 'download' | 'pos' | 'ecommerce' | 'contact' | 'courses' | 'terms' | 'privacy';
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentPage }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileProductsOpen, setMobileProductsOpen] = useState(true); // Open by default for better visibility

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { id: 'home', label: 'الرئيسية', type: 'link' },
    {
      id: 'products',
      label: 'منتجاتنا',
      type: 'dropdown',
      items: [
        { id: 'pos', label: 'نظام الكاشير', icon: Scan, desc: 'نقاط البيع والمخزون' },
        { id: 'ecommerce', label: 'المتجر الإلكتروني', icon: ShoppingBag, desc: 'موقعك الخاص' },
        { id: 'courses', label: 'دورات سطوكيها', icon: GraduationCap, desc: 'أكاديمية التجارة الرقمية' },
      ]
    },
    { id: 'features', label: 'المميزات', type: 'link' },
    { id: 'pricing', label: 'الأسعار', type: 'link' },
    { id: 'contact', label: 'تواصل معنا', type: 'link' },
  ];

  return (
    <>
      {/* 
                Navbar Container 
                On Mobile: Fixed at top, full width, sleek glass bar.
                On Desktop: Floating island.
            */}
      <div className={`fixed z-50 transition-all duration-300 ${scrolled
        ? 'top-0 inset-x-0 md:top-4 md:px-4'
        : 'top-0 inset-x-0 md:top-6 md:px-4'
        } flex justify-center pointer-events-none`}>

        <motion.nav
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className={`pointer-events-auto flex items-center justify-between px-4 py-3 md:py-2 transition-all duration-500 ease-out border-b md:border border-white/5 backdrop-blur-xl shadow-2xl ${scrolled
            ? 'w-full md:max-w-6xl bg-[#050505]/95 md:rounded-2xl'
            : 'w-full md:w-auto md:min-w-[600px] bg-[#050505]/60 md:bg-[#111]/80 md:rounded-full md:gap-8'
            }`}
        >
          {/* 1. Logo */}
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3 group focus:outline-none"
          >
            <div className="relative w-9 h-9 flex items-center justify-center bg-white/5 border border-white/10 rounded-xl shadow-sm group-hover:bg-brand/10 group-hover:border-brand/20 transition-all duration-300">
              <img src={getImagePath("/logo-new.ico")} alt="Logo" className="w-5 h-5 object-contain" />
            </div>
            <div className="flex flex-col items-start -space-y-1">
              <span className="font-black text-white text-lg tracking-tight">سطوكيها</span>
              <span className="text-[10px] text-gray-400 font-medium md:hidden">شريك نجاحك</span>
            </div>
          </button>

          {/* 2. Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <div key={link.id} className="relative group/nav">
                {link.type === 'link' ? (
                  <button
                    onClick={() => onNavigate(link.id as any)}
                    className={`relative px-4 py-2 rounded-full text-sm font-bold transition-all ${currentPage === link.id ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                    {currentPage === link.id && (
                      <motion.div
                        layoutId="pill"
                        className="absolute inset-0 bg-white/10 rounded-full"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <span className="relative z-10">{link.label}</span>
                  </button>
                ) : (
                  <div
                    onMouseEnter={() => setActiveDropdown(link.id)}
                    onMouseLeave={() => setActiveDropdown(null)}
                    className="relative"
                  >
                    <button
                      className={`relative px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-1 ${activeDropdown === link.id ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                      {link.label}
                      <ChevronDown className={`w-3 h-3 transition-transform ${activeDropdown === link.id ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {activeDropdown === link.id && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.96 }}
                          transition={{ duration: 0.2 }}
                          className="absolute top-full right-0 mt-3 w-64 bg-[#151515] border border-white/10 rounded-2xl shadow-xl overflow-hidden p-1.5 z-50"
                        >
                          {link.items?.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => {
                                onNavigate(item.id as any);
                                setActiveDropdown(null);
                              }}
                              className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-white/5 transition-colors text-right group/item"
                            >
                              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-500 group-hover/item:text-brand transition-colors">
                                <item.icon className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="text-white text-sm font-bold">{item.label}</div>
                                <div className="text-[10px] text-gray-500">{item.desc}</div>
                              </div>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 3. Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <span className="w-px h-6 bg-white/10 mx-1"></span>
            <button
              onClick={() => window.location.href = '/login'}
              className="text-sm font-bold text-gray-400 hover:text-white transition-colors px-2"
            >
              دخول
            </button>
            <button
              onClick={() => onNavigate('download')}
              className="bg-white text-black px-5 py-2 rounded-full text-sm font-bold hover:bg-gray-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            >
              جربه مجاناً
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2 text-white bg-white/5 rounded-lg border border-white/10 active:scale-95 transition-transform"
          >
            <Menu className="w-5 h-5" />
          </button>
        </motion.nav>
      </div>

      {/* Premium Mobile Sidebar (Drawer) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />

            {/* Sidebar */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 right-0 w-[85%] max-w-[320px] bg-[#0A0A0A] border-l border-white/10 z-[70] flex flex-col shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center border border-brand/20">
                    <img src={getImagePath("/logo-new.ico")} alt="Logo" className="w-6 h-6 object-contain" />
                  </div>
                  <div>
                    <h3 className="text-white font-black text-lg">سطوكيها</h3>
                    <p className="text-xs text-brand font-medium">نظام التسيير الذكي</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Links */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {navLinks.map((link) => (
                  <div key={link.id} className="overflow-hidden">
                    {link.type === 'link' ? (
                      <button
                        onClick={() => {
                          onNavigate(link.id as any);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-4 rounded-xl text-right font-bold transition-all ${currentPage === link.id
                          ? 'bg-white text-black shadow-lg'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                          }`}
                      >
                        <span>{link.label}</span>
                        {currentPage === link.id && <div className="w-2 h-2 rounded-full bg-brand"></div>}
                      </button>
                    ) : (
                      <div className="bg-white/5 rounded-xl border border-white/5 overflow-hidden">
                        <button
                          onClick={() => setMobileProductsOpen(!mobileProductsOpen)}
                          className="w-full flex items-center justify-between p-4 text-gray-300 font-bold hover:bg-white/5 transition-colors"
                        >
                          <span>{link.label}</span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${mobileProductsOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                          {mobileProductsOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="border-t border-white/5 bg-black/20"
                            >
                              {link.items?.map((item) => (
                                <button
                                  key={item.id}
                                  onClick={() => {
                                    onNavigate(item.id as any);
                                    setMobileMenuOpen(false);
                                  }}
                                  className="flex items-center gap-3 w-full p-3 pr-6 hover:bg-white/5 transition-colors group"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-500 group-hover:text-brand transition-colors">
                                    <item.icon className="w-4 h-4" />
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-bold text-gray-300 group-hover:text-white">{item.label}</div>
                                    <div className="text-[10px] text-gray-600">{item.desc}</div>
                                  </div>
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Footer Actions */}
              <div className="p-6 border-t border-white/10 bg-[#0F0F0F]">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      window.location.href = '/login';
                    }}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1A1A1A] border border-white/5 text-gray-300 font-bold text-sm hover:bg-[#222] transition-colors"
                  >
                    <LogIn className="w-4 h-4" />
                    دخول
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      window.location.href = '/tenant/signup';
                    }}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1A1A1A] border border-white/5 text-gray-300 font-bold text-sm hover:bg-[#222] transition-colors"
                  >
                    <User className="w-4 h-4" />
                    حساب جديد
                  </button>
                </div>
                <button
                  onClick={() => {
                    onNavigate('download');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-4 bg-brand hover:bg-brand-hover text-white font-bold rounded-xl shadow-[0_4px_20px_rgba(255,122,0,0.25)] flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Download className="w-5 h-5" />
                  <span>تحميل النسخة المجانية</span>
                </button>
                <div className="text-center mt-4">
                  <p className="text-[10px] text-gray-600 font-mono">الإصدار v2.4.0 Stable</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
