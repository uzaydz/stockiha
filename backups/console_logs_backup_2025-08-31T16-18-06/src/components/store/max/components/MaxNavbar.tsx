import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, 
  Menu, 
  X, 
  Search, 
  Heart, 
  User,
  Phone,
  Mail,
  MapPin,
  Globe,
  ChevronDown
} from 'lucide-react';
import { StoreData, Category } from '@/api/optimized-store-api';

interface MaxNavbarProps {
  storeData: StoreData;
  categories: Category[];
}

export const MaxNavbar: React.FC<MaxNavbarProps> = ({ storeData, categories }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [cartCount, setCartCount] = useState(3);
  const [wishlistCount, setWishlistCount] = useState(2);

  // تتبع التمرير
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true } as any);
    return () => window.removeEventListener('scroll', handleScroll as any);
  }, []);

  // إغلاق القائمة عند تغيير حجم الشاشة
  useEffect(() => {
    let rafId: number | null = null;
    const handleResize = () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (window.innerWidth >= 1024) {
          setIsMenuOpen(false);
        }
      });
    };
    window.addEventListener('resize', handleResize, { passive: true } as any);
    return () => {
      window.removeEventListener('resize', handleResize as any);
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
    if (!isSearchOpen) {
      setTimeout(() => {
        document.getElementById('search-input')?.focus();
      }, 100);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // يمكن إضافة منطق البحث هنا
    }
  };

  const organization = storeData.organization_details;
  const settings = storeData.organization_settings;

  return (
    <>
      {/* شريط المعلومات العلوي الأنيق */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-b border-blue-100/50 py-2 text-sm hidden lg:block">
        <div className="container mx-auto px-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-8">
              {organization.contact_email && (
                <a 
                  href={`mailto:${organization.contact_email}`} 
                  className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-all duration-300 group"
                >
                  <Mail size={14} className="group-hover:scale-110 transition-transform duration-200" />
                  <span className="text-xs font-medium">{organization.contact_email}</span>
                </a>
              )}
              <div className="flex items-center gap-2 text-slate-600">
                <Phone size={14} />
                <span className="text-xs font-medium">+213 123 456 789</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <MapPin size={14} />
                <span className="text-xs font-medium">الجزائر العاصمة</span>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 bg-white/50 rounded-full px-3 py-1">
                <Globe size={14} className="text-blue-500" />
                <select 
                  defaultValue={settings.default_language}
                  className="bg-transparent border-none text-slate-600 text-xs font-medium focus:outline-none cursor-pointer"
                >
                  <option value="ar">العربية</option>
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </select>
              </div>
              
              <button className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-all duration-300 bg-white/50 rounded-full px-3 py-1 hover:bg-white/80">
                <User size={14} />
                <span className="text-xs font-medium">تسجيل الدخول</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* النافبار الرئيسي المثالي */}
      <header className={`sticky top-0 z-50 transition-all duration-500 ${
        isScrolled 
          ? 'bg-white/95 backdrop-blur-xl shadow-xl border-b border-gray-200/60' 
          : 'bg-white/90 backdrop-blur-sm border-b border-gray-100/40'
      }`}>
        <div className="py-4 lg:py-6">
          <div className="container mx-auto px-6">
            <div className="flex items-center justify-between">
              {/* الشعار الأنيق */}
              <div className="flex items-center">
                <a href="/" className="flex items-center gap-3 group">
                  {settings.logo_url ? (
                    <div className="relative overflow-hidden rounded-lg">
                      <img 
                        src={settings.logo_url} 
                        alt={organization.name}
                        className="h-12 w-auto object-contain transition-all duration-300 group-hover:scale-110"
                      />
                    </div>
                  ) : (
                    <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                      <span>{organization.name}</span>
                    </div>
                  )}
                  {settings.display_text_with_logo && settings.logo_url && (
                    <span className="text-xl font-bold text-slate-800 hidden sm:block group-hover:text-blue-600 transition-all duration-300">
                      {organization.name}
                    </span>
                  )}
                </a>
              </div>

              {/* شريط البحث الأنيق */}
              <div className="hidden lg:flex flex-1 max-w-2xl mx-8">
                <form onSubmit={handleSearch} className="w-full">
                  <div className="relative group">
                    <input
                      type="text"
                      placeholder="ابحث عن المنتجات المفضلة لديك..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-14 pr-6 py-4 bg-gradient-to-r from-gray-50 to-blue-50/30 border border-gray-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 focus:bg-white transition-all duration-300 text-slate-700 placeholder-slate-400 shadow-sm hover:shadow-md"
                    />
                    <button 
                      type="submit" 
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-all duration-300 hover:scale-110"
                    >
                      <Search size={20} />
                    </button>
                  </div>
                </form>
              </div>

              {/* أزرار الإجراءات الأنيقة */}
              <div className="flex items-center gap-3">
                {/* زر البحث للشاشات الصغيرة */}
                <button 
                  className="lg:hidden p-3 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-300 hover:scale-105"
                  onClick={toggleSearch}
                >
                  <Search size={22} />
                </button>

                <button className="relative p-3 text-slate-600 hover:text-pink-600 hover:bg-pink-50 rounded-xl transition-all duration-300 hover:scale-105 group">
                  <Heart size={22} className="group-hover:fill-pink-100 transition-all duration-300" />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold animate-pulse shadow-lg">
                      {wishlistCount}
                    </span>
                  )}
                </button>

                <button className="relative p-3 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all duration-300 hover:scale-105 group">
                  <ShoppingBag size={22} className="group-hover:fill-emerald-100 transition-all duration-300" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-emerald-500 to-green-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold animate-bounce shadow-lg">
                      {cartCount}
                    </span>
                  )}
                </button>

                <button 
                  className="lg:hidden p-3 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-300 hover:scale-105"
                  onClick={toggleMenu}
                  aria-label="فتح القائمة"
                >
                  <motion.div
                    animate={{ rotate: isMenuOpen ? 180 : 0 }}
                    transition={{ duration: 0.3, type: "spring" }}
                  >
                    {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                  </motion.div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* القائمة الرئيسية الأنيقة */}
        <nav className="hidden lg:block border-t border-gray-100/60 bg-gradient-to-r from-white/80 via-blue-50/20 to-white/80 backdrop-blur-sm">
          <div className="container mx-auto px-6">
            <div className="flex items-center justify-center py-4">
              <div className="flex items-center gap-10">
                <a 
                  href="/" 
                  className="relative text-slate-700 hover:text-blue-600 font-semibold transition-all duration-300 py-3 px-2 group"
                >
                  الرئيسية
                  <span className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-purple-600 transform scale-x-100 transition-transform duration-300 rounded-full"></span>
                </a>
                
                {categories && categories.slice(0, 5).map((category) => (
                  <a
                    key={category.id}
                    href={`/category/${category.slug}`}
                    className="relative text-slate-600 hover:text-blue-600 font-semibold transition-all duration-300 py-3 px-2 group"
                  >
                    {category.name}
                    <span className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-purple-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 rounded-full"></span>
                  </a>
                ))}
                
                <a 
                  href="/products" 
                  className="relative text-slate-600 hover:text-blue-600 font-semibold transition-all duration-300 py-3 px-2 group"
                >
                  جميع المنتجات
                  <span className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-purple-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 rounded-full"></span>
                </a>
                
                <a 
                  href="/about" 
                  className="relative text-slate-600 hover:text-blue-600 font-semibold transition-all duration-300 py-3 px-2 group"
                >
                  من نحن
                  <span className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-purple-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 rounded-full"></span>
                </a>
                
                <a 
                  href="/contact" 
                  className="relative text-slate-600 hover:text-blue-600 font-semibold transition-all duration-300 py-3 px-2 group"
                >
                  اتصل بنا
                  <span className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-purple-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 rounded-full"></span>
                </a>
              </div>
            </div>
          </div>
        </nav>

        {/* شريط البحث المنبثق الأنيق */}
        <AnimatePresence>
          {isSearchOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.3, type: "spring" }}
              className="lg:hidden border-t border-gray-100/60 bg-gradient-to-r from-white/95 via-blue-50/30 to-white/95 backdrop-blur-md"
            >
              <div className="container mx-auto px-6 py-6">
                <form onSubmit={handleSearch}>
                  <div className="relative">
                    <input
                      id="search-input"
                      type="text"
                      placeholder="ابحث عن المنتجات المفضلة لديك..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-14 pr-6 py-4 bg-white/80 border border-gray-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 focus:bg-white transition-all duration-300 text-slate-700 placeholder-slate-400 shadow-lg"
                    />
                    <button 
                      type="submit" 
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-all duration-300 hover:scale-110"
                    >
                      <Search size={20} />
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* القائمة المنبثقة الأنيقة */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.3, type: "spring" }}
              className="lg:hidden border-t border-gray-100/60 bg-gradient-to-br from-white/95 via-blue-50/30 to-purple-50/20 backdrop-blur-md"
            >
              <div className="container mx-auto px-6 py-8">
                <div className="space-y-2">
                  <a 
                    href="/" 
                    className="flex items-center text-slate-700 hover:text-blue-600 font-semibold transition-all duration-300 py-4 px-6 rounded-xl hover:bg-blue-50/50 border-r-4 border-blue-600 bg-blue-50/30"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    الرئيسية
                  </a>
                  
                  {categories && categories.map((category) => (
                    <a
                      key={category.id}
                      href={`/category/${category.slug}`}
                      className="flex items-center text-slate-600 hover:text-blue-600 font-semibold transition-all duration-300 py-4 px-6 rounded-xl hover:bg-blue-50/50 hover:border-r-4 hover:border-blue-600"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {category.name}
                    </a>
                  ))}
                  
                  <a 
                    href="/products" 
                    className="flex items-center text-slate-600 hover:text-blue-600 font-semibold transition-all duration-300 py-4 px-6 rounded-xl hover:bg-blue-50/50 hover:border-r-4 hover:border-blue-600"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    جميع المنتجات
                  </a>
                  
                  <a 
                    href="/about" 
                    className="flex items-center text-slate-600 hover:text-blue-600 font-semibold transition-all duration-300 py-4 px-6 rounded-xl hover:bg-blue-50/50 hover:border-r-4 hover:border-blue-600"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    من نحن
                  </a>
                  
                  <a 
                    href="/contact" 
                    className="flex items-center text-slate-600 hover:text-blue-600 font-semibold transition-all duration-300 py-4 px-6 rounded-xl hover:bg-blue-50/50 hover:border-r-4 hover:border-blue-600"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    اتصل بنا
                  </a>

                  {/* معلومات الاتصال الأنيقة */}
                  <div className="pt-8 mt-8 border-t border-gray-200/60">
                    <h3 className="text-lg font-bold text-slate-700 mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">معلومات الاتصال</h3>
                    <div className="space-y-4">
                      {organization.contact_email && (
                        <a 
                          href={`mailto:${organization.contact_email}`} 
                          className="flex items-center gap-4 text-slate-600 hover:text-blue-600 transition-all duration-300 p-4 rounded-xl hover:bg-blue-50/50 group"
                        >
                          <Mail size={18} className="text-blue-500 group-hover:scale-110 transition-transform duration-200" />
                          <span className="font-medium">{organization.contact_email}</span>
                        </a>
                      )}
                      <div className="flex items-center gap-4 text-slate-600 p-4 rounded-xl bg-gray-50/50">
                        <Phone size={18} className="text-green-500" />
                        <span className="font-medium">+213 123 456 789</span>
                      </div>
                      <div className="flex items-center gap-4 text-slate-600 p-4 rounded-xl bg-gray-50/50">
                        <MapPin size={18} className="text-red-500" />
                        <span className="font-medium">الجزائر العاصمة</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
};
