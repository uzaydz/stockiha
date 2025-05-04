import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [siteName, setSiteName] = useState<string>('متجرشامل');

  // تتبع التمرير لتغيير مظهر شريط التنقل
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 py-3 ${
      isScrolled ? 'bg-background/80 backdrop-blur-md shadow-sm' : 'bg-transparent'
    }`}>
      <div className="container px-4 mx-auto">
        <div className="flex items-center justify-between">
          {/* الشعار */}
          <Link to="/" className="flex items-center">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mr-2">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" className="text-primary" />
                <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="currentColor" className="text-primary" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-xl font-bold text-foreground">{siteName.includes('متجر') ? siteName : <><span>متجر</span><span className="text-primary">{siteName}</span></>}</span>
          </Link>

          {/* عناصر القائمة الرئيسية */}
          <div className="hidden md:flex items-center space-x-6 space-x-reverse">
            <Link 
              to="/"
              className="font-medium transition-colors hover:text-primary"
            >
              الرئيسية
            </Link>
            
            <div className="relative group">
              <button className="flex items-center font-medium transition-colors hover:text-primary gap-1">
                <span>المميزات</span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </button>
              
              <div className="absolute top-full right-0 mt-2 w-64 rounded-md border border-border bg-card shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                <div className="p-2 space-y-1">
                  <Link 
                    to="/features/pos"
                    className="block px-3 py-2 rounded-md hover:bg-muted transition-colors"
                  >
                    نقاط البيع
                  </Link>
                  <Link 
                    to="/features/online-store"
                    className="block px-3 py-2 rounded-md hover:bg-muted transition-colors"
                  >
                    المتجر الإلكتروني
                  </Link>
                  <Link 
                    to="/features/advanced-analytics"
                    className="block px-3 py-2 rounded-md hover:bg-muted transition-colors"
                  >
                    التقارير والتحليلات
                  </Link>
                  <Link 
                    to="/features"
                    className="block px-3 py-2 rounded-md hover:bg-muted transition-colors"
                  >
                    كل المميزات
                  </Link>
                </div>
              </div>
            </div>
            
            <Link 
              to="/pricing"
              className="font-medium transition-colors hover:text-primary"
            >
              الأسعار
            </Link>
            
            <Link 
              to="/contact"
              className="font-medium transition-colors hover:text-primary"
            >
              تواصل معنا
            </Link>
          </div>

          {/* زر تبديل الوضع الليلي والنهاري وأزرار تسجيل الدخول للشاشات الكبيرة */}
          <div className="hidden md:flex items-center space-x-2 space-x-reverse">
            <ThemeToggle />
            
            <Link to="/login">
              <Button variant="outline" size="sm">تسجيل الدخول</Button>
            </Link>
            
            <Link to="/tenant/signup">
              <Button size="sm">تسجيل مؤسسة مجاناً</Button>
            </Link>
          </div>

          {/* زر القائمة للشاشات الصغيرة */}
          <div className="flex items-center md:hidden space-x-2 space-x-reverse">
            <ThemeToggle />
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
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

      {/* القائمة المنسدلة للهاتف المحمول */}
      <div className={`md:hidden fixed inset-x-0 top-[60px] bg-background border-b border-border transition-all duration-300 ease-in-out z-40 ${isMenuOpen ? 'h-[calc(100vh-60px)] overflow-y-auto' : 'h-0 overflow-hidden'}`}>
        <div className="container px-4 pt-5 pb-8">
          <div className="space-y-6">
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground mb-2">التنقل الرئيسي</div>
              <Link 
                to="/"
                className="block px-3 py-2 text-base font-medium rounded-md hover:bg-muted transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                الرئيسية
              </Link>
              
              <div className="space-y-1 mr-2 mt-1 mb-1">
                <div className="px-3 py-1 text-sm font-medium text-muted-foreground">المميزات</div>
                <Link 
                  to="/features/pos"
                  className="block px-3 py-2 text-base font-medium rounded-md hover:bg-muted transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  نقاط البيع
                </Link>
                <Link 
                  to="/features/online-store"
                  className="block px-3 py-2 text-base font-medium rounded-md hover:bg-muted transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  المتجر الإلكتروني
                </Link>
                <Link 
                  to="/features/advanced-analytics"
                  className="block px-3 py-2 text-base font-medium rounded-md hover:bg-muted transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  التقارير والتحليلات
                </Link>
                <Link 
                  to="/features"
                  className="block px-3 py-2 text-base font-medium rounded-md hover:bg-muted transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  كل المميزات
                </Link>
              </div>
              
              <Link 
                to="/pricing"
                className="block px-3 py-2 text-base font-medium rounded-md hover:bg-muted transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                الأسعار
              </Link>
              
              <Link 
                to="/contact"
                className="block px-3 py-2 text-base font-medium rounded-md hover:bg-muted transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                تواصل معنا
              </Link>
            </div>

            <div className="flex flex-col space-y-2 pt-4 border-t border-border mt-2">
              <Link 
                to="/login"
                className="w-full"
                onClick={() => setIsMenuOpen(false)}
              >
                <Button variant="outline" className="w-full">تسجيل الدخول</Button>
              </Link>
              
              <Link 
                to="/tenant/signup"
                className="w-full"
                onClick={() => setIsMenuOpen(false)}
              >
                <Button className="w-full">تسجيل مؤسسة مجاناً</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar; 