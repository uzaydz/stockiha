import { useState, useEffect, useCallback, memo } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';

const Navbar = memo(() => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Optimized scroll handler with throttling
  const handleScroll = useCallback(() => {
    const scrolled = window.scrollY > 10;
    if (scrolled !== isScrolled) {
      setIsScrolled(scrolled);
    }
  }, [isScrolled]);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [handleScroll]);

  const toggleMenu = useCallback(() => {
    setIsMenuOpen(prev => !prev);
  }, []);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-sm border-b border-slate-200 dark:border-slate-700' 
          : 'bg-transparent'
      }`}
    >
      <div className="container px-6 mx-auto">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 space-x-reverse">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center overflow-hidden">
              <img 
                src="/images/logo-new.webp" 
                alt="سطوكيها" 
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white">
              سطوكيها
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8 space-x-reverse">
            <Link 
              to="/"
              className="font-medium text-slate-600 dark:text-slate-300 hover:text-primary transition-colors"
            >
              الرئيسية
            </Link>
            <Link 
              to="/features"
              className="font-medium text-slate-600 dark:text-slate-300 hover:text-primary transition-colors"
            >
              المميزات
            </Link>
            <Link 
              to="/pricing"
              className="font-medium text-slate-600 dark:text-slate-300 hover:text-primary transition-colors"
            >
              الأسعار
            </Link>
            <Link 
              to="/contact"
              className="font-medium text-slate-600 dark:text-slate-300 hover:text-primary transition-colors"
            >
              تواصل معنا
            </Link>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4 space-x-reverse">
            <ThemeToggle />
            
            <Link to="/login">
              <Button variant="outline" size="sm">تسجيل الدخول</Button>
            </Link>
            
            <Link to="/tenant/signup">
              <Button size="sm">ابدأ مجاناً</Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden space-x-2 space-x-reverse">
            <ThemeToggle />
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleMenu}
              aria-label="القائمة"
            >
              {isMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
          <div className="container px-6 py-4 space-y-4">
            <Link 
              to="/"
              className="block font-medium text-slate-600 dark:text-slate-300 hover:text-primary transition-colors"
              onClick={closeMenu}
            >
              الرئيسية
            </Link>
            <Link 
              to="/features"
              className="block font-medium text-slate-600 dark:text-slate-300 hover:text-primary transition-colors"
              onClick={closeMenu}
            >
              المميزات
            </Link>
            <Link 
              to="/pricing"
              className="block font-medium text-slate-600 dark:text-slate-300 hover:text-primary transition-colors"
              onClick={closeMenu}
            >
              الأسعار
            </Link>
            <Link 
              to="/contact"
              className="block font-medium text-slate-600 dark:text-slate-300 hover:text-primary transition-colors"
              onClick={closeMenu}
            >
              تواصل معنا
            </Link>
            
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
              <Link to="/login" className="block" onClick={closeMenu}>
                <Button variant="outline" className="w-full">تسجيل الدخول</Button>
              </Link>
              
              <Link to="/tenant/signup" className="block" onClick={closeMenu}>
                <Button className="w-full">ابدأ مجاناً</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
});

Navbar.displayName = 'Navbar';

export default Navbar;
