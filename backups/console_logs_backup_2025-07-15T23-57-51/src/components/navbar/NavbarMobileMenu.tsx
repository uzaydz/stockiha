import { useState, ReactNode, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, X, User, LogOut, Settings, ChevronRight, CornerDownLeft, ArrowUpRight, Sparkles } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { NavbarLinks } from './NavbarLinks';
import { NavbarLogo } from './NavbarLogo';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Clock } from 'lucide-react';

interface NavbarMobileMenuProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile?: any;
  user?: any;
  orgLogo?: string;
  siteName?: string;
  displayTextWithLogo?: boolean;
  isAdminPage?: boolean;
  categories?: any[];
  children?: ReactNode;
}

export const NavbarMobileMenu: React.FC<NavbarMobileMenuProps> = ({
  isOpen,
  onOpenChange,
  userProfile,
  user,
  orgLogo,
  siteName,
  displayTextWithLogo = true,
  isAdminPage = false,
  categories = [],
  children
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  
  // محاكاة الانتقالات عند إغلاق القائمة
  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      onOpenChange(false);
      setClosing(false);
    }, 300);
  };

  // التركيز على حقل البحث عند فتح القائمة
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 200);
    }
  }, [isOpen]);
  
  // إدارة البحث
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    // حفظ البحث في السجل
    const searches = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
    setRecentSearches(searches);
    
    // إغلاق القائمة وتنفيذ البحث (في الواقع ستنتقل إلى صفحة النتائج)
    handleClose();
  };
  
  // تنظيف عنصر البحث
  const clearSearch = () => {
    setSearchQuery("");
    searchInputRef.current?.focus();
  };
  
  // معالجة التبديل بين الأقسام
  const toggleSection = (section: string) => {
    if (activeSection === section) {
      setActiveSection(null);
    } else {
      setActiveSection(section);
    }
  };
  
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className={cn(
          "w-full max-w-md border-l border-border/40 p-0 bg-background/95 backdrop-blur-md",
          closing && "animate-out slide-out-to-right duration-300"
        )}
      >
        <div className="flex flex-col h-[100dvh]">
          {/* الجزء العلوي مع الشعار وزر الإغلاق */}
          <div className="border-b border-border/20 p-4 flex items-center justify-between">
            <NavbarLogo 
              orgLogo={orgLogo} 
              siteName={siteName} 
              displayTextWithLogo={displayTextWithLogo} 
              isAdminPage={isAdminPage}
              size="sm"
            />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleClose}
              className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors duration-200"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* حقل البحث */}
          <div className="p-3 border-b border-border/10">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="البحث عن منتجات..."
                className={cn(
                  "h-9 pr-9 pl-9 rounded-xl focus-visible:ring-1 focus-visible:ring-primary/30",
                  "transition-shadow duration-300",
                  searchFocused ? "shadow-sm" : "shadow-none"
                )}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              
              {searchQuery && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                  onClick={clearSearch}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
              
              {recentSearches.length > 0 && searchFocused && !searchQuery && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-card rounded-xl border border-border/30 shadow-md overflow-hidden">
                  <div className="p-2">
                    <div className="text-xs text-muted-foreground mb-1 px-2">
                      عمليات البحث الأخيرة
                    </div>
                    {recentSearches.map((search, i) => (
                      <div 
                        key={i}
                        className="flex items-center py-1.5 px-2 hover:bg-accent rounded-lg cursor-pointer transition-colors text-sm"
                        onClick={() => setSearchQuery(search)}
                      >
                        <Clock className="h-3 w-3 mr-2 text-muted-foreground" />
                        {search}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </form>
          </div>
          
          {/* محتوى القائمة مع التمرير */}
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-5">
              {/* قسم الروابط الرئيسية */}
              <div className="space-y-1.5">
                <h3 className="text-sm font-semibold text-muted-foreground px-2 mb-2">التنقل السريع</h3>
                <Link 
                  to="/"
                  className="flex items-center justify-between px-3 py-2 text-sm rounded-xl hover:bg-muted/60 transition-colors group"
                  onClick={handleClose}
                >
                  <span className="font-medium">الرئيسية</span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
                <Link 
                  to="/products"
                  className="flex items-center justify-between px-3 py-2 text-sm rounded-xl hover:bg-muted/60 transition-colors group relative"
                  onClick={handleClose}
                >
                  <span className="font-medium">المنتجات</span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Badge 
                    variant="secondary" 
                    className="absolute top-1 right-1 px-1 py-0 text-[10px] bg-primary/10 text-primary"
                  >
                    جديد
                  </Badge>
                </Link>
              </div>
              
              {/* محتوى مخصص في القائمة (مثل وصلات التنقل السريع) */}
              {children && (
                <div className="mt-4 pt-4 border-t border-border/20">
                  {children}
                </div>
              )}
            </div>
          </ScrollArea>
          
          {/* قسم المستخدم في الأسفل */}
          {user && (
            <div className="border-t border-border/20 p-3">
              <div className="flex items-center gap-3 p-2">
                <Avatar className="h-10 w-10 shadow-sm border border-border/30">
                  <AvatarImage src={user.photoURL || ""} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {user.displayName?.charAt(0) || user.email?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.displayName || user.email || "المستخدم"}
                  </p>
                  {userProfile?.role && (
                    <p className="text-xs text-muted-foreground truncate">
                      {userProfile.role === 'admin' ? 'مسؤول' : 'مستخدم'}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-primary/10 transition-colors duration-200"
                    asChild
                  >
                    <Link to="/settings">
                      <Settings className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors duration-200"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
