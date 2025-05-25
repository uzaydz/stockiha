import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Search, 
  Phone, 
  Package, 
  ShoppingCart,
  Settings,
  Moon,
  Sun,
  Menu,
  X,
  ArrowRight,
  Gamepad2,
  Wrench
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTheme } from '@/context/ThemeContext';
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [totalItems, setTotalItems] = useState(0); // هذا للعرض فقط، ستحتاج لاستبداله بحالة السلة الحقيقية

  // القائمة للزوار
  const categories = [
    { name: 'الرئيسية', path: '/', icon: Home },
    { name: 'أجهزة', path: '/category/consoles', icon: Gamepad2 },
    { name: 'إكسسوارات', path: '/category/accessories', icon: ShoppingCart },
    { name: 'خدمات الإصلاح', path: '/services', icon: Wrench },
    { name: 'اتصل بنا', path: '/contact', icon: Phone },
  ];

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
    toast.success(`تم التغيير إلى ${theme === "dark" ? "الوضع الفاتح" : "الوضع المظلم"}`);
  };

  return (
    <div dir="rtl" className="bg-background/95 min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 shadow-sm bg-card text-card-foreground border-b border-muted">
        <div className="container mx-auto">
          <div className="flex justify-between items-center h-16 px-4">
            {/* Logo & Mobile Menu Button */}
            <div className="flex items-center">              
              <Link to="/" className="flex items-center gap-2 text-xl font-bold ml-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary/5">
                  <Package className="h-4 w-4 text-primary" />
                </div>
                <span className="hidden sm:inline">
                  بازار كونسول
                </span>
              </Link>
              
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
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4 space-x-reverse">
              {categories.map((category) => (
                <Link
                  key={category.path}
                  to={category.path}
                  className={cn(
                    "flex items-center gap-1 mx-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    location.pathname === category.path 
                      ? "bg-primary/10 text-primary" 
                      : "hover:bg-primary/5 text-foreground"
                  )}
                >
                  <category.icon className="h-4 w-4 ml-1" />
                  {category.name}
                </Link>
              ))}
            </div>
            
            {/* Search, Cart, Theme Toggle */}
            <div className="flex items-center space-x-2 space-x-reverse">
              {/* زر تبديل الثيم */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleTheme}
                      className="relative rounded-full hover:bg-muted"
                      aria-label={theme === "dark" ? "التبديل إلى الوضع الفاتح" : "التبديل إلى الوضع المظلم"}
                    >
                      {theme === "dark" ? (
                        <Sun className="h-5 w-5 text-yellow-500" />
                      ) : (
                        <Moon className="h-5 w-5 text-slate-700" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{theme === "dark" ? "الوضع الفاتح" : "الوضع المظلم"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <div className="hidden md:flex relative">
                <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="ابحث عن منتجات..."
                  className="w-[200px] pr-8 pl-4"
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
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between border-b pb-4">
                      <h2 className="text-lg font-bold">سلة التسوق</h2>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex-grow py-4">
                      {totalItems === 0 ? (
                        <div className="text-center py-10">
                          <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                          <p>سلة التسوق فارغة</p>
                          <Button variant="outline" className="mt-4">
                            <Link to="/products">
                              تصفح المنتجات
                              <ArrowRight className="ml-2 h-4 w-4 flip-x" />
                            </Link>
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <p>العناصر ستظهر هنا</p>
                        </div>
                      )}
                    </div>
                    <div className="border-t pt-4">
                      <Button className="w-full" disabled={totalItems === 0}>إتمام الشراء</Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <Button variant="outline" size="sm" asChild>
                <Link to="/login">
                  تسجيل الدخول
                </Link>
              </Button>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          <div className={`md:hidden ${isMenuOpen ? 'block' : 'hidden'} py-2 px-4 border-t`}>
            <div className="flex flex-col space-y-2">
              {categories.map((category) => (
                <Link
                  key={category.path}
                  to={category.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    location.pathname === category.path 
                      ? "bg-primary/10 text-primary" 
                      : "hover:bg-primary/5 text-foreground"
                  )}
                >
                  <category.icon className="h-4 w-4" />
                  {category.name}
                </Link>
              ))}

              <div className="relative mt-4">
                <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="ابحث عن منتجات..."
                  className="w-full pr-8 pl-4"
                  dir="rtl"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-muted py-8 border-t">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary/10">
                  <Package className="h-4 w-4 text-primary" />
                </div>
                <span className="font-bold text-lg">بازار كونسول</span>
              </div>
              <p className="text-muted-foreground text-sm">
                متجر متخصص في بيع وإصلاح الأجهزة الإلكترونية وألعاب الفيديو وملحقاتها بأعلى جودة وأفضل الأسعار.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-4">روابط سريعة</h3>
              <ul className="space-y-2 text-sm">
                {categories.map((category) => (
                  <li key={category.path}>
                    <Link to={category.path} className="text-muted-foreground hover:text-primary transition flex items-center gap-2">
                      <category.icon className="h-4 w-4" />
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-4">تواصل معنا</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center">
                  <span className="ml-2 font-medium">العنوان:</span>
                  <span>خنشلة حي النصر، الجزائر</span>
                </li>
                <li className="flex items-center">
                  <span className="ml-2 font-medium">الهاتف:</span>
                  <span dir="ltr">0540240886</span>
                </li>
                <li className="flex items-center">
                  <span className="ml-2 font-medium">البريد الإلكتروني:</span>
                  <span>info@stockiha.com</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-4 border-t text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} سطوكيها. جميع الحقوق محفوظة. مع سطوكيها... كلشي فبلاصتو!</p>
          </div>
        </div>
      </footer>
    </div>
  );
} 