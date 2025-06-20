import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface InventoryFilterProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  categories: string[];
  selectedCategory: string | null;
  onCategoryChange: (value: string | null) => void;
  sortOption: string;
  onSortChange: (value: string) => void;
  stockFilter: string;
  onStockFilterChange: (value: string) => void;
}

const InventoryFilter = ({
  searchQuery,
  onSearchChange,
  categories,
  selectedCategory,
  onCategoryChange,
  sortOption,
  onSortChange,
  stockFilter,
  onStockFilterChange,
}: InventoryFilterProps) => {
  return (
    <div className="bg-background dark:bg-zinc-900 border dark:border-zinc-800 rounded-lg p-4 shadow-sm">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground dark:text-zinc-400" />
          <Input
            placeholder="البحث عن منتج بالاسم، الرمز، الباركود..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-3 pr-10 bg-background dark:bg-zinc-800 border-border dark:border-zinc-700 text-foreground dark:text-zinc-200"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-accent dark:hover:bg-zinc-700"
              onClick={() => onSearchChange('')}
            >
              <X className="h-3 w-3" />
              <span className="sr-only">مسح البحث</span>
            </Button>
          )}
        </div>

        {/* Category Filter */}
        <div className="w-full md:w-[200px]">
          <Select
            value={selectedCategory || 'all'}
            onValueChange={(value) => onCategoryChange(value === 'all' ? null : value)}
          >
            <SelectTrigger className="bg-background dark:bg-zinc-800 border-border dark:border-zinc-700 text-foreground dark:text-zinc-200">
              <SelectValue placeholder="كل الفئات" />
            </SelectTrigger>
            <SelectContent className="bg-background dark:bg-zinc-800 border-border dark:border-zinc-700">
              <SelectItem value="all" className="text-foreground dark:text-zinc-200 hover:bg-accent dark:hover:bg-zinc-700">كل الفئات</SelectItem>
              {categories.map((category) => (
                <SelectItem 
                  key={category} 
                  value={category}
                  className="text-foreground dark:text-zinc-200 hover:bg-accent dark:hover:bg-zinc-700"
                >
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sort Options */}
        <div className="w-full md:w-[200px]">
          <Select value={sortOption} onValueChange={onSortChange}>
            <SelectTrigger className="bg-background dark:bg-zinc-800 border-border dark:border-zinc-700 text-foreground dark:text-zinc-200">
              <SelectValue placeholder="ترتيب حسب" />
            </SelectTrigger>
            <SelectContent className="bg-background dark:bg-zinc-800 border-border dark:border-zinc-700">
              <SelectItem value="stock-low" className="text-foreground dark:text-zinc-200 hover:bg-accent dark:hover:bg-zinc-700">المخزون: من الأقل</SelectItem>
              <SelectItem value="stock-high" className="text-foreground dark:text-zinc-200 hover:bg-accent dark:hover:bg-zinc-700">المخزون: من الأكثر</SelectItem>
              <SelectItem value="name-asc" className="text-foreground dark:text-zinc-200 hover:bg-accent dark:hover:bg-zinc-700">الاسم: أ-ي</SelectItem>
              <SelectItem value="name-desc" className="text-foreground dark:text-zinc-200 hover:bg-accent dark:hover:bg-zinc-700">الاسم: ي-أ</SelectItem>
              <SelectItem value="sku" className="text-foreground dark:text-zinc-200 hover:bg-accent dark:hover:bg-zinc-700">رمز المنتج (SKU)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stock Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 bg-background dark:bg-zinc-800 border-border dark:border-zinc-700 text-foreground dark:text-zinc-200 hover:bg-accent dark:hover:bg-zinc-700">
              <SlidersHorizontal className="h-4 w-4" />
              فلترة المخزون
              {(stockFilter !== 'all') && (
                <Badge variant="secondary" className="ml-1 rounded-sm px-1 py-0 bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary/90">
                  1
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[220px] bg-background dark:bg-zinc-800 border-border dark:border-zinc-700">
            <DropdownMenuLabel className="text-foreground dark:text-zinc-200">حالة المخزون</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border dark:bg-zinc-700" />
            
            <DropdownMenuGroup>
              <DropdownMenuRadioGroup value={stockFilter} onValueChange={onStockFilterChange}>
                <DropdownMenuRadioItem value="all" className="text-foreground dark:text-zinc-200 hover:bg-accent dark:hover:bg-zinc-700">جميع المنتجات</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="in-stock" className="text-foreground dark:text-zinc-200 hover:bg-accent dark:hover:bg-zinc-700">متوفر في المخزون</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="low-stock" className="text-foreground dark:text-zinc-200 hover:bg-accent dark:hover:bg-zinc-700">منخفض المخزون</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="out-of-stock" className="text-foreground dark:text-zinc-200 hover:bg-accent dark:hover:bg-zinc-700">نفذ من المخزون</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Active Filters */}
      {(selectedCategory || stockFilter !== 'all') && (
        <div className="flex flex-wrap gap-2 mt-3">
          {selectedCategory && (
            <Badge variant="secondary" className="gap-2 bg-secondary/50 dark:bg-zinc-700 text-foreground dark:text-zinc-200 border-border dark:border-zinc-600">
              الفئة: {selectedCategory}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent text-muted-foreground dark:text-zinc-400 hover:text-foreground dark:hover:text-zinc-200"
                onClick={() => onCategoryChange(null)}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">إزالة الفلتر</span>
              </Button>
            </Badge>
          )}
          {stockFilter !== 'all' && (
            <Badge variant="secondary" className="gap-2 bg-secondary/50 dark:bg-zinc-700 text-foreground dark:text-zinc-200 border-border dark:border-zinc-600">
              المخزون:{' '}
              {stockFilter === 'in-stock'
                ? 'متوفر'
                : stockFilter === 'out-of-stock'
                ? 'نفذ'
                : 'منخفض'}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent text-muted-foreground dark:text-zinc-400 hover:text-foreground dark:hover:text-zinc-200"
                onClick={() => onStockFilterChange('all')}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">إزالة الفلتر</span>
              </Button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default InventoryFilter;
