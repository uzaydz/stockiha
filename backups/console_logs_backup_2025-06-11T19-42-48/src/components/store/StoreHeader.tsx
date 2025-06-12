import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Search, ShoppingCart, User, Heart, ChevronDown, Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

interface StoreHeaderProps {
  storeName?: string;
  storeLogoUrl?: string;
  categories?: { id: string; name: string }[];
  cartItemsCount?: number;
}

const StoreHeader = ({
  storeName,
  storeLogoUrl,
  categories = [],
  cartItemsCount = 0,
}: StoreHeaderProps) => {
  const { currentSubdomain } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileCategoriesOpen, setIsMobileCategoriesOpen] = useState(false);
  
  // تتبع حالة التمرير
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // إجراء البحث هنا
    
    setIsSearchOpen(false);
  };

  return (
    <header 
      className={`sticky top-0 z-40 w-full transition-all duration-300 ${
        scrolled 
          ? 'bg-background/95 backdrop-blur-xl shadow-md border-b border-border/10' 
          : 'bg-background/80 backdrop-blur-lg'
      }`}
    >
      <div className="container px-4 mx-auto">
        <div className="flex items-center justify-between h-20">
          {/* الشعار والاسم */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3"
          >
            <Link to="/" className="flex items-center gap-3 group">
              {storeLogoUrl ? (
                <div className="h-12 w-12 rounded-full overflow-hidden shadow-md border border-border/30 transition-all duration-300 group-hover:shadow-lg group-hover:border-primary/50 group-hover:scale-105">
                  <img 
                    src={storeLogoUrl} 
                    alt={`شعار ${storeName || currentSubdomain}`} 
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : (
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/30 shadow-md group-hover:bg-primary/20 transition-all duration-300 group-hover:scale-105">
                  <span className="text-xl font-bold text-primary">
                    {(storeName || currentSubdomain || 'S').charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-lg font-bold hidden md:inline-block bg-gradient-to-br from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent transition-all group-hover:scale-105">
                  {storeName || currentSubdomain || 'متجر'}
                </span>
                <span className="text-xs text-muted-foreground hidden md:inline-block">المتجر الإلكتروني الخاص بك</span>
              </div>
            </Link>
          </motion.div>

          {/* القائمة للشاشات الكبيرة */}
          <motion.nav 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="hidden md:flex items-center space-x-8 space-x-reverse rtl:space-x-reverse"
          >
            <Link to="/" className="text-sm font-medium hover:text-primary transition-all duration-300 relative group py-2 hover:scale-105">
              الرئيسية
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rtl:origin-right"></span>
            </Link>
            
            {/* قائمة الفئات المنسدلة */}
            <div className="relative group">
              <Link 
                to="/products"
                className="text-sm font-medium hover:text-primary transition-all duration-300 relative group py-2 hover:scale-105 flex items-center gap-1"
              >
                الفئات
                <ChevronDown className="h-3.5 w-3.5 opacity-70 transition-transform group-hover:rotate-180" />
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rtl:origin-right"></span>
              </Link>
              
              {/* القائمة المنسدلة للفئات */}
              <div className="absolute top-full right-0 mt-1 w-64 bg-background/95 backdrop-blur-lg shadow-lg rounded-lg border border-border/30 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                <div className="p-2">
                  <Link 
                    to="/products"
                    className="flex items-center gap-2 p-2 text-sm font-medium hover:bg-primary/5 hover:text-primary rounded-md transition-all duration-200"
                  >
                    تصفح كل المنتجات
                  </Link>
                  <div className="h-px bg-border/50 my-1"></div>
                  {categories.map((category) => (
                    <Link 
                      key={category.id} 
                      to={`/products?category=${category.id}`} 
                      className="flex items-center gap-2 p-2 text-sm font-medium hover:bg-primary/5 hover:text-primary rounded-md transition-all duration-200"
                    >
                      {category.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            
            <Link to="/services" className="text-sm font-medium hover:text-primary transition-all duration-300 relative group py-2 hover:scale-105">
              الخدمات
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rtl:origin-right"></span>
            </Link>
            <Link to="/about" className="text-sm font-medium hover:text-primary transition-all duration-300 relative group py-2 hover:scale-105">
              من نحن
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rtl:origin-right"></span>
            </Link>
            <Link to="/contact" className="text-sm font-medium hover:text-primary transition-all duration-300 relative group py-2 hover:scale-105">
              اتصل بنا
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rtl:origin-right"></span>
            </Link>
          </motion.nav>

          {/* البحث والسلة والحساب */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3"
          >
            {/* نموذج البحث للشاشات الكبيرة - يظهر فقط عند النقر على أيقونة البحث */}
            <AnimatePresence>
              {isSearchOpen && (
                <motion.form 
                  onSubmit={handleSearch}
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "240px" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.3 }}
                  className="hidden md:flex items-center relative overflow-hidden"
                >
                  <Input
                    type="search"
                    placeholder="ابحث عن منتجات..."
                    className="pr-10 pl-9 rtl:pr-9 rtl:pl-10 rounded-full border-primary/30 focus:border-primary h-10 shadow-sm focus:shadow-md transition-all duration-300"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                  <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-primary" />
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-1 rtl:right-auto rtl:left-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => setIsSearchOpen(false)}
                  >
                    <X className="h-[16px] w-[16px]" />
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
            
            {/* أيقونة البحث للشاشات الكبيرة */}
            {!isSearchOpen && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="hidden md:flex h-10 w-10 hover:bg-primary/10 hover:text-primary rounded-full transition-all duration-300 hover:scale-110"
                onClick={() => setIsSearchOpen(true)}
              >
                <Search className="h-[18px] w-[18px]" />
              </Button>
            )}
            
            <Link to="/wishlist" className="hidden sm:flex">
              <Button variant="ghost" size="icon" className="relative h-10 w-10 hover:bg-primary/10 hover:text-primary rounded-full transition-all duration-300 hover:scale-110">
                <Heart className="h-[18px] w-[18px]" />
              </Button>
            </Link>
            
            <Link to="/cart">
              <Button variant="ghost" size="icon" className="relative h-10 w-10 hover:bg-primary/10 hover:text-primary rounded-full transition-all duration-300 hover:scale-110">
                <ShoppingCart className="h-[18px] w-[18px]" />
                {cartItemsCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] font-medium border-2 border-background animate-pulse">
                    {cartItemsCount > 9 ? '9+' : cartItemsCount}
                  </Badge>
                )}
              </Button>
            </Link>
            
            <Link to="/account">
              <Button variant="outline" size="sm" className="h-10 rounded-full border-border/60 hover:bg-primary/5 hover:text-primary hover:border-primary/40 transition-all duration-300 gap-2 ml-1 hover:scale-105">
                <User className="h-[18px] w-[18px]" />
                <span className="hidden sm:inline">حسابي</span>
              </Button>
            </Link>
            
            {/* القائمة المنسدلة للشاشات الصغيرة */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden h-10 w-10 hover:bg-primary/10 hover:text-primary rounded-full transition-all duration-300 hover:scale-110">
                  <Menu className="h-[18px] w-[18px]" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[350px] border-l p-0">
                <div className="flex flex-col h-full">
                  {/* رأس القائمة المنسدلة */}
                  <div className="p-5 border-b">
                    <div className="flex items-center gap-3 mb-6">
                      {storeLogoUrl ? (
                        <div className="h-14 w-14 rounded-full overflow-hidden border border-border/30 shadow-md">
                          <img 
                            src={storeLogoUrl} 
                            alt={`شعار ${storeName || currentSubdomain}`} 
                            className="h-full w-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center border border-primary/30 shadow-md">
                          <span className="text-2xl font-bold text-primary">
                            {(storeName || currentSubdomain || 'S').charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="text-xl font-bold bg-gradient-to-br from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent">
                          {storeName || currentSubdomain || 'متجر'}
                        </span>
                        <span className="text-sm text-muted-foreground">المتجر الإلكتروني الخاص بك</span>
                      </div>
                    </div>
                    
                    <form onSubmit={handleSearch} className="relative">
                      <Input
                        type="search"
                        placeholder="ابحث عن منتجات..."
                        className="pl-10 rtl:pr-10 rtl:pl-4 rounded-full border-primary/30 focus:border-primary shadow-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-primary/70" />
                    </form>
                  </div>
                  
                  {/* روابط القائمة */}
                  <div className="flex-1 overflow-auto p-5">
                    <nav className="flex flex-col space-y-2">
                      <Link to="/" className="flex items-center gap-3 px-4 py-3 text-base font-medium hover:bg-primary/5 hover:text-primary rounded-xl transition-all duration-300 group">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-all duration-300">
                          <svg className="h-4 w-4 text-primary" fill="none" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                          </svg>
                        </div>
                        <span>الرئيسية</span>
                      </Link>
                      
                      {/* قائمة الفئات في النافبار الجانبي للموبايل */}
                      <div className="flex flex-col">
                        <div 
                          className="flex items-center justify-between px-4 py-3 text-base font-medium hover:bg-primary/5 hover:text-primary rounded-xl transition-all duration-300 group cursor-pointer"
                          onClick={() => setIsMobileCategoriesOpen(!isMobileCategoriesOpen)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-all duration-300">
                              <svg className="h-4 w-4 text-primary" fill="none" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                              </svg>
                            </div>
                            <span>الفئات</span>
                          </div>
                          <ChevronDown 
                            className={`h-4 w-4 opacity-70 transition-transform duration-300 ${isMobileCategoriesOpen ? 'rotate-180' : ''}`} 
                          />
                        </div>
                        
                        {/* قائمة الفئات - تظهر/تختفي حسب الحالة */}
                        {isMobileCategoriesOpen && (
                          <div className="pr-12 pl-4 py-2">
                            <Link 
                              to="/products"
                              className="flex items-center gap-2 p-2 text-sm font-medium hover:bg-primary/5 hover:text-primary rounded-md transition-all duration-200"
                            >
                              تصفح كل المنتجات
                            </Link>
                            <div className="h-px bg-border/50 my-1"></div>
                            {categories.map((cat) => (
                              <Link 
                                key={cat.id} 
                                to={`/products?category=${cat.id}`} 
                                className="flex items-center gap-2 p-2 text-sm font-medium hover:bg-primary/5 hover:text-primary rounded-md transition-all duration-200"
                              >
                                {cat.name}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <Link to="/services" className="flex items-center gap-3 px-4 py-3 text-base font-medium hover:bg-primary/5 hover:text-primary rounded-xl transition-all duration-300 group">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-all duration-300">
                          <svg className="h-4 w-4 text-primary" fill="none" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
                          </svg>
                        </div>
                        <span>الخدمات</span>
                      </Link>
                      
                      <Link to="/about" className="flex items-center gap-3 px-4 py-3 text-base font-medium hover:bg-primary/5 hover:text-primary rounded-xl transition-all duration-300 group">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-all duration-300">
                          <svg className="h-4 w-4 text-primary" fill="none" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                          </svg>
                        </div>
                        من نحن
                      </Link>
                      
                      <Link to="/contact" className="flex items-center gap-3 px-4 py-3 text-base font-medium hover:bg-primary/5 hover:text-primary rounded-xl transition-all duration-300 group">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-all duration-300">
                          <svg className="h-4 w-4 text-primary" fill="none" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                          </svg>
                        </div>
                        اتصل بنا
                      </Link>
                    </nav>
                  </div>
                  
                  {/* تذييل القائمة المنسدلة */}
                  <div className="border-t p-5">
                    <div className="grid grid-cols-3 gap-2">
                      <Link to="/account" className="col-span-3">
                        <Button className="w-full mb-2 rounded-xl h-11 group">
                          <User className="h-[18px] w-[18px] mr-2 group-hover:scale-110 transition-transform" />
                          <span>حسابي</span>
                        </Button>
                      </Link>
                      <Link to="/cart" className="col-span-3">
                        <Button variant="outline" className="w-full rounded-xl border-primary/30 hover:border-primary/50 h-11 group">
                          <ShoppingCart className="h-[18px] w-[18px] mr-2 group-hover:scale-110 transition-transform" />
                          <span>سلة التسوق</span>
                          {cartItemsCount > 0 && (
                            <Badge variant="destructive" className="mr-2 h-5 w-5 p-0 flex items-center justify-center text-[11px] font-medium">
                              {cartItemsCount > 9 ? '9+' : cartItemsCount}
                            </Badge>
                          )}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </motion.div>
        </div>
      </div>
    </header>
  );
};

export default StoreHeader;
