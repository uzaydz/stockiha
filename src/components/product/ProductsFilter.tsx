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

interface ProductsFilterProps {
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  categories?: string[];
  selectedCategory?: string | null;
  onCategoryChange?: (value: string | null) => void;
  sortOption?: string;
  onSortChange?: (value: string) => void;
  stockFilter?: string;
  onStockFilterChange?: (value: string) => void;
  categoryFilter?: string | null;
  onCategoryFilterChange?: (value: string | null) => void;
}

const ProductsFilter = ({
  searchQuery = '',
  onSearchChange = () => {},
  categories = [],
  selectedCategory = null,
  onCategoryChange = () => {},
  sortOption = 'newest',
  onSortChange = () => {},
  stockFilter = 'all',
  onStockFilterChange = () => {},
  categoryFilter = null,
  onCategoryFilterChange
}: ProductsFilterProps) => {
  const effectiveCategoryFilter = categoryFilter ?? selectedCategory;
  const effectiveOnCategoryChange = onCategoryFilterChange ?? onCategoryChange;

  return (
    <div className="bg-background border rounded-lg p-4 shadow-sm">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="البحث عن منتج بالاسم، الوصف، الباركود..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-3 pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
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
            value={effectiveCategoryFilter || 'all'}
            onValueChange={(value) => effectiveOnCategoryChange(value === 'all' ? null : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="كل الفئات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الفئات</SelectItem>
              {Array.isArray(categories) && categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sort Options */}
        <div className="w-full md:w-[200px]">
          <Select value={sortOption} onValueChange={onSortChange}>
            <SelectTrigger>
              <SelectValue placeholder="ترتيب حسب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">الأحدث</SelectItem>
              <SelectItem value="oldest">الأقدم</SelectItem>
              <SelectItem value="price-high">السعر: من الأعلى</SelectItem>
              <SelectItem value="price-low">السعر: من الأقل</SelectItem>
              <SelectItem value="name-asc">الاسم: أ-ي</SelectItem>
              <SelectItem value="name-desc">الاسم: ي-أ</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Advanced Filters */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              فلترة متقدمة
              {(stockFilter !== 'all') && (
                <Badge variant="secondary" className="ml-1 rounded-sm px-1 py-0">
                  1
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[220px]">
            <DropdownMenuLabel>خيارات الفلترة</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground mt-2">
                حالة المخزون
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup value={stockFilter} onValueChange={onStockFilterChange}>
                <DropdownMenuRadioItem value="all">جميع المنتجات</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="in-stock">متوفر في المخزون</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="low-stock">منخفض المخزون</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="out-of-stock">نفذ من المخزون</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Active Filters */}
      {(effectiveCategoryFilter || stockFilter !== 'all') && (
        <div className="flex flex-wrap gap-2 mt-3">
          {effectiveCategoryFilter && (
            <Badge variant="secondary" className="gap-2">
              الفئة: {effectiveCategoryFilter}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => effectiveOnCategoryChange(null)}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">إزالة الفلتر</span>
              </Button>
            </Badge>
          )}
          {stockFilter !== 'all' && (
            <Badge variant="secondary" className="gap-2">
              المخزون:{' '}
              {stockFilter === 'in-stock'
                ? 'متوفر'
                : stockFilter === 'out-of-stock'
                ? 'نفذ'
                : 'منخفض'}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
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

export default ProductsFilter;
