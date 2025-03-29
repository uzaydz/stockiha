
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, User, Menu, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useShop } from '@/context/ShopContext';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

const Navbar = () => {
  const { currentUser, logout, cart } = useShop();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
  
  const categories = [
    { name: 'أجهزة', path: '/category/consoles' },
    { name: 'ألعاب', path: '/category/games' },
    { name: 'إكسسوارات', path: '/category/accessories' },
    { name: 'خدمات الإصلاح', path: '/services' },
  ];
  
  return (
    <nav className="bg-card text-card-foreground shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Mobile Menu Button */}
          <div className="flex items-center">
            <button
              className="inline-flex items-center justify-center p-2 rounded-md md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <span className="sr-only">فتح القائمة الرئيسية</span>
              {isMenuOpen ? (
                <X className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="h-6 w-6" aria-hidden="true" />
              )}
            </button>
            <Link to="/" className="text-xl font-bold text-primary mr-4">
              منصة الألعاب الشاملة
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {categories.map((category) => (
              <Link
                key={category.path}
                to={category.path}
                className="mx-2 px-3 py-2 rounded-md text-sm font-medium hover:bg-primary/10 transition-colors"
              >
                {category.name}
              </Link>
            ))}
          </div>
          
          {/* Search, Cart, User */}
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <div className="hidden md:flex relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="ابحث عن منتجات..."
                className="w-[200px] pl-8 pr-4 text-right"
                dir="rtl"
              />
            </div>
            
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  {totalItems > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                      {totalItems}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <div className="p-6">
                  <h2 className="text-xl font-bold mb-4">عربة التسوق</h2>
                  {cart.length === 0 ? (
                    <p>عربة التسوق فارغة</p>
                  ) : (
                    <div className="space-y-4">
                      {cart.map((item) => (
                        <div key={item.product.id} className="flex items-center space-x-4 rtl:space-x-reverse">
                          <div className="w-16 h-16 bg-muted rounded overflow-hidden">
                            <img
                              src={item.product.thumbnailImage || '/placeholder.svg'}
                              alt={item.product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium">{item.product.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {item.quantity} × {item.product.price} ر.س
                            </p>
                          </div>
                        </div>
                      ))}
                      <div className="pt-4 border-t">
                        <div className="flex justify-between mb-2">
                          <span className="font-medium">المجموع:</span>
                          <span>{cart.reduce((total, item) => total + (item.product.price * item.quantity), 0)} ر.س</span>
                        </div>
                        <Link to="/checkout">
                          <Button className="w-full">إتمام الشراء</Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
            
            {currentUser ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/user-avatar.png" alt={currentUser.name} />
                      <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>حسابي</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {(currentUser.role === 'admin' || currentUser.role === 'employee') && (
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" className="w-full cursor-pointer">لوحة التحكم</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="w-full cursor-pointer">الملف الشخصي</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/orders" className="w-full cursor-pointer">طلباتي</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="cursor-pointer">
                    تسجيل الخروج
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="ghost" size="icon" asChild>
                <Link to="/login">
                  <User className="h-5 w-5" />
                </Link>
              </Button>
            )}
          </div>
        </div>
        
        {/* Mobile Menu */}
        <div className={`md:hidden ${isMenuOpen ? 'block' : 'hidden'}`}>
          <div className="pt-2 pb-4 space-y-1">
            <div className="px-3 py-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="ابحث عن منتجات..."
                  className="w-full pl-8 pr-4 text-right"
                  dir="rtl"
                />
              </div>
            </div>
            {categories.map((category) => (
              <Link
                key={category.path}
                to={category.path}
                className="block px-3 py-2 rounded-md text-base font-medium hover:bg-primary/10"
                onClick={() => setIsMenuOpen(false)}
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
