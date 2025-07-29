import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tag,
  Sparkles,
  ChevronDown,
  Search,
  Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Category {
  id: string;
  name: string;
}

interface OptimizedCategorySelectProps {
  selectedCategory: string;
  availableCategories: Category[];
  onCategoryChange: (value: string) => void;
  isPending?: boolean;
  placeholder?: string;
  className?: string;
}

// مكون البحث داخل القائمة
const CategorySearch = React.memo<{
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isVisible: boolean;
}>(({ searchQuery, onSearchChange, isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="p-2 border-b">
      <div className="relative">
        <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="البحث في الفئات..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pr-8 h-8 text-sm"
          autoFocus
        />
      </div>
    </div>
  );
});

CategorySearch.displayName = 'CategorySearch';

// مكون عنصر الفئة المحسن
const CategoryItem = React.memo<{
  category: Category;
  isSelected: boolean;
  onSelect: (id: string) => void;
}>(({ category, isSelected, onSelect }) => (
  <SelectItem 
    key={category.id} 
    value={category.id}
    onClick={() => onSelect(category.id)}
    className={cn(
      "cursor-pointer transition-colors duration-150",
      isSelected && "bg-primary/10"
    )}
  >
    <div className="flex items-center gap-2 w-full">
      <div className={cn(
        "w-2 h-2 rounded-full transition-colors duration-150",
        isSelected ? "bg-primary" : "bg-primary/40"
      )}></div>
      <span className="truncate flex-1">{category.name}</span>
      {isSelected && (
        <div className="w-1 h-4 bg-primary rounded-full ml-auto"></div>
      )}
    </div>
  </SelectItem>
));

CategoryItem.displayName = 'CategoryItem';

const OptimizedCategorySelect: React.FC<OptimizedCategorySelectProps> = ({
  selectedCategory,
  availableCategories,
  onCategoryChange,
  isPending = false,
  placeholder = "اختر الفئة",
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // تحميل مسبق للفئات عند فتح القائمة
  useEffect(() => {
    if (isOpen && !categoriesLoaded) {
      // تأخير قصير لمحاكاة التحميل
      const timer = setTimeout(() => {
        setCategoriesLoaded(true);
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [isOpen, categoriesLoaded]);

  // إعادة تعيين البحث عند إغلاق القائمة
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  // تصفية الفئات بناءً على البحث
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return availableCategories;
    
    const query = searchQuery.toLowerCase().trim();
    return availableCategories.filter(category =>
      category.name.toLowerCase().includes(query) ||
      category.id.toLowerCase().includes(query)
    );
  }, [availableCategories, searchQuery]);

  // اسم الفئة المختارة
  const selectedCategoryName = useMemo(() => {
    if (selectedCategory === 'all') return 'جميع الفئات';
    const category = availableCategories.find(cat => cat.id === selectedCategory);
    return category?.name || 'غير محدد';
  }, [selectedCategory, availableCategories]);

  // دالة التعامل مع تغيير الفئة
  const handleCategoryChange = useCallback((value: string) => {
    if (value === 'loading') return;
    onCategoryChange(value);
    setIsOpen(false);
  }, [onCategoryChange]);

  // دالة البحث
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // عرض عناصر الفئات
  const categoryItems = useMemo(() => {
    if (!categoriesLoaded && isOpen) {
      return (
        <SelectItem value="loading" disabled>
          <div className="flex items-center gap-2 justify-center py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>جاري تحميل الفئات...</span>
          </div>
        </SelectItem>
      );
    }

    if (filteredCategories.length === 0 && searchQuery) {
      return (
        <SelectItem value="no-results" disabled>
          <div className="text-center py-2 text-muted-foreground">
            لا توجد فئات مطابقة للبحث
          </div>
        </SelectItem>
      );
    }

    return filteredCategories.map(category => (
      <CategoryItem
        key={category.id}
        category={category}
        isSelected={selectedCategory === category.id}
        onSelect={handleCategoryChange}
      />
    ));
  }, [categoriesLoaded, isOpen, filteredCategories, searchQuery, selectedCategory, handleCategoryChange]);

  return (
    <Select 
      value={selectedCategory} 
      onValueChange={handleCategoryChange}
      disabled={isPending}
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <SelectTrigger className={cn(
        "w-40 h-10 bg-background/60 border-border/50 hover:bg-background transition-all duration-200",
        "focus:ring-2 focus:ring-primary/20 focus:border-primary/50",
        isPending && "opacity-50 cursor-not-allowed",
        className
      )}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Tag className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="truncate text-sm font-medium">
            {selectedCategoryName}
          </span>
        </div>
        <ChevronDown className={cn(
          "h-4 w-4 text-muted-foreground transition-transform duration-200 flex-shrink-0",
          isOpen && "rotate-180"
        )} />
      </SelectTrigger>
      
      <SelectContent 
        className="max-h-80 w-[--radix-select-trigger-width] p-0"
        align="start"
        side="bottom"
      >
        {/* البحث */}
        <CategorySearch
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          isVisible={availableCategories.length > 5}
        />
        
        <ScrollArea className="max-h-60">
          <div className="p-1">
            {/* خيار "جميع الفئات" */}
            <SelectItem 
              value="all"
              className={cn(
                "cursor-pointer mb-1 font-medium",
                selectedCategory === 'all' && "bg-primary/10"
              )}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>جميع الفئات</span>
                {selectedCategory === 'all' && (
                  <div className="w-1 h-4 bg-primary rounded-full ml-auto"></div>
                )}
              </div>
            </SelectItem>
            
            {/* فاصل */}
            {availableCategories.length > 0 && (
              <div className="h-px bg-border my-1" />
            )}
            
            {/* عناصر الفئات */}
            {categoryItems}
          </div>
        </ScrollArea>

        {/* مؤشر عدد النتائج */}
        {searchQuery && filteredCategories.length > 0 && (
          <div className="p-2 border-t bg-muted/30 text-xs text-muted-foreground text-center">
            {filteredCategories.length} من {availableCategories.length} فئة
          </div>
        )}
      </SelectContent>
    </Select>
  );
};

export default React.memo(OptimizedCategorySelect);
