import { useState, useEffect, useCallback, memo } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';

const Navbar = memo(() => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle scroll to change navbar style
  const handleScroll = useCallback(() => {
    const scrolled = window.scrollY > 10;
    setIsScrolled(scrolled);
  }, []);

  useEffect(() => {
    // Add scroll event listener
    window.addEventListener('scroll', handleScroll);
    
    // Initial check
    handleScroll();
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
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
          ? 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-lg border-b border-gray-200/30 dark:border-gray-700/30' 
          : 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-md'
      }`}
    >
      <div className="container px-4 mx-auto">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 space-x-reverse">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-rose-500 rounded-xl flex items-center justify-center overflow-hidden shadow-md">
              <img 
                src="/images/logo-new.webp" 
                alt="سطوكيها" 
                className="w-6 h-6 object-contain"
                fetchPriority="high"
              />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-amber-500 to-rose-500 bg-clip-text text-transparent">
              سطوكيها
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1 space-x-reverse">
            {[
              { href: '/', label: 'الرئيسية' },
              { href: '/features', label: 'المميزات' },
              { href: '/pricing', label: 'الأسعار' },
              { href: '/contact', label: 'تواصل معنا' }
            ].map((item, index) => (
              <Link 
                key={index}
                to={item.href}
                className="px-4 py-2 font-medium text-gray-600 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 transition-all duration-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-3 space-x-reverse">
            <ThemeToggle />
            
            <Link to="/login">
              <Button variant="outline" size="sm" className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                تسجيل الدخول
              </Button>
            </Link>
            
            <Link to="/tenant/signup">
              <Button size="sm" className="bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white shadow-md hover:shadow-lg transition-all duration-300">
                ابدأ مجاناً
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden space-x-2 space-x-reverse">
            <ThemeToggle />
            
            <Button 
              variant="outline" 
              size="icon" 
              onClick={toggleMenu}
              aria-label="القائمة"
              className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
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
        <div className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="container px-4 py-4 space-y-3">
            {[
              { href: '/', label: 'الرئيسية' },
              { href: '/features', label: 'المميزات' },
              { href: '/pricing', label: 'الأسعار' },
              { href: '/contact', label: 'تواصل معنا' }
            ].map((item, index) => (
              <Link 
                key={index}
                to={item.href}
                className="block px-4 py-3 font-medium text-gray-600 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={closeMenu}
              >
                {item.label}
              </Link>
            ))}
            
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
              <Link to="/login" className="block" onClick={closeMenu}>
                <Button variant="outline" className="w-full border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                  تسجيل الدخول
                </Button>
              </Link>
              
              <Link to="/tenant/signup" className="block" onClick={closeMenu}>
                <Button className="w-full bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white shadow-md hover:shadow-lg transition-all duration-300">
                  ابدأ مجاناً
                </Button>
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
