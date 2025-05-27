import { Search, XCircle, LayoutGrid, Clock, ArrowUpRight, Command, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FormEvent, useState, useRef, useEffect } from 'react';
import { 
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from "@/components/ui/command";
import { Badge } from '@/components/ui/badge';

interface SearchResult {
  id: string;
  title: string;
  category?: string;
  url: string;
  type: 'product' | 'category' | 'page' | 'recent';
  image?: string;
  trending?: boolean;
}

interface NavbarSearchProps {
  className?: string;
  onSearch?: (query: string) => void;
  placeholder?: string;
  variant?: 'default' | 'minimal' | 'command';
  recentSearches?: SearchResult[];
  topResults?: SearchResult[];
}

export function NavbarSearch({ 
  className,
  onSearch,
  placeholder = "البحث...",
  variant = "default",
  recentSearches = [],
  topResults = []
}: NavbarSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  // For demo purposes - actual implementation would come from props or API
  const demoResults: SearchResult[] = [
    { id: '1', title: 'PlayStation 5', category: 'أجهزة', url: '/products/playstation-5', type: 'product', image: 'https://placehold.co/60x60', trending: true },
    { id: '2', title: 'الألعاب الرياضية', category: 'تصنيفات', url: '/category/sports', type: 'category' },
    { id: '3', title: 'إكسسوارات الألعاب', category: 'تصنيفات', url: '/category/accessories', type: 'category' },
    { id: '4', title: 'سماعات ألعاب', category: 'ملحقات', url: '/products/gaming-headphones', type: 'product', image: 'https://placehold.co/60x60' },
  ];

  const demoRecentSearches: SearchResult[] = [
    { id: 'r1', title: 'يد تحكم', url: '/search?q=يد+تحكم', type: 'recent' },
    { id: 'r2', title: 'Nintendo Switch', url: '/search?q=nintendo+switch', type: 'recent' },
  ];

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || e.key === '/') {
        if (inputRef.current !== document.activeElement) {
          e.preventDefault();
          if (variant === 'command') {
            setIsCommandOpen(true);
          } else if (inputRef.current) {
            inputRef.current.focus();
          }
        }
      }
    };
    
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [variant]);

  // أضف تأثير "جاري الكتابة" أثناء تغيير قيمة البحث
  useEffect(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    if (searchQuery) {
      setIsTyping(true);
      typingTimeoutRef.current = window.setTimeout(() => {
        setIsTyping(false);
      }, 500);
    } else {
      setIsTyping(false);
    }
    
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (onSearch && searchQuery.trim()) {
      onSearch(searchQuery);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Command palette variant
  if (variant === 'command') {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "text-sm text-muted-foreground border-border/40 px-3 rounded-lg h-9 gap-2 hover:bg-accent/50 transition-all duration-300 group", 
            className
          )}
          onClick={() => setIsCommandOpen(true)}
        >
          <span>البحث...</span>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border/40 bg-muted px-1.5 font-mono text-[10px] font-medium opacity-70 transition-all duration-300 group-hover:opacity-100 group-hover:border-border/80">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
        <CommandDialog open={isCommandOpen} onOpenChange={setIsCommandOpen} className="overflow-hidden border-border/30 shadow-xl">
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
            <div className="flex items-center px-3 py-2 border-b border-border/20">
              <Command className="h-4 w-4 me-2 text-muted-foreground" />
              <CommandInput 
                placeholder="اكتب للبحث في المتجر..." 
                className="border-none outline-none ring-0 focus:ring-0 focus-visible:ring-0 shadow-none p-0 text-sm focus-visible:border-none" 
              />
            </div>
          </div>
          <CommandList className="max-h-[70vh] overflow-y-auto custom-scrollbar pb-2">
            <CommandEmpty>
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="rounded-full bg-muted/50 p-3 mb-3">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium mb-1">لا توجد نتائج</p>
                <p className="text-xs text-muted-foreground">جرب تغيير كلمات البحث أو تصفح المنتجات بشكل مباشر</p>
              </div>
            </CommandEmpty>
            <CommandGroup heading="الاقتراحات الشائعة" className="p-1.5">
              {topResults.length ? topResults.map((result) => (
                <CommandItem
                  key={result.id}
                  onSelect={() => {
                    setIsCommandOpen(false);
                    window.location.href = result.url;
                  }}
                  className="rounded-lg cursor-pointer transition-all duration-200 hover:scale-[0.99]"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {result.image ? (
                      <div className="relative">
                        <img src={result.image} alt={result.title} className="w-10 h-10 rounded-md object-cover shadow-sm" />
                        {result.trending && (
                          <Badge variant="secondary" className="absolute -top-2 -right-2 px-1 py-0 text-[8px] bg-orange-500/20 text-orange-600 dark:bg-orange-700/30 dark:text-orange-400">
                            <Sparkles className="h-2 w-2 mr-0.5" /> رائج
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <div className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-md", 
                        result.type === 'category' ? "bg-purple-100 text-purple-500 dark:bg-purple-900/30" : "bg-blue-100 text-blue-500 dark:bg-blue-900/30"
                      )}>
                        <LayoutGrid className="h-5 w-5" />
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="font-medium">{result.title}</span>
                      {result.category && <span className="text-xs text-muted-foreground">{result.category}</span>}
                    </div>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground ms-auto opacity-50 group-hover:opacity-100 transition-opacity" />
                </CommandItem>
              )) : demoResults.map((result) => (
                <CommandItem
                  key={result.id}
                  onSelect={() => {
                    setIsCommandOpen(false);
                    window.location.href = result.url;
                  }}
                  className="rounded-lg cursor-pointer transition-all duration-200 hover:scale-[0.99] group"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {result.image ? (
                      <div className="relative overflow-hidden rounded-md shadow-sm transition-all duration-300 group-hover:shadow-md">
                        <img src={result.image} alt={result.title} className="w-10 h-10 object-cover transition-transform duration-300 group-hover:scale-110" />
                        {result.trending && (
                          <Badge variant="secondary" className="absolute -top-2 -right-2 px-1 py-0 text-[8px] bg-orange-500/20 text-orange-600 dark:bg-orange-700/30 dark:text-orange-400">
                            <Sparkles className="h-2 w-2 mr-0.5" /> رائج
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <div className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-md transition-all duration-300 group-hover:scale-110", 
                        result.type === 'category' ? "bg-purple-100 text-purple-500 dark:bg-purple-900/30" : "bg-blue-100 text-blue-500 dark:bg-blue-900/30"
                      )}>
                        <LayoutGrid className="h-5 w-5" />
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="font-medium">{result.title}</span>
                      {result.category && <span className="text-xs text-muted-foreground">{result.category}</span>}
                    </div>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground ms-auto opacity-50 group-hover:opacity-100 transition-opacity" />
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator className="my-1 mx-1.5 bg-border/30" />
            <CommandGroup heading="عمليات البحث الأخيرة" className="p-1.5">
              {recentSearches.length ? recentSearches.map((result) => (
                <CommandItem
                  key={result.id}
                  onSelect={() => {
                    setIsCommandOpen(false);
                    window.location.href = result.url;
                  }}
                  className="rounded-lg"
                >
                  <Clock className="h-4 w-4 text-muted-foreground mr-2" />
                  <span>{result.title}</span>
                </CommandItem>
              )) : demoRecentSearches.map((result) => (
                <CommandItem
                  key={result.id}
                  onSelect={() => {
                    setIsCommandOpen(false);
                    window.location.href = result.url;
                  }}
                  className="rounded-lg"
                >
                  <Clock className="h-4 w-4 text-muted-foreground mr-2" />
                  <span>{result.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          <div className="border-t border-border/30 px-1.5 py-1.5 mt-auto bg-muted/30">
            <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
              <span>اضغط <kbd className="bg-background border border-border/40 rounded px-1 py-0.5 text-[10px] ml-1">↵</kbd> للبحث</span>
              <span>اضغط <kbd className="bg-background border border-border/40 rounded px-1 py-0.5 text-[10px] ml-1">Esc</kbd> للإغلاق</span>
            </div>
          </div>
        </CommandDialog>
      </>
    );
  }

  if (variant === "minimal") {
    return (
      <div className={cn("relative flex-1 max-w-sm", className)}>
        <form 
          ref={formRef}
          onSubmit={handleSubmit}
          className="group"
        >
          <div className="relative">
            <Input
              ref={inputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 200)}
              placeholder={placeholder}
              className={cn(
                "h-9 pr-9 rounded-full border-border/40 bg-background/80",
                "focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:border-primary/50",
                "placeholder:text-muted-foreground/70 transition-all duration-300 w-full",
                isFocused ? "shadow-sm pr-8 pl-4" : "shadow-none",
                searchQuery && "pr-8"
              )}
            />
            
            {/* مؤشر "جاري الكتابة" */}
            {isTyping && (
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex space-x-1 rtl:space-x-reverse">
                <span className="h-1.5 w-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="h-1.5 w-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="h-1.5 w-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            )}
            
            {searchQuery ? (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <XCircle className="h-4 w-4 opacity-70 hover:opacity-100 transition-opacity hover:text-primary" />
              </button>
            ) : (
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            )}
          </div>

          {isFocused && (searchQuery || demoRecentSearches.length > 0) && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-card/95 rounded-xl border border-border/40 shadow-lg overflow-hidden z-50 backdrop-blur-sm animate-in fade-in-50 slide-in-from-top-5 duration-200">
              {searchQuery ? (
                <div className="p-2">
                  <div className="flex justify-between items-center mb-2 px-2">
                    <div className="text-xs font-medium text-muted-foreground">نتائج البحث</div>
                    {isTyping && (
                      <div className="flex items-center text-xs text-muted-foreground">
                        <span className="opacity-60 mr-1">جاري البحث</span>
                        <div className="flex space-x-1 rtl:space-x-reverse">
                          <span className="h-1 w-1 bg-current rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></span>
                          <span className="h-1 w-1 bg-current rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></span>
                          <span className="h-1 w-1 bg-current rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></span>
                        </div>
                      </div>
                    )}
                  </div>
                  {demoResults.length > 0 ? (
                    <div className="space-y-1 max-h-[50vh] overflow-y-auto custom-scrollbar">
                      {demoResults.map((result) => (
                        <a 
                          key={result.id} 
                          href={result.url}
                          className="flex items-center gap-3 p-2 hover:bg-accent hover:text-accent-foreground rounded-lg transition-all duration-200 hover:scale-[0.99] group"
                        >
                          {result.image ? (
                            <div className="overflow-hidden rounded-md">
                              <img 
                                src={result.image} 
                                alt={result.title} 
                                className="w-10 h-10 object-cover transition-transform duration-300 group-hover:scale-110" 
                              />
                            </div>
                          ) : (
                            <div className={cn(
                              "w-10 h-10 rounded-md flex items-center justify-center transition-transform duration-300 group-hover:scale-110",
                              result.type === 'category' ? "bg-purple-100 text-purple-500 dark:bg-purple-900/30" : "bg-blue-100 text-blue-500 dark:bg-blue-900/30"
                            )}>
                              <LayoutGrid className="h-5 w-5" />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center">
                              <div className="text-sm font-medium">{result.title}</div>
                              {result.trending && (
                                <Badge variant="secondary" className="mr-2 px-1 py-0 text-[8px] bg-orange-500/20 text-orange-600 dark:bg-orange-700/30 dark:text-orange-400">
                                  <Sparkles className="h-2 w-2 mr-0.5" /> رائج
                                </Badge>
                              )}
                            </div>
                            {result.category && <div className="text-xs text-muted-foreground">{result.category}</div>}
                          </div>
                          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-center py-4 text-muted-foreground">
                      <Search className="h-5 w-5 mx-auto mb-2 opacity-50" />
                      لا توجد نتائج
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-2">
                  <div className="text-xs font-medium text-muted-foreground mb-2 px-2">عمليات البحث الأخيرة</div>
                  <div className="space-y-1">
                    {demoRecentSearches.map((search) => (
                      <a 
                        key={search.id} 
                        href={search.url}
                        className="flex items-center gap-2 p-2 hover:bg-accent rounded-lg transition-colors group"
                      >
                        <Clock className="h-3.5 w-3.5 text-muted-foreground transition-all duration-300 group-hover:text-primary" />
                        <span className="text-sm">{search.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              <div className="border-t border-border/30 p-1.5 bg-muted/30">
                <div className="flex items-center justify-between">
                  <button 
                    type="submit"
                    className="flex-1 text-xs text-center py-1.5 text-primary hover:bg-primary/5 rounded-md transition-colors"
                  >
                    البحث عن "{searchQuery || "..."}"
                  </button>
                  <span className="text-xs text-muted-foreground px-2 py-1.5">
                    <kbd className="bg-background border border-border/40 rounded px-1 py-0.5 text-[10px] ml-1">Esc</kbd> للإغلاق
                  </span>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    );
  }

  return (
    <div className={cn("relative flex w-full max-w-sm", className)}>
      <form ref={formRef} onSubmit={handleSubmit} className="flex w-full relative group">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={placeholder}
            className={cn(
              "h-10 pr-10 rounded-r-none border-r-0 border-border/40 focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:border-r-0 transition-all duration-300",
              "focus-visible:rounded-r-none focus-visible:shadow-sm"
            )}
          />
          
          {/* مؤشر "جاري الكتابة" */}
          {isTyping && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex space-x-1 rtl:space-x-reverse">
              <span className="h-1.5 w-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="h-1.5 w-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="h-1.5 w-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          )}
          
          {searchQuery ? (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <XCircle className="h-4 w-4 opacity-70 hover:opacity-100 hover:text-primary transition-opacity" />
            </button>
          ) : (
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <Button 
          type="submit" 
          size="sm"
          className={cn(
            "rounded-l-none bg-primary/90 hover:bg-primary transition-all duration-300",
            "shadow-none hover:shadow-md"
          )}
        >
          بحث
        </Button>
        
        {/* مؤشر اختصار لوحة المفاتيح */}
        <div className="hidden md:flex absolute -bottom-6 left-0 text-xs text-muted-foreground opacity-0 group-hover:opacity-80 transition-opacity duration-300">
          <span>أو اضغط</span>
          <kbd className="mx-1 bg-background border border-border/40 rounded px-1 text-[10px]">⌘ K</kbd>
        </div>
      </form>
    </div>
  );
}

// إضافة هذه القواعد إلى ملف index.css
// .custom-scrollbar {
//   scrollbar-width: thin;
//   scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
// }
// .custom-scrollbar::-webkit-scrollbar {
//   width: 5px;
// }
// .custom-scrollbar::-webkit-scrollbar-track {
//   background: transparent;
// }
// .custom-scrollbar::-webkit-scrollbar-thumb {
//   background-color: rgba(0, 0, 0, 0.2);
//   border-radius: 20px;
// }
// .dark .custom-scrollbar::-webkit-scrollbar-thumb {
//   background-color: rgba(255, 255, 255, 0.2);
// }
