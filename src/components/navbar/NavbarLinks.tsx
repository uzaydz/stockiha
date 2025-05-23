import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  ChevronDown, Home, Tag, Settings, Truck, 
  Package, ShoppingCart, ShieldCheck, LayoutGrid, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import type { Category } from '@/api/store';
import { Badge } from "@/components/ui/badge";

interface NavbarLinksProps {
  isAdminPage?: boolean;
  categories?: Category[];
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

// إضافة واجهة خاصة للعناصر الفرعية التي تحتوي على خاصية path
interface SubMenuItem {
  name: string;
  id: string;
  path?: string;
}

interface NavLink {
  name: string;
  path: string;
  icon: any;
  hasSubmenu?: boolean;
  submenuItems?: Category[] | SubMenuItem[];
  hasNew?: boolean;
  featured?: {id: string, name: string}[];
}

export function NavbarLinks({ 
  isAdminPage = false, 
  categories = [], 
  orientation = 'horizontal',
  className
}: NavbarLinksProps) {
  const location = useLocation();
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [dropdownHovered, setDropdownHovered] = useState<string | null>(null);
  const [newProducts, setNewProducts] = useState<boolean>(false);
  const [featuredItems, setFeaturedItems] = useState<{id: string, name: string}[]>([]);
  
  // محاكاة وجود منتجات جديدة أو مميزة - في التطبيق الحقيقي ستأتي من واجهة برمجة التطبيقات
  useEffect(() => {
    // افتراض وجود منتجات جديدة بعد فترة قصيرة للعرض التوضيحي
    const timer = setTimeout(() => {
      setNewProducts(true);
      setFeaturedItems([
        { id: 'feat1', name: 'PlayStation 5' },
        { id: 'feat2', name: 'سماعات ألعاب لاسلكية' }
      ]);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);
  
  const getLinks = (): NavLink[] => {
    if (isAdminPage) {
      return [
        { name: 'لوحة التحكم', path: '/dashboard', icon: ShieldCheck },
        { name: 'المنتجات', path: '/dashboard/products', icon: Package },
        { name: 'الطلبات', path: '/dashboard/orders', icon: ShoppingCart },
      ];
    } else if (categories.length > 0) {
      return [
        { name: 'الرئيسية', path: '/', icon: Home },
        { 
          name: 'المنتجات', 
          path: '/products', 
          icon: Tag, 
          hasSubmenu: true, 
          submenuItems: categories,
          hasNew: newProducts,
          featured: featuredItems
        },
        { name: 'خدمات الإصلاح', path: '/services', icon: Settings },
        { name: 'تتبع الخدمات', path: '/service-tracking-public', icon: Truck },
      ];
    } else {
      // استخدام الواجهة الخاصة للعناصر الفرعية الافتراضية
      const defaultSubmenuItems: SubMenuItem[] = [
        { name: 'أجهزة', id: 'consoles', path: '/category/consoles' },
        { name: 'ألعاب', id: 'games', path: '/category/games' },
        { name: 'إكسسوارات', id: 'accessories', path: '/category/accessories' },
      ];
      
      return [
        { name: 'الرئيسية', path: '/', icon: Home },
        { 
          name: 'المنتجات', 
          path: '/products', 
          icon: Tag, 
          hasSubmenu: true, 
          submenuItems: defaultSubmenuItems,
          hasNew: newProducts,
          featured: featuredItems
        },
        { name: 'خدمات الإصلاح', path: '/services', icon: Settings },
        { name: 'تتبع الخدمات', path: '/service-tracking-public', icon: Truck },
      ];
    }
  };
  
  const links = getLinks();

  const toggleSubmenu = (name: string) => {
    setActiveSubmenu(activeSubmenu === name ? null : name);
  };
  
  const isActiveLink = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // وظيفة مساعدة للحصول على المسار من نوع مختلف من العناصر الفرعية
  const getItemPath = (item: Category | SubMenuItem) => {
    if ('path' in item && item.path) {
      return item.path;
    }
    return `/products?category=${item.id}`;
  };
  
  // Horizontal layout for desktop
  if (orientation === 'horizontal') {
    return (
      <div className={cn("flex items-center gap-1 px-1", className)}>
        {links.map((link, index) => {
          if (link.hasSubmenu) {
            return (
              <DropdownMenu key={index}>
                <DropdownMenuTrigger asChild>
                                      <Button 
                    variant="ghost" 
                    className={cn(
                      "navbar-link group flex items-center gap-2 px-3 py-2 h-9 rounded-lg",
                      "transition-all duration-300 hover:bg-primary/10 relative overflow-hidden",
                      isActiveLink(link.path) && "active"
                    )}
                    onMouseEnter={() => setHoveredLink(link.path)}
                    onMouseLeave={() => setHoveredLink(null)}
                  >
                    {link.icon && <link.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors duration-300" />}
                    <span className="text-sm font-medium group-hover:text-primary transition-colors duration-300">
                      {link.name}
                      {link.hasNew && (
                        <span className="absolute -top-1 -right-1 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                        </span>
                      )}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 opacity-70 transition-transform duration-300 group-hover:rotate-180 group-hover:text-primary" />
                    
                    {hoveredLink === link.path && (
                      <div className="absolute inset-0 -z-10 bg-gradient-to-tr from-primary/5 via-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  className="w-64 p-2 rounded-xl shadow-lg border-border/30 animate-in slide-in-from-top-2 duration-200 bg-card/95 backdrop-blur-sm"
                  onMouseEnter={() => setDropdownHovered(link.path)}
                  onMouseLeave={() => setDropdownHovered(null)}
                >
                  <DropdownMenuLabel className="text-xs font-medium text-muted-foreground px-2 py-1.5">
                    تصفح {link.name}
                  </DropdownMenuLabel>
                  
                  <DropdownMenuItem asChild>
                    <Link 
                      to={link.path} 
                      className="flex items-center justify-between w-full rounded-lg p-2.5 transition-all duration-200 hover:bg-primary/10 group"
                    >
                      <span className="font-medium text-foreground/90 group-hover:text-primary transition-colors duration-200">تصفح كل المنتجات</span>
                      <Tag className="h-4 w-4 opacity-70 group-hover:opacity-100 group-hover:text-primary transition-all duration-200" />
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1.5 bg-border/40" />
                  
                  {link.featured && link.featured.length > 0 && (
                    <>
                      <DropdownMenuLabel className="text-xs font-medium text-muted-foreground px-2 py-1.5 flex items-center">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500 mr-1.5" /> منتجات مميزة
                      </DropdownMenuLabel>
                      <div className="mb-2">
                        {link.featured.map((item, idx) => (
                          <DropdownMenuItem key={idx} asChild className="group cursor-pointer rounded-lg my-0.5 transition-all duration-200">
                            <Link 
                              to={`/product/${item.id}`}
                              className="flex items-center gap-2 w-full py-1.5"
                            >
                              <div className="flex items-center justify-center w-7 h-7 rounded-md bg-amber-100/70 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500 transition-all duration-300 group-hover:scale-110">
                                <Sparkles className="h-3.5 w-3.5" />
                              </div>
                              <span className="text-sm font-medium">{item.name}</span>
                              <Badge variant="outline" className="ml-auto scale-75 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50">جديد</Badge>
                            </Link>
                          </DropdownMenuItem>
                        ))}
                      </div>
                      <DropdownMenuSeparator className="my-1.5 bg-border/40" />
                    </>
                  )}
                  
                  <div className="grid grid-cols-2 gap-1 p-1">
                    {link.submenuItems && link.submenuItems.map((subItem, subIndex) => (
                      <DropdownMenuItem key={subIndex} asChild className="cursor-pointer rounded-lg group hover:bg-primary/5 data-[highlighted]:bg-primary/10 transition-all duration-200">
                        <Link 
                          to={getItemPath(subItem)}
                          className="flex items-center gap-2 p-2"
                        >
                          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10 text-primary/80 group-hover:text-primary transition-all duration-300 group-hover:scale-110">
                            <LayoutGrid className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-sm font-medium group-hover:text-primary transition-colors duration-200">{subItem.name}</span>
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            );
          }
          
          return (
            <Link
              key={index}
              to={link.path}
              className={cn(
                "navbar-link group flex items-center gap-2 px-3 py-2 h-9 rounded-lg text-sm font-medium",
                "transition-all duration-300 hover:bg-primary/10 relative overflow-hidden",
                isActiveLink(link.path) 
                  ? "active bg-primary/10 text-primary" 
                  : "text-foreground/90 hover:text-primary"
              )}
              onMouseEnter={() => setHoveredLink(link.path)}
              onMouseLeave={() => setHoveredLink(null)}
            >
              {link.icon && <link.icon className={cn(
                "h-4 w-4 transition-colors duration-300",
                isActiveLink(link.path) ? "text-primary" : "text-muted-foreground group-hover:text-primary"
              )} />}
              <span>{link.name}</span>
              
              {hoveredLink === link.path && !isActiveLink(link.path) && (
                <div className="absolute inset-0 -z-10 bg-gradient-to-tr from-primary/5 via-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              )}
              
              {isActiveLink(link.path) && (
                <div className="absolute bottom-1.5 left-3 right-3 h-0.5 rounded-full bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
              )}
              
              {link.hasNew && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
              )}
            </Link>
          );
        })}
      </div>
    );
  }
  
  // Vertical layout for mobile
  return (
    <div className="flex flex-col space-y-1.5 w-full">
      {links.map((link, index) => {
        const isActive = isActiveLink(link.path);
        const isOpen = activeSubmenu === link.name;
        
        if (link.hasSubmenu) {
          return (
            <div key={index} className="relative">
              <div 
                className={cn(
                  "flex items-center justify-between py-3 px-4 rounded-xl cursor-pointer transition-all duration-300",
                  isOpen || isActive 
                    ? "bg-primary/10 border border-primary/20 shadow-sm" 
                    : "hover:bg-muted/60 border border-transparent hover:shadow-sm"
                )}
                onClick={() => toggleSubmenu(link.name)}
              >
                <div className="flex items-center gap-3">
                  {link.icon && <link.icon className={cn(
                    "h-5 w-5 transition-colors duration-300",
                    isOpen || isActive ? "text-primary" : "text-muted-foreground"
                  )} />}
                  <span className={cn(
                    "font-medium",
                    isOpen || isActive ? "text-primary" : ""
                  )}>
                    {link.name}
                    {link.hasNew && (
                      <span className="absolute top-3 right-14 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                      </span>
                    )}
                  </span>
                </div>
                <ChevronDown 
                  className={cn(
                    "h-4 w-4 transition-transform duration-300",
                    isOpen ? "rotate-180 text-primary" : "text-muted-foreground"
                  )} 
                />
              </div>
              
              {isOpen && (
                <div className="mr-8 mt-2 mb-3 pr-3 border-r-2 border-primary/20 space-y-1.5 animate-in slide-in-from-top-3 duration-200">
                  <Link 
                    to={link.path}
                    className="flex items-center py-2.5 px-4 text-sm hover:bg-primary/5 rounded-xl transition-colors duration-200"
                  >
                    <span className="font-medium">تصفح كل المنتجات</span>
                  </Link>
                  
                  {link.featured && link.featured.length > 0 && (
                    <>
                      <div className="py-1.5 px-4 text-xs font-medium text-muted-foreground flex items-center">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500 mr-1.5" /> منتجات مميزة
                      </div>
                      
                      {link.featured.map((item, idx) => (
                        <Link 
                          key={idx}
                          to={`/product/${item.id}`}
                          className="flex items-center py-2.5 px-4 text-sm group hover:bg-amber-50/50 dark:hover:bg-amber-900/10 rounded-xl transition-colors duration-200"
                        >
                          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-amber-100/70 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 transition-all duration-300 group-hover:scale-110 mr-2">
                            <Sparkles className="h-3.5 w-3.5" />
                          </div>
                          <span className="font-medium">{item.name}</span>
                          <Badge variant="outline" className="ml-auto scale-75 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50">جديد</Badge>
                        </Link>
                      ))}
                      
                      <div className="h-px bg-border/30 my-2 w-full"></div>
                    </>
                  )}
                  
                  {link.submenuItems && link.submenuItems.map((subItem, subIndex) => (
                    <Link 
                      key={subIndex}
                      to={getItemPath(subItem)}
                      className="flex items-center gap-2.5 py-2.5 px-4 text-sm hover:bg-primary/5 rounded-xl transition-colors duration-200 group"
                    >
                      <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10 text-primary/80 group-hover:text-primary transition-all duration-300 group-hover:scale-110">
                        <LayoutGrid className="h-3.5 w-3.5" />
                      </div>
                      <span className="font-medium">{subItem.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        }
        
        return (
          <Link
            key={index}
            to={link.path}
            className={cn(
              "flex items-center gap-3 py-3 px-4 rounded-xl transition-all duration-300 border",
              isActive
                ? "bg-primary/10 text-primary border-primary/20 shadow-sm" 
                : "hover:bg-muted/60 border-transparent hover:border-muted hover:shadow-sm"
            )}
          >
            {link.icon && <link.icon className={cn(
              "h-5 w-5",
              isActive ? "text-primary" : "text-muted-foreground"
            )} />}
            <span className={cn(
              "font-medium",
              isActive ? "text-primary" : ""
            )}>{link.name}</span>
            
            {link.hasNew && (
              <span className="absolute top-3 right-14 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
} 